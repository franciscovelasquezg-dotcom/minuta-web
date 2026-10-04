'use client'

import { useState, useEffect } from 'react'
import { api, Plato, Ensalada, Acompañamiento, Turno } from '@/lib/api'
import AppHeader from '@/components/AppHeader'
import { POSTRES } from '@/data/catalogos'

import MetasEditor from '@/components/MetasEditor'
import { METAS_INFO } from '@/lib/balance'

type Tab = 'platos' | 'ensaladas' | 'acompañamientos' | 'turnos' | 'postres' | 'metas'

const TIPOS_PLATO = ['vacuno', 'cerdo', 'pollo', 'pasta', 'legumbre', 'otro']
const TIPOS_ENSALADA = ['hojas verdes', 'raíz', 'fresca', 'cocida', 'típica chilena', 'crucífera', 'coles', 'grano', 'legumbre', 'tubérculo', 'crocante', 'otro']
const TIPOS_ACOMP = ['arroz', 'puré', 'pasta', 'papas', 'legumbre', 'otro']

const PROT_BAR: Record<string, string> = { vacuno: 'bg-red-500', cerdo: 'bg-rose-500', pollo: 'bg-amber-400', pasta: 'bg-orange-500', legumbre: 'bg-emerald-500', otro: 'bg-sky-500' }
const PROT_BADGE: Record<string, string> = { vacuno: 'bg-red-950/80 border border-red-800/80 text-red-400', cerdo: 'bg-rose-950/80 border border-rose-800/80 text-rose-300', pollo: 'bg-amber-950/80 border border-amber-700/80 text-amber-300', pasta: 'bg-orange-950/80 border border-orange-700/80 text-orange-300', legumbre: 'bg-emerald-950/80 border border-emerald-700/80 text-emerald-300', otro: 'bg-sky-950/80 border border-sky-700/80 text-sky-300' }
const PROT_DOT: Record<string, string> = { vacuno: 'bg-red-400', cerdo: 'bg-rose-400', pollo: 'bg-amber-400', pasta: 'bg-orange-400', legumbre: 'bg-emerald-400', otro: 'bg-sky-400' }

const dkInput = 'w-full mt-1 border border-[#334155] rounded-lg px-3 py-2 text-sm h-9 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-[#0F172A] text-[#F8FAFC] placeholder:text-slate-500'
const dkTextarea = 'w-full mt-1 border border-[#334155] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-[#0F172A] text-[#F8FAFC] placeholder:text-slate-500 resize-none'
const dkLabel = 'text-[11px] font-bold text-slate-400 uppercase tracking-wide'

