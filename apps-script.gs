// ============================================================
// Minuta Casino de Faena — Backend Google Apps Script
// Sheets: "Minuta Casino - Base de Datos"
// ID: 1weZUkkCj-yL6Z6sa47v54cPOr6yn3qYqwfpDV-teUck
// ============================================================

const SPREADSHEET_ID = '1weZUkkCj-yL6Z6sa47v54cPOr6yn3qYqwfpDV-teUck';
const API_SECRET     = 'MinutaCasino2026_k9M3n7P4q2Z1w5Y6v8U0t3';
const TZ             = 'America/Santiago';

// Hojas del Sheets
const HOJA_PLATOS          = 'Platos';
const HOJA_ENSALADAS       = 'Ensaladas';
const HOJA_ACOMPAÑAMIENTOS = 'Acompañamientos';
const HOJA_TURNOS          = 'Turnos';       // configuración de tipos de turno
const HOJA_PREFIX_MINUTA   = 'Minuta_';      // Minuta_7x7, Minuta_10x10, etc.

// ── Seguridad HMAC ────────────────────────────────────────────
function computeHmac(message, secret) {
  const bytes = Utilities.computeHmacSha256Signature(message, secret);
  return bytes.map(b => ('0' + (b & 0xFF).toString(16)).slice(-2)).join('');
}

function validarToken(t, sig) {
  if (!t || !sig) return false;
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - parseInt(t)) > 300) return false;
  return computeHmac(String(t), API_SECRET) === String(sig);
}

// ── Router principal ──────────────────────────────────────────
function doGet(e) {
  try {
    const tipo = e.parameter.tipo || '';
    switch (tipo) {
      case 'platos':          return jsonOk(getPlatos());
      case 'ensaladas':       return jsonOk(getEnsaladas());
      case 'acompañamientos': return jsonOk(getAcompañamientos());
      case 'turnos':          return jsonOk(getTurnos());
      case 'minuta':          return jsonOk(getMinuta(e.parameter.turno));
      case 'catalogos':       return jsonOk(getCatalogosCompletos());
      default:                return jsonError('tipo no reconocido');
    }
  } catch (err) {
    return jsonError(err.message);
  }
}

function doPost(e) {
  try {
    const body   = JSON.parse(e.postData.contents);
    const accion = body.accion || '';

    if (!validarToken(body.t, body.sig)) return jsonError('Token inválido');

    switch (accion) {
      case 'guardar_minuta':   return jsonOk(guardarMinuta(body));
      case 'guardar_plato':    return jsonOk(guardarPlato(body));
      case 'eliminar_plato':   return jsonOk(eliminarPlato(body));
      case 'guardar_ensalada': return jsonOk(guardarEnsalada(body));
      case 'guardar_acomp':    return jsonOk(guardarAcompañamiento(body));
      case 'nuevo_ciclo':      return jsonOk(nuevoCiclo(body));
      default:                 return jsonError('acción no reconocida');
    }
  } catch (err) {
    return jsonError(err.message);
  }
}

// ── GET: Catálogos ─────────────────────────────────────────────

function getPlatos() {
  const ss   = SpreadsheetApp.openById(SPREADSHEET_ID);
  const hoja = ss.getSheetByName(HOJA_PLATOS);
  if (!hoja) return [];
  const rows = hoja.getDataRange().getValues();
  return rows.slice(1)
    .filter(r => r[0])
    .map(r => ({
      id:           r[0],
      nombre:       r[1],
      tipo:         r[2],   // vacuno / cerdo / pollo / pasta / legumbre / otro
      acompañamientosRecomendados: r[3] ? String(r[3]).split(',').map(s => s.trim()) : [],
      receta:       r[4] || '',
      activo:       r[5] !== false && r[5] !== 'false' && r[5] !== 0,
    }));
}

function getEnsaladas() {
  const ss   = SpreadsheetApp.openById(SPREADSHEET_ID);
  const hoja = ss.getSheetByName(HOJA_ENSALADAS);
  if (!hoja) return [];
  const rows = hoja.getDataRange().getValues();
  return rows.slice(1)
    .filter(r => r[0])
    .map(r => ({
      id:     r[0],
      nombre: r[1],
      tipo:   r[2],   // hojas / raíz / fresca / cocida / típica
      activo: r[3] !== false && r[3] !== 'false' && r[3] !== 0,
    }));
}

