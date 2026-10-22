import type { SpotReport, CrowdLevel, NoiseLevel, OutletAvailability, SpotCurrentStatus } from '../src/types.ts';
// 60-Minute Freshness Window calculation
const FRESHNESS_WINDOW_MS = 60 * 60 * 1000;

export function computeSpotStatus(spotId: string, allReports: SpotReport[]): {
  hasRecentReports: boolean;
  activeReportsCount: number;
  totalReportsCount: number;
  lastReportTimestamp: number | null;
  currentStatus: SpotCurrentStatus | null;
  recentNotes: string[];
} {
  const spotReports = allReports.filter((r) => r.spotId === spotId);
  const now = Date.now();
  
  // Sort descending by timestamp
  spotReports.sort((a, b) => b.timestamp - a.timestamp);

  const activeReports = spotReports.filter((r) => r.timestamp <= now && now - r.timestamp <= FRESHNESS_WINDOW_MS);
  const totalReportsCount = spotReports.length;
  const lastReportTimestamp = spotReports.length > 0 ? spotReports[0].timestamp : null;

  if (activeReports.length === 0) {
    return {
      hasRecentReports: false,
      activeReportsCount: 0,
      totalReportsCount,
      lastReportTimestamp,
      currentStatus: null,
      recentNotes: [],
    };
  }

  // Weight crowd: empty:1, light:2, moderate:3, busy:4, packed:5
  const crowdWeights: Record<CrowdLevel, number> = {
    empty: 1,
    light: 2,
    moderate: 3,
    busy: 4,
    packed: 5,
  };
  const crowdLevels: CrowdLevel[] = ['empty', 'light', 'moderate', 'busy', 'packed'];
  
  // Weight noise: silent:1, quiet:2, moderate:3, loud:4
  const noiseWeights: Record<NoiseLevel, number> = {
    silent: 1,
    quiet: 2,
    moderate: 3,
    loud: 4,
  };
  const noiseLevels: NoiseLevel[] = ['silent', 'quiet', 'moderate', 'loud'];

  // Weight outlets: none:1, rare:2, some:3, plentiful:4
  const outletWeights: Record<OutletAvailability, number> = {
    none: 1,
    rare: 2,
    some: 3,
    plentiful: 4,
    unknown: 0,
  };
  const outletLevels: OutletAvailability[] = ['none', 'rare', 'some', 'plentiful'];

  // Calculate weighted average giving double weight to the most recent report
  let crowdSum = 0;
  let noiseSum = 0;
  let outletSum = 0;
  let totalWeight = 0;
  let outletWeight = 0;

  activeReports.forEach((report, index) => {
    const weight = index === 0 ? 2 : 1;
    crowdSum += (crowdWeights[report.crowd] || 3) * weight;
    noiseSum += (noiseWeights[report.noise] || 2) * weight;
    if (report.outlets !== 'unknown') {
      outletSum += outletWeights[report.outlets] * weight;
      outletWeight += weight;
    }
    totalWeight += weight;
  });

  const avgCrowdIndex = Math.min(
    crowdLevels.length - 1,
    Math.max(0, Math.round(crowdSum / totalWeight) - 1)
  );
  const avgNoiseIndex = Math.min(
    noiseLevels.length - 1,
    Math.max(0, Math.round(noiseSum / totalWeight) - 1)
  );
  const avgOutletIndex = Math.min(
    outletLevels.length - 1,
    Math.max(0, Math.round(outletSum / (outletWeight || 1)) - 1)
  );

  const newest = activeReports[0];
  const freshnessMinutes = Math.max(0, Math.round((now - newest.timestamp) / (60 * 1000)));

  const recentNotes = activeReports
    .filter((r) => r.note && r.note.trim().length > 0)
    .map((r) => r.note!.trim())
    .slice(0, 5);

  return {
    hasRecentReports: true,
    activeReportsCount: activeReports.length,
    totalReportsCount,
    lastReportTimestamp: newest.timestamp,
    currentStatus: {
      crowd: crowdLevels[avgCrowdIndex],
      noise: noiseLevels[avgNoiseIndex],
      outlets: outletWeight ? outletLevels[avgOutletIndex] : 'unknown',
      freshnessMinutes,
      reportCount: activeReports.length,
      lastReportAt: newest.timestamp,
    },
    recentNotes,
  };
}

