'use client';

import React from 'react';
import { FormField } from '../../../../../types/form';
import { CardHeader, CardTitle } from '../../../../ui/card';
import { Button } from '../../../../ui/button';
import { Badge } from '../../../../ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../../ui/select';
import { X, Save, Globe } from 'lucide-react';
import { getLanguageName } from '../../../../../lib/languageList';

interface FieldEditorHeaderProps {
  field: FormField;
  editingLocale: string;
  setEditingLocale: (locale: string) => void;
  onDelete: () => void;
  onSaveTemplate: () => void;
}

export const FieldEditorHeader: React.FC<FieldEditorHeaderProps> = ({
  field,
  editingLocale,
  setEditingLocale,
  onDelete,
  onSaveTemplate,
}) => {
  return (
    <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-4 border-b'>
      <div className='flex flex-col gap-2 flex-grow'>
        <div className='flex items-center justify-between'>
          <CardTitle className='text-lg font-bold flex items-center gap-2'>
            Edit Field
            <Badge variant='outline' className='ml-2 font-mono text-[10px]'>
              {field.type}
            </Badge>
          </CardTitle>
          <div className='flex items-center gap-2'>
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={onSaveTemplate}
              title='Save as Template'
              className='h-8 px-2 text-primary border-primary/20 hover:bg-primary/5'>
              <Save className='w-4 h-4 mr-1' />
              Template
            </Button>
            <Button
              type='button'
              variant='ghost'
              size='icon'
              onClick={onDelete}
              className='h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10'>
              <X className='w-4 h-4' />
            </Button>
          </div>
        </div>

        {/* Language Selection Bar */}
        <div className='flex items-center gap-2 mt-2 pt-2 border-t border-dashed'>
          <div className='flex items-center gap-1.5 text-xs font-medium text-muted-foreground'>
            <Globe className='w-3.5 h-3.5' />
            <span>Editing Language:</span>
          </div>
          <Select value={editingLocale} onValueChange={setEditingLocale}>
            <SelectTrigger className='h-8 w-[140px] text-xs bg-muted/30'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='en'>English (Default)</SelectItem>
              <SelectItem value='ne'>{getLanguageName('ne')}</SelectItem>
            </SelectContent>
          </Select>
          {editingLocale !== 'en' && (
            <Badge variant='secondary' className='text-[10px] h-5 px-1.5'>
              Translating
            </Badge>
          )}
        </div>
      </div>
    </CardHeader>
  );
};
