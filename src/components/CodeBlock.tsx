import { useState } from 'react';
import { highlight, normalizeLang } from '../lib/highlight';
import { Icon } from './Icon';

export function CodeBlock({ code, lang }: { code: string; lang?: string }) {
  const [copied, setCopied] = useState(false);
  const language = normalizeLang(lang);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };
  return (
    <div className="codeblock">
      <button type="button" className="codeblock-copy" onClick={copy} aria-label="Copy code">
        <Icon name={copied ? 'check' : 'copy'} size={14} />
      </button>
      <pre>
        <code className={`hljs language-${language}`} dangerouslySetInnerHTML={{ __html: highlight(code.replace(/\n$/, ''), lang) }} />
      </pre>
    </div>
  );
}
