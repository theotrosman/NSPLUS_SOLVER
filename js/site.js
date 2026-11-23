/*!
 * ORT Info es fácil — cosas comunes a todas las páginas
 * © 2026 Theo Trosman. Todos los derechos reservados.
 * https://github.com/theotrosman
 *
 * - Frase del día en el pie (cambia cada día, igual para todos).
 * - Pedido de estrella al repo después de usar una herramienta (evento "ort:done").
 */
(function () {
  "use strict";

  var REPO = "https://github.com/theotrosman/NSPLUS_SOLVER";

  var QUOTES = [
    ["Solo sé que no sé nada.", "Sócrates"],
    ["La educación es el arma más poderosa que puedes usar para cambiar el mundo.", "Nelson Mandela"],
    ["Pienso, luego existo.", "René Descartes"],
    ["La imaginación es más importante que el conocimiento.", "Albert Einstein"],
    ["El único modo de hacer un gran trabajo es amar lo que hacés.", "Steve Jobs"],
    ["No hay que temer a nada en la vida, solo hay que comprenderlo.", "Marie Curie"],
    ["Somos lo que hacemos repetidamente. La excelencia no es un acto, sino un hábito.", "Will Durant (sobre Aristóteles)"],
    ["Conócete a ti mismo.", "Inscripción del templo de Delfos"],
    ["La vida no examinada no merece ser vivida.", "Sócrates"],
    ["Quien tiene un porqué para vivir puede soportar casi cualquier cómo.", "Friedrich Nietzsche"],
    ["El hombre es la medida de todas las cosas.", "Protágoras"],
    ["Nadie se baña dos veces en el mismo río.", "Heráclito"],
    ["La paciencia es amarga, pero su fruto es dulce.", "Atribuida a Jean-Jacques Rousseau"],
    ["Una computadora merecería llamarse inteligente si pudiera engañar a un humano haciéndole creer que es humana.", "Alan Turing"],
    ["Podemos ver solo un poco del futuro, pero lo suficiente para darnos cuenta de que hay mucho por hacer.", "Alan Turing"],
    ["La máquina analítica no pretende crear nada. Puede hacer lo que sepamos ordenarle que haga.", "Ada Lovelace"],
    ["Primero resolvé el problema. Después escribí el código.", "John Johnson"],
    ["La simplicidad es la máxima sofisticación.", "Atribuida a Leonardo da Vinci"],
    ["Aprender sin pensar es esfuerzo perdido; pensar sin aprender, peligroso.", "Confucio"],
    ["El sabio puede cambiar de opinión; el necio, nunca.", "Atribuida a Immanuel Kant"],
    ["La duda es el principio de la sabiduría.", "Aristóteles"],
    ["Lo que sabemos es una gota de agua; lo que ignoramos es el océano.", "Atribuida a Isaac Newton"],
    ["Si he visto más lejos es porque estoy sentado sobre los hombros de gigantes.", "Isaac Newton"],
    ["La felicidad no es algo hecho. Viene de tus propias acciones.", "Dalái Lama"],
    ["El que lee mucho y anda mucho, ve mucho y sabe mucho.", "Miguel de Cervantes"],
    ["Caminante, no hay camino, se hace camino al andar.", "Antonio Machado"],
    ["La mejor forma de predecir el futuro es inventarlo.", "Alan Kay"],
    ["Hablar es fácil. Mostrame el código.", "Linus Torvalds"],
    ["Todo debe hacerse lo más simple posible, pero no más simple.", "Albert Einstein"],
    ["El aprendizaje nunca agota la mente.", "Leonardo da Vinci"],
    ["La perseverancia es la madre del éxito.", "Proverbio"],
    ["Dime y lo olvido, enséñame y lo recuerdo, involúcrame y lo aprendo.", "Atribuida a Benjamin Franklin"],
    ["El genio es un uno por ciento de inspiración y un noventa y nueve por ciento de transpiración.", "Thomas Edison"],
    ["No fracasé. Encontré diez mil formas que no funcionan.", "Thomas Edison"],
    ["La lectura es a la mente lo que el ejercicio al cuerpo.", "Atribuida a Joseph Addison"],
    ["Un viaje de mil millas comienza con un solo paso.", "Lao-Tsé"],
    ["Elige un trabajo que te guste y no tendrás que trabajar ni un día de tu vida.", "Atribuida a Confucio"],
    ["La verdadera sabiduría está en reconocer la propia ignorancia.", "Sócrates"],
    ["La inteligencia es la capacidad de adaptarse al cambio.", "Atribuida a Stephen Hawking"],
    ["Mira las estrellas y no tus pies.", "Stephen Hawking"],
    ["Hay que tener el valor de servirse de su propio entendimiento.", "Immanuel Kant"],
    ["La libertad no es hacer lo que uno quiere, sino querer lo que uno hace.", "Atribuida a Jean-Paul Sartre"],
    ["El hombre está condenado a ser libre.", "Jean-Paul Sartre"],
    ["En medio del invierno aprendí que había en mí un verano invencible.", "Albert Camus"],
    ["Cuanto más aprendo, más me doy cuenta de lo poco que sé.", "Atribuida a Sócrates"],
    ["La ciencia es conocimiento organizado. La sabiduría es vida organizada.", "Atribuida a Immanuel Kant"],
    ["Los límites de mi lenguaje son los límites de mi mundo.", "Ludwig Wittgenstein"],
    ["Lo esencial es invisible a los ojos.", "Antoine de Saint-Exupéry"],
    ["La creatividad es la inteligencia divirtiéndose.", "Atribuida a Albert Einstein"],
    ["Si querés algo que nunca tuviste, hacé algo que nunca hiciste.", "Proverbio"],
    ["La mente que se abre a una nueva idea jamás vuelve a su tamaño original.", "Atribuida a Oliver Wendell Holmes"],
    ["Somos nuestra memoria.", "Jorge Luis Borges"],
    ["He cometido el peor de los pecados que un hombre puede cometer: no he sido feliz.", "Jorge Luis Borges"],
    ["Andábamos sin buscarnos pero sabiendo que andábamos para encontrarnos.", "Julio Cortázar"],
    ["Educar no es dar carrera para vivir, sino templar el alma para las dificultades de la vida.", "José Martí"],
    ["El tiempo es el mejor autor: siempre encuentra un final perfecto.", "Charles Chaplin"],
    ["Un día sin reír es un día perdido.", "Charles Chaplin"],
    ["Lo que hacemos en la vida resuena en la eternidad.", "Marco Aurelio"],
    ["La felicidad de tu vida depende de la calidad de tus pensamientos.", "Marco Aurelio"],
    ["No es que tengamos poco tiempo, sino que perdemos mucho.", "Séneca"],
    ["La suerte es lo que sucede cuando la preparación se encuentra con la oportunidad.", "Séneca"]
  ];

  /* ---------- Frase del día ---------- */
  function dayIndex() {
    var now = new Date();
    var start = new Date(now.getFullYear(), 0, 0);
    var day = Math.floor((now - start) / 86400000);
    return (day + now.getFullYear() * 7) % QUOTES.length;
  }
  function renderQuote() {
    var box = document.getElementById("daily-quote");
    if (!box) return;
    var q = QUOTES[dayIndex()];
    box.innerHTML = "";
    var label = document.createElement("span");
    label.className = "dq-label";
    label.textContent = "Frase del día";
    var text = document.createElement("q");
    text.textContent = q[0];
    var who = document.createElement("cite");
    who.textContent = "— " + q[1];
    box.appendChild(label);
    box.appendChild(text);
    box.appendChild(who);
  }

  /* ---------- Pedido de estrella ---------- */
  var KEY_DONE = "ort:starred", KEY_LAST = "ort:star-last";
  var card = null;
  function starAsk() {
    try {
      if (localStorage.getItem(KEY_DONE)) return;
      var last = +localStorage.getItem(KEY_LAST) || 0;
      if (Date.now() - last < 90 * 1000) return; // no molestar seguido
      localStorage.setItem(KEY_LAST, String(Date.now()));
    } catch (e) { /* sin almacenamiento: igual se muestra */ }
    if (card) card.remove();
    card = document.createElement("aside");
    card.className = "star-card";
    card.setAttribute("role", "dialog");
    card.setAttribute("aria-label", "Pedido de estrella");
    card.innerHTML =
      '<button type="button" class="star-x" aria-label="Cerrar">×</button>' +
      '<p class="star-title"><span aria-hidden="true">⭐</span> ¿Te sirvió?</p>' +
      '<p class="star-text">Si te salvó un ratito, dejale una estrella al proyecto en GitHub. Es gratis, tarda dos segundos y ayuda a que más chicos lo encuentren. ¡Gracias por usarlo!</p>' +
      '<div class="star-actions">' +
      '<a class="btn btn-primary btn-sm star-go" href="' + REPO + '" target="_blank" rel="noopener">Dejar una ⭐</a>' +
      '<button type="button" class="btn btn-ghost btn-sm star-later">Ahora no</button>' +
      "</div>";
    document.body.appendChild(card);
    requestAnimationFrame(function () { card.classList.add("is-in"); });
    function close() { if (!card) return; card.classList.remove("is-in"); var c = card; card = null; setTimeout(function () { c.remove(); }, 250); }
    card.querySelector(".star-x").addEventListener("click", close);
    card.querySelector(".star-later").addEventListener("click", close);
    card.querySelector(".star-go").addEventListener("click", function () {
      try { localStorage.setItem(KEY_DONE, "1"); } catch (e) { /* nada */ }
      card.querySelector(".star-text").textContent = "¡Gracias! Cada estrella suma muchísimo. 💙";
      setTimeout(close, 2500);
    });
  }
  var pending = null;
  document.addEventListener("ort:done", function () {
    clearTimeout(pending);
    pending = setTimeout(starAsk, 1800); // un ratito después de ver el resultado
  });
  window.ORT = window.ORT || {};
  window.ORT.done = function () { document.dispatchEvent(new CustomEvent("ort:done")); };

  renderQuote();
})();
