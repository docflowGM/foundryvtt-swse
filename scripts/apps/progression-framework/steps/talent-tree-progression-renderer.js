function groupNodesByLevel(graphData) {
  const levels = new Map();
  for (const [nodeId, node] of graphData?.nodes || []) {
    const level = Number(node?.level || 0);
    if (!levels.has(level)) levels.set(level, []);
    levels.get(level).push({ nodeId, node });
  }

  for (const entries of levels.values()) {
    entries.sort((left, right) => String(left.node?.name || '').localeCompare(String(right.node?.name || '')));
  }

  return levels;
}

function computePositions(graphData) {
  const levels = groupNodesByLevel(graphData);
  const levelNumbers = Array.from(levels.keys()).sort((a, b) => a - b);
  const maxPerLevel = Math.max(1, ...Array.from(levels.values()).map((entries) => entries.length));

  // Concept-inspired holomap layout: circular nodes, broad spacing, curved conduits.
  // The outer viewport fits this SVG, so the whole constellation is visible first.
  const nodeRadius = 42;
  const horizontalGap = 150;
  const verticalGap = 92;
  const paddingX = 42;
  const paddingY = 46;
  const width = Math.max(680, paddingX * 2 + levelNumbers.length * nodeRadius * 2 + Math.max(0, levelNumbers.length - 1) * horizontalGap);
  const height = Math.max(360, paddingY * 2 + maxPerLevel * nodeRadius * 2 + Math.max(0, maxPerLevel - 1) * verticalGap);
  const positions = new Map();

  levelNumbers.forEach((level, levelIndex) => {
    const entries = levels.get(level) || [];
    const totalHeight = entries.length * nodeRadius * 2 + Math.max(0, entries.length - 1) * verticalGap;
    const startY = Math.max(paddingY + nodeRadius, (height - totalHeight) / 2 + nodeRadius);
    const x = paddingX + nodeRadius + levelIndex * (nodeRadius * 2 + horizontalGap);

    entries.forEach(({ nodeId }, index) => {
      const y = startY + index * (nodeRadius * 2 + verticalGap);
      positions.set(nodeId, {
        x,
        y,
        cx: x,
        cy: y,
        r: nodeRadius,
        level,
      });
    });
  });

  return { width, height, positions };
}

function classifyNodeState(_node, nodeState = {}) {
  if (nodeState.selected) return 'pending';
  if (nodeState.owned || nodeState.chosenElsewhere || nodeState.actorOwned) return 'owned';
  if (nodeState.legal === false) return 'locked';
  if (nodeState.legal === true) return 'legal';
  return 'default';
}

function edgeStateForChild(childState) {
  if (childState === 'pending') return 'pending';
  if (childState === 'owned') return 'owned';
  if (childState === 'legal') return 'legal';
  if (childState === 'locked') return 'locked';
  return 'default';
}

function trimLabel(value, limit = 22) {
  const raw = String(value || '').replace(/\s+/g, ' ').trim();
  if (raw.length <= limit) return raw;
  return `${raw.slice(0, Math.max(0, limit - 1)).trim()}…`;
}

function nodeStatusText(state) {
  switch (state) {
    case 'pending': return 'Pending';
    case 'owned': return 'Known';
    case 'legal': return 'Legal';
    case 'locked': return 'Locked';
    default: return 'Open';
  }
}

function nodeIcon(state) {
  switch (state) {
    case 'pending': return '◆';
    case 'owned': return '✦';
    case 'legal': return '◈';
    case 'locked': return '⊗';
    default: return '◇';
  }
}

function makeSvgEl(documentRef, tag, attrs = {}) {
  const element = documentRef.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value == null) continue;
    element.setAttribute(key, String(value));
  }
  return element;
}

function createSvgText(documentRef, x, y, textContent, className, options = {}) {
  const text = makeSvgEl(documentRef, 'text', {
    x,
    y,
    class: className,
    'text-anchor': options.anchor || 'middle',
  });
  text.textContent = textContent;
  return text;
}