function getAcompañamientos() {
  const ss   = SpreadsheetApp.openById(SPREADSHEET_ID);
  const hoja = ss.getSheetByName(HOJA_ACOMPAÑAMIENTOS);
  if (!hoja) return [];
  const rows = hoja.getDataRange().getValues();
  return rows.slice(1)
    .filter(r => r[0])
    .map(r => ({
      id:     r[0],
      nombre: r[1],
      tipo:   r[2],   // arroz / puré / pasta / papas / legumbre / otro
      activo: r[3] !== false && r[3] !== 'false' && r[3] !== 0,
    }));
}

function getTurnos() {
  const ss   = SpreadsheetApp.openById(SPREADSHEET_ID);
  const hoja = ss.getSheetByName(HOJA_TURNOS);
  if (!hoja) return getTurnosDefault();
  const rows = hoja.getDataRange().getValues();
  if (rows.length <= 1) return getTurnosDefault();
  return rows.slice(1)
    .filter(r => r[0])
    .map(r => ({
      codigo:         r[0],   // 7x7, 10x10, 14x14, 20x10
      nombre:         r[1],   // "7 días en faena / 7 días descanso"
      diasEnFaena:    Number(r[2]),
      diasDescanso:   Number(r[3]),
      activo:         r[4] !== false,
    }));
}

function getTurnosDefault() {
  return [
    { codigo: '7x7',   nombre: '7 días faena / 7 descanso',   diasEnFaena: 7,  diasDescanso: 7  },
    { codigo: '10x10', nombre: '10 días faena / 10 descanso', diasEnFaena: 10, diasDescanso: 10 },
    { codigo: '14x14', nombre: '14 días faena / 14 descanso', diasEnFaena: 14, diasDescanso: 14 },
    { codigo: '20x10', nombre: '20 días faena / 10 descanso', diasEnFaena: 20, diasDescanso: 10 },
    { codigo: '21x7',  nombre: '21 días faena / 7 descanso',  diasEnFaena: 21, diasDescanso: 7  },
  ];
}

function getCatalogosCompletos() {
  return {
    platos:          getPlatos(),
    ensaladas:       getEnsaladas(),
    acompañamientos: getAcompañamientos(),
    turnos:          getTurnos(),
  };
}

// ── GET: Minuta de un turno ────────────────────────────────────

function getMinuta(turno) {
  if (!turno) throw new Error('Falta parámetro turno');
  const ss        = SpreadsheetApp.openById(SPREADSHEET_ID);
  const nombreHoja = HOJA_PREFIX_MINUTA + turno;  // ej: Minuta_10x10
  const hoja      = ss.getSheetByName(nombreHoja);
  if (!hoja) return { turno, dias: [] };

  const rows = hoja.getDataRange().getValues();
  const meta = rows[0];  // fila 0: [turno, fechaInicio, diasMin, casino]
  const dias = [];

  let diaActual = null;
  for (let i = 2; i < rows.length; i++) {
    const r = rows[i];
    if (!r[0] && !r[1]) continue;

    if (r[0]) {
      // Nueva fila de día
      diaActual = {
        dia:       Number(r[0]),
        fecha:     r[1] || '',
        diaSemana: r[2] || '',
        servicios: [],
      };
      dias.push(diaActual);
    }

    if (diaActual && r[3]) {
      diaActual.servicios.push({
        tipo:          r[3],
        ensalada:      r[4] || '',
        acompañamiento: r[5] || '',
        platoPrincipal: r[6] || '',
        estado:        r[7] || 'Por Confirmar',
      });
    }
  }

  return {
    turno,
    casino:              meta[3] || '',
    fechaInicio:         meta[1] || '',
    diasMinimosRepeticion: Number(meta[2]) || 3,
    dias,
  };
}

// ── POST: Guardar minuta completa ──────────────────────────────

function guardarMinuta(body) {
  const { turno, casino, fechaInicio, diasMinimosRepeticion, dias } = body;
  if (!turno) throw new Error('Falta turno');

  const ss         = SpreadsheetApp.openById(SPREADSHEET_ID);
  const nombreHoja = HOJA_PREFIX_MINUTA + turno;
  let hoja         = ss.getSheetByName(nombreHoja);

  if (!hoja) {
    hoja = ss.insertSheet(nombreHoja);
  } else {
    hoja.clearContents();
  }

  // Fila 0: metadatos
  hoja.appendRow([turno, fechaInicio, diasMinimosRepeticion, casino]);
  // Fila 1: encabezados
  hoja.appendRow(['Dia', 'Fecha', 'DiaSemana', 'Servicio', 'Ensalada', 'Acompañamiento', 'Plato Principal', 'Estado']);

  (dias || []).forEach(dia => {
    let primera = true;
    (dia.servicios || []).forEach(svc => {
      if (primera) {
        hoja.appendRow([dia.dia, dia.fecha, dia.diaSemana, svc.tipo, svc.ensalada, svc.acompañamiento, svc.platoPrincipal, svc.estado]);
        primera = false;
      } else {
        hoja.appendRow(['', '', '', svc.tipo, svc.ensalada, svc.acompañamiento, svc.platoPrincipal, svc.estado]);
      }
    });
  });

  return { ok: true, hoja: nombreHoja, filas: (dias || []).length };
}

