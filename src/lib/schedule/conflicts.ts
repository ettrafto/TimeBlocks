import type { Occurrence } from '../api/scheduleClient';

export type OverlapGroup = {
  members: Occurrence[];
};

export function findOverlaps(occ: Occurrence[]): OverlapGroup[] {
  const sorted = [...occ].sort((a, b) => (a.start - b.start) || ((a.end - b.end)));
  const groups: OverlapGroup[] = [];
  let current: Occurrence[] = [];

  for (const o of sorted) {
    if (current.length === 0) {
      current.push(o);
      continue;
    }
    const lastEnd = Math.max(...current.map(x => x.end));
    if (o.start < lastEnd) {
      current.push(o);
    } else {
      groups.push({ members: current });
      current = [o];
    }
  }
  if (current.length) groups.push({ members: current });
  return groups;
}

export function layoutColumns(group: Occurrence[]) {
  // Greedy interval graph coloring
  const columns: Occurrence[][] = [];
  const placement: Record<string, { column: number; columnsTotal: number }> = {};

  for (const o of group.sort((a,b) => (a.start - b.start) || ((a.end - b.end)))) {
    let placed = false;
    for (let c = 0; c < columns.length; c++) {
      const col = columns[c];
      if (!col.some(existing => overlaps(existing, o))) {
        col.push(o);
        placement[o.occId] = { column: c, columnsTotal: 0 };
        placed = true;
        break;
      }
    }
    if (!placed) {
      columns.push([o]);
      placement[o.occId] = { column: columns.length - 1, columnsTotal: 0 };
    }
  }
  const total = columns.length;
  for (const k of Object.keys(placement)) {
    placement[k].columnsTotal = total;
  }
  return placement;
}

function overlaps(a: Occurrence, b: Occurrence) {
  return a.start < b.end && b.start < a.end;
}


