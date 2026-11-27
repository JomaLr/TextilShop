const SUPABASE_URL = "https://ytqxpnuulmyktsxhpyod.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_uGAEEt8T2SCD09VtHmEeQQ_0nOXvJ1a";

const supabase_conexion = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
);

async function verificarSesion() {
  const { data } = await supabase_conexion.auth.getSession();

  if (data && data.session !== null) {
    window.location.href = "perfil.html";
  }
}

verificarSesion();

const formulario = document.getElementById("formulario_login");
const formularioCodigo = document.getElementById("formulario_codigo");
const tituloLogin = document.getElementById("titulo_login");
const botonReenviar = document.getElementById("reenviar_codigo");
const botonCancelar = document.getElementById("cancelar_codigo");

let correoActual = "";

function obtenerTokenCaptcha() {
  return document.querySelector('[name="cf-turnstile-response"]')?.value || "";
}

function reiniciarCaptcha() {
  if (typeof turnstile !== "undefined") {
    turnstile.reset();
  }
}

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
  reiniciarCaptcha();
}

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

async function enviarCodigo(correo, captchaToken) {
  const { error } = await supabase_conexion.auth.signInWithOtp({
    email: correo,
    options: {
      shouldCreateUser: false,
      captchaToken: captchaToken,
    },
  });

  if (error) {
    console.error("Error al enviar el código:", error);
    await alerta("No se pudo enviar el código: " + error.message, "error");
    return false;
  }
  return true;
}

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

formulario.addEventListener("submit", async (evento) => {
  evento.preventDefault();

  const email = document.getElementById("email").value.trim();
  const contrasena = document.getElementById("password").value;
  const captchaToken = obtenerTokenCaptcha();

  if (email === "" || contrasena === "") {
    await alerta("Por favor, rellena todos los campos.");
    return;
  }

  if (!captchaToken) {
    await alerta("Por favor, completa la verificación de seguridad.");
    return;
  }

  const botonSubmit = formulario.querySelector("button");
  if (botonSubmit) botonSubmit.disabled = true;

  try {
    if (await estaBloqueado(email)) {
      reiniciarCaptcha();
      return;
    }

    const { error } = await supabase_conexion.auth.signInWithPassword({
      email: email,
      password: contrasena,
      options: {
        captchaToken: captchaToken,
      },
    });

    if (error) {
      reiniciarCaptcha();

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

    await supabase_conexion.auth.signOut({ scope: "local" });

    reiniciarCaptcha();

    await new Promise((resolve) => {
      const esperarNuevoToken = setInterval(() => {
        if (obtenerTokenCaptcha()) {
          clearInterval(esperarNuevoToken);
          resolve();
        }
      }, 200);
    });

    const segundoToken = obtenerTokenCaptcha();
    correoActual = email;
    const enviado = await enviarCodigo(email, segundoToken);

    if (!enviado) {
      reiniciarCaptcha();
      return;
    }

    mostrarPasoCodigo();
    iniciarEsperaReenvio();
  } catch (err) {
    reiniciarCaptcha();
    console.error("Error inesperado en login:", err);
    await alerta("Ocurrió un error inesperado al iniciar sesión.");
  } finally {
    if (botonSubmit) botonSubmit.disabled = false;
  }
});

formularioCodigo.addEventListener("submit", async (evento) => {
  evento.preventDefault();

  const codigo = document
    .getElementById("codigo_correo")
    .value.replace(/\D/g, "");

  if (!/^\d{6,8}$/.test(codigo)) {
    await alerta("El código debe ser de 6 a 8 dígitos.");
    return;
  }

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

  await supabase_conexion.rpc("gestionar_intento_login", {
    p_correo: correoActual,
    p_exito: true,
  });

  await alerta("¡Sesión iniciada!");
  window.location.href = "perfil.html";
});

botonReenviar.addEventListener("click", async () => {
  reiniciarCaptcha();

  await new Promise((resolve) => {
    const esperarToken = setInterval(() => {
      if (obtenerTokenCaptcha()) {
        clearInterval(esperarToken);
        resolve();
      }
    }, 200);
  });

  const enviado = await enviarCodigo(correoActual, obtenerTokenCaptcha());

  if (enviado) {
    await alerta("Te enviamos un nuevo código.", "success");
    iniciarEsperaReenvio();
  }
});

botonCancelar.addEventListener("click", () => {
  mostrarPasoLogin();
});
