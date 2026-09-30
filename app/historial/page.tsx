'use client'

import { useState, useEffect } from 'react'
import { api, HistorialEntry, Turno } from '@/lib/api'

export default function HistorialPage() {
  const [turnos, setTurnos] = useState<Turno[]>([])
  const [turnoSel, setTurnoSel] = useState('14x14')
  const [historial, setHistorial] = useState<HistorialEntry[]>([])
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.getCatalogos()
      .then(c => setTurnos(c.turnos))
      .catch(() => {})
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
    <div className="min-h-screen bg-gray-100">
      <header className="bg-gray-900 text-white px-6 py-4">
        <div className="max-w-screen-xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Historial de Versiones</h1>
            <p className="text-gray-400 text-sm">Últimas 20 versiones guardadas por turno</p>
          </div>
          <a href="/" className="text-gray-400 hover:text-white text-sm">← Volver</a>
        </div>
      </header>

      <main className="max-w-screen-xl mx-auto px-4 py-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 flex items-center gap-4">
          <label className="text-sm font-semibold text-gray-600">Turno:</label>
          <select
            value={turnoSel}
            onChange={e => setTurnoSel(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {turnos.map(t => (
              <option key={t.codigo} value={t.codigo}>{t.codigo} — {t.diasEnFaena} días</option>
            ))}
          </select>
        </div>

        {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">{error}</div>}

        {cargando ? (
          <div className="text-center py-20 text-gray-400">Cargando historial...</div>
        ) : historial.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
            <div className="text-4xl mb-3">📋</div>
            <p className="text-gray-500">Sin historial aún para el turno <strong>{turnoSel}</strong></p>
            <p className="text-gray-400 text-sm mt-1">Cada vez que guardes una minuta, aparecerá aquí.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {historial.map((h, i) => {
              const total = h.totalDias * 2
              const pct = total > 0 ? Math.round((h.confirmados / total) * 100) : 0
              return (
                <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-4">
                    <div className={`w-2 h-10 rounded-full ${i === 0 ? 'bg-green-500' : 'bg-gray-200'}`} />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-800">{h.timestamp}</span>
                        {i === 0 && (
                          <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">
                            ACTUAL
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">
                        {h.casino} · Inicio: {h.fechaInicio} · {h.totalDias} días
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <div className="text-lg font-bold text-green-600">{h.confirmados}</div>
                      <div className="text-[10px] text-gray-400 uppercase">Confirmados</div>
                    </div>
                    <div className="w-24">
                      <div className="flex justify-between text-[10px] text-gray-400 mb-0.5">
                        <span>{pct}%</span>
                        <span>{total} total</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5">
                        <div
                          className="h-1.5 rounded-full bg-green-500 transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
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
