# TPT Support Demo

This repository contains a prompt-driven Teachers Pay Teachers support demo built with Next.js.

It combines:

- a floating support bot for instant answers
- a guided Contact Us flow that routes users into the right support path
- a submission payload view that captures request details, client context, and bot transcript data

The app is designed to demonstrate a support experience where the bot handles straightforward questions and then hands users into a sharper contact form when human review is needed.

## What the demo includes

- Prompt-backed support bot using the OpenAI Responses API
- Clickable bot links with support for markdown-style links and bold text
- Human handoff into the most likely contact flow after repeated failed bot attempts
- Contact flow taxonomy for refunds, login issues, technical problems, school purchasing, seller issues, and fallback `Other`
- Submission payload with:
  - topic area and issue
  - tags
  - name, email, and user ID when available
  - browser, OS, device, IP, and user-agent context
  - an ordered user/bot transcript when the support bot was used
  - `usedBot` to distinguish direct-form users from bot-routed users

## Tech stack

- Next.js 16
- React 19
- TypeScript
- OpenAI Node SDK
- Tailwind CSS 4

## Environment variables

Create a local `.env.local` file with:

```bash
OPENAI_API_KEY=sk-proj-...
OPENAI_SUPPORT_PROMPT_ID=pmpt_...
OPENAI_SUPPORT_PROMPT_VERSION=1
OPENAI_SUPPORT_V4_PROMPT_ID=pmpt_69cd0f0626e88197ab6100e38b46b65a0ebc4aff65bc5102
OPENAI_SUPPORT_V4_PROMPT_VERSION=4
OPENAI_SUPPORT_V7_PROMPT_ID=pmpt_69cd0f0626e88197ab6100e38b46b65a0ebc4aff65bc5102
OPENAI_SUPPORT_V7_PROMPT_VERSION=7
```

Notes:

- `OPENAI_SUPPORT_PROMPT_ID` should point to the prompt used by `/support/chatbot`
- `OPENAI_SUPPORT_PROMPT_VERSION` is typically `1` unless you want a different saved prompt version
- `OPENAI_SUPPORT_V4_PROMPT_ID` and `OPENAI_SUPPORT_V4_PROMPT_VERSION` control `/support/chatbot/v4`
- `OPENAI_SUPPORT_V7_PROMPT_ID` and `OPENAI_SUPPORT_V7_PROMPT_VERSION` control the prompt-backed `/support/chatbot/v7` path
- the bot is currently prompt-based, not ChatKit-based
- `/dynamic-v4` uses prompt version 4, while `/dynamic-v7` uses prompt version 7

## Local development

Install dependencies:

```bash
npm install
```

Run the app:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

```bash
npm run dev
npm run build
npm run start
```

## Key app paths

- `app/page.tsx`
  Main entry page
- `app/support/chatbot/route.ts`
  Server route that sends support questions to OpenAI using the configured prompt
- `app/api/client-context/route.ts`
  Server route that derives browser, OS, device, IP, and user-agent context for submissions
- `components/CxChatWidget.tsx`
  Floating support bot UI
- `components/SupportExperience.tsx`
  Contact-flow experience, submission payload construction, and bot handoff logic

## Deployment

The app is deployed on Vercel.

For Vercel project settings, add these environment variables for `Production`, `Preview`, and `Development`:

```bash
OPENAI_API_KEY
OPENAI_SUPPORT_PROMPT_ID
OPENAI_SUPPORT_PROMPT_VERSION
```

## Behavior notes

- The bot first tries to answer questions directly through the configured OpenAI prompt
- If the answer is not helpful and the user rejects it twice, the UI routes them into the closest matching contact flow
- If no match is clear, the fallback route is `Other / Not Sure`
- The transcript is kept in the submission payload for support review, but it is not shown back to the user in the visible form

## Repository purpose

This is a demo/support prototype, not a production TPT support backend. The contact form submission currently demonstrates payload capture and UI flow rather than sending tickets into a live CX system.
