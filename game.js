"use strict";

const { levels, chapters } = globalThis.AtlasLevels;
const { trace, solve, colors, colorValues } = globalThis.AtlasOptics;
const main = document.getElementById("game");
const dialog = document.getElementById("dialog");
const dialogContent = document.getElementById("dialog-content");
const announce = document.getElementById("announce");
const storageKey = "light-atlas/v1";
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
const arrows = ["↑", "→", "↓", "←"];
const directionNames = ["вверх", "вправо", "вниз", "влево"];
const colorRecipes = [
  "Выбери хотя бы одну лампу.", "Горит красная лампа.", "Горит зелёная лампа.",
  "Красный + зелёный = жёлтый.", "Горит синяя лампа.", "Красный + синий = пурпурный.",
  "Зелёный + синий = голубой.", "Красный + зелёный + синий = белый.",
];

function load() {
  try {
    const stored = JSON.parse(localStorage.getItem(storageKey));
    if (stored && typeof stored.records === "object" && stored.records) return stored;
  } catch {
    // A browser may disable storage for local files.
  }
  return { records: {}, drafts: {}, last: 0 };
}

const data = load();
data.drafts ??= {};
let route = "home";
let levelIndex = 0;
let level;
let play;
let result;
let cells = [];
let boardSize = 0;
let canvas;
let context;
let resize;
let frame = 0;
let winTimer = 0;
let hinted = null;
let hintDestination = null;
let selectedDock = null;
let labMask = 0;
let installPrompt;
let canvasTime = 0;
let finishing = false;
let award = 0;

function save() {
  try {
    localStorage.setItem(storageKey, JSON.stringify(data));
  } catch {
    // Progress remains available during the current session.
  }
}

function say(message) {
  announce.textContent = message;
}

function stars(count) {
  return `<span class="stars" aria-label="Звёзды: ${count} из 3">${[1, 2, 3].map((n) => `<span class="${n <= count ? "earned" : ""}" aria-hidden="true">★</span>`).join("")}</span>`;
}

function completionCount() {
  return levels.filter((_, i) => data.records[i]).length;
}

function nextUnlit() {
  const i = levels.findIndex((_, n) => !data.records[n]);
  return i === -1 ? 0 : i;
}

function heading(title, description = "", kicker = "") {
  return `<header class="screen-heading">${kicker ? `<p class="eyebrow">${kicker}</p>` : ""}<h1 id="view-title" tabindex="-1">${title}</h1>${description ? `<p>${description}</p>` : ""}</header>`;
}

function home() {
  const count = completionCount();
  const last = data.drafts[data.last] && !data.records[data.last] ? data.last : nextUnlit();
  return `<section class="home">
    <div class="home-art" aria-hidden="true"></div>
    <div class="home-copy">
      <p class="eyebrow">Мобильная головоломка об оптике</p>
      <h1 id="view-title" tabindex="-1">Световой<br><em>атлас</em></h1>
      <p class="home-story">Маяки архипелага погасли. Поворачивай зеркала, смешивай свет и зажги их снова.</p>
      <div class="actions"><a class="action primary" href="#${count === levels.length ? "map" : `play-${last + 1}`}">${count === levels.length ? "Карта маяков" : count || data.drafts[last]?.history.length ? "Продолжить экспедицию" : "Зажечь первый маяк"} <span aria-hidden="true">↗</span></a>${count === levels.length ? "" : '<a class="action quiet" href="#map">Карта</a>'}</div>
      <div class="home-count"><span class="little-light" aria-hidden="true"></span> ${count ? `Зажжено ${count} из ${levels.length}` : `${levels.length} головоломок · ${chapters.length} глав`}</div>
      <a class="new-route" href="#new">Новый маршрут: ещё пять глав</a>
    </div>
  </section>`;
}

