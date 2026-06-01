import { Suspense } from "react";

import DynamicContactExperience from "@/components/DynamicContactExperience";

export default function DynamicV4Page() {
  return (
    <Suspense fallback={null}>
      <DynamicContactExperience chatbotEndpoint="/support/chatbot/v4" />
    </Suspense>
  );
}
