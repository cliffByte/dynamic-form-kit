'use client';

import React, { useEffect, useState } from 'react';
import { useDrag } from 'react-dnd';
import { Folder, Plus, Trash2 } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../../../ui/popover';
import { Button } from '../../../ui/button';
import { useFormBuilderStore } from '../../store/useFormBuilderStore';
import { FormTemplate } from '../../../../types/form';
import { useFormKit } from '../../../../context/FormKitContext';
import { toast } from 'sonner';

function DraggableTemplateItem({
  template,
  onSelect,
}: {
  template: FormTemplate;
  onSelect: (template: FormTemplate) => void;
}) {
  const [{ isDragging }, drag] = useDrag({
    type: 'field',
    item: {
      type: 'field',
      fieldType: Array.isArray(template.schema)
        ? template.schema[0]?.type || 'text'
        : (template.schema as any).type,
      schema: template.schema,
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  return (
    <div
      ref={drag as any}
      onClick={() => onSelect(template)}
      className={`flex items-center gap-2 p-2 rounded-md border cursor-pointer transition-all ${
        isDragging ? 'opacity-50' : 'hover:bg-amber-50 hover:border-amber-200'
      } bg-card border-border`}>
      <div className={`p-1.5 rounded bg-amber-100 text-amber-600`}>
        <Folder className='w-4 h-4' />
      </div>
      <div className='flex-1 min-w-0'>
        <div className='text-xs font-medium truncate'>
          {template.name.en || template.name.ne}
        </div>
        <div className='text-[10px] text-muted-foreground truncate'>
          {template.description?.en || 'Reusable template'}
        </div>
      </div>
    </div>
  );
}

export function TemplateSelector() {
  const { addFieldFromTemplate } = useFormBuilderStore();
  const { listFormTemplates } = useFormKit();
  const [open, setOpen] = useState(false);
  const [templates, setTemplates] = useState<FormTemplate[]>([]);

  const fetchTemplates = async () => {
    try {
      const data = await listFormTemplates();
      setTemplates(data || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  useEffect(() => {
    if (open) {
      fetchTemplates();
    }
  }, [open]);

  const handleSelect = (template: FormTemplate) => {
    // addFieldFromTemplate(template.schema);
    // setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant='outline'
          size='sm'
          className='gap-2 border-amber-200 hover:bg-amber-50 hover:text-amber-700'>
          <Folder className='w-4 h-4' />
          Add Template
        </Button>
      </PopoverTrigger>
      <PopoverContent className='w-80 p-4' align='end' side='bottom'>
        <div className='space-y-3'>
          <h4 className='text-[10px] font-bold uppercase tracking-wider text-muted-foreground'>
            Saved Templates
          </h4>
          <div className='grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-1'>
            {templates.length > 0 ? (
              templates.map((template) => (
                <DraggableTemplateItem
                  key={template.id}
                  template={template}
                  onSelect={handleSelect}
                />
              ))
            ) : (
              <div className='text-center py-6 border-2 border-dashed rounded-lg bg-muted/20'>
                <p className='text-xs text-muted-foreground italic'>
                  No templates saved yet.
                </p>
              </div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
