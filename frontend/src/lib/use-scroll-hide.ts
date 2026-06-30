'use client';

import { useEffect, useState } from 'react';

export interface ScrollState {
  y: number;
  dir: 'up' | 'down';
}

/**
 * Tracks scroll position + direction (rAF-throttled).
 * Used to hide the header on scroll-down and reveal it on scroll-up,
 * and to surface the sticky purchase bar in its place.
 */
export function useScrollState(): ScrollState {
  const [state, setState] = useState<ScrollState>({ y: 0, dir: 'up' });

  useEffect(() => {
    let lastY = window.scrollY;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(() => {
        const y = window.scrollY;
        // Near the top we always treat as "up" so the header stays visible.
        const dir: ScrollState['dir'] = y > lastY && y > 80 ? 'down' : 'up';
        lastY = y;
        setState({ y, dir });
        ticking = false;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return state;
}
