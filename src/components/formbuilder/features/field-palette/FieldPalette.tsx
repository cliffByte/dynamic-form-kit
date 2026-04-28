'use client';

import { useDrag } from 'react-dnd';
import {
  Type,
  Mail,
  Phone,
  Hash,
  FileText,
  ChevronDown,
  CheckSquare,
  Radio,
  Calendar,
  Heading,
  AlignLeft,
  Upload,
  Folder,
  List,
  BarChart3,
  Calculator,
  ListOrdered,
  LayoutGrid,
  Table2,
  Star,
  MapPin,
  Info,
  Languages,
} from 'lucide-react';
import { FormField } from '../../../../types/form';
import { Card, CardContent, CardHeader, CardTitle } from '../../../ui/card';
import { useFormBuilderStore } from '../../store/useFormBuilderStore';
import { canAddToRoot } from '../../../../lib/dragDropUtils';

// Group field types by category
const fieldCategories = {
  input: 'Input Fields',
  content: 'Content Elements',
  choice: 'Choice Fields',
  special: 'Special Fields',
} as const;

const fieldTypes: Array<{
  type: FormField['type'];
  label: string;
  icon: React.ReactNode;
  description: string;
  category: keyof typeof fieldCategories;
}> = [
  {
    type: 'rich_text',
    label: 'Content Block',
    icon: <AlignLeft className='w-4 h-4' />,
    description: 'Static rich text content with formatting',
    category: 'content',
  },
  {
    type: 'rich_text_input',
    label: 'WYSIWYG Editor',
    icon: <FileText className='w-4 h-4' />,
    description: 'Rich text editor for user input',
    category: 'input',
  },
  {
    type: 'text',
    label: 'Text Input',
    icon: <Type className='w-4 h-4' />,
    description: 'Single line text input',
    category: 'input',
  },
  {
    type: 'nepali_unicode',
    label: 'Nepali Unicode',
    icon: <Languages className='w-4 h-4' />,
    description: 'Romanized typing converted to Nepali Unicode',
    category: 'input',
  },
  {
    type: 'email',
    label: 'Email Input',
    icon: <Mail className='w-4 h-4' />,
    description: 'Email address input',
    category: 'input',
  },
  {
    type: 'phone',
    label: 'Phone Number',
    icon: <Phone className='w-4 h-4' />,
    description: 'Phone number with country code',
    category: 'input',
  },
  {
    type: 'number',
    label: 'Number Input',
    icon: <Hash className='w-4 h-4' />,
    description: 'Numeric input',
    category: 'input',
  },
  {
    type: 'textarea',
    label: 'Text Area',
    icon: <FileText className='w-4 h-4' />,
    description: 'Multi-line text input',
    category: 'input',
  },
  {
    type: 'select',
    label: 'Select Dropdown',
    icon: <ChevronDown className='w-4 h-4' />,
    description: 'Dropdown selection',
    category: 'choice',
  },
  {
    type: 'multi_select',
    label: 'Multi Select',
    icon: <List className='w-4 h-4' />,
    description: 'Multiple selection dropdown',
    category: 'choice',
  },
  {
    type: 'checkbox',
    label: 'Checkbox',
    icon: <CheckSquare className='w-4 h-4' />,
    description: 'Multiple choice selection',
    category: 'choice',
  },
  {
    type: 'radio',
    label: 'Radio Button',
    icon: <Radio className='w-4 h-4' />,
    description: 'Single choice selection',
    category: 'choice',
  },
  {
    type: 'range',
    label: 'Range',
    icon: <BarChart3 className='w-4 h-4' />,
    description: 'Range slider with min/max/step configuration',
    category: 'choice',
  },
  {
    type: 'rating',
    label: 'Rating',
    icon: <Star className='w-4 h-4' />,
    description: 'Star rating field',
    category: 'choice',
  },
  {
    type: 'date',
    label: 'Date Picker',
    icon: <Calendar className='w-4 h-4' />,
    description: 'Date selection',
    category: 'special',
  },
  {
    type: 'map',
    label: 'Map Field',
    icon: <MapPin className='w-4 h-4' />,
    description: 'Draw coordinate, polygon, circle, rectangle, or line on map',
    category: 'special',
  },
  {
    type: 'media',
    label: 'Media Upload',
    icon: <Upload className='w-4 h-4' />,
    description: 'File upload with preview',
    category: 'special',
  },
  {
    type: 'step_section',
    label: 'Step Section',
    icon: <ListOrdered className='w-4 h-4' />,
    description: 'Create form steps/wizard',
    category: 'special',
  },
  {
    type: 'ui_section',
    label: 'UI Section',
    icon: <LayoutGrid className='w-4 h-4' />,
    description: 'Configure layout (grid/flex)',
    category: 'special',
  },
  {
    type: 'array',
    label: 'Array',
    icon: <List className='w-4 h-4' />,
    description: 'Repeating group of fields',
    category: 'special',
  },
  {
    type: 'table',
    label: 'Table',
    icon: <Table2 className='w-4 h-4' />,
    description: 'Table with grouped columns and footer calculations',
    category: 'special',
  },
  {
    type: 'calculated',
    label: 'Calculated Field',
    icon: <Calculator className='w-4 h-4' />,
    description: 'Mathematical calculation using other fields',
    category: 'special',
  },
];

