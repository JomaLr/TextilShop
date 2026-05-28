//Configura la conexión con credenciales a Supabase
const SUPABASE_URL = "https://ytqxpnuulmyktsxhpyod.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_uGAEEt8T2SCD09VtHmEeQQ_0nOXvJ1a";

//Establecemos la conexión
const supabase_conexion = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
);

async function cargarProductosEnTabla() {
  try {
    const { data: productos, error } = await supabase_conexion.from("productos")
      .select(`
        id_producto,
        nombre,
        imagen,
        inventarios (
          stock
        )
      `);

    if (error) {
      console.error("Error al traer los productos:", error);
      return;
    }

    const tbody = document.getElementById("inventario_tabla");
    tbody.innerHTML = ""; // Limpiamos la tabla

    productos.forEach((producto) => {
      // 1. Extraemos el stock de manera segura usando el operador ?
      const stockNumerico =
        producto.inventarios && producto.inventarios[0]
          ? producto.inventarios[0].stock
          : 0;
      const mistock =
        producto.inventarios && producto.inventarios[0]
          ? producto.inventarios[0].stock
          : "Sin stock";

      // 2. Determinamos el estado del inventario de forma segura
      let status_inv = "Agotado";
      if (stockNumerico > 5) {
        status_inv = "Disponible";
      } else if (stockNumerico > 0) {
        status_inv = "Bajo";
      }

      const filaHTML = `
              <tr>
                <td>
                  <div class="product-info">
                    <img src="${producto.imagen}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px;"/>
                    <span>${producto.nombre}</span>
                  </div>
                </td>
                <td>${mistock}</td>
                <td>
                  <span class="status ${status_inv}">${status_inv}</span>
                </td>
                <td>
                  <button class="edit-btn" data-id="${producto.id_producto}" data-stock="${stockNumerico}">Actualizar Stock</button>
                </td>
              </tr>
      `;

      tbody.innerHTML += filaHTML;
    });
  } catch (err) {
    console.error("Error inesperado al cargar la tabla de productos:", err);
  }
}

// Inicializamos la función cuando todo el HTML esté listo
document.addEventListener("DOMContentLoaded", cargarProductosEnTabla);

// Apuntamos al cuerpo de la tabla de inventario
const tbodyInventario = document.getElementById("inventario_tabla");

tbodyInventario.addEventListener("click", async (evento) => {
  // Verificamos si hicieron clic en el botón de actualizar stock
  if (evento.target.classList.contains("edit-btn")) {
    const boton = evento.target;
    const idProducto = boton.getAttribute("data-id");
    const stockActual = boton.getAttribute("data-stock");

    // Mostramos una cajita de texto nativa preguntando la nueva cantidad
    const nuevoStockInput = prompt(
      `Introduce el nuevo stock para este producto (Actual: ${stockActual}):`,
      stockActual,
    );

    // Si el usuario le dio a "Cancelar" o dejó vacío, detenemos la función
    if (nuevoStockInput === null || nuevoStockInput.trim() === "") return;

    // Convertimos la respuesta a un número entero
    const nuevoStock = parseInt(nuevoStockInput);

    // Validamos que sea un número válido y que no sea negativo
    if (isNaN(nuevoStock) || nuevoStock < 0) {
      alert("Por favor, introduce un número entero válido mayor o igual a 0.");
      return;
    }

    try {
      // Guardamos la actualización en la tabla 'inventarios' filtrando por 'id_producto'
      const { error } = await supabase_conexion
        .from("inventarios")
        .update({ stock: nuevoStock })
        .eq("id_producto", idProducto);

      if (error) {
        console.error("Error al actualizar el stock en Supabase:", error);
        alert("No se pudo actualizar el stock en la base de datos.");
        return;
      }

      alert("¡Stock actualizado con éxito!");

      // Refrescamos visualmente la tabla llamando a tu función original
      cargarProductosEnTabla();
    } catch (err) {
      console.error("Error inesperado en la actualización:", err);
    }
  }
});
