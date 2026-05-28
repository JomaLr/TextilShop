//Configuramos la conexión con credenciales a Supabase
const BASE_URL = "https://ytqxpnuulmyktsxhpyod.supabase.co";
const BASE_ANON_KEY = "sb_publishable_uGAEEt8T2SCD09VtHmEeQQ_0nOXvJ1a";

const supabase_conexion = supabase.createClient(BASE_URL, BASE_ANON_KEY);

// Esta función se ejecuta AUTOMÁTICAMENTE en cuanto carga la página
async function verificarSesion() {
  // Guachamos si hay un token guardado (O sea si hay una sesión)
  const { data, error } = await supabase_conexion.auth.getSession();

  //Evaluamos si hay una sesión activa
  if (data && data.session !== null) {
    // El usuario tiene la sesión abierta.
    console.log("Usuario autenticado correctamente:", data.session.user.email);
    document.getElementById("logearse").innerText = `Mi perfil`;
  } else {
    //No hay sesión entonces lo mandamos a iniciar su sesión
    window.location.href = "login.html";
  }
}

// Ejecutamos la función apenas cargue la pantalla
verificarSesion();

// Variables globales para el control financiero y de stock
const COSTO_ENVIO = 150;
let productosEnCarritoGlobal = []; // Guardará la info actual para verificar stock al pagar

// Elementos del DOM
const contenedorCarrito = document.getElementById("contenedor-carrito");
const btnPago = document.getElementById("btn-proceder-pago");

// ==========================================
// 1. CARGAR CARRITO SEGÚN EL USUARIO LOGUEADO
// ==========================================
async function cargarCarrito() {
  try {
    // Obtenemos el usuario autenticado
    const {
      data: { user },
      error: errorUser,
    } = await supabase_conexion.auth.getUser();

    if (errorUser || !user) {
      contenedorCarrito.innerHTML =
        "<p>Debes iniciar sesión para ver tu carrito.</p>";
      return;
    }

    // Traemos los elementos del carrito cruzando datos de productos e inventarios de forma limpia
    const { data: carrito, error } = await supabase_conexion
      .from("carritos")
      .select(
        `
        cantidad,
        id_producto,
        productos (
          nombre,
          precio,
          talla,
          imagen,
          inventarios (
            stock
          )
        )
      `,
      )
      .eq("id_usuario", user.id);

    if (error) {
      console.error("Error al obtener carrito:", error);
      return;
    }

    // Guardamos en la variable global para usar en validaciones posteriores
    productosEnCarritoGlobal = carrito;

    if (carrito.length === 0) {
      contenedorCarrito.innerHTML =
        '<br><p>Tu carrito está vacío.</p><br> <a class="enlacea" href="index.html">Navega por la tienda!</a><br><br>';
      actualizarResumen(0);
      return;
    }

    // Renderizamos las tarjetas dinámicamente
    contenedorCarrito.innerHTML = "";

    carrito.forEach((item) => {
      // Manejo seguro por si no hay datos en los joins
      const prod = item.productos;

      // NUEVA RUTA: El stock ahora cuelga directo de productos.inventarios
      const stockDisponible = prod?.inventarios?.[0]?.stock || 0;

      const itemHTML = `
        <div class="cart-item" data-id="${item.id_producto}">
          <img src="${prod.imagen}" alt="${prod.nombre}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 8px;" />

          <div class="item-info">
            <h2>${prod.nombre}</h2>
            <p>Talla: ${prod.talla}</p>
            <span>$${prod.precio}</span>
          </div>
          
          <div class="item-quantity">
            <label>Cantidad</label>
            <input type="number" 
                   class="cantidad-input" 
                   value="${item.cantidad}" 
                   min="1" 
                   data-precio="${prod.precio}"
                   data-stock="${stockDisponible}" />
          </div>
          
          <button class="btn-eliminar-item">Eliminar</button>
        </div>
      `;
      contenedorCarrito.innerHTML += itemHTML;
    });

    // Calculamos los totales por primera vez con la información renderizada
    recalcularTotales();
  } catch (err) {
    console.error("Error inesperado en el carrito:", err);
  }
}

// ==========================================
// 2. RECALCULAR TOTALES DINÁMICAMENTE
// ==========================================
function recalcularTotales() {
  let subtotal = 0;
  const items = contenedorCarrito.querySelectorAll(".cart-item");

  items.forEach((item) => {
    const input = item.querySelector(".cantidad-input");
    const cantidad = parseInt(input.value) || 0;
    const precio = parseFloat(input.getAttribute("data-precio"));

    subtotal += precio * cantidad;
  });

  actualizarResumen(subtotal);
}

