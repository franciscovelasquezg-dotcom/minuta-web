'use client'

import { useState, useCallback } from 'react'
import { Ciclo, Servicio } from '@/types/minuta'
import { MINUTA_INICIAL } from '@/data/minuta-inicial'
import { detectarRepeticiones } from '@/lib/repeticion'
import DiaCard from '@/components/DiaCard'
import Resumen from '@/components/Resumen'
import VistaSemanal from '@/components/VistaSemanal'

type Vista = 'edicion' | 'semanal'

export default function Home() {
  const [ciclo, setCiclo] = useState<Ciclo>(MINUTA_INICIAL)
  const [vista, setVista] = useState<Vista>('edicion')

  const alertas = detectarRepeticiones(ciclo.dias, ciclo.diasMinimosRepeticion)

  const handleChange = useCallback(
    (diaIndex: number, svcIndex: number, campo: keyof Servicio, valor: string) => {
      setCiclo((prev) => {
        const dias = prev.dias.map((d, di) => {
          if (di !== diaIndex) return d
          return {
            ...d,
            servicios: d.servicios.map((s, si) => {
              if (si !== svcIndex) return s
              return { ...s, [campo]: valor }
            }),
          }
        })
        return { ...prev, dias }
      })
    },
    []
  )

  const semana1 = ciclo.dias.slice(0, 7)
  const semana2 = ciclo.dias.slice(7, 14)

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-gray-900 text-white px-6 py-4 print:hidden">
        <div className="max-w-screen-xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Minuta Quincenal</h1>
            <p className="text-gray-400 text-sm">{ciclo.nombre}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-gray-400 text-sm">
              Ciclo: {ciclo.dias[0]?.fecha} — {ciclo.dias[ciclo.dias.length - 1]?.fecha}
            </span>
            <div className="flex rounded-lg overflow-hidden border border-gray-600">
              <button
                onClick={() => setVista('edicion')}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${vista === 'edicion' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
              >
                Edición
              </button>
              <button
                onClick={() => setVista('semanal')}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${vista === 'semanal' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
              >
                Vista Semanal
              </button>
            </div>
            <button
              onClick={() => window.print()}
              className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-sm rounded-lg transition-colors"
            >
              🖨 Imprimir
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-screen-xl mx-auto px-4 py-6">
        {/* Resumen */}
        <div className="print:hidden">
          <Resumen dias={ciclo.dias} alertas={alertas} />
        </div>

        {vista === 'edicion' && (
          <div className="print:hidden">
            {/* Semana 1 */}
            <h2 className="text-sm font-bold text-gray-600 uppercase tracking-wider mb-3">
              Semana 1 · {semana1[0]?.fecha} al {semana1[semana1.length - 1]?.fecha}
            </h2>
            <div className="grid grid-cols-7 gap-3 mb-8">
              {semana1.map((dia, i) => (
                <DiaCard
                  key={dia.dia}
                  dia={dia}
                  diaIndex={i}
                  alertas={alertas}
                  onChange={handleChange}
                />
              ))}
            </div>

            {/* Semana 2 */}
            <h2 className="text-sm font-bold text-gray-600 uppercase tracking-wider mb-3">
              Semana 2 · {semana2[0]?.fecha} al {semana2[semana2.length - 1]?.fecha}
            </h2>
            <div className="grid grid-cols-7 gap-3">
              {semana2.map((dia, i) => (
                <DiaCard
                  key={dia.dia}
                  dia={dia}
                  diaIndex={i + 7}
                  alertas={alertas}
                  onChange={handleChange}
                />
              ))}
            </div>
          </div>
        )}

        {vista === 'semanal' && (
          <div className="space-y-8 print:space-y-12">
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <VistaSemanal dias={ciclo.dias} semana={1} />
            </div>
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <VistaSemanal dias={ciclo.dias} semana={2} />
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
