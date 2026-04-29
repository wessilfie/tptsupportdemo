import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { Apple, MessageCircleQuestion, Send, Star, X } from "lucide-react";

export type ChatUserType = "Buyer" | "Seller" | "Publisher" | "Other";

type ChatStage =
  | "initial"
  | "awaiting_usertype"
  | "answering"
  | "awaiting_resolution"
  | "awaiting_rephrase"
  | "awaiting_rating"
  | "escalated";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type ChatbotApiResponse = {
  answer: string;
  response_id?: string | null;
  handoffSuggested?: boolean;
};

export type ChatHandoffContext = {
  userType: ChatUserType | null;
  originalQuestion: string;
  restatedQuestion: string | null;
  transcript: ChatMessage[];
};

type CxChatWidgetProps = {
  onEscalate: (context: ChatHandoffContext) => void;
};

const GREETING = "Hi! How can I help you today?";
const USERTYPE_PROMPT = "How are you reaching out today?";
const STARTER_QUESTIONS = [
  "I need help logging in",
  "I'm having issues printing a file",
  "I need assistance purchasing",
] as const;
const MARKDOWN_LINK_PATTERN = /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/gi;
const URL_PATTERN = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;
const BOLD_PATTERN = /(\*\*[^*]+\*\*)/g;

function buildId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function renderMessageContent(content: string) {
  const nodes: React.ReactNode[] = [];
  let cursor = 0;
  let matchIndex = 0;

  for (const match of content.matchAll(MARKDOWN_LINK_PATTERN)) {
    const fullMatch = match[0];
    const label = match[1];
    const href = match[2];
    const start = match.index ?? 0;

    if (start > cursor) {
      nodes.push(...renderPlainTextWithUrls(content.slice(cursor, start), `text-${matchIndex}`));
    }

    nodes.push(
      <a
        key={`md-${matchIndex}-${href}`}
        href={href}
        target="_blank"
        rel="noreferrer"
        className="break-words font-medium text-[#1b5e4b] underline underline-offset-2"
      >
        {label}
      </a>,
    );

    cursor = start + fullMatch.length;
    matchIndex += 1;
  }

  if (cursor < content.length) {
    nodes.push(...renderPlainTextWithUrls(content.slice(cursor), `tail-${matchIndex}`));
  }

  return nodes;
}

function renderPlainTextWithUrls(content: string, keyPrefix: string) {
  const parts = content.split(URL_PATTERN);

  return parts.map((part, index) => {
    if (!part) {
      return null;
    }

    if (part.match(URL_PATTERN)) {
      const href = part.startsWith("http") ? part : `https://${part}`;
      return (
        <a
          key={`${keyPrefix}-url-${href}-${index}`}
          href={href}
          target="_blank"
          rel="noreferrer"
          className="break-words font-medium text-[#1b5e4b] underline underline-offset-2"
        >
          {part}
        </a>
      );
    }

    return (
      <span key={`${keyPrefix}-text-${index}`}>
        {renderFormattedText(part, `${keyPrefix}-formatted-${index}`)}
      </span>
    );
  });
}

function renderFormattedText(content: string, keyPrefix: string) {
  const lines = content.split("\n");

  return lines.map((line, lineIndex) => {
    const isBullet = /^\s*[-*•]\s+/.test(line);
    const normalizedLine = isBullet ? line.replace(/^\s*[-*•]\s+/, "") : line;
    const parts = normalizedLine.split(BOLD_PATTERN);
    const formattedParts = parts.map((part, partIndex) => {
      if (!part) {
        return null;
      }

      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong
            key={`${keyPrefix}-bold-${lineIndex}-${partIndex}`}
            className="font-semibold text-slate-900"
          >
            {part.slice(2, -2)}
          </strong>
        );
      }

      return <span key={`${keyPrefix}-plain-${lineIndex}-${partIndex}`}>{part}</span>;
    });

    if (isBullet) {
      return (
        <div
          key={`${keyPrefix}-line-${lineIndex}`}
          className="flex items-start gap-2"
        >
          <span className="pt-[0.45rem] text-[0.55rem] leading-none text-current">●</span>
          <span>{formattedParts}</span>
        </div>
      );
    }

    return (
      <span key={`${keyPrefix}-line-${lineIndex}`}>
        {formattedParts}
        {lineIndex < lines.length - 1 ? <br /> : null}
      </span>
    );
  });
}

