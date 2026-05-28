//Configura la conexión a Supabase
const SUPABASE_URL = "https://ytqxpnuulmyktsxhpyod.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_uGAEEt8T2SCD09VtHmEeQQ_0nOXvJ1a";

// Inicializamos el cliente de Supabase
const supabase_conexion = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
);

// Esta función se ejecuta AUTOMÁTICAMENTE en cuanto carga la página, es para verificar si no existe ya una sesión iniciada y si ya inicio sesión lo "botamos" del login
async function verificarSesion() {
  //Supabase checa si hay un token guardado válido en el localStorage
  const { data, error } = await supabase_conexion.auth.getSession();

  //Evaluamos si ya hay  una sesión activa
  if (data && data.session !== null) {
    // El usuario tiene la sesión abierta.
    console.log("Usuario autenticado correctamente:", data.session.user.email);
    window.location.href = "perfil.html";
  } else {
    //No hay sesión entonces nos quedamos en el Login
    console.log("No hay sesión iniciada. ");
  }
}

// Ejecutamos la función apenas cargue la pantalla
verificarSesion();

// Capturamos el formulario desde el HTML
const formulario = document.getElementById("formulario_login");

formulario.addEventListener("submit", async (evento) => {
  //Evitamos que la página se recargue automáticamente por el submit
  evento.preventDefault();

  //Validación
  const email = document.getElementById("email").value;
  const contrasena = document.getElementById("password").value;
  //Imprimo los valore por cuestiones de pruebas
  console.log(document.getElementById("email").value);
  console.log(document.getElementById("password").value);

  if (email === "" || contrasena === "") {
    alert("Por favor, rellena todos los campos.");
    return;
  }

  // Iniciamos sesión de forma segura
  const { data, error } = await supabase_conexion.auth.signInWithPassword({
    email: email,
    password: contrasena,
  });

  if (error) {
    alert("Correo o contraseña incorrectos");
  } else {
    alert("¡Sesión iniciada!");
    // Supabase ya guardó el token en el localStorage.
    // Ya podemos mandarlo al dashboard
    window.location.href = "perfil.html";
  }
});
