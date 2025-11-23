let callTimerInterval = null;
let callSeconds = 0;

// ==== VARIABLES ====
let reconocimiento;
let escuchando = false;
let auto = false; // ← NUEVO: modo automático
let historial = [];
let emocionCliente = false;

// Para evitar que escuche mientras la IA habla
let iaHablando = false;

const clienteText = document.getElementById("clienteText");
const agenteText = document.getElementById("agenteText");
const logBox = document.getElementById("logBox");

// ========== INICIALIZAR STT ==========
function initSTT() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  reconocimiento = new SpeechRecognition();
  reconocimiento.lang = "es-PE";
  reconocimiento.interimResults = false;
  reconocimiento.continuous = false;

  reconocimiento.onresult = (e) => {
    const texto = e.results[0][0].transcript;
    agenteText.textContent = texto;
    historial.push("Agente: " + texto);
    log("Tú dijiste: " + texto);

    obtenerRespuestaIA(texto);
  };

  reconocimiento.onerror = (e) => {
    if (e.error === "no-speech") {
      log("❗ No se detectó voz");
    } else {
      log("❗ Error: " + e.error);
    }
    escuchando = false;
  };

  reconocimiento.onend = () => {
    if (auto && !iaHablando) {
      // En modo automático vuelve a escuchar
      startSTT();
    }
  };
}

initSTT();

// ========== START STT ==========
function startSTT() {
  if (iaHablando) return; // no escuchar mientras IA habla

  try {
    reconocimiento.start();
    escuchando = true;
    log("🎙 Escuchando…");
  } catch { }
}

// ========== TTS CLIENTE ==========
function hablarCliente(texto) {
  iaHablando = true;

  return new Promise(resolve => {
    const msg = new SpeechSynthesisUtterance(texto);
    msg.lang = "es-PE";

    msg.onend = () => {
      iaHablando = false;
      resolve();
    };

    window.speechSynthesis.speak(msg);
  });
}

// ========== PETICIÓN A OLLAMA ==========
async function obtenerRespuestaIA(mensajeAgente) {
  const res = await fetch("http://localhost:3000/mensaje", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mensaje: mensajeAgente })
  });

  const data = await res.json();
  const respuesta = data.respuesta;

  clienteText.textContent = respuesta;

  await hablarCliente(respuesta);

  historial.push("Cliente: " + respuesta);
  log("Cliente responde: " + respuesta);

  // En modo automático → volver a escuchar
  if (auto) startSTT();
}

// ========== BOTÓN MANUAL ==========
document.getElementById("btnListen").addEventListener("click", () => {
  auto = false;
  startSTT();
});

// ========== BOTÓN AUTOMÁTICO ==========
document.getElementById("btnAutoListen").addEventListener("click", () => {
  auto = true;
  startSTT();
  log("🔁 Modo automático activado");
});

// ========== RINGTONE ==========
const ringtone = new Audio("https://actions.google.com/sounds/v1/alarms/phone_alerts_and_rings.ogg");

document.getElementById("btnPlayRing").addEventListener("click", () => ringtone.play());
document.getElementById("btnStopRing").addEventListener("click", () => ringtone.pause());

// ========== INICIAR LLAMADA ==========
document.getElementById("btnStartCall").addEventListener("click", () => {
  const num = document.getElementById("simNumber").value || "Número desconocido";
  document.getElementById("callerNumber").textContent = num;
  document.getElementById("callerScenario").textContent = "Cliente llamando...";
  document.getElementById("callUI").classList.remove("hidden");

  ringtone.play();
});

// ========== ACEPTAR ==========
document.getElementById("btnAccept").addEventListener("click", () => {
  ringtone.pause();
  document.getElementById("inCall").classList.remove("hidden");

  // Reiniciar timer
  callSeconds = 0;
  document.getElementById("callTimer").textContent = "00:00";

  // Iniciar conteo
  callTimerInterval = setInterval(actualizarTimer, 1000);

  primerMensajeCliente();
});


function primerMensajeCliente() {
  historial = [];
  obtenerRespuestaIA("Hola, dígame cuál es el motivo de su llamada.");
}

// ========== COLGAR ==========
document.getElementById("btnHangup").addEventListener("click", () => {
  clearInterval(callTimerInterval);
  window.location.reload();
});


// ========== LOG ==========
function log(msg) {
  const p = document.createElement("div");
  p.textContent = msg;
  logBox.appendChild(p);
  logBox.scrollTop = logBox.scrollHeight;
}

function actualizarTimer() {
  callSeconds++;
  const minutos = String(Math.floor(callSeconds / 60)).padStart(2, "0");
  const segundos = String(callSeconds % 60).padStart(2, "0");
  document.getElementById("callTimer").textContent = `${minutos}:${segundos}`;
}

