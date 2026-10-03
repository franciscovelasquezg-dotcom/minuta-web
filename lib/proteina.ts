export type TipoProteina = 'vacuno' | 'cerdo' | 'pollo' | 'pescado' | 'pasta' | 'legumbre' | 'vegetariano' | 'otro'

// El nombre explícito de la especie manda sobre la técnica de cocción:
// "Pollo Asado" es pollo aunque contenga "asado", "Espirales con Cerdo" es cerdo aunque sea pasta.
const ESPECIE_EXPLICITA: [TipoProteina, string[]][] = [
  ['pollo', ['pollo', 'pechuga', 'gallina', 'pavo']],
  ['cerdo', ['cerdo', 'chancho']],
  ['pescado', ['pescado', 'merluza', 'salmón', 'salmon', 'atún', 'atun', 'congrio', 'reineta', 'jurel', 'sardina', 'camarón', 'camaron', 'marisco']],
  ['vacuno', ['vacuno']],
]

const POR_PREPARACION: [TipoProteina, string[]][] = [
  ['legumbre', ['lenteja', 'poroto', 'garbanzo', 'arvejas', 'habas', 'legumbre']],
  ['cerdo', ['chuleta', 'medalla', 'costilla', 'pernil', 'tocino', 'longaniza']],
  ['vegetariano', ['vegetariano', 'vegano', 'tofu']],
  ['vacuno', ['carne', 'asado', 'estofado', 'mechada', 'albóndiga', 'albondiga', 'tortica', 'bistec', 'lomo', 'osobuco', 'plateada', 'malaya', 'cazuela de vac']],
  ['pasta', ['spaghetti', 'mostaccioli', 'espirales', 'fettuccine', 'fideos', 'pasta', 'tallarín', 'tallarin', 'lasaña', 'lasana', 'macarrón', 'macarron']],
]

export function clasificarProteina(nombre: string): TipoProteina {
  const n = (nombre || '').toLowerCase()
  for (const [tipo, claves] of ESPECIE_EXPLICITA) if (claves.some(k => n.includes(k))) return tipo
  for (const [tipo, claves] of POR_PREPARACION) if (claves.some(k => n.includes(k))) return tipo
  return 'otro'
}

export const PROTEINA_LABEL: Record<TipoProteina, string> = {
  vacuno: 'Vacuno', cerdo: 'Cerdo', pollo: 'Pollo', pescado: 'Pescado',
  pasta: 'Pasta', legumbre: 'Legumbre', vegetariano: 'Vegetariano', otro: 'Otro',
}
