import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, setDoc, terminate } from 'firebase/firestore';
import { TULANE_SPOTS_METADATA } from './src/data/tulaneSpots.ts';
import { SpotReport, CrowdLevel, NoiseLevel, OutletAvailability, SpotCurrentStatus } from './src/types.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const isProd = process.env.NODE_ENV === 'production';

// Initialize Gemini SDK with telemetry header
const apiKey = process.env.GEMINI_API_KEY;
const ai = apiKey
  ? new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    })
  : null;

// Initialize Firebase Firestore from provisioned config
let firestoreDb: any = null;
let firebaseConfig: any = null;
let firestoreAvailable = false;

try {
  const configPath = path.resolve(__dirname, 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    const fbApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    firestoreDb = getFirestore(fbApp, firebaseConfig.firestoreDatabaseId);
    console.log('Firebase initialized with database:', firebaseConfig.firestoreDatabaseId);
  }
} catch (e: any) {
  console.warn('Firebase initialization notice:', e.message);
}

// Local Instance Reports Storage
const DATA_DIR = path.resolve(__dirname, 'data');
const REPORTS_FILE = path.join(DATA_DIR, 'reports.json');

function ensureDataStorage() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(REPORTS_FILE)) {
    fs.writeFileSync(REPORTS_FILE, JSON.stringify([], null, 2), 'utf-8');
  }
}

