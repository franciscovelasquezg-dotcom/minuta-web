'use client'

const SIN_DEFINIR = 'Por Definir'

interface SelectFieldProps {
  value: string
  options: string[]
  onChange: (val: string) => void
  className?: string
}

export default function SelectField({ value, options, onChange, className = '' }: SelectFieldProps) {
  // Un <select> cuyo value no está entre sus opciones muestra la PRIMERA opción (ej. "ASADO TRADICIONAL")
  // aunque el dato sea otro, y además impide elegir esa opción. Por eso "Por Definir" va siempre primero,
  // y un valor guardado que ya no está en el catálogo (plato desactivado) se conserva visible.
  const actual = value || SIN_DEFINIR
  const resto = options.filter(o => o !== SIN_DEFINIR)
  const opciones = [SIN_DEFINIR, ...(actual !== SIN_DEFINIR && !resto.includes(actual) ? [actual] : []), ...resto]
  const sinDefinir = actual === SIN_DEFINIR

  return (
    <select
      value={actual}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full min-h-[2.25rem] px-3 py-1.5 border text-sm rounded cursor-pointer appearance-none focus:outline-none focus:ring-1 leading-snug ${className}`}
      style={{ background: '#0F172A', color: sinDefinir ? '#64748B' : '#E2E8F0', fontStyle: sinDefinir ? 'italic' : 'normal', borderColor: '#475569', fontFamily: 'Manrope, sans-serif' }}
    >
      {opciones.map((opt) => (
        <option key={opt} value={opt} style={{ background: '#0F172A', color: opt === SIN_DEFINIR ? '#64748B' : '#E2E8F0', fontStyle: 'normal' }}>{opt}</option>
      ))}
    </select>
  )
}
