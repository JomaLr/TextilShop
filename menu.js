// =====================================================
// MENU HAMBURGUESA (SOLO CELULAR)
// Archivo compartido: cargarlo en todas las paginas
// =====================================================
const botonMenu = document.getElementById("menu-toggle");
const menuContenedor = document.getElementById("menu-contenedor");

function cerrarMenu() {
  menuContenedor.classList.remove("mostrar");
  botonMenu.setAttribute("aria-expanded", "false");
  botonMenu.setAttribute("aria-label", "Abrir menú");
  botonMenu.textContent = "☰";
}

function abrirMenu() {
  menuContenedor.classList.add("mostrar");
  botonMenu.setAttribute("aria-expanded", "true");
  botonMenu.setAttribute("aria-label", "Cerrar menú");
  botonMenu.textContent = "✕";
}

// Abrir o cerrar al tocar el botón
botonMenu.addEventListener("click", () => {
  if (menuContenedor.classList.contains("mostrar")) {
    cerrarMenu();
  } else {
    abrirMenu();
  }
});

// Cerrar el menú al tocar cualquier enlace
menuContenedor.querySelectorAll("a").forEach((enlace) => {
  enlace.addEventListener("click", cerrarMenu);
});

// Cerrar el menú al tocar fuera de la barra de navegación
document.addEventListener("click", (evento) => {
  if (!evento.target.closest(".navbar")) {
    cerrarMenu();
  }
});

// Si la ventana se agranda, reiniciar el menú
window.addEventListener("resize", () => {
  if (window.innerWidth > 768) {
    cerrarMenu();
  }
});
