interface SectionLabelProps {
  text: string;
  className?: string;
}

export function SectionLabel({ text, className = '' }: SectionLabelProps) {
  return (
    <span
      className={`text-[11px] uppercase font-medium tracking-[0.28em] text-coral ${className}`}
      style={{ color: 'var(--color-coral)' }}
    >
      {text}
    </span>
  );
}