function mapPage() {
  const sections = chapters.map((chapter, chapterIndex) => `<section class="chapter ${chapter.color}">
      <div class="chapter-head"><span class="chapter-mark" aria-hidden="true">${chapter.mark}</span><div><h2>${chapter.name}</h2><p>${chapter.lesson}</p></div></div>
      <ol>${levels.map((entry, i) => entry.chapter === chapterIndex ? `<li><a href="#play-${i + 1}" class="${data.records[i] ? "cleared" : ""}"><span class="map-number">${String(i + 1).padStart(2, "0")}</span><span>${entry.title}</span>${data.records[i] ? stars(data.records[i].stars) : '<span class="new-level" aria-hidden="true">·</span>'}</a></li>` : "").join("")}</ol>
    </section>`);
  return `${heading("Карта маяков", "Начни с берега или выбери любую главу.", `Зажжено ${completionCount()} из ${levels.length}`)}
    <div class="chapters">${sections.slice(0, 4).join("")}</div>
    <section class="new-chapters"><div class="map-section"><h2 id="new-islands" tabindex="-1">Новый маршрут</h2><p>Пять глав с новыми приборами.</p></div>
    <div class="chapters">${sections.slice(4).join("")}</div></section>`;
}

function labPage() {
  return `${heading("Лаборатория цвета", "Включай лампы и смотри, какой цвет дают лучи вместе.")}
    <section class="lab-widget" aria-label="Смешение света">
      <div class="light-display" id="light-display"><span aria-hidden="true">✦</span><strong id="lab-color"></strong></div>
      <div class="lab-controls">${colorValues.map((color) => `<button type="button" class="action lab-button" style="--lamp:${colors[color].tone}" data-action="lamp" data-lamp="${color}" aria-pressed="false"><span aria-hidden="true">${colors[color].symbol}</span>${colors[color].name}</button>`).join("")}</div>
      <p id="recipe" class="recipe" role="status"></p>
    </section>
    <section class="notes" aria-labelledby="notes-title"><h2 id="notes-title">Заметки об оптике</h2>
      ${chapters.map((chapter) => `<details><summary>${chapter.lesson}</summary><p>${chapter.fact}</p></details>`).join("")}
    </section>`;
}

function aboutPage() {
  return `${heading("Об игре", "«Световой атлас» — познавательная игра о свете для телефона и компьютера.")}
    <div class="about">
      <h2>Как играть</h2><p>Коснись зеркала или делителя, чтобы повернуть деталь. Коснись фильтра, чтобы сменить цвет. Зажги все линзы светом нужного цвета. На новом маршруте можно переносить зеркала, поворачивать фонари, настраивать поляризаторы и открывать заслонки светом.</p>
      <h2>Игра без интернета</h2><p>После первой загрузки игра сохраняет файлы в браузере. На телефоне можно добавить её на главный экран через меню браузера. В Safari это «Поделиться», затем «На экран Домой». Прогресс хранится на устройстве.</p>
      <h2>Как участвовал ИИ</h2><p>Codex помог разработать игровой процесс, уровни и код. Иллюстрация обсерватории создана в ImageGen.</p>
      <h2>Материалы по оптике</h2><ul>
        <li><a href="https://openstax.org/books/physics/pages/16-1-reflection">OpenStax. Отражение света</a></li>
        <li><a href="https://annex.exploratorium.edu/xref/exhibits/distilled_light.html">Exploratorium. Разделение и смешение цветов</a></li>
        <li><a href="https://www.jpl.nasa.gov/edu/resources/lesson-plan/the-science-of-color/">NASA JPL. Цвет и фильтры</a></li>
        <li><a href="https://openstax.org/books/university-physics-volume-3/pages/1-7-polarization">OpenStax. Поляризация</a></li>
      </ul>
    </div>`;
}

