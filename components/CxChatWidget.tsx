import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import {
  MessageCircleQuestion,
  Minus,
  Send,
  Sparkles,
  SquarePen,
  Star,
  X,
} from "lucide-react";
import {
  getHardcodedRootNode,
  resolveHardcodedNode,
} from "@/lib/hardcoded-support-flows";

type ChatStage =
  | "initial"
  | "answering"
  | "awaiting_rephrase"
  | "limit_reached"
  | "escalated";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  options?: string[];
  optionVariant?: "quick-reply";
};

type ChatbotApiResponse = {
  answer: string;
  response_id?: string | null;
  handoffSuggested?: boolean;
};

export type ChatHandoffContext = {
  userType: string | null;
  originalQuestion: string;
  restatedQuestion: string | null;
  transcript: ChatMessage[];
};

type CxChatWidgetProps = {
  onEscalate: (context: ChatHandoffContext) => void;
  openRequestKey?: number;
  chatbotEndpoint?: string;
  botName?: string;
  greeting?: string;
};

const GREETING =
  "Hi! I'm TPT Bot. I'm a virtual assistant that can help answer questions about TPT. Click a suggested topic or type below and I'll be able to help.";
const MAX_MESSAGES_EXCHANGED = 50;
const LIMIT_REACHED_MESSAGE =
  "Sorry, I can't help with this request anymore. Please connect with the TPT CX team at teacherspayteachers.com/Contact for further assistance.";
const MARKDOWN_LINK_PATTERN = /\[([^\]]+)\]\(((?:https?:\/\/|mailto:)[^)\s]+)\)/gi;
const URL_PATTERN = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;
const EMAIL_PATTERN = /([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/g;
const EMAIL_EXACT_PATTERN = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/i;
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
        className="break-all font-medium text-[#1b5e4b] underline underline-offset-2"
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
  const combinedPattern = new RegExp(`${URL_PATTERN.source}|${EMAIL_PATTERN.source}`, "gi");
  const nodes: React.ReactNode[] = [];
  let cursor = 0;
  let index = 0;

  for (const match of content.matchAll(combinedPattern)) {
    const matchedText = match[0];
    const start = match.index ?? 0;

    if (start > cursor) {
      nodes.push(
        <span key={`${keyPrefix}-text-${index}`}>
          {renderFormattedText(content.slice(cursor, start), `${keyPrefix}-formatted-${index}`)}
        </span>,
      );
      index += 1;
    }

    const trailing = matchedText.match(/([.,!?)\]]+)$/)?.[1] ?? "";
    const value = trailing ? matchedText.slice(0, -trailing.length) : matchedText;

    if (EMAIL_EXACT_PATTERN.test(value)) {
      nodes.push(
        <span key={`${keyPrefix}-email-wrap-${index}`}>
          <a
            href={`mailto:${value}`}
            className="break-all font-medium text-[#1b5e4b] underline underline-offset-2"
          >
            {value}
          </a>
          {trailing}
        </span>,
      );
    } else {
      const href = value.startsWith("http") ? value : `https://${value}`;
      nodes.push(
        <span key={`${keyPrefix}-url-wrap-${index}`}>
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="break-all font-medium text-[#1b5e4b] underline underline-offset-2"
          >
            {value}
          </a>
          {trailing}
        </span>,
      );
    }

    cursor = start + matchedText.length;
    index += 1;
  }

  if (cursor < content.length) {
    nodes.push(
      <span key={`${keyPrefix}-tail-${index}`}>
        {renderFormattedText(content.slice(cursor), `${keyPrefix}-formatted-tail-${index}`)}
      </span>,
    );
  }

  return nodes;
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
        <div key={`${keyPrefix}-line-${lineIndex}`} className="flex items-start gap-2">
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

function buildGreetingMessage(greetingText: string = GREETING): ChatMessage {
  const rootNode = getHardcodedRootNode();
  return {
    id: buildId(),
    role: "assistant",
    content: greetingText,
    options: rootNode.options,
    optionVariant: "quick-reply",
  };
}


