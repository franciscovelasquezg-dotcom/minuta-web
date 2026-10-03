import { DiaMinuta } from '@/types/minuta'

interface Props {
  dias: DiaMinuta[]
  semana: number
}

function getProteinColor(plato: string): string {
  const n = plato.toLowerCase()
  if (['vacuno','carne','asado','mechada','bistec','estofado','tortica','albóndiga'].some(k => n.includes(k))) return '#EF4444'
  if (['pollo','gallina','pavo'].some(k => n.includes(k))) return '#F59E0B'
  if (['cerdo','chuleta','costilla','pernil','medalla'].some(k => n.includes(k))) return '#FB7185'
  if (['merluza','salmón','reineta','pescado','atún'].some(k => n.includes(k))) return '#38BDF8'
  if (['spaghetti','mostaccioli','espirales','pasta','lasaña','tallarín'].some(k => n.includes(k))) return '#F97316'
  if (['lenteja','poroto','garbanzo','arvejas','legumbre'].some(k => n.includes(k))) return '#10B981'
  return '#64748B'
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
