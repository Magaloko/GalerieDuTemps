'use client';

import { useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { SectionLabel } from '@/components/ui/section-label';
import { ArrowLink } from '@/components/ui/arrow-link';

gsap.registerPlugin(ScrollTrigger);

interface FeaturedCollectionProps {
  products: {
    id: string;
    name: string;
    price: string;
    /** URL des Hauptbilds — null wenn das Produkt noch keins hat (Placeholder wird gerendert) */
    image: string | null;
    slug: string;
    category?: string;
  }[];
}

/**
 * CSS-only Placeholder wenn ein Produkt kein Hauptbild hat.
 * Verhindert dass willkürliche Hero-Stack-Bilder als „Cover" verwendet werden.
 */
function ProductImagePlaceholder({ name }: { name: string }) {
  return (
    <div
      className="absolute inset-0 flex items-center justify-center"
      style={{
        background:
          "linear-gradient(135deg, var(--color-paper-warm, #E8DFD0) 0%, var(--color-paper-cool, #D6CFC0) 100%)",
      }}
    >
      <span
        className="text-[10px] uppercase font-medium px-3 py-1.5"
        style={{
          letterSpacing: "0.22em",
          color:         "var(--color-ink-mute, #9B9B9B)",
          background:    "rgba(255,255,255,0.85)",
          border:        "1px solid var(--color-line)",
        }}
        title={`Без фото: ${name}`}
      >
        Без фото
      </span>
    </div>
  );
}

export function FeaturedCollection({ products }: FeaturedCollectionProps) {
  const sectionRef = useRef<HTMLElement>(null);

  useGSAP(() => {
    const section = sectionRef.current;
    if (!section) return;

    gsap.from(section.querySelectorAll('[data-animate-header]'), {
      y: 30,
      opacity: 0,
      duration: 0.6,
      ease: 'power3.out',
      scrollTrigger: { trigger: section, start: 'top 80%' },
    });

    gsap.from(section.querySelector('[data-animate-hero]'), {
      scale: 1.03,
      opacity: 0,
      duration: 1,
      ease: 'power2.out',
      scrollTrigger: { trigger: section.querySelector('[data-animate-hero]'), start: 'top 80%' },
    });

    gsap.from(section.querySelectorAll('[data-animate-card]'), {
      y: 40,
      opacity: 0,
      duration: 0.8,
      ease: 'power3.out',
      stagger: 0.15,
      scrollTrigger: { trigger: section.querySelector('[data-animate-grid]'), start: 'top 85%' },
    });
  }, { scope: sectionRef });

  const heroProduct = products[0];
  const gridProducts = products.slice(1, 4);

  return (
    <section
      ref={sectionRef}
      className="py-24 md:py-32 px-6 md:px-14"
      style={{ backgroundColor: 'var(--color-paper)' }}
    >
      <div className="max-w-[1440px] mx-auto">
        {/* Header */}
        <div data-animate-header className="flex items-center justify-between mb-10 pb-6" style={{ borderBottom: '1px solid var(--color-line)' }}>
          <SectionLabel text="ИЗБРАННОЕ" />
          <ArrowLink href="/katalog">Посуда</ArrowLink>
        </div>

        {/* Hero Product */}
        {heroProduct && (
          <div data-animate-hero className="relative mb-10 group cursor-pointer">
            <Link href={`/katalog/${heroProduct.slug}`}>
              <div className="relative aspect-[16/9] overflow-hidden rounded-lg">
                {heroProduct.image ? (
                  <Image
                    src={heroProduct.image}
                    alt={heroProduct.name}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-[1.02]"
                    sizes="100vw"
                  />
                ) : (
                  <ProductImagePlaceholder name={heroProduct.name} />
                )}
                <div
                  className="absolute inset-0"
                  style={{ background: 'linear-gradient(to top, rgba(15,20,48,0.6), transparent)' }}
                />
              </div>
              <div className="absolute bottom-6 left-6 text-vintage-white">
                <h3 className="text-xl md:text-2xl mb-2" style={{ fontFamily: 'var(--font-display)' }}>
                  {heroProduct.name}
                </h3>
                <p className="text-[11px] uppercase tracking-[0.15em] opacity-70 mb-3">
                  {heroProduct.price}
                </p>
                <span className="text-[11px] uppercase tracking-[0.12em] opacity-80 group-hover:opacity-100 transition-opacity">
                  Подробнее →
                </span>
              </div>
            </Link>
          </div>
        )}

        {/* Product Grid */}
        <div data-animate-grid className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {gridProducts.map((product) => (
            <Link
              key={product.id}
              href={`/katalog/${product.slug}`}
              className="group cursor-pointer"
              data-animate-card
            >
              <div className="relative aspect-[3/4] overflow-hidden rounded-md mb-4">
                {product.image ? (
                  <Image
                    src={product.image}
                    alt={product.name}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                ) : (
                  <ProductImagePlaceholder name={product.name} />
                )}
              </div>
              <p className="text-[15px] mb-1" style={{ color: 'var(--color-ink)' }}>
                {product.name}
              </p>
              <div className="flex items-center gap-3">
                <span className="text-[11px] uppercase tracking-[0.12em]" style={{ color: 'var(--color-ink-mute)' }}>
                  {product.price}
                </span>
                {product.category && (
                  <span
                    className="text-[11px] uppercase tracking-wider px-3 py-1 rounded-full"
                    style={{ backgroundColor: 'rgba(232,112,58,0.15)', color: 'var(--color-ink)' }}
                  >
                    {product.category}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
