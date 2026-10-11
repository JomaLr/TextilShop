export class Chatbot {
  constructor() {
    this.ESTADOS = { INICIO: 0, PREGUNTAS: 1, FINAL: 2 };
    this.estadoActual = this.ESTADOS.INICIO;
  }

  iniciarChat() {
    if (this.estadoActual === this.ESTADOS.INICIO) {
      this.estadoActual = this.ESTADOS.PREGUNTAS;
      return "¡Bienvenido a TextilShop!, ¿En qué puedo ayudarte? :)";
    } else if (this.estadoActual === this.ESTADOS.FINAL) {
      this.estadoActual = this.ESTADOS.PREGUNTAS;
      return "Adios!!";
    }
    return null; // Si está en PREGUNTAS y no hay evento inicial, no retorna nada
  }

  procesarComando(orden) {
    if (!orden) return "Debes escribir algo. .b.";

    let ordenLower = orden.trim().toLowerCase();

    switch (this.estadoActual) {
      case this.ESTADOS.INICIO:
        this.estadoActual = this.ESTADOS.PREGUNTAS;
        return "Bienvenido!!";

      case this.ESTADOS.PREGUNTAS:
        if (/\b(hola|holis)\b/i.test(orden)) {
          return "Hola!! :)";
        } else if (["que", "que?", "qué", "qué?"].includes(ordenLower)) {
          return "Introduce de que gustas preguntarme. B)";
        } else if (
          /\b(experiencia|confiables?|confiable|seguro|segura|de fiar|cu[aá]nto tiempo|cu[aá]ntos a[nñ]os|a[nñ]os tienen|tiempo tiene)\b/i.test(
            orden,
          )
        ) {
          return "Contamos con más de 1.1 años en el mercado ofreciendo prendas de la máxima calidad y 100% garantizadas.";
        } else if (
          /\b(gracias|mucha?s? gracias|agradecido|agradecida|thx|thanks)\b/i.test(
            orden,
          )
        ) {
          return "Gracias a ti por confiar en nosotros!! :)";
        } else if (/\b(recoger|ir por|pasar por)\b/i.test(orden)) {
          return "Para recoger tu pedido en sucursal, por favor comunícate directamente con la paquetería correspondiente con tu número de guía.";
        } else if (
          /\b(donde|d[oó]nde|como|c[oó]mo|puedo|ver|consultar|seguir)\b.*\b(mis pedidos|mis compras|ver mis pedidos|ver mis compras|mi pedido|mi compra|mi env[ií]o)\b/i.test(
            orden,
          ) ||
          /\b(rastreo|rastrero|rastrear|seguir|seguimiento|sigo|estado|mis)\b.*\b(pedidos|pedido|paquete|compras?|env[ií]o|compra)?\b/i.test(
            orden,
          )
        ) {
          return 'Desde <a href="/login.html">Mi perfil</a> puedes consultar tus pedidos y ahí mismo puedes consultar el seguimiento de tu compra.';
        } else if (
          /\b(no (ha|ah )?llegado|no llego|no me llego|no ha llegado mi|no llego mi|atrasado|retrasado)\b/i.test(
            orden,
          )
        ) {
          return "Si tu paquete o pedido no ha llegado dentro del plazo estimado, escríbenos a <a href='/contacto.html'>Contacto</a> con tu número de guía para rastrearlo.";
        } else if (
          /\b(error|errores|problema|problemas|fallo|falla|no (se )?reconoce|cargo|deposito|depositar|d[oó]nde deposito)\b.*\b(pago|pagos|tarjeta|tarjetas|compra|comprar)?\b/i.test(
            orden,
          )
        ) {
          return "Para dudas con pagos, depósitos, errores en pago o cargos no reconocidos, por favor comunícate con nosotros a traves de <a href='/contacto.html'>Contacto</a>, con tu comprobante.";
        } else if (
          /\b(no (me )?deja|error|errores|problema|falla|no puedo)\b.*\b(comprar|hacer la compra|pagar|finalizar|procesar)\b/i.test(
            orden,
          )
        ) {
          return "Si tienes inconvenientes para finalizar tu compra, por favor comunícate con nosotros a traves de <a href='/contacto.html'>Contacto</a>, para ayudarte a procesarla.";
        } else if (
          /\b(precio|precios|costo|costos|cu[aá]nto cuesta|cu[aá]nto valen|cu[aá]nto sale|promedio|vale|valen)\b/i.test(
            orden,
          )
        ) {
          return "Puedes consultar los precios directamente al elegir cualquier prenda.";
        } else if (
          /\b(c[oó]mo compro|c[oó]mo comprar|comprar|compro|adquirir|pasos para comprar)\b/i.test(
            orden,
          )
        ) {
          return "Para comprar solo selecciona la prenda de tu preferencia, elige talla/color y agrégala al carrito para procesar tu pago.";
        } else if (
          /\b(marca|marcas|patrocinio|patrocinios|colaboraci[oó]n|colaboraciones|embajadores?)\b/i.test(
            orden,
          )
        ) {
          return "Manejamos marca propia y prendas de fabricación 100% nacional en TextilShop. Para patrocinios o colaboraciones contáctanos por <a href='/contacto.html'>Contacto</a>.";
        } else if (
          /\b(reembolso|reembolsos|reembolsar|devoluci[oó]n de dinero)\b/i.test(
            orden,
          )
        ) {
          return "Tienes los primeros 3 días después de haber recibido tu pedido para reembolsarlo comunicándote con nosotros a traves de <a href='/contacto.html'>Contacto</a>.";
        } else if (/\b(colores?|tonos?|tonalidades?|estilos?)\b/i.test(orden)) {
          return "Puedes personalizar cualquier prenda a tu gusto y ver los colores disponibles en sus detalles.";
        } else if (/\b(carrito|bolsa)\b/i.test(orden)) {
          return "Si no ves un producto en tu carrito, intenta recargar la página o verificar que hayas iniciado sesión.";
        } else if (
          /\b(suben|renuevan|resurtan|inventario|stock|nuevos?|cu[aá]ndo salen)\b/i.test(
            orden,
          )
        ) {
          return "Renovamos catálogo y stock de productos cada mes. <br>¡Mantente al pendiente de la sección de <a href='/tienda.html?categoria=Novedades'>Novedades</a> !";
        } else if (
          /\b(paqueter[ií]as?|flete|env[ií]an por|agencia)\b/i.test(orden)
        ) {
          return "Trabajamos con las principales paqueterías del país como FedEx, DHL y Estafeta.";
        } else if (
          /\b(p[aá]gina web|sitio web|link|url|tienda online|donde puedo ver el sitio)\b/i.test(
            orden,
          )
        ) {
          return "Te encuentras actualmente en nuestro sitio web oficial <a href='/index.html'>TextilShop</a> para realizar tus compras!!!";
        } else if (
          /\b(cu[aá]l es mi talla|gu[ií]a de tallas|saber mi talla|medidas)\b/i.test(
            orden,
          )
        ) {
          return "Puedes consultar nuestra guía de medidas dentro de cada producto.";
        } else if (
          /\b(pasaron|paso|despu[eé]s de|m[aá]s de)\b.*\b(15 d[ií]as|el tiempo|el plazo)\b/i.test(
            orden,
          )
        ) {
          return "Lamentablemente, una vez transcurridos los 15 días hábiles no es posible procesar devoluciones ni cambios.";
        } else if (/\b(garant[ií]a|garant[ií]as)\b/i.test(orden)) {
          return "Todos nuestros productos cuentan con garantía por defectos de fabricación de 6 meses.";
        } else if (
          /\b(pago|pagos|pagar|tarjeta|tarjetas|paypal|transferencia|transferencias|efectivo|oxxo)\b/i.test(
            orden,
          )
        ) {
          return "Aceptamos tarjetas de crédito, débito, PayPal y transferencias bancarias.";
        } else if (
          /\b(adi[oó]s|bye|chau|hasta luego|nos vemos)\b/i.test(orden)
        ) {
          this.estadoActual = this.ESTADOS.FINAL;
          return "Adiós!! Vuelve pronto.";
        } else if (
          /\b(env[ií]o|env[ií]os|entrega|entregas|cu[aá]ndo|tiempo|d[ií]as|tarda|tardar|demora|llegar|llega|paquete|pedido)\b/i.test(
            orden,
          )
        ) {
          return "Los pedidos suelen entregarse entre 3 y 7 días hábiles dependiendo de la ubicación del cliente.";
        } else if (
          /\b(devoluciones|devolver|devoluci[oó]n|regresar|cambiar|cambiarla|devolverlo)\b/i.test(
            orden,
          )
        ) {
          return "Puedes solicitar devoluciones dentro de los primeros 15 días después de recibir tu pedido, comunicate con nosotros a traves de <a href='/contacto.html'>Contacto</a>.";
        } else if (
          /\b(contacto|comunicarme|tel[eé]fono|n[uú]mero|correo|soporte|atenci[oó]n|horario|horarios)\b/i.test(
            orden,
          )
        ) {
          return "Nuestro número de contacto es +52 56 2185 8657 <br> Cualquier duda con gusto te ayudaremos a traves de <a href='/contacto.html'>Contacto</a>.";
        } else if (
          /\b(talla|tallas|tama[nñ]o|tama[nñ]os|chica|mediana|grande|extragrande|xxl)\b/i.test(
            orden,
          )
        ) {
          return "Pueden variar segun el producto, compruébalo en sus detalles.";
        } else if (
          /\b(ubicaci[oó]n|ubicados|sucursal|sucursales|tienda|tiendas|tienda f[ií]sica|donde estan|donde se ubican|donde los encuentro|encuentro|encuentran|direcci[oó]n)\b/i.test(
            orden,
          )
        ) {
          return "No contamos con una sucursal fisica, por el momento solo vendemos en nuestra pagina web.";
        } else if (
          /\b(moda|tendencia|tendencias|novedades|recomendaciones|recomi[eé]ndame|recomendaci[oó]n|invierno|verano|fr[ií]o|calor|oto[nñ]o|primavera)\b/i.test(
            orden,
          )
        ) {
          return "Te recomiendo visitar la sección de <a href='/tienda.html?categoria=Tendencias'>Tendencias</a> para conocer lo mas vendido de la temporada!";
        } else if (
          /\b(categor[ií]as?|secci[oó]n|secciones|ropa|recomi[eé]ndame|recomiendame|prendas?|pantal[oó]n|pantalones|camisa|camisas|blusa|blusas|vestido|vestidos|gorra|gorras|sudadera|sudaderas|productos?|cat[aá]logo)\b/i.test(
            orden,
          )
        ) {
          return "Contamos con todo tipo de ropa y prendas, puedes elegir a tu preferencia.";
        } else if (
          /\b(puto|pendejo|idiota|chupas|cabron|pinche|huevos|asshole|puñetas|chinga|chingas|puta|peendeja|pendejos|pendejas)\b/i.test(
            orden,
          )
        ) {
          return "Te pedimos mantener un lenguaje sano. :)";
        } else if (
          /\b(promoci[oó]n|promociones|ofertas?|descuentos?|liquidaci[oó]n|meses sin intereses)\b/i.test(
            orden,
          )
        ) {
          return "Al elegir una prenda se mostrará si cuenta con descuento, oferta, promoción o alguna otra facilidad de pago.";
        } else if (
          /\b(tela|telas|material|materiales|composici[oó]n|fabricado|hecho)\b/i.test(
            orden,
          )
        ) {
          return "Manejamos diferentes tipos de telas según la prenda que elijas.<br> Puedes consultarlo en los detalles del producto.";
        } else if (
          /\b(algod[oó]n|mezclilla|seda|poli[eé]ster|lino|lana|elastano|licra|lycra)\b/i.test(
            orden,
          )
        ) {
          return "Puedes consultar cualquier tipo de tela en los detalles del producto.";
        } else if (
          /\b(encoge|encoger|achica|achican|desti[nñ]e|despinta|rasga)\b/i.test(
            orden,
          )
        ) {
          return "Depende del material con el que esté hecho.";
        } else if (
          /\b(costo de env[ií]o|precio de env[ií]o|cu[aá]nto cuesta el env[ií]o|se cobra env[ií]o)\b/i.test(
            orden,
          )
        ) {
          return "El costo de envío se calcula al momento de ingresar tu dirección cuando vayas a comprar.";
        } else if (
          /\b(env[ií]o gratis|env[ií]os gratis|gratuito|sin costo)\b/i.test(
            orden,
          )
        ) {
          return "Ofrecemos envío gratis en compras mayores a $677 MXN.";
        } else if (
          /\b(c[oó]mo te llamas|cu[aá]l es tu nombre|qui[eé]n eres|tu nombre|damian)\b/i.test(
            orden,
          )
        ) {
          return "¡Hola! Soy DamianBOT, tu asistente virtual en TextilShop :))";
        } else if (
          /\b(c[oó]mo se llama la (empresa|tienda)|nombre de la (empresa|tienda)|marca|negocio)\b/i.test(
            orden,
          )
        ) {
          return "Nuestra empresa y tienda se llama TextilShop :))";
        } else if (
          /\b(mayoreo|mayorista|menudeo|minorista|al por mayor|al por menor|compras grandes)\b/i.test(
            orden,
          )
        ) {
          return "Vendemos al menudeo directamente en nuestra página web <br> Y manejamos precios de mayoreo a partir de 20 prendas comunicándote con nosotros a traves de <a href='/contacto.html'>Contacto</a>.";
        } else if (
          /\b(nacionales|nacional|internacional|internacionales|fuera del pa[ií]s|otro pa[ií]s|extranjero)\b/i.test(
            orden,
          )
        ) {
          return "Por el momento solo realizamos envíos a toda la República Mexicana.";
        } else if (
          /\b(importada|importado|origen|d[oó]nde se fabrica|hecha en|hecho en|de d[oó]nde es|de d[oó]nde viene)\b/i.test(
            orden,
          )
        ) {
          return "Todas nuestras prendas son 100% de diseño y fabricación nacional con estándares de alta calidad.";
        } else if (
          /\b(d[oó]lar|d[oó]lares|moneda|monedas|tipo de cambio|pesos|mxn|usd)\b/i.test(
            orden,
          )
        ) {
          return "Por el momento solo aceptamos pagos en Pesos Mexicanos (MXN).";
        } else if (
          /\b(como)\b.*\b(estas|va)\b/i.test(orden) ||
          /\b(que).*\b(tal)/i.test(orden)
        ) {
          return "Chill bro, chill. :B";
        } else if (/^\s*(no|nop|nope)\s*$/i.test(orden)) {
          return ".-.";
        } else if (/\b(perdon|siento|disculpa|que bien)\b/i.test(orden)) {
          return "Don´t Worry Be Happy. U-U";
        } else if (/\b(quien|que)\b.*\b(eres|haces)\b/i.test(orden)) {
          return "Soy un chatbot.<br>Estoy aqui para ayudarte en cualquier problema o duda que tengas al navegar por nuestra tienda!<br>Un gusto :)";
        } else if (/\b(donde)\b.*\b(estoy|estamos)\b/i.test(orden)) {
          return "Estamos en la TextilShop!<br>Tienda online de ropa a los mejores precios!";
        } else if (/\b(me)\b.*\b(llamo)\b/i.test(orden)) {
          return "Un gusto conocerte, ¿En qué te puedo ayudar?!";
        } else if (
          /\b(problema|error|situaci[oó]n|queja|duda|falla|no puedo|ayuda|ay[uú]dame|ay[uú]denme)\b/i.test(
            orden,
          )
        ) {
          return "Cualquier duda, problema o error, comunícate con nosotros a traves de <a href='/contacto.html'>Contacto</a>.";
        } else {
          return "Disculpa pero no he entendido tu pregunta, ¿Puedes escribir tu problema de manera mas general? :)";
        }

      case this.ESTADOS.FINAL:
        this.estadoActual = this.ESTADOS.PREGUNTAS; // Reinicia el ciclo
        return "¿En qué más te puedo ayudar?";
    }
  }
}
