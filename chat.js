(function () {

  const VERSION = "v0.920";

  // === CONVERSATION STATE — keyword shortcuts only fire on the first message ===
  let messageCount = 0;
  let userLabel = "Jij";           // switches on language selection
  let activeLang = "nl";           // "nl" | "en" | "fr"
  let awaitingConfirmation = false; // true after Aria offers handoff
  let history = [];                 // conversation history sent to backend (max 10 messages)

  // === SESSION ID — persists across page reloads so Aria remembers the conversation ===
  let sessionId = sessionStorage.getItem("philomela_session_id");
  if (!sessionId) {
    sessionId = "web-" + Math.random().toString(36).slice(2) + Date.now();
    sessionStorage.setItem("philomela_session_id", sessionId);
  }

  // === SAFE TEXT — prevents XSS by never injecting user content via innerHTML ===
  function safeText(str) {
    const div = document.createElement("div");
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  // === LINKIFY — converts URLs in Aria replies to clickable links (safe: applied after safeText) ===
  function linkify(str) {
    return safeText(str).replace(
      /(https?:\/\/[^\s<>"]+)/g,
      '<a href="$1" target="_blank" style="color:#2d4b8c;">$1</a>'
    );
  }

  function appendMessage(sender, htmlContent, isHTML) {
    const messages = document.getElementById("philo-messages");
    const div = document.createElement("div");
    div.style.marginBottom = "8px";
    if (isHTML) {
      // Our own hardcoded blocks with links
      div.innerHTML = `<b>${sender}:</b><br>${htmlContent}`;
    } else if (sender === "Philomela" || sender === "Aria") {
      // AI replies — safe text but with clickable URLs
      div.innerHTML = `<b>${safeText(sender)}:</b> ${linkify(htmlContent)}`;
    } else {
      // User messages — plain safe text only
      div.innerHTML = `<b>${safeText(sender)}:</b> ${safeText(htmlContent)}`;
    }
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
    height: "min(700px, calc(100vh - 120px))",
    background: "white",
    border: "1px solid #ccc",
    borderRadius: "10px",
    display: "none",
    zIndex: "9999",
    fontFamily: "Arial, sans-serif",
    boxShadow: "0 4px 16px rgba(0,0,0,0.15)"
  });

  chat.innerHTML = `
    <div style="background:#4a6fa5;color:white;padding:10px;border-radius:10px 10px 0 0;display:flex;justify-content:space-between;align-items:center;">
      <span>Philomela Chat <span style="font-size:11px;opacity:0.7;font-weight:normal;">${VERSION}</span></span>
      <span style="display:flex;align-items:center;gap:10px;">
        <span id="philo-reset" title="Nieuw gesprek" style="cursor:pointer;font-size:11px;color:white !important;border:1px solid rgba(255,255,255,0.6);border-radius:10px;padding:2px 7px;opacity:0.9;white-space:nowrap;">↺ Opnieuw</span>
        <span id="philo-close" style="cursor:pointer;font-weight:bold;font-size:18px;color:white !important;">✖</span>
      </span>
    </div>
    <div id="philo-messages" style="height:calc(100% - 110px);overflow:auto;padding:10px;font-size:14px;line-height:1.5;"></div>
    <div id="philo-typing" style="padding:0 10px 4px;font-size:12px;color:#999;display:none;">Aria typt...</div>
    <div style="display:flex;border-top:1px solid #eee;">
      <input id="philo-input" placeholder="Waar kunnen we je mee helpen?"
        style="flex:1;padding:8px;border:none;outline:none;font-size:14px;border-radius:0 0 0 10px;">
      <button id="philo-send" style="padding:8px 12px;background:#4a6fa5;color:white;border:none;border-radius:0 0 10px 0;cursor:pointer;font-size:16px;">→</button>
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

  document.getElementById("philo-reset").onclick = () => {
    const messages = document.getElementById("philo-messages");
    messages.innerHTML = "";
    reset(true);
    // Re-show welcome message and language buttons
    appendMessage("Philomela", `Hoi! Waar kunnen we je mee helpen? 😊<br>Je kunt vragen naar concerten, meedoen (meezingen in een koor), knuffelconcerten of contact.<br><br>Hi! How can we help you?<br>Ask about concerts, joining a choir, cuddle concerts or contact.`, true);
    const langDiv = document.createElement("div");
    langDiv.id = "philo-lang";
    langDiv.style.cssText = "padding:4px 10px 8px;display:flex;gap:8px;";
    ["🇳🇱 Nederlands", "🇬🇧 English"].forEach((label) => {
      const btn = document.createElement("button");
      btn.textContent = label;
      btn.style.cssText = `padding:4px 10px;font-size:12px;cursor:pointer;border:1px solid #4a6fa5;border-radius:12px;background:white;color:#4a6fa5;`;
      btn.onclick = () => { langDiv.remove(); sendMessage(label.includes("English") ? "English" : "Nederlands"); };
      langDiv.appendChild(btn);
    });
    messages.appendChild(langDiv);
    document.getElementById("philo-input").placeholder = "Waar kunnen we je mee helpen?";
  };

  // === SEND MESSAGE ===
  async function sendMessage(text) {
    if (!text.trim()) return;

    const input = document.getElementById("philo-input");
    const sendBtn = document.getElementById("philo-send");
    const typing = document.getElementById("philo-typing");
    const lower = text.toLowerCase().trim();

    // === CONFIRMATION HANDLER — client-side, no server state needed ===
    if (awaitingConfirmation) {
      const yes = ["ja", "graag", "ok", "prima", "yes", "oui", "yep", "sure"].some(w => lower.includes(w));
      const no  = ["nee", "niet", "hoeft niet", "no", "non", "nope"].some(w => lower.includes(w));

      const contactMsg = {
        nl: "Alle contactgegevens vind je op https://www.philomela.nl/contact/ — stuur gerust een e-mail en het team reageert zo snel mogelijk. Tot snel! 😊",
        en: "You can find all contact details at https://www.philomela.nl/contact/ — send an email and the team will get back to you as soon as possible. Speak soon! 😊",
        fr: "Tous les contacts sont sur https://www.philomela.nl/contact/ — envoie un e-mail et l'équipe te répondra dès que possible. À bientôt ! 😊"
      };
      const declineMsg = {
        nl: "Helemaal goed! Laat het gerust weten als je nog vragen hebt. 😊",
        en: "No problem at all! Feel free to ask if you have more questions. 😊",
        fr: "Pas de problème ! N'hésite pas si tu as d'autres questions. 😊"
      };

      if (yes) {
        appendMessage(userLabel, text);
        appendMessage("Philomela", contactMsg[activeLang] || contactMsg.nl);
        awaitingConfirmation = false;
        messageCount = 0;
        reset(true);
        return;
      } else if (no) {
        appendMessage(userLabel, text);
        appendMessage("Philomela", declineMsg[activeLang] || declineMsg.nl);
        awaitingConfirmation = false;
        messageCount = 0;
        reset(true);
        return;
      }
    }

    // === LANGUAGE SELECTION — hardcoded intro, no AI call, no user message shown ===
    const langIntros = {
      "nederlands": { reply: "Hoi! Ik ben Aria 😊 Bij Philomela kun je terecht voor concerten (zoals Amour), Jonge Zwaluwen (een muziekproject voor kinderen), Zwaluwkoor (samen zingen in een koor) en Knuffelconcerten (laagdrempelige interactieve concerten). Waar ben je nieuwsgierig naar?", placeholder: "Waar kunnen we je mee helpen?", label: "Jij", lang: "nl", reset: "↺ Opnieuw" },
      "english":    { reply: "Hi! I'm Aria 😊 At Philomela you can enjoy concerts (like Amour), Jonge Zwaluwen (a music project for children), Zwaluwkoor (a community singing choir), and Knuffelconcerten (cosy interactive concerts). What interests you most?", placeholder: "How can we help you?", label: "You", lang: "en", reset: "↺ Reset" },
      "français":   { reply: "Bonjour ! Je suis Aria 😊 Chez Philomela, vous trouverez des concerts (comme Amour), Jonge Zwaluwen (un projet musical pour enfants), Zwaluwkoor (un chœur communautaire) et des Knuffelconcerten (concerts interactifs et chaleureux). Qu'est-ce qui vous intéresse ?", placeholder: "Comment pouvons-nous vous aider ?", label: "Vous", lang: "fr", reset: "↺ Réinitialiser" },
      "frans":      { reply: "Bonjour ! Je suis Aria 😊 Chez Philomela, vous trouverez des concerts (comme Amour), Jonge Zwaluwen (un projet musical pour enfants), Zwaluwkoor (un chœur communautaire) et des Knuffelconcerten (concerts interactifs et chaleureux). Qu'est-ce qui vous intéresse ?", placeholder: "Comment pouvons-nous vous aider ?", label: "Vous", lang: "fr", reset: "↺ Réinitialiser" }
    };

    if (langIntros[lower]) {
      userLabel = langIntros[lower].label;
      activeLang = langIntros[lower].lang;
      document.getElementById("philo-reset").textContent = langIntros[lower].reset;
      appendMessage("Philomela", langIntros[lower].reply);
      document.getElementById("philo-input").placeholder = langIntros[lower].placeholder;
      input.disabled = false;
      sendBtn.disabled = false;
      return;
    }

    appendMessage(userLabel, text);
    input.disabled = true;
    sendBtn.disabled = true;
    messageCount++;

    // === KEYWORD SHORTCUTS — only on first message, not mid-conversation ===
    if (messageCount === 1 && (lower.includes("keuze") || lower.includes("mogelijk") || lower.includes("wat kan"))) {
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

    if (messageCount === 1 && lower.includes("zwaluw") && !lower.includes("zwaluwkoor") && !lower.includes("zwaluwen")) {
      const msg = {
        nl: "Bedoel je het Zwaluwkoor (samen zingen in een koor) of Jonge Zwaluwen (een muziekproject voor kinderen)?",
        en: "Are you asking about Zwaluwkoor (a community singing choir) or Jonge Zwaluwen (a music project for children)?",
        fr: "Tu parles du Zwaluwkoor (un chœur communautaire) ou de Jonge Zwaluwen (un projet musical pour enfants) ?"
      };
      appendMessage("Philomela", msg[activeLang] || msg.nl);
      reset(); return;
    }

    if (messageCount === 1 && lower.includes("knuffel")) {
      appendMessage("Philomela", `Onze knuffelconcerten bieden een warme en persoonlijke beleving:<br>
        <a href="https://www.philomela.nl/productie/dierenknuffelconcert/" target="_blank">🧸 Knuffelconcert</a>`, true);
      reset(); return;
    }

    if (messageCount === 1 && lower.includes("concert")) {
      appendMessage("Philomela", `Bekijk onze concerten:<br>
        <a href="https://www.philomela.nl/agenda" target="_blank">📅 Agenda</a>`, true);
      reset(); return;
    }

    if (messageCount === 1 && lower.includes("meedoen")) {
      appendMessage("Philomela", `Leuk dat je mee wilt doen!<br>
        <a href="https://www.philomela.nl/zwaluwkoren/" target="_blank">🤝 Zwaluwkoren</a>`, true);
      reset(); return;
    }

    if (messageCount === 1 && lower.includes("contact")) {
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
        body: JSON.stringify({ message: text, session_id: sessionId, language: activeLang, history: history.slice(-10) })
      });

      if (!res.ok) throw new Error(`Server error: ${res.status}`);

      const data = await res.json();
      appendMessage("Philomela", data.reply);

      // Store exchange in history
      history.push({ role: "user", content: text });
      history.push({ role: "assistant", content: data.reply });

      // Detect handoff offer in Aria's reply
      const handoffPhrases = ["contact met je opneemt", "contact opnemen", "benadert", "get in touch", "reach out", "te contacter", "te contacte"];
      if (handoffPhrases.some(p => data.reply.toLowerCase().includes(p))) {
        awaitingConfirmation = true;
      }

    } catch (err) {
      appendMessage("Philomela", "Verbinding mislukt. Probeer opnieuw.");
      console.error("[Philomela chat error]", err);
    }

    reset();
  }

  function reset(clearSession) {
    const input = document.getElementById("philo-input");
    const sendBtn = document.getElementById("philo-send");
    const typing = document.getElementById("philo-typing");
    input.disabled = false;
    sendBtn.disabled = false;
    typing.style.display = "none";
    input.focus();
    if (clearSession) { messageCount = 0; userLabel = "Jij"; activeLang = "nl"; awaitingConfirmation = false; history = []; }
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
  appendMessage("Philomela", `Hoi! Waar kunnen we je mee helpen? 😊<br>Je kunt vragen naar concerten, meedoen (meezingen in een koor), knuffelconcerten of contact.<br><br>Hi! How can we help you?<br>Ask about concerts, joining a choir, cuddle concerts or contact.`, true);

  // === LANGUAGE BUTTONS ===
  const langDiv = document.createElement("div");
  langDiv.id = "philo-lang";
  langDiv.style.cssText = "padding:4px 10px 8px;display:flex;gap:8px;";

  ["🇳🇱 Nederlands", "🇬🇧 English"].forEach((label) => {
    const btn = document.createElement("button");
    btn.textContent = label;
    btn.style.cssText = `
      padding:4px 10px;font-size:12px;cursor:pointer;
      border:1px solid #4a6fa5;border-radius:12px;
      background:white;color:#4a6fa5;
    `;
    btn.onclick = () => {
      const lang = label.includes("English") ? "English" : "Nederlands";
      langDiv.remove();
      sendMessage(lang);
    };
    langDiv.appendChild(btn);
  });

  document.getElementById("philo-messages").appendChild(langDiv);

})();
