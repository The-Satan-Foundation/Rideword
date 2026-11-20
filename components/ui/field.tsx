'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Label } from '@/components/ui/label'

function FieldSet({ className, ...props }: React.ComponentProps<'fieldset'>) {
  return <fieldset data-slot="field-set" className={cn('flex flex-col gap-4', className)} {...props} />
}

function FieldLegend({ className, variant = 'legend', ...props }: React.ComponentProps<'legend'> & { variant?: 'legend' | 'label' }) {
  return <legend data-slot="field-legend" data-variant={variant} className={cn('mb-1.5 font-medium data-[variant=label]:text-sm data-[variant=legend]:text-base', className)} {...props} />
}

function FieldGroup({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="field-group" className={cn('@container/field-group flex w-full flex-col gap-4', className)} {...props} />
}

function Field({ className, ...props }: React.ComponentProps<'div'>) {
  return <div role="group" data-slot="field" className={cn('group/field flex w-full flex-col gap-2', className)} {...props} />
}

function FieldLabel({ className, ...props }: React.ComponentProps<typeof Label>) {
  return <Label data-slot="field-label" className={cn('w-fit leading-snug', className)} {...props} />
}

function FieldDescription({ className, ...props }: React.ComponentProps<'p'>) {
  return <p data-slot="field-description" className={cn('text-xs leading-relaxed text-muted-foreground', className)} {...props} />
}

export { Field, FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSet }
