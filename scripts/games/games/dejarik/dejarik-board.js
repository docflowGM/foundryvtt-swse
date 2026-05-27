/**
 * Dejarik radial board utilities.
 *
 * Board coordinates are orbit/ray spaces. Movement and range use orthogonal
 * adjacency along orbit or ray, never diagonal.
 */

export const DEJARIK_RINGS = 4;
export const DEJARIK_RAYS = 8;

export function spaceId(ring, ray) {
  return `r${ring}_q${((ray % DEJARIK_RAYS) + DEJARIK_RAYS) % DEJARIK_RAYS}`;
}

export function parseSpaceId(id = '') {
  const match = String(id).match(/^r(\d+)_q(\d+)$/);
  if (!match) return null;
  return { ring: Number(match[1]), ray: Number(match[2]) };
}

export function buildDejarikBoard() {
  const spaces = [];
  for (let ring = 1; ring <= DEJARIK_RINGS; ring += 1) {
    for (let ray = 0; ray < DEJARIK_RAYS; ray += 1) {
      spaces.push({ id: spaceId(ring, ray), ring, ray, adjacent: adjacentSpaces(spaceId(ring, ray)) });
    }
  }
  return spaces;
}

export function adjacentSpaces(id = '') {
  const parsed = parseSpaceId(id);
  if (!parsed) return [];
  const { ring, ray } = parsed;
  const adjacent = [spaceId(ring, ray - 1), spaceId(ring, ray + 1)];
  if (ring > 1) adjacent.push(spaceId(ring - 1, ray));
  if (ring < DEJARIK_RINGS) adjacent.push(spaceId(ring + 1, ray));
  return adjacent;
}

export function boardDistance(fromId, toId) {
  if (fromId === toId) return 0;
  const visited = new Set([fromId]);
  let frontier = [{ id: fromId, distance: 0 }];
  while (frontier.length) {
    const next = [];
    for (const node of frontier) {
      for (const adjacent of adjacentSpaces(node.id)) {
        if (visited.has(adjacent)) continue;
        if (adjacent === toId) return node.distance + 1;
        visited.add(adjacent);
        next.push({ id: adjacent, distance: node.distance + 1 });
      }
    }
    frontier = next;
  }
  return Infinity;
}

export function reachableSpaces(fromId, movement, occupied = new Set()) {
  const max = Math.max(0, Number(movement || 0) || 0);
  const visited = new Set([fromId]);
  let frontier = [{ id: fromId, distance: 0 }];
  const reachable = [];
  while (frontier.length) {
    const next = [];
    for (const node of frontier) {
      if (node.distance >= max) continue;
      for (const adjacent of adjacentSpaces(node.id)) {
        if (visited.has(adjacent) || occupied.has(adjacent)) continue;
        visited.add(adjacent);
        reachable.push(adjacent);
        next.push({ id: adjacent, distance: node.distance + 1 });
      }
    }
    frontier = next;
  }
  return reachable;
}

export function defaultStartingSpaces(side = 'alpha') {
  const ray = side === 'alpha' ? 0 : 4;
  return [1, 2, 3, 4].map(ring => spaceId(ring, ray));
}