function initPlay(index) {
  levelIndex = index;
  level = levels[index];
  const previous = data.drafts[index];
  const valid = previous && Array.isArray(previous.choices) && previous.choices.length === level.controls.length &&
    previous.choices.every((value, i) => Number.isInteger(value) && value >= 0 && value < level.tiles[level.controls[i]].options);
  play = valid
    ? { choices: previous.choices.slice(), history: Array.isArray(previous.history) ? previous.history.slice() : [], hints: Number(previous.hints) || 0 }
    : { choices: level.initial.slice(), history: [], hints: 0 };
  hinted = null;
  hintDestination = null;
  selectedDock = null;
  finishing = false;
  award = 0;
  data.last = index;
  save();
}

function persistPuzzle() {
  data.drafts[levelIndex] = play;
  save();
}

function levelPage() {
  const chapter = chapters[level.chapter];
  return `<div class="level ${chapter.color}">
    <div class="level-head"><a class="map-back" href="#map">‹ Карта</a><span class="level-part">${levelIndex + 1} / ${levels.length}</span></div>
    ${heading(level.title, level.task, chapter.lesson)}
    <div class="play-layout">
      <section class="play-field" aria-label="Игровое поле">
        <div class="board" id="board" style="--size:${level.size}">
          <div class="board-grid" id="board-grid"></div><canvas id="beams" aria-hidden="true"></canvas>
        </div>
        <div class="board-tools" aria-label="Инструменты уровня">
          <button class="tool" type="button" data-action="undo" id="undo"><span aria-hidden="true">↶</span> Отмена</button>
          <button class="tool" type="button" data-action="reset" id="reset"><span aria-hidden="true">↺</span> Сначала</button>
          <button class="tool hint" type="button" data-action="hint" id="hint"><span aria-hidden="true">✧</span> Подсказка</button>
        </div>
      </section>
      <aside class="level-aside">
        <div class="counter-line"><p id="counter"></p><p id="moves"></p></div>
        <div id="target-list" class="targets" aria-label="Линзы"></div>
        <p class="mechanism-line" id="mechanism-line" hidden></p>
        <p class="hint-line" id="hint-line" hidden></p>
        <button class="action primary next" data-action="show-win" type="button" id="level-result" hidden>Продолжить</button>
        <details class="lesson"><summary>Как это работает</summary><p>${chapter.fact}</p></details>
      </aside>
    </div>
  </div>`;
}

function tileSymbol(tile) {
  if (tile.type === "source" || tile.type === "emitter") return `<span class="source-piece"><span class="glyph">${arrows[tile.direction ?? tile.value]}</span></span>`;
  if (tile.type === "target") return `<span class="target-piece"><span class="glyph">${colors[tile.mask].symbol}</span></span>`;
  if (tile.type === "rock") return '<span class="rock-piece"></span>';
  if (tile.type === "mirror" || tile.type === "splitter") return `<span class="optic"><span class="plate"></span>${tile.type === "splitter" ? '<span class="split-mark">+</span>' : ""}</span>`;
  if (tile.type === "spectral") return `<span class="optic"><span class="plate"></span><span class="spectrum-mark">${colors[tile.mask].symbol}</span></span>`;
  if (tile.type === "polar") return '<span class="polar-piece"><span class="polar-axis"></span></span>';
  if (tile.type === "dock") return `<span class="dock-piece"><span class="plate"></span><span class="dock-letter">${tile.group}</span></span>`;
  if (tile.type === "sensor" || tile.type === "gate") return `<span class="lock-piece"><span class="lock-bars"></span><span class="glyph">${tile.group}</span></span>`;
  if (tile.type === "filter") return '<span class="filter-piece"><span class="glyph"></span></span>';
  return "";
}

