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
 * Returns an approximate proximity label taking GPS uncertainty into account.
 * Avoids claiming someone is outside when within building footprint or accuracy radius.
 */
export function formatProximityLabel(meters?: number, accuracyMeters?: number): string {
  if (meters === undefined || isNaN(meters)) return '';
  const uncertaintyRadius = Math.max(45, (accuracyMeters || 20) * 1.15);
  if (meters <= uncertaintyRadius) {
    return `Approx. ${formatDistance(meters)} (in or near building)`;
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
