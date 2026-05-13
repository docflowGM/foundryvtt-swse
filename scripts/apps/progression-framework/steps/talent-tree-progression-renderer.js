function groupNodesByLevel(graphData) {
  const levels = new Map();
  for (const [nodeId, node] of graphData?.nodes || []) {
    const level = Number(node?.level || 0);
    if (!levels.has(level)) {
      levels.set(level, []);
    }
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

  // Larger nodes for readability
  const nodeWidth = 220;
  const nodeHeight = 100;
  const horizontalGap = 120;    // Gap between levels (left-to-right)
  const verticalGap = 140;      // Gap between nodes in same level (top-to-bottom)
  const paddingX = 80;
  const paddingY = 60;

  // Layout is now left-to-right: x based on level, y based on position within level
  const width = Math.max(1000, paddingX * 2 + levelNumbers.length * nodeWidth + Math.max(0, levelNumbers.length - 1) * horizontalGap);
  const height = Math.max(500, paddingY * 2 + maxPerLevel * nodeHeight + Math.max(0, maxPerLevel - 1) * verticalGap);
  const positions = new Map();

  for (const level of levelNumbers) {
    const entries = levels.get(level) || [];
    const numInLevel = entries.length;

    // X position: levels flow left-to-right
    const x = paddingX + level * (nodeWidth + horizontalGap);

    // Y position: nodes stack top-to-bottom within level, centered vertically
    const totalHeight = numInLevel * nodeHeight + Math.max(0, numInLevel - 1) * verticalGap;
    const startY = Math.max(paddingY, (height - totalHeight) / 2);

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
  }

  return { width, height, positions };
}

function classifyNodeState(node, nodeState = {}) {
  if (nodeState.selected || nodeState.owned) {
    return 'owned';
  }
  if (nodeState.legal === false) {
    return 'blocked';
  }
  if ((node?.prerequisites || []).length > 0 && nodeState.legal === true) {
    return 'available';
  }
  return 'default';
}

function edgeStateForChild(childState) {
  if (childState === 'owned') return 'owned';
  if (childState === 'available') return 'available';
  if (childState === 'blocked') return 'blocked';
  return 'default';
}

function nodeLabel(node) {
  const raw = String(node?.name || '');
  if (!raw) return '';
  const parts = raw.split(/\s+/);
  if (parts.length <= 2) return raw;
  const midpoint = Math.ceil(parts.length / 2);
  return `${parts.slice(0, midpoint).join(' ')}\n${parts.slice(midpoint).join(' ')}`;
}

function createSvgNode(documentRef, { nodeId, node, position, state, isFocused, onFocus, onCommit, title }) {
  const group = documentRef.createElementNS('http://www.w3.org/2000/svg', 'g');
  group.setAttribute('class', `prog-talent-oval prog-talent-oval--${state}${isFocused ? ' prog-talent-oval--focused' : ''}`);
  group.setAttribute('tabindex', '0');
  group.setAttribute('role', 'button');
  group.setAttribute('aria-label', title || node?.name || nodeId);

  const titleEl = documentRef.createElementNS('http://www.w3.org/2000/svg', 'title');
  titleEl.textContent = title || node?.name || nodeId;
  group.appendChild(titleEl);

  const ellipse = documentRef.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
  ellipse.setAttribute('cx', position.cx);
  ellipse.setAttribute('cy', position.cy);
  ellipse.setAttribute('rx', position.width / 2 - 4);
  ellipse.setAttribute('ry', position.height / 2 - 4);
  ellipse.setAttribute('class', 'prog-talent-oval__shape');
  group.appendChild(ellipse);

  const text = documentRef.createElementNS('http://www.w3.org/2000/svg', 'text');
  text.setAttribute('x', position.cx);
  text.setAttribute('y', position.cy);
  text.setAttribute('text-anchor', 'middle');
  text.setAttribute('dominant-baseline', 'middle');
  text.setAttribute('class', 'prog-talent-oval__label');

  const lines = nodeLabel(node).split('\n');
  lines.forEach((line, index) => {
    const tspan = documentRef.createElementNS('http://www.w3.org/2000/svg', 'tspan');
    tspan.setAttribute('x', position.cx);
    tspan.setAttribute('dy', index === 0 ? (lines.length === 1 ? '0' : '-0.6em') : '1.2em');
    tspan.textContent = line;
    text.appendChild(tspan);
  });
  group.appendChild(text);

  const handleFocus = (event) => {
    event.preventDefault();
    event.stopPropagation();
    onFocus?.(nodeId);
  };

  group.addEventListener('click', handleFocus);
  group.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      handleFocus(event);
    }
  });
  group.addEventListener('dblclick', (event) => {
    event.preventDefault();
    event.stopPropagation();
    onCommit?.(nodeId);
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
  svg.setAttribute('class', 'prog-talent-tree-svg');
  svg.setAttribute('width', width);
  svg.setAttribute('height', height);
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.style.width = `${width}px`;
  svg.style.height = `${height}px`;

  const edgesGroup = documentRef.createElementNS('http://www.w3.org/2000/svg', 'g');
  edgesGroup.setAttribute('class', 'prog-talent-tree-svg__edges');

  for (const edge of graphData.edges || []) {
    const fromPos = positions.get(edge.from);
    const toPos = positions.get(edge.to);
    if (!fromPos || !toPos) continue;

    const childState = classifyNodeState(graphData.nodes.get(edge.to), nodeStates[edge.to] || {});
    const line = documentRef.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', fromPos.cx);
    line.setAttribute('y1', fromPos.y + fromPos.height - 6);
    line.setAttribute('x2', toPos.cx);
    line.setAttribute('y2', toPos.y + 6);
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
    const statusLabel = state === 'owned'
      ? 'Purchased'
      : state === 'available'
        ? 'Meets prerequisite'
        : state === 'blocked'
          ? 'Does not meet prerequisite'
          : 'Default';
    const title = `${node?.name || nodeId} — ${statusLabel}`;
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
