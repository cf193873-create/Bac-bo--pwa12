// ==========================================
// BAC BO ANALYZER
// app.js
// ==========================================

let results = [];

const STORAGE_KEY = "bacbo_results_v2";

// ------------------------------------------
// CARREGAR DADOS
// ------------------------------------------

function loadResults() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (saved) {
      const parsed = JSON.parse(saved);

      if (Array.isArray(parsed)) {
        results = parsed.filter(x =>
          x === "P" || x === "B" || x === "E"
        );
      }
    }
  } catch (error) {
    results = [];
  }

  updateApp();
}

// ------------------------------------------
// GUARDAR DADOS
// ------------------------------------------

function saveResults() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(results)
  );
}

// ------------------------------------------
// ADICIONAR RESULTADO
// ------------------------------------------

function addResult(result) {

  if (!["P", "B", "E"].includes(result)) {
    return;
  }

  results.push(result);

  saveResults();
  updateApp();

  if (navigator.vibrate) {
    navigator.vibrate(30);
  }
}

// ------------------------------------------
// DESFAZER
// ------------------------------------------

function undoResult() {

  if (results.length === 0) {
    return;
  }

  results.pop();

  saveResults();
  updateApp();
}

// ------------------------------------------
// LIMPAR
// ------------------------------------------

function clearHistory() {

  if (results.length === 0) {
    return;
  }

  const confirmClear = confirm(
    "Deseja apagar todo o histórico?"
  );

  if (!confirmClear) {
    return;
  }

  results = [];

  saveResults();
  updateApp();
}

// ------------------------------------------
// ESTATÍSTICAS
// ------------------------------------------

function calculateStats() {

  const total = results.length;

  const player = results.filter(x => x === "P").length;
  const banker = results.filter(x => x === "B").length;
  const tie = results.filter(x => x === "E").length;

  const playerPercent =
    total > 0
      ? ((player / total) * 100).toFixed(1)
      : "0.0";

  const bankerPercent =
    total > 0
      ? ((banker / total) * 100).toFixed(1)
      : "0.0";

  return {
    total,
    player,
    banker,
    tie,
    playerPercent,
    bankerPercent
  };
}

// ------------------------------------------
// SEQUÊNCIA ATUAL
// ------------------------------------------

function getCurrentSequence() {

  if (results.length === 0) {
    return {
      value: "—",
      count: 0
    };
  }

  const last = results[results.length - 1];

  let count = 0;

  for (let i = results.length - 1; i >= 0; i--) {

    if (results[i] === last) {
      count++;
    } else {
      break;
    }
  }

  return {
    value: last,
    count
  };
}

// ------------------------------------------
// ANÁLISE DOS ÚLTIMOS RESULTADOS
// ------------------------------------------

function analyzeRecent() {

  if (results.length < 5) {
    return {
      signal: "AGUARDANDO",
      confidence: "Introduza pelo menos 5 resultados."
    };
  }

  const recent = results.slice(-10);

  let player = 0;
  let banker = 0;
  let tie = 0;

  recent.forEach(result => {

    if (result === "P") player++;
    if (result === "B") banker++;
    if (result === "E") tie++;

  });

  // Empates não entram diretamente na escolha P/B.
  const decisions = player + banker;

  if (decisions === 0) {
    return {
      signal: "AGUARDANDO",
      confidence: "Poucos dados úteis."
    };
  }

  const playerRate = player / decisions;
  const bankerRate = banker / decisions;

  // --------------------------------------
  // SINAL BASEADO EM FREQUÊNCIA RECENTE
  // --------------------------------------

  if (playerRate > bankerRate) {

    const difference =
      Math.round((playerRate - bankerRate) * 100);

    return {
      signal: "PLAYER",
      confidence:
        "Vantagem estatística recente: " +
        difference +
        " pontos percentuais"
    };

  } else if (bankerRate > playerRate) {

    const difference =
      Math.round((bankerRate - playerRate) * 100);

    return {
      signal: "BANKER",
      confidence:
        "Vantagem estatística recente: " +
        difference +
        " pontos percentuais"
    };

  }

  return {
    signal: "SEM SINAL",
    confidence: "Frequências recentes equilibradas."
  };
}

// ------------------------------------------
// HISTÓRICO VISUAL
// ------------------------------------------

function renderHistory() {

  const container =
    document.getElementById("history");

  container.innerHTML = "";

  if (results.length === 0) {

    const empty =
      document.createElement("span");

    empty.className = "empty";
    empty.textContent =
      "Ainda não existem resultados.";

    container.appendChild(empty);

    return;
  }

  // Mostrar os resultados mais recentes primeiro
  const displayResults =
    [...results].reverse();

  displayResults.forEach(result => {

    const ball =
      document.createElement("div");

    ball.className =
      "ball ball-" + result;

    ball.textContent = result;

    container.appendChild(ball);

  });
}

// ------------------------------------------
// SEQUÊNCIA
// ------------------------------------------

function renderSequence() {

  const element =
    document.getElementById("sequence");

  const sequence =
    getCurrentSequence();

  if (sequence.count === 0) {
    element.textContent = "—";
    return;
  }

  let name = sequence.value;

  if (name === "P") name = "PLAYER";
  if (name === "B") name = "BANKER";
  if (name === "E") name = "EMPATE";

  element.textContent =
    name + " × " + sequence.count;
}

// ------------------------------------------
// ESTATÍSTICAS RECENTES
// ------------------------------------------

function renderRecentStats() {

  const element =
    document.getElementById("recentStats");

  const recent =
    results.slice(-10);

  if (recent.length === 0) {
    element.textContent = "—";
    return;
  }

  const player =
    recent.filter(x => x === "P").length;

  const banker =
    recent.filter(x => x === "B").length;

  const tie =
    recent.filter(x => x === "E").length;

  element.textContent =
    "P: " + player +
    "  |  B: " + banker +
    "  |  E: " + tie;
}

// ------------------------------------------
// ATUALIZAR SINAL
// ------------------------------------------

function renderSignal() {

  const signalElement =
    document.getElementById("signal");

  const confidenceElement =
    document.getElementById("confidence");

  const analysis =
    analyzeRecent();

  signalElement.textContent =
    analysis.signal;

  confidenceElement.textContent =
    analysis.confidence;
}

// ------------------------------------------
// ATUALIZAR ESTATÍSTICAS
// ------------------------------------------

function renderStats() {

  const stats =
    calculateStats();

  document.getElementById("total")
    .textContent = stats.total;

  document.getElementById("playerCount")
    .textContent = stats.player;

  document.getElementById("bankerCount")
    .textContent = stats.banker;

  document.getElementById("tieCount")
    .textContent = stats.tie;

  document.getElementById("playerPercent")
    .textContent = stats.playerPercent + "%";

  document.getElementById("bankerPercent")
    .textContent = stats.bankerPercent + "%";
}

// ------------------------------------------
// ATUALIZAR APLICAÇÃO
// ------------------------------------------

function updateApp() {

  renderHistory();

  renderStats();

  renderSequence();

  renderRecentStats();

  renderSignal();
}

// ------------------------------------------
// INICIAR
// ------------------------------------------

document.addEventListener(
  "DOMContentLoaded",
  loadResults
);
