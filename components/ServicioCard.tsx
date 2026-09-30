'use client'

import { Servicio, Estado } from '@/types/minuta'
import { PLATOS_PRINCIPALES, ACOMPAÑAMIENTOS, ENSALADAS, POSTRES, ESTADOS } from '@/data/catalogos'
import SelectField from './SelectField'
import EstadoBadge from './EstadoBadge'

interface Props {
  servicio: Servicio
  alerta?: 'repetido' | 'cercano'
  onChange: (campo: keyof Servicio, valor: string) => void
}

const alertaClase = {
  repetido: 'border-l-4 border-red-500 bg-red-50',
  cercano: 'border-l-4 border-orange-400 bg-orange-50',
}

export default function ServicioCard({ servicio, alerta, onChange }: Props) {
  const isAsado = servicio.platoPrincipal === 'ASADO TRADICIONAL A LAS BRASAS'

  return (
    <div className={`p-2 rounded ${alerta ? alertaClase[alerta] : 'bg-white border border-gray-200'}`}>
      <div className="flex items-center justify-between mb-1">
        <span className={`text-[10px] font-bold uppercase tracking-wide ${servicio.tipo === 'Almuerzo' ? 'text-blue-600' : 'text-indigo-600'}`}>
          {servicio.tipo}
        </span>
        {isAsado && <span className="text-[10px] text-amber-600 font-bold">🔥 ASADO</span>}
        {alerta === 'repetido' && <span className="text-[10px] text-red-600">⚠ Repetido</span>}
        {alerta === 'cercano' && <span className="text-[10px] text-orange-500">↻ Cercano</span>}
      </div>

      <div className="space-y-1">
        <div>
          <label className="text-[9px] text-gray-400 uppercase">Plato Principal</label>
          <SelectField
            value={servicio.platoPrincipal}
            options={PLATOS_PRINCIPALES}
            onChange={(v) => onChange('platoPrincipal', v)}
            className="font-medium text-gray-800"
          />
        </div>
        <div>
          <label className="text-[9px] text-gray-400 uppercase">Acompañamiento</label>
          <SelectField
            value={servicio.acompañamiento}
            options={ACOMPAÑAMIENTOS}
            onChange={(v) => onChange('acompañamiento', v)}
          />
        </div>
        <div>
          <label className="text-[9px] text-gray-400 uppercase">Ensalada</label>
          <SelectField
            value={servicio.ensalada}
            options={ENSALADAS}
            onChange={(v) => onChange('ensalada', v)}
          />
        </div>
        <div>
          <label className="text-[9px] text-gray-400 uppercase">Postre</label>
          <SelectField
            value={servicio.postre || 'Por Definir'}
            options={POSTRES}
            onChange={(v) => onChange('postre', v)}
          />
        </div>
        <div className="mt-1 pt-1 border-t border-green-100">
          <label className="text-[9px] text-green-600 uppercase font-semibold">Opción Hipocalórica</label>
          <input
            type="text"
            value={servicio.opcionHipo || ''}
            onChange={(e) => onChange('opcionHipo', e.target.value)}
            placeholder="Bowl proteína + ensalada..."
            className="w-full text-[10px] text-green-800 bg-green-50 border border-green-200 rounded px-1.5 py-1 mt-0.5 focus:outline-none focus:ring-1 focus:ring-green-400"
          />
        </div>
        <div className="pt-0.5">
          <select
            value={servicio.estado}
            onChange={(e) => onChange('estado', e.target.value)}
            className="w-full text-[10px] bg-transparent border-0 cursor-pointer focus:outline-none"
          >
            {ESTADOS.map((e) => <option key={e} value={e}>{e}</option>)}
          </select>
          <EstadoBadge estado={servicio.estado as Estado} />
        </div>
      </div>
    </div>
  )
}
