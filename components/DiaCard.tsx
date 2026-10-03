'use client'

import { DiaMinuta, Servicio } from '@/types/minuta'
import ServicioCard from './ServicioCard'
import { formatFecha } from '@/lib/fecha'

interface Props {
  dia: DiaMinuta
  alertas: Map<string, 'repetido' | 'cercano'>
  diaIndex: number
  onChange: (diaIndex: number, svcIndex: number, campo: keyof Servicio, valor: string) => void
  opcionesPlatos?: string[]
  opcionesEnsaladas?: string[]
  opcionesAcomps?: string[]
}

const esFinDeSemana = (ds: string) => ds === 'Sábado' || ds === 'Domingo'

export default function DiaCard({ dia, alertas, diaIndex, onChange, opcionesPlatos, opcionesEnsaladas, opcionesAcomps }: Props) {
  const fds = esFinDeSemana(dia.diaSemana)
  const tieneAlerta = dia.servicios.some((_, si) => alertas.has(`${diaIndex}-${si}`))

  return (
    <article
      className="flex flex-col rounded-xl overflow-hidden shadow-lg transition-all"
      style={{
        background: '#1E293B',
        border: `1px solid ${tieneAlerta ? '#D97706' : fds ? '#78350F' : '#334155'}`,
        minWidth: '280px',
        width: '280px',
      }}
    >
      {/* Card header */}
      <header className="p-3 border-b border-[#334155] flex items-center justify-between"
        style={{ background: '#131C2E' }}>
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5">
            <h3 className="font-semibold text-white text-sm truncate"
              style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
              Día {dia.dia} · {dia.diaSemana}
            </h3>
            {tieneAlerta && (
              <span className="material-symbols-outlined text-amber-400" style={{ fontSize: 16 }}>error</span>
            )}
          </div>
          <span className="text-[11px]"
            style={{ color: tieneAlerta ? '#FCD34D' : fds ? '#FDE68A' : '#94A3B8' }}>
            {fds ? '★ ' : ''}{formatFecha(dia.fecha)}
          </span>
        </div>
        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0"
          style={{ background: '#1E293B', border: '1px solid #334155', color: '#94A3B8' }}>
          {dia.servicios.length} svc
        </span>
      </header>

      {/* Services */}
      <div className="p-3 flex flex-col gap-3">
        {dia.servicios.map((svc, svcIndex) => (
          <ServicioCard
            key={svcIndex}
            servicio={svc}
            alerta={alertas.get(`${diaIndex}-${svcIndex}`)}
            onChange={(campo, valor) => onChange(diaIndex, svcIndex, campo, valor)}
            opcionesPlatos={opcionesPlatos}
            opcionesEnsaladas={opcionesEnsaladas}
            opcionesAcomps={opcionesAcomps}
          />
        ))}
      </div>
    </article>
  )
}
