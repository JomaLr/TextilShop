//Configura la conexión con credenciales a Supabase
const SUPABASE_URL = "https://ytqxpnuulmyktsxhpyod.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_uGAEEt8T2SCD09VtHmEeQQ_0nOXvJ1a";

//Establecemos la conexión
const supabase_conexion = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
);

document.addEventListener("DOMContentLoaded", () => {
  const parametrosURL = new URLSearchParams(window.location.search);
  const categoriaSeleccionada = parametrosURL.get("categoria");

  if (categoriaSeleccionada) {
    const titulo = document.getElementById("zona");
    titulo.textContent = categoriaSeleccionada;
  }

  const resumen = document.getElementById("resumen_zona");

  if (categoriaSeleccionada === "Tendencias") {
    resumen.textContent =
      "Descubre las prendas que están dominando las calles esta temporada y que se agotan en tiempo récord.";
    // Ejecuta la función
    cargarTendencias();
  } else if (categoriaSeleccionada === "Novedades") {
    resumen.textContent =
      "Recién salido y directo a tu armario. Explora nuestros últimos lanzamientos y consigue lo más nuevo.";

    // Ejecuta la función
    cargarNovedades();
  } else if (categoriaSeleccionada === "Ofertas") {
    resumen.textContent =
      "El mejor estilo no tiene por qué costar más. Aprovecha descuentos exclusivos en una selección especial de prendas.";
  } else if (categoriaSeleccionada) {
    resumen.textContent = `Explora nuestra colección de ${categoriaSeleccionada}.`;
    // Filtramos la base de datos por el nombre  de la categoría
    cargarProductosPorCategoria(categoriaSeleccionada);
  } else {
    resumen.textContent = "La mejor selección para ti.";
  }
});

async function cargarNovedades() {
  try {
    const { data: productos, error } = await supabase_conexion
      .from("productos")
      .select(
        `
        id_producto,
        nombre,
        precio,
        imagen,
        categorias (
          nombre_categoria
        )
      `,
      )
      .order("id_producto", { ascending: false }); // Arreglado para usar la PK incremental

    if (error) {
      console.error("Error al traer las novedades:", error);
      return;
    }

    renderizarProductosEnGrid(productos);
  } catch (err) {
    console.error("Error inesperado en novedades:", err);
  }
}

async function cargarProductosPorCategoria(nombreCategoria) {
  try {
    // El !inner fuerza a Postgres a descartar los productos que no hagan match
    const { data: productos, error } = await supabase_conexion
      .from("productos")
      .select(
        `
        id_producto,
        nombre,
        precio,
        imagen,
        categorias!inner (
          nombre_categoria
        )
      `,
      )
      .eq("categorias.nombre_categoria", nombreCategoria);

    if (error) {
      console.error("Error al filtrar por categoría:", error);
      return;
    }

    renderizarProductosEnGrid(productos, nombreCategoria);
  } catch (err) {
    console.error("Error inesperado al cargar la categoría:", err);
  }
}

function renderizarProductosEnGrid(listaProductos, nombreCategoria = "") {
  const grid = document.getElementById("grid-productos");
  grid.innerHTML = ""; // Limpiamos la cuadrícula por que esta sucia

  if (listaProductos.length === 0) {
    grid.innerHTML = nombreCategoria
      ? `<p>No hay productos disponibles en "${nombreCategoria}" por el momento.</p>`
      : `<p>No hay productos registrados en este momento.</p>`;
    return;
  }

  listaProductos.forEach((prod) => {
    const nombreCat = prod.categorias
      ? prod.categorias.nombre_categoria
      : "General";

    const tarjetaHTML = `
      <div class="product-card" data-nombre="${prod.nombre}">
        <img src="${prod.imagen}" alt="${prod.nombre}" />
        <div class="product-info">
          <h3>${prod.nombre}</h3>
          <p class="category">${nombreCat}</p>
          <p class="price">$${prod.precio} MXN</p>
          <button class="ver-detalle-btn">Ver detalles</button>
        </div>
      </div>
    `;
    grid.innerHTML += tarjetaHTML;
  });
}

async function cargarTendencias() {
  try {
    //Traemos únicamente la columna id_producto de todos los detalles de tickets vendidos
    const { data: ventas, error: errorVentas } = await supabase_conexion
      .from("tickets_detalles")
      .select("id_producto");

    if (errorVentas) {
      console.error(
        "Error al obtener datos de ventas para Tendencias:",
        errorVentas,
      );
      return;
    }

    const grid = document.getElementById("grid-productos");

    // Si nadie ha comprado nada aún en toda la tienda
    if (!ventas || ventas.length === 0) {
      grid.innerHTML =
        "<p class='no-products'>Aún no hay suficientes datos para definir las tendencias. ¡Sé el primero en imponer estilo!</p>";
      return;
    }

    const conteoProductos = {};
    ventas.forEach((venta) => {
      const id = venta.id_producto;
      conteoProductos[id] = (conteoProductos[id] || 0) + 1;
    });
    //Funciona con magia y amistad :)
    const productosOrdenados = Object.entries(conteoProductos).sort(
      (a, b) => b[1] - a[1],
    );

    const idsTendencia = productosOrdenados.map((item) => parseInt(item[0]));

    const { data: productos, error: errorProductos } = await supabase_conexion
      .from("productos")
      .select(
        `
        id_producto,
        nombre,
        precio,
        imagen,
        categorias (
          nombre_categoria
        )
      `,
      )
      .in("id_producto", idsTendencia); // El filtro .in() busca todos los IDs que estén en la lista

    if (errorProductos) {
      console.error(
        "Error al cargar los productos de tendencias:",
        errorProductos,
      );
      return;
    }

    const listaFinalTendencias = idsTendencia
      .map((id) => productos.find((p) => p.id_producto === id))
      .filter((p) => p !== undefined); // Seguridad por si acaso un producto fue borrado de la DB

    renderizarProductosEnGrid(listaFinalTendencias);
  } catch (err) {
    console.error("Error inesperado en el módulo de tendencias:", err);
  }
}

const gridProductos = document.getElementById("grid-productos");

gridProductos.addEventListener("click", (evento) => {
  const tarjeta = evento.target.closest(".product-card");
  if (tarjeta) {
    const nombreProducto = tarjeta.getAttribute("data-nombre");
    window.location.href = `detalle-producto.html?producto=${encodeURIComponent(nombreProducto)}`;
  }
});
// =====================================================
// MENU HAMBURGUESA (SOLO CELULAR)
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

// Si la ventana se agranda (por ejemplo, al girar la tablet), reiniciar el menú
window.addEventListener("resize", () => {
  if (window.innerWidth > 768) {
    cerrarMenu();
  }
});


