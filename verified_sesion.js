// Configuramos la conexión con credenciales a Supabase
const BASE_URL = "https://ytqxpnuulmyktsxhpyod.supabase.co";
const BASE_ANON_KEY = "sb_publishable_uGAEEt8T2SCD09VtHmEeQQ_0nOXvJ1a";

const supabase_sesion = supabase.createClient(BASE_URL, BASE_ANON_KEY);

// ===================================================
// SESSION TIMEOUT (CIERRE AUTOMÁTICO POR INACTIVIDAD)
// ===================================================
const TIEMPO_MAXIMO_INACTIVIDAD = 10 * 60 * 1000; // 10 minutos en milisegundos
let temporizadorInactividad;

function iniciarVigilanteInactividad() {
  // Función que cierra la sesión cuando se acaba el tiempo
  const cerrarSesionPorInactividad = async () => {
    await supabase_sesion.auth.signOut();

    if (typeof alerta === "function") {
      await alerta("Tu sesión se cerró automáticamente por inactividad.");
    } else {
      alert("Tu sesión se cerró automáticamente por inactividad.");
    }

    window.location.href = "login.html";
  };

  // Reinicia el reloj cada vez que hay interacción
  const reiniciarTemporizador = () => {
    clearTimeout(temporizadorInactividad);
    temporizadorInactividad = setTimeout(
      cerrarSesionPorInactividad,
      TIEMPO_MAXIMO_INACTIVIDAD,
    );
  };

  // Escucha movimiento de mouse, clics, teclado, scroll o toques en pantalla móvil
  const eventosActividad = [
    "mousemove",
    "mousedown",
    "keydown",
    "scroll",
    "touchstart",
  ];
  eventosActividad.forEach((evento) => {
    document.addEventListener(evento, reiniciarTemporizador, { passive: true });
  });

  // Inicia el conteo por primera vez
  reiniciarTemporizador();
}

// Esta función se ejecuta AUTOMÁTICAMENTE en cuanto carga la página
async function verificarSesion() {
  const { data, error } = await supabase_sesion.auth.getSession();

  if (data && data.session !== null) {
    console.log("Usuario autenticado correctamente:", data.session.user.email);
    // Encendemos el vigilante solo cuando confirmamos que hay sesión activa
    iniciarVigilanteInactividad();
  } else {
    window.location.href = "login.html";
  }
}

// Ejecutamos la función apenas cargue la pantalla
verificarSesion();
