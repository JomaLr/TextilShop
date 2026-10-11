// chatbot_interfaz.js
import { Chatbot } from "./chatbot.js";

document.addEventListener("DOMContentLoaded", () => {
  const miBot = new Chatbot();

  // 1. Inyectar el HTML del Chatbot al final del body
  const chatHTML = `
        <div id="textilshop-chatbot-container">
            <button id="chatbot-toggle-btn">💬 Chatbot</button>
            <div id="chatbot-window" class="hidden">
                <div id="chatbot-header">
                    <span>DamianBOT - TextilShop</span>
                    <button id="chatbot-close-btn">✖</button>
                </div>
                <div id="chatbot-messages"></div>
                <div id="chatbot-input-area">
                    <input type="text" id="chatbot-input" placeholder="Escribe tu mensaje..." autocomplete="off">
                    <button id="chatbot-send-btn">➤</button>
                </div>
            </div>
        </div>
    `;
  document.body.insertAdjacentHTML("beforeend", chatHTML);

  // 2. Referencias a los elementos del DOM
  const toggleBtn = document.getElementById("chatbot-toggle-btn");
  const closeBtn = document.getElementById("chatbot-close-btn");
  const chatWindow = document.getElementById("chatbot-window");
  const messagesContainer = document.getElementById("chatbot-messages");
  const inputField = document.getElementById("chatbot-input");
  const sendBtn = document.getElementById("chatbot-send-btn");

  let chatIniciado = false;

  // 3. Funciones de Interfaz
  function openChat() {
    chatWindow.classList.remove("hidden");
    toggleBtn.classList.add("hidden");
    inputField.focus();

    // Iniciar chat (El saludo inicial de tu java)
    if (!chatIniciado) {
      const mensajeInicial = miBot.iniciarChat();
      if (mensajeInicial) {
        appendMessage("DamianBOT", mensajeInicial, "bot-msg");
      }
      chatIniciado = true;
    }
  }

  function closeChat() {
    chatWindow.classList.add("hidden");
    toggleBtn.classList.remove("hidden");
  }

  function appendMessage(sender, text, className) {
    const msgDiv = document.createElement("div");
    msgDiv.className = `chat-msg ${className}`;
    msgDiv.innerHTML = `<strong>${sender === "Tu" ? "> Tu" : "> " + sender}:</strong> <br>${text}`;
    messagesContainer.appendChild(msgDiv);
    // Autoscroll hacia abajo
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  function sendMessage() {
    const text = inputField.value.trim();
    if (text === "") return;

    // Mostrar mensaje del usuario
    appendMessage("Tu", text, "user-msg");
    inputField.value = ""; // Limpiar input

    // Procesar comando en la lógica del bot
    const respuesta = miBot.procesarComando(text);

    // Simular un pequeño retraso natural de respuesta
    setTimeout(() => {
      appendMessage("DamianBOT", respuesta, "bot-msg");
      // Si el estado regresó algún extra del inicio, lo procesamos
      const extra = miBot.iniciarChat();
      if (extra) appendMessage("DamianBOT", extra, "bot-msg");
    }, 300);
  }

  // 4. Event Listeners
  toggleBtn.addEventListener("click", openChat);
  closeBtn.addEventListener("click", closeChat);
  sendBtn.addEventListener("click", sendMessage);

  // Permitir enviar con Enter
  inputField.addEventListener("keypress", function (e) {
    if (e.key === "Enter") {
      sendMessage();
    }
  });
});
