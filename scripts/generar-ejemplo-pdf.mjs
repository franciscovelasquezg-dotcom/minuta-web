import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// ── Datos de ejemplo: minuta 14 días con problemas deliberados ─
const dias = [
  { dia:1,  fecha:'01/10', diaSemana:'Miércoles', al:'Pollo Asado',                 acomAl:'Puré de Papas',     ensAl:'Lechuga con Espinaca',      cena:'Albóndigas en salsa Pomodoro', acomCe:'Pasta',          ensCe:'Tomate a la Chilena' },
  { dia:2,  fecha:'02/10', diaSemana:'Jueves',    al:'Carne Mechada en su salsa',   acomAl:'Arroz blanco',      ensAl:'Zanahoria con Zapallo',     cena:'Pollo Salteado a la Peruana',  acomCe:'Puré Mixto',     ensCe:'Betarraga con Cebolla' },
  { dia:3,  fecha:'03/10', diaSemana:'Viernes',   al:'Chuleta de Cerdo Navegada',   acomAl:'Arroz Árabe',       ensAl:'Coliflor con Pimiento',     cena:'Lentejas Españolas',           acomCe:'Arroz blanco',   ensCe:'Lechuga con Aceitunas' },
  { dia:4,  fecha:'04/10', diaSemana:'Sábado',    al:'Pollo Arverjado',             acomAl:'Arroz Primavera',   ensAl:'Tomate a la Chilena',       cena:'Estofado de Vacuno',           acomCe:'Puré de Papas',  ensCe:'Repollo con Zanahoria' },
  { dia:5,  fecha:'05/10', diaSemana:'Domingo',   al:'ASADO TRADICIONAL A LAS BRASAS', acomAl:'Parrilla / Carbón', ensAl:'Pepino con Eneldo',      cena:'Spaghetti en Salsa Bolognesa', acomCe:'Spaghetti',     ensCe:'Lechuga con Espinaca' },
  { dia:6,  fecha:'06/10', diaSemana:'Lunes',     al:'Pollo Casero a la Cazuela',   acomAl:'Arroz blanco',      ensAl:'Zanahoria con Zapallo',     cena:'Carne Salteada a la Peruana',  acomCe:'Arroz Chaufa',   ensCe:'Betarraga Rallada' },
  { dia:7,  fecha:'07/10', diaSemana:'Martes',    al:'Medalla de Cerdo Asada',      acomAl:'Papas Provenzal',   ensAl:'Choclo con Palmitos',       cena:'Mostaccioli en Salsa Bolognesa',acomCe:'Mostaccioli',  ensCe:'Apio con Aceitunas' },
  { dia:8,  fecha:'08/10', diaSemana:'Miércoles', al:'Pollo a la Naranja',          acomAl:'Arroz Casero',      ensAl:'Lechuga con Espinaca',      cena:'Albóndigas en salsa Pomodoro', acomCe:'Puré Florentina',ensCe:'Tomate con Palmitos' },
  { dia:9,  fecha:'09/10', diaSemana:'Jueves',    al:'Carne Mechada en su salsa',   acomAl:'Puré de Papas',     ensAl:'Betarraga con Cebolla',     cena:'Chopsui de Vacuno',            acomCe:'Arroz Piamontesa',ensCe:'Zanahoria con Zapallo' },
  { dia:10, fecha:'10/10', diaSemana:'Viernes',   al:'Espirales con Cerdo Peruana', acomAl:'Pasta',             ensAl:'Repollo con Cilantro',      cena:'Pollo al Ajillo',              acomCe:'Arroz blanco',   ensCe:'Lechuga con Espinaca' },
  { dia:11, fecha:'11/10', diaSemana:'Sábado',    al:'Tortica de Vacuno',           acomAl:'Arroz blanco',      ensAl:'Tomate a la Chilena',       cena:'Lentejas Españolas',           acomCe:'Arroz Casero',   ensCe:'Pepino con Tomate' },
  { dia:12, fecha:'12/10', diaSemana:'Domingo',   al:'ASADO TRADICIONAL A LAS BRASAS', acomAl:'Parrilla / Carbón', ensAl:'Choclo con Mayo',        cena:'Spaghetti con Albóndigas',     acomCe:'Spaghetti',     ensCe:'Lechuga con Zanahoria' },
  { dia:13, fecha:'13/10', diaSemana:'Lunes',     al:'Pollo Escabechado',           acomAl:'Puré Provenzal',    ensAl:'Zanahoria con Zapallo',     cena:'Estofado de Vacuno',           acomCe:'Arroz blanco',   ensCe:'Betarraga con Apio' },
  { dia:14, fecha:'14/10', diaSemana:'Martes',    al:'Chuleta de Cerdo al Horno',   acomAl:'Arroz Primavera',   ensAl:'Brócoli con Pimiento',      cena:'Carne Mechada en su salsa',    acomCe:'Puré de Papas',  ensCe:'Tomate a la Chilena' },
]

