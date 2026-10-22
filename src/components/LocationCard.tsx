import React from 'react';
import { Spot } from '../types.ts';
import { formatDistance, formatRelativeTime } from '../utils/geo.ts';
import { 
  Clock, 
  MapPin, 
  BatteryCharging, 
  Volume2, 
  History, 
  PlusCircle, 
  ExternalLink,
  MessageSquare
} from 'lucide-react';

interface LocationCardProps {
  spot: Spot;
  isSelected: boolean;
  onSelect: (spot: Spot) => void;
  onOpenCheckIn: (spot: Spot) => void;
  onOpenHistory: (spot: Spot) => void;
  onShowOnMap?: (spot: Spot) => void;
}

export const LocationCard: React.FC<LocationCardProps> = ({
  spot,
  isSelected,
  onSelect,
  onOpenCheckIn,
  onOpenHistory,
  onShowOnMap,
}) => {
  const getCrowdBadge = () => {
    if (!spot.hasRecentReports || !spot.currentStatus) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
          <span className="w-2 h-2 rounded-full bg-slate-400"></span>
          No recent reports (last 60m)
        </span>
      );
    }

    const { crowd } = spot.currentStatus;
    const config = {
      empty: { bg: 'bg-emerald-50 text-emerald-800 border-emerald-200', dot: 'bg-emerald-500', label: 'Empty' },
      light: { bg: 'bg-teal-50 text-teal-800 border-teal-200', dot: 'bg-teal-500', label: 'Light' },
      moderate: { bg: 'bg-amber-50 text-amber-800 border-amber-200', dot: 'bg-amber-500', label: 'Moderate' },
      busy: { bg: 'bg-orange-50 text-orange-800 border-orange-200', dot: 'bg-orange-500', label: 'Busy' },
      packed: { bg: 'bg-rose-50 text-rose-800 border-rose-200', dot: 'bg-rose-500', label: 'Packed' },
    }[crowd];

    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${config.bg}`}>
        <span className={`w-2 h-2 rounded-full ${config.dot} animate-pulse`}></span>
        Crowd: {config.label}
      </span>
    );
  };

  const getNoiseLabel = () => {
    if (!spot.hasRecentReports || !spot.currentStatus) return null;
    const { noise } = spot.currentStatus;
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700">
        <Volume2 className="w-3 h-3 text-slate-500" />
        Noise: <span className="capitalize font-semibold">{noise}</span>
      </span>
    );
  };

  const getOutletLabel = () => {
    if (!spot.hasRecentReports || !spot.currentStatus) return null;
    const { outlets } = spot.currentStatus;
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700">
        <BatteryCharging className="w-3 h-3 text-emerald-600" />
        Outlets: <span className="capitalize font-semibold">{outlets}</span>
      </span>
    );
  };

  return (
    <div
      id={`spot-card-${spot.id}`}
      tabIndex={-1}
      aria-label={`${spot.name} details`}
      onClick={() => onSelect(spot)}
      className={`group relative bg-white rounded-2xl border p-4 sm:p-5 transition-all duration-200 cursor-pointer shadow-xs ${
        isSelected
          ? 'border-emerald-700 ring-2 ring-emerald-600/20 shadow-md'
          : 'border-slate-200 hover:border-emerald-600/50 hover:shadow-sm'
      }`}
    >
      {/* Header Row: Spot Name + Category Icon */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-lg text-slate-900 group-hover:text-emerald-900 transition-colors">
              {spot.name}
            </h3>
          </div>
          <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>{spot.address}</span>
            {spot.distanceMeters !== undefined && (
              <span className="font-semibold text-emerald-700 ml-1.5" title="Spherical straight-line distance calculated on device">
                • {formatDistance(spot.distanceMeters)} (straight-line)
              </span>
            )}
          </p>
        </div>

        <span className="shrink-0 w-10 h-10 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center text-lg border border-emerald-100 shadow-xs">
          {spot.category === 'library' ? '📚' : spot.category === 'cafe' ? '☕' : spot.category === 'student-center' ? '🏛️' : '🏫'}
        </span>
      </div>

      {/* Real Live Conditions Status Row */}
      <div className="flex flex-wrap items-center gap-2 my-2.5">
        {getCrowdBadge()}
        {getNoiseLabel()}
        {getOutletLabel()}
      </div>

      {/* Freshness & Report Counter */}
      <div className="flex items-center justify-between text-xs text-slate-500 pt-1 pb-2 border-b border-slate-100">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          {spot.hasRecentReports && spot.lastReportTimestamp ? (
            <span>
              Updated <strong className="text-slate-700">{formatRelativeTime(spot.lastReportTimestamp)}</strong> ({spot.activeReportsCount} live report{spot.activeReportsCount === 1 ? '' : 's'})
            </span>
          ) : spot.lastReportTimestamp ? (
            <span>
              Last reported {formatRelativeTime(spot.lastReportTimestamp)} (stale &gt;60m)
            </span>
          ) : (
            <span>No reports recorded yet</span>
          )}
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenHistory(spot);
          }}
          className="text-emerald-800 hover:text-emerald-950 font-medium inline-flex items-center gap-1 hover:underline text-[11px]"
        >
          <History className="w-3 h-3" />
          History ({spot.totalReportsCount})
        </button>
      </div>

      {/* Description */}
      <p className="text-xs text-slate-600 line-clamp-2 my-2.5 leading-relaxed">
        {spot.description}
      </p>

      {/* Recent Student Peer Note if available */}
      {spot.recentNotes && spot.recentNotes.length > 0 && (
        <div className="my-2 bg-emerald-50/60 border border-emerald-100 rounded-xl p-2.5 text-xs text-emerald-950 flex items-start gap-2">
          <MessageSquare className="w-3.5 h-3.5 text-emerald-700 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold text-emerald-800">Peer Note:</span> "{spot.recentNotes[0]}"
          </div>
        </div>
      )}

      {/* Operating Hours & Official Link Notice */}
      <div className="mt-2 bg-slate-50 rounded-xl p-2.5 border border-slate-200/70 text-[11px] text-slate-600 space-y-1.5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-1 font-semibold text-slate-700">
            <Clock className="w-3 h-3 text-slate-500" /> Building & Venue Hours:
          </div>
          <a
            href={spot.officialHoursUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-[10px] font-bold text-emerald-800 hover:text-emerald-950 inline-flex items-center gap-0.5 hover:underline shrink-0"
          >
            Official Schedule <ExternalLink className="w-2.5 h-2.5" />
          </a>
        </div>
        <p className="text-slate-500 text-[10px] leading-tight">
          {spot.hoursGuidance}
        </p>
      </div>

      {/* Zones list */}
      <div className="flex flex-wrap gap-1 mt-3">
        {spot.floorsOrZones.slice(0, 3).map((zone, idx) => (
          <span
            key={idx}
            className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-medium"
          >
            {zone}
          </span>
        ))}
        {spot.floorsOrZones.length > 3 && (
          <span className="px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-400 text-[10px]">
            +{spot.floorsOrZones.length - 3} more
          </span>
        )}
      </div>

      {/* Action Buttons */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenCheckIn(spot);
          }}
          className="flex-1 min-h-[44px] bg-emerald-800 hover:bg-emerald-900 active:scale-[0.98] text-white py-2 px-3 rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 shadow-sm transition"
        >
          <PlusCircle className="w-4 h-4" />
          Check In (Report Live)
        </button>

        {onShowOnMap && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onShowOnMap(spot);
            }}
            className="min-h-[44px] px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 active:scale-95 text-xs font-medium text-slate-700 flex items-center gap-1 transition"
            title="Focus on Campus Map"
          >
            <MapPin className="w-3.5 h-3.5 text-emerald-800" />
            <span className="hidden sm:inline">Map</span>
          </button>
        )}
      </div>
    </div>
  );
};

