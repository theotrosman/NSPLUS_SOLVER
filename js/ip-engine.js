/*!
 * Calculadora IP — direcciones, subredes iguales (FLSM) y VLSM, paso a paso
 * © 2026 Theo Trosman. Todos los derechos reservados.
 * https://github.com/theotrosman
 */
(function (global) {
  "use strict";

  /* ---------- Conversión ---------- */
  function parseIP(text) {
    var s = String(text).trim();
    var m = s.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (!m) throw new Error("La IP tiene que tener 4 números separados por puntos (ej: 192.168.1.10).");
    var parts = m.slice(1).map(Number);
    parts.forEach(function (p) { if (p > 255) throw new Error("Cada número de la IP va de 0 a 255 (" + p + " no vale)."); });
    return ((parts[0] << 24) >>> 0) + (parts[1] << 16) + (parts[2] << 8) + parts[3];
  }
  function toIP(n) { n = n >>> 0; return [n >>> 24, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join("."); }
  function maskFromPrefix(p) { return p === 0 ? 0 : (0xFFFFFFFF << (32 - p)) >>> 0; }
  function prefixFromMask(mask) {
    var bin = (mask >>> 0).toString(2).padStart(32, "0");
    if (!/^1*0*$/.test(bin)) throw new Error("Esa máscara no es válida: los 1 tienen que ir todos juntos a la izquierda.");
    return bin.indexOf("0") < 0 ? 32 : bin.indexOf("0");
  }
  function parsePrefix(text) {
    var s = String(text).trim().replace(/^\//, "");
    if (/^\d{1,2}$/.test(s)) {
      var p = +s;
      if (p < 0 || p > 32) throw new Error("El prefijo va de /0 a /32.");
      return p;
    }
    return prefixFromMask(parseIP(s));
  }
  // "192.168.1.0/24" o IP + máscara por separado
  function parseCIDR(text, maskText) {
    var s = String(text).trim();
    if (s.indexOf("/") >= 0) {
      var parts = s.split("/");
      return { ip: parseIP(parts[0]), prefix: parsePrefix(parts[1]) };
    }
    if (maskText == null || String(maskText).trim() === "") throw new Error("Falta la máscara o el prefijo (ej: /24 o 255.255.255.0).");
    return { ip: parseIP(s), prefix: parsePrefix(maskText) };
  }
  function bin8(n) { return (n >>> 0).toString(2).padStart(8, "0"); }
  function binIP(n) { return [n >>> 24, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].map(bin8).join("."); }
  function hostsFor(prefix) { return prefix >= 31 ? (prefix === 31 ? 2 : 1) : Math.pow(2, 32 - prefix) - 2; }

  function ipClass(ip) {
    var a = ip >>> 24;
    if (a < 128) return { cls: "A", def: 8 };
    if (a < 192) return { cls: "B", def: 16 };
    if (a < 224) return { cls: "C", def: 24 };
    if (a < 240) return { cls: "D (multicast)", def: null };
    return { cls: "E (experimental)", def: null };
  }
  function ipType(ip) {
    var a = ip >>> 24, b = (ip >>> 16) & 255;
    if (a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)) return "Privada";
    if (a === 127) return "Loopback (la propia compu)";
    if (a === 169 && b === 254) return "APIPA (no consiguió IP por DHCP)";
    if (a === 0) return "Reservada";
    if (a >= 224) return "Especial (multicast / experimental)";
    return "Pública";
  }

  /* ---------- Información de una red ---------- */
  function info(ip, prefix) {
    var mask = maskFromPrefix(prefix);
    var network = (ip & mask) >>> 0;
    var broadcast = (network | (~mask >>> 0)) >>> 0;
    var first = prefix >= 31 ? network : network + 1;
    var last = prefix >= 31 ? broadcast : broadcast - 1;
    return {
      ip: toIP(ip), prefix: prefix, mask: toIP(mask), wildcard: toIP(~mask >>> 0),
      network: toIP(network), broadcast: toIP(broadcast), first: toIP(first), last: toIP(last),
      total: Math.pow(2, 32 - prefix), hosts: hostsFor(prefix),
      cls: ipClass(ip), type: ipType(ip),
      bin: { ip: binIP(ip), mask: binIP(mask), network: binIP(network), broadcast: binIP(broadcast) },
      isNetworkAddress: ip === network && prefix < 31, isBroadcast: ip === broadcast && prefix < 31,
      raw: { network: network, broadcast: broadcast }
    };
  }

  /* ---------- Subredes iguales (FLSM) ---------- */
  function flsm(text, maskText, count) {
    var base = parseCIDR(text, maskText);
    count = Math.floor(+count);
    if (!(count >= 2)) throw new Error("Poné cuántas subredes necesitás (2 o más).");
    var bits = Math.ceil(Math.log2(count));
    var newPrefix = base.prefix + bits;
    if (newPrefix > 30) throw new Error("No entran " + count + " subredes en una /" + base.prefix + " (quedarían sin hosts).");
    var mask = maskFromPrefix(base.prefix);
    var net = (base.ip & mask) >>> 0;
    var size = Math.pow(2, 32 - newPrefix);
    var total = Math.pow(2, bits);
    var rows = [];
    for (var i = 0; i < Math.min(total, 256); i++) {
      var n = net + i * size;
      rows.push({ index: i + 1, network: toIP(n), first: toIP(n + 1), last: toIP(n + size - 2), broadcast: toIP(n + size - 1), prefix: newPrefix });
    }
    return {
      base: toIP(net) + "/" + base.prefix, bits: bits, created: total, newPrefix: newPrefix, mask: toIP(maskFromPrefix(newPrefix)),
      size: size, hosts: size - 2, rows: rows, truncated: total > 256
    };
  }

  /* ---------- VLSM ---------- */
  function vlsm(text, maskText, requests) {
    var base = parseCIDR(text, maskText);
    var baseMask = maskFromPrefix(base.prefix);
    var start = (base.ip & baseMask) >>> 0;
    var end = (start + Math.pow(2, 32 - base.prefix)) >>> 0;
    var list = requests.map(function (r, i) {
      var hosts = Math.floor(+r.hosts);
      if (!(hosts >= 1)) throw new Error("La subred \"" + (r.name || i + 1) + "\" necesita una cantidad de hosts (1 o más).");
      return { name: String(r.name || "Red " + (i + 1)).trim() || "Red " + (i + 1), hosts: hosts, order: i };
    });
    if (!list.length) throw new Error("Agregá al menos una subred.");
    // De mayor a menor (como los micros en el playón)
    var sorted = list.slice().sort(function (a, b) { return b.hosts - a.hosts || a.order - b.order; });
    var ptr = start, rows = [];
    sorted.forEach(function (r) {
      var need = r.hosts + 2;
      var bits = Math.max(2, Math.ceil(Math.log2(need)));
      var block = Math.pow(2, bits);
      var prefix = 32 - bits;
      // alinear al tamaño del bloque
      if (ptr % block) ptr = Math.ceil(ptr / block) * block;
      if (ptr + block > end) throw new Error("No alcanza el espacio: la red " + toIP(start) + "/" + base.prefix + " no tiene lugar para \"" + r.name + "\" (" + r.hosts + " hosts).");
      rows.push({
        name: r.name, hostsAsked: r.hosts, need: need, block: block, prefix: prefix, mask: toIP(maskFromPrefix(prefix)),
        hostsAvailable: block - 2, wasted: block - 2 - r.hosts,
        network: toIP(ptr), first: toIP(ptr + 1), last: toIP(ptr + block - 2), broadcast: toIP(ptr + block - 1),
        startOffset: ptr - start
      });
      ptr += block;
    });
    return {
      base: toIP(start) + "/" + base.prefix, total: end - start, used: ptr - start, free: end - ptr,
      nextFree: ptr < end ? toIP(ptr) : null, rows: rows
    };
  }

  global.IPEngine = {
    parseIP: parseIP, toIP: toIP, parseCIDR: parseCIDR, parsePrefix: parsePrefix, maskFromPrefix: maskFromPrefix,
    info: info, flsm: flsm, vlsm: vlsm, binIP: binIP, hostsFor: hostsFor
  };
})(typeof window !== "undefined" ? window : globalThis);
