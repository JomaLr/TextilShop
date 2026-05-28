//Configura la conexión con credenciales a Supabase
const SUPABASE_URL = "https://ytqxpnuulmyktsxhpyod.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_uGAEEt8T2SCD09VtHmEeQQ_0nOXvJ1a";
//Establecemos la conexión
const supabase_conexion = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
);

document.addEventListener("DOMContentLoaded", async () => {
  const {
    data: { user },
    error: authError,
  } = await supabase_conexion.auth.getUser();

  try {
    // Vamos a la tabla usuarios a buscar el nombre usando el ID único (UUID)
    const { data: perfilUsuario, error: tablaError } = await supabase_conexion
      .from("usuarios") // FROM usuarios
      .select("nombre,correo,direccion,telefono,rol") // SELECT nombre
      .eq("id_usuario", user.id) // WHERE id_usuario = el id asociado a la sesion
      .single(); // Le decimos que solo nos devuelva una fila no la tabla por si hay mas de uno con el mismo nombre

    if (tablaError) {
      //Si ocurre un error
      console.error("Error al traer el nombre:", tablaError);
      document.getElementById("username").innerText =
        "Error al buscar tu usuario!!";
      return;
    }

    //Agregamos el resultado de la consulta en el html
    if (perfilUsuario) {
      document.getElementById("username").innerText = `${perfilUsuario.nombre}`;
      document.getElementById("email_user").innerText =
        `${perfilUsuario.correo}`;
      document.getElementById("direccion_user").innerText =
        perfilUsuario.direccion || "No registrada";
      document.getElementById("telefono_user").innerText =
        perfilUsuario.telefono || "No registrado";
      if (perfilUsuario.rol === "usuario") {
        const soyadmin = document.getElementById("admin_panel");
        soyadmin.remove();
      } else {
        document.getElementById("admin_panel").innerText =
          "Panel de Administración";
      }
    }
  } catch (err) {
    console.error("Error inesperado:", err);
  }
});

const modal = document.getElementById("formModal");
const openBtn = document.getElementById("info_update");
const closeBtn = document.getElementById("closeModalBtn");

openBtn.addEventListener("click", () => {
  modal.showModal();
});

// Cerrar el modal con el botón Cancelar
closeBtn.addEventListener("click", () => {
  modal.close();
});

// Opcional: Procesar los datos al enviar
modal.querySelector("form").addEventListener("submit", async (e) => {
  const formData = new FormData(e.target);

  const telefono_prueba = formData.get("mi_telefono");
  if (telefono_prueba.length < 10 && telefono_prueba.length > 12) {
    alert("El numero de telefono debe ser de minimo 10 y maximo 12 digitos.");
    return;
  }

  const {
    data: { user },
    error,
  } = await supabase_conexion.auth.getUser();

  // Insertar datos adicionales en nuestra tabla 'usuarios'
  const { data, tablaError } = await supabase_conexion
    .from("usuarios") // Nombre de la tabla
    .update({
      direccion: formData.get("mi_direccion"),
      telefono: formData.get("mi_telefono"),
    })
    .eq("id_usuario", user.id) // WHERE usuario es igual al id
    .select();

  //Verificamos el resultado final de la tabla
  if (tablaError) {
    console.error("Error en el INSERT:", tablaError);
    alert("Error al enviar la informacion: " + tablaError.message);
  } else {
    console.log("mi_direccion:", formData.get("mi_direccion"));
    console.log("Telefono:", formData.get("mi_telefono"));
    alert("¡Actualizacion de tu informacion realizada con éxito!");
    window.location.href = "perfil.html";
  }
});

// Inicializamos el módulo al cargar la página
document.addEventListener("DOMContentLoaded", cargarHistorialPedidos);

async function cargarHistorialPedidos() {
  try {
    // 1. Obtener la sesión del usuario logueado actualmente
    const {
      data: { user },
      error: errorUser,
    } = await supabase_conexion.auth.getUser();

    if (errorUser || !user) {
      console.error("Usuario no autenticado.");
      document.getElementById("contenedor-pedidos").innerHTML =
        "<p>Debes iniciar sesión para ver tus compras.</p>";
      return;
    }

    const idUsuario = user.id;

    // 2. Consulta avanzada con JOINs triples:
    // Traemos los 'tickets', sus renglones desglosados en 'tickets_detalles' y la info del 'producto'
    const { data: tickets, error: errorTickets } = await supabase_conexion
      .from("tickets")
      .select(
        `
        id_ticket,
        total,
        tickets_detalles (
          cantidad,
          total,
          productos (
            nombre,
            precio,
            imagen
          )
        )
      `,
      )
      .eq("id_usuario", idUsuario)
      .order("id_ticket", { ascending: false }); // Tus pedidos más recientes saldrán primero

    if (errorTickets) {
      console.error("Error al consultar el historial:", errorTickets);
      return;
    }

    const contenedor = document.getElementById("contenedor-pedidos");
    contenedor.innerHTML = ""; // Limpiamos las tarjetas de ejemplo del HTML

    if (!tickets || tickets.length === 0) {
      contenedor.innerHTML =
        '<p class="no-orders">Aún no has realizado ninguna compra!</p><br> <a href="index.html">Navega por la tienda!</a><br>';
      return;
    }

    // 3. Renderizado iterativo de los Tickets
    tickets.forEach((ticket) => {
      // Creamos la cabecera de la tarjeta del pedido
      let ticketHTML = `
        <div class="order-card">
          <div class="order-top">
            <div>
              <h3>Pedido #TK-${ticket.id_ticket}</h3>
              <p style="margin: 4px 0 0 0; color: #666; font-size: 0.9rem;">Monto total facturado: <strong>$${ticket.total} MXN</strong></p>
            </div>
            <span class="status preparing">Preparando</span>
          </div>

          <div class="order-products">
      `;

      // Iteramos sobre los detalles (productos individuales de este ticket específico)
      ticket.tickets_detalles.forEach((detalle) => {
        const prod = detalle.productos;

        // Manejo de seguridad en caso de que un producto de respaldo ya no exista en la DB
        const nombreProd = prod ? prod.nombre : "Producto no disponible";
        const imagenProd = prod
          ? prod.imagen
          : "https://via.placeholder.com/150";
        const precioProd = prod ? prod.precio : 0;

        ticketHTML += `
            <div class="product-item">
              <img src="${imagenProd}" alt="${nombreProd}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 4px;" />
              <div>
                <h4>${nombreProd}</h4>
                <p>$${precioProd} MXN (Cant: ${detalle.cantidad})</p>
              </div>
            </div>
        `;
      });

      // Cerramos los contenedores de la tarjeta actual
      ticketHTML += `
          </div>
        </div>
      `;

      // Inyectamos la tarjeta completa estructurada al DOM
      contenedor.innerHTML += ticketHTML;
    });
  } catch (err) {
    console.error("Error inesperado al cargar el perfil de compras:", err);
  }
}

// DESTRUCCION de la sesion
const boton_logout = document.getElementById("logout");

if (boton_logout) {
  boton_logout.addEventListener("click", async (evento) => {
    //Borramos la sesion del localStorage y avisamos a Supabase que cierre el acceso
    evento.preventDefault();

    const { error } = await supabase_conexion.auth.signOut();

    if (!error) {
      alert("¡Sesión cerrada! Vuelve pronto.");
      //Lo mandamos al login ya sin sesion
      localStorage.clear();
      window.location.href = "index.html";
    } else {
      alert(
        "Hubo un error al cerrar sesión: aaaaaaaaaaaaaaaaaaaaa " +
          error.message,
      );
    }
  });
}
