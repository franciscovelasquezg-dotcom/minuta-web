'use client'

import { useState } from 'react'
import { DiaMinuta } from '@/types/minuta'
import { clasificarProteina, PROTEINA_LABEL, TipoProteina } from '@/lib/proteina'
import { formatFecha } from '@/lib/fecha'

type Campo = 'platoPrincipal' | 'ensalada' | 'acompañamiento'
interface Aparicion { di: number; tipo: string }
interface ItemFreq { nombre: string; total: number; apariciones: Aparicion[]; gap: number }

const definido = (v: string) => !!v && v !== 'Por Definir'

function contarFrecuencias(dias: DiaMinuta[], campo: Campo): ItemFreq[] {
  const mapa = new Map<string, ItemFreq>()
  dias.forEach((dia, di) => dia.servicios.forEach(svc => {
    const val = svc[campo]
    if (!definido(val)) return
    if (!mapa.has(val)) mapa.set(val, { nombre: val, total: 0, apariciones: [], gap: Infinity })
    const item = mapa.get(val)!
    item.total++
    item.apariciones.push({ di, tipo: svc.tipo })
  }))
  mapa.forEach(item => {
    for (let i = 1; i < item.apariciones.length; i++) item.gap = Math.min(item.gap, item.apariciones[i].di - item.apariciones[i - 1].di)
  })
  return Array.from(mapa.values()).sort((a, b) => b.total - a.total || a.nombre.localeCompare(b.nombre))
}

const PROT_COLOR: Record<TipoProteina, string> = { vacuno: '#EF4444', cerdo: '#F472B6', pollo: '#F59E0B', pescado: '#38BDF8', pasta: '#A78BFA', legumbre: '#10B981', vegetariano: '#84CC16', otro: '#94A3B8' }
const PROT_CORTO: Record<TipoProteina, string> = { vacuno: 'VAC', cerdo: 'CER', pollo: 'POL', pescado: 'PES', pasta: 'PAS', legumbre: 'LEG', vegetariano: 'VEG', otro: 'OTR' }

const card = { background: '#131B2E', border: '1px solid #22304A' }

