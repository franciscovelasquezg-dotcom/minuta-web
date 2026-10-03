'use client'

import { DiaMinuta } from '@/types/minuta'
import { clasificarProteina } from '@/lib/proteina'

interface Props {
  dias: DiaMinuta[]
  diasMinimos: number
}

interface ItemFreq {
  nombre: string
  total: number
  almuerzo: number
  cena: number
  posiciones: number[]
}

function contarFrecuencias(dias: DiaMinuta[], campo: 'platoPrincipal' | 'ensalada' | 'acompañamiento'): ItemFreq[] {
  const mapa = new Map<string, ItemFreq>()
  dias.forEach((dia, di) => {
    dia.servicios.forEach(svc => {
      const val = svc[campo]
      if (!val || val === 'Por Definir') return
      if (!mapa.has(val)) mapa.set(val, { nombre: val, total: 0, almuerzo: 0, cena: 0, posiciones: [] })
      const item = mapa.get(val)!
      item.total++
      if (svc.tipo === 'Almuerzo') item.almuerzo++; else item.cena++
      item.posiciones.push(di + 1)
    })
  })
  return Array.from(mapa.values()).sort((a, b) => b.total - a.total)
}

function calcularGapMinimo(pos: number[]): number {
  if (pos.length < 2) return Infinity
  let min = Infinity
  for (let i = 1; i < pos.length; i++) min = Math.min(min, pos[i] - pos[i - 1])
  return min
}

const PROT_BADGE: Record<string, string> = {
  vacuno:   'bg-red-950/80 border-red-800/60 text-red-400',
  cerdo:    'bg-rose-950/80 border-rose-800/60 text-rose-300',
  pollo:    'bg-amber-950/80 border-amber-800/60 text-amber-400',
  pasta:    'bg-orange-950/80 border-orange-800/60 text-orange-400',
  legumbre: 'bg-emerald-950/80 border-emerald-800/60 text-emerald-400',
  otro:     'bg-slate-800/80 border-slate-600/60 text-slate-400',
}

const PROT_BAR: Record<string, string> = {
  vacuno: '#EF4444', cerdo: '#FB7185', pollo: '#F59E0B',
  pasta: '#F97316', legumbre: '#10B981', otro: '#64748B',
}

