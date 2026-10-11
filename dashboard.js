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
      .select("nombre,correo,rol") // SELECT nombre
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
      if (perfilUsuario.rol === "usuario") {
        window.location.href = "perfil.html";
      } else {
        console.log("Hola Admin!");
      }
    }
  } catch (err) {
    console.error("Error inesperado:", err);
  }
});

document.addEventListener("DOMContentLoaded", inicializarDashboardAdmin);

async function inicializarDashboardAdmin() {
  try {
    // Lanzamos las consultas esenciales en paralelo para optimizar la velocidad del panel
    const [respuestaTickets, respuestaUsuarios, respuestaDetalles] =
      await Promise.all([
        // A. Consultamos todos los tickets ordenados del más nuevo al más viejo
        supabase_conexion
          .from("tickets")
          .select(
            `
          id_ticket,
          total,
          usuarios (
            nombre
          ),
          tickets_detalles (
            cantidad,
            productos (
              nombre
            )
          )
        `,
          )
          .order("id_ticket", { ascending: false }),

        // B. Consultamos únicamente para saber cuántos usuarios existen registrados
        supabase_conexion
          .from("usuarios")
          .select("id_usuario", { count: "exact", head: true }),

        // C. Consultamos todos los renglones de detalles para calcular el total exacto de prendas vendidas
        supabase_conexion.from("tickets_detalles").select("cantidad"),
      ]);

    // Validación de errores individuales en las respuestas de Supabase
    if (respuestaTickets.error) throw respuestaTickets.error;
    if (respuestaUsuarios.error) throw respuestaUsuarios.error;
    if (respuestaDetalles.error) throw respuestaDetalles.error;

    const tickets = respuestaTickets.data || [];
    const conteoUsuarios = respuestaUsuarios.count || 0;
    const detallesVentas = respuestaDetalles.data || [];

    // ===================================================
    // 1. CÁLCULO DE MÉTRICAS / INDICADORES SUPERIORES
    // ===================================================

    // Tarjeta: Pedidos Totales
    const totalPedidos = tickets.length;

    // Tarjeta: Ingresos Totales (Sumamos el valor 'total' de cada ticket)
    const ingresosTotales = tickets.reduce(
      (acumulado, t) => acumulado + (t.total || 0),
      0,
    );

    // Tarjeta: Productos Vendidos (Sumamos las cantidades de cada renglón de detalle)
    const totalProductosVendidos = detallesVentas.reduce(
      (acumulado, d) => acumulado + (d.cantidad || 0),
      0,
    );

    // Inyectamos los cálculos reales en el DOM de las tarjetas
    document.getElementById("total-productos-vendidos").textContent =
      totalProductosVendidos;
    document.getElementById("total-usuarios-registrados").textContent =
      conteoUsuarios;
    document.getElementById("total-ingresos").textContent =
      `$${ingresosTotales.toLocaleString("es-MX")} MXN`;
    document.getElementById("total-pedidos").textContent = totalPedidos;

    // ===================================================
    // 1.1 GRÁFICAS (Chart.js)
    // ===================================================
    dibujarGraficas(tickets);

    // ===================================================
    // 2. RENDERIZACIÓN DE LA TABLA DE ÚLTIMAS VENTAS
    // ===================================================
    const tbody = document.getElementById("tabla-ultimas-ventas");
    tbody.innerHTML = ""; // Limpiamos los tr estáticos del HTML

    if (tickets.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 20px; color: #888;">Aún no se registran transacciones en la plataforma.</td></tr>`;
      return;
    }

    // Iteramos sobre cada ticket para construir las filas correspondientes
    tickets.forEach((ticket) => {
      // Control de seguridad si el usuario fue eliminado o no completó su perfil
      const nombreCliente = ticket.usuarios
        ? ticket.usuarios.nombre
        : "Cliente Invitado / Desconocido";

      // Para los productos, un pedido puede tener varios. Los unificamos separados por comas.
      let productosTexto = "Sin especificar";
      if (ticket.tickets_detalles && ticket.tickets_detalles.length > 0) {
        productosTexto = ticket.tickets_detalles
          .map((d) =>
            d.productos ? d.productos.nombre : "Producto no disponible",
          )
          .join(", ");
      }

      // Creamos la fila HTML aplicando tu estilo representativo fijo ("Preparando")
      const filaHTML = `
        <tr>
          <td>#TK-${ticket.id_ticket}</td>
          <td><strong>${nombreCliente}</strong></td>
          <td style="max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${productosTexto}">
            ${productosTexto}
          </td>
          <td>$${ticket.total}</td>
          <td>
            <span class="status preparing">Preparando</span>
          </td>
        </tr>
      `;
      tbody.innerHTML += filaHTML;
    });
  } catch (err) {
    console.error(
      "Error crítico al renderizar el Dashboard de Administración:",
      err,
    );
  }
}


// ===================================================
// GRÁFICAS CON CHART.JS
// ===================================================
let graficaIngresos = null;
let graficaProductos = null;

function dibujarGraficas(tickets) {
  if (typeof Chart === "undefined" || tickets.length === 0) return;

  const colorTexto = getComputedStyle(document.body).color || "#222";
  Chart.defaults.font.family = "Poppins, sans-serif";
  Chart.defaults.color = colorTexto;

  // --- Gráfica 1: ingresos de los últimos 10 pedidos (línea) ---
  const ultimos = tickets.slice(0, 10).reverse(); // de más viejo a más nuevo
  if (graficaIngresos) graficaIngresos.destroy();
  graficaIngresos = new Chart(document.getElementById("grafica-ingresos"), {
    type: "line",
    data: {
      labels: ultimos.map((t) => `#TK-${t.id_ticket}`),
      datasets: [
        {
          label: "Total (MXN)",
          data: ultimos.map((t) => t.total || 0),
          borderColor: "#c59d5f",
          backgroundColor: "rgba(197, 157, 95, 0.2)",
          fill: true,
          tension: 0.3,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true } },
    },
  });

  // --- Gráfica 2: top 5 productos por unidades vendidas (dona) ---
  const ventasPorProducto = {};
  tickets.forEach((t) => {
    (t.tickets_detalles || []).forEach((d) => {
      const nombre = d.productos ? d.productos.nombre : "No disponible";
      ventasPorProducto[nombre] =
        (ventasPorProducto[nombre] || 0) + (d.cantidad || 0);
    });
  });
  const top = Object.entries(ventasPorProducto)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  if (graficaProductos) graficaProductos.destroy();
  graficaProductos = new Chart(document.getElementById("grafica-productos"), {
    type: "doughnut",
    data: {
      labels: top.map(([nombre]) => nombre),
      datasets: [
        {
          data: top.map(([, cantidad]) => cantidad),
          backgroundColor: ["#222", "#c59d5f", "#8a6d3b", "#6b7280", "#d9c7a3"],
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: "bottom" } },
    },
  });
}
