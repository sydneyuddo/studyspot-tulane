export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

/**
 * Formats distance calculated via Haversine formula as an approximate distance.
 */
export function formatDistance(meters?: number): string {
  if (meters === undefined || isNaN(meters)) return '';
  if (meters < 1000) {
    return `~${meters}m`;
  }
  const miles = (meters / 1609.34).toFixed(1);
  return `~${miles} mi`;
}

/**
 * Returns an approximate proximity label taking campus building footprints and GPS uncertainty into account.
 * Large facilities like Howard-Tilton and LBC span 70-90m across, and indoor GPS signals fluctuate.
 * Readings within the building footprint threshold are truthfully recognized as inside or at the building.
 */
export function formatProximityLabel(meters?: number, accuracyMeters?: number): string {
  if (meters === undefined || isNaN(meters)) return '';
  const buildingFootprintThreshold = Math.max(75, (accuracyMeters || 25) * 1.25);
  if (meters <= buildingFootprintThreshold) {
    return `Approx. ${formatDistance(meters)} (inside or at building)`;
  }
  return `Approx. ${formatDistance(meters)}`;
}

export function formatRelativeTime(timestamp: number): string {
  const diffMs = Date.now() - timestamp;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins === 1) return '1 min ago';
  if (mins < 60) return `${mins} mins ago`;
  const hours = Math.floor(mins / 60);
  if (hours === 1) return '1 hr ago';
  if (hours < 24) return `${hours} hrs ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
