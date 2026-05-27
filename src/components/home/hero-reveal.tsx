'use client';

import { useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { ArrowRight, ChevronDown } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

interface HeroRevealProps {
  images: string[];
  kicker?: string;
  title?: string;
  titleAccent?: string;
  subtitle?: string;
}

export function HeroReveal({
  images,
  kicker = 'Кураторский винтаж с 2015',
  title = 'Редкие вещи',
  titleAccent = 'с историей.',
  subtitle = 'Кураторская подборка винтажа — мебель, керамика, графика, текстиль. Каждый предмет проходит атрибуцию и реставрацию.',
}: HeroRevealProps) {
  const heroRef = useRef<HTMLDivElement>(null);
  const stackRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const hero = heroRef.current;
    const stackContainer = stackRef.current;
    const textOverlay = textRef.current;
    if (!hero || !stackContainer || !textOverlay || images.length === 0) return;

    const stackItems = gsap.utils.toArray<HTMLElement>('.stack-item');
    if (stackItems.length === 0) return;

    const isMobile = window.innerWidth < 768;
    const staggerAmount = isMobile ? 35 : 70;

    // Initial states
    gsap.set(stackContainer, { opacity: 0 });
    gsap.set(textOverlay, { opacity: 0, y: 30 });
    gsap.set(stackItems, {
      rotation: (i: number) => (i % 2 === 0 ? -4 : 3),
      opacity: (i: number) => (i === 0 ? 1 : 0.7),
    });

    // Entry animation
    const entryTl = gsap.timeline({ delay: 0.2 });
    entryTl.to(stackContainer, { opacity: 1, duration: 0.8, ease: 'power2.out' });
    entryTl.to(textOverlay, { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' }, '-=0.4');

    // Scroll-driven timeline.
    // Pin-Distanz von 150% → 70% reduziert: vorher war ein gutes Viertel des
    // Pins "Tot-Zone" (Animation seit 70%-Mark fertig, User scrollt ins Leere).
    // Bei 70% endet der Pin sobald die Animation visuell durch ist.
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: hero,
        start: 'top top',
        end: '+=70%',
        pin: true,
        scrub: 0.6,           // Etwas Smoothing — wirkt weniger ruckelig auf Mobile
      },
    });

    // PHASE 1: Layer spread (0 - 0.6) — Bilder spreizen sich auf
    tl.from(
      stackItems,
      {
        ease: 'power1.inOut',
        duration: 0.6,
        stagger: { each: staggerAmount / 100, from: 'end' },
        y: (i: number) => (i < stackItems.length / 2 ? staggerAmount * 1.5 : -staggerAmount),
        rotation: 0,
        opacity: 1,
      },
      0
    );

    // Text overlay fade während des Spreads
    tl.from(
      textOverlay,
      {
        duration: 0.6,
        ease: 'power3',
        yPercent: -5,
        opacity: 1,
      },
      0
    );

    // PHASE 2: Fade-Out direkt anschließend (0.6 - 1.0) — nahtlos in die nächste Sektion
    tl.to(
      stackContainer,
      {
        duration: 0.4,
        ease: 'power3.inOut',
        opacity: 0,
        scale: 0.95,
      },
      0.6
    );
    tl.to(
      textOverlay,
      {
        duration: 0.4,
        ease: 'power3.inOut',
        opacity: 0,
      },
      0.6
    );

    // Hover effect
    const handleMouseEnter = () => {
      if (ScrollTrigger.isScrolling()) return;
      gsap.to(stackItems, {
        duration: 0.4,
        ease: 'power2',
        x: (i: number) => (i % 2 === 0 ? 15 : -15),
        rotation: (i: number) => (i % 2 === 0 ? 3 : -3),
      });
    };

    const handleMouseLeave = () => {
      gsap.to(stackItems, {
        duration: 0.6,
        ease: 'power2',
        x: 0,
        rotation: 0,
      });
    };

    stackContainer.addEventListener('mouseenter', handleMouseEnter);
    stackContainer.addEventListener('mouseleave', handleMouseLeave);
  }, { scope: heroRef });

  return (
    <section
      ref={heroRef}
      className="relative w-full h-screen overflow-hidden flex items-center justify-center"
      style={{ backgroundColor: 'var(--color-cobalt)' }}
    >
      {/* Stack Container */}
      <div
        ref={stackRef}
        className="relative w-[70vw] md:w-[35vw] max-w-[450px] aspect-[2/3]"
        style={{ perspective: '1000px' }}
      >
        {images.map((src, i) => (
          <div
            key={i}
            className="stack-item absolute inset-0 will-change-transform"
            style={{
              boxShadow: '0 15px 60px rgba(0,0,0,0.5)',
              zIndex: images.length - i,
            }}
          >
            <Image
              src={src}
              alt={`Винтаж ${i + 1}`}
              fill
              className="object-cover"
              priority={i === 0}
              sizes="(max-width: 768px) 70vw, 35vw"
            />
          </div>
        ))}
      </div>

      {/* Text Overlay
          Statt mixBlendMode:difference (würde gegen helle Bildbereiche brechen)
          legen wir einen radialen Cobalt-Verlauf vom Zentrum nach außen — das
          dunkelt die Bildmitte ab, wo der Titel sitzt, ohne die Image-Stack-
          Kanten zu verdecken. Plus subtiler text-shadow als Belt-and-Braces. */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(15,20,48,0.55) 0%, rgba(15,20,48,0.25) 45%, rgba(15,20,48,0) 75%)',
        }}
      />
      <div
        ref={textRef}
        className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 pointer-events-none"
        style={{ textShadow: '0 2px 18px rgba(15,20,48,0.45)' }}
      >
        <p
          className="text-[11px] uppercase font-medium mb-6 md:mb-8 tracking-[0.28em]"
          style={{ color: 'var(--color-coral)' }}
        >
          {kicker}
        </p>

        <h1
          className="mb-6 md:mb-8"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(3rem, 8vw, 6rem)',
            lineHeight: 0.94,
            letterSpacing: '-0.01em',
            color: 'var(--color-vintage-white)',
          }}
        >
          {title}
          <br />
          <em
            style={{
              color: 'var(--color-coral)',
              fontStyle: 'italic',
            }}
          >
            {titleAccent}
          </em>
        </h1>

        <p
          className="max-w-md mb-10 text-[15px] md:text-base leading-relaxed"
          style={{ color: 'rgba(255,255,255,0.78)' }}
        >
          {subtitle}
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4 pointer-events-auto">
          <Link
            href="/katalog"
            className="inline-flex items-center gap-2 text-[11px] uppercase font-medium tracking-[0.12em] py-3.5 px-8 text-white transition-all duration-300 hover:opacity-90"
            style={{ backgroundColor: 'var(--color-coral)' }}
          >
            <span>Открыть каталог</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/quiz"
            className="inline-flex items-center gap-2 text-[11px] uppercase font-medium tracking-[0.12em] text-vintage-white/70 py-3.5 px-8 border border-vintage-white/30 hover:bg-vintage-white/10 transition-all duration-300"
          >
            <span>Пройти квиз</span>
          </Link>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 pointer-events-none"
        style={{ color: 'rgba(255,255,255,0.4)' }}
      >
        <span className="text-[11px] tracking-[0.1em]">Листайте вниз</span>
        <ChevronDown className="w-5 h-5 animate-bounce" />
      </div>
    </section>
  );
}