// ── POST: CRUD Platos ──────────────────────────────────────────

function guardarPlato(body) {
  const ss   = SpreadsheetApp.openById(SPREADSHEET_ID);
  let hoja   = ss.getSheetByName(HOJA_PLATOS);
  if (!hoja) {
    hoja = ss.insertSheet(HOJA_PLATOS);
    hoja.appendRow(['ID', 'Nombre', 'Tipo', 'Acompañamientos Recomendados', 'Receta', 'Activo']);
  }

  const { id, nombre, tipo, acompañamientosRecomendados, receta, activo } = body.plato;
  const rows  = hoja.getDataRange().getValues();
  const index = rows.findIndex(r => r[0] === id);

  const fila = [id || Utilities.getUuid(), nombre, tipo, (acompañamientosRecomendados || []).join(', '), receta || '', activo !== false];

  if (index > 0) {
    hoja.getRange(index + 1, 1, 1, fila.length).setValues([fila]);
  } else {
    hoja.appendRow(fila);
  }
  return { ok: true };
}

function eliminarPlato(body) {
  const ss   = SpreadsheetApp.openById(SPREADSHEET_ID);
  const hoja = ss.getSheetByName(HOJA_PLATOS);
  if (!hoja) return { ok: false };
  const rows  = hoja.getDataRange().getValues();
  const index = rows.findIndex(r => r[0] === body.id);
  if (index > 0) hoja.deleteRow(index + 1);
  return { ok: true };
}

// ── POST: CRUD Ensaladas ───────────────────────────────────────

function guardarEnsalada(body) {
  const ss   = SpreadsheetApp.openById(SPREADSHEET_ID);
  let hoja   = ss.getSheetByName(HOJA_ENSALADAS);
  if (!hoja) {
    hoja = ss.insertSheet(HOJA_ENSALADAS);
    hoja.appendRow(['ID', 'Nombre', 'Tipo', 'Activo']);
  }
  const { id, nombre, tipo, activo } = body.ensalada;
  const rows  = hoja.getDataRange().getValues();
  const index = rows.findIndex(r => r[0] === id);
  const fila  = [id || Utilities.getUuid(), nombre, tipo || '', activo !== false];
  if (index > 0) {
    hoja.getRange(index + 1, 1, 1, fila.length).setValues([fila]);
  } else {
    hoja.appendRow(fila);
  }
  return { ok: true };
}

// ── POST: CRUD Acompañamientos ─────────────────────────────────

function guardarAcompañamiento(body) {
  const ss   = SpreadsheetApp.openById(SPREADSHEET_ID);
  let hoja   = ss.getSheetByName(HOJA_ACOMPAÑAMIENTOS);
  if (!hoja) {
    hoja = ss.insertSheet(HOJA_ACOMPAÑAMIENTOS);
    hoja.appendRow(['ID', 'Nombre', 'Tipo', 'Activo']);
  }
  const { id, nombre, tipo, activo } = body.acomp;
  const rows  = hoja.getDataRange().getValues();
  const index = rows.findIndex(r => r[0] === id);
  const fila  = [id || Utilities.getUuid(), nombre, tipo || '', activo !== false];
  if (index > 0) {
    hoja.getRange(index + 1, 1, 1, fila.length).setValues([fila]);
  } else {
    hoja.appendRow(fila);
  }
  return { ok: true };
}

// ── POST: Crear nuevo ciclo desde fecha ───────────────────────

function nuevoCiclo(body) {
  const { turno, fechaInicio, casino, diasMinimosRepeticion } = body;
  const turnoInfo = getTurnos().find(t => t.codigo === turno);
  if (!turnoInfo) throw new Error('Turno no encontrado: ' + turno);

  const diasEnFaena = turnoInfo.diasEnFaena;
  const DIAS_SEMANA = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];

  const fecha = new Date(fechaInicio + 'T12:00:00');
  const dias  = [];

  for (let i = 0; i < diasEnFaena; i++) {
    const d   = new Date(fecha);
    d.setDate(d.getDate() + i);
    const dd  = String(d.getDate()).padStart(2, '0');
    const mm  = String(d.getMonth() + 1).padStart(2, '0');
    dias.push({
      dia:       i + 1,
      fecha:     dd + '/' + mm,
      diaSemana: DIAS_SEMANA[d.getDay()],
      servicios: [
        { tipo: 'Almuerzo', ensalada: 'Por Definir', acompañamiento: 'Por Definir', platoPrincipal: 'Por Definir', estado: 'Por Confirmar' },
        { tipo: 'Cena',     ensalada: 'Por Definir', acompañamiento: 'Por Definir', platoPrincipal: 'Por Definir', estado: 'Por Confirmar' },
      ],
    });
  }

  return guardarMinuta({ turno, casino, fechaInicio, diasMinimosRepeticion: diasMinimosRepeticion || 3, dias });
}

