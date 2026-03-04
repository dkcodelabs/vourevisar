import React from 'react';
import { Star } from 'lucide-react';

interface StarRatingProps {
    rating: number;
}

export const StarRating: React.FC<StarRatingProps> = ({ rating }) => {
    return (
        <div className="flex gap-0.5">
            {[1, 2, 3].map((star) => (
                <Star
                    key={star}
                    size={16}
                    className={`${star <= rating ? 'fill-yellow-400 text-yellow-400' : 'fill-gray-200 text-gray-200'
                        }`}
                />
            ))}
        </div>
    );
};
