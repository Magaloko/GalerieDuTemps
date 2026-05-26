// ProductPlaceholder — Striped Gradient für leere Produktslots bevor Fotos da sind.
// 9 Töne aus dem Handoff (sepia, sand, ash, olive, clay, jade, velvet, dark, cobalt).
// Caption unten rechts in Mono (lot-id / sub-info).

type Tone = "sepia" | "sand" | "ash" | "olive" | "clay" | "jade" | "velvet" | "dark" | "cobalt";

const TONES: Record<Tone, [string, string, string]> = {
  sepia:  ["#C9B292", "#A88B65", "#7A5E3F"],
  sand:   ["#E2D5BB", "#C9B58F", "#9F8862"],
  ash:    ["#A8A6A0", "#85847F", "#5E5D58"],
  olive:  ["#8D8B5A", "#6F6D43", "#4D4C2B"],
  clay:   ["#B07659", "#8C5B40", "#623E29"],
  jade:   ["#7A938C", "#566F69", "#384E48"],
  velvet: ["#705566", "#523F4D", "#352730"],
  dark:   ["#3B3A36", "#262521", "#161512"],
  cobalt: ["#3D4A8F", "#252F6A", "#141A4D"],
};

type ProductPlaceholderProps = {
  tone?:   Tone;
  label?:  string;
  sub?:    string;
  ratio?:  string;             // "4/5", "3/4", …
  className?: string;
};

export function ProductPlaceholder({
  tone = "sepia",
  label = "PRODUCT",
  sub,
  ratio = "4/5",
  className,
}: ProductPlaceholderProps) {
  const [a, b, c] = TONES[tone];
  return (
    <div
      className={`relative w-full overflow-hidden placeholder-stripes ${className ?? ""}`}
      style={{
        aspectRatio: ratio,
        background: `linear-gradient(135deg, ${a} 0%, ${b} 50%, ${c} 100%)`,
      }}
      aria-hidden="true"
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 30% 25%, rgba(255,255,255,0.18) 0%, rgba(0,0,0,0.35) 80%)",
        }}
      />
      <div
        className="absolute bottom-3.5 left-3.5 right-3.5 flex items-end justify-between gap-2 text-white/85"
        style={{
          fontFamily:    "var(--font-mono)",
          fontSize:      9,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
        }}
      >
        <span>{label}</span>
        {sub && <span className="opacity-70">{sub}</span>}
      </div>
    </div>
  );
}
