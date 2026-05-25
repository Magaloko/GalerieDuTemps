import { type SelectHTMLAttributes, forwardRef } from "react";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?:   string;
  error?:   string;
  hint?:    string;
  options:  Array<{ value: string | number; label: string }>;
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, hint, options, placeholder, className = "", id, ...rest }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
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
