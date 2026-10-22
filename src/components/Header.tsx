import React from 'react';
import { 
  Compass, 
  MapPin, 
  Sparkles, 
  Smartphone, 
  RefreshCw, 
  Layers, 
  Search, 
  SlidersHorizontal,
  Navigation,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { UserLocation } from '../types.ts';

interface HeaderProps {
  viewMode: 'cards' | 'map' | 'split';
  setViewMode: (mode: 'cards' | 'map' | 'split') => void;
  userLocation: UserLocation | null;
  onUseLocation: () => void;
  isLocating: boolean;
  locationError: string | null;
  onOpenAdvisor: () => void;
  onOpenChecklist: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  sortBy: 'distance' | 'recent' | 'name';
  setSortBy: (sort: 'distance' | 'recent' | 'name') => void;
}

export const Header: React.FC<HeaderProps> = ({
  viewMode,
  setViewMode,
  userLocation,
  onUseLocation,
  isLocating,
  locationError,
  onOpenAdvisor,
  onOpenChecklist,
  onRefresh,
  isRefreshing,
  searchQuery,
  setSearchQuery,
  selectedCategory,
  setSelectedCategory,
  sortBy,
  setSortBy,
}) => {
  return (
    <header className="sticky top-0 z-[500] bg-white border-b border-slate-200/90 shadow-xs pt-safe backdrop-blur-md bg-white/95">
      {/* Top Banner: Tulane University Green Bar */}
      <div className="bg-[#006747] text-white px-4 py-2 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-white text-[#006747] font-black text-[10px] flex items-center justify-center shadow-xs">
            TU
          </span>
          <span className="font-bold tracking-wide uppercase text-[11px] text-emerald-100">
            Tulane University • Uptown Campus
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Device & AI Guide Link */}
          <button
            onClick={onOpenChecklist}
            className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-800/80 hover:bg-emerald-800 text-[11px] font-medium transition text-emerald-100 hover:text-white"
            title="iPhone & Android Device Checklist"
          >
            <Smartphone className="w-3.5 h-3.5 text-amber-300" />
            <span className="hidden sm:inline">Phone Guide</span>
          </button>

          {/* AI Advisor Button */}
          <button
            onClick={onOpenAdvisor}
            className="flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-emerald-950 text-[11px] font-bold shadow-xs transition"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-900" />
            <span>AI Advisor</span>
          </button>
        </div>
      </div>

      {/* Main Header Row */}
      <div className="px-4 py-3 sm:px-6 flex flex-wrap items-center justify-between gap-3">
        {/* Branding & Title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-800 text-white flex items-center justify-center font-extrabold text-xl shadow-md border-2 border-emerald-700">
            🌊
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-xl font-extrabold tracking-tight text-slate-900">
                Study<span className="text-[#006747]">Spot</span>
              </h1>
              <span className="text-[10px] bg-emerald-50 text-emerald-800 px-1.5 py-0.5 rounded-full font-bold border border-emerald-200">
                LIVE
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium hidden sm:block">
              Crowdsourced study space conditions for Tulane students
            </p>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2">
          {/* GPS Use Location Button */}
          <button
            type="button"
            onClick={onUseLocation}
            disabled={isLocating}
            className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition ${
              userLocation
                ? userLocation.accuracy && userLocation.accuracy > 30
                  ? 'bg-amber-50 text-amber-900 border-amber-200'
                  : 'bg-blue-50 text-blue-800 border-blue-200'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
            title={locationError || (userLocation ? `GPS active: Accuracy ±${Math.round(userLocation.accuracy || 20)}m` : 'Enable GPS to calculate approximate distance')}
          >
            <Navigation
              className={`w-4 h-4 ${
                isLocating
                  ? 'animate-spin text-emerald-600'
                  : userLocation
                  ? userLocation.accuracy && userLocation.accuracy > 30
                    ? 'text-amber-700 fill-amber-700'
                    : 'text-blue-600 fill-blue-600'
                  : 'text-slate-500'
              }`}
            />
            <span className="hidden xs:inline">
              {isLocating
                ? 'Locating...'
                : userLocation
                ? userLocation.accuracy && userLocation.accuracy > 30
                  ? `GPS (±${Math.round(userLocation.accuracy)}m)`
                  : 'GPS Active'
                : 'Use My Location'}
            </span>
          </button>

          {/* Refresh Data Button */}
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="min-h-[44px] p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:text-emerald-800 hover:bg-slate-50 transition"
            title="Refresh Live Check-in Reports"
            aria-label="Refresh Reports"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-emerald-800' : ''}`} />
          </button>

          {/* View Toggle on Mobile/Tablet */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setViewMode('cards')}
              className={`min-h-[36px] px-3 py-1 rounded-lg text-xs font-bold transition ${
                viewMode === 'cards'
                  ? 'bg-white text-emerald-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Cards
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`min-h-[36px] px-3 py-1 rounded-lg text-xs font-bold transition ${
                viewMode === 'map'
                  ? 'bg-white text-emerald-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Map
            </button>
            <button
              onClick={() => setViewMode('split')}
              className={`min-h-[36px] px-2.5 py-1 rounded-lg text-xs font-bold hidden lg:block transition ${
                viewMode === 'split'
                  ? 'bg-white text-emerald-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Split
            </button>
          </div>
        </div>
      </div>

      {/* Geolocation Status / Error notification bar if present */}
      {locationError && (
        <div className="bg-amber-50 border-t border-b border-amber-200 px-4 py-1.5 text-[11px] text-amber-900 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-amber-700 shrink-0" />
            <span>{locationError} You can still manually browse and check-in.</span>
          </div>
        </div>
      )}

      {/* GPS Uncertainty Notice when accuracy > 30m */}
      {userLocation && userLocation.accuracy && userLocation.accuracy > 30 && !locationError && (
        <div className="bg-blue-50/70 border-t border-b border-blue-200/80 px-4 py-1 text-[11px] text-blue-900 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span>GPS estimate is approximate (±{Math.round(userLocation.accuracy)}m). Indoor readings may fluctuate.</span>
          </div>
        </div>
      )}

      {/* Search & Category Filter Bar */}
      <div className="px-4 py-2 sm:px-6 bg-slate-50/70 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2.5">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            aria-label="Search study spaces"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Howie-T, LBC, PJ's, quiet zones..."
            className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-base sm:text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-700 shadow-2xs"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none text-xs">
          {[
            { id: 'all', label: 'All Spots' },
            { id: 'library', label: 'Libraries (Howie-T)' },
            { id: 'student-center', label: 'Student Center (LBC)' },
            { id: 'cafe', label: "Campus PJ's" },
            { id: 'academic', label: 'Academic Halls' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`min-h-[36px] px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap text-xs transition border ${
                selectedCategory === cat.id
                  ? 'bg-emerald-800 text-white border-emerald-800 shadow-2xs'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Sort Dropdown */}
        <div className="flex items-center gap-1.5 text-xs text-slate-500 ml-auto">
          <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
          <select
            aria-label="Sort study spots"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-base sm:text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-700"
          >
            <option value="distance" disabled={!userLocation}>
              Sort: {userLocation ? 'Nearest (Approx. Distance)' : 'Distance (Enable GPS)'}
            </option>
            <option value="recent">Sort: Most Recent Reports</option>
            <option value="name">Sort: Alphabetical</option>
          </select>
        </div>
      </div>
    </header>
  );
};

