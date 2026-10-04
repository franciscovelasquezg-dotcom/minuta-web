import { Plato, Ensalada, Acompañamiento, Turno } from './api'
import { POSTRES } from '@/data/catalogos'
import { clasificarProteina } from './proteina'
import { DiaMinuta, Servicio } from '@/types/minuta'

const DIAS_SEMANA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

// Cuántos servicios de cada tipo queremos por ciclo (proporciones ideales)
const PROPORCION_IDEAL: Record<string, number> = {
  vacuno:   0.30,
  cerdo:    0.20,
  pollo:    0.25,
  pasta:    0.15,
  legumbre: 0.10,
  otro:     0.00,
}

// Shuffle determinístico con seed (para resultados reproducibles)
function shuffle<T>(arr: T[], seed: number): T[] {
  const a = [...arr]
  let s = seed
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) & 0xffffffff
    const j = Math.abs(s) % (i + 1);
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

interface SlotContext {
  diaIndex: number       // índice del día (0-based)
  diaSemana: string
  tipo: 'Almuerzo' | 'Cena'
  usadosPlatos: Map<string, number[]>   // plato → días donde se usó
  usadosEnsaladas: Set<string>
  usadosAcompsRecientes: string[]       // últimos 3 acompañamientos
  conteoTipos: Record<string, number>   // cuántos de cada tipo ya asignados
}

function elegirPlato(platos: Plato[], ctx: SlotContext, totalServicios: number, gapMin: number): Plato {
  // Domingo cena → Asado obligatorio
  if (ctx.diaSemana === 'Domingo' && ctx.tipo === 'Cena') {
    const asado = platos.find(p => p.nombre.includes('ASADO'))
    if (asado) return asado
  }

  const candidatos = platos.filter(p => {
    if (!p.activo) return false
    if (p.nombre.includes('ASADO') && !(ctx.diaSemana === 'Domingo' && ctx.tipo === 'Cena')) return false

    // Verificar gap mínimo
    const usos = ctx.usadosPlatos.get(p.id) || []
    if (usos.some(u => Math.abs(ctx.diaIndex - u) < gapMin)) return false
    return true
  })

  if (candidatos.length === 0) {
    // Si no hay candidatos que cumplan el gap, relajar y tomar el de mayor gap
    return platos
      .filter(p => p.activo && !p.nombre.includes('ASADO'))
      .sort((a, b) => {
        const dist = (id: string) => Math.min(999, ...(ctx.usadosPlatos.get(id) || []).map(u => Math.abs(ctx.diaIndex - u)))
        return dist(b.id) - dist(a.id)
      })[0]
  }

  // Scoring: priorizar tipos que están por debajo de la proporción ideal
  const scored = candidatos.map(p => {
    const tipo = clasificarProteina(p.nombre)
    const usado = ctx.conteoTipos[tipo] || 0
    const ideal = PROPORCION_IDEAL[tipo] || 0
    const realPct = totalServicios > 0 ? usado / totalServicios : 0
    const deficit = ideal - realPct  // mayor deficit → mayor prioridad

    // También preferir platos menos usados
    const veces = (ctx.usadosPlatos.get(p.id) || []).length
    const score = deficit * 100 - veces * 5

    return { p, score }
  })

  scored.sort((a, b) => b.score - a.score)
  // Entre los mejores candidatos (top 3), mezclar un poco para variedad
  const top = scored.slice(0, Math.min(3, scored.length))
  return top[ctx.diaIndex % top.length].p
}

function elegirAcompañamiento(acomps: Acompañamiento[], plato: Plato, ctx: SlotContext): Acompañamiento {
  // Primero intentar acompañamientos recomendados del plato
  if (plato.acompañamientosRecomendados.length > 0) {
    const recomendados = acomps.filter(a =>
      a.activo &&
      plato.acompañamientosRecomendados.some(r => r.toLowerCase() === a.nombre.toLowerCase()) &&
      !ctx.usadosAcompsRecientes.slice(-2).includes(a.id)
    )
    if (recomendados.length > 0) {
      return recomendados[ctx.diaIndex % recomendados.length]
    }
  }

  // Si es asado, usar parrilla/carbón
  if (plato.nombre.includes('ASADO')) {
    const parrilla = acomps.find(a => a.nombre.includes('Parrilla') || a.nombre.includes('Carbón'))
    if (parrilla) return parrilla
  }

  // Filtrar los últimos 2 usados para no repetir consecutivo
  const candidatos = acomps.filter(a =>
    a.activo &&
    !ctx.usadosAcompsRecientes.slice(-2).includes(a.id)
  )
  return candidatos[ctx.diaIndex % Math.max(1, candidatos.length)] || acomps[0]
}

