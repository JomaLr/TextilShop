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

  // 1. EVALUAMOS SI SON SECCIONES ESPECIALES DE LA TIENDA
  if (categoriaSeleccionada === "Tendencias") {
    resumen.textContent =
      "Descubre las prendas que están dominando las calles esta temporada y que se agotan en tiempo récord.";
    // Ejecuta la nueva función inteligente de más vendidos
    cargarTendencias();
  } else if (categoriaSeleccionada === "Novedades") {
    resumen.textContent =
      "Recién salido y directo a tu armario. Explora nuestros últimos lanzamientos y consigue lo más nuevo.";

    // Ejecuta la función corregida (ordenada por id_producto)
    cargarNovedades();
  } else if (categoriaSeleccionada === "Ofertas") {
    resumen.textContent =
      "El mejor estilo no tiene por qué costar más. Aprovecha descuentos exclusivos en una selección especial de prendas.";
  } else if (categoriaSeleccionada) {
    // 2. ENTRARÁ AQUÍ CUANDO DEN CLICK A TU TARJETA DE CATEGORÍA DINÁMICA
    resumen.textContent = `Explora nuestra colección de ${categoriaSeleccionada}.`;

    // Filtramos la base de datos por el nombre recibido de la categoría
    cargarProductosPorCategoria(categoriaSeleccionada);
  } else {
    resumen.textContent = "La mejor selección para ti.";
  }
});

// ===================================================
// FUNCIÓN A: CARGAR NOVEDADES (SOLUCIÓN ERROR ANTERIOR)
// ===================================================
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

// ===================================================
// FUNCIÓN B: FILTRAR PRODUCTOS POR TU CARD DE CATEGORÍA
// ===================================================
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

// ===================================================
// FUNCIÓN AUXILIAR: RENDERIZA LAS TARJETAS EN EL DOM
// ===================================================
function renderizarProductosEnGrid(listaProductos, nombreCategoria = "") {
  const grid = document.getElementById("grid-productos");
  grid.innerHTML = ""; // Limpiamos la cuadrícula

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

// ===================================================
// FUNCIÓN C: ALGORITMO DE TENDENCIAS (MÁS VENDIDOS)
// ===================================================
async function cargarTendencias() {
  try {
    // 1. Traemos únicamente la columna id_producto de todos los detalles de tickets vendidos
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

    // 2. CONTADOR DE FRECUENCIAS: Contamos cuántas veces se ha vendido cada id_producto
    // Ejemplo de resultado esperado: { "5": 12, "2": 8, "9": 3 } (El producto 5 se vendió 12 veces)
    const conteoProductos = {};
    ventas.forEach((venta) => {
      const id = venta.id_producto;
      conteoProductos[id] = (conteoProductos[id] || 0) + 1;
    });

    // 3. ORDENAMIENTO: Convertimos el mapa en un array de arrays y lo ordenamos de mayor a menor ventas
    // Ejemplo: [["5", 12], ["2", 8], ["9", 3]]
    const productosOrdenados = Object.entries(conteoProductos).sort(
      (a, b) => b[1] - a[1],
    ); // b[1] - a[1] ordena descendentemente por el conteo de ventas

    // Extraemos solo los IDs en el orden correcto
    // Ejemplo: [5, 2, 9]
    const idsTendencia = productosOrdenados.map((item) => parseInt(item[0]));

    // 4. CONSULTA DE DETALLES: Traemos la información visual de los productos que están en tendencia
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

    // 5. REORDENAR EL RESULTADO DE LA DB
    // Nota: Supabase nos devuelve los productos ordenados por su ID nativo (2, 5, 9).
    // Necesitamos forzar el orden de nuestro algoritmo de tendencias (5, 2, 9).
    const listaFinalTendencias = idsTendencia
      .map((id) => productos.find((p) => p.id_producto === id))
      .filter((p) => p !== undefined); // Seguridad por si acaso un producto fue borrado de la DB

    // 6. RENDERIZADO: Reutilizamos tu función para pintar la cuadrícula con el orden analítico
    renderizarProductosEnGrid(listaFinalTendencias);
  } catch (err) {
    console.error("Error inesperado en el módulo de tendencias:", err);
  }
}

// ==========================================
// DELEGACIÓN DE EVENTOS: REDIRECCIÓN AL DETALLE
// ==========================================
const gridProductos = document.getElementById("grid-productos");

gridProductos.addEventListener("click", (evento) => {
  const tarjeta = evento.target.closest(".product-card");
  if (tarjeta) {
    const nombreProducto = tarjeta.getAttribute("data-nombre");
    window.location.href = `detalle-producto.html?producto=${encodeURIComponent(nombreProducto)}`;
  }
});
