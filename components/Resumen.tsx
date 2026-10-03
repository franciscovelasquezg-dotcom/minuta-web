import { DiaMinuta } from '@/types/minuta'

interface Props {
  dias: DiaMinuta[]
  alertas: Map<string, 'repetido' | 'cercano'>
}

export default function Resumen({ dias, alertas }: Props) {
  const totalServicios = dias.reduce((acc, d) => acc + d.servicios.length, 0)
  const confirmados    = dias.reduce((acc, d) => acc + d.servicios.filter(s => s.estado === 'Confirmado').length, 0)
  const pendientes     = totalServicios - confirmados
  const repetidos      = Array.from(alertas.values()).filter(v => v === 'repetido').length
  const asados         = dias.reduce((acc, d) => acc + d.servicios.filter(s => s.platoPrincipal === 'ASADO TRADICIONAL A LAS BRASAS').length, 0)

  const stats = [
    { label: 'Total Servicios',    value: totalServicios, icon: 'room_service', color: '#10B981', accent: '#082F1E' },
    { label: 'Confirmados',        value: confirmados,    icon: 'check_circle', color: '#34D399', accent: '#052E16' },
    { label: 'Pendientes',         value: pendientes,     icon: 'pending',      color: '#FBBF24', accent: '#1C1007' },
    { label: 'Repeticiones',       value: Math.floor(repetidos / 2), icon: 'warning', color: '#F87171', accent: '#1C0808' },
    { label: 'Asados Dominicales', value: asados,         icon: 'outdoor_grill',color: '#FB923C', accent: '#1C0E05' },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
      {stats.map(s => (
        <div key={s.label}
          className="rounded-xl p-4 text-center"
          style={{ background: '#0F172A', border: `1px solid #1E293B`, borderLeft: `3px solid ${s.color}` }}>
          <div className="flex items-center justify-center mb-1.5">
            <span className="material-symbols-outlined" style={{ fontSize: 18, color: s.color }}>
              {s.icon}
            </span>
          </div>
          <div className="font-bold text-white" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 22 }}>
            {s.value}
          </div>
          <div className="text-[11px] font-semibold uppercase tracking-wide mt-0.5" style={{ color: '#475569' }}>
            {s.label}
          </div>
        </div>
      ))}
    </div>
  )
}
