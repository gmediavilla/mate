const TOTAL_PAIRS = 8;
const HIDDEN_COUNT = 6;
const MAX_PRODUCT = 1000;

const board = document.getElementById("board");
const trayRow = document.getElementById("trayRow");
const btnNuevo = document.getElementById("btnNuevo");
const btnComprobar = document.getElementById("btnComprobar");
const winModal = document.getElementById("winModal");
const btnNuevoModal = document.getElementById("btnNuevoModal");

let pairs = [];
let baseNumbers = [];
let trayNumbers = [];
let gridData = [];
let lockedNumbers = new Set();

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
}

function clearSelection() {
  document.querySelectorAll(".trayItem").forEach(x => x.classList.remove("selected"));
}

function clearCellColors() {
  document.querySelectorAll(".cell").forEach(c => c.classList.remove("ok", "bad"));
}

function lockCell(cell) {
  cell.classList.add("locked");
  cell.querySelectorAll(".opBtn").forEach(b => (b.disabled = true));
  cell.querySelectorAll(".slot").forEach(s => s.classList.add("lockedSlot"));
}

function generatePairs() {
  const used = new Set();
  const sums = new Set();
  const prods = new Set();
  const res = [];

  while (res.length < TOTAL_PAIRS) {
    const a = Math.floor(Math.random() * 80) + 1;
    const b = Math.floor(Math.random() * 80) + 1;

    if (a === b) continue;
    if (used.has(a) || used.has(b)) continue;

    const s = a + b;
    const p = a * b;

    if (p > MAX_PRODUCT) continue;
    if (sums.has(s) || prods.has(p)) continue;

    used.add(a);
    used.add(b);
    sums.add(s);
    prods.add(p);

    res.push({ a, b });
  }

  return res;
}

function newGame() {
  board.innerHTML = "";
  trayRow.innerHTML = "";
  lockedNumbers.clear();            // ✅ SOLO ACÁ se limpia (nueva partida)
  clearCellColors();
  clearSelection();
  if (winModal) winModal.style.display = "none";

  pairs = generatePairs();

  baseNumbers = [];
  gridData = [];

  pairs.forEach(p => {
    baseNumbers.push(p.a, p.b);
    gridData.push({ value: p.a + p.b });
    gridData.push({ value: p.a * p.b });
  });

  baseNumbers.sort((a, b) => a - b);
  shuffle(gridData);

  trayNumbers = [...baseNumbers];
  const idxs = [...Array(16).keys()];
  shuffle(idxs);
  idxs.slice(0, HIDDEN_COUNT).forEach(i => (trayNumbers[i] = null));

  gridData.forEach(c => board.appendChild(createCell(c.value)));
  renderTray();
}

function renderTray() {
  trayRow.innerHTML = "";

  trayNumbers.forEach((v, i) => {
    if (v === null) {
      const box = document.createElement("div");
      box.className = "trayItem";

      const inp = document.createElement("input");
      inp.className = "trayInput";
      inp.inputMode = "numeric";
      inp.placeholder = "—";

      inp.oninput = () => {
        const n = Number(inp.value);
        if (n === baseNumbers[i]) {
          trayNumbers[i] = n;
          renderTray();
        }
      };

      box.appendChild(inp);
      trayRow.appendChild(box);
    } else {
      const el = document.createElement("div");
      el.className = "trayItem";
      el.textContent = v;

      if (lockedNumbers.has(v)) el.classList.add("used");

      el.onclick = () => {
        if (lockedNumbers.has(v)) return;
        clearSelection();
        el.classList.add("selected");
        el.dataset.value = v;
      };

      trayRow.appendChild(el);
    }
  });
}

function createCell(value) {
  const cell = document.createElement("div");
  cell.className = "cell";

  const big = document.createElement("div");
  big.className = "bigNumber";
  big.textContent = value;

  const ops = document.createElement("div");
  ops.className = "opPicker";

  const b1 = document.createElement("button");
  const b2 = document.createElement("button");
  b1.textContent = "+";
  b2.textContent = "×";
  b1.className = b2.className = "opBtn";

  b1.onclick = () => {
    if (cell.classList.contains("locked")) return;
    clearCellColors();
    cell.dataset.op = "+";
    b1.classList.add("selected");
    b2.classList.remove("selected");
  };

  b2.onclick = () => {
    if (cell.classList.contains("locked")) return;
    clearCellColors();
    cell.dataset.op = "×";
    b2.classList.add("selected");
    b1.classList.remove("selected");
  };

  ops.append(b1, b2);

  const slots = document.createElement("div");
  slots.className = "slots";

  for (let i = 0; i < 2; i++) {
    const s = document.createElement("div");
    s.className = "slot";
    s.onclick = () => onSlotClick(s);
    slots.appendChild(s);
  }

  cell.append(big, ops, slots);
  return cell;
}

function onSlotClick(slot) {
  const cell = slot.closest(".cell");
  if (cell && cell.classList.contains("locked")) return;

  clearCellColors();

  if (slot.textContent !== "") {
    slot.textContent = "";
    delete slot.dataset.value;
    return;
  }

  const sel = document.querySelector(".trayItem.selected");
  if (!sel) return;

  slot.textContent = sel.dataset.value;
  slot.dataset.value = sel.dataset.value;
  sel.classList.remove("selected");
}

function validate() {
  clearCellColors();
  // ❌ NO limpiar lockedNumbers acá
  // lockedNumbers.clear();

  const map = {};

  document.querySelectorAll(".cell").forEach(cell => {
    if (cell.classList.contains("locked")) return;

    const op = cell.dataset.op;
    const s = cell.querySelectorAll(".slot");
    const a = Number(s[0].dataset.value);
    const b = Number(s[1].dataset.value);
    if (!op || isNaN(a) || isNaN(b)) return;

    const k = [a, b].sort((x, y) => x - y).join("-");
    if (!map[k]) map[k] = {};
    map[k][op] = cell;
  });

  Object.values(map).forEach(p => {
    if (!p["+"] || !p["×"]) return;

    const s = p["+"].querySelectorAll(".slot");
    const a = Number(s[0].dataset.value);
    const b = Number(s[1].dataset.value);

    const sumOK = a + b === Number(p["+"].querySelector(".bigNumber").textContent);
    const mulOK = a * b === Number(p["×"].querySelector(".bigNumber").textContent);

    if (sumOK && mulOK) {
      p["+"].classList.add("ok");
      p["×"].classList.add("ok");

      lockCell(p["+"]);
      lockCell(p["×"]);

      lockedNumbers.add(a);
      lockedNumbers.add(b);
    } else {
      p["+"].classList.add("bad");
      p["×"].classList.add("bad");
    }
  });

  clearSelection();
  renderTray();

  const lockedCells = document.querySelectorAll(".cell.locked").length;
  const allSolved = lockedCells === 16;
  const trayComplete = !trayNumbers.includes(null);

  if (allSolved && trayComplete) {
    if (winModal) winModal.style.display = "flex";
  }
}

btnNuevo.onclick = newGame;
btnComprobar.onclick = validate;

if (btnNuevoModal) btnNuevoModal.onclick = newGame;

newGame();