function collectRelations(graphData) {
  const upstreamByNode = new Map();
  const downstreamByNode = new Map();

  const visitUpstream = (nodeId, out = new Set()) => {
    const node = graphData?.nodes?.get?.(nodeId);
    for (const prereqId of node?.prerequisites || []) {
      if (out.has(prereqId)) continue;
      out.add(prereqId);
      visitUpstream(prereqId, out);
    }
    return out;
  };

  const visitDownstream = (nodeId, out = new Set()) => {
    const node = graphData?.nodes?.get?.(nodeId);
    for (const dependentId of node?.dependents || []) {
      if (out.has(dependentId)) continue;
      out.add(dependentId);
      visitDownstream(dependentId, out);
    }
    return out;
  };

  for (const [nodeId] of graphData?.nodes || []) {
    upstreamByNode.set(nodeId, visitUpstream(nodeId));
    downstreamByNode.set(nodeId, visitDownstream(nodeId));
  }

  return { upstreamByNode, downstreamByNode };
}

function applyHoverState(svg, nodeId, relations) {
  const upstream = relations.upstreamByNode.get(nodeId) || new Set();
  const downstream = relations.downstreamByNode.get(nodeId) || new Set();

  svg.querySelectorAll('.prog-talent-orb-node').forEach(nodeEl => {
    const id = nodeEl.dataset.nodeId;
    nodeEl.classList.toggle('is-hovered', id === nodeId);
    nodeEl.classList.toggle('is-upstream', upstream.has(id));
    nodeEl.classList.toggle('is-downstream', downstream.has(id));
    nodeEl.classList.toggle('is-dimmed', id !== nodeId && !upstream.has(id) && !downstream.has(id));
  });

  svg.querySelectorAll('.prog-talent-tree-link').forEach(pathEl => {
    const from = pathEl.dataset.from;
    const to = pathEl.dataset.to;
    const isDirect = from === nodeId || to === nodeId;
    const isPath = upstream.has(from) && (upstream.has(to) || to === nodeId)
      || downstream.has(to) && (downstream.has(from) || from === nodeId);
    pathEl.classList.toggle('is-highlighted', isDirect || isPath);
    pathEl.classList.toggle('is-dimmed', !(isDirect || isPath));
  });
}

function clearHoverState(svg) {
  svg.querySelectorAll('.is-hovered, .is-upstream, .is-downstream, .is-dimmed, .is-highlighted').forEach(el => {
    el.classList.remove('is-hovered', 'is-upstream', 'is-downstream', 'is-dimmed', 'is-highlighted');
  });
}

function createSvgNode(documentRef, { nodeId, node, position, state, nodeState = {}, isFocused, onFocus, onCommit, title, svg, relations }) {
  const group = makeSvgEl(documentRef, 'g', {
    class: `prog-talent-orb-node prog-talent-orb-node--${state}${isFocused ? ' prog-talent-orb-node--focused' : ''}${nodeState?.suggested ? ' prog-talent-orb-node--suggested' : ''}`,
    tabindex: '0',
    role: 'button',
    'data-node-id': nodeId,
    'data-node-state': state,
    'data-suggested': nodeState?.suggested ? 'true' : 'false',
    'aria-label': title || node?.name || nodeId,
    transform: `translate(${position.cx} ${position.cy})`,
  });

  const titleEl = makeSvgEl(documentRef, 'title');
  titleEl.textContent = title || node?.name || nodeId;
  group.appendChild(titleEl);

  group.appendChild(makeSvgEl(documentRef, 'circle', { class: 'prog-talent-orb-node__halo', r: 45 }));
  group.appendChild(makeSvgEl(documentRef, 'circle', { class: 'prog-talent-orb-node__orbit', r: 39 }));
  group.appendChild(makeSvgEl(documentRef, 'circle', { class: 'prog-talent-orb-node__ring', r: 33 }));
  group.appendChild(makeSvgEl(documentRef, 'circle', { class: 'prog-talent-orb-node__core', r: 23 }));
  group.appendChild(createSvgText(documentRef, 0, 9, nodeIcon(state), 'prog-talent-orb-node__icon'));
  group.appendChild(createSvgText(documentRef, 30, -27, `T${Number(node?.level || 0)}`, 'prog-talent-orb-node__tier'));
  if (nodeState?.suggested) {
    group.appendChild(createSvgText(documentRef, -31, -27, nodeState?.recommendationRank ? `#${nodeState.recommendationRank}` : '★', 'prog-talent-orb-node__suggestion'));
  }
  group.appendChild(createSvgText(documentRef, 0, 65, trimLabel(node?.name || nodeId), 'prog-talent-orb-node__label'));
  group.appendChild(createSvgText(documentRef, 0, 84, nodeState?.suggested && state === 'legal' ? (nodeState?.recommendationLabel || 'Suggested') : nodeStatusText(state), 'prog-talent-orb-node__status'));

  const handleFocus = (event) => {
    event.preventDefault();
    event.stopPropagation();
    onFocus?.(nodeId);
  };

  group.addEventListener('mouseenter', () => applyHoverState(svg, nodeId, relations));
  group.addEventListener('mouseleave', () => clearHoverState(svg));
  group.addEventListener('focus', () => applyHoverState(svg, nodeId, relations));
  group.addEventListener('blur', () => clearHoverState(svg));
  group.addEventListener('click', handleFocus);
  group.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') handleFocus(event);
  });
  group.addEventListener('dblclick', (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (state === 'legal' || state === 'pending') onCommit?.(nodeId);
  });

  return group;
}

