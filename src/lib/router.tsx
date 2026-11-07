/**
 * A tiny hash router: routes look like `#/day/3/lesson-id`. Hash routing keeps
 * the app deployable as static files anywhere (GitHub Pages, file servers).
 */
import { useSyncExternalStore, type AnchorHTMLAttributes, type MouseEvent } from 'react';

function getPath(): string {
  const hash = window.location.hash.replace(/^#/, '');
  return hash.startsWith('/') ? hash : '/';
}

function subscribe(callback: () => void): () => void {
  window.addEventListener('hashchange', callback);
  return () => window.removeEventListener('hashchange', callback);
}

export function usePath(): string {
  return useSyncExternalStore(subscribe, getPath, () => '/');
}

export function navigate(to: string, options: { replace?: boolean } = {}): void {
  const url = `#${to}`;
  if (options.replace) window.location.replace(url);
  else window.location.hash = to;
}

/** Match a path against a pattern like `/day/:n/:block`. Returns params or null. */
export function matchPath(pattern: string, path: string): Record<string, string> | null {
  const p = pattern.split('/').filter(Boolean);
  const s = path.split('?')[0].split('/').filter(Boolean);
  if (p.length !== s.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < p.length; i++) {
    if (p[i].startsWith(':')) params[p[i].slice(1)] = decodeURIComponent(s[i]);
    else if (p[i] !== s[i]) return null;
  }
  return params;
}

export function useQueryParam(name: string): string | null {
  const path = usePath();
  const query = path.split('?')[1] ?? '';
  return new URLSearchParams(query).get(name);
}

type LinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & { to: string };

export function Link({ to, onClick, ...rest }: LinkProps) {
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
  };
  return <a href={`#${to}`} onClick={handleClick} {...rest} />;
}
