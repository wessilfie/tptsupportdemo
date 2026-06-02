import { Suspense } from "react";

import DynamicContactExperience from "@/components/DynamicContactExperience";

export default function DynamicLatestPage() {
  return (
    <Suspense fallback={null}>
      <DynamicContactExperience chatbotEndpoint="/support/chatbot/latest" />
    </Suspense>
  );
}
