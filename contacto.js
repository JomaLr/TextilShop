//Iniciamos la parte para enviar el correo al registrase
emailjs.init("rIUDcgPWkN13PhkIk");

//Configura la conexión con credenciales a Supabase
const SUPABASE_URL = "https://ytqxpnuulmyktsxhpyod.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_uGAEEt8T2SCD09VtHmEeQQ_0nOXvJ1a";

//Establecemos la conexión
const supabase_conexion = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
);

//Esta funcion es para automaticamente rellenar los campos de nombre y correo en el formulario
document.addEventListener("DOMContentLoaded", async () => {
  const {
    data: { user },
    error: authError,
  } = await supabase_conexion.auth.getUser();

  try {
    // Vamos a la tabla usuarios a buscar el nombre usando el ID único (UUID)
    const { data: perfilUsuario, error: tablaError } = await supabase_conexion
      .from("usuarios") // FROM usuarios
      .select("nombre,correo") // SELECT nombre & correo
      .eq("id_usuario", user.id) // WHERE id_usuario = el id asociado a la sesion
      .single(); // Le decimos que solo nos devuelva una fila no la tabla por si hay mas de uno con el mismo nombre

    if (tablaError) {
      //Si ocurre un error
      console.error("Error al traer los datos:", tablaError);
      document.getElementById("nombre_usuario").value = "Error";
      document.getElementById("correo_usuario").value = "Error";
      return;
    }

    //Agregamos el resultado de la consulta en el html
    if (perfilUsuario) {
      document.getElementById("nombre_usuario").value = perfilUsuario.nombre;
      document.getElementById("correo_usuario").value = perfilUsuario.correo;
    }
  } catch (err) {
    console.error("Error inesperado:", err);
  }
});

// Capturamos el formulario desde el HTML
const formRegistro = document.getElementById("formulario_contacto");

// "Escucha" el formulario
formRegistro.addEventListener("submit", async (evento) => {
  evento.preventDefault(); // Evita que la página se recargue

  //Capturar lo que escribió el usuario en las cajas de texto
  const nombreInput = document.getElementById("nombre_usuario").value;
  const correoInput = document.getElementById("correo_usuario").value;
  const asuntoInput = document.getElementById("asunto_usuario").value;
  const messageInput = document.getElementById("mensaje_usuario").value;

  //Si cualquiera de los campos está vacío, detenemos el programa
  if (
    nombreInput === "" ||
    correoInput === "" ||
    asuntoInput === "" ||
    messageInput === ""
  ) {
    alert("Todos los campos son obligatorios y no pueden estar vacíos!");
    return; // Este return rompe la función y evita que se ejecute el INSERT
  }

  const parametros = {
    name: nombreInput, //campo {{name}}
    email: correoInput, //campo  {{email}}
    title: asuntoInput, //campo  {{title}}
    message: messageInput, //campo  {{message}}
  };

  // Funcion para enviar el correo
  emailjs.send("service_8w9z5hj", "template_c9pxzbp", parametros).then(
    function (response) {
      alert("¡Correo enviado con exito, Gracias por su preferencia!");
      formRegistro.reset(); // Limpiamos los campos del formulario
    },
    function (error) {
      console.error("Error: ", error);
      alert("Error: " + JSON.stringify(error));
    },
  );
});
