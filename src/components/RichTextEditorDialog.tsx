'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { RichTextInputField } from './form-fields';

interface RichTextEditorDialogProps {
  isOpen: boolean;
  onClose: () => void;
  value: string;
  onChange: (value: string) => void;
  title?: string;
  description?: string;
}

export const RichTextEditorDialog: React.FC<RichTextEditorDialogProps> = ({
  isOpen,
  onClose,
  value,
  onChange,
  title = 'Edit Rich Text Content',
  description = 'Use the toolbar below to format your text with headings, alignment, bold, italic, lists, links, and more.',
}) => {
  const [localValue, setLocalValue] = React.useState<string>(value);

  // Update local value when prop changes
  React.useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleSave = () => {
    onChange(localValue);
    onClose();
  };

  const handleCancel = () => {
    setLocalValue(value); // Reset to original value
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleCancel}>
      <DialogContent className='max-w-4xl max-h-[90vh] flex flex-col'>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className='flex-1 overflow-y-auto py-4'>
          {/* <MinimalTiptapEditor
            value={localValue || '<p></p>'}
            onChange={(content: Content) => {
              const htmlContent =
                typeof content === 'string' ? content : '<p></p>';
              setLocalValue(htmlContent);
            }}
            output='html'Object literal may only specify known properties, and 'name' does not exist in type 'FormField'.ts(2353)
types.ts(12, 3): The expected type comes from property 'field' which is declared here on type 'IntrinsicAttributes & BaseFieldProps'
            editorContentClassName='min-h-[400px]  max-h-[500px] overflow-y-auto'
            placeholder='Start typing your content here...'
          /> */}
          <RichTextInputField
            field={{
              type: 'rich_text',
              id: 'richtext-editor',
              label: title || 'Content',
              required: false,
            }}
            value={localValue}
            onChange={setLocalValue}
            disabled={false}
          />
        </div>

        <DialogFooter className='gap-2'>
          <Button type='button' variant='outline' onClick={handleCancel}>
            Cancel
          </Button>
          <Button type='button' onClick={handleSave}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RichTextEditorDialog;
