using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.Json.Serialization;

var builder = WebApplication.CreateBuilder(args);

// Render/Azure/most free hosts inject the port to listen on via the PORT env var.
var port = Environment.GetEnvironmentVariable("PORT") ?? "5000";
builder.WebHost.UseUrls($"http://0.0.0.0:{port}");

// Comma-separated list of allowed frontend origins, e.g. "https://yourname.github.io"
var allowedOrigins = (Environment.GetEnvironmentVariable("FRONTEND_ORIGINS") ?? "http://localhost:4200")
    .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

builder.Services.AddCors(options =>
{
    options.AddPolicy("FrontendPolicy", policy =>
    {
        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

builder.Services.AddHttpClient("anthropic", client =>
{
    client.BaseAddress = new Uri("https://api.anthropic.com/");
    client.Timeout = TimeSpan.FromSeconds(120);
});

var app = builder.Build();

app.UseCors("FrontendPolicy");

app.MapGet("/", () => Results.Ok(new { status = "Personal assistant agent API is running" }));

// One turn of the agent loop.
//
// The browser owns the conversation and executes every tool locally against its own
// localStorage, so this endpoint is deliberately stateless: it forwards the message
// history and tool definitions to Anthropic and hands the raw content blocks back.
// Its only real job is keeping the API key out of browser-visible code.
app.MapPost("/api/assistant", async (AssistantRequest request, IHttpClientFactory httpClientFactory) =>
{
    var apiKey = Environment.GetEnvironmentVariable("ANTHROPIC_API_KEY");
    if (string.IsNullOrWhiteSpace(apiKey))
    {
        return Results.Problem("Server is missing the ANTHROPIC_API_KEY environment variable.", statusCode: 500);
    }

    if (request.Messages is not { ValueKind: JsonValueKind.Array } messages || messages.GetArrayLength() == 0)
    {
        return Results.BadRequest(new { error = "messages must be a non-empty array" });
    }

    var client = httpClientFactory.CreateClient("anthropic");
    client.DefaultRequestHeaders.Clear();
    client.DefaultRequestHeaders.Add("x-api-key", apiKey);
    client.DefaultRequestHeaders.Add("anthropic-version", "2023-06-01");
    client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

    // Adaptive thinking stays on: with tools disabled thinking can write a tool call
    // into the visible text instead of emitting a tool_use block. The browser echoes
    // every content block back verbatim, so the thinking blocks round-trip correctly.
    var payload = new JsonObject
    {
        ["model"] = "claude-opus-5",
        ["max_tokens"] = 8000,
        ["thinking"] = new JsonObject
        {
            ["type"] = "adaptive",
            ["display"] = "summarized",
        },
        ["output_config"] = new JsonObject { ["effort"] = "medium" },
        ["messages"] = JsonNode.Parse(messages.GetRawText()),
    };

    if (!string.IsNullOrWhiteSpace(request.System))
    {
        payload["system"] = request.System;
    }

    if (request.Tools is { ValueKind: JsonValueKind.Array } tools && tools.GetArrayLength() > 0)
    {
        payload["tools"] = JsonNode.Parse(tools.GetRawText());
    }

    using var content = new StringContent(payload.ToJsonString(), Encoding.UTF8, "application/json");

    HttpResponseMessage response;
    try
    {
        response = await client.PostAsync("v1/messages", content);
    }
    catch (Exception ex)
    {
        return Results.Problem($"Failed to reach the Anthropic API: {ex.Message}", statusCode: 502);
    }

    var body = await response.Content.ReadAsStringAsync();
    if (!response.IsSuccessStatusCode)
    {
        return Results.Problem($"Anthropic API error ({(int)response.StatusCode}): {body}", statusCode: 502);
    }

    // Hand back the content blocks untouched — the browser needs them verbatim to
    // continue the loop, and stop_reason tells it whether tools are still pending.
    using var doc = JsonDocument.Parse(body);
    var root = doc.RootElement;
    var result = new JsonObject
    {
        ["content"] = root.TryGetProperty("content", out var contentBlocks)
            ? JsonNode.Parse(contentBlocks.GetRawText())
            : (JsonNode?)new JsonArray(),
        ["stop_reason"] = root.TryGetProperty("stop_reason", out var stopReason)
            ? (JsonNode?)stopReason.GetString()
            : null,
    };

    return Results.Content(result.ToJsonString(), "application/json");
});

app.Run();

public class AssistantRequest
{
    /// <summary>Full Anthropic-shaped message history, forwarded as-is.</summary>
    [JsonPropertyName("messages")]
    public JsonElement? Messages { get; set; }

    [JsonPropertyName("system")]
    public string? System { get; set; }

    /// <summary>Tool definitions. The browser executes these itself and returns tool_result blocks.</summary>
    [JsonPropertyName("tools")]
    public JsonElement? Tools { get; set; }
}
