// =====================================================
// CONEXION CON SUPABASE
// =====================================================

const SUPABASE_URL =
  "https://ytqxpnuulmyktsxhpyod.supabase.co";

const SUPABASE_ANON_KEY =
  "sb_publishable_uGAEEt8T2SCD09VtHmEeQQ_0nOXvJ1a";


// =====================================================
// ESTABLECEMOS LA CONEXION
// =====================================================

const supabase_conexion =
  supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
  );



// =====================================================
// CARGAR PAGINA
// =====================================================

document.addEventListener(
  "DOMContentLoaded",
  () => {

    const parametrosURL =
      new URLSearchParams(
        window.location.search
      );


    const categoriaSeleccionada =
      parametrosURL.get(
        "categoria"
      );


    if (categoriaSeleccionada) {

      const titulo =
        document.getElementById(
          "zona"
        );

      titulo.textContent =
        categoriaSeleccionada;
    }


    const resumen =
      document.getElementById(
        "resumen_zona"
      );


    if (
      categoriaSeleccionada ===
      "Tendencias"
    ) {

      resumen.textContent =
        "Descubre las prendas que están dominando las calles esta temporada y que se agotan en tiempo récord.";

      cargarTendencias();


    } else if (
      categoriaSeleccionada ===
      "Novedades"
    ) {

      resumen.textContent =
        "Recién salido y directo a tu armario. Explora nuestros últimos lanzamientos y consigue lo más nuevo.";

      cargarNovedades();


    } else if (
      categoriaSeleccionada ===
      "Ofertas"
    ) {

      resumen.textContent =
        "El mejor estilo no tiene por qué costar más. Aprovecha descuentos exclusivos en una selección especial de prendas.";


    } else if (
      categoriaSeleccionada
    ) {

      resumen.textContent =
        `Explora nuestra colección de ${categoriaSeleccionada}.`;

      cargarProductosPorCategoria(
        categoriaSeleccionada
      );


    } else {

      resumen.textContent =
        "La mejor selección para ti.";

    }

  }
);



// =====================================================
// CARGAR NOVEDADES
// =====================================================

async function cargarNovedades() {

  try {

    const {
      data: productos,
      error
    } =
      await supabase_conexion
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
        `
        )
        .order(
          "id_producto",
          {
            ascending: false
          }
        );


    if (error) {

      console.error(
        "Error al traer las novedades:",
        error
      );

      return;
    }


    renderizarProductosEnGrid(
      productos
    );


  } catch (err) {

    console.error(
      "Error inesperado en novedades:",
      err
    );

  }

}



// =====================================================
// CARGAR PRODUCTOS POR CATEGORIA
// =====================================================

async function cargarProductosPorCategoria(
  nombreCategoria
) {

  try {

    const {
      data: productos,
      error
    } =
      await supabase_conexion
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
        `
        )
        .eq(
          "categorias.nombre_categoria",
          nombreCategoria
        );


    if (error) {

      console.error(
        "Error al filtrar por categoría:",
        error
      );

      return;
    }


    renderizarProductosEnGrid(
      productos,
      nombreCategoria
    );


  } catch (err) {

    console.error(
      "Error inesperado al cargar la categoría:",
      err
    );

  }

}



// =====================================================
// RENDERIZAR PRODUCTOS
// =====================================================

function renderizarProductosEnGrid(
  listaProductos,
  nombreCategoria = ""
) {

  const grid =
    document.getElementById(
      "grid-productos"
    );


  grid.innerHTML = "";


  if (
    listaProductos.length === 0
  ) {

    grid.innerHTML =
      nombreCategoria
        ? `<p>No hay productos disponibles en "${nombreCategoria}" por el momento.</p>`
        : `<p>No hay productos registrados en este momento.</p>`;

    return;
  }


  listaProductos.forEach(
    (prod) => {

      const nombreCat =
        prod.categorias
          ? prod.categorias.nombre_categoria
          : "General";


      const tarjetaHTML = `

        <div
          class="product-card"
          data-nombre="${prod.nombre}"
        >

          <img
            src="${prod.imagen}"
            alt="${prod.nombre}"
          />


          <div class="product-info">

            <h3>
              ${prod.nombre}
            </h3>


            <p class="category">
              ${nombreCat}
            </p>


            <p class="price">
              $${prod.precio} MXN
            </p>


            <button
              class="ver-detalle-btn"
            >
              Ver detalles
            </button>

          </div>

        </div>

      `;


      grid.innerHTML +=
        tarjetaHTML;

    }
  );

}



