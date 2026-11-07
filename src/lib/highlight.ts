import hljs from 'highlight.js/lib/core';
import typescript from 'highlight.js/lib/languages/typescript';
import javascript from 'highlight.js/lib/languages/javascript';
import xml from 'highlight.js/lib/languages/xml';
import css from 'highlight.js/lib/languages/css';
import bash from 'highlight.js/lib/languages/bash';
import json from 'highlight.js/lib/languages/json';
import yaml from 'highlight.js/lib/languages/yaml';
import markdown from 'highlight.js/lib/languages/markdown';
import diff from 'highlight.js/lib/languages/diff';
import plaintext from 'highlight.js/lib/languages/plaintext';

hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('xml', xml);
hljs.registerLanguage('css', css);
hljs.registerLanguage('bash', bash);
hljs.registerLanguage('json', json);
hljs.registerLanguage('yaml', yaml);
hljs.registerLanguage('markdown', markdown);
hljs.registerLanguage('diff', diff);
hljs.registerLanguage('plaintext', plaintext);

const ALIASES: Record<string, string> = {
  ts: 'typescript',
  tsx: 'typescript',
  js: 'javascript',
  jsx: 'javascript',
  mjs: 'javascript',
  html: 'xml',
  svg: 'xml',
  sh: 'bash',
  shell: 'bash',
  zsh: 'bash',
  console: 'bash',
  yml: 'yaml',
  md: 'markdown',
  text: 'plaintext',
  txt: 'plaintext',
  jsonc: 'json',
  scss: 'css',
};

export function normalizeLang(lang: string | undefined): string {
  const base = (lang ?? '').trim().split(/\s+/)[0].toLowerCase();
  const name = ALIASES[base] ?? base;
  return hljs.getLanguage(name) ? name : 'plaintext';
}

export function highlight(code: string, lang?: string): string {
  return hljs.highlight(code, { language: normalizeLang(lang), ignoreIllegals: true }).value;
}
