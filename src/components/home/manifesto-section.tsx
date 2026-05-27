'use client';

import { useScrollAnimation } from '@/hooks/use-scroll-animation';
import { SectionLabel } from '@/components/ui/section-label';
import { ArrowLink } from '@/components/ui/arrow-link';

export function ManifestoSection() {
  const ref = useScrollAnimation<HTMLElement>();

  return (
    <section
      ref={ref}
      className="py-24 md:py-40 px-6 md:px-14"
      style={{ backgroundColor: 'var(--color-paper)' }}
    >
      <div className="max-w-[1440px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
          {/* Left Column */}
          <div className="lg:col-span-5">
            <div data-animate>
              <SectionLabel text="НАША ФИЛОСОФИЯ" className="mb-6 block" />
            </div>
            <h2
              data-animate
              className="text-2xl md:text-3xl lg:text-4xl leading-tight"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--color-ink)' }}
            >
              Мы верим в вещи, которые переживают тренды. Каждый предмет в нашей галерее отобран за мастерство, провенанс и историю.
            </h2>
          </div>

          {/* Right Column */}
          <div className="lg:col-span-6 lg:col-start-7">
            <p
              data-animate
              className="text-base md:text-lg leading-relaxed mb-8"
              style={{ color: 'var(--color-ink-soft)' }}
            >
              Galerie du Temps объединяет посуду, украшения и предметы интерьера от мастеров, чьи работы transcend эпохи. Основанная в 2015 году, мы ищем дизайн, который актуален сегодня так же, как десятилетия назад, и останется таким для будущих поколений. Наши кураторы путешествуют по Европе, чтобы открывать эти сокровища.
            </p>
            <p
              data-animate
              className="text-xl md:text-2xl italic mb-8"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--color-ink)' }}
            >
              &ldquo;Вещи с душой. Дизайн, что endure.&rdquo;
            </p>
            <div data-animate>
              <ArrowLink href="/about">Наша история</ArrowLink>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
