import { DiaMinuta } from '@/types/minuta'
import { clasificarProteina, PROTEINA_LABEL } from '@/lib/proteina'

// Metas de balance del menú. Valores por defecto = propuesta inicial (ajustables en Catálogos → Metas).
// Base: guías alimentarias MINSAL (legumbres 2×/semana, pescado ≥1×/semana) adaptadas a casino de faena.
export interface MetasBalance {
  carnesRojasMaxPct: number   // vacuno + cerdo, % de servicios
  polloMinPct: number         // % de servicios
  pescadoMinSemana: number    // servicios por semana
  legumbreMinSemana: number   // servicios por semana
  pastaMaxPct: number         // pasta como plato principal, % de servicios
  variedadMinPct: number      // platos distintos / servicios
  mismaProteinaDiaMaxSemana: number // días con la misma proteína en almuerzo y cena, por semana
}

export const METAS_DEFAULT: MetasBalance = {
  carnesRojasMaxPct: 45,
  polloMinPct: 20,
  pescadoMinSemana: 1,
  legumbreMinSemana: 2,
  pastaMaxPct: 15,
  variedadMinPct: 60,
  mismaProteinaDiaMaxSemana: 1,
}

export const METAS_INFO: { key: keyof MetasBalance; label: string; unidad: string; tipo: 'max' | 'min' }[] = [
  { key: 'carnesRojasMaxPct', label: 'Carnes rojas (vacuno + cerdo)', unidad: '% máx.', tipo: 'max' },
  { key: 'polloMinPct', label: 'Pollo', unidad: '% mín.', tipo: 'min' },
  { key: 'pescadoMinSemana', label: 'Pescado', unidad: 'mín. por semana', tipo: 'min' },
  { key: 'legumbreMinSemana', label: 'Legumbres', unidad: 'mín. por semana', tipo: 'min' },
  { key: 'pastaMaxPct', label: 'Pasta como plato principal', unidad: '% máx.', tipo: 'max' },
  { key: 'variedadMinPct', label: 'Variedad (platos distintos)', unidad: '% mín.', tipo: 'min' },
  { key: 'mismaProteinaDiaMaxSemana', label: 'Misma proteína en almuerzo y cena', unidad: 'días máx. por semana', tipo: 'max' },
]

export type EstadoIndicador = 'ok' | 'cerca' | 'falla'

export interface Indicador {
  label: string
  meta: string
  actual: string
  estado: EstadoIndicador
  detalle?: string
}

const definido = (v: string) => !!v && v !== 'Por Definir'
const r1 = (n: number) => Math.round(n * 10) / 10

function evaluar(actual: number, meta: number, tipo: 'max' | 'min', margen: number): EstadoIndicador {
  const cumple = tipo === 'max' ? actual <= meta : actual >= meta
  if (cumple) return 'ok'
  return Math.abs(actual - meta) <= margen ? 'cerca' : 'falla'
}