export function CxChatWidget({
  onEscalate,
  openRequestKey,
  chatbotEndpoint = "/support/chatbot",
  botName = "TPT support",
  greeting = GREETING,
}: CxChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showTooltip, setShowTooltip] = useState(true);
  const [stage, setStage] = useState<ChatStage>("initial");
  const [messages, setMessages] = useState<ChatMessage[]>(() => [buildGreetingMessage(greeting)]);
  const [modelMessages, setModelMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showDelayedThinking, setShowDelayedThinking] = useState(false);
  const [originalQuestion, setOriginalQuestion] = useState("");
  const [restatedQuestion, setRestatedQuestion] = useState<string | null>(null);
  const [rating, setRating] = useState<number | null>(null);
  const [previousResponseId, setPreviousResponseId] = useState<string | null>(null);
  const [keyboardInset, setKeyboardInset] = useState(0);
  const [pendingExitAction, setPendingExitAction] = useState<"close" | "reset" | null>(
    null,
  );
  const [feedbackChoice, setFeedbackChoice] = useState<"yes" | "no" | null>(null);
  const [feedbackReason, setFeedbackReason] = useState("");
  const [feedbackRating, setFeedbackRating] = useState<number | null>(null);
  const [currentHardcodedNodeId, setCurrentHardcodedNodeId] = useState<string | null>(
    null,
  );

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const panelRef = useRef<HTMLElement | null>(null);

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
  }, [messages, isLoading, pendingExitAction, stage]);

  useEffect(() => {
    if (
      isOpen &&
      !pendingExitAction &&
      (stage === "initial" || stage === "awaiting_rephrase")
    ) {
      window.setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [isOpen, pendingExitAction, stage]);

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

  useEffect(() => {
    if (!isOpen || !pendingExitAction) {
      return;
    }

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }

      if (panelRef.current?.contains(target)) {
        return;
      }

      finalizeExit(pendingExitAction);
    };

    document.addEventListener("mousedown", handlePointerDown, true);
    document.addEventListener("touchstart", handlePointerDown, true);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown, true);
      document.removeEventListener("touchstart", handlePointerDown, true);
    };
  }, [isOpen, pendingExitAction]);

  useEffect(() => {
    if (!isLoading) {
      setShowDelayedThinking(false);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setShowDelayedThinking(true);
    }, 10000);

    return () => window.clearTimeout(timeoutId);
  }, [isLoading]);

  const transcriptForLogging = useMemo(
    () => ({
      rating,
      originalQuestion,
      restatedQuestion,
      messages,
      feedbackChoice,
      feedbackReason,
    }),
    [feedbackChoice, feedbackReason, messages, originalQuestion, rating, restatedQuestion],
  );

  function appendMessage(
    role: ChatMessage["role"],
    content: string,
    options?: string[],
    optionVariant?: ChatMessage["optionVariant"],
  ) {
    setMessages((current) => [
      ...current,
      { id: buildId(), role, content, options, optionVariant },
    ]);
  }

  function clearExitFeedback() {
    setPendingExitAction(null);
    setFeedbackChoice(null);
    setFeedbackReason("");
    setFeedbackRating(null);
  }

  function resetConversationState() {
    setStage("initial");
    setMessages([buildGreetingMessage(greeting)]);
    setModelMessages([]);
    setInput("");
    setIsLoading(false);
    setShowDelayedThinking(false);
    setOriginalQuestion("");
    setRestatedQuestion(null);
    setRating(null);
    setPreviousResponseId(null);
    setCurrentHardcodedNodeId(null);
    clearExitFeedback();
  }

  function resetConversation() {
    resetConversationState();
  }

  function finalizeExit(action: "close" | "reset") {
    if (action === "close") {
      resetConversationState();
      setIsOpen(false);
      return;
    }

    resetConversation();
  }

  function handleExitIntent(action: "close" | "reset") {
    const hasConversation = modelMessages.length > 0 || Boolean(originalQuestion.trim());
    if (!hasConversation) {
      finalizeExit(action);
      return;
    }

    setPendingExitAction(action);
    setFeedbackChoice(null);
    setFeedbackReason("");
    setFeedbackRating(null);
  }

  async function requestAnswer(question: string) {
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion) {
      return;
    }

    const hardcodedNode = resolveHardcodedNode(trimmedQuestion, currentHardcodedNodeId);
    if (hardcodedNode) {
      appendMessage("assistant", hardcodedNode.response, hardcodedNode.options);
      setCurrentHardcodedNodeId(hardcodedNode.id);
      setStage("initial");
      return;
    }

    if (modelMessages.length >= MAX_MESSAGES_EXCHANGED) {
      appendMessage("assistant", LIMIT_REACHED_MESSAGE);
      setStage("limit_reached");
      return;
    }

    const nextModelMessages = [
      ...modelMessages,
      { id: buildId(), role: "user" as const, content: trimmedQuestion },
    ];

    setIsLoading(true);
    setStage("answering");
    setCurrentHardcodedNodeId(null);

    try {
      const response = await fetch(chatbotEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: nextModelMessages.map(({ role, content }) => ({ role, content })),
          usertype: "",
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
          userType: null,
          originalQuestion: originalQuestion || trimmedQuestion,
          restatedQuestion,
          transcript: [...messages, { id: buildId(), role: "user", content: trimmedQuestion }],
        };
        onEscalate(context);
        setStage("escalated");
        return;
      }

      setStage("initial");
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
      if (!canSend || !input.trim()) {
        return;
      }

      submitCurrentMessage();
    }
  }

  function handleStarterQuestionSelect(question: string) {
    if (!canSend) {
      return;
    }

    appendMessage("user", question);

    if (!originalQuestion) {
      setOriginalQuestion(question);
    }

    void requestAnswer(question);
  }

  function submitExitFeedback() {
    if (!pendingExitAction) {
      return;
    }

    if (!feedbackChoice) {
      finalizeExit(pendingExitAction);
      return;
    }

    const nextRating = feedbackChoice === "yes" ? feedbackRating : null;
    if (feedbackChoice === "yes" && nextRating === null) {
      return;
    }

    if (feedbackChoice === "no" && !feedbackReason.trim()) {
      return;
    }

    setRating(nextRating);
    console.log("TPT CX chatbot transcript", {
      ...transcriptForLogging,
      rating: nextRating,
      feedbackChoice,
      feedbackReason,
    });
    finalizeExit(pendingExitAction);
  }

  const canEdit =
    !pendingExitAction &&
    stage !== "limit_reached" &&
    stage !== "escalated";
  const canSend =
    !pendingExitAction &&
    (stage === "initial" || stage === "awaiting_rephrase") &&
    !isLoading;
  const disabledPlaceholder = pendingExitAction
    ? "Complete the prompt above to close or reset."
    : stage === "limit_reached"
      ? "This chat has ended. Start a new conversation to continue."
      : stage === "escalated"
        ? "Continue in the contact form."
        : "Ask a question...";
  const panelBottom = isOpen ? Math.max(16, keyboardInset + 16) : 112;
  const panelHeight = `min(640px, calc(100dvh - ${keyboardInset + 32}px))`;

  function renderOptionButtons(message: ChatMessage) {
    if (!message.options?.length) {
      return null;
    }

    return (
      <div className="mt-3 flex flex-wrap gap-2">
        {message.options.map((option) => (
          <button
            key={`${message.id}-${option}`}
            type="button"
            className="w-fit rounded-full border border-[#d9d9d9] bg-white px-3.5 py-2 text-left text-[13px] font-medium text-[#2d2d2d] transition hover:border-[#91e8b3] hover:bg-[#f8fff9] disabled:cursor-not-allowed disabled:opacity-60"
            onClick={() => handleStarterQuestionSelect(option)}
            disabled={!canSend}
          >
            {option}
          </button>
        ))}
      </div>
    );
  }

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
          ref={panelRef}
          className="fixed left-3 right-3 z-50 flex flex-col overflow-hidden rounded-[1.6rem] border border-[#d8d8d8] bg-white shadow-[0_16px_42px_rgba(15,23,42,0.18)] sm:left-auto sm:right-6 sm:w-[332px]"
          style={{ bottom: `${panelBottom}px`, height: panelHeight }}
        >
          <header className="flex items-center justify-between border-b border-slate-100 px-5 pb-3 pt-4">
            <div className="flex items-center gap-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#111111] text-[#8ef0b5]">
                <Sparkles className="size-3.5" />
              </div>
              <div>
                <p className="text-[15px] font-semibold text-[#232323]">{botName}</p>
              </div>
            </div>
            <div className="flex items-center gap-0.5 text-[#232323]">
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-full transition hover:bg-slate-100"
                aria-label="Minimize TPT CX chat"
                onClick={() => setIsOpen(false)}
              >
                <Minus className="size-4.5" />
              </button>
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-full transition hover:bg-slate-100"
                aria-label="New conversation"
                onClick={() => handleExitIntent("reset")}
              >
                <SquarePen className="size-4.5" />
              </button>
              <button
                type="button"
                aria-label="Close TPT CX chat"
                className="flex h-8 w-8 items-center justify-center rounded-full transition hover:bg-slate-100"
                onClick={() => handleExitIntent("close")}
              >
                <X className="size-4.5" />
              </button>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto px-5 pb-4 pt-1">
            <div className="space-y-3">
              {messages.map((message) => {
                const isAssistant = message.role === "assistant";
                return (
                  <div
                    key={message.id}
                    className={clsx("flex", isAssistant ? "justify-start" : "justify-end")}
                  >
                    <div
                      className={clsx("min-w-0 max-w-[88%]", isAssistant ? "text-[#2d2d2d]" : "")}
                    >
                      <div
                        className={clsx(
                          "max-w-full whitespace-pre-wrap break-words text-[13px] leading-6 [overflow-wrap:anywhere]",
                          isAssistant
                            ? "inline-block rounded-[1rem] bg-[#f1f0ec] px-4 py-3 text-[#2d2d2d]"
                            : "inline-flex rounded-[0.8rem] bg-[#63e0a5] px-3 py-2 font-medium text-[#143427]",
                        )}
                      >
                        {renderMessageContent(message.content)}
                      </div>
                      {isAssistant ? renderOptionButtons(message) : null}
                    </div>
                  </div>
                );
              })}

              {isLoading && showDelayedThinking ? (
                <div className="flex justify-start">
                  <div className="rounded-[1rem] bg-[#f1f0ec] px-4 py-3">
                    <div className="space-y-2">
                      <p className="text-[12px] font-medium text-[#4b5563]">
                        TPT Bot is thinking...
                      </p>
                      <div className="flex items-center gap-1">
                        {[0, 1, 2].map((dot) => (
                          <span
                            key={dot}
                            className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#77dba4]"
                            style={{ animationDelay: `${dot * 0.15}s` }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              {stage === "escalated" ? (
                <div className="rounded-[1rem] bg-[#f1f0ec] px-4 py-3 text-[13px] leading-6 text-[#2d2d2d]">
                  We opened the matching contact flow so you can finish the handoff there.
                </div>
              ) : null}

              <div ref={bottomRef} />
            </div>
          </div>

          <form
            onSubmit={handleSend}
            className="bg-white px-4 pb-3 pt-2"
          >
            <div className="flex items-center gap-2 rounded-full border border-[#d3d3d3] bg-white px-3 py-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder={
                  canEdit
                    ? stage === "awaiting_rephrase"
                        ? "Restate your question..."
                        : "Ask a question..."
                    : disabledPlaceholder
                }
                disabled={!canEdit}
                rows={1}
                enterKeyHint="send"
                onKeyDown={handleComposerKeyDown}
                className="h-[22px] flex-1 resize-none overflow-y-auto bg-transparent px-1 py-1 text-[13px] leading-5 text-[#232323] outline-none placeholder:text-[#9b9b9b] disabled:cursor-not-allowed disabled:text-[#9b9b9b]"
              />
              <button
                type="submit"
                disabled={!canSend || !input.trim()}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#8ef0b5] text-[#206040] transition hover:bg-[#78e4a4] disabled:cursor-not-allowed disabled:bg-[#d8efe1] disabled:text-[#8db9a0]"
                aria-label="Send message"
              >
                <Send className="size-4" />
              </button>
            </div>
            <p className="mt-2 text-center text-[11px] leading-4 text-[#8f8f8f]">
              AI support can make mistakes
            </p>
          </form>

          {pendingExitAction ? (
            <div
              className="absolute inset-0 z-10 flex items-end bg-slate-950/30 p-3 sm:items-center sm:p-4"
            >
              <div
                className="w-full rounded-[1.5rem] bg-white p-4 shadow-[0_30px_80px_-40px_rgba(15,23,42,0.65)]"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="space-y-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-[15px] font-semibold text-slate-900">
                        Did we answer your question?
                      </h3>
                    </div>
                    <button
                      type="button"
                      aria-label="Return to chat"
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                      onClick={clearExitFeedback}
                    >
                      <X className="size-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      className={clsx(
                        "rounded-full px-3.5 py-2 text-[13px] font-semibold transition",
                        feedbackChoice === "yes"
                          ? "bg-[#63E0A5] text-slate-950"
                          : "border border-slate-300 bg-white text-slate-700 hover:border-slate-400",
                      )}
                      onClick={() => {
                        setFeedbackChoice("yes");
                        setFeedbackReason("");
                      }}
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      className={clsx(
                        "rounded-full px-3.5 py-2 text-[13px] font-semibold transition",
                        feedbackChoice === "no"
                          ? "bg-slate-900 text-white"
                          : "border border-slate-300 bg-white text-slate-700 hover:border-slate-400",
                      )}
                      onClick={() => {
                        setFeedbackChoice("no");
                        setFeedbackRating(null);
                      }}
                    >
                      No
                    </button>
                  </div>

                  {feedbackChoice === "yes" ? (
                    <div className="space-y-3">
                      <p className="text-[13px] text-slate-600">Rate the response out of 5.</p>
                      <div className="flex items-center justify-center gap-2">
                        {[1, 2, 3, 4, 5].map((value) => (
                          <button
                            key={value}
                            type="button"
                            className={clsx(
                              "rounded-full border p-2.5 transition",
                              feedbackRating === value
                                ? "border-amber-300 bg-amber-50 text-amber-500"
                                : "border-amber-200 bg-white text-amber-400 hover:bg-amber-50",
                            )}
                            onClick={() => setFeedbackRating(value)}
                            aria-label={`Rate ${value} stars`}
                          >
                            <Star className="size-5 fill-current" />
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {feedbackChoice === "no" ? (
                    <div className="space-y-2">
                      <label
                        htmlFor="chat-feedback-reason"
                        className="block text-[13px] font-medium text-slate-700"
                      >
                        Tell us why, if you&apos;d like.
                      </label>
                      <textarea
                        id="chat-feedback-reason"
                        value={feedbackReason}
                        onChange={(event) => setFeedbackReason(event.target.value)}
                        rows={4}
                        placeholder="Tell us what went wrong"
                        className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-[13px] outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                      />
                    </div>
                  ) : null}

                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      className="rounded-full bg-[#14473f] px-3.5 py-2 text-[13px] font-medium text-white transition hover:bg-[#1d5d53] disabled:cursor-not-allowed disabled:bg-slate-300"
                      onClick={submitExitFeedback}
                      disabled={
                        !feedbackChoice ||
                        (feedbackChoice === "yes" && feedbackRating === null) ||
                        (feedbackChoice === "no" && !feedbackReason.trim())
                      }
                    >
                      {pendingExitAction === "close"
                        ? feedbackChoice === "no"
                          ? "Send feedback & close"
                          : "Rate & close"
                        : feedbackChoice === "no"
                          ? "Send feedback & start new"
                          : "Rate & start new"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}
    </>
  );
}
