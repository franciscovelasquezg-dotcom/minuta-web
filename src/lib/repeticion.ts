import { DiaMinuta } from '@/types/minuta'

export function detectarRepeticiones(
  dias: DiaMinuta[],
  diasMinimos: number
): Map<string, 'repetido' | 'cercano'> {
  const alertas = new Map<string, 'repetido' | 'cercano'>()

  const servicios: { key: string; plato: string; diaIndex: number }[] = []

  dias.forEach((dia, diaIndex) => {
    dia.servicios.forEach((servicio, svcIndex) => {
      const plato = servicio.platoPrincipal
      if (!plato || plato === 'Por Definir') return
      servicios.push({ key: `${diaIndex}-${svcIndex}`, plato, diaIndex })
    })
  })

  servicios.forEach((a, i) => {
    servicios.forEach((b, j) => {
      if (i >= j) return
      if (a.plato !== b.plato) return
      const diff = b.diaIndex - a.diaIndex
      if (diff < diasMinimos) {
        alertas.set(a.key, 'repetido')
        alertas.set(b.key, 'repetido')
      } else {
        if (!alertas.has(a.key)) alertas.set(a.key, 'cercano')
        if (!alertas.has(b.key)) alertas.set(b.key, 'cercano')
      }
    })
  })

  return alertas
}
