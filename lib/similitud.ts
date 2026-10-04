import { DiaMinuta } from '@/types/minuta'
import { clasificarProteina } from '@/lib/proteina'

// Detección de platos principales "parecidos" (no idénticos).
// 1. Se reduce el nombre a su núcleo: sin palabras de relleno, sin la proteína ni el formato (pasta/arroz),
//    y con variantes unificadas (salteado/salteada → saltead).
// 2. Núcleo idéntico → "misma preparación" (Chopsui de Pollo ↔ Chopsui de Vacuno).
//    Núcleo que comparte alguna palabra → "misma salsa o técnica" (Asado a las brasas ↔ Pollo Asado).
// 3. Si ambos platos tienen "Familia" en el catálogo, la familia manda sobre la detección automática.

export type TipoParecido = 'familia' | 'preparacion' | 'tecnica'

export const PARECIDO_LABEL: Record<TipoParecido, string> = {
  familia: 'misma familia',
  preparacion: 'misma preparación',
  tecnica: 'misma salsa o técnica',
}

const RELLENO = new Set(['con', 'en', 'de', 'del', 'a', 'al', 'la', 'las', 'el', 'los', 'su', 'sus', 'y', 'e', 'salsa', 'tradicional', 'casero', 'casera', 'estilo', 'tipo'])
const PROTEINA = new Set(['pollo', 'vacuno', 'carne', 'cerdo', 'chancho', 'pescado', 'merluza', 'salmon', 'atun', 'reineta', 'congrio', 'pavo', 'pechuga', 'trutro', 'chuleta', 'medalla', 'costilla', 'lomo', 'posta', 'lentejas', 'porotos', 'garbanzos'])
const FORMATO = new Set(['spaghetti', 'espagueti', 'mostaccioli', 'espirales', 'fideos', 'tallarines', 'fettuccine', 'pasta', 'arroz', 'pure', 'papas', 'cubitos', 'trozos'])

const sinTildes = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '')

function raiz(p: string): string {
  let r = p
  if (r.length > 3 && r.endsWith('s')) r = r.slice(0, -1)
  if (r.length > 4 && (r.endsWith('a') || r.endsWith('o'))) r = r.slice(0, -1)
  return r
}

export function nucleo(nombre: string): Set<string> {
  const palabras = sinTildes((nombre || '').toLowerCase()).replace(/[^a-z\s]/g, ' ').split(/\s+/).filter(Boolean)
  return new Set(palabras.filter(p => !RELLENO.has(p) && !PROTEINA.has(p) && !FORMATO.has(p)).map(raiz))
}

export function tipoParecido(a: string, b: string, familias?: Map<string, string>): TipoParecido | null {
  if (!a || !b || a === b) return null
  const fa = familias?.get(a)?.trim().toLowerCase()
  const fb = familias?.get(b)?.trim().toLowerCase()
  if (fa && fb) return fa === fb ? 'familia' : null
  const na = nucleo(a), nb = nucleo(b)
  if (na.size === 0 || nb.size === 0) return null
  const comunes = [...na].filter(x => nb.has(x)).length
  if (comunes === 0) return null
  return comunes === na.size && comunes === nb.size ? 'preparacion' : 'tecnica'
}

export function detalleParecido(a: string, b: string, tipo: TipoParecido): string {
  if (tipo !== 'preparacion') return PARECIDO_LABEL[tipo]
  return clasificarProteina(a) === clasificarProteina(b) ? 'misma preparación, otro formato' : 'misma preparación, otra proteína'
}

export interface ServicioRef { di: number; tipo: string; plato: string }
export interface ParParecido { a: ServicioRef; b: ServicioRef; tipo: TipoParecido; detalle: string; distancia: number }

// Pares de platos parecidos servidos a menos de `diasMinimos` días (la misma regla que los repetidos).
// Un par por combinación de platos, con su aparición más cercana.
export function detectarParecidos(dias: DiaMinuta[], diasMinimos: number, familias?: Map<string, string>): ParParecido[] {
  const servicios: ServicioRef[] = []
  dias.forEach((d, di) => d.servicios.forEach(s => {
    if (s.platoPrincipal && s.platoPrincipal !== 'Por Definir') servicios.push({ di, tipo: s.tipo, plato: s.platoPrincipal })
  }))
  const cache = new Map<string, TipoParecido | null>()
  const pares = new Map<string, ParParecido>()
  for (let i = 0; i < servicios.length; i++) {
    for (let j = i + 1; j < servicios.length; j++) {
      const a = servicios[i], b = servicios[j]
      const distancia = b.di - a.di
      if (distancia >= diasMinimos) continue
      const clave = [a.plato, b.plato].sort().join('||')
      if (!cache.has(clave)) cache.set(clave, tipoParecido(a.plato, b.plato, familias))
      const tipo = cache.get(clave)
      if (!tipo) continue
      const previo = pares.get(clave)
      if (!previo || distancia < previo.distancia) pares.set(clave, { a, b, tipo, detalle: detalleParecido(a.plato, b.plato, tipo), distancia })
    }
  }
  return [...pares.values()].sort((x, y) => x.a.di - y.a.di || x.distancia - y.distancia)
}
