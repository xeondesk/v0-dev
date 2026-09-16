import * as React from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

function Select({
  className,
  options,
  onChange,
  value,
  ...props
}: React.ComponentProps<'select'> & {
  options: Array<{ label: string; value: string }>
}) {
  return (
    <select
      aria-label={props['aria-label'] ?? 'Select'}
      className={cn(
        'h-8 w-full rounded-md border border-input bg-transparent px-2 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30',
        className,
      )}
      onChange={(event) => onChange?.(event)}
      value={value}
      {...props}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  )
}

function PropertyField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      {children}
    </div>
  )
}

export { Select, PropertyField }