function actualizarResumen(subtotal) {
  const total = subtotal > 0 ? subtotal + COSTO_ENVIO : 0;
  const envioMostrar = subtotal > 0 ? COSTO_ENVIO : 0;

  document.getElementById("resumen-subtotal").textContent = `$${subtotal}`;
  document.getElementById("resumen-envio").textContent = `$${envioMostrar}`;
  document.getElementById("resumen-total").textContent = `$${total} MXN`;
}

// ==========================================
// 3. ESCUCHADORES DE EVENTOS (INTERACCIONES)
// ==========================================

// Cambios de cantidad y eliminaciones mediante delegación de eventos
contenedorCarrito.addEventListener("input", async (evento) => {
  if (evento.target.classList.contains("cantidad-input")) {
    const input = evento.target;
    const nuevaCantidad = parseInt(input.value);
    const stockMaximo = parseInt(input.getAttribute("data-stock"));
    const idProducto = input.closest(".cart-item").getAttribute("data-id");

    if (isNaN(nuevaCantidad) || nuevaCantidad < 1) return;

    // Alerta visual inmediata si supera el stock del inventario
    if (nuevaCantidad > stockMaximo) {
      alert(
        `Lo sentimos, solo quedan ${stockMaximo} unidades disponibles en inventario.`,
      );
      input.value = stockMaximo; // Reseteamos al tope
    }

    // Sincronizamos la nueva cantidad con la base de datos (Supabase)
    const {
      data: { user },
    } = await supabase_conexion.auth.getUser();
    await supabase_conexion
      .from("carritos")
      .update({ cantidad: parseInt(input.value) })
      .eq("id_usuario", user.id)
      .eq("id_producto", idProducto);

    // Actualizamos los montos en la interfaz de inmediato
    recalcularTotales();
  }
});

contenedorCarrito.addEventListener("click", async (evento) => {
  if (evento.target.classList.contains("btn-eliminar-item")) {
    const tarjeta = evento.target.closest(".cart-item");
    const idProducto = tarjeta.getAttribute("data-id");

    const {
      data: { user },
    } = await supabase_conexion.auth.getUser();

    // Borramos de Supabase
    const { error } = await supabase_conexion
      .from("carritos")
      .delete()
      .eq("id_usuario", user.id)
      .eq("id_producto", idProducto);

    if (!error) {
      tarjeta.remove(); // Quitamos visualmente la fila de la interfaz
      recalcularTotales(); // Recalculamos subtotales
      // Si el carrito se quedó vacío por completo, recargamos para mostrar el mensaje correspondiente
      if (contenedorCarrito.querySelectorAll(".cart-item").length === 0) {
        cargarCarrito();
      }
    }
  }
});

// ==========================================
// 4. VALIDACIÓN DE STOCK Y REDIRECCIÓN AL PAGO
// ==========================================
btnPago.addEventListener("click", async () => {
  const items = contenedorCarrito.querySelectorAll(".cart-item");
  let stockValido = true;

  if (items.length === 0) {
    alert("Tu carrito está vacío.");
    return;
  }

  // Verificación final del stock antes de avanzar
  items.forEach((item) => {
    const input = item.querySelector(".cantidad-input");
    const cantidadSeleccionada = parseInt(input.value);
    const stockMaximo = parseInt(input.getAttribute("data-stock"));
    const nombreProducto = item.querySelector(".item-info h2").textContent;

    if (cantidadSeleccionada > stockMaximo) {
      alert(
        `No puedes proceder. El producto "${nombreProducto}" supera el stock disponible (${stockMaximo}).`,
      );
      stockValido = false;
    }
  });

  if (!stockValido) return;

  // Si todo es válido, enviamos la información a pago.html usando localStorage
  // Es el método más limpio y seguro para transferir objetos/arreglos estructurados entre páginas HTML
  const {
    data: { user },
  } = await supabase_conexion.auth.getUser();

  const datosTransferencia = {
    id_usuario: user.id,
    envio: COSTO_ENVIO,
  };

  localStorage.setItem("orden_checkout", JSON.stringify(datosTransferencia));

  // Redirigimos a la ventana de pago
  window.location.href = "pago.html";
});

// Inicializamos el script al terminar de procesar el DOM
document.addEventListener("DOMContentLoaded", cargarCarrito);
