// Wordmark — "GALERIE" (Italiana, gespreizt) + "du Temps" (Cormorant italic).
// Beide Teile coral. Default: stacked. Pass stack={false} für inline-Lockup.

type WordmarkProps = {
  size?:  number;         // Pixelgröße der GALERIE-Zeile
  stack?: boolean;
  className?: string;
};

export function Wordmark({ size = 48, stack = true, className }: WordmarkProps) {
  return (
    <div
      className={`inline-block leading-none text-coral ${className ?? ""}`}
      style={{ textAlign: "center" }}
    >
      <div
        className="wordmark"
        style={{ fontSize: size }}
      >
        GALERIE
      </div>
      {stack && (
        <div
          className="wordmark-italic"
          style={{
            fontSize:      size * 0.42,
            marginTop:     size * 0.12,
            letterSpacing: "0.02em",
          }}
        >
          du Temps
        </div>
      )}
    </div>
  );
}
