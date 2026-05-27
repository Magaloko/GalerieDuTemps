// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ArrowLink } from "../arrow-link";

/**
 * ArrowLink — Link-Atom mit ArrowRight-Icon.
 *
 * Tests:
 *  - href landet am <a>
 *  - children-Text rendert
 *  - SVG-Icon (lucide ArrowRight) wird gerendert
 *  - light-Variante schaltet Farb-Klassen um (dunkel→hell für cobalt-bg)
 */
describe("ArrowLink", () => {
  it("rendert href + Text + Icon", () => {
    const { container } = render(<ArrowLink href="/about">Наша история</ArrowLink>);
    const a = container.querySelector("a");
    expect(a?.getAttribute("href")).toBe("/about");
    expect(screen.getByText("Наша история")).toBeDefined();
    // Lucide rendert SVG
    expect(container.querySelector("svg")).not.toBeNull();
  });

  it("default-Variante nutzt ink-Farbschema", () => {
    const { container } = render(<ArrowLink href="/x">L</ArrowLink>);
    const a = container.querySelector("a");
    expect(a?.className).toContain("text-ink-soft");
    expect(a?.className).toContain("hover:text-ink");
  });

  it("light-Variante schaltet auf vintage-white für cobalt-Hintergrund", () => {
    const { container } = render(
      <ArrowLink href="/x" light>L</ArrowLink>
    );
    const a = container.querySelector("a");
    expect(a?.className).toContain("text-vintage-white/70");
    expect(a?.className).toContain("hover:text-vintage-white");
    // Stellt sicher dass kein "text-ink-soft" leakt
    expect(a?.className).not.toContain("text-ink-soft");
  });

  it("ergänzt custom className", () => {
    const { container } = render(
      <ArrowLink href="/x" className="ml-4">L</ArrowLink>
    );
    expect(container.querySelector("a")?.className).toContain("ml-4");
  });

  it("hat group-Klasse für hover-translate des Icons", () => {
    const { container } = render(<ArrowLink href="/x">L</ArrowLink>);
    expect(container.querySelector("a")?.className).toContain("group");
  });
});
