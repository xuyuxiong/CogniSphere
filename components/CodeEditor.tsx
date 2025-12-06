
import React, { useState, useEffect, forwardRef } from 'react';

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onScroll?: (e: React.UIEvent<HTMLTextAreaElement>) => void;
  onPaste?: (e: React.ClipboardEvent) => void;
  onSave?: () => void;
  className?: string;
}

export const CodeEditor = forwardRef<HTMLTextAreaElement, CodeEditorProps>(({ 
  value, 
  onChange, 
  placeholder,
  onScroll,
  onPaste,
  onSave,
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = e.currentTarget;
    const { selectionStart, selectionEnd, value } = textarea;

    // Handle Tab: Insert 2 spaces
    if (e.key === 'Tab') {
      e.preventDefault();
      const newValue = value.substring(0, selectionStart) + '  ' + value.substring(selectionEnd);
      onChange(newValue);
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = selectionStart + 2;
      }, 0);
      return;
    }

    // Handle Enter: Auto-continue lists
    if (e.key === 'Enter') {
      const lineStart = value.lastIndexOf('\n', selectionStart - 1) + 1;
      const lineEnd = value.indexOf('\n', selectionStart);
      const currentLine = value.substring(lineStart, lineEnd === -1 ? value.length : lineEnd);
      
      // Check for unordered list (- or *)
      const unorderedMatch = currentLine.match(/^(\s*)([-*])\s/);
      if (unorderedMatch) {
        e.preventDefault();
        const indent = unorderedMatch[1];
        const marker = unorderedMatch[2];
        const insertion = `\n${indent}${marker} `;
        const newValue = value.substring(0, selectionStart) + insertion + value.substring(selectionEnd);
        onChange(newValue);
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = selectionStart + insertion.length;
        }, 0);
        return;
      }

      // Check for ordered list (1. )
      const orderedMatch = currentLine.match(/^(\s*)(\d+)\.\s/);
      if (orderedMatch) {
        e.preventDefault();
        const indent = orderedMatch[1];
        const num = parseInt(orderedMatch[2], 10);
        const insertion = `\n${indent}${num + 1}. `;
        const newValue = value.substring(0, selectionStart) + insertion + value.substring(selectionEnd);
        onChange(newValue);
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = selectionStart + insertion.length;
        }, 0);
        return;
      }
    }

    // Handle Auto-close brackets/quotes
    const pairs: Record<string, string> = {
      '(': ')',
      '[': ']',
      '{': '}',
      '"': '"',
      "'": "'",
      '`': '`'
    };
    
    if (pairs[e.key]) {
      e.preventDefault();
      const closeChar = pairs[e.key];
      const newValue = value.substring(0, selectionStart) + e.key + closeChar + value.substring(selectionEnd);
      onChange(newValue);
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = selectionStart + 1;
      }, 0);
      return;
    }

    // Shortcuts
    // Ctrl/Cmd + B (Bold)
    if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
      e.preventDefault();
      const selected = value.substring(selectionStart, selectionEnd);
      const newValue = value.substring(0, selectionStart) + `**${selected}**` + value.substring(selectionEnd);
      onChange(newValue);
      setTimeout(() => {
        textarea.selectionStart = selectionStart + 2;
        textarea.selectionEnd = selectionEnd + 2;
      }, 0);
      return;
    }

    // Ctrl/Cmd + I (Italic)
    if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
      e.preventDefault();
      const selected = value.substring(selectionStart, selectionEnd);
      const newValue = value.substring(0, selectionStart) + `*${selected}*` + value.substring(selectionEnd);
      onChange(newValue);
      setTimeout(() => {
        textarea.selectionStart = selectionStart + 1;
        textarea.selectionEnd = selectionEnd + 1;
      }, 0);
      return;
    }

    // Ctrl/Cmd + S (Save)
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      if (onSave) onSave();
      return;
    }
  };

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
        onKeyDown={handleKeyDown}
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
