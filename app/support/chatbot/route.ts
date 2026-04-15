import { NextRequest } from "next/server";
import OpenAI from "openai";

const CHATBOT_PROMPT_ID =
  process.env.OPENAI_SUPPORT_PROMPT_ID ??
  "pmpt_69cd0f0626e88197ab6100e38b46b65a0ebc4aff65bc5102";
const CHATBOT_PROMPT_VERSION = process.env.OPENAI_SUPPORT_PROMPT_VERSION ?? "1";

type ChatbotMessage = {
  role: string;
  content: string;
};

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return Response.json(
      { detail: "OPENAI_API_KEY is not configured for chatbot requests." },
      { status: 500 },
    );
  }

  const { messages, usertype, question, previous_response_id } = (await req.json()) as {
    messages: ChatbotMessage[];
    usertype: string;
    question: string;
    previous_response_id?: string | null;
  };

  if (!question?.trim()) {
    return Response.json({ detail: "Question is required." }, { status: 400 });
  }

  const openai = new OpenAI({ apiKey });

  const requestArgs: Record<string, unknown> = {
    prompt: {
      id: CHATBOT_PROMPT_ID,
      version: CHATBOT_PROMPT_VERSION,
      variables: {
        usertype,
      },
    },
  };

  if (previous_response_id) {
    requestArgs.previous_response_id = previous_response_id;
    requestArgs.input = [
      {
        role: "user",
        content: [{ type: "input_text", text: question }],
      },
    ];
  } else {
    requestArgs.input = messages.map((message) => ({
      role: message.role,
      content: [{ type: "input_text", text: message.content }],
    }));
  }

  try {
    const response = await openai.responses.create(requestArgs);
    const answer = response.output_text?.trim();

    if (!answer) {
      return Response.json(
        { detail: "Chatbot response did not contain text output." },
        { status: 502 },
      );
    }

    return Response.json({
      answer,
      response_id: response.id,
      handoffSuggested: false,
    });
  } catch (error) {
    const detail =
      error instanceof Error ? error.message : "Unknown chatbot request failure.";
    return Response.json(
      { detail: `Chatbot request failed: ${detail}` },
      { status: 502 },
    );
  }
}
