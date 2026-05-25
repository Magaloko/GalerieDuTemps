"use client";

import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="flex items-center gap-2 px-4 py-2 bg-vintage-espresso text-vintage-cream text-xs font-sans tracking-widest uppercase hover:bg-vintage-brown transition-colors"
      style={{ borderRadius: "var(--radius-button)" }}
    >
      <Printer className="w-3.5 h-3.5" />
      Drucken / PDF speichern
    </button>
  );
}
