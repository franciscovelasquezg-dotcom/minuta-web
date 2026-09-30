export type Estado = 'Confirmado' | 'Por Confirmar' | 'En Revisión'

export interface Servicio {
  tipo: 'Almuerzo' | 'Cena'
  ensalada: string
  acompañamiento: string
  platoPrincipal: string
  estado: Estado
}

export interface DiaMinuta {
  dia: number
  fecha: string
  diaSemana: string
  servicios: Servicio[]
}

export interface Ciclo {
  nombre: string
  fechaInicio: string
  diasMinimosRepeticion: number
  dias: DiaMinuta[]
}
