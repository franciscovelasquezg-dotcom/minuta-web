'use client'

import { useState, useEffect } from 'react'
import { api, HistorialEntry, Turno } from '@/lib/api'
import AppHeader from '@/components/AppHeader'
import { formatFecha } from '@/lib/fecha'

export default function HistorialPage() {
  const [turnos, setTurnos] = useState<Turno[]>([])
  const [turnoSel, setTurnoSel] = useState('14x14')
  const [historial, setHistorial] = useState<HistorialEntry[]>([])
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.getCatalogos().then(c => setTurnos(c.turnos)).catch(() => {})
  }, [])

  useEffect(() => {
    if (!turnoSel) return
    setCargando(true)
    setError('')
    api.getHistorial(turnoSel)
      .then(h => setHistorial(h))
      .catch(e => setError('Error cargando historial: ' + e.message))
      .finally(() => setCargando(false))
  }, [turnoSel])

  return (
    <div className="min-h-screen" style={{ background: '#0B1326', color: '#F1F5F9', fontFamily: 'Manrope, sans-serif' }}>
      <AppHeader activePage="historial" />

      {/* Page title bar */}
      <div className="pt-16" style={{ borderBottom: '1px solid #1E293B', background: '#0F172A' }}>
        <div className="max-w-[1720px] mx-auto px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined" style={{ color: '#10B981', fontSize: 22 }}>history</span>
            <div>
              <h1 className="font-bold text-white" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 20 }}>
                Historial de Versiones
              </h1>
              <p className="text-xs mt-0.5" style={{ color: '#64748B' }}>Últimas 20 versiones guardadas por turno</p>
            </div>
          </div>
          {/* Turno selector */}
          <div className="flex items-center gap-2 p-1 rounded-lg" style={{ background: '#1E293B', border: '1px solid #334155' }}>
            {turnos.length > 0 ? turnos.map(t => (
              <button key={t.codigo} onClick={() => setTurnoSel(t.codigo)}
                className="px-3 py-1.5 rounded-lg text-sm font-bold transition-all"
                style={turnoSel === t.codigo
                  ? { background: '#10B981', color: '#0B1326' }
                  : { color: '#94A3B8' }}>
                {t.codigo}
              </button>
            )) : (
              <select value={turnoSel} onChange={e => setTurnoSel(e.target.value)}
                className="px-3 py-1.5 rounded-lg text-sm outline-none"
                style={{ background: 'transparent', color: '#F1F5F9', border: 'none' }}>
                {['14x14','7x7','4x3'].map(c => <option key={c} value={c} style={{ background: '#1E293B' }}>{c}</option>)}
              </select>
            )}
          </div>
        </div>
      </div>

      <main className="max-w-[1720px] mx-auto px-8 py-6">
        {error && (
          <div className="mb-4 p-3 rounded-xl text-sm" style={{ background: '#450A0A', border: '1px solid #991B1B', color: '#FCA5A5' }}>{error}</div>
        )}

        {cargando ? (
          <div className="flex items-center justify-center py-32 gap-3" style={{ color: '#64748B' }}>
            <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#10B981', borderTopColor: 'transparent' }} />
            Cargando historial...
          </div>
        ) : historial.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl py-24"
            style={{ border: '2px dashed #1E293B', background: '#0A0E1A' }}>
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: '#0F172A', border: '1px solid #1E293B' }}>
              <span className="material-symbols-outlined text-white" style={{ fontSize: 28 }}>history</span>
            </div>
            <p className="font-bold text-white mb-1" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 16 }}>
              Sin historial para {turnoSel}
            </p>
            <p className="text-sm" style={{ color: '#64748B' }}>Cada vez que guardes una minuta, aparecerá aquí.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {historial.map((h, i) => {
              const total = h.totalDias * 2
              const pct = total > 0 ? Math.round((h.confirmados / total) * 100) : 0
              const isActual = i === 0

              return (
                <div key={i}
                  className="rounded-xl flex items-center justify-between flex-wrap gap-4 px-5 py-4 transition-all"
                  style={{
                    background: '#0F172A',
                    border: `1px solid ${isActual ? 'rgba(16,185,129,0.4)' : '#1E293B'}`,
                    borderLeft: `3px solid ${isActual ? '#10B981' : '#334155'}`,
                  }}>
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white text-sm" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                          {h.timestamp}
                        </span>
                        {isActual && (
                          <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded"
                            style={{ background: '#082F1E', border: '1px solid rgba(16,185,129,0.4)', color: '#34D399' }}>
                            ACTUAL
                          </span>
                        )}
                      </div>
                      <p className="text-xs mt-0.5" style={{ color: '#64748B' }}>
                        {h.casino} · Inicio: {formatFecha(h.fechaInicio, 'dd-mm-yyyy')} · {h.totalDias} días
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <div className="font-bold text-lg" style={{ color: '#10B981', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                        {h.confirmados}
                      </div>
                      <div className="text-[10px] font-bold uppercase tracking-wide" style={{ color: '#475569' }}>Confirmados</div>
                    </div>

                    <div className="w-28">
                      <div className="flex justify-between mb-1" style={{ fontSize: 10, color: '#64748B' }}>
                        <span className="font-bold" style={{ color: '#10B981' }}>{pct}%</span>
                        <span>{total} svc</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full" style={{ background: '#1E293B' }}>
                        <div className="h-1.5 rounded-full transition-all"
                          style={{ width: `${pct}%`, background: pct >= 80 ? '#10B981' : pct >= 50 ? '#F59E0B' : '#EF4444' }} />
                      </div>
                    </div>

                    <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
                      style={{ background: '#1E293B', border: '1px solid #334155' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 14, color: '#64748B' }}>schedule</span>
                      <span className="text-xs" style={{ color: '#94A3B8' }}>Turno {turnoSel}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
