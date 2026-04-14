(function () {

  // === SESSION ID — persists across page reloads so Aria remembers the conversation ===
  let sessionId = sessionStorage.getItem("philomela_session_id");
  if (!sessionId) {
    sessionId = "web-" + Math.random().toString(36).slice(2) + Date.now();
    sessionStorage.setItem("philomela_session_id", sessionId);
  }

  // === SAFE TEXT — prevents XSS by never injecting user/AI content via innerHTML ===
  function safeText(str) {
    const div = document.createElement("div");
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  function appendMessage(sender, htmlContent, isHTML) {
    const messages = document.getElementById("philo-messages");
    const div = document.createElement("div");
    div.style.marginBottom = "8px";
    // isHTML is only true for our own hardcoded link blocks — never for user input or AI replies
    div.innerHTML = isHTML ? `<b>${sender}:</b><br>${htmlContent}` : `<b>${safeText(sender)}:</b> ${safeText(htmlContent)}`;
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
    return div;
  }

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
    zIndex: "9999",
    boxShadow: "0 2px 8px rgba(0,0,0,0.2)"
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
    fontFamily: "Arial, sans-serif",
    boxShadow: "0 4px 16px rgba(0,0,0,0.15)"
  });

  chat.innerHTML = `
    <div style="background:#2d4b8c;color:white;padding:10px;border-radius:10px 10px 0 0;display:flex;justify-content:space-between;align-items:center;">
      <span>Philomela Chat</span>
      <span id="philo-close" style="cursor:pointer;font-weight:bold;font-size:18px;">✖</span>
    </div>
    <div id="philo-messages" style="height:350px;overflow:auto;padding:10px;font-size:14px;line-height:1.5;"></div>
    <div id="philo-typing" style="padding:0 10px 4px;font-size:12px;color:#999;display:none;">Aria typt...</div>
    <div style="display:flex;border-top:1px solid #eee;">
      <input id="philo-input" placeholder="Waar kunnen we je mee helpen?"
        style="flex:1;padding:8px;border:none;outline:none;font-size:14px;border-radius:0 0 0 10px;">
      <button id="philo-send" style="padding:8px 12px;background:#2d4b8c;color:white;border:none;border-radius:0 0 10px 0;cursor:pointer;font-size:16px;">→</button>
    </div>
  `;

  document.body.appendChild(chat);

  // === TOGGLE ===
  button.onclick = () => {
    chat.style.display = chat.style.display === "none" ? "block" : "none";
  };
  document.getElementById("philo-close").onclick = () => {
    chat.style.display = "none";
  };

  // === SEND MESSAGE ===
  async function sendMessage(text) {
    if (!text.trim()) return;

    const input = document.getElementById("philo-input");
    const sendBtn = document.getElementById("philo-send");
    const typing = document.getElementById("philo-typing");
    const lower = text.toLowerCase().trim();

    appendMessage("Jij", text);
    input.disabled = true;
    sendBtn.disabled = true;

    // === KEYWORD SHORTCUTS — no AI call needed ===
    if (lower.includes("keuze") || lower.includes("mogelijk") || lower.includes("wat kan")) {
      appendMessage("Philomela", `
        Je kunt bijvoorbeeld kijken naar:<br><br>
        🎶 Concerten → <a href="https://www.philomela.nl/agenda" target="_blank">Agenda</a><br>
        ❤️ Amour → <a href="https://www.philomela.nl/productie/amour/" target="_blank">Amour</a><br>
        🐦 Jonge Zwaluwen → <a href="https://www.philomela.nl/productie/jonge-zwaluwen/" target="_blank">Jonge Zwaluwen</a><br>
        🤝 Zwaluwkoren → <a href="https://www.philomela.nl/zwaluwkoren/" target="_blank">Zwaluwkoren</a><br>
        🧸 Knuffelconcerten → <a href="https://www.philomela.nl/productie/dierenknuffelconcert/" target="_blank">Knuffelconcert</a><br>
        💌 Contact → <a href="https://www.philomela.nl/contact/" target="_blank">Contact</a>
      `, true);
      reset(); return;
    }

    if (lower.includes("knuffel")) {
      appendMessage("Philomela", `Onze knuffelconcerten bieden een warme en persoonlijke beleving:<br>
        <a href="https://www.philomela.nl/productie/dierenknuffelconcert/" target="_blank">🧸 Knuffelconcert</a>`, true);
      reset(); return;
    }

    if (lower.includes("concert")) {
      appendMessage("Philomela", `Bekijk onze concerten:<br>
        <a href="https://www.philomela.nl/agenda" target="_blank">📅 Agenda</a>`, true);
      reset(); return;
    }

    if (lower.includes("meedoen")) {
      appendMessage("Philomela", `Leuk dat je mee wilt doen!<br>
        <a href="https://www.philomela.nl/zwaluwkoren/" target="_blank">🤝 Zwaluwkoren</a>`, true);
      reset(); return;
    }

    if (lower.includes("contact")) {
      appendMessage("Philomela", `Neem contact met ons op:<br>
        <a href="https://www.philomela.nl/contact/" target="_blank">💌 Contact</a>`, true);
      reset(); return;
    }

    // === AI BACKEND ===
    typing.style.display = "block";

    try {
      const res = await fetch("https://castoton-ai-chatbot.onrender.com/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, session_id: sessionId })
      });

      if (!res.ok) throw new Error(`Server error: ${res.status}`);

      const data = await res.json();
      appendMessage("Philomela", data.reply);

    } catch (err) {
      appendMessage("Philomela", "Verbinding mislukt. Probeer opnieuw.");
      console.error("[Philomela chat error]", err);
    }

    reset();
  }

  function reset() {
    const input = document.getElementById("philo-input");
    const sendBtn = document.getElementById("philo-send");
    const typing = document.getElementById("philo-typing");
    input.disabled = false;
    sendBtn.disabled = false;
    typing.style.display = "none";
    input.focus();
  }

  // === WIRE UP SEND BUTTON + ENTER KEY ===
  const input = document.getElementById("philo-input");
  const sendBtn = document.getElementById("philo-send");

  sendBtn.onclick = () => {
    const text = input.value.trim();
    if (!text) return;
    input.value = "";
    sendMessage(text);
  };

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const text = input.value.trim();
      if (!text) return;
      input.value = "";
      sendMessage(text);
    }
  });

  // === WELCOME MESSAGE ===
  appendMessage("Philomela", `Hoi! Waar kunnen we je mee helpen? 😊\n\nJe kunt vragen naar concerten, meedoen, knuffelconcerten of contact.`);

})();
