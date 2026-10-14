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
    //No hay sesión entonces nos quedamos en el Login
    document.getElementById("logearse").innerText = `Iniciar sesión`;
  }
}

// Ejecutamos la función apenas cargue la pantalla
verificarSesion();

async function cargarCat() {
  try {
    //Traemos todos los categorias de Supabase
    const { data: categorias, error } = await supabase_conexion
      .from("categorias")
      .select("*");

    if (error) {
      console.error("Error al traer categorias:", error);
      return;
    }

    //Apuntamos al contenedor vacío de nuestro HTML
    const contenedor = document.getElementById("contenedor-categorias");

    // Limpiamos el contenedor por si acaso tenía algo antes
    contenedor.innerHTML = "";

    //RECORREMOS las categorias (toda la tabla)
    categorias.forEach((categorias, i) => {
      // Creamos la estructura HTML de la tarjeta inyectando los datos de la DB
      const tarjetaHTML = `
          <a href="tienda.html?categoria=${categorias.nombre_categoria}" data-aos="zoom-in" data-aos-delay="${(i % 4) * 100}">
            <div class="category-card">
                <img src="${categorias.imagen}" alt="Categoria ${categorias.nombre_categoria}">
                <h3>${categorias.nombre_categoria}</h3>
            </div>
          </a>
      `;
      // Insertamos esta nueva tarjeta adentro del contenedor principal
      contenedor.innerHTML += tarjetaHTML;
    });
    // Las tarjetas se crean dinámicamente: recalculamos posiciones de AOS
    if (window.AOS) AOS.refresh();
  } catch (err) {
    console.error("Error inesperado:", err);
  }
}

// Mandamos a llamar a la función cuando se cargue la página
cargarCat();

async function cargarproductos() {
  try {
    //Traemos todos los productos de Supabase
    const { data: productos, error } = await supabase_conexion
      .from("productos")
      .select("*");

    if (error) {
      console.error("Error al traer productos:", error);
      return;
    }

    //Apuntamos al contenedor vacío de nuestro HTML
    const panel = document.getElementById("contenedor-producto");

    // Limpiamos el contenedor por si acaso tenía algo antes
    panel.innerHTML = "";

    //RECORREMOS LOS productos
    productos.forEach((productos) => {
      // Creamos la estructura HTML de la tarjeta inyectando los datos de la DB
      const panelHTML = `
            <div class="swiper-slide">
            <div class="product-card">
                <img src="${productos.imagen}" alt="Producto ${productos.nombre}">
                <h3>${productos.nombre}</h3>
                <p>$ ${productos.precio}</p>
                <a href="detalle-producto.html?producto=${productos.nombre}">
                  <button>Ver producto</button>
                </a>
                </div>
            </div>
      `;
      // Insertamos esta nueva tarjeta adentro del contenedor principal
      panel.innerHTML += panelHTML;
    });

    // SWIPER: convertimos las tarjetas en un carrusel
    if (typeof Swiper === "undefined") {
      console.error("Swiper no se cargó: revisa la conexión al CDN");
      return;
    }
    new Swiper(".productos-swiper", {
      slidesPerView: "auto",
      spaceBetween: 24,
      centeredSlides: productos.length < 3,
      grabCursor: true,
      keyboard: { enabled: true },
      autoplay: { delay: 4000, disableOnInteraction: true, pauseOnMouseEnter: true },
      pagination: {
        el: ".productos-swiper .swiper-pagination",
        clickable: true,
        dynamicBullets: true,
      },
      navigation: {
        nextEl: ".productos-swiper .swiper-button-next",
        prevEl: ".productos-swiper .swiper-button-prev",
      },
    });
  } catch (err) {
    console.error("Error inesperado:", err);
  }
}

// Mandamos a llamar a la función cuando se cargue la página
cargarproductos();

// AOS: animaciones al hacer scroll
if (window.AOS) AOS.init({ duration: 800, once: true, offset: 80 });
