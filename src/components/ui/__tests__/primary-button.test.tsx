// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PrimaryButton } from "../primary-button";

/**
 * PrimaryButton — Brand-CTA mit 3 Varianten (coral / light / ghost).
 *
 * Tests:
 *  - children rendern
 *  - onClick wird gefeuert
 *  - variant-Schalter setzt korrekte Klassen + inline coral-bg
 *  - fullWidth setzt w-full
 *  - default-variant ist "coral"
 */
describe("PrimaryButton", () => {
  it("rendert children als button-Inhalt", () => {
    render(<PrimaryButton>Записаться на прием</PrimaryButton>);
    expect(screen.getByRole("button", { name: "Записаться на прием" })).toBeDefined();
  });

  it("ruft onClick beim Klick auf", () => {
    const onClick = vi.fn();
    render(<PrimaryButton onClick={onClick}>X</PrimaryButton>);
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("default-variant ist coral (mit inline CSS-Var-Background)", () => {
    const { container } = render(<PrimaryButton>X</PrimaryButton>);
    const btn = container.querySelector("button")!;
    expect(btn.className).toContain("bg-coral");
    // Inline-Style setzt zusätzlich CSS-Var als bg — wirkt auch ohne Tailwind-Run
    expect(btn.style.backgroundColor).toContain("--color-coral");
    expect(btn.style.color).toBe("white");
  });

  it("variant=light setzt paper-bg + ink-text (für cobalt-Section)", () => {
    const { container } = render(<PrimaryButton variant="light">X</PrimaryButton>);
    const btn = container.querySelector("button")!;
    expect(btn.className).toContain("bg-paper");
    expect(btn.className).toContain("text-ink");
    // Inline-Background ist nur bei coral gesetzt
    expect(btn.style.backgroundColor).toBe("");
  });

  it("variant=ghost setzt transparent + vintage-white border", () => {
    const { container } = render(<PrimaryButton variant="ghost">X</PrimaryButton>);
    const btn = container.querySelector("button")!;
    expect(btn.className).toContain("bg-transparent");
    expect(btn.className).toContain("text-vintage-white");
  });

  it("fullWidth setzt w-full", () => {
    const { container } = render(<PrimaryButton fullWidth>X</PrimaryButton>);
    expect(container.querySelector("button")?.className).toContain("w-full");
  });

  it("default ist NICHT fullWidth", () => {
    const { container } = render(<PrimaryButton>X</PrimaryButton>);
    expect(container.querySelector("button")?.className).not.toContain("w-full");
  });

  it("hat Brand-Typo: 11px uppercase 0.12em-tracking", () => {
    const { container } = render(<PrimaryButton>X</PrimaryButton>);
    const btn = container.querySelector("button")!;
    expect(btn.className).toContain("text-[11px]");
    expect(btn.className).toContain("uppercase");
    expect(btn.className).toContain("tracking-[0.12em]");
  });
});
