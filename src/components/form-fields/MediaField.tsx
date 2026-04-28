'use client';

import React, { useState, useCallback, useEffect } from 'react';
import {
  Upload,
  X,
  Image as ImageIcon,
  FileText,
  FileVideo,
  FileAudio,
  File,
  Eye,
  Download,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { Button } from '../ui/button';
import { FieldWrapper } from './FieldWrapper';
import { BaseFieldProps } from './types';
import { cn } from '../../lib/utils';
import { useFormKit } from '../../context/FormKitContext';

interface MediaFile {
  id?: string;
  url?: string;
  name: string;
  size: number;
  type: string;
  preview?: string;
  file?: File;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function getFileIcon(type: string, className = 'w-8 h-8') {
  if (type?.startsWith('image/')) return <ImageIcon className={className} />;
  if (type?.startsWith('video/')) return <FileVideo className={className} />;
  if (type?.startsWith('audio/')) return <FileAudio className={className} />;
  if (type === 'application/pdf') return <FileText className={className} />;
  return <File className={className} />;
}

function isImageFile(file: MediaFile): boolean {
  if (file.type?.startsWith('image/')) return true;
  const src = file.preview || file.url || '';
  return (
    /\.(jpe?g|png|gif|webp|bmp|svg)(\?|$)/i.test(src) ||
    src.startsWith('data:image')
  );
}

// ---------------------------------------------------------------------------
// Shared upload logic
// ---------------------------------------------------------------------------
function useFileUploader(
  files: MediaFile[],
  multiple: boolean,
  maxSize: number,
  onChange: (val: any) => void,
  uploadMedia: (formData: FormData) => Promise<{ url: string; filename: string }>,
) {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);

  const processFiles = useCallback(
    async (fileList: FileList | null) => {
      if (!fileList || fileList.length === 0) return;
      setUploading(true);
      const newFiles: MediaFile[] = [];
      try {
        for (let i = 0; i < fileList.length; i++) {
          const file = fileList[i];
          if (file.size > maxSize) continue;
          let preview: string | undefined;
          if (file.type.startsWith('image/'))
            preview = URL.createObjectURL(file);
          const formData = new FormData();
          formData.append('file', file);
          try {
            const data = await uploadMedia(formData);
            if (data?.url) {
              newFiles.push({
                name: file.name,
                size: file.size,
                type: file.type,
                url: data.url,
                preview,
              });
            }
          } catch {}
        }
        if (multiple) onChange([...files, ...newFiles]);
        else if (newFiles.length > 0) onChange(newFiles[0]);
      } finally {
        setUploading(false);
      }
    },
    [files, multiple, maxSize, onChange, uploadMedia],
  );

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      processFiles(e.dataTransfer.files);
    },
    [processFiles],
  );

  return { dragActive, uploading, processFiles, handleDrag, handleDrop };
}

