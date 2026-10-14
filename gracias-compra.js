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
// 1. PROCESAMIENTO POST-PAGO Y ENVÍO DE CORREO
// ==========================================
async function procesarPagoYMostrarTicket() {
  const parametrosURL = new URLSearchParams(window.location.search);
  let idTicket = parametrosURL.get("compra");
  
  const ordenRaw = localStorage.getItem("orden_pendiente_textil");

  // Si hay una orden pendiente en localStorage, procedemos a registrarla en Supabase
  if (ordenRaw) {
    const orden = JSON.parse(ordenRaw);

    try {
      // 1. Crear el ticket en Supabase
      const { data: ticketCreado, error: errorTicket } = await supabase_sesion
        .from("tickets")
        .insert([{ id_usuario: orden.idUsuario, total: orden.totalFinal }])
        .select()
        .single();

      if (errorTicket || !ticketCreado) {
        throw new Error("Fallo al generar el ticket de compra.");
      }

      idTicket = ticketCreado.id_ticket;

      // 2. Registrar los detalles del ticket y descontar stock del inventario
      for (const prod of orden.productos) {
        const costoTotalArticulo = prod.precio * prod.cantidad;

        await supabase_sesion.from("tickets_detalles").insert([
          {
            id_ticket: idTicket,
            id_producto: prod.id_producto,
            cantidad: prod.cantidad,
            total: costoTotalArticulo,
          },
        ]);

        const { data: inventarioActual } = await supabase_sesion
          .from("inventarios")
          .select("stock")
          .eq("id_producto", prod.id_producto)
          .single();

        const stockActual = inventarioActual ? inventarioActual.stock : 0;
        const nuevoStockCalculado = Math.max(0, stockActual - prod.cantidad);

        await supabase_sesion
          .from("inventarios")
          .update({ stock: nuevoStockCalculado })
          .eq("id_producto", prod.id_producto);
      }

      // 3. Limpiar carrito si no era compra directa
      if (!orden.esCompraDirecta) {
        await supabase_sesion
          .from("carritos")
          .delete()
          .eq("id_usuario", orden.idUsuario);
      }

      // 4. Enviar correo por EmailJS
      let resumenProductosTexto = orden.productos
        .map(
          (p) => `- ${p.nombre} (Cantidad: ${p.cantidad}) - $${p.precio * p.cantidad} MXN`
        )
        .join("\n");

      const parametrosPlantilla = {
        to_email: orden.emailUsuario,
        to_name: orden.nombreCliente,
        ticket_id: idTicket,
        lista_articulos: resumenProductosTexto,
        costo_total: orden.totalFinal,
        direccion_envio: orden.direccionCliente,
      };

      await emailjs.send(
        "service_8w9z5hj",
        "template_7hg3qes",
        parametrosPlantilla,
        "rIUDcgPWkN13PhkIk"
      );

      console.log("¡Compra procesada y correo enviado exitosamente!");

      // 5. Eliminar la orden temporal del almacenamiento local
      localStorage.removeItem("orden_pendiente_textil");

    } catch (err) {
      console.error("Error al registrar la compra post-pago:", err);
    }
  }

  // PINTAR EL NÚMERO DE TICKET EN PANTALLA
  const textoTicket = document.getElementById("ticket-numero");
  if (textoTicket) {
    if (idTicket) {
      textoTicket.textContent = `#TK-${idTicket}`;
    } else {
      textoTicket.textContent = "#FALTA-TICKET";
    }
  }

  // Prevenir que el usuario regrese a la pantalla de pago presionando "Atrás"
  history.pushState(null, null, window.location.href);
  window.addEventListener("popstate", () => {
    window.location.href = "index.html";
  });

  // Configurar listener para el botón de PDF
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
// 2. COMPROBANTE EN PDF (jsPDF + AutoTable)
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
    if (typeof alerta === "function") {
      await alerta("No se pudo generar el comprobante. Intenta de nuevo.", "error");
    } else {
      alert("No se pudo generar el comprobante. Intenta de nuevo.");
    }
  } finally {
    boton.disabled = false;
    boton.textContent = textoOriginal;
  }
}

document.addEventListener("DOMContentLoaded", procesarPagoYMostrarTicket);