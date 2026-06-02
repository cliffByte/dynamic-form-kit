'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { FormField } from '../types/form';
import { useFormKit } from '../context/FormKitContext';
import { toast } from 'sonner';
import { useFormBuilderStore } from './formbuilder/store/useFormBuilderStore';
import {
  cloneFieldForTemplateSave,
  findFieldById,
} from '../lib/fieldOperations';

interface TemplateSaveDialogProps {
  isOpen: boolean;
  onClose: () => void;
  field: FormField;
}

export function TemplateSaveDialog({
  isOpen,
  onClose,
  field,
}: TemplateSaveDialogProps) {
  const { saveFormTemplate } = useFormKit();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Please enter a template name');
      return;
    }

    setIsSaving(true);
    try {
      const { fields } = useFormBuilderStore.getState();
      const latestField = findFieldById(fields, field.id) ?? field;
      const schema = cloneFieldForTemplateSave(latestField);

      await saveFormTemplate({
        name: { en: name },
        description: { en: description },
        schema,
      });
      window.dispatchEvent(new CustomEvent('template-saved'));
      onClose();
    } catch (error: any) {
      console.error('Error saving template:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save as Template</DialogTitle>
        </DialogHeader>
        <div className='space-y-4 py-4'>
          <div className='space-y-2'>
            <Label htmlFor='template-name'>Template Name</Label>
            <Input
              id='template-name'
              placeholder='Enter template name'
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className='space-y-2'>
            <Label htmlFor='template-desc'>Description (Optional)</Label>
            <Input
              id='template-desc'
              placeholder='Enter description'
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant='outline' onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Template'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
