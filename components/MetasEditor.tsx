'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { METAS_DEFAULT, METAS_INFO, MetasBalance } from '@/lib/balance'

export default function MetasEditor() {
  const [metas, setMetas] = useState<MetasBalance>(METAS_DEFAULT)
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState<string | null>(null)

  useEffect(() => {
    api.getMetas().then(m => { if (m) setMetas({ ...METAS_DEFAULT, ...m }) }).catch(() => {}).finally(() => setCargando(false))
  }, [])

  const guardar = async () => {
    setGuardando(true); setMensaje(null)
    try { await api.guardarMetas(metas); setMensaje('Metas guardadas. El Análisis ya las usa.') }
    catch (e) { setMensaje(`No se pudo guardar: ${e instanceof Error ? e.message : e}`) }
    finally { setGuardando(false) }
  }

  if (cargando) return <p className="text-sm text-slate-400 py-8">Cargando metas...</p>

  return (
    <div className="max-w-3xl">
      <p className="text-sm text-slate-400 mb-4">
        Estas metas definen cuándo el menú está balanceado. El Análisis compara cada ciclo contra ellas. Los valores iniciales son una propuesta basada en las guías alimentarias del MINSAL (legumbres 2 veces y pescado al menos 1 vez por semana) adaptada a casino de faena; ajústalos a lo que exija el contrato o el cliente.
      </p>
      <div className="rounded-xl overflow-hidden border border-[#334155]" style={{ background: '#1E293B' }}>
        {METAS_INFO.map((m, i) => (
          <div key={m.key} className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 py-3 ${i > 0 ? 'border-t border-[#334155]' : ''}`}>
            <div>
              <div className="text-sm font-semibold text-white">{m.label}</div>
              <div className="text-xs text-slate-400">{m.tipo === 'max' ? 'No debe superar' : 'Debe alcanzar al menos'} · propuesta: {METAS_DEFAULT[m.key]}</div>
            </div>
            <label className="flex items-center gap-2 text-xs text-slate-400">
              <input type="number" min={0} step={m.unidad.includes('%') ? 1 : 0.5} value={metas[m.key]} onChange={e => setMetas(prev => ({ ...prev, [m.key]: Math.max(0, Number(e.target.value) || 0) }))} className="w-20 h-11 rounded-lg text-center text-base font-bold text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-[#0F172A] border border-[#334155]" />
              <span className="w-36">{m.unidad}</span>
            </label>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3 mt-4">
        <button type="button" onClick={guardar} disabled={guardando} className="min-h-[44px] px-5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold disabled:opacity-50 transition-colors">
          {guardando ? 'Guardando...' : 'Guardar metas'}
        </button>
        <button type="button" onClick={() => setMetas(METAS_DEFAULT)} className="min-h-[44px] px-4 rounded-lg text-sm text-slate-300 border border-[#334155] hover:text-white transition-colors">
          Volver a la propuesta
        </button>
        {mensaje && <span className="text-sm text-slate-300">{mensaje}</span>}
      </div>
    </div>
  )
}
