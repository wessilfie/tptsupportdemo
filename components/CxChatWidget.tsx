import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import {
  Apple,
  MessageCircleQuestion,
  Plus,
  RotateCcw,
  Send,
  SquarePen,
  Star,
  X,
} from "lucide-react";

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
  openRequestKey?: number;
  chatbotEndpoint?: string;
};

const GREETING = "Hi! I'm TPT bot.";
const INTRO_PROMPT =
  "Start with a common question below or type your own message for fast help.";
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

export function CxChatWidget({
  onEscalate,
  openRequestKey,
  chatbotEndpoint = "/support/chatbot",
}: CxChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showTooltip, setShowTooltip] = useState(true);
  const [stage, setStage] = useState<ChatStage>("awaiting_usertype");
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: buildId(), role: "assistant", content: GREETING },
    { id: buildId(), role: "assistant", content: INTRO_PROMPT },
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
    if (openRequestKey !== undefined) {
      setIsOpen(true);
      setShowTooltip(false);
    }
  }, [openRequestKey]);

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
      { id: buildId(), role: "assistant", content: INTRO_PROMPT },
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
      const response = await fetch(chatbotEndpoint, {
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
    if (userType === nextUserType && stage === "initial") {
      return;
    }

    setUserType(nextUserType);
    if (!userType) {
      appendMessage("user", nextUserType);
      appendMessage(
        "assistant",
        `Thanks. I’ll tailor help for ${nextUserType.toLowerCase()} questions. Pick a common question below or type your own.`,
      );
    }
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
  const showWelcomeState =
    !isLoading &&
    messages.length <= 2 &&
    !originalQuestion &&
    !restatedQuestion &&
    stage !== "awaiting_resolution" &&
    stage !== "awaiting_rating" &&
    stage !== "escalated";

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
          className="fixed left-3 right-3 z-50 flex flex-col overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_42px_100px_-44px_rgba(15,23,42,0.34)] sm:left-auto sm:right-6 sm:w-[430px]"
          style={{ bottom: `${panelBottom}px`, height: panelHeight }}
        >
          <header className="flex items-center justify-between px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#14473f] text-white">
                <Apple className="size-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">TPT bot</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-slate-500">
              <button
                type="button"
                className="flex h-10 w-10 items-center justify-center rounded-full transition hover:bg-slate-100 hover:text-slate-900"
                aria-label="New conversation"
                onClick={resetConversation}
              >
                <SquarePen className="size-6" />
              </button>
              <button
                type="button"
                className="flex h-10 w-10 items-center justify-center rounded-full transition hover:bg-slate-100 hover:text-slate-900"
                aria-label="Reset conversation"
                onClick={resetConversation}
              >
                <RotateCcw className="size-6" />
              </button>
              <button
                type="button"
                aria-label="Close TPT CX chat"
                className="flex h-10 w-10 items-center justify-center rounded-full transition hover:bg-slate-100 hover:text-slate-900"
                onClick={() => setIsOpen(false)}
              >
                <X className="size-7" />
              </button>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto px-4 pb-4 pt-1">
            {showWelcomeState ? (
              <div className="flex min-h-full flex-col justify-start px-2 pb-6 pt-2">
                <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-[0_18px_40px_-32px_rgba(15,23,42,0.2)]">
                  <p className="text-sm font-semibold text-slate-900">Who are you?</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(["Buyer", "Seller", "Publisher", "Other"] as ChatUserType[]).map((option) => (
                      <button
                        key={option}
                        type="button"
                        className={clsx(
                          "rounded-full border px-3 py-2 text-sm font-medium transition",
                          userType === option
                            ? "border-[#14473f] bg-[#14473f] text-white"
                            : "border-slate-200 bg-white text-slate-700 hover:border-emerald-300 hover:bg-emerald-50",
                        )}
                        onClick={() => handleUserTypeSelect(option)}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>

                {userType ? (
                  <div className="mt-4 rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-[0_18px_40px_-32px_rgba(15,23,42,0.2)]">
                    <p className="text-sm font-semibold text-slate-900">Popular questions</p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      Choose one to get started, or type your own question below.
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {STARTER_QUESTIONS.map((question) => (
                        <button
                          key={question}
                          type="button"
                          className="rounded-full bg-[#f3f4f6] px-3 py-2 text-sm font-medium text-slate-800 transition hover:bg-slate-200"
                          onClick={() => handleStarterQuestionSelect(question)}
                        >
                          {question}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message) => {
              const isAssistant = message.role === "assistant";
              return (
                <div
                  key={message.id}
                  className={clsx("flex", isAssistant ? "justify-start" : "justify-end")}
                >
                  <div
                    className={clsx(
                      "max-w-[88%] whitespace-pre-wrap break-words rounded-[1.35rem] px-4 py-3 text-sm leading-6",
                      isAssistant
                        ? "rounded-tl-md border border-slate-200 bg-[#fafafa] text-slate-700"
                        : "rounded-tr-md bg-[#14473f] text-white shadow-[0_18px_36px_-24px_rgba(20,71,63,0.4)]",
                    )}
                  >
                    {renderMessageContent(message.content)}
                  </div>
                </div>
              );
                })}

                {isLoading ? (
                  <div className="flex justify-start">
                    <div className="flex items-center gap-1 rounded-[1.35rem] rounded-tl-md border border-slate-200 bg-[#fafafa] px-4 py-3">
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

                {(stage === "awaiting_usertype" || stage === "initial" || stage === "awaiting_rephrase") ? (
                  <div className="rounded-[1.35rem] border border-slate-200 bg-white p-4">
                    <p className="text-sm font-semibold text-slate-900">Who are you?</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {(["Buyer", "Seller", "Publisher", "Other"] as ChatUserType[]).map((option) => (
                        <button
                          key={option}
                          type="button"
                          className={clsx(
                            "rounded-full border px-3 py-2 text-sm font-medium transition",
                            userType === option
                              ? "border-[#14473f] bg-[#14473f] text-white"
                              : "border-slate-200 bg-white text-slate-700 hover:border-emerald-300 hover:bg-emerald-50",
                          )}
                          onClick={() => handleUserTypeSelect(option)}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                {userType && stage === "initial" && !originalQuestion && !isLoading ? (
                  <div className="rounded-[1.35rem] border border-slate-200 bg-white p-4">
                    <p className="text-sm font-semibold text-slate-900">Popular questions</p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      Start with one of these, or type your own question below.
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {STARTER_QUESTIONS.map((question) => (
                        <button
                          key={question}
                          type="button"
                          className="rounded-full bg-[#f3f4f6] px-3 py-2 text-sm font-medium text-slate-800 transition hover:bg-slate-200"
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
            )}
          </div>

          <form
            onSubmit={handleSend}
            className="border-t border-slate-100 bg-white px-5 pb-5 pt-4"
          >
            <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-white px-4 py-3 shadow-[0_18px_36px_-30px_rgba(15,23,42,0.24)]">
              <button
                type="button"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-800 transition hover:bg-slate-100"
                aria-label="Add context"
              >
                <Plus className="size-6" />
              </button>
              <textarea
                ref={inputRef}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder={
                  !userType
                    ? "Select Buyer, Seller, Publisher, or Other first"
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
                className="max-h-32 min-h-[28px] flex-1 resize-none bg-transparent px-1 py-1 text-sm leading-6 text-slate-900 outline-none placeholder:text-slate-400 disabled:cursor-not-allowed disabled:text-slate-400"
              />
              <button
                type="submit"
                disabled={!canType || !input.trim() || isLoading}
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#171717] text-white transition hover:bg-black disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
                aria-label="Send message"
              >
                <Send className="size-4" />
              </button>
            </div>
            <p className="mt-4 text-center text-xs leading-5 text-slate-500">
              AI support can make mistakes
            </p>
          </form>
        </section>
      ) : null}
    </>
  );
}
