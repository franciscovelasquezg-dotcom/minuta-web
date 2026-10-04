'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { api, invalidarCache, getCatalogosConCache, Catalogos, MinutaAPI, ServicioAPI, Turno } from '@/lib/api'
import { generarPDF } from '@/lib/pdf'
import { detectarRepeticiones } from '@/lib/repeticion'
import { DiaMinuta, Servicio } from '@/types/minuta'
import DiaCard from '@/components/DiaCard'
import Resumen from '@/components/Resumen'
import VistaSemanal from '@/components/VistaSemanal'
import Analisis from '@/components/Analisis'
import { formatFecha } from '@/lib/fecha'

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
      opcionHipo: s.opcionHipo || '',
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
  const [guardado, setGuardado] = useState(false)
  const [error, setError] = useState('')
  const [semanaActual, setSemanaActual] = useState(0)
  const [alertaDismissed, setAlertaDismissed] = useState(false)

  useEffect(() => {
    // Cargar catálogos con stale-while-revalidate + minuta en paralelo
    let minutaCargada = false
    let catalogosCargados = false

    const aplicarCatalogos = (c: Catalogos) => {
      setCatalogos(c)
      setTurnos(c.turnos)
      catalogosCargados = true
      if (minutaCargada) setCargando(false)
    }

    getCatalogosConCache(
      aplicarCatalogos,   // inmediato desde localStorage (0 ms si hay caché)
      aplicarCatalogos,   // refresco en background — actualiza sin spinner
      e => { setError('Error cargando catálogos: ' + e.message); setCargando(false) }
    )

    api.getMinuta(turnoSeleccionado)
      .then(m => {
        setMinuta(m)
        setDias(m.dias.length > 0 ? m.dias.map(apiToDia) : [])
        minutaCargada = true
        if (catalogosCargados) setCargando(false)
      })
      .catch(e => { setError('Error cargando minuta: ' + e.message); setCargando(false) })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const esPrimeraCarga = useRef(true)

  useEffect(() => {
    if (esPrimeraCarga.current) { esPrimeraCarga.current = false; return }
    if (!turnoSeleccionado) return
    setCargando(true)
    setAlertaDismissed(false)
    api.getMinuta(turnoSeleccionado)
      .then(m => { setMinuta(m); setDias(m.dias.length > 0 ? m.dias.map(apiToDia) : []) })
      .catch(() => { setMinuta(null); setDias([]) })
      .finally(() => setCargando(false))
  }, [turnoSeleccionado])

  const alertas = detectarRepeticiones(dias, minuta?.diasMinimosRepeticion || 3)
  // El aviso cuenta platos distintos que incumplen el mínimo (no servicios, ni los 'cercano' que sí cumplen)
  const platosConflicto = new Set(Array.from(alertas).filter(([, nivel]) => nivel === 'repetido').map(([key]) => { const [di, si] = key.split('-').map(Number); return dias[di]?.servicios[si]?.platoPrincipal }))

  const handleChange = useCallback((diaIndex: number, svcIndex: number, campo: keyof Servicio, valor: string) => {
    setGuardado(false)
    setDias(prev => prev.map((d, di) => {
      if (di !== diaIndex) return d
      return { ...d, servicios: d.servicios.map((s, si) => si !== svcIndex ? s : { ...s, [campo]: valor }) }
    }))
  }, [])

  const guardar = async () => {
    if (!minuta || dias.length === 0) return
    setGuardando(true)
    try {
      await api.guardarMinuta({ ...minuta, dias: dias.map(d => ({ ...d, servicios: d.servicios.map(s => s as ServicioAPI) })) })
      invalidarCache()
      setGuardado(true)
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
      setMinuta(m); setDias(m.dias.map(apiToDia))
    } catch (e: unknown) {
      alert('Error: ' + (e instanceof Error ? e.message : String(e)))
    } finally { setCargando(false) }
  }

  const copiarCicloAnterior = async () => {
    if (!minuta || dias.length === 0) return
    const nuevaFecha = prompt('Fecha de inicio del nuevo ciclo (YYYY-MM-DD):', new Date().toISOString().slice(0, 10))
    if (!nuevaFecha) return
    setGuardando(true)
    try {
      const fecha = new Date(nuevaFecha + 'T12:00:00')
      const DIAS_SEMANA = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado']
      const diasCopiados = dias.map((d, i) => {
        const f = new Date(fecha); f.setDate(f.getDate() + i)
        return { ...d, dia: i + 1, fecha: `${String(f.getDate()).padStart(2,'0')}/${String(f.getMonth()+1).padStart(2,'0')}`, diaSemana: DIAS_SEMANA[f.getDay()], servicios: d.servicios.map(s => ({ ...s, estado: 'Por Confirmar' as const })) }
      })
      await api.guardarMinuta({ ...minuta, fechaInicio: nuevaFecha, dias: diasCopiados.map(d => ({ ...d, servicios: d.servicios.map(s => s as ServicioAPI) })) })
      const m = await api.getMinuta(turnoSeleccionado)
      setMinuta(m); setDias(m.dias.map(apiToDia))
      alert('Ciclo copiado ✅')
    } catch (e: unknown) {
      alert('Error: ' + (e instanceof Error ? e.message : String(e)))
    } finally { setGuardando(false) }
  }

  const turnoActual = turnos.find(t => t.codigo === turnoSeleccionado)
  const opcionesPlatos    = catalogos ? catalogos.platos.filter(p => p.activo).map(p => p.nombre) : undefined
  const opcionesEnsaladas = catalogos ? catalogos.ensaladas.filter(e => e.activo).map(e => e.nombre) : undefined
  const opcionesAcomps    = catalogos ? catalogos.acompañamientos.filter(a => a.activo).map(a => a.nombre) : undefined
  const semanas: DiaMinuta[][] = []
  for (let i = 0; i < dias.length; i += 7) semanas.push(dias.slice(i, i + 7))
  const semanaVis = semanas[semanaActual] || []

  const confirmados = dias.flatMap(d => d.servicios).filter(s => s.estado === 'Confirmado').length
  const porConfirmar = dias.flatMap(d => d.servicios).filter(s => s.estado === 'Por Confirmar').length
  const enRevision = dias.flatMap(d => d.servicios).filter(s => s.estado === 'En Revisión').length

  if (cargando && !catalogos) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0B1326' }}>
        <div className="flex items-center gap-3" style={{ color: '#64748B', fontSize: 14 }}>
          <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#10B981', borderTopColor: 'transparent' }} />
          Conectando con Google Sheets...
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: '#0B1326', color: '#F1F5F9', fontFamily: 'Manrope, sans-serif' }}>

      {/* ── Fixed Header (64px) ── */}
      <header className="fixed top-0 w-full z-50" style={{ background: '#0F172A', borderBottom: '1px solid #334155', height: 64 }}>
        <div className="h-full w-full px-6 flex items-center justify-between gap-3">
          {/* Brand */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg,#10B981,#059669)' }}>
              <span className="material-symbols-outlined text-white" style={{ fontSize: 16, fontVariationSettings: "'FILL' 1" }}>restaurant_menu</span>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-white" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 14 }}>Minuta Web</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider hidden sm:inline" style={{ background: '#1E293B', border: '1px solid #334155', color: '#94A3B8' }}>Faena</span>
              </div>
              <span className="text-[11px] hidden sm:block" style={{ color: '#64748B' }}>{minuta?.casino || 'Casino de Faena'}</span>
            </div>
          </div>

          {/* Nav — solo visible en pantallas grandes */}
          <nav className="hidden 2xl:flex items-center gap-0.5 shrink-0 flex-1 justify-center">
            {[
              { label: 'Planificador', href: '/', active: true },
              { label: 'Generar IA', href: '/generar' },
              { label: 'Catálogos', href: '/catalogos' },
              { label: 'Importar', href: '/subir' },
              { label: 'Historial', href: '/historial' },
              { label: 'Análisis', href: '/analisis' },
            ].map(l => (
              <a key={l.href} href={l.href}
                className="px-3 py-1.5 rounded-lg text-sm transition-colors whitespace-nowrap"
                style={l.active
                  ? { background: '#1E293B', color: '#10B981', border: '1px solid rgba(16,185,129,0.3)', fontWeight: 600 }
                  : { color: '#94A3B8' }}>
                {l.label}
              </a>
            ))}
          </nav>

          {/* Right: PDF + status dot + logout */}
          <div className="flex items-center gap-2 shrink-0">
            {dias.length > 0 && (
              <button
                onClick={() => generarPDF(dias, turnoSeleccionado, minuta?.casino || 'Casino', minuta?.fechaInicio || '')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-sm transition-all"
                style={{ background: '#10B981', color: '#0B1326' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>download</span>
                <span className="hidden sm:inline">PDF</span>
              </button>
            )}
            {/* Status dot */}
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg" style={{ background: '#0F172A', border: '1px solid #1E293B' }}>
              <div className="w-2 h-2 rounded-full shrink-0" style={{ background: '#10B981', boxShadow: '0 0 6px rgba(16,185,129,0.8)' }} />
              <span className="text-xs whitespace-nowrap" style={{ color: '#64748B' }}>Live</span>
            </div>
            {/* Logout — siempre visible */}
            <button
              onClick={async () => { await fetch('/api/auth', { method: 'DELETE' }); window.location.href = '/login' }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors"
              style={{ background: '#1E293B', color: '#F87171', border: '1px solid #334155' }}
              title="Cerrar sesión">
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>logout</span>
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Subheader (52px fijo) ── */}
      <div className="fixed z-40 w-full overflow-x-auto" style={{ top: 64, background: '#1E293B', borderBottom: '1px solid #334155', height: 52 }}>
        <div className="h-full px-6 flex items-center gap-3 min-w-max">
          {/* Turno buttons */}
          <div className="flex items-center p-0.5 rounded-lg shrink-0" style={{ background: '#0F172A', border: '1px solid #334155' }}>
            {(turnos.length > 0 ? turnos : [{ codigo: '14x14' }, { codigo: '7x7' }, { codigo: '4x3' }]).map((t: { codigo: string }) => (
              <button key={t.codigo} onClick={() => setTurnoSeleccionado(t.codigo)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-bold transition-all"
                style={turnoSeleccionado === t.codigo
                  ? { background: '#10B981', color: '#0B1326' }
                  : { color: '#94A3B8' }}>
                {turnoSeleccionado === t.codigo && <span className="material-symbols-outlined" style={{ fontSize: 13 }}>check_circle</span>}
                {t.codigo}
              </button>
            ))}
          </div>

          {/* Separador */}
          <div className="w-px h-6 shrink-0" style={{ background: '#334155' }} />

          {/* Fecha ciclo */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="material-symbols-outlined" style={{ fontSize: 15, color: '#10B981' }}>calendar_month</span>
            <span className="font-bold text-white text-sm">{formatFecha(minuta?.fechaInicio, 'dd-mm-yyyy')}</span>
            <span className="text-xs" style={{ color: '#475569' }}>Ciclo activo</span>
          </div>

          {/* Separador */}
          <div className="w-px h-6 shrink-0" style={{ background: '#334155' }} />

          {/* View switcher */}
          <div className="flex items-center p-0.5 rounded-lg shrink-0" style={{ background: '#0F172A', border: '1px solid #334155' }}>
            {([
              { key: 'edicion',  label: 'Tarjetas',  icon: 'view_kanban' },
              { key: 'semanal',  label: 'Semanal',   icon: 'table_rows' },
              { key: 'analisis', label: 'Análisis',  icon: 'monitoring' },
            ] as const).map(v => (
              <button key={v.key} onClick={() => setVista(v.key)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-all whitespace-nowrap"
                style={vista === v.key
                  ? { background: '#1E293B', color: '#fff', border: '1px solid #334155', fontWeight: 600 }
                  : { color: '#64748B' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 14, color: vista === v.key ? '#10B981' : undefined }}>{v.icon}</span>
                {v.label}
              </button>
            ))}
          </div>

          {/* Separador */}
          <div className="w-px h-6 shrink-0" style={{ background: '#334155' }} />

          {/* Acciones */}
          <div className="flex items-center gap-2 shrink-0">
            {dias.length > 0 && (
              <button onClick={copiarCicloAnterior} disabled={guardando}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors disabled:opacity-50"
                style={{ background: '#0F172A', border: '1px solid #334155', color: '#94A3B8' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 15 }}>content_copy</span>
                Copiar
              </button>
            )}
            <button onClick={crearCiclo}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors"
              style={{ background: '#0F172A', border: '1px solid #334155', color: '#94A3B8' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 15 }}>add_circle</span>
              + Ciclo
            </button>
            <button onClick={guardar} disabled={guardando || dias.length === 0}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-bold transition-all disabled:opacity-50"
              style={{ background: guardado ? '#065F46' : '#10B981', color: '#0B1326' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 15 }}>{guardado ? 'check' : 'verified'}</span>
              {guardando ? 'Guardando...' : guardado ? 'Guardado' : 'Guardar'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Main content — offset exacto 64 + 52 = 116px ── */}
      <main className="w-full px-6 py-6" style={{ paddingTop: 116 + 24 }}>
        {error && (
          <div className="mb-4 p-3 rounded-xl text-sm" style={{ background: '#450A0A', border: '1px solid #991B1B', color: '#FCA5A5' }}>{error}</div>
        )}

        {cargando ? (
          <div className="flex items-center justify-center py-32 gap-3" style={{ color: '#64748B' }}>
            <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#10B981', borderTopColor: 'transparent' }} />
            Cargando minuta turno {turnoSeleccionado}...
          </div>
        ) : dias.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl py-24"
            style={{ border: '2px dashed #1E293B', background: '#0A0E1A' }}>
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: 'linear-gradient(135deg,#0F2027,#1E293B)' }}>
              <span className="material-symbols-outlined text-white" style={{ fontSize: 32 }}>restaurant_menu</span>
            </div>
            <p className="font-bold text-white mb-1" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 18 }}>
              Sin minuta para {turnoSeleccionado}
            </p>
            <p className="text-sm mb-6" style={{ color: '#64748B' }}>
              Crea un ciclo nuevo de {turnoActual?.diasEnFaena || '—'} días
            </p>
            <button onClick={crearCiclo}
              className="px-6 py-2.5 rounded-xl font-semibold text-sm"
              style={{ background: '#10B981', color: '#0B1326' }}>
              Crear ciclo {turnoActual?.diasEnFaena} días
            </button>
          </div>
        ) : (
          <>
            {/* Alert banner */}
            {platosConflicto.size > 0 && !alertaDismissed && (
              <section className="mb-5 rounded-xl p-4 shadow-lg" style={{ background: '#291E0A', border: '1px solid #D97706' }}>
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                  <div className="flex items-start md:items-center gap-3">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: 'rgba(245,158,11,0.2)', border: '1px solid rgba(245,158,11,0.4)' }}>
                      <span className="material-symbols-outlined text-amber-400" style={{ fontSize: 22 }}>warning</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-amber-200" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 14 }}>Alerta de Variedad Detectada</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase" style={{ background: 'rgba(120,53,15,0.8)', border: '1px solid rgba(217,119,6,0.6)', color: '#FCD34D' }}>
                          {platosConflicto.size} plato{platosConflicto.size > 1 ? 's' : ''} repetido{platosConflicto.size > 1 ? 's' : ''}
                        </span>
                      </div>
                      <p className="text-sm mt-0.5" style={{ color: 'rgba(254,243,199,0.9)' }}>
                        Se detectaron repeticiones con intervalo inferior al mínimo ({minuta?.diasMinimosRepeticion || 3} días). Detalle en la vista Análisis.
                      </p>
                    </div>
                  </div>
                  <button onClick={() => setAlertaDismissed(true)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors"
                    style={{ color: '#FCD34D' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
                  </button>
                </div>
              </section>
            )}

            {/* KPI strip */}
            <div className="w-full flex items-center justify-between mb-4 px-1">
              <div className="flex items-center gap-3">
                <h2 className="font-bold text-white" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 20 }}>
                  Secuencia de Menús
                </h2>
                <span className="px-2 py-1 rounded text-[11px] font-bold" style={{ background: '#1E293B', border: '1px solid #334155', color: '#64748B' }}>
                  {dias.length} DÍAS · TURNO {turnoSeleccionado}
                </span>
              </div>
              <div className="hidden lg:flex items-center gap-5">
                <div className="flex items-center gap-1.5 text-sm" style={{ color: '#94A3B8' }}>
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#34D399', boxShadow: '0 0 8px rgba(52,211,153,0.6)' }} />
                  Confirmado ({confirmados})
                </div>
                <div className="flex items-center gap-1.5 text-sm" style={{ color: '#94A3B8' }}>
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#38BDF8' }} />
                  En Revisión ({enRevision})
                </div>
                <div className="flex items-center gap-1.5 text-sm" style={{ color: '#94A3B8' }}>
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#FBBF24' }} />
                  Por Confirmar ({porConfirmar})
                </div>
              </div>
            </div>

            {/* Vista edición */}
            {vista === 'edicion' && (
              <>
                <div className="mb-5">
                  <Resumen dias={dias} alertas={alertas} />
                </div>

                {semanas.length > 0 && (
                  <div className="mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined" style={{ fontSize: 15, color: '#10B981' }}>date_range</span>
                    <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#64748B' }}>
                      Semana {semanaActual + 1} · {formatFecha(semanaVis[0]?.fecha)} → {formatFecha(semanaVis[semanaVis.length - 1]?.fecha)}
                    </span>
                    <span className="text-[11px]" style={{ color: '#475569' }}>
                      ({semanaVis.length} días mostrados)
                    </span>
                  </div>
                )}

                <div className="overflow-x-auto pb-2">
                  <div className="flex gap-4" style={{ width: 'max-content' }}>
                    {semanaVis.map((dia, i) => (
                      <DiaCard key={dia.dia} dia={dia} diaIndex={semanaActual * 7 + i} alertas={alertas} onChange={handleChange}
                        opcionesPlatos={opcionesPlatos} opcionesEnsaladas={opcionesEnsaladas} opcionesAcomps={opcionesAcomps} />
                    ))}
                  </div>
                </div>
              </>
            )}

            {vista === 'analisis' && <Analisis dias={dias} diasMinimos={minuta?.diasMinimosRepeticion || 3} />}

            {vista === 'semanal' && (
              <div className="space-y-6">
                {semanas.map((_, si) => (
                  <div key={si} className="rounded-xl p-5" style={{ background: '#0F172A', border: '1px solid #1E293B' }}>
                    <VistaSemanal dias={dias} semana={(si + 1) as 1 | 2} />
                  </div>
                ))}
              </div>
            )}

            {/* Footer pagination rail */}
            {vista === 'edicion' && semanas.length > 1 && (
              <div className="mt-6 flex flex-col md:flex-row items-center justify-between gap-3 px-5 py-4 rounded-xl" style={{ background: '#1E293B', border: '1px solid #334155' }}>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium" style={{ color: '#94A3B8' }}>Navegar Semana:</span>
                  <div className="flex items-center gap-1">
                    {semanas.map((sem, si) => (
                      <button key={si} onClick={() => setSemanaActual(si)}
                        className="px-3 py-1 rounded text-sm font-bold transition-all"
                        style={si === semanaActual
                          ? { background: '#10B981', color: '#0B1326' }
                          : { background: '#0F172A', border: '1px solid #334155', color: '#94A3B8' }}>
                        Sem {si + 1} · {formatFecha(sem[0]?.fecha)}–{formatFecha(sem[sem.length - 1]?.fecha)}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-5 text-xs" style={{ color: '#64748B' }}>
                  <span>Última sync: <strong style={{ color: '#CBD5E1' }}>Sheets Live</strong></span>
                  <span className="flex items-center gap-1" style={{ color: '#10B981', fontWeight: 700 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>verified_user</span>
                    ISO-22000 Conforme
                  </span>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
