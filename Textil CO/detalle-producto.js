//Configura la conexión con credenciales a Supabase
const SUPABASE_URL = "https://ytqxpnuulmyktsxhpyod.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_uGAEEt8T2SCD09VtHmEeQQ_0nOXvJ1a";

//Establecemos la conexión
const supabase_conexion = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
);

// Leemos la URL del navegador
const parametrosURL = new URLSearchParams(window.location.search);
const producto_seleccionado = parametrosURL.get("producto");

// Variable global para controlar de forma segura el stock en los eventos de clic
let stockDisponibleActual = 0;

async function cargarProducto() {
  try {
    // 1. Traemos el producto, su id_categoria y su stock real mediante JOIN
    const { data: producto, error } = await supabase_conexion
      .from("productos")
      .select(
        `
        id_producto, 
        nombre, 
        descripcion, 
        precio, 
        talla, 
        imagen,
        id_categoria,
        inventarios (
          stock
        )
      `,
      )
      .eq("nombre", producto_seleccionado)
      .single();

    if (error) {
      console.error("Error al traer el producto:", error);
      return;
    }

    // Guardamos el valor numérico del stock de forma segura
    stockDisponibleActual =
      producto.inventarios && producto.inventarios[0]
        ? producto.inventarios[0].stock
        : 0;

    const panel = document.getElementById("detalles_prod");
    panel.innerHTML = "";

    // 2. Definimos variables para controlar el estado de la interfaz si no hay stock
    let textoStock = "";
    let deshabilitarAtributo = "";
    let valorInputCantidad = 1;

    if (stockDisponibleActual <= 0) {
      textoStock = `<p class="stock-indicator agotado" style="color: #dc3545; font-weight: bold; margin-top: 10px;">¡Agotado de momento!</p>`;
      deshabilitarAtributo = "disabled";
      valorInputCantidad = 0;
    } else {
      textoStock = `<p class="stock-indicator disponible" style="color: #28a745; font-weight: bold; margin-top: 10px;">Stock disponible: ${stockDisponibleActual} uds.</p>`;
    }

    // 3. Creamos la estructura HTML aplicando las restricciones
    const panelHTML = `
      <div class="product-gallery">
        <img class="main-image" src="${producto.imagen}" alt="${producto.nombre}"/>
      </div>
      <div class="product-info">
        <h1>${producto.nombre}</h1>
        <p class="description">${producto.descripcion}</p>
        <div class="price">$${producto.precio}</div>
        
        <div class="sizes">
          <h3>Talla</h3>
          <div class="size-buttons">
            <button>${producto.talla}</button>
          </div>
        </div>

        <div class="quantity">
          <h3>Cantidad</h3>
          <input type="number" value="${valorInputCantidad}" min="${valorInputCantidad === 0 ? 0 : 1}" max="${stockDisponibleActual}" ${deshabilitarAtributo} />
          ${textoStock}
        </div>

        <div class="buttons">
          <button class="cart-btn" data-id="${producto.id_producto}" ${deshabilitarAtributo}>Agregar al carrito</button>
          <button class="buy-btn" data-id="${producto.id_producto}" ${deshabilitarAtributo}>Comprar ahora</button>
        </div>
      </div>
    `;
    panel.innerHTML = panelHTML;

    // 4. Una vez cargado el producto principal, buscamos los relacionados usando su id_categoria
    if (producto.id_categoria) {
      cargarProductosRelacionados(producto.id_categoria, producto.id_producto);
    }
  } catch (err) {
    console.error("Error inesperado al cargar el detalle:", err);
  }
}

