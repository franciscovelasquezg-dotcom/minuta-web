'use client'

import { DiaMinuta, Servicio } from '@/types/minuta'
import ServicioCard from './ServicioCard'

interface Props {
  dia: DiaMinuta
  alertas: Map<string, 'repetido' | 'cercano'>
  diaIndex: number
  onChange: (diaIndex: number, svcIndex: number, campo: keyof Servicio, valor: string) => void
}

const esFinDeSemana = (diaSemana: string) =>
  diaSemana === 'Sábado' || diaSemana === 'Domingo'

export default function DiaCard({ dia, alertas, diaIndex, onChange }: Props) {
  return (
    <div className={`rounded-lg overflow-hidden shadow-sm border ${esFinDeSemana(dia.diaSemana) ? 'border-amber-300' : 'border-gray-200'}`}>
      <div className={`px-3 py-2 ${esFinDeSemana(dia.diaSemana) ? 'bg-amber-50' : 'bg-gray-50'}`}>
        <div className="flex items-baseline gap-2">
          <span className="text-xs font-bold text-gray-500">Día {dia.dia}</span>
          <span className="text-sm font-bold text-gray-800">{dia.diaSemana}</span>
          <span className="text-xs text-gray-500">{dia.fecha}</span>
        </div>
      </div>
      <div className="p-2 space-y-2 bg-gray-50">
        {dia.servicios.map((svc, svcIndex) => (
          <ServicioCard
            key={svcIndex}
            servicio={svc}
            alerta={alertas.get(`${diaIndex}-${svcIndex}`)}
            onChange={(campo, valor) => onChange(diaIndex, svcIndex, campo, valor)}
          />
        ))}
      </div>
    </div>
  )
}
