export type CrowdLevel = 'empty' | 'light' | 'moderate' | 'busy' | 'packed';
export type NoiseLevel = 'silent' | 'quiet' | 'moderate' | 'loud';
export type OutletAvailability = 'plentiful' | 'some' | 'rare' | 'none';

export interface SpotReport {
  id: string;
  spotId: string;
  crowd: CrowdLevel;
  noise: NoiseLevel;
  outlets: OutletAvailability;
  floorOrArea?: string;
  note?: string;
  timestamp: number; // Server timestamp in ms
  hasPhotoAnalysis?: boolean;
  photoEstimates?: {
    visibleSeats?: string;
    lighting?: string;
    visibleOutlets?: string;
  };
}

export interface SpotCurrentStatus {
  crowd: CrowdLevel;
  noise: NoiseLevel;
  outlets: OutletAvailability;
  freshnessMinutes: number;
  reportCount: number;
  lastReportAt: number;
}

export interface Spot {
  id: string;
  name: string;
  shortName: string;
  category: 'library' | 'student-center' | 'cafe' | 'academic';
  address: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  description: string;
  hoursGuidance: string;
  officialHoursUrl: string;
  floorsOrZones: string[];
  // Dynamic fields computed from shared peer reports
  hasRecentReports: boolean;
  activeReportsCount: number;
  totalReportsCount: number;
  lastReportTimestamp: number | null;
  currentStatus: SpotCurrentStatus | null;
  recentNotes: string[];
  distanceMeters?: number;
}

export interface UserLocation {
  lat: number;
  lng: number;
  accuracy?: number;
  timestamp: number;
}

export interface PhotoAnalysisResult {
  visibleSeatsEstimate: string;
  lighting: string;
  visibleOutlets: string;
  disclaimer: string;
  suggestedCrowdLevel: CrowdLevel | null;
  suggestedOutletAvailability: OutletAvailability | null;
}

export interface RecommendationItem {
  spotId: string;
  spotName: string;
  rank: number;
  badge: string;
  rationale: string;
  dataFreshnessNote: string;
  recommendedZone?: string;
}

export interface RecommendationResponse {
  summary: string;
  recommendations: RecommendationItem[];
  generatedAt: number;
}