// =====================================================
// CARGAR TENDENCIAS
// =====================================================

async function cargarTendencias() {

  try {

    const {
      data: ventas,
      error: errorVentas
    } =
      await supabase_conexion
        .from(
          "tickets_detalles"
        )
        .select(
          "id_producto"
        );


    if (errorVentas) {

      console.error(
        "Error al obtener datos de ventas para Tendencias:",
        errorVentas
      );

      return;
    }


    const grid =
      document.getElementById(
        "grid-productos"
      );


    if (
      !ventas ||
      ventas.length === 0
    ) {

      grid.innerHTML =
        "<p class='no-products'>Aún no hay suficientes datos para definir las tendencias. ¡Sé el primero en imponer estilo!</p>";

      return;
    }


    const conteoProductos = {};


    ventas.forEach(
      (venta) => {

        const id =
          venta.id_producto;

        conteoProductos[id] =
          (
            conteoProductos[id] ||
            0
          ) + 1;

      }
    );


    const productosOrdenados =
      Object.entries(
        conteoProductos
      ).sort(
        (a, b) =>
          b[1] - a[1]
      );


    const idsTendencia =
      productosOrdenados.map(
        (item) =>
          parseInt(item[0])
      );


    const {
      data: productos,
      error: errorProductos
    } =
      await supabase_conexion
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
        `
        )
        .in(
          "id_producto",
          idsTendencia
        );


    if (errorProductos) {

      console.error(
        "Error al cargar los productos de tendencias:",
        errorProductos
      );

      return;
    }


    const listaFinalTendencias =
      idsTendencia
        .map(
          (id) =>
            productos.find(
              (p) =>
                p.id_producto === id
            )
        )
        .filter(
          (p) =>
            p !== undefined
        );


    renderizarProductosEnGrid(
      listaFinalTendencias
    );


  } catch (err) {

    console.error(
      "Error inesperado en el módulo de tendencias:",
      err
    );

  }

}



// =====================================================
// CLICK EN PRODUCTOS
// =====================================================

const gridProductos =
  document.getElementById(
    "grid-productos"
  );


gridProductos.addEventListener(
  "click",
  (evento) => {

    const tarjeta =
      evento.target.closest(
        ".product-card"
      );


    if (tarjeta) {

      const nombreProducto =
        tarjeta.getAttribute(
          "data-nombre"
        );


      window.location.href =
        `detalle-producto.html?producto=${encodeURIComponent(
          nombreProducto
        )}`;

    }

  }
);



// =====================================================
// MENU HAMBURGUESA
// SOLO CELULAR
// =====================================================

document.addEventListener(
  "DOMContentLoaded",
  () => {

    const menuToggle =
      document.getElementById(
        "menu-toggle"
      );


    const menuContenedor =
      document.getElementById(
        "menu-contenedor"
      );


    if (
      !menuToggle ||
      !menuContenedor
    ) {

      return;
    }


    // ABRIR / CERRAR MENU

    menuToggle.addEventListener(
      "click",
      () => {

        menuContenedor.classList.toggle(
          "mostrar"
        );


        const menuAbierto =
          menuContenedor.classList.contains(
            "mostrar"
          );


        menuToggle.innerHTML =
          menuAbierto
            ? "✕"
            : "☰";


        menuToggle.setAttribute(
          "aria-expanded",
          menuAbierto
        );


        menuToggle.setAttribute(
          "aria-label",
          menuAbierto
            ? "Cerrar menú"
            : "Abrir menú"
        );

      }
    );



    // CERRAR AL SELECCIONAR UNA OPCION

    const enlacesMenu =
      menuContenedor.querySelectorAll(
        "a"
      );


    enlacesMenu.forEach(
      (enlace) => {

        enlace.addEventListener(
          "click",
          () => {

            menuContenedor.classList.remove(
              "mostrar"
            );


            menuToggle.innerHTML =
              "☰";


            menuToggle.setAttribute(
              "aria-expanded",
              "false"
            );


            menuToggle.setAttribute(
              "aria-label",
              "Abrir menú"
            );

          }
        );

      }
    );

  }
);
