"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import {
  ArrowLeft,
  CheckCircle2,
  Link as LinkIcon,
  LogIn,
  Paperclip,
} from "lucide-react";
import { useSearchParams } from "next/navigation";

type AuthState = "logged_in" | "logged_out";
type DynamicTopic = "Issues with Logging In" | "Refund" | "Question about TPT" | "Other";

type SubmissionRecord = {
  authState: AuthState;
  topic: DynamicTopic;
  name: string;
  email: string;
  accountEmail: string;
  mailingAddress: string;
  resourceLink: string;
  refundReason: string;
  details: string;
  attachments: string[];
  source: string | null;
};

const LOGGED_IN_PROFILE = {
  name: "Will E",
  email: "will+demo@ixl.com",
};

const TOPIC_OPTIONS: Array<{ topic: DynamicTopic; description: string }> = [
  {
    topic: "Issues with Logging In",
    description: "Account access, password reset, and sign-in trouble.",
  },
  {
    topic: "Refund",
    description: "Refund requests and product purchase follow-up.",
  },
  {
    topic: "Question about TPT",
    description: "General questions about TPT or how something works.",
  },
  {
    topic: "Other",
    description: "Anything else you need help with.",
  },
];

const REFUND_REASONS = [
  "Purchased by mistake",
  "Duplicate purchase",
  "Technical issue",
  "Wrong resource for my needs",
  "Other",
];

function getTopicFromQuery(value: string | null): DynamicTopic | "" {
  const normalizedValue = value?.trim().toLowerCase();

  switch (normalizedValue) {
    case "login":
    case "issues with logging in":
    case "logging in":
      return "Issues with Logging In";
    case "refund":
    case "refund request":
      return "Refund";
    case "question":
    case "question about tpt":
      return "Question about TPT";
    case "other":
      return "Other";
    default:
      return "";
  }
}

function getTopicCopy(topic: DynamicTopic) {
  switch (topic) {
    case "Issues with Logging In":
      return {
        title: "Login issue details",
        description:
          "Please provide the account information and a short description of what happened.",
      };
    case "Refund":
      return {
        title: "Refund request details",
        description:
          "Share the resource link and why you would like a refund so the team can review it.",
      };
    case "Question about TPT":
      return {
        title: "Your question",
        description:
          "Give us a little context and we’ll make sure the right person follows up.",
      };
    case "Other":
      return {
        title: "Tell us more",
        description:
          "Describe the issue in your own words and add a file if it would help.",
      };
  }
}

