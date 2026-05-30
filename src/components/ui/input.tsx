import { type InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?:  string;
  error?:  string;
  hint?:   string;
  tone?:   "shop" | "app";
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className = "", id, tone = "shop", ...rest }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

    if (tone === "app") {
      return (
        <div className="flex flex-col gap-1.5">
          {label && (
            <label
              htmlFor={inputId}
              className="text-xs font-sans uppercase tracking-widest"
              style={{ color: "var(--color-ink-mute)" }}
            >
              {label}
              {rest.required && (
                <span className="ml-0.5" style={{ color: "var(--color-vintage-burgundy)" }}>*</span>
              )}
            </label>
          )}
          <input
            ref={ref}
            id={inputId}
            className={`
              w-full px-4 py-2.5 text-sm font-sans
              text-[var(--color-ink)] placeholder:text-[var(--color-ink-mute)]
              focus:outline-none focus:border-[var(--color-coral)] focus:[box-shadow:0_0_0_3px_rgba(232,112,58,0.18)]
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors
              ${className}
            `}
            style={{
              background: "var(--color-bone)",
              border: `1px solid ${error ? "var(--color-vintage-burgundy)" : "var(--color-line)"}`,
              borderRadius: "var(--radius-app)",
            }}
            {...rest}
          />
          {error && (
            <p className="text-xs font-sans" style={{ color: "var(--color-vintage-burgundy)" }}>{error}</p>
          )}
          {hint && !error && (
            <p className="text-xs font-sans" style={{ color: "var(--color-ink-mute)" }}>{hint}</p>
          )}
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-xs font-sans uppercase tracking-widest text-vintage-gold/80"
          >
            {label}
            {rest.required && <span className="text-vintage-burgundy ml-0.5">*</span>}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`
            w-full px-4 py-2.5
            bg-vintage-brown border
            ${error ? "border-vintage-burgundy" : "border-vintage-sand/40"}
            text-vintage-cream text-sm font-sans
            placeholder:text-vintage-dust
            focus:outline-none focus:border-vintage-gold focus:ring-1 focus:ring-vintage-gold/30
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors
            ${className}
          `}
          style={{ borderRadius: "var(--radius-vintage)" }}
          {...rest}
        />
        {error && (
          <p className="text-xs text-vintage-burgundy font-sans">{error}</p>
        )}
        {hint && !error && (
          <p className="text-xs text-vintage-dust font-sans">{hint}</p>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";
