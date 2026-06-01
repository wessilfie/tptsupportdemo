"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, ChevronDown, Link as LinkIcon, Paperclip, Search, ShoppingCart } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { CxChatWidget } from "./CxChatWidget";
import type { ChatHandoffContext } from "./CxChatWidget";

type AuthState = "logged_in" | "logged_out";
type DynamicTopic = "Issues with Logging In" | "Refund" | "Question about TPT" | "Other";

type SubmissionRecord = {
  authState: AuthState;
  topic: DynamicTopic;
  name: string;
  email: string;
  accountEmail: string;
  mailingAddress: {
    street: string;
    unit: string;
    city: string;
    region: string;
    postalCode: string;
    country: string;
  };
  resourceLink: string;
  refundReason: string;
  details: string;
  attachments: string[];
};

const LOGGED_IN_PROFILE = {
  name: "Will E",
  email: "will+demo@ixl.com",
};

const NAV_ITEMS = [
  "Grade",
  "Resource type",
  "Seasonal",
  "ELA",
  "Math",
  "Science",
  "Social studies",
  "Languages",
  "Arts",
  "Special education",
  "Speech therapy",
];

const TOPIC_OPTIONS: DynamicTopic[] = [
  "Issues with Logging In",
  "Refund",
  "Question about TPT",
  "Other",
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

function topicHelperCopy(topic: DynamicTopic | "") {
  if (topic === "Issues with Logging In") {
    return "If you can’t access your account, include the account email, mailing address, and what happens when you try to log in.";
  }

  if (topic === "Refund") {
    return "Include the resource link, why you are requesting the refund, and any order or error details that will help us review it faster.";
  }

  return "Providing as much detail as you can will help us resolve your question faster.";
}

function inputClassName() {
  return "w-full rounded-[1.5rem] border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 shadow-[0_18px_36px_-30px_rgba(15,23,42,0.16)] outline-none transition focus:border-[#63E0A5] focus:ring-4 focus:ring-[#dff8ea]";
}

function textAreaClassName() {
  return "min-h-48 w-full rounded-[1.5rem] border border-slate-200 bg-white px-4 py-4 text-base leading-7 text-slate-900 shadow-[0_18px_36px_-30px_rgba(15,23,42,0.16)] outline-none transition focus:border-[#63E0A5] focus:ring-4 focus:ring-[#dff8ea]";
}

type DynamicContactExperienceProps = {
  chatbotEndpoint?: string;
};

export default function DynamicContactExperience({
  chatbotEndpoint = "/support/chatbot",
}: DynamicContactExperienceProps) {
  const searchParams = useSearchParams();
  const [authState, setAuthState] = useState<AuthState>("logged_out");
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [topic, setTopic] = useState<DynamicTopic | "">("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [accountEmail, setAccountEmail] = useState("");
  const [mailingAddressStreet, setMailingAddressStreet] = useState("");
  const [mailingAddressUnit, setMailingAddressUnit] = useState("");
  const [mailingAddressCity, setMailingAddressCity] = useState("");
  const [mailingAddressRegion, setMailingAddressRegion] = useState("");
  const [mailingAddressPostalCode, setMailingAddressPostalCode] = useState("");
  const [mailingAddressCountry, setMailingAddressCountry] = useState("");
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

  const source = searchParams.get("source");
  const showIdentityFields = authState === "logged_out";
  const currentStepLabel =
    currentStep === 1 ? "Step 1 of 3: Contact" : currentStep === 2 ? "Step 2 of 3: Details" : "Step 3 of 3: Sent";

  const isStepOneValid = useMemo(() => {
    if (!topic) {
      return false;
    }

    if (!showIdentityFields) {
      return true;
    }

    return Boolean(name.trim() && email.trim());
  }, [email, name, showIdentityFields, topic]);

  const isStepTwoValid = useMemo(() => {
    if (!topic || !details.trim()) {
      return false;
    }

    if (topic === "Issues with Logging In") {
      return Boolean(
        accountEmail.trim() &&
        mailingAddressStreet.trim() &&
        mailingAddressCity.trim() &&
        mailingAddressRegion.trim() &&
        mailingAddressPostalCode.trim() &&
        mailingAddressCountry.trim(),
      );
    }

    if (topic === "Refund") {
      return Boolean(resourceLink.trim() && refundReason.trim());
    }

    return true;
  }, [
    accountEmail,
    details,
    mailingAddressCity,
    mailingAddressCountry,
    mailingAddressPostalCode,
    mailingAddressRegion,
    mailingAddressStreet,
    mailingAddressUnit,
    refundReason,
    resourceLink,
    topic,
  ]);

  function resetFlow() {
    setAuthState("logged_out");
    setCurrentStep(1);
    setTopic(getTopicFromQuery(searchParams.get("topic")));
    setName("");
    setEmail("");
    setAccountEmail("");
    setMailingAddressStreet("");
    setMailingAddressUnit("");
    setMailingAddressCity("");
    setMailingAddressRegion("");
    setMailingAddressPostalCode("");
    setMailingAddressCountry("");
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
      name: showIdentityFields ? name.trim() : LOGGED_IN_PROFILE.name,
      email: showIdentityFields ? email.trim() : LOGGED_IN_PROFILE.email,
      accountEmail: accountEmail.trim(),
      mailingAddress: {
        street: mailingAddressStreet.trim(),
        unit: mailingAddressUnit.trim(),
        city: mailingAddressCity.trim(),
        region: mailingAddressRegion.trim(),
        postalCode: mailingAddressPostalCode.trim(),
        country: mailingAddressCountry.trim(),
      },
      resourceLink: resourceLink.trim(),
      refundReason: refundReason.trim(),
      details: details.trim(),
      attachments: attachments.map((file) => file.name),
    });
    setCurrentStep(3);
  }

  function inferDynamicContactTopic(context: ChatHandoffContext): DynamicTopic {
    const combinedText = [
      context.originalQuestion,
      context.restatedQuestion ?? "",
      ...context.transcript.map((entry) => entry.content),
    ]
      .join(" ")
      .toLowerCase();

    if (/\b(log[ -]?in|login|sign[ -]?in|password|reset|locked out|cannot access|can'?t access)\b/.test(combinedText)) {
      return "Issues with Logging In";
    }

    if (/\b(refund|credit|charged|charge|billing|duplicate purchase|wrong resource|purchase)\b/.test(combinedText)) {
      return "Refund";
    }

    if (/\b(how|what|where|when|why|question|can i)\b/.test(combinedText)) {
      return "Question about TPT";
    }

    return "Other";
  }

  function handleChatEscalation(context: ChatHandoffContext) {
    const nextTopic = inferDynamicContactTopic(context);
    setTopic(nextTopic);
    setCurrentStep(1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-[1450px] px-8 py-8">
          <div className="flex items-center justify-between gap-8">
            <div className="flex items-center gap-4 text-[#14473f]">
              <div className="relative h-12 w-16">
                <span className="absolute left-0 top-3 h-5 w-5 rounded-full bg-[#14473f]" />
                <span className="absolute left-6 top-0 h-5 w-5 rounded-full bg-[#63E0A5]" />
                <span className="absolute left-10 top-3 h-5 w-5 rounded-full bg-[#14473f]" />
                <span className="absolute left-2 top-5 h-2 w-12 rounded-full bg-[#14473f]" />
              </div>
              <div className="text-5xl font-black tracking-tight">TPT</div>
            </div>

            <div className="hidden flex-1 justify-center lg:flex">
              <div className="flex w-full max-w-[850px] items-center rounded-full border border-slate-300 bg-white px-10 py-3 text-[17px] text-slate-400">
                Search
                <div className="ml-auto flex h-[72px] w-[72px] items-center justify-center rounded-full bg-[#63E0A5] text-[#14473f]">
                  <Search className="size-8" />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-10 text-2xl font-semibold text-slate-800">
              <span>Log In | Sign Up</span>
              <ShoppingCart className="size-11 stroke-[1.8]" />
            </div>
          </div>

          <div className="mt-7 hidden items-center justify-between border-t border-slate-200 pt-6 text-[18px] font-medium text-slate-800 lg:flex">
            {NAV_ITEMS.map((item) => (
              <span key={item}>{item}</span>
            ))}
            <span className="flex h-14 w-14 items-center justify-center rounded-full border border-slate-200 text-3xl text-slate-500">
              ›
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1140px] px-8 py-14">
        {currentStep !== 3 ? (
          <section className="max-w-[980px]">
            <p className="text-[24px] font-semibold text-[#1b5e4b]">Contact Us</p>
            <h1 className="mt-5 text-[58px] font-semibold leading-none tracking-tight">We&apos;re here to help!</h1>
            <p className="mt-5 text-[29px] leading-[1.25] text-slate-900">
              To get started, fill out the form below, providing as much detail as you can.
              Someone from TPT&apos;s Customer Experience team will get back to you as soon as
              possible.
            </p>
          </section>
        ) : null}

        {source === "chatbot" && currentStep !== 3 ? (
          <div className="mt-8 max-w-[980px] rounded-md border border-emerald-200 bg-emerald-50 px-5 py-4 text-base text-slate-700">
            We preselected a topic from your chat. You can change it before continuing.
          </div>
        ) : null}

        {currentStep !== 3 ? (
          <div className="mt-6 max-w-[980px] border-l-4 border-[#63E0A5] bg-[#f6fbf8] px-5 py-4">
            <div className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">
              {currentStepLabel}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <span className="text-base text-slate-700">Current topic:</span>
              <span className="rounded-full bg-[#14473f] px-4 py-1.5 text-sm font-semibold text-white">
                {topic || "Choose a topic"}
              </span>
            </div>
            {topic ? (
              <p className="mt-3 text-base leading-7 text-slate-700">
                You are currently in the <span className="font-semibold text-slate-900">{topic}</span> support flow.
              </p>
            ) : null}
          </div>
        ) : null}

        {currentStep !== 3 ? (
          <section className="mt-10 max-w-[980px] rounded-[28px] border border-slate-200 bg-[#fcfffd] p-8 shadow-[0_30px_80px_-58px_rgba(15,23,42,0.38)]">
            {currentStep === 2 ? (
              <div className="mb-8 flex flex-wrap items-center gap-5">
                <button
                  type="button"
                  className="inline-flex items-center gap-2 text-sm font-medium text-[#14473f]"
                  onClick={() => setCurrentStep(1)}
                >
                  <ArrowLeft className="size-4" />
                  Back to contact info
                </button>
                <button
                  type="button"
                  className="text-sm font-medium text-slate-600 underline underline-offset-2"
                  onClick={() => setCurrentStep(1)}
                >
                  Change topic
                </button>
              </div>
            ) : null}

            <div className="space-y-7">
              {currentStep === 1 ? (
                <>
                  <FormRow
                    label="Topic:"
                    required
                      field={
                        <div className="relative">
                          <select
                            className={`${inputClassName()} appearance-none pr-12`}
                          value={topic}
                          onChange={(event) => setTopic(event.target.value as DynamicTopic | "")}
                        >
                          <option value="">Select Topic</option>
                          {TOPIC_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-4 top-1/2 size-5 -translate-y-1/2 text-slate-500" />
                      </div>
                    }
                  />

                  {showIdentityFields ? (
                    <>
                      <FormRow
                        label="Full Name:"
                        required
                        field={
                          <input
                            type="text"
                            className={inputClassName()}
                            value={name}
                            onChange={(event) => setName(event.target.value)}
                          />
                        }
                      />
                      <FormRow
                        label="Email Address:"
                        required
                        field={
                          <input
                            type="email"
                            className={inputClassName()}
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                          />
                        }
                      />
                    </>
                  ) : (
                    <FormRow
                      label="Account:"
                      field={
                        <div className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50 px-4 py-3 text-base text-slate-700 shadow-[0_18px_36px_-30px_rgba(15,23,42,0.12)]">
                          Using {LOGGED_IN_PROFILE.name} ({LOGGED_IN_PROFILE.email})
                        </div>
                      }
                    />
                  )}

                  <div className="flex justify-end">
                    <button
                      type="button"
                      className={isStepOneValid ? "rounded-full bg-[#63E0A5] px-6 py-3 text-sm font-semibold text-slate-950" : "cursor-not-allowed rounded-full bg-slate-200 px-6 py-3 text-sm font-semibold text-slate-400"}
                      disabled={!isStepOneValid}
                      onClick={() => setCurrentStep(2)}
                    >
                      Continue
                    </button>
                  </div>
                </>
              ) : null}

              {currentStep === 2 && topic ? (
                <>
                  {topic === "Issues with Logging In" ? (
                    <>
                      <FormRow
                        label="Email On Account:"
                        required
                        field={
                          <input
                            type="email"
                            className={inputClassName()}
                            value={accountEmail}
                            onChange={(event) => setAccountEmail(event.target.value)}
                          />
                        }
                      />
                      <FormRow
                        label="Mailing Address:"
                        required
                        field={
                          <div className="space-y-3">
                            <input
                              type="text"
                              className={inputClassName()}
                              placeholder="Street address"
                              value={mailingAddressStreet}
                              onChange={(event) => setMailingAddressStreet(event.target.value)}
                            />
                            <input
                              type="text"
                              className={inputClassName()}
                              placeholder="Apartment, suite, or unit (optional)"
                              value={mailingAddressUnit}
                              onChange={(event) => setMailingAddressUnit(event.target.value)}
                            />
                            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_120px_140px]">
                              <input
                                type="text"
                                className={inputClassName()}
                                placeholder="City"
                                value={mailingAddressCity}
                                onChange={(event) => setMailingAddressCity(event.target.value)}
                              />
                              <input
                                type="text"
                                className={inputClassName()}
                                placeholder="State / province / region"
                                value={mailingAddressRegion}
                                onChange={(event) => setMailingAddressRegion(event.target.value)}
                              />
                              <input
                                type="text"
                                className={inputClassName()}
                                placeholder="Postal code"
                                value={mailingAddressPostalCode}
                                onChange={(event) => setMailingAddressPostalCode(event.target.value)}
                              />
                            </div>
                            <input
                              type="text"
                              className={inputClassName()}
                              placeholder="Country / region"
                              value={mailingAddressCountry}
                              onChange={(event) => setMailingAddressCountry(event.target.value)}
                            />
                          </div>
                        }
                      />
                    </>
                  ) : null}

                  {topic === "Refund" ? (
                    <>
                      <FormRow
                        label="Resource URL or name:"
                        required
                        field={
                          <div className="relative">
                            <LinkIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                            <input
                              type="url"
                              className={`${inputClassName()} pl-10`}
                              value={resourceLink}
                              onChange={(event) => setResourceLink(event.target.value)}
                            />
                          </div>
                        }
                      />
                      <FormRow
                        label="Refund Reason:"
                        required
                        field={
                          <div className="relative">
                            <select
                              className={`${inputClassName()} appearance-none pr-12`}
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
                            <ChevronDown className="pointer-events-none absolute right-4 top-1/2 size-5 -translate-y-1/2 text-slate-500" />
                          </div>
                        }
                      />
                    </>
                  ) : null}

                  <FormRow
                    label="Message:"
                    required
                    alignTop
                    field={
                      <textarea
                        className={textAreaClassName()}
                        value={details}
                        placeholder={topicHelperCopy(topic)}
                        onChange={(event) => setDetails(event.target.value)}
                      />
                    }
                  />

                  <FormRow
                    label="Attachment:"
                    alignTop
                    field={
                      <div>
                        <label
                          htmlFor="file-upload"
                          className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-[0_18px_36px_-30px_rgba(15,23,42,0.16)] transition hover:border-emerald-300 hover:bg-emerald-50"
                        >
                          <Paperclip className="size-4 text-[#1b5e4b]" />
                          Upload file if needed
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
                              <span key={`${file.name}-${file.lastModified}`} className="border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800">
                                {file.name}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    }
                  />

                  <div className="flex justify-end">
                    <button
                      type="button"
                      className={isStepTwoValid ? "rounded-full bg-[#63E0A5] px-6 py-3 text-sm font-semibold text-slate-950" : "cursor-not-allowed rounded-full bg-slate-200 px-6 py-3 text-sm font-semibold text-slate-400"}
                      disabled={!isStepTwoValid}
                      onClick={handleSubmit}
                    >
                      Submit request
                    </button>
                  </div>
                </>
              ) : null}
            </div>
            <div className="mt-10 border-t border-slate-200 pt-5">
              <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                <p className="text-slate-600">Account status for this demo</p>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    className={authState === "logged_out" ? "rounded-full bg-[#14473f] px-4 py-2 font-medium text-white" : "rounded-full border border-slate-300 px-4 py-2 font-medium text-slate-700"}
                    onClick={() => setAuthState("logged_out")}
                  >
                    Logged out
                  </button>
                  <button
                    type="button"
                    className={authState === "logged_in" ? "rounded-full bg-[#63E0A5] px-4 py-2 font-medium text-slate-950" : "rounded-full border border-slate-300 px-4 py-2 font-medium text-slate-700"}
                    onClick={() => setAuthState("logged_in")}
                  >
                    Logged in demo
                  </button>
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {currentStep === 3 && submittedRecord ? (
          <section className="mt-12 max-w-[980px] rounded-[28px] border border-slate-200 bg-[#fcfffd] p-8 shadow-[0_30px_80px_-58px_rgba(15,23,42,0.38)]">
            <div className="flex items-start gap-5">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#14473f] text-white">
                <CheckCircle2 className="size-7" />
              </div>
              <div>
                <h2 className="text-4xl font-semibold tracking-tight">Request submitted</h2>
                <p className="mt-3 text-xl leading-8 text-slate-700">
                  Thanks for contacting us. We&apos;ll get back to you soon.
                </p>
              </div>
            </div>

            <div className="mt-8 max-w-[720px] border border-slate-200 bg-white p-6">
              <div className="space-y-3 text-base leading-7 text-slate-700">
                <p><span className="font-semibold text-slate-900">Topic:</span> {submittedRecord.topic}</p>
                <p><span className="font-semibold text-slate-900">Email:</span> {submittedRecord.email}</p>
                {submittedRecord.accountEmail ? <p><span className="font-semibold text-slate-900">Account email:</span> {submittedRecord.accountEmail}</p> : null}
                {submittedRecord.mailingAddress.street ? (
                  <p>
                    <span className="font-semibold text-slate-900">Mailing address:</span>{" "}
                    {submittedRecord.mailingAddress.street}
                    {submittedRecord.mailingAddress.unit ? `, ${submittedRecord.mailingAddress.unit}` : ""}
                    {`, ${submittedRecord.mailingAddress.city}, ${submittedRecord.mailingAddress.region} ${submittedRecord.mailingAddress.postalCode}, ${submittedRecord.mailingAddress.country}`}
                  </p>
                ) : null}
                {submittedRecord.resourceLink ? <p><span className="font-semibold text-slate-900">Resource URL or name:</span> {submittedRecord.resourceLink}</p> : null}
                {submittedRecord.refundReason ? <p><span className="font-semibold text-slate-900">Refund reason:</span> {submittedRecord.refundReason}</p> : null}
                <p><span className="font-semibold text-slate-900">Message:</span> {submittedRecord.details}</p>
                {submittedRecord.attachments.length ? <p><span className="font-semibold text-slate-900">Files:</span> {submittedRecord.attachments.join(", ")}</p> : null}
              </div>

              <button
                type="button"
                className="mt-6 rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700"
                onClick={resetFlow}
              >
                Start another request
              </button>
            </div>
          </section>
        ) : null}
      </main>
      <CxChatWidget
        onEscalate={handleChatEscalation}
        chatbotEndpoint={chatbotEndpoint}
      />
    </div>
  );
}

function FormRow({
  label,
  field,
  required = false,
  alignTop = false,
}: {
  label: string;
  field: React.ReactNode;
  required?: boolean;
  alignTop?: boolean;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-[300px_minmax(0,1fr)] md:items-center md:gap-5">
      <label
        className={`text-right text-[18px] font-semibold text-slate-700 ${alignTop ? "md:self-start md:pt-3" : ""}`}
      >
        {label} {required ? <span className="text-[#1b5e4b]">*</span> : null}
      </label>
      <div>{field}</div>
    </div>
  );
}
