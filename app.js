// ==========================================
// BAC BO ANALYZER - VERSÃO AUTOMÁTICA
// ==========================================

const STORAGE_KEY = "bacbo_results_auto_v1";

let results = [];

// ==========================================
// INICIAR
// ==========================================

document.addEventListener("DOMContentLoaded", () => {
    loadResults();
    updateApp();
});

// ==========================================
// CARREGAR HISTÓRICO
// ==========================================

function loadResults() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);

        if (saved) {
            const data = JSON.parse(saved);

            if (Array.isArray(data)) {
                results = data.filter(
                    r => r === "P" || r === "B" || r === "E"
                );
            }
        }
    } catch (error) {
        results = [];
    }
}

// ==========================================
// GUARDAR
// ==========================================

function saveResults() {
    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(results)
    );
}

// ==========================================
// ADICIONAR RESULTADO
// ==========================================

function addResult(result) {

    if (!["P", "B", "E"].includes(result)) {
        return;
    }

    results.push(result);

    // Mantém no máximo 500 resultados
    if (results.length > 500) {
        results.shift();
    }

    saveResults();

    // Atualização imediata
    updateApp();

    // Vibração no Android
    if (navigator.vibrate) {
        navigator.vibrate(40);
    }
}

// ==========================================
// DESFAZER
// ==========================================

function undoResult() {

    if (results.length === 0) {
        return;
    }

    results.pop();

    saveResults();
    updateApp();
}

// ==========================================
// LIMPAR
// ==========================================

function clearHistory() {

    if (results.length === 0) {
        return;
    }

    if (!confirm("Apagar todo o histórico?")) {
        return;
    }

    results = [];

    saveResults();
    updateApp();
}

// ==========================================
// ESTATÍSTICAS GERAIS
// ==========================================

function getStats() {

    const total = results.length;

    const P = results.filter(r => r === "P").length;
    const B = results.filter(r => r === "B").length;
    const E = results.filter(r => r === "E").length;

    const decisions = P + B;

    return {
        total,
        P,
        B,
        E,
        playerPercent:
            decisions > 0 ? (P / decisions) * 100 : 0,
        bankerPercent:
            decisions > 0 ? (B / decisions) * 100 : 0
    };
}

// ==========================================
// ÚLTIMOS RESULTADOS
// ==========================================

function getRecent(amount = 12) {
    return results.slice(-amount);
}

// ==========================================
// CONTAGEM RECENTE
// ==========================================

function getRecentStats() {

    const recent = getRecent(12);

    const P = recent.filter(r => r === "P").length;
    const B = recent.filter(r => r === "B").length;
    const E = recent.filter(r => r === "E").length;

    return {
        P,
        B,
        E,
        total: recent.length
    };
}

// ==========================================
// SEQUÊNCIA ATUAL
// ==========================================

function getCurrentStreak() {

    if (results.length === 0) {
        return {
            result: null,
            count: 0
        };
    }

    const last =
        results[results.length - 1];

    let count = 0;

    for (
        let i = results.length - 1;
        i >= 0;
        i--
    ) {

        if (results[i] === last) {
            count++;
        } else {
            break;
        }
    }

    return {
        result: last,
        count
    };
}

// ==========================================
// ANÁLISE DE ALTERNÂNCIA
// ==========================================

function alternationScore() {

    const recent = getRecent(10);

    if (recent.length < 4) {
        return 0;
    }

    let changes = 0;
    let valid = 0;

    for (let i = 1; i < recent.length; i++) {

        if (
            recent[i] === "E" ||
            recent[i - 1] === "E"
        ) {
            continue;
        }

        valid++;

        if (recent[i] !== recent[i - 1]) {
            changes++;
        }
    }

    if (valid === 0) {
        return 0;
    }

    return changes / valid;
}

// ==========================================
// ANÁLISE PRINCIPAL
// ==========================================

function calculateSignal() {

    if (results.length < 8) {

        return {
            signal: "AGUARDANDO",
            confidence: 0,
            reason:
                "Introduza pelo menos 8 resultados."
        };
    }

    const recent = getRecentStats();
    const streak = getCurrentStreak();
    const alternation = alternationScore();

    const decisions = recent.P + recent.B;

    if (decisions === 0) {

        return {
            signal: "SEM SINAL",
            confidence: 0,
            reason: "Não existem resultados suficientes."
        };
    }

    const playerRate =
        recent.P / decisions;

    const bankerRate =
        recent.B / decisions;

    // --------------------------------------
    // PONTUAÇÃO
    // --------------------------------------

    let playerScore = 0;
    let bankerScore = 0;

    // Frequência recente
    playerScore += playerRate * 50;
    bankerScore += bankerRate * 50;

    // Histórico geral
    const stats = getStats();

    playerScore +=
        (stats.playerPercent / 100) * 20;

    bankerScore +=
        (stats.bankerPercent / 100) * 20;

    // --------------------------------------
    // Alternância
    // --------------------------------------

    if (
        alternation >= 0.65 &&
        streak.result !== "E"
    ) {

        if (streak.result === "P") {
            bankerScore += 10;
        }

        if (streak.result === "B") {
            playerScore += 10;
        }
    }

    // --------------------------------------
    // SEQUÊNCIA
    // --------------------------------------

    if (streak.result === "P") {
        playerScore += Math.min(streak.count * 2, 8);
    }

    if (streak.result === "B") {
        bankerScore += Math.min(streak.count * 2, 8);
    }

    // --------------------------------------
    // RESULTADO
    // --------------------------------------

    const difference =
        Math.abs(playerScore - bankerScore);

    let signal;
    let confidence;

    if (difference < 4) {

        signal = "SEM SINAL";
        confidence = 0;

    } else if (playerScore > bankerScore) {

        signal = "PLAYER";
        confidence =
            Math.min(95, Math.round(
                50 + difference
            ));

    } else {

        signal = "BANKER";
        confidence =
            Math.min(95, Math.round(
                50 + difference
            ));
    }

    let reason =
        "Análise baseada nos últimos " +
        recent.total +
        " resultados.";

    if (streak.count >= 3) {
        reason +=
            " Sequência atual: " +
            streak.result +
            " × " +
            streak.count +
            ".";
    }

    return {
        signal,
        confidence,
        reason
    };
}

