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

  // Compact card layout. The SVG is fit-to-viewport by default, so the full tree
  // is visible first and graph navigation becomes optional planning context.
  const nodeWidth = 172;
  const nodeHeight = 64;
  const horizontalGap = 88;
  const verticalGap = 40;
  const paddingX = 56;
  const paddingY = 42;

  const width = Math.max(720, paddingX * 2 + levelNumbers.length * nodeWidth + Math.max(0, levelNumbers.length - 1) * horizontalGap);
  const height = Math.max(320, paddingY * 2 + maxPerLevel * nodeHeight + Math.max(0, maxPerLevel - 1) * verticalGap);
  const positions = new Map();

  levelNumbers.forEach((level, levelIndex) => {
    const entries = levels.get(level) || [];
    const totalHeight = entries.length * nodeHeight + Math.max(0, entries.length - 1) * verticalGap;
    const startY = Math.max(paddingY, (height - totalHeight) / 2);
    const x = paddingX + levelIndex * (nodeWidth + horizontalGap);

    entries.forEach(({ nodeId }, index) => {
      const y = startY + index * (nodeHeight + verticalGap);
      positions.set(nodeId, {
        x,
        y,
        cx: x + nodeWidth / 2,
        cy: y + nodeHeight / 2,
        width: nodeWidth,
        height: nodeHeight
      });
    });
  });

  return { width, height, positions };
}

function classifyNodeState(node, nodeState = {}) {
  if (nodeState.selected || nodeState.owned) return 'owned';
  if (nodeState.legal === false) return 'blocked';
  if (nodeState.legal === true) return 'available';
  return 'default';
}

function edgeStateForChild(childState) {
  if (childState === 'owned') return 'owned';
  if (childState === 'available') return 'available';
  if (childState === 'blocked') return 'blocked';
  return 'default';
}

function trimLabel(value, limit = 28) {
  const raw = String(value || '').replace(/\s+/g, ' ').trim();
  if (raw.length <= limit) return raw;
  return `${raw.slice(0, Math.max(0, limit - 1)).trim()}…`;
}

function nodeStatusText(state) {
  switch (state) {
    case 'owned': return 'Chosen';
    case 'available': return 'Available';
    case 'blocked': return 'Locked';
    default: return 'Open';
  }
}

function createSvgText(documentRef, x, y, textContent, className, options = {}) {
  const text = documentRef.createElementNS('http://www.w3.org/2000/svg', 'text');
  text.setAttribute('x', x);
  text.setAttribute('y', y);
  text.setAttribute('class', className);
  text.setAttribute('text-anchor', options.anchor || 'start');
  text.textContent = textContent;
  return text;
}

function createSvgNode(documentRef, { nodeId, node, position, state, isFocused, onFocus, onCommit, title }) {
  const group = documentRef.createElementNS('http://www.w3.org/2000/svg', 'g');
  group.setAttribute('class', `prog-talent-card-node prog-talent-card-node--${state}${isFocused ? ' prog-talent-card-node--focused' : ''}`);
  group.setAttribute('tabindex', '0');
  group.setAttribute('role', 'button');
  group.setAttribute('data-node-id', nodeId);
  group.setAttribute('aria-label', title || node?.name || nodeId);

  const titleEl = documentRef.createElementNS('http://www.w3.org/2000/svg', 'title');
  titleEl.textContent = title || node?.name || nodeId;
  group.appendChild(titleEl);

  const rect = documentRef.createElementNS('http://www.w3.org/2000/svg', 'rect');
  rect.setAttribute('x', position.x);
  rect.setAttribute('y', position.y);
  rect.setAttribute('width', position.width);
  rect.setAttribute('height', position.height);
  rect.setAttribute('rx', '10');
  rect.setAttribute('ry', '10');
  rect.setAttribute('class', 'prog-talent-card-node__shape');
  group.appendChild(rect);

  const titleText = createSvgText(
    documentRef,
    position.x + 14,
    position.y + 26,
    trimLabel(node?.name || nodeId, 26),
    'prog-talent-card-node__label'
  );
  group.appendChild(titleText);

  const statusText = createSvgText(
    documentRef,
    position.x + 14,
    position.y + 48,
    nodeStatusText(state),
    'prog-talent-card-node__status'
  );
  group.appendChild(statusText);

  const handleFocus = (event) => {
    event.preventDefault();
    event.stopPropagation();
    onFocus?.(nodeId);
  };

  group.addEventListener('click', handleFocus);
  group.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') handleFocus(event);
  });
  group.addEventListener('dblclick', (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (state !== 'blocked') onCommit?.(nodeId);
  });

  return group;
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
  const svg = documentRef.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'prog-talent-tree-svg prog-talent-tree-svg--fit');
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', 'Talent tree map');

  const edgesGroup = documentRef.createElementNS('http://www.w3.org/2000/svg', 'g');
  edgesGroup.setAttribute('class', 'prog-talent-tree-svg__edges');

  for (const edge of graphData.edges || []) {
    const fromPos = positions.get(edge.from);
    const toPos = positions.get(edge.to);
    if (!fromPos || !toPos) continue;

    const childState = classifyNodeState(graphData.nodes.get(edge.to), nodeStates[edge.to] || {});
    const line = documentRef.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', fromPos.x + fromPos.width);
    line.setAttribute('y1', fromPos.cy);
    line.setAttribute('x2', toPos.x);
    line.setAttribute('y2', toPos.cy);
    line.setAttribute('class', `prog-talent-tree-link prog-talent-tree-link--${edgeStateForChild(childState)}`);
    edgesGroup.appendChild(line);
  }
  svg.appendChild(edgesGroup);

  const nodesGroup = documentRef.createElementNS('http://www.w3.org/2000/svg', 'g');
  nodesGroup.setAttribute('class', 'prog-talent-tree-svg__nodes');

  for (const [nodeId, node] of graphData.nodes) {
    const position = positions.get(nodeId);
    if (!position) continue;
    const state = classifyNodeState(node, nodeStates[nodeId] || {});
    const title = `${node?.name || nodeId} — ${nodeStatusText(state)}`;
    nodesGroup.appendChild(createSvgNode(documentRef, {
      nodeId,
      node,
      position,
      state,
      isFocused: nodeId === focusedTalentId,
      onFocus,
      onCommit,
      title,
    }));
  }

  svg.appendChild(nodesGroup);
  container.replaceChildren(svg);
}
