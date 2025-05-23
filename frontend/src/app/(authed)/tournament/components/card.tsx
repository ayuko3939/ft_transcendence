import { forwardRef, HTMLAttributes } from "react";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "bordered";
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className = "", variant = "default", ...props }, ref) => {
    const baseStyles = "rounded-lg bg-gray-800 text-white";

    const variants = {
      default: "shadow-lg",
      bordered: "border border-gray-700",
    };

    return (
      <div
        className={`${baseStyles} ${variants[variant]} ${className}`}
        ref={ref}
        {...props}
      />
    );
  },
);

Card.displayName = "Card";

export { Card };
