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

// Capturamos el formulario desde el HTML
const formRegistro = document.getElementById("formulario_registro");

// "Escucha" el formulario
formRegistro.addEventListener("submit", async (evento) => {
  evento.preventDefault(); // Evita que la página se recargue

  //Capturar lo que escribió el usuario en las cajas de texto
  const nombreInput = document.getElementById("user").value;
  const correoInput = document.getElementById("email").value;
  const passInput = document.getElementById("password").value;

  //Si cualquiera de los tres está vacío, detenemos el programa
  if (nombreInput === "" || correoInput === "" || passInput === "") {
    alert("Todos los campos son obligatorios y no pueden estar vacíos!");
    return; // Este return rompe la función y evita que se ejecute el INSERT
  }

  //Por seguridad supabase obliga a que la contraseña sea mayor a 6 caracteres asi que aqui verificamos que la contraseña sea mayor a 6 caracteres
  if (passInput.length < 6) {
    alert(
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
    alert("Error al crear las credenciales: " + authError.message);
    return; // Detenemos el código
  }

  // Obtenemos el ID único (UUID) que generó Supabase para este usuario
  const uuidUsuario = authData.user.id;

  // Insertar datos adicionales en nuestra tabla 'usuarios'
  const { error: tablaError } = await supabase_conexion
    .from("usuarios")
    .insert([
      {
        id_usuario: uuidUsuario,
        nombre: nombreInput,
        correo: correoInput,
      },
    ]);

  //Verificamos el resultado final de la tabla
  if (tablaError) {
    console.error("Error en tabla pública:", tablaError);
    alert(
      "Se crearon las credenciales, pero hubo un error al guardar tu perfil: " +
        tablaError.message,
    );
  } else {
    alert("¡Cuenta creada con éxito!");

    const parametros = {
      email: correoInput, //campo "To Email" {{email}}
    };

    // Funcion para enviar el correo
    emailjs.send("service_zokka9i", "template_afohaks", parametros).then(
      function (response) {
        console.log("¡Correo de bienvenida enviado con éxito!");
        formRegistro.reset(); // Limpiamos los campos del formulario
        window.location.href = "login.html";
      },
      function (error) {
        console.error("Error: ", error);
        alert("Error: " + JSON.stringify(error));
      },
    );
  }
});
