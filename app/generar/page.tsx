'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { api, Catalogos, Turno, MinutaAPI, guardarMinutaControlada, FUENTE_LABEL } from '@/lib/api'
import { generarMinuta, OpcionesGeneracion } from '@/lib/generador'
import { aFechaISO, formatFecha } from '@/lib/fecha'
import { DiaMinuta, Servicio } from '@/types/minuta'
import { detectarRepeticiones } from '@/lib/repeticion'
import DiaCard from '@/components/DiaCard'
import AppHeader from '@/components/AppHeader'
import { clasificarProteina } from '@/lib/proteina'

const PROT_BADGE: Record<string, string> = {
  vacuno:   'bg-red-950/80 border border-red-800/60 text-red-400',
  cerdo:    'bg-rose-950/80 border border-rose-800/60 text-rose-300',
  pollo:    'bg-amber-950/80 border border-amber-800/60 text-amber-400',
  pasta:    'bg-orange-950/80 border border-orange-800/60 text-orange-400',
  legumbre: 'bg-emerald-950/80 border border-emerald-800/60 text-emerald-400',
  otro:     'bg-slate-800/80 border border-slate-600/60 text-slate-400',
}

const PROT_BAR: Record<string, string> = {
  vacuno: '#EF4444', cerdo: '#FB7185', pollo: '#F59E0B',
  pasta: '#F97316', legumbre: '#10B981', otro: '#64748B',
}



