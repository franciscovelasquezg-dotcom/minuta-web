import { DiaMinuta } from '@/types/minuta'
import { clasificarProteina, TipoProteina } from '@/lib/proteina'

interface Props {
  dias: DiaMinuta[]
  semana: number
}

const PROT_COLOR: Record<TipoProteina, string> = {
  vacuno: '#EF4444', pollo: '#F59E0B', cerdo: '#FB7185', pescado: '#38BDF8',
  pasta: '#F97316', legumbre: '#10B981', vegetariano: '#10B981', otro: '#64748B',
}

function getProteinColor(plato: string): string {
  return PROT_COLOR[clasificarProteina(plato)]
}

export default function VistaSemanal({ dias, semana }: Props) {
  const inicio     = (semana - 1) * 7
  const semDias    = dias.slice(inicio, inicio + 7)

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="material-symbols-outlined" style={{ fontSize: 15, color: '#10B981' }}>date_range</span>
        <h3 className="font-bold text-white text-sm" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
          Semana {semana} · {semDias[0]?.fecha} → {semDias[semDias.length - 1]?.fecha}
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full" style={{ borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: '#0F172A', borderBottom: '2px solid #1E293B' }}>
              <th className="px-3 py-2.5 text-left font-bold uppercase tracking-wider" style={{ color: '#475569', fontSize: 10, width: 80 }}>Servicio</th>
              {semDias.map(d => (
                <th key={d.dia} className="px-3 py-2.5 text-center font-bold" style={{ color: '#94A3B8', fontSize: 11 }}>
                  <div>{d.diaSemana}</div>
                  <div style={{ color: '#475569', fontSize: 10, fontWeight: 400 }}>{d.fecha}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(['Almuerzo', 'Cena'] as const).map((tipo, ti) => (
              <tr key={tipo} style={{ background: ti === 0 ? '#0B1326' : '#0D1320', borderBottom: '1px solid #1E293B' }}>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined" style={{ fontSize: 14, color: tipo === 'Almuerzo' ? '#F59E0B' : '#818CF8', fontVariationSettings: "'FILL' 1" }}>
                      {tipo === 'Almuerzo' ? 'wb_sunny' : 'bedtime'}
                    </span>
                    <span className="font-bold uppercase tracking-wider" style={{ color: '#64748B', fontSize: 10 }}>{tipo}</span>
                  </div>
                </td>
                {semDias.map(dia => {
                  const svc = dia.servicios.find(s => s.tipo === tipo)
                  if (!svc) return (
                    <td key={dia.dia} className="px-3 py-3 text-center" style={{ color: '#334155' }}>—</td>
                  )
                  const protColor = getProteinColor(svc.platoPrincipal)
                  return (
                    <td key={dia.dia} className="px-3 py-3 text-center" style={{ borderLeft: '1px solid #1E293B' }}>
                      <div className="font-semibold leading-tight mb-1" style={{ color: '#E2E8F0', fontSize: 11 }}>
                        {svc.platoPrincipal}
                      </div>
                      <div className="inline-block w-4 h-0.5 rounded-full mb-1" style={{ background: protColor }} />
                      <div style={{ color: '#64748B', fontSize: 10 }}>+ {svc.acompañamiento}</div>
                      <div style={{ color: '#475569', fontSize: 10, fontStyle: 'italic' }}>{svc.ensalada}</div>
                      {svc.opcionHipo && (
                        <div className="mt-1 px-1.5 py-0.5 rounded inline-block" style={{ background: '#082F1E', border: '1px solid #065F46', color: '#34D399', fontSize: 9 }}>
                          🥗 {svc.opcionHipo}
                        </div>
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
