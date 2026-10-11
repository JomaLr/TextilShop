// ===========================================================
// ui.js — Ayudantes de interfaz basados en SweetAlert2.
// Reemplazan alert() / confirm() nativos por diálogos modernos.
// Requiere cargar antes: https://cdn.jsdelivr.net/npm/sweetalert2@11.14.5
// ===========================================================
(function () {
  const COLOR_PRIMARIO = "#222";
  const COLOR_ACENTO = "#c59d5f";

  const esOscuro = () =>
    document.documentElement.getAttribute("data-theme") === "dark";

  // Elige el icono según el contenido del mensaje
  function inferirIcono(msg) {
    const t = String(msg).toLowerCase();
    if (/error|no se pudo|no se pudieron|incorrect|fallo|inconveniente|hubo un/.test(t))
      return "error";
    if (/éxito|exito|exitosa|agregado|iniciada|cerrada|enviado|actualiz|creada|eliminad/.test(t))
      return "success";
    return "warning";
  }

  function base(extra) {
    return Object.assign(
      {
        confirmButtonColor: COLOR_PRIMARIO,
        cancelButtonColor: COLOR_ACENTO,
        background: esOscuro() ? "#1e1e1e" : "#fff",
        color: esOscuro() ? "#f1f1f1" : "#222",
        heightAuto: false,
        customClass: { popup: "swal-textilshop" },
      },
      extra,
    );
  }
