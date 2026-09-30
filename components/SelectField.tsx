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
      className={`w-full text-xs bg-transparent border-0 border-b border-gray-300 focus:border-blue-500 focus:outline-none py-0.5 cursor-pointer ${className}`}
    >
      {options.map((opt) => (
        <option key={opt} value={opt}>{opt}</option>
      ))}
    </select>
  )
}
