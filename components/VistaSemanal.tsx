import { DiaMinuta } from '@/types/minuta'

interface Props {
  dias: DiaMinuta[]
  semana: number
}

export default function VistaSemanal({ dias, semana }: Props) {
  const inicio = (semana - 1) * 7
  const semanasDias = dias.slice(inicio, inicio + 7)

  return (
    <div className="print:block">
      <h3 className="text-sm font-bold text-gray-600 mb-2">
        Semana {semana} · {semanasDias[0]?.fecha} al {semanasDias[semanasDias.length - 1]?.fecha}
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-gray-800 text-white">
              <th className="p-2 text-left w-20"></th>
              {semanasDias.map((d) => (
                <th key={d.dia} className="p-2 text-center">
                  <div className="font-bold">{d.diaSemana}</div>
                  <div className="text-gray-400 text-[10px]">{d.fecha}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(['Almuerzo', 'Cena'] as const).map((tipo) => (
              <tr key={tipo} className={tipo === 'Almuerzo' ? 'bg-blue-50' : 'bg-indigo-50'}>
                <td className="p-2 font-bold text-[11px] uppercase text-gray-600">{tipo}</td>
                {semanasDias.map((dia) => {
                  const svc = dia.servicios.find((s) => s.tipo === tipo)
                  if (!svc) return <td key={dia.dia} className="p-2">—</td>
                  return (
                    <td key={dia.dia} className="p-2 border border-white text-center">
                      <div className="font-semibold text-gray-800 leading-tight">{svc.platoPrincipal}</div>
                      <div className="text-gray-500 text-[10px]">con {svc.acompañamiento}</div>
                      <div className="text-gray-400 text-[10px] italic">{svc.ensalada}</div>
                      {svc.opcionHipo && (
                        <div className="mt-1 text-[9px] text-green-700 bg-green-50 rounded px-1 py-0.5">🥗 {svc.opcionHipo}</div>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