function ModalPlato({ plato, onSave, onClose }: { plato: Partial<Plato> | null; onSave: (p: Partial<Plato>) => void; onClose: () => void }) {
  const [form, setForm] = useState<Partial<Plato>>(plato || { nombre: '', tipo: 'vacuno', acompañamientosRecomendados: [], receta: '', activo: true })
  const [acompInput, setAcompInput] = useState((plato?.acompañamientosRecomendados || []).join(', '))
  const set = (k: keyof Plato, v: unknown) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: 'rgba(15,23,42,0.70)' }}>
      <div className="w-full max-w-lg rounded-xl overflow-hidden border border-[#334155]" style={{ background: '#1E293B', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.60)' }}>
        <div className="px-5 py-4 border-b border-[#334155] flex justify-between items-center" style={{ background: '#0F172A' }}>
          <h2 className="font-bold text-white text-sm">{plato?.id ? 'Editar plato' : 'Nuevo plato'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-lg leading-none transition-colors">✕</button>
        </div>
        <div className="p-5 space-y-4">
          <div><label className={dkLabel}>Nombre</label><input value={form.nombre || ''} onChange={e => set('nombre', e.target.value)} className={dkInput} /></div>
          <div>
            <label className={dkLabel}>Tipo proteína</label>
            <select value={form.tipo || 'vacuno'} onChange={e => set('tipo', e.target.value)} className={dkInput}>
              {TIPOS_PLATO.map(t => <option key={t} value={t} style={{ background: '#0F172A' }}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className={dkLabel}>Acompañamientos recomendados <span className="text-slate-500 font-normal normal-case">(separados por coma)</span></label>
            <input value={acompInput} onChange={e => { setAcompInput(e.target.value); set('acompañamientosRecomendados', e.target.value.split(',').map(s => s.trim()).filter(Boolean)) }} placeholder="Arroz blanco, Puré de Papas..." className={dkInput} />
          </div>
          <div><label className={dkLabel}>Receta / Instrucciones</label><textarea value={form.receta || ''} onChange={e => set('receta', e.target.value)} rows={4} placeholder="Descripción de preparación..." className={dkTextarea} /></div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.activo !== false} onChange={e => set('activo', e.target.checked)} className="w-4 h-4 accent-emerald-500" />
            <span className="text-sm text-slate-300">Activo en el catálogo</span>
          </label>
        </div>
        <div className="px-5 py-4 border-t border-[#334155] flex justify-end gap-3" style={{ background: '#0F172A' }}>
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-400 hover:text-white rounded-lg transition-colors">Cancelar</button>
          <button onClick={() => onSave(form)} disabled={!form.nombre} className="px-4 py-2 text-sm bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold disabled:opacity-50 transition-colors">Guardar</button>
        </div>
      </div>
    </div>
  )
}

function ModalSimple({ item, tipo, campos, onSave, onClose }: { item: Partial<Ensalada | Acompañamiento> | null; tipo: string; campos: string[]; onSave: (p: Partial<Ensalada | Acompañamiento>) => void; onClose: () => void }) {
  const [form, setForm] = useState(item || { nombre: '', tipo: campos[0], activo: true })
  const set = (k: string, v: unknown) => setForm((f: typeof form) => ({ ...f, [k]: v }))

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: 'rgba(15,23,42,0.70)' }}>
      <div className="w-full max-w-md rounded-xl overflow-hidden border border-[#334155]" style={{ background: '#1E293B', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.60)' }}>
        <div className="px-5 py-4 border-b border-[#334155] flex justify-between items-center" style={{ background: '#0F172A' }}>
          <h2 className="font-bold text-white text-sm">{(item as { id?: string })?.id ? `Editar ${tipo}` : `Nueva ${tipo}`}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-lg leading-none transition-colors">✕</button>
        </div>
        <div className="p-5 space-y-4">
          <div><label className={dkLabel}>Nombre</label><input value={(form as { nombre?: string }).nombre || ''} onChange={e => set('nombre', e.target.value)} className={dkInput} /></div>
          <div>
            <label className={dkLabel}>Tipo</label>
            <select value={(form as { tipo?: string }).tipo || campos[0]} onChange={e => set('tipo', e.target.value)} className={dkInput}>
              {campos.map(t => <option key={t} value={t} style={{ background: '#0F172A' }}>{t}</option>)}
            </select>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={(form as { activo?: boolean }).activo !== false} onChange={e => set('activo', e.target.checked)} className="w-4 h-4 accent-emerald-500" />
            <span className="text-sm text-slate-300">Activo en el catálogo</span>
          </label>
        </div>
        <div className="px-5 py-4 border-t border-[#334155] flex justify-end gap-3" style={{ background: '#0F172A' }}>
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-400 hover:text-white rounded-lg transition-colors">Cancelar</button>
          <button onClick={() => onSave(form)} disabled={!(form as { nombre?: string }).nombre} className="px-4 py-2 text-sm bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold disabled:opacity-50 transition-colors">Guardar</button>
        </div>
      </div>
    </div>
  )
}

