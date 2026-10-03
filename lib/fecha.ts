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