function buildBoard() {
  const grid = document.getElementById("board-grid");
  const fragment = document.createDocumentFragment();
  cells = level.tiles.map((tile, index) => {
    const interactive = tile.options || tile.type === "dock";
    const cell = document.createElement(interactive ? "button" : "div");
    cell.className = `cell cell-${tile.type}`;
    if (interactive) {
      cell.type = "button";
      cell.dataset.action = tile.type === "dock" ? "dock" : "rotate";
      cell.dataset.cell = index;
    } else {
      cell.setAttribute("aria-hidden", "true");
    }
    if (tile.mask) cell.style.setProperty("--ray", colors[tile.mask].tone);
    if (tile.type === "polar") cell.style.setProperty("--axis", tile.value ? "90deg" : "0deg");
    cell.innerHTML = tileSymbol(tile);
    fragment.append(cell);
    return cell;
  });
  grid.append(fragment);
  canvas = document.getElementById("beams");
  context = canvas.getContext("2d");
  resize = new ResizeObserver(resizeCanvas);
  resize.observe(grid);
  resizeCanvas();
  updateBoard();
  startMotion();
}

function resizeCanvas() {
  const edge = canvas.getBoundingClientRect().width;
  const ratio = Math.min(devicePixelRatio || 1, 1.8);
  boardSize = Math.round(edge * ratio);
  canvas.width = boardSize;
  canvas.height = boardSize;
  if (result) drawRays(canvasTime);
}

function drawRays(time) {
  if (!context || !boardSize || !result) return;
  const scale = boardSize / level.size;
  context.setTransform(scale, 0, 0, scale, 0, 0);
  context.clearRect(0, 0, level.size, level.size);
  context.lineCap = "round";
  for (const segment of result.segments) {
    const { x, y, dx, dy, mask } = segment;
    const color = colors[mask].tone;
    context.beginPath();
    context.moveTo(x + .5, y + .5);
    context.lineTo(x + .5 + dx, y + .5 + dy);
    context.strokeStyle = color;
    for (const [width, opacity] of [[.25, .10], [.14, .20], [.064, .95]]) {
      context.lineWidth = width;
      context.globalAlpha = opacity;
      context.stroke();
    }
    if (!reducedMotion.matches && time) {
      const t = (time / 830 + (x + y) * .13) % 1;
      context.fillStyle = color;
      context.globalAlpha = Math.sin(t * Math.PI) * .75;
      context.beginPath();
      context.arc(x + .5 + dx * t, y + .5 + dy * t, .043, 0, Math.PI * 2);
      context.fill();
    }
  }
  context.globalAlpha = 1;
}

function startMotion() {
  cancelAnimationFrame(frame);
  if (route !== "play" || reducedMotion.matches || document.hidden) {
    if (route === "play") drawRays(0);
    return;
  }
  function animate(time) {
    if (time - canvasTime > 31) {
      canvasTime = time;
      drawRays(time);
    }
    frame = requestAnimationFrame(animate);
  }
  frame = requestAnimationFrame(animate);
}

