// Shared utility components for assessment tabs
import React from 'react'

interface FieldProps {
  label: string
  children: React.ReactNode
  required?: boolean
}
export function Field({ label, children, required }: FieldProps) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

interface SectionProps {
  title: string
  children: React.ReactNode
  className?: string
}
export function Section({ title, children, className = '' }: SectionProps) {
  return (
    <div className={`bg-white border border-[#D4CFC7] rounded-xl p-6 ${className}`}>
      <h3 className="text-sm font-semibold text-charcoal uppercase tracking-wide mb-4">{title}</h3>
      {children}
    </div>
  )
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}
export function Input(props: InputProps) {
  return (
    <input
      {...props}
      className={`w-full px-3 py-2 border border-[#D4CFC7] rounded-lg text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-copper/30 focus:border-copper transition-colors disabled:bg-gray-50 ${props.className ?? ''}`}
    />
  )
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  children: React.ReactNode
}
export function Select({ children, ...props }: SelectProps) {
  return (
    <select
      {...props}
      className={`w-full px-3 py-2 border border-[#D4CFC7] rounded-lg text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-copper/30 focus:border-copper transition-colors bg-white ${props.className ?? ''}`}
    >
      {children}
    </select>
  )
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}
export function Textarea(props: TextareaProps) {
  return (
    <textarea
      {...props}
      rows={props.rows ?? 3}
      className={`w-full px-3 py-2 border border-[#D4CFC7] rounded-lg text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-copper/30 focus:border-copper transition-colors resize-none ${props.className ?? ''}`}
    />
  )
}

interface SaveBarProps {
  onSave: () => void
  isSaving: boolean
  saved?: boolean
  onNext?: () => void
  nextLabel?: string
}
export function SaveBar({ onSave, isSaving, saved, onNext, nextLabel = 'Next' }: SaveBarProps) {
  return (
    <div className="flex items-center justify-between pt-6 border-t border-[#D4CFC7] mt-6">
      <div className="text-sm text-slate">
        {saved && <span className="text-emerald-600">✓ Saved</span>}
      </div>
      <div className="flex gap-3">
        <button
          onClick={onSave}
          disabled={isSaving}
          className="px-5 py-2 bg-copper text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {isSaving ? 'Saving...' : 'Save'}
        </button>
        {onNext && (
          <button
            onClick={onNext}
            className="px-5 py-2 border border-copper text-copper rounded-lg text-sm font-medium hover:bg-copper/5 transition-colors"
          >
            {nextLabel} →
          </button>
        )}
      </div>
    </div>
  )
}

export function ZarInput({
  value,
  onChange,
  ...props
}: { value: number; onChange: (v: number) => void } & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>) {
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate text-sm">R</span>
      <input
        type="number"
        min={0}
        step="0.01"
        value={value || ''}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        {...props}
        className={`w-full pl-7 pr-3 py-2 border border-[#D4CFC7] rounded-lg text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-copper/30 focus:border-copper transition-colors ${props.className ?? ''}`}
      />
    </div>
  )
}

export function formatZar(amount: number | null | undefined): string {
  if (amount == null) return 'R -'
  return `R ${amount.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
