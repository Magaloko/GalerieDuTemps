'use client';

interface PrimaryButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  variant?: 'coral' | 'light' | 'ghost';
  fullWidth?: boolean;
}

export function PrimaryButton({
  children,
  onClick,
  className = '',
  variant = 'coral',
  fullWidth = false,
}: PrimaryButtonProps) {
  const baseClasses = 'inline-flex items-center justify-center gap-2 text-[11px] uppercase font-medium tracking-[0.12em] py-3.5 px-8 transition-all duration-300 cursor-pointer';
  const widthClass = fullWidth ? 'w-full' : '';

  const variantClasses = {
    coral: 'bg-coral text-white hover:bg-coral-deep',
    light: 'bg-paper text-ink hover:bg-bone border border-line',
    ghost: 'bg-transparent text-vintage-white border border-vintage-white/30 hover:bg-vintage-white/10',
  };

  return (
    <button
      onClick={onClick}
      className={`${baseClasses} ${variantClasses[variant]} ${widthClass} ${className}`}
      style={{
        backgroundColor: variant === 'coral' ? 'var(--color-coral)' : undefined,
        color: variant === 'coral' ? 'white' : undefined,
      }}
    >
      {children}
    </button>
  );
}
