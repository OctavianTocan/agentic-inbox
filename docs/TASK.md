# Cogram Take-Home Task: Agentic Inbox

**Task:**

Build a web app where an agent autonomously processes a project email inbox, surfacing what it did and what needs human attention.

*Important: AI transcripts \- Your AI session transcripts are part of the required deliverables. Plan accordingly; export instructions are in the Deliverables section below.*

**Context:**

AEC project managers field hundreds of emails a week across active projects. The mix is uneven: most are routine, some carry real consequences. The agent's job is to handle the routine ones, surface the sensitive ones clearly, and never act on something it shouldn't.

The sample data is a snapshot: the inbox a project manager returns to after a few days away, with the agent having processed it in the background while they were out. In production, new emails would keep arriving; for this exercise, just treat the 80 as a fixed set without new incoming traffic.

The kinds of emails you'll see in the sample data:

* Routine: RFI submissions, daily reports, submittal logs, vendor quotes, schedule pings, status updates.  
* Often sensitive: change orders (money implications), claims and disputes (legal exposure), safety incidents, owner escalations.

A reasonable rule of thumb: if a wrong auto-reply could cost real money or create legal exposure, the agent should not auto-reply.

**Requirements / stages:**

1. The agent decides what to do with each email and acts where appropriate.   
2. Sensitive emails are never auto-actioned. The user can see what was deferred and why.  
3. The user can see what the agent did and why, and can act on it themselves.  
4. The user can get through the whole inbox quickly. Imagine they have five minutes between meetings.  
5. Wrong calls (where the agent made a wrong decision) should be easy to recover from.   
6. Build beyond the requirements. Show us what you can do. Anything you didn't get to, capture in the doc.

**What we're looking for:**

* Strong product taste, especially in agent UI/UX.  
* Speed and AI fluency. Ship fast, and use your coding agents well.  
* Good tradeoffs, clearly explained.  
* Show us what you can do; have fun.

**Timing:**

* Two hours and 30 minutes total. Plan to spend roughly two hours building and 30 minutes finishing the deliverables (writing the doc, recording the demo, exporting your AI transcripts, double-checking your run instructions).

**Resources:**

* Sample data: 80 simulated incoming emails as JSON. Each has sender, subject, body, timestamp. Mixed routine, sensitive, and ambiguous ones. The dataset is available for download [here](https://cdn.cogram.com/cogram-take-home-agentic-inbox-email-dataset.json).  
* An [OpenRouter](https://openrouter.ai/docs/quickstart) API key with credit (see email). Choose any model you like; we recommend something fast so LLM calls don’t slow you down unnecessarily, like `google/gemini-3-flash-preview`.  
  * Note: You’re free to use OpenRouter and we’re giving you a key to make things easier, but it’s not a requirement. If you choose another approach, please let us know how to run it in the submission. We can use our API keys for common providers (OpenAI, Anthropic, Google).  
* Stack and tooling: whatever you like.

**Deliverables:**

* A running app with complete build and run instructions. It should work on a clean macOS machine. Feel free to Dockerise if it is easier (not required).  
* Source code as a zip file, or a GitHub repo invite to `@ricwo`. Feel free to bundle the remaining deliverables in there too (though that’s not required).  
* A short document covering what you built, the architecture, known gaps, and what you'd build next.  
* A narrated screen recording, two to three minutes max. Walk us through the app as if we're a new user seeing it for the first time. You can use a native screen recording, Loom, or anything else you like (just make sure you’re audible).  
* AI session transcripts from your coding session(s). Export depends on your tool:  
  * Claude Code: run `/export <filename>.md` inside the session.  
  * Codex CLI: attach the JSONL from `~/.codex/sessions/<YYYY>/<MM>/<DD>/rollout-*.jsonl`.  
  * Cursor: use the chat's `...` menu and select "Export Chat".  
  * Anything else: send whatever you can extract from your tool.