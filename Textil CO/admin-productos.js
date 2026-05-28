//Configura la conexión con credenciales a Supabase
const SUPABASE_URL = "https://ytqxpnuulmyktsxhpyod.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_uGAEEt8T2SCD09VtHmEeQQ_0nOXvJ1a";

//Establecemos la conexión
const supabase_conexion = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
);

const modal = document.getElementById("formModal");
const openBtn = document.getElementById("agregar_prod");
const closeBtn = document.getElementById("closeModalBtn");

openBtn.addEventListener("click", () => {
  modal.showModal();
});

// Cerrar el modal con el botón Cancelar
closeBtn.addEventListener("click", () => {
  modal.close();
});

//======================================================================================================================================================================
//======================================================================================================================================================================
//Select con las categorias modificado para que reciba el ID
async function cargarCategoriasEnSelect(idSelect) {
  try {
    // Traemos el id y el nombre de tus categorías de la DB
    const { data: categorias, error } = await supabase_conexion
      .from("categorias")
      .select("id_categoria, nombre_categoria");

    if (error) {
      console.error("Error al traer categorías para el select:", error);
      return;
    }

    const selectElement = document.getElementById(idSelect);

    // Si el select no existe en la página actual, salimos para evitar errores de JS
    if (!selectElement) return;

    selectElement.innerHTML =
      '<option value="" disabled selected>Selecciona una categoría</option>';

    // Recorremos las categorías
    categorias.forEach((cat) => {
      const option = document.createElement("option");
      option.value = cat.id; // El "value" guarda el ID (lo que necesita la FK)
      option.textContent = cat.nombre_categoria;
      selectElement.appendChild(option);
    });
  } catch (err) {
    console.error("Error inesperado en el select:", err);
  }
}

//======================================================================================================================================================================
//======================================================================================================================================================================
//Insercion del producto en la tabla productos
const formularioProducto = modal.querySelector("form");

formularioProducto.addEventListener("submit", async (evento) => {
  evento.preventDefault(); // Detener el cierre automático del dialog

  //Capturamos todos los valores de los inputs
  const nombre = document.getElementById("nombre_prod").value;
  const descripcion = document.getElementById("descripcion_prod").value;
  const precio = parseInt(document.getElementById("precio_prod").value);

  const selectElement = document.getElementById("select_categoria");
  const textoSeleccionado =
    selectElement.options[selectElement.selectedIndex].text;
  console.log(textoSeleccionado);

  const tallaelegida = document.getElementById("talla_box");
  const tallatexto = tallaelegida.options[tallaelegida.selectedIndex].text;
  console.log(tallatexto);

  const { data: catelegida, erroresss } = await supabase_conexion
    .from("categorias")
    .select("*")
    .eq("nombre_categoria", textoSeleccionado)
    .single(); // Un solo resultado

  if (!erroresss) {
    console.log("Nombre:", catelegida.id_categoria);
  }

  const idCategoria = catelegida.id_categoria; // Scaremos el id de la categoria que eligio
  console.log(idCategoria);
  const inputFoto = document.getElementById("foto_prod");
  const archivoFisico = inputFoto.files[0];

  if (!archivoFisico) {
    alert("Por favor, selecciona una imagen para el producto.");
    return;
  }

  //Generamos un nombre único para la imagen
  const nombreUnicoArchivo = `${Date.now()}-${archivoFisico.name}`;

  try {
    // Subir la foto
    const { data: datosStorage, error: errorStorage } =
      await supabase_conexion.storage
        .from("fotos-productos")
        .upload(nombreUnicoArchivo, archivoFisico);

    if (errorStorage) {
      console.error("Error al subir imagen del producto:", errorStorage);
      alert("No se pudo subir la imagen del producto.");
      return;
    }

    //Obtenemos la URL de la imagen
    const { data: datosURL } = supabase_conexion.storage
      .from("fotos-productos")
      .getPublicUrl(nombreUnicoArchivo);

    const urlFinalImagen = datosURL.publicUrl;

    //Insertar en la tabla "productos"
    const { data: productoCreado, error: errorTabla } = await supabase_conexion
      .from("productos") // Asegúrate de que tu tabla se llame así
      .insert([
        {
          nombre: nombre,
          descripcion: descripcion,
          precio: precio,
          talla: tallatexto,
          imagen: urlFinalImagen,
          id_categoria: idCategoria, // Guardamos el ID de la categoría (FK)
        },
      ])
      .select();

    if (errorTabla) {
      console.error("Error al insertar producto en la DB:", errorTabla);
      alert("La imagen se subió, pero no se pudo registrar el producto.");
      return;
    }

    const nuevoIdProducto = productoCreado[0].id_producto;

    const { data: dataInv, error: errorInv } = await supabase_conexion
      .from("inventarios")
      .insert([
        {
          id_producto: nuevoIdProducto,
          stock: 0,
        },
      ]);

    if (errorInv) {
      console.error("Error al insertar producto en la DB:", errorInv);
      alert("La imagen se subió, pero no se pudo registrar el producto.");
      return;
    }

    // ÉXITO
    alert("¡Producto creado con éxito!");
    formularioProducto.reset(); // Resetea inputs, textareas y el select a su estado inicial
    modal.close();
    location.reload();
  } catch (err) {
    console.error("Error inesperado kbon:", err);
  }
});

