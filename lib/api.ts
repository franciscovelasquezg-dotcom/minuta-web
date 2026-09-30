const URL = process.env.NEXT_PUBLIC_APPS_SCRIPT_URL!
const SECRET = process.env.APPS_SCRIPT_SECRET || 'MinutaCasino2026_k9M3n7P4q2Z1w5Y6v8U0t3'

// HMAC para POST (solo en servidor)
async function hmacToken(): Promise<{ t: string; sig: string }> {
  const t = String(Math.floor(Date.now() / 1000))
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey('raw', enc.encode(SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const buf = await crypto.subtle.sign('HMAC', key, enc.encode(t))
  const sig = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
  return { t, sig }
}

async function get<T>(tipo: string, params: Record<string, string> = {}): Promise<T> {
  const qs = new URLSearchParams({ tipo, ...params })
  const res = await fetch(`${URL}?${qs}`, { cache: 'no-store' })
  const json = await res.json()
  if (!json.ok) throw new Error(json.error)
  return json.data
}

async function post<T>(accion: string, body: object): Promise<T> {
  const token = typeof window === 'undefined' ? await hmacToken() : { t: '', sig: '' }
  const res = await fetch(URL, {
    method: 'POST',
    body: JSON.stringify({ accion, ...token, ...body }),
  })
  const json = await res.json()
  if (!json.ok) throw new Error(json.error)
  return json.data
}

export interface Plato {
  id: string
  nombre: string
  tipo: string
  acompañamientosRecomendados: string[]
  receta: string
  activo: boolean
}

export interface Ensalada {
  id: string
  nombre: string
  tipo: string
  activo: boolean
}

export interface Acompañamiento {
  id: string
  nombre: string
  tipo: string
  activo: boolean
}

export interface Turno {
  codigo: string
  nombre: string
  diasEnFaena: number
  diasDescanso: number
  activo: boolean
}

export interface Catalogos {
  platos: Plato[]
  ensaladas: Ensalada[]
  acompañamientos: Acompañamiento[]
  turnos: Turno[]
}

export interface ServicioAPI {
  tipo: 'Almuerzo' | 'Cena'
  ensalada: string
  acompañamiento: string
  platoPrincipal: string
  estado: string
}

export interface DiaAPI {
  dia: number
  fecha: string
  diaSemana: string
  servicios: ServicioAPI[]
}

export interface MinutaAPI {
  turno: string
  casino: string
  fechaInicio: string
  diasMinimosRepeticion: number
  dias: DiaAPI[]
}

export const api = {
  getCatalogos: () => get<Catalogos>('catalogos'),
  getTurnos: () => get<Turno[]>('turnos'),
  getMinuta: (turno: string) => get<MinutaAPI>('minuta', { turno }),
  guardarMinuta: (data: MinutaAPI) => post<{ ok: boolean }>('guardar_minuta', data),
  nuevoCiclo: (turno: string, fechaInicio: string, casino: string) =>
    post<{ ok: boolean }>('nuevo_ciclo', { turno, fechaInicio, casino, diasMinimosRepeticion: 3 }),
  guardarPlato: (plato: Partial<Plato>) => post<{ ok: boolean }>('guardar_plato', { plato }),
  eliminarPlato: (id: string) => post<{ ok: boolean }>('eliminar_plato', { id }),
  guardarEnsalada: (ensalada: Partial<Ensalada>) => post<{ ok: boolean }>('guardar_ensalada', { ensalada }),
  guardarAcompañamiento: (acomp: Partial<Acompañamiento>) => post<{ ok: boolean }>('guardar_acomp', { acomp }),
}
