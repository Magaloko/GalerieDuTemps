// Hourglass — Galerie-du-Temps Brand-Mark (SVG, currentColor).
// Outline-only: dünner Sanduhr-Rahmen, Mond, fallender Sand, Sternbild-Punkte.
// Inspiriert vom Original-Tote-Bag-Druck.

type HourglassProps = {
  size?:   number;
  stroke?: number;
  className?: string;
};

export function Hourglass({ size = 80, stroke = 1.4, className }: HourglassProps) {
  return (
    <svg
      width={size}
      height={size * 2}
      viewBox="0 0 100 200"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="6"  y="6"  width="88" height="188" rx="2" />
      <rect x="11" y="11" width="78" height="178" rx="1" />

      <path d="M14 22 H86 V36 Q86 52 78 60 L60 78 Q50 86 50 96 Q50 86 40 78 L22 60 Q14 52 14 36 Z" />

      <path d="M50 28 a8 8 0 1 0 6 6 a6 6 0 1 1 -6 -6 z" fill="currentColor" stroke="none" />

      <path d="M22 42 q4 -4 8 -2 q2 -4 6 -2" />
      <path d="M64 40 q4 -4 8 -2 q2 -4 6 -2" />

      <path d="M40 60 Q44 70 50 78" opacity="0.7" />
      <path d="M60 60 Q56 70 50 78" opacity="0.7" />
      <path d="M50 78 L50 96" />

      <circle cx="20" cy="86"  r="1.3" fill="currentColor" stroke="none" />
      <circle cx="14" cy="100" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="28" cy="106" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="20" cy="120" r="1.3" fill="currentColor" stroke="none" />
      <path d="M20 86 L14 100 L28 106 L20 86 M28 106 L20 120" opacity="0.6" />

      <circle cx="80" cy="86"  r="1.3" fill="currentColor" stroke="none" />
      <circle cx="86" cy="100" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="72" cy="106" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="80" cy="120" r="1.3" fill="currentColor" stroke="none" />
      <path d="M80 86 L86 100 L72 106 L80 86 M72 106 L80 120" opacity="0.6" />

      <path d="M50 96 Q50 106 40 114 L22 132 Q14 140 14 156 V172 H86 V156 Q86 140 78 132 L60 114 Q50 106 50 96 Z" />

      <path d="M22 168 Q34 156 50 156 Q66 156 78 168 Z" fill="currentColor" stroke="none" opacity="0.95" />
      <path d="M28 162 Q40 152 50 152 Q60 152 72 162" opacity="0.5" />

      <path d="M14 172 H86 V186 H14 Z" />
    </svg>
  );
}
