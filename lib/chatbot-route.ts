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
const CHATBOT_V8_PROMPT_ID =
  process.env.OPENAI_SUPPORT_V8_PROMPT_ID ?? DEFAULT_PROMPT_ID;
const CHATBOT_V8_PROMPT_VERSION =
  process.env.OPENAI_SUPPORT_V8_PROMPT_VERSION ?? "8";
const CHATBOT_LATEST_PROMPT_ID =
  process.env.OPENAI_SUPPORT_LATEST_PROMPT_ID ?? DEFAULT_PROMPT_ID;

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
    v8PromptId: CHATBOT_V8_PROMPT_ID,
    v8PromptVersion: CHATBOT_V8_PROMPT_VERSION,
    latestPromptId: CHATBOT_LATEST_PROMPT_ID,
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

function ensureTerminalPunctuation(text: string) {
  if (!text) {
    return text;
  }

  if (/[.!?:"')\]]$/.test(text)) {
    return text;
  }

  if (/(https?:\/\/|www\.)\S+$/.test(text)) {
    return text;
  }

  if (/\[[^\]]+\]\((?:https?:\/\/|mailto:)[^)]+\)$/.test(text)) {
    return text;
  }

  return `${text}.`;
}

function normalizeLine(line: string) {
  const trimmed = line.trim().replace(/[ \t]{2,}/g, " ");

  if (!trimmed) {
    return "";
  }

  const bulletMatch = trimmed.match(/^([-*•])\s*(.*)$/);
  if (bulletMatch) {
    const [, bullet, content] = bulletMatch;
    return `${bullet} ${content.trim().replace(/[ \t]{2,}/g, " ")}`;
  }

  return trimmed;
}

export function normalizeChatbotAnswer(answer: string) {
  const normalizedParagraphs = answer
    .replace(/\r\n?/g, "\n")
    .trim()
    .split(/\n{2,}/)
    .map((paragraph) => {
      const normalizedLines = paragraph
        .split("\n")
        .map(normalizeLine)
        .filter(Boolean);

      if (!normalizedLines.length) {
        return "";
      }

      const allBulletLines = normalizedLines.every((line) => /^[-*•]\s+/.test(line));
      if (allBulletLines) {
        return normalizedLines.join("\n");
      }

      if (normalizedLines.length === 1) {
        return ensureTerminalPunctuation(normalizedLines[0]);
      }

      return normalizedLines
        .map((line) => (/^[-*•]\s+/.test(line) ? line : ensureTerminalPunctuation(line)))
        .join("\n");
    })
    .filter(Boolean);

  return normalizedParagraphs.join("\n\n");
}
