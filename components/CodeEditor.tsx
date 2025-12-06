import React, { useState, useEffect, forwardRef } from 'react';

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onScroll?: (e: React.UIEvent<HTMLTextAreaElement>) => void;
  onPaste?: (e: React.ClipboardEvent) => void;
  className?: string;
}

export const CodeEditor = forwardRef<HTMLTextAreaElement, CodeEditorProps>(({ 
  value, 
  onChange, 
  placeholder,
  onScroll,
  onPaste,
  className 
}, ref) => {
  const [highlightedCode, setHighlightedCode] = useState('');

  useEffect(() => {
    // @ts-ignore
    if (typeof Prism !== 'undefined' && Prism.languages.markdown) {
      // @ts-ignore
      const html = Prism.highlight(value, Prism.languages.markdown, 'markdown');
      // Add a trailing newline char if value ends with newline to fix rendering alignment
      setHighlightedCode(html + (value.endsWith('\n') ? '<br>' : ''));
    } else {
      setHighlightedCode(value);
    }
  }, [value]);

  return (
    <div className={`editor-container relative bg-white dark:bg-dark-bg ${className || ''}`}>
      {/* The Highlight Layer (Pre/Code) */}
      <pre 
        aria-hidden="true" 
        className="editor-layer editor-highlight text-slate-800 dark:text-slate-200"
        dangerouslySetInnerHTML={{ __html: highlightedCode }}
      />
      
      {/* The Input Layer (Textarea) */}
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onScroll={(e) => {
           // Sync the scroll of the highlight layer
           const target = e.target as HTMLTextAreaElement;
           const pre = target.previousSibling as HTMLElement;
           if (pre) {
             pre.scrollTop = target.scrollTop;
             pre.scrollLeft = target.scrollLeft;
           }
           if (onScroll) onScroll(e);
        }}
        onPaste={onPaste}
        placeholder={placeholder}
        className="editor-layer editor-textarea"
        spellCheck={false}
      />
    </div>
  );
});

CodeEditor.displayName = 'CodeEditor';