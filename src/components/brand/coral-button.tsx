// CoralButton — Primärer CTA der Brand. Uppercase, no radius, 0.22em tracking.
// Variants: solid (coral bg, white text) · ghost (transparent + coral border)
//           ghost-light (für cobalt-bg: weiße Border, weißer Text)
// Sizes:    sm (12px) · md (13px, default) · lg (14px)
//
// Akzeptiert href → rendert <a>, sonst <button>. Polymorph mit className-Override.

import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type Variant = "solid" | "ghost" | "ghost-light";
type Size    = "sm" | "md" | "lg";

const VARIANT_CLASS: Record<Variant, string> = {
  solid:        "btn-coral",
  ghost:        "btn-coral btn-coral-ghost",
  "ghost-light": "btn-coral btn-coral-ghost-light",
};
const SIZE_CLASS: Record<Size, string> = {
  sm: "btn-coral-sm",
  md: "",
  lg: "btn-coral-lg",
};

type Common = {
  variant?:  Variant;
  size?:     Size;
  full?:     boolean;
  className?: string;
  children:  ReactNode;
};

type AsLink = Common & { href: string } & Omit<ComponentProps<typeof Link>, "href" | "className" | "children">;
type AsBtn  = Common & { href?: undefined } & Omit<ComponentProps<"button">, "className" | "children">;

export function CoralButton(props: AsLink | AsBtn) {
  const { variant = "solid", size = "md", full, className, children, ...rest } = props;
  const cls = [
    VARIANT_CLASS[variant],
    SIZE_CLASS[size],
    full && "w-full",
    className,
  ].filter(Boolean).join(" ");

  if ("href" in props && props.href) {
    const { href, ...linkRest } = rest as Omit<AsLink, "variant" | "size" | "full" | "className" | "children">;
    return (
      <Link href={href} className={cls} {...linkRest}>
        {children}
      </Link>
    );
  }
  return (
    <button className={cls} {...(rest as ComponentProps<"button">)}>
      {children}
    </button>
  );
}
