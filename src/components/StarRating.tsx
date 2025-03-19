import React from 'react';

interface StarRatingProps {
  rating: number;
  setRating?: (rating: number) => void;
  size?: 'sm' | 'md' | 'lg';
  readOnly?: boolean;
}

const StarRating: React.FC<StarRatingProps> = ({
  rating,
  setRating,
  size = 'md',
  readOnly = false
}) => {
  // Determine star size class
  const starSizeClass = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-3xl'
  }[size];
  
  // Handle star click to set rating
  const handleStarClick = (selectedRating: number) => {
    if (readOnly || !setRating) return;
    setRating(selectedRating);
  };
  
  return (
    <div className="flex space-x-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => handleStarClick(star)}
          className={`${starSizeClass} focus:outline-none ${readOnly ? 'cursor-default' : 'cursor-pointer'}`}
          disabled={readOnly}
          aria-label={`${readOnly ? 'Rated' : 'Rate'} ${star} stars out of 5`}
        >
          {star <= rating ? (
            <span className="text-yellow-400">★</span>
          ) : (
            <span className="text-gray-300">★</span>
          )}
        </button>
      ))}
    </div>
  );
};

export default StarRating; 