// Llamamos a la función pasándole los ID de tus dos select correspondientes
document.addEventListener("DOMContentLoaded", () => {
  cargarCategoriasEnSelect("select_categoria"); // Rellena la caja de insertar
  cargarCategoriasEnSelect("select_categoria_edit"); // Rellena la caja de editar
});

//======================================================================================================================================================================
//======================================================================================================================================================================

async function cargarProductosEnTabla() {
  try {
    const { data: productos, error } = await supabase_conexion.from("productos")
      .select(`
        id_producto,
        nombre,
        descripcion,
        precio,
        talla,
        imagen,
        categorias (
          nombre_categoria
        )
      `); //En supabase el join se hace automaticamente solo con la ultima linea

    if (error) {
      console.error("Error al traer los productos:", error);
      return;
    }

    const tbody = document.getElementById("tabla-productos-body");
    tbody.innerHTML = ""; // Limpiamos la tabla

    //Recorremos el arreglo de productos que nos devolvió Supabase
    productos.forEach((producto) => {
      const nombreCat = producto.categorias
        ? producto.categorias.nombre_categoria
        : "Sin categoría";

      const filaHTML = `
        <tr>
          <td>
            <img src="${producto.imagen}" alt="${producto.nombre}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px;" />
          </td>
          <td>${producto.nombre}</td>
          <td>${producto.talla}</td>
          <td>${nombreCat}</td>
          <td>$${producto.precio}</td>
          <td>${producto.descripcion}</td>
          <td>
            <div class="actions">
              <button class="edit" data-id="${producto.id_producto}">Editar</button>
              <button class="delete" data-id="${producto.id_producto}">Eliminar</button>
            </div>
          </td>
        </tr>
      `;

      // Inyectamos la fila armada al final del tbody
      tbody.innerHTML += filaHTML;
    });
  } catch (err) {
    console.error("Error inesperado al cargar la tabla de productos:", err);
  }
}

// Apuntamos al cuerpo de la tabla
const tablaBody = document.getElementById("tabla-productos-body");

tablaBody.addEventListener("click", async (evento) => {
  //Detectar si hicieron clic en el botón de Eliminar
  if (evento.target.classList.contains("delete")) {
    const idProducto = evento.target.getAttribute("data-id");

    // Confirmación nativa antes de borrar de la DB
    const confirmar = confirm(
      "¿Estás seguro de que deseas eliminar este producto?",
    );
    if (confirmar) {
      await eliminarProducto(idProducto);
    }
  }

  //Detectar si hicieron clic en el botón de Editar
  if (evento.target.classList.contains("edit")) {
    const idProducto = evento.target.getAttribute("data-id");
    abrirModalEdicion(idProducto);
  }
});

//======================================================================================================================================================================
//======================================================================================================================================================================

async function eliminarProducto(id) {
  try {
    //traemoss la URL de su imagen
    const { data: producto, error: errorBuscar } = await supabase_conexion
      .from("productos")
      .select("imagen")
      .eq("id_producto", id)
      .single();

    if (errorBuscar) {
      console.error("Error al buscar la imagen:", errorBuscar);
      alert("Error! Autodestrucción inminente. (Al bucars URL)");
      return;
    }

    //Extraemos el nombre del archivo desde la URL pública
    // split("/").pop() toma el texto que está justo después de la última diagonal (el nombre único que creamos con Date.now() cuando lo insertamos)
    const nombreArchivo = producto.imagen.split("/").pop();

    //Borramos el archivo físico de la DB en "fotos-productos"
    const { error: errorStorage } = await supabase_conexion.storage
      .from("fotos-productos")
      .remove([nombreArchivo]); // El método remove pide un arreglo de nombres

    if (errorStorage) {
      console.error("Error al eliminar la imagen!!!:", errorStorage);
    }

    //Borramos la fila de la tabla "productos"
    const { error: errorTabla } = await supabase_conexion
      .from("productos")
      .delete()
      .eq("id_producto", id);

    if (errorTabla) {
      console.error("Error al eliminar de la BD:", errorTabla);
      alert(
        "La imagen se borró, pero no se pudo eliminar el producto de la lista asi que llora.",
      );
      return;
    }

    alert("¡Producto eliminado con éxito!");

    // Volvemos a cargar la tabla para que se vean los cambios
    cargarProductosEnTabla();
  } catch (err) {
    console.error("Error inesperado que si esperabamos al eliminar:", err);
  }
}