const PROTEINAS = [
  { tipo:'Vacuno',   kw:['vacuno','carne','asado','estofado','mechada','albóndiga','tortica','chopsui de v','bistec'] },
  { tipo:'Cerdo',    kw:['cerdo','chuleta','medalla','espirales con cerdo'] },
  { tipo:'Pollo',    kw:['pollo','gallina'] },
  { tipo:'Pasta',    kw:['spaghetti','mostaccioli','espirales','pasta'] },
  { tipo:'Legumbre', kw:['lentejas','porotos','garbanzos'] },
]
function prot(nombre) {
  const n = nombre.toLowerCase()
  for (const p of PROTEINAS) if (p.kw.some(k => n.includes(k))) return p.tipo
  return 'Otro'
}

// Analizar
const mapaPlatos = new Map()
const mapaProteina = new Map()
const mapaEnsalada = new Map()
const mapaAcomp = new Map()

dias.forEach((d,di) => {
  for (const [plato, acom, ens] of [[d.al, d.acomAl, d.ensAl],[d.cena, d.acomCe, d.ensCe]]) {
    const p = mapaPlatos.get(plato)||{dias:[],prot:prot(plato)}; p.dias.push(di+1); mapaPlatos.set(plato,p)
    const pr = mapaProteina.get(prot(plato))||[]; pr.push(di+1); mapaProteina.set(prot(plato),pr)
    const e = mapaEnsalada.get(ens)||[]; e.push(di+1); mapaEnsalada.set(ens,e)
    mapaAcomp.set(acom,(mapaAcomp.get(acom)||0)+1)
  }
})

const platosUnicos = mapaPlatos.size
const gapRec = Math.min(7, Math.max(3, Math.floor(14/platosUnicos)))

const alertasPlato = Array.from(mapaPlatos.entries()).map(([nombre,d])=>{
  let gapMin=999; for(let i=1;i<d.dias.length;i++) gapMin=Math.min(gapMin,d.dias[i]-d.dias[i-1])
  const nivel = d.dias.length===1?'ok': gapMin<gapRec?'repetido': gapMin<gapRec+2?'cercano':'ok'
  return {nombre,prot:d.prot,veces:d.dias.length,dias:d.dias,gapMin:gapMin===999?0:gapMin,nivel}
}).sort((a,b)=>{const o={repetido:0,cercano:1,ok:2};return o[a.nivel]-o[b.nivel]||b.veces-a.veces})

const distProt = Array.from(mapaProteina.entries())
  .map(([tipo,d])=>({tipo,veces:d.length,pct:Math.round(d.length/28*100)}))
  .sort((a,b)=>b.veces-a.veces)

const ensRepetidas = Array.from(mapaEnsalada.entries())
  .filter(([,d])=>d.length>1)
  .map(([nombre,d])=>({nombre,veces:d.length,dias:d}))
  .sort((a,b)=>b.veces-a.veces)

const acompsTop = Array.from(mapaAcomp.entries())
  .map(([nombre,veces])=>({nombre,veces}))
  .sort((a,b)=>b.veces-a.veces).slice(0,8)

// Detectar proteína consecutiva
const protConsec = []
for (const [tipo, diasList] of mapaProteina.entries()) {
  const unique = [...new Set(diasList)].sort((a,b)=>a-b)
  for(let i=1;i<unique.length;i++) if(unique[i]-unique[i-1]===1) protConsec.push({tipo,dias:[unique[i-1],unique[i]]})
}

