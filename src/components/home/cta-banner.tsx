'use client';

import { useScrollAnimation } from '@/hooks/use-scroll-animation';
import { PrimaryButton } from '@/components/ui/primary-button';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface CTABannerProps {
  heading?: string;
  subtext?: string;
}

export function CTABanner({
  heading = 'Посетите галерею',
  subtext = 'Ознакомьтесь с кураторской коллекцией лично. Среда — Суббота, 11:00 — 19:00.',
}: CTABannerProps) {
  const ref = useScrollAnimation<HTMLElement>();

  return (
    <section
      ref={ref}
      className="py-24 md:py-28 px-6 md:px-14"
      style={{ backgroundColor: 'var(--color-cobalt)' }}
    >
      <div className="max-w-[1440px] mx-auto text-center">
        <h2
          data-animate
          className="text-3xl md:text-4xl mb-4"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--color-vintage-white)' }}
        >
          {heading}
        </h2>
        <p
          data-animate
          className="text-base md:text-lg mb-10 max-w-md mx-auto"
          style={{ color: 'rgba(255,255,255,0.7)' }}
        >
          {subtext}
        </p>
        <div data-animate className="flex flex-col sm:flex-row items-center justify-center gap-6">
          <PrimaryButton variant="light">
            Записаться на прием
          </PrimaryButton>
          <Link
            href="/katalog"
            className="group inline-flex items-center gap-2 text-[11px] uppercase font-medium tracking-[0.12em] transition-colors duration-300"
            style={{ color: 'rgba(255,255,255,0.7)' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-vintage-white)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.7)')}
          >
            <span>Смотреть онлайн</span>
            <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </section>
  );
}