//======================================================================================================================================================================
//======================================================================================================================================================================
// Elementos del Modal
const modalEditar = document.getElementById("editModal");
const btnCerrarEdit = document.getElementById("closeEditModalBtn");

btnCerrarEdit.addEventListener("click", () => modalEditar.close());

async function abrirModalEdicion(id) {
  try {
    // Buscamos el producto actual
    const { data: producto, error } = await supabase_conexion
      .from("productos")
      .select(
        `
        id_producto,
        nombre,
        descripcion,
        precio,
        talla,
        categorias (
          nombre_categoria
        )
      `,
      )
      .eq("id_producto", id)
      .single();

    if (error) {
      console.error("Error al traer datos:", error);
      return;
    }

    // Rellenamos los inputs con los datos actuales desde la DB
    document.getElementById("id_prod_edit").value = producto.id_producto;
    document.getElementById("nombre_prod_edit").value = producto.nombre;
    document.getElementById("descripcion_prod_edit").value =
      producto.descripcion;
    document.getElementById("precio_prod_edit").value = producto.precio;

    // Para la talla usamos la propiedad text de las opciones
    const selectTalla = document.getElementById("talla_box_edit");
    for (let i = 0; i < selectTalla.options.length; i++) {
      if (selectTalla.options[i].text === producto.talla) {
        selectTalla.selectedIndex = i;
        break;
      }
    }

    // Para la categoría buscamos por el texto que vino del JOIN
    const selectCat = document.getElementById("select_categoria_edit");
    const nombreCatActual = producto.categorias
      ? producto.categorias.nombre_categoria
      : "";
    for (let i = 0; i < selectCat.options.length; i++) {
      if (selectCat.options[i].text === nombreCatActual) {
        selectCat.selectedIndex = i;
        break;
      }
    }

    // Abrimos el modal
    modalEditar.showModal();
  } catch (err) {
    console.error("Error al abrir modal:", err);
  }
}

//UPDATE en la DB
const formularioEditar = modalEditar.querySelector("form");

formularioEditar.addEventListener("submit", async (evento) => {
  evento.preventDefault();

  const idProducto = document.getElementById("id_prod_edit").value;
  const nombre = document.getElementById("nombre_prod_edit").value;
  const descripcion = document.getElementById("descripcion_prod_edit").value;
  const precio = parseInt(document.getElementById("precio_prod_edit").value);

  // Capturamos el texto de la talla del ComboBox
  const tallaelegida = document.getElementById("talla_box_edit");
  const tallatexto = tallaelegida.options[tallaelegida.selectedIndex].text;

  // Capturamos el texto de la categoría seleccionado para buscar su ID
  const selectElement = document.getElementById("select_categoria_edit");
  const textoSeleccionado =
    selectElement.options[selectElement.selectedIndex].text;

  // Hacemos el SELECT de la tabla categorías usando el nombre como WHERE
  const { data: catelegida, erroresss } = await supabase_conexion
    .from("categorias")
    .select("*")
    .eq("nombre_categoria", textoSeleccionado)
    .single();

  if (erroresss) {
    console.error("Error al buscar la categoría:", erroresss);
    alert("No se pudo validar la categoría elegida.");
    return;
  }

  const idCategoria = catelegida.id_categoria;

  const inputFoto = document.getElementById("foto_prod_edit");
  const archivoFisico = inputFoto.files[0];

  try {
    let datosActualizar = {
      nombre: nombre,
      descripcion: descripcion,
      precio: precio,
      talla: tallatexto,
      id_categoria: idCategoria,
    };

    // Si el usuario subio una foto nueva si no pues se queda la que esta
    if (archivoFisico) {
      const nombreUnicoArchivo = `${Date.now()}-${archivoFisico.name}`;
      const { error: errorStorage } = await supabase_conexion.storage
        .from("fotos-productos")
        .upload(nombreUnicoArchivo, archivoFisico);

      if (errorStorage) {
        alert("Error en subida.");
        return;
      }

      const { data: datosURL } = supabase_conexion.storage
        .from("fotos-productos")
        .getPublicUrl(nombreUnicoArchivo);

      datosActualizar.imagen = datosURL.publicUrl;
    }

    // Guardamos los cambios en la tabla productos
    const { error: errorUpdate } = await supabase_conexion
      .from("productos")
      .update(datosActualizar)
      .eq("id_producto", idProducto);

    if (errorUpdate) {
      console.error("Error al actualizar:", errorUpdate);
      alert("No se pudieron guardar los cambios.");
      return;
    }

    alert("Producto actualizado con éxito!");
    modalEditar.close();
    cargarProductosEnTabla();
  } catch (err) {
    console.error("Error inesperado que tal vez esperabamos al editar:", err);
  }
});

// Inicializamos la función cuando todo el HTML esté listo
document.addEventListener("DOMContentLoaded", cargarProductosEnTabla);
