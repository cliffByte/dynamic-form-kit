'use client';

import React from 'react';
import type { FormField } from '../../types/form';
import type { StepGroup } from '../../lib/formStepStructure';
import { cn, formatNumberByLocale } from '../../lib/utils';
import { Button } from '../ui/button';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';

export interface MultiStepFormLabels {
  previous?: string;
  next?: string;
  reset?: string;
}

export interface MultiStepProgressProps {
  steps: FormField[];
  currentStepIndex: number;
  completedSteps: Set<number>;
  locale: string;
  onGoToStep: (index: number) => void;
  className?: string;
}

export function MultiStepProgress({
  steps,
  currentStepIndex,
  completedSteps,
  locale,
  onGoToStep,
  className,
}: MultiStepProgressProps): React.ReactElement {
  return (
    <div className={cn('mb-4', className)}>
      <div className='flex items-center justify-center mb-4 flex-wrap gap-y-4'>
        {steps.map((step, index) => {
          const isCompleted = completedSteps.has(index);
          const isCurrent = index === currentStepIndex;
          const isClickable =
            index <= currentStepIndex || completedSteps.has(index - 1);

          return (
            <div key={step.id} className='flex items-center'>
              <div className='flex flex-col items-center'>
                <button
                  type='button'
                  onClick={() => isClickable && onGoToStep(index)}
                  disabled={!isClickable}
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center transition-all font-semibold text-sm',
                    isCompleted &&
                      'bg-green-500 text-white cursor-pointer hover:bg-green-600',
                    isCurrent &&
                      !isCompleted &&
                      'bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2',
                    !isCurrent &&
                      !isCompleted &&
                      isClickable &&
                      'bg-muted text-muted-foreground cursor-pointer hover:bg-muted/80',
                    !isCurrent &&
                      !isCompleted &&
                      !isClickable &&
                      'bg-muted text-muted-foreground/50 cursor-not-allowed',
                  )}>
                  {isCompleted ? (
                    <Check className='w-5 h-5' />
                  ) : (
                    formatNumberByLocale(index + 1, locale)
                  )}
                </button>
                <span
                  className={cn(
                    'text-xs mt-2 font-medium max-w-[80px] text-center truncate',
                    isCurrent ? 'text-primary' : 'text-muted-foreground',
                  )}>
                  {step.label}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    'w-12 h-1 mx-2 rounded transition-all',
                    completedSteps.has(index) ? 'bg-green-500' : 'bg-muted',
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export interface MultiStepFormNavProps {
  activeStepGroup: StepGroup;
  currentStepIndex: number;
  isLastStep: boolean;
  saving: boolean;
  disabled?: boolean;
  submitLabel: string;
  savingLabel?: string;
  labels: MultiStepFormLabels;
  showReset: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onReset: () => void;
  className?: string;
}

export function MultiStepFormNav({
  activeStepGroup,
  currentStepIndex,
  isLastStep,
  saving,
  disabled,
  submitLabel,
  savingLabel = 'Saving…',
  labels,
  showReset,
  onPrevious,
  onNext,
  onReset,
  className,
}: MultiStepFormNavProps): React.ReactElement {
  const previousLabel = labels.previous ?? 'Previous';
  const nextLabel = labels.next ?? 'Next';
  const resetLabel = labels.reset ?? 'Reset';

  return (
    <div
      className={cn(
        'mt-8 pt-4 border-t flex flex-col sm:flex-row justify-between gap-3',
        className,
      )}>
      <div className='flex gap-2'>
        <Button
          type='button'
          variant='outline'
          onClick={onPrevious}
          disabled={currentStepIndex === 0 || disabled || saving}
          className='gap-2'>
          <ArrowLeft className='w-4 h-4' />
          {previousLabel}
        </Button>
      </div>

      <div className='flex gap-2'>
        {showReset && (
          <Button
            type='button'
            variant='outline'
            onClick={onReset}
            disabled={disabled || saving}>
            {resetLabel}
          </Button>
        )}
        {isLastStep ? (
          <Button type='submit' size='lg' disabled={disabled || saving}>
            {saving ? savingLabel : submitLabel}
          </Button>
        ) : (
          <Button
            type='button'
            size='lg'
            className='gap-2'
            disabled={disabled || saving}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onNext();
            }}>
            {nextLabel}
            <ArrowRight className='w-4 h-4' />
          </Button>
        )}
      </div>
    </div>
  );
}
