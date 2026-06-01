const DEFAULT_PROMPT_ID = "pmpt_69cd0f0626e88197ab6100e38b46b65a0ebc4aff65bc5102";
const CHATBOT_PROMPT_ID =
  process.env.OPENAI_SUPPORT_PROMPT_ID ?? DEFAULT_PROMPT_ID;
const CHATBOT_PROMPT_VERSION = process.env.OPENAI_SUPPORT_PROMPT_VERSION ?? "1";
const CHATBOT_V4_PROMPT_ID =
  process.env.OPENAI_SUPPORT_V4_PROMPT_ID ?? DEFAULT_PROMPT_ID;
const CHATBOT_V4_PROMPT_VERSION =
  process.env.OPENAI_SUPPORT_V4_PROMPT_VERSION ?? "4";
const CHATBOT_V7_PROMPT_ID =
  process.env.OPENAI_SUPPORT_V7_PROMPT_ID ?? DEFAULT_PROMPT_ID;
const CHATBOT_V7_PROMPT_VERSION =
  process.env.OPENAI_SUPPORT_V7_PROMPT_VERSION ?? "7";

export type ChatbotMessage = {
  role: string;
  content: string;
};

export type ChatbotRequestPayload = {
  messages: ChatbotMessage[];
  usertype: string;
  question: string;
  previous_response_id?: string | null;
};

export function getChatbotConfig() {
  return {
    promptId: CHATBOT_PROMPT_ID,
    promptVersion: CHATBOT_PROMPT_VERSION,
    v4PromptId: CHATBOT_V4_PROMPT_ID,
    v4PromptVersion: CHATBOT_V4_PROMPT_VERSION,
    v7PromptId: CHATBOT_V7_PROMPT_ID,
    v7PromptVersion: CHATBOT_V7_PROMPT_VERSION,
  };
}

export async function parseChatbotRequest(req: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return {
      ok: false as const,
      response: Response.json(
        { detail: "OPENAI_API_KEY is not configured for chatbot requests." },
        { status: 500 },
      ),
    };
  }

  const payload = (await req.json()) as ChatbotRequestPayload;

  if (!payload.question?.trim()) {
    return {
      ok: false as const,
      response: Response.json({ detail: "Question is required." }, { status: 400 }),
    };
  }

  return {
    ok: true as const,
    apiKey,
    payload,
  };
}

export function chatbotErrorResponse(error: unknown) {
  const detail =
    error instanceof Error ? error.message : "Unknown chatbot request failure.";
  return Response.json(
    { detail: `Chatbot request failed: ${detail}` },
    { status: 502 },
  );
}
