import { DiaMinuta } from '@/types/minuta'

interface Props {
  dias: DiaMinuta[]
  alertas: Map<string, 'repetido' | 'cercano'>
}

export default function Resumen({ dias, alertas }: Props) {
  const totalServicios = dias.reduce((acc, d) => acc + d.servicios.length, 0)
  const confirmados = dias.reduce((acc, d) =>
    acc + d.servicios.filter((s) => s.estado === 'Confirmado').length, 0)
  const pendientes = totalServicios - confirmados
  const repetidos = Array.from(alertas.values()).filter((v) => v === 'repetido').length
  const asados = dias.reduce((acc, d) =>
    acc + d.servicios.filter((s) => s.platoPrincipal === 'ASADO TRADICIONAL A LAS BRASAS').length, 0)

  const stats = [
    { label: 'Total servicios', value: totalServicios, color: 'text-gray-700' },
    { label: 'Confirmados', value: confirmados, color: 'text-green-700' },
    { label: 'Pendientes', value: pendientes, color: 'text-yellow-700' },
    { label: 'Repeticiones', value: repetidos / 2, color: 'text-red-700' },
    { label: 'Asados dominicales', value: asados, color: 'text-amber-700' },
  ]

  return (
    <div className="grid grid-cols-5 gap-3 mb-6">
      {stats.map((s) => (
        <div key={s.label} className="bg-white rounded-lg border border-gray-200 p-3 text-center shadow-sm">
          <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
          <div className="text-[11px] text-gray-500 mt-0.5">{s.label}</div>
        </div>
      ))}
    </div>
  )
}
