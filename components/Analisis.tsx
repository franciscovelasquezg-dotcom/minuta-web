'use client'

import { DiaMinuta } from '@/types/minuta'

interface Props {
  dias: DiaMinuta[]
  diasMinimos: number
}

interface ItemFreq {
  nombre: string
  total: number
  almuerzo: number
  cena: number
  posiciones: number[] // índices de día donde aparece
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
      if (svc.tipo === 'Almuerzo') item.almuerzo++
      else item.cena++
      item.posiciones.push(di + 1)
    })
  })

  return Array.from(mapa.values()).sort((a, b) => b.total - a.total)
}

function calcularGapMinimo(posiciones: number[]): number {
  if (posiciones.length < 2) return Infinity
  let min = Infinity
  for (let i = 1; i < posiciones.length; i++) {
    min = Math.min(min, posiciones[i] - posiciones[i - 1])
  }
  return min
}

function clasificarProteina(nombre: string): string {
  const n = nombre.toLowerCase()
  if (n.includes('vacuno') || n.includes('carne') || n.includes('asado') || n.includes('chopsui de v') || n.includes('estofado') || n.includes('mechada') || n.includes('albóndiga') || n.includes('tortica')) return 'vacuno'
  if (n.includes('cerdo') || n.includes('chuleta') || n.includes('medalla')) return 'cerdo'
  if (n.includes('pollo')) return 'pollo'
  if (n.includes('spaghetti') || n.includes('mostaccioli') || n.includes('espirales') || n.includes('pasta')) return 'pasta'
  if (n.includes('lentejas') || n.includes('legumbre')) return 'legumbre'
  return 'otro'
}

const TIPO_COLOR: Record<string, string> = {
  vacuno:   'bg-red-100 text-red-800 border-red-200',
  cerdo:    'bg-pink-100 text-pink-800 border-pink-200',
  pollo:    'bg-yellow-100 text-yellow-800 border-yellow-200',
  pasta:    'bg-orange-100 text-orange-800 border-orange-200',
  legumbre: 'bg-green-100 text-green-800 border-green-200',
  otro:     'bg-gray-100 text-gray-700 border-gray-200',
}

function BarraFreq({ valor, max, color }: { valor: number; max: number; color: string }) {
  const pct = max > 0 ? (valor / max) * 100 : 0
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-100 rounded-full h-2">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-bold w-5 text-right">{valor}</span>
    </div>
  )
}

