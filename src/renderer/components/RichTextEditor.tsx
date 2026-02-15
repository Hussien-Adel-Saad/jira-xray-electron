/**
 * RichTextEditor Component
 * Simple rich text editor for Jira description fields
 * Supports: Bold, Italic, Lists, Code blocks, Tables
 */

import React, { useState, useRef } from 'react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = 'Enter description...',
  disabled = false,
}) => {
  const [mode, setMode] = useState<'visual' | 'markdown'>('visual');
  const editorRef = useRef<HTMLDivElement>(null);

  /**
   * Format selection with markdown
   */
  const formatText = (prefix: string, suffix: string = prefix) => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const selectedText = range.toString();
    
    if (selectedText) {
      const formatted = `${prefix}${selectedText}${suffix}`;
      
      // Get current text
      const currentText = value || '';
      const startPos = currentText.indexOf(selectedText);
      
      if (startPos !== -1) {
        const newText = 
          currentText.substring(0, startPos) +
          formatted +
          currentText.substring(startPos + selectedText.length);
        
        onChange(newText);
      }
    }
  };

  /**
   * Insert text at cursor
   */
  const insertText = (text: string) => {
    const currentText = value || '';
    const newText = currentText + (currentText ? '\n\n' : '') + text;
    onChange(newText);
  };

  /**
   * Toolbar buttons
   */
  const ToolbarButton: React.FC<{
    onClick: () => void;
    title: string;
    icon: string;
  }> = ({ onClick, title, icon }) => (
    <button
      type="button"
      onClick={onClick}
      title={title}
      disabled={disabled}
      className="px-2 py-1 hover:bg-gray-200 rounded text-sm font-semibold disabled:opacity-50"
    >
      {icon}
    </button>
  );

  /**
   * Convert markdown to Jira format (basic conversion)
   */
  // Removed unused toJiraFormat function

  /**
   * Convert Jira format to markdown (for display)
   */
  // Removed unused fromJiraFormat function

  return (
    <div className="border-2 border-gray-300 rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="bg-gray-50 border-b border-gray-300 px-2 py-1 flex items-center gap-1">
        <ToolbarButton
          onClick={() => formatText('**')}
          title="Bold (Ctrl+B)"
          icon="B"
        />
        <ToolbarButton
          onClick={() => formatText('*')}
          title="Italic (Ctrl+I)"
          icon="I"
        />
        <ToolbarButton
          onClick={() => formatText('`')}
          title="Code"
          icon="</>"
        />
        <div className="w-px h-6 bg-gray-300 mx-1" />
        <ToolbarButton
          onClick={() => insertText('- Item 1\n- Item 2\n- Item 3')}
          title="Bullet List"
          icon="• List"
        />
        <ToolbarButton
          onClick={() => insertText('1. Item 1\n2. Item 2\n3. Item 3')}
          title="Numbered List"
          icon="1. List"
        />
        <div className="w-px h-6 bg-gray-300 mx-1" />
        <ToolbarButton
          onClick={() => insertText('```\ncode block\n```')}
          title="Code Block"
          icon="{ }"
        />
        <ToolbarButton
          onClick={() => insertText('| Header 1 | Header 2 |\n|----------|----------|\n| Cell 1   | Cell 2   |')}
          title="Table"
          icon="⊞ Table"
        />
        <div className="flex-1" />
        <button
          type="button"
          onClick={() => setMode(mode === 'visual' ? 'markdown' : 'visual')}
          className="px-3 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded"
        >
          {mode === 'visual' ? 'Raw' : 'Visual'}
        </button>
      </div>

      {/* Editor Area */}
      {mode === 'visual' ? (
        <textarea
          ref={editorRef as any}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full px-4 py-3 min-h-[200px] focus:outline-none resize-y disabled:bg-gray-100"
          style={{ fontFamily: 'Monaco, Consolas, monospace', fontSize: '13px' }}
        />
      ) : (
        <div className="px-4 py-3 min-h-[200px] bg-gray-50">
          <pre className="text-xs whitespace-pre-wrap font-mono">
            {value || placeholder}
          </pre>
        </div>
      )}

      {/* Formatting Guide */}
      <div className="bg-gray-50 border-t border-gray-300 px-3 py-2 text-xs text-gray-600">
        <details>
          <summary className="cursor-pointer hover:text-gray-900 font-semibold">
            Formatting Guide
          </summary>
          <div className="mt-2 space-y-1 pl-4">
            <div><code>**bold**</code> → <strong>bold</strong></div>
            <div><code>*italic*</code> → <em>italic</em></div>
            <div><code>`code`</code> → <code className="bg-gray-200 px-1">code</code></div>
            <div><code>- item</code> → Bullet list</div>
            <div><code>1. item</code> → Numbered list</div>
            <div><code>```code```</code> → Code block</div>
            <div><code>| Header |</code> → Table</div>
          </div>
        </details>
      </div>
    </div>
  );
};

/**
 * Code Editor Component for Gherkin/other languages
 */
interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language?: 'gherkin' | 'javascript' | 'json' | 'text';
  placeholder?: string;
  disabled?: boolean;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  value,
  onChange,
  language = 'text',
  placeholder = 'Enter code...',
  disabled = false,
}) => {
  // Simple syntax highlighting for Gherkin
  // (Removed unused highlightGherkin function)

  return (
    <div className="border-2 border-gray-300 rounded-lg overflow-hidden bg-gray-50">
      <div className="bg-gray-100 border-b border-gray-300 px-3 py-1 text-xs text-gray-600 font-semibold">
        {language.toUpperCase()} Editor
      </div>
      <textarea
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full px-4 py-3 min-h-[300px] focus:outline-none resize-y bg-white disabled:bg-gray-100 font-mono text-sm"
        spellCheck={false}
      />
      {language === 'gherkin' && (
        <div className="bg-gray-100 border-t border-gray-300 px-3 py-2 text-xs text-gray-600">
          <strong>Gherkin Keywords:</strong> Feature, Scenario, Given, When, Then, And, But
        </div>
      )}
    </div>
  );
};