export function calcularBalance(dias: DiaMinuta[], metas: MetasBalance): Indicador[] {
  const servicios = dias.flatMap(d => d.servicios).filter(s => definido(s.platoPrincipal))
  const n = servicios.length
  if (n === 0) return []
  const semanas = Math.max(dias.length / 7, 1)
  const cuenta = (tipos: string[]) => servicios.filter(s => tipos.includes(clasificarProteina(s.platoPrincipal))).length
  const pct = (c: number) => Math.round((c / n) * 100)

  const rojas = cuenta(['vacuno', 'cerdo'])
  const pollo = cuenta(['pollo'])
  const pescado = cuenta(['pescado'])
  const legumbre = cuenta(['legumbre'])
  const pasta = cuenta(['pasta'])
  const distintos = new Set(servicios.map(s => s.platoPrincipal)).size

  const diasMismaProt = dias.filter(d => {
    const prots = d.servicios.filter(s => definido(s.platoPrincipal)).map(s => clasificarProteina(s.platoPrincipal))
    return prots.length >= 2 && new Set(prots).size < prots.length
  })

  return [
    { label: 'Carnes rojas (vacuno + cerdo)', meta: `máx. ${metas.carnesRojasMaxPct}%`, actual: `${pct(rojas)}%`, estado: evaluar(pct(rojas), metas.carnesRojasMaxPct, 'max', 5), detalle: `${rojas} de ${n} servicios` },
    { label: 'Pollo', meta: `mín. ${metas.polloMinPct}%`, actual: `${pct(pollo)}%`, estado: evaluar(pct(pollo), metas.polloMinPct, 'min', 5), detalle: `${pollo} de ${n} servicios` },
    { label: 'Pescado', meta: `mín. ${metas.pescadoMinSemana} por semana`, actual: `${r1(pescado / semanas)} por semana`, estado: evaluar(pescado / semanas, metas.pescadoMinSemana, 'min', 0.5), detalle: `${pescado} en ${dias.length} días` },
    { label: 'Legumbres', meta: `mín. ${metas.legumbreMinSemana} por semana`, actual: `${r1(legumbre / semanas)} por semana`, estado: evaluar(legumbre / semanas, metas.legumbreMinSemana, 'min', 0.5), detalle: `${legumbre} en ${dias.length} días` },
    { label: 'Pasta como plato principal', meta: `máx. ${metas.pastaMaxPct}%`, actual: `${pct(pasta)}%`, estado: evaluar(pct(pasta), metas.pastaMaxPct, 'max', 5), detalle: `${pasta} de ${n} servicios` },
    { label: 'Variedad (platos distintos)', meta: `mín. ${metas.variedadMinPct}%`, actual: `${pct(distintos)}%`, estado: evaluar(pct(distintos), metas.variedadMinPct, 'min', 5), detalle: `${distintos} platos distintos en ${n} servicios` },
    { label: 'Misma proteína en almuerzo y cena', meta: `máx. ${metas.mismaProteinaDiaMaxSemana} día por semana`, actual: `${r1(diasMismaProt.length / semanas)} por semana`, estado: evaluar(diasMismaProt.length / semanas, metas.mismaProteinaDiaMaxSemana, 'max', 0.5), detalle: diasMismaProt.length ? `Días: ${diasMismaProt.map(d => d.dia).join(', ')}` : 'Ningún día' },
  ]
}

// ── Estado por día (opción A: verde / ámbar / rojo, sin puntaje) ──
export type EstadoDia = 'ok' | 'limite' | 'conflicto' | 'incompleto'

export interface DiaEvaluado { estado: EstadoDia; motivos: string[] }

export function evaluarDias(dias: DiaMinuta[], diasMinimos: number): DiaEvaluado[] {
  // Posiciones (índice de día) de cada plato principal
  const pos = new Map<string, number[]>()
  dias.forEach((d, di) => d.servicios.forEach(s => {
    if (!definido(s.platoPrincipal)) return
    const arr = pos.get(s.platoPrincipal) || []
    if (!arr.includes(di)) arr.push(di)
    pos.set(s.platoPrincipal, arr)
  }))

  return dias.map((d, di) => {
    const motivos: string[] = []
    let nivel = 0 // 0 ok, 1 límite, 2 conflicto
    d.servicios.forEach(s => {
      if (!definido(s.platoPrincipal)) return
      const arr = pos.get(s.platoPrincipal) || []
      const i = arr.indexOf(di)
      const vecinos = [arr[i - 1], arr[i + 1]].filter((x): x is number => x !== undefined)
      const cercania = Math.min(...vecinos.map(x => Math.abs(x - di)), Infinity)
      const repetidoMismoDia = d.servicios.filter(x => x.platoPrincipal === s.platoPrincipal).length > 1
      if (repetidoMismoDia || cercania < diasMinimos) {
        nivel = 2
        motivos.push(`${s.tipo}: "${s.platoPrincipal}" se repite ${repetidoMismoDia ? 'el mismo día' : `a ${cercania} ${cercania === 1 ? 'día' : 'días'}`} (mínimo ${diasMinimos})`)
      } else if (cercania < diasMinimos + 2) {
        nivel = Math.max(nivel, 1)
        motivos.push(`${s.tipo}: "${s.platoPrincipal}" se repite a ${cercania} días (justo en el límite)`)
      }
    })
    const prots = d.servicios.filter(s => definido(s.platoPrincipal)).map(s => clasificarProteina(s.platoPrincipal))
    if (prots.length >= 2 && new Set(prots).size < prots.length) {
      nivel = Math.max(nivel, 1)
      motivos.push(`Almuerzo y cena con la misma proteína (${PROTEINA_LABEL[prots[0]]})`)
    }
    const faltan = d.servicios.filter(s => !definido(s.platoPrincipal)).length
    if (faltan > 0) motivos.push(`${faltan} servicio${faltan > 1 ? 's' : ''} sin plato definido`)
    const estado: EstadoDia = nivel === 2 ? 'conflicto' : nivel === 1 ? 'limite' : faltan > 0 ? 'incompleto' : 'ok'
    return { estado, motivos }
  })
}