// Platos similares
const grupoBase = new Map()
dias.forEach((d,di)=>{
  for(const plato of [d.al,d.cena]){
    const base = prot(plato)
    if(base==='Otro') continue
    const g=grupoBase.get(base)||{platos:new Set(),dias:[]}
    g.platos.add(plato); g.dias.push(di+1); grupoBase.set(base,g)
  }
})
const similares = Array.from(grupoBase.entries())
  .filter(([,v])=>v.platos.size>=3)
  .map(([base,v])=>({base,platos:[...v.platos]}))

let score=100
score -= alertasPlato.filter(a=>a.nivel==='repetido').length*8
score -= alertasPlato.filter(a=>a.nivel==='cercano').length*3
score -= ensRepetidas.length*2
score -= protConsec.length*5
score = Math.max(0,Math.min(100,score))

// ── Generar PDF ────────────────────────────────────────────────
const doc = new jsPDF({ orientation:'portrait', unit:'mm', format:'a4' })

// Portada header
doc.setFillColor(31,41,55); doc.rect(0,0,210,28,'F')
doc.setTextColor(255,255,255)
doc.setFontSize(16); doc.setFont('helvetica','bold')
doc.text('Informe de Análisis de Minuta', 10, 12)
doc.setFontSize(9); doc.setFont('helvetica','normal')
doc.text('Casino de Faena Ejemplo · Turno 14x14 · 01/10/2026 al 14/10/2026', 10, 19)
doc.text(`Generado: ${new Date().toLocaleDateString('es-CL')}`, 10, 24)

// Score badge
const scoreColor = score>=80?[22,163,74]:score>=60?[234,179,8]:[220,38,38]
doc.setFillColor(...scoreColor); doc.roundedRect(155,6,45,18,3,3,'F')
doc.setTextColor(255,255,255); doc.setFontSize(22); doc.setFont('helvetica','black')
doc.text(String(score), 177, 18, {align:'center'})
doc.setFontSize(8); doc.text('/100 — '+(score>=80?'Buena':score>=60?'Regular':'Con problemas'), 177, 22, {align:'center'})

let y = 34

// Resumen ejecutivo
doc.setTextColor(31,41,55); doc.setFontSize(11); doc.setFont('helvetica','bold')
doc.text('1. Resumen Ejecutivo', 10, y); y+=5

autoTable(doc, {
  startY: y,
  body:[
    ['Días analizados','14','Total servicios','28'],
    ['Platos distintos',String(platosUnicos),'Gap recomendado',`${gapRec} días`],
    ['Platos con repetición problemática',String(alertasPlato.filter(a=>a.nivel==='repetido').length),'Platos cercanos al límite',String(alertasPlato.filter(a=>a.nivel==='cercano').length)],
    ['Ensaladas repetidas',String(ensRepetidas.length),'Rachas proteína consecutiva',String(protConsec.length)],
    ['Score calidad',`${score}/100`,'Clasificación',score>=80?'✅ Buena':score>=60?'⚠ Regular':'🚨 Con problemas'],
  ],
  styles:{fontSize:8.5}, theme:'grid',
  columnStyles:{0:{fontStyle:'bold',fillColor:[243,244,246],cellWidth:70},2:{fontStyle:'bold',fillColor:[243,244,246],cellWidth:55}},
})
y = doc.lastAutoTable.finalY + 8

// Distribución proteína
doc.setFontSize(11); doc.setFont('helvetica','bold')
doc.text('2. Distribución por Proteína', 10, y); y+=5
autoTable(doc, {
  startY: y,
  head:[['Proteína','Apariciones','% del total','Observación']],
  body: distProt.map(d=>[
    d.tipo, String(d.veces), `${d.pct}%`,
    d.pct>35?'⚠ Sobre-representada':d.pct<8?'Baja presencia':'Normal'
  ]),
  styles:{fontSize:8.5}, headStyles:{fillColor:[55,65,81],textColor:255},
  alternateRowStyles:{fillColor:[249,250,251]},
})
y = doc.lastAutoTable.finalY + 8