export default function CatalogosPage() {
  const [tab, setTab] = useState<Tab>('platos')
  const [platos, setPlatos] = useState<Plato[]>([])
  const [ensaladas, setEnsaladas] = useState<Ensalada[]>([])
  const [acomps, setAcomps] = useState<Acompañamiento[]>([])
  const [turnos, setTurnos] = useState<Turno[]>([])
  const [postresActivos, setPostresActivos] = useState<Record<string, boolean>>(
    Object.fromEntries(POSTRES.map(p => [p, true]))
  )
  const [cargando, setCargando] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [filtroProteina, setFiltroProteina] = useState('all')
  const [filtroEstado, setFiltroEstado] = useState<'activos' | 'inactivos'>('activos')
  const [modalPlato, setModalPlato] = useState<Partial<Plato> | null | false>(false)
  const [modalEnsalada, setModalEnsalada] = useState<Partial<Ensalada> | null | false>(false)
  const [modalAcomp, setModalAcomp] = useState<Partial<Acompañamiento> | null | false>(false)
  const [guardando, setGuardando] = useState(false)

  const q = busqueda.toLowerCase().trim()
  const platosFiltrados = platos
    .filter(p => filtroEstado === 'activos' ? p.activo : !p.activo)
    .filter(p => filtroProteina === 'all' || p.tipo === filtroProteina)
    .filter(p => !q || p.nombre.toLowerCase().includes(q) || p.tipo.toLowerCase().includes(q))
  const ensaladasFiltradas = ensaladas.filter(e => !q || e.nombre.toLowerCase().includes(q) || e.tipo.toLowerCase().includes(q))
  const acompsFiltrados = acomps.filter(a => !q || a.nombre.toLowerCase().includes(q) || a.tipo.toLowerCase().includes(q))

  useEffect(() => {
    api.getCatalogos().then(c => { setPlatos(c.platos); setEnsaladas(c.ensaladas); setAcomps(c.acompañamientos); setTurnos(c.turnos) }).finally(() => setCargando(false))
  }, [])

  const conGuardado = async (fn: () => Promise<void>) => {
    setGuardando(true)
    try { await fn() } catch (e) { alert(`No se pudo guardar: ${e instanceof Error ? e.message : e}`) } finally { setGuardando(false) }
  }
  const savePlato = (p: Partial<Plato>) => conGuardado(async () => { await api.guardarPlato(p); const c = await api.getCatalogos(); setPlatos(c.platos); setModalPlato(false) })
  const saveEnsalada = (e: Partial<Ensalada>) => conGuardado(async () => { await api.guardarEnsalada(e); const c = await api.getCatalogos(); setEnsaladas(c.ensaladas); setModalEnsalada(false) })
  const saveAcomp = (a: Partial<Acompañamiento>) => conGuardado(async () => { await api.guardarAcompañamiento(a); const c = await api.getCatalogos(); setAcomps(c.acompañamientos); setModalAcomp(false) })
  const toggleActivoPlato = async (p: Plato) => {
    const nuevo = !p.activo
    setPlatos(ps => ps.map(x => x.id === p.id ? { ...x, activo: nuevo } : x))
    try { await api.guardarPlato({ ...p, activo: nuevo }) } catch (e) {
      setPlatos(ps => ps.map(x => x.id === p.id ? { ...x, activo: p.activo } : x))
      alert(`No se pudo cambiar el estado: ${e instanceof Error ? e.message : e}`)
    }
  }
  const deletePlato = async (id: string) => { if (!confirm('¿Eliminar este plato?')) return; await api.eliminarPlato(id); setPlatos(p => p.filter(x => x.id !== id)) }

  const tabDefs: { id: Tab; label: string; icon: string; count: number }[] = [
    { id: 'platos', label: 'Platos Principales', icon: 'dinner_dining', count: platos.length },
    { id: 'acompañamientos', label: 'Acompañamientos', icon: 'rice_bowl', count: acomps.length },
    { id: 'ensaladas', label: 'Ensaladas', icon: 'nutrition', count: ensaladas.length },
    { id: 'turnos', label: 'Turnos y Jornadas', icon: 'schedule', count: turnos.length || 4 },
    { id: 'postres', label: 'Postres y Opciones Saludables', icon: 'icecream', count: POSTRES.length },
    { id: 'metas', label: 'Metas del menú', icon: 'balance', count: METAS_INFO.length },
  ]

  const proteinaPills = [
    { id: 'all', label: 'Todos', count: platos.length },
    { id: 'vacuno', label: 'Vacuno', dot: 'bg-red-400', color: 'border-red-900/60 text-red-300 hover:bg-red-950/40' },
    { id: 'pollo', label: 'Pollo', dot: 'bg-amber-400', color: 'border-amber-900/60 text-amber-300 hover:bg-amber-950/40' },
    { id: 'cerdo', label: 'Cerdo', dot: 'bg-rose-400', color: 'border-rose-900/60 text-rose-300 hover:bg-rose-950/40' },
    { id: 'pasta', label: 'Pasta', dot: 'bg-orange-400', color: 'border-orange-900/60 text-orange-300 hover:bg-orange-950/40' },
    { id: 'legumbre', label: 'Legumbres', dot: 'bg-emerald-400', color: 'border-emerald-900/60 text-emerald-300 hover:bg-emerald-950/40' },
  ]

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
      <div className="min-h-screen" style={{ background: '#0B0F19', fontFamily: 'Manrope, sans-serif', color: '#F8FAFC' }}>

        <AppHeader activePage="catalogos" />

        <main className="w-full pt-16">
          {/* Status ribbon */}
          <div className="px-8 py-3 border-b border-[#334155] flex flex-wrap items-center justify-between gap-3" style={{ background: '#0F172A' }}>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-2 py-1 rounded-full text-slate-300 text-[11px] font-bold uppercase tracking-wider" style={{ background: '#1E293B', border: '1px solid #334155' }}>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse inline-block"></span>
                Maestro Activo • Rev 2025.4
              </div>
              <div className="hidden lg:flex items-center gap-2 text-slate-400 text-xs">
                <span>Faena Spence (2.400 msnm)</span>
                <span>•</span>
                <span>Acreditación HACCP Operativa</span>
              </div>
            </div>
            <div className="flex items-center gap-5">
              <div className="flex items-center gap-1.5 text-slate-300 text-[13px] font-semibold">
                <span className="material-symbols-outlined text-[18px] text-emerald-400">verified_user</span>
                <span>Gramajes y Alérgenos Estandarizados</span>
              </div>
              <span className="text-slate-400 text-[13px] font-semibold">Última sync: Hoy, 05:40 AM</span>
            </div>
          </div>

          {/* Page header */}
          <div className="px-8 pt-5 pb-4 flex flex-col md:flex-row md:items-end justify-between gap-5">
            <div className="flex flex-col gap-1 max-w-3xl">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-400">Módulo de Producción &amp; Dietética</span>
                <span className="text-slate-500 text-xs">•</span>
                <span className="text-[11px] text-slate-400 uppercase tracking-wider">Fichas Técnicas Calificadas</span>
              </div>
              <h1 className="text-[28px] font-bold text-white tracking-tight leading-9">Catálogos Maestros de Casino</h1>
              <p className="text-[14px] text-slate-400">Base de datos homologada de recetas, proteínas, acompañamientos y parámetros de faena para servicios de alto rendimiento.</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button className="inline-flex items-center gap-2 px-3 py-2.5 rounded-lg text-slate-200 text-[13px] font-semibold hover:text-white transition-colors shadow-sm" style={{ background: '#1E293B', border: '1px solid #334155' }}>
                <span className="material-symbols-outlined text-[18px] text-slate-300">history</span>
                <span>Historial de Versiones</span>
              </button>
              <button onClick={() => { if (tab === 'platos') setModalPlato(null); else if (tab === 'ensaladas') setModalEnsalada(null); else if (tab === 'acompañamientos') setModalAcomp(null) }} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[16px] font-semibold transition-all active:scale-[0.98]" style={{ boxShadow: '0 10px 15px -3px rgba(5,150,105,0.25)' }}>
                <span className="material-symbols-outlined text-[20px]">add</span>
                <span>+ Agregar Nuevo</span>
              </button>
            </div>
          </div>

          {/* Metric tiles */}
          <div className="px-8 py-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'Platos Registrados', value: platos.length, sub: '100% Homologados', subColor: 'text-emerald-400', icon: 'restaurant_menu', iconColor: 'text-emerald-400' },
              { label: 'Estado Operativo', value: platos.filter(p => p.activo).length, sub: `Activos / ${platos.filter(p => !p.activo).length} En Revisión`, subColor: 'text-emerald-400', icon: 'check_circle', iconColor: 'text-emerald-400' },
              { label: 'Aporte Calórico Promedio', value: '820', sub: 'kcal / ración', subColor: 'text-slate-400', icon: 'bolt', iconColor: 'text-amber-400' },
              { label: 'Acompañamientos Activos', value: acomps.filter(a => a.activo).length, sub: 'Guarniciones base', subColor: 'text-slate-300', icon: 'skillet', iconColor: 'text-sky-400' },
            ].map((tile, i) => (
              <div key={i} className="p-3 rounded-xl flex items-center justify-between" style={{ background: '#1E293B', border: '1px solid #334155' }}>
                <div className="flex flex-col">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{tile.label}</span>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="text-[36px] font-bold leading-none text-[#F8FAFC]">{tile.value}</span>
                    <span className={`text-[11px] font-bold ${tile.subColor}`}>{tile.sub}</span>
                  </div>
                </div>
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${tile.iconColor}`} style={{ background: '#0F172A', border: '1px solid #334155' }}>
                  <span className="material-symbols-outlined text-[22px]">{tile.icon}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="px-8 mt-4">
            <div className="flex items-center gap-1 overflow-x-auto border-b border-[#334155]">
              {tabDefs.map(t => (
                <button key={t.id} onClick={() => setTab(t.id)} className={`relative pb-3 pt-2 px-3 whitespace-nowrap flex items-center gap-2 transition-colors text-[16px] font-semibold ${tab === t.id ? 'text-emerald-400' : 'text-slate-400 hover:text-slate-100'}`}>
                  <span className="material-symbols-outlined text-[20px]">{t.icon}</span>
                  <span>{t.label}</span>
                  <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${tab === t.id ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'text-slate-300 border border-[#334155]'}`} style={tab !== t.id ? { background: '#1E293B' } : {}}>{t.count}</span>
                  {tab === t.id && <span className="absolute bottom-[-1px] left-0 right-0 h-[2.5px] bg-emerald-400 rounded-t-full" style={{ boxShadow: '0 -1px 6px rgba(16,185,129,0.5)' }}></span>}
                </button>
              ))}
            </div>
          </div>

          {/* Toolbar */}
          {(tab === 'platos' || tab === 'ensaladas' || tab === 'acompañamientos') && (
            <div className="px-8 py-3">
              <div className="p-3 rounded-xl flex flex-col gap-3" style={{ background: '#1E293B', border: '1px solid #334155' }}>
                <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
                  <div className="relative flex-1 min-w-[280px]">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">search</span>
                    <input value={busqueda} onChange={e => setBusqueda(e.target.value)} className="w-full pl-10 pr-3 py-2 text-[14px] text-white rounded-lg transition-all focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 placeholder:text-slate-500" style={{ background: '#0F172A', border: '1px solid #334155' }} placeholder="Buscar receta, ingrediente o código de ficha..." />
                  </div>
                  {tab === 'platos' && (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-slate-400 text-[11px] font-bold uppercase tracking-wider">Estado:</span>
                      <div className="inline-flex p-1 rounded-lg" style={{ background: '#0F172A', border: '1px solid #334155' }}>
                        <button onClick={() => setFiltroEstado('activos')} className={`px-3 py-1 rounded-md text-[13px] font-semibold transition-colors ${filtroEstado === 'activos' ? 'text-emerald-400 font-bold border border-[#334155]/60' : 'text-slate-400 hover:text-white'}`} style={filtroEstado === 'activos' ? { background: '#1E293B' } : {}}>Activos ({platos.filter(p => p.activo).length})</button>
                        <button onClick={() => setFiltroEstado('inactivos')} className={`px-3 py-1 rounded-md text-[13px] font-semibold transition-colors ${filtroEstado === 'inactivos' ? 'text-emerald-400 font-bold border border-[#334155]/60' : 'text-slate-400 hover:text-white'}`} style={filtroEstado === 'inactivos' ? { background: '#1E293B' } : {}}>Inactivos ({platos.filter(p => !p.activo).length})</button>
                      </div>
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-slate-300 text-[13px] font-semibold" style={{ background: '#0F172A', border: '1px solid #334155' }}>
                        <span className="material-symbols-outlined text-[16px] text-emerald-400">inventory_2</span>
                        <span>{platos.length} platos disponibles • {TIPOS_PLATO.length - 1} categorías de proteínas</span>
                      </div>
                    </div>
                  )}
                </div>
                {tab === 'platos' && (
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <span className="text-slate-400 text-[11px] font-bold uppercase tracking-wider mr-1">Proteína:</span>
                    {proteinaPills.map(pill => (
                      <button key={pill.id} onClick={() => setFiltroProteina(pill.id)} className={`px-3 py-1 rounded-full text-[13px] font-semibold transition-all flex items-center gap-1.5 ${filtroProteina === pill.id ? 'bg-emerald-600 text-white shadow-sm' : `bg-[#0F172A] border ${pill.color || ''}`}`}>
                        {pill.dot && <span className={`w-2 h-2 rounded-full ${pill.dot} inline-block`}></span>}
                        <span>{pill.label}</span>
                        {pill.count !== undefined && <span className="text-xs font-bold text-emerald-300">({pill.count})</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Content area */}
          {cargando ? (
            <div className="flex items-center justify-center py-20 text-slate-400 text-sm gap-3">
              <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
              Cargando catálogos...
            </div>
          ) : (
            <div className="px-8 pb-6">
              {/* PLATOS — tabla */}
              {tab === 'platos' && (
                <div className="w-full rounded-xl overflow-hidden" style={{ background: '#1E293B', border: '1px solid #334155', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.30)' }}>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse" style={{ minWidth: '900px' }}>
                      <thead>
                        <tr className="border-b border-[#334155] text-slate-300 text-[11px] font-bold uppercase tracking-wider" style={{ background: '#0F172A' }}>
                          <th className="py-3 px-5 w-[30%]">Nombre del Plato</th>
                          <th className="py-3 px-3 w-[12%]">Categoría</th>
                          <th className="py-3 px-3 w-[25%]">Acompañamientos Sugeridos</th>
                          <th className="py-3 px-3 w-[22%]">Receta / Especificación</th>
                          <th className="py-3 px-3 text-center w-[6%]">Estado</th>
                          <th className="py-3 px-5 text-right w-[5%]">Acciones</th>
                        </tr>
                      </thead>
                      <tbody style={{ borderColor: '#334155' }}>
                        {platosFiltrados.map((p, i) => (
                          <tr key={p.id} className="transition-colors group" style={{ background: i % 2 === 0 ? '#1E293B' : '#172033' }} onMouseEnter={e => (e.currentTarget.style.background = '#243347')} onMouseLeave={e => (e.currentTarget.style.background = i % 2 === 0 ? '#1E293B' : '#172033')}>
                            <td className="py-3 px-5 align-top border-t border-[#334155]">
                              <div className="flex items-start gap-3">
                                <div className={`w-1.5 h-10 rounded-full shrink-0 mt-0.5 ${PROT_BAR[p.tipo] || PROT_BAR.outro}`}></div>
                                <div className="flex flex-col">
                                  <span className="text-[16px] font-semibold text-white group-hover:text-emerald-400 transition-colors leading-tight">{p.nombre}</span>
                                  <span className="text-slate-400 text-[11px] mt-0.5">Tipo: {p.tipo}</span>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-3 align-top border-t border-[#334155]">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide ${PROT_BADGE[p.tipo] || PROT_BADGE.otro}`}>
                                <span className={`w-2 h-2 rounded-full inline-block ${PROT_DOT[p.tipo] || 'bg-sky-400'}`}></span>
                                {p.tipo}
                              </span>
                            </td>
                            <td className="py-3 px-3 align-top border-t border-[#334155]">
                              <div className="flex flex-wrap gap-1.5">
                                {p.acompañamientosRecomendados.length > 0 ? p.acompañamientosRecomendados.map(a => (
                                  <span key={a} className="px-2 py-1 rounded text-slate-300 text-[11px] font-semibold" style={{ background: '#0F172A', border: '1px solid #334155' }}>{a}</span>
                                )) : <span className="text-slate-500 text-xs">—</span>}
                              </div>
                            </td>
                            <td className="py-3 px-3 align-top border-t border-[#334155]">
                              <p className="text-[12px] text-slate-400 leading-relaxed line-clamp-2">{p.receta || '—'}</p>
                            </td>
                            <td className="py-3 px-3 align-top border-t border-[#334155] text-center">
                              <button type="button" role="switch" aria-checked={p.activo} onClick={() => toggleActivoPlato(p)} title={p.activo ? 'Desactivar' : 'Activar'} className={`relative inline-flex h-6 w-11 rounded-full cursor-pointer transition-colors ${p.activo ? 'bg-emerald-500' : 'bg-slate-600'}`} style={{ outline: p.activo ? '1px solid rgba(52,211,153,0.40)' : 'none' }}>
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white mt-1 shadow-sm transition-transform ${p.activo ? 'translate-x-6 ml-0.5' : 'translate-x-1'}`}></span>
                              </button>
                              <span className={`block text-[10px] font-bold uppercase tracking-wider mt-0.5 ${p.activo ? 'text-emerald-400' : 'text-slate-400'}`}>{p.activo ? 'Activo' : 'Inactivo'}</span>
                            </td>
                            <td className="py-3 px-5 align-top border-t border-[#334155] text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button onClick={() => setModalPlato(p)} className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 transition-colors" style={{ '--hover-bg': '#0F172A' } as React.CSSProperties} title="Editar">
                                  <span className="material-symbols-outlined text-[18px]">edit</span>
                                </button>
                                <button onClick={() => deletePlato(p.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 transition-colors" title="Eliminar">
                                  <span className="material-symbols-outlined text-[18px]">delete</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {platosFiltrados.length === 0 && (
                          <tr><td colSpan={6} className="py-12 text-center text-slate-400 text-sm">No se encontraron platos</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  {/* Footer tabla */}
                  <div className="p-3 border-t border-[#334155] flex flex-col md:flex-row items-center justify-between gap-3" style={{ background: '#0F172A' }}>
                    <div className="flex items-center gap-2 text-slate-400 text-xs">
                      <span>Mostrando</span>
                      <span className="font-bold text-white">{platosFiltrados.length}</span>
                      <span>de</span>
                      <span className="font-bold text-white">{platos.length}</span>
                      <span>platos homologados</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-300 text-[13px] font-semibold hover:text-white transition-colors" style={{ background: '#1E293B', border: '1px solid #334155' }}>
                        <span className="material-symbols-outlined text-[16px] text-emerald-400">table_view</span>
                        <span>Exportar Excel</span>
                      </button>
                      <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-300 text-[13px] font-semibold hover:text-white transition-colors" style={{ background: '#1E293B', border: '1px solid #334155' }}>
                        <span className="material-symbols-outlined text-[16px] text-slate-400">print</span>
                        <span>Imprimir Recetario</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ENSALADAS */}
              {tab === 'ensaladas' && (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-slate-400 text-xs">{ensaladasFiltradas.length} de {ensaladas.length} ensaladas</span>
                    <button onClick={() => setModalEnsalada(null)} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[13px] font-semibold transition-colors">
                      <span className="material-symbols-outlined text-[18px]">add</span>
                      <span>+ Nueva ensalada</span>
                    </button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {ensaladasFiltradas.map(e => (
                      <div key={e.id} className={`rounded-xl p-3 flex items-start justify-between transition-colors ${!e.activo ? 'opacity-50' : ''}`} style={{ background: '#1E293B', border: '1px solid #334155' }}>
                        <div>
                          <p className="text-[14px] font-semibold text-white">{e.nombre}</p>
                          <span className="inline-block mt-1 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-700/80">{e.tipo}</span>
                        </div>
                        <button onClick={() => setModalEnsalada(e)} className="p-1 text-slate-400 hover:text-emerald-400 shrink-0 transition-colors">
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ACOMPAÑAMIENTOS */}
              {tab === 'acompañamientos' && (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-slate-400 text-xs">{acompsFiltrados.length} de {acomps.length} acompañamientos</span>
                    <button onClick={() => setModalAcomp(null)} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[13px] font-semibold transition-colors">
                      <span className="material-symbols-outlined text-[18px]">add</span>
                      <span>+ Nuevo acompañamiento</span>
                    </button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {acompsFiltrados.map(a => (
                      <div key={a.id} className={`rounded-xl p-3 flex items-start justify-between transition-colors ${!a.activo ? 'opacity-50' : ''}`} style={{ background: '#1E293B', border: '1px solid #334155' }}>
                        <div>
                          <p className="text-[14px] font-semibold text-white">{a.nombre}</p>
                          <span className="inline-block mt-1 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-sky-950/80 text-sky-300 border border-sky-700/80">{a.tipo}</span>
                        </div>
                        <button onClick={() => setModalAcomp(a)} className="p-1 text-slate-400 hover:text-emerald-400 shrink-0 transition-colors">
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TURNOS */}
              {tab === 'turnos' && (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <p className="text-white font-semibold text-sm">{turnos.length} turnos registrados</p>
                      <p className="text-slate-400 text-xs mt-0.5">Los turnos se gestionan desde el servidor de configuración central.</p>
                    </div>
                  </div>
                  {turnos.length === 0 ? (
                    <div className="py-16 text-center text-slate-400 text-sm">No hay turnos cargados</div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {turnos.map(t => {
                        const totalServicios = (t.diasEnFaena ?? 0) * 2
                        return (
                          <div key={t.codigo} className="rounded-xl overflow-hidden flex flex-col" style={{ background: '#1E293B', border: `1px solid ${t.activo ? 'rgba(16,185,129,0.35)' : '#334155'}` }}>
                            {/* Card header */}
                            <div className="px-4 py-3 border-b flex items-center justify-between" style={{ background: '#0F172A', borderColor: '#334155' }}>
                              <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-[20px] text-emerald-400">schedule</span>
                                <span className="font-bold text-white text-sm tracking-wide">{t.codigo}</span>
                              </div>
                              <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${t.activo ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-700/60' : 'bg-slate-800 text-slate-400 border border-slate-600/60'}`}>
                                {t.activo ? 'Activo' : 'Inactivo'}
                              </div>
                            </div>
                            {/* Card body */}
                            <div className="px-4 py-3 flex flex-col gap-3 flex-1">
                              <p className="text-[14px] font-semibold text-white leading-tight">{t.nombre}</p>
                              <div className="grid grid-cols-3 gap-2">
                                <div className="flex flex-col items-center p-2 rounded-lg" style={{ background: '#0F172A', border: '1px solid #334155' }}>
                                  <span className="text-[22px] font-bold text-emerald-400 leading-none">{t.diasEnFaena}</span>
                                  <span className="text-[9px] font-bold uppercase tracking-wide text-slate-400 mt-0.5 text-center leading-tight">Días<br/>Faena</span>
                                </div>
                                <div className="flex flex-col items-center p-2 rounded-lg" style={{ background: '#0F172A', border: '1px solid #334155' }}>
                                  <span className="text-[22px] font-bold text-sky-400 leading-none">{t.diasDescanso}</span>
                                  <span className="text-[9px] font-bold uppercase tracking-wide text-slate-400 mt-0.5 text-center leading-tight">Días<br/>Descanso</span>
                                </div>
                                <div className="flex flex-col items-center p-2 rounded-lg" style={{ background: '#0F172A', border: '1px solid #334155' }}>
                                  <span className="text-[22px] font-bold text-amber-400 leading-none">{totalServicios}</span>
                                  <span className="text-[9px] font-bold uppercase tracking-wide text-slate-400 mt-0.5 text-center leading-tight">Total<br/>Servicios</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                                <span className="material-symbols-outlined text-[14px] text-slate-500">info</span>
                                <span>{t.diasEnFaena}×2 servicios/día (Almuerzo + Cena)</span>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* POSTRES */}
              {tab === 'postres' && (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-slate-400 text-xs">{POSTRES.filter(p => postresActivos[p]).length} de {POSTRES.length} postres activos</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {POSTRES.map(postre => {
                      const activo = postresActivos[postre] !== false
                      return (
                        <div key={postre} className={`rounded-xl p-3 flex items-start justify-between transition-colors ${!activo ? 'opacity-50' : ''}`} style={{ background: '#1E293B', border: '1px solid #334155' }}>
                          <div className="flex items-start gap-2">
                            <span className="material-symbols-outlined text-[18px] text-amber-400 shrink-0 mt-0.5">icecream</span>
                            <div>
                              <p className="text-[14px] font-semibold text-white leading-tight">{postre}</p>
                              <span className="inline-block mt-1 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-amber-950/80 text-amber-300 border border-amber-700/80">Postre</span>
                            </div>
                          </div>
                          <button
                            onClick={() => setPostresActivos(prev => ({ ...prev, [postre]: !prev[postre] }))}
                            className={`relative inline-flex h-5 w-9 rounded-full cursor-pointer transition-colors shrink-0 mt-0.5 ${activo ? 'bg-emerald-500' : 'bg-slate-600'}`}
                            title={activo ? 'Desactivar' : 'Activar'}
                          >
                            <span className={`inline-block h-3 w-3 transform rounded-full bg-white mt-1 shadow-sm transition-transform ${activo ? 'translate-x-5 ml-0.5' : 'translate-x-1'}`}></span>
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* METAS DEL MENÚ */}
              {tab === 'metas' && <MetasEditor />}
            </div>
          )}

          {/* Banner bromatológico */}
          <div className="px-8 pb-8">
            <div className="p-5 rounded-xl flex flex-col lg:flex-row items-center justify-between gap-5" style={{ background: 'linear-gradient(to right, #1E293B, #162238, #1E293B)', border: '1px solid #334155', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.20)' }}>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 text-emerald-400" style={{ background: 'rgba(16,185,129,0.20)', border: '1px solid rgba(16,185,129,0.40)' }}>
                  <span className="material-symbols-outlined text-[26px]">health_and_safety</span>
                </div>
                <div>
                  <h2 className="text-[20px] font-semibold text-white">Validación Bromatológica &amp; Estándar de Faena Minera</h2>
                  <p className="text-[14px] text-slate-400 mt-0.5">Todas las recetas del catálogo consideran un mínimo de 3.200 kcal/día distribuido en 4 servicios obligatorios según norma técnica de faenas de altura geográfica.</p>
                </div>
              </div>
              <button className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-emerald-400 text-[13px] font-semibold hover:bg-emerald-950/40 transition-all shrink-0" style={{ background: '#0F172A', border: '1px solid rgba(16,185,129,0.40)' }}>
                <span className="material-symbols-outlined text-[18px]">verified</span>
                <span>Manual de Inocuidad</span>
              </button>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="w-full py-5 border-t border-[#334155]" style={{ background: '#0F172A' }}>
          <div className="w-full px-8 flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-[16px] font-semibold text-white">Minuta Web</span>
              <span className="text-slate-400 text-xs">• Sistema Operativo de Servicios Gastronómicos y Minería</span>
            </div>
            <div className="flex items-center gap-5 text-slate-400 text-[13px] font-semibold">
              <span className="flex items-center gap-1 text-slate-300"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block"></span> Sincronizado en línea</span>
              <span>Cumplimiento Sanitario Seremi v4.8</span>
              <span>© 2025 Minuta Web Industrial.</span>
            </div>
          </div>
        </footer>
      </div>

      {modalPlato !== false && <ModalPlato plato={modalPlato} onSave={savePlato} onClose={() => setModalPlato(false)} />}
      {modalEnsalada !== false && <ModalSimple item={modalEnsalada} tipo="ensalada" campos={TIPOS_ENSALADA} onSave={saveEnsalada} onClose={() => setModalEnsalada(false)} />}
      {modalAcomp !== false && <ModalSimple item={modalAcomp} tipo="acompañamiento" campos={TIPOS_ACOMP} onSave={saveAcomp} onClose={() => setModalAcomp(false)} />}

      {guardando && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: 'rgba(15,23,42,0.70)' }}>
          <div className="px-6 py-4 rounded-xl text-sm font-semibold text-white flex items-center gap-3" style={{ background: '#1E293B', border: '1px solid #334155' }}>
            <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            Guardando en Sheets...
          </div>
        </div>
      )}
    </>
  )
}
