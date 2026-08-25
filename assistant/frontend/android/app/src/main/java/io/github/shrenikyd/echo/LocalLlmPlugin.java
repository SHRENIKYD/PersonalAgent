package io.github.shrenikyd.echo;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import java.net.HttpURLConnection;
import java.net.URL;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.mediapipe.tasks.genai.llminference.LlmInference;
import com.google.mediapipe.tasks.genai.llminference.LlmInference.LlmInferenceOptions;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Runs a language model on the device, so the app can answer without an API key.
 *
 * The model is a LiteRT .task file — around a gigabyte — which is far too large to ship
 * inside the APK and too large to hand through the WebView as a JavaScript File. So it is
 * copied natively, streamed from the picked document straight to app storage, and the web
 * layer only ever sees a path and a status.
 *
 * Loading and generation both block for a long time (seconds to load, seconds per answer),
 * so they run on a single background thread. One thread, not a pool: the underlying engine
 * holds one session and concurrent calls into it are not safe.
 */
@CapacitorPlugin(name = "LocalLlm")
public class LocalLlmPlugin extends Plugin {

    private static final String MODEL_DIR = "models";
    private static final String MODEL_FILE = "model.task";

    /** Kept small deliberately — a phone cannot afford a large window of KV cache. */
    private static final int MAX_TOKENS = 1024;

    private final ExecutorService worker = Executors.newSingleThreadExecutor();
    private LlmInference engine;
    private volatile boolean cancelDownload;

    private File modelFile() {
        File dir = new File(getContext().getFilesDir(), MODEL_DIR);
        if (!dir.exists()) dir.mkdirs();
        return new File(dir, MODEL_FILE);
    }

    @PluginMethod
    public void getStatus(PluginCall call) {
        File f = modelFile();
        JSObject out = new JSObject();
        out.put("available", true);
        out.put("modelPresent", f.exists() && f.length() > 0);
        out.put("sizeBytes", f.exists() ? f.length() : 0);
        out.put("loaded", engine != null);
        out.put("path", f.getAbsolutePath());
        call.resolve(out);
    }

    /**
     * Opens the system document picker. The file is copied rather than read in place because
     * a content:// URI is not guaranteed to survive a restart, and the engine needs a real
     * path it can memory-map.
     */
    @PluginMethod
    public void importModel(PluginCall call) {
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType("*/*");
        startActivityForResult(call, intent, "onModelPicked");
    }

    @ActivityCallback
    private void onModelPicked(PluginCall call, ActivityResult result) {
        if (call == null) return;
        if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null) {
            call.reject("No file chosen.");
            return;
        }
        final Uri uri = result.getData().getData();
        if (uri == null) {
            call.reject("No file chosen.");
            return;
        }

