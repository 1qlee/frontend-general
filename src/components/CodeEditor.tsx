import CodeMirror, { EditorView } from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';
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

/** Token colours come from the same CSS variables as the static code blocks (contrast-checked in both themes). */
const highlightStyle = HighlightStyle.define([
  { tag: [t.keyword, t.controlKeyword, t.moduleKeyword, t.operatorKeyword, t.definitionKeyword, t.modifier, t.self], color: 'var(--hl-keyword)' },
  { tag: [t.string, t.special(t.string), t.regexp, t.escape], color: 'var(--hl-string)' },
  { tag: [t.number, t.bool, t.null, t.atom], color: 'var(--hl-number)' },
  { tag: [t.comment, t.lineComment, t.blockComment, t.docComment], color: 'var(--hl-comment)', fontStyle: 'italic' },
  { tag: [t.function(t.variableName), t.function(t.propertyName), t.function(t.definition(t.variableName))], color: 'var(--hl-title)' },
  { tag: [t.typeName, t.className, t.namespace, t.standard(t.typeName)], color: 'var(--hl-type)' },
  { tag: [t.propertyName, t.attributeName, t.definition(t.propertyName)], color: 'var(--hl-attr)' },
  { tag: [t.tagName, t.angleBracket], color: 'var(--hl-title)' },
  { tag: [t.meta, t.documentMeta], color: 'var(--hl-meta)' },
  { tag: t.invalid, color: 'var(--danger)' },
]);

function editorTheme(dark: boolean) {
  return EditorView.theme(
    {
      '&': { color: 'var(--text)', backgroundColor: 'var(--code-bg)' },
      '.cm-content': { caretColor: 'var(--accent)' },
      '.cm-cursor, .cm-dropCursor': { borderLeftColor: 'var(--accent)' },
      '.cm-gutters': { backgroundColor: 'var(--code-bg)', color: 'var(--text-faint)', borderRight: '1px solid var(--border)' },
      '.cm-activeLine': { backgroundColor: 'color-mix(in srgb, var(--accent) 3%, transparent)' },
      '.cm-activeLineGutter': { backgroundColor: 'color-mix(in srgb, var(--accent) 10%, transparent)', color: 'var(--text)' },
      '&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
        backgroundColor: 'color-mix(in srgb, var(--accent) 28%, transparent)',
      },
      '.cm-matchingBracket': { backgroundColor: 'color-mix(in srgb, var(--accent) 20%, transparent)', outline: 'none' },
      '.cm-tooltip': { backgroundColor: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' },
      '.cm-tooltip-autocomplete ul li[aria-selected]': { backgroundColor: 'var(--accent-soft)', color: 'var(--text)' },
    },
    { dark },
  );
}

export function CodeEditor({ value, onChange, language = 'ts', readOnly, minHeight, maxHeight, height, ariaLabel = 'Code editor', onRun }: Props) {
  const theme = useTheme();
  const extensions = useMemo(
    () => [
      javascript({ typescript: true, jsx: language === 'tsx' }),
      syntaxHighlighting(highlightStyle),
      // Give the editable region an accessible name (the wrapper's aria-label doesn't reach it).
      EditorView.contentAttributes.of({ 'aria-label': ariaLabel, tabindex: '0', ...(readOnly ? { 'aria-readonly': 'true' } : {}) }),
    ],
    [language, ariaLabel, readOnly],
  );
  const themeExtension = useMemo(() => editorTheme(theme === 'dark'), [theme]);
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
        theme={themeExtension}
        readOnly={readOnly}
        editable
        height={height}
        minHeight={minHeight}
        maxHeight={maxHeight}
        basicSetup={{ foldGutter: false, highlightActiveLine: !readOnly, highlightActiveLineGutter: !readOnly, autocompletion: !readOnly, tabSize: 2 }}
      />
    </div>
  );
}
