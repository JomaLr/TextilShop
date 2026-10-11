document.addEventListener("DOMContentLoaded", () => {
  //EXTRAER EL ID DEL TICKET DESDE LA URL Y PINTARLO
  const parametrosURL = new URLSearchParams(window.location.search);
  const idTicket = parametrosURL.get("compra"); // Recuerda que mandamos ?compra=id_ticket

  const textoTicket = document.getElementById("ticket-numero");

  if (idTicket) {
    // Le damos formato estético pa que se vea bonito
    textoTicket.textContent = `#TK-${idTicket}`;
  } else {
    // Por si el usuario entró directo a la URL escribiendo a mano sin comprar
    textoTicket.textContent = "#FALTA-TICKET";
  }

  // Inyectamos un estado falso en el historial del navegador inmediatamente
  history.pushState(null, null, window.location.href);

  window.addEventListener("popstate", () => {
    // En cuanto detectamos que quiere regresar, lo mandamos al index de la tienda
    window.location.href = "index.html";
  });
});

// ==========================================
// COMPROBANTE EN PDF (jsPDF + AutoTable)
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
  const btnPdf = document.getElementById("btn-pdf");
  const idTicket = new URLSearchParams(window.location.search).get("compra");
  if (!btnPdf) return;
  if (!idTicket) {
    btnPdf.style.display = "none"; // sin ticket no hay comprobante
    return;
  }
  btnPdf.addEventListener("click", () => descargarComprobante(idTicket, btnPdf));
});

async function descargarComprobante(idTicket, boton) {
  const textoOriginal = boton.textContent;
  boton.disabled = true;
  boton.textContent = "Generando...";

  try {
    // Traemos el ticket con su desglose (RLS limita a los tickets del usuario)
    const { data: ticket, error } = await supabase_sesion
      .from("tickets")
      .select(
        "id_ticket, total, tickets_detalles ( cantidad, total, productos ( nombre, precio ) )",
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
    await alerta("No se pudo generar el comprobante. Intenta de nuevo.", "error");
  } finally {
    boton.disabled = false;
    boton.textContent = textoOriginal;
  }
}
