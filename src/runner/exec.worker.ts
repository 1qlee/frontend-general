/// <reference lib="webworker" />
import { runScript, runTestModules, type LogEntry, type ModuleMap } from './harness';

export type ExecRequest =
  | { type: 'tests'; modules: ModuleMap; entry: string }
  | { type: 'script'; code: string; maxWaitMs?: number };

self.onmessage = async (event: MessageEvent<ExecRequest>) => {
  const msg = event.data;
  const onLog = (entry: LogEntry) => self.postMessage({ type: 'log', entry });
  if (msg.type === 'tests') {
    const summary = await runTestModules(msg.modules, msg.entry, { onLog, testTimeout: 5000 });
    self.postMessage({ type: 'done', summary });
  } else {
    const result = await runScript(msg.code, { onLog, maxWaitMs: msg.maxWaitMs });
    self.postMessage({ type: 'done', result });
  }
};
