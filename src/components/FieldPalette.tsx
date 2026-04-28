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
  AlignLeft,
  Upload,
  ListOrdered,
  LayoutGrid,
  List,
  Calculator,
  Grid3x3,
  BarChart3,
  Star,
  MapPin,
} from 'lucide-react';
import { FormField } from '../types/form';

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
    type: 'calculated',
    label: 'Calculated Field',
    icon: <Calculator className='w-4 h-4' />,
    description: 'Mathematical calculation using other fields',
    category: 'special',
  },
  {
    type: 'multi_select',
    label: 'Multi Select',
    icon: <List className='w-4 h-4' />,
    description: 'Multiple selection dropdown',
    category: 'choice',
  },
  // {
  //   type: 'matrix',
  //   label: 'Matrix',
  //   icon: <Grid3x3 className='w-4 h-4' />,
  //   description: 'Rating grid with rows and columns',
  //   category: 'choice',
  // },
  {
    type: 'range',
    label: 'Range',
    icon: <BarChart3 className='w-4 h-4' />,
    description: 'Range slider with min/max/step configuration',
    category: 'choice',
  },
];

function DraggableField({
  fieldType,
  label,
  icon,
  description,
}: {
  fieldType: FormField['type'];
  label: string;
  icon: React.ReactNode;
  description: string;
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
      className={`p-3 border border-gray-300 rounded-lg cursor-move hover:border-blue-400 hover:shadow-sm transition-all ${
        isDragging ? 'opacity-50' : ''
      }`}>
      <div className='flex items-center gap-3'>
        <div className='text-gray-600'>{icon}</div>
        <div className='flex-1'>
          <div className='font-medium text-gray-900 text-sm'>{label}</div>
          <div className='text-xs text-gray-500'>{description}</div>
        </div>
      </div>
    </div>
  );
}

export function FieldPalette() {
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
    <div className='bg-white rounded-lg shadow-sm border p-4'>
      <h3 className='text-lg font-semibold text-gray-900 mb-4'>Field Types</h3>
      <div className='space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto pr-2'>
        {(
          Object.keys(fieldCategories) as Array<keyof typeof fieldCategories>
        ).map((category) => (
          <div key={category}>
            <h4 className='text-sm font-medium text-gray-700 mb-2'>
              {fieldCategories[category]}
            </h4>
            <div className='space-y-2'>
              {fieldsByCategory[category]?.map((field) => (
                <DraggableField
                  key={field.type}
                  fieldType={field.type}
                  label={field.label}
                  icon={field.icon}
                  description={field.description}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
