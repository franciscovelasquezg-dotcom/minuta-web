'use client'

import { useMemo, useState } from 'react'
import { Recepcion, resumir } from '@/lib/recepcion'

const card = { background: '#0F172A', border: '1px solid #1E293B' }
const campo = { background: '#1E293B', border: '1px solid #334155', color: '#F1F5F9', minHeight: 48, fontSize: 16 }

export default function RecepcionHistorial({ lista, onAbrir }: { lista: Recepcion[]; onAbrir: (r: Recepcion) => void }) {
  const [proveedor, setProveedor] = useState('')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [soloProblemas, setSoloProblemas] = useState(false)

  const proveedores = useMemo(() => Array.from(new Set(lista.map(r => r.proveedor).filter(Boolean))).sort(), [lista])

  const filtradas = useMemo(() => lista.filter(r => {
    if (proveedor && r.proveedor !== proveedor) return false
    if (desde && r.fecha < desde) return false
    if (hasta && r.fecha > hasta) return false
    if (soloProblemas) { const s = resumir(r); if (s.faltas + s.sobras + s.tempsFuera === 0) return false }
    return true
  }), [lista, proveedor, desde, hasta, soloProblemas])

  const stats = useMemo(() => {
    const porProv = new Map<string, { n: number; problemas: number }>()
    let conProblemas = 0
    let tempsTotal = 0
    let tempsFuera = 0
    filtradas.forEach(r => {
      const s = resumir(r)
      const mal = s.faltas + s.sobras + s.tempsFuera > 0
      if (mal) conProblemas++
      tempsTotal += r.temps.length
      tempsFuera += s.tempsFuera
      const k = r.proveedor || 'Sin proveedor'
      const a = porProv.get(k) || { n: 0, problemas: 0 }
      a.n++; if (mal) a.problemas++
      porProv.set(k, a)
    })
    const cumplimiento = filtradas.length ? Math.round(((filtradas.length - conProblemas) / filtradas.length) * 100) : 0
    return { conProblemas, tempsTotal, tempsFuera, cumplimiento, porProv: Array.from(porProv.entries()).sort((a, b) => b[1].problemas - a[1].problemas) }
  }, [filtradas])

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-xl p-3 grid grid-cols-2 gap-2" style={card}>
        <select value={proveedor} onChange={e => setProveedor(e.target.value)} className="col-span-2 rounded-xl px-3" style={campo}>
          <option value="">Todos los proveedores</option>
          {proveedores.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <input type="date" value={desde} onChange={e => setDesde(e.target.value)} aria-label="Desde" className="rounded-xl px-3" style={campo} />
        <input type="date" value={hasta} onChange={e => setHasta(e.target.value)} aria-label="Hasta" className="rounded-xl px-3" style={campo} />
        <label className="col-span-2 flex items-center gap-2 text-sm" style={{ minHeight: 44 }}>
          <input type="checkbox" checked={soloProblemas} onChange={e => setSoloProblemas(e.target.checked)} style={{ width: 22, height: 22 }} />
          Solo recepciones con problemas
        </label>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Dato titulo="Recepciones" valor={String(filtradas.length)} />
        <Dato titulo="Conformes" valor={filtradas.length ? stats.cumplimiento + '%' : '—'} bueno={stats.cumplimiento >= 90} />
        <Dato titulo="Temp. fuera" valor={`${stats.tempsFuera}/${stats.tempsTotal}`} malo={stats.tempsFuera > 0} />
      </div>

      {stats.porProv.length > 0 && (
        <div className="rounded-xl p-3" style={card}>
          <h2 className="font-bold mb-1">Por proveedor</h2>
          {stats.porProv.map(([nombre, a]) => (
            <div key={nombre} className="flex justify-between py-1 text-sm" style={{ borderTop: '1px solid #1E293B' }}>
              <span>{nombre}</span>
              <span style={{ color: a.problemas ? '#FCA5A5' : '#86EFAC' }}>{a.n} recep. · {a.problemas} con problemas</span>
            </div>
          ))}
        </div>
      )}

      {filtradas.map(r => {
        const s = resumir(r)
        const mal = s.faltas + s.sobras + s.tempsFuera > 0
        return (
          <button key={r.id} onClick={() => onAbrir(r)} className="text-left rounded-xl p-3" style={{ ...card, minHeight: 64, borderColor: mal ? '#991B1B' : '#1E293B' }}>
            <div className="flex justify-between">
              <span className="font-bold">{r.proveedor || 'Sin proveedor'}</span>
              <span className="text-xs" style={{ color: '#64748B' }}>{r.fecha} {r.hora}</span>
            </div>
            <div className="text-xs mt-1" style={{ color: mal ? '#FCA5A5' : '#86EFAC' }}>{mal ? `${s.faltas} faltas · ${s.sobras} sobras · ${s.tempsFuera} temp. fuera` : 'Conforme'}</div>
          </button>
        )
      })}
      {filtradas.length === 0 && <p className="text-center py-8" style={{ color: '#64748B' }}>No hay recepciones con ese filtro</p>}
    </div>
  )
}

function Dato({ titulo, valor, bueno, malo }: { titulo: string; valor: string; bueno?: boolean; malo?: boolean }) {
  return (
    <div className="rounded-xl p-3 text-center" style={card}>
      <div className="font-bold text-xl" style={{ color: malo ? '#FCA5A5' : bueno ? '#86EFAC' : '#F1F5F9' }}>{valor}</div>
      <div className="text-xs" style={{ color: '#64748B' }}>{titulo}</div>
    </div>
  )
}