// ---------------------------------------------------------------------------
// Shared drop zone UI
// ---------------------------------------------------------------------------
function DropZone({
  fieldId,
  multiple,
  acceptedTypes,
  maxSize,
  disabled,
  dragActive,
  uploading,
  handleDrag,
  handleDrop,
  onInputChange,
}: {
  fieldId: string;
  multiple: boolean;
  acceptedTypes: string[];
  maxSize: number;
  disabled?: boolean;
  dragActive: boolean;
  uploading: boolean;
  handleDrag: (e: React.DragEvent) => void;
  handleDrop: (e: React.DragEvent) => void;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      className={cn(
        'relative border-2 border-dashed rounded-lg p-4 text-center transition-all duration-200',
        dragActive && 'border-primary bg-primary/5',
        !dragActive &&
          'border-muted-foreground/30 hover:border-muted-foreground/50',
        disabled && 'opacity-50 cursor-not-allowed',
      )}>
      <input
        type='file'
        id={fieldId}
        multiple={multiple}
        accept={acceptedTypes.join(',')}
        onChange={onInputChange}
        disabled={disabled || uploading}
        className='absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed'
      />
      <div className='flex flex-col items-center gap-2'>
        {uploading ? (
          <Loader2 className='w-10 h-10 text-primary animate-spin' />
        ) : (
          <Upload
            className={cn(
              'w-10 h-10 transition-colors',
              dragActive ? 'text-primary' : 'text-muted-foreground',
            )}
          />
        )}
        <div>
          <p className='font-medium text-sm'>
            {dragActive
              ? 'Drop files here'
              : 'Drag & drop files or click to browse'}
          </p>
          <p className='text-xs text-muted-foreground mt-1'>
            Max size: {formatFileSize(maxSize)}
            {multiple && ' • Multiple files allowed'}
          </p>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// PREVIEW MODE — read-only display of the file the builder pre-uploaded
// ---------------------------------------------------------------------------
function MediaFieldPreview({
  field,
  showError,
  errorMessage,
  className,
}: BaseFieldProps) {
  const media = field.previewMedia;

  const isPdf =
    media?.type === 'application/pdf' ||
    media?.name?.toLowerCase().endsWith('.pdf');

  return (
    <FieldWrapper
      fieldId={field.id}
      label={field.label}
      required={field.required}
      instruction={field.instruction}
      showError={showError}
      errorMessage={errorMessage}
      className={className}>
      {!media ? (
        // Nothing configured yet — show a neutral placeholder
        <div className='flex flex-col items-center gap-2 p-6 rounded-lg border-2 border-dashed border-muted-foreground/20 text-muted-foreground'>
          <File className='w-8 h-8' />
          <p className='text-xs'>No file configured</p>
        </div>
      ) : isImageFile(media as MediaFile) ? (
        // Image — display inline
        <div className='rounded-lg overflow-hidden border bg-muted/10'>
          <img
            src={media.url}
            alt={media.name}
            className='w-full max-h-80 object-contain'
          />
          <p className='text-xs text-muted-foreground px-3 py-1.5 truncate border-t bg-muted/20'>
            {media.name}
          </p>
        </div>
      ) : isPdf ? (
        // PDF — icon card + open in new tab (no inline embed)
        <a
          href={media.url}
          target='_blank'
          rel='noopener noreferrer'
          className='flex items-center gap-3 p-3 rounded-lg border bg-red-50/60 hover:bg-red-50 transition-colors group'>
          <div className='w-10 h-10 rounded bg-red-100 flex items-center justify-center flex-shrink-0 border border-red-200'>
            <FileText className='w-5 h-5 text-red-500' />
          </div>
          <div className='flex-1 min-w-0'>
            <p className='text-sm font-medium truncate text-foreground'>
              {media.name}
            </p>
            <p className='text-xs text-muted-foreground'>
              {formatFileSize(media.size)} · Click to open
            </p>
          </div>
          <ExternalLink className='w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0' />
        </a>
      ) : (
        // Other file — card with open-in-new-tab
        <div className='flex items-center gap-3 p-3 rounded-lg border bg-muted/20'>
          <div className='w-10 h-10 rounded bg-muted flex items-center justify-center flex-shrink-0 border'>
            <span className='text-muted-foreground'>
              {getFileIcon(media.type, 'w-5 h-5')}
            </span>
          </div>
          <div className='flex-1 min-w-0'>
            <p className='text-sm font-medium truncate'>{media.name}</p>
            <p className='text-xs text-muted-foreground'>
              {formatFileSize(media.size)}
            </p>
          </div>
          <Button
            type='button'
            variant='ghost'
            size='icon'
            className='h-8 w-8'
            asChild>
            <a href={media.url} target='_blank' rel='noopener noreferrer'>
              <ExternalLink className='w-4 h-4' />
            </a>
          </Button>
        </div>
      )}
    </FieldWrapper>
  );
}

// ---------------------------------------------------------------------------
// EDIT MODE — full file manager (original behaviour)
// ---------------------------------------------------------------------------
function MediaFieldEdit({
  field,
  value,
  onChange,
  onBlur,
  showError,
  errorMessage,
  disabled,
  className,
}: BaseFieldProps) {
  const { uploadMedia } = useFormKit();
  const [previewFile, setPreviewFile] = useState<MediaFile | null>(null);

  const acceptedTypes = field.acceptedTypes || ['image/*', 'application/pdf'];
  const maxSize = field.maxSize || 10 * 1024 * 1024;
  const multiple = field.multiple ?? false;
  const files: MediaFile[] = Array.isArray(value)
    ? value
    : value
      ? [value]
      : [];

  const { dragActive, uploading, processFiles, handleDrag, handleDrop } =
    useFileUploader(files, multiple, maxSize, onChange, uploadMedia);

  const removeFile = (index: number) => {
    if (multiple) onChange(files.filter((_, i) => i !== index));
    else onChange(null);
  };

  useEffect(() => {
    return () => {
      files.forEach((f) => {
        if (f.preview?.startsWith('blob:')) URL.revokeObjectURL(f.preview);
      });
    };
  }, []);

  return (
    <FieldWrapper
      fieldId={field.id}
      label={field.label}
      required={field.required}
      instruction={field.instruction}
      showError={showError}
      errorMessage={errorMessage}
      className={className}>
      <div className='space-y-3'>
        <DropZone
          fieldId={field.id}
          multiple={multiple}
          acceptedTypes={acceptedTypes}
          maxSize={maxSize}
          disabled={disabled}
          dragActive={dragActive}
          uploading={uploading}
          handleDrag={handleDrag}
          handleDrop={handleDrop}
          onInputChange={(e) => {
            processFiles(e.target.files);
            e.target.value = '';
          }}
        />

        {files.length > 0 && (
          <div className='space-y-2'>
            {files.map((file, index) => (
              <div
                key={index}
                className='flex items-center gap-3 p-3 rounded-lg border bg-muted/20 hover:bg-muted/40 transition-colors group'>
                {/* Thumbnail / icon */}
                <div className='flex-shrink-0 w-12 h-12 rounded-md overflow-hidden bg-muted flex items-center justify-center'>
                  {isImageFile(file) && (file.preview || file.url) ? (
                    <img
                      src={file.preview || file.url}
                      alt={file.name}
                      className='w-full h-full object-cover'
                    />
                  ) : (
                    <span className='text-muted-foreground'>
                      {getFileIcon(file.type)}
                    </span>
                  )}
                </div>
                {/* Info */}
                <div className='flex-1 min-w-0'>
                  <p className='font-medium text-sm truncate'>{file.name}</p>
                  <p className='text-xs text-muted-foreground'>
                    {formatFileSize(file.size)}
                  </p>
                </div>
                {/* Actions */}
                <div className='flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity'>
                  {(file.preview || file.url) && (
                    <Button
                      type='button'
                      variant='ghost'
                      size='icon'
                      className='h-8 w-8'
                      onClick={() => setPreviewFile(file)}>
                      <Eye className='w-4 h-4' />
                    </Button>
                  )}
                  {file.url && (
                    <Button
                      type='button'
                      variant='ghost'
                      size='icon'
                      className='h-8 w-8'
                      asChild>
                      <a
                        href={file.url}
                        download={file.name}
                        target='_blank'
                        rel='noopener noreferrer'>
                        <Download className='w-4 h-4' />
                      </a>
                    </Button>
                  )}
                  <Button
                    type='button'
                    variant='ghost'
                    size='icon'
                    className='h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50'
                    onClick={() => removeFile(index)}
                    disabled={disabled}>
                    <X className='w-4 h-4' />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Lightbox preview */}
        {previewFile && (previewFile.preview || previewFile.url) && (
          <div
            className='fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4'
            onClick={() => setPreviewFile(null)}>
            <div className='relative max-w-4xl max-h-[90vh]'>
              <Button
                type='button'
                variant='ghost'
                size='icon'
                className='absolute -top-12 right-0 text-white hover:bg-white/20'
                onClick={() => setPreviewFile(null)}>
                <X className='w-6 h-6' />
              </Button>
              <img
                src={previewFile.preview || previewFile.url}
                alt={previewFile.name}
                className='max-w-full max-h-[85vh] object-contain rounded-lg'
              />
            </div>
          </div>
        )}
      </div>
    </FieldWrapper>
  );
}

// ---------------------------------------------------------------------------
// Public export — routes based on mediaMode
// ---------------------------------------------------------------------------
export function MediaField(props: BaseFieldProps) {
  return props.field.mediaMode === 'preview' ? (
    <MediaFieldPreview {...props} />
  ) : (
    <MediaFieldEdit {...props} />
  );
}
