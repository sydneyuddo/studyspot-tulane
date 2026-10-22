# StudySpot Tulane 🌊

A mobile-first browser web application for Tulane University students to discover, evaluate, and crowdsource study spot conditions across the Uptown campus. Optimized for iPhone Safari and Android Google Chrome.

---

## 🏛️ Campus Locations & Official Resources

StudySpot includes initial Uptown campus locations with approximate centroid coordinates and direct links to official Tulane University schedules. Static seed data avoids unsubstantiated claims regarding exact hours, access privileges, or static outlet availability:

1. **Howard-Tilton Memorial Library**
   - *Approximate Centroid Coordinates:* 29.9405° N, -90.1218° W (7001 Freret St)
   - *Overview:* Tulane's main library on the Uptown campus, featuring collaborative study floors on lower levels, quiet study areas on upper levels, and a PJ's Coffee in the lobby.
   - *Current Operating Hours:* Schedules vary by semester, exam periods, and holidays. Check the [Official Tulane Libraries Hours Schedule](https://library.tulane.edu/about/hours).
2. **Lavin-Bernick Center for University Life (LBC)**
   - *Approximate Centroid Coordinates:* 29.9398° N, -90.1207° W (201 Boggs Center / McAlister Way)
   - *Overview:* Student union providing dining facilities, lounge seating, and an outdoor courtyard patio.
   - *Current Operating Hours:* Check the [Official LBC Building Schedule](https://lbc.tulane.edu).
3. **Campus PJ's Coffee Locations**
   - **PJ's Coffee - Stern Science Hall**: 29.9412° N, -90.1200° W (Stern Science Hall complex).
   - **PJ's Coffee - Howard-Tilton Library**: 29.9406° N, -90.1219° W (Library lobby area).
   - **PJ's Coffee - Willow Street**: 29.9368° N, -90.1225° W (Near campus residence halls).
   - *Current Operating Hours:* Follows university dining schedules. Check [Tulane Dining Services Hours](https://campusservices.tulane.edu/departments/dining/hours).
4. **Freeman School of Business (Goldring / GWBC Complex)**
   - *Approximate Centroid Coordinates:* 29.9388° N, -90.1220° W (7 McAlister Dr)
   - *Overview:* Academic complex with glass atrium common spaces and study bridges. Check [Freeman School of Business](https://freeman.tulane.edu).
5. **Richardson Memorial Hall**
   - *Approximate Centroid Coordinates:* 29.9377° N, -90.1212° W (6823 St Charles Ave)
   - *Overview:* Historic facility housing the Tulane School of Architecture. Check [Tulane School of Architecture](https://architecture.tulane.edu).

---

## 🧭 Geolocation: Straight-Line Distance

- When students enable **"Use My Location"**, straight-line distances are computed client-side using the Haversine spherical formula.
- **Accurate Labeling:** Distances are explicitly labeled as **straight-line distance** (as-the-crow-flies), not ground pedestrian walking path routes.
- **Privacy:** Exact user GPS coordinates are processed exclusively in client-side memory and are **never** stored in server databases or check-in records.

---

## 🗄️ Database Architecture & Cloud Firestore Provisioning

### Provisioned Cloud Firestore
- **Provisioned Project ID:** `mimetic-coast-tkm2h`
- **Firestore Database ID:** `ai-studio-studyspottulane-0962f1af-d57d-4212-b408-d7705c6cf879`
- **Config file:** `firebase-applet-config.json`
- **Schema Blueprint:** `firebase-blueprint.json` (defines `SpotReport` entity and `/reports/{reportId}` collection path)
- **Security Rules:** `firestore.rules` (enforces strict schema keys, length constraints, allowed enum values, and immutable report records)

---

## 📱 Mobile Device Testing Checklist

### iPhone Safari
- [ ] Geolocation prompt triggers cleanly; denied and timeout states display actionable instructions without breaking manual browsing.
- [ ] Straight-line distances sort accurately.
- [ ] Camera sheet triggered via native `capture="environment"`. Canvas compression reduces payload to <500KB before upload.
- [ ] Minimum 44px touch targets on buttons and input selectors.

### Android Chrome
- [ ] Geolocation permission handled with instant distance updates.
- [ ] Leaflet map gestures (pan, pinch-to-zoom) responsive with OSM attribution.
- [ ] Form inputs use `text-base` / `16px` to prevent unwanted iOS Safari zooming.

---

## 🔒 Gemini AI Privacy & Truthful States

- **Model:** Google Gemini (`gemini-3.1-flash-lite` configured via server `GEMINI_MODEL`) initialized via server-side `@google/genai` with `process.env.GEMINI_API_KEY`.
- **Photo Analysis:** Analyzed in-memory; photos are **never** stored publicly or persisted on disk.
- **Objective Constraints:** Gemini is strictly instructed to evaluate only visible empty seating, lighting, and clearly discernible outlets in the camera angle. Gemini is prohibited from guessing sound/noise levels or whole-building occupancy from a still photo.
- **No Unlabeled Fallbacks:** If the AI model encounters temporary demand spikes or downtime, an explicit *"AI service is temporarily experiencing high demand"* status is returned with a **Retry** action.
- **Grounded Study Advisor:** Recommendations cite actual peer check-ins or explicitly declare when no recent peer reports exist.

---

## 🧪 Automated Server Validation & Test Results Summary

| Test Case | Method & Endpoint | Payload / Scenario | Expected Status | Actual Result |
| :--- | :--- | :--- | :--- | :--- |
| **Storage Diagnostics** | `GET /api/storage-info` | Provisioned storage check | 200 OK | Returns Firestore configuration status |
| **Campus Spot Directory** | `GET /api/spots` | Fresh fetch | 200 OK | Returns 7 spots with 60m freshness calculation |
| **Input Validation (404)** | `POST /api/spots/nonexistent-spot/reports`| Unknown spot ID | 404 Not Found | Rejected: spot not in campus directory |
| **Input Validation (400)** | `POST /api/spots/howard-tilton/reports` | `crowd: "invalid_crowd_level"` | 400 Bad Request | Rejected with allowed enum values |
| **Input Validation (Photo)** | `POST /api/analyze-photo` | Missing image payload | 400 Bad Request | Rejected with descriptive error |
| **Rate Limiting** | `POST /api/spots/pjs-stern/reports` | Rapid duplicate check-in | 429 Too Many Requests | Blocked with 45s cooldown notice |
| **Report Freshness Filter** | `GET /api/spots` | Spot with 0 reports | 200 OK | Correctly shows `hasRecentReports: false` |
| **AI Demand Handling** | `POST /api/recommendations` | Spike in Gemini demand | 503 Unavailable | Explicit error returned with retry option |



## Corrections awaiting deployment

Firestore is now authoritative for all report reads and awaited writes. Database failure returns an error rather than a successful local-only check-in. Deploy the updated `firestore.rules` before publishing the updated app (including support for unknown outlets). Gemini uses the server-only GEMINI_MODEL setting; its default preserves the existing deployment model. A real successful Gemini call still needs verification with the deployment credentials. AI errors and malformed responses no longer produce fabricated findings. Phone tests above must be performed on real devices before marking them complete.
