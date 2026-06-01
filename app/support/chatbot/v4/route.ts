import OpenAI from "openai";

import {
  chatbotErrorResponse,
  getChatbotConfig,
  parseChatbotRequest,
} from "@/lib/chatbot-route";
import { findRelevantArticles } from "@/lib/knowledge-base";

function buildGroundedPrompt(usertype: string, question: string) {
  const relevantArticles = findRelevantArticles(question, 5);
  const articleContext = relevantArticles
    .map((article, index) => {
      const snippet = article.snippet.replace(/\s+/g, " ").trim();
      return `Article ${index + 1}: ${article.title}\nSource: ${article.url}\nSnippet: ${snippet}`;
    })
    .join("\n\n");

  return [
    "You are TPT Bot helping Teachers Pay Teachers users.",
    `User type: ${usertype || "Unknown"}`,
    "Answer using the provided Help Center context when possible.",
    "If the context is incomplete, say so clearly instead of inventing details.",
    "When helpful, include the relevant Help Center source URL from the provided context.",
    "Keep the answer concise and support-focused.",
    "",
    "Help Center context:",
    articleContext || "No matching Help Center articles were found.",
  ].join("\n");
}

export async function POST(req: Request) {
  const parsed = await parseChatbotRequest(req);
  if (!parsed.ok) {
    return parsed.response;
  }

  const { apiKey, payload } = parsed;
  const openai = new OpenAI({ apiKey });
  const { v4Model } = getChatbotConfig();

  try {
    const response = await openai.chat.completions.create({
      model: v4Model,
      messages: [
        {
          role: "system",
          content: buildGroundedPrompt(payload.usertype, payload.question),
        },
        ...payload.messages.map((message) => ({
          role: message.role as "user" | "assistant" | "system",
          content: message.content,
        })),
      ],
    });

    const answer = response.choices[0]?.message?.content?.trim();

    if (!answer) {
      return Response.json(
        { detail: "Chatbot response did not contain text output." },
        { status: 502 },
      );
    }

    return Response.json({
      answer,
      response_id: null,
      handoffSuggested: false,
    });
  } catch (error) {
    return chatbotErrorResponse(error);
  }
}
