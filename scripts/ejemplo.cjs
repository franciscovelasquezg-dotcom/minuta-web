const path = require('path')
const fs = require('fs')

async function main() {
  const jspdfMod = await import('jspdf')
  const jsPDF = jspdfMod.jsPDF || jspdfMod.default
  const { default: autoTable } = await import('jspdf-autotable')

  const dias = [
    { dia:1, fecha:'01/10/2026', diaSemana:'Lunes', servicios:[
      { tipo:'Almuerzo', platoPrincipal:'Pollo Casero', acompañamiento:'Arroz blanco', ensalada:'Ensalada chilena', postre:'Fruta del tiempo', opcionHipo:'Bowl pollo + Ensalada chilena', estado:'confirmado' },
      { tipo:'Cena', platoPrincipal:'Cazuela de vacuno', acompañamiento:'Pan', ensalada:'Ensalada de tomate', postre:'', opcionHipo:'Bowl vacuno + Ensalada de tomate', estado:'confirmado' },
    ]},
    { dia:2, fecha:'02/10/2026', diaSemana:'Martes', servicios:[
      { tipo:'Almuerzo', platoPrincipal:'Lentejas Españolas', acompañamiento:'Arroz blanco', ensalada:'Ensalada de zanahoria', postre:'Yogurt natural', opcionHipo:'Bowl legumbre + Ensalada de zanahoria', estado:'confirmado' },
      { tipo:'Cena', platoPrincipal:'Pollo Arvejado', acompañamiento:'Puré', ensalada:'Ensalada chilena', postre:'', opcionHipo:'Bowl pollo + Ensalada chilena', estado:'confirmado' },
    ]},
    { dia:3, fecha:'03/10/2026', diaSemana:'Miércoles', servicios:[
      { tipo:'Almuerzo', platoPrincipal:'Filete de merluza', acompañamiento:'Puré', ensalada:'Ensalada mixta', postre:'Gelatina', opcionHipo:'Bowl pescado + Ensalada mixta', estado:'confirmado' },
      { tipo:'Cena', platoPrincipal:'Tallarines con salsa', acompañamiento:'Pan', ensalada:'Ensalada de tomate', postre:'', opcionHipo:'Bowl proteína vegetal + Ensalada de tomate', estado:'confirmado' },
    ]},
    { dia:4, fecha:'04/10/2026', diaSemana:'Jueves', servicios:[
      { tipo:'Almuerzo', platoPrincipal:'Cerdo a la plancha', acompañamiento:'Arroz casero', ensalada:'Ensalada de betarraga', postre:'Fruta del tiempo', opcionHipo:'Bowl cerdo + Ensalada de betarraga', estado:'confirmado' },
      { tipo:'Cena', platoPrincipal:'Pollo al horno', acompañamiento:'Puré', ensalada:'Ensalada chilena', postre:'', opcionHipo:'Bowl pollo + Ensalada chilena', estado:'confirmado' },
    ]},
    { dia:5, fecha:'05/10/2026', diaSemana:'Viernes', servicios:[
      { tipo:'Almuerzo', platoPrincipal:'Cazuela de vacuno', acompañamiento:'Pan', ensalada:'Ensalada de zanahoria', postre:'Yogurt con fruta', opcionHipo:'Bowl vacuno + Ensalada de zanahoria', estado:'confirmado' },
      { tipo:'Cena', platoPrincipal:'Hamburguesa casera', acompañamiento:'Papas fritas', ensalada:'Ensalada mixta', postre:'', opcionHipo:'Bowl vacuno + Ensalada mixta', estado:'confirmado' },
    ]},
    { dia:6, fecha:'06/10/2026', diaSemana:'Sábado', servicios:[
      { tipo:'Almuerzo', platoPrincipal:'Salmón al vapor', acompañamiento:'Arroz blanco', ensalada:'Ensalada de pepino', postre:'Gelatina', opcionHipo:'Bowl pescado + Ensalada de pepino', estado:'confirmado' },
      { tipo:'Cena', platoPrincipal:'Pollo Casero', acompañamiento:'Arroz casero', ensalada:'Ensalada chilena', postre:'', opcionHipo:'Bowl pollo + Ensalada chilena', estado:'pendiente' },
    ]},
    { dia:7, fecha:'07/10/2026', diaSemana:'Domingo', servicios:[
      { tipo:'Almuerzo', platoPrincipal:'Pollo Arvejado', acompañamiento:'Puré', ensalada:'Ensalada de zanahoria', postre:'Fruta del tiempo', opcionHipo:'Bowl pollo + Ensalada de zanahoria', estado:'pendiente' },
      { tipo:'Cena', platoPrincipal:'Vacuno estofado', acompañamiento:'Pan', ensalada:'Ensalada de tomate', postre:'', opcionHipo:'Bowl vacuno + Ensalada de tomate', estado:'pendiente' },
    ]},
    { dia:8, fecha:'08/10/2026', diaSemana:'Lunes', servicios:[
      { tipo:'Almuerzo', platoPrincipal:'Fideos con pollo', acompañamiento:'Pan', ensalada:'Ensalada mixta', postre:'Yogurt natural', opcionHipo:'Bowl proteína vegetal + Ensalada mixta', estado:'pendiente' },
      { tipo:'Cena', platoPrincipal:'Lentejas Españolas', acompañamiento:'Arroz blanco', ensalada:'Ensalada chilena', postre:'', opcionHipo:'Bowl legumbre + Ensalada chilena', estado:'pendiente' },
    ]},
    { dia:9, fecha:'09/10/2026', diaSemana:'Martes', servicios:[
      { tipo:'Almuerzo', platoPrincipal:'Cerdo al jugo', acompañamiento:'Puré', ensalada:'Ensalada de betarraga', postre:'Gelatina', opcionHipo:'Bowl cerdo + Ensalada de betarraga', estado:'pendiente' },
      { tipo:'Cena', platoPrincipal:'Cazuela de vacuno', acompañamiento:'Pan', ensalada:'Ensalada de tomate', postre:'', opcionHipo:'Bowl vacuno + Ensalada de tomate', estado:'pendiente' },
    ]},
    { dia:10, fecha:'10/10/2026', diaSemana:'Miércoles', servicios:[
      { tipo:'Almuerzo', platoPrincipal:'Reineta frita', acompañamiento:'Arroz blanco', ensalada:'Ensalada chilena', postre:'Fruta del tiempo', opcionHipo:'Bowl pescado + Ensalada chilena', estado:'pendiente' },
      { tipo:'Cena', platoPrincipal:'Tallarines con salsa', acompañamiento:'Pan', ensalada:'Ensalada mixta', postre:'', opcionHipo:'Bowl proteína vegetal + Ensalada mixta', estado:'pendiente' },
    ]},
    { dia:11, fecha:'11/10/2026', diaSemana:'Jueves', servicios:[
      { tipo:'Almuerzo', platoPrincipal:'Pollo a la plancha', acompañamiento:'Arroz casero', ensalada:'Ensalada de zanahoria', postre:'Yogurt con fruta', opcionHipo:'Bowl pollo + Ensalada de zanahoria', estado:'pendiente' },
      { tipo:'Cena', platoPrincipal:'Vacuno estofado', acompañamiento:'Puré', ensalada:'Ensalada de betarraga', postre:'', opcionHipo:'Bowl vacuno + Ensalada de betarraga', estado:'pendiente' },
    ]},
    { dia:12, fecha:'12/10/2026', diaSemana:'Viernes', servicios:[
      { tipo:'Almuerzo', platoPrincipal:'Cazuela de pollo', acompañamiento:'Pan', ensalada:'Ensalada mixta', postre:'Fruta del tiempo', opcionHipo:'Bowl pollo + Ensalada mixta', estado:'pendiente' },
      { tipo:'Cena', platoPrincipal:'Lentejas guisadas', acompañamiento:'Arroz blanco', ensalada:'Ensalada chilena', postre:'', opcionHipo:'Bowl legumbre + Ensalada chilena', estado:'pendiente' },
    ]},
    { dia:13, fecha:'13/10/2026', diaSemana:'Sábado', servicios:[
      { tipo:'Almuerzo', platoPrincipal:'Salmón grillado', acompañamiento:'Puré', ensalada:'Ensalada de pepino', postre:'Gelatina', opcionHipo:'Bowl pescado + Ensalada de pepino', estado:'pendiente' },
      { tipo:'Cena', platoPrincipal:'Pollo Casero', acompañamiento:'Arroz blanco', ensalada:'Ensalada de tomate', postre:'', opcionHipo:'Bowl pollo + Ensalada de tomate', estado:'pendiente' },
    ]},
    { dia:14, fecha:'14/10/2026', diaSemana:'Domingo', servicios:[
      { tipo:'Almuerzo', platoPrincipal:'Filete de vacuno', acompañamiento:'Arroz casero', ensalada:'Ensalada chilena', postre:'Fruta del tiempo', opcionHipo:'Bowl vacuno + Ensalada chilena', estado:'pendiente' },
      { tipo:'Cena', platoPrincipal:'Hamburguesa casera', acompañamiento:'Papas fritas', ensalada:'Ensalada mixta', postre:'', opcionHipo:'Bowl vacuno + Ensalada mixta', estado:'pendiente' },
    ]},
  ]

  // ---- ANÁLISIS ----
  const PROTEINAS = [
    { tipo:'Pollo', keywords:['pollo','gallina','pavo'] },
    { tipo:'Vacuno', keywords:['vacuno','res','filete de vacuno','cazuela de vacuno','hamburguesa','estofado'] },
    { tipo:'Cerdo', keywords:['cerdo','chancho','costilla','lomo'] },
    { tipo:'Pescado', keywords:['merluza','salmon','reineta','pescado','salmón','atún'] },
    { tipo:'Pasta', keywords:['tallarines','fideos','pasta','lasaña'] },
    { tipo:'Legumbre', keywords:['lenteja','garbanzo','poroto','arveja'] },
    { tipo:'Vegetariano', keywords:['vegetal','verdura','tofu'] },
  ]

  function clasificarProteina(nombre) {
    const n = nombre.toLowerCase()
    for (const p of PROTEINAS) {
      if (p.keywords.some(k => n.includes(k))) return p.tipo
    }
    return 'Otro'
  }

  const conteoPlatos = {}
  const conteoProteinas = {}
  const conteoEnsaladas = {}
  const protByDia = {}

  dias.forEach(dia => {
    dia.servicios.forEach(s => {
      conteoPlatos[s.platoPrincipal] = (conteoPlatos[s.platoPrincipal]||0)+1
      const prot = clasificarProteina(s.platoPrincipal)
      conteoProteinas[prot] = (conteoProteinas[prot]||0)+1
      conteoEnsaladas[s.ensalada] = (conteoEnsaladas[s.ensalada]||0)+1
      if (!protByDia[dia.dia]) protByDia[dia.dia] = new Set()
      protByDia[dia.dia].add(prot)
    })
  })

  const repetidosPlatos = Object.entries(conteoPlatos).filter(([,v])=>v>1).sort((a,b)=>b[1]-a[1])
  const repetidosEns = Object.entries(conteoEnsaladas).filter(([,v])=>v>1).sort((a,b)=>b[1]-a[1])
  const distProt = Object.entries(conteoProteinas).sort((a,b)=>b[1]-a[1])

  const score = Math.max(0, 100 - repetidosPlatos.length*8 - repetidosEns.length*2)

  // ---- PDF ----
  const doc = new jsPDF({ orientation:'landscape', unit:'mm', format:'a4' })

  // PORTADA / RESUMEN
  doc.setFillColor(15, 23, 42)
  doc.rect(0, 0, 297, 210, 'F')

  doc.setTextColor(16, 185, 129)
  doc.setFontSize(28)
  doc.setFont('helvetica','bold')
  doc.text('INFORME DE ANÁLISIS', 148.5, 60, { align:'center' })
  doc.setFontSize(18)
  doc.setTextColor(255,255,255)
  doc.text('Minuta Casino de Faena — Turno Día', 148.5, 75, { align:'center' })
  doc.setFontSize(11)
  doc.setTextColor(148,163,184)
  doc.text('Período: 01/10/2026 — 14/10/2026  ·  14 días  ·  28 servicios', 148.5, 86, { align:'center' })

  // Score box
  const scoreColor = score>=80 ? [16,185,129] : score>=60 ? [234,179,8] : [239,68,68]
  doc.setFillColor(...scoreColor)
  doc.roundedRect(108.5, 95, 80, 40, 5, 5, 'F')
  doc.setTextColor(255,255,255)
  doc.setFontSize(42)
  doc.setFont('helvetica','bold')
  doc.text(score+'/100', 148.5, 124, { align:'center' })
  doc.setFontSize(10)
  doc.text('SCORE DE VARIEDAD', 148.5, 131, { align:'center' })

  // Alertas resumen
  doc.setFontSize(10)
  doc.setTextColor(252,211,77)
  doc.text('ALERTAS DETECTADAS:', 30, 150)
  doc.setTextColor(255,255,255)
  doc.setFontSize(9)
  doc.text(`• ${repetidosPlatos.length} platos repetidos en el período`, 30, 160)
  doc.text(`• ${repetidosEns.length} ensaladas con alta frecuencia`, 30, 167)
  doc.text(`• Proteína dominante: ${distProt[0]?.[0]||'N/A'} (${distProt[0]?.[1]||0} servicios)`, 30, 174)

  doc.setTextColor(148,163,184)
  doc.setFontSize(8)
  doc.text('Generado por Minuta Web · minuta-web-two.vercel.app · ' + new Date().toLocaleDateString('es-CL'), 148.5, 200, { align:'center' })

  // PÁGINA 2 — Platos repetidos
  doc.addPage()
  doc.setFillColor(31, 41, 55)
  doc.rect(0, 0, 297, 18, 'F')
  doc.setTextColor(255,255,255)
  doc.setFontSize(13)
  doc.setFont('helvetica','bold')
  doc.text('ANÁLISIS DE PLATOS', 10, 11)
  doc.setFontSize(9)
  doc.setFont('helvetica','normal')
  doc.text('Frecuencia de aparición de platos principales (28 servicios)', 10, 16)

  const platosRows = Object.entries(conteoPlatos)
    .sort((a,b)=>b[1]-a[1])
    .map(([plato, count]) => {
      const prot = clasificarProteina(plato)
      const nivel = count > 2 ? 'ALTO' : count > 1 ? 'MEDIO' : 'OK'
      return [plato, prot, count, nivel]
    })

  autoTable(doc, {
    startY: 22,
    head: [['Plato Principal', 'Proteína', 'Repeticiones', 'Nivel']],
    body: platosRows,
    styles: { fontSize:8, cellPadding:3, lineColor:[200,200,200], lineWidth:0.3 },
    headStyles: { fillColor:[55,65,81], textColor:255, fontStyle:'bold', halign:'center' },
    bodyStyles: { textColor:[31,41,55] },
    columnStyles: { 3: { halign:'center', fontStyle:'bold' } },
    didParseCell(data) {
      if (data.column.index === 3 && data.section === 'body') {
        const v = data.cell.raw
        if (v === 'ALTO') { data.cell.styles.textColor = [239,68,68] }
        else if (v === 'MEDIO') { data.cell.styles.textColor = [234,179,8] }
        else { data.cell.styles.textColor = [16,185,129] }
      }
    },
    alternateRowStyles: { fillColor:[249,250,251] },
  })

  // PÁGINA 3 — Distribución proteínas
  doc.addPage()
  doc.setFillColor(31, 41, 55)
  doc.rect(0, 0, 297, 18, 'F')
  doc.setTextColor(255,255,255)
  doc.setFontSize(13)
  doc.setFont('helvetica','bold')
  doc.text('DISTRIBUCIÓN DE PROTEÍNAS', 10, 11)
  doc.setFontSize(9)
  doc.setFont('helvetica','normal')
  doc.text('Frecuencia de cada grupo proteico en el ciclo', 10, 16)

  const totalServ = Object.values(conteoProteinas).reduce((a,b)=>a+b,0)
  const protRows = distProt.map(([prot, count]) => {
    const pct = ((count/totalServ)*100).toFixed(1)
    const recomendado = prot === 'Pescado' ? '>= 2 veces/semana' : prot === 'Legumbre' ? '>= 2 veces/semana' : ''
    return [prot, count, pct+'%', recomendado]
  })

  autoTable(doc, {
    startY: 22,
    head: [['Proteína', 'Servicios', '% del total', 'Recomendación']],
    body: protRows,
    styles: { fontSize:9, cellPadding:3, lineColor:[200,200,200], lineWidth:0.3 },
    headStyles: { fillColor:[55,65,81], textColor:255, fontStyle:'bold', halign:'center' },
    bodyStyles: { textColor:[31,41,55] },
    alternateRowStyles: { fillColor:[249,250,251] },
  })

  // PÁGINA 4 — Semana 1
  doc.addPage()
  const sem1 = dias.slice(0, 7)
  doc.setFillColor(31, 41, 55)
  doc.rect(0, 0, 297, 18, 'F')
  doc.setTextColor(255,255,255)
  doc.setFontSize(13)
  doc.setFont('helvetica','bold')
  doc.text('Minuta Casino Faena — Turno Día', 10, 11)
  doc.setFontSize(9)
  doc.setFont('helvetica','normal')
  doc.text('Semana 1 · ' + sem1[0].fecha + ' al ' + sem1[sem1.length-1].fecha, 10, 16)

  const headCols1 = ['', ...sem1.map(d => d.diaSemana + '\n' + d.fecha)]
  const alm1 = sem1.map(d => {
    const s = d.servicios.find(sv => sv.tipo === 'Almuerzo')
    if (!s) return ''
    return s.platoPrincipal + '\n' + s.acompañamiento + '\n' + s.ensalada + (s.postre ? '\n' + s.postre : '') + (s.opcionHipo ? '\n🥗 ' + s.opcionHipo : '')
  })
  const cen1 = sem1.map(d => {
    const s = d.servicios.find(sv => sv.tipo === 'Cena')
    if (!s) return ''
    return s.platoPrincipal + '\n' + s.acompañamiento + '\n' + s.ensalada + (s.opcionHipo ? '\n🥗 ' + s.opcionHipo : '')
  })

  autoTable(doc, {
    startY: 22,
    head: [headCols1],
    body: [['ALMUERZO',...alm1],['CENA',...cen1]],
    styles: { fontSize:7, cellPadding:3, valign:'top', lineColor:[200,200,200], lineWidth:0.3 },
    headStyles: { fillColor:[55,65,81], textColor:255, fontStyle:'bold', halign:'center', fontSize:8 },
    columnStyles: { 0:{ fillColor:[243,244,246], fontStyle:'bold', textColor:[55,65,81], halign:'center', cellWidth:20 } },
    alternateRowStyles: { fillColor:[249,250,251] },
    bodyStyles: { textColor:[31,41,55] },
  })

  // PÁGINA 5 — Semana 2
  doc.addPage()
  const sem2 = dias.slice(7, 14)
  doc.setFillColor(31, 41, 55)
  doc.rect(0, 0, 297, 18, 'F')
  doc.setTextColor(255,255,255)
  doc.setFontSize(13)
  doc.setFont('helvetica','bold')
  doc.text('Minuta Casino Faena — Turno Día', 10, 11)
  doc.setFontSize(9)
  doc.setFont('helvetica','normal')
  doc.text('Semana 2 · ' + sem2[0].fecha + ' al ' + sem2[sem2.length-1].fecha, 10, 16)

  const headCols2 = ['', ...sem2.map(d => d.diaSemana + '\n' + d.fecha)]
  const alm2 = sem2.map(d => {
    const s = d.servicios.find(sv => sv.tipo === 'Almuerzo')
    if (!s) return ''
    return s.platoPrincipal + '\n' + s.acompañamiento + '\n' + s.ensalada + (s.postre ? '\n' + s.postre : '') + (s.opcionHipo ? '\n🥗 ' + s.opcionHipo : '')
  })
  const cen2 = sem2.map(d => {
    const s = d.servicios.find(sv => sv.tipo === 'Cena')
    if (!s) return ''
    return s.platoPrincipal + '\n' + s.acompañamiento + '\n' + s.ensalada + (s.opcionHipo ? '\n🥗 ' + s.opcionHipo : '')
  })

  autoTable(doc, {
    startY: 22,
    head: [headCols2],
    body: [['ALMUERZO',...alm2],['CENA',...cen2]],
    styles: { fontSize:7, cellPadding:3, valign:'top', lineColor:[200,200,200], lineWidth:0.3 },
    headStyles: { fillColor:[55,65,81], textColor:255, fontStyle:'bold', halign:'center', fontSize:8 },
    columnStyles: { 0:{ fillColor:[243,244,246], fontStyle:'bold', textColor:[55,65,81], halign:'center', cellWidth:20 } },
    alternateRowStyles: { fillColor:[249,250,251] },
    bodyStyles: { textColor:[31,41,55] },
  })

  // Guardar
  const outPath = path.join(__dirname, '..', 'public', 'informe-ejemplo.pdf')
  const arrayBuffer = doc.output('arraybuffer')
  fs.writeFileSync(outPath, Buffer.from(arrayBuffer))
  console.log('PDF guardado en', outPath)
}

main().catch(console.error)
