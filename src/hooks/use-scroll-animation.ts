'use client';

import { useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(ScrollTrigger);

interface ScrollAnimationOptions {
  y?: number;
  duration?: number;
  stagger?: number;
  ease?: string;
  triggerStart?: string;
}

export function useScrollAnimation<T extends HTMLElement>(
  options: ScrollAnimationOptions = {}
) {
  const ref = useRef<T>(null);

  const {
    y = 40,
    duration = 0.8,
    stagger = 0.1,
    ease = 'power3.out',
    triggerStart = 'top 80%',
  } = options;

  useGSAP(() => {
    if (!ref.current) return;

    const elements = ref.current.querySelectorAll('[data-animate]');
    const targets = elements.length > 0 ? elements : [ref.current];

    gsap.from(targets, {
      y,
      opacity: 0,
      duration,
      ease,
      stagger,
      scrollTrigger: {
        trigger: ref.current,
        start: triggerStart,
        toggleActions: 'play none none none',
      },
    });
  }, { scope: ref });

  return ref;
}
