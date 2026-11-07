import { render, screen, act, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { ImageCarousel, type Slide } from './solution';

const slides: Slide[] = [
  { src: '/img/red.png', alt: 'Red sneaker' },
  { src: '/img/blue.png', alt: 'Blue sneaker' },
  { src: '/img/green.png', alt: 'Green sneaker' },
];

/** Labels of the slides currently exposed to assistive technology (hidden ones are excluded). */
const visibleSlides = () =>
  screen
    .queryAllByRole('group')
    .map((g) => g.getAttribute('aria-label') ?? '')
    .filter((label) => /^\d+ of \d+$/.test(label));

const liveRegion = () => document.querySelector('[aria-live]');

describe('ImageCarousel', () => {
  it('renders a labelled carousel region that exposes only the current slide', () => {
    render(<ImageCarousel slides={slides} label="Product photos" />);
    expect(screen.getByRole('region', { name: 'Product photos' })).toHaveAttribute('aria-roledescription', 'carousel');
    expect(screen.getByRole('group', { name: '1 of 3' })).toHaveAttribute('aria-roledescription', 'slide');
    expect(screen.getByRole('img', { name: 'Red sneaker' })).toBeInTheDocument();
    expect(visibleSlides()).toEqual(['1 of 3']);
    expect(screen.queryByRole('img', { name: 'Blue sneaker' })).toBeNull();
  });

  it('Next and Previous move between slides and wrap around at both ends', async () => {
    const user = userEvent.setup();
    render(<ImageCarousel slides={slides} label="Product photos" />);
    const next = screen.getByRole('button', { name: 'Next slide' });
    const prev = screen.getByRole('button', { name: 'Previous slide' });

    await user.click(next);
    expect(visibleSlides()).toEqual(['2 of 3']);
    expect(screen.getByRole('img', { name: 'Blue sneaker' })).toBeInTheDocument();
    await user.click(next);
    await user.click(next);
    expect(visibleSlides()).toEqual(['1 of 3']);
    await user.click(prev);
    expect(visibleSlides()).toEqual(['3 of 3']);
  });

  it('dot buttons jump to a slide and mark the current one with aria-current="true"', async () => {
    const user = userEvent.setup();
    render(<ImageCarousel slides={slides} label="Product photos" />);
    expect(screen.getByRole('button', { name: 'Go to slide 1' })).toHaveAttribute('aria-current', 'true');

    await user.click(screen.getByRole('button', { name: 'Go to slide 3' }));
    expect(visibleSlides()).toEqual(['3 of 3']);
    expect(screen.getByRole('button', { name: 'Go to slide 3' })).toHaveAttribute('aria-current', 'true');
    expect(screen.getByRole('button', { name: 'Go to slide 1' })).not.toHaveAttribute('aria-current', 'true');
  });

  it('ArrowRight / ArrowLeft navigate while focus is inside the carousel', async () => {
    const user = userEvent.setup();
    render(<ImageCarousel slides={slides} label="Product photos" />);
    await user.click(screen.getByRole('button', { name: 'Go to slide 1' })); // puts focus inside
    await user.keyboard('{ArrowRight}');
    expect(visibleSlides()).toEqual(['2 of 3']);
    await user.keyboard('{ArrowLeft}{ArrowLeft}');
    expect(visibleSlides()).toEqual(['3 of 3']);
  });

  it('starts at initialIndex', () => {
    render(<ImageCarousel slides={slides} label="Product photos" initialIndex={1} />);
    expect(visibleSlides()).toEqual(['2 of 3']);
  });

  it('without autoplay: no rotation control, and slide changes are announced politely', () => {
    render(<ImageCarousel slides={slides} label="Product photos" />);
    expect(screen.queryByRole('button', { name: /automatic slide show/i })).toBeNull();
    expect(liveRegion()).toHaveAttribute('aria-live', 'polite');
  });
});

describe('ImageCarousel autoplay (stretch)', () => {
  it('advances every autoplayMs, wraps around, and keeps the live region off while rotating', () => {
    vi.useFakeTimers();
    render(<ImageCarousel slides={slides} label="Product photos" autoplayMs={3000} />);
    expect(liveRegion()).toHaveAttribute('aria-live', 'off');
    act(() => { vi.advanceTimersByTime(3000); });
    expect(visibleSlides()).toEqual(['2 of 3']);
    act(() => { vi.advanceTimersByTime(3000); });
    act(() => { vi.advanceTimersByTime(3000); });
    expect(visibleSlides()).toEqual(['1 of 3']);
  });

  it('pauses while the mouse is over the carousel and resumes when it leaves', () => {
    vi.useFakeTimers();
    render(<ImageCarousel slides={slides} label="Product photos" autoplayMs={3000} />);
    const region = screen.getByRole('region', { name: 'Product photos' });

    fireEvent.mouseEnter(region);
    act(() => { vi.advanceTimersByTime(9000); });
    expect(visibleSlides()).toEqual(['1 of 3']);
    expect(liveRegion()).toHaveAttribute('aria-live', 'polite');

    fireEvent.mouseLeave(region);
    act(() => { vi.advanceTimersByTime(3000); });
    expect(visibleSlides()).toEqual(['2 of 3']);
  });

  it('pauses while keyboard focus is inside the carousel', () => {
    vi.useFakeTimers();
    render(<ImageCarousel slides={slides} label="Product photos" autoplayMs={3000} />);
    const next = screen.getByRole('button', { name: 'Next slide' });

    act(() => { next.focus(); });
    act(() => { vi.advanceTimersByTime(9000); });
    expect(visibleSlides()).toEqual(['1 of 3']);

    act(() => { next.blur(); });
    act(() => { vi.advanceTimersByTime(3000); });
    expect(visibleSlides()).toEqual(['2 of 3']);
  });

  it('the rotation control stops and restarts autoplay', () => {
    vi.useFakeTimers();
    render(<ImageCarousel slides={slides} label="Product photos" autoplayMs={3000} />);

    fireEvent.click(screen.getByRole('button', { name: 'Stop automatic slide show' }));
    act(() => { vi.advanceTimersByTime(9000); });
    expect(visibleSlides()).toEqual(['1 of 3']);
    expect(liveRegion()).toHaveAttribute('aria-live', 'polite');

    fireEvent.click(screen.getByRole('button', { name: 'Start automatic slide show' }));
    act(() => { vi.advanceTimersByTime(3000); });
    expect(visibleSlides()).toEqual(['2 of 3']);
  });
});