// ===================================================
// FUNCIÓN: CARGAR PRODUCTOS DE LA MISMA CATEGORÍA
// ===================================================
async function cargarProductosRelacionados(idCategoria, idProductoActual) {
  try {
    // Buscamos productos con la misma categoría, limitamos a 3 y excluimos el producto que ya estamos viendo
    const { data: relacionados, error } = await supabase_conexion
      .from("productos")
      .select("id_producto, nombre, precio, imagen")
      .eq("id_categoria", idCategoria)
      .neq("id_producto", idProductoActual) // neq significa 'Not Equal' (No igual a este ID)
      .limit(3);

    if (error) {
      console.error("Error al traer relacionados:", error);
      return;
    }

    const gridRelacionados = document.getElementById("grid-relacionados");
    gridRelacionados.innerHTML = ""; // Limpiamos las tarjetas estáticas

    if (relacionados.length === 0) {
      gridRelacionados.innerHTML =
        "<p>No hay más productos relacionados en esta categoría.</p>";
      return;
    }

    // Inyectamos las tarjetas dinámicas
    relacionados.forEach((prod) => {
      const cardHTML = `
        <div class="product-card">
          <img src="${prod.imagen}" alt="${prod.nombre}" />
          <h3>${prod.nombre}</h3>
          <p>$${prod.precio} MXN</p>
          <a href="detalle-producto.html?producto=${encodeURIComponent(prod.nombre)}">
            <button class="btn-ver-relacionado">Ver producto</button>
          </a>
        </div>
      `;
      gridRelacionados.innerHTML += cardHTML;
    });
  } catch (err) {
    console.error("Error inesperado en productos relacionados:", err);
  }
}

// ===================================================
// ESCUCHADOR DE EVENTOS CON CONTROL INTEGRAL DE STOCK
// ===================================================
const productSection = document.getElementById("detalles_prod");

productSection.addEventListener("click", async (evento) => {
  // Si el stock general es menor o igual a cero, bloqueamos cualquier intento por JS
  if (stockDisponibleActual <= 0) {
    alert("Lo sentimos, este artículo no cuenta con existencias disponibles.");
    return;
  }

  // ==========================================
  // BOTÓN: AGREGAR AL CARRITO
  // ==========================================
  if (evento.target.classList.contains("cart-btn")) {
    const idProducto = evento.target.getAttribute("data-id");
    const inputCantidad = productSection.querySelector(".quantity input");
    const cantidadSeleccionada = parseInt(inputCantidad.value);

    // Validación rigurosa de cantidades solicitadas contra inventario
    if (isNaN(cantidadSeleccionada) || cantidadSeleccionada < 1) {
      alert("Por favor, ingresa una cantidad válida.");
      return;
    }

    if (cantidadSeleccionada > stockDisponibleActual) {
      alert(
        `No puedes agregar esa cantidad. Solo quedan ${stockDisponibleActual} unidades libres.`,
      );
      return;
    }

    try {
      const {
        data: { user },
        error: errorUsuario,
      } = await supabase_conexion.auth.getUser();

      if (errorUsuario || !user) {
        alert("Debes iniciar sesión para agregar productos al carrito.");
        return;
      }

      const idUsuario = user.id;

      const { error: errorCarrito } = await supabase_conexion
        .from("carritos")
        .insert([
          {
            id_usuario: idUsuario,
            id_producto: parseInt(idProducto),
            cantidad: cantidadSeleccionada,
          },
        ]);

      if (errorCarrito) {
        console.error("Error al insertar en el carrito:", errorCarrito);
        alert("No se pudo agregar el producto al carrito.");
        return;
      }

      alert("Producto agregado al carrito!");
      location.reload();
    } catch (err) {
      console.error("Error inesperado en la acción del carrito:", err);
    }
  }

  // ==========================================
  // BOTÓN: COMPRAR AHORA (Redirección con control de stock)
  // ==========================================
  if (evento.target.classList.contains("buy-btn")) {
    const idProducto = evento.target.getAttribute("data-id");
    const inputCantidad = productSection.querySelector(".quantity input");
    const cantidadSeleccionada = parseInt(inputCantidad.value);

    if (
      isNaN(cantidadSeleccionada) ||
      cantidadSeleccionada < 1 ||
      cantidadSeleccionada > stockDisponibleActual
    ) {
      alert("Cantidad inválida o superior a las existencias disponibles.");
      return;
    }

    // Redirigimos pasándole el ID por URL como tenías definido
    window.location.href = `pago.html?checkout=${idProducto}`;
  }
});

// Inicializamos la función cuando todo el HTML esté listo
document.addEventListener("DOMContentLoaded", cargarProducto);