function DraggableField({
  fieldType,
  label,
  icon,
  description,
  isRestricted,
}: {
  fieldType: FormField['type'];
  label: string;
  icon: React.ReactNode;
  description: string;
  isRestricted: boolean;
}) {
  const [{ isDragging }, drag] = useDrag({
    type: 'field',
    item: { type: 'field', fieldType },
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
      } ${isRestricted ? 'border-muted opacity-80' : 'border-border'} bg-card shadow-sm`}>
      {isRestricted && (
        <div className='absolute top-2 right-2 text-muted-foreground/40 group-hover:text-amber-500 transition-colors'>
          <Info className='w-3.5 h-3.5' />
        </div>
      )}
      <div className='flex items-start gap-4'>
        <div
          className={`p-2 rounded-md transition-colors duration-200 ${
            isRestricted
              ? 'bg-muted text-muted-foreground group-hover:bg-amber-100 group-hover:text-amber-600'
              : 'bg-primary/10 text-primary group-hover:bg-primary/15'
          }`}>
          {icon}
        </div>
        <div className='flex-1 min-w-0'>
          <div
            className={`font-semibold text-sm mb-0.5 transition-colors ${
              isRestricted
                ? 'text-muted-foreground group-hover:text-amber-600'
                : 'text-foreground group-hover:text-primary'
            }`}>
            {label}
          </div>
          <div className='text-xs text-muted-foreground line-clamp-2'>
            {isRestricted
              ? `Note: Cannot add step sections when regular fields exist at root level`
              : description}
          </div>
        </div>
      </div>
    </div>
  );
}

export function FieldPalette() {
  const { fields } = useFormBuilderStore();

  // Group fields by category
  const fieldsByCategory = fieldTypes.reduce(
    (acc, field) => {
      if (!acc[field.category]) {
        acc[field.category] = [];
      }
      acc[field.category].push(field);
      return acc;
    },
    {} as Record<keyof typeof fieldCategories, typeof fieldTypes>,
  );

  return (
    <Card className='border-border w-full shadow-sm h-fit'>
      <CardHeader className='pb-3 border-b border-border bg-muted/30'>
        <div className='flex items-center gap-2'>
          <CardTitle className='text-base font-semibold'>
            Field Palette
          </CardTitle>
        </div>
        <p className='text-xs text-muted-foreground mt-1'>
          Drag fields to the canvas or into sections
        </p>
      </CardHeader>
      <CardContent className='p-4'>
        <div className='space-y-5'>
          {(
            Object.keys(fieldCategories) as Array<keyof typeof fieldCategories>
          ).map((category) => (
            <div key={category} className='space-y-2.5'>
              <div className='flex items-center gap-2'>
                <h4 className='text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
                  {fieldCategories[category]}
                </h4>
                <div className='h-px flex-1 bg-border'></div>
              </div>
              <div className='space-y-2.5'>
                {fieldsByCategory[category]?.map((field) => {
                  // Only step_section is restricted "globally" if root has fields
                  const isRestricted =
                    field.type === 'step_section' &&
                    !canAddToRoot(fields, 'step_section');

                  return (
                    <DraggableField
                      key={field.type}
                      fieldType={field.type}
                      label={field.label}
                      icon={field.icon}
                      description={field.description}
                      isRestricted={isRestricted}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
