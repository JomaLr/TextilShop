//Iniciamos la parte para enviar el correo al registrase
emailjs.init("rIUDcgPWkN13PhkIk");

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

//Guardamos el valor en 'categoria'
const producto_id = parametrosURL.get("checkout"); // Esto valdrá el id del producto

// Esta función se ejecuta AUTOMÁTICAMENTE en cuanto carga la página
async function verificarSesion() {
  // Guachamos si hay un token guardado (O sea si hay una sesión)
  const { data, error } = await supabase_conexion.auth.getSession();

  //Evaluamos si hay una sesión activa
  if (data && data.session !== null) {
    // El usuario tiene la sesión abierta.
    console.log("Usuario autenticado correctamente:", data.session.user.email);
  } else {
    //No hay sesión entonces nos quedamos en el Login
    window.location.href = "login.html";
  }
}

// Ejecutamos la función apenas cargue la pantalla
verificarSesion();

// Costo estandarizado de envío
const COSTO_ENVIO = 150;

// Variables de estado global
let productosAComprar = [];
let idUsuarioLogueado = null;
let emailUsuarioLogueado = "";
let subtotalFinal = 0;
let totalFinal = 0;

// Elementos del DOM
const contenedorProductos = document.getElementById("lista-productos-pago");
const btnConfirmar = document.getElementById("btn-confirmar-compra");

// ==========================================
// 1. CONTROL DE FLUJO DE ENTRADA E INICIALIZACIÓN
// ==========================================
async function inicializarPago() {
  try {
    // A. Obtener el usuario activo
    const {
      data: { user },
      error: errorUser,
    } = await supabase_conexion.auth.getUser();

    if (errorUser || !user) {
      alert("Debes iniciar sesión para procesar la compra.");
      window.location.href = "login.html";
      return;
    }

    idUsuarioLogueado = user.id;
    emailUsuarioLogueado = user.email;

    // B. Rellenar información del usuario desde tu tabla 'usuarios'
    const { data: infoUsuario, error: errorInfo } = await supabase_conexion
      .from("usuarios")
      .select("nombre, direccion")
      .eq("id_usuario", idUsuarioLogueado)
      .single();

    if (!errorInfo && infoUsuario) {
      document.getElementById("input-nombre").value = infoUsuario.nombre || "";
      document.getElementById("input-direccion").value =
        infoUsuario.direccion || "";
    }

    // C. Determinar si viene de un producto único o del carrito completo
    const parametrosURL = new URLSearchParams(window.location.search);
    const idProductoDirecto = parametrosURL.get("checkout");

    if (idProductoDirecto) {
      // Flujo: "Comprar ahora" -> Consultamos la información de ese producto específico
      await cargarProductoUnico(parseInt(idProductoDirecto));
    } else {
      // Flujo: "Desde el carrito" -> Procesamos los elementos guardados en su tabla de la DB
      await cargarProductosDesdeCarrito();
    }
  } catch (err) {
    console.error("Error al arrancar el módulo de pagos:", err);
  }
}

// ==========================================
// 2. RECUPERACIÓN DE DATOS (MÉTODOS DE COMPRA)
// ==========================================

// Flujo A: Cargar el artículo de compra directa
async function cargarProductoUnico(idProducto) {
  const { data: producto, error } = await supabase_conexion
    .from("productos")
    .select("id_producto, nombre, precio, imagen")
    .eq("id_producto", idProducto)
    .single();

  if (error || !producto) {
    alert("Error al cargar la información del producto.");
    return;
  }

  // Estructuramos un formato homogéneo para la lista de compras
  productosAComprar = [
    {
      id_producto: producto.id_producto,
      nombre: producto.nombre,
      precio: producto.precio,
      imagen: producto.imagen,
      cantidad: 1, // Por defecto en compra directa es 1 unidad
    },
  ];

  renderizarYCalcular();
}

// Flujo B: Cargar todo lo que el usuario acumuló en la tabla de carritos
async function cargarProductosDesdeCarrito() {
  const { data: registrosCarrito, error } = await supabase_conexion
    .from("carritos")
    .select(
      `
      cantidad,
      id_producto,
      productos (
        nombre,
        precio,
        imagen
      )
    `,
    )
    .eq("id_usuario", idUsuarioLogueado);

  if (error || !registrosCarrito || registrosCarrito.length === 0) {
    alert("No se encontraron productos para facturar.");
    window.location.href = "carrito.html";
    return;
  }

  // Homogeneizamos la información mapeando los objetos hijos
  productosAComprar = registrosCarrito.map((item) => ({
    id_producto: item.id_producto,
    nombre: item.productos.nombre,
    precio: item.productos.precio,
    imagen: item.productos.imagen,
    cantidad: item.cantidad,
  }));

  renderizarYCalcular();
}

// ==========================================
// 3. RENDERIZACIÓN Y CUENTAS FINANCIERAS
// ==========================================
function renderizarYCalcular() {
  contenedorProductos.innerHTML = "";
  subtotalFinal = 0;

  productosAComprar.forEach((prod) => {
    subtotalFinal += prod.precio * prod.cantidad;

    const divHTML = `
      <div class="summary-product">
        <img src="${prod.imagen}" alt="${prod.nombre}" />
        <div>
          <h3>${prod.nombre} (x${prod.cantidad})</h3>
          <p>$${prod.precio * prod.cantidad} MXN</p>
        </div>
      </div>
    `;
    contenedorProductos.innerHTML += divHTML;
  });

  totalFinal = subtotalFinal + COSTO_ENVIO;

  // Actualizamos visualmente la interfaz
  document.getElementById("pago-subtotal").textContent =
    `$${subtotalFinal} MXN`;
  document.getElementById("pago-envio").textContent = `$${COSTO_ENVIO} MXN`;
  document.getElementById("pago-total").textContent = `$${totalFinal} MXN`;
}