function updateBoard() {
  result = trace(level, play.choices);
  const firstTap = levelIndex === 0 && play.history.length === 0 ? level.controls[0] : null;
  const values = new Map(level.controls.map((index, i) => [index, play.choices[i]]));
  const gates = [];
  level.tiles.forEach((tile, index) => {
    const cell = cells[index];
    if (tile.type === "gate" || tile.type === "sensor") {
      const open = result.openGates.has(tile.group);
      cell.classList.toggle("active-lock", open);
      if (tile.type === "gate") gates.push(`Заслонка ${tile.group} ${open ? "открыта" : "закрыта"}`);
      return;
    }
    if (!tile.options && tile.type !== "dock") return;
    const value = values.get(index);
    const place = cellPlace(tile);
    cell.classList.toggle("coach", !result.won && (index === hinted || index === firstTap));
    cell.classList.toggle("coach-dest", !result.won && index === hintDestination);
    cell.classList.toggle("in-path", result.used.has(index));
    if (tile.type === "dock") {
      const occupied = result.movable.has(index);
      const chosen = tile.group === selectedDock;
      cell.classList.toggle("occupied", occupied);
      cell.classList.toggle("dock-selected", occupied && chosen);
      cell.classList.toggle("dock-ready", !occupied && chosen);
      cell.style.setProperty("--angle", result.movable.get(index) ? "45deg" : "-45deg");
      cell.setAttribute("aria-pressed", occupied && chosen);
      cell.setAttribute("aria-label", `${occupied ? "Переносное зеркало" : "Пустое гнездо"} ${tile.group}, ${place}`);
    } else if (tile.type === "filter") {
      const color = colors[colorValues[value]];
      cell.style.setProperty("--ray", color.tone);
      cell.querySelector(".glyph").textContent = color.symbol;
      cell.setAttribute("aria-label", `Фильтр: ${color.name}, ${place}. Сменить цвет`);
    } else if (tile.type === "emitter") {
      cell.querySelector(".glyph").textContent = arrows[value];
      cell.setAttribute("aria-label", `Фонарь: ${colors[tile.mask].name}, светит ${directionNames[value]}, ${place}. Повернуть`);
    } else if (tile.type === "polar") {
      cell.style.setProperty("--axis", value ? "90deg" : "0deg");
      cell.setAttribute("aria-label", `Поляризатор: полосы ${value ? "вертикальные" : "горизонтальные"}, ${place}. Повернуть`);
    } else {
      const label = tile.type === "mirror" ? "Зеркало" : tile.type === "spectral" ? `Цветное зеркало: ${colors[tile.mask].name}` : "Делитель";
      cell.style.setProperty("--angle", value ? "45deg" : "-45deg");
      cell.setAttribute("aria-label", `${label} ${value ? "наклонено вниз вправо" : "наклонено вверх вправо"}, ${place}. Повернуть`);
    }
  });
  const list = [];
  for (const [index, arrival] of result.arrivals) {
    const expected = level.tiles[index].mask;
    const cell = cells[index];
    const good = arrival === expected;
    cell.classList.toggle("lit", good);
    cell.classList.toggle("wrong", Boolean(arrival && !good));
    cell.style.setProperty("--arrival", colors[arrival].tone);
    cell.querySelector(".glyph").textContent = good ? "✓" : colors[expected].symbol;
    list.push(`<span class="target-status" style="--ray:${colors[expected].tone}"><b aria-hidden="true">${good ? "✓" : colors[expected].symbol}</b><span>${colors[expected].name}${arrival && !good ? ` · попал ${colors[arrival].name.toLowerCase()}` : ""}${good ? " · горит" : ""}</span></span>`);
  }
  document.getElementById("target-list").innerHTML = list.join("");
  const mechanic = document.getElementById("mechanism-line");
  mechanic.textContent = selectedDock ? `Выбрано зеркало ${selectedDock}. Коснись подсвеченного гнезда.` : gates.join(" · ");
  mechanic.hidden = !mechanic.textContent;
  document.getElementById("counter").textContent = `Линзы ${result.lit}/${result.expected}`;
  document.getElementById("moves").textContent = `Ходы ${play.history.length}`;
  document.getElementById("undo").disabled = !play.history.length;
  document.getElementById("reset").disabled = !play.history.length && !play.hints;
  document.getElementById("hint").disabled = result.won;
  document.getElementById("level-result").hidden = !result.won;
  drawRays(0);
}

function cellPlace(tile) {
  return `ряд ${tile.y + 1}, столбец ${tile.x + 1}`;
}

function updateLab() {
  const color = colors[labMask];
  document.getElementById("light-display").style.setProperty("--mixed", color.tone);
  document.getElementById("lab-color").textContent = color.name;
  document.getElementById("recipe").textContent = colorRecipes[labMask];
  main.querySelectorAll("[data-lamp]").forEach((button) => {
    button.setAttribute("aria-pressed", Boolean(labMask & Number(button.dataset.lamp)));
  });
}