function loadLocalReports(): SpotReport[] {
  try {
    ensureDataStorage();
    const data = fs.readFileSync(REPORTS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error loading reports file:', err);
    return [];
  }
}

function saveLocalReports(reports: SpotReport[]): boolean {
  try {
    ensureDataStorage();
    const tempFile = `${REPORTS_FILE}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(reports, null, 2), 'utf-8');
    fs.renameSync(tempFile, REPORTS_FILE);
    return true;
  } catch (err) {
    console.error('Error saving reports file:', err);
    return false;
  }
}

// In-memory rate limiting map: ip:spotId -> timestamp ms
const rateLimitMap = new Map<string, number>();
const RATE_LIMIT_WINDOW_MS = 45 * 1000; // 45 seconds per spot

function isRateLimited(ip: string, spotId: string): boolean {
  const key = `${ip}:${spotId}`;
  const now = Date.now();
  const lastTime = rateLimitMap.get(key);
  if (lastTime && now - lastTime < RATE_LIMIT_WINDOW_MS) {
    return true;
  }
  rateLimitMap.set(key, now);
  return false;
}

// 60-Minute Freshness Window calculation
const FRESHNESS_WINDOW_MS = 60 * 60 * 1000;

function computeSpotStatus(spotId: string, allReports: SpotReport[]): {
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

  const activeReports = spotReports.filter((r) => now - r.timestamp <= FRESHNESS_WINDOW_MS);
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
  };
  const outletLevels: OutletAvailability[] = ['none', 'rare', 'some', 'plentiful'];

  // Calculate weighted average giving double weight to the most recent report
  let crowdSum = 0;
  let noiseSum = 0;
  let outletSum = 0;
  let totalWeight = 0;

  activeReports.forEach((report, index) => {
    const weight = index === 0 ? 2 : 1;
    crowdSum += (crowdWeights[report.crowd] || 3) * weight;
    noiseSum += (noiseWeights[report.noise] || 2) * weight;
    outletSum += (outletWeights[report.outlets] || 3) * weight;
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
    Math.max(0, Math.round(outletSum / totalWeight) - 1)
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
      outlets: outletLevels[avgOutletIndex],
      freshnessMinutes,
      reportCount: activeReports.length,
      lastReportAt: newest.timestamp,
    },
    recentNotes,
  };
}

async function startServer() {
  ensureDataStorage();
  const app = express();

  // Middleware
  app.use(express.json({ limit: '6mb' }));

  // API Route: Storage & Architecture Diagnostics
  app.get('/api/storage-info', (req: Request, res: Response) => {
    res.json({
      storageType: firestoreDb ? 'firestore-synced-instance' : 'instance-filesystem',
      firestoreProvisioned: Boolean(firestoreDb),
      projectId: firebaseConfig?.projectId || null,
      firestoreDatabaseId: firebaseConfig?.firestoreDatabaseId || null,
      durableProductionDatabase: Boolean(firestoreDb),
      persistentAcrossRestarts: true,
      provisioningStatus: firestoreDb ? 'Firestore database provisioned successfully.' : 'Instance store active.',
    });
  });

  // API Route: Health check
  app.get('/api/health', (req: Request, res: Response) => {
    res.json({
      status: 'ok',
      uptime: process.uptime(),
      timestamp: Date.now(),
      spotsCount: TULANE_SPOTS_METADATA.length,
      firebaseConfigured: Boolean(firebaseConfig),
    });
  });

  // API Route: Get all spots with real peer status
  app.get('/api/spots', (req: Request, res: Response) => {
    try {
      const reports = loadLocalReports();
      const enrichedSpots = TULANE_SPOTS_METADATA.map((staticSpot) => {
        const status = computeSpotStatus(staticSpot.id, reports);
        return {
          ...staticSpot,
          ...status,
        };
      });

      res.json({
        spots: enrichedSpots,
        timestamp: Date.now(),
        freshnessWindowMinutes: 60,
      });
    } catch (err: any) {
      console.error('Error fetching spots:', err);
      res.status(500).json({ error: 'Failed to retrieve study spots data' });
    }
  });

  // API Route: Get report history for a spot
  app.get('/api/spots/:id/reports', (req: Request, res: Response) => {
    try {
      const spotId = req.params.id;
      const spotExists = TULANE_SPOTS_METADATA.some((s) => s.id === spotId);
      if (!spotExists) {
        return res.status(404).json({ error: `Spot '${spotId}' does not exist` });
      }

      const reports = loadLocalReports();
      const spotReports = reports
        .filter((r) => r.spotId === spotId)
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 50);

      res.json({
        spotId,
        reports: spotReports,
        total: spotReports.length,
      });
    } catch (err: any) {
      console.error('Error fetching spot reports:', err);
      res.status(500).json({ error: 'Failed to retrieve reports history' });
    }
  });

  // API Route: Post anonymous check-in
  app.post('/api/spots/:id/reports', async (req: Request, res: Response) => {
    try {
      const spotId = req.params.id;
      const spotExists = TULANE_SPOTS_METADATA.some((s) => s.id === spotId);
      if (!spotExists) {
        return res.status(404).json({ error: `Study spot '${spotId}' not found in campus directory` });
      }

      const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'client';
      if (isRateLimited(clientIp, spotId)) {
        return res.status(429).json({
          error: 'Rate limit: Please wait 45 seconds before submitting another check-in for this spot.',
        });
      }

      const { crowd, noise, outlets, floorOrArea, note, hasPhotoAnalysis, photoEstimates } = req.body;

      // Validate inputs strictly
      const validCrowd: CrowdLevel[] = ['empty', 'light', 'moderate', 'busy', 'packed'];
      const validNoise: NoiseLevel[] = ['silent', 'quiet', 'moderate', 'loud'];
      const validOutlets: OutletAvailability[] = ['plentiful', 'some', 'rare', 'none'];

      if (!validCrowd.includes(crowd)) {
        return res.status(400).json({ error: `Invalid crowd value '${crowd}'. Must be one of: ${validCrowd.join(', ')}` });
      }
      if (!validNoise.includes(noise)) {
        return res.status(400).json({ error: `Invalid noise value '${noise}'. Must be one of: ${validNoise.join(', ')}` });
      }
      if (!validOutlets.includes(outlets)) {
        return res.status(400).json({ error: `Invalid outlets value '${outlets}'. Must be one of: ${validOutlets.join(', ')}` });
      }

      if (note !== undefined && typeof note !== 'string') {
        return res.status(400).json({ error: 'Note must be a string' });
      }

      if (floorOrArea !== undefined && typeof floorOrArea !== 'string') {
        return res.status(400).json({ error: 'Floor or area must be a string' });
      }

      const sanitizedNote = typeof note === 'string' ? note.trim().slice(0, 280) : undefined;
      const sanitizedFloor = typeof floorOrArea === 'string' ? floorOrArea.trim().slice(0, 60) : undefined;

      const reportId = `rep_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const newReport: SpotReport = {
        id: reportId,
        spotId,
        crowd,
        noise,
        outlets,
        floorOrArea: sanitizedFloor,
        note: sanitizedNote,
        timestamp: Date.now(), // Server-authoritative timestamp
        hasPhotoAnalysis: Boolean(hasPhotoAnalysis),
        photoEstimates: photoEstimates ? {
          visibleSeats: typeof photoEstimates.visibleSeats === 'string' ? photoEstimates.visibleSeats.slice(0, 100) : undefined,
          lighting: typeof photoEstimates.lighting === 'string' ? photoEstimates.lighting.slice(0, 100) : undefined,
          visibleOutlets: typeof photoEstimates.visibleOutlets === 'string' ? photoEstimates.visibleOutlets.slice(0, 100) : undefined,
        } : undefined,
      };

      // Save locally
      const reports = loadLocalReports();
      reports.unshift(newReport);
      saveLocalReports(reports);

      // Attempt async Firestore persistence if configured
      if (firestoreDb) {
        try {
          const reportDoc = doc(firestoreDb, 'reports', reportId);
          // Omit undefined keys for clean Firestore document
          const firestorePayload: any = {
            id: newReport.id,
            spotId: newReport.spotId,
            crowd: newReport.crowd,
            noise: newReport.noise,
            outlets: newReport.outlets,
            timestamp: newReport.timestamp,
            hasPhotoAnalysis: newReport.hasPhotoAnalysis,
          };
          if (newReport.floorOrArea) firestorePayload.floorOrArea = newReport.floorOrArea;
          if (newReport.note) firestorePayload.note = newReport.note;
          if (newReport.photoEstimates) firestorePayload.photoEstimates = newReport.photoEstimates;

          setDoc(reportDoc, firestorePayload).catch((err: any) => {
            console.warn('Async Firestore sync notification:', err.message);
          });
        } catch (fsErr: any) {
          console.warn('Firestore write warning:', fsErr.message);
        }
      }

      res.status(201).json({
        success: true,
        report: newReport,
        message: 'Check-in recorded. Visible to students for the next 60 minutes.',
      });
    } catch (err: any) {
      console.error('Error saving check-in report:', err);
      res.status(500).json({ error: 'Internal server error recording check-in' });
    }
  });

  // API Route: Explicit Photo Analysis via Gemini
  app.post('/api/analyze-photo', async (req: Request, res: Response) => {
    try {
      const { imageBase64, mimeType, spotName } = req.body;

      if (!imageBase64 || typeof imageBase64 !== 'string') {
        return res.status(400).json({ error: 'Missing imageBase64 data in request body' });
      }

      if (!ai) {
        return res.status(503).json({
          error: 'Gemini AI service is not initialized on the server. The GEMINI_API_KEY environment secret is required.',
        });
      }

      const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
      const validMime = mimeType || 'image/jpeg';

      const prompt = `You are an AI study space analyzer for college students at Tulane University.
The student has taken a study space photo at: "${spotName || 'Tulane Campus'}".
Your goal is to inspect ONLY what is visually discernible in this image to assist their manual check-in.

STRICT REQUIREMENTS:
1. Visible Empty Seats / Tables: Describe specifically what seating/tables appear open in the visible frame (e.g., "3 open armchair seats visible in foreground", "tables appear mostly occupied", "multiple open carrel desks").
2. Lighting: Describe the visible lighting condition (e.g., "Bright natural window light", "Soft ambient cafe lighting", "Even fluorescent overhead lighting").
3. Visible Outlets: Mention visible wall or table power outlets ONLY if clearly discernible in the camera angle. If none are visible, explicitly state "No outlets visible in this angle".
4. CRITICAL PRIVACY & ETHICS: Do NOT identify or describe faces, clothing, or individual identities.
5. CRITICAL OBJECTIVITY: NEVER claim to know the sound/noise level from a photograph. NEVER claim to know whole-building occupancy from a single camera angle. Always include an honest disclaimer.

Return ONLY a valid JSON object matching this schema:
{
  "visibleSeatsEstimate": "string describing visible open seats",
  "lighting": "string describing visible lighting quality",
  "visibleOutlets": "string describing visible outlets or 'No outlets visible in this angle'",
  "disclaimer": "AI estimates visual factors only. Noise levels and campus-wide occupancy cannot be determined from a still photo.",
  "suggestedCrowdLevel": "empty" | "light" | "moderate" | "busy" | "packed" | null,
  "suggestedOutletAvailability": "plentiful" | "some" | "rare" | "none" | null
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: {
          parts: [
            {
              inlineData: {
                data: base64Data,
                mimeType: validMime,
              },
            },
            {
              text: prompt,
            },
          ],
        },
        config: {
          responseMimeType: 'application/json',
        },
      });

      const responseText = response.text || '{}';
      let parsed;
      try {
        parsed = JSON.parse(responseText);
      } catch (parseErr) {
        parsed = {
          visibleSeatsEstimate: 'Visual analysis complete',
          lighting: 'Normal study illumination',
          visibleOutlets: 'Not clearly discernible in this frame',
          disclaimer: 'AI estimates visual factors only. Noise levels and campus-wide occupancy cannot be determined from a still photo.',
          suggestedCrowdLevel: null,
          suggestedOutletAvailability: null,
        };
      }

      res.json({
        success: true,
        analysis: parsed,
      });
    } catch (err: any) {
      console.error('Error analyzing photo with Gemini:', err);
      res.status(500).json({
        error: err.message || 'Failed to analyze photo with Gemini AI',
      });
    }
  });

  // API Route: Real Gemini Personalized Recommendations
  app.post('/api/recommendations', async (req: Request, res: Response) => {
    try {
      const { preference, studyMode } = req.body;

      if (!ai) {
        return res.status(503).json({
          error: 'Gemini AI service is not initialized on the server. The GEMINI_API_KEY environment secret is required.',
        });
      }

      const reports = loadLocalReports();
      const currentSpotsData = TULANE_SPOTS_METADATA.map((spot) => {
        const status = computeSpotStatus(spot.id, reports);
        return {
          id: spot.id,
          name: spot.name,
          shortName: spot.shortName,
          category: spot.category,
          hoursGuidance: spot.hoursGuidance,
          officialHoursUrl: spot.officialHoursUrl,
          floorsOrZones: spot.floorsOrZones,
          hasRecentReports: status.hasRecentReports,
          activeReportsCount: status.activeReportsCount,
          currentStatus: status.currentStatus,
          lastReportTimestamp: status.lastReportTimestamp,
          recentNotes: status.recentNotes,
        };
      });

      const prompt = `You are StudySpot AI, a Tulane University campus study advisor.
A student is asking for a personalized study spot recommendation right now on the Tulane Uptown campus.

STUDENT PREFERENCES:
- Primary Priority: ${preference || 'Quiet focus'}
- Study Mode: ${studyMode || 'Solo study'}

ACTUAL LIVE CROWDSOURCED CAMPUS DATA (From real peer reports within last 60 minutes):
${JSON.stringify(currentSpotsData, null, 2)}

STRICT REASONING RULES:
1. Ground all recommendations strictly in the actual peer reports provided.
2. If a spot has NO recent reports (hasRecentReports is false or activeReportsCount is 0), you MUST explicitly state that: "No peer reports have been submitted in the last 60 minutes." Do NOT invent or assume current live crowd or outlet availability! You may mention the general building layout (e.g. Howard-Tilton upper floors are designed for quiet study, LBC features common dining and lounge areas).
3. Distances computed on device represent straight-line spherical distance (Haversine formula), not pedestrian street routes.
4. If a spot HAS recent peer reports, cite what students reported (e.g. "2 students reported light crowd and plentiful outlets 15 mins ago").
5. Provide a tailored list of top 3 recommended spots ranked with honest rationale, recommended specific zone/floor, and an explicit dataFreshnessNote.
6. Maintain a friendly, supportive collegiate voice ("Roll Wave!").

Return ONLY a valid JSON object matching this schema:
{
  "summary": "1-2 sentence high-level overview explaining recommendations and real data availability",
  "recommendations": [
    {
      "spotId": "spot-id matching data",
      "spotName": "Full spot name",
      "rank": 1,
      "badge": "Top Pick for Silent Focus / Best for Outlets / etc.",
      "rationale": "Clear honest reason based on preference and actual data",
      "dataFreshnessNote": "Explicit statement on whether live peer data exists (e.g. 'Live check-in from 12 mins ago' or 'No reports in last 60m; check official link for building hours')",
      "recommendedZone": "Specific floor or area"
    }
  ]
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        },
      });

      const responseText = response.text || '{}';
      let parsed;
      try {
        parsed = JSON.parse(responseText);
      } catch (parseErr) {
        parsed = {
          summary: 'Here are study recommendations based on Tulane campus spots.',
          recommendations: [],
        };
      }

      res.json({
        success: true,
        data: {
          ...parsed,
          generatedAt: Date.now(),
        },
      });
    } catch (err: any) {
      console.error('Gemini AI error generating recommendations:', err);
      const isUnavailable = err.status === 503 || (err.message && err.message.includes('503'));
      res.status(503).json({
        error: isUnavailable
          ? 'AI service is temporarily experiencing high demand. Please tap retry to try again.'
          : (err.message || 'AI service is temporarily unavailable. Please retry in a few moments.'),
      });
    }
  });

  // Serve static files in production, or mount Vite in development
  if (isProd) {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true, host: '0.0.0.0' },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`StudySpot Tulane server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal error starting server:', err);
  process.exit(1);
});
