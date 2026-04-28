'use client';

import { useState } from 'react';
import { EnhancedFormSubmission } from '../types/submission';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';
import { FileJson, Download, Copy, Check } from 'lucide-react';
import { useFormKit } from '../context/FormKitContext';

/**
 * Formats submission data with field metadata for easier mapping during edit
 * Creates a structure with field labels, types, and values for better readability
 */
function formatSubmissionDataForEdit(
  submission: EnhancedFormSubmission,
): Array<{
  fieldId: string;
  label: string;
  type: string;
  value: any;
  required?: boolean;
}> {
  const formatted: Array<{
    fieldId: string;
    label: string;
    type: string;
    value: any;
    required?: boolean;
  }> = [];

  submission.fieldMap.forEach((field, fieldId) => {
    // Skip container fields (sections, arrays) as they don't have direct values
    if (
      field.type === 'step_section' ||
      field.type === 'ui_section' ||
      field.type === 'array' ||
      field.type === 'table' ||
      field.type === 'rich_text'
    ) {
      return;
    }

    formatted.push({
      fieldId,
      label: field.label || fieldId,
      type: field.type,
      value: submission.submissionData[fieldId],
      required: field.required,
    });
  });

  return formatted;
}

interface SubmissionDataModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  enhancedSubmission: EnhancedFormSubmission | null;
}

export function SubmissionDataModal({
  isOpen,
  onOpenChange,
  enhancedSubmission,
}: SubmissionDataModalProps) {
  const [copied, setCopied] = useState(false);
  const [copiedFormatted, setCopiedFormatted] = useState(false);
  const { t } = useFormKit();

  const handleCopyJSON = () => {
    if (enhancedSubmission) {
      navigator.clipboard.writeText(
        JSON.stringify(enhancedSubmission, null, 2),
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCopyFormattedJSON = () => {
    if (enhancedSubmission) {
      const formattedData = formatSubmissionDataForEdit(enhancedSubmission);
      navigator.clipboard.writeText(JSON.stringify(formattedData, null, 2));
      setCopiedFormatted(true);
      setTimeout(() => setCopiedFormatted(false), 2000);
    }
  };

  const handleDownloadJSON = () => {
    if (enhancedSubmission) {
      const blob = new Blob([JSON.stringify(enhancedSubmission, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `form-submission-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setCopied(false);
    setCopiedFormatted(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-5xl max-h-[90vh] overflow-auto'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2 text-2xl'>
            <FileJson className='w-6 h-6 text-primary' />
            {t('home.modal.title')}
          </DialogTitle>
          <DialogDescription>{t('home.modal.description')}</DialogDescription>
        </DialogHeader>

        <div className='mt-4 space-y-4'>
          {/* Action Buttons */}
          <div className='flex gap-2 flex-wrap'>
            <Button
              type='button'
              onClick={handleCopyFormattedJSON}
              variant='outline'
              size='sm'
              className='flex-1 min-w-[140px]'>
              {copiedFormatted ? (
                <>
                  <Check className='w-4 h-4 mr-2 text-green-600' />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className='w-4 h-4 mr-2' />
                  Copy Formatted
                </>
              )}
            </Button>
            <Button
              type='button'
              onClick={handleCopyJSON}
              variant='outline'
              size='sm'
              className='flex-1 min-w-[140px]'>
              {copied ? (
                <>
                  <Check className='w-4 h-4 mr-2 text-green-600' />
                  {t('home.buttons.copied')}
                </>
              ) : (
                <>
                  <Copy className='w-4 h-4 mr-2' />
                  {t('home.buttons.copyJson')}
                </>
              )}
            </Button>
            <Button
              type='button'
              onClick={handleDownloadJSON}
              variant='outline'
              size='sm'
              className='flex-1 min-w-[140px]'>
              <Download className='w-4 h-4 mr-2' />
              {t('home.buttons.downloadJson')}
            </Button>
          </div>
          {/* <div>
            <div className='flex items-center gap-2 mb-2'>
              <div className='w-1 h-5 bg-primary rounded-full'></div>
              <h3 className='font-semibold text-lg'>
                {t('modal.submissionData.title')} (Formatted for Edit)
              </h3>
            </div>
            <div className='bg-secondary/50 border border-border rounded-lg overflow-hidden'>
              <pre className='p-4 overflow-auto max-h-[40vh] text-sm custom-scrollbar font-mono'>
                {JSON.stringify(
                  enhancedSubmission
                    ? formatSubmissionDataForEdit(enhancedSubmission)
                    : [],
                  null,
                  2,
                )}
              </pre>
            </div>
          </div> */}

          {/* Raw Submission Data (ID mapping) */}
          <div>
            <div className='flex items-center gap-2 mb-2'>
              <div className='w-1 h-5 bg-blue-500 rounded-full'></div>
              <h3 className='font-semibold text-lg'>
                Raw Submission Data (ID Mapping)
              </h3>
            </div>
            <div className='bg-gray-50 border border-border rounded-lg overflow-hidden'>
              <pre className='p-4 overflow-auto max-h-[40vh] text-sm custom-scrollbar font-mono'>
                {JSON.stringify(
                  enhancedSubmission?.submissionData || {},
                  null,
                  2,
                )}
              </pre>
            </div>
          </div>

          {/* Submission Data */}
          <div className='space-y-3'>
            <div>
              <div className='flex items-center gap-2 mb-2'>
                <div className='w-1 h-5 bg-accent rounded-full'></div>
                <h3 className='font-semibold text-lg'>
                  {t('home.modal.formFields.title')}
                </h3>
              </div>
              <div className='bg-gray-50 border border-border rounded-lg overflow-hidden'>
                <pre className='p-4 overflow-auto max-h-[50vh] text-sm custom-scrollbar font-mono'>
                  {JSON.stringify(enhancedSubmission?.fields || [], null, 2)}
                </pre>
              </div>
            </div>
          </div>

          {/* Close Button */}
          <div className='flex justify-end pt-4 border-t border-border'>
            <Button type='button' variant='outline' onClick={handleClose}>
              {t('home.buttons.close')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
