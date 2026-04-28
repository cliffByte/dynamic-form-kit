'use client';

import { useDrag } from 'react-dnd';
import { useEffect, useState } from 'react';
import { Folder, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../ui/card';
import { useFormBuilderStore } from '../../store/useFormBuilderStore';
import { FormTemplate } from '../../../../types/form';
import { useFormKit } from '../../../../context/FormKitContext';
import { toast } from 'sonner';

function DraggableTemplate({
  template,
  onDelete,
}: {
  template: FormTemplate;
  onDelete: (id: string) => void;
}) {
  const [{ isDragging }, drag] = useDrag({
    type: 'field',
    item: {
      type: 'field',
      fieldType: (template.schema as any).type,
      schema: template.schema,
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  return (
    <div
      ref={drag as any}
      className={`group relative hover:border-dashed p-4 border rounded-lg cursor-move transition-all duration-200 ${
        isDragging
          ? 'opacity-50 scale-95'
          : 'hover:border-primary hover:shadow-sm hover:bg-primary/5'
      } border-border bg-card shadow-sm`}>
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onDelete(template.id);
        }}
        className='absolute top-2 right-2 p-1 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity rounded-md hover:bg-destructive/10'>
        <Trash2 className='w-3.5 h-3.5' />
      </button>
      <div className='flex items-start gap-4'>
        <div className='p-2 rounded-md transition-colors duration-200 bg-amber-100 text-amber-600 group-hover:bg-amber-150'>
          <Folder className='w-4 h-4' />
        </div>
        <div className='flex-1 min-w-0 pr-4'>
          <div className='font-semibold text-sm mb-0.5 transition-colors text-foreground group-hover:text-amber-600'>
            {template.name.en || template.name.ne}
          </div>
          <div className='text-xs text-muted-foreground line-clamp-2'>
            {template.description?.en || 'Reusable template'}
          </div>
        </div>
      </div>
    </div>
  );
}

export function TemplatePalette() {
  const { fields } = useFormBuilderStore();
  const { listFormTemplates, deleteFormTemplate } = useFormKit();
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
    fetchTemplates();

    const handleTemplateSaved = () => {
      fetchTemplates();
    };

    window.addEventListener('template-saved', handleTemplateSaved);
    return () => {
      window.removeEventListener('template-saved', handleTemplateSaved);
    };
  }, []);

  const handleDeleteTemplate = async (id: string) => {
    try {
      await deleteFormTemplate(id);
      toast.success('Template deleted successfully');
      fetchTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error('Failed to delete template');
    }
  };

  return (
    <Card className='border-border w-full shadow-sm h-fit'>
      <CardHeader className='pb-3 border-b border-border bg-muted/30'>
        <div className='flex items-center gap-2'>
          <CardTitle className='text-base font-semibold'>Templates</CardTitle>
        </div>
        <p className='text-xs text-muted-foreground mt-1'>
          Drag saved templates to the canvas
        </p>
      </CardHeader>
      <CardContent className='p-4'>
        <div className='space-y-2.5'>
          {templates.length > 0 ? (
            templates.map((template) => (
              <DraggableTemplate
                key={template.id}
                template={template}
                onDelete={handleDeleteTemplate}
              />
            ))
          ) : (
            <div className='text-center py-8 px-4 border-2 border-dashed border-border rounded-lg bg-muted/20'>
              <Folder className='w-8 h-8 text-muted-foreground/30 mx-auto mb-2' />
              <p className='text-xs text-muted-foreground italic leading-relaxed'>
                No templates saved yet. Select a field and click "Save as
                Template" to add one here.
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
