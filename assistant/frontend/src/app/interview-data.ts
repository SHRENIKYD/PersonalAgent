import { ConceptTopic } from './models';

/**
 * The non-technical side of interviews — behavioral and "tell me about yourself" style
 * questions. Technical prep already lives in DSA/CS/System Design/Web/Java; this is
 * specifically what those tabs don't cover. Same shell as the other concept tabs
 * (PrepConceptComponent): `definition` = what they're really asking, `howItWorks` = how to
 * structure an answer, `example` = a sample answer skeleton, `whyItMatters` = what a strong
 * answer signals to the interviewer.
 */
export const INTERVIEW_TOPICS: ConceptTopic[] = [
  {
    name: 'Classic Openers',
    items: [
      {
        name: '"Tell me about yourself"',
        definition: 'Not a request for your life story — it\'s asking you to give a short, relevant narrative that sets up why you\'re a fit for this specific role.',
        howItWorks: 'A reliable structure: present (what you do now) -> past (the relevant experience that got you here) -> future (why this role/company is the logical next step). Keep it under 90 seconds and skip anything not relevant to the job.',
        example: '"I\'m currently a [role] working on [relevant thing]. Before that, I [relevant past experience]. I\'m looking to move toward [this kind of role] because [specific, genuine reason tied to this company/role]."',
        whyItMatters: 'A rambling or overly personal answer here signals poor communication and self-awareness before a single technical question is even asked.',
      },
      {
        name: '"Why do you want to work here?"',
        definition: 'Checking whether you\'ve actually researched the company, or are just applying everywhere.',
        howItWorks: 'Name something specific — a product, a technical challenge, a value, a team you\'d work with — and connect it to your own goals or skills. Avoid generic answers like "great culture" or "growth opportunities" that could apply to any company.',
        example: '"I\'ve used [specific product] and I\'m interested in the technical challenge of [specific thing your team works on] — it lines up with the [skill/interest] I\'ve been building toward."',
        whyItMatters: 'A specific answer signals genuine interest and reduces the interviewer\'s risk of an offer being declined or an early departure.',
      },
      {
        name: '"What are your strengths and weaknesses?"',
        definition: 'Testing self-awareness — can you honestly assess yourself, and are you actively working on your gaps?',
        howItWorks: 'For strengths: pick one genuinely relevant to the role, with a concrete example. For weaknesses: name a real one (not a humble-brag like "I work too hard"), and — critically — describe the concrete steps you\'re taking to improve it.',
        example: '"One area I\'ve worked on is [real weakness]. I noticed it when [specific situation], so I started [concrete action], and it\'s already improved [measurable way]."',
        whyItMatters: 'A fake weakness ("I\'m a perfectist") is an instant credibility hit — interviewers hear it constantly and it signals you\'re not being straight with them.',
      },
      {
        name: '"Where do you see yourself in 5 years?"',
        definition: 'Checking whether your goals plausibly align with what this role can actually offer, and whether you\'re likely to stay.',
        howItWorks: 'Keep it directionally honest but flexible — describe the kind of growth (technical depth, leadership, scope) you want, framed as something this role is a genuine step toward, without over-promising an exact title or timeline.',
        whyItMatters: 'A wildly mismatched answer (wanting to run your own startup at a company hiring for long-term stability) raises a real retention concern.',
      },
    ],
  },
  {
    name: 'Behavioral (STAR Method)',
    items: [
      {
        name: 'The STAR Structure',
        definition: 'A structure for answering "tell me about a time when..." questions: Situation, Task, Action, Result.',
        howItWorks: 'Situation: brief context. Task: what you specifically needed to accomplish. Action: what YOU did (not "we" — be specific about your own contribution). Result: the outcome, ideally with a measurable impact ("reduced load time by 40%", "shipped 2 weeks early").',
        example: 'S: "Our checkout flow had a 15% drop-off." T: "I needed to find and fix the bottleneck." A: "I profiled the flow, found [specific issue], and [specific fix]." R: "Drop-off fell to 6% within a month."',
        whyItMatters: 'STAR is the format nearly every interviewer is implicitly grading against — answers that ramble without this shape read as unstructured thinking.',
      },
      {
        name: '"Tell me about a conflict with a coworker"',
        definition: 'Testing how you handle interpersonal friction professionally, not whether conflict happened at all.',
        howItWorks: 'Pick a real, moderate conflict (not a trivial one, not one that makes someone else look terrible). Focus on how you communicated, sought to understand their perspective, and reached a resolution — not on who was "right."',
        whyItMatters: 'Claiming you\'ve "never had a conflict" reads as either dishonest or as someone who avoids necessary friction — neither is a good signal.',
      },
      {
        name: '"Tell me about a time you failed"',
        definition: 'Testing whether you can own a real mistake and show what you learned, not whether you\'ve ever made one.',
        howItWorks: 'Pick a genuine failure with real stakes, be direct about your role in it (don\'t deflect blame), and spend most of the answer on what changed afterward — the lesson and how you applied it since.',
        whyItMatters: 'An answer that\'s secretly a humble-brag ("I failed because I cared too much") is one of the most obvious red flags to an experienced interviewer.',
      },
      {
        name: '"Tell me about a time you disagreed with a decision"',
        definition: 'Testing whether you can push back constructively and whether you can also accept a decision you disagreed with.',
        howItWorks: 'Describe how you raised the disagreement (with data/reasoning, not just opinion), and be honest about the outcome — whether you changed their mind, they changed yours, or you both compromised, and how you moved forward afterward regardless.',
        whyItMatters: 'Companies want people who\'ll speak up, but who can also execute on a decision once it\'s made — this question checks for both halves.',
      },
      {
        name: '"Describe a project you\'re proud of"',
        definition: 'A chance to show depth on something you genuinely understand well and can defend under follow-up questions.',
        howItWorks: 'Pick something with real technical or product substance, be ready for the interviewer to dig into specifics (why that architecture, what trade-offs you considered), and be honest about what you\'d do differently now.',
        whyItMatters: 'This question often turns into a mini technical deep-dive — picking something you can\'t actually defend under scrutiny backfires badly.',
      },
    ],
  },
  {
    name: 'Career & Motivation',
    items: [
      {
        name: '"Why are you leaving your current job?"',
        definition: 'Checking for red flags (fired for cause, can\'t work with others) versus a legitimate, forward-looking reason.',
        howItWorks: 'Frame it around what you\'re moving toward, not just what you\'re escaping. Never badmouth a former employer or manager, even if the reasons are genuinely bad — reframe honestly around growth, scope, or fit instead.',
        example: '"I\'ve grown a lot in my current role, but I\'m looking for [specific thing this role offers that the current one doesn\'t] — more ownership over X, deeper work in Y, etc."',
        whyItMatters: 'Badmouthing a previous employer is one of the fastest ways to make an interviewer wonder what you\'ll say about them later.',
      },
      {
        name: '"What are your salary expectations?"',
        definition: 'A negotiation moment, not just an information request — the first number stated often anchors the rest of the conversation.',
        howItWorks: 'Research market rate for the role/location/level beforehand. Where possible, give a range rather than a single number, and try to get the interviewer to share their budget first if the conversation allows it ("What range did you have in mind for this role?").',
        whyItMatters: 'Anchoring too low costs real money over the life of the job; anchoring wildly high without justification can end the conversation early.',
      },
      {
        name: '"Do you have any questions for us?"',
        definition: 'Always answer with real questions — this is your chance to evaluate them too, and "no" reads as disengagement.',
        howItWorks: 'Prepare 2-3 genuine questions in advance: something about the team\'s current challenges, how success is measured in this role, or what a typical first 90 days looks like. Avoid questions answerable by a 2-minute look at the company website.',
        example: '"What does success look like in this role after the first 6 months?" or "What\'s the biggest challenge the team is facing right now?"',
        whyItMatters: 'A candidate with no questions signals low genuine interest — this is one of the easiest, lowest-effort ways to leave a strong final impression.',
      },
      {
        name: 'Handling a Question You Don\'t Know',
        definition: 'How you respond to not knowing something is itself being evaluated — bluffing is worse than admitting a gap.',
        howItWorks: 'Say plainly that you\'re not sure, then reason through it out loud from what you do know, rather than guessing silently or making something up. If genuinely stuck, ask a clarifying question — it often unlocks the right direction.',
        whyItMatters: 'Interviewers regularly ask about things candidates won\'t know on purpose, specifically to see how they handle uncertainty — this is often more informative to them than a memorized right answer.',
      },
    ],
  },
];
