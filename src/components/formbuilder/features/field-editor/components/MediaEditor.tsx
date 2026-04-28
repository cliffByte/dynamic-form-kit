'use client';

import React, { useState, useCallback } from 'react';
import { FormField } from '../../../../../types/form';
import { Input } from '../../../../ui/input';
import { Label } from '../../../../ui/label';
import {
  X,
  Upload,
  Loader2,
  Image as ImageIcon,
  FileText,
  File,
} from 'lucide-react';
import { cn } from '../../../../../lib/utils';
import { useFormKit } from '../../../../../context/FormKitContext';

interface MediaEditorProps {
  field: FormField;
  updateField: (fieldId: string, updates: Partial<FormField>) => void;
}

// Default extensions associated with each file type category
const FILE_TYPE_EXTENSIONS: Record<string, string[]> = {
  photo: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'],
  audio: ['.mp3', '.wav', '.ogg', '.aac', '.flac', '.m4a'],
  video: ['.mp4', '.avi', '.mov', '.mkv', '.webm', '.wmv'],
  barcode: ['.jpg', '.jpeg', '.png'],
  file: ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt'],
  xml: ['.xml'],
};

const FILE_TYPE_MIME: Record<string, string[]> = {
  photo: ['image/*'],
  audio: ['audio/*'],
  video: ['video/*'],
  barcode: ['image/*'],
  file: ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt'],
  xml: ['.xml', 'application/xml', 'text/xml'],
};

function getAcceptedTypes(fileTypes: string[]): string[] {
  const types: string[] = [];
  fileTypes.forEach((t) => {
    FILE_TYPE_MIME[t]?.forEach((m) => {
      if (!types.includes(m)) types.push(m);
    });
  });
  return types;
}

