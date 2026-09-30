'use client'

import { useState, useEffect } from 'react'
import { api, Plato, Ensalada, Acompañamiento } from '@/lib/api'

type Tab = 'platos' | 'ensaladas' | 'acompañamientos'

const TIPOS_PLATO = ['vacuno', 'cerdo', 'pollo', 'pasta', 'legumbre', 'otro']
const TIPOS_ENSALADA = ['hojas verdes', 'raíz', 'fresca', 'cocida', 'típica chilena', 'crucífera', 'coles', 'grano', 'legumbre', 'tubérculo', 'crocante', 'otro']
const TIPOS_ACOMP = ['arroz', 'puré', 'pasta', 'papas', 'legumbre', 'otro']

function ModalPlato({ plato, onSave, onClose }: { plato: Partial<Plato> | null; onSave: (p: Partial<Plato>) => void; onClose: () => void }) {
  const [form, setForm] = useState<Partial<Plato>>(plato || { nombre: '', tipo: 'vacuno', acompañamientosRecomendados: [], receta: '', activo: true })
  const [acompInput, setAcompInput] = useState((plato?.acompañamientosRecomendados || []).join(', '))

  const set = (k: keyof Plato, v: unknown) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
        <div className="p-5 border-b flex justify-between items-center">
          <h2 className="font-bold text-gray-800">{plato?.id ? 'Editar plato' : 'Nuevo plato'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-600 uppercase">Nombre</label>
            <input value={form.nombre || ''} onChange={e => set('nombre', e.target.value)}
              className="w-full mt-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 uppercase">Tipo proteína</label>
            <select value={form.tipo || 'vacuno'} onChange={e => set('tipo', e.target.value)}
              className="w-full mt-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              {TIPOS_PLATO.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 uppercase">Acompañamientos recomendados <span className="text-gray-400 font-normal normal-case">(separados por coma)</span></label>
            <input value={acompInput} onChange={e => { setAcompInput(e.target.value); set('acompañamientosRecomendados', e.target.value.split(',').map(s => s.trim()).filter(Boolean)) }}
              placeholder="Arroz blanco, Puré de Papas, Pasta..."
              className="w-full mt-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 uppercase">Receta / Instrucciones</label>
            <textarea value={form.receta || ''} onChange={e => set('receta', e.target.value)} rows={4}
              placeholder="Descripción de preparación, ingredientes clave, técnica de cocción..."
              className="w-full mt-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.activo !== false} onChange={e => set('activo', e.target.checked)} className="w-4 h-4" />
            <span className="text-sm text-gray-700">Activo en el catálogo</span>
          </label>
        </div>
        <div className="p-5 border-t flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
          <button onClick={() => onSave(form)} disabled={!form.nombre}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
            Guardar
          </button>
        </div>
      </div>
    </div>
  )
}

function ModalSimple({ item, tipo, campos, onSave, onClose }: {
  item: Partial<Ensalada | Acompañamiento> | null
  tipo: string
  campos: string[]
  onSave: (p: Partial<Ensalada | Acompañamiento>) => void
  onClose: () => void
}) {
  const [form, setForm] = useState(item || { nombre: '', tipo: campos[0], activo: true })
  const set = (k: string, v: unknown) => setForm((f: typeof form) => ({ ...f, [k]: v }))

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="p-5 border-b flex justify-between items-center">
          <h2 className="font-bold text-gray-800">{(item as { id?: string })?.id ? `Editar ${tipo}` : `Nueva ${tipo}`}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-600 uppercase">Nombre</label>
            <input value={(form as { nombre?: string }).nombre || ''} onChange={e => set('nombre', e.target.value)}
              className="w-full mt-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 uppercase">Tipo</label>
            <select value={(form as { tipo?: string }).tipo || campos[0]} onChange={e => set('tipo', e.target.value)}
              className="w-full mt-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              {campos.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={(form as { activo?: boolean }).activo !== false} onChange={e => set('activo', e.target.checked)} className="w-4 h-4" />
            <span className="text-sm text-gray-700">Activo en el catálogo</span>
          </label>
        </div>
        <div className="p-5 border-t flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
          <button onClick={() => onSave(form)} disabled={!(form as { nombre?: string }).nombre}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
            Guardar
          </button>
        </div>
      </div>
    </div>
  )
}

const TIPO_COLOR: Record<string, string> = {
  vacuno: 'bg-red-100 text-red-700', cerdo: 'bg-pink-100 text-pink-700',
  pollo: 'bg-yellow-100 text-yellow-700', pasta: 'bg-orange-100 text-orange-700',
  legumbre: 'bg-green-100 text-green-700', otro: 'bg-gray-100 text-gray-600',
}

