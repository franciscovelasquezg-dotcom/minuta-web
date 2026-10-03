'use client'

import { useState, useEffect, useMemo } from 'react'
import { api, Catalogos, Turno } from '@/lib/api'
import { generarMinuta } from '@/lib/generador'
import { DiaMinuta, Servicio } from '@/types/minuta'
import { detectarRepeticiones } from '@/lib/repeticion'
import DiaCard from '@/components/DiaCard'
import AppHeader from '@/components/AppHeader'

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
  const [gapDias, setGapDias] = useState(3)
  const [dias, setDias] = useState<DiaMinuta[]>([])
  const [cargando, setCargando] = useState(true)
  const [generando, setGenerando] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [guardado, setGuardado] = useState(false)
  const [semanaActual, setSemanaActual] = useState(0)

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
    setSemanaActual(0)
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
        diasMinimosRepeticion: gapDias,
        dias: dias.map(d => ({ ...d, servicios: d.servicios.map(s => ({ ...s })) })),
      })
      setGuardado(true)
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
      const t = clasificarTipo(s.platoPrincipal)
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

  const totalServicios = dias.reduce((acc, d) => acc + d.servicios.length, 0)
  const platosUnicos = new Set(dias.flatMap(d => d.servicios.map(s => s.platoPrincipal))).size
  const totalPlatos = dias.flatMap(d => d.servicios.map(s => s.platoPrincipal)).length
  const variedadPct = totalPlatos > 0 ? Math.round(platosUnicos / totalPlatos * 100) : 0
  const asadosDom = dias.filter(d => new Date(d.fecha + 'T12:00:00').getDay() === 0 && d.servicios.some(s => s.platoPrincipal.toLowerCase().includes('asado'))).length

  return (
    <div className="min-h-screen" style={{ background: '#0B0F19', color: '#F1F5F9', fontFamily: 'Manrope, sans-serif' }}>
      <AppHeader activePage="generar" />

      {/* Page title */}
      <div style={{ borderBottom: '1px solid #1E293B', background: '#0F172A' }}>
        <div className="max-w-screen-xl mx-auto px-6 py-4">
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

      <main className="max-w-screen-xl mx-auto px-6 py-6 pt-20">
        {cargando ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <div className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#10B981', borderTopColor: 'transparent' }} />
            <p style={{ color: '#64748B', fontSize: 14 }}>Cargando catálogos desde Sheets...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">

            {/* LEFT — Config panel */}
            <div className="xl:col-span-4 space-y-4">
              <div className="rounded-xl p-5 space-y-4" style={{ background: '#0F172A', border: '1px solid #1E293B' }}>
                <h2 className="font-bold text-white text-sm" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                  Configuración del Ciclo
                </h2>

                <div>
                  <label className="block mb-1.5 font-semibold uppercase tracking-wider" style={{ fontSize: 10, color: '#64748B' }}>Casino / Faena</label>
                  <input value={casino} onChange={e => setCasino(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-sm outline-none transition-colors"
                    style={{ background: '#1E293B', border: '1px solid #334155', color: '#F1F5F9' }}
                    onFocus={e => (e.target.style.borderColor = '#10B981')}
                    onBlur={e => (e.target.style.borderColor = '#334155')} />
                </div>

                <div>
                  <label className="block mb-1.5 font-semibold uppercase tracking-wider" style={{ fontSize: 10, color: '#64748B' }}>Tipo de Turno</label>
                  <select value={turnoSel} onChange={e => setTurnoSel(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                    style={{ background: '#1E293B', border: '1px solid #334155', color: '#F1F5F9' }}>
                    {(catalogos?.turnos || []).map(t => (
                      <option key={t.codigo} value={t.codigo}>{t.codigo} — {t.diasEnFaena} días en faena</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block mb-1.5 font-semibold uppercase tracking-wider" style={{ fontSize: 10, color: '#64748B' }}>Fecha de Inicio del Ciclo</label>
                  <input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                    style={{ background: '#1E293B', border: '1px solid #334155', color: '#F1F5F9' }} />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="font-semibold uppercase tracking-wider" style={{ fontSize: 10, color: '#64748B' }}>Gap Mínimo Repetición</label>
                    <span className="font-bold text-sm" style={{ color: '#10B981' }}>{gapDias} días</span>
                  </div>
                  <input type="range" min={1} max={7} value={gapDias} onChange={e => setGapDias(Number(e.target.value))}
                    className="w-full accent-emerald-500" style={{ accentColor: '#10B981' }} />
                  <div className="flex justify-between mt-1" style={{ fontSize: 10, color: '#475569' }}>
                    <span>1 día</span><span>7 días</span>
                  </div>
                </div>
              </div>

              {/* Catalog stats */}
              {catalogos && (
                <div className="rounded-xl p-4 space-y-3" style={{ background: '#0F172A', border: '1px solid #1E293B' }}>
                  <h3 className="font-semibold text-xs uppercase tracking-wider" style={{ color: '#64748B' }}>Inventario del Catálogo</h3>
                  {[
                    { label: 'Platos Principales', val: catalogos.platos.filter(p => p.activo).length, icon: 'restaurant', color: '#10B981' },
                    { label: 'Ensaladas Activas', val: catalogos.ensaladas.filter(e => e.activo).length, icon: 'eco', color: '#34D399' },
                    { label: 'Acompañamientos', val: catalogos.acompañamientos.filter(a => a.activo).length, icon: 'grain', color: '#F59E0B' },
                  ].map(row => (
                    <div key={row.label} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined" style={{ fontSize: 15, color: row.color }}>{row.icon}</span>
                        <span className="text-xs" style={{ color: '#94A3B8' }}>{row.label}</span>
                      </div>
                      <span className="font-bold text-sm text-white">{row.val}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Generate button */}
              <button onClick={generar} disabled={generando || !catalogos}
                className="w-full py-3 rounded-xl font-bold text-white text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ background: generando ? '#065F46' : 'linear-gradient(135deg,#10B981,#059669)', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                {generando ? (
                  <>
                    <div className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#fff', borderTopColor: 'transparent' }} />
                    Procesando IA...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>auto_awesome</span>
                    Generar Minuta Inteligente
                  </>
                )}
              </button>

              {dias.length > 0 && (
                <div className="rounded-xl p-4" style={{ background: '#082F1E', border: '1px solid #065F46' }}>
                  <div className="flex items-start gap-2">
                    <span className="material-symbols-outlined mt-0.5" style={{ fontSize: 16, color: '#10B981' }}>inventory_2</span>
                    <div>
                      <p className="font-semibold text-sm" style={{ color: '#10B981' }}>Bodega verificada</p>
                      <p className="text-xs mt-0.5" style={{ color: '#34D399' }}>
                        {turnoActual?.diasEnFaena} días · Gap {gapDias}d · {catalogos?.platos.filter(p => p.activo).length} platos disponibles
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT — Preview */}
            <div className="xl:col-span-8 space-y-5">

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
                    <div className="px-4 py-3 flex items-center gap-2" style={{ background: '#0F172A', borderBottom: '1px solid #1E293B' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#10B981' }}>table_chart</span>
                      <span className="font-semibold text-sm text-white">Cronograma Generado</span>
                      <span className="ml-auto text-xs px-2 py-0.5 rounded-full" style={{ background: '#082F1E', color: '#10B981', border: '1px solid #065F46' }}>
                        {dias.length} días
                      </span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full" style={{ borderCollapse: 'collapse', fontSize: 12 }}>
                        <thead>
                          <tr style={{ background: '#0F172A', borderBottom: '2px solid #1E293B' }}>
                            {['#', 'Fecha', 'Servicio', 'Plato Principal', 'Acompañamiento', 'Ensalada'].map(h => (
                              <th key={h} className="px-3 py-2.5 text-left font-semibold uppercase tracking-wider" style={{ color: '#475569', fontSize: 10 }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {dias.map((dia, di) => {
                            const esDomingo = new Date(dia.fecha + 'T12:00:00').getDay() === 0
                            return dia.servicios.map((svc, si) => (
                              <tr key={`${di}-${si}`}
                                style={{
                                  background: esDomingo ? '#271E10' : di % 2 === 0 ? '#0B0F19' : '#0D1320',
                                  borderBottom: '1px solid #1E293B',
                                  borderLeft: esDomingo ? '3px solid #78350F' : undefined,
                                }}>
                                {si === 0 && (
                                  <td rowSpan={dia.servicios.length} className="px-3 py-2 font-bold text-center" style={{ color: '#475569', width: 32, verticalAlign: 'middle' }}>
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
                                  <span className="px-2 py-0.5 rounded text-xs font-semibold uppercase" style={{ background: '#1E293B', color: '#94A3B8' }}>
                                    {svc.tipo}
                                  </span>
                                </td>
                                <td className="px-3 py-2" style={{ maxWidth: 260 }}>
                                  <div className="flex items-center gap-2 flex-nowrap min-w-0">
                                    <span className="truncate" title={svc.platoPrincipal} style={{ color: '#E2E8F0' }}>{svc.platoPrincipal}</span>
                                    <span className={`px-1.5 py-0.5 rounded text-xs font-bold uppercase shrink-0 ${PROT_BADGE[clasificarTipo(svc.platoPrincipal)] || PROT_BADGE.otro}`}>
                                      {clasificarTipo(svc.platoPrincipal)}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-3 py-2 truncate" style={{ color: '#94A3B8', maxWidth: 180 }} title={svc.acompañamiento}>{svc.acompañamiento}</td>
                                <td className="px-3 py-2 truncate" style={{ color: '#94A3B8', maxWidth: 180 }} title={svc.ensalada}>{svc.ensalada}</td>
                              </tr>
                            ))
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
          <div className="max-w-screen-xl mx-auto px-6 py-3 flex items-center justify-between gap-3">
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
