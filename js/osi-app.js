/*!
 * Modelo OSI y TCP/IP — referencia y práctica
 * © 2026 Theo Trosman. Todos los derechos reservados.
 * https://github.com/theotrosman
 */
(function () {
  "use strict";

  console.log("%cOSI y TCP/IP%c — © 2026 Theo Trosman. Todos los derechos reservados. https://github.com/theotrosman",
    "font-weight:700", "font-weight:400");

  var LAYERS = [
    { n: 7, name: "Aplicación", tcp: "Aplicación", pdu: "Datos", color: "#8a4fd8",
      what: "Es la capa que usan los programas: el navegador, el mail, WhatsApp. Ofrece los servicios de red al usuario.",
      protocols: ["HTTP / HTTPS (páginas web)", "DNS (traduce nombres a IP)", "SMTP, POP3, IMAP (mail)", "FTP (archivos)", "DHCP (da IP automáticamente)"],
      devices: ["Computadoras, celulares y servidores (los programas)"] },
    { n: 6, name: "Presentación", tcp: "Aplicación", pdu: "Datos", color: "#a35bd1",
      what: "Se ocupa del formato de los datos para que los dos lados se entiendan: codificación, compresión y cifrado.",
      protocols: ["TLS / SSL (cifrado)", "JPEG, PNG, MP3, MPEG (formatos)", "ASCII, UTF-8 (texto)"],
      devices: ["Software de las computadoras"] },
    { n: 5, name: "Sesión", tcp: "Aplicación", pdu: "Datos", color: "#b866c8",
      what: "Abre, mantiene y cierra la conversación entre dos programas (por ejemplo, que no se mezclen dos descargas).",
      protocols: ["NetBIOS", "RPC", "Sockets / establecimiento de sesión"],
      devices: ["Software de las computadoras"] },
    { n: 4, name: "Transporte", tcp: "Transporte", pdu: "Segmento (TCP) / Datagrama (UDP)", color: "#2b4bd6",
      what: "Lleva los datos de programa a programa usando puertos. TCP es confiable (confirma y reenvía lo perdido); UDP es rápido pero no confirma.",
      protocols: ["TCP (web, mail, archivos)", "UDP (juegos online, videollamadas, DNS)", "Puertos: 80 HTTP, 443 HTTPS, 53 DNS"],
      devices: ["Firewalls que filtran por puerto"] },
    { n: 3, name: "Red", tcp: "Internet", pdu: "Paquete", color: "#0f8a8a",
      what: "Se encarga de las direcciones IP y de elegir el camino (ruteo) para llegar a otra red.",
      protocols: ["IP (IPv4 / IPv6)", "ICMP (ping)", "Protocolos de ruteo (RIP, OSPF)"],
      devices: ["Router", "Switch de capa 3"] },
    { n: 2, name: "Enlace de datos", tcp: "Acceso a la red", pdu: "Trama", color: "#1e7a3c",
      what: "Mueve los datos entre dispositivos de la misma red usando direcciones MAC, y detecta errores en el enlace.",
      protocols: ["Ethernet (cable)", "Wi-Fi (IEEE 802.11)", "ARP (de IP a MAC)", "Direcciones MAC"],
      devices: ["Switch", "Placa de red (NIC)", "Access point", "Bridge"] },
    { n: 1, name: "Física", tcp: "Acceso a la red", pdu: "Bits", color: "#c27c0e",
      what: "Transmite los bits (unos y ceros) como señales: electricidad en el cable, luz en la fibra u ondas de radio.",
      protocols: ["Cable UTP y conector RJ45", "Fibra óptica", "Ondas de radio (Wi-Fi, 4G)", "Señales eléctricas"],
      devices: ["Hub", "Repetidor", "Cables y conectores", "Módem (señal)"] }
  ];

  var $ = function (id) { return document.getElementById(id); };
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  $("year").textContent = String(Math.max(2026, new Date().getFullYear()));

  document.querySelectorAll(".tab").forEach(function (t) {
    t.addEventListener("click", function () {
      document.querySelectorAll(".tab").forEach(function (o) { o.classList.toggle("is-active", o === t); o.setAttribute("aria-selected", o === t ? "true" : "false"); });
      document.querySelectorAll(".tab-panel").forEach(function (p) { p.hidden = p.getAttribute("data-panel") !== t.getAttribute("data-tab"); });
    });
  });

  /* ---------- Pila de capas ---------- */
  var TCP = [
    { name: "Aplicación", span: 3 }, { name: "Transporte", span: 1 }, { name: "Internet", span: 1 }, { name: "Acceso a la red", span: 2 }
  ];
  function renderStack() {
    var box = $("stack");
    var head = el("div", "osi-head");
    head.appendChild(el("span", null, "OSI (7 capas)"));
    head.appendChild(el("span", null, "TCP/IP (4 capas)"));
    box.appendChild(head);
    var grid = el("div", "osi-grid");
    var row = 1;
    LAYERS.forEach(function (l) {
      var b = el("button", "osi-layer");
      b.type = "button";
      b.style.gridRow = String(row++);
      b.style.setProperty("--c", l.color);
      b.appendChild(el("b", null, String(l.n)));
      b.appendChild(el("span", null, l.name));
      b.appendChild(el("small", null, l.pdu));
      b.addEventListener("click", function () { select(l, b); });
      grid.appendChild(b);
    });
    var r = 1;
    TCP.forEach(function (t) {
      var d = el("div", "tcp-layer", t.name);
      d.style.gridRow = r + " / span " + t.span;
      r += t.span;
      grid.appendChild(d);
    });
    box.appendChild(grid);
    select(LAYERS[3], grid.children[3]);
  }
  function select(l, btn) {
    document.querySelectorAll(".osi-layer").forEach(function (b) { b.classList.toggle("is-active", b === btn); });
    var d = $("detail");
    d.innerHTML = "";
    d.style.setProperty("--c", l.color);
    d.appendChild(el("p", "osi-kicker", "Capa " + l.n + " de OSI · en TCP/IP: " + l.tcp));
    d.appendChild(el("h3", null, l.name));
    d.appendChild(el("p", null, l.what));
    var g = el("div", "osi-cols");
    [["Cómo se llaman los datos", [l.pdu]], ["Protocolos y ejemplos", l.protocols], ["Dispositivos", l.devices]].forEach(function (c) {
      var col = el("div");
      col.appendChild(el("strong", null, c[0]));
      var ul = el("ul");
      c[1].forEach(function (x) { ul.appendChild(el("li", null, x)); });
      col.appendChild(ul);
      g.appendChild(col);
    });
    d.appendChild(g);
  }

  /* ---------- Encapsulamiento ---------- */
  function renderEncap() {
    var steps = [
      { layer: "Aplicación (7-5)", parts: [["Datos", "data"]], note: "El navegador arma el pedido: GET /index.html" },
      { layer: "Transporte (4)", parts: [["TCP", "h4"], ["Datos", "data"]], note: "Se agrega el encabezado TCP con los puertos (origen 51000 → destino 443). Ahora es un segmento." },
      { layer: "Red (3)", parts: [["IP", "h3"], ["TCP", "h4"], ["Datos", "data"]], note: "Se agrega el encabezado IP con la IP de origen y destino. Ahora es un paquete." },
      { layer: "Enlace (2)", parts: [["MAC", "h2"], ["IP", "h3"], ["TCP", "h4"], ["Datos", "data"], ["FCS", "h2"]], note: "Se agregan las MAC y un control de errores (FCS) al final. Ahora es una trama." },
      { layer: "Física (1)", parts: [["01001011 01100101 …", "bits"]], note: "La trama viaja como bits por el cable, la fibra o el aire." }
    ];
    var box = $("encap");
    steps.forEach(function (s, i) {
      var row = el("div", "encap-row");
      row.style.animationDelay = (i * 0.12) + "s";
      row.appendChild(el("span", "encap-layer", s.layer));
      var pk = el("div", "encap-pkt");
      s.parts.forEach(function (p) { pk.appendChild(el("span", "ep ep-" + p[1], p[0])); });
      row.appendChild(pk);
      row.appendChild(el("p", "muted", s.note));
      box.appendChild(row);
    });
  }

  /* ---------- Práctica ---------- */
  var BANK = [];
  LAYERS.forEach(function (l) {
    l.protocols.forEach(function (p) { BANK.push({ q: "¿En qué capa de OSI trabaja: " + p + "?", a: l.name, why: l.name + ": " + l.what }); });
    l.devices.forEach(function (dv) { if (!/Software|Computadoras|Firewalls/.test(dv)) BANK.push({ q: "¿En qué capa de OSI trabaja un/a " + dv.toLowerCase() + "?", a: l.name, why: l.name + ": " + l.what }); });
    if (l.pdu !== "Datos") BANK.push({ q: "¿Qué capa de OSI usa como PDU: " + l.pdu.toLowerCase() + "?", a: l.name, why: "En " + l.name + " los datos se llaman " + l.pdu.toLowerCase() + "." });
    BANK.push({ q: "La capa " + l.name + " de OSI, ¿a qué capa de TCP/IP corresponde?", a: l.tcp, why: "Aplicación, Presentación y Sesión forman Aplicación; Red es Internet; Enlace y Física forman Acceso a la red.", tcp: true });
  });
  BANK.push({ q: "¿Qué número de capa es Transporte en OSI?", a: "4", why: "De abajo hacia arriba: 1 Física, 2 Enlace, 3 Red, 4 Transporte.", nums: true });
  BANK.push({ q: "¿Qué número de capa es Red en OSI?", a: "3", why: "1 Física, 2 Enlace, 3 Red.", nums: true });

  var quiz = { list: [], i: 0, ok: 0 };
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function options(q) {
    var pool = q.tcp ? ["Aplicación", "Transporte", "Internet", "Acceso a la red"] : q.nums ? ["1", "2", "3", "4", "5", "6", "7"] : LAYERS.map(function (l) { return l.name; });
    var others = shuffle(pool.filter(function (x) { return x !== q.a; })).slice(0, 3);
    return shuffle(others.concat([q.a]));
  }
  function startQuiz() {
    quiz = { list: shuffle(BANK.slice()).slice(0, 10), i: 0, ok: 0 };
    showQuestion();
  }
  function showQuestion() {
    var box = $("quiz");
    box.innerHTML = "";
    if (quiz.i >= quiz.list.length) {
      box.appendChild(el("p", "quiz-score", quiz.ok + " de " + quiz.list.length + " bien" + (quiz.ok >= 8 ? " · ¡Excelente!" : quiz.ok >= 6 ? " · ¡Bien!" : " · Repasá las capas y probá otra vez.")));
      if (window.ORT) window.ORT.done();
      var again = el("button", "btn btn-primary", "Otra ronda");
      again.type = "button";
      again.addEventListener("click", startQuiz);
      box.appendChild(again);
      return;
    }
    var q = quiz.list[quiz.i];
    box.appendChild(el("p", "muted", "Pregunta " + (quiz.i + 1) + " de " + quiz.list.length + " · " + quiz.ok + " bien"));
    box.appendChild(el("p", "quiz-q", q.q));
    var opts = el("div", "quiz-opts");
    options(q).forEach(function (o) {
      var b = el("button", "quiz-opt", o);
      b.type = "button";
      b.addEventListener("click", function () {
        var right = o === q.a;
        if (right) quiz.ok++;
        opts.querySelectorAll("button").forEach(function (x) {
          x.disabled = true;
          if (x.textContent === q.a) x.classList.add("is-right");
          else if (x === b) x.classList.add("is-wrong");
        });
        var fb = el("p", "quiz-fb " + (right ? "ok" : "bad"), (right ? "¡Bien! " : "No: era " + q.a + ". ") + q.why);
        box.appendChild(fb);
        var next = el("button", "btn btn-primary", quiz.i + 1 < quiz.list.length ? "Siguiente" : "Ver resultado");
        next.type = "button";
        next.addEventListener("click", function () { quiz.i++; showQuestion(); });
        box.appendChild(next);
        next.focus();
      });
      opts.appendChild(b);
    });
    box.appendChild(opts);
  }

  /* ---------- Entregables ---------- */
  function studySheet() {
    return [{ title: "Las 7 capas de OSI y su equivalente en TCP/IP", table: { head: ["#", "Capa OSI", "TCP/IP", "Qué hace", "PDU", "Protocolos", "Dispositivos"],
      rows: LAYERS.map(function (l) { return [l.n, l.name, l.tcp, l.what, l.pdu, l.protocols.join(" · "), l.devices.join(" · ")]; }) } },
      { title: "Encapsulamiento", list: ["Aplicación: los datos del programa.", "Transporte: + encabezado TCP/UDP con puertos → segmento.", "Red: + encabezado IP con direcciones IP → paquete.", "Enlace: + direcciones MAC y control de errores (FCS) → trama.", "Física: se transmite como bits."] }];
  }
  var pdfBtn = el("button", "btn btn-primary", "Descargar hoja de estudio");
  pdfBtn.type = "button";
  pdfBtn.addEventListener("click", function () { ORTDoc.download({ tool: "Modelo OSI y TCP/IP", title: "Modelo OSI y TCP/IP", subtitle: "Hoja de estudio: capas, PDU, protocolos y dispositivos.", filename: "osi-tcp-ip", sections: studySheet() }); });
  var actions = el("div", "result-actions");
  actions.appendChild(pdfBtn);
  document.querySelector("main .card:not(.consigna-card)") && document.querySelector("main section.card").appendChild(actions);

  window.ORTConsigna = window.ORTConsigna || {};
  window.ORTConsigna.render = function (items, box) {
    var wrap = el("div", "osi-answers");
    items.forEach(function (it) {
      var c = el("div", "osi-answer");
      c.appendChild(el("strong", null, it.label + ": " + (it.question || "")));
      c.appendChild(el("p", null, "Respuesta: " + (it.answer || "")));
      if (it.explanation) c.appendChild(el("p", "muted", it.explanation));
      wrap.appendChild(c);
    });
    box.appendChild(wrap);
    var b = el("button", "btn btn-primary cc-all", "Descargar las respuestas (PDF)");
    b.type = "button";
    b.addEventListener("click", function () {
      ORTDoc.download({ tool: "Modelo OSI y TCP/IP", title: "Respuestas: redes, OSI y TCP/IP", filename: "respuestas-osi",
        sections: items.map(function (it) { return { title: it.label + ": " + (it.question || ""), text: (it.answer || "") + (it.explanation ? "\n\n" + it.explanation : "") }; }).concat(studySheet()) });
    });
    box.appendChild(b);
    if (window.ORT) window.ORT.done();
  };

  renderStack();
  renderEncap();
  startQuiz();
})();
