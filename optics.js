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

  function trace(level, choices) {
    const { size, tiles, controls } = level;
    const values = new Map(controls.map((index, i) => [index, choices[i]]));
    const arrivals = new Map();
    const visited = new Set();
    const used = new Set();
    const segments = new Map();
    const rays = [];
    tiles.forEach((tile, i) => {
      if (tile.type === "source") rays.push([i, tile.direction, tile.mask]);
      if (tile.type === "target") arrivals.set(i, 0);
    });

    for (let r = 0; r < rays.length; r++) {
      const [from, direction, mask] = rays[r];
      const key = `${from}/${direction}/${mask}`;
      if (visited.has(key)) continue;
      visited.add(key);
      const tile = tiles[from];
      const [dx, dy] = vectors[direction];
      const x = tile.x + dx;
      const y = tile.y + dy;
      const outside = x < 0 || x >= size || y < 0 || y >= size;
      const next = outside ? -1 : x + y * size;
      const receiver = tiles[next];
      const stops = receiver?.type === "rock" || receiver?.type === "source";
      const length = outside ? .5 : stops ? .58 : 1;
      const edge = outside || stops
        ? `${from}/${direction}/end`
        : [Math.min(from, next), Math.max(from, next)].join("/");
      const oldSegment = segments.get(edge);
      if (oldSegment) oldSegment.mask |= mask;
      else segments.set(edge, { x: tile.x, y: tile.y, dx: dx * length, dy: dy * length, mask });
      if (outside || stops) continue;

      if (values.has(next)) used.add(next);
      switch (receiver.type) {
        case "target":
          arrivals.set(next, arrivals.get(next) | mask);
          break;
        case "mirror":
          rays.push([next, reflect[values.get(next)][direction], mask]);
          break;
        case "splitter":
          rays.push([next, direction, mask], [next, reflect[values.get(next)][direction], mask]);
          break;
        case "filter": {
          const outgoing = mask & colorValues[values.get(next)];
          if (outgoing) rays.push([next, direction, outgoing]);
          break;
        }
        default:
          rays.push([next, direction, mask]);
      }
    }

    const lit = [...arrivals].filter(([i, mask]) => mask === tiles[i].mask).length;
    return { segments: [...segments.values()], expected: arrivals.size, lit, won: lit === arrivals.size, arrivals, used };
  }

  function solve(level, choices) {
    const initial = choices.slice();
    const queue = [{ choices: initial, first: null, distance: 0 }];
    const visited = new Set([initial.join("")]);
    for (let index = 0; index < queue.length; index++) {
      const current = queue[index];
      if (trace(level, current.choices).won) return current;
      level.controls.forEach((cell, i) => {
        const next = current.choices.slice();
        next[i] = (next[i] + 1) % level.tiles[cell].options;
        const key = next.join("");
        if (visited.has(key)) return;
        visited.add(key);
        queue.push({ choices: next, first: current.first ?? i, distance: current.distance + 1 });
      });
    }
    return null;
  }

  globalThis.AtlasOptics = { trace, solve, colors, colorValues };
})();
