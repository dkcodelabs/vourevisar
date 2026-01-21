
import React from 'react';

interface StarRatingProps {
  rating: number;
  onRatingChange: (rating: number) => void;
}

const StarRating: React.FC<StarRatingProps> = ({ rating, onRatingChange }) => {
  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-1 mb-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => onRatingChange(star)}
            className="focus:outline-none transition-transform active:scale-90"
          >
            <svg
              className={`w-3.5 h-3.5 ${star <= rating ? 'fill-brand-gold' : 'fill-[#3f3f46]'}`}
              viewBox="0 0 24 24"
            >
              <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
            </svg>
          </button>
        ))}
      </div>
      <div className="flex justify-between items-center w-full mt-1">
        <span className="text-[9px] text-[#3f3f46] font-medium uppercase tracking-wider">Fácil</span>
        <span className="text-[10px] font-bold text-brand-gold uppercase tracking-wider">
          {rating <= 2 ? 'TRANQUILO' : rating <= 4 ? 'MÉDIO' : 'DIFÍCIL'}
        </span>
        <span className="text-[9px] text-[#3f3f46] font-medium uppercase tracking-wider">Difícil</span>
      </div>
    </div>
  );
};

export default StarRating;
