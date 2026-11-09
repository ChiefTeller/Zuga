/* ZUGA — Genesis interaction, revised to follow the approved sequence:
   אלוהים → סוף / אינסוף → פרוטונים / אלקטרונים / נייטרונים → פחמן / חנקן / מימן / חמצן
   The motion is intentionally game-like: nodes are born from tension lines, float gently, and the camera expands as the universe grows. */
(() => {
  'use strict';
  const stageEl = document.getElementById('genesis-stage');
  if (!stageEl) return;

  const guidance = document.getElementById('genesis-guidance');
  const resetButton = document.querySelector('.genesis-reset');
  const mobileQuery = window.matchMedia('(max-width: 760px)');
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const ns = 'http://www.w3.org/2000/svg';

  const nodes = {
    god:        { label: 'אלוהים',     tone: 'gold',  size: 'god' },
    end:        { label: 'סוף',        tone: 'amber', size: 'origin' },
    infinity:   { label: 'אינסוף',     tone: 'blue',  size: 'origin' },
    proton:     { label: 'פרוטונים',   tone: 'gold',  size: 'field' },
    electron:   { label: 'אלקטרונים',  tone: 'cyan',  size: 'field' },
    neutron:    { label: 'נייטרונים',  tone: 'violet',size: 'field' },
    carbon:     { label: 'פחמן',       tone: 'amber', size: 'leaf' },
    nitrogen:   { label: 'חנקן',       tone: 'blue',  size: 'leaf' },
    hydrogen:   { label: 'מימן',       tone: 'mint',  size: 'leaf' },
    oxygen:     { label: 'חמצן',       tone: 'cyan',  size: 'leaf' }
  };

  const order = ['proton', 'electron', 'neutron'];
  const elements = ['carbon', 'nitrogen', 'hydrogen', 'oxygen'];

  const state = {
    stage: 0, // 0 start, 1 duality, 2 proton, 3 electron, 4 neutron, 5 four elements
    lastAction: '',
    newNodes: []
  };

  const svg = create('svg', {
    class: 'genesis-universe', xmlns: ns, role: 'group',
    viewBox: '0 0 1100 1100', preserveAspectRatio: 'xMidYMid meet',
    'aria-label': 'יקום זוגאי אינטראקטיבי — לחיצה בוראת תופעות חדשות דרך המתח'
  });
  svg.append(create('title', {}, 'ZUGA Genesis'));
  stageEl.replaceChildren(svg);

  let currentView = null;
  let cameraFrame = 0;

  function create(tag, attrs = {}, text) {
    const el = document.createElementNS(ns, tag);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
    if (text !== undefined) el.textContent = text;
    return el;
  }

  function pos() {
    if (mobileQuery.matches) {
      return {
        god: [340, 135],
        end: [200, 325], infinity: [480, 325],
        proton: [135, 520], electron: [340, 535], neutron: [545, 520],
        carbon: [100, 910], nitrogen: [260, 865], hydrogen: [420, 865], oxygen: [580, 910],
        tauOriginA: [250, 325], tauOriginB: [430, 325],
        // Elements charge sits below the electron bubble and away from the caption.
        tauElementsA: [220, 685], tauElementsB: [460, 685]
      };
    }
    return {
      god: [550, 118],
      end: [355, 285], infinity: [745, 285],
      proton: [250, 440], electron: [550, 460], neutron: [850, 440],
      carbon: [165, 805], nitrogen: [400, 780], hydrogen: [700, 780], oxygen: [935, 805],
      tauOriginA: [430, 285], tauOriginB: [670, 285],
      tauElementsA: [365, 630], tauElementsB: [735, 630]
    };
  }

  function camera() {
    if (mobileQuery.matches) {
      if (state.stage >= 5) return [0, 0, 680, 1080];
      if (state.stage >= 4) return [0, 0, 680, 810];
      if (state.stage >= 2) return [0, 0, 680, 740];
      if (state.stage >= 1) return [40, 20, 560, 430];
      return [120, 0, 440, 360];
    }
    if (state.stage >= 5) return [0, 0, 1100, 940];
    if (state.stage >= 4) return [40, 0, 1020, 750];
    if (state.stage >= 2) return [40, 10, 1020, 690];
    if (state.stage >= 1) return [170, 10, 760, 430];
    return [275, 0, 550, 380];
  }

  function animateCamera() {
    const next = camera();
    cancelAnimationFrame(cameraFrame);
    if (!currentView || motionQuery.matches) {
      currentView = next.slice();
      svg.setAttribute('viewBox', next.join(' '));
      return;
    }
    const from = currentView.slice();
    const started = performance.now();
    const dur = 820;
    function frame(now) {
      const p = Math.min(1, (now - started) / dur);
      const ease = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
      currentView = from.map((v, i) => v + (next[i] - v) * ease);
      svg.setAttribute('viewBox', currentView.map(v => v.toFixed(2)).join(' '));
      if (p < 1) cameraFrame = requestAnimationFrame(frame);
    }
    cameraFrame = requestAnimationFrame(frame);
  }

  function visibleNodes() {
    const list = ['god'];
    if (state.stage >= 1) list.push('end', 'infinity');
    if (state.stage >= 2) list.push('proton');
    if (state.stage >= 3) list.push('electron');
    if (state.stage >= 4) list.push('neutron');
    if (state.stage >= 5) list.push(...elements);
    return new Set(list);
  }

  function activeAction() {
    if (state.stage === 0) return 'create';
    if (state.stage >= 1 && state.stage < 4) return 'origin';
    if (state.stage === 4) return 'elements';
    return null;
  }

  function hintText() {
    if (state.stage === 0) return 'לחצו כאן כדי לברוא';
    if (state.stage === 1) return 'לחצו על המתח כדי לברוא פרוטונים';
    if (state.stage === 2) return 'לחצו שוב על המתח כדי לברוא אלקטרונים';
    if (state.stage === 3) return 'לחצו שוב על המתח כדי לברוא נייטרונים';
    if (state.stage === 4) return 'לחצו על המתח כדי ליצור יסודות: פחמן, חנקן, מימן וחמצן';
    return 'היסודות נוצרו — המשיכו לחקור את רשת היחסים';
  }

  function perform(action) {
    if (action === 'create' && state.stage === 0) {
      state.stage = 1;
      state.newNodes = ['end', 'infinity'];
      state.lastAction = action;
      render();
      return;
    }
    if (action === 'origin' && state.stage >= 1 && state.stage < 4) {
      state.stage += 1;
      state.newNodes = [order[state.stage - 2]];
      state.lastAction = action;
      render();
      return;
    }
    if (action === 'elements' && state.stage === 4) {
      state.stage = 5;
      state.newNodes = elements.slice();
      state.lastAction = action;
      render();
      return;
    }
  }

  function curve(p1, p2, arch = 0.16, direction = -1) {
    const midX = (p1[0] + p2[0]) / 2;
    const midY = (p1[1] + p2[1]) / 2;
    const dx = p2[0] - p1[0];
    const dy = p2[1] - p1[1];
    const len = Math.max(1, Math.hypot(dx, dy));
    const nx = -dy / len;
    const ny = dx / len;
    const offset = len * arch * direction;
    const cx = midX + nx * offset;
    const cy = midY + ny * offset;
    return `M${p1[0]} ${p1[1]} Q${cx} ${cy} ${p2[0]} ${p2[1]}`;
  }

  function addConnection(parent, p1, p2, opts = {}) {
    const path = curve(p1, p2, opts.arch ?? 0.14, opts.direction ?? -1);
    if (opts.glow !== false) parent.append(create('path', { class: 'genesis-trace-halo', d: path }));
    parent.append(create('path', { class: 'genesis-trace ' + (opts.className || ''), d: path }));
    parent.append(create('path', { class: 'genesis-flow-trace ' + (opts.flowClass || ''), d: path }));
  }

  function addInteractiveCharge(parent, p1, p2, action, label, done = false) {
    const path = curve(p1, p2, 0.1, -1);
    const g = create('g', {
      class: 'genesis-charge' + (done ? ' genesis-charge--done' : ''),
      role: 'button', tabindex: '0', 'aria-label': label, 'data-action': action
    });
    g.append(create('path', { class: 'genesis-charge-glow', d: path }));
    g.append(create('path', { class: 'genesis-charge-line', d: path }));
    g.append(create('path', { class: 'genesis-charge-hit', d: path }));
    const cx = (p1[0] + p2[0]) / 2;
    const cy = (p1[1] + p2[1]) / 2;
    g.append(create('circle', { class: 'genesis-charge-pulse', cx, cy, r: done ? 23 : 30 }));
    g.append(create('circle', { class: 'genesis-charge-center', cx, cy, r: done ? 16 : 20 }));
    g.append(create('text', { class: done ? 'genesis-done-tau' : 'genesis-tau', x: cx, y: cy + 7, 'text-anchor': 'middle' }, 'τ'));
    if (!done) g.append(create('circle', { class: 'genesis-charge-touch-target', cx, cy, r: 42, 'aria-hidden': 'true' }));
    g.addEventListener('click', ev => { ev.stopPropagation(); perform(action); });
    g.addEventListener('keydown', ev => {
      if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); perform(action); }
    });
    parent.append(g);
  }

  function radiusFor(size) {
    if (size === 'god') return 76;
    if (size === 'origin') return 66;
    if (size === 'field') return 57;
    return 46;
  }

  function labelLines(text) {
    if (text === 'פרוטונים') return ['פרו', 'טונים'];
    if (text === 'אלקטרונים') return ['אלקטרו', 'נים'];
    if (text === 'נייטרונים') return ['נייטרו', 'נים'];
    return [text];
  }

  function placeNode(parent, id, coords, index, interactive = false) {
    const def = nodes[id];
    const [x, y] = coords[id];
    const radius = radiusFor(def.size);
    const group = create('g', {
      class: `genesis-node genesis-node--${def.tone}` +
        (interactive ? ' genesis-node--clickable' : '') +
        (state.newNodes.includes(id) ? ' genesis-node--appear' : ''),
      transform: `translate(${x} ${y})`,
      'data-node': id,
      style: `--float-delay:${(index * 0.23).toFixed(2)}s;--float-shift:${(10 + (index % 4) * 3)}px;`
    });
    if (interactive) {
      group.setAttribute('role', 'button');
      group.setAttribute('tabindex', '0');
      group.setAttribute('aria-label', 'לחצו כדי לברוא יקום');
      group.addEventListener('click', ev => { ev.stopPropagation(); perform('create'); });
      group.addEventListener('keydown', ev => {
        if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); perform('create'); }
      });
      group.append(create('circle', { class: 'genesis-node-hit', r: radius + 36 }));
    }
    const visual = create('g', { class: 'genesis-node-visual' });
    visual.append(create('circle', { class: 'genesis-node-glow', r: radius + 22 }));
    visual.append(create('circle', { class: 'genesis-node-orbit', r: radius + 12 }));
    visual.append(create('circle', { class: 'genesis-node-shell', r: radius, fill: `url(#g-${def.tone})` }));
    visual.append(create('circle', { class: 'genesis-node-shine', cx: -radius * 0.24, cy: -radius * 0.36, r: radius * 0.22 }));
    visual.append(create('ellipse', { class: 'genesis-node-ring', rx: radius + 18, ry: radius * 0.28, transform: 'rotate(-19)' }));
    const text = create('text', {
      class: 'genesis-node-label' + (id === 'god' ? ' genesis-node-label--god' : ''),
      'text-anchor': 'middle', 'dominant-baseline': 'middle'
    });
    const lines = labelLines(def.label);
    const fontSize = id === 'god' ? 26 : lines.length > 1 ? 20 : 22;
    text.setAttribute('font-size', fontSize);
    lines.forEach((line, i) => {
      text.append(create('tspan', { x: 0, dy: i === 0 ? (lines.length > 1 ? -12 : 0) : 27 }, line));
    });
    visual.append(text);
    group.append(visual);
    parent.append(group);
  }

  function addRootInstruction(parent, coords) {
    // Keep the instruction *below* the God bubble. The old top-right label
    // intruded into its hit target at narrow viewports.
    const g = create('g', { class: 'genesis-root-instruction', 'aria-hidden': 'true' });
    const [gx, gy] = coords.god;
    // God radius is 76; all arrow points stay outside that circle.
    g.append(create('path', {
      class: 'genesis-root-arrow',
      d: `M${gx + 33} ${gy + 142} Q${gx + 64} ${gy + 116} ${gx + 25} ${gy + 90}`
    }));
    g.append(create('path', {
      class: 'genesis-root-arrow-head',
      d: `M${gx + 16} ${gy + 96} L${gx + 25} ${gy + 90} L${gx + 29} ${gy + 101}`
    }));
    const text = create('text', {
      x: gx, y: gy + 183, 'text-anchor': 'middle', class: 'genesis-root-label'
    }, 'לחצו כאן כדי לברוא');
    g.append(text);
    parent.append(g);
  }

  function defineGraphics(parent) {
    const defs = create('defs');
    const gradients = {
      gold: ['#fff5d2', '#e8b85e', '#5a3b17'],
      amber: ['#ffe3c5', '#f0ab77', '#683620'],
      blue: ['#d5efff', '#61a7ff', '#133d8c'],
      cyan: ['#e1feff', '#57d6ea', '#146372'],
      mint: ['#defff2', '#65ebb8', '#145a4d'],
      violet: ['#efdefe', '#9b7bf0', '#3c2a8f'],
      human: ['#fffbe7', '#e7d9a5', '#76517a']
    };
    for (const [name, stops] of Object.entries(gradients)) {
      const g = create('radialGradient', { id: `g-${name}`, cx: '30%', cy: '23%', r: '82%' });
      const offsets = ['0%', '45%', '100%'];
      stops.forEach((color, i) => g.append(create('stop', { offset: offsets[i], 'stop-color': color })));
      defs.append(g);
    }
    const line = create('linearGradient', { id: 'genesis-line', x1: '0%', y1: '0%', x2: '100%', y2: '0%' });
    [ ['0%', '#4f83da'], ['35%', '#d5eaff'], ['65%', '#f0d79c'], ['100%', '#86a8f0'] ].forEach(([o, c]) => line.append(create('stop', { offset: o, 'stop-color': c })));
    defs.append(line);

    const blur = create('filter', { id: 'genesis-light', x: '-150%', y: '-150%', width: '400%', height: '400%' });
    blur.append(create('feGaussianBlur', { stdDeviation: '12' }));
    defs.append(blur);
    parent.append(defs);
  }

  function render() {
    const coords = pos();
    const visible = visibleNodes();
    svg.replaceChildren();
    defineGraphics(svg);

    const bg = create('g', { class: 'genesis-backdrop' });
    for (let i = 0; i < 110; i++) {
      const x = ((i * 87.317) % 1080) + 10;
      const y = ((i * 57.813) % 1080) + 10;
      const r = i % 11 === 0 ? 2.6 : (i % 4 === 0 ? 1.55 : .9);
      const alpha = i % 5 === 0 ? .78 : .36;
      bg.append(create('circle', { cx: x.toFixed(1), cy: y.toFixed(1), r, fill: '#dcecff', opacity: alpha }));
    }
    svg.append(bg);

    if (state.stage === 0) addRootInstruction(svg, coords);

    const links = create('g', { class: 'genesis-links' });
    if (state.stage >= 1) {
      addConnection(links, coords.god, coords.end, { arch: .11, direction: 1 });
      addConnection(links, coords.god, coords.infinity, { arch: .11, direction: -1 });
    }
    if (state.stage >= 2) addConnection(links, coords.end, coords.proton, { arch: .10, direction: 1 });
    if (state.stage >= 3) addConnection(links, coords.infinity, coords.electron, { arch: .15, direction: -1 });
    if (state.stage >= 4) {
      addConnection(links, coords.end, coords.neutron, { arch: .10, direction: -1 });
      addConnection(links, coords.proton, coords.electron, { arch: .09, direction: -1, className: 'genesis-science-line' });
      addConnection(links, coords.electron, coords.neutron, { arch: .09, direction: 1, className: 'genesis-science-line' });
    }
    if (state.stage >= 5) {
      addConnection(links, coords.proton, coords.carbon, { arch: .08, direction: 1 });
      addConnection(links, coords.proton, coords.nitrogen, { arch: .08, direction: -1, className: 'genesis-science-line' });
      addConnection(links, coords.electron, coords.nitrogen, { arch: .08, direction: 1 });
      addConnection(links, coords.electron, coords.hydrogen, { arch: .08, direction: -1 });
      addConnection(links, coords.neutron, coords.hydrogen, { arch: .08, direction: 1, className: 'genesis-science-line' });
      addConnection(links, coords.neutron, coords.oxygen, { arch: .08, direction: -1 });
      addConnection(links, coords.carbon, coords.nitrogen, { arch: .06, direction: -1, className: 'genesis-science-line' });
      addConnection(links, coords.nitrogen, coords.hydrogen, { arch: .06, direction: 1, className: 'genesis-science-line' });
      addConnection(links, coords.hydrogen, coords.oxygen, { arch: .06, direction: -1, className: 'genesis-science-line' });
    }
    svg.append(links);

    const action = activeAction();
    const interactive = create('g', { class: 'genesis-interactive' });
    if (state.stage >= 1) {
      if (state.stage < 4) {
        addInteractiveCharge(interactive, coords.tauOriginA, coords.tauOriginB, 'origin', hintText());
      } else {
        addInteractiveCharge(interactive, coords.tauOriginA, coords.tauOriginB, 'noop', 'תהליך ראשוני הושלם', true);
      }
    }
    if (state.stage >= 4) {
      if (state.stage === 4) addInteractiveCharge(interactive, coords.tauElementsA, coords.tauElementsB, 'elements', hintText());
      else addInteractiveCharge(interactive, coords.tauElementsA, coords.tauElementsB, 'noop', 'שכבת היסודות הושלמה', true);
    }
    Array.from(interactive.querySelectorAll('[data-action="noop"]')).forEach(el => {
      el.removeAttribute('tabindex');
      el.removeAttribute('role');
      el.classList.add('genesis-charge--done');
      const hit = el.querySelector('.genesis-charge-hit'); if (hit) hit.remove();
    });
    // Charge controls are drawn last so the transparent hit area is never obscured.

    const visibleList = Array.from(visible);
    const nodeLayer = create('g', { class: 'genesis-nodes' });
    visibleList.forEach((id, idx) => placeNode(nodeLayer, id, coords, idx, id === 'god' && state.stage === 0));
    svg.append(nodeLayer);
    svg.append(interactive);

    if (guidance) guidance.textContent = hintText();
    animateCamera();
    // Clear the 'new node' flag after one frame so the next render reuses a stable tree.
    requestAnimationFrame(() => { state.newNodes = []; });
  }

  if (resetButton) resetButton.addEventListener('click', () => {
    state.stage = 0; state.lastAction = ''; state.newNodes = [];
    render();
  });
  mobileQuery.addEventListener?.('change', () => render());
  render();
})();
