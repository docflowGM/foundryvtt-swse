// ============================================
// Enhanced Talent Tree Visualization
// Hierarchical graph with prerequisites and dependents
// Inspired by skill tree UI with hexagonal nodes
// ============================================

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { getTalentTreeName } from "/systems/foundryvtt-swse/scripts/apps/chargen/chargen-property-accessor.js";

/**
 * Parse prerequisites string to extract talent dependencies
 * @param {string} prereqString - Raw prerequisites string
 * @returns {string[]} Array of talent names that are prerequisites
 */
function parsePrerequisites(prereqString) {
  if (!prereqString) {return [];}

  const talentPrereqs = [];

  // Split by common delimiters
  const parts = prereqString.split(/[,;]/);

  for (const part of parts) {
    const trimmed = part.trim();
    // Look for "X talent" pattern
    const talentMatch = trimmed.match(/^(.+?)\s+talent$/i);
    if (talentMatch) {
      talentPrereqs.push(talentMatch[1].trim());
    }
  }

  return talentPrereqs;
}

/**
 * Build dependency graph from talents
 * @param {Object[]} talents - Array of talent objects
 * @returns {Object} Graph with nodes and edges
 */
function buildDependencyGraph(talents) {
  const nodes = new Map();
  const edges = [];
  const talentsByName = new Map();

  // First pass: create nodes for all talents
  for (const talent of talents) {
    const id = talent._id || talent.name;
    talentsByName.set(talent.name.toLowerCase(), talent);
    nodes.set(id, {
      id,
      name: talent.name,
      talent,
      prerequisites: [],
      dependents: [],
      level: 0
    });
  }

  // Second pass: parse prerequisites and create edges
  for (const talent of talents) {
    const nodeId = talent._id || talent.name;
    const node = nodes.get(nodeId);
    const prereqString = talent.system?.prerequisites || talent.system?.prerequisite || '';
    const prereqNames = parsePrerequisites(prereqString);

    // Also check for direct talent name matches in prerequisites
    for (const [name, prereqTalent] of talentsByName) {
      if (prereqString.toLowerCase().includes(name) && name !== talent.name.toLowerCase()) {
        if (!prereqNames.includes(prereqTalent.name)) {
          prereqNames.push(prereqTalent.name);
        }
      }
    }

    for (const prereqName of prereqNames) {
      const prereqTalent = talentsByName.get(prereqName.toLowerCase());
      if (prereqTalent) {
        const prereqId = prereqTalent._id || prereqTalent.name;
        const prereqNode = nodes.get(prereqId);

        if (prereqNode && prereqNode.id !== nodeId) {
          node.prerequisites.push(prereqId);
          prereqNode.dependents.push(nodeId);
          edges.push({
            from: prereqId,
            to: nodeId
          });
        }
      }
    }
  }

  // Calculate levels (topological sort)
  calculateLevels(nodes);

  return { nodes, edges };
}

/**
 * Calculate hierarchical levels for nodes
 */
function calculateLevels(nodes) {
  const visited = new Set();
  const inProgress = new Set();

  function visit(nodeId, level) {
    if (inProgress.has(nodeId)) {
      // Cycle detected - log warning
      const node = nodes.get(nodeId);
      if (node) {
        console.warn(`[TALENT-TREE] Circular dependency detected for talent: ${node.name || nodeId}`);
      }
      return;
    }

    const node = nodes.get(nodeId);
    if (!node) {return;}

    if (visited.has(nodeId)) {
      node.level = Math.max(node.level, level);
      return;
    }

    inProgress.add(nodeId);
    node.level = Math.max(node.level, level);

    for (const depId of node.dependents) {
      visit(depId, level + 1);
    }

    inProgress.delete(nodeId);
    visited.add(nodeId);
  }

  // Start from root nodes (no prerequisites)
  for (const [nodeId, node] of nodes) {
    if (node.prerequisites.length === 0) {
      visit(nodeId, 0);
    }
  }

  // Handle orphaned nodes
  for (const [nodeId, node] of nodes) {
    if (!visited.has(nodeId)) {
      visit(nodeId, 0);
    }
  }
}

/**
 * Calculate positions for nodes in the graph
 */
