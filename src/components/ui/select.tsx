import { type SelectHTMLAttributes, forwardRef } from "react";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?:   string;
  error?:   string;
  hint?:    string;
  options:  Array<{ value: string | number; label: string }>;
  placeholder?: string;
  tone?:    "shop" | "app";
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, hint, options, placeholder, className = "", id, tone = "shop", ...rest }, ref) => {
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
          <select
            ref={ref}
            id={inputId}
            className={`
              w-full px-4 py-2.5 text-sm font-sans
              text-[var(--color-ink)]
              focus:outline-none focus:border-[var(--color-coral)] focus:[box-shadow:0_0_0_3px_rgba(232,112,58,0.18)]
              disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer
              transition-colors
              ${className}
            `}
            style={{
              background: "var(--color-bone)",
              border: `1px solid ${error ? "var(--color-vintage-burgundy)" : "var(--color-line)"}`,
              borderRadius: "var(--radius-app)",
            }}
            {...rest}
          >
            {placeholder && (
              <option value="">{placeholder}</option>
            )}
            {options.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
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
        <select
          ref={ref}
          id={inputId}
          className={`
            w-full px-4 py-2.5
            bg-vintage-brown border
            ${error ? "border-vintage-burgundy" : "border-vintage-sand/40"}
            text-vintage-cream text-sm font-sans
            focus:outline-none focus:border-vintage-gold focus:ring-1 focus:ring-vintage-gold/30
            disabled:opacity-50 cursor-pointer
            transition-colors
            ${className}
          `}
          style={{ borderRadius: "var(--radius-vintage)" }}
          {...rest}
        >
          {placeholder && (
            <option value="">{placeholder}</option>
          )}
          {options.map(opt => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && <p className="text-xs text-vintage-burgundy font-sans">{error}</p>}
        {hint && !error && <p className="text-xs text-vintage-dust font-sans">{hint}</p>}
      </div>
    );
  }
);
Select.displayName = "Select";