        worker.execute(() -> {
            // Copy to a temporary name first, so an interrupted copy cannot leave a
            // half-written file that looks like a usable model.
            File dest = modelFile();
            File temp = new File(dest.getAbsolutePath() + ".part");
            try (InputStream in = getContext().getContentResolver().openInputStream(uri);
                 OutputStream out = new FileOutputStream(temp)) {
                if (in == null) throw new IllegalStateException("Could not open the chosen file.");
                byte[] buf = new byte[1 << 20];
                int n;
                while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
            } catch (Exception e) {
                temp.delete();
                call.reject("Copy failed: " + e.getMessage());
                return;
            }

            closeEngine();
            dest.delete();
            if (!temp.renameTo(dest)) {
                temp.delete();
                call.reject("Could not move the model into place.");
                return;
            }

            JSObject out = new JSObject();
            out.put("modelPresent", true);
            out.put("sizeBytes", dest.length());
            call.resolve(out);
        });
    }


    /**
     * Fetches the model over the network instead of asking the user to find a file.
     *
     * Progress is reported as an event rather than resolving late, because a gigabyte over a
     * phone connection is minutes long and a silent wait is indistinguishable from a hang.
     * The same .part-then-rename dance as the picker: a download interrupted halfway must not
     * leave something that looks like a usable model.
     */
    @PluginMethod
    public void downloadModel(PluginCall call) {
        final String url = call.getString("url", "");
        if (url == null || !url.startsWith("https://")) {
            call.reject("Needs an https URL.");
            return;
        }
        cancelDownload = false;

        worker.execute(() -> {
            File dest = modelFile();
            File temp = new File(dest.getAbsolutePath() + ".part");
            HttpURLConnection conn = null;
            try {
                conn = (HttpURLConnection) new URL(url).openConnection();
                conn.setConnectTimeout(30000);
                conn.setReadTimeout(60000);
                // Release assets redirect to a storage host; without this the body is the
                // redirect page rather than the model.
                conn.setInstanceFollowRedirects(true);
                conn.connect();

                int code = conn.getResponseCode();
                if (code < 200 || code >= 300) {
                    call.reject("Download failed: HTTP " + code);
                    return;
                }
                long total = conn.getContentLengthLong();

                try (InputStream in = conn.getInputStream();
                     OutputStream out = new FileOutputStream(temp)) {
                    byte[] buf = new byte[1 << 20];
                    long done = 0;
                    long lastNotified = 0;
                    int n;
                    while ((n = in.read(buf)) > 0) {
                        if (cancelDownload) {
                            temp.delete();
                            call.reject("Download cancelled.");
                            return;
                        }
                        out.write(buf, 0, n);
                        done += n;
                        // Every few megabytes, not every chunk: a progress event per 1MB read
                        // floods the bridge and slows the download it is reporting on.
                        if (done - lastNotified >= (8 << 20)) {
                            lastNotified = done;
                            JSObject p = new JSObject();
                            p.put("received", done);
                            p.put("total", total);
                            notifyListeners("downloadProgress", p);
                        }
                    }
                }
            } catch (Exception e) {
                temp.delete();
                call.reject("Download failed: " + e.getMessage());
                return;
            } finally {
                if (conn != null) conn.disconnect();
            }

            closeEngine();
            dest.delete();
            if (!temp.renameTo(dest)) {
                temp.delete();
                call.reject("Could not move the model into place.");
                return;
            }

            JSObject out = new JSObject();
            out.put("modelPresent", true);
            out.put("sizeBytes", dest.length());
            call.resolve(out);
        });
    }

    @PluginMethod
    public void cancelDownload(PluginCall call) {
        cancelDownload = true;
        call.resolve();
    }

    @PluginMethod
    public void load(PluginCall call) {
        File f = modelFile();
        if (!f.exists() || f.length() == 0) {
            call.reject("No model file on this device yet.");
            return;
        }
        worker.execute(() -> {
            try {
                if (engine == null) {
                    LlmInferenceOptions options = LlmInferenceOptions
                        .builder()
                        .setModelPath(f.getAbsolutePath())
                        .setMaxTokens(MAX_TOKENS)
                        .build();
                    engine = LlmInference.createFromOptions(getContext(), options);
                }
                JSObject out = new JSObject();
                out.put("loaded", true);
                call.resolve(out);
            } catch (Throwable t) {
                // Throwable, not Exception: a model too large for available memory surfaces
                // as an Error from the native layer, and that has to reach the user as a
                // message rather than killing the app.
                closeEngine();
                call.reject("Could not load the model: " + t.getMessage());
            }
        });
    }

    @PluginMethod
    public void generate(PluginCall call) {
        String prompt = call.getString("prompt", "");
        if (prompt == null || prompt.trim().isEmpty()) {
            call.reject("Nothing to answer.");
            return;
        }
        worker.execute(() -> {
            try {
                if (engine == null) {
                    call.reject("The model is not loaded.");
                    return;
                }
                long started = System.currentTimeMillis();
                String text = engine.generateResponse(prompt);
                JSObject out = new JSObject();
                out.put("text", text == null ? "" : text);
                out.put("ms", System.currentTimeMillis() - started);
                call.resolve(out);
            } catch (Throwable t) {
                call.reject("Generation failed: " + t.getMessage());
            }
        });
    }

    @PluginMethod
    public void unload(PluginCall call) {
        worker.execute(() -> {
            closeEngine();
            JSObject out = new JSObject();
            out.put("loaded", false);
            call.resolve(out);
        });
    }

    @PluginMethod
    public void deleteModel(PluginCall call) {
        worker.execute(() -> {
            closeEngine();
            modelFile().delete();
            JSObject out = new JSObject();
            out.put("modelPresent", false);
            call.resolve(out);
        });
    }

    private void closeEngine() {
        if (engine == null) return;
        try {
            engine.close();
        } catch (Throwable ignored) {
            // Closing a already-broken engine must not mask the error that led here.
        }
        engine = null;
    }
}
