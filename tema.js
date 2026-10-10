(function () {
  const CLAVE = "tema";

  function leerGuardado() {
    try {
      const guardado = localStorage.getItem(CLAVE);
      if (guardado === "dark" || guardado === "light") return guardado;
    } catch (e) {}
    return null;
  }

  function temaInicial() {
    return (
      leerGuardado() ||
      (window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light")
    );
  }

  function aplicar(tema) {
    document.documentElement.setAttribute("data-theme", tema);
    const boton = document.getElementById("tema-toggle");
    if (boton) {
      boton.setAttribute("aria-pressed", tema === "dark" ? "true" : "false");
      boton.textContent = tema === "dark" ? "☀️" : "🌙";
    }
  }

  // Se aplica antes de pintar la página para evitar un parpadeo blanco
  aplicar(temaInicial());

  document.addEventListener("DOMContentLoaded", () => {
    // Tienda: navbar. Dashboard/admin: barra lateral (no tienen navbar)
    const contenedor =
      document.querySelector(".navbar") || document.querySelector(".sidebar");
    if (!contenedor) return;

    const boton = document.createElement("button");
    boton.id = "tema-toggle";
    boton.className = "tema-toggle";
    boton.type = "button";
    boton.setAttribute("aria-label", "Modo oscuro");
    contenedor.appendChild(boton);

    aplicar(document.documentElement.getAttribute("data-theme"));

    boton.addEventListener("click", alternar);
  });

  function alternar() {
    const nuevo =
      document.documentElement.getAttribute("data-theme") === "dark"
        ? "light"
        : "dark";
    try {
      localStorage.setItem(CLAVE, nuevo);
    } catch (e) {}
    aplicar(nuevo);
  }
  window.toggleTheme = alternar;

  // Si el usuario nunca eligió, seguir el cambio del sistema
  window
    .matchMedia("(prefers-color-scheme: dark)")
    .addEventListener("change", (e) => {
      if (!leerGuardado()) aplicar(e.matches ? "dark" : "light");
    });
})();


