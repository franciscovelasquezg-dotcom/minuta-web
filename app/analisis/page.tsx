'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { api, MinutaAPI } from '@/lib/api'
import AppHeader from '@/components/AppHeader'
import { DiaMinuta } from '@/types/minuta'
import { clasificarProteina } from '@/lib/proteina'

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

interface ItemFreq { nombre: string; total: number; almuerzo: number; cena: number; posiciones: number[] }

function contarFrecuencias(dias: DiaMinuta[], campo: 'platoPrincipal' | 'ensalada' | 'acompañamiento'): ItemFreq[] {
  const mapa = new Map<string, ItemFreq>()
  dias.forEach((dia, di) => {
    dia.servicios.forEach(svc => {
      const val = svc[campo]; if (!val || val === 'Por Definir') return
      if (!mapa.has(val)) mapa.set(val, { nombre: val, total: 0, almuerzo: 0, cena: 0, posiciones: [] })
      const item = mapa.get(val)!; item.total++
      if (svc.tipo === 'Almuerzo') item.almuerzo++; else item.cena++
      item.posiciones.push(di + 1)
    })
  })
  return Array.from(mapa.values()).sort((a, b) => b.total - a.total)
}

function gapMin(pos: number[]): number {
  if (pos.length < 2) return Infinity
  let m = Infinity; for (let i = 1; i < pos.length; i++) m = Math.min(m, pos[i] - pos[i - 1]); return m
}

const PROT_DOT: Record<string, string> = { vacuno: 'bg-red-500', cerdo: 'bg-sky-400', pollo: 'bg-amber-400', pasta: 'bg-violet-500', legumbre: 'bg-emerald-500', pescado: 'bg-blue-400', otro: 'bg-slate-400' }
const PROT_BADGE: Record<string, string> = { vacuno: 'bg-red-950/60 border-red-800/60 text-red-400', cerdo: 'bg-sky-950/60 border-sky-700/60 text-sky-300', pollo: 'bg-amber-950/60 border-amber-700/60 text-amber-300', pasta: 'bg-violet-950/60 border-violet-700/60 text-violet-300', legumbre: 'bg-emerald-950/60 border-emerald-700/60 text-emerald-300', pescado: 'bg-blue-950/60 border-blue-700/60 text-blue-300', otro: 'bg-slate-800/60 border-slate-600/60 text-slate-300' }
const PROT_BAR_COLOR: Record<string, string> = { vacuno: '#EF4444', cerdo: '#60A5FA', pollo: '#F59E0B', pasta: '#A855F7', legumbre: '#10B981', pescado: '#38BDF8', otro: '#94A3B8' }

