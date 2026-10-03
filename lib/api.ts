const SHEETS_URL = process.env.NEXT_PUBLIC_APPS_SCRIPT_URL!

// ── Caché en memoria (sesión) ──────────────────────────────────
const _memCache = new Map<string, { data: unknown; ts: number }>()
const MEM_TTL = 30_000 // 30 s — segunda línea de defensa tras localStorage

// ── localStorage helpers (solo en browser) ────────────────────
const LS_KEY = 'minuta_catalogos_v1'
const LS_TTL = 30 * 60 * 1000 // 30 min — igual al CacheService del backend

function lsGet<T>(key: string): T | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const { data, ts } = JSON.parse(raw)
    if (Date.now() - ts > LS_TTL) { localStorage.removeItem(key); return null }
    return data as T
  } catch { return null }
}

function lsSet(key: string, data: unknown) {
  if (typeof window === 'undefined') return
  try { localStorage.setItem(key, JSON.stringify({ data, ts: Date.now() })) } catch { /* cuota llena */ }
}

async function get<T>(tipo: string, params: Record<string, string> = {}): Promise<T> {
  const qs = new URLSearchParams({ tipo, ...params })
  const key = qs.toString()
  const mem = _memCache.get(key)
  if (mem && Date.now() - mem.ts < MEM_TTL) return mem.data as T
  const res = await fetch(`${SHEETS_URL}?${qs}`)
  const json = await res.json()
  if (!json.ok) throw new Error(json.error)
  _memCache.set(key, { data: json.data, ts: Date.now() })
  return json.data
}

export function invalidarCache() {
  _memCache.clear()
  if (typeof window !== 'undefined') localStorage.removeItem(LS_KEY)
}

// ── getCatalogos con stale-while-revalidate ───────────────────
// Retorna inmediatamente desde localStorage si hay datos frescos,
// luego refresca en background y notifica al llamador mediante el callback.
export function getCatalogosConCache(
  onImmediate: (c: Catalogos) => void,
  onRefreshed?: (c: Catalogos) => void
): void {
  const cached = lsGet<Catalogos>(LS_KEY)
  if (cached) {
    onImmediate(cached)
    // Revalidar en background
    get<Catalogos>('catalogos').then(fresh => {
      lsSet(LS_KEY, fresh)
      _memCache.set('tipo=catalogos', { data: fresh, ts: Date.now() })
      if (onRefreshed) onRefreshed(fresh)
    }).catch(() => { /* silencioso — ya tenemos datos */ })
    return
  }
  // Sin caché: fetch normal, mostrar loading hasta que llegue
  get<Catalogos>('catalogos').then(fresh => {
    lsSet(LS_KEY, fresh)
    onImmediate(fresh)
    if (onRefreshed) onRefreshed(fresh)
  })
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
  getCatalogos: () => get<Catalogos>('catalogos').then(c => { lsSet(LS_KEY, c); return c }),
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
