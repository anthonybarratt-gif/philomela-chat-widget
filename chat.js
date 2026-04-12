(function () {

  // === CREATE CHAT BUTTON ===
  const button = document.createElement("div");
  button.innerHTML = "💬";
  Object.assign(button.style, {////
    position: "fixed",
    bottom: "20px",
    right: "20px",
    background: "#2d4b8c",
    color: "white",
    padding: "12px 15px",
    borderRadius: "50%",
    cursor: "pointer",
    zIndex: "9999"
  });
  document.body.appendChild(button);/
  
  // === STYLE FOR BUTTONS ===
  const style = document.createElement('style');
  style.innerHTML = `
  #messages button {
    margin: 4px;
    padding: 6px 10px;
    border-radius: 6px;
    border: 1px solid #2d4b8c;
    background: white;
    cursor: pointer;
  }

  #messages button:hover {
    background: #2d4b8c;
    color: white;
  }
  `;
  document.head.appendChild(style);

  // === CREATE CHAT BOX ===
  const chat = document.createElement("div");
  Object.assign(chat.style, {
    position: "fixed",
    bottom: "80px",
    right: "20px",
    width: "300px",
    background: "white",
    border: "1px solid #ccc",
    borderRadius: "10px",
    display: "none",
    zIndex: "9999",
    fontFamily: "Arial, sans-serif"
  });

  chat.innerHTML = `
  <div style="background:#2d4b8c;color:white;padding:10px;border-radius:10px 10px 0 0;display:flex;justify-content:space-between;align-items:center;">
    <span>Philomela Chat</span>
    <span onclick="this.closest('div').parentElement.style.display='none'" style="cursor:pointer;font-weight:bold;">✖</span>
  </div>

  <div id="messages" style="height:200px;overflow:auto;padding:10px;font-size:14px;"></div>

  <div style="display:flex;">
    <input id="input" placeholder="Waar kunnen we je mee helpen?" style="flex:1;padding:8px;border:none;">
    <button id="sendBtn" style="padding:8px;">→</button>
  </div>
`;

  document.body.appendChild(chat);

  // === TOGGLE ===
  button.onclick = () => {
    chat.style.display = chat.style.display === "none" ? "block" : "none";
  };

  // === SEND MESSAGE ===
  async function sendMessage(text) {
    const messages = document.getElementById("messages");

    messages.innerHTML += `<div><b>Jij:</b> ${text}</div>`;

    try {
      const res = await fetch("https://castoton-ai-chatbot.onrender.com/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text })
      });

      const data = await res.json();
      messages.innerHTML += `<div><b>Philomela:</b> ${data.reply}</div>`;
    } catch (err) {
      messages.innerHTML += `<div style="color:red;">Verbinding mislukt</div>`;
    }

    messages.scrollTop = messages.scrollHeight;
  }

  // Make function available for buttons
  window.chatSend = sendMessage;

  // === INIT EVENTS ===
  setTimeout(() => {
    const input = document.getElementById("input");
    const sendBtn = document.getElementById("sendBtn");
    const closeBtn = document.getElementById("closeChat");

closeBtn.onclick = () => {
  chat.style.display = "none";
  / Clear messages (reset chat)
  const messages = document.getElementById("messages");
  messages.innerHTML = "";
};
    sendBtn.onclick = () => {
      if (!input.value) return;
      sendMessage(input.value);
      input.value = "";
    };

    input.addEventListener("keypress", (e) => {
      if (e.key === "Enter") sendBtn.click();
    });

    // === WELCOME MESSAGE WITH BUTTONS ===
    const messages = document.getElementById("messages");
    messages.innerHTML += `
      <div><b>Philomela:</b><br>
      Hoi! Waar kunnen we je mee helpen? 😊
      </div>

      <div style="margin-top:8px;">
        <button onclick="window.chatSend('concerten')">🎶 Concerten</button>
        <button onclick="window.chatSend('meedoen')">🤝 Meedoen</button>
        <button onclick="window.chatSend('agenda')">📅 Agenda</button>
        <button onclick="window.chatSend('contact')">💌 Contact</button>
      </div>
    `;

  }, 100);

})();
