// Vintage-Farbpalette für alle Charts (passend zu globals.css Tokens)
export const VINTAGE_COLORS = {
  primary:   "#C9A84C",   // gold
  secondary: "#8B6F47",   // brown
  tertiary:  "#7A9E7E",   // sage
  accent:    "#B87333",   // copper
  danger:    "#722F37",   // burgundy
  forest:    "#3D5A3E",   // forest
  espresso:  "#4A2C1A",
  parchment: "#E8DFD0",
  sand:      "#C9B89A",
  dust:      "#9B9B9B",
} as const;

/** Farbpalette für Charts mit mehreren Kategorien */
export const CHART_PALETTE = [
  VINTAGE_COLORS.primary,
  VINTAGE_COLORS.secondary,
  VINTAGE_COLORS.tertiary,
  VINTAGE_COLORS.accent,
  VINTAGE_COLORS.danger,
  VINTAGE_COLORS.forest,
  VINTAGE_COLORS.espresso,
  VINTAGE_COLORS.dust,
];

export const CHART_AXIS_STYLE = {
  fontSize:   11,
  fontFamily: "Inter, system-ui, sans-serif",
  fill:       VINTAGE_COLORS.dust,
};

export const CHART_TOOLTIP_STYLE = {
  backgroundColor: "#FDFAF5",
  border:          `1px solid ${VINTAGE_COLORS.sand}`,
  borderRadius:    "4px",
  fontSize:        "12px",
  fontFamily:      "Inter, system-ui, sans-serif",
  color:           VINTAGE_COLORS.espresso,
  padding:         "8px 12px",
  boxShadow:       "0 4px 12px rgba(74, 44, 26, 0.15)",
};
