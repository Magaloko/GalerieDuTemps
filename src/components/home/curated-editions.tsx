'use client';

import { useRef } from 'react';
import Image from 'next/image';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { SectionLabel } from '@/components/ui/section-label';
import { ArrowLink } from '@/components/ui/arrow-link';

gsap.registerPlugin(ScrollTrigger);

const journalEntries = [
  {
    title: 'История декоративного стекла',
    excerpt: 'Как богемские мастера революционизировали посуду в 1920-х',
    image: '/images/hero-stack-2.jpg',
  },
  {
    title: 'Коллекционирование винтажного серебра',
    excerpt: 'Руководство по определению и уходу за антикварными изделиями',
    image: '/images/product-brooch.jpg',
  },
  {
    title: 'Украшения через десятилетия',
    excerpt: 'От цветов ар-нуво до модернизма середины века',
    image: '/images/product-necklace.jpg',
  },
];

export function CuratedEditions() {
  const sectionRef = useRef<HTMLElement>(null);

  useGSAP(() => {
    const section = sectionRef.current;
    if (!section) return;

    gsap.from(section.querySelectorAll('[data-animate-line]'), {
      y: 30,
      opacity: 0,
      duration: 0.8,
      ease: 'power3.out',
      stagger: 0.2,
      scrollTrigger: { trigger: section, start: 'top 80%' },
    });

    gsap.from(section.querySelectorAll('[data-animate-card]'), {
      y: 40,
      opacity: 0,
      duration: 0.8,
      ease: 'power3.out',
      stagger: 0.12,
      scrollTrigger: { trigger: section.querySelector('[data-animate-grid]'), start: 'top 85%' },
    });
  }, { scope: sectionRef });

  return (
    <section
      id="journal"
      ref={sectionRef}
      className="py-24 md:py-32 px-6 md:px-14"
      style={{ backgroundColor: 'var(--color-cobalt)' }}
    >
      <div className="max-w-[1440px] mx-auto">
        <SectionLabel text="ЖУРНАЛ" className="mb-10 block" />

        {/* Display Text */}
        <div className="mb-16">
          {['Вещи с душой.', 'Дизайн вне времени.', 'Создано для поколений.'].map((line) => (
            <h2
              key={line}
              data-animate-line
              className="block"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(2.5rem, 7vw, 5.5rem)',
                lineHeight: 1.05,
                letterSpacing: '-0.01em',
                color: 'var(--color-vintage-white)',
              }}
            >
              {line}
            </h2>
          ))}
        </div>

        {/* Journal Grid */}
        <div data-animate-grid className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {journalEntries.map((entry) => (
            <article key={entry.title} className="group cursor-pointer" data-animate-card>
              <div className="relative aspect-[4/3] overflow-hidden rounded-md mb-5">
                <Image
                  src={entry.image}
                  alt={entry.title}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  sizes="(max-width: 768px) 100vw, 33vw"
                />
              </div>
              <h3
                className="text-xl mb-2 group-hover:text-coral transition-colors duration-300"
                style={{ fontFamily: 'var(--font-display)', color: 'var(--color-vintage-white)' }}
              >
                {entry.title}
              </h3>
              <p className="text-[15px] leading-relaxed mb-4" style={{ color: 'rgba(255,255,255,0.6)' }}>
                {entry.excerpt}
              </p>
              <ArrowLink href="/journal" light>
                Читать
              </ArrowLink>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