// ==========================================
// 4. TRANSACCIÓN: REGISTRO DE COMPRA E INVENTARIOS
// ==========================================
btnConfirmar.addEventListener("click", async () => {
  const nombreCliente = document.getElementById("input-nombre").value.trim();
  const direccionCliente = document
    .getElementById("input-direccion")
    .value.trim();

  if (!nombreCliente || !direccionCliente) {
    alert("Por favor, completa tus datos de envío antes de confirmar.");
    return;
  }

  // Deshabilitamos el botón para evitar doble clic accidental en transacciones de dinero
  btnConfirmar.disabled = true;
  btnConfirmar.textContent = "Procesando...";

  try {
    // FASE A: Crear la cabecera en la tabla 'tickets'
    const { data: ticketCreado, error: errorTicket } = await supabase_conexion
      .from("tickets")
      .insert([{ id_usuario: idUsuarioLogueado, total: totalFinal }])
      .select()
      .single();

    if (errorTicket || !ticketCreado) {
      throw new Error("Fallo crítico al generar el ticket de compra.");
    }

    const idTicketNuevo = ticketCreado.id_ticket; // Asumiendo que tu PK auto-incremental se llama id_ticket

    // FASE B: Iterar cada artículo comprado para registrar detalles y descontar del inventario
    for (const prod of productosAComprar) {
      const costoTotalArticulo = prod.precio * prod.cantidad;

      // 1. Insertar el renglón correspondiente en 'tickets_detalles'
      const { error: errorDetalle } = await supabase_conexion
        .from("tickets_detalles")
        .insert([
          {
            id_ticket: idTicketNuevo,
            id_producto: prod.id_producto,
            cantidad: prod.cantidad,
            total: costoTotalArticulo,
          },
        ]);

      if (errorDetalle)
        throw new Error(
          `Fallo al registrar el desglose del producto ${prod.nombre}`,
        );

      // 2. Descontar stock nativamente de la tabla 'inventarios'
      // Consultamos existencias reales actuales
      const { data: inventarioActual } = await supabase_conexion
        .from("inventarios")
        .select("stock")
        .eq("id_producto", prod.id_producto)
        .single();

      const stockActual = inventarioActual ? inventarioActual.stock : 0;
      const nuevoStockCalculado = Math.max(0, stockActual - prod.cantidad); // Evitamos números negativos

      const { error: errorStock } = await supabase_conexion
        .from("inventarios")
        .update({ stock: nuevoStockCalculado })
        .eq("id_producto", prod.id_producto);

      if (errorStock)
        throw new Error(
          `Fallo crítico al restar existencias de ${prod.nombre}`,
        );
    }

    // FASE C: Limpiar el carrito del usuario en la DB si la compra provino de allí
    const parametrosURL = new URLSearchParams(window.location.search);
    if (!parametrosURL.get("checkout")) {
      await supabase_conexion
        .from("carritos")
        .delete()
        .eq("id_usuario", idUsuarioLogueado);

      // Limpiamos también el localStorage preventivo anterior
      localStorage.removeItem("orden_checkout");
    }

    // FASE D: Notificación por EmailJS
    await enviarCorreoConfirmacion(
      nombreCliente,
      idTicketNuevo,
      direccionCliente,
    );

    // FASE E: Finalización exitosa y redirección
    alert("¡Compra confirmada con éxito! Muchísimas gracias.");
    window.location.href = `gracias-compra.html?compra=${idTicketNuevo}`;
  } catch (err) {
    console.error(err);
    alert("Ocurrió un inconveniente procesando tu pedido: " + err.message);
    btnConfirmar.disabled = false;
    btnConfirmar.textContent = "Confirmar Compra";
  }
});

// ==========================================
// 5. INTEGRACIÓN CON EMAILJS (ENVÍO DEL CORREO)
// ==========================================
async function enviarCorreoConfirmacion(nombreCliente, idTicket, direccion) {
  // Construimos una lista en texto legible con los productos comprados
  let resumenProductosTexto = productosAComprar
    .map(
      (p) =>
        `- ${p.nombre} (Cantidad: ${p.cantidad}) - $${p.precio * p.cantidad} MXN`,
    )
    .join("\n");

  // Parámetros exactos que vas a mapear en tu plantilla dentro del panel de EmailJS
  const parametrosPlantilla = {
    to_email: emailUsuarioLogueado,
    to_name: nombreCliente,
    ticket_id: idTicket,
    lista_articulos: resumenProductosTexto,
    costo_total: totalFinal,
    direccion_envio: direccion,
  };

  try {
    // Sustituye con tus ID reales de tu cuenta de EmailJS
    await emailjs.send(
      "service_8w9z5hj", // Reemplaza con tu Service ID de EmailJS
      "template_7hg3qes", // Reemplaza con tu Template ID de EmailJS
      parametrosPlantilla,
      "rIUDcgPWkN13PhkIk", // Reemplaza con tu Public Key de EmailJS
    );
    console.log("Notificación por correo electrónico enviada con éxito.");
  } catch (error) {
    // No bloqueamos la experiencia del cliente si falla el servicio externo de correo, solo lo reportamos
    console.error(
      "No se pudo enviar el correo electrónico de confirmación:",
      error,
    );
  }
}

// Inicializar al cargar el DOM
document.addEventListener("DOMContentLoaded", inicializarPago);
