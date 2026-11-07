import { useEffect, useState, type CSSProperties, type FocusEvent, type KeyboardEvent } from 'react';

export interface Slide {
  src: string;
  alt: string;
  caption?: string;
}

export interface ImageCarouselProps {
  slides: Slide[];
  /** Accessible name of the carousel, e.g. "Product photos". */
  label: string;
  /** If set, advance automatically every `autoplayMs` milliseconds (stretch). */
  autoplayMs?: number;
  /** Slide shown first. Default 0. */
  initialIndex?: number;
}

/** Modulo that never returns a negative number: wrap(-1, 3) === 2. */
const wrap = (i: number, n: number) => ((i % n) + n) % n;

const styles: Record<string, CSSProperties> = {
  root: { maxWidth: 480, display: 'grid', gap: 8 },
  viewport: { position: 'relative', aspectRatio: '16 / 9', background: '#111', borderRadius: 8, overflow: 'hidden' },
  img: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
  caption: { position: 'absolute', insetInline: 0, insetBlockEnd: 0, margin: 0, padding: '6px 10px', background: 'rgb(0 0 0 / 0.55)', color: '#fff' },
  toolbar: { display: 'flex', alignItems: 'center', gap: 8 },
  button: { minWidth: 36, minHeight: 36, borderRadius: 6, border: '1px solid #888', background: 'transparent', cursor: 'pointer', fontSize: 18 },
  dot: { width: 24, height: 24, borderRadius: '50%', border: '2px solid #555', cursor: 'pointer', padding: 0 },
};

/**
 * Accessible image carousel (WAI-ARIA APG carousel pattern).
 *
 * - <section aria-roledescription="carousel" aria-label={label}>
 * - Each slide: role="group", aria-roledescription="slide", aria-label="n of total".
 *   Only the current slide is exposed; hide the others with the `hidden` attribute.
 * - Buttons named "Previous slide" / "Next slide" (wrap around at both ends).
 * - One button per slide named "Go to slide n"; the current one has aria-current="true".
 * - ArrowLeft / ArrowRight anywhere inside the carousel go to the previous / next slide.
 * - The element wrapping the slides has aria-live="polite" — or "off" while autoplay is actually rotating.
 * - Stretch — autoplay: advance every autoplayMs; pause while hovered or while focus is inside;
 *   a toggle button named "Stop automatic slide show" / "Start automatic slide show".
 */
export function ImageCarousel({ slides, label, autoplayMs, initialIndex = 0 }: ImageCarouselProps) {
  const total = slides.length;
  const [index, setIndex] = useState(() => (total > 0 ? wrap(initialIndex, total) : 0));
  const [playing, setPlaying] = useState(autoplayMs !== undefined); // the user's explicit choice
  const [hovered, setHovered] = useState(false); // temporary pauses…
  const [focusWithin, setFocusWithin] = useState(false);

  // Derived, not stored: rotation happens only when all conditions hold.
  const rotating = autoplayMs !== undefined && playing && !hovered && !focusWithin && total > 1;

  useEffect(() => {
    if (!rotating) return;
    const id = setInterval(() => setIndex((i) => wrap(i + 1, total)), autoplayMs);
    return () => clearInterval(id); // pause / unmount / prop change all clean up the timer
  }, [rotating, autoplayMs, total]);

  if (total === 0) return null;
  const current = wrap(index, total); // stays valid if `slides` shrinks
  const go = (i: number) => setIndex(wrap(i, total));

  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      go(current + 1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      go(current - 1);
    }
  };

  // React's onFocus/onBlur bubble (they use focusin/focusout), so they fire for any descendant.
  // Only clear focusWithin when focus moves OUTSIDE the carousel, not between its buttons.
  const onBlur = (e: FocusEvent<HTMLElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocusWithin(false);
  };

  // Current slide and its neighbours load eagerly (preloaded even while hidden);
  // the rest are lazy, and lazy images inside `hidden` slides are not fetched until shown.
  const isNear = (i: number) => {
    const d = Math.abs(i - current);
    return d <= 1 || d === total - 1;
  };

  return (
    <section
      aria-roledescription="carousel"
      aria-label={label}
      style={styles.root}
      onKeyDown={onKeyDown}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocusWithin(true)}
      onBlur={onBlur}
    >
      <div style={styles.toolbar}>
        {/* APG: the rotation control comes first in tab order. */}
        {autoplayMs !== undefined && (
          <button
            type="button"
            style={styles.button}
            aria-label={playing ? 'Stop automatic slide show' : 'Start automatic slide show'}
            onClick={() => setPlaying((p) => !p)}
          >
            {playing ? '❚❚' : '▶'}
          </button>
        )}
        <button type="button" style={styles.button} aria-label="Previous slide" onClick={() => go(current - 1)}>
          ‹
        </button>
        <button type="button" style={styles.button} aria-label="Next slide" onClick={() => go(current + 1)}>
          ›
        </button>
      </div>

      <div style={styles.viewport} aria-live={rotating ? 'off' : 'polite'}>
        {slides.map((slide, i) => (
          <div
            key={`${i}-${slide.src}`}
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${total}`}
            hidden={i !== current}
            style={{ height: '100%' }}
          >
            <img src={slide.src} alt={slide.alt} style={styles.img} loading={isNear(i) ? 'eager' : 'lazy'} decoding="async" />
            {slide.caption && <p style={styles.caption}>{slide.caption}</p>}
          </div>
        ))}
      </div>

      <div style={{ ...styles.toolbar, justifyContent: 'center' }}>
        {slides.map((slide, i) => (
          <button
            key={`${i}-${slide.src}`}
            type="button"
            style={{ ...styles.dot, background: i === current ? '#555' : 'transparent' }}
            aria-label={`Go to slide ${i + 1}`}
            aria-current={i === current ? 'true' : undefined}
            onClick={() => go(i)}
          />
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Demo for the preview pane (inline SVG data URIs we generate ourselves — trusted, no network).
const swatch = (bg: string, text: string) =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="270"><rect width="100%" height="100%" fill="${bg}"/><text x="50%" y="50%" fill="#fff" font-family="sans-serif" font-size="32" text-anchor="middle" dominant-baseline="middle">${text}</text></svg>`,
  )}`;

const DEMO_SLIDES: Slide[] = [
  { src: swatch('#1d4ed8', 'Lake at dawn'), alt: 'A blue lake at dawn', caption: 'Lake at dawn' },
  { src: swatch('#047857', 'Pine forest'), alt: 'A green pine forest', caption: 'Pine forest' },
  { src: swatch('#b45309', 'Desert dunes'), alt: 'Orange desert dunes', caption: 'Desert dunes' },
  { src: swatch('#7c3aed', 'Night sky'), alt: 'A purple night sky', caption: 'Night sky' },
];

const demoStyle: CSSProperties = { fontFamily: 'system-ui, sans-serif', padding: 16 };

export default function Demo() {
  return (
    <div style={demoStyle}>
      <ImageCarousel label="Landscape photos" slides={DEMO_SLIDES} autoplayMs={4000} />
    </div>
  );
}
