// Iniciamos la parte para enviar el correo al registrarse
emailjs.init("rIUDcgPWkN13PhkIk");

// Configura la conexión con credenciales a Supabase
const SUPABASE_URL = "https://ytqxpnuulmyktsxhpyod.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_uGAEEt8T2SCD09VtHmEeQQ_0nOXvJ1a";

// Establecemos la conexión
const supabase_conexion = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
);

// Inicializar SDK de Mercado Pago con tu Public Key
const mp = new MercadoPago("APP_USR-a657ff2f-2c57-48fc-8145-aa5eba1cf808", {
  locale: "es-MX",
});

// Leemos la URL del navegador
const parametrosURL = new URLSearchParams(window.location.search);
const producto_id = parametrosURL.get("checkout");

// Verificar sesión
async function verificarSesion() {
  const { data } = await supabase_conexion.auth.getSession();
  if (data && data.session !== null) {
    console.log("Usuario autenticado correctamente:", data.session.user.email);
  } else {
    window.location.href = "login.html";
  }
}

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
    const {
      data: { user },
      error: errorUser,
    } = await supabase_conexion.auth.getUser();

    if (errorUser || !user) {
      await alerta("Debes iniciar sesión para procesar la compra.");
      window.location.href = "login.html";
      return;
    }

    idUsuarioLogueado = user.id;
    emailUsuarioLogueado = user.email;

    const { data: infoUsuario } = await supabase_conexion
      .from("usuarios")
      .select("nombre, direccion")
      .eq("id_usuario", idUsuarioLogueado)
      .single();

    if (infoUsuario) {
      document.getElementById("input-nombre").value = infoUsuario.nombre || "";
      document.getElementById("input-direccion").value =
        infoUsuario.direccion || "";
    }

    const idProductoDirecto = parametrosURL.get("checkout");

    if (idProductoDirecto) {
      await cargarProductoUnico(parseInt(idProductoDirecto));
    } else {
      await cargarProductosDesdeCarrito();
    }
  } catch (err) {
    console.error("Error al arrancar el módulo de pagos:", err);
  }
}

// ==========================================
// 2. RECUPERACIÓN DE DATOS
// ==========================================
async function cargarProductoUnico(idProducto) {
  const { data: producto, error } = await supabase_conexion
    .from("productos")
    .select("id_producto, nombre, precio, imagen")
    .eq("id_producto", idProducto)
    .single();

  if (error || !producto) {
    await alerta("Error al cargar la información del producto.");
    return;
  }

  productosAComprar = [
    {
      id_producto: producto.id_producto,
      nombre: producto.nombre,
      precio: producto.precio,
      imagen: producto.imagen,
      cantidad: 1,
    },
  ];

  renderizarYCalcular();
}

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
    await alerta("No se encontraron productos para facturar.");
    window.location.href = "carrito.html";
    return;
  }

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

  document.getElementById("pago-subtotal").textContent = `$${subtotalFinal} MXN`;
  document.getElementById("pago-envio").textContent = `$${COSTO_ENVIO} MXN`;
  document.getElementById("pago-total").textContent = `$${totalFinal} MXN`;
}

// ==========================================
// 4. GENERACIÓN DE PREFERENCIA DE MERCADO PAGO
// ==========================================
async function obtenerUrlMercadoPago(idTicket) {
  const itemsMP = productosAComprar.map((p) => ({
    title: p.nombre,
    unit_price: Number(p.precio),
    quantity: Number(p.cantidad),
    currency_id: "MXN",
  }));

  itemsMP.push({
    title: "Costo de Envío",
    unit_price: COSTO_ENVIO,
    quantity: 1,
    currency_id: "MXN",
  });

  // Opcional: Si necesitas pasar el ticket en la URL de la Edge Function, puedes agregarlo como parámetro
  const respuesta = await fetch(`https://ytqxpnuulmyktsxhpyod.supabase.co/functions/v1/create-preference?compra=${idTicket}`, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "apikey": SUPABASE_ANON_KEY,
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`
    },
    body: JSON.stringify({ items: itemsMP }),
  });

  const data = await respuesta.json();

  if (data.init_point) {
    return data.init_point;
  }

  if (data.id) {
    return `https://www.mercadopago.com.mx/checkout/v1/redirect?pref_id=${data.id}`;
  }

  throw new Error("La Edge Function no entregó un punto de pago válido.");
}

// ==========================================
// 5. CREACIÓN DE TICKET Y REDIRECCIÓN A MERCADO PAGO
// ==========================================
btnConfirmar.addEventListener("click", async () => {
  const nombreCliente = document.getElementById("input-nombre").value.trim();
  const direccionCliente = document.getElementById("input-direccion").value.trim();

  if (!nombreCliente || !direccionCliente) {
    await alerta("Por favor, completa tus datos de envío antes de confirmar.");
    return;
  }

  btnConfirmar.disabled = true;
  btnConfirmar.textContent = "Procesando orden...";

  try {
    const esCompraDirecta = Boolean(parametrosURL.get("checkout"));

    // 1. Crear el ticket en Supabase de inmediato
    const { data: ticketCreado, error: errorTicket } = await supabase_conexion
      .from("tickets")
      .insert([{ id_usuario: idUsuarioLogueado, total: totalFinal }])
      .select()
      .single();

    if (errorTicket || !ticketCreado) {
      throw new Error("No se pudo generar el ticket inicial en la base de datos.");
    }

    const idTicketGenerado = ticketCreado.id_ticket;

    // 2. Registrar los detalles del ticket y descontar stock
    for (const prod of productosAComprar) {
      const costoTotalArticulo = prod.precio * prod.cantidad;

      await supabase_conexion.from("tickets_detalles").insert([
        {
          id_ticket: idTicketGenerado,
          id_producto: prod.id_producto,
          cantidad: prod.cantidad,
          total: costoTotalArticulo,
        },
      ]);

      const { data: inventarioActual } = await supabase_conexion
        .from("inventarios")
        .select("stock")
        .eq("id_producto", prod.id_producto)
        .single();

      const stockActual = inventarioActual ? inventarioActual.stock : 0;
      const nuevoStockCalculado = Math.max(0, stockActual - prod.cantidad);

      await supabase_conexion
        .from("inventarios")
        .update({ stock: nuevoStockCalculado })
        .eq("id_producto", prod.id_producto);
    }

    // 3. Limpiar carrito si no era compra directa
    if (!esCompraDirecta) {
      await supabase_conexion
        .from("carritos")
        .delete()
        .eq("id_usuario", idUsuarioLogueado);
    }

    // 4. Guardar datos clave en localStorage para usarlos al enviar el correo en la siguiente página
    const datosEnvioCorreo = {
      emailUsuario: emailUsuarioLogueado,
      nombreCliente: nombreCliente,
      direccionCliente: direccionCliente,
      productos: productosAComprar,
      totalFinal: totalFinal,
      idTicket: idTicketGenerado
    };
    localStorage.setItem("datos_correo_textil", JSON.stringify(datosEnvioCorreo));

    // 5. Obtener la URL de pago de Mercado Pago pasando el id_ticket en la URL de éxito
    btnConfirmar.textContent = "Redirigiendo a Mercado Pago...";
    const urlPagoMercadoPago = await obtenerUrlMercadoPago(idTicketGenerado);
    window.location.href = urlPagoMercadoPago;

  } catch (err) {
    console.error(err);
    await alerta("Ocurrió un inconveniente: " + err.message);
    btnConfirmar.disabled = false;
    btnConfirmar.textContent = "Confirmar Compra";
  }
});

document.addEventListener("DOMContentLoaded", inicializarPago);