export function CxChatWidget({ onEscalate }: CxChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showTooltip, setShowTooltip] = useState(true);
  const [stage, setStage] = useState<ChatStage>("awaiting_usertype");
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: buildId(), role: "assistant", content: GREETING },
    { id: buildId(), role: "assistant", content: USERTYPE_PROMPT },
  ]);
  const [modelMessages, setModelMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [userType, setUserType] = useState<ChatUserType | null>(null);
  const [originalQuestion, setOriginalQuestion] = useState("");
  const [restatedQuestion, setRestatedQuestion] = useState<string | null>(null);
  const [noCount, setNoCount] = useState(0);
  const [rating, setRating] = useState<number | null>(null);
  const [previousResponseId, setPreviousResponseId] = useState<string | null>(null);
  const [keyboardInset, setKeyboardInset] = useState(0);

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setShowTooltip(false), 3500);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading, stage]);

  useEffect(() => {
    if (isOpen && (stage === "initial" || stage === "awaiting_rephrase")) {
      window.setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [isOpen, stage]);

  useEffect(() => {
    if (!inputRef.current) {
      return;
    }

    inputRef.current.style.height = "0px";
    inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 128)}px`;
  }, [input]);

  useEffect(() => {
    if (typeof window === "undefined" || !window.visualViewport) {
      return;
    }

    const viewport = window.visualViewport;

    const syncKeyboardInset = () => {
      const nextInset = Math.max(
        0,
        window.innerHeight - viewport.height - viewport.offsetTop,
      );
      setKeyboardInset(nextInset);
    };

    syncKeyboardInset();
    viewport.addEventListener("resize", syncKeyboardInset);
    viewport.addEventListener("scroll", syncKeyboardInset);

    return () => {
      viewport.removeEventListener("resize", syncKeyboardInset);
      viewport.removeEventListener("scroll", syncKeyboardInset);
    };
  }, []);

  const transcriptForLogging = useMemo(
    () => ({
      userType,
      rating,
      noCount,
      originalQuestion,
      restatedQuestion,
      messages,
    }),
    [messages, noCount, originalQuestion, rating, restatedQuestion, userType],
  );

  function appendMessage(role: ChatMessage["role"], content: string) {
    setMessages((current) => [...current, { id: buildId(), role, content }]);
  }

  function resetConversation() {
    setStage("awaiting_usertype");
    setMessages([
      { id: buildId(), role: "assistant", content: GREETING },
      { id: buildId(), role: "assistant", content: USERTYPE_PROMPT },
    ]);
    setModelMessages([]);
    setInput("");
    setIsLoading(false);
    setUserType(null);
    setOriginalQuestion("");
    setRestatedQuestion(null);
    setNoCount(0);
    setRating(null);
    setPreviousResponseId(null);
  }

  async function requestAnswer(question: string, resolvedUserType = userType) {
    if (!resolvedUserType) {
      return;
    }

    const trimmedQuestion = question.trim();
    if (!trimmedQuestion) {
      return;
    }

    const nextModelMessages = [
      ...modelMessages,
      { id: buildId(), role: "user" as const, content: trimmedQuestion },
    ];

    setIsLoading(true);
    setStage("answering");

    try {
      const response = await fetch("/support/chatbot", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: nextModelMessages.map(({ role, content }) => ({ role, content })),
          usertype: resolvedUserType,
          question: trimmedQuestion,
          previous_response_id: previousResponseId,
        }),
      });

      if (!response.ok) {
        let detail = `Chatbot request failed with status ${response.status}`;
        try {
          const errorPayload = (await response.json()) as { detail?: string };
          if (errorPayload.detail) {
            detail = errorPayload.detail;
          }
        } catch {
          // Keep the status fallback when the response body is not JSON.
        }
        throw new Error(detail);
      }

      const data = (await response.json()) as ChatbotApiResponse;
      const answer =
        data.answer?.trim() ||
        "I couldn't find a reliable answer just now. Please restate the question and I’ll try again.";

      const updatedModelMessages = [
        ...nextModelMessages,
        { id: buildId(), role: "assistant" as const, content: answer },
      ];

      setModelMessages(updatedModelMessages);
      setPreviousResponseId(data.response_id ?? null);
      appendMessage("assistant", answer);

      if (data.handoffSuggested) {
        appendMessage(
          "assistant",
          "I should hand this over to the contact form so the CX team can follow up directly.",
        );
        const context: ChatHandoffContext = {
          userType: resolvedUserType,
          originalQuestion: originalQuestion || trimmedQuestion,
          restatedQuestion,
          transcript: [...messages, { id: buildId(), role: "user", content: trimmedQuestion }],
        };
        onEscalate(context);
        setStage("escalated");
        return;
      }

      appendMessage("assistant", "Did that answer your question?");
      setStage("awaiting_resolution");
    } catch (error) {
      console.error("TPT CX chatbot error", error);
      appendMessage(
        "assistant",
        error instanceof Error
          ? `I’m having trouble responding right now: ${error.message}`
          : "Something went wrong reaching the bot. Please restate the question or use the contact form below.",
      );
      setStage("awaiting_rephrase");
    } finally {
      setIsLoading(false);
    }
  }

  function submitCurrentMessage() {
    if (stage !== "initial" && stage !== "awaiting_rephrase") {
      return;
    }

    const text = input.trim();
    if (!text || isLoading) {
      return;
    }

    appendMessage("user", text);
    setInput("");

    if (!originalQuestion) {
      setOriginalQuestion(text);
    }

    if (stage === "awaiting_rephrase") {
      setRestatedQuestion(text);
      void requestAnswer(text);
      return;
    }

    void requestAnswer(text);
  }

  function handleSend(event: FormEvent) {
    event.preventDefault();
    submitCurrentMessage();
  }

  function handleComposerKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (!canType || !input.trim() || isLoading) {
        return;
      }

      submitCurrentMessage();
    }
  }

  function handleUserTypeSelect(nextUserType: ChatUserType) {
    if (userType) {
      setStage("initial");
      return;
    }

    setUserType(nextUserType);
    appendMessage("user", nextUserType);
    appendMessage(
      "assistant",
      `Thanks. What can I help you with today as a ${nextUserType.toLowerCase()}? You can pick one of the common questions below or type your own.`,
    );
    setStage("initial");
  }

  function handleStarterQuestionSelect(question: string) {
    if (!canType || isLoading) {
      return;
    }

    appendMessage("user", question);

    if (!originalQuestion) {
      setOriginalQuestion(question);
    }

    void requestAnswer(question);
  }

  function handleHelpful(approved: boolean) {
    appendMessage("user", approved ? "Yes" : "No");

    if (approved) {
      setNoCount(0);
      appendMessage("assistant", "Great. Please rate this conversation from 1 to 5 stars.");
      setStage("awaiting_rating");
      return;
    }

    const nextNoCount = noCount + 1;
    setNoCount(nextNoCount);

    if (nextNoCount >= 2) {
      const transcript = [
        ...messages,
        { id: buildId(), role: "user" as const, content: "No" },
        {
          id: buildId(),
          role: "assistant" as const,
          content:
            "I’m opening the best matching contact flow now so CX can take it from here.",
        },
      ];
      appendMessage(
        "assistant",
        "I’m opening the best matching contact flow now so CX can take it from here.",
      );
      const context: ChatHandoffContext = {
        userType,
        originalQuestion,
        restatedQuestion,
        transcript,
      };
      onEscalate(context);
      setStage("escalated");
      setIsOpen(false);
      return;
    }

    appendMessage(
      "assistant",
      "Thanks. Please restate the question and I’ll take another try.",
    );
    setStage("awaiting_rephrase");
  }

  function handleRatingSelect(nextRating: number) {
    if (rating !== null) {
      return;
    }

    setRating(nextRating);

    window.setTimeout(() => {
      appendMessage("user", `${nextRating} star${nextRating === 1 ? "" : "s"}`);
      appendMessage(
        "assistant",
        "Thanks for the rating. If you have another question, ask anytime.",
      );
      console.log("TPT CX chatbot transcript", {
        ...transcriptForLogging,
        rating: nextRating,
      });
      setStage("initial");
      setModelMessages([]);
      setPreviousResponseId(null);
      setOriginalQuestion("");
      setRestatedQuestion(null);
      setNoCount(0);
      setRating(null);
    }, 160);
  }

  const canType =
    (stage === "initial" || stage === "awaiting_rephrase") &&
    !isLoading &&
    Boolean(userType);
  const panelBottom = isOpen ? Math.max(16, keyboardInset + 16) : 112;
  const panelHeight = `min(620px, calc(100dvh - ${keyboardInset + 32}px))`;

  return (
    <>
      {!isOpen ? (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
        {showTooltip && !isOpen ? (
          <div className="max-w-[260px] rounded-[1.4rem] border border-emerald-100 bg-white px-4 py-3 text-sm leading-6 text-slate-700 shadow-[0_24px_60px_-28px_rgba(15,23,42,0.28)]">
            I&apos;m the TPT CX Bot. Ask me a question for instant support.
          </div>
        ) : null}

        <button
          type="button"
          aria-label={isOpen ? "Close TPT CX chat" : "Open TPT CX chat"}
          className="flex h-16 w-16 items-center justify-center rounded-full bg-[#14473f] text-white shadow-[0_22px_50px_-18px_rgba(20,71,63,0.65)] transition hover:bg-[#1d5d53]"
          onClick={() => setIsOpen((current) => !current)}
          onMouseEnter={() => !isOpen && setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          <MessageCircleQuestion className="size-7" />
        </button>
        </div>
      ) : null}

      {isOpen ? (
        <section
          className="fixed left-3 right-3 z-50 flex flex-col overflow-hidden rounded-[2rem] border border-emerald-100 bg-[#f7fbf8] shadow-[0_40px_90px_-42px_rgba(15,23,42,0.45)] sm:left-auto sm:right-6 sm:w-[400px]"
          style={{ bottom: `${panelBottom}px`, height: panelHeight }}
        >
          <header className="border-b border-emerald-100 bg-[linear-gradient(180deg,#194f44_0%,#14473f_100%)] px-5 py-4 text-white">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/12 shadow-inner">
                  <Apple className="size-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-100">
                    TPT bot
                  </p>
                  <p className="mt-1 text-sm text-emerald-50/90">Instant support</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="rounded-full border border-white/10 bg-white/10 px-3 py-2 text-xs font-medium text-white transition hover:bg-white/15"
                  onClick={resetConversation}
                >
                  Reset
                </button>
                <button
                  type="button"
                  aria-label="Close TPT CX chat"
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/10 text-white transition hover:bg-white/15"
                  onClick={() => setIsOpen(false)}
                >
                  <X className="size-5" />
                </button>
              </div>
            </div>
          </header>

          <div className="flex-1 space-y-4 overflow-y-auto bg-[radial-gradient(circle_at_top,#f4fbf7_0%,#f8faf8_58%,#f5f7f6_100%)] px-4 py-4">
            {messages.map((message) => {
              const isAssistant = message.role === "assistant";
              return (
                <div
                  key={message.id}
                  className={clsx("flex", isAssistant ? "justify-start" : "justify-end")}
                >
                  <div
                    className={clsx(
                      "max-w-[88%] whitespace-pre-wrap break-words rounded-[1.35rem] px-4 py-3 text-sm leading-6 shadow-sm",
                      isAssistant
                        ? "rounded-tl-md border border-emerald-100 bg-white text-slate-700 shadow-[0_14px_30px_-24px_rgba(15,23,42,0.3)]"
                        : "rounded-tr-md bg-[#14473f] text-white shadow-[0_18px_36px_-24px_rgba(20,71,63,0.75)]",
                    )}
                  >
                    {renderMessageContent(message.content)}
                  </div>
                </div>
              );
            })}

            {isLoading ? (
              <div className="flex justify-start">
                <div className="flex items-center gap-1 rounded-[1.35rem] rounded-tl-md border border-emerald-100 bg-white px-4 py-3 shadow-[0_14px_30px_-24px_rgba(15,23,42,0.3)]">
                  {[0, 1, 2].map((dot) => (
                    <span
                      key={dot}
                      className="h-2 w-2 animate-bounce rounded-full bg-emerald-500"
                      style={{ animationDelay: `${dot * 0.15}s` }}
                    />
                  ))}
                </div>
              </div>
            ) : null}

            {!userType ? (
              <div className="rounded-[1.35rem] border border-emerald-100 bg-white p-4 shadow-[0_14px_30px_-24px_rgba(15,23,42,0.3)]">
                <p className="text-sm font-semibold text-slate-900">How are you reaching out?</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Choose the option that fits best so I can give you the right help.
                </p>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {(["Buyer", "Seller", "Publisher", "Other"] as ChatUserType[]).map((option) => (
                    <button
                      key={option}
                      type="button"
                      className="rounded-full border border-emerald-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-emerald-300 hover:bg-emerald-50"
                      onClick={() => handleUserTypeSelect(option)}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {userType && stage === "initial" && !originalQuestion && !isLoading ? (
              <div className="rounded-[1.35rem] border border-emerald-100 bg-white p-4 shadow-[0_14px_30px_-24px_rgba(15,23,42,0.3)]">
                <p className="text-sm font-semibold text-slate-900">Popular questions</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Start with one of these, or type your own question below.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {STARTER_QUESTIONS.map((question) => (
                    <button
                      key={question}
                      type="button"
                      className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-[#14473f] transition hover:border-emerald-300 hover:bg-emerald-100"
                      onClick={() => handleStarterQuestionSelect(question)}
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {stage === "awaiting_resolution" ? (
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  className="rounded-full bg-[#63E0A5] px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-[#4ed591]"
                  onClick={() => handleHelpful(true)}
                >
                  Yes
                </button>
                <button
                  type="button"
                  className="rounded-full border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400"
                  onClick={() => handleHelpful(false)}
                >
                  No
                </button>
              </div>
            ) : null}

            {stage === "awaiting_rating" ? (
              <div className="flex items-center justify-center gap-2">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    type="button"
                    className={clsx(
                      "rounded-full border p-3 transition",
                      value <= (rating ?? 0)
                        ? "border-amber-300 bg-amber-50 text-amber-500"
                        : "border-amber-200 bg-white text-amber-500 hover:bg-amber-50",
                      rating !== null && "cursor-not-allowed",
                    )}
                    onClick={() => handleRatingSelect(value)}
                    aria-label={`Rate ${value} stars`}
                    disabled={rating !== null}
                  >
                    <Star className={clsx("size-5", value <= (rating ?? 0) && "fill-current")} />
                  </button>
                ))}
              </div>
            ) : null}

            {stage === "escalated" ? (
              <div className="rounded-[1.35rem] border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-slate-700">
                We opened the matching contact flow so you can finish the handoff there.
              </div>
            ) : null}

            <div ref={bottomRef} />
          </div>

          <form
            onSubmit={handleSend}
            className="border-t border-emerald-100 bg-white px-4 py-4"
          >
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder={
                  !userType
                    ? "Select Buyer, Seller, or Publisher to begin"
                    : canType
                    ? stage === "awaiting_rephrase"
                      ? "Restate your question..."
                      : "Ask a question..."
                    : "Use the buttons above to continue"
                }
                disabled={!canType || isLoading}
                rows={1}
                enterKeyHint="send"
                onKeyDown={handleComposerKeyDown}
                className="max-h-32 min-h-[48px] flex-1 resize-none rounded-[1.5rem] border border-emerald-100 bg-[#f8fbf9] px-4 py-3 text-sm leading-6 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
              />
              <button
                type="submit"
                disabled={!canType || !input.trim() || isLoading}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-[#14473f] text-white transition hover:bg-[#1d5d53] disabled:cursor-not-allowed disabled:bg-slate-300"
                aria-label="Send message"
              >
                <Send className="size-4" />
              </button>
            </div>
            <p className="mt-3 px-1 text-xs leading-5 text-slate-500">
              This experience is powered by AI. AI can make mistakes.
            </p>
          </form>
        </section>
      ) : null}
    </>
  );
}
