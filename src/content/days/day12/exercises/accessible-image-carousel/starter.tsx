import type { CSSProperties } from 'react';

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
export function ImageCarousel(props: ImageCarouselProps) {
  return null;
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
