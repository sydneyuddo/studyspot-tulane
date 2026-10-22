import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Spot, UserLocation } from './types.ts';
import { Header } from './components/Header.tsx';
import { LocationCard } from './components/LocationCard.tsx';
import { CampusMap } from './components/CampusMap.tsx';
import { CheckInModal } from './components/CheckInModal.tsx';
import { HistoryModal } from './components/HistoryModal.tsx';
import { AiAdvisorModal } from './components/AiAdvisorModal.tsx';
import { PhoneChecklistModal } from './components/PhoneChecklistModal.tsx';
import { calculateDistanceMeters } from './utils/geo.ts';
import { 
  Compass, 
  MapPin, 
  Sparkles, 
  Info, 
  ShieldCheck, 
  AlertCircle, 
  Loader2, 
  CheckCircle2, 
  Smartphone,
  Coffee,
  BookOpen
} from 'lucide-react';

export default function App() {
  // Spots State
  const [spots, setSpots] = useState<Spot[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Selection & Modal State
  const [selectedSpotId, setSelectedSpotId] = useState<string | null>(null);
  const [detailsSpotId, setDetailsSpotId] = useState<string | null>(null);
  const [checkInSpot, setCheckInSpot] = useState<Spot | null>(null);
  const [historySpot, setHistorySpot] = useState<Spot | null>(null);
  const [isAdvisorOpen, setIsAdvisorOpen] = useState<boolean>(false);
  const [isChecklistOpen, setIsChecklistOpen] = useState<boolean>(false);

  // View & Filter State
  const [viewMode, setViewMode] = useState<'cards' | 'map' | 'split'>('cards');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'distance' | 'recent' | 'name'>('recent');

  // Geolocation State
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Fetch Spots from Shared Database
  const fetchSpots = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setIsRefreshing(true);
    setFetchError(null);

    try {
      const res = await fetch('/api/spots');
      if (!res.ok) throw new Error('Failed to load study spot data');
      const data = await res.json();
      
      const rawSpots: Spot[] = data.spots || [];
      
      // Calculate distances if user location is available
      setSpots((prevSpots) => {
        return rawSpots.map((spot) => {
          let distanceMeters: number | undefined = undefined;
          if (userLocation) {
            distanceMeters = calculateDistanceMeters(
              userLocation.lat,
              userLocation.lng,
              spot.coordinates.lat,
              spot.coordinates.lng
            );
          }
          return {
            ...spot,
            distanceMeters,
          };
        });
      });
    } catch (err: any) {
      console.error('Fetch spots error:', err);
      setFetchError(err.message || 'Error communicating with StudySpot server');
    } finally {
      setLoading(false);
      if (showRefreshing) setIsRefreshing(false);
    }
  }, [userLocation]);

  // Initial load
  useEffect(() => {
    fetchSpots();
  }, [fetchSpots]);

  // Live polling every 30 seconds for real-time peer reports
  useEffect(() => {
    const interval = setInterval(() => {
      fetchSpots(false);
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchSpots]);

  // Handle GPS "Use My Location"
  const handleUseLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords: UserLocation = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          timestamp: pos.timestamp,
        };

        setUserLocation(coords);
        setIsLocating(false);
        setSortBy('distance');

        // Update distances immediately
        setSpots((prev) =>
          prev.map((s) => ({
            ...s,
            distanceMeters: calculateDistanceMeters(
              coords.lat,
              coords.lng,
              s.coordinates.lat,
              s.coordinates.lng
            ),
          }))
        );
      },
      (err) => {
        setIsLocating(false);
        if (err.code === err.PERMISSION_DENIED) {
          setLocationError('Location permission denied in browser. You can still manually explore all spots.');
        } else if (err.code === err.TIMEOUT) {
          setLocationError('Location request timed out. Please retry or continue manual browsing.');
        } else {
          setLocationError('Unable to acquire GPS signal. Check your device location settings.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 9000,
        maximumAge: 30000,
      }
    );
  };

  // Filtered and Sorted Spots
  const filteredSpots = useMemo(() => {
    return spots
      .filter((spot) => {
        // Category filter
        if (selectedCategory !== 'all' && spot.category !== selectedCategory) {
          return false;
        }

        // Search query filter
        if (searchQuery.trim().length > 0) {
          const q = searchQuery.toLowerCase();
          const matchesName = spot.name.toLowerCase().includes(q);
          const matchesShort = spot.shortName.toLowerCase().includes(q);
          const matchesDesc = spot.description.toLowerCase().includes(q);
          const matchesZones = spot.floorsOrZones.some((z) => z.toLowerCase().includes(q));
          return matchesName || matchesShort || matchesDesc || matchesZones;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'distance') {
          const distA = a.distanceMeters ?? 999999;
          const distB = b.distanceMeters ?? 999999;
          return distA - distB;
        }
        if (sortBy === 'recent') {
          // Put spots with active reports first, sorted by lastReportTimestamp desc
          const aHas = a.hasRecentReports && a.lastReportTimestamp ? a.lastReportTimestamp : 0;
          const bHas = b.hasRecentReports && b.lastReportTimestamp ? b.lastReportTimestamp : 0;
          if (aHas !== bHas) {
            return bHas - aHas;
          }
          return a.name.localeCompare(b.name);
        }
        // Name
        return a.name.localeCompare(b.name);
      });
  }, [spots, selectedCategory, searchQuery, sortBy]);

  const handleShowDetails = useCallback((spot: Spot) => {
    setSelectedSpotId(spot.id);
    setDetailsSpotId(spot.id);
    setViewMode('cards');
  }, []);

  useEffect(() => {
    if (viewMode !== 'cards' || !detailsSpotId) return;
    const card = document.getElementById(`spot-card-${detailsSpotId}`);
    if (!card) return;
    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    card.focus({ preventScroll: true });
    setDetailsSpotId(null);
  }, [viewMode, detailsSpotId]);

  const activeSpot = useMemo(() => {
    return spots.find((s) => s.id === selectedSpotId) || null;
  }, [spots, selectedSpotId]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      {/* Header with branding, search, view toggles & GPS */}
      <Header
        viewMode={viewMode}
        setViewMode={setViewMode}
        userLocation={userLocation}
        onUseLocation={handleUseLocation}
        isLocating={isLocating}
        locationError={locationError}
        onOpenAdvisor={() => setIsAdvisorOpen(true)}
        onOpenChecklist={() => setIsChecklistOpen(true)}
        onRefresh={() => fetchSpots(true)}
        isRefreshing={isRefreshing}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        sortBy={sortBy}
        setSortBy={setSortBy}
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center text-slate-500 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-800" />
            <p className="text-sm font-semibold">Loading Tulane study spots & live peer reports...</p>
          </div>
        ) : fetchError ? (
          <div className="p-6 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-center max-w-md mx-auto my-12 space-y-3">
            <AlertCircle className="w-8 h-8 mx-auto text-rose-600" />
            <h2 className="font-bold text-base">Failed to connect to StudySpot server</h2>
            <p className="text-xs text-rose-700">{fetchError}</p>
            <button
              onClick={() => fetchSpots(true)}
              className="min-h-[44px] px-4 py-2 bg-rose-700 text-white rounded-xl text-xs font-bold hover:bg-rose-800 transition"
            >
              Retry Connection
            </button>
          </div>
        ) : (
          <div>
            {/* Quick Campus Status Strip */}
            <div className="mb-4 bg-white rounded-2xl p-3 sm:p-4 border border-slate-200/80 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-ping"></span>
                <span className="font-bold text-slate-800">
                  {spots.filter((s) => s.hasRecentReports).length} of {spots.length} spots
                </span>
                <span className="text-slate-500">have active check-ins within the last 60 minutes</span>
              </div>

              <div className="flex items-center gap-2 text-slate-600">
                <span className="inline-flex items-center gap-1 font-medium bg-emerald-50 text-emerald-800 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  <ShieldCheck className="w-3.5 h-3.5" /> Real Peer Reports Only
                </span>
              </div>
            </div>

            {/* View Mode Switching */}
            {viewMode === 'map' && (
              <div className="h-[75vh] w-full">
                <CampusMap
                  spots={filteredSpots}
                  selectedSpotId={selectedSpotId}
                  onSelectSpot={(spot) => setSelectedSpotId(spot.id)}
                  onShowDetails={handleShowDetails}
                  onOpenCheckIn={(spot) => setCheckInSpot(spot)}
                  userLocation={userLocation}
                  onUseLocation={handleUseLocation}
                  isLocating={isLocating}
                />
              </div>
            )}

            {viewMode === 'cards' && (
              <div className="space-y-4">
                {filteredSpots.length === 0 ? (
                  <div className="py-16 text-center space-y-2 bg-white rounded-2xl border border-slate-200 p-8">
                    <p className="font-bold text-slate-800 text-base">No matching study spots found</p>
                    <p className="text-xs text-slate-500">
                      Try clearing your search query or selecting "All Spots".
                    </p>
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setSelectedCategory('all');
                      }}
                      className="mt-2 min-h-[44px] px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition"
                    >
                      Clear Filters
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredSpots.map((spot) => (
                      <LocationCard
                        key={spot.id}
                        spot={spot}
                        isSelected={spot.id === selectedSpotId}
                        onSelect={(s) => setSelectedSpotId(s.id)}
                        onOpenCheckIn={(s) => setCheckInSpot(s)}
                        onOpenHistory={(s) => setHistorySpot(s)}
                        onShowOnMap={(s) => {
                          setSelectedSpotId(s.id);
                          setViewMode('map');
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {viewMode === 'split' && (
              <div className="grid grid-cols-12 gap-6 items-start">
                {/* Left: Cards List */}
                <div className="col-span-12 lg:col-span-6 space-y-4 max-h-[82vh] overflow-y-auto pr-1">
                  {filteredSpots.map((spot) => (
                    <LocationCard
                      key={spot.id}
                      spot={spot}
                      isSelected={spot.id === selectedSpotId}
                      onSelect={(s) => setSelectedSpotId(s.id)}
                      onOpenCheckIn={(s) => setCheckInSpot(s)}
                      onOpenHistory={(s) => setHistorySpot(s)}
                      onShowOnMap={(s) => setSelectedSpotId(s.id)}
                    />
                  ))}
                </div>

                {/* Right: Sticky Map */}
                <div className="col-span-12 lg:col-span-6 sticky top-36 h-[80vh]">
                  <CampusMap
                    spots={filteredSpots}
                    selectedSpotId={selectedSpotId}
                    onSelectSpot={(spot) => setSelectedSpotId(spot.id)}
                  onShowDetails={handleShowDetails}
                    onOpenCheckIn={(spot) => setCheckInSpot(spot)}
                    userLocation={userLocation}
                    onUseLocation={handleUseLocation}
                    isLocating={isLocating}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Tulane Campus Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-6 px-4 text-center text-xs text-slate-500 space-y-2">
        <div className="flex flex-wrap items-center justify-center gap-4 text-slate-600 font-semibold">
          <button
            onClick={() => setIsChecklistOpen(true)}
            className="hover:text-emerald-800 transition"
          >
            iPhone & Android Guide
          </button>
          <span>•</span>
          <button
            onClick={() => setIsAdvisorOpen(true)}
            className="hover:text-emerald-800 transition"
          >
            AI Study Advisor
          </button>
          <span>•</span>
          <a
            href="https://library.tulane.edu"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-emerald-800 transition"
          >
            Tulane Libraries
          </a>
          <span>•</span>
          <a
            href="https://lbc.tulane.edu"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-emerald-800 transition"
          >
            LBC Student Center
          </a>
        </div>
        <p className="text-[11px] text-slate-400">
          StudySpot Tulane • Real peer crowdsourcing with 60m freshness policy • Built for Tulane University students
        </p>
      </footer>

      {/* Modals */}
      {checkInSpot && (
        <CheckInModal
          spot={checkInSpot}
          isOpen={Boolean(checkInSpot)}
          onClose={() => setCheckInSpot(null)}
          onSuccess={() => fetchSpots(true)}
        />
      )}

      {historySpot && (
        <HistoryModal
          spot={historySpot}
          isOpen={Boolean(historySpot)}
          onClose={() => setHistorySpot(null)}
          onOpenCheckIn={(spot) => {
            setHistorySpot(null);
            setCheckInSpot(spot);
          }}
        />
      )}

      {isAdvisorOpen && (
        <AiAdvisorModal
          spots={spots}
          isOpen={isAdvisorOpen}
          onClose={() => setIsAdvisorOpen(false)}
          onSelectSpot={(spot) => {
            setSelectedSpotId(spot.id);
            setViewMode('cards');
          }}
        />
      )}

      {isChecklistOpen && (
        <PhoneChecklistModal
          isOpen={isChecklistOpen}
          onClose={() => setIsChecklistOpen(false)}
        />
      )}
    </div>
  );
}

