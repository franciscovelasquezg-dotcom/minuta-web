'use client'

interface SelectFieldProps {
  value: string
  options: string[]
  onChange: (val: string) => void
  className?: string
}

export default function SelectField({ value, options, onChange, className = '' }: SelectFieldProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full min-h-[2.25rem] px-3 py-1.5 border text-sm rounded cursor-pointer appearance-none focus:outline-none focus:ring-1 leading-snug ${className}`}
      style={{ background: '#0F172A', color: '#E2E8F0', borderColor: '#475569', fontFamily: 'Manrope, sans-serif' }}
    >
      {options.map((opt) => (
        <option key={opt} value={opt} style={{ background: '#0F172A', color: '#E2E8F0' }}>{opt}</option>
      ))}
    </select>
  )
}