function calculatePositions(nodes, width, height) {
  const positions = new Map();
  const levelGroups = new Map();

  // Group nodes by level
  for (const [nodeId, node] of nodes) {
    if (!levelGroups.has(node.level)) {
      levelGroups.set(node.level, []);
    }
    levelGroups.get(node.level).push(nodeId);
  }

  const maxLevel = Math.max(...levelGroups.keys(), 0);
  const verticalPadding = 70;
  const horizontalPadding = 80;

  const availableHeight = height - verticalPadding * 2;
  const levelSpacing = maxLevel > 0 ? availableHeight / maxLevel : 0;

  // Position nodes level by level
  for (const [level, nodeIds] of levelGroups) {
    const y = verticalPadding + level * levelSpacing;
    const nodeCount = nodeIds.length;
    const availableWidth = width - horizontalPadding * 2;
    const nodeSpacing = nodeCount > 1 ? availableWidth / (nodeCount - 1) : 0;
    const startX = nodeCount > 1 ? horizontalPadding : width / 2;

    nodeIds.forEach((nodeId, index) => {
      const x = nodeCount > 1 ? startX + index * nodeSpacing : startX;
      positions.set(nodeId, { x, y });
    });
  }

  return positions;
}

/**
 * Get node state based on character data
 */
function getNodeState(talent, characterData, allTalents) {
  const isSelected = characterData.talents?.some(t =>
    t._id === talent._id || t.name === talent.name
  );

  if (isSelected) {return 'selected';}

  const prereqString = talent.system?.prerequisites || talent.system?.prerequisite || '';
  if (!prereqString) {return 'available';}

  const selectedTalentNames = new Set(
    (characterData.talents || []).map(t => t.name.toLowerCase())
  );

  for (const otherTalent of allTalents) {
    if (otherTalent.name !== talent.name) {
      if (prereqString.toLowerCase().includes(otherTalent.name.toLowerCase())) {
        if (!selectedTalentNames.has(otherTalent.name.toLowerCase())) {
          return 'locked';
        }
      }
    }
  }

  return 'available';
}

/**
 * Create hexagon path for SVG
 */
function createHexagonPath(cx, cy, size) {
  const points = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 2;
    const x = cx + size * Math.cos(angle);
    const y = cy + size * Math.sin(angle);
    points.push(`${x},${y}`);
  }
  return `M ${points.join(' L ')} Z`;
}

/**
 * Render the talent tree graph as SVG
 */
