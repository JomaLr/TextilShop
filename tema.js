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
  }

  // Se aplica antes de pintar la página para evitar un parpadeo blanco
  aplicar(temaInicial());

  // Si el usuario nunca eligió, seguir el cambio del sistema
  window
    .matchMedia("(prefers-color-scheme: dark)")
    .addEventListener("change", (e) => {
      if (!leerGuardado()) aplicar(e.matches ? "dark" : "light");
    });
})();