function TablaFrecuencia({ items, diasMinimos, tipo }: { items: ItemFreq[]; diasMinimos: number; tipo: 'plato' | 'ensalada' | 'acomp' }) {
  const maxTotal = items[0]?.total || 1
  const totalSvcs = items.reduce((acc, i) => acc + i.total, 0)

  return (
    <div className="space-y-1.5">
      {items.map(item => {
        const gap     = calcularGapMinimo(item.posiciones)
        const alerta  = tipo === 'plato' && item.total > 1 && gap < diasMinimos
        const cercano = tipo === 'plato' && item.total > 1 && gap >= diasMinimos && gap < diasMinimos + 2
        const prot    = tipo === 'plato' ? clasificarProteina(item.nombre) : null
        const pct     = Math.round((item.total / totalSvcs) * 100)
        const barPct  = maxTotal > 0 ? (item.total / maxTotal) * 100 : 0
        const barColor = alerta ? '#EF4444' : cercano ? '#F59E0B' : '#10B981'

        return (
          <div key={item.nombre}
            className="p-3 rounded-xl"
            style={{
              background: alerta ? '#1C0808' : cercano ? '#1C1007' : '#0F172A',
              border: `1px solid ${alerta ? '#991B1B60' : cercano ? '#D9770660' : '#1E293B'}`,
            }}>
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-medium" style={{ color: '#E2E8F0' }}>{item.nombre}</span>
                {prot && (
                  <span className={`text-[9px] px-1.5 py-0.5 rounded border font-bold uppercase ${PROT_BADGE[prot]}`}>
                    {prot}
                  </span>
                )}
                {alerta  && <span className="text-[9px] font-bold" style={{ color: '#F87171' }}>⚠ Gap {gap}d</span>}
                {cercano && <span className="text-[9px] font-medium" style={{ color: '#FBBF24' }}>↻ Gap {gap}d</span>}
              </div>
              <span className="text-[10px] shrink-0 font-bold" style={{ color: '#475569' }}>{pct}%</span>
            </div>
            {/* Bar */}
            <div className="w-full h-1.5 rounded-full mb-2" style={{ background: '#1E293B' }}>
              <div className="h-1.5 rounded-full transition-all" style={{ width: `${barPct}%`, background: barColor }} />
            </div>
            <div className="flex gap-3">
              <span className="text-[10px]" style={{ color: '#94A3B8' }}>
                <span style={{ color: '#F59E0B' }}>☀</span> {item.almuerzo}
              </span>
              <span className="text-[10px]" style={{ color: '#94A3B8' }}>
                <span style={{ color: '#818CF8' }}>◐</span> {item.cena}
              </span>
              <span className="text-[10px]" style={{ color: '#475569' }}>
                Días: {item.posiciones.join(', ')}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function Analisis({ dias, diasMinimos }: Props) {
  const platos   = contarFrecuencias(dias, 'platoPrincipal')
  const ensaladas = contarFrecuencias(dias, 'ensalada')
  const acomps   = contarFrecuencias(dias, 'acompañamiento')

  const porTipo = platos.reduce<Record<string, number>>((acc, p) => {
    const t = clasificarProteina(p.nombre)
    acc[t] = (acc[t] || 0) + p.total
    return acc
  }, {})
  const totalPlatos = platos.reduce((a, p) => a + p.total, 0)

  const repetidos = platos.filter(p => p.total > 1 && calcularGapMinimo(p.posiciones) < diasMinimos)
  const pendientes = dias.reduce((acc, d) => acc + d.servicios.filter(s => s.platoPrincipal === 'Por Definir').length, 0)

  return (
    <div className="space-y-5">
      {/* Alertas rápidas */}
      {(repetidos.length > 0 || pendientes > 0) && (
        <div className="flex gap-3 flex-wrap">
          {repetidos.length > 0 && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl"
              style={{ background: '#1C0808', border: '1px solid #991B1B60' }}>
              <span className="font-bold text-lg" style={{ color: '#F87171' }}>{repetidos.length}</span>
              <span className="text-sm" style={{ color: '#FCA5A5' }}>
                plato{repetidos.length > 1 ? 's' : ''} repetido{repetidos.length > 1 ? 's' : ''} muy cercano{repetidos.length > 1 ? 's' : ''}
              </span>
            </div>
          )}
          {pendientes > 0 && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl"
              style={{ background: '#1C1007', border: '1px solid #D9770660' }}>
              <span className="font-bold text-lg" style={{ color: '#FBBF24' }}>{pendientes}</span>
              <span className="text-sm" style={{ color: '#FDE68A' }}>
                servicio{pendientes > 1 ? 's' : ''} sin definir
              </span>
            </div>
          )}
        </div>
      )}

      {/* Distribución proteína */}
      <div className="rounded-xl p-4" style={{ background: '#0F172A', border: '1px solid #1E293B' }}>
        <h3 className="font-bold text-white text-sm mb-3" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
          Distribución por Tipo de Proteína
        </h3>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {Object.entries(porTipo).sort((a, b) => b[1] - a[1]).map(([tipo, count]) => (
            <div key={tipo} className="rounded-xl p-3 text-center"
              style={{ background: '#1E293B', border: `1px solid #334155`, borderTop: `3px solid ${PROT_BAR[tipo] || '#64748B'}` }}>
              <div className="font-bold text-white text-xl" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{count}</div>
              <div className="text-[11px] capitalize font-semibold mt-0.5" style={{ color: '#94A3B8' }}>{tipo}</div>
              <div className="text-[10px] mt-0.5" style={{ color: '#475569' }}>{totalPlatos > 0 ? Math.round(count / totalPlatos * 100) : 0}%</div>
            </div>
          ))}
        </div>
        {/* Barra acumulada */}
        <div className="mt-3 h-2 rounded-full overflow-hidden flex" style={{ background: '#1E293B' }}>
          {Object.entries(porTipo).sort((a, b) => b[1] - a[1]).map(([tipo, count]) => (
            <div key={tipo} style={{
              width: `${totalPlatos > 0 ? count / totalPlatos * 100 : 0}%`,
              background: PROT_BAR[tipo] || '#64748B',
              transition: 'width 0.5s',
            }} />
          ))}
        </div>
      </div>

      {/* 3 columnas de frecuencias */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined" style={{ fontSize: 15, color: '#10B981' }}>restaurant</span>
            <h3 className="font-bold text-white text-sm" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
              Platos Principales
              <span className="ml-1 font-normal" style={{ color: '#475569', fontSize: 12 }}>({platos.length})</span>
            </h3>
          </div>
          <TablaFrecuencia items={platos} diasMinimos={diasMinimos} tipo="plato" />
        </div>
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined" style={{ fontSize: 15, color: '#F59E0B' }}>grain</span>
            <h3 className="font-bold text-white text-sm" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
              Acompañamientos
              <span className="ml-1 font-normal" style={{ color: '#475569', fontSize: 12 }}>({acomps.length})</span>
            </h3>
          </div>
          <TablaFrecuencia items={acomps} diasMinimos={diasMinimos} tipo="acomp" />
        </div>
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined" style={{ fontSize: 15, color: '#34D399' }}>eco</span>
            <h3 className="font-bold text-white text-sm" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
              Ensaladas
              <span className="ml-1 font-normal" style={{ color: '#475569', fontSize: 12 }}>({ensaladas.length})</span>
            </h3>
          </div>
          <TablaFrecuencia items={ensaladas} diasMinimos={diasMinimos} tipo="ensalada" />
        </div>
      </div>
    </div>
  )
}
