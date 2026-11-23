/*!
 * Simulador de memoria — reemplazo de páginas (FIFO, LRU, Óptimo) y paginación
 * © 2026 Theo Trosman. Todos los derechos reservados.
 * https://github.com/theotrosman
 */
(function (global) {
  "use strict";

  function parseRefs(text) {
    var refs = String(text).split(/[\s,;-]+/).filter(Boolean).map(function (x) {
      if (!/^\d+$/.test(x)) throw new Error("La cadena de referencias tiene que ser de números de página (ej: 7 0 1 2 0 3).");
      return +x;
    });
    if (!refs.length) throw new Error("Escribí la cadena de referencias.");
    if (refs.length > 60) throw new Error("Como mucho 60 referencias.");
    return refs;
  }

  // Cada paso guarda cómo quedan los marcos (cada página se queda en su marco hasta que la reemplazan)
  function simulate(refs, frames, algo) {
    frames = Math.floor(+frames);
    if (!(frames >= 1 && frames <= 10)) throw new Error("La cantidad de marcos va de 1 a 10.");
    var slots = [], loadedAt = [], lastUse = [], steps = [], faults = 0;
    refs.forEach(function (page, t) {
      var idx = slots.indexOf(page), hit = idx >= 0, victim = null, slot = idx;
      if (hit) {
        lastUse[idx] = t;
      } else {
        faults++;
        if (slots.length < frames) {
          slot = slots.length;
          slots.push(page); loadedAt.push(t); lastUse.push(t);
        } else {
          if (algo === "FIFO") slot = loadedAt.indexOf(Math.min.apply(null, loadedAt));
          else if (algo === "LRU") slot = lastUse.indexOf(Math.min.apply(null, lastUse));
          else { // Óptimo: la que se usa más lejos en el futuro (o nunca)
            var far = -1;
            slots.forEach(function (p, i) {
              var next = refs.indexOf(p, t + 1);
              var dist = next < 0 ? Infinity : next;
              if (dist > far) { far = dist; slot = i; }
            });
          }
          victim = slots[slot];
          slots[slot] = page; loadedAt[slot] = t; lastUse[slot] = t;
        }
      }
      steps.push({ ref: page, frames: slots.slice(), hit: hit, slot: slot, victim: victim });
    });
    return { algo: algo, frames: frames, refs: refs, steps: steps, faults: faults, hits: refs.length - faults,
      faultRate: Math.round(faults / refs.length * 1000) / 10 };
  }

  var NAMES = { FIFO: "FIFO (el primero que entró, primero en salir)", LRU: "LRU (sale la menos usada recientemente)", OPT: "Óptimo (sale la que se va a usar más tarde)" };

  // Traducción de dirección lógica → física con paginación
  function translate(pageSize, address, pageTable) {
    pageSize = Math.floor(+pageSize); address = Math.floor(+address);
    if (!(pageSize >= 1)) throw new Error("El tamaño de página tiene que ser un número positivo.");
    if (!(address >= 0)) throw new Error("La dirección lógica tiene que ser un número 0 o mayor.");
    var page = Math.floor(address / pageSize), offset = address % pageSize;
    var frame = pageTable && Object.prototype.hasOwnProperty.call(pageTable, page) ? +pageTable[page] : null;
    var pow2 = (pageSize & (pageSize - 1)) === 0;
    return {
      pageSize: pageSize, address: address, page: page, offset: offset, frame: frame,
      physical: frame == null || isNaN(frame) ? null : frame * pageSize + offset,
      offsetBits: pow2 ? Math.log2(pageSize) : null,
      binary: pow2 ? address.toString(2) : null
    };
  }
  function parseTable(text) {
    var t = {};
    String(text).split(/[\n,;]+/).forEach(function (line) {
      var m = line.match(/(\d+)\s*(?:→|->|=|:|\s)\s*(\d+)/);
      if (m) t[+m[1]] = +m[2];
    });
    return t;
  }

  global.MemEngine = { parseRefs: parseRefs, simulate: simulate, translate: translate, parseTable: parseTable, NAMES: NAMES };
})(typeof window !== "undefined" ? window : globalThis);
