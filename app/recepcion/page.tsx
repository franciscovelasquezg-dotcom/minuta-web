'use client'

import { useEffect, useState, useCallback } from 'react'
import { api } from '@/lib/api'
import AppHeader from '@/components/AppHeader'
import {
  Recepcion, ItemRecepcion, Frio, UNIDADES, RANGO, tempOk, estadoItem, diferencia, resumir,
  nuevoId, horaAhora, recepcionNueva, comprimirFoto,
} from '@/lib/recepcion'

const BORRADOR_KEY = 'recepcion_borrador_v1'
const PASOS = ['Pedido', 'Conteo', 'Temperatura', 'Cierre'] as const
type Paso = typeof PASOS[number]

const card = { background: '#0F172A', border: '1px solid #1E293B' }
const campo = { background: '#1E293B', border: '1px solid #334155', color: '#F1F5F9', minHeight: 48, fontSize: 16 }
const boton = { background: '#10B981', color: '#0B1326', minHeight: 48 }
const botonSec = { background: '#1E293B', color: '#F1F5F9', border: '1px solid #334155', minHeight: 48 }

function guardarBorrador(r: Recepcion) {
  try { localStorage.setItem(BORRADOR_KEY, JSON.stringify(r)) } catch { /* sin espacio */ }
}
function leerBorrador(): Recepcion | null {
  try { const raw = localStorage.getItem(BORRADOR_KEY); return raw ? JSON.parse(raw) as Recepcion : null } catch { return null }
}
function limpiarBorrador() {
  try { localStorage.removeItem(BORRADOR_KEY) } catch { /* nada */ }
}

