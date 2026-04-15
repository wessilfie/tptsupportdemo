'use client';

interface FeedbackPromptProps {
  onYes: () => void;
  onNo: () => void;
}

export default function FeedbackPrompt({ onYes, onNo }: FeedbackPromptProps) {
  return (
    <div className="px-4 py-3 bg-white border-t border-gray-100">
      <p className="text-sm text-gray-700 mb-2 font-medium">
        Did that answer your question?
      </p>
      <div className="flex gap-2">
        <button
          onClick={onYes}
          className="flex-1 py-2 rounded-full text-sm font-medium bg-[#1B5E4B] text-white hover:bg-[#2a7a62] transition-colors"
        >
          Yes
        </button>
        <button
          onClick={onNo}
          className="flex-1 py-2 rounded-full text-sm font-medium border border-[#1B5E4B] text-[#1B5E4B] hover:bg-[#1B5E4B] hover:text-white transition-colors"
        >
          No
        </button>
      </div>
    </div>
  );
}
