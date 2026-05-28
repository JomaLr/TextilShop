//Configuramos la conexión con credenciales a Supabase
const BASE_URL = "https://ytqxpnuulmyktsxhpyod.supabase.co";
const BASE_ANON_KEY = "sb_publishable_uGAEEt8T2SCD09VtHmEeQQ_0nOXvJ1a";

const supabase_sesion = supabase.createClient(BASE_URL, BASE_ANON_KEY);

// Esta función se ejecuta AUTOMÁTICAMENTE en cuanto carga la página
async function verificarSesion() {
  // Guachamos si hay un token guardado (O sea si hay una sesión)
  const { data, error } = await supabase_sesion.auth.getSession();

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
