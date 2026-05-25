import { type ButtonHTMLAttributes, forwardRef } from "react";
import { Loader2 } from "lucide-react";

type Variant  = "primary" | "secondary" | "ghost" | "danger";
type Size     = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:   Variant;
  size?:      Size;
  loading?:   boolean;
  icon?:      React.ReactNode;
}

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-vintage-gold text-vintage-espresso hover:bg-vintage-amber disabled:opacity-50",
  secondary:
    "border border-vintage-gold/40 text-vintage-gold hover:bg-vintage-gold hover:text-vintage-espresso disabled:opacity-50",
  ghost:
    "text-vintage-cream/80 hover:bg-vintage-brown hover:text-vintage-gold disabled:opacity-50",
  danger:
    "bg-vintage-burgundy text-white hover:bg-vintage-burgundy/80 disabled:opacity-50",
};

const sizeClasses: Record<Size, string> = {
  sm:  "px-3 py-1.5 text-xs",
  md:  "px-5 py-2.5 text-xs",
  lg:  "px-7 py-3   text-sm",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant  = "primary",
      size     = "md",
      loading  = false,
      icon,
      children,
      disabled,
      className = "",
      ...rest
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`
          inline-flex items-center justify-center gap-2
          font-sans tracking-[0.2em] uppercase
          transition-colors cursor-pointer
          disabled:cursor-not-allowed
          ${variantClasses[variant]}
          ${sizeClasses[size]}
          ${className}
        `}
        style={{ borderRadius: "var(--radius-button)" }}
        {...rest}
      >
        {loading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin flex-shrink-0" />
        ) : icon ? (
          <span className="flex-shrink-0">{icon}</span>
        ) : null}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
