'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { api, MinutaAPI, FUENTE_LABEL } from '@/lib/api'
import AppHeader from '@/components/AppHeader'
import { DiaMinuta } from '@/types/minuta'
import Analisis from '@/components/Analisis'
import { formatFecha } from '@/lib/fecha'

function apiToDia(d: MinutaAPI['dias'][0]): DiaMinuta {
  return {
    dia: d.dia, fecha: d.fecha, diaSemana: d.diaSemana,
    servicios: d.servicios.map(s => ({
      tipo: s.tipo, ensalada: s.ensalada, acompañamiento: s.acompañamiento,
      platoPrincipal: s.platoPrincipal, postre: s.postre || 'Por Definir',
      opcionHipo: s.opcionHipo || '', estado: s.estado as DiaMinuta['servicios'][0]['estado'],
    })),
  }
}

export default function AnalisisPage() {
  const [dias, setDias] = useState<DiaMinuta[]>([])
  const [turno, setTurno] = useState('14x14')
  const [turnos, setTurnos] = useState<{ codigo: string; diasEnFaena: number }[]>([])
  const [diasMinimos, setDiasMinimos] = useState(3)
  const [casino, setCasino] = useState('Casino de Faena')
  const [cargando, setCargando] = useState(true)
  const [origen, setOrigen] = useState('')

  useEffect(() => {
    api.getCatalogos().then(c => setTurnos(c.turnos)).catch(() => {})
  }, [])

  useEffect(() => {
    api.getMinuta(turno).then(m => {
      setDias(m.dias.map(apiToDia))
      setDiasMinimos(m.diasMinimosRepeticion || 3)
      setCasino(m.casino || 'Casino de Faena')
      setOrigen(m.fuente ? `Guardada desde ${FUENTE_LABEL[m.fuente] || m.fuente}${m.actualizado ? ` el ${new Date(m.actualizado).toLocaleString('es-CL')}` : ''}` : '')
    }).catch(() => setDias([])).finally(() => setCargando(false))
  }, [turno])

  const totalServicios = dias.reduce((a, d) => a + d.servicios.length, 0)
  const rango = dias.length > 0 ? `${formatFecha(dias[0].fecha)} → ${formatFecha(dias[dias.length - 1].fecha)}` : ''

  return (
    <>
      <div className="min-h-screen flex flex-col" style={{ background: '#0B1326', fontFamily: 'Manrope, sans-serif', color: '#E2E8F0' }}>
        <AppHeader activePage="analisis" />

        {/* Barra: turno + contexto */}
        <section className="border-b flex flex-wrap items-center justify-between gap-3 px-4 lg:px-6 py-2.5 mt-16" style={{ background: '#080E1C', borderColor: '#22304A' }}>
          <div className="inline-flex flex-wrap p-1 rounded-lg text-sm font-medium" style={{ background: '#0B1326', border: '1px solid #22304A' }}>
            {(turnos.length > 0 ? turnos.map(t => t.codigo) : ['7x7', '14x14', '21x7']).map(c => (
              <button key={c} type="button" onClick={() => { if (c !== turno) { setCargando(true); setTurno(c) } }} className="px-3 min-h-[44px] rounded transition-colors" style={turno === c ? { background: 'rgba(16,185,129,0.15)', color: '#6EE7B7', border: '1px solid rgba(16,185,129,0.40)', fontWeight: 700 } : { color: '#94A3B8', border: '1px solid transparent' }}>
                {c}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs" style={{ color: '#94A3B8' }}>
            <span className="flex items-center gap-1.5"><span className="material-symbols-outlined" style={{ fontSize: 16 }}>domain</span>{casino}</span>
            <span className="flex items-center gap-1.5"><span className="material-symbols-outlined" style={{ fontSize: 16 }}>event_repeat</span>Separación mínima entre platos iguales: <strong className="text-white">{diasMinimos} días</strong></span>
          </div>
        </section>

        <main className="flex-1 px-4 lg:px-6 py-6 flex flex-col gap-5 w-full max-w-[1400px] mx-auto pb-16">
          <div>
            <h1 className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight">Análisis del ciclo</h1>
            {dias.length > 0 && (
              <p className="text-sm mt-1" style={{ color: '#94A3B8' }}>Turno {turno} · {rango} · {dias.length} días · {totalServicios} servicios{origen ? ` · ${origen}` : ''}</p>
            )}
          </div>

          {cargando ? (
            <div className="flex items-center justify-center py-20 gap-3 text-sm" style={{ color: '#64748B' }}>
              <div className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: '#10B981', borderTopColor: 'transparent' }} />
              Cargando minuta...
            </div>
          ) : dias.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <span className="material-symbols-outlined mb-3" style={{ fontSize: 48, color: '#334155' }}>bar_chart</span>
              <p className="text-sm mb-4" style={{ color: '#64748B' }}>No hay minuta guardada para el turno <strong className="text-white">{turno}</strong>. Genérala con IA para poder analizarla.</p>
              <Link href={`/generar?turno=${encodeURIComponent(turno)}`} className="inline-flex items-center gap-2 px-4 min-h-[44px] rounded-lg text-sm font-semibold" style={{ background: '#059669', color: '#fff' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>auto_awesome</span>Generar menú con IA
              </Link>
            </div>
          ) : (
            <Analisis dias={dias} diasMinimos={diasMinimos} />
          )}
        </main>
      </div>
    </>
  )
}