function createDefs(documentRef) {
  const defs = makeSvgEl(documentRef, 'defs');
  defs.innerHTML = `
    <filter id="progTalentHolomapGlow" x="-80%" y="-80%" width="260%" height="260%">
      <feGaussianBlur stdDeviation="4" result="coloredBlur"></feGaussianBlur>
      <feMerge>
        <feMergeNode in="coloredBlur"></feMergeNode>
        <feMergeNode in="SourceGraphic"></feMergeNode>
      </feMerge>
    </filter>
    <pattern id="progTalentHolomapGrid" width="48" height="48" patternUnits="userSpaceOnUse">
      <path d="M 48 0 L 0 0 0 48" class="prog-talent-tree-svg__grid-line" fill="none" stroke="currentColor" stroke-width="1"></path>
    </pattern>
    <radialGradient id="progTalentHolomapVignette" cx="50%" cy="45%" r="68%">
      <stop class="prog-talent-tree-svg__vignette-stop prog-talent-tree-svg__vignette-stop--inner" offset="0%" stop-color="currentColor"></stop>
      <stop class="prog-talent-tree-svg__vignette-stop prog-talent-tree-svg__vignette-stop--outer" offset="100%" stop-color="rgba(5, 5, 10, 0)"></stop>
    </radialGradient>`;
  return defs;
}

function attachPanZoom(svg, width, height) {
  const minViewWidth = Math.max(260, width * 0.38);
  const maxViewWidth = Math.max(width, width * 1.55);
  let viewBox = { x: 0, y: 0, width, height };
  let dragging = false;
  let last = null;

  const apply = () => {
    svg.setAttribute('viewBox', `${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`);
  };

  const clientPoint = (event) => {
    const rect = svg.getBoundingClientRect();
    const xRatio = rect.width ? (event.clientX - rect.left) / rect.width : 0.5;
    const yRatio = rect.height ? (event.clientY - rect.top) / rect.height : 0.5;
    return {
      x: viewBox.x + xRatio * viewBox.width,
      y: viewBox.y + yRatio * viewBox.height,
      xRatio,
      yRatio,
    };
  };

  svg.addEventListener('wheel', (event) => {
    event.preventDefault();
    const point = clientPoint(event);
    const factor = event.deltaY > 0 ? 1.12 : 0.88;
    const nextWidth = Math.min(maxViewWidth, Math.max(minViewWidth, viewBox.width * factor));
    const aspect = height / Math.max(1, width);
    const nextHeight = nextWidth * aspect;
    viewBox = {
      x: point.x - point.xRatio * nextWidth,
      y: point.y - point.yRatio * nextHeight,
      width: nextWidth,
      height: nextHeight,
    };
    apply();
  }, { passive: false });

  svg.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    if (event.target?.closest?.('.prog-talent-orb-node')) return;
    dragging = true;
    last = { x: event.clientX, y: event.clientY };
    svg.classList.add('is-panning');
    svg.setPointerCapture?.(event.pointerId);
  });

  svg.addEventListener('pointermove', (event) => {
    if (!dragging || !last) return;
    const rect = svg.getBoundingClientRect();
    const dx = rect.width ? (event.clientX - last.x) * (viewBox.width / rect.width) : 0;
    const dy = rect.height ? (event.clientY - last.y) * (viewBox.height / rect.height) : 0;
    viewBox.x -= dx;
    viewBox.y -= dy;
    last = { x: event.clientX, y: event.clientY };
    apply();
  });

  const stopDrag = (event) => {
    dragging = false;
    last = null;
    svg.classList.remove('is-panning');
    if (event?.pointerId != null) svg.releasePointerCapture?.(event.pointerId);
  };

  svg.addEventListener('pointerup', stopDrag);
  svg.addEventListener('pointercancel', stopDrag);
  svg.addEventListener('mouseleave', stopDrag);
}