// ==========================================
// ATUALIZAR SINAL
// ==========================================

function renderSignal() {

    const signalElement =
        document.getElementById("signal");

    const confidenceElement =
        document.getElementById("confidence");

    if (!signalElement || !confidenceElement) {
        return;
    }

    const data = calculateSignal();

    signalElement.textContent =
        data.signal;

    if (data.signal === "AGUARDANDO") {

        confidenceElement.textContent =
            data.reason;

    } else if (data.signal === "SEM SINAL") {

        confidenceElement.textContent =
            "Mercado estatisticamente equilibrado. " +
            data.reason;

    } else {

        confidenceElement.textContent =
            "Força estatística: " +
            data.confidence +
            "% • " +
            data.reason;
    }
}

// ==========================================
// ATUALIZAR ESTATÍSTICAS
// ==========================================

function renderStats() {

    const stats = getStats();

    const total =
        document.getElementById("total");

    const player =
        document.getElementById("playerCount");

    const banker =
        document.getElementById("bankerCount");

    const tie =
        document.getElementById("tieCount");

    const playerPercent =
        document.getElementById("playerPercent");

    const bankerPercent =
        document.getElementById("bankerPercent");

    if (total)
        total.textContent = stats.total;

    if (player)
        player.textContent = stats.P;

    if (banker)
        banker.textContent = stats.B;

    if (tie)
        tie.textContent = stats.E;

    if (playerPercent)
        playerPercent.textContent =
            stats.playerPercent.toFixed(1) + "%";

    if (bankerPercent)
        bankerPercent.textContent =
            stats.bankerPercent.toFixed(1) + "%";
}

// ==========================================
// HISTÓRICO VISUAL
// ==========================================

function renderHistory() {

    const container =
        document.getElementById("history");

    if (!container) {
        return;
    }

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

    [...results]
        .reverse()
        .forEach(result => {

            const ball =
                document.createElement("div");

            ball.className =
                "ball ball-" + result;

            ball.textContent = result;

            container.appendChild(ball);
        });
}

// ==========================================
// SEQUÊNCIA
// ==========================================

function renderSequence() {

    const element =
        document.getElementById("sequence");

    if (!element) {
        return;
    }

    const streak =
        getCurrentStreak();

    if (!streak.result) {
        element.textContent = "—";
        return;
    }

    let name = streak.result;

    if (name === "P") name = "PLAYER";
    if (name === "B") name = "BANKER";
    if (name === "E") name = "EMPATE";

    element.textContent =
        name + " × " + streak.count;
}

// ==========================================
// ÚLTIMOS 10/12
// ==========================================

function renderRecentStats() {

    const element =
        document.getElementById("recentStats");

    if (!element) {
        return;
    }

    const recent =
        getRecentStats();

    if (recent.total === 0) {
        element.textContent = "—";
        return;
    }

    element.textContent =
        "P: " + recent.P +
        "  |  B: " + recent.B +
        "  |  E: " + recent.E;
}

// ==========================================
// ATUALIZAÇÃO COMPLETA
// ==========================================

function updateApp() {

    renderHistory();
    renderStats();
    renderSequence();
    renderRecentStats();
    renderSignal();
}

// ==========================================
// ATUALIZAÇÃO AUTOMÁTICA DA INTERFACE
// ==========================================

// Verifica periodicamente se os dados foram
// alterados noutra aba/janela.

setInterval(() => {
    updateApp();
}, 1000);

// ==========================================
// TECLADO
// ==========================================

document.addEventListener("keydown", event => {

    if (event.key.toLowerCase() === "p") {
        addResult("P");
    }

    if (event.key.toLowerCase() === "b") {
        addResult("B");
    }

    if (event.key.toLowerCase() === "e") {
        addResult("E");
    }

    if (event.key === "Backspace") {
        undoResult();
    }
});

// ==========================================
// SEGURANÇA
// ==========================================

window.addResult = addResult;
window.undoResult = undoResult;
window.clearHistory = clearHistory;
