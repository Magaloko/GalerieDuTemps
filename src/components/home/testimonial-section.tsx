'use client';

import { useScrollAnimation } from '@/hooks/use-scroll-animation';

interface TestimonialSectionProps {
  quote?: string;
  author?: string;
}

export function TestimonialSection({
  quote = 'Каждый предмет от Galerie du Temps несет присутствие — вы чувствуете историю, намерение, заботу. Мой дом никогда не казался таким личным.',
  author = 'Елена М. — Коллекционер с 2019',
}: TestimonialSectionProps) {
  const ref = useScrollAnimation<HTMLElement>();

  return (
    <section
      ref={ref}
      className="py-24 md:py-40 px-6 md:px-14"
      style={{ backgroundColor: 'var(--color-paper)' }}
    >
      <div className="max-w-[800px] mx-auto text-center">
        <blockquote
          data-animate
          className="text-2xl md:text-3xl lg:text-4xl leading-tight mb-8"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--color-ink)' }}
        >
          &ldquo;{quote}&rdquo;
        </blockquote>
        <cite
          data-animate
          className="text-[11px] uppercase tracking-[0.12em] font-medium not-italic"
          style={{ color: 'var(--color-ink-mute)' }}
        >
          {author}
        </cite>
      </div>
    </section>
  );
}