export default function GenerarPage() {
  const [catalogos, setCatalogos] = useState<Catalogos | null>(null)
  const [turnoSel, setTurnoSel] = useState('14x14')
  const [fechaInicio, setFechaInicio] = useState(() => new Date().toISOString().slice(0, 10))
  const [casino, setCasino] = useState('Casino de Faena')
  const [gapDias, setGapDias] = useState(3)
  const [dias, setDias] = useState<DiaMinuta[]>([])
  const [cargando, setCargando] = useState(true)
  const [generando, setGenerando] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [guardado, setGuardado] = useState(false)
  const [semanaActual, setSemanaActual] = useState(0)
  const [filtroTabla, setFiltroTabla] = useState('')
  // Minuta que hoy está guardada para el turno (la que ven Planificador y Análisis)
  const [actual, setActual] = useState<MinutaAPI | null>(null)
  const router = useRouter()

  useEffect(() => {
    // Turno pedido desde el Planificador o el Análisis (?turno=14x14)
    const t = new URLSearchParams(window.location.search).get('turno')
    api.getCatalogos()
      .then(c => { setCatalogos(c); if (t && c.turnos.some(x => x.codigo === t)) setTurnoSel(t) })
      .finally(() => setCargando(false))
  }, [])

  // Al cambiar de turno, partir desde la minuta actual: mismo casino, fecha y días mínimos
  useEffect(() => {
    let vigente = true
    api.getMinuta(turnoSel).then(m => {
      if (!vigente) return
      setActual(m)
      setDias([]); setGuardado(false)
      if (m.dias.length > 0) {
        if (m.casino) setCasino(m.casino)
        const f = aFechaISO(m.fechaInicio)
        if (f) setFechaInicio(f)
        setGapDias(m.diasMinimosRepeticion || 3)
      }
    }).catch(() => { if (vigente) setActual(null) })
    return () => { vigente = false }
  }, [turnoSel])

  const mismaMinuta = !!actual && actual.dias.length > 0 && aFechaISO(actual.fechaInicio) === fechaInicio
  const confirmadosActual = actual ? actual.dias.reduce((a, d) => a + d.servicios.filter(s => s.estado === 'Confirmado').length, 0) : 0
  const fijosVigentes = mismaMinuta ? confirmadosActual : 0

  const turnoActual: Turno | undefined = catalogos?.turnos.find(t => t.codigo === turnoSel)

  const generar = () => {
    if (!catalogos || !turnoActual) return
    setGenerando(true)
    setGuardado(false)
    setSemanaActual(0)
    setTimeout(() => {
      // Los servicios confirmados de la minuta actual se conservan (solo si es el mismo ciclo)
      const fijos: OpcionesGeneracion['fijos'] = {}
      if (mismaMinuta && actual) actual.dias.forEach((d, di) => d.servicios.forEach(sv => {
        if (sv.estado !== 'Confirmado') return
        fijos[di] = { ...(fijos[di] || {}), [sv.tipo]: { ...sv, postre: sv.postre || 'Por Definir', opcionHipo: sv.opcionHipo || '' } as Servicio }
      }))
      const resultado = generarMinuta(
        catalogos.platos,
        catalogos.ensaladas,
        catalogos.acompañamientos,
        turnoActual,
        fechaInicio,
        casino,
        { gapMin: gapDias, fijos }
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
    if (actual && actual.dias.length > 0 && !mismaMinuta) {
      const ok = window.confirm(`Esto REEMPLAZA la minuta actual del turno ${turnoSel} (inicio ${formatFecha(actual.fechaInicio, 'dd-mm-yyyy')}, ${confirmadosActual} servicios confirmados) por un ciclo nuevo que inicia el ${formatFecha(fechaInicio, 'dd-mm-yyyy')}.\n\nLa anterior queda en Historial. ¿Continuar?`)
      if (!ok) return
    }
    setGuardando(true)
    try {
      const sello = await guardarMinutaControlada({
        turno: turnoSel,
        casino,
        fechaInicio,
        diasMinimosRepeticion: gapDias,
        dias: dias.map(d => ({ ...d, servicios: d.servicios.map(s => ({ ...s })) })),
        actualizado: actual?.actualizado ?? 0,
      }, 'generador')
      if (sello === null) return
      setGuardado(true)
      // Mostrar de inmediato lo cargado en el Planificador (misma hoja que lee el Análisis)
      router.push(`/?turno=${encodeURIComponent(turnoSel)}&cargado=generador`)
    } catch (e: unknown) {
      alert('Error: ' + (e instanceof Error ? e.message : String(e)))
    } finally {
      setGuardando(false)
    }
  }

  const alertas = detectarRepeticiones(dias, gapDias)

  const conteoTipos = useMemo(() => {
    const m: Record<string, number> = {}
    dias.forEach(d => d.servicios.forEach(s => {
      const t = clasificarProteina(s.platoPrincipal)
      m[t] = (m[t] || 0) + 1
    }))
    return m
  }, [dias])
  const totalAsignados = Object.values(conteoTipos).reduce((a, b) => a + b, 0)

  const semanas: DiaMinuta[][] = useMemo(() => {
    const s: DiaMinuta[][] = []
    for (let i = 0; i < dias.length; i += 7) s.push(dias.slice(i, i + 7))
    return s
  }, [dias])

  const diasFiltrados = useMemo(() => {
    const q = filtroTabla.trim().toLowerCase()
    if (!q) return dias.map((dia, di) => ({ dia, di }))
    return dias
      .map((dia, di) => ({ dia, di }))
      .filter(({ dia }) => dia.servicios.some(s =>
        s.platoPrincipal.toLowerCase().includes(q) ||
        clasificarProteina(s.platoPrincipal).includes(q) ||
        s.acompañamiento?.toLowerCase().includes(q) ||
        s.ensalada?.toLowerCase().includes(q)
      ))
  }, [dias, filtroTabla])

  const totalServicios = dias.reduce((acc, d) => acc + d.servicios.length, 0)
  const platosUnicos = new Set(dias.flatMap(d => d.servicios.map(s => s.platoPrincipal))).size
  const totalPlatos = dias.flatMap(d => d.servicios.map(s => s.platoPrincipal)).length
  const variedadPct = totalPlatos > 0 ? Math.round(platosUnicos / totalPlatos * 100) : 0
  const asadosDom = dias.filter(d => d.diaSemana === 'Domingo' && d.servicios.some(s => s.platoPrincipal.toLowerCase().includes('asado'))).length

  return (
    <div className="min-h-screen" style={{ background: '#0B0F19', color: '#F1F5F9', fontFamily: 'Manrope, sans-serif' }}>
      <AppHeader activePage="generar" />

      {/* Page title */}
      <div style={{ borderBottom: '1px solid #1E293B', background: '#0F172A' }}>
        <div className="max-w-[1720px] mx-auto px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined" style={{ color: '#10B981', fontSize: 22 }}>auto_awesome</span>
            <div>
              <h1 className="font-bold text-white" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 20 }}>
                Generador Automático de Minutas de Faena
              </h1>
              <p className="text-xs mt-0.5" style={{ color: '#64748B' }}>
                Motor IA distribuye proteínas, aplica reglas mineras y detecta repeticiones en tiempo real
              </p>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-[1720px] mx-auto px-6 py-6 pt-20">
        {cargando ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <div className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#10B981', borderTopColor: 'transparent' }} />
            <p style={{ color: '#64748B', fontSize: 14 }}>Cargando catálogos desde Sheets...</p>
          </div>
        ) : (
          <div className="space-y-5">

            {/* Minuta actual del turno: qué se va a reemplazar o conservar */}
            {actual && actual.dias.length > 0 && (
              <div className="rounded-xl px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm" style={{ background: '#0F172A', border: `1px solid ${mismaMinuta ? '#065F46' : '#92400E'}` }}>
                <span className="material-symbols-outlined" style={{ fontSize: 18, color: mismaMinuta ? '#10B981' : '#F59E0B' }}>{mismaMinuta ? 'link' : 'swap_horiz'}</span>
                <span className="text-white font-semibold">Minuta actual del turno {turnoSel}: inicia {formatFecha(actual.fechaInicio, 'dd-mm-yyyy')}</span>
                <span style={{ color: '#94A3B8' }}>{actual.dias.length} días · {confirmadosActual} servicios confirmados{actual.fuente ? ` · guardada desde ${FUENTE_LABEL[actual.fuente] || actual.fuente}` : ''}{actual.actualizado ? ` el ${new Date(actual.actualizado).toLocaleString('es-CL')}` : ''}</span>
                <span className="w-full text-xs" style={{ color: mismaMinuta ? '#6EE7B7' : '#FCD34D' }}>
                  {mismaMinuta
                    ? (fijosVigentes > 0 ? `Al generar se conservan los ${fijosVigentes} servicios confirmados (🔒) y se rellena el resto.` : 'Al generar se reemplazan todos los servicios (ninguno está confirmado).')
                    : 'Cambiaste la fecha de inicio: al guardar se creará un ciclo nuevo y la minuta actual pasará al Historial.'}
                </span>
              </div>
            )}

            {/* Barra horizontal de configuración del ciclo */}
            <div className="rounded-xl p-4 lg:p-5" style={{ background: '#0F172A', border: '1px solid #1E293B' }}>
              <div className="flex flex-col xl:flex-row items-stretch xl:items-end justify-between gap-5">
                <div className="flex flex-wrap items-end gap-4">
                  <div className="min-w-[180px]">
                    <label className="block mb-1.5 font-semibold uppercase tracking-wider" style={{ fontSize: 10, color: '#64748B' }}>Casino / Faena</label>
                    <input value={casino} onChange={e => setCasino(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg text-sm outline-none transition-colors"
                      style={{ background: '#1E293B', border: '1px solid #334155', color: '#F1F5F9' }}
                      onFocus={e => (e.target.style.borderColor = '#10B981')}
                      onBlur={e => (e.target.style.borderColor = '#334155')} />
                  </div>

                  <div className="min-w-[200px]">
                    <label className="block mb-1.5 font-semibold uppercase tracking-wider" style={{ fontSize: 10, color: '#64748B' }}>Tipo de Turno</label>
                    <select value={turnoSel} onChange={e => setTurnoSel(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                      style={{ background: '#1E293B', border: '1px solid #334155', color: '#F1F5F9' }}>
                      {(catalogos?.turnos || []).map(t => (
                        <option key={t.codigo} value={t.codigo}>{t.codigo} — {t.diasEnFaena} días en faena</option>
                      ))}
                    </select>
                  </div>

                  <div className="min-w-[170px]">
                    <label className="block mb-1.5 font-semibold uppercase tracking-wider" style={{ fontSize: 10, color: '#64748B' }}>Fecha de Inicio</label>
                    <input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                      style={{ background: '#1E293B', border: '1px solid #334155', color: '#F1F5F9' }} />
                  </div>

                  <div className="min-w-[190px]">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="font-semibold uppercase tracking-wider" style={{ fontSize: 10, color: '#64748B' }}>Gap Mínimo Repetición</label>
                      <span className="font-bold text-sm" style={{ color: '#10B981' }}>{gapDias} días</span>
                    </div>
                    <input type="range" min={1} max={7} value={gapDias} onChange={e => setGapDias(Number(e.target.value))}
                      className="w-full accent-emerald-500" style={{ accentColor: '#10B981' }} />
                  </div>

                  {catalogos && (
                    <div className="flex items-center gap-4 px-3 py-2 rounded-lg" style={{ background: '#090F1D', border: '1px solid #1E293B' }}>
                      {[
                        { label: 'Platos', val: catalogos.platos.filter(p => p.activo).length, icon: 'restaurant', color: '#10B981' },
                        { label: 'Ensaladas', val: catalogos.ensaladas.filter(e => e.activo).length, icon: 'eco', color: '#34D399' },
                        { label: 'Acomp.', val: catalogos.acompañamientos.filter(a => a.activo).length, icon: 'grain', color: '#F59E0B' },
                      ].map(row => (
                        <div key={row.label} className="flex items-center gap-1.5" title={row.label}>
                          <span className="material-symbols-outlined" style={{ fontSize: 15, color: row.color }}>{row.icon}</span>
                          <span className="font-bold text-sm text-white">{row.val}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-3 xl:pt-0 border-t xl:border-t-0" style={{ borderColor: 'rgba(30,41,59,0.6)' }}>
                  {dias.length > 0 && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: '#082F1E', border: '1px solid #065F46' }}>
                      <span className="material-symbols-outlined shrink-0" style={{ fontSize: 16, color: '#10B981' }}>inventory_2</span>
                      <div>
                        <p className="font-semibold text-xs" style={{ color: '#10B981' }}>Bodega verificada</p>
                        <p className="text-[10px]" style={{ color: '#34D399' }}>
                          {turnoActual?.diasEnFaena} días · Gap {gapDias}d · {catalogos?.platos.filter(p => p.activo).length} platos
                        </p>
                      </div>
                    </div>
                  )}
                  <button onClick={generar} disabled={generando || !catalogos}
                    className="flex-1 xl:flex-initial px-5 py-2.5 rounded-xl font-bold text-white text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2 whitespace-nowrap"
                    style={{ background: generando ? '#065F46' : 'linear-gradient(135deg,#10B981,#059669)', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                    {generando ? (
                      <>
                        <div className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#fff', borderTopColor: 'transparent' }} />
                        Procesando IA...
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>auto_awesome</span>
                        {fijosVigentes > 0 ? `Generar (mantiene ${fijosVigentes} 🔒)` : 'Generar Minuta Inteligente'}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Resultado */}
            <div className="space-y-5">

              {dias.length === 0 && !generando && (
                <div className="flex flex-col items-center justify-center rounded-xl py-24"
                  style={{ border: '2px dashed #1E293B', background: '#0A0E1A' }}>
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                    style={{ background: 'linear-gradient(135deg,#064E3B,#065F46)' }}>
                    <span className="material-symbols-outlined text-white" style={{ fontSize: 32 }}>auto_awesome</span>
                  </div>
                  <p className="font-bold text-white mb-1" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 18 }}>
                    Listo para generar
                  </p>
                  <p className="text-sm mb-6" style={{ color: '#64748B' }}>
                    Configura el ciclo y presiona el botón para que la IA cree tu minuta
                  </p>
                  <button onClick={generar} disabled={!catalogos}
                    className="px-6 py-2.5 rounded-xl font-semibold text-sm text-white transition-all disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg,#10B981,#059669)' }}>
                    Generar ahora
                  </button>
                </div>
              )}

              {dias.length > 0 && (
                <>
                  {/* KPI bar — 4 métricas únicas */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: `${dias.length} días / ${totalServicios} servicios`, sub: 'Ciclo completo', icon: 'calendar_month', color: '#10B981' },
                      { label: `${variedadPct}% variedad`, sub: `${platosUnicos} platos únicos`, icon: 'diversity_3', color: '#8B5CF6' },
                      { label: `${alertas.size} alertas`, sub: alertas.size === 0 ? 'Sin repeticiones' : 'Repeticiones detectadas', icon: alertas.size === 0 ? 'check_circle' : 'warning', color: alertas.size === 0 ? '#10B981' : '#F59E0B' },
                      { label: `${asadosDom} asados dom.`, sub: 'Domingos con asado', icon: 'outdoor_grill', color: '#F97316' },
                    ].map(k => (
                      <div key={k.label} className="rounded-xl p-3 flex items-center gap-3" style={{ background: '#0F172A', border: '1px solid #1E293B', borderLeft: `3px solid ${k.color}` }}>
                        <span className="material-symbols-outlined shrink-0" style={{ fontSize: 20, color: k.color }}>{k.icon}</span>
                        <div>
                          <p className="font-bold text-white text-sm leading-tight" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{k.label}</p>
                          <p className="text-[10px] mt-0.5" style={{ color: '#64748B' }}>{k.sub}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Protein distribution (compacta) */}
                  <div className="rounded-xl p-3" style={{ background: '#0F172A', border: '1px solid #1E293B' }}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#64748B' }}>Distribución de Proteínas</span>
                      <div className="flex flex-wrap gap-1.5">
                        {Object.entries(conteoTipos).sort((a, b) => b[1] - a[1]).map(([tipo, count]) => (
                          <span key={tipo} className={`rounded px-2 py-0.5 text-[10px] font-bold flex items-center gap-1 ${PROT_BADGE[tipo] || PROT_BADGE.otro}`}>
                            <span>{count}</span><span className="capitalize">{tipo}</span>
                            <span className="opacity-60">{totalAsignados > 0 ? Math.round(count / totalAsignados * 100) : 0}%</span>
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden flex" style={{ background: '#1E293B' }}>
                      {Object.entries(conteoTipos).sort((a, b) => b[1] - a[1]).map(([tipo, count]) => (
                        <div key={tipo} style={{ width: `${totalAsignados > 0 ? count / totalAsignados * 100 : 0}%`, background: PROT_BAR[tipo] || '#64748B', transition: 'width 0.5s' }} />
                      ))}
                    </div>
                  </div>

                  {/* Schedule table */}
                  <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #1E293B' }}>
                    <div className="px-4 py-3 flex flex-wrap items-center gap-3" style={{ background: '#0F172A', borderBottom: '1px solid #1E293B' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#10B981' }}>table_chart</span>
                      <div>
                        <span className="font-semibold text-sm text-white block">Cronograma Generado — Matriz de Turnos</span>
                        <span className="text-[11px]" style={{ color: '#64748B' }}>{dias.length} días programados (Almuerzo &amp; Cena)</span>
                      </div>
                      <div className="ml-auto flex items-center gap-2">
                        <div className="relative">
                          <span className="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2" style={{ fontSize: 14, color: '#475569' }}>search</span>
                          <input value={filtroTabla} onChange={e => setFiltroTabla(e.target.value)} placeholder="Filtrar plato o proteína..."
                            className="pl-7 pr-2.5 py-1.5 rounded-lg text-xs outline-none w-48"
                            style={{ background: '#090F1D', border: '1px solid #334155', color: '#CBD5E1' }} />
                        </div>
                        <span className="text-xs px-2 py-0.5 rounded-full whitespace-nowrap" style={{ background: '#082F1E', color: '#10B981', border: '1px solid #065F46' }}>
                          {diasFiltrados.length} / {dias.length} días
                        </span>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full" style={{ borderCollapse: 'collapse', fontSize: 12 }}>
                        <thead>
                          <tr style={{ background: '#0F172A', borderBottom: '2px solid #1E293B' }}>
                            {['#', 'Fecha', 'Servicio', 'Plato Principal', 'Acompañamiento', 'Ensalada', 'Validación'].map(h => (
                              <th key={h} className={`px-3 py-2.5 font-semibold uppercase tracking-wider ${h === 'Validación' ? 'text-right' : 'text-left'}`} style={{ color: '#475569', fontSize: 10 }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {diasFiltrados.length === 0 && (
                            <tr><td colSpan={7} className="px-3 py-6 text-center" style={{ color: '#64748B' }}>Sin coincidencias para &quot;{filtroTabla}&quot;</td></tr>
                          )}
                          {diasFiltrados.map(({ dia, di }) => {
                            const esDomingo = dia.diaSemana === 'Domingo'
                            const diaTieneAlerta = dia.servicios.some((_, si) => alertas.has(`${di}-${si}`))
                            return dia.servicios.map((svc, si) => {
                              const nivelAlerta = alertas.get(`${di}-${si}`)
                              return (
                                <tr key={`${di}-${si}`}
                                  style={{
                                    background: diaTieneAlerta ? 'rgba(245,158,11,0.06)' : esDomingo ? '#271E10' : di % 2 === 0 ? '#0B0F19' : '#0D1320',
                                    borderBottom: si === dia.servicios.length - 1 ? '2px solid #1E293B' : '1px solid #1E293B',
                                    borderLeft: diaTieneAlerta ? '3px solid #F59E0B' : esDomingo ? '3px solid #78350F' : undefined,
                                  }}>
                                  {si === 0 && (
                                    <td rowSpan={dia.servicios.length} className="px-3 py-2 font-bold text-center" style={{ color: diaTieneAlerta ? '#FBBF24' : '#475569', width: 32, verticalAlign: 'middle' }}>
                                      {di + 1}
                                    </td>
                                  )}
                                  {si === 0 && (
                                    <td rowSpan={dia.servicios.length} className="px-3 py-2" style={{ verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                                      <div className="flex items-center gap-1.5">
                                        {esDomingo && <span className="material-symbols-outlined" style={{ fontSize: 13, color: '#F59E0B' }}>star</span>}
                                        <span className="font-medium" style={{ color: esDomingo ? '#FDE68A' : '#CBD5E1' }}>{dia.fecha}</span>
                                      </div>
                                    </td>
                                  )}
                                  <td className="px-3 py-2">
                                    <span className="px-2 py-0.5 rounded text-xs font-semibold uppercase" style={{ background: svc.tipo === 'Cena' ? 'rgba(59,130,246,0.1)' : 'rgba(245,158,11,0.1)', color: svc.tipo === 'Cena' ? '#93C5FD' : '#FCD34D', border: `1px solid ${svc.tipo === 'Cena' ? 'rgba(59,130,246,0.2)' : 'rgba(245,158,11,0.2)'}` }}>
                                      {svc.tipo}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2" style={{ maxWidth: 260 }}>
                                    <div className="flex items-center gap-2 flex-nowrap min-w-0">
                                      <span className="truncate" title={svc.platoPrincipal} style={{ color: '#E2E8F0' }}>{svc.platoPrincipal}</span>
                                      <span className={`px-1.5 py-0.5 rounded text-xs font-bold uppercase shrink-0 ${PROT_BADGE[clasificarProteina(svc.platoPrincipal)] || PROT_BADGE.otro}`}>
                                        {clasificarProteina(svc.platoPrincipal)}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="px-3 py-2 truncate" style={{ color: '#94A3B8', maxWidth: 180 }} title={svc.acompañamiento}>{svc.acompañamiento}</td>
                                  <td className="px-3 py-2 truncate" style={{ color: '#94A3B8', maxWidth: 180 }} title={svc.ensalada}>{svc.ensalada}</td>
                                  <td className="px-3 py-2 text-right">
                                    {nivelAlerta ? (
                                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold whitespace-nowrap" style={{ background: 'rgba(245,158,11,0.15)', color: '#FCD34D', border: '1px solid rgba(245,158,11,0.3)' }} title={nivelAlerta === 'repetido' ? 'Repetición con gap menor al mínimo configurado' : 'Repetición cercana al gap mínimo'}>
                                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: '#FCD34D' }} />
                                        {nivelAlerta === 'repetido' ? 'Gap corto' : 'Aviso Gap'}
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold" style={{ color: '#34D399' }}>
                                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#34D399' }} />OK
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              )
                            })
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Editable DiaCards — paginado por semana con scroll horizontal */}
                  <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #1E293B' }}>
                    {/* Semana tabs */}
                    <div className="px-4 py-2 flex items-center gap-2 flex-wrap" style={{ background: '#0F172A', borderBottom: '1px solid #1E293B' }}>
                      <span className="material-symbols-outlined shrink-0" style={{ fontSize: 15, color: '#10B981' }}>view_week</span>
                      <span className="text-xs font-semibold text-white mr-2">Semana:</span>
                      {semanas.map((sem, si) => (
                        <button key={si} onClick={() => setSemanaActual(si)}
                          className="px-3 py-1 rounded-lg text-xs font-bold transition-all"
                          style={semanaActual === si
                            ? { background: '#10B981', color: '#0B1326' }
                            : { background: '#1E293B', color: '#94A3B8', border: '1px solid #334155' }}>
                          S{si + 1} · {sem[0]?.fecha}→{sem[sem.length - 1]?.fecha}
                        </button>
                      ))}
                    </div>
                    {/* Cards con scroll horizontal */}
                    <div className="overflow-x-auto pb-2 px-3 pt-3" style={{ background: '#0B0F19' }}>
                      <div className="flex gap-3" style={{ width: 'max-content' }}>
                        {(semanas[semanaActual] ?? []).map((dia, i) => (
                          <DiaCard
                            key={dia.dia}
                            dia={dia}
                            diaIndex={semanaActual * 7 + i}
                            alertas={alertas}
                            onChange={handleChange}
                            opcionesPlatos={catalogos?.platos.filter(p => p.activo).map(p => p.nombre)}
                            opcionesEnsaladas={catalogos?.ensaladas.filter(e => e.activo).map(e => e.nombre)}
                            opcionesAcomps={catalogos?.acompañamientos.filter(a => a.activo).map(a => a.nombre)}
                          />
                        ))}
                      </div>
                    </div>
                    {/* Prev / Next semana */}
                    <div className="px-4 py-2 flex items-center justify-between" style={{ background: '#0F172A', borderTop: '1px solid #1E293B' }}>
                      <button onClick={() => setSemanaActual(s => Math.max(0, s - 1))} disabled={semanaActual === 0}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-30"
                        style={{ background: '#1E293B', color: '#94A3B8', border: '1px solid #334155' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>chevron_left</span>
                        Anterior
                      </button>
                      <span className="text-xs font-bold" style={{ color: '#64748B' }}>
                        Semana {semanaActual + 1} de {semanas.length}
                      </span>
                      <button onClick={() => setSemanaActual(s => Math.min(semanas.length - 1, s + 1))} disabled={semanaActual === semanas.length - 1}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-30"
                        style={{ background: '#1E293B', color: '#94A3B8', border: '1px solid #334155' }}>
                        Siguiente
                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>chevron_right</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Sticky footer */}
      {dias.length > 0 && (
        <div className="sticky bottom-0 z-30" style={{ background: '#0F172A', borderTop: '1px solid #1E293B' }}>
          <div className="max-w-[1720px] mx-auto px-6 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#10B981' }}>check_circle</span>
              <span className="text-sm font-medium text-white">{dias.length} días generados</span>
              {alertas.size > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: '#451A03', color: '#FCD34D', border: '1px solid #92400E' }}>
                  {alertas.size} alertas
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setDias([])}
                className="px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                style={{ background: '#1E293B', color: '#94A3B8', border: '1px solid #334155' }}>
                Descartar
              </button>
              <button onClick={generar} disabled={generando}
                className="px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
                style={{ background: '#1E293B', color: '#10B981', border: '1px solid #10B981' }}>
                <span className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined" style={{ fontSize: 15 }}>refresh</span>
                  Re-generar
                </span>
              </button>
              <button onClick={guardar} disabled={guardando}
                className="px-5 py-2 rounded-lg text-sm font-bold text-white transition-all disabled:opacity-50 flex items-center gap-2"
                style={{ background: guardado ? '#065F46' : 'linear-gradient(135deg,#10B981,#059669)' }}>
                {guardando ? (
                  <div className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#fff', borderTopColor: 'transparent' }} />
                ) : (
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{guardado ? 'check' : 'upload'}</span>
                )}
                {guardando ? 'Guardando...' : guardado ? 'Guardado en Sheets' : 'Aprobar y Cargar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
