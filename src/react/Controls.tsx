import type { ChangeEvent } from 'react';

export function Switch({ label, checked, onChange, className, 'data-testid': testId }: { label: string; checked: boolean; onChange: (checked: boolean) => void; className?: string; 'data-testid'?: string }) {
  return <label className={`svs-switch switch-control${className ? ` ${className}` : ''}`}><span className="svs-switch-label switch-label">{label}</span><span className="svs-switch-toggle switch-toggle"><input type="checkbox" role="switch" aria-checked={checked} checked={checked} data-testid={testId} onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.target.checked)} /><span className="svs-switch-track switch-track"><span className="svs-switch-thumb switch-thumb" /></span></span></label>;
}

export function SegmentedControl<T extends string>({ value, options, onChange, disabled, 'data-testid': testId }: { value: T; options: readonly { value: T; label: string }[]; onChange: (value: T) => void; disabled?: boolean; 'data-testid'?: string }) {
  return <div className={`svs-segmented-control segmented-control${disabled ? ' disabled' : ''}`} data-testid={testId} role="radiogroup">{options.map((option) => <button key={option.value} type="button" role="radio" aria-checked={option.value === value} disabled={disabled} className={`svs-segmented-control-item segmented-control-item ${option.value === value ? 'active' : ''}`} onClick={() => onChange(option.value)}>{option.label}</button>)}</div>;
}
