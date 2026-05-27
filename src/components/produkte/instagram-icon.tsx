interface Props {
  className?: string;
  style?:     React.CSSProperties;
}

/**
 * Inline-SVG Instagram-Glyphe. Lucide-react liefert kein Instagram-Icon mit
 * (Brand-Mark, kein Lifestyle-Icon), daher eigene minimale Version.
 *
 * Matches Lucide-Style: stroke-only, 1.5px, rounded.
 */
export function InstagramIcon({ className, style }: Props) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden="true"
    >
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}
