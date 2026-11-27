# TextilShop — Plataforma E-Commerce & Panel Administrativo

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)
![Cloudflare](https://img.shields.io/badge/Cloudflare_Turnstile-F38020?style=for-the-badge&logo=cloudflare&logoColor=white)

Aplicación web de comercio electrónico enfocada en moda y textiles, desarrollada con arquitectura sobre **Supabase** y JavaScript puro. Incluye tienda en línea, gestión de pedidos, perfil de cliente, herramientas de accesibilidad y un **Dashboard Administrativo** protegido con múltiples capas de seguridad.


## Características Principales

### Tienda y Experiencia de Usuario
* **Catálogo Responsivo:** Diseño adaptable a dispositivos móviles y escritorio mediante CSS Grid elástico.
* **Gestión de Cuenta e Historial:** Registro con confirmación de correo electrónico, actualización de datos de envío y consulta detallada de pedidos (`#TK-ID`) con desglose de prendas.
* **Personalización y Accesibilidad:** Selector de tema **Claro / Oscuro** persistente (`localStorage`) y módulo integrado de herramientas de accesibilidad.

### Panel de Administración (`Dashboard`)
* **Métricas en Tiempo Real:** Cálculo automático de ingresos totales (MXN), pedidos realizados, prendas vendidas y usuarios registrados.
* **Analítica Visual:** Gráficas interactivas con **Chart.js** (tendencia de ingresos de los últimos 10 pedidos y Top 5 productos más vendidos).
* **Control de Ventas:** Tabla dinámica con el detalle de órdenes recientes y estado de preparación.


## Arquitectura de Seguridad

El proyecto implementa controles de seguridad tanto en el cliente como a nivel de base de datos:

1. **Protección Anti-Bots:** Integración nativa de **Cloudflare Turnstile** en el inicio de sesión para mitigar ataques automatizados antes de validar credenciales.
2. **Bloqueo contra Fuerza Bruta:** Control de intentos fallidos persistido en PostgreSQL mediante funciones **RPC** (`verificar_bloqueo_usuario` y `gestionar_intento_login`) con bloqueo temporal automático.
3. **Autenticación en Dos Pasos (2FA / Step-Up Auth):**
   * Verificación por código OTP en el acceso de usuarios.
   * Segundo factor de autenticación obligatorio por correo electrónico (**EmailJS**) con códigos de 6 dígitos y expiración de 5 minutos para desbloquear el Dashboard Administrativo.
4. **Control de Sesión por Inactividad (`Session Timeout`):** Vigilante activo que cierra automáticamente la sesión en Supabase y limpia `localStorage` y `sessionStorage` tras 10 minutos sin actividad.
5. **Control de Acceso Basado en Roles (RBAC) y RLS:** Separación de privilegios (`usuario` vs `admin`) respaldada por políticas de **Row Level Security (RLS)** en todas las tablas de Supabase.

---

## Stack Tecnológico

* **Frontend:** HTML5, CSS3, JavaScript
* **Backend & Base de Datos:** Supabase (PostgreSQL)
* **Servicios Externos:**
  * [Cloudflare Turnstile](https://www.cloudflare.com/products/turnstile/) — Verificación CAPTCHA
  * [EmailJS](https://www.emailjs.com/) — Envío de códigos de seguridad 2FA
* **Librerías UI:** [Chart.js](https://www.chartjs.org/) (gráficas), [SweetAlert2](https://sweetalert2.github.io/) (alertas modales)

---


**Este proyecto fue desarrollado con fines académicos y de portafolio.**
