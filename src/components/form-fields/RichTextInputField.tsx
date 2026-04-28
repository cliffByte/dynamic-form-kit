'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Link,
  Image as ImageIcon,
  Code,
  Heading1,
  Heading2,
  Quote,
  Undo,
  Redo,
} from 'lucide-react';
import { Button } from '../ui/button';
import { FieldWrapper } from './FieldWrapper';
import { BaseFieldProps } from './types';
import { cn } from '../../lib/utils';

type ToolbarAction =
  | 'bold'
  | 'italic'
  | 'underline'
  | 'insertUnorderedList'
  | 'insertOrderedList'
  | 'justifyLeft'
  | 'justifyCenter'
  | 'justifyRight'
  | 'createLink'
  | 'insertImage'
  | 'formatBlock-h1'
  | 'formatBlock-h2'
  | 'formatBlock-blockquote'
  | 'formatBlock-pre'
  | 'undo'
  | 'redo';

interface ToolbarButton {
  action: ToolbarAction;
  icon: React.ReactNode;
  title: string;
}

const toolbarGroups: ToolbarButton[][] = [
  [
    { action: 'bold', icon: <Bold className='w-4 h-4' />, title: 'Bold' },
    { action: 'italic', icon: <Italic className='w-4 h-4' />, title: 'Italic' },
    {
      action: 'underline',
      icon: <Underline className='w-4 h-4' />,
      title: 'Underline',
    },
  ],
  [
    {
      action: 'formatBlock-h1',
      icon: <Heading1 className='w-4 h-4' />,
      title: 'Heading 1',
    },
    {
      action: 'formatBlock-h2',
      icon: <Heading2 className='w-4 h-4' />,
      title: 'Heading 2',
    },
    {
      action: 'formatBlock-blockquote',
      icon: <Quote className='w-4 h-4' />,
      title: 'Quote',
    },
  ],
  [
    {
      action: 'insertUnorderedList',
      icon: <List className='w-4 h-4' />,
      title: 'Bullet List',
    },
    {
      action: 'insertOrderedList',
      icon: <ListOrdered className='w-4 h-4' />,
      title: 'Numbered List',
    },
  ],
  [
    {
      action: 'justifyLeft',
      icon: <AlignLeft className='w-4 h-4' />,
      title: 'Align Left',
    },
    {
      action: 'justifyCenter',
      icon: <AlignCenter className='w-4 h-4' />,
      title: 'Align Center',
    },
    {
      action: 'justifyRight',
      icon: <AlignRight className='w-4 h-4' />,
      title: 'Align Right',
    },
  ],
  [
    {
      action: 'createLink',
      icon: <Link className='w-4 h-4' />,
      title: 'Insert Link',
    },
    {
      action: 'formatBlock-pre',
      icon: <Code className='w-4 h-4' />,
      title: 'Code Block',
    },
  ],
  [
    { action: 'undo', icon: <Undo className='w-4 h-4' />, title: 'Undo' },
    { action: 'redo', icon: <Redo className='w-4 h-4' />, title: 'Redo' },
  ],
];

/**
 * Rich text editor field for formatted input
 */