export const MediaEditor: React.FC<MediaEditorProps> = ({
  field,
  updateField,
}) => {
  const { uploadMedia } = useFormKit();
  const [uploading, setUploading] = useState(false);

  if (field.type !== 'media') return null;

  const isPreviewMode = (field.mediaMode ?? 'edit') === 'preview';
  const fileTypes = field.fileTypes || [];

  // Union of all extensions available from currently selected file types
  const allPossibleExtensions = new Set<string>();
  fileTypes.forEach((t) =>
    FILE_TYPE_EXTENSIONS[t]?.forEach((e) => allPossibleExtensions.add(e)),
  );

  // Current allowed extensions: explicit list if set, otherwise the full derived set
  const currentExtensions: string[] =
    field.allowedExtensions !== undefined
      ? field.allowedExtensions
      : Array.from(allPossibleExtensions);

  const handleFileTypeToggle = (type: string, checked: boolean) => {
    const newTypes = checked
      ? [...fileTypes, type as any]
      : fileTypes.filter((t) => t !== type);

    const previousFull = new Set<string>();
    fileTypes.forEach((t) =>
      FILE_TYPE_EXTENSIONS[t]?.forEach((e) => previousFull.add(e)),
    );
    const removed = new Set(
      Array.from(previousFull).filter((e) => !currentExtensions.includes(e)),
    );

    const newFull = new Set<string>();
    newTypes.forEach((t) =>
      FILE_TYPE_EXTENSIONS[t]?.forEach((e) => newFull.add(e)),
    );
    const newAllowed = Array.from(newFull).filter((e) => !removed.has(e));

    updateField(field.id, {
      fileTypes: newTypes,
      acceptedTypes: getAcceptedTypes(newTypes),
      allowedExtensions: newAllowed.length > 0 ? newAllowed : undefined,
    });
  };

  const removeExtension = (ext: string) => {
    const newExts = currentExtensions.filter((e) => e !== ext);
    updateField(field.id, { allowedExtensions: newExts });
  };

  /** Upload the selected file and store it in field.previewMedia */
  const handlePreviewFileSelect = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const data = await uploadMedia(formData);
      if (data?.url) {
        updateField(field.id, {
          previewMedia: {
            url: data.url,
            name: file.name,
            size: file.size,
            type: file.type,
          },
        });
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className='space-y-4 border-t pt-4'>
      <h4 className='text-sm font-medium text-gray-700'>Media Configuration</h4>

      {/* ── Mode toggle ───────────────────────────────────────── */}
      <div className='space-y-2'>
        <Label className='text-sm font-semibold'>Display Mode</Label>
        <div className='flex gap-2'>
          {(['edit', 'preview'] as const).map((mode) => (
            <button
              key={mode}
              type='button'
              onClick={() => updateField(field.id, { mediaMode: mode })}
              className={cn(
                'flex-1 py-1.5 text-xs font-medium rounded border transition-colors capitalize',
                (field.mediaMode ?? 'edit') === mode
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background text-muted-foreground border-border hover:border-primary/50',
              )}>
              {mode}
            </button>
          ))}
        </div>
        <p className='text-xs text-gray-500'>
          {isPreviewMode
            ? 'Upload a file here — it will be displayed to users as read-only content.'
            : 'Users can upload files when filling the form.'}
        </p>
      </div>

      {/* ── PREVIEW MODE: builder uploads the file once ───────── */}
      {isPreviewMode && (
        <div className='space-y-3'>
          <Label className='text-sm font-semibold'>Display File</Label>
          {field.previewMedia ? (
            <div className='flex items-center gap-3 p-3 rounded-lg border bg-muted/20'>
              <div className='w-9 h-9 rounded bg-muted flex items-center justify-center flex-shrink-0'>
                {field.previewMedia.type.startsWith('image/') ? (
                  <ImageIcon className='w-4 h-4 text-muted-foreground' />
                ) : field.previewMedia.type === 'application/pdf' ||
                  field.previewMedia.name.endsWith('.pdf') ? (
                  <FileText className='w-4 h-4 text-red-500' />
                ) : (
                  <File className='w-4 h-4 text-muted-foreground' />
                )}
              </div>
              <div className='flex-1 min-w-0'>
                <p className='text-sm font-medium truncate'>
                  {field.previewMedia.name}
                </p>
                <p className='text-xs text-muted-foreground'>
                  {field.previewMedia.size < 1024 * 1024
                    ? `${(field.previewMedia.size / 1024).toFixed(1)} KB`
                    : `${(field.previewMedia.size / (1024 * 1024)).toFixed(2)} MB`}
                </p>
              </div>
              <button
                type='button'
                onClick={() =>
                  updateField(field.id, { previewMedia: undefined })
                }
                className='p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors'>
                <X className='w-4 h-4' />
              </button>
            </div>
          ) : (
            <label
              className={cn(
                'relative flex flex-col items-center gap-2 p-5 rounded-lg border-2 border-dashed cursor-pointer transition-colors',
                uploading
                  ? 'border-primary/40 bg-primary/5'
                  : 'border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/20',
              )}>
              <input
                type='file'
                className='absolute inset-0 w-full h-full opacity-0 cursor-pointer'
                disabled={uploading}
                onChange={handlePreviewFileSelect}
              />
              {uploading ? (
                <Loader2 className='w-8 h-8 text-primary animate-spin' />
              ) : (
                <Upload className='w-8 h-8 text-muted-foreground' />
              )}
              <span className='text-xs text-muted-foreground'>
                {uploading
                  ? 'Uploading…'
                  : 'Click or drag to upload display file'}
              </span>
            </label>
          )}
        </div>
      )}

      {/* ── EDIT MODE: full upload configuration ──────────────── */}
      {!isPreviewMode && (
        <>
          {/* Max files */}
          <div className='space-y-2'>
            <Label>Maximum Files</Label>
            <Input
              type='number'
              min='1'
              max='10'
              value={field.maxFiles || 1}
              onChange={(e) =>
                updateField(field.id, {
                  maxFiles: parseInt(e.target.value) || 1,
                })
              }
            />
            <p className='text-xs text-gray-500'>Maximum 10 files allowed</p>
          </div>

          {/* Size limits */}
          <div className='grid grid-cols-2 gap-4'>
            <div className='space-y-2'>
              <Label>Max Size Per File (MB)</Label>
              <Input
                type='number'
                step='0.1'
                value={
                  field.maxSize
                    ? (field.maxSize / (1024 * 1024)).toFixed(1)
                    : ''
                }
                onChange={(e) => {
                  const mb = parseFloat(e.target.value);
                  updateField(field.id, {
                    maxSize: mb > 0 ? Math.round(mb * 1024 * 1024) : undefined,
                  });
                }}
              />
            </div>
            {(field.maxFiles || 1) > 1 && (
              <div className='space-y-2'>
                <Label>Max Total Size (MB)</Label>
                <Input
                  type='number'
                  step='0.1'
                  value={
                    field.maxTotalSize
                      ? (field.maxTotalSize / (1024 * 1024)).toFixed(1)
                      : ''
                  }
                  onChange={(e) => {
                    const mb = parseFloat(e.target.value);
                    updateField(field.id, {
                      maxTotalSize:
                        mb > 0 ? Math.round(mb * 1024 * 1024) : undefined,
                    });
                  }}
                />
              </div>
            )}
          </div>

          {/* File type categories */}
          <div className='space-y-3'>
            <Label className='text-sm font-semibold'>
              File Type Categories
            </Label>
            <div className='flex flex-wrap gap-4 p-3 bg-gray-50 rounded-lg border border-border'>
              {[
                { value: 'photo', label: 'Photo' },
                { value: 'audio', label: 'Audio' },
                { value: 'video', label: 'Video' },
                { value: 'barcode', label: 'Barcode/QR' },
                { value: 'file', label: 'File' },
                { value: 'xml', label: 'XML' },
              ].map((type) => (
                <label
                  key={type.value}
                  className='flex items-center gap-2 cursor-pointer'>
                  <input
                    type='checkbox'
                    checked={fileTypes.includes(type.value as any)}
                    onChange={(e) =>
                      handleFileTypeToggle(type.value, e.target.checked)
                    }
                    className='w-4 h-4 rounded border-gray-300'
                  />
                  <span className='text-xs'>{type.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Allowed extensions */}
          {fileTypes.length > 0 && (
            <div className='space-y-2'>
              <div className='flex items-center justify-between'>
                <Label className='text-sm font-semibold'>
                  Allowed Extensions
                </Label>
                <span className='text-xs text-muted-foreground flex items-center gap-1'>
                  Click <X className='inline w-3 h-3' /> to restrict
                </span>
              </div>
              {currentExtensions.length > 0 ? (
                <div className='flex flex-wrap gap-2 p-2 bg-gray-50 rounded-lg border border-border min-h-[40px]'>
                  {currentExtensions.map((ext) => (
                    <div
                      key={ext}
                      className='flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded text-xs border border-primary/20'>
                      <span>{ext}</span>
                      <X
                        className='w-3 h-3 cursor-pointer hover:text-red-500 transition-colors'
                        onClick={() => removeExtension(ext)}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <p className='text-xs text-muted-foreground italic py-2 px-1'>
                  All extensions removed — no files of these types will be
                  accepted.
                </p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};
