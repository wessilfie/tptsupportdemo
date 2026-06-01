import { Suspense } from "react";

import DynamicContactExperience from "@/components/DynamicContactExperience";

export default function DynamicV7Page() {
  return (
    <Suspense fallback={null}>
      <DynamicContactExperience chatbotEndpoint="/support/chatbot/v7" />
    </Suspense>
  );
}