export interface OpcionesGeneracion {
  // Días mínimos entre repeticiones de un mismo plato (el que eligió el usuario)
  gapMin?: number
  // Servicios confirmados a conservar tal cual: fijos[diaIndex][tipo]
  fijos?: Record<number, Partial<Record<'Almuerzo' | 'Cena', Servicio>>>
}

export function generarMinuta(
  platos: Plato[],
  ensaladas: Ensalada[],
  acomps: Acompañamiento[],
  turno: Turno,
  fechaInicio: string,
  _casino: string,
  opciones: OpcionesGeneracion = {}
): DiaMinuta[] {
  const totalDias = turno.diasEnFaena
  const totalServicios = totalDias * 2
  const gapMin = opciones.gapMin ?? 3
  const fijos = opciones.fijos || {}

  const usadosPlatos = new Map<string, number[]>()
  const usadosEnsaladas = new Set<string>()
  const usadosAcompsRecientes: string[] = []
  const conteoTipos: Record<string, number> = {}

  // Los confirmados cuentan desde el inicio: el resto se genera respetando la separación con ellos
  const idPorNombre = new Map(platos.map(p => [p.nombre, p.id]))
  Object.entries(fijos).forEach(([di, porTipo]) => Object.values(porTipo).forEach(svc => {
    if (!svc) return
    const id = idPorNombre.get(svc.platoPrincipal) || svc.platoPrincipal
    usadosPlatos.set(id, [...(usadosPlatos.get(id) || []), Number(di)])
    const t = clasificarProteina(svc.platoPrincipal)
    conteoTipos[t] = (conteoTipos[t] || 0) + 1
  }))

  // Pre-shuffle ensaladas para variedad
  const ensaladasOrdenadas = shuffle(ensaladas.filter(e => e.activo), 42)

  const fecha = new Date(fechaInicio + 'T12:00:00')
  const dias: DiaMinuta[] = []
  let ensaladaIdx = 0

  for (let i = 0; i < totalDias; i++) {
    const d = new Date(fecha)
    d.setDate(d.getDate() + i)
    const dd = String(d.getDate()).padStart(2, '0')
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const diaSemana = DIAS_SEMANA[d.getDay()]

    const servicios: Servicio[] = []

    for (const tipo of ['Almuerzo', 'Cena'] as const) {
      const fijo = fijos[i]?.[tipo]
      if (fijo) {
        servicios.push({ ...fijo })
        ensaladaIdx++
        continue
      }
      const ctx: SlotContext = {
        diaIndex: i,
        diaSemana,
        tipo,
        usadosPlatos,
        usadosEnsaladas,
        usadosAcompsRecientes,
        conteoTipos,
      }

      const plato = elegirPlato(platos, ctx, totalServicios, gapMin)
      const acomp = elegirAcompañamiento(acomps, plato, ctx)

      // Ensalada — rotar sin repetir
      const ensalada = ensaladasOrdenadas[ensaladaIdx % ensaladasOrdenadas.length]
      ensaladaIdx++

      // Registrar usos
      const usoActual = usadosPlatos.get(plato.id) || []
      usoActual.push(i)
      usadosPlatos.set(plato.id, usoActual)
      usadosEnsaladas.add(ensalada.id)
      usadosAcompsRecientes.push(acomp.id)
      if (usadosAcompsRecientes.length > 4) usadosAcompsRecientes.shift()

      const tipoPlato = clasificarProteina(plato.nombre)
      conteoTipos[tipoPlato] = (conteoTipos[tipoPlato] || 0) + 1

      // Postre rotativo simple
      const postresActivos = POSTRES.filter(p => p !== 'Por Definir')
      const postre = postresActivos[(i * 2 + (tipo === 'Cena' ? 1 : 0)) % postresActivos.length]

      // Opción hipocalórica: bowl de proteína del día + ensalada del día
      const tipoProteina = clasificarProteina(plato.nombre)
      const proteinaLabel: Record<string, string> = {
        vacuno: 'vacuno', cerdo: 'cerdo', pollo: 'pollo',
        pasta: 'proteína vegetal', legumbre: 'legumbre', otro: 'proteína del día',
      }
      const opcionHipo = `Bowl ${proteinaLabel[tipoProteina] || 'proteína del día'} + ${ensalada.nombre}`

      servicios.push({
        tipo,
        ensalada: ensalada.nombre,
        acompañamiento: acomp.nombre,
        platoPrincipal: plato.nombre,
        postre,
        opcionHipo,
        estado: 'Por Confirmar',
      })
    }

    dias.push({ dia: i + 1, fecha: `${dd}/${mm}`, diaSemana, servicios })
  }

  return dias
}
