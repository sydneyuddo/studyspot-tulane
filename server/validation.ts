import type { PhotoAnalysisResult } from '../src/types.ts';

const crowds = ['empty', 'light', 'moderate', 'busy', 'packed'];
const outlets = ['plentiful', 'some', 'rare', 'none', 'unknown'];
const nonempty = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0 && v.length <= 3000;

export function parsePhoto(text: string): PhotoAnalysisResult {
  const p = JSON.parse(text);
  if (!p || !['visibleSeatsEstimate', 'lighting', 'visibleOutlets'].every(k => nonempty(p[k]))) {
    throw new Error('AI returned an incomplete photo analysis. Please retry.');
  }
  if (p.suggestedCrowdLevel != null && !crowds.includes(p.suggestedCrowdLevel)) throw new Error('Invalid AI crowd estimate.');
  if (p.suggestedOutletAvailability != null && !outlets.includes(p.suggestedOutletAvailability)) throw new Error('Invalid AI outlet estimate.');
  return {
    visibleSeatsEstimate: p.visibleSeatsEstimate, lighting: p.lighting, visibleOutlets: p.visibleOutlets,
    disclaimer: 'AI estimates only the visible scene. Noise, whole-room occupancy, and outlets outside the frame cannot be determined from a photo.',
    // A camera angle cannot establish whole-space crowd or outlet availability.
    suggestedCrowdLevel: null, suggestedOutletAvailability: null,
  };
}

export function parseRecommendations(text: string, spots: { id: string; name: string; floorsOrZones: string[] }[]) {
  const p = JSON.parse(text);
  if (!p || !nonempty(p.summary) || !Array.isArray(p.recommendations) || p.recommendations.length < 1 || p.recommendations.length > 3) {
    throw new Error('AI returned incomplete recommendations. Please retry.');
  }
  const ids = new Set<string>();
  const recommendations = p.recommendations.map((r: any, i: number) => {
    const spot = spots.find(s => s.id === r.spotId);
    if (!spot || ids.has(r.spotId) || !['badge', 'rationale', 'dataFreshnessNote'].every(k => nonempty(r[k]))) {
      throw new Error('AI returned an invalid study location. Please retry.');
    }
    ids.add(r.spotId);
    return { spotId: spot.id, spotName: spot.name, rank: i + 1, badge: r.badge, rationale: r.rationale,
      dataFreshnessNote: r.dataFreshnessNote,
      recommendedZone: spot.floorsOrZones.includes(r.recommendedZone) ? r.recommendedZone : undefined };
  });
  return { summary: p.summary, recommendations };
}

export async function withTimeout<T>(operation: Promise<T>, ms = 10000): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  try {
    return await Promise.race([operation, new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('Request timed out. Refresh before retrying to check whether your report was saved.')), ms);
    })]);
  } finally { clearTimeout(timer!); }
}

export function aiError(err: any): string {
  const status = Number(err?.status || err?.code);
  if (status === 429) return 'AI quota or rate limit reached. Please wait and retry.';
  if (status === 401 || status === 403) return 'AI access is not configured correctly. The app owner must check the server API key.';
  if (status === 404) return 'The configured AI model is unavailable. The app owner must update GEMINI_MODEL.';
  if (status === 503) return 'AI is temporarily busy. Please retry shortly.';
  return 'AI could not complete this request. Please retry shortly.';
}