function TablaFrecuencia({ items, diasMinimos, tipo }: { items: ItemFreq[]; diasMinimos: number; tipo: 'plato' | 'ensalada' | 'acomp' }) {
  const maxTotal = items[0]?.total || 1
  const totalServicios = items.reduce((acc, i) => acc + i.total, 0)

  return (
    <div className="space-y-1.5">
      {items.map(item => {
        const gap = calcularGapMinimo(item.posiciones)
        const alerta = tipo === 'plato' && item.total > 1 && gap < diasMinimos
        const cercano = tipo === 'plato' && item.total > 1 && gap >= diasMinimos && gap < diasMinimos + 2
        const tipo_proteina = tipo === 'plato' ? clasificarProteina(item.nombre) : null
        const pct = Math.round((item.total / totalServicios) * 100)

        return (
          <div key={item.nombre} className={`p-2 rounded border ${alerta ? 'border-red-300 bg-red-50' : cercano ? 'border-orange-200 bg-orange-50' : 'border-gray-200 bg-white'}`}>
            <div className="flex items-start justify-between gap-2 mb-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-medium text-gray-800 leading-tight">{item.nombre}</span>
                {tipo_proteina && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${TIPO_COLOR[tipo_proteina]}`}>
                    {tipo_proteina}
                  </span>
                )}
                {alerta && <span className="text-[10px] text-red-600 font-bold">⚠ Gap {gap}d</span>}
                {cercano && <span className="text-[10px] text-orange-500">↻ Gap {gap}d</span>}
              </div>
              <div className="text-right shrink-0">
                <span className="text-xs text-gray-400">{pct}%</span>
              </div>
            </div>
            <BarraFreq valor={item.total} max={maxTotal} color={alerta ? 'bg-red-400' : cercano ? 'bg-orange-400' : 'bg-blue-400'} />
            <div className="flex gap-3 mt-1">
              <span className="text-[10px] text-blue-500">🌞 Almuerzo: {item.almuerzo}</span>
              <span className="text-[10px] text-indigo-500">🌙 Cena: {item.cena}</span>
              <span className="text-[10px] text-gray-400">Días: {item.posiciones.join(', ')}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function Analisis({ dias, diasMinimos }: Props) {
  const platos = contarFrecuencias(dias, 'platoPrincipal')
  const ensaladas = contarFrecuencias(dias, 'ensalada')
  const acomps = contarFrecuencias(dias, 'acompañamiento')

  // Agrupación por tipo proteína
  const porTipo = platos.reduce<Record<string, number>>((acc, p) => {
    const t = clasificarProteina(p.nombre)
    acc[t] = (acc[t] || 0) + p.total
    return acc
  }, {})
  const totalPlatos = platos.reduce((a, p) => a + p.total, 0)

  const repetidos = platos.filter(p => p.total > 1 && calcularGapMinimo(p.posiciones) < diasMinimos)
  const pendientes = dias.reduce((acc, d) => acc + d.servicios.filter(s => s.platoPrincipal === 'Por Definir').length, 0)

  return (
    <div className="space-y-6">
      {/* Alertas rápidas */}
      {(repetidos.length > 0 || pendientes > 0) && (
        <div className="flex gap-3 flex-wrap">
          {repetidos.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 flex items-center gap-2">
              <span className="text-red-600 font-bold text-lg">{repetidos.length}</span>
              <span className="text-red-700 text-sm">plato{repetidos.length > 1 ? 's' : ''} repetido{repetidos.length > 1 ? 's' : ''} muy cercano{repetidos.length > 1 ? 's' : ''}</span>
            </div>
          )}
          {pendientes > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3 flex items-center gap-2">
              <span className="text-yellow-600 font-bold text-lg">{pendientes}</span>
              <span className="text-yellow-700 text-sm">servicio{pendientes > 1 ? 's' : ''} sin definir</span>
            </div>
          )}
        </div>
      )}

      {/* Distribución por tipo proteína */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-sm font-bold text-gray-700 mb-3">Distribución por tipo de proteína</h3>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {Object.entries(porTipo).sort((a,b) => b[1]-a[1]).map(([tipo, count]) => (
            <div key={tipo} className={`rounded-lg border p-3 text-center ${TIPO_COLOR[tipo]}`}>
              <div className="text-xl font-bold">{count}</div>
              <div className="text-[11px] capitalize">{tipo}</div>
              <div className="text-[10px] opacity-70">{Math.round(count/totalPlatos*100)}%</div>
            </div>
          ))}
        </div>
      </div>

      {/* 3 columnas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div>
          <h3 className="text-sm font-bold text-gray-700 mb-2">
            Platos principales <span className="text-gray-400 font-normal">({platos.length} distintos)</span>
          </h3>
          <TablaFrecuencia items={platos} diasMinimos={diasMinimos} tipo="plato" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-gray-700 mb-2">
            Acompañamientos <span className="text-gray-400 font-normal">({acomps.length} distintos)</span>
          </h3>
          <TablaFrecuencia items={acomps} diasMinimos={diasMinimos} tipo="acomp" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-gray-700 mb-2">
            Ensaladas <span className="text-gray-400 font-normal">({ensaladas.length} distintas)</span>
          </h3>
          <TablaFrecuencia items={ensaladas} diasMinimos={diasMinimos} tipo="ensalada" />
        </div>
      </div>
    </div>
  )
}