// Proteína consecutiva
if (protConsec.length > 0) {
  doc.setFontSize(11); doc.setFont('helvetica','bold')
  doc.text('3. Proteína Repetida Días Consecutivos', 10, y); y+=3
  doc.setFontSize(8); doc.setFont('helvetica','normal'); doc.setTextColor(180,50,50)
  doc.text('El trabajador percibe monotonía aunque el plato cambie de nombre.', 10, y+3); y+=7
  doc.setTextColor(31,41,55)
  autoTable(doc, {
    startY: y,
    head:[['Proteína','Días consecutivos','Impacto']],
    body: protConsec.map(p=>[p.tipo,`Día ${p.dias[0]} → Día ${p.dias[1]}','Misma proteína 2 días seguidos`]),
    styles:{fontSize:8.5}, headStyles:{fillColor:[234,88,12],textColor:255},
  })
  y = doc.lastAutoTable.finalY + 8
}

// Nueva página para platos con problemas
doc.addPage()
y = 15
doc.setFontSize(11); doc.setFont('helvetica','bold'); doc.setTextColor(31,41,55)
doc.text('4. Análisis de Platos con Repetición', 10, y); y+=5

const problemas = alertasPlato.filter(a=>a.nivel!=='ok')
if(problemas.length>0){
  autoTable(doc, {
    startY: y,
    head:[['Plato','Proteína','Veces','Gap mínimo','Gap rec.','Estado','Días']],
    body: problemas.map(a=>[
      a.nombre, a.prot, String(a.veces),
      a.veces>1?`${a.gapMin}d`:'—',
      `${gapRec}d`,
      a.nivel==='repetido'?'🚨 REPETIDO':'⚠ CERCANO',
      a.dias.join(', ')
    ]),
    styles:{fontSize:7.5}, headStyles:{fillColor:[55,65,81],textColor:255},
    bodyStyles:{textColor:[31,41,55]},
    didParseCell(data){
      if(data.section==='body'&&data.column.index===5){
        if(String(data.cell.raw).includes('REPETIDO')) data.cell.styles.textColor=[220,38,38]
        if(String(data.cell.raw).includes('CERCANO')) data.cell.styles.textColor=[234,88,12]
      }
    }
  })
  y = doc.lastAutoTable.finalY + 8
}

// Platos similares
if(similares.length>0){
  doc.setFontSize(11); doc.setFont('helvetica','bold')
  doc.text('5. Platos Similares (misma base proteica)', 10, y); y+=3
  doc.setFontSize(8); doc.setFont('helvetica','normal'); doc.setTextColor(100,50,200)
  doc.text('Aunque tienen nombres distintos, comparten la misma proteína base. El trabajador lo percibe como repetición.', 10, y+3); y+=8
  doc.setTextColor(31,41,55)
  autoTable(doc, {
    startY: y,
    head:[['Proteína base','Preparaciones detectadas']],
    body: similares.map(g=>[g.base, g.platos.join(' / ')]),
    styles:{fontSize:8.5}, headStyles:{fillColor:[124,58,237],textColor:255},
    columnStyles:{0:{cellWidth:30,fontStyle:'bold'},1:{cellWidth:145}},
  })
  y = doc.lastAutoTable.finalY + 8
}

// Ensaladas repetidas
if(ensRepetidas.length>0){
  doc.setFontSize(11); doc.setFont('helvetica','bold')
  doc.text('6. Ensaladas Repetidas en el Ciclo', 10, y); y+=5
  autoTable(doc, {
    startY: y,
    head:[['Ensalada','Veces','Días de aparición']],
    body: ensRepetidas.map(e=>[e.nombre,String(e.veces),e.dias.join(', ')]),
    styles:{fontSize:8.5}, headStyles:{fillColor:[234,88,12],textColor:255},
  })
  y = doc.lastAutoTable.finalY + 8
}

// Acompañamientos
doc.setFontSize(11); doc.setFont('helvetica','bold')
doc.text('7. Acompañamientos más utilizados', 10, y); y+=5
autoTable(doc, {
  startY: y,
  head:[['Acompañamiento','Veces','Frecuencia']],
  body: acompsTop.map(a=>[a.nombre,String(a.veces), a.veces>=4?'⚠ Muy frecuente':a.veces>=3?'Frecuente':'Normal']),
  styles:{fontSize:8.5}, headStyles:{fillColor:[55,65,81],textColor:255},
  alternateRowStyles:{fillColor:[249,250,251]},
})

