import { type TextareaHTMLAttributes, forwardRef } from "react";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?:  string;
  error?:  string;
  hint?:   string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, className = "", id, ...rest }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-xs font-sans uppercase tracking-widest text-vintage-brown"
          >
            {label}
            {rest.required && <span className="text-vintage-burgundy ml-0.5">*</span>}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          className={`
            w-full px-4 py-2.5
            bg-vintage-cream border
            ${error ? "border-vintage-burgundy" : "border-vintage-sand"}
            text-vintage-ink text-sm font-sans leading-relaxed
            placeholder:text-vintage-dust
            focus:outline-none focus:border-vintage-brown focus:ring-1 focus:ring-vintage-brown
            disabled:opacity-50 resize-y min-h-[100px]
            transition-colors
            ${className}
          `}
          style={{ borderRadius: "var(--radius-vintage)" }}
          {...rest}
        />
        {error && <p className="text-xs text-vintage-burgundy font-sans">{error}</p>}
        {hint && !error && <p className="text-xs text-vintage-dust font-sans">{hint}</p>}
      </div>
    );
  }
);
Textarea.displayName = "Textarea";
