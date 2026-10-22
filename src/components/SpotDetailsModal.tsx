import { useModalFocus } from '../utils/useModalFocus.ts';
import React from 'react';
import { Spot } from '../types.ts';
import { formatDistance, formatRelativeTime } from '../utils/geo.ts';
import { 
  X, 
  MapPin, 
  Clock, 
  Volume2, 
  BatteryCharging, 
  History, 
  PlusCircle, 
  ExternalLink,
  MessageSquare,
  Layers,
  ShieldCheck,
  Building
} from 'lucide-react';

interface SpotDetailsModalProps {
  spot: Spot | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenCheckIn: (spot: Spot) => void;
  onOpenHistory: (spot: Spot) => void;
}

export const SpotDetailsModal: React.FC<SpotDetailsModalProps> = ({
  spot,
  isOpen,
  onClose,
  onOpenCheckIn,
  onOpenHistory,
}) => {
  const modalRef = useModalFocus(isOpen, onClose);

  if (!isOpen || !spot) return null;

  const getCrowdBadge = () => {
    if (!spot.hasRecentReports || !spot.currentStatus) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
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
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${config.bg}`}>
        <span className={`w-2 h-2 rounded-full ${config.dot} animate-pulse`}></span>
        Crowd: {config.label}
      </span>
    );
  };

  return (
    <div 
      ref={modalRef} 
      tabIndex={-1} 
      role="dialog" 
      aria-modal="true" 
      aria-label={`${spot.name} details`}
      className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
    >
      <div 
        className="w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200 pb-safe"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-start justify-between bg-slate-50/90">
          <div className="flex items-start gap-3">
            <span className="w-11 h-11 rounded-2xl bg-emerald-800 text-white flex items-center justify-center text-xl shadow-xs border border-emerald-700 shrink-0">
              {spot.category === 'library' ? '📚' : spot.category === 'cafe' ? '☕' : spot.category === 'student-center' ? '🏛️' : '🏫'}
            </span>
            <div>
              <span className="inline-block text-[11px] font-bold text-emerald-800 uppercase tracking-wide">
                {spot.shortName} • Uptown Campus
              </span>
              <h2 className="text-lg font-bold text-slate-900 leading-snug">{spot.name}</h2>
              <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>{spot.address}</span>
                {spot.distanceMeters !== undefined && (
                  <span className="font-semibold text-emerald-700 ml-1">
                    • {formatDistance(spot.distanceMeters)} (straight-line)
                  </span>
                )}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs text-slate-700">
          {/* Live Conditions Card */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/90 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" /> Live Campus Conditions
              </span>
              {spot.hasRecentReports && spot.lastReportTimestamp && (
                <span className="text-[11px] text-slate-500 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-400" />
                  {formatRelativeTime(spot.lastReportTimestamp)}
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {getCrowdBadge()}
              {spot.hasRecentReports && spot.currentStatus && (
                <>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-white border border-slate-200 text-slate-700">
                    <Volume2 className="w-3.5 h-3.5 text-slate-500" />
                    Noise: <strong className="capitalize">{spot.currentStatus.noise}</strong>
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-white border border-slate-200 text-slate-700">
                    <BatteryCharging className="w-3.5 h-3.5 text-emerald-600" />
                    Outlets: <strong className="capitalize">{spot.currentStatus.outlets}</strong>
                  </span>
                </>
              )}
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              {spot.hasRecentReports
                ? `Based on ${spot.activeReportsCount} peer report${spot.activeReportsCount === 1 ? '' : 's'} submitted by Tulane students in the last 60 minutes.`
                : 'No student check-ins recorded in the last 60 minutes. Be the first to submit a real report!'}
            </p>
          </div>

          {/* Description */}
          <div>
            <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-slate-500" /> About This Study Space
            </h3>
            <p className="text-slate-600 leading-relaxed">
              {spot.description}
            </p>
          </div>

          {/* Floors & Specific Study Zones */}
          <div>
            <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-slate-500" /> Floors & Designated Zones
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {spot.floorsOrZones.map((zone, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-900 border border-emerald-100 text-[11px] font-medium"
                >
                  {zone}
                </span>
              ))}
            </div>
          </div>

          {/* Recent Student Peer Note if available */}
          {spot.recentNotes && spot.recentNotes.length > 0 && (
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-950 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-emerald-900 text-[11px]">
                <MessageSquare className="w-3.5 h-3.5 text-emerald-700" /> Latest Student Peer Tip
              </div>
              <p className="italic text-slate-700">"{spot.recentNotes[0]}"</p>
            </div>
          )}

          {/* Operating Hours Guidance & Official Schedule */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 font-bold text-slate-800 text-xs">
                <Clock className="w-3.5 h-3.5 text-slate-500" /> Official Operating Hours
              </div>
              <a
                href={spot.officialHoursUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-800 hover:text-emerald-950 font-bold text-[11px] inline-flex items-center gap-1 hover:underline shrink-0"
              >
                Tulane Schedule <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <p className="text-slate-500 text-[11px] leading-relaxed">
              {spot.hoursGuidance}
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenHistory(spot);
            }}
            className="min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold text-xs flex items-center gap-1.5 transition"
          >
            <History className="w-3.5 h-3.5 text-slate-500" />
            History ({spot.totalReportsCount})
          </button>

          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenCheckIn(spot);
            }}
            className="min-h-[44px] flex-1 sm:flex-initial px-5 py-2.5 bg-emerald-800 hover:bg-emerald-900 active:scale-[0.98] text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center justify-center gap-1.5"
          >
            <PlusCircle className="w-4 h-4" />
            Check In Here
          </button>
        </div>
      </div>
    </div>
  );
};
