'use client'

import { useState } from 'react'
import { api } from '@/lib/api'
import { CatalogoRec, Frio, UNIDADES, nuevoId } from '@/lib/recepcion'

const card = { background: '#0F172A', border: '1px solid #1E293B' }
const campo = { background: '#1E293B', border: '1px solid #334155', color: '#F1F5F9', minHeight: 48, fontSize: 16 }
const boton = { background: '#10B981', color: '#0B1326', minHeight: 48 }
const botonSec = { background: '#1E293B', color: '#F87171', border: '1px solid #334155', minHeight: 44, width: 44 }

export default function RecepcionCatalogo({ cat, recargar }: { cat: CatalogoRec | null; recargar: () => void }) {
  const [prov, setProv] = useState('')
  const [nombre, setNombre] = useState('')
  const [unidad, setUnidad] = useState('kg')
  const [frio, setFrio] = useState<Frio>('ambiente')
  const [proveedor, setProveedor] = useState('')
  const [error, setError] = useState('')
  const [ocupado, setOcupado] = useState(false)

  const correr = async (fn: () => Promise<unknown>) => {
    setOcupado(true); setError('')
    try { await fn(); recargar() } catch (e) { setError(e instanceof Error ? e.message : String(e)) } finally { setOcupado(false) }
  }

  const agregarProv = () => {
    if (!prov.trim()) return
    correr(async () => { await api.guardarProveedorRec({ id: nuevoId(), nombre: prov.trim(), activo: true }); setProv('') })
  }
  const agregarProd = () => {
    if (!nombre.trim()) return
    correr(async () => { await api.guardarProductoRec({ id: nuevoId(), nombre: nombre.trim(), unidad, frio, proveedor, activo: true }); setNombre('') })
  }

  if (!cat) return <p style={{ color: '#64748B' }}>Cargando catálogo…</p>
  const provs = cat.proveedores.filter(p => p.activo)
  const prods = cat.productos.filter(p => p.activo)

  return (
    <div className="flex flex-col gap-4">
      {error && <div className="p-3 rounded-xl text-sm" style={{ background: '#450A0A', border: '1px solid #991B1B', color: '#FCA5A5' }}>{error}</div>}
      <div className="rounded-xl p-3 flex flex-col gap-2" style={card}>
        <h2 className="font-bold">Proveedores</h2>
        <div className="flex gap-2">
          <input value={prov} onChange={e => setProv(e.target.value)} placeholder="Nombre del proveedor" className="flex-1 rounded-xl px-3" style={campo} />
          <button disabled={ocupado} onClick={agregarProv} className="rounded-xl font-bold px-4" style={boton}>Agregar</button>
        </div>
        {provs.map(p => (
          <div key={p.id} className="flex items-center justify-between py-1" style={{ borderTop: '1px solid #1E293B' }}>
            <span>{p.nombre}</span>
            <button disabled={ocupado} aria-label="Quitar" onClick={() => correr(() => api.guardarProveedorRec({ id: p.id, nombre: p.nombre, eliminar: true }))} className="rounded-xl" style={botonSec}>✕</button>
          </div>
        ))}
        {provs.length === 0 && <p className="text-xs" style={{ color: '#64748B' }}>Sin proveedores todavía</p>}
      </div>

      <div className="rounded-xl p-3 flex flex-col gap-2" style={card}>
        <h2 className="font-bold">Productos</h2>
        <input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Nombre del producto" className="rounded-xl px-3" style={campo} />
        <div className="grid grid-cols-2 gap-2">
          <select value={unidad} onChange={e => setUnidad(e.target.value)} className="rounded-xl px-3" style={campo}>
            {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
          <select value={frio} onChange={e => setFrio(e.target.value as Frio)} className="rounded-xl px-3" style={campo}>
            <option value="ambiente">Ambiente</option>
            <option value="refrigerado">Refrigerado</option>
            <option value="congelado">Congelado</option>
          </select>
        </div>
        <select value={proveedor} onChange={e => setProveedor(e.target.value)} className="rounded-xl px-3" style={campo}>
          <option value="">Sin proveedor fijo</option>
          {provs.map(p => <option key={p.id} value={p.nombre}>{p.nombre}</option>)}
        </select>
        <button disabled={ocupado} onClick={agregarProd} className="rounded-xl font-bold" style={boton}>Agregar producto</button>
        {prods.map(p => (
          <div key={p.id} className="flex items-center justify-between py-1" style={{ borderTop: '1px solid #1E293B' }}>
            <div>
              <div>{p.nombre}</div>
              <div className="text-xs" style={{ color: '#64748B' }}>{p.unidad} · {p.frio}{p.proveedor ? ' · ' + p.proveedor : ''}</div>
            </div>
            <button disabled={ocupado} aria-label="Quitar" onClick={() => correr(() => api.guardarProductoRec({ id: p.id, nombre: p.nombre, eliminar: true }))} className="rounded-xl" style={botonSec}>✕</button>
          </div>
        ))}
        {prods.length === 0 && <p className="text-xs" style={{ color: '#64748B' }}>Sin productos todavía</p>}
      </div>
    </div>
  )
}
