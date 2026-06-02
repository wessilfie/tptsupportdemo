import { Suspense } from "react";

import DynamicContactExperience from "@/components/DynamicContactExperience";

export default function DynamicV8Page() {
  return (
    <Suspense fallback={null}>
      <DynamicContactExperience chatbotEndpoint="/support/chatbot/v8" />
    </Suspense>
  );
}