export default function AnalisisPage() {
  const [dias, setDias] = useState<DiaMinuta[]>([])
  const [turno, setTurno] = useState('14x14')
  const [turnos, setTurnos] = useState<{ codigo: string; diasEnFaena: number }[]>([])
  const [diasMinimos, setDiasMinimos] = useState(3)
  const [casino, setCasino] = useState('Casino de Faena')
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    api.getCatalogos().then(c => setTurnos(c.turnos))
  }, [])

  useEffect(() => {
    setCargando(true)
    api.getMinuta(turno).then(m => {
      setDias(m.dias.map(apiToDia))
      setDiasMinimos(m.diasMinimosRepeticion || 3)
      setCasino(m.casino || 'Casino de Faena')
    }).catch(() => setDias([])).finally(() => setCargando(false))
  }, [turno])

  const platos = contarFrecuencias(dias, 'platoPrincipal')
  const ensaladas = contarFrecuencias(dias, 'ensalada')
  const acomps = contarFrecuencias(dias, 'acompañamiento')

  const porTipo = platos.reduce<Record<string, number>>((acc, p) => {
    const t = clasificarProteina(p.nombre); acc[t] = (acc[t] || 0) + p.total; return acc
  }, {})
  const totalServicios = dias.reduce((a, d) => a + d.servicios.length, 0)
  const confirmados = dias.reduce((a, d) => a + d.servicios.filter(s => s.estado === 'Confirmado').length, 0)
  const repetidos = platos.filter(p => p.total > 1 && gapMin(p.posiciones) < diasMinimos)
  const pendientes = dias.reduce((acc, d) => acc + d.servicios.filter(s => s.platoPrincipal === 'Por Definir').length, 0)
  const maxPlatos = platos[0]?.total || 1
  const pctConfirmados = totalServicios > 0 ? Math.round((confirmados / totalServicios) * 100) : 0

  // Donut SVG circumference = 2π×38 ≈ 238.8
  const circ = 238.8
  let offset = 0
  const donutSegments = Object.entries(porTipo).sort((a, b) => b[1] - a[1]).map(([tipo, count]) => {
    const pct = count / (platos.reduce((a, p) => a + p.total, 0) || 1)
    const dash = pct * circ
    const seg = { tipo, count, pct: Math.round(pct * 100), dash, offset, color: PROT_BAR_COLOR[tipo] || '#94A3B8' }
    offset += dash
    return seg
  })

  // Donut confirmados
  const dashConfirm = (pctConfirmados / 100) * 100

  return (
    <>
      <div className="min-h-screen flex flex-col" style={{ background: '#0B1326', fontFamily: 'Manrope, sans-serif', color: '#E2E8F0' }}>

        <AppHeader activePage="analisis" />

        {/* SubHeader toolbar */}
        <section className="border-b flex flex-wrap items-center justify-between gap-3 px-4 lg:px-6 py-2.5 pt-20"
          style={{ background: '#080E1C', borderColor: '#22304A' }}>
          <div className="flex flex-wrap items-center gap-3">
            {/* Turno tabs */}
            <div className="inline-flex p-1 rounded-lg text-xs font-medium" style={{ background: '#0B1326', border: '1px solid #22304A' }}>
              {turnos.length > 0 ? turnos.map(t => (
                <button key={t.codigo} type="button" onClick={() => setTurno(t.codigo)}
                  className="px-2.5 py-1 rounded transition-colors"
                  style={turno === t.codigo
                    ? { background: 'rgba(16,185,129,0.15)', color: '#6EE7B7', border: '1px solid rgba(16,185,129,0.40)', fontWeight: 600 }
                    : { color: '#94A3B8' }}>
                  {t.codigo}
                </button>
              )) : ['7x7','14x14','21x7'].map(c => (
                <button key={c} type="button" onClick={() => setTurno(c)}
                  className="px-2.5 py-1 rounded transition-colors"
                  style={turno === c
                    ? { background: 'rgba(16,185,129,0.15)', color: '#6EE7B7', border: '1px solid rgba(16,185,129,0.40)', fontWeight: 600 }
                    : { color: '#94A3B8' }}>
                  {c}
                </button>
              ))}
            </div>
            {/* Date badge */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs"
              style={{ background: '#0B1326', border: '1px solid #22304A' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 14, color: '#10B981' }}>calendar_month</span>
              <span className="font-bold" style={{ color: '#F1F5F9', fontFamily: 'monospace' }}>{casino}</span>
              <span style={{ color: '#475569' }}>|</span>
              <span className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider" style={{ color: '#10B981' }}>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                Ciclo Activo
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs" style={{ color: '#64748B' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 14, color: '#10B981' }}>verified_user</span>
            <span>Gap mínimo entre repeticiones: <strong style={{ color: '#F1F5F9' }}>{diasMinimos} días</strong></span>
          </div>
        </section>

        <main className="flex-1 px-4 lg:px-6 py-4 flex flex-col gap-4 w-full max-w-[1920px] mx-auto pb-16">
          {/* Page header */}
          <div className="pt-6 pb-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-emerald-400 text-[11px] font-bold uppercase tracking-wider" style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.30)' }}>Módulo de Auditoría</span>
                <span className="text-slate-400 text-[11px] font-bold tracking-wider">• SEREMI DS 594</span>
              </div>
              <h1 className="text-[36px] font-extrabold text-white tracking-tight leading-tight">Balance Nutricional y Cumplimiento de Minuta</h1>
              <p className="text-[14px] text-slate-400 max-w-3xl">Métricas de variedad, balance de macronutrientes y auditoría de reglas operacionales de faena minera para el ciclo activo.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 p-2 rounded-xl" style={{ background: '#1E293B', border: '1px solid #334155' }}>
              {[
                { icon: 'sync_alt', label: 'Régimen', content: (
                  <select value={turno} onChange={e => setTurno(e.target.value)} className="bg-transparent font-semibold text-white text-[14px] focus:outline-none cursor-pointer">
                    {turnos.map(t => <option key={t.codigo} value={t.codigo} className="bg-[#0F172A]">{t.codigo} ({t.diasEnFaena} días)</option>)}
                  </select>
                )},
                { icon: 'domain', label: 'Faena', content: <span className="font-semibold text-white text-[14px]">{casino}</span> },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg" style={{ background: '#0F172A', border: '1px solid rgba(51,65,85,0.6)' }}>
                  <span className="material-symbols-outlined text-[18px] text-slate-400">{item.icon}</span>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 leading-none">{item.label}</span>
                    {item.content}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {cargando ? (
            <div className="flex items-center justify-center py-20 gap-3 text-sm" style={{ color: '#64748B' }}>
              <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#10B981', borderTopColor: 'transparent' }} />
              Cargando datos de análisis...
            </div>
          ) : dias.length === 0 ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <span className="material-symbols-outlined block mb-3" style={{ fontSize: 48, color: '#334155' }}>bar_chart</span>
                <p className="text-sm mb-3" style={{ color: '#64748B' }}>No hay minuta para el turno <strong style={{ color: '#F1F5F9' }}>{turno}</strong></p>
                <Link href="/" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                  style={{ background: '#059669', color: '#fff' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_back</span>
                  Ir al Planificador
                </Link>
              </div>
            </div>
          ) : (
            <>
              {/* Alert banner — conflicts */}
              {repetidos.length > 0 && (
                <div className="relative overflow-hidden rounded-xl p-3.5"
                  style={{ background: 'linear-gradient(to right, rgba(245,158,11,0.10), rgba(120,53,15,0.20), #131B2E)', border: '1px solid rgba(245,158,11,0.30)' }}>
                  <div className="flex items-start md:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 shrink-0 rounded-lg flex items-center justify-center"
                        style={{ background: 'rgba(245,158,11,0.20)', border: '1px solid rgba(245,158,11,0.40)' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#F59E0B' }}>warning</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#FCD34D' }}>Alerta de Variedad Detectada</span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold tracking-wide"
                            style={{ background: '#F59E0B', color: '#0B1326' }}>
                            {repetidos.length} CONFLICTO{repetidos.length > 1 ? 'S' : ''}
                          </span>
                        </div>
                        <p className="text-xs mt-0.5" style={{ color: 'rgba(253,230,138,0.80)' }}>
                          Repeticiones con intervalo inferior al mínimo exigido ({diasMinimos} días). Revisa las preparaciones marcadas con <span className="font-semibold underline" style={{ color: '#FCD34D' }}>Gap</span>.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Protein overview */}
              <section className="rounded-xl p-4" style={{ background: '#131B2E', border: '1px solid #22304A' }}>
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-4"
                  style={{ borderBottom: '1px solid rgba(34,48,74,0.60)' }}>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-white uppercase tracking-wide">Secuencia de Menús</h2>
                    <span className="text-xs px-2 py-0.5 rounded font-bold" style={{ background: '#1B263E', color: '#94A3B8', fontFamily: 'monospace' }}>
                      {dias.length} DÍAS · TURNO {turno}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs font-medium">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ background: '#10B981', boxShadow: '0 0 4px rgba(16,185,129,0.50)' }} />
                      <span style={{ color: '#94A3B8' }}>Confirmado (<strong style={{ color: '#fff' }}>{confirmados}</strong>)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-sky-400" />
                      <span style={{ color: '#94A3B8' }}>En Revisión (<strong style={{ color: '#fff' }}>0</strong>)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-400" />
                      <span style={{ color: '#94A3B8' }}>Por Confirmar (<strong style={{ color: '#fff' }}>{totalServicios - confirmados}</strong>)</span>
                    </div>
                  </div>
                </div>

                {/* Protein cards */}
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#64748B' }}>Distribución por Tipo de Proteína</h3>
                  <span className="text-[11px] font-bold" style={{ color: '#64748B', fontFamily: 'monospace' }}>
                    Total: {dias.length} Días / {totalServicios} Servicios
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-3">
                  {Object.entries(porTipo).sort((a, b) => b[1] - a[1]).map(([tipo, count]) => {
                    const color = PROT_BAR_COLOR[tipo] || '#94A3B8'
                    const pct = totalServicios > 0 ? Math.round((count / totalServicios) * 100) : 0
                    const estado = pct >= 25 ? 'Equilibrado' : pct >= 10 ? 'Aceptable' : 'Baja Frec.'
                    const estadoColor = pct >= 25 ? color : pct >= 10 ? '#94A3B8' : '#F59E0B'
                    return (
                      <div key={tipo} className="relative overflow-hidden rounded-lg p-3 transition-all"
                        style={{ background: '#0B1326', border: '1px solid #22304A' }}>
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color }}>{tipo}</span>
                            <div className="text-2xl font-black text-white mt-0.5" style={{ fontFamily: 'monospace' }}>{count}</div>
                          </div>
                          <span className="px-2 py-0.5 rounded text-[11px] font-bold"
                            style={{ background: `${color}20`, color: `${color}`, border: `1px solid ${color}40` }}>
                            {pct}%
                          </span>
                        </div>
                        <div className="mt-2 flex items-center justify-between text-[11px]" style={{ color: '#64748B' }}>
                          <span>{count} de {totalServicios}</span>
                          <span style={{ color: estadoColor, fontWeight: 600 }}>{estado}</span>
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 h-1" style={{ background: color }} />
                      </div>
                    )
                  })}
                </div>

                {/* Stacked bar */}
                <div className="w-full h-2.5 rounded-full overflow-hidden flex"
                  style={{ background: '#080E1C', border: '1px solid #22304A' }}>
                  {Object.entries(porTipo).sort((a, b) => b[1] - a[1]).map(([tipo, count]) => (
                    <div key={tipo}
                      style={{ width: `${totalServicios > 0 ? (count / totalServicios) * 100 : 0}%`, background: PROT_BAR_COLOR[tipo] || '#94A3B8', transition: 'width 0.5s' }}
                      title={`${tipo}: ${totalServicios > 0 ? Math.round((count / totalServicios) * 100) : 0}%`}
                    />
                  ))}
                </div>
              </section>

              {/* 3-column detail grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pb-4">
                {/* Col 1: Platos */}
                <section className="flex flex-col rounded-xl overflow-hidden" style={{ border: '1px solid #22304A', background: '#131B2E' }}>
                  <div className="px-4 py-3 flex items-center justify-between" style={{ background: '#080E1C', borderBottom: '1px solid #22304A' }}>
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-sm" style={{ background: '#F59E0B' }} />
                      <h3 className="text-xs font-bold text-white uppercase tracking-wider">Platos Principales</h3>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold"
                      style={{ background: '#0B1326', color: '#94A3B8', border: '1px solid #22304A', fontFamily: 'monospace' }}>
                      {platos.length} Ítems
                    </span>
                  </div>
                  <div className="p-3 flex flex-col gap-2 overflow-y-auto" style={{ maxHeight: 850 }}>
                    {platos.map(item => {
                      const gap = gapMin(item.posiciones)
                      const alerta = item.total > 1 && gap < diasMinimos
                      const cercano = item.total > 1 && !alerta && gap < diasMinimos + 2
                      const proteina = clasificarProteina(item.nombre)
                      const color = PROT_BAR_COLOR[proteina] || '#94A3B8'
                      const pct = Math.round((item.total / (platos.reduce((a,p)=>a+p.total,0)||1)) * 100)
                      return (
                        <div key={item.nombre} className="p-3 rounded-lg transition-all"
                          style={{
                            background: alerta ? 'rgba(120,53,15,0.20)' : '#0B1326',
                            border: alerta ? '2px solid rgba(245,158,11,0.80)' : cercano ? '1px solid rgba(245,158,11,0.40)' : '1px solid #22304A',
                          }}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                              <span className="text-xs font-semibold" style={{ color: alerta ? '#FDE68A' : '#E2E8F0' }}>{item.nombre}</span>
                              {alerta && (
                                <span className="shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-extrabold"
                                  style={{ background: '#F59E0B', color: '#0B1326' }}>
                                  Gap {gap}d
                                </span>
                              )}
                            </div>
                            <span className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold border ${PROT_BADGE[proteina] || PROT_BADGE.otro}`}>
                              {proteina.toUpperCase()}
                            </span>
                          </div>
                          <div className="mt-2 flex items-center gap-2">
                            <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: '#080E1C' }}>
                              <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: alerta ? '#F59E0B' : color }} />
                            </div>
                            <span className="text-[11px] font-bold" style={{ color: alerta ? '#FCD34D' : '#64748B', fontFamily: 'monospace' }}>{pct}%</span>
                          </div>
                          <div className="mt-1.5 flex items-center justify-between text-[11px]" style={{ color: '#64748B', fontFamily: 'monospace' }}>
                            <span className="flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full" style={{ background: alerta ? '#F59E0B' : '#10B981' }} />
                              {item.total} {item.total === 1 ? 'Porción' : 'Porciones'}
                            </span>
                            <span style={{ color: alerta ? '#FCD34D' : '#94A3B8' }}>
                              Días: <strong style={{ color: alerta ? '#fff' : '#CBD5E1' }}>{item.posiciones.join(', ')}</strong>
                              {alerta ? ' (Conflicto)' : ''}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </section>

                {/* Col 2: Acompañamientos */}
                <section className="flex flex-col rounded-xl overflow-hidden" style={{ border: '1px solid #22304A', background: '#131B2E' }}>
                  <div className="px-4 py-3 flex items-center justify-between" style={{ background: '#080E1C', borderBottom: '1px solid #22304A' }}>
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-sm bg-cyan-400" />
                      <h3 className="text-xs font-bold text-white uppercase tracking-wider">Acompañamientos</h3>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold"
                      style={{ background: '#0B1326', color: '#94A3B8', border: '1px solid #22304A', fontFamily: 'monospace' }}>
                      {acomps.length} Ítems
                    </span>
                  </div>
                  <div className="p-3 flex flex-col gap-2 overflow-y-auto" style={{ maxHeight: 850 }}>
                    {acomps.map(item => {
                      const pct = Math.round((item.total / (acomps.reduce((a,p)=>a+p.total,0)||1)) * 100)
                      return (
                        <div key={item.nombre} className="p-3 rounded-lg transition-all group"
                          style={{ background: '#0B1326', border: '1px solid #22304A' }}>
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-xs font-semibold" style={{ color: '#E2E8F0' }}>{item.nombre}</span>
                          </div>
                          <div className="mt-2 flex items-center gap-2">
                            <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: '#080E1C' }}>
                              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: '#22D3EE' }} />
                            </div>
                            <span className="text-[11px] font-bold" style={{ color: '#22D3EE', fontFamily: 'monospace' }}>{pct}%</span>
                          </div>
                          <div className="mt-1.5 flex items-center justify-between text-[11px]" style={{ color: '#64748B', fontFamily: 'monospace' }}>
                            <span className="flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                              {item.total} {item.total === 1 ? 'Porción' : 'Porciones'}
                            </span>
                            <span>Días: <strong style={{ color: '#CBD5E1' }}>{item.posiciones.join(', ')}</strong></span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </section>

                {/* Col 3: Ensaladas */}
                <section className="flex flex-col rounded-xl overflow-hidden" style={{ border: '1px solid #22304A', background: '#131B2E' }}>
                  <div className="px-4 py-3 flex items-center justify-between" style={{ background: '#080E1C', borderBottom: '1px solid #22304A' }}>
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-sm bg-emerald-400" />
                      <h3 className="text-xs font-bold text-white uppercase tracking-wider">Ensaladas &amp; Entrada</h3>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold"
                      style={{ background: '#0B1326', color: '#94A3B8', border: '1px solid #22304A', fontFamily: 'monospace' }}>
                      {ensaladas.length} Ítems
                    </span>
                  </div>
                  <div className="p-3 flex flex-col gap-2 overflow-y-auto" style={{ maxHeight: 850 }}>
                    {ensaladas.map(item => {
                      const pct = Math.round((item.total / (ensaladas.reduce((a,p)=>a+p.total,0)||1)) * 100)
                      return (
                        <div key={item.nombre} className="p-3 rounded-lg transition-all"
                          style={{ background: '#0B1326', border: '1px solid #22304A' }}>
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-xs font-semibold" style={{ color: '#E2E8F0' }}>{item.nombre}</span>
                          </div>
                          <div className="mt-2 flex items-center gap-2">
                            <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: '#080E1C' }}>
                              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: '#10B981' }} />
                            </div>
                            <span className="text-[11px] font-bold" style={{ color: '#10B981', fontFamily: 'monospace' }}>{pct}%</span>
                          </div>
                          <div className="mt-1.5 flex items-center justify-between text-[11px]" style={{ color: '#64748B', fontFamily: 'monospace' }}>
                            <span>1 Servicio</span>
                            <span>Día: <strong style={{ color: '#CBD5E1' }}>{item.posiciones.join(', ')}</strong></span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </section>
              </div>
            </>
          )}
        </main>

        {/* Sticky footer */}
        <footer className="border-t px-4 lg:px-6 py-2.5 mt-auto"
          style={{ background: 'rgba(8,14,28,0.95)', borderColor: '#22304A' }}>
          <div className="max-w-[1920px] mx-auto flex flex-wrap items-center justify-between gap-3 text-xs" style={{ color: '#64748B' }}>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" style={{ boxShadow: '0 0 4px rgba(16,185,129,0.50)' }} />
                Motor Nutricional Faena: <strong style={{ color: '#E2E8F0', fontFamily: 'monospace' }}>v3.4.1</strong>
              </span>
              <span className="hidden sm:inline" style={{ color: '#1E293B' }}>|</span>
              <span className="hidden sm:inline">Turno activo: <strong style={{ color: '#94A3B8' }}>{turno}</strong></span>
            </div>
            <div className="flex items-center gap-3">
              <span className="px-2 py-0.5 rounded text-[11px] font-bold" style={{ background: '#0B1326', border: '1px solid #22304A', fontFamily: 'monospace' }}>
                Platos únicos: <strong style={{ color: '#F1F5F9' }}>{platos.length}</strong>
              </span>
              <Link href="/historial" className="flex items-center gap-1 font-semibold transition-colors"
                style={{ color: '#10B981' }}>
                <span>Ver Historial</span>
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>chevron_right</span>
              </Link>
            </div>
          </div>
        </footer>
      </div>
    </>
  )
}
