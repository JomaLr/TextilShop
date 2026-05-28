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
