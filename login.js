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

// Capturamos los formularios desde el HTML
const formulario = document.getElementById("formulario_login");
const formularioCodigo = document.getElementById("formulario_codigo");
const tituloLogin = document.getElementById("titulo_login");
const botonReenviar = document.getElementById("reenviar_codigo");
const botonCancelar = document.getElementById("cancelar_codigo");

// Correo al que se le mandó el código
let correoActual = "";

// Muestra el formulario donde se escribe el código
function mostrarPasoCodigo() {
  formulario.hidden = true;
  formularioCodigo.hidden = false;
  tituloLogin.innerText = "Verifica tu correo";
  document.getElementById("texto_codigo").innerText =
    "Te enviamos un código de verificación a " + correoActual + ".";
  document.getElementById("password").value = "";
  document.getElementById("codigo_correo").value = "";
  document.getElementById("codigo_correo").focus();
}

function mostrarPasoLogin() {
  formularioCodigo.hidden = true;
  formulario.hidden = false;
  tituloLogin.innerText = "Iniciar Sesión";
}

// Pregunta a la base de datos si la cuenta está bloqueada.
// Si lo está (o si hubo un error) avisa al usuario y regresa true
async function estaBloqueado(correo) {
  const { data: estadoBloqueo, error: errorVerif } =
    await supabase_conexion.rpc("verificar_bloqueo_usuario", {
      p_correo: correo,
    });

  if (errorVerif) {
    console.error("Error verificando bloqueo:", errorVerif);
    await alerta("Ocurrió un error al validar el acceso. Intenta de nuevo.");
    return true;
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
    return true;
  }

  return false;
}

// Suma un intento fallido (contraseña o código). Regresa true si la cuenta quedó bloqueada
async function registrarFallo(correo, mensaje) {
  const { data: resultadoFallo } = await supabase_conexion.rpc(
    "gestionar_intento_login",
    { p_correo: correo, p_exito: false },
  );

  if (resultadoFallo && resultadoFallo.bloqueado_ahora) {
    await alerta(
      `Has excedido el límite de intentos. Tu cuenta fue bloqueada por ${resultadoFallo.minutos} minutos.`,
    );
    return true;
  }

  await alerta(mensaje);
  return false;
}

// Manda el código al correo. Regresa true si se envió bien
async function enviarCodigo(correo) {
  const { error } = await supabase_conexion.auth.signInWithOtp({
    email: correo,
    options: { shouldCreateUser: false }, // solo usuarios que ya existen
  });

  if (error) {
    console.error("Error al enviar el código:", error);
    await alerta("No se pudo enviar el código: " + error.message, "error");
    return false;
  }
  return true;
}

// Evita que el botón de reenviar se use seguido (60 segundos)
function iniciarEsperaReenvio() {
  let segundos = 60;
  botonReenviar.disabled = true;

  const intervalo = setInterval(() => {
    segundos--;
    if (segundos <= 0) {
      clearInterval(intervalo);
      botonReenviar.disabled = false;
      botonReenviar.innerText = "Reenviar código";
    } else {
      botonReenviar.innerText = "Reenviar código (" + segundos + ")";
    }
  }, 1000);
}

// PASO 1: correo y contraseña
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
    // 1. Verificar si la cuenta está bloqueada
    if (await estaBloqueado(email)) {
      return;
    }

    // 2. Comprobar que la contraseña sea correcta
    const { error } = await supabase_conexion.auth.signInWithPassword({
      email: email,
      password: contrasena,
    });

    // 3. Si falló el inicio de sesión
    if (error) {
      if (error.code === "email_not_confirmed") {
        await alerta(
          "Tu correo todavía no está verificado. Vuelve a registrarte con el mismo correo para recibir un nuevo código.",
          "warning",
        );
        return;
      }

      await registrarFallo(email, "Correo o contraseña incorrectos.");
      return;
    }

    // 4. La contraseña es correcta: cerramos esa sesión y mandamos el código al correo
    await supabase_conexion.auth.signOut({ scope: "local" });

    correoActual = email;
    const enviado = await enviarCodigo(email);

    if (!enviado) {
      return;
    }

    mostrarPasoCodigo();
    iniciarEsperaReenvio();
  } catch (err) {
    console.error("Error inesperado en login:", err);
    await alerta("Ocurrió un error inesperado al iniciar sesión.");
  } finally {
    // Volvemos a habilitar el botón pase lo que pase
    if (botonSubmit) botonSubmit.disabled = false;
  }
});

// PASO 2: código que llegó al correo
formularioCodigo.addEventListener("submit", async (evento) => {
  evento.preventDefault();

  const codigo = document.getElementById("codigo_correo").value.replace(/\D/g, "");

  if (!/^\d{6,8}$/.test(codigo)) {
    await alerta("El código debe ser de 6 a 8 dígitos.");
    return;
  }

  // El código también cuenta para el bloqueo, si no se podría adivinar probando
  if (await estaBloqueado(correoActual)) {
    mostrarPasoLogin();
    return;
  }

  const { error } = await supabase_conexion.auth.verifyOtp({
    email: correoActual,
    token: codigo,
    type: "email",
  });

  if (error) {
    console.error("Error al verificar el código:", error);
    const bloqueado = await registrarFallo(
      correoActual,
      "Código incorrecto o vencido. (" + error.message + ")",
    );

    if (bloqueado) {
      mostrarPasoLogin();
    }
    return;
  }

  // Todo salió bien: limpiamos el contador de intentos
  await supabase_conexion.rpc("gestionar_intento_login", {
    p_correo: correoActual,
    p_exito: true,
  });

  await alerta("¡Sesión iniciada!");
  window.location.href = "perfil.html";
});

botonReenviar.addEventListener("click", async () => {
  const enviado = await enviarCodigo(correoActual);

  if (enviado) {
    await alerta("Te enviamos un nuevo código.", "success");
    iniciarEsperaReenvio();
  }
});

botonCancelar.addEventListener("click", () => {
  mostrarPasoLogin();
});