export default function Analisis({ dias: diasIn, diasMinimos }: { dias: DiaMinuta[]; diasMinimos: number }) {
  const dias = diasIn.map(d => ({ ...d, fecha: formatFecha(d.fecha) }))
  const platos = contarFrecuencias(dias, 'platoPrincipal')
  const acomps = contarFrecuencias(dias, 'acompañamiento')
  const ensaladas = contarFrecuencias(dias, 'ensalada')

  const servicios = dias.flatMap(d => d.servicios)
  const totalServicios = servicios.length
  const conPlato = servicios.filter(s => definido(s.platoPrincipal))
  const sinDefinir = totalServicios - conPlato.length
  const confirmados = servicios.filter(s => s.estado === 'Confirmado').length
  const enRevision = servicios.filter(s => s.estado === 'En Revisión').length
  const pctConfirmados = totalServicios > 0 ? Math.round((confirmados / totalServicios) * 100) : 0

  const muySeguidos = platos.filter(p => p.total > 1 && p.gap < diasMinimos)
  const enLimite = platos.filter(p => p.total > 1 && p.gap >= diasMinimos && p.gap < diasMinimos + 2)
  const aRevisar = [...muySeguidos, ...enLimite]
  const nombresConflicto = new Set(muySeguidos.map(p => p.nombre))
  const nombresLimite = new Set(enLimite.map(p => p.nombre))

  const porProteina = conPlato.reduce<Partial<Record<TipoProteina, number>>>((acc, s) => {
    const t = clasificarProteina(s.platoPrincipal); acc[t] = (acc[t] || 0) + 1; return acc
  }, {})
  const proteinas = (Object.entries(porProteina) as [TipoProteina, number][]).sort((a, b) => b[1] - a[1])

  const tiposServicio = Array.from(new Set(servicios.map(s => s.tipo)))
  const etiquetaDia = (a: Aparicion) => `Día ${dias[a.di]?.dia ?? a.di + 1} · ${dias[a.di]?.fecha ?? ''} · ${a.tipo}`

  return (
    <div className="flex flex-col gap-5">
    {/* 1. Resumen */}
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {[
        { titulo: 'Repeticiones a corregir', valor: String(muySeguidos.length), detalle: muySeguidos.length === 0 ? 'Ningún plato se repite antes del mínimo' : `Platos repetidos antes de ${diasMinimos} días`, color: muySeguidos.length > 0 ? '#F59E0B' : '#10B981', icon: muySeguidos.length > 0 ? 'warning' : 'check_circle' },
        { titulo: 'Variedad', valor: `${platos.length}`, detalle: `platos distintos en ${conPlato.length} servicios`, color: '#A78BFA', icon: 'restaurant_menu' },
        { titulo: 'Confirmados', valor: `${pctConfirmados}%`, detalle: `${confirmados} de ${totalServicios}${enRevision ? ` · ${enRevision} en revisión` : ''}`, color: '#10B981', icon: 'task_alt' },
        { titulo: 'Sin plato definido', valor: String(sinDefinir), detalle: sinDefinir === 0 ? 'Todos los servicios tienen plato' : 'servicios por completar', color: sinDefinir > 0 ? '#F59E0B' : '#64748B', icon: 'edit_note' },
      ].map(k => (
        <div key={k.titulo} className="rounded-xl p-4" style={card}>
          <div className="flex items-center gap-2 text-xs font-semibold" style={{ color: '#94A3B8' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18, color: k.color }}>{k.icon}</span>{k.titulo}
          </div>
          <div className="text-3xl font-extrabold mt-2" style={{ color: k.color === '#64748B' ? '#F1F5F9' : k.color }}>{k.valor}</div>
          <div className="text-xs mt-1" style={{ color: '#64748B' }}>{k.detalle}</div>
        </div>
      ))}
    </div>

    {/* 2. Qué revisar */}
    <section className="rounded-xl overflow-hidden" style={card}>
      <header className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: '1px solid #22304A' }}>
        <span className="material-symbols-outlined" style={{ fontSize: 20, color: aRevisar.length ? '#F59E0B' : '#10B981' }}>{aRevisar.length ? 'priority_high' : 'verified'}</span>
        <h2 className="text-base font-bold text-white">Qué revisar</h2>
      </header>
      {aRevisar.length === 0 ? (
        <p className="px-4 py-5 text-sm" style={{ color: '#94A3B8' }}>Todo en orden: ningún plato principal se repite con menos de {diasMinimos + 2} días de separación.</p>
      ) : (
        <ul>
          {aRevisar.map(p => {
            const grave = nombresConflicto.has(p.nombre)
            const prot = clasificarProteina(p.nombre)
            return (
              <li key={p.nombre} className="px-4 py-3 flex flex-col md:flex-row md:items-center gap-2 md:gap-4" style={{ borderTop: '1px solid #1B263E' }}>
                <span className="shrink-0 w-fit px-2 py-0.5 rounded text-[11px] font-bold" style={grave ? { background: '#F59E0B', color: '#0B1326' } : { background: 'rgba(245,158,11,0.12)', color: '#FCD34D', border: '1px solid rgba(245,158,11,0.35)' }}>
                  {grave ? 'Muy seguido' : 'Justo en el límite'}
                </span>
                <div className="min-w-0 md:w-72 shrink-0">
                  <div className="text-sm font-semibold text-white">{p.nombre}</div>
                  <div className="text-xs" style={{ color: PROT_COLOR[prot] }}>{PROTEINA_LABEL[prot]} · {p.total} veces · separación {p.gap} {p.gap === 1 ? 'día' : 'días'}</div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {p.apariciones.map((a, i) => (
                    <span key={i} className="px-2 py-1 rounded text-xs" style={{ background: '#0B1326', border: '1px solid #22304A', color: '#CBD5E1' }}>{etiquetaDia(a)}</span>
                  ))}
                </div>
              </li>
            )
          })}
        </ul>
      )}
      {aRevisar.length > 0 && (
        <p className="px-4 py-2.5 text-xs" style={{ color: '#64748B', borderTop: '1px solid #1B263E' }}>
          <strong style={{ color: '#FCD34D' }}>Muy seguido</strong>: menos de {diasMinimos} días entre una vez y otra. <strong style={{ color: '#FCD34D' }}>Justo en el límite</strong>: {diasMinimos} o {diasMinimos + 1} días; cumple, pero conviene espaciarlo. Corrígelo en el Planificador cambiando uno de los dos platos.
        </p>
      )}
    </section>

    {/* 3. Calendario de proteínas */}
    <section className="rounded-xl overflow-hidden" style={card}>
      <header className="px-4 py-3 flex flex-wrap items-center justify-between gap-2" style={{ borderBottom: '1px solid #22304A' }}>
        <h2 className="text-base font-bold text-white">Proteína de cada servicio</h2>
        <span className="text-xs" style={{ color: '#64748B' }}>Pasa el mouse sobre una celda para ver el plato</span>
      </header>
      <div className="overflow-x-auto px-4 py-4">
        <table className="border-separate" style={{ borderSpacing: 4 }}>
          <thead>
            <tr>
              <th />
              {dias.map(d => (
                <th key={d.dia} className="text-[11px] font-semibold text-center min-w-[52px]" style={{ color: d.diaSemana === 'Domingo' ? '#FB923C' : '#94A3B8' }}>
                  <div>{d.diaSemana.slice(0, 3)}</div>
                  <div className="font-normal" style={{ color: '#64748B' }}>{d.fecha}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tiposServicio.map(tipo => (
              <tr key={tipo}>
                <td className="pr-2 text-xs font-semibold whitespace-nowrap" style={{ color: '#94A3B8' }}>{tipo}</td>
                {dias.map(d => {
                  const s = d.servicios.find(x => x.tipo === tipo)
                  if (!s || !definido(s.platoPrincipal)) {
                    return <td key={d.dia} className="h-10 rounded text-center text-[11px]" style={{ background: '#0B1326', border: '1px dashed #334155', color: '#475569' }} title="Sin definir">—</td>
                  }
                  const prot = clasificarProteina(s.platoPrincipal)
                  const color = PROT_COLOR[prot]
                  const conflicto = nombresConflicto.has(s.platoPrincipal)
                  const limite = nombresLimite.has(s.platoPrincipal)
                  return (
                    <td key={d.dia} className="h-10 rounded text-center text-[11px] font-bold cursor-default" title={`${s.platoPrincipal}${conflicto ? ' — repetido muy seguido' : limite ? ' — justo en el límite' : ''}`} style={{ background: `${color}26`, color, border: conflicto ? '2px solid #F59E0B' : limite ? '1px dashed #F59E0B' : `1px solid ${color}55` }}>
                      {PROT_CORTO[prot]}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Leyenda = distribución */}
      <div className="px-4 pb-4 flex flex-col gap-3">
        <div className="w-full h-2.5 rounded-full overflow-hidden flex" style={{ background: '#080E1C' }}>
          {proteinas.map(([t, n]) => (
            <div key={t} style={{ width: `${(n / conPlato.length) * 100}%`, background: PROT_COLOR[t] }} title={`${PROTEINA_LABEL[t]}: ${n}`} />
          ))}
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs">
          {proteinas.map(([t, n]) => (
            <span key={t} className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ background: PROT_COLOR[t] }} />
              <span className="text-white font-semibold">{PROTEINA_LABEL[t]}</span>
              <span style={{ color: '#94A3B8' }}>{n} servicios · {Math.round((n / conPlato.length) * 100)}%</span>
            </span>
          ))}
          <span className="flex items-center gap-1.5" style={{ color: '#64748B' }}>
            <span className="w-3 h-3 rounded-sm" style={{ border: '2px solid #F59E0B' }} />Borde naranjo = plato repetido muy seguido
          </span>
        </div>
      </div>
    </section>

    {/* 4. Frecuencias */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <ListaFrecuencia titulo="Platos principales" items={platos} color="#F59E0B" marcados={nombresConflicto} />
      <ListaFrecuencia titulo="Acompañamientos" items={acomps} color="#22D3EE" />
      <ListaFrecuencia titulo="Ensaladas" items={ensaladas} color="#10B981" />
    </div>
    </div>
  )
}

function ListaFrecuencia({ titulo, items, color, marcados }: { titulo: string; items: ItemFreq[]; color: string; marcados?: Set<string> }) {
  const [verTodos, setVerTodos] = useState(false)
  const repetidos = items.filter(i => i.total > 1)
  const unicos = items.filter(i => i.total === 1)
  const max = items[0]?.total || 1

  const fila = (item: ItemFreq) => (
    <li key={item.nombre} className="py-2 flex items-center gap-3" style={{ borderTop: '1px solid #1B263E' }}>
      <span className="flex-1 min-w-0 text-sm truncate" style={{ color: marcados?.has(item.nombre) ? '#FDE68A' : '#E2E8F0' }} title={item.nombre}>
        {marcados?.has(item.nombre) && <span className="material-symbols-outlined align-middle mr-1" style={{ fontSize: 14, color: '#F59E0B' }}>warning</span>}
        {item.nombre}
      </span>
      <div className="w-16 h-1.5 rounded-full overflow-hidden shrink-0" style={{ background: '#080E1C' }}>
        <div className="h-full rounded-full" style={{ width: `${(item.total / max) * 100}%`, background: color }} />
      </div>
      <span className="w-8 text-right text-sm font-bold shrink-0" style={{ color }}>{item.total}×</span>
    </li>
  )

  return (
    <section className="rounded-xl overflow-hidden flex flex-col" style={card}>
      <header className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid #22304A' }}>
        <h2 className="text-base font-bold text-white">{titulo}</h2>
        <span className="text-xs" style={{ color: '#64748B' }}>{items.length} distintos</span>
      </header>
      <div className="px-4 pb-3">
        <p className="pt-3 pb-1 text-[11px] font-bold uppercase tracking-wider" style={{ color: '#64748B' }}>Se repiten ({repetidos.length})</p>
        {repetidos.length === 0 ? <p className="py-2 text-sm" style={{ color: '#64748B' }}>Ninguno se repite.</p> : <ul>{repetidos.map(fila)}</ul>}
        {unicos.length > 0 && (
          <>
            <button type="button" onClick={() => setVerTodos(v => !v)} className="mt-2 min-h-[44px] w-full flex items-center justify-between text-xs font-semibold rounded-lg px-3" style={{ background: '#0B1326', border: '1px solid #22304A', color: '#94A3B8' }}>
              <span>{verTodos ? 'Ocultar' : 'Ver'} los {unicos.length} que aparecen una sola vez</span>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{verTodos ? 'expand_less' : 'expand_more'}</span>
            </button>
            {verTodos && <ul className="mt-1">{unicos.map(fila)}</ul>}
          </>
        )}
      </div>
    </section>
  )
}
