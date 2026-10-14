document.addEventListener("DOMContentLoaded", () => {
    // Inyectar estructura HTML usando un DIV con rol de botón para evitar conflictos con login.css
    const widgetContainer = document.createElement("div");
    widgetContainer.id = "accessibility-widget-container";
    widgetContainer.innerHTML = `
      <div id="accessibility-fab" role="button" tabindex="0" style="position: fixed !important; bottom: 20px !important; right: 20px !important; left: auto !important; width: auto !important; max-width: max-content !important; display: inline-flex !important; align-items: center !important; gap: 8px !important; background-color: #0d6efd !important; color: #ffffff !important; border: none !important; border-radius: 50px !important; padding: 10px 18px !important; font-size: 14px !important; font-weight: 600 !important; cursor: pointer !important; z-index: 99999 !important; box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important;" aria-expanded="false" aria-controls="accessibility-panel" aria-label="Abrir menú de accesibilidad">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10.5"/><circle cx="12" cy="6.4" r="1.7"/><path d="M5.8 9.4c2 .7 4.1 1.1 6.2 1.1s4.2-.4 6.2-1.1"/><path d="M12 10.5v3.6"/><path d="M12 14.1l-2.7 5.1M12 14.1l2.7 5.1"/></svg>
        Accesibilidad
      </div>
  
      <div id="accessibility-panel" role="region" aria-label="Panel de Accesibilidad">
        <div class="acc-header">
          <h3>Herramientas de Accesibilidad</h3>
          <button class="acc-close-btn" aria-label="Cerrar panel">&times;</button>
        </div>
  
        <!-- 1. Texto Alternativo -->
        <div class="acc-option">
          <label for="toggle-alt">1. Visualizador de Texto Alternativo</label>
          <button id="toggle-alt" aria-pressed="false">Activar visor de Alt</button>
        </div>
  
        <!-- 2. Navegación por Teclado -->
        <div class="acc-option">
          <label for="toggle-keyboard">2. Indicador de Foco por Teclado</label>
          <button id="toggle-keyboard" aria-pressed="false">Resaltar Foco Visible</button>
        </div>
  
        <!-- 3. Modo Oscuro -->
        <div class="acc-option">
          <label for="toggle-dark">3. Modo Oscuro</label>
          <button id="toggle-dark" aria-pressed="false">Activar Modo Oscuro</button>
        </div>
  
        <!-- 4. Uso del Color -->
        <div class="acc-option">
          <label for="toggle-color-labels">4. Refuerzo de Uso de Color</label>
          <button id="toggle-color-labels" aria-pressed="false">Mostrar Etiquetas de Estado</button>
        </div>
  
        <!-- 5. Contraste de Color -->
        <div class="acc-option">
          <label for="toggle-contrast">5. Contraste de color</label>
          <button id="toggle-contrast" aria-pressed="false">Alto Contraste</button>
        </div>
  
        <!-- 6. Redimensionamiento de Texto -->
        <div class="acc-option">
          <label for="font-size-slider">6. Tamaño de Texto (<span id="font-size-val">100</span>%)</label>
          <input type="range" id="font-size-slider" min="100" max="200" step="10" value="100">
        </div>
  
        <button class="acc-reset-btn" id="acc-reset">Restablecer Valores</button>
      </div>
    `;
    document.body.appendChild(widgetContainer);
  
    // Referencias
    const fab = document.getElementById("accessibility-fab");
    const panel = document.getElementById("accessibility-panel");
    const closeBtn = document.querySelector(".acc-close-btn");
    const btnAlt = document.getElementById("toggle-alt");
    const btnKeyboard = document.getElementById("toggle-keyboard");
    const btnDark = document.getElementById("toggle-dark");
    const btnColorLabels = document.getElementById("toggle-color-labels");
    const btnContrast = document.getElementById("toggle-contrast");
    const fontSizeSlider = document.getElementById("font-size-slider");
    const fontSizeVal = document.getElementById("font-size-val");
    const resetBtn = document.getElementById("acc-reset");
  
    // Abrir / Cerrar Panel (Soporte para Clic y Teclado en el div)
    const togglePanel = () => {
      const isOpen = panel.classList.toggle("active");
      fab.setAttribute("aria-expanded", isOpen);
      if (isOpen) panel.querySelector("button, input").focus();
    };

    fab.addEventListener("click", togglePanel);
    fab.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        togglePanel();
      }
    });
  
    closeBtn.addEventListener("click", () => {
      panel.classList.remove("active");
      fab.setAttribute("aria-expanded", "false");
      fab.focus();
    });
  
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && panel.classList.contains("active")) {
        panel.classList.remove("active");
        fab.setAttribute("aria-expanded", "false");
        fab.focus();
      }
    });
  
    // --- Modo Oscuro ---
    const isDarkModeActive = () => {
      return document.documentElement.getAttribute("data-theme") === "dark" || 
             document.documentElement.classList.contains("dark-mode");
    };

    const updateDarkButtonState = (isActive) => {
      if (!btnDark) return;
      btnDark.classList.toggle("active-feature", isActive);
      btnDark.setAttribute("aria-pressed", isActive);
      btnDark.textContent = isActive ? "Desactivar Modo Oscuro" : "Activar Modo Oscuro";
    };

    const toggleDarkMode = () => {
      const existingThemeBtn = document.querySelector('#tema-btn') || 
                               document.querySelector('#modo-oscuro') || 
                               document.querySelector('.tema-btn') || 
                               document.querySelector('.dark-mode-btn') ||
                               document.querySelector('button[id*="tema" i]') ||
                               document.querySelector('button[id*="dark" i]') ||
                               document.querySelector('button[class*="tema" i]') ||
                               document.querySelector('button[class*="dark" i]');
  
      if (existingThemeBtn) {
        existingThemeBtn.click();
      } else if (typeof window.toggleTheme === "function") {
        window.toggleTheme();
      } else {
        const willBeDark = !isDarkModeActive();
        document.documentElement.classList.toggle("dark-mode", willBeDark);
        document.body.classList.toggle("dark-mode", willBeDark);
        localStorage.setItem("theme", willBeDark ? "dark" : "light");
        localStorage.setItem("darkMode", willBeDark);
      }
  
      setTimeout(() => {
        updateDarkButtonState(isDarkModeActive());
      }, 50);
    };

    if (btnDark) {
      btnDark.addEventListener("click", toggleDarkMode);
    }
  
    // --- 1. Texto Alternativo ---
    let altActive = false;
    function enableAltVisualizer(enable) {
      altActive = enable;
      btnAlt.classList.toggle("active-feature", enable);
      btnAlt.setAttribute("aria-pressed", enable);
      
      let container = document.getElementById("alt-badges-container");
      if (enable) {
        if (!container) {
          container = document.createElement("div");
          container.id = "alt-badges-container";
          document.body.appendChild(container);
        }
        container.innerHTML = "";
        document.querySelectorAll("img").forEach(img => {
          const altText = img.getAttribute("alt") || "[Sin atributo alt]";
          const rect = img.getBoundingClientRect();
          const badge = document.createElement("div");
          badge.className = "alt-text-badge";
          badge.style.top = `${window.scrollY + rect.top + 5}px`;
          badge.style.left = `${window.scrollX + rect.left + 5}px`;
          badge.textContent = `ALT: ${altText}`;
          container.appendChild(badge);
        });
      } else if (container) {
        container.remove();
      }
      localStorage.setItem("acc_alt", enable);
    }
    btnAlt.addEventListener("click", () => enableAltVisualizer(!altActive));
  
    // --- 2. Navegación por Teclado ---
    let keyboardActive = false;
    function enableKeyboardNav(enable) {
      keyboardActive = enable;
      document.documentElement.classList.toggle("keyboard-nav", enable);
      btnKeyboard.classList.toggle("active-feature", enable);
      btnKeyboard.setAttribute("aria-pressed", enable);
      localStorage.setItem("acc_keyboard", enable);
    }
    btnKeyboard.addEventListener("click", () => enableKeyboardNav(!keyboardActive));
  
    // --- 4. Uso del Color ---
    let colorActive = false;
    function enableColorLabels(enable) {
      colorActive = enable;
      document.documentElement.classList.toggle("show-color-labels", enable);
      btnColorLabels.classList.toggle("active-feature", enable);
      btnColorLabels.setAttribute("aria-pressed", enable);
      localStorage.setItem("acc_color", enable);
    }
    btnColorLabels.addEventListener("click", () => enableColorLabels(!colorActive));
  
    // --- 5. Contraste de Color ---
    let contrastActive = false;
    function enableContrast(enable) {
      contrastActive = enable;
      document.documentElement.classList.toggle("high-contrast", enable);
      btnContrast.classList.toggle("active-feature", enable);
      btnContrast.setAttribute("aria-pressed", enable);
      localStorage.setItem("acc_contrast", enable);
    }
    btnContrast.addEventListener("click", () => enableContrast(!contrastActive));
  
    // --- 6. Redimensionamiento de Texto ---
    function applyZoom(val) {
      fontSizeSlider.value = val;
      fontSizeVal.textContent = val;
      document.documentElement.style.fontSize = `${val}%`;
      localStorage.setItem("acc_zoom", val);
    }
    fontSizeSlider.addEventListener("input", (e) => applyZoom(e.target.value));
  
    // --- Cargar configuraciones guardadas ---
    const loadSettings = () => {
      if (localStorage.getItem("acc_contrast") === "true") enableContrast(true);
      if (localStorage.getItem("acc_keyboard") === "true") enableKeyboardNav(true);
      if (localStorage.getItem("acc_alt") === "true") enableAltVisualizer(true);
      if (localStorage.getItem("acc_color") === "true") enableColorLabels(true);
      const savedZoom = localStorage.getItem("acc_zoom") || "100";
      applyZoom(savedZoom);
      updateDarkButtonState(isDarkModeActive());
    };
  
    // --- Restablecer Valores ---
    resetBtn.addEventListener("click", () => {
      localStorage.removeItem("acc_contrast");
      localStorage.removeItem("acc_keyboard");
      localStorage.removeItem("acc_alt");
      localStorage.removeItem("acc_color");
      localStorage.removeItem("acc_zoom");
  
      enableContrast(false);
      enableKeyboardNav(false);
      enableAltVisualizer(false);
      enableColorLabels(false);
      applyZoom(100);
      
      if (isDarkModeActive()) {
        toggleDarkMode();
      }
  
      panel.classList.remove("active");
    });

    loadSettings();
});
