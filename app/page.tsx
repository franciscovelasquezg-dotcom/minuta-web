'use client'

import { useState, useEffect, useCallback } from 'react'
import { api, Catalogos, MinutaAPI, ServicioAPI, Turno } from '@/lib/api'
import { generarPDF } from '@/lib/pdf'
import { detectarRepeticiones } from '@/lib/repeticion'
import { DiaMinuta, Servicio } from '@/types/minuta'
import DiaCard from '@/components/DiaCard'
import Resumen from '@/components/Resumen'
import VistaSemanal from '@/components/VistaSemanal'
import Analisis from '@/components/Analisis'

type Vista = 'edicion' | 'semanal' | 'analisis'

function apiToDia(d: MinutaAPI['dias'][0]): DiaMinuta {
  return {
    dia: d.dia,
    fecha: d.fecha,
    diaSemana: d.diaSemana,
    servicios: d.servicios.map(s => ({
      tipo: s.tipo,
      ensalada: s.ensalada,
      acompañamiento: s.acompañamiento,
      platoPrincipal: s.platoPrincipal,
      postre: s.postre || 'Por Definir',
      estado: s.estado as Servicio['estado'],
    })),
  }
}

export default function Home() {
  const [catalogos, setCatalogos] = useState<Catalogos | null>(null)
  const [turnos, setTurnos] = useState<Turno[]>([])
  const [turnoSeleccionado, setTurnoSeleccionado] = useState<string>('14x14')
  const [minuta, setMinuta] = useState<MinutaAPI | null>(null)
  const [dias, setDias] = useState<DiaMinuta[]>([])
  const [vista, setVista] = useState<Vista>('edicion')
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  // Cargar catálogos y turnos al inicio
  useEffect(() => {
    api.getCatalogos()
      .then(c => {
        setCatalogos(c)
        setTurnos(c.turnos)
      })
      .catch(e => setError('Error cargando catálogos: ' + e.message))
      .finally(() => setCargando(false))
  }, [])

  // Cargar minuta al cambiar turno
  useEffect(() => {
    if (!turnoSeleccionado) return
    setCargando(true)
    api.getMinuta(turnoSeleccionado)
      .then(m => {
        setMinuta(m)
        setDias(m.dias.length > 0 ? m.dias.map(apiToDia) : [])
      })
      .catch(() => {
        setMinuta(null)
        setDias([])
      })
      .finally(() => setCargando(false))
  }, [turnoSeleccionado])

  const alertas = detectarRepeticiones(dias, minuta?.diasMinimosRepeticion || 3)

  const handleChange = useCallback((diaIndex: number, svcIndex: number, campo: keyof Servicio, valor: string) => {
    setDias(prev => prev.map((d, di) => {
      if (di !== diaIndex) return d
      return {
        ...d,
        servicios: d.servicios.map((s, si) => si !== svcIndex ? s : { ...s, [campo]: valor }),
      }
    }))
  }, [])

  const guardar = async () => {
    if (!minuta || dias.length === 0) return
    setGuardando(true)
    try {
      await api.guardarMinuta({
        ...minuta,
        dias: dias.map(d => ({
          ...d,
          servicios: d.servicios.map(s => s as ServicioAPI),
        })),
      })
      alert('Minuta guardada en Sheets ✅')
    } catch (e: unknown) {
      alert('Error al guardar: ' + (e instanceof Error ? e.message : String(e)))
    } finally {
      setGuardando(false)
    }
  }

  const crearCiclo = async () => {
    const fecha = prompt('Fecha de inicio (YYYY-MM-DD):', new Date().toISOString().slice(0, 10))
    if (!fecha) return
    const casino = prompt('Nombre del casino:', minuta?.casino || 'Casino de Faena')
    if (!casino) return
    setCargando(true)
    try {
      await api.nuevoCiclo(turnoSeleccionado, fecha, casino)
      const m = await api.getMinuta(turnoSeleccionado)
      setMinuta(m)
      setDias(m.dias.map(apiToDia))
    } catch (e: unknown) {
      alert('Error: ' + (e instanceof Error ? e.message : String(e)))
    } finally {
      setCargando(false)
    }
  }

  const copiarCicloAnterior = async () => {
    if (!minuta || dias.length === 0) return
    const nuevaFecha = prompt('Fecha de inicio del nuevo ciclo (YYYY-MM-DD):', new Date().toISOString().slice(0, 10))
    if (!nuevaFecha) return
    setGuardando(true)
    try {
      // Recalcula fechas manteniendo los mismos platos
      const fecha = new Date(nuevaFecha + 'T12:00:00')
      const DIAS_SEMANA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
      const diasCopiados = dias.map((d, i) => {
        const f = new Date(fecha)
        f.setDate(f.getDate() + i)
        return {
          ...d,
          dia: i + 1,
          fecha: `${String(f.getDate()).padStart(2,'0')}/${String(f.getMonth()+1).padStart(2,'0')}`,
          diaSemana: DIAS_SEMANA[f.getDay()],
          servicios: d.servicios.map(s => ({ ...s, estado: 'Por Confirmar' as const })),
        }
      })
      await api.guardarMinuta({ ...minuta, fechaInicio: nuevaFecha, dias: diasCopiados.map(d => ({ ...d, servicios: d.servicios.map(s => s as ServicioAPI) })) })
      const m = await api.getMinuta(turnoSeleccionado)
      setMinuta(m)
      setDias(m.dias.map(apiToDia))
      alert('Ciclo copiado ✅ — estados reseteados a "Por Confirmar"')
    } catch (e: unknown) {
      alert('Error: ' + (e instanceof Error ? e.message : String(e)))
    } finally {
      setGuardando(false)
    }
  }

  const turnoActual = turnos.find(t => t.codigo === turnoSeleccionado)

  const semanas: DiaMinuta[][] = []
  for (let i = 0; i < dias.length; i += 7) semanas.push(dias.slice(i, i + 7))

  if (cargando && !catalogos) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-gray-500">Conectando con Google Sheets...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-gray-900 text-white px-6 py-4 print:hidden">
        <div className="max-w-screen-xl mx-auto flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold">Minuta Casino de Faena</h1>
            <p className="text-gray-400 text-sm">{minuta?.casino || 'Cargando...'}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Selector de turno */}
            <select
              value={turnoSeleccionado}
              onChange={e => setTurnoSeleccionado(e.target.value)}
              className="bg-gray-700 text-white text-sm rounded px-3 py-1.5 border border-gray-600 focus:outline-none"
            >
              {turnos.map(t => (
                <option key={t.codigo} value={t.codigo}>{t.codigo} — {t.diasEnFaena} días</option>
              ))}
            </select>

            <div className="flex rounded-lg overflow-hidden border border-gray-600">
              <button onClick={() => setVista('edicion')} className={`px-3 py-1.5 text-sm ${vista === 'edicion' ? 'bg-blue-600' : 'text-gray-300 hover:bg-gray-700'}`}>Edición</button>
              <button onClick={() => setVista('semanal')} className={`px-3 py-1.5 text-sm ${vista === 'semanal' ? 'bg-blue-600' : 'text-gray-300 hover:bg-gray-700'}`}>Semanal</button>
              <button onClick={() => setVista('analisis')} className={`px-3 py-1.5 text-sm ${vista === 'analisis' ? 'bg-blue-600' : 'text-gray-300 hover:bg-gray-700'}`}>📊 Análisis</button>
            </div>

            <button onClick={crearCiclo} className="px-3 py-1.5 bg-green-700 hover:bg-green-600 text-sm rounded-lg">+ Nuevo ciclo</button>
            <button onClick={guardar} disabled={guardando || dias.length === 0} className="px-3 py-1.5 bg-blue-700 hover:bg-blue-600 text-sm rounded-lg disabled:opacity-50">
              {guardando ? 'Guardando...' : '💾 Guardar'}
            </button>
            <a href="/generar" className="px-3 py-1.5 bg-blue-700 hover:bg-blue-600 text-sm rounded-lg font-semibold">✨ Generar</a>
            <a href="/catalogos" className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-sm rounded-lg">🥩 Catálogos</a>
            <a href="/historial" className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-sm rounded-lg">📋 Historial</a>
            <a href="/subir" className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-sm rounded-lg">📂 Subir Excel</a>
            {dias.length > 0 && (
              <button
                onClick={() => generarPDF(dias, turnoSeleccionado, minuta?.casino || 'Casino', minuta?.fechaInicio || '')}
                className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-sm rounded-lg"
              >
                📄 PDF
              </button>
            )}
            {dias.length > 0 && (
              <button onClick={copiarCicloAnterior} disabled={guardando} className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-sm rounded-lg disabled:opacity-50">
                📋 Copiar ciclo
              </button>
            )}
            <button
              onClick={async () => { await fetch('/api/auth', { method: 'DELETE' }); window.location.href = '/login' }}
              className="px-3 py-1.5 bg-gray-700 hover:bg-red-700 text-sm rounded-lg text-gray-400 hover:text-white"
            >
              Salir
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-screen-xl mx-auto px-4 py-6">
        {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">{error}</div>}

        {cargando ? (
          <div className="text-center py-20 text-gray-400">Cargando minuta turno {turnoSeleccionado}...</div>
        ) : dias.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-500 mb-4">No hay minuta para el turno <strong>{turnoSeleccionado}</strong></p>
            <button onClick={crearCiclo} className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              Crear ciclo {turnoActual?.diasEnFaena} días
            </button>
          </div>
        ) : (
          <>
            <div className="print:hidden mb-6">
              <Resumen dias={dias} alertas={alertas} />
            </div>

            {vista === 'edicion' && (
              <div className="print:hidden space-y-8">
                {semanas.map((semana, si) => (
                  <div key={si}>
                    <h2 className="text-sm font-bold text-gray-600 uppercase tracking-wider mb-3">
                      Semana {si + 1} · {semana[0]?.fecha} al {semana[semana.length - 1]?.fecha}
                    </h2>
                    <div className="overflow-x-auto pb-2">
                      <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${semana.length}, minmax(140px, 1fr))`, minWidth: `${semana.length * 148}px` }}>
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
                  </div>
                ))}
              </div>
            )}

            {vista === 'analisis' && (
              <Analisis dias={dias} diasMinimos={minuta?.diasMinimosRepeticion || 3} />
            )}

            {vista === 'semanal' && (
              <div className="space-y-8 print:space-y-12">
                {semanas.map((_, si) => (
                  <div key={si} className="bg-white rounded-lg p-6 shadow-sm">
                    <VistaSemanal dias={dias} semana={(si + 1) as 1 | 2} />
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
