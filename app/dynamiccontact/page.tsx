import { Suspense } from "react";
import DynamicContactExperience from "@/components/DynamicContactExperience";

export default function DynamicContactPage() {
  return (
    <Suspense fallback={null}>
      <DynamicContactExperience />
    </Suspense>
  );
}
