(function () {

  // === CREATE CHAT BUTTON ===
  const button = document.createElement("div");
  button.innerHTML = "💬";
  Object.assign(button.style, {
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
  document.body.appendChild(button);

  // === CREATE CHAT BOX ===
  const chat = document.createElement("div");
  Object.assign(chat.style, {
    position: "fixed",
    bottom: "80px",
    right: "20px",
    width: "360px",
    height: "460px",
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
      <span onclick="this.closest('div').parentElement.style.display='none'" style="cursor:pointer;font-weight:bold;color:#ffffff;font-size:18px;">✖</span>
    </div>

    <div id="messages" style="height:360px;overflow:auto;padding:10px;font-size:14px;"></div>

    <div style="display:flex;">
      <input id="input" placeholder="Waar kunnen we je mee helpen? / How can we help you?" style="flex:1;padding:8px;border:none;">
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
    const lower = text.toLowerCase().trim();

    messages.innerHTML += `<div><b>Jij:</b> ${text}</div>`;

    // === SMART OPTIONS ===
    if (
      lower.includes("choice") ||
      lower.includes("option") ||
      lower.includes("mogelijk") ||
      lower.includes("wat kan") ||
      lower.includes("what can")
    ) {
      messages.innerHTML += `
        <div><b>Philomela:</b><br>
        Here are some things you can explore:<br><br>

        🎶 Concerts → <a href="https://www.philomela.nl/agenda" target="_blank">Agenda</a><br>
        🤝 Join a choir → <a href="https://www.philomela.nl/zwaluwkoren/" target="_blank">Meedoen</a><br>
        💌 Contact → <a href="https://www.philomela.nl/contact/" target="_blank">Contact</a><br><br>

        <i>Je kunt ook vragen naar concerten, meedoen of contact 😊</i>
        </div>
      `;
      return;
    }

    // === QUICK RESPONSES ===
    if (lower.includes("concert")) {
      messages.innerHTML += `<div><b>Philomela:</b><br>
      Bekijk onze concerten:<br>
      <a href="https://www.philomela.nl/agenda" target="_blank">📅 Agenda</a>
      </div>`;
      return;
    }

    if (lower.includes("meedoen") || lower.includes("join")) {
      messages.innerHTML += `<div><b>Philomela:</b><br>
      Leuk dat je mee wilt doen!<br>
      <a href="https://www.philomela.nl/zwaluwkoren/" target="_blank">🤝 Meedoen</a>
      </div>`;
      return;
    }

    if (lower.includes("contact")) {
      messages.innerHTML += `<div><b>Philomela:</b><br>
      Neem contact met ons op:<br>
      <a href="https://www.philomela.nl/contact/" target="_blank">💌 Contact</a>
      </div>`;
      return;
    }

    // === LOADING MESSAGE ===
    messages.innerHTML += `<div id="loading"><b>Philomela:</b> Even verbinden... / Connecting...</div>`;
    messages.scrollTop = messages.scrollHeight;

    // === BACKEND CALL ===
    try {
      const res = await fetch("https://castoton-ai-chatbot.onrender.com/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text })
      });

      const data = await res.json();

      const loading = document.getElementById("loading");
      if (loading) loading.remove();

      messages.innerHTML += `<div><b>Philomela:</b> ${data.reply}</div>`;
    } catch (err) {
      const loading = document.getElementById("loading");
      if (loading) loading.remove();

      messages.innerHTML += `<div style="color:red;">
        <b>Philomela:</b> Verbinding mislukt. Probeer opnieuw.<br>
        <i>Connection failed. Please try again.</i>
      </div>`;
    }

    messages.scrollTop = messages.scrollHeight;
  }

  // Expose globally
  window.chatSend = sendMessage;

  // === INIT ===
  setTimeout(() => {
    const input = document.getElementById("input");
    const sendBtn = document.getElementById("sendBtn");
    const messages = document.getElementById("messages");

    sendBtn.onclick = () => {
      if (!input.value) return;
      sendMessage(input.value);
      input.value = "";
    };

    input.addEventListener("keypress", (e) => {
      if (e.key === "Enter") sendBtn.click();
    });

    // === WELCOME MESSAGE ===
    messages.innerHTML += `
      <div><b>Philomela:</b><br>
      Hoi! Waar kunnen we je mee helpen? 😊<br>
      <i>Hi! How can we help you?</i><br><br>
      Je kunt vragen naar concerten, meedoen of contact.<br>
      <i>You can ask about concerts, joining or contact.</i>
      </div>
    `;

  }, 100);

})();
