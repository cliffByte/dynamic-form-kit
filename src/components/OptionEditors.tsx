import React from 'react';
import { OptionConfig, NestedForm } from '../types/form';
import { Button } from './ui/button';

/**
 * Simple option editor component
 * Single responsibility: Edit simple string options
 */
interface SimpleOptionEditorProps {
  options: string[];
  onOptionChange: (index: number, value: string) => void;
  onAddOption: () => void;
  onRemoveOption: (index: number) => void;
}

export function SimpleOptionEditor({
  options,
  onOptionChange,
  onAddOption,
  onRemoveOption,
}: SimpleOptionEditorProps) {
  const handleAddClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    onAddOption();
  };

  return (
    <div className='space-y-2'>
      {options.map((option, index) => (
        <div key={index} className='flex items-center gap-2'>
          <input
            type='text'
            value={option}
            onChange={(e) => onOptionChange(index, e.target.value)}
            className='flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
          />
          {options.length > 1 && (
            <button
              type='button'
              onClick={() => onRemoveOption(index)}
              className='text-red-500 hover:text-red-700 p-1'>
              ×
            </button>
          )}
        </div>
      ))}
      <Button
        type='button'
        onClick={handleAddClick}
        variant='ghost'
        size='sm'
        className='text-blue-600 hover:text-blue-800 mt-2'>
        + Add Option
      </Button>
    </div>
  );
}

/**
 * Advanced option config editor component
 * Single responsibility: Edit option configs with nested forms
 */
interface AdvancedOptionEditorProps {
  optionConfigs: OptionConfig[];
  onOptionConfigUpdate: (index: number, updates: Partial<OptionConfig>) => void;
  onAddOptionConfig: () => void;
  onRemoveOptionConfig: (index: number) => void;
  onOpenNestedForm: (
    optionIndex: number,
    nestedForm: NestedForm | null,
  ) => void;
  onRemoveNestedForm: (optionIndex: number) => void;
  onNestedFormNameChange: (optionIndex: number, name: string) => void;
  editingLocale?: string;
}

export function AdvancedOptionEditor({
  optionConfigs,
  onOptionConfigUpdate,
  onAddOptionConfig,
  onRemoveOptionConfig,
  onOpenNestedForm,
  onRemoveNestedForm,
  onNestedFormNameChange,
  editingLocale = 'en',
}: AdvancedOptionEditorProps) {
  const isEn = editingLocale === 'en';

  return (
    <div className='space-y-3'>
      {optionConfigs.map((config, index) => (
        <div
          key={index}
          className='p-3 border border-gray-200 rounded-md overflow-auto bg-gray-50'>
          <div className='space-y-2'>
            {/* Field Labels with Help Text */}
            <div className='grid grid-cols-2 gap-2 mb-3'>
              <div>
                <label className='text-xs font-medium text-gray-700'>
                  Label <span className='text-red-500'>*</span>
                </label>
                <p className='text-xs text-gray-500 mt-0.5'>
                  What users see in the dropdown
                </p>
              </div>
              <div>
                <label className='text-xs font-medium text-gray-700'>
                  ID <span className='text-red-500'>*</span>
                </label>
                <p className='text-xs text-gray-500 mt-0.5'>
                  Unique identifier for this option
                </p>
              </div>
            </div>

            {/* Input Fields */}
            <div className='w-full grid grid-cols-2 gap-2'>
              <input
                type='text'
                value={
                  isEn
                    ? config.label
                    : config.translations?.label?.[editingLocale] || ''
                }
                onChange={(e) =>
                  onOptionConfigUpdate(index, { label: e.target.value })
                }
                placeholder={isEn ? 'Option A' : `Text for ${editingLocale}`}
                className='px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500'
              />
              <div className='flex  gap-2 items-start'>
                <input
                  type='text'
                  value={config.value}
                  onChange={(e) =>
                    onOptionConfigUpdate(index, { value: e.target.value })
                  }
                  placeholder='option_a'
                  className='flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500'
                />
                <button
                  type='button'
                  onClick={() => onRemoveOptionConfig(index)}
                  className='text-red-500 hover:text-red-700 p-1 mt-1'>
                  ×
                </button>
              </div>
            </div>

            {/* Nested Form Configuration */}
            <div className='ml-4 border-l-2 border-blue-200 pl-3'>
              <div className='flex flex-col sm:flex-row sm:items-center justify-between mb-2 gap-2'>
                <span className='text-xs font-medium text-gray-600'>
                  Nested Form
                </span>
                <div className='flex gap-2'>
                  {!config.nestedForm ? (
                    <button
                      type='button'
                      onClick={() => onOpenNestedForm(index, null)}
                      className='text-xs text-blue-600 hover:text-blue-800'>
                      + Add Nested Form
                    </button>
                  ) : (
                    <>
                      <button
                        type='button'
                        onClick={() =>
                          onOpenNestedForm(index, config.nestedForm || null)
                        }
                        className='text-xs text-green-600 hover:text-green-800'>
                        Edit Form
                      </button>
                      <button
                        type='button'
                        onClick={() => onRemoveNestedForm(index)}
                        className='text-xs text-red-600 hover:text-red-800'>
                        Remove
                      </button>
                    </>
                  )}
                </div>
              </div>

              {config.nestedForm && (
                <div className='space-y-2'>
                  <input
                    type='text'
                    value={config.nestedForm.name}
                    onChange={(e) =>
                      onNestedFormNameChange(index, e.target.value)
                    }
                    placeholder='Nested Form Name'
                    className='w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500'
                  />
                  <div className='text-xs text-gray-500'>
                    Fields: {config.nestedForm.fields.length} configured
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
      <Button
        type='button'
        onClick={onAddOptionConfig}
        variant='ghost'
        size='sm'
        className='text-blue-600 hover:text-blue-800'>
        + Add Option
      </Button>
    </div>
  );
}

/**
 * Mode switcher component
 * Single responsibility: Switch between simple and advanced modes
 */
interface OptionModeSwitcherProps {
  isAdvancedMode: boolean;
  onSwitchToAdvanced: () => void;
  onSwitchToSimple: () => void;
}

export function OptionModeSwitcher({
  isAdvancedMode,
  onSwitchToAdvanced,
  onSwitchToSimple,
}: OptionModeSwitcherProps) {
  return (
    <div className='flex gap-2'>
      {!isAdvancedMode ? (
        <button
          type='button'
          onClick={onSwitchToAdvanced}
          className='text-xs text-blue-600 hover:text-blue-800'>
          Advanced Mode
        </button>
      ) : (
        <button
          type='button'
          onClick={onSwitchToSimple}
          className='text-xs text-gray-600 hover:text-gray-800'>
          Simple Mode
        </button>
      )}
    </div>
  );
}
