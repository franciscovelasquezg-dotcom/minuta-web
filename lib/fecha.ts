export function formatFecha(raw: string | undefined | null, modo: 'dd/mm' | 'dd-mm-yyyy' = 'dd/mm'): string {
  if (!raw) return '—'
  // Already formatted as DD/MM or DD-MM-YYYY
  if (/^\d{2}[\/\-]\d{2}([\/\-]\d{4})?$/.test(raw)) return raw
  const d = new Date(raw)
  if (isNaN(d.getTime())) return raw
  const day = String(d.getUTCDate()).padStart(2, '0')
  const month = String(d.getUTCMonth() + 1).padStart(2, '0')
  const year = d.getUTCFullYear()
  if (modo === 'dd-mm-yyyy') return `${day}-${month}-${year}`
  return `${day}/${month}`
}

// Fecha de inicio guardada (ISO de Sheets, 'YYYY-MM-DD' o 'DD-MM-YYYY') → 'YYYY-MM-DD' local, para <input type="date">
export function aFechaISO(raw: string | undefined | null): string {
  if (!raw) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw
  const m = raw.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/)
  if (m) return `${m[3]}-${m[2]}-${m[1]}`
  const d = new Date(raw)
  if (isNaN(d.getTime())) return ''
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
