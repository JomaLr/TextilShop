const SUPABASE_URL = "https://ytqxpnuulmyktsxhpyod.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_uGAEEt8T2SCD09VtHmEeQQ_0nOXvJ1a";

const EMAILJS_PUBLIC_KEY = "FYVrm5vBncwSTQqhT";
const EMAILJS_SERVICE_ID = "service_t5enkpp";
const EMAILJS_TEMPLATE_ID = "template_pzm1sht";

// Inicializamos EmailJS de inmediato
emailjs.init(EMAILJS_PUBLIC_KEY);

// Establecemos la conexión con Supabase
const supabase_conexion = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
);

// ===================================================
// FLUJO PRINCIPAL AL CARGAR EL DASHBOARD
// ===================================================
document.addEventListener("DOMContentLoaded", async () => {
  const {
    data: { user },
    error: authError,
  } = await supabase_conexion.auth.getUser();

  if (authError || !user) return;

  try {
    // Buscamos el perfil y rol del usuario logueado
    const { data: perfilUsuario, error: tablaError } = await supabase_conexion
      .from("usuarios")
      .select("nombre,correo,rol")
      .eq("id_usuario", user.id)
      .single();

    if (tablaError) {
      console.error("Error al traer el nombre:", tablaError);
      document.getElementById("username").innerText =
        "Error al buscar tu usuario!!";
      return;
    }

    if (perfilUsuario) {
      document.getElementById("username").innerText = `${perfilUsuario.nombre}`;
      document.getElementById("email_user").innerText =
        `${perfilUsuario.correo}`;

      // 1. Si no es administrador, lo expulsamos al perfil
      if (perfilUsuario.rol === "usuario") {
        window.location.href = "perfil.html";
        return;
      }

      // 2. Si es admin, detenemos la carga hasta que valide el código por correo
      const verificado = await verificarCodigoCorreoAdmin(perfilUsuario.correo);
      if (verificado) {
        await inicializarDashboardAdmin();
      }
    }
  } catch (err) {
    console.error("Error inesperado:", err);
  }
});

// Función segura: usa tu alerta personalizada si está cargada en el HTML, o alert() nativo si no
async function mostrarAviso(mensaje) {
  if (typeof alerta === "function") {
    await alerta(mensaje);
  } else {
    alert(mensaje);
  }
}

// ===================================================
// VERIFICACIÓN POR CORREO AL ENTRAR AL DASHBOARD
// ===================================================
async function verificarCodigoCorreoAdmin(correoAdmin) {
  // Si ya verificó el código en esta pestaña, lo dejamos pasar directo
  if (sessionStorage.getItem("admin_2fa_ok") === "true") {
    return true;
  }

  const modal2FA = document.getElementById("modal-2fa-admin");
  const inputCodigo = document.getElementById("input-codigo-2fa");
  const btnValidar = document.getElementById("btn-validar-2fa");
  const btnReenviar = document.getElementById("btn-reenviar-2fa");
  document.getElementById("correo-destino-2fa").innerText = correoAdmin;

  // Evitamos que el usuario cierre el modal presionando la tecla ESC
  modal2FA.addEventListener("cancel", (e) => e.preventDefault());

  // Función interna para generar y mandar el código de 6 dígitos
  const generarYEnviarCodigo = async () => {
    const codigoGenerado = Math.floor(
      100000 + Math.random() * 900000,
    ).toString();
    const expiracion = Date.now() + 5 * 60 * 1000; // Válido por 5 minutos

    sessionStorage.setItem("admin_codigo_temp", codigoGenerado);
    sessionStorage.setItem("admin_codigo_exp", expiracion.toString());

    try {
      await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
        to_email: correoAdmin,
        codigo_verificacion: codigoGenerado,
      });
      console.log("Código de seguridad enviado al correo.");
    } catch (error) {
      console.error("Error enviando código con EmailJS:", error);
      await mostrarAviso(
        "No se pudo enviar el código de verificación a tu correo.",
      );
    }
  };

  // Abrimos el modal bloqueando el fondo y mandamos el primer código
  modal2FA.showModal();
  await generarYEnviarCodigo();

  // Botón para reenviar si no llegó
  btnReenviar.onclick = async (e) => {
    e.preventDefault();
    btnReenviar.style.pointerEvents = "none";
    await generarYEnviarCodigo();
    await mostrarAviso("Se ha enviado un nuevo código a tu correo.");
    setTimeout(() => (btnReenviar.style.pointerEvents = "auto"), 30000);
  };

  // Promesa que detiene la carga de datos del dashboard hasta que acierte el código
  return new Promise((resolve) => {
    btnValidar.onclick = async () => {
      const codigoIngresado = inputCodigo.value.trim();
      const codigoGuardado = sessionStorage.getItem("admin_codigo_temp");
      const tiempoExp = parseInt(
        sessionStorage.getItem("admin_codigo_exp") || "0",
      );

      if (Date.now() > tiempoExp) {
        await mostrarAviso(
          "El código ha expirado. Haz clic en 'Reenviar código'.",
        );
        return;
      }

      if (codigoIngresado === codigoGuardado) {
        sessionStorage.removeItem("admin_codigo_temp");
        sessionStorage.removeItem("admin_codigo_exp");
        sessionStorage.setItem("admin_2fa_ok", "true");

        modal2FA.close();
        resolve(true); // Luz verde para cargar las gráficas y ventas
      } else {
        await mostrarAviso("Código incorrecto. Revisa tu bandeja de entrada.");
        inputCodigo.value = "";
      }
    };
  });
}

