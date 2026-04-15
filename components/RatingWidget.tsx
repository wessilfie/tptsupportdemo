'use client';

import { useState } from 'react';

interface RatingWidgetProps {
  onRate: (stars: number) => void;
}

export default function RatingWidget({ onRate }: RatingWidgetProps) {
  const [hovered, setHovered] = useState(0);

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-gray-700 font-medium text-center">
        How would you rate your experience?
      </p>
      <div className="flex gap-1 justify-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => onRate(star)}
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            className="text-3xl transition-transform hover:scale-125 focus:outline-none"
            aria-label={`Rate ${star} star${star !== 1 ? 's' : ''}`}
          >
            <span className={star <= hovered ? 'text-yellow-400' : 'text-gray-300'}>★</span>
          </button>
        ))}
      </div>
    </div>
  );
}
