'use client'

import { useState, useEffect } from 'react'
import { api, Catalogos, Turno } from '@/lib/api'
import { generarMinuta } from '@/lib/generador'
import { DiaMinuta, Servicio } from '@/types/minuta'
import { detectarRepeticiones } from '@/lib/repeticion'
import DiaCard from '@/components/DiaCard'
import Resumen from '@/components/Resumen'

const TIPO_COLOR: Record<string, string> = {
  vacuno: 'bg-red-100 text-red-700 border-red-200',
  cerdo: 'bg-pink-100 text-pink-700 border-pink-200',
  pollo: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  pasta: 'bg-orange-100 text-orange-700 border-orange-200',
  legumbre: 'bg-green-100 text-green-700 border-green-200',
}

function clasificarTipo(nombre: string): string {
  const n = nombre.toLowerCase()
  if (n.includes('vacuno') || n.includes('carne') || n.includes('asado') || n.includes('estofado') || n.includes('mechada') || n.includes('albóndiga') || n.includes('tortica')) return 'vacuno'
  if (n.includes('cerdo') || n.includes('chuleta') || n.includes('medalla')) return 'cerdo'
  if (n.includes('pollo')) return 'pollo'
  if (n.includes('spaghetti') || n.includes('mostaccioli') || n.includes('espirales') || n.includes('pasta')) return 'pasta'
  if (n.includes('lentejas') || n.includes('legumbre')) return 'legumbre'
  return 'otro'
}

