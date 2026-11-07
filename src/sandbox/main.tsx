/**
 * Sandbox iframe entry. Runs exercise tests against a real DOM with React 19,
 * Testing Library and user-event, or renders a live preview of the learner's
 * component. Talks to the parent app via postMessage.
 */
import { Component, type ErrorInfo, type ReactNode, createElement, type ComponentType } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { createDomBuiltins, domCleanup } from '../runner/domBuiltins';
import { TestRuntime, runTestModules, type LogEntry, type ModuleMap } from '../runner/harness';
import { formatLogArgs } from '../runner/format';

const params = new URLSearchParams(location.search);
const mode = params.get('mode') ?? 'test';
const theme = params.get('theme');
if (theme === 'dark' || theme === 'light') document.documentElement.style.colorScheme = theme;

const builtins = createDomBuiltins();
// Tests run inside act(); the live preview is a normal app, so don't expect act() there.
if (mode === 'preview') (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = false;
const parentWindow = window.parent;
const post = (message: unknown) => parentWindow.postMessage(message, '*');
const forwardLog = (entry: LogEntry) => post({ type: 'log', entry });

// Forward console output from React and library code too (e.g. act() warnings).
for (const level of ['log', 'info', 'warn', 'error', 'debug'] as const) {
  const original = console[level].bind(console);
  console[level] = (...args: unknown[]) => {
    original(...args);
    forwardLog({ level, text: formatLogArgs(args) });
  };
}

class PreviewBoundary extends Component<{ children: ReactNode }, { error?: Error }> {
  state: { error?: Error } = {};
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    forwardLog({ level: 'error', text: `${error.name}: ${error.message}${info.componentStack ?? ''}` });
  }
  render() {
    if (this.state.error) {
      return createElement('pre', { className: 'sandbox-error' }, `${this.state.error.name}: ${this.state.error.message}`);
    }
    return this.props.children;
  }
}

let previewRoot: Root | undefined;

function showPreview(modules: ModuleMap) {
  const container = document.getElementById('preview-root')!;
  previewRoot?.unmount();
  container.innerHTML = '';
  previewRoot = createRoot(container);
  try {
    const runtime = new TestRuntime({ builtins, onLog: forwardLog });
    runtime.loadModules(modules);
    const exports = runtime.require('solution') as Record<string, unknown>;
    const candidate =
      exports.default ?? exports.App ?? Object.values(exports).find((value) => typeof value === 'function' && /^[A-Z]/.test((value as { name?: string }).name ?? ''));
    if (typeof candidate !== 'function') {
      container.innerHTML = '<p id="sandbox-status">Nothing to preview — export a component as the default export.</p>';
      return;
    }
    previewRoot.render(createElement(PreviewBoundary, null, createElement(candidate as ComponentType)));
  } catch (err) {
    const pre = document.createElement('pre');
    pre.className = 'sandbox-error';
    pre.textContent = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
    container.replaceChildren(pre);
  }
}

window.addEventListener('message', async (event: MessageEvent) => {
  if (event.source !== parentWindow) return;
  const msg = event.data as { type: string; modules: ModuleMap; entry: string };
  if (msg.type === 'run-tests' && mode === 'test') {
    const summary = await runTestModules(msg.modules, msg.entry, {
      builtins,
      onLog: forwardLog,
      afterEachTest: domCleanup,
      testTimeout: 5000,
    });
    post({ type: 'done', summary });
  } else if (msg.type === 'preview' && mode === 'preview') {
    showPreview(msg.modules);
  }
});

post({ type: 'sandbox-ready' });
