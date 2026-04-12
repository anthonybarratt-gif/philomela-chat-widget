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
      <span onclick="this.closest('div').parentElement.style.display='none'" style="cursor:pointer;font-weight:bold;color:#ffffff !important;font-size:18px;">✖</span>
    </div>

    <div id="messages" style="height:360px;overflow:auto;padding:10px;font-size:14px;"></div>

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
    const lower = text.toLowerCase().trim();

    messages.innerHTML += `<div><b>Jij:</b> ${text}</div>`;

    // === KEUZES ===
    if (
      lower.includes("keuze") ||
      lower.includes("mogelijk") ||
      lower.includes("wat kan")
    ) {
      messages.innerHTML += `
        <div><b>Philomela:</b><br>
        Je kunt bijvoorbeeld kijken naar:<br><br>

        🎶 Concerten → <a href="https://www.philomela.nl/agenda" target="_blank">Agenda</a><br>
        ❤️ Amour → <a href="https://www.philomela.nl/productie/amour/" target="_blank">Amour</a><br>
        🐦 Jonge Zwaluwen → <a href="https://www.philomela.nl/productie/jonge-zwaluwen/" target="_blank">Jonge Zwaluwen</a><br>
        🤝 Zwaluwkoren → <a href="https://www.philomela.nl/zwaluwkoren/" target="_blank">Zwaluwkoren</a><br>
        🧸 Knuffelconcerten → <a href="https://www.philomela.nl/productie/dierenknuffelconcert/" target="_blank">Knuffelconcert</a><br>
        💌 Contact → <a href="https://www.philomela.nl/contact/" target="_blank">Contact</a><br>
        </div>
      `;
      messages.innerHTML += `<div><i>Wil je dat ik meer uitleg geef? 😊</i></div>`;
      return;
    }

    // === KNuffel eerst (belangrijk!) ===
    if (lower.includes("knuffel")) {
      messages.innerHTML += `<div><b>Philomela:</b><br>
      Onze knuffelconcerten bieden een warme en persoonlijke beleving:<br>
      <a href="https://www.philomela.nl/productie/dierenknuffelconcert/" target="_blank">🧸 Knuffelconcert</a>
      </div>`;
      messages.innerHTML += `<div><i>Wil je dat ik meer uitleg geef? 😊</i></div>`;
      return;
    }

    // === CONCERTEN ===
    if (lower.includes("concert")) {
      messages.innerHTML += `<div><b>Philomela:</b><br>
      Bekijk onze concerten:<br>
      <a href="https://www.philomela.nl/agenda" target="_blank">📅 Agenda</a>
      </div>`;
      messages.innerHTML += `<div><i>Wil je dat ik meer uitleg geef? 😊</i></div>`;
      return;
    }

    // === MEEDOEN ===
    if (lower.includes("meedoen")) {
      messages.innerHTML += `<div><b>Philomela:</b><br>
      Leuk dat je mee wilt doen!<br>
      <a href="https://www.philomela.nl/zwaluwkoren/" target="_blank">🤝 Zwaluwkoren</a>
      </div>`;
      messages.innerHTML += `<div><i>Wil je dat ik meer uitleg geef? 😊</i></div>`;
      return;
    }

    // === CONTACT ===
    if (lower.includes("contact")) {
      messages.innerHTML += `<div><b>Philomela:</b><br>
      Neem contact met ons op:<br>
      <a href="https://www.philomela.nl/contact/" target="_blank">💌 Contact</a>
      </div>`;
      messages.innerHTML += `<div><i>Wil je dat ik meer uitleg geef? 😊</i></div>`;
      return;
    }

    // === LADEN ===
    messages.innerHTML += `<div id="loading"><b>Philomela:</b> Even verbinden...</div>`;
    messages.scrollTop = messages.scrollHeight;

    // === AI BACKEND ===
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
        <b>Philomela:</b> Verbinding mislukt. Probeer opnieuw.
      </div>`;
    }

    messages.scrollTop = messages.scrollHeight;
  }

  // === GLOBAL ===
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

    messages.innerHTML += `
      <div><b>Philomela:</b><br>
      Hoi! Waar kunnen we je mee helpen? 😊<br><br>
      Je kunt vragen naar concerten, meedoen, knuffelconcerten of contact.
      </div>
    `;

  }, 100);

})();
