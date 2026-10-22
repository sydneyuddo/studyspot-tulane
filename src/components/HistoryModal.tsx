import { useModalFocus } from '../utils/useModalFocus.ts';
import React, { useState, useEffect } from 'react';
import { Spot, SpotReport } from '../types.ts';
import { formatRelativeTime } from '../utils/geo.ts';
import { 
  X, 
  History, 
  Clock, 
  Volume2, 
  BatteryCharging, 
  Users, 
  MessageSquare, 
  RefreshCw, 
  Loader2, 
  Sparkles,
  MapPin
} from 'lucide-react';

interface HistoryModalProps {
  spot: Spot;
  isOpen: boolean;
  onClose: () => void;
  onOpenCheckIn: (spot: Spot) => void;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({
  spot,
  isOpen,
  onClose,
  onOpenCheckIn,
}) => {
  const modalRef = useModalFocus(isOpen, onClose);
  const [reports, setReports] = useState<SpotReport[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReports = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/spots/${spot.id}/reports`, {
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) {
        let msg = 'Failed to load history';
        try {
          const contentType = res.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            const d = await res.json();
            msg = d.error || msg;
          } else {
            msg = 'History service is temporarily unavailable. Please retry.';
          }
        } catch {
          msg = 'History service is temporarily unavailable. Please retry.';
        }
        throw new Error(msg);
      }
      let data: any;
      try {
        data = await res.json();
      } catch {
        throw new Error('Unexpected response format. Please retry.');
      }
      setReports(data.reports || []);
    } catch (err: any) {
      console.error('History fetch error:', err);
      setError(err.message || 'Error loading reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchReports();
    }
  }, [isOpen, spot.id]);

  if (!isOpen) return null;

  return (
    <div ref={modalRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label="StudySpot dialog" className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      <div 
        className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200 pb-safe"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800">
              <History className="w-3.5 h-3.5" /> Check-in History
            </div>
            <h2 className="text-base font-bold text-slate-900">{spot.name}</h2>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={fetchReports}
              disabled={loading}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200 transition"
              title="Refresh history"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200 transition"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Reports List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-700" />
              <span className="text-xs">Loading real check-ins...</span>
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 text-center">
              {error}
            </div>
          ) : reports.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto">
                <History className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-800 text-sm">No Recent Reports</h3>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                No real check-ins have been submitted for this location yet. Be the first to check in and help other Tulane students!
              </p>
              <button
                onClick={() => {
                  onClose();
                  onOpenCheckIn(spot);
                }}
                className="mt-2 min-h-[44px] px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-semibold shadow-sm transition"
              >
                Submit First Check-in
              </button>
            </div>
          ) : (
            reports.map((report) => {
              const isRecent = Date.now() - report.timestamp <= 60 * 60 * 1000;
              const crowdColors = {
                empty: 'bg-emerald-100 text-emerald-800 border-emerald-200',
                light: 'bg-teal-100 text-teal-800 border-teal-200',
                moderate: 'bg-amber-100 text-amber-800 border-amber-200',
                busy: 'bg-orange-100 text-orange-800 border-orange-200',
                packed: 'bg-rose-100 text-rose-800 border-rose-200',
              }[report.crowd];

              return (
                <div
                  key={report.id}
                  className={`p-3.5 rounded-xl border transition-all ${
                    isRecent
                      ? 'bg-white border-slate-200 shadow-xs'
                      : 'bg-slate-50/70 border-slate-200/60 opacity-80'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {formatRelativeTime(report.timestamp)}
                      {isRecent && (
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-medium">
                          Active (&lt;60m)
                        </span>
                      )}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border capitalize ${crowdColors}`}>
                      {report.crowd}
                    </span>
                  </div>

                  {report.floorOrArea && (
                    <div className="text-[11px] text-slate-600 font-medium mb-1.5 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      {report.floorOrArea}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-600 mb-2">
                    <span className="flex items-center gap-1">
                      <Volume2 className="w-3 h-3 text-slate-400" />
                      Noise: <strong className="capitalize">{report.noise}</strong>
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <BatteryCharging className="w-3 h-3 text-emerald-600" />
                      Outlets: <strong className="capitalize">{report.outlets}</strong>
                    </span>
                  </div>

                  {report.note && (
                    <div className="p-2 rounded-lg bg-slate-50 text-xs text-slate-700 italic border border-slate-100 mb-1 flex items-start gap-1.5">
                      <MessageSquare className="w-3 h-3 text-slate-400 mt-0.5 shrink-0" />
                      <span>"{report.note}"</span>
                    </div>
                  )}

                  {report.hasPhotoAnalysis && report.photoEstimates && (
                    <div className="mt-1.5 text-[10px] text-emerald-800 bg-emerald-50/80 p-2 rounded-lg border border-emerald-100 flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3 text-emerald-600 shrink-0" />
                      <span>Verified with Gemini visual estimate ({report.photoEstimates.visibleSeats || 'Seats analyzed'})</span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            {reports.length} total shared check-in{reports.length === 1 ? '' : 's'}
          </span>
          <button
            onClick={() => {
              onClose();
              onOpenCheckIn(spot);
            }}
            className="min-h-[44px] px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-semibold shadow-sm transition"
          >
            Check In Now
          </button>
        </div>
      </div>
    </div>
  );
};