function showWin() {
  clearTimeout(winTimer);
  finishing = false;
  if (route !== "play" || !result.won || dialog.open) return;
  const best = data.records[levelIndex];
  const last = levelIndex === levels.length - 1;
  const all = completionCount() === levels.length;
  const next = last ? (all ? "#map" : `#play-${nextUnlit() + 1}`) : `#play-${levelIndex + 2}`;
  const nextLabel = last ? (all ? "Карта маяков" : "К следующему маяку") : "Дальше";
  dialogContent.innerHTML = `<div class="win">
    <p class="eyebrow">${all ? "Экспедиция завершена" : chapters[level.chapter].name}</p>
    <h2 id="dialog-title">${all ? "Все маяки зажжены!" : "Маяк зажжён!"}</h2>
    ${stars(award || best.stars)}
    <p class="win-moves">Ходы: ${play.history.length} · Рекорд: ${best.moves}</p>
    <p class="win-fact">${chapters[level.chapter].fact}</p>
    <div class="actions"><a class="action primary" href="${next}" id="win-next">${nextLabel}</a><button class="action quiet" type="button" data-action="inspect">К полю</button></div>
  </div>`;
  dialog.showModal();
  document.getElementById("win-next").focus();
}

function recordWin(silent = false) {
  const moves = play.history.length;
  const optimal = solve(level, level.initial).distance;
  const earned = play.hints ? 1 : moves <= optimal ? 3 : moves <= optimal + 4 ? 2 : 1;
  award = earned;
  const best = data.records[levelIndex];
  data.records[levelIndex] = { stars: Math.max(best?.stars || 0, earned), moves: Math.min(best?.moves ?? moves, moves) };
  delete data.drafts[levelIndex];
  save();
  if (silent) return;
  finishing = true;
  say("Все линзы зажжены.");
  winTimer = setTimeout(showWin, reducedMotion.matches ? 0 : 410);
}

function changeTile(index) {
  if (finishing) return;
  const i = level.controls.indexOf(index);
  if (i < 0) return;
  changeChoice(i, (play.choices[i] + 1) % level.tiles[index].options);
}

function changeChoice(i, value) {
  const wasWon = result.won;
  play.history.push([i, play.choices[i]]);
  play.choices[i] = value;
  selectedDock = null;
  clearHint();
  updateBoard();
  if (result.won && !wasWon) recordWin();
  else if (!result.won) persistPuzzle();
}

function selectDock(index) {
  if (finishing) return;
  const { group } = level.tiles[index];
  const i = level.controls.findIndex((anchor) => level.tiles[anchor].docks && level.tiles[anchor].group === group);
  const { docks } = level.tiles[level.controls[i]];
  const old = docks[play.choices[i]];
  if (index === old) {
    selectedDock = selectedDock === group ? null : group;
    updateBoard();
    say(selectedDock ? `Зеркало ${group} выбрано. Коснись пустого гнезда с такой же буквой.` : "Выбор зеркала отменён.");
  } else if (selectedDock === group) {
    changeChoice(i, docks.indexOf(index));
    if (!result.won) say(`Зеркало ${group} перенесено: ${cellPlace(level.tiles[index])}.`);
  } else {
    cells[old].focus();
    say(`Сначала коснись зеркала ${group}, затем этого гнезда.`);
  }
}

function clearHint() {
  hinted = null;
  hintDestination = null;
  document.getElementById("hint-line").hidden = true;
}

function undo() {
  clearTimeout(winTimer);
  finishing = false;
  const move = play.history.pop();
  if (move === undefined) return;
  const [i, previous] = Array.isArray(move) ? move : [move];
  const options = level.tiles[level.controls[i]].options;
  play.choices[i] = previous ?? (play.choices[i] + options - 1) % options;
  selectedDock = null;
  clearHint();
  updateBoard();
  if (result.won) recordWin(true);
  else persistPuzzle();
  if (document.activeElement?.id === "undo" && !play.history.length) cells[level.controls[i]].focus();
}

