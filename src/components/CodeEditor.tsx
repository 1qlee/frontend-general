import CodeMirror, { EditorView } from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { useMemo } from 'react';
import { useTheme } from '../lib/theme';

interface Props {
  value: string;
  onChange?: (value: string) => void;
  language?: 'ts' | 'tsx';
  readOnly?: boolean;
  minHeight?: string;
  maxHeight?: string;
  height?: string;
  ariaLabel?: string;
  onRun?: () => void;
}

export function CodeEditor({ value, onChange, language = 'ts', readOnly, minHeight, maxHeight, height, ariaLabel = 'Code editor', onRun }: Props) {
  const theme = useTheme();
  const extensions = useMemo(
    () => [
      javascript({ typescript: true, jsx: language === 'tsx' }),
      // Give the editable region an accessible name (the wrapper's aria-label doesn't reach it).
      EditorView.contentAttributes.of({ 'aria-label': ariaLabel, ...(readOnly ? { 'aria-readonly': 'true' } : {}) }),
    ],
    [language, ariaLabel, readOnly],
  );
  return (
    <div
      className="code-editor"
      onKeyDown={(event) => {
        if ((event.metaKey || event.ctrlKey) && event.key === 'Enter' && onRun) {
          event.preventDefault();
          onRun();
        }
      }}
    >
      <CodeMirror
        value={value}
        onChange={onChange}
        extensions={extensions}
        theme={theme}
        readOnly={readOnly}
        editable
        height={height}
        minHeight={minHeight}
        maxHeight={maxHeight}
        basicSetup={{ foldGutter: false, highlightActiveLine: !readOnly, highlightActiveLineGutter: !readOnly, autocompletion: true, tabSize: 2 }}
      />
    </div>
  );
}
