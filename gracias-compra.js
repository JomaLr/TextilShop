// Inicializar EmailJS
emailjs.init("rIUDcgPWkN13PhkIk");

// Configuración de Supabase
const SUPABASE_URL = "https://ytqxpnuulmyktsxhpyod.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_uGAEEt8T2SCD09VtHmEeQQ_0nOXvJ1a";

const supabase_sesion = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

// ==========================================
// PROCESAMIENTO POST-PAGO Y MOSTRAR TICKET
// ==========================================
async function procesarPagoYMostrarTicket() {
  let idTicket = null;

  try {
    // 1. Obtener el usuario autenticado actual
    const { data: { user }, error: userError } = await supabase_sesion.auth.getUser();
    
    if (userError || !user) {
      console.error("No hay usuario autenticado al volver de la compra.");
    } else {
      // 2. Buscar automáticamente el ticket más reciente generado por este usuario en Supabase
      const { data: ultimoTicket, error: ticketError } = await supabase_sesion
        .from("tickets")
        .select("id_ticket, total")
        .eq("id_usuario", user.id)
        .order("id_ticket", { ascending: false })
        .limit(1)
        .single();

      if (!ticketError && ultimoTicket) {
        idTicket = ultimoTicket.id_ticket;
      }
    }
  } catch (err) {
    console.error("Error al buscar el ticket reciente:", err);
  }

  // 3. PINTAR EL NÚMERO DE TICKET EN PANTALLA
  const textoTicket = document.getElementById("ticket-numero");
  if (textoTicket) {
    if (idTicket) {
      textoTicket.textContent = `#TK-${idTicket}`;
    } else {
      textoTicket.textContent = "#FALTA-TICKET";
    }
  }

  // 4. Enviar el correo electrónico mediante EmailJS si tenemos los datos temporales en el localStorage
  const ordenRaw = localStorage.getItem("datos_correo_textil");
  if (ordenRaw && idTicket) {
    try {
      const datos = JSON.parse(ordenRaw);

      let resumenProductosTexto = datos.productos
        .map(
          (p) => `- ${p.nombre} (Cantidad: ${p.cantidad}) - $${p.precio * p.cantidad} MXN`
        )
        .join("\n");

      const parametrosPlantilla = {
        to_email: datos.emailUsuario,
        to_name: datos.nombreCliente,
        ticket_id: idTicket,
        lista_articulos: resumenProductosTexto,
        costo_total: datos.totalFinal,
        direccion_envio: datos.direccionCliente,
      };

      await emailjs.send(
        "service_8w9z5hj",
        "template_7hg3qes",
        parametrosPlantilla,
        "rIUDcgPWkN13PhkIk"
      );

      console.log("¡Correo enviado exitosamente por EmailJS!");
      localStorage.removeItem("datos_correo_textil"); // Limpiamos para no reenviar el correo
    } catch (err) {
      console.error("Error al enviar el correo con EmailJS:", err);
    }
  }

  // Prevenir que el usuario regrese a la pantalla de pago presionando "Atrás"
  history.pushState(null, null, window.location.href);
  window.addEventListener("popstate", () => {
    window.location.href = "index.html";
  });

  // 5. Configurar listener para el botón de PDF
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
    const { data: ticket, error } = await supabase_sesion
      .from("tickets")
      .select(
        "id_ticket, total, tickets_detalles ( cantidad, total, productos ( nombre, precio ) )"
      )
      .eq("id_ticket", idTicket)
      .single();

    if (error || !ticket) throw error || new Error("Ticket no encontrado");

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const moneda = (n) =>
      `$${Number(n || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN`;

    // Encabezado
    doc.setFontSize(22);
    doc.text("TextilShop", 14, 20);
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text("Comprobante de compra", 14, 28);
    doc.text(`Pedido: #TK-${ticket.id_ticket}`, 14, 36);
    doc.text(`Fecha: ${new Date().toLocaleDateString("es-MX")}`, 14, 43);

    // Tabla de productos
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

    // Total
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