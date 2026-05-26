// Eyebrow — small-caps Kicker über Section-Headlines.
// Tone: coral (default), mute (auf paper), light (auf cobalt), ink (max contrast).

type EyebrowProps = {
  children:  React.ReactNode;
  tone?:     "coral" | "mute" | "light" | "ink";
  className?: string;
  as?:       "p" | "span" | "div";
};

const TONE_CLASS = {
  coral: "eyebrow",
  mute:  "eyebrow eyebrow-mute",
  light: "eyebrow eyebrow-light",
  ink:   "eyebrow eyebrow-ink",
} as const;

export function Eyebrow({ children, tone = "coral", className, as: Tag = "p" }: EyebrowProps) {
  return (
    <Tag className={`${TONE_CLASS[tone]}${className ? ` ${className}` : ""}`}>
      {children}
    </Tag>
  );
}
