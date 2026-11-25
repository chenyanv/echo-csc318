# Echo — high-fidelity prototype (CSC318 A3)

AI-assisted dating for UTSG students, from first interest to a first date, with people in control of the pace.
**Live:** https://echo-csc318.vercel.app · Facilitator panel: https://echo-csc318.vercel.app/facilitator

All profiles and match replies are fictional. See [PLAN.md](PLAN.md) for the design decisions behind it.

## Run it locally

```bash
npm install
npm run dev
```

Open http://localhost:5173. Tests: `npm test`. Production build: `npm run build` (output in `dist/`).

## Deploy

The app is a static site, so any static host works. Vercel picks up `vercel.json` automatically:

- **From GitHub:** import the repo at vercel.com/new. Every push to `main` redeploys.
- **From this folder:** `npx vercel` (first run asks you to log in), then `npx vercel --prod`.

## On-device AI

Echo's AI (Llama 3.2 1B, via [WebLLM](https://github.com/mlc-ai/web-llm)) runs in the browser on WebGPU.
Nothing is sent to a server.

- The first load downloads about 670 MB, then it's cached by the browser.
- Works best in recent Chrome or Edge on a laptop. Where WebGPU isn't available, Echo switches to
  pre-written **demo replies**, and the whole flow still works.
- The model only writes Echo's questions. Anything an Echo says *about a person* is built from their
  real profile, because in testing the 1B model invented details (see PLAN.md §2.1).
- `/lab` compares the candidate models.

## Running a study session

Open **Profile → For researchers → Facilitator panel**, or go to `/facilitator`.

1. **Before the participant arrives:** click *Load model* so they don't wait for the download.
2. **Start a task:** pick New user or T1–T5. This resets the device to that task's starting state and
   opens its first screen.
3. **Alex's side:** by default Alex agrees to Echo chat and suggests 5 pm for the first date invite,
   then accepts. Switch to *Wait for me* to drive Alex with the buttons instead.
4. **After the session:** enter the participant code and *Export log*. The log has screens, actions and
   timings only; it never stores what the participant typed.

| Task | Starts at | What it covers |
|---|---|---|
| New user | Welcome | Sign-up, profile setup, Quick Chat |
| T1 | Home | Today's match, reasons, pass / undo |
| T2 | Chat with Alex | Getting to know someone |
| T3 | Alex's profile | Planning a date, handling a reschedule, add to calendar |
| T4 | Chat with Alex | Alex's Echo chat request, joining as yourself |
| T5 | Alex's profile | After-date reflection, swapping Instagrams |

## Project layout

```
src/
  ai/          on-device model (WebLLM worker), Echo turn logic, prompts
  components/  shell, chat bubbles, shared UI
  data/        fictional profiles, planner options, scripted lines
  lib/         match reasons, calendar export, formatting
  pages/       one file per screen
  state/       reducer, presets, store, scripted partner, facilitator settings, session log
```