// ── Inicializar Sheets con estructura y datos base ─────────────
// Ejecutar UNA VEZ manualmente desde el editor de Apps Script

function inicializarSheets() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  _crearHojaPlatos(ss);
  _crearHojaEnsaladas(ss);
  _crearHojaAcompañamientos(ss);
  _crearHojaTurnos(ss);

  SpreadsheetApp.flush();
  Logger.log('✅ Sheets inicializados correctamente');
}

function _crearHojaPlatos(ss) {
  let h = ss.getSheetByName(HOJA_PLATOS);
  if (h) ss.deleteSheet(h);
  h = ss.insertSheet(HOJA_PLATOS);
  h.appendRow(['ID', 'Nombre', 'Tipo', 'Acompañamientos Recomendados', 'Receta', 'Activo']);
  const platos = [
    ['p1',  'ASADO TRADICIONAL A LAS BRASAS',           'vacuno',   'Parrilla / Carbón',                                    'Asado a las brasas, corte tradicional de faena',    true],
    ['p2',  'Albóndigas en salsa Pomodoro',             'vacuno',   'Salsa Pomodoro,Pasta,Puré Florentina',                  '',                                                  true],
    ['p3',  'Carne Mechada en su salsa',                'vacuno',   'Puré de Papas,Arroz Palomero,Arroz blanco',             '',                                                  true],
    ['p4',  'Carne Salteada a la Peruana',              'vacuno',   'Arroz Chaufa',                                          '',                                                  true],
    ['p5',  'Chopsui de Pollo',                         'pollo',    'Puré Provenzal,Arroz blanco',                           '',                                                  true],
    ['p6',  'Chopsui de Vacuno',                        'vacuno',   'Puré Piamontesa,Arroz Chaufa',                          '',                                                  true],
    ['p7',  'Chuleta de Cerdo Navegada',                'cerdo',    'Arroz Árabe,Arroz Primavera',                           '',                                                  true],
    ['p8',  'Espirales con Cerdo salteado a la Peruana','cerdo',    'Pasta',                                                 '',                                                  true],
    ['p9',  'Espirales con Pollo Navegado (cubitos)',   'pollo',    'Pasta',                                                 '',                                                  true],
    ['p10', 'Estofado de Vacuno',                       'vacuno',   'Arroz blanco,Puré de Papas',                            '',                                                  true],
    ['p11', 'Lentejas Españolas',                       'legumbre', 'Guiso Casero,Legumbres',                                '',                                                  true],
    ['p12', 'Medalla de Cerdo Asada',                   'cerdo',    'Papas Provenzal,Arroz Piamontesa',                      '',                                                  true],
    ['p13', 'Mostaccioli con Tortica',                  'vacuno',   'Pasta,Mostaccioli',                                     '',                                                  true],
    ['p14', 'Mostaccioli en Salsa Bolognesa',           'vacuno',   'Pasta,Mostaccioli',                                     '',                                                  true],
    ['p15', 'Pollo Asado',                              'pollo',    'Arroz Primavera,Puré de Papas',                         '',                                                  true],
    ['p16', 'Pollo Salteado a la Peruana',              'pollo',    'Puré Mixto,Arroz Casero',                               '',                                                  true],
    ['p17', 'Spaghetti con Albóndigas en Pomodoro',    'pasta',    'Pasta,Spaghetti',                                       '',                                                  true],
    ['p18', 'Spaghetti en Salsa Bolognesa',             'pasta',    'Pasta,Spaghetti',                                       '',                                                  true],
    ['p19', 'Tortica de Vacuno',                        'vacuno',   'Arroz blanco,Puré de Papas',                            '',                                                  true],
  ];
  platos.forEach(p => h.appendRow(p));
}

