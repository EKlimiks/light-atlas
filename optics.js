(function () {
  "use strict";

  const vectors = [[0, -1], [1, 0], [0, 1], [-1, 0]];
  const reflect = [[1, 0, 3, 2], [3, 2, 1, 0]];
  const colorValues = [1, 2, 4];
  const colors = [
    { name: "Нет света", tone: "#383957", symbol: "·" },
    { name: "Красный", tone: "#ff796d", symbol: "К" },
    { name: "Зелёный", tone: "#9ff49d", symbol: "З" },
    { name: "Жёлтый", tone: "#ffe38c", symbol: "Ж" },
    { name: "Синий", tone: "#8dbdff", symbol: "С" },
    { name: "Пурпурный", tone: "#f4a9f7", symbol: "П" },
    { name: "Голубой", tone: "#91f4ef", symbol: "Г" },
    { name: "Белый", tone: "#fff6db", symbol: "Б" },
  ];

  function propagate(level, choices, openGates) {
    const { size, tiles, controls } = level;
    const values = new Map(controls.map((index, i) => [index, choices[i]]));
    const movable = new Map();
    for (const [index, value] of values) {
      const tile = tiles[index];
      if (tile.type === "dock") movable.set(tile.docks[value], tile.angle);
    }
    const arrivals = new Map();
    const visited = new Set();
    const used = new Set();
    const triggered = new Set();
    const segments = new Map();
    const rays = [];
    tiles.forEach((tile, i) => {
      if (tile.type === "source" || tile.type === "emitter") rays.push([i, values.get(i) ?? tile.direction, tile.mask, -1]);
      if (tile.type === "target") arrivals.set(i, 0);
    });

    for (let r = 0; r < rays.length; r++) {
      const [from, direction, mask, polar] = rays[r];
      const key = `${from}/${direction}/${mask}/${polar}`;
      if (visited.has(key)) continue;
      visited.add(key);
      const tile = tiles[from];
      const [dx, dy] = vectors[direction];
      const x = tile.x + dx;
      const y = tile.y + dy;
      const outside = x < 0 || x >= size || y < 0 || y >= size;
      const next = outside ? -1 : x + y * size;
      const receiver = tiles[next];
      const stops = receiver?.type === "rock" || receiver?.type === "source" || receiver?.type === "emitter" ||
        (receiver?.type === "gate" && !openGates.has(receiver.group));
      const length = outside ? .5 : stops ? .58 : 1;
      const edge = outside || stops
        ? `${from}/${direction}/end`
        : [Math.min(from, next), Math.max(from, next)].join("/");
      const oldSegment = segments.get(edge);
      if (oldSegment) oldSegment.mask |= mask;
      else segments.set(edge, { x: tile.x, y: tile.y, dx: dx * length, dy: dy * length, mask });
      if (outside || stops) continue;

      const value = values.get(next) ?? receiver.value;
      const send = (dir = direction, color = mask, axis = polar) => {
        if (color) rays.push([next, dir, color, axis]);
      };
      if (values.has(next) || movable.has(next)) used.add(next);
      switch (receiver.type) {
        case "target":
          arrivals.set(next, arrivals.get(next) | mask);
          break;
        case "mirror":
          send(reflect[value][direction]);
          break;
        case "splitter":
          send();
          send(reflect[value][direction]);
          break;
        case "filter":
          send(direction, mask & colorValues[value]);
          break;
        case "spectral":
          send(direction, mask & ~receiver.mask);
          send(reflect[value][direction], mask & receiver.mask);
          break;
        case "dock":
          send(movable.has(next) ? reflect[movable.get(next)][direction] : direction);
          break;
        case "polar":
          if (polar === -1 || polar === value) send(direction, mask, value);
          break;
        case "sensor":
          triggered.add(receiver.group);
          break;
        default:
          send();
      }
    }

    const lit = [...arrivals].filter(([i, mask]) => mask === tiles[i].mask).length;
    return { segments: [...segments.values()], expected: arrivals.size, lit, won: lit === arrivals.size, arrivals, used, triggered, movable };
  }

  function trace(level, choices) {
    const openGates = new Set();
    // A sensor stays on while following this beam network. Opening a gate only
    // adds paths, so each repeat discovers a new sensor or finishes.
    for (;;) {
      const pass = propagate(level, choices, openGates);
      const discovered = [...pass.triggered].filter((gate) => !openGates.has(gate));
      if (!discovered.length) return { ...pass, openGates };
      discovered.forEach((gate) => openGates.add(gate));
    }
  }

  function solve(level, choices) {
    const initial = choices.slice();
    const queue = [{ choices: initial, first: null, firstValue: null, distance: 0 }];
    const visited = new Set([initial.join("")]);
    for (let index = 0; index < queue.length; index++) {
      const current = queue[index];
      if (trace(level, current.choices).won) return current;
      level.controls.forEach((cell, i) => {
        const tile = level.tiles[cell];
        const values = tile.docks
          ? tile.docks.map((_, value) => value).filter(value => value !== current.choices[i])
          : [(current.choices[i] + 1) % tile.options];
        for (const value of values) {
          const next = current.choices.slice();
          next[i] = value;
          const key = next.join("");
          if (visited.has(key)) continue;
          visited.add(key);
          queue.push({ choices: next, first: current.first ?? i, firstValue: current.firstValue ?? value, distance: current.distance + 1 });
        }
      });
    }
    return null;
  }

  globalThis.AtlasOptics = { trace, solve, colors, colorValues };
})();
