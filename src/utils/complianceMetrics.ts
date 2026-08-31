export interface MissingDocMetric {
  name: string;
  count: number;
}

export interface DigestedBlockers {
  topThree: MissingDocMetric[];
  overflowTotalFiles: number;
  overflowUniqueTypesCount: number;
  allSortedDocs: MissingDocMetric[];
}

/**
 * Single-pass frequency aggregator and sorting engine 
 * to handle any arbitrary number of compliance documentation errors.
 */
export function processDynamicBlockers(allMissingDocs: string[]): DigestedBlockers {
  const counts: Record<string, number> = {};
  
  // 1. Calculate occurrence frequencies
  allMissingDocs.forEach((doc) => {
    if (!doc) return;
    const standardizedName = doc.trim().toUpperCase();
    counts[standardizedName] = (counts[standardizedName] || 0) + 1;
  });

  // 2. Map map to array structure and sort descending
  const sortedDocs: MissingDocMetric[] = Object.entries(counts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  // 3. Segment data layers
  const topThree = sortedDocs.slice(0, 3);
  const overflowDocs = sortedDocs.slice(3);
  
  const overflowTotalFiles = overflowDocs.reduce((sum, item) => sum + item.count, 0);
  const overflowUniqueTypesCount = overflowDocs.length;

  return {
    topThree,
    overflowTotalFiles,
    overflowUniqueTypesCount,
    allSortedDocs: sortedDocs
  };
}