export function renderTalentTreeGraph(container, talents, characterData, onSelectTalent) {
  if (!talents || talents.length === 0) {
    container.innerHTML = '<p class="no-talents">No talents in this tree</p>';
    return;
  }

  const { nodes, edges } = buildDependencyGraph(talents);

  // Calculate dimensions
  const maxLevel = Math.max(...[...nodes.values()].map(n => n.level), 0);
  const maxNodesPerLevel = Math.max(
    ...[...new Set([...nodes.values()].map(n => n.level))].map(level =>
      [...nodes.values()].filter(n => n.level === level).length
    ),
    1
  );

  const width = Math.max(700, maxNodesPerLevel * 160);
  const height = Math.max(450, (maxLevel + 1) * 140);

  const positions = calculatePositions(nodes, width, height);

  // Create SVG
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'talent-tree-svg');
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

  // Define gradients and filters
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');

  // Cyan glow for available nodes
  defs.innerHTML = `
    <filter id="cyan-glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="4" result="blur"/>
      <feFlood flood-color="#00e5ff" flood-opacity="0.8" result="color"/>
      <feComposite in="color" in2="blur" operator="in" result="shadow"/>
      <feMerge>
        <feMergeNode in="shadow"/>
        <feMergeNode in="shadow"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>

    <filter id="magenta-glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="6" result="blur"/>
      <feFlood flood-color="#ff00aa" flood-opacity="0.9" result="color"/>
      <feComposite in="color" in2="blur" operator="in" result="shadow"/>
      <feMerge>
        <feMergeNode in="shadow"/>
        <feMergeNode in="shadow"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>

    <filter id="green-glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="5" result="blur"/>
      <feFlood flood-color="#00ff88" flood-opacity="0.8" result="color"/>
      <feComposite in="color" in2="blur" operator="in" result="shadow"/>
      <feMerge>
        <feMergeNode in="shadow"/>
        <feMergeNode in="shadow"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>

    <linearGradient id="line-gradient-active" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#00e5ff" stop-opacity="1"/>
      <stop offset="100%" stop-color="#00e5ff" stop-opacity="0.6"/>
    </linearGradient>

    <linearGradient id="line-gradient-inactive" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#445566" stop-opacity="0.5"/>
      <stop offset="100%" stop-color="#334455" stop-opacity="0.3"/>
    </linearGradient>

    <linearGradient id="hex-fill-available" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#00e5ff" stop-opacity="0.4"/>
      <stop offset="100%" stop-color="#0099aa" stop-opacity="0.2"/>
    </linearGradient>

    <linearGradient id="hex-fill-selected" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ff00aa" stop-opacity="0.5"/>
      <stop offset="100%" stop-color="#aa0066" stop-opacity="0.3"/>
    </linearGradient>

    <linearGradient id="hex-fill-locked" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#556677" stop-opacity="0.3"/>
      <stop offset="100%" stop-color="#334455" stop-opacity="0.2"/>
    </linearGradient>
  `;

  svg.appendChild(defs);

  // Background particles effect
  const bgGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  bgGroup.setAttribute('class', 'bg-particles');
  for (let i = 0; i < 20; i++) {
    const particle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    particle.setAttribute('cx', Math.random() * width);
    particle.setAttribute('cy', Math.random() * height);
    particle.setAttribute('r', Math.random() * 2 + 0.5);
    particle.setAttribute('fill', '#00e5ff');
    particle.setAttribute('opacity', Math.random() * 0.3 + 0.1);
    particle.setAttribute('class', 'particle');
    bgGroup.appendChild(particle);
  }
  svg.appendChild(bgGroup);

  // Create group for edges
  const edgesGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  edgesGroup.setAttribute('class', 'talent-edges');

  // Draw edges with glowing lines
  for (const edge of edges) {
    const fromPos = positions.get(edge.from);
    const toPos = positions.get(edge.to);

    if (fromPos && toPos) {
      const fromNode = nodes.get(edge.from);
      const toNode = nodes.get(edge.to);
      const fromState = getNodeState(fromNode.talent, characterData, talents);
      const toState = getNodeState(toNode.talent, characterData, talents);

      // Main line
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', fromPos.x);
      line.setAttribute('y1', fromPos.y + 30);
      line.setAttribute('x2', toPos.x);
      line.setAttribute('y2', toPos.y - 30);
      line.setAttribute('stroke-width', '3');
      line.setAttribute('stroke-linecap', 'round');

      // Glow line (underneath)
      const glowLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      glowLine.setAttribute('x1', fromPos.x);
      glowLine.setAttribute('y1', fromPos.y + 30);
      glowLine.setAttribute('x2', toPos.x);
      glowLine.setAttribute('y2', toPos.y - 30);
      glowLine.setAttribute('stroke-width', '8');
      glowLine.setAttribute('stroke-linecap', 'round');
      glowLine.setAttribute('opacity', '0.3');

      if (fromState === 'selected' || toState === 'selected') {
        line.setAttribute('stroke', '#00e5ff');
        glowLine.setAttribute('stroke', '#00e5ff');
        line.setAttribute('class', 'edge-active');
      } else if (fromState === 'available' && toState === 'available') {
        line.setAttribute('stroke', '#00e5ff');
        line.setAttribute('opacity', '0.7');
        glowLine.setAttribute('stroke', '#00e5ff');
        glowLine.setAttribute('opacity', '0.15');
      } else {
        line.setAttribute('stroke', '#445566');
        line.setAttribute('opacity', '0.4');
        glowLine.setAttribute('stroke', '#334455');
        glowLine.setAttribute('opacity', '0.1');
      }

      edgesGroup.appendChild(glowLine);
      edgesGroup.appendChild(line);
    }
  }

  svg.appendChild(edgesGroup);

  // Create group for nodes
  const nodesGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  nodesGroup.setAttribute('class', 'talent-nodes');

  // Draw nodes as hexagons
  for (const [nodeId, node] of nodes) {
    const pos = positions.get(nodeId);
    if (!pos) {continue;}

    const state = getNodeState(node.talent, characterData, talents);
    const isRoot = node.prerequisites.length === 0 && node.level === 0;
    const size = isRoot ? 38 : 32;

    // Create node group
    const nodeGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    nodeGroup.setAttribute('class', `talent-node talent-node-${state}`);
    nodeGroup.setAttribute('data-talent-id', node.talent._id || node.name);
    nodeGroup.setAttribute('data-talent-name', node.name);

    // Outer glow hexagon
    const glowHex = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    glowHex.setAttribute('d', createHexagonPath(pos.x, pos.y, size + 4));
    glowHex.setAttribute('class', 'hex-glow');

    // Main hexagon
    const hex = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    hex.setAttribute('d', createHexagonPath(pos.x, pos.y, size));
    hex.setAttribute('class', 'hex-main');
    hex.setAttribute('stroke-width', '2');

    // Inner hexagon
    const innerHex = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    innerHex.setAttribute('d', createHexagonPath(pos.x, pos.y, size - 6));
    innerHex.setAttribute('class', 'hex-inner');
    innerHex.setAttribute('stroke-width', '1');

    // Apply state-specific styling
    switch (state) {
      case 'selected':
        glowHex.setAttribute('fill', 'rgba(255, 0, 170, 0.2)');
        glowHex.setAttribute('filter', 'url(#magenta-glow)');
        hex.setAttribute('fill', 'url(#hex-fill-selected)');
        hex.setAttribute('stroke', '#ff00aa');
        innerHex.setAttribute('fill', 'rgba(255, 0, 170, 0.3)');
        innerHex.setAttribute('stroke', '#ff66cc');
        break;
      case 'available':
        glowHex.setAttribute('fill', 'rgba(0, 229, 255, 0.15)');
        glowHex.setAttribute('filter', 'url(#cyan-glow)');
        hex.setAttribute('fill', 'url(#hex-fill-available)');
        hex.setAttribute('stroke', '#00e5ff');
        innerHex.setAttribute('fill', 'rgba(0, 229, 255, 0.2)');
        innerHex.setAttribute('stroke', '#00e5ff');
        innerHex.setAttribute('stroke-opacity', '0.5');
        break;
      case 'locked':
        glowHex.setAttribute('fill', 'transparent');
        hex.setAttribute('fill', 'url(#hex-fill-locked)');
        hex.setAttribute('stroke', '#556677');
        innerHex.setAttribute('fill', 'rgba(50, 60, 70, 0.3)');
        innerHex.setAttribute('stroke', '#445566');
        break;
    }

    nodeGroup.appendChild(glowHex);
    nodeGroup.appendChild(hex);
    nodeGroup.appendChild(innerHex);

    // Icon
    const icon = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    icon.setAttribute('x', pos.x);
    icon.setAttribute('y', pos.y);
    icon.setAttribute('text-anchor', 'middle');
    icon.setAttribute('dominant-baseline', 'central');
    icon.setAttribute('font-size', isRoot ? '20' : '16');
    icon.setAttribute('font-family', 'Font Awesome 6 Free, Font Awesome 5 Free, FontAwesome');
    icon.setAttribute('font-weight', '900');
    icon.setAttribute('class', 'hex-icon');

    switch (state) {
      case 'selected':
        icon.textContent = '\uf00c'; // Check
        icon.setAttribute('fill', '#ff66cc');
        break;
      case 'available':
        icon.textContent = '\uf005'; // Star
        icon.setAttribute('fill', '#00e5ff');
        break;
      case 'locked':
        icon.textContent = '\uf023'; // Lock
        icon.setAttribute('fill', '#667788');
        break;
    }

    nodeGroup.appendChild(icon);

    // Label
    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    label.setAttribute('x', pos.x);
    label.setAttribute('y', pos.y + size + 18);
    label.setAttribute('text-anchor', 'middle');
    label.setAttribute('font-size', '11');
    label.setAttribute('font-family', 'Orbitron, sans-serif');
    label.setAttribute('class', 'hex-label');

    const displayName = node.name.length > 16 ? node.name.substring(0, 14) + '...' : node.name;
    label.textContent = displayName;

    switch (state) {
      case 'selected':
        label.setAttribute('fill', '#ff99dd');
        break;
      case 'available':
        label.setAttribute('fill', '#00e5ff');
        break;
      case 'locked':
        label.setAttribute('fill', '#667788');
        break;
    }

    nodeGroup.appendChild(label);

    // Click handler
    if (state === 'available') {
      nodeGroup.style.cursor = 'pointer';
      nodeGroup.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (onSelectTalent) {
          onSelectTalent(node.talent);
        }
      });

      // Hover effects
      nodeGroup.addEventListener('mouseenter', () => {
        hex.setAttribute('stroke-width', '3');
        glowHex.setAttribute('filter', 'url(#green-glow)');
      });

      nodeGroup.addEventListener('mouseleave', () => {
        hex.setAttribute('stroke-width', '2');
        glowHex.setAttribute('filter', 'url(#cyan-glow)');
      });
    }

    // Tooltip
    const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
    let tooltipText = node.name;
    if (node.talent.system?.description) {
      tooltipText += `\n\n${node.talent.system.description}`;
    }
    const prereqs = node.talent.system?.prerequisites || node.talent.system?.prerequisite;
    if (prereqs) {
      tooltipText += `\n\nPrerequisites: ${prereqs}`;
    }
    if (node.talent.prereqReasons && node.talent.prereqReasons.length > 0) {
      tooltipText += `\n\n⚠ Cannot take:`;
      for (const reason of node.talent.prereqReasons) {
        tooltipText += `\n• ${reason}`;
      }
    }
    title.textContent = tooltipText;
    nodeGroup.appendChild(title);

    nodesGroup.appendChild(nodeGroup);
  }

  svg.appendChild(nodesGroup);

  // Clear container and add SVG
  container.innerHTML = '';
  container.appendChild(svg);

  // Add legend
  const legend = document.createElement('div');
  legend.className = 'talent-tree-legend';
  legend.innerHTML = `
    <div class="legend-item">
      <span class="legend-hex legend-selected"></span>
      <span>Selected</span>
    </div>
    <div class="legend-item">
      <span class="legend-hex legend-available"></span>
      <span>Available</span>
    </div>
    <div class="legend-item">
      <span class="legend-hex legend-locked"></span>
      <span>Locked</span>
    </div>
  `;
  container.appendChild(legend);

  SWSELogger.log(`[TALENT-TREE-GRAPH] Rendered ${nodes.size} talents with ${edges.length} connections`);
}

