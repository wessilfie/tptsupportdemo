import OpenAI from "openai";

import {
  chatbotErrorResponse,
  getChatbotConfig,
  parseChatbotRequest,
} from "@/lib/chatbot-route";

export async function POST(req: Request) {
  const parsed = await parseChatbotRequest(req);
  if (!parsed.ok) {
    return parsed.response;
  }

  const { apiKey, payload } = parsed;
  const openai = new OpenAI({ apiKey });
  const { v7PromptId, v7PromptVersion } = getChatbotConfig();

  const requestArgs: Record<string, unknown> = {
    prompt: {
      id: v7PromptId,
      version: v7PromptVersion,
      variables: {
        usertype: payload.usertype,
      },
    },
  };

  if (payload.previous_response_id) {
    requestArgs.previous_response_id = payload.previous_response_id;
    requestArgs.input = [
      {
        role: "user",
        content: [{ type: "input_text", text: payload.question }],
      },
    ];
  } else {
    requestArgs.input = payload.messages.map((message) => ({
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
    return chatbotErrorResponse(error);
  }
}
