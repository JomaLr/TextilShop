//Configura la conexión con credenciales a Supabase
const SUPABASE_URL = "https://ytqxpnuulmyktsxhpyod.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_uGAEEt8T2SCD09VtHmEeQQ_0nOXvJ1a";

//Establecemos la conexión
const supabase_conexion = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
);

const modal = document.getElementById("formModal");
const openBtn = document.getElementById("info_update");
const closeBtn = document.getElementById("closeModalBtn");

openBtn.addEventListener("click", () => {
  modal.showModal();
});

// Cerrar el modal con el botón Cancelar
closeBtn.addEventListener("click", () => {
  modal.close();
});

// ENVÍO DEL FORMULARIO A SUPABASE
const formularioCategoria = modal.querySelector("form");

formularioCategoria.addEventListener("submit", async (evento) => {
  // Evitamos que el método nativo del dialog rompa el flujo asíncrono
  evento.preventDefault();

  //Capturamos los datos de los inputs
  const nombreCat = document.getElementById("cate").value;
  const inputFoto = document.getElementById("foto_prod");
  //EL cero es para si el usuario sube mas de una foto solo se tome la primera
  const archivoFisico = inputFoto.files[0];

  if (!archivoFisico) {
    alert("Por favor, selecciona una imagen.");
    return;
  }

  //Generamos un nombre único para que no se dupliquen imágenes usando el tiempo del sistema con el date.now
  const nombreUnicoArchivo = `${Date.now()}-${archivoFisico.name}`;

  try {
    //Subimos la imagen a Supabase
    const { data: datosStorage, error: errorStorage } =
      await supabase_conexion.storage
        .from("fotos_cat") // Es el nombre del contenedor de imagenes en Supabase
        .upload(nombreUnicoArchivo, archivoFisico);

    if (errorStorage) {
      console.error("Error subida:", errorStorage);
      alert("No se pudo subir la imagen de la categoría.");
      return;
    }

    //Obtenemos la URL pública de la imagen recién subida
    const { data: datosURL } = supabase_conexion.storage
      .from("fotos_cat")
      .getPublicUrl(nombreUnicoArchivo);

    const urlFinalImagen = datosURL.publicUrl;

    //Insertamos registros en la tabla de categorías
    const { data, error: errorTabla } = await supabase_conexion
      .from("categorias") // INSERT INTO CATEGORIAS(nombre_categoria,imagen) VALUES (nombrecat,urlgenerada)
      .insert([
        {
          nombre_categoria: nombreCat,
          imagen: urlFinalImagen,
        },
      ]);

    if (errorTabla) {
      console.error("Error al insertar en la tablaaaaaaaaaaaa:", errorTabla);
      alert(
        "La imagen se subió, pero no se pudo registrar la categoría en la DB.",
      );
      return;
    }

    //Si se pudo sss
    alert("¡Categoría creada con éxito!");

    formularioCategoria.reset(); // Vaciamos los campos del formulario
    modal.close(); // Cerramos el modal
    location.reload();
  } catch (err) {
    console.error("Error inesperado:", err);
  }
});

async function cargarCategoriasEnTabla() {
  try {
    //Un select de la tabla "categorias"
    const { data: categorias, error } = await supabase_conexion
      .from("categorias")
      .select("*");

    if (error) {
      console.error("Error ijo de la guayaba:", error);
      return;
    }

    //Apuntamos al cuerpo de la tabla en el HTML
    const tbody = document.getElementById("tabla-categorias-body");

    // Limpiamos la tabla para que no tenga nasa
    tbody.innerHTML = "";

    //Recorremos las categorías traídas de la DB con el each es decir por cada uno que exista
    categorias.forEach((categoria) => {
      // Creamos la estructura de la fila (tr)
      const filaHTML = `
        <tr>
          <td>
            <img src="${categoria.imagen}" alt="${categoria.nombre_categoria}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px;" />
          </td>

          <td>${categoria.nombre_categoria}</td>

          <td>
            <div class="actions">
              <button class="edit" data-id="${categoria.id_categoria}">Editar</button>
              <button class="delete" data-id="${categoria.id_categoria}">Eliminar</button>
            </div>
          </td>
        </tr>
      `;

      // Inyectamos la fila adentro del tbody
      tbody.innerHTML += filaHTML;
    });
  } catch (err) {
    console.error("Error inesperado que no esperabamos:", err);
  }
}

