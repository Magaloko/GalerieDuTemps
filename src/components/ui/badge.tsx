type BadgeVariant = "gold" | "sage" | "burgundy" | "copper" | "dust" | "espresso";

const variantMap: Record<BadgeVariant, string> = {
  gold:    "bg-vintage-gold/15    text-vintage-espresso border-vintage-gold/30",
  sage:    "bg-vintage-sage/15    text-vintage-forest   border-vintage-sage/30",
  burgundy:"bg-vintage-burgundy/15 text-vintage-burgundy border-vintage-burgundy/30",
  copper:  "bg-vintage-copper/15  text-vintage-copper   border-vintage-copper/30",
  dust:    "bg-vintage-dust/15    text-vintage-dust     border-vintage-dust/30",
  espresso:"bg-vintage-espresso/10 text-vintage-espresso border-vintage-espresso/20",
};

export function Badge({
  children,
  variant = "dust",
}: {
  children: React.ReactNode;
  variant?: BadgeVariant;
}) {
  return (
    <span
      className={`
        inline-flex items-center px-2 py-0.5
        text-xs font-sans tracking-wide border
        ${variantMap[variant]}
      `}
      style={{ borderRadius: "var(--radius-vintage)" }}
    >
      {children}
    </span>
  );
}

/** Zustand → Badge-Variante Mapping */
export function ZustandBadge({ zustand }: { zustand: string }) {
  const map: Record<string, { label: string; variant: BadgeVariant }> = {
    sehr_gut:   { label: "Отличное",       variant: "sage"    },
    gut:        { label: "Хорошее",        variant: "gold"    },
    akzeptabel: { label: "Приемлемое",     variant: "copper"  },
    restauriert:{ label: "Реставрировано", variant: "espresso"},
  };
  const config = map[zustand] ?? { label: zustand, variant: "dust" };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
