'use client'

import { Servicio, Estado } from '@/types/minuta'
import { PLATOS_PRINCIPALES, ACOMPAÑAMIENTOS, ENSALADAS, POSTRES, ESTADOS } from '@/data/catalogos'
import SelectField from './SelectField'
import EstadoBadge from './EstadoBadge'
import { clasificarProteina, PROTEINA_LABEL, TipoProteina } from '@/lib/proteina'

interface Props {
  servicio: Servicio
  alerta?: 'repetido' | 'cercano'
  onChange: (campo: keyof Servicio, valor: string) => void
  opcionesPlatos?: string[]
  opcionesEnsaladas?: string[]
  opcionesAcomps?: string[]
}

const PROT_CLS: Record<TipoProteina, string> = {
  vacuno:      'bg-red-950/90 border-red-800 text-red-300',
  pollo:       'bg-amber-950/80 border-amber-700 text-amber-300',
  cerdo:       'bg-rose-950/90 border-rose-800 text-rose-300',
  pescado:     'bg-blue-950/90 border-blue-800 text-blue-300',
  pasta:       'bg-orange-950/90 border-orange-800 text-orange-300',
  legumbre:    'bg-emerald-950/90 border-emerald-700 text-emerald-300',
  vegetariano: 'bg-emerald-950/90 border-emerald-700 text-emerald-300',
  otro:        'bg-slate-800/90 border-slate-600 text-slate-400',
}

function getProteinLabel(plato: string): { label: string; cls: string } {
  const tipo = clasificarProteina(plato)
  return { label: PROTEINA_LABEL[tipo], cls: PROT_CLS[tipo] }
}

const SVC_META: Record<string, { icon: string; color: string; time: string }> = {
  Almuerzo: { icon: 'wb_sunny', color: '#F59E0B', time: '12:00 – 15:30' },
  Cena:     { icon: 'bedtime',  color: '#818CF8', time: '19:30 – 22:30' },
}

export default function ServicioCard({ servicio, alerta, onChange, opcionesPlatos, opcionesEnsaladas, opcionesAcomps }: Props) {
  const prot = getProteinLabel(servicio.platoPrincipal)
  const alertaColor = alerta === 'repetido' ? '#7F1D1D' : alerta === 'cercano' ? '#78350F' : '#334155'
  const svcMeta = SVC_META[servicio.tipo] ?? SVC_META['Almuerzo']
  const isAsado = servicio.platoPrincipal?.toUpperCase().includes('ASADO')

  const platosOpts    = opcionesPlatos    ?? PLATOS_PRINCIPALES
  const ensaladasOpts = opcionesEnsaladas ?? ENSALADAS
  const acompsOpts    = opcionesAcomps    ?? ACOMPAÑAMIENTOS

  return (
    <div className="flex flex-col bg-[#131C2E] rounded-lg p-3"
      style={{ border: `1px solid ${alertaColor}` }}>
      {/* Service header */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#334155]/60">
        <div className="flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[17px]"
            style={{ color: svcMeta.color, fontVariationSettings: "'FILL' 1" }}>
            {svcMeta.icon}
          </span>
          <span className="font-semibold text-white text-sm" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
            {servicio.tipo}
          </span>
          <span className="text-[11px] text-slate-400">{svcMeta.time}</span>
        </div>
        <div className="flex items-center gap-1">
          {isAsado && <span className="text-[10px] text-amber-400 font-bold">🔥</span>}
          {alerta === 'repetido' && <span className="text-[9px] bg-red-950/80 border border-red-800/60 text-red-300 px-1.5 py-0.5 rounded font-bold uppercase">Repetido</span>}
          {alerta === 'cercano'   && <span className="text-[9px] bg-amber-950/80 border border-amber-700/60 text-amber-300 px-1.5 py-0.5 rounded font-bold uppercase">Cercano</span>}
          <EstadoBadge estado={servicio.estado as Estado} />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {/* Plato Principal con badge reactivo */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="font-bold uppercase tracking-wider text-slate-400" style={{ fontSize: 9 }}>
              Plato Principal {alerta && <span className="text-amber-400">• Conflicto</span>}
            </label>
            {servicio.platoPrincipal && servicio.platoPrincipal !== 'Por Definir' && (
              <span className={`px-1.5 py-0.5 rounded border text-[9px] font-bold ${prot.cls}`}>
                {prot.label}
              </span>
            )}
          </div>
          <SelectField
            value={servicio.platoPrincipal}
            options={platosOpts}
            onChange={(v) => onChange('platoPrincipal', v)}
            className="font-semibold"
          />
        </div>

        {/* Acompañamiento */}
        <div>
          <label className="block font-bold uppercase tracking-wider text-slate-400 mb-1" style={{ fontSize: 9 }}>Acompañamiento</label>
          <SelectField value={servicio.acompañamiento} options={acompsOpts} onChange={(v) => onChange('acompañamiento', v)} />
        </div>

        {/* Ensalada */}
        <div>
          <label className="block font-bold uppercase tracking-wider text-slate-400 mb-1" style={{ fontSize: 9 }}>Ensalada / Entrada</label>
          <SelectField value={servicio.ensalada} options={ensaladasOpts} onChange={(v) => onChange('ensalada', v)} />
        </div>

        {/* Postre */}
        <div>
          <label className="block font-bold uppercase tracking-wider text-slate-400 mb-1" style={{ fontSize: 9 }}>Postre</label>
          <SelectField value={servicio.postre || 'Por Definir'} options={POSTRES} onChange={(v) => onChange('postre', v)} />
        </div>

        {/* Hipocalórica */}
        <div className="p-2 rounded border border-[#334155] bg-[#131C2E] flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[14px] text-emerald-400">eco</span>
          <input
            type="text"
            value={servicio.opcionHipo || ''}
            onChange={(e) => onChange('opcionHipo', e.target.value)}
            placeholder="Bowl hipocalórico..."
            className="flex-1 bg-transparent text-[10px] text-emerald-300 placeholder:text-emerald-700 focus:outline-none font-semibold"
          />
        </div>

        {/* Estado */}
        <div>
          <select value={servicio.estado} onChange={(e) => onChange('estado', e.target.value)}
            className="w-full text-[10px] bg-transparent border-0 cursor-pointer focus:outline-none text-slate-400"
            style={{ background: 'transparent' }}>
            {ESTADOS.map((e) => <option key={e} value={e} style={{ background: '#1E293B', color: '#F1F5F9' }}>{e}</option>)}
          </select>
        </div>
      </div>
    </div>
  )
}
