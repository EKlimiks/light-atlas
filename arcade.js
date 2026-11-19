(function () {
  "use strict";

  const light = AtlasOptics.colors;
  const channels = { R: 1, G: 2, B: 4 };
  const spectrum = [
    ["Лампы у причала", ["R1", "G1", "B1"], [0, 1]],
    ["Два окна", ["R1", "G12", "B2", "R2"], [0, 1, 2]],
    ["Соседний фонарь", ["R12", "G1", "B2", "G2", "B1"], [0, 2, 4]],
    ["Три витрины", ["R12", "G23", "B13", "R3", "G1", "B2"], [0, 1, 2]],
    ["Белый зал", ["R13", "G12", "B12", "B3", "G3", "R2", "B2"], [0, 1, 2, 3]],
    ["Перекрёстные лампы", ["R13", "R12", "G23", "G12", "B13", "B23"], [1, 2, 4]],
    ["Четыре линзы", ["R14", "R23", "G12", "G34", "B13", "B24", "R34"], [0, 1, 3, 5]],
    ["Точное освещение", ["R124", "R23", "G13", "G234", "B14", "B23", "R34", "B1"], [1, 2, 3, 4, 7]],
    ["Спектральный купол", ["R14", "R123", "G13", "G24", "G23", "B123", "B34", "R34"], [0, 2, 3, 5, 6]],
  ].map(([title, fixtures, answer]) => {
    const lamps = fixtures.map(([color, ...windows]) => ({ mask: channels[color], windows: windows.map(Number) }));
    const windows = Math.max(...lamps.flatMap((lamp) => lamp.windows));
    return { title, lamps, windows, goal: mixWindows(lamps, windows, answer) };
  });

  function mixWindows(lamps, count, enabled) {
    const output = Array(count).fill(0);
    for (const index of enabled) {
      const lamp = lamps[index];
      for (const window of lamp.windows) output[window - 1] |= lamp.mask;
    }
    return output;
  }

  const shapes = {
    I: [[0, 0], [1, 0], [2, 0]],
    D: [[0, 0], [1, 0]],
    L: [[0, 0], [0, 1], [1, 1]],
    J: [[0, 0], [0, 1], [0, 2], [1, 2]],
    O: [[0, 0], [1, 0], [0, 1], [1, 1]],
    S: [[1, 0], [2, 0], [0, 1], [1, 1]],
    T: [[0, 0], [1, 0], [2, 0], [1, 1]],
  };
  const shapeNames = { I: "Планка", D: "Двойка", L: "Угол", J: "Крюк", O: "Квадрат", S: "Ступени", T: "Перекладина" };
  const shadow = [
    ["Первая тень", 4, ["D"], [[1, 1, 0]]],
    ["Поворот угла", 4, ["L"], [[1, 0, 1]]],
    ["Две детали", 4, ["D", "L"], [[0, 1, 1], [1, 1, 2]]],
    ["Высокая башня", 5, ["J", "I"], [[1, 1, 2], [2, 1, 1]]],
    ["Перекрытие", 5, ["O", "L"], [[0, 1, 0], [1, 2, 3]]],
    ["Длинные ступени", 5, ["S", "I"], [[1, 1, 1], [0, 2, 0]]],
    ["Три силуэта", 5, ["T", "D", "J"], [[0, 0, 1], [3, 1, 1], [1, 2, 1]]],
    ["Сложный контур", 5, ["L", "S", "I"], [[2, 0, 2], [1, 2, 3], [0, 1, 1]]],
    ["Тени обсерватории", 5, ["T", "S", "J"], [[1, 1, 3], [0, 2, 0], [2, 2, 3]]],
  ].map(([title, size, pieces, answer]) => ({ title, size, pieces, answer, goal: project(pieces, answer, size) }));

  function footprint(shape, rotation) {
    let points = shapes[shape];
    for (let i = 0; i < rotation; i++) {
      const edge = Math.max(...points.map(([, y]) => y));
      points = points.map(([x, y]) => [edge - y, x]);
    }
    return points;
  }

  function project(pieces, positions, size) {
    const cells = new Set();
    for (const [i, pose] of positions.entries()) {
      if (!pose) continue;
      const [left, top, rotation] = pose;
      for (const [x, y] of footprint(pieces[i], rotation)) {
        const column = left + x;
        const row = top + y;
        if (column >= size || row >= size) return null;
        cells.add(column + row * size);
      }
    }
    return cells;
  }

  const alphabet = {
    A: ".-", E: ".", I: "..", L: ".-..", M: "--", N: "-.", O: "---",
    P: ".--.", R: ".-.", S: "...", T: "-", U: "..-", X: "-..-", Y: "-.--",
  };
  const signals = [
    ["Короткий вызов", "E", ["E", "T", "I"]],
    ["Две вспышки", "A", ["N", "A", "M"]],
    ["Ответ станции", "SOS", ["SOS", "OSO", "MO"]],
    ["Имя бухты", "SEA", ["SEA", "SEE", "SET"]],
    ["Сигнал причала", "PIER", ["PEER", "PIR", "PIER"]],
    ["Ночная связь", "NORTH", ["NORTH", "SOUTH", "STAR"]],
    ["Передача A", "A"],
    ["Передача SOS", "SOS"],
    ["Передача LAMP", "LAMP"],
    ["Позывной STAR", "STAR"],
    ["Позывной SIGNAL", "SIGNAL"],
    ["Позывной ATLAS", "ATLAS"],
  ].map(([title, word, choices]) => ({ title, word, choices }));
  Object.assign(alphabet, { G: "--.", H: "...." });

  const modeList = [
    { id: "spectrum", name: "Спектр", verb: "Подбери свет для всех окон", lessons: spectrum, tone: "rose", mark: "●" },
    { id: "shadow", name: "Тени", verb: "Собери силуэт из деталей", lessons: shadow, tone: "mint", mark: "▦" },
    { id: "signals", name: "Сигналы", verb: "Прочитай и отправь азбуку Морзе", lessons: signals, tone: "sky", mark: "· —" },
  ];
  const lookup = Object.fromEntries(modeList.map((mode) => [mode.id, mode]));
  const codeFor = (word) => [...word].map((letter) => alphabet[letter]).join(" ");
  const displayCode = (code) => code.replaceAll(".", "·").replaceAll("-", "−").replaceAll(" ", "  /  ");
  const spokenCode = (code) => [...code].map((symbol) => ({ ".": "точка", "-": "тире", " ": "новая буква" })[symbol]).join(", ");
  const id = (kind, n) => `arc-${kind}-${n}`;

  function create(record, hooks) {
    record.records ??= {};
    record.last ??= {};
    record.drafts ??= {};
    let current = null;
    let round;
    let draft;
    let feedback = "";
    let completed = false;
    let timers = [];

    function stopSignal() {
      timers.forEach(clearTimeout);
      timers = [];
    }

    function count(mode) {
      return Object.keys(record.records[mode] || {}).length;
    }

    function start(index, resume = false) {
      stopSignal();
      round = index;
      record.last[current] = index;
      const item = lookup[current].lessons[index];
      draft = current === "spectrum" ? { active: new Set(), moves: 0 }
        : current === "shadow" ? { poses: item.pieces.map(() => null), selected: 0, rotations: item.pieces.map(() => 0), cursor: 0, moves: 0 }
        : { code: "", answer: "" };
      const saved = record.drafts[current];
      if (resume && saved?.index === index) {
        draft = saved.state;
        if (current === "spectrum") draft = { ...draft, active: new Set(draft.active) };
      } else {
        delete record.drafts[current];
      }
      feedback = "";
      completed = false;
      hooks.save();
    }

    function enter(mode) {
      const next = lookup[mode] ? mode : null;
      if (next === current) return;
      stopSignal();
      current = next;
      if (current) {
        const last = Math.min(record.last[current] || 0, lookup[current].lessons.length - 1);
        const firstUnfinished = lookup[current].lessons.findIndex((_, i) => !record.records[current]?.[i]);
        const index = record.records[current]?.[last] && firstUnfinished !== -1 ? firstUnfinished : last;
        start(index, true);
      }
    }

    function saveDraft() {
      record.drafts[current] = {
        index: round,
        state: current === "spectrum" ? { ...draft, active: [...draft.active] } : draft,
      };
      hooks.save();
    }

    function paint(focusId) {
      stopSignal();
      const notesOpen = document.querySelector(".arc-reference")?.open;
      hooks.render();
      const notes = document.querySelector(".arc-reference");
      if (notes) notes.open = Boolean(notesOpen);
      if (focusId) document.getElementById(focusId)?.focus({ preventScroll: true });
      if (focusId === "arc-next") document.getElementById("arc-next")?.scrollIntoView({ block: "nearest" });
    }

    function page() {
      const mode = lookup[current];
      const lesson = mode.lessons[round];
      const build = { spectrum: spectrumPage, shadow: shadowPage, signals: signalPage }[current];
      return `<div class="arcade ${mode.tone}">
        <div class="level-head"><a class="map-back" href="#home">‹ Игры</a><span class="level-part">${round + 1} / ${mode.lessons.length}</span></div>
        <header class="screen-heading"><p class="eyebrow">${mode.name}</p><h1 id="view-title" tabindex="-1">${lesson.title}</h1></header>
        <div class="round-selector"><label for="arc-round">Задание</label><select id="arc-round" data-arc-round>${mode.lessons.map((entry, i) => `<option value="${i}" ${i === round ? "selected" : ""}>${i + 1}. ${entry.title}${record.records[current]?.[i] ? " ✓" : ""}</option>`).join("")}</select>${current === "signals" ? "" : `<span>Ходы ${draft.moves}</span>`}</div>
        ${build(lesson)}
        <div class="arc-check">
        ${completed ? `<div class="arc-success"><strong>Задание решено</strong><p>${lessonFact()}</p></div>
          ${round + 1 < mode.lessons.length ? '<button id="arc-next" type="button" class="action primary" data-arc="next">Следующее задание</button>' : '<a id="arc-next" class="action primary" href="#home">К выбору игр</a>'}`
          : `<button id="arc-check" type="button" class="action primary" data-arc="check">Проверить</button><button id="arc-reset" type="button" class="action quiet" data-arc="reset">Сначала</button>`}
          <p class="arc-feedback" role="status">${feedback}</p>
        </div></div>`;
    }

    function lessonFact() {
      return {
        spectrum: "Лучи складываются. Красный и зелёный дают жёлтый, а все три основных цвета дают белый.",
        shadow: "При параллельных лучах форма тени повторяет силуэт детали. Там, где детали перекрываются, их тени сливаются.",
        signals: "В коде Морзе длинный импульс длится втрое дольше короткого. Пауза отделяет одну букву от другой.",
      }[current];
    }

    function swatch(mask) {
      return `<span class="arc-swatch" style="--swatch:${light[mask].tone}"><i aria-hidden="true">${light[mask].symbol}</i>${light[mask].name}</span>`;
    }

    function spectrumPage(item) {
      const found = mixWindows(item.lamps, item.windows, draft.active);
      return `<p class="arc-instruction">Включай лампы. Каждая освещает окна с указанными номерами. Во всех окнах цвет должен совпасть с образцом.</p>
        <div class="spectrum-windows">${item.goal.map((mask, i) => `<section class="spectrum-window ${found[i] === mask ? "matched" : ""}"><h2>Окно ${i + 1}</h2><div><small>Нужно</small>${swatch(mask)}<small>Сейчас</small>${swatch(found[i])}</div></section>`).join("")}</div>
        <div class="lamp-bank" aria-label="Лампы">${item.lamps.map((lamp, i) => `<button class="lamp-key" id="${id("lamp", i)}" type="button" style="--lamp:${light[lamp.mask].tone}" data-arc="lamp" data-value="${i}" aria-pressed="${draft.active.has(i)}" ${completed ? "disabled" : ""}><span aria-hidden="true">${light[lamp.mask].symbol}</span><strong>${light[lamp.mask].name}</strong><small>Окна ${lamp.windows.join(", ")}</small></button>`).join("")}</div>`;
    }

    function pieceIcon(shape, rotation) {
      const points = footprint(shape, rotation);
      return `<span class="piece-icon" aria-hidden="true">${Array.from({ length: 9 }, (_, i) => `<i class="${points.some(([x, y]) => i === y * 3 + x) ? "filled" : ""}"></i>`).join("")}</span>`;
    }

    function shadowPage(item) {
      const projected = project(item.pieces, draft.poses, item.size);
      return `<p class="arc-instruction">Выбери деталь, поверни её при необходимости и коснись клетки, где должен быть её верхний левый угол. Заполни весь светлый контур.</p>
        <div class="shadow-layout"><div class="shadow-board" style="--side:${item.size}" aria-label="Экран проекции">${Array.from({ length: item.size ** 2 }, (_, i) => {
          const x = i % item.size + 1, y = Math.floor(i / item.size) + 1;
          const expected = item.goal.has(i), covered = projected.has(i);
          return `<button type="button" id="${id("tile", i)}" tabindex="${i === draft.cursor ? 0 : -1}" class="${expected ? "shadow-target" : ""} ${covered ? "shadow-covered" : ""}" data-arc="tile" data-value="${i}" aria-label="Ряд ${y}, столбец ${x}${expected ? ", в контуре" : ""}${covered ? ", закрыта тенью" : ""}" ${completed ? "disabled" : ""}></button>`;
        }).join("")}</div>
        <div><div class="piece-bin" aria-label="Детали">${item.pieces.map((shape, i) => `<button type="button" class="piece-key" id="${id("piece", i)}" data-arc="piece" data-value="${i}" aria-pressed="${i === draft.selected}" ${completed ? "disabled" : ""}>${pieceIcon(shape, draft.rotations[i])}<span>${shapeNames[shape]} ${draft.poses[i] ? "✓" : ""}</span></button>`).join("")}</div>
        <div class="shadow-tools"><button id="arc-rotate" class="action quiet" type="button" data-arc="rotate" ${completed ? "disabled" : ""}>Повернуть</button><button id="arc-lift" class="action quiet" type="button" data-arc="lift" ${!draft.poses[draft.selected] || completed ? "disabled" : ""}>Снять</button></div></div></div>`;
    }

    function signalPage(item) {
      const decode = Boolean(item.choices);
      return `<p class="arc-instruction">${decode ? "Расшифруй сигнал. Можно прочитать точки и тире или увидеть вспышки лампы." : "Передай позывной короткими и длинными импульсами. Отделяй каждую букву кнопкой «Новая буква»."}</p>
        <div class="signal-display">
        <div class="signal-light" id="signal-light" aria-hidden="true"></div>
        ${decode ? `<p class="signal-code" aria-label="${spokenCode(codeFor(item.word))}">${displayCode(codeFor(item.word))}</p><button type="button" id="arc-flash" data-arc="flash" class="action quiet">Показать вспышки</button>`
            : `<p class="signal-word">${item.word}</p><p class="signal-code" aria-label="Твой сигнал">${draft.code ? displayCode(draft.code) : "Набери сигнал"} </p>`}
        </div>
        ${decode ? `<div class="signal-keys">${item.choices.map((word, i) => `<button type="button" class="action quiet" id="${id("answer", i)}" data-arc="answer" data-value="${word}" aria-pressed="${draft.answer === word}" ${completed ? "disabled" : ""}>${word}</button>`).join("")}</div>` :
          `<div class="signal-keys"><button id="arc-dot" type="button" class="action quiet" data-arc="dot" ${completed ? "disabled" : ""}>· Точка</button><button id="arc-dash" type="button" class="action quiet" data-arc="dash" ${completed ? "disabled" : ""}>− Тире</button><button id="arc-gap" type="button" class="action quiet" data-arc="gap" ${completed ? "disabled" : ""}>Новая буква</button><button id="arc-delete" type="button" class="action quiet" data-arc="delete" ${completed ? "disabled" : ""}>Стереть</button></div>`}
        <details class="arc-reference"><summary>Таблица азбуки Морзе</summary><div>${Object.entries(alphabet).sort().map(([letter, code]) => `<span><b>${letter}</b> ${displayCode(code)}</span>`).join("")}</div></details>`;
    }

    function check() {
      const item = lookup[current].lessons[round];
      let correct;
      if (current === "spectrum") {
        const found = mixWindows(item.lamps, item.windows, draft.active);
        const mismatch = found.filter((mask, i) => mask !== item.goal[i]).length;
        feedback = mismatch ? `Не совпало окон: ${mismatch}. Сверь, какие окна освещает каждая лампа.` : "";
        correct = !mismatch;
      } else if (current === "shadow") {
        const projected = project(item.pieces, draft.poses, item.size);
        correct = draft.poses.every(Boolean) && projected.size === item.goal.size && [...projected].every((i) => item.goal.has(i));
        feedback = correct ? "" : "Используй все детали и закрой только клетки контура.";
      } else {
        correct = item.choices ? draft.answer === item.word : draft.code.trim() === codeFor(item.word);
        feedback = correct ? "" : "Сигнал не совпал. Проверь точки, тире и паузы между буквами по таблице.";
      }
      if (correct) {
        completed = true;
        (record.records[current] ??= {})[round] = true;
        delete record.drafts[current];
        hooks.save();
      }
      paint(correct ? "arc-next" : "arc-check");
    }

    function place(value, rotation = draft.rotations[draft.selected]) {
      const item = lookup.shadow.lessons[round];
      const poses = draft.poses.slice();
      poses[draft.selected] = [value % item.size, Math.floor(value / item.size), rotation];
      if (!project(item.pieces, poses, item.size)) {
        feedback = "Деталь выходит за край. Выбери другую клетку или поверни её.";
        return false;
      }
      draft.poses = poses;
      draft.rotations[draft.selected] = rotation;
      draft.moves++;
      return true;
    }

    function flash() {
      stopSignal();
      const lamp = document.getElementById("signal-light");
      lamp.classList.remove("on");
      const code = codeFor(lookup.signals.lessons[round].word);
      const unit = 245;
      let time = 0;
      for (const symbol of code) {
        if (symbol === " ") { time += unit * 2; continue; }
        const length = unit * (symbol === "." ? 1 : 3);
        timers.push(setTimeout(() => lamp.classList.add("on"), time));
        time += length;
        timers.push(setTimeout(() => lamp.classList.remove("on"), time));
        time += unit;
      }
    }

    function click(button) {
      const { arc: action, value } = button.dataset;
      if (action === "check") { check(); return; }
      if (action === "flash") { flash(); return; }
      if (action === "next") { start(round + 1); paint("view-title"); window.scrollTo(0, 0); return; }
      if (action === "reset") { start(round); paint("arc-reset"); return; }
      feedback = "";
      const number = Number(value);
      switch (action) {
        case "lamp":
          if (draft.active.has(number)) draft.active.delete(number);
          else draft.active.add(number);
          draft.moves++;
          break;
        case "piece": draft.selected = number; break;
        case "tile":
          draft.cursor = number;
          place(number);
          break;
        case "rotate": {
          const currentPose = draft.poses[draft.selected];
          const rotation = (draft.rotations[draft.selected] + 1) % 4;
          // Rotation is a choice until the piece is placed again.
          if (currentPose) draft.poses[draft.selected] = null;
          draft.rotations[draft.selected] = rotation;
          if (currentPose) feedback = "Деталь повёрнута. Выбери клетку, чтобы поставить её снова.";
          break;
        }
        case "lift": draft.poses[draft.selected] = null; break;
        case "answer": draft.answer = value; break;
        case "dot": if (draft.code.length < 40) draft.code += "."; break;
        case "dash": if (draft.code.length < 40) draft.code += "-"; break;
        case "gap": if (draft.code.trim() && !draft.code.endsWith(" ") && draft.code.length < 39) draft.code += " "; break;
        case "delete": draft.code = draft.code.slice(0, -1); break;
      }
      saveDraft();
      paint(action === "lift" ? id("piece", draft.selected) : button.id);
    }

    function select(value) {
      start(Number(value));
      paint("arc-round");
    }

    function moveCursor(event) {
      const delta = { ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowDown: [0, 1], ArrowUp: [0, -1] }[event.key];
      if (!delta || event.target.dataset.arc !== "tile") return;
      event.preventDefault();
      const size = lookup.shadow.lessons[round].size;
      const [dx, dy] = delta;
      const x = draft.cursor % size + dx;
      const y = Math.floor(draft.cursor / size) + dy;
      if (x < 0 || x >= size || y < 0 || y >= size) return;
      event.target.tabIndex = -1;
      draft.cursor = x + y * size;
      const next = document.getElementById(id("tile", draft.cursor));
      next.tabIndex = 0;
      next.focus();
    }

    return { enter, page, click, select, moveCursor, count };
  }

  globalThis.AtlasArcade = { create, modeList, spectrum, shadow, signals, project, mixWindows, codeFor };
})();
