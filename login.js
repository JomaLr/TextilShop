// Configura la conexión a Supabase
const SUPABASE_URL = "https://ytqxpnuulmyktsxhpyod.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_uGAEEt8T2SCD09VtHmEeQQ_0nOXvJ1a";

// Inicializamos el cliente de Supabase
const supabase_conexion = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
);

// Verifica si ya existe una sesión iniciada para redirigir al perfil
async function verificarSesion() {
  const { data } = await supabase_conexion.auth.getSession();

  if (data && data.session !== null) {
    window.location.href = "perfil.html";
  }
}

// Ejecutamos la función apenas cargue la pantalla
verificarSesion();

// Capturamos el formulario desde el HTML
const formulario = document.getElementById("formulario_login");

formulario.addEventListener("submit", async (evento) => {
  evento.preventDefault();

  const email = document.getElementById("email").value.trim();
  const contrasena = document.getElementById("password").value;

  if (email === "" || contrasena === "") {
    await alerta("Por favor, rellena todos los campos.");
    return;
  }

  // Desactivamos temporalmente el botón para evitar dobles clics accidentales
  const botonSubmit = formulario.querySelector("button");
  if (botonSubmit) botonSubmit.disabled = true;

  try {
    // 1. VERIFICAR SI LA CUENTA ESTÁ BLOQUEADA EN LA BASE DE DATOS
    const { data: estadoBloqueo, error: errorVerif } =
      await supabase_conexion.rpc("verificar_bloqueo_usuario", {
        p_correo: email,
      });

    if (errorVerif) {
      console.error("Error verificando bloqueo:", errorVerif);
      await alerta("Ocurrió un error al validar el acceso. Intenta de nuevo.");
      return;
    }

    if (estadoBloqueo && estadoBloqueo.bloqueado) {
      const fechaDesbloqueo = new Date(estadoBloqueo.hasta);
      const minutosRestantes = Math.max(
        1,
        Math.ceil((fechaDesbloqueo - new Date()) / 60000),
      );

      await alerta(
        `Cuenta bloqueada temporalmente por seguridad. Intenta de nuevo en ${minutosRestantes} minuto(s).`,
      );
      return;
    }

    // 2. INTENTAR INICIAR SESIÓN EN SUPABASE AUTH
    const { data, error } = await supabase_conexion.auth.signInWithPassword({
      email: email,
      password: contrasena,
    });

    // 3. SI FALLÓ EL INICIO DE SESIÓN
    if (error) {
      const { data: resultadoFallo } = await supabase_conexion.rpc(
        "gestionar_intento_login",
        { p_correo: email, p_exito: false },
      );

      if (resultadoFallo && resultadoFallo.bloqueado_ahora) {
        await alerta(
          `Has excedido el límite de intentos. Tu cuenta fue bloqueada por ${resultadoFallo.minutos} minutos.`,
        );
      } else if (
        resultadoFallo &&
        resultadoFallo.intentos_restantes !== undefined
      ) {
        await alerta(`Correo o contraseña incorrectos.`);
      } else {
        await alerta("Correo o contraseña incorrectos.");
      }
      return;
    }

    // 4. SI EL INICIO DE SESIÓN FUE EXITOSO: LIMPIAMOS EL CONTADOR
    await supabase_conexion.rpc("gestionar_intento_login", {
      p_correo: email,
      p_exito: true,
    });

    await alerta("¡Sesión iniciada!");
    window.location.href = "perfil.html";
  } catch (err) {
    console.error("Error inesperado en login:", err);
    await alerta("Ocurrió un error inesperado al iniciar sesión.");
  } finally {
    // Volvemos a habilitar el botón pase lo que pase
    if (botonSubmit) botonSubmit.disabled = false;
  }
});