export default function CatalogosPage() {
  const [tab, setTab] = useState<Tab>('platos')
  const [platos, setPlatos] = useState<Plato[]>([])
  const [ensaladas, setEnsaladas] = useState<Ensalada[]>([])
  const [acomps, setAcomps] = useState<Acompañamiento[]>([])
  const [cargando, setCargando] = useState(true)
  const [modalPlato, setModalPlato] = useState<Partial<Plato> | null | false>(false)
  const [modalEnsalada, setModalEnsalada] = useState<Partial<Ensalada> | null | false>(false)
  const [modalAcomp, setModalAcomp] = useState<Partial<Acompañamiento> | null | false>(false)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    api.getCatalogos().then(c => {
      setPlatos(c.platos)
      setEnsaladas(c.ensaladas)
      setAcomps(c.acompañamientos)
    }).finally(() => setCargando(false))
  }, [])

  const savePlato = async (p: Partial<Plato>) => {
    setGuardando(true)
    await api.guardarPlato(p)
    const c = await api.getCatalogos()
    setPlatos(c.platos)
    setModalPlato(false)
    setGuardando(false)
  }

  const saveEnsalada = async (e: Partial<Ensalada>) => {
    setGuardando(true)
    await api.guardarEnsalada(e)
    const c = await api.getCatalogos()
    setEnsaladas(c.ensaladas)
    setModalEnsalada(false)
    setGuardando(false)
  }

  const saveAcomp = async (a: Partial<Acompañamiento>) => {
    setGuardando(true)
    await api.guardarAcompañamiento(a)
    const c = await api.getCatalogos()
    setAcomps(c.acompañamientos)
    setModalAcomp(false)
    setGuardando(false)
  }

  const deletePlato = async (id: string) => {
    if (!confirm('¿Eliminar este plato?')) return
    await api.eliminarPlato(id)
    setPlatos(p => p.filter(x => x.id !== id))
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-gray-900 text-white px-6 py-4">
        <div className="max-w-screen-xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Catálogos</h1>
            <p className="text-gray-400 text-sm">Gestión de platos, ensaladas y acompañamientos</p>
          </div>
          <a href="/" className="text-gray-400 hover:text-white text-sm">← Volver a la minuta</a>
        </div>
      </header>

      <main className="max-w-screen-xl mx-auto px-4 py-6">
        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-white rounded-xl p-1 shadow-sm border border-gray-200 w-fit">
          {([['platos', '🥩 Platos principales'], ['ensaladas', '🥗 Ensaladas'], ['acompañamientos', '🍚 Acompañamientos']] as [Tab, string][]).map(([t, label]) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
              {label}
            </button>
          ))}
        </div>

        {cargando ? (
          <div className="text-center py-20 text-gray-400">Cargando catálogos...</div>
        ) : (
          <>
            {/* PLATOS */}
            {tab === 'platos' && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <span className="text-sm text-gray-500">{platos.length} platos registrados</span>
                  <button onClick={() => setModalPlato(null)} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">+ Nuevo plato</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {platos.map(p => (
                    <div key={p.id} className={`bg-white rounded-xl border border-gray-200 p-4 shadow-sm ${!p.activo ? 'opacity-50' : ''}`}>
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-semibold text-gray-800 text-sm leading-tight">{p.nombre}</h3>
                          <span className={`inline-block mt-1 text-[11px] px-2 py-0.5 rounded-full font-medium ${TIPO_COLOR[p.tipo] || TIPO_COLOR.otro}`}>{p.tipo}</span>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <button onClick={() => setModalPlato(p)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded">✏️</button>
                          <button onClick={() => deletePlato(p.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded">🗑</button>
                        </div>
                      </div>
                      {p.acompañamientosRecomendados.length > 0 && (
                        <div className="mt-2">
                          <p className="text-[10px] text-gray-400 uppercase font-semibold mb-1">Acompañamientos sugeridos</p>
                          <div className="flex flex-wrap gap-1">
                            {p.acompañamientosRecomendados.map(a => (
                              <span key={a} className="text-[11px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{a}</span>
                            ))}
                          </div>
                        </div>
                      )}
                      {p.receta && (
                        <p className="mt-2 text-xs text-gray-500 line-clamp-2">{p.receta}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ENSALADAS */}
            {tab === 'ensaladas' && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <span className="text-sm text-gray-500">{ensaladas.length} ensaladas registradas</span>
                  <button onClick={() => setModalEnsalada(null)} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">+ Nueva ensalada</button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {ensaladas.map(e => (
                    <div key={e.id} className={`bg-white rounded-xl border border-gray-200 p-3 shadow-sm flex items-start justify-between ${!e.activo ? 'opacity-50' : ''}`}>
                      <div>
                        <p className="text-sm font-medium text-gray-800">{e.nombre}</p>
                        <span className="text-[11px] text-green-700 bg-green-50 px-2 py-0.5 rounded-full mt-1 inline-block">{e.tipo}</span>
                      </div>
                      <button onClick={() => setModalEnsalada(e)} className="p-1 text-gray-400 hover:text-blue-600 shrink-0">✏️</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ACOMPAÑAMIENTOS */}
            {tab === 'acompañamientos' && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <span className="text-sm text-gray-500">{acomps.length} acompañamientos registrados</span>
                  <button onClick={() => setModalAcomp(null)} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">+ Nuevo acompañamiento</button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {acomps.map(a => (
                    <div key={a.id} className={`bg-white rounded-xl border border-gray-200 p-3 shadow-sm flex items-start justify-between ${!a.activo ? 'opacity-50' : ''}`}>
                      <div>
                        <p className="text-sm font-medium text-gray-800">{a.nombre}</p>
                        <span className="text-[11px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full mt-1 inline-block">{a.tipo}</span>
                      </div>
                      <button onClick={() => setModalAcomp(a)} className="p-1 text-gray-400 hover:text-blue-600 shrink-0">✏️</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {modalPlato !== false && <ModalPlato plato={modalPlato} onSave={savePlato} onClose={() => setModalPlato(false)} />}
      {modalEnsalada !== false && <ModalSimple item={modalEnsalada} tipo="ensalada" campos={TIPOS_ENSALADA} onSave={saveEnsalada} onClose={() => setModalEnsalada(false)} />}
      {modalAcomp !== false && <ModalSimple item={modalAcomp} tipo="acompañamiento" campos={TIPOS_ACOMP} onSave={saveAcomp} onClose={() => setModalAcomp(false)} />}

      {guardando && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl px-6 py-4 shadow-xl text-sm font-medium">Guardando en Sheets...</div>
        </div>
      )}
    </div>
  )
}