// ===================================================
// CARGA DE DATOS Y MÉTRICAS DEL DASHBOARD (RESTAURADA)
// ===================================================
async function inicializarDashboardAdmin() {
  try {
    const [respuestaTickets, respuestaUsuarios, respuestaDetalles] =
      await Promise.all([
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

        supabase_conexion
          .from("usuarios")
          .select("id_usuario", { count: "exact", head: true }),

        supabase_conexion.from("tickets_detalles").select("cantidad"),
      ]);

    if (respuestaTickets.error) throw respuestaTickets.error;
    if (respuestaUsuarios.error) throw respuestaUsuarios.error;
    if (respuestaDetalles.error) throw respuestaDetalles.error;

    const tickets = respuestaTickets.data || [];
    const conteoUsuarios = respuestaUsuarios.count || 0;
    const detallesVentas = respuestaDetalles.data || [];

    // 1. CÁLCULO DE MÉTRICAS / INDICADORES SUPERIORES
    const totalPedidos = tickets.length;
    const ingresosTotales = tickets.reduce(
      (acumulado, t) => acumulado + (t.total || 0),
      0,
    );
    const totalProductosVendidos = detallesVentas.reduce(
      (acumulado, d) => acumulado + (d.cantidad || 0),
      0,
    );

    document.getElementById("total-productos-vendidos").textContent =
      totalProductosVendidos;
    document.getElementById("total-usuarios-registrados").textContent =
      conteoUsuarios;
    document.getElementById("total-ingresos").textContent =
      `$${ingresosTotales.toLocaleString("es-MX")} MXN`;
    document.getElementById("total-pedidos").textContent = totalPedidos;

    // 1.1 GRÁFICAS (Chart.js)
    dibujarGraficas(tickets);

    // 2. RENDERIZACIÓN DE LA TABLA DE ÚLTIMAS VENTAS
    const tbody = document.getElementById("tabla-ultimas-ventas");
    tbody.innerHTML = "";

    if (tickets.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 20px; color: #888;">Aún no se registran transacciones en la plataforma.</td></tr>`;
      return;
    }

    tickets.forEach((ticket) => {
      const nombreCliente = ticket.usuarios
        ? ticket.usuarios.nombre
        : "Cliente Invitado / Desconocido";

      let productosTexto = "Sin especificar";
      if (ticket.tickets_detalles && ticket.tickets_detalles.length > 0) {
        productosTexto = ticket.tickets_detalles
          .map((d) =>
            d.productos ? d.productos.nombre : "Producto no disponible",
          )
          .join(", ");
      }

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
  const ultimos = tickets.slice(0, 10).reverse();
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
