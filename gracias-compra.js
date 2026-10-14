// Inicializar EmailJS
emailjs.init("rIUDcgPWkN13PhkIk");

// Configuración oficial y limpia de Supabase para esta vista
const SUPABASE_URL = "https://ytqxpnuulmyktsxhpyod.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_uGAEEt8T2SCD09VtHmEeQQ_0nOXvJ1a";

// Instancia única del cliente de Supabase
const supabase_cliente = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

async function procesarPagoYMostrarTicket() {
  console.log("Procesando compra directamente desde Supabase...");
  let idTicket = null;
  let datosUsuarioCompra = null;

  try {
    // 1. Obtener el usuario autenticado actual desde Supabase Auth
    const { data: { user }, error: userError } = await supabase_cliente.auth.getUser();
    
    if (userError || !user) {
      console.error("No hay una sesión activa de Supabase:", userError);
      return;
    }

    console.log("Usuario autenticado:", user.email);

    // 2. Consultar directamente el ticket más reciente de este usuario en la base de datos
    const { data: ultimoTicket, error: ticketError } = await supabase_cliente
      .from("tickets")
      .select("id_ticket, total, fecha")
      .eq("id_usuario", user.id)
      .order("id_ticket", { ascending: false })
      .limit(1)
      .single();

    if (ticketError || !ultimoTicket) {
      console.error("No se encontró ningún ticket reciente para este usuario:", ticketError);
    } else {
      idTicket = ultimoTicket.id_ticket;
      console.log("Ticket más reciente obtenido de Supabase:", idTicket);

      // 3. Consultar los detalles de los productos de este ticket para armar el correo
      const { data: detallesTicket, error: detallesError } = await supabase_cliente
        .from("tickets_detalles")
        .select("cantidad, total, productos ( nombre, precio )")
        .eq("id_ticket", idTicket);

      if (!detallesError && detallesTicket) {
        datosUsuarioCompra = {
          emailUsuario: user.email,
          nombreCliente: user.user_metadata?.nombre || "Cliente TextilShop",
          productos: detallesTicket.map(d => ({
            nombre: d.productos?.nombre || "Artículo",
            cantidad: d.cantidad,
            precio: d.productos?.precio || 0
          })),
          totalFinal: ultimoTicket.total
        };
      }
    }
  } catch (err) {
    console.error("Error general consultando Supabase:", err);
  }

  // 4. PINTAR EL NÚMERO DE TICKET EN PANTALLA
  const textoTicket = document.getElementById("ticket-numero");
  if (textoTicket) {
    if (idTicket) {
      textoTicket.textContent = `#TK-${idTicket}`;
    } else {
      textoTicket.textContent = "#FALTA-TICKET";
    }
  }

  // 5. ENVIAR CORREO CON EMAILJS USANDO LOS DATOS OBTENIDOS DE SUPABASE
  if (datosUsuarioCompra && idTicket) {
    try {
      console.log("Enviando correo mediante EmailJS...");

      let resumenProductosTexto = datosUsuarioCompra.productos
        .map((p) => `- ${p.nombre} (Cantidad: ${p.cantidad}) - $${p.precio * p.cantidad} MXN`)
        .join("\n");

      const parametrosPlantilla = {
        to_email: datosUsuarioCompra.emailUsuario,
        to_name: datosUsuarioCompra.nombreCliente,
        ticket_id: idTicket,
        lista_articulos: resumenProductosTexto,
        costo_total: datosUsuarioCompra.totalFinal,
        direccion_envio: "Registrada en perfil",
      };

      await emailjs.send(
        "service_8w9z5hj",
        "template_7hg3qes",
        parametrosPlantilla,
        "rIUDcgPWkN13PhkIk"
      );

      console.log("¡Correo enviado exitosamente a través de EmailJS!");
    } catch (err) {
      console.error("Error al enviar el correo con EmailJS:", err);
    }
  }

  // 6. Configurar el botón del PDF
  const btnPdf = document.getElementById("btn-pdf");
  if (btnPdf) {
    if (!idTicket) {
      btnPdf.style.display = "none";
    } else {
      btnPdf.onclick = () => descargarComprobante(idTicket, btnPdf);
    }
  }
}

// ==========================================
// COMPROBANTE EN PDF (jsPDF + AutoTable)
// ==========================================
async function descargarComprobante(idTicket, boton) {
  const textoOriginal = boton.textContent;
  boton.disabled = true;
  boton.textContent = "Generando...";

  try {
    const { data: ticket, error } = await supabase_cliente
      .from("tickets")
      .select("id_ticket, total, tickets_detalles ( cantidad, total, productos ( nombre, precio ) )")
      .eq("id_ticket", idTicket)
      .single();

    if (error || !ticket) throw error || new Error("Ticket no encontrado");

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const moneda = (n) => `$${Number(n || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN`;

    doc.setFontSize(22);
    doc.text("TextilShop", 14, 20);
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text("Comprobante de compra", 14, 28);
    doc.text(`Pedido: #TK-${ticket.id_ticket}`, 14, 36);
    doc.text(`Fecha: ${new Date().toLocaleDateString("es-MX")}`, 14, 43);

    const filas = (ticket.tickets_detalles || []).map((d) => [
      d.productos ? d.productos.nombre : "Producto no disponible",
      d.cantidad,
      moneda(d.productos ? d.productos.precio : 0),
      moneda(d.total),
    ]);

    doc.autoTable({
      startY: 52,
      head: [["Producto", "Cant.", "Precio", "Subtotal"]],
      body: filas,
      headStyles: { fillColor: [34, 34, 34] },
      styles: { fontSize: 11 },
    });

    const y = doc.lastAutoTable.finalY + 12;
    doc.setTextColor(0);
    doc.setFontSize(14);
    doc.text(`Total: ${moneda(ticket.total)}`, 14, y);
    doc.setFontSize(10);
    doc.setTextColor(120);
    doc.text("Entrega estimada: 3 - 5 dias habiles. Gracias por tu compra.", 14, y + 12);

    doc.save(`comprobante-TK-${ticket.id_ticket}.pdf`);
  } catch (err) {
    console.error("Error al generar el PDF:", err);
    alert("No se pudo generar el comprobante. Intenta de nuevo.");
  } finally {
    boton.disabled = false;
    boton.textContent = textoOriginal;
  }
}

document.addEventListener("DOMContentLoaded", procesarPagoYMostrarTicket);