export default function RecepcionPage() {
  const [lista, setLista] = useState<Recepcion[]>([])
  const [rec, setRec] = useState<Recepcion | null>(null)
  const [paso, setPaso] = useState<Paso>('Pedido')
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  const [foto, setFoto] = useState<string>('')

  const cargar = useCallback(() => {
    api.getRecepciones().then(setLista).catch(e => setError('No se pudo cargar: ' + e.message)).finally(() => setCargando(false))
  }, [])

  useEffect(() => {
    cargar()
    const b = leerBorrador()
    // eslint-disable-next-line react-hooks/set-state-in-effect -- el borrador vive en localStorage (solo navegador)
    if (b && b.estado === 'abierta') setRec(b)
  }, [cargar])

  const cambiar = (fn: (r: Recepcion) => Recepcion) => {
    setRec(prev => {
      if (!prev) return prev
      const nuevo = fn(prev)
      guardarBorrador(nuevo)
      return nuevo
    })
  }

  const abrir = (r: Recepcion) => { setRec(r); setPaso('Pedido'); setFoto(''); setMsg(''); setError('') }
  const nueva = () => { const r = recepcionNueva(); guardarBorrador(r); abrir(r) }
  const volver = () => { setRec(null); setCargando(true); cargar() }

  const guardar = async (estado: Recepcion['estado']) => {
    if (!rec) return
    setGuardando(true); setError(''); setMsg('')
    try {
      const envio = { ...rec, estado, ...(foto ? { foto } : {}) }
      const res = await api.guardarRecepcion(envio)
      const guardada = { ...rec, estado, actualizado: res.actualizado, fotoUrl: res.fotoUrl || rec.fotoUrl }
      setRec(guardada)
      setFoto('')
      if (estado === 'cerrada') { limpiarBorrador() } else { guardarBorrador(guardada) }
      setMsg(res.avisoFoto ? 'Guardado, pero ' + res.avisoFoto : estado === 'cerrada' ? 'Recepción cerrada y guardada ✓' : 'Guardado ✓')
    } catch (e) {
      setError('No se pudo guardar (queda en este teléfono): ' + (e instanceof Error ? e.message : String(e)))
    } finally {
      setGuardando(false)
    }
  }

  const cerrar = () => {
    if (!rec) return
    const s = resumir(rec)
    const avisos: string[] = []
    if (s.sinContar) avisos.push(`${s.sinContar} producto(s) sin contar`)
    if (s.fríosSinTemp) avisos.push(`${s.fríosSinTemp} producto(s) frío(s) sin temperatura`)
    if (s.tempsFuera) avisos.push(`${s.tempsFuera} temperatura(s) fuera de rango`)
    if (avisos.length && !window.confirm('Antes de cerrar:\n• ' + avisos.join('\n• ') + '\n\n¿Cerrar igual?')) return
    guardar('cerrada')
  }

  return (
    <div className="min-h-screen" style={{ background: '#0B1326', color: '#F1F5F9', fontFamily: 'Manrope, sans-serif' }}>
      <AppHeader activePage="recepcion" />
      <main className="max-w-2xl mx-auto px-4 pt-20 pb-24">
        {error && <div className="mb-3 p-3 rounded-xl text-sm" style={{ background: '#450A0A', border: '1px solid #991B1B', color: '#FCA5A5' }}>{error}</div>}
        {msg && <div className="mb-3 p-3 rounded-xl text-sm" style={{ background: '#052E16', border: '1px solid #166534', color: '#86EFAC' }}>{msg}</div>}
        {!rec ? (
          <Listado lista={lista} cargando={cargando} onNueva={nueva} onAbrir={abrir} />
        ) : (
          <div>
            <div className="flex items-center justify-between mb-3">
              <button onClick={volver} className="flex items-center gap-1 px-3 rounded-xl text-sm font-semibold" style={botonSec}>
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_back</span>Lista
              </button>
              <span className="text-xs px-2 py-1 rounded-lg font-bold uppercase" style={rec.estado === 'cerrada' ? { background: '#052E16', color: '#86EFAC' } : { background: '#422006', color: '#FCD34D' }}>{rec.estado}</span>
            </div>
            <div className="grid grid-cols-4 gap-1 mb-4 p-1 rounded-xl" style={{ background: '#1E293B' }}>
              {PASOS.map(p => (
                <button key={p} onClick={() => setPaso(p)} className="rounded-lg text-xs font-bold" style={{ minHeight: 44, ...(paso === p ? { background: '#10B981', color: '#0B1326' } : { color: '#94A3B8' }) }}>{p}</button>
              ))}
            </div>
            {paso === 'Pedido' && <PasoPedido rec={rec} cambiar={cambiar} foto={foto} setFoto={setFoto} setError={setError} />}
            {paso === 'Conteo' && <PasoConteo rec={rec} cambiar={cambiar} />}
            {paso === 'Temperatura' && <PasoTemp rec={rec} cambiar={cambiar} />}
            {paso === 'Cierre' && <PasoCierre rec={rec} cambiar={cambiar} />}
            <div className="fixed bottom-0 left-0 right-0 p-3" style={{ background: '#0F172A', borderTop: '1px solid #1E293B' }}>
              <div className="max-w-2xl mx-auto w-full flex gap-2">
                <button disabled={guardando} onClick={() => guardar(rec.estado)} className="flex-1 rounded-xl font-bold" style={botonSec}>{guardando ? 'Guardando…' : 'Guardar'}</button>
                {paso === 'Cierre' && rec.estado === 'abierta' && (
                  <button disabled={guardando} onClick={cerrar} className="flex-1 rounded-xl font-bold" style={boton}>Cerrar recepción</button>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

function Listado({ lista, cargando, onNueva, onAbrir }: { lista: Recepcion[]; cargando: boolean; onNueva: () => void; onAbrir: (r: Recepcion) => void }) {
  return (
    <div>
      <h1 className="font-bold text-white mb-1" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 22 }}>Recepción de camión</h1>
      <p className="text-sm mb-4" style={{ color: '#64748B' }}>Pedido esperado, conteo y temperatura</p>
      <button onClick={onNueva} className="w-full rounded-xl font-bold flex items-center justify-center gap-2 mb-5" style={boton}>
        <span className="material-symbols-outlined">add</span>Nueva recepción
      </button>
      {cargando ? <p style={{ color: '#64748B' }}>Cargando…</p> : lista.length === 0 ? (
        <p className="text-center py-10" style={{ color: '#64748B' }}>Aún no hay recepciones</p>
      ) : (
        <div className="flex flex-col gap-2">
          {lista.map(r => {
            const s = resumir(r)
            const problemas = s.faltas + s.sobras + s.tempsFuera
            return (
              <button key={r.id} onClick={() => onAbrir(r)} className="text-left rounded-xl p-3" style={{ ...card, minHeight: 64 }}>
                <div className="flex justify-between items-center">
                  <span className="font-bold">{r.proveedor || 'Sin proveedor'}</span>
                  <span className="text-xs font-bold uppercase" style={{ color: r.estado === 'cerrada' ? '#86EFAC' : '#FCD34D' }}>{r.estado}</span>
                </div>
                <div className="text-xs mt-1" style={{ color: '#64748B' }}>{r.fecha} {r.hora} · Guía {r.guia || '—'} · {s.total} productos</div>
                {problemas > 0 && <div className="text-xs mt-1 font-semibold" style={{ color: '#FCA5A5' }}>⚠ {s.faltas} faltas · {s.sobras} sobras · {s.tempsFuera} temp. fuera de rango</div>}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

type PasoProps = { rec: Recepcion; cambiar: (fn: (r: Recepcion) => Recepcion) => void }

function PasoPedido({ rec, cambiar, foto, setFoto, setError }: PasoProps & { foto: string; setFoto: (f: string) => void; setError: (e: string) => void }) {
  const [producto, setProducto] = useState('')
  const [cantidad, setCantidad] = useState('')
  const [unidad, setUnidad] = useState('kg')
  const [frio, setFrio] = useState<Frio>('ambiente')

  const agregar = () => {
    const n = Number(cantidad.replace(',', '.'))
    if (!producto.trim() || !isFinite(n) || n <= 0) { setError('Escribe el producto y una cantidad mayor a 0'); return }
    setError('')
    const item: ItemRecepcion = { id: nuevoId(), producto: producto.trim(), unidad, esperado: n, recibido: null, frio }
    cambiar(r => ({ ...r, items: [...r.items, item] }))
    setProducto(''); setCantidad('')
  }

  const subirFoto = async (f: File | undefined) => {
    if (!f) return
    try { setFoto(await comprimirFoto(f)) } catch (e) { setError(e instanceof Error ? e.message : 'Error con la foto') }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-xl p-3 flex flex-col gap-2" style={card}>
        <input value={rec.proveedor} onChange={e => cambiar(r => ({ ...r, proveedor: e.target.value }))} placeholder="Proveedor" className="rounded-xl px-3" style={campo} />
        <input value={rec.guia} onChange={e => cambiar(r => ({ ...r, guia: e.target.value }))} placeholder="N° de guía / factura" className="rounded-xl px-3" style={campo} />
        <input value={rec.responsable} onChange={e => cambiar(r => ({ ...r, responsable: e.target.value }))} placeholder="Quién recibe" className="rounded-xl px-3" style={campo} />
        <label className="rounded-xl flex items-center justify-center gap-2 font-semibold cursor-pointer" style={botonSec}>
          <span className="material-symbols-outlined">photo_camera</span>
          {foto ? 'Foto lista ✓ (cambiar)' : rec.fotoUrl ? 'Guía guardada ✓ (cambiar)' : 'Foto de la guía (opcional)'}
          <input type="file" accept="image/*" capture="environment" className="hidden" onChange={e => subirFoto(e.target.files?.[0])} />
        </label>
        {rec.fotoUrl && <a href={rec.fotoUrl} target="_blank" rel="noreferrer" className="text-xs underline" style={{ color: '#10B981' }}>Ver foto guardada</a>}
      </div>

      <div className="rounded-xl p-3 flex flex-col gap-2" style={card}>
        <h2 className="font-bold">Qué viene en el camión</h2>
        <input value={producto} onChange={e => setProducto(e.target.value)} placeholder="Producto" className="rounded-xl px-3" style={campo} />
        <div className="grid grid-cols-2 gap-2">
          <input value={cantidad} onChange={e => setCantidad(e.target.value)} inputMode="decimal" placeholder="Cantidad" className="rounded-xl px-3" style={campo} />
          <select value={unidad} onChange={e => setUnidad(e.target.value)} className="rounded-xl px-3" style={campo}>
            {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
        <select value={frio} onChange={e => setFrio(e.target.value as Frio)} className="rounded-xl px-3" style={campo}>
          <option value="ambiente">Ambiente (sin frío)</option>
          <option value="refrigerado">Refrigerado (0 a 5 °C)</option>
          <option value="congelado">Congelado (-18 °C o menos)</option>
        </select>
        <button onClick={agregar} className="rounded-xl font-bold" style={boton}>Agregar al pedido</button>
      </div>

      {rec.items.map(i => (
        <div key={i.id} className="rounded-xl p-3 flex items-center justify-between" style={card}>
          <div>
            <div className="font-semibold">{i.producto}</div>
            <div className="text-xs" style={{ color: '#64748B' }}>{i.esperado} {i.unidad} · {i.frio}</div>
          </div>
          <button onClick={() => cambiar(r => ({ ...r, items: r.items.filter(x => x.id !== i.id), temps: r.temps.filter(t => t.id !== i.id) }))} aria-label="Quitar" className="rounded-xl flex items-center justify-center" style={{ ...botonSec, width: 48, color: '#F87171' }}>
            <span className="material-symbols-outlined">delete</span>
          </button>
        </div>
      ))}
    </div>
  )
}

const COLOR_EST = { sin_contar: '#64748B', ok: '#86EFAC', falta: '#FCA5A5', sobra: '#FCD34D' }
const TXT_EST = { sin_contar: 'Sin contar', ok: 'Completo', falta: 'Falta', sobra: 'Sobra' }

function PasoConteo({ rec, cambiar }: PasoProps) {
  const poner = (id: string, v: number | null) => cambiar(r => ({ ...r, items: r.items.map(i => i.id === id ? { ...i, recibido: v } : i) }))
  if (rec.items.length === 0) return <p className="text-center py-10" style={{ color: '#64748B' }}>Primero agrega el pedido en el paso 1</p>
  const s = resumir(rec)
  return (
    <div className="flex flex-col gap-3">
      <div className="text-sm" style={{ color: '#94A3B8' }}>{s.total - s.sinContar} de {s.total} contados · {s.faltas} faltas · {s.sobras} sobras</div>
      {rec.items.map(i => {
        const e = estadoItem(i)
        const d = diferencia(i)
        return (
          <div key={i.id} className="rounded-xl p-3" style={{ ...card, borderColor: e === 'falta' ? '#991B1B' : e === 'sobra' ? '#92400E' : '#1E293B' }}>
            <div className="flex justify-between">
              <span className="font-semibold">{i.producto}</span>
              <span className="text-xs font-bold" style={{ color: COLOR_EST[e] }}>{TXT_EST[e]}{e === 'falta' || e === 'sobra' ? ` ${d > 0 ? '+' : ''}${d} ${i.unidad}` : ''}</span>
            </div>
            <div className="text-xs mb-2" style={{ color: '#64748B' }}>Esperado: {i.esperado} {i.unidad}</div>
            <div className="flex gap-2">
              <input value={i.recibido === null ? '' : String(i.recibido)} inputMode="decimal" placeholder="Llegó" onChange={e2 => { const t = e2.target.value.replace(',', '.'); poner(i.id, t === '' || !isFinite(Number(t)) ? null : Number(t)) }} className="flex-1 rounded-xl px-3" style={campo} />
              <button onClick={() => poner(i.id, i.esperado)} className="rounded-xl font-bold px-4" style={boton}>Todo OK</button>
            </div>
            <input value={i.nota || ''} onChange={e2 => cambiar(r => ({ ...r, items: r.items.map(x => x.id === i.id ? { ...x, nota: e2.target.value } : x) }))} placeholder="Nota (ej. caja rota)" className="w-full rounded-xl px-3 mt-2" style={campo} />
          </div>
        )
      })}
    </div>
  )
}

function PasoTemp({ rec, cambiar }: PasoProps) {
  const opciones = [{ id: 'camion', etiqueta: 'Camión (cámara)' }, ...rec.items.filter(i => i.frio !== 'ambiente').map(i => ({ id: i.id, etiqueta: i.producto }))]
  const [sel, setSel] = useState('camion')
  const [cat, setCat] = useState<'refrigerado' | 'congelado'>('refrigerado')
  const [valor, setValor] = useState('')
  const [err, setErr] = useState('')

  const elegir = (id: string) => {
    setSel(id)
    const it = rec.items.find(i => i.id === id)
    if (it && it.frio !== 'ambiente') setCat(it.frio)
  }

  const agregar = () => {
    const v = Number(valor.replace(',', '.'))
    if (valor.trim() === '' || !isFinite(v)) { setErr('Escribe la temperatura (ej. 3 o -19.5)'); return }
    setErr('')
    const etiqueta = opciones.find(o => o.id === sel)?.etiqueta || 'Camión'
    cambiar(r => ({ ...r, temps: [...r.temps, { id: sel, etiqueta, categoria: cat, valor: v, hora: horaAhora() }] }))
    setValor('')
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-xl p-3 flex flex-col gap-2" style={card}>
        <select value={sel} onChange={e => elegir(e.target.value)} className="rounded-xl px-3" style={campo}>
          {opciones.map(o => <option key={o.id} value={o.id}>{o.etiqueta}</option>)}
        </select>
        <div className="grid grid-cols-2 gap-1 p-1 rounded-xl" style={{ background: '#1E293B' }}>
          {(['refrigerado', 'congelado'] as const).map(c => (
            <button key={c} onClick={() => setCat(c)} className="rounded-lg text-sm font-bold" style={{ minHeight: 44, ...(cat === c ? { background: '#10B981', color: '#0B1326' } : { color: '#94A3B8' }) }}>{c === 'refrigerado' ? 'Refrigerado' : 'Congelado'}</button>
          ))}
        </div>
        <div className="text-xs" style={{ color: '#64748B' }}>Rango correcto: {RANGO[cat].texto}</div>
        <input value={valor} onChange={e => setValor(e.target.value)} inputMode="decimal" placeholder="Temperatura °C" className="rounded-xl px-3" style={campo} />
        {err && <div className="text-xs" style={{ color: '#FCA5A5' }}>{err}</div>}
        <button onClick={agregar} className="rounded-xl font-bold" style={boton}>Registrar temperatura</button>
      </div>
      {rec.temps.map((t, idx) => {
        const ok = tempOk(t.categoria, t.valor)
        return (
          <div key={idx} className="rounded-xl p-3 flex items-center justify-between" style={{ ...card, borderColor: ok ? '#1E293B' : '#991B1B' }}>
            <div>
              <div className="font-semibold">{t.etiqueta}</div>
              <div className="text-xs" style={{ color: '#64748B' }}>{t.categoria} · {t.hora}</div>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg" style={{ color: ok ? '#86EFAC' : '#FCA5A5' }}>{t.valor} °C</span>
              <span className="text-xs font-bold" style={{ color: ok ? '#86EFAC' : '#FCA5A5' }}>{ok ? 'OK' : 'FUERA'}</span>
              <button onClick={() => cambiar(r => ({ ...r, temps: r.temps.filter((_, j) => j !== idx) }))} aria-label="Quitar" className="rounded-xl flex items-center justify-center" style={{ ...botonSec, width: 44, minHeight: 44, color: '#F87171' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function PasoCierre({ rec, cambiar }: PasoProps) {
  const s = resumir(rec)
  const filas: [string, number, boolean][] = [
    ['Productos en el pedido', s.total, false],
    ['Sin contar', s.sinContar, s.sinContar > 0],
    ['Con faltas', s.faltas, s.faltas > 0],
    ['Con sobras', s.sobras, s.sobras > 0],
    ['Fríos sin temperatura', s.fríosSinTemp, s.fríosSinTemp > 0],
    ['Temperaturas fuera de rango', s.tempsFuera, s.tempsFuera > 0],
  ]
  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-xl p-3" style={card}>
        {filas.map(([t, n, mal]) => (
          <div key={t} className="flex justify-between py-2" style={{ borderBottom: '1px solid #1E293B' }}>
            <span className="text-sm">{t}</span>
            <span className="font-bold" style={{ color: mal ? '#FCA5A5' : '#86EFAC' }}>{n}</span>
          </div>
        ))}
      </div>
      <textarea value={rec.obs} onChange={e => cambiar(r => ({ ...r, obs: e.target.value }))} placeholder="Observaciones (reclamos, rechazos, estado del camión…)" rows={4} className="rounded-xl p-3" style={{ ...campo, minHeight: 100 }} />
    </div>
  )
}
