'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

interface ArrowLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
  light?: boolean;
}

export function ArrowLink({ href, children, className = '', light = false }: ArrowLinkProps) {
  const textColor = light ? 'text-vintage-white/70 hover:text-vintage-white' : 'text-ink-soft hover:text-ink';

  return (
    <Link
      href={href}
      className={`group inline-flex items-center gap-2 text-[11px] uppercase font-medium tracking-[0.12em] transition-colors duration-300 ${textColor} ${className}`}
    >
      <span>{children}</span>
      <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
    </Link>
  );
}