/**
 * Get talents for a specific tree
 */
export function getTalentsInTree(allTalents, treeName) {
  SWSELogger.log(`[TALENT-TREE-GRAPH] getTalentsInTree called with treeName: "${treeName}", total talents: ${allTalents.length}`);

  // Debug: show first few talents and their tree properties
  if (allTalents.length > 0) {
    for (let i = 0; i < Math.min(3, allTalents.length); i++) {
      const t = allTalents[i];
      const treeFromFunction = getTalentTreeName(t);
      SWSELogger.log(`[TALENT-TREE-GRAPH] Sample talent ${i}: name="${t.name}", getTalentTreeName="${treeFromFunction}", system.tree="${t.system?.tree}", system.talent_tree="${t.system?.talent_tree}", system.talentTree="${t.system?.talentTree}"`);
    }
  }

  const result = allTalents.filter(talent => {
    const talentTree = getTalentTreeName(talent);
    return talentTree === treeName;
  });

  // If no results, show diagnostic info about available trees
  if (result.length === 0) {
    const allTrees = new Set();
    allTalents.forEach(t => {
      const tree = getTalentTreeName(t);
      if (tree) {allTrees.add(tree);}
    });
    SWSELogger.warn(`[TALENT-TREE-GRAPH] No talents found for tree "${treeName}". Available trees in data:`, Array.from(allTrees).sort());

    // Also show which talents ARE in the system (for debugging)
    const talentsInSystem = allTalents
      .filter(t => getTalentTreeName(t) !== '')
      .map(t => ({ name: t.name, tree: getTalentTreeName(t) }))
      .slice(0, 20); // Show first 20
    if (talentsInSystem.length > 0) {
      SWSELogger.log(`[TALENT-TREE-GRAPH] Sample talents in system:`, talentsInSystem);
    }
  }

  SWSELogger.log(`[TALENT-TREE-GRAPH] getTalentsInTree result: ${result.length} talents match tree "${treeName}"`);
  return result;
}