const tablaCatBody = document.getElementById("tabla-categorias-body");
const modalEditarCat = document.getElementById("editCatModal");
const btnCerrarEditCat = document.getElementById("closeEditCatModalBtn");

btnCerrarEditCat.addEventListener("click", () => modalEditarCat.close());

// Capturamos clics en la tabla de categorías
tablaCatBody.addEventListener("click", async (evento) => {
  // Acción: ELIMINAR
  if (evento.target.classList.contains("delete")) {
    const idCat = evento.target.getAttribute("data-id");
    const confirmar = confirm(
      "¿Estás seguro de eliminar esta categoría? Esto eliminara TODOS los productos vinculados.",
    );
    if (confirmar) {
      await eliminarCategoria(idCat);
    }
  }

  // Acción: EDICIÓN (Abrir modal)
  if (evento.target.classList.contains("edit")) {
    const idCat = evento.target.getAttribute("data-id");
    await abrirModalEdicionCat(idCat);
  }
});

async function eliminarCategoria(id) {
  try {
    // Primero buscamos la categoría para conocer la ruta de su imagen
    const { data: categoria, error: errorBuscar } = await supabase_conexion
      .from("categorias")
      .select("imagen")
      .eq("id_categoria", id)
      .single();

    if (errorBuscar) {
      console.error("Error al buscar categoría:", errorBuscar);
      return;
    }

    // Extraemos el nombre único de la imagen y la borramos del bucket fotos_cat
    const nombreArchivo = categoria.imagen.split("/").pop();
    await supabase_conexion.storage.from("fotos_cat").remove([nombreArchivo]);

    // Borramos el registro de la tabla categorías
    const { error: errorTabla } = await supabase_conexion
      .from("categorias")
      .delete()
      .eq("id_categoria", id);

    if (errorTabla) {
      console.error("Error al borrar categoría:", errorTabla);
      alert("No se pudo eliminar la categoría de la base de datos.");
      return;
    }

    alert("¡Categoría e imagen eliminadas con éxito!");
    location.reload();
  } catch (err) {
    console.error("Error inesperado al eliminar:", err);
  }
}

async function abrirModalEdicionCat(id) {
  try {
    const { data: categoria, error } = await supabase_conexion
      .from("categorias")
      .select("*")
      .eq("id_categoria", id)
      .single();

    if (error) {
      console.error("Error al cargar datos:", error);
      return;
    }

    // Rellenamos el formulario con los datos actuales
    document.getElementById("id_cat_edit").value = categoria.id_categoria;
    document.getElementById("cate_edit").value = categoria.nombre_categoria;

    modalEditarCat.showModal();
  } catch (err) {
    console.error("Error inesperado al abrir edición:", err);
  }
}

const formularioEditarCat = modalEditarCat.querySelector("form");

formularioEditarCat.addEventListener("submit", async (evento) => {
  evento.preventDefault();

  const idCat = document.getElementById("id_cat_edit").value;
  const nuevoNombre = document.getElementById("cate_edit").value;
  const inputFoto = document.getElementById("foto_cat_edit");
  const archivoFisico = inputFoto.files[0];

  try {
    let datosActualizar = {
      nombre_categoria: nuevoNombre,
    };

    // Si el usuario decidió cambiar la foto
    if (archivoFisico) {
      const nombreUnicoArchivo = `${Date.now()}-${archivoFisico.name}`;

      const { error: errorStorage } = await supabase_conexion.storage
        .from("fotos_cat")
        .upload(nombreUnicoArchivo, archivoFisico);

      if (errorStorage) {
        alert("No se pudo subir la nueva imagen de la categoría.");
        return;
      }

      const { data: datosURL } = supabase_conexion.storage
        .from("fotos_cat")
        .getPublicUrl(nombreUnicoArchivo);

      datosActualizar.imagen = datosURL.publicUrl;
    }

    // Actualizamos la fila en la tabla categorías
    const { error: errorUpdate } = await supabase_conexion
      .from("categorias")
      .update(datosActualizar)
      .eq("id_categoria", idCat);

    if (errorUpdate) {
      console.error("Error en update:", errorUpdate);
      alert("No se pudieron guardar los cambios de la categoría.");
      return;
    }

    alert("¡Categoría actualizada con éxito!");
    formularioEditarCat.reset();
    modalEditarCat.close();
    location.reload();
  } catch (err) {
    console.error("Error inesperado en el submit de edición:", err);
  }
});

confirm;

// Ejecutamos la función al cargar la página del administrador
document.addEventListener("DOMContentLoaded", cargarCategoriasEnTabla);