// Minuta semana por semana
doc.addPage()
y = 15
doc.setFontSize(11); doc.setFont('helvetica','bold'); doc.setTextColor(31,41,55)
doc.text('8. Minuta Completa — Semana a Semana', 10, y); y+=5

for(let sem=0;sem<2;sem++){
  const semDias = dias.slice(sem*7,(sem+1)*7)
  const headCols = ['Servicio',...semDias.map(d=>`${d.diaSemana}\n${d.fecha}`)]
  const almuerzos = semDias.map(d=>`${d.al}\n${d.acomAl}\n${d.ensAl}`)
  const cenas     = semDias.map(d=>`${d.cena}\n${d.acomCe}\n${d.ensCe}`)
  autoTable(doc,{
    startY:y,
    head:[[{content:`Semana ${sem+1}`,colSpan:8,styles:{fillColor:[31,41,55],textColor:255,fontStyle:'bold'}}],headCols],
    body:[['ALMUERZO',...almuerzos],['CENA',...cenas]],
    styles:{fontSize:6.5,cellPadding:2,valign:'top'},
    headStyles:{fillColor:[55,65,81],textColor:255,fontSize:7,halign:'center'},
    columnStyles:{0:{fillColor:[243,244,246],fontStyle:'bold',halign:'center',cellWidth:18}},
    alternateRowStyles:{fillColor:[249,250,251]},
  })
  y = doc.lastAutoTable.finalY + 6
}

// Recomendaciones finales
doc.addPage()
y = 15
doc.setFillColor(31,41,55); doc.rect(0,0,210,22,'F')
doc.setTextColor(255,255,255); doc.setFontSize(13); doc.setFont('helvetica','bold')
doc.text('9. Recomendaciones para Mejorar la Minuta', 10, 13)

y = 30
const recomendaciones = [
  ['Diversificar proteína de pollo', 'Se detectaron 5+ preparaciones de pollo. Aunque los nombres varían, el trabajador percibe repetición. Reemplazar 2-3 por pescado o legumbre.'],
  ['Corregir platos repetidos',`${alertasPlato.filter(a=>a.nivel==='repetido').length} platos aparecen con gap menor a ${gapRec} días. Deben separarse mínimo ${gapRec} días entre apariciones.`],
  ['Variar ensaladas', `${ensRepetidas.length} ensaladas se repiten en el ciclo de 14 días. Con 28 ensaladas disponibles en catálogo, no debería repetirse ninguna.`],
  ['Revisar acompañamiento "Arroz blanco"', 'Aparece más de 5 veces. Rotar con otras bases: papas, puré, pastas.'],
  ['Incorporar pescado', 'No se detectó pescado en esta minuta. Recomendable 1-2 veces por ciclo para balance nutricional.'],
]
doc.setTextColor(31,41,55)
autoTable(doc, {
  startY: y,
  head:[['#','Recomendación','Detalle']],
  body: recomendaciones.map((r,i)=>[String(i+1),r[0],r[1]]),
  styles:{fontSize:8.5},
  headStyles:{fillColor:[55,65,81],textColor:255},
  columnStyles:{0:{cellWidth:8,halign:'center'},1:{cellWidth:55,fontStyle:'bold'},2:{cellWidth:125}},
  alternateRowStyles:{fillColor:[249,250,251]},
})

// Footer en todas las páginas
const totalPages = doc.getNumberOfPages()
for(let i=1;i<=totalPages;i++){
  doc.setPage(i)
  doc.setFontSize(7); doc.setTextColor(150,150,150)
  doc.text('Página '+i+' de '+totalPages+' · Informe generado por Minuta Casino de Faena · minuta-web-two.vercel.app', 105, 292, {align:'center'})
}

const out = path.join(__dirname, '..', 'public', 'informe-ejemplo.pdf')
writeFileSync(out, Buffer.from(doc.output('arraybuffer')))
console.log('PDF generado en:', out)
"