function createEdgePath(documentRef, edge, fromPos, toPos, childState) {
  const sx = fromPos.cx + fromPos.r * 0.72;
  const sy = fromPos.cy;
  const tx = toPos.cx - toPos.r * 0.72;
  const ty = toPos.cy;
  const dx = Math.max(80, Math.abs(tx - sx) * 0.45);
  const d = `M ${sx} ${sy} C ${sx + dx} ${sy}, ${tx - dx} ${ty}, ${tx} ${ty}`;

  return makeSvgEl(documentRef, 'path', {
    d,
    class: `prog-talent-tree-link prog-talent-tree-link--${edgeStateForChild(childState)}`,
    'data-from': edge.from,
    'data-to': edge.to,
  });
}

export function renderProgressionTalentTree(container, options = {}) {
  if (!container) return;

  const {
    graphData,
    nodeStates = {},
    focusedTalentId = null,
    onFocus = null,
    onCommit = null,
  } = options;

  if (!graphData?.nodes || graphData.nodes.size === 0) {
    container.innerHTML = '<div class="prog-talent-tree-empty">No talents found in this tree.</div>';
    return;
  }

  const { width, height, positions } = computePositions(graphData);
  const documentRef = container.ownerDocument;
  const relations = collectRelations(graphData);
  const svg = makeSvgEl(documentRef, 'svg', {
    class: 'prog-talent-tree-svg prog-talent-tree-svg--holomap',
    viewBox: `0 0 ${width} ${height}`,
    preserveAspectRatio: 'xMidYMid meet',
    role: 'img',
    'aria-label': 'Talent tree holomap',
  });

  svg.appendChild(createDefs(documentRef));
  svg.appendChild(makeSvgEl(documentRef, 'rect', { class: 'prog-talent-tree-svg__backdrop', x: 0, y: 0, width, height }));
  svg.appendChild(makeSvgEl(documentRef, 'rect', { class: 'prog-talent-tree-svg__grid', x: 0, y: 0, width, height }));
  svg.appendChild(makeSvgEl(documentRef, 'rect', { class: 'prog-talent-tree-svg__vignette', x: 0, y: 0, width, height }));

  const edgesGroup = makeSvgEl(documentRef, 'g', { class: 'prog-talent-tree-svg__edges' });
  for (const edge of graphData.edges || []) {
    const fromPos = positions.get(edge.from);
    const toPos = positions.get(edge.to);
    if (!fromPos || !toPos) continue;
    const childState = classifyNodeState(graphData.nodes.get(edge.to), nodeStates[edge.to] || {});
    edgesGroup.appendChild(createEdgePath(documentRef, edge, fromPos, toPos, childState));
  }
  svg.appendChild(edgesGroup);

  const nodesGroup = makeSvgEl(documentRef, 'g', { class: 'prog-talent-tree-svg__nodes' });
  for (const [nodeId, node] of graphData.nodes) {
    const position = positions.get(nodeId);
    if (!position) continue;
    const state = classifyNodeState(node, nodeStates[nodeId] || {});
    const nodeState = nodeStates[nodeId] || {};
    const title = `${node?.name || nodeId} — ${nodeState?.suggested ? (nodeState?.recommendationLabel || 'Suggested') : nodeStatusText(state)}`;
    nodesGroup.appendChild(createSvgNode(documentRef, {
      nodeId,
      node,
      position,
      state,
      nodeState,
      isFocused: nodeId === focusedTalentId,
      onFocus,
      onCommit,
      title,
      svg,
      relations,
    }));
  }

  svg.appendChild(nodesGroup);
  attachPanZoom(svg, width, height);
  svg.addEventListener('mouseleave', () => clearHoverState(svg));
  container.replaceChildren(svg);
}
