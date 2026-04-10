import { Star } from "lucide-react";
import { useState } from "react";

interface StarRatingProps {
  value: number;
  onChange?: (val: number) => void;
  readonly?: boolean;
  size?: number;
}

const StarRating = ({ value, onChange, readonly = false, size = 24 }: StarRatingProps) => {
  const [hover, setHover] = useState(0);

  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => onChange?.(star)}
          onMouseEnter={() => !readonly && setHover(star)}
          onMouseLeave={() => !readonly && setHover(0)}
          className="disabled:cursor-default transition-colors"
        >
          <Star
            size={size}
            className={
              star <= (hover || value)
                ? "fill-warning text-warning"
                : "text-muted-foreground/30"
            }
          />
        </button>
      ))}
    </div>
  );
};

export default StarRating;
