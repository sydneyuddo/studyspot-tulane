import React, { useState } from 'react';
import { Spot, RecommendationResponse } from '../types.ts';
import { 
  X, 
  Sparkles, 
  Compass, 
  VolumeX, 
  BatteryCharging, 
  MapPin, 
  Users, 
  Coffee, 
  Loader2, 
  AlertCircle, 
  Clock, 
  ArrowRight,
  ShieldCheck
} from 'lucide-react';

interface AiAdvisorModalProps {
  spots: Spot[];
  isOpen: boolean;
  onClose: () => void;
  onSelectSpot: (spot: Spot) => void;
}

export const AiAdvisorModal: React.FC<AiAdvisorModalProps> = ({
  spots,
  isOpen,
  onClose,
  onSelectSpot,
}) => {
  const [priority, setPriority] = useState<string>('Quiet focus (Silent or low noise)');
  const [studyMode, setStudyMode] = useState<string>('Solo deep work');
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<RecommendationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGetRecommendations = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preference: priority,
          studyMode,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch recommendations');
      }

      setResult(data.data);
    } catch (err: any) {
      console.error('Advisor error:', err);
      setError(err.message || 'Error communicating with Gemini Advisor');
    } finally {
      setLoading(false);
    }
  };

  const priorityOptions = [
    { id: 'Quiet focus (Silent or low noise)', label: 'Quiet Focus', icon: VolumeX },
    { id: 'Abundant power outlets for laptop/tablet', label: 'Need Outlets', icon: BatteryCharging },
    { id: 'Nearest straight-line distance', label: 'Closest Spot (Distance)', icon: MapPin },
    { id: 'Group discussion & collaborative space', label: 'Group Friendly', icon: Users },
    { id: 'Coffee, snacks & caffeine access', label: 'Coffee & Snacks', icon: Coffee },
  ];

  const modeOptions = [
    'Solo deep work',
    'Casual reading / homework',
    'Group project (2-5 people)',
  ];

  return (
    <div className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      <div 
        className="w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200 pb-safe"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-start justify-between bg-emerald-900 text-white">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-800 text-amber-300 border border-emerald-700 mb-1">
              <Sparkles className="w-3.5 h-3.5" /> Powered by Gemini
            </div>
            <h2 className="text-lg font-bold">Tulane Study Advisor</h2>
            <p className="text-xs text-emerald-200">Personalized recommendations grounded in real peer reports</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-emerald-800 text-emerald-300 hover:text-white transition"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* Preferences Section */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                What matters most for this session?
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {priorityOptions.map((opt) => {
                  const Icon = opt.icon;
                  const isSelected = priority === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setPriority(opt.id)}
                      className={`min-h-[44px] p-2.5 rounded-xl border text-left text-xs font-semibold flex items-center gap-2 transition ${
                        isSelected
                          ? 'bg-emerald-800 text-white border-emerald-800 shadow-sm'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-amber-300' : 'text-emerald-800'}`} />
                      <span className="truncate">{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Study Format
              </label>
              <div className="grid grid-cols-3 gap-2">
                {modeOptions.map((mode) => {
                  const isSelected = studyMode === mode;
                  return (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setStudyMode(mode)}
                      className={`min-h-[44px] p-2 rounded-xl border text-center text-xs font-semibold transition ${
                        isSelected
                          ? 'bg-emerald-800 text-white border-emerald-800 shadow-sm'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {mode}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              onClick={handleGetRecommendations}
              disabled={loading}
              className="w-full min-h-[44px] py-3 px-4 bg-emerald-800 hover:bg-emerald-900 active:scale-[0.98] text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-amber-300" />
                  Grounded analysis with Gemini AI...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  Find My Best Tulane Study Spot
                </>
              )}
            </button>
          </div>

          {/* Error Banner with Explicit Retry */}
          {error && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-950 space-y-2">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-amber-900">AI Service Temporarily Unavailable</p>
                  <p className="text-[11px] text-amber-800 mt-0.5">{error}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleGetRecommendations}
                className="w-full mt-2 min-h-[40px] px-3 py-1.5 bg-amber-600 hover:bg-amber-700 active:scale-[0.98] text-white font-bold rounded-lg text-xs transition flex items-center justify-center gap-1.5 shadow-xs"
              >
                <Sparkles className="w-3.5 h-3.5" /> Retry AI Recommendation
              </button>
            </div>
          )}

          {/* AI Output Section */}
          {result && (
            <div className="space-y-4 pt-3 border-t border-slate-200 animate-in fade-in duration-300">
              {/* Summary Box */}
              <div className="bg-emerald-50/90 border border-emerald-200 rounded-2xl p-4 text-xs text-emerald-950">
                <div className="flex items-center gap-1.5 font-bold text-emerald-900 mb-1">
                  <Sparkles className="w-4 h-4 text-emerald-700" /> AI Recommendation Summary
                </div>
                <p className="leading-relaxed text-slate-800">{result.summary}</p>
                <p className="text-[10px] text-emerald-700 mt-2 font-medium flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Honest AI policy: Missing or stale peer data is explicitly stated. No conditions are invented.
                </p>
              </div>

              {/* Recommendations Cards */}
              <div className="space-y-3">
                {result.recommendations.map((rec, idx) => {
                  const matchingSpot = spots.find((s) => s.id === rec.spotId);

                  return (
                    <div
                      key={idx}
                      className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs hover:border-emerald-700/50 transition-all space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-emerald-800 text-white text-[11px] font-bold flex items-center justify-center">
                              {rec.rank || idx + 1}
                            </span>
                            <h4 className="font-bold text-slate-900 text-sm">{rec.spotName}</h4>
                          </div>
                          {rec.recommendedZone && (
                            <p className="text-[11px] font-semibold text-emerald-800 ml-7 mt-0.5">
                              Recommended: {rec.recommendedZone}
                            </p>
                          )}
                        </div>
                        <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                          {rec.badge}
                        </span>
                      </div>

                      <p className="text-xs text-slate-700 leading-relaxed ml-7">
                        {rec.rationale}
                      </p>

                      <div className="ml-7 pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                        <span className="inline-flex items-center gap-1 text-slate-500 font-medium">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {rec.dataFreshnessNote}
                        </span>

                        {matchingSpot && (
                          <button
                            type="button"
                            onClick={() => {
                              onSelectSpot(matchingSpot);
                              onClose();
                            }}
                            className="text-emerald-800 hover:text-emerald-950 font-bold inline-flex items-center gap-1 hover:underline"
                          >
                            View Spot <ArrowRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            StudySpot AI • Tulane University
          </span>
          <button
            onClick={onClose}
            className="min-h-[44px] px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-semibold transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