export default function GenerarPage() {
  const [catalogos, setCatalogos] = useState<Catalogos | null>(null)
  const [turnoSel, setTurnoSel] = useState('14x14')
  const [fechaInicio, setFechaInicio] = useState(() => new Date().toISOString().slice(0, 10))
  const [casino, setCasino] = useState('Casino de Faena')
  const [dias, setDias] = useState<DiaMinuta[]>([])
  const [cargando, setCargando] = useState(true)
  const [generando, setGenerando] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [guardado, setGuardado] = useState(false)

  useEffect(() => {
    api.getCatalogos()
      .then(c => { setCatalogos(c) })
      .finally(() => setCargando(false))
  }, [])

  const turnoActual: Turno | undefined = catalogos?.turnos.find(t => t.codigo === turnoSel)

  const generar = () => {
    if (!catalogos || !turnoActual) return
    setGenerando(true)
    setGuardado(false)

    // Pequeño timeout para que el spinner aparezca
    setTimeout(() => {
      const resultado = generarMinuta(
        catalogos.platos,
        catalogos.ensaladas,
        catalogos.acompañamientos,
        turnoActual,
        fechaInicio,
        casino
      )
      setDias(resultado)
      setGenerando(false)
    }, 300)
  }

  const handleChange = (diaIndex: number, svcIndex: number, campo: keyof Servicio, valor: string) => {
    setDias(prev => prev.map((d, di) => {
      if (di !== diaIndex) return d
      return {
        ...d,
        servicios: d.servicios.map((s, si) => si !== svcIndex ? s : { ...s, [campo]: valor }),
      }
    }))
    setGuardado(false)
  }

  const guardar = async () => {
    if (!turnoActual || dias.length === 0) return
    setGuardando(true)
    try {
      await api.guardarMinuta({
        turno: turnoSel,
        casino,
        fechaInicio,
        diasMinimosRepeticion: Math.min(7, Math.max(3, Math.floor(turnoActual.diasEnFaena / catalogos!.platos.filter(p => p.activo).length))),
        dias: dias.map(d => ({ ...d, servicios: d.servicios.map(s => ({ ...s })) })),
      })
      setGuardado(true)
    } catch (e: unknown) {
      alert('Error: ' + (e instanceof Error ? e.message : String(e)))
    } finally {
      setGuardando(false)
    }
  }

  const alertas = detectarRepeticiones(dias, 3)

  // Resumen de distribución
  const conteoTipos: Record<string, number> = {}
  dias.forEach(d => d.servicios.forEach(s => {
    const t = clasificarTipo(s.platoPrincipal)
    conteoTipos[t] = (conteoTipos[t] || 0) + 1
  }))
  const totalAsignados = Object.values(conteoTipos).reduce((a, b) => a + b, 0)

  const semanas: DiaMinuta[][] = []
  for (let i = 0; i < dias.length; i += 7) semanas.push(dias.slice(i, i + 7))

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-gray-900 text-white px-6 py-4">
        <div className="max-w-screen-xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">✨ Generar Minuta Automática</h1>
            <p className="text-gray-400 text-sm">El sistema crea la minuta — el chef solo revisa y ajusta</p>
          </div>
          <a href="/" className="text-gray-400 hover:text-white text-sm">← Volver</a>
        </div>
      </header>

      <main className="max-w-screen-xl mx-auto px-4 py-6">
        {cargando ? (
          <div className="text-center py-20 text-gray-400">Cargando catálogos desde Sheets...</div>
        ) : (
          <>
            {/* Panel de configuración */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
              <h2 className="font-bold text-gray-700 mb-4">Configuración del ciclo</h2>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase block mb-1">Tipo de turno</label>
                  <select value={turnoSel} onChange={e => setTurnoSel(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {(catalogos?.turnos || []).map(t => (
                      <option key={t.codigo} value={t.codigo}>{t.codigo} — {t.diasEnFaena} días en faena</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase block mb-1">Fecha de inicio</label>
                  <input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase block mb-1">Nombre del casino</label>
                  <input value={casino} onChange={e => setCasino(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="flex items-end">
                  <button onClick={generar} disabled={generando || !catalogos}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-sm disabled:opacity-50 transition-colors">
                    {generando ? '⚙ Generando...' : '✨ Generar minuta'}
                  </button>
                </div>
              </div>

              {/* Stats del catálogo */}
              {catalogos && (
                <div className="mt-4 pt-4 border-t flex gap-4 flex-wrap text-xs text-gray-500">
                  <span>🥩 {catalogos.platos.filter(p => p.activo).length} platos activos</span>
                  <span>🥗 {catalogos.ensaladas.filter(e => e.activo).length} ensaladas activas</span>
                  <span>🍚 {catalogos.acompañamientos.filter(a => a.activo).length} acompañamientos activos</span>
                  {turnoActual && (
                    <span className="text-blue-600 font-medium">
                      Gap mínimo calculado: {Math.min(7, Math.max(3, Math.floor(turnoActual.diasEnFaena / Math.max(1, catalogos.platos.filter(p => p.activo).length))))} días
                    </span>
                  )}
                </div>
              )}
            </div>

            {dias.length > 0 && (
              <>
                {/* Distribución generada */}
                <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
                  <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
                    <h2 className="font-bold text-gray-700">Distribución generada</h2>
                    <div className="flex gap-2">
                      <button onClick={generar}
                        className="px-3 py-1.5 border border-gray-300 text-sm rounded-lg hover:bg-gray-50">
                        🔄 Regenerar
                      </button>
                      <button onClick={guardar} disabled={guardando}
                        className={`px-4 py-1.5 text-sm rounded-lg font-medium transition-colors ${guardado ? 'bg-green-600 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'} disabled:opacity-50`}>
                        {guardando ? 'Guardando...' : guardado ? '✅ Guardado en Sheets' : '💾 Guardar en Sheets'}
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(conteoTipos).sort((a, b) => b[1] - a[1]).map(([tipo, count]) => (
                      <div key={tipo} className={`rounded-lg border px-3 py-2 text-center min-w-[80px] ${TIPO_COLOR[tipo] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                        <div className="text-xl font-bold">{count}</div>
                        <div className="text-[11px] capitalize">{tipo}</div>
                        <div className="text-[10px] opacity-70">{Math.round(count / totalAsignados * 100)}%</div>
                      </div>
                    ))}
                    <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-center min-w-[80px]">
                      <div className="text-xl font-bold text-gray-700">{dias.length}</div>
                      <div className="text-[11px] text-gray-500">días</div>
                      <div className="text-[10px] text-gray-400">{turnoSel}</div>
                    </div>
                  </div>
                </div>

                <div className="mb-6">
                  <Resumen dias={dias} alertas={alertas} />
                </div>

                {/* Grid editable */}
                <div className="space-y-8">
                  {semanas.map((semana, si) => (
                    <div key={si}>
                      <h2 className="text-sm font-bold text-gray-600 uppercase tracking-wider mb-3">
                        Semana {si + 1} · {semana[0]?.fecha} al {semana[semana.length - 1]?.fecha}
                      </h2>
                      <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${semana.length}, minmax(0, 1fr))` }}>
                        {semana.map((dia, i) => (
                          <DiaCard
                            key={dia.dia}
                            dia={dia}
                            diaIndex={si * 7 + i}
                            alertas={alertas}
                            onChange={handleChange}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {dias.length === 0 && !generando && (
              <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
                <div className="text-5xl mb-4">✨</div>
                <p className="text-gray-500 text-lg font-medium mb-2">Listo para generar</p>
                <p className="text-gray-400 text-sm mb-6">Configura el turno y la fecha, luego presiona <strong>Generar minuta</strong></p>
                <button onClick={generar} className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700">
                  ✨ Generar ahora
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
