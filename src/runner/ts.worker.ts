/// <reference lib="webworker" />
import ts from 'typescript';
import { createTsService } from './tsService';
import { libFiles, typeFiles } from './tsLibs';

const service = createTsService({ ts, libFiles, typeFiles });

export type TsRequest =
  | { id: number; type: 'transpile'; source: string; fileName: string }
  | { id: number; type: 'typecheck'; files: Record<string, string> }
  | { id: number; type: 'warmup' };

self.onmessage = async (event: MessageEvent<TsRequest>) => {
  const msg = event.data;
  try {
    if (msg.type === 'transpile') {
      self.postMessage({ id: msg.id, ok: true, result: service.transpile(msg.source, msg.fileName) });
    } else if (msg.type === 'typecheck') {
      self.postMessage({ id: msg.id, ok: true, result: await service.typecheck(msg.files) });
    } else {
      await service.warmup();
      self.postMessage({ id: msg.id, ok: true, result: null });
    }
  } catch (err) {
    self.postMessage({ id: msg.id, ok: false, error: err instanceof Error ? err.message : String(err) });
  }
};
