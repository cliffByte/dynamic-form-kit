'use client';

import React, { useMemo } from 'react';
import { AlertTriangle, AlertCircle, Info } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { cn } from '../lib/utils';

interface AlertModalProps {
  open: boolean;
  title: string;
  description: string;
  onAccept: () => void;
  onClose: () => void;
  acceptText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
}

export const AlertModal = React.memo(function AlertModal({
  open,
  title,
  description,
  onAccept,
  onClose,
  acceptText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
}: AlertModalProps) {
  const variantConfig = useMemo(() => {
    switch (variant) {
      case 'danger':
        return {
          buttonVariant: 'destructive' as const,
          iconBg: 'bg-destructive/10',
          iconColor: 'text-destructive',
          Icon: AlertTriangle,
        };
      case 'warning':
        return {
          buttonVariant: 'default' as const,
          iconBg: 'bg-amber-50',
          iconColor: 'text-amber-600',
          Icon: AlertCircle,
          buttonClassName: 'bg-amber-600 hover:bg-amber-700 text-white',
        };
      case 'info':
        return {
          buttonVariant: 'default' as const,
          iconBg: 'bg-primary/10',
          iconColor: 'text-primary',
          Icon: Info,
        };
      default:
        return {
          buttonVariant: 'destructive' as const,
          iconBg: 'bg-destructive/10',
          iconColor: 'text-destructive',
          Icon: AlertTriangle,
        };
    }
  }, [variant]);

  const { Icon } = variantConfig;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <div className='flex items-center gap-3'>
            <div
              className={cn(
                'flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center',
                variantConfig.iconBg
              )}>
              <Icon className={cn('w-5 h-5', variantConfig.iconColor)} />
            </div>
            <DialogTitle>{title}</DialogTitle>
          </div>
          <DialogDescription className='pt-2'>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter className='gap-2 sm:gap-0'>
          <Button type='button' variant='outline' onClick={onClose}>
            {cancelText}
          </Button>
          <Button
            type='button'
            variant={variantConfig.buttonVariant}
            className={variantConfig.buttonClassName}
            onClick={onAccept}>
            {acceptText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});
