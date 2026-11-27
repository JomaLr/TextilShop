emailjs.init("DtO8R05qzqNnn9J7I");

const SUPABASE_URL = "https://ytqxpnuulmyktsxhpyod.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_uGAEEt8T2SCD09VtHmEeQQ_0nOXvJ1a";

const supabase_conexion = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
);

const formRegistro = document.getElementById("formulario_registro");
const formularioCodigo = document.getElementById("formulario_codigo");
const tituloRegistro = document.getElementById("titulo_registro");
const botonReenviar = document.getElementById("reenviar_codigo");
const botonCancelar = document.getElementById("cancelar_codigo");

let nombreActual = "";
let correoActual = "";
let tipoCodigo = "signup";
let esperaCaptcha = null;
let intervaloCaptcha = null;
let intervaloReenvio = null;

function obtenerTokenCaptcha() {
  return (
    document.querySelector('[name="cf-turnstile-response"]')?.value || ""
  );
}

function reiniciarCaptcha() {
  if (typeof turnstile !== "undefined") {
    turnstile.reset();
  }
}

function esperarTokenCaptcha() {
  const token = obtenerTokenCaptcha();

  if (token) {
    return Promise.resolve(token);
  }

  return new Promise((resolve) => {
    if (esperaCaptcha) {
      clearTimeout(esperaCaptcha);
    }

    if (intervaloCaptcha) {
      clearInterval(intervaloCaptcha);
    }

    intervaloCaptcha = setInterval(() => {
      const nuevoToken = obtenerTokenCaptcha();

      if (nuevoToken) {
        clearInterval(intervaloCaptcha);
        clearTimeout(esperaCaptcha);
        intervaloCaptcha = null;
        esperaCaptcha = null;
        resolve(nuevoToken);
      }
    }, 200);

    esperaCaptcha = setTimeout(() => {
      if (intervaloCaptcha) {
        clearInterval(intervaloCaptcha);
      }

      intervaloCaptcha = null;
      esperaCaptcha = null;
      resolve("");
    }, 120000);
  });
}

function mostrarPasoCodigo() {
  formRegistro.hidden = true;
  formularioCodigo.hidden = false;
  tituloRegistro.innerText = "Verifica tu correo";

  document.getElementById("texto_codigo").innerText =
    "Te enviamos un código de verificación a " + correoActual + ".";

  document.getElementById("codigo_correo").value = "";
  document.getElementById("codigo_correo").focus();
}

function mostrarPasoRegistro() {
  formularioCodigo.hidden = true;
  formRegistro.hidden = false;
  tituloRegistro.innerText = "Crear Cuenta";
  reiniciarCaptcha();
}

function iniciarEsperaReenvio() {
  let segundos = 60;

  if (intervaloReenvio) {
    clearInterval(intervaloReenvio);
  }

  botonReenviar.disabled = true;

  botonReenviar.innerText = "Reenviar código (" + segundos + ")";

  intervaloReenvio = setInterval(() => {
    segundos--;

    if (segundos <= 0) {
      clearInterval(intervaloReenvio);
      intervaloReenvio = null;
      botonReenviar.disabled = false;
      botonReenviar.innerText = "Reenviar código";
    } else {
      botonReenviar.innerText = "Reenviar código (" + segundos + ")";
    }
  }, 1000);
}

async function guardarPerfilYTerminar(uuidUsuario) {
  const { error: tablaError } = await supabase_conexion
    .from("usuarios")
    .insert([
      {
        id_usuario: uuidUsuario,
        nombre: nombreActual,
        correo: correoActual,
      },
    ]);

  if (tablaError) {
    console.error("Error en tabla pública:", tablaError);

    await alerta(
      "Se crearon las credenciales, pero hubo un error al guardar tu perfil: " +
        tablaError.message,
      "error",
    );

    return;
  }

  await alerta("¡Cuenta creada con éxito!");

  const parametros = {
    email: correoActual,
  };

  try {
    await emailjs.send("service_zokka9i", "template_afohaks", parametros);

    formRegistro.reset();
    window.location.href = "perfil.html";
  } catch (error) {
    console.error("Error al enviar el correo de bienvenida:", error);

    await alerta(
      "Tu cuenta se creó correctamente, pero no se pudo enviar el correo de bienvenida.",
      "warning",
    );

    window.location.href = "perfil.html";
  }
}

