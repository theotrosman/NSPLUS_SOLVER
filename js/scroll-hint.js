/*!
 * ORT Info es fácil — aviso de "hay más abajo"
 * © 2026 Theo Trosman. Todos los derechos reservados.
 * https://github.com/theotrosman
 *
 * Muestra una pastilla flotante cuando hay contenido debajo de la pantalla:
 * al entrar a la página, o cuando aparece algo nuevo más abajo (un resultado).
 * Se esconde apenas la persona baja. Tocándola, baja sola.
 */
(function () {
  "use strict";

  var main = document.querySelector("main");
  if (!main) return;

  var hint = document.createElement("button");
  hint.type = "button";
  hint.className = "scroll-hint";
  hint.setAttribute("aria-label", "Bajar para ver más");
  hint.innerHTML = '<span class="sh-text">Deslizá para ver más</span><span class="sh-arrow" aria-hidden="true">↓</span>';
  document.body.appendChild(hint);

  var fresh = false;      // apareció contenido nuevo abajo
  var lastY = window.scrollY;
  var ticking = false;

  function contentBelow() {
    return main.getBoundingClientRect().bottom - window.innerHeight > 120;
  }

  function update() {
    ticking = false;
    var nearTop = window.scrollY < 80;
    var show = contentBelow() && (nearTop || fresh);
    hint.classList.toggle("is-visible", show);
    hint.querySelector(".sh-text").textContent = fresh && !nearTop ? "Hay más abajo" : "Deslizá para ver más";
  }
  function schedule() {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }

  window.addEventListener("scroll", function () {
    if (Math.abs(window.scrollY - lastY) > 40) { fresh = false; lastY = window.scrollY; }
    schedule();
  }, { passive: true });
  window.addEventListener("resize", schedule);

  // Si aparece contenido nuevo fuera de la pantalla, avisar
  var before = main.scrollHeight;
  new MutationObserver(function () {
    var now = main.scrollHeight;
    if (now > before + 60 && contentBelow()) { fresh = true; lastY = window.scrollY; }
    before = now;
    schedule();
  }).observe(main, { childList: true, subtree: true, attributes: true, attributeFilter: ["hidden", "open"] });

  hint.addEventListener("click", function () {
    fresh = false;
    window.scrollBy({ top: Math.round(window.innerHeight * 0.7), behavior: "smooth" });
  });

  setTimeout(update, 300);
})();