export default function DynamicContactExperience() {
  const searchParams = useSearchParams();
  const [authState, setAuthState] = useState<AuthState>("logged_out");
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [topic, setTopic] = useState<DynamicTopic | "">("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [accountEmail, setAccountEmail] = useState("");
  const [mailingAddress, setMailingAddress] = useState("");
  const [resourceLink, setResourceLink] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [details, setDetails] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [submittedRecord, setSubmittedRecord] = useState<SubmissionRecord | null>(null);

  useEffect(() => {
    const nextTopic = getTopicFromQuery(searchParams.get("topic"));
    if (nextTopic) {
      setTopic(nextTopic);
    }
  }, [searchParams]);

  const topicCopy = topic ? getTopicCopy(topic) : null;
  const source = searchParams.get("source");

  const isStepOneValid = useMemo(() => {
    if (!topic) {
      return false;
    }

    if (authState === "logged_in") {
      return true;
    }

    return Boolean(name.trim() && email.trim());
  }, [authState, email, name, topic]);

  const isStepTwoValid = useMemo(() => {
    if (!topic || !details.trim()) {
      return false;
    }

    if (topic === "Issues with Logging In") {
      return Boolean(accountEmail.trim() && mailingAddress.trim());
    }

    if (topic === "Refund") {
      return Boolean(resourceLink.trim() && refundReason.trim());
    }

    return true;
  }, [accountEmail, details, mailingAddress, refundReason, resourceLink, topic]);

  function resetFlow() {
    setAuthState("logged_out");
    setCurrentStep(1);
    setTopic(getTopicFromQuery(searchParams.get("topic")));
    setName("");
    setEmail("");
    setAccountEmail("");
    setMailingAddress("");
    setResourceLink("");
    setRefundReason("");
    setDetails("");
    setAttachments([]);
    setSubmittedRecord(null);
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    setAttachments(Array.from(event.target.files ?? []));
  }

  function handleSubmit() {
    if (!topic || !isStepTwoValid) {
      return;
    }

    setSubmittedRecord({
      authState,
      topic,
      name: authState === "logged_in" ? LOGGED_IN_PROFILE.name : name.trim(),
      email: authState === "logged_in" ? LOGGED_IN_PROFILE.email : email.trim(),
      accountEmail: accountEmail.trim(),
      mailingAddress: mailingAddress.trim(),
      resourceLink: resourceLink.trim(),
      refundReason: refundReason.trim(),
      details: details.trim(),
      attachments: attachments.map((file) => file.name),
      source,
    });
    setCurrentStep(3);
  }

  return (
    <div className="min-h-screen bg-[#f8faf8] text-slate-900">
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#dff8ea] text-[#14473f]">
              <span className="text-xl font-black">T</span>
            </div>
            <div>
              <div className="text-3xl font-black tracking-tight text-[#14473f]">TPT</div>
              <div className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
                Contact Support
              </div>
            </div>
          </div>
          <div className="text-sm font-semibold text-slate-600">
            Log In | Sign Up
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-4xl px-6 py-10">
        <section>
          <p className="text-[14px] font-semibold text-[#1b5e4b]">Contact Us</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight">We&apos;re here to help!</h1>
          <p className="mt-3 max-w-3xl text-[18px] leading-8 text-slate-700">
            To get started, fill out the form below, providing as much detail as you can.
            Someone from TPT&apos;s Customer Experience team will get back to you as soon as
            possible.
          </p>
        </section>

        <section className="mt-8 rounded-[1.75rem] border border-slate-200 bg-white shadow-[0_25px_60px_-48px_rgba(15,23,42,0.32)]">
          <div className="border-b border-slate-200 px-6 py-5 sm:px-8">
            <div className="flex flex-wrap gap-3">
              {[
                { id: 1, label: "Contact" },
                { id: 2, label: "Details" },
                { id: 3, label: "Sent" },
              ].map((step) => {
                const isCurrent = step.id === currentStep;
                const isComplete = step.id < currentStep;

                return (
                  <div
                    key={step.id}
                    className={clsx(
                      "flex items-center gap-3 rounded-full border px-4 py-2",
                      isCurrent
                        ? "border-emerald-200 bg-emerald-50"
                        : isComplete
                          ? "border-[#14473f] bg-[#14473f] text-white"
                          : "border-slate-200 bg-white",
                    )}
                  >
                    <div
                      className={clsx(
                        "flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold",
                        isCurrent
                          ? "bg-[#63E0A5] text-slate-950"
                          : isComplete
                            ? "bg-[#14473f] text-white"
                            : "bg-slate-100 text-slate-500",
                      )}
                    >
                      {step.id}
                    </div>
                    <span
                      className={clsx(
                        "text-base font-semibold",
                        isCurrent || isComplete ? "text-slate-900" : "text-slate-500",
                      )}
                    >
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="px-6 py-8 sm:px-8">
            {currentStep === 1 ? (
              <div className="mx-auto max-w-2xl">
                {source === "chatbot" ? (
                  <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm leading-6 text-slate-700">
                    We preselected a topic based on your chat. You can change it before
                    continuing.
                  </div>
                ) : null}

                <div className="mb-8 flex flex-wrap gap-3">
                  <button
                    type="button"
                    className={
                      authState === "logged_out"
                        ? "rounded-full bg-[#14473f] px-4 py-2 text-sm font-medium text-white"
                        : "rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-emerald-300"
                    }
                    onClick={() => setAuthState("logged_out")}
                  >
                    Logged out
                  </button>
                  <button
                    type="button"
                    className={
                      authState === "logged_in"
                        ? "inline-flex items-center gap-2 rounded-full bg-[#63E0A5] px-4 py-2 text-sm font-medium text-slate-950"
                        : "inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-emerald-300"
                    }
                    onClick={() => setAuthState("logged_in")}
                  >
                    <LogIn className="size-4" />
                    Logged in demo
                  </button>
                </div>

                {authState === "logged_out" ? (
                  <div className="space-y-5">
                    <div>
                      <label htmlFor="name" className="mb-2 block text-sm font-semibold text-slate-700">
                        Full Name: <span className="text-[#1b5e4b]">*</span>
                      </label>
                      <input
                        id="name"
                        type="text"
                        className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                      />
                    </div>
                    <div>
                      <label htmlFor="email" className="mb-2 block text-sm font-semibold text-slate-700">
                        Email Address: <span className="text-[#1b5e4b]">*</span>
                      </label>
                      <input
                        id="email"
                        type="email"
                        className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50/60 px-5 py-4 text-sm leading-6 text-slate-700">
                    We&apos;ll use the signed-in account for this request:{" "}
                    <span className="font-semibold text-slate-900">
                      {LOGGED_IN_PROFILE.name} ({LOGGED_IN_PROFILE.email})
                    </span>
                  </div>
                )}

                <div className="mt-8">
                  <label className="mb-3 block text-sm font-semibold text-slate-700">
                    What can we help you with today? <span className="text-[#1b5e4b]">*</span>
                  </label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {TOPIC_OPTIONS.map((option) => (
                      <button
                        key={option.topic}
                        type="button"
                        className={clsx(
                          "rounded-2xl border px-5 py-4 text-left transition",
                          topic === option.topic
                            ? "border-emerald-400 bg-emerald-50"
                            : "border-slate-200 bg-white hover:border-emerald-300",
                        )}
                        onClick={() => setTopic(option.topic)}
                      >
                        <div className="text-lg font-semibold text-slate-900">{option.topic}</div>
                        <div className="mt-1 text-sm leading-6 text-slate-600">
                          {option.description}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-8 flex justify-end">
                  <button
                    type="button"
                    className={clsx(
                      "rounded-full px-5 py-3 text-sm font-semibold transition",
                      isStepOneValid
                        ? "bg-[#63E0A5] text-slate-950 hover:bg-[#4fd390]"
                        : "cursor-not-allowed bg-slate-200 text-slate-400",
                    )}
                    disabled={!isStepOneValid}
                    onClick={() => setCurrentStep(2)}
                  >
                    Continue
                  </button>
                </div>
              </div>
            ) : null}

            {currentStep === 2 && topic ? (
              <div className="mx-auto max-w-2xl">
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-emerald-300 hover:text-slate-900"
                  onClick={() => setCurrentStep(1)}
                >
                  <ArrowLeft className="size-4" />
                  Back
                </button>

                <h2 className="mt-6 text-3xl font-semibold tracking-tight">{topicCopy?.title}</h2>
                <p className="mt-3 text-[17px] leading-7 text-slate-700">{topicCopy?.description}</p>

                <div className="mt-8 space-y-5">
                  {topic === "Issues with Logging In" ? (
                    <>
                      <div>
                        <label htmlFor="account-email" className="mb-2 block text-sm font-semibold text-slate-700">
                          Email on account: <span className="text-[#1b5e4b]">*</span>
                        </label>
                        <input
                          id="account-email"
                          type="email"
                          className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                          value={accountEmail}
                          onChange={(event) => setAccountEmail(event.target.value)}
                        />
                      </div>
                      <div>
                        <label htmlFor="mailing-address" className="mb-2 block text-sm font-semibold text-slate-700">
                          Mailing address on the account: <span className="text-[#1b5e4b]">*</span>
                        </label>
                        <input
                          id="mailing-address"
                          type="text"
                          className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                          value={mailingAddress}
                          onChange={(event) => setMailingAddress(event.target.value)}
                        />
                      </div>
                    </>
                  ) : null}

                  {topic === "Refund" ? (
                    <>
                      <div>
                        <label htmlFor="resource-link" className="mb-2 block text-sm font-semibold text-slate-700">
                          Link to resource: <span className="text-[#1b5e4b]">*</span>
                        </label>
                        <div className="relative">
                          <LinkIcon className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                          <input
                            id="resource-link"
                            type="url"
                            className="w-full rounded-xl border border-slate-300 px-10 py-3 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                            value={resourceLink}
                            onChange={(event) => setResourceLink(event.target.value)}
                          />
                        </div>
                      </div>
                      <div>
                        <label htmlFor="refund-reason" className="mb-2 block text-sm font-semibold text-slate-700">
                          Why are you requesting a refund? <span className="text-[#1b5e4b]">*</span>
                        </label>
                        <select
                          id="refund-reason"
                          className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                          value={refundReason}
                          onChange={(event) => setRefundReason(event.target.value)}
                        >
                          <option value="">Select reason</option>
                          {REFUND_REASONS.map((reason) => (
                            <option key={reason} value={reason}>
                              {reason}
                            </option>
                          ))}
                        </select>
                      </div>
                    </>
                  ) : null}

                  <div>
                    <label htmlFor="details" className="mb-2 block text-sm font-semibold text-slate-700">
                      {topic === "Refund" ? "Describe the issue" : "Message"}:{" "}
                      <span className="text-[#1b5e4b]">*</span>
                    </label>
                    <textarea
                      id="details"
                      className="min-h-44 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                      value={details}
                      onChange={(event) => setDetails(event.target.value)}
                    />
                  </div>

                  <div>
                    <label htmlFor="file-upload" className="mb-2 block text-sm font-semibold text-slate-700">
                      Upload file if needed
                    </label>
                    <label
                      htmlFor="file-upload"
                      className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-slate-300 px-4 py-4 text-sm text-slate-600 hover:border-emerald-300"
                    >
                      <Paperclip className="size-4 text-[#1b5e4b]" />
                      Choose file
                    </label>
                    <input
                      id="file-upload"
                      type="file"
                      multiple
                      className="sr-only"
                      onChange={handleFileChange}
                    />
                    {attachments.length ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {attachments.map((file) => (
                          <span
                            key={`${file.name}-${file.lastModified}`}
                            className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800"
                          >
                            {file.name}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="mt-8 flex justify-end">
                  <button
                    type="button"
                    className={clsx(
                      "rounded-full px-5 py-3 text-sm font-semibold transition",
                      isStepTwoValid
                        ? "bg-[#63E0A5] text-slate-950 hover:bg-[#4fd390]"
                        : "cursor-not-allowed bg-slate-200 text-slate-400",
                    )}
                    disabled={!isStepTwoValid}
                    onClick={handleSubmit}
                  >
                    Submit request
                  </button>
                </div>
              </div>
            ) : null}

            {currentStep === 3 && submittedRecord ? (
              <div className="mx-auto max-w-2xl">
                <div className="rounded-[2rem] border border-emerald-100 bg-emerald-50/40 px-6 py-8">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#14473f] text-white">
                      <CheckCircle2 className="size-6" />
                    </div>
                    <div>
                      <h2 className="text-3xl font-semibold tracking-tight">Request submitted</h2>
                      <p className="mt-2 text-[17px] leading-7 text-slate-700">
                        Thanks for contacting us. We&apos;ll get back to you soon.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 rounded-[1.5rem] border border-slate-200 bg-white px-6 py-6">
                  <h3 className="text-xl font-semibold text-slate-900">Summary</h3>
                  <div className="mt-4 space-y-3 text-sm leading-6 text-slate-700">
                    <p><span className="font-semibold text-slate-900">Topic:</span> {submittedRecord.topic}</p>
                    <p><span className="font-semibold text-slate-900">Email:</span> {submittedRecord.email}</p>
                    {submittedRecord.accountEmail ? (
                      <p><span className="font-semibold text-slate-900">Account email:</span> {submittedRecord.accountEmail}</p>
                    ) : null}
                    {submittedRecord.mailingAddress ? (
                      <p><span className="font-semibold text-slate-900">Mailing address:</span> {submittedRecord.mailingAddress}</p>
                    ) : null}
                    {submittedRecord.resourceLink ? (
                      <p className="break-words"><span className="font-semibold text-slate-900">Resource link:</span> {submittedRecord.resourceLink}</p>
                    ) : null}
                    {submittedRecord.refundReason ? (
                      <p><span className="font-semibold text-slate-900">Refund reason:</span> {submittedRecord.refundReason}</p>
                    ) : null}
                    <p><span className="font-semibold text-slate-900">Message:</span> {submittedRecord.details}</p>
                    {submittedRecord.attachments.length ? (
                      <p><span className="font-semibold text-slate-900">Files:</span> {submittedRecord.attachments.join(", ")}</p>
                    ) : null}
                  </div>

                  <button
                    type="button"
                    className="mt-6 rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-slate-900"
                    onClick={resetFlow}
                  >
                    Start another request
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </section>
      </main>
    </div>
  );
}
