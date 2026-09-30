const SHEETS_URL = process.env.NEXT_PUBLIC_APPS_SCRIPT_URL!

async function get<T>(tipo: string, params: Record<string, string> = {}): Promise<T> {
  const qs = new URLSearchParams({ tipo, ...params })
  const res = await fetch(`${SHEETS_URL}?${qs}`, { cache: 'no-store' })
  const json = await res.json()
  if (!json.ok) throw new Error(json.error)
  return json.data
}

async function post<T>(accion: string, body: object): Promise<T> {
  const res = await fetch('/api/sheets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accion, ...body }),
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
  postre: string
  opcionHipo: string
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

export interface HistorialEntry {
  timestamp: string
  casino: string
  fechaInicio: string
  totalDias: number
  confirmados: number
}

export const api = {
  getCatalogos: () => get<Catalogos>('catalogos'),
  getTurnos: () => get<Turno[]>('turnos'),
  getMinuta: (turno: string) => get<MinutaAPI>('minuta', { turno }),
  getHistorial: (turno: string) => get<HistorialEntry[]>('historial', { turno }),
  guardarMinuta: (data: MinutaAPI) => post<{ ok: boolean }>('guardar_minuta', data),
  nuevoCiclo: (turno: string, fechaInicio: string, casino: string) =>
    post<{ ok: boolean }>('nuevo_ciclo', { turno, fechaInicio, casino, diasMinimosRepeticion: 3 }),
  guardarPlato: (plato: Partial<Plato>) => post<{ ok: boolean }>('guardar_plato', { plato }),
  eliminarPlato: (id: string) => post<{ ok: boolean }>('eliminar_plato', { id }),
  guardarEnsalada: (ensalada: Partial<Ensalada>) => post<{ ok: boolean }>('guardar_ensalada', { ensalada }),
  guardarAcompañamiento: (acomp: Partial<Acompañamiento>) => post<{ ok: boolean }>('guardar_acomp', { acomp }),
}