export function RichTextInputField({
  field,
  value,
  onChange,
  onBlur,
  showError,
  errorMessage,
  disabled,
  className,
}: BaseFieldProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [isEmpty, setIsEmpty] = useState(!value);

  // Set initial content
  useEffect(() => {
    if (editorRef.current && value !== editorRef.current.innerHTML) {
      editorRef.current.innerHTML = value || '';
      setIsEmpty(!value || value === '<br>' || value === '<p><br></p>');
    }
  }, [value]);

  const handleInput = () => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      setIsEmpty(!html || html === '<br>' || html === '<p><br></p>');
      onChange(html);
    }
  };

  const execCommand = (action: ToolbarAction) => {
    if (!editorRef.current || disabled) return;

    editorRef.current.focus();

    if (action.startsWith('formatBlock-')) {
      const tag = action.replace('formatBlock-', '');
      document.execCommand('formatBlock', false, tag);
    } else if (action === 'createLink') {
      const url = prompt('Enter URL:');
      if (url) {
        document.execCommand('createLink', false, url);
      }
    } else {
      document.execCommand(action, false);
    }

    handleInput();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Handle keyboard shortcuts
    if (e.metaKey || e.ctrlKey) {
      switch (e.key.toLowerCase()) {
        case 'b':
          e.preventDefault();
          execCommand('bold');
          break;
        case 'i':
          e.preventDefault();
          execCommand('italic');
          break;
        case 'u':
          e.preventDefault();
          execCommand('underline');
          break;
        case 'z':
          e.preventDefault();
          execCommand(e.shiftKey ? 'redo' : 'undo');
          break;
      }
    }
  };

  return (
    <FieldWrapper
      fieldId={field.id}
      label={field.label}
      required={field.required}
      instruction={field.instruction}
      showError={showError}
      errorMessage={errorMessage}
      className={className}>
      <div
        className={cn(
          'border rounded-lg overflow-hidden transition-all duration-200',
          isFocused && 'ring-2 ring-primary',
          showError && 'border-red-500',
          disabled && 'opacity-50 cursor-not-allowed',
        )}>
        {/* Toolbar */}
        <div
          className={cn(
            'flex flex-wrap items-center gap-0.5 p-2 bg-muted/30 border-b',
            disabled && 'pointer-events-none',
          )}>
          {toolbarGroups.map((group, groupIndex) => (
            <React.Fragment key={groupIndex}>
              {groupIndex > 0 && <div className='w-px h-6 bg-border mx-1' />}
              <div className='flex items-center gap-0.5'>
                {group.map((btn) => (
                  <Button
                    key={btn.action}
                    type='button'
                    variant='ghost'
                    size='icon'
                    onClick={() => execCommand(btn.action)}
                    disabled={disabled}
                    className='h-8 w-8 hover:bg-muted'
                    title={btn.title}>
                    {btn.icon}
                  </Button>
                ))}
              </div>
            </React.Fragment>
          ))}
        </div>

        {/* Editor */}
        <div className='relative'>
          {/* Placeholder */}
          {isEmpty && !isFocused && (
            <div className='absolute inset-0 p-4 text-muted-foreground pointer-events-none'>
              {field.placeholder || 'Start typing...'}
            </div>
          )}

          <div
            ref={editorRef}
            contentEditable={!disabled}
            onInput={handleInput}
            onBlur={(e) => {
              setIsFocused(false);
              onBlur?.();
            }}
            onFocus={() => setIsFocused(true)}
            onKeyDown={handleKeyDown}
            className={cn(
              'min-h-[200px] p-4 outline-none',
              'prose prose-sm max-w-none',
              'prose-headings:font-bold prose-headings:text-foreground',
              'prose-p:text-foreground prose-p:my-2',
              'prose-ul:list-disc prose-ul:pl-4',
              'prose-ol:list-decimal prose-ol:pl-4',
              'prose-a:text-primary prose-a:underline',
              'prose-blockquote:border-l-4 prose-blockquote:border-primary prose-blockquote:pl-4 prose-blockquote:italic',
              'prose-pre:bg-muted prose-pre:p-2 prose-pre:rounded',
            )}
            style={{
              wordBreak: 'break-word',
              whiteSpace: 'pre-wrap',
            }}
          />
        </div>

        {/* Word count */}
        <div className='flex items-center justify-between px-3 py-2 text-xs text-muted-foreground bg-muted/20 border-t'>
          <span>Use Ctrl/⌘ + B, I, U for formatting shortcuts</span>
          <span>{(value || '').replace(/<[^>]*>/g, '').length} characters</span>
        </div>
      </div>
    </FieldWrapper>
  );
}