function reset() {
  clearTimeout(winTimer);
  finishing = false;
  play = { choices: level.initial.slice(), history: [], hints: 0 };
  selectedDock = null;
  clearHint();
  updateBoard();
  persistPuzzle();
  cells[level.controls[0]].focus();
  say("Уровень начат заново.");
}

function hint() {
  const path = solve(level, play.choices);
  if (path?.first == null) return;
  const index = level.controls[path.first];
  const tile = level.tiles[index];
  const origin = tile.docks ? tile.docks[play.choices[path.first]] : index;
  const destination = tile.docks ? tile.docks[path.firstValue] : null;
  if (hinted !== origin || hintDestination !== destination) play.hints++;
  hinted = origin;
  hintDestination = destination;
  selectedDock = null;
  const line = document.getElementById("hint-line");
  line.textContent = tile.docks
    ? `Коснись зеркала ${tile.group}, затем гнезда: ${cellPlace(level.tiles[destination])}.`
    : `Коснись подсвеченной детали: ${cellPlace(tile)}.`;
  line.hidden = false;
  updateBoard();
  persistPuzzle();
  cells[origin].focus();
  say(line.textContent);
}

function render(moveFocus = true) {
  if (dialog.open) dialog.close();
  clearTimeout(winTimer);
  cancelAnimationFrame(frame);
  resize?.disconnect();
  result = null;
  const hash = location.hash.slice(1);
  const choice = /^play-(\d+)$/.exec(hash);
  const index = choice ? Number(choice[1]) - 1 : -1;
  route = index >= 0 && index < levels.length ? "play" : hash === "new" ? "map" : ["map", "lab", "about"].includes(hash) ? hash : "home";
  if (route === "play") initPlay(index);
  main.dataset.screen = route;
  main.innerHTML = ({ home, map: mapPage, lab: labPage, play: levelPage, about: aboutPage })[route]();
  if (route === "play") buildBoard();
  if (route === "lab") updateLab();
  document.querySelectorAll("[data-nav]").forEach((link) => {
    if (link.dataset.nav === route) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
  if (hash === "new") {
    const section = document.getElementById("new-islands");
    if (moveFocus) section.focus({ preventScroll: true });
    section.scrollIntoView();
  } else if (moveFocus) {
    document.getElementById("view-title").focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }
}

const actions = {
  rotate: (button) => changeTile(Number(button.dataset.cell)),
  dock: (button) => selectDock(Number(button.dataset.cell)),
  undo, reset, hint,
  "show-win": showWin,
  inspect() {
    dialog.close();
    document.getElementById("level-result").focus();
  },
  lamp(button) {
    labMask ^= Number(button.dataset.lamp);
    updateLab();
  },
};

document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-action]");
  if (button) actions[button.dataset.action](button);
});
document.querySelector(".skip").addEventListener("click", (event) => {
  event.preventDefault();
  main.focus();
});
window.addEventListener("hashchange", () => render());
document.addEventListener("visibilitychange", startMotion);
reducedMotion.addEventListener("change", startMotion);

const fullscreen = document.getElementById("fullscreen");
if (document.fullscreenEnabled) {
  fullscreen.hidden = false;
  fullscreen.addEventListener("click", async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      say("Браузер не разрешил полноэкранный режим.");
    }
  });
  document.addEventListener("fullscreenchange", () => {
    fullscreen.textContent = document.fullscreenElement ? "Выйти из полноэкранного режима" : "На весь экран";
  });
}

const install = document.getElementById("install");
window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  installPrompt = event;
  install.hidden = false;
});
install.addEventListener("click", async () => {
  if (!installPrompt) return;
  await installPrompt.prompt();
  installPrompt = null;
  install.hidden = true;
});
window.addEventListener("appinstalled", () => { install.hidden = true; });
if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol)) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}

render(false);
