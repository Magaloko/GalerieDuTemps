// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SectionLabel } from "../section-label";

/**
 * SectionLabel ist ein reines Display-Atom — keine Logik, kein State.
 * Tests fokussieren auf: Text-Output, Default-Klassen, className-Merge.
 */
describe("SectionLabel", () => {
  it("rendert den gegebenen text", () => {
    render(<SectionLabel text="НАША ФИЛОСОФИЯ" />);
    expect(screen.getByText("НАША ФИЛОСОФИЯ")).toBeDefined();
  });

  it("setzt coral als inline color (CSS-Var)", () => {
    const { container } = render(<SectionLabel text="TEST" />);
    const el = container.firstChild as HTMLElement;
    expect(el.style.color).toContain("--color-coral");
  });

  it("ergänzt custom className zusätzlich zu Defaults", () => {
    const { container } = render(<SectionLabel text="TEST" className="mb-10 block" />);
    const el = container.firstChild as HTMLElement;
    // Defaults
    expect(el.className).toContain("uppercase");
    expect(el.className).toContain("tracking-[0.28em]");
    // Custom
    expect(el.className).toContain("mb-10");
    expect(el.className).toContain("block");
  });

  it("setzt 11px-Font + 0.28em-Tracking — Brand-Typographie für Eyebrows", () => {
    const { container } = render(<SectionLabel text="X" />);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain("text-[11px]");
    expect(el.className).toContain("font-medium");
  });
});
