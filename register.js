//Iniciamos la parte para enviar el correo al registrase
emailjs.init("DtO8R05qzqNnn9J7I");

//Configura la conexión con credenciales a Supabase
const SUPABASE_URL = "https://ytqxpnuulmyktsxhpyod.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_uGAEEt8T2SCD09VtHmEeQQ_0nOXvJ1a";

//Establecemos la conexión
const supabase_conexion = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
);

// Capturamos los formularios desde el HTML
const formRegistro = document.getElementById("formulario_registro");
const formularioCodigo = document.getElementById("formulario_codigo");
const tituloRegistro = document.getElementById("titulo_registro");
const botonReenviar = document.getElementById("reenviar_codigo");
const botonCancelar = document.getElementById("cancelar_codigo");

// Datos del registro que guardamos mientras espera el código
let nombreActual = "";
let correoActual = "";
// "signup" si Supabase confirma el correo, "email" si hubo que mandar el código por otro lado
let tipoCodigo = "signup";

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

// Se ejecuta cuando el correo ya fue verificado y el usuario ya tiene sesión
async function guardarPerfilYTerminar(uuidUsuario) {
  // Insertar datos adicionales en nuestra tabla 'usuarios'
  const { error: tablaError } = await supabase_conexion
    .from("usuarios")
    .insert([
      {
        id_usuario: uuidUsuario,
        nombre: nombreActual,
        correo: correoActual,
      },
    ]);

  //Verificamos el resultado final de la tabla
  if (tablaError) {
    console.error("Error en tabla pública:", tablaError);
    await alerta(
      "Se crearon las credenciales, pero hubo un error al guardar tu perfil: " +
        tablaError.message,
    );
  } else {
    await alerta("¡Cuenta creada con éxito!");

    const parametros = {
      email: correoActual, //campo "To Email" {{email}}
    };

    // Funcion para enviar el correo
    emailjs.send("service_zokka9i", "template_afohaks", parametros).then(
      function (response) {
        console.log("¡Correo de bienvenida enviado con éxito!");
        formRegistro.reset(); // Limpiamos los campos del formulario
        window.location.href = "perfil.html";
      },
      async function (error) {
        console.error("Error: ", error);
        await alerta("Error: " + JSON.stringify(error));
      },
    );
  }
}

// PASO 1: datos del registro
formRegistro.addEventListener("submit", async (evento) => {
  evento.preventDefault(); // Evita que la página se recargue

  //Capturar lo que escribió el usuario en las cajas de texto
  const nombreInput = document.getElementById("user").value;
  const correoInput = document.getElementById("email").value.trim();
  const passInput = document.getElementById("password").value;

  //Si cualquiera de los tres está vacío, detenemos el programa
  if (nombreInput === "" || correoInput === "" || passInput === "") {
    await alerta("Todos los campos son obligatorios y no pueden estar vacíos!");
    return; // Este return rompe la función y evita que se ejecute el INSERT
  }

  //Por seguridad supabase obliga a que la contraseña sea mayor a 6 caracteres asi que aqui verificamos que la contraseña sea mayor a 6 caracteres
  if (passInput.length < 6) {
    await alerta(
      "La contraseña es demasiado corta. Debe tener al menos 6 caracteres.",
    );
    return;
  }

  // Registramos en la tabla oculta 'auth.users'
  const { data: authData, error: authError } =
    await supabase_conexion.auth.signUp({
      email: correoInput,
      password: passInput, // Supabase la encriptará automáticamente
    });

  // Si hubo un error en la autenticación
  if (authError) {
    console.error("Error en Auth:", authError);
    await alerta("Error al crear las credenciales: " + authError.message);
    return; // Detenemos el código
  }

  // Si el correo ya está registrado y verificado, Supabase no da error pero no trae identidades
  if (authData.user && authData.user.identities && authData.user.identities.length === 0) {
    await alerta("Este correo ya está registrado. Inicia sesión.", "warning");
    return;
  }

  nombreActual = nombreInput;
  correoActual = correoInput;

  tipoCodigo = "signup";

  // Si Supabase no tiene activada la confirmación de correo, ya trae sesión.
  // La cerramos y mandamos el código de todos modos para que tenga que verificar su correo.
  if (authData.session) {
    await supabase_conexion.auth.signOut({ scope: "local" });
    tipoCodigo = "email";

    const { error: errorEnvio } = await supabase_conexion.auth.signInWithOtp({
      email: correoInput,
      options: { shouldCreateUser: false },
    });

    if (errorEnvio) {
      await alerta("No se pudo enviar el código: " + errorEnvio.message, "error");
      return;
    }
  }

  mostrarPasoCodigo();
  iniciarEsperaReenvio();
});

// PASO 2: código que llegó al correo
formularioCodigo.addEventListener("submit", async (evento) => {
  evento.preventDefault();

  const codigo = document.getElementById("codigo_correo").value.replace(/\D/g, "");

  if (!/^\d{6,8}$/.test(codigo)) {
    await alerta("El código debe ser de 6 a 8 dígitos.");
    return;
  }

  const { data, error } = await supabase_conexion.auth.verifyOtp({
    email: correoActual,
    token: codigo,
    type: tipoCodigo,
  });

  if (error) {
    console.error("Error al verificar el código:", error);
    await alerta("Código incorrecto o vencido. (" + error.message + ")", "error");
    return;
  }

  // Con el código correcto Supabase ya dejó la sesión iniciada
  await guardarPerfilYTerminar(data.user.id);
});

botonReenviar.addEventListener("click", async () => {
  let error = null;

  if (tipoCodigo === "signup") {
    const respuesta = await supabase_conexion.auth.resend({
      type: "signup",
      email: correoActual,
    });
    error = respuesta.error;
  } else {
    const respuesta = await supabase_conexion.auth.signInWithOtp({
      email: correoActual,
      options: { shouldCreateUser: false },
    });
    error = respuesta.error;
  }

  if (error) {
    await alerta("No se pudo reenviar el código: " + error.message, "error");
    return;
  }

  await alerta("Te enviamos un nuevo código.", "success");
  iniciarEsperaReenvio();
});

botonCancelar.addEventListener("click", () => {
  mostrarPasoRegistro();
});