formRegistro.addEventListener("submit", async (evento) => {
  evento.preventDefault();

  const nombreInput = document.getElementById("user").value.trim();
  const correoInput = document.getElementById("email").value.trim();
  const passInput = document.getElementById("password").value;

  if (nombreInput === "" || correoInput === "" || passInput === "") {
    await alerta(
      "Todos los campos son obligatorios y no pueden estar vacíos!",
    );
    return;
  }

  if (passInput.length < 6) {
    await alerta(
      "La contraseña es demasiado corta. Debe tener al menos 6 caracteres.",
    );
    return;
  }

  const captchaToken = obtenerTokenCaptcha();

  if (!captchaToken) {
    await alerta("Por favor, completa la verificación de seguridad.", "warning");
    return;
  }

  const botonRegistro = formRegistro.querySelector('button[type="submit"]');

  if (botonRegistro) {
    botonRegistro.disabled = true;
  }

  try {
    const { data: authData, error: authError } =
      await supabase_conexion.auth.signUp({
        email: correoInput,
        password: passInput,
        options: {
          captchaToken: captchaToken,
        },
      });

    if (authError) {
      console.error("Error en Auth:", authError);

      reiniciarCaptcha();

      await alerta(
        "Error al crear las credenciales: " + authError.message,
        "error",
      );

      return;
    }

    if (
      authData.user &&
      authData.user.identities &&
      authData.user.identities.length === 0
    ) {
      reiniciarCaptcha();

      await alerta(
        "Este correo ya está registrado. Inicia sesión.",
        "warning",
      );

      return;
    }

    nombreActual = nombreInput;
    correoActual = correoInput;

    tipoCodigo = "signup";

    if (authData.session) {
      await supabase_conexion.auth.signOut({ scope: "local" });

      tipoCodigo = "email";

      reiniciarCaptcha();

      const segundoToken = await esperarTokenCaptcha();

      if (!segundoToken) {
        await alerta(
          "Completa nuevamente la verificación de seguridad para enviar el código.",
          "warning",
        );

        return;
      }

      const { error: errorEnvio } =
        await supabase_conexion.auth.signInWithOtp({
          email: correoInput,
          options: {
            shouldCreateUser: false,
            captchaToken: segundoToken,
          },
        });

      if (errorEnvio) {
        console.error("Error al enviar el código:", errorEnvio);

        reiniciarCaptcha();

        await alerta(
          "No se pudo enviar el código: " + errorEnvio.message,
          "error",
        );

        return;
      }
    }

    mostrarPasoCodigo();
    iniciarEsperaReenvio();
  } catch (error) {
    console.error("Error inesperado en el registro:", error);

    reiniciarCaptcha();

    await alerta("Ocurrió un error inesperado al crear tu cuenta.", "error");
  } finally {
    if (botonRegistro) {
      botonRegistro.disabled = false;
    }
  }
});

formularioCodigo.addEventListener("submit", async (evento) => {
  evento.preventDefault();

  const codigo = document
    .getElementById("codigo_correo")
    .value.replace(/\D/g, "");

  if (!/^\d{6,8}$/.test(codigo)) {
    await alerta("El código debe ser de 6 a 8 dígitos.", "warning");
    return;
  }

  const botonVerificar = formularioCodigo.querySelector(
    'button[type="submit"]',
  );

  if (botonVerificar) {
    botonVerificar.disabled = true;
  }

  try {
    const { data, error } = await supabase_conexion.auth.verifyOtp({
      email: correoActual,
      token: codigo,
      type: tipoCodigo,
    });

    if (error) {
      console.error("Error al verificar el código:", error);

      await alerta(
        "Código incorrecto o vencido. (" + error.message + ")",
        "error",
      );

      return;
    }

    if (!data.user) {
      await alerta("No se pudo verificar la cuenta.", "error");
      return;
    }

    await guardarPerfilYTerminar(data.user.id);
  } catch (error) {
    console.error("Error inesperado al verificar:", error);

    await alerta("Ocurrió un error al verificar el código.", "error");
  } finally {
    if (botonVerificar) {
      botonVerificar.disabled = false;
    }
  }
});

botonReenviar.addEventListener("click", async () => {
  botonReenviar.disabled = true;

  try {
    reiniciarCaptcha();

    const captchaToken = await esperarTokenCaptcha();

    if (!captchaToken) {
      await alerta(
        "Completa la verificación de seguridad para reenviar el código.",
        "warning",
      );

      return;
    }

    let error = null;

    if (tipoCodigo === "signup") {
      const respuesta = await supabase_conexion.auth.resend({
        type: "signup",
        email: correoActual,
        options: {
          captchaToken: captchaToken,
        },
      });

      error = respuesta.error;
    } else {
      const respuesta = await supabase_conexion.auth.signInWithOtp({
        email: correoActual,
        options: {
          shouldCreateUser: false,
          captchaToken: captchaToken,
        },
      });

      error = respuesta.error;
    }

    if (error) {
      console.error("Error al reenviar el código:", error);

      reiniciarCaptcha();

      await alerta(
        "No se pudo reenviar el código: " + error.message,
        "error",
      );

      return;
    }

    await alerta("Te enviamos un nuevo código.", "success");

    iniciarEsperaReenvio();
  } catch (error) {
    console.error("Error inesperado al reenviar:", error);

    reiniciarCaptcha();

    await alerta("Ocurrió un error al reenviar el código.", "error");
  } finally {
    botonReenviar.disabled = false;
  }
});

botonCancelar.addEventListener("click", () => {
  mostrarPasoRegistro();
});
