/**
 * Packages exposed to `require()` inside the DOM runtime (sandbox iframe and
 * the jsdom-based content validation).
 */
import * as React from 'react';
import * as JSXRuntime from 'react/jsx-runtime';
import * as ReactDOM from 'react-dom';
import * as ReactDOMClient from 'react-dom/client';
import * as RTL from '@testing-library/react';
import * as UserEvent from '@testing-library/user-event';
import * as DomA11y from 'dom-accessibility-api';

/** Make ESM namespaces look like transpiled ES modules so `import X from` and `import { X } from` both work. */
function esm(ns: object): object {
  return { __esModule: true, ...ns };
}

export function createDomBuiltins(): Record<string, unknown> {
  (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
  return {
    react: esm(React),
    'react/jsx-runtime': esm(JSXRuntime),
    'react/jsx-dev-runtime': esm({ ...JSXRuntime, jsxDEV: JSXRuntime.jsx }),
    'react-dom': esm(ReactDOM),
    'react-dom/client': esm(ReactDOMClient),
    '@testing-library/react': esm(RTL),
    '@testing-library/dom': esm(RTL),
    '@testing-library/user-event': esm(UserEvent),
    'dom-accessibility-api': esm(DomA11y),
  };
}

export function domCleanup(): void {
  RTL.cleanup();
  document.body.innerHTML = '';
}
