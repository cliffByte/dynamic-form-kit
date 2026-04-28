'use client';

import React from 'react';
import { DisplayFieldProps } from './types';
import { DisplayFieldWrapper } from './DisplayFieldWrapper';
import { FileIcon, ImageIcon, ExternalLink } from 'lucide-react';
import { Button } from '../ui/button';

export function DisplayMediaField({
  field,
  value,
  className,
}: DisplayFieldProps) {
  const files = Array.isArray(value) ? value : value ? [value] : [];
  const hasFiles = files.length > 0;

  const renderFile = (file: any, index: number) => {
    const fileUrl = typeof file === 'string' ? file : file?.url;
    const fileName =
      typeof file === 'string'
        ? file.split('/').pop()
        : file?.name || `File ${index + 1}`;

    const isImage =
      typeof fileUrl === 'string' &&
      (fileUrl.match(/\.(jpeg|jpg|gif|png|webp)/i) ||
        fileUrl.startsWith('data:image'));

    return (
      <div
        key={index}
        className='group relative border rounded-md p-2 bg-muted/30 hover:bg-muted/50 transition-colors'>
        <div className='flex items-center gap-3'>
          {isImage ? (
            <div className='w-10 h-10 rounded bg-background overflow-hidden flex-shrink-0 border'>
              <img
                src={fileUrl}
                alt={fileName}
                className='w-full h-full object-cover'
              />
            </div>
          ) : (
            <div className='w-10 h-10 rounded bg-background flex items-center justify-center flex-shrink-0 border'>
              <FileIcon className='w-5 h-5 text-muted-foreground' />
            </div>
          )}
          <div className='flex-1 min-w-0'>
            <p className='text-xs font-medium truncate'>{fileName}</p>
          </div>
          <Button variant='ghost' size='icon' className='h-8 w-8' asChild>
            <a href={fileUrl} target='_blank' rel='noopener noreferrer'>
              <ExternalLink className='w-4 h-4' />
            </a>
          </Button>
        </div>
      </div>
    );
  };

  return (
    <DisplayFieldWrapper
      label={field.label}
      fieldId={field.id}
      instruction={field.instruction}
      className={className}>
      {hasFiles ? (
        <div className='grid grid-cols-1 sm:grid-cols-2 gap-2 w-full'>
          {files.map(renderFile)}
        </div>
      ) : (
        <span className='text-muted-foreground/50 italic text-sm'>
          No media uploaded
        </span>
      )}
    </DisplayFieldWrapper>
  );
}