function _crearHojaEnsaladas(ss) {
  let h = ss.getSheetByName(HOJA_ENSALADAS);
  if (h) ss.deleteSheet(h);
  h = ss.insertSheet(HOJA_ENSALADAS);
  h.appendRow(['ID', 'Nombre', 'Tipo', 'Activo']);
  const ensaladas = [
    ['e1','Lechuga con Espinaca','hojas verdes',true],['e2','Tomate con Palmitos','fresca',true],
    ['e3','Zanahoria con Zapallo Italiano','rallada',true],['e4','Betarraga con Cebolla y Cilantro','raíz',true],
    ['e5','Coliflor con Pimiento','crucífera',true],['e6','Apio con Aceitunas','crocante',true],
    ['e7','Arvejas con Cebolla','legumbre',true],['e8','Lechuga con Aceitunas','hojas verdes',true],
    ['e9','Tomate a la Chilena (Cebolla y Cilantro)','típica chilena',true],['e10','Repollo con Zanahoria','coles',true],
    ['e11','Betarraga Rallada con Cilantro','raíz',true],['e12','Lechuga con Zanahoria','hojas verdes',true],
    ['e13','Papas Mayo','tubérculo',true],['e14','Tomate con Poroto Verde','clásica faena',true],
    ['e15','Zanahoria Rallada con Aceitunas','rallada',true],['e16','Choclo con Palmitos','grano',true],
    ['e17','Pepino con Eneldo y Cilantro','fresca',true],['e18','Brócoli con Pimiento','crucífera',true],
    ['e19','Acelga cocida con Sésamo','cocida',true],['e20','Choclo con Mayo y Cilantro','grano',true],
    ['e21','Porotos Verdes con Cebolla','vaina',true],['e22','Apio con Palmitos','crocante',true],
    ['e23','Repollo con Cilantro','coles',true],['e24','Espinaca con Tomate','hojas verdes',true],
    ['e25','Pepino con Tomate','fresca',true],['e26','Lechuga con Palmitos','hojas verdes',true],
    ['e27','Arvejas con Zanahoria','legumbre',true],['e28','Betarraga con Apio','raíz',true],
  ];
  ensaladas.forEach(e => h.appendRow(e));
}

function _crearHojaAcompañamientos(ss) {
  let h = ss.getSheetByName(HOJA_ACOMPAÑAMIENTOS);
  if (h) ss.deleteSheet(h);
  h = ss.insertSheet(HOJA_ACOMPAÑAMIENTOS);
  h.appendRow(['ID', 'Nombre', 'Tipo', 'Activo']);
  const acomps = [
    ['a1','Arroz Casero','arroz',true],['a2','Arroz Chaufa','arroz',true],['a3','Arroz Palomero','arroz',true],
    ['a4','Arroz Piamontesa','arroz',true],['a5','Arroz Primavera','arroz',true],['a6','Arroz blanco','arroz',true],
    ['a7','Arroz Árabe','arroz',true],['a8','Espirales','pasta',true],['a9','Guiso Casero','otro',true],
    ['a10','Legumbres','legumbre',true],['a11','Mostaccioli','pasta',true],['a12','Papas Provenzal','papas',true],
    ['a13','Parrilla / Carbón','otro',true],['a14','Pasta','pasta',true],['a15','Por Definir','otro',true],
    ['a16','Puré Florentina','puré',true],['a17','Puré Mixto','puré',true],['a18','Puré Piamontesa','puré',true],
    ['a19','Puré Provenzal','puré',true],['a20','Puré de Papas','puré',true],['a21','Salsa Pomodoro','otro',true],
    ['a22','Spaghetti','pasta',true],
  ];
  acomps.forEach(a => h.appendRow(a));
}

function _crearHojaTurnos(ss) {
  let h = ss.getSheetByName(HOJA_TURNOS);
  if (h) ss.deleteSheet(h);
  h = ss.insertSheet(HOJA_TURNOS);
  h.appendRow(['Codigo', 'Nombre', 'Dias En Faena', 'Dias Descanso', 'Activo']);
  const turnos = [
    ['7x7',   '7 días faena / 7 descanso',    7,  7,  true],
    ['10x10', '10 días faena / 10 descanso',  10, 10, true],
    ['14x14', '14 días faena / 14 descanso',  14, 14, true],
    ['20x10', '20 días faena / 10 descanso',  20, 10, true],
    ['21x7',  '21 días faena / 7 descanso',   21,  7, true],
  ];
  turnos.forEach(t => h.appendRow(t));
}

// ── Helpers ────────────────────────────────────────────────────
function jsonOk(data) {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, data }))
    .setMimeType(ContentService.MimeType.JSON);
}

function jsonError(msg) {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: false, error: msg }))
    .setMimeType(ContentService.MimeType.JSON);
}
