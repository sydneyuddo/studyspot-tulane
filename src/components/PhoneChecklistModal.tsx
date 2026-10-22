import { useModalFocus } from '../utils/useModalFocus.ts';
import React from 'react';
import { 
  X, 
  Smartphone, 
  CheckCircle2, 
  ShieldCheck, 
  AlertTriangle, 
  Database,
  ExternalLink
} from 'lucide-react';

interface PhoneChecklistModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PhoneChecklistModal: React.FC<PhoneChecklistModalProps> = ({
  isOpen,
  onClose,
}) => {
  const modalRef = useModalFocus(isOpen, onClose);
  if (!isOpen) return null;

  return (
    <div ref={modalRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label="StudySpot dialog" className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      <div 
        className="w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200 pb-safe"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-start justify-between bg-emerald-950 text-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-800 text-amber-300">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">Mobile Device, Data & Architecture Guide</h2>
              <p className="text-xs text-emerald-200">iPhone Safari, Android Chrome & Database Notes</p>
            </div>
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
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 text-slate-700 text-xs leading-relaxed">
          {/* iOS Safari Checklist */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2.5">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span> iPhone (iOS Safari) Checklist
            </h3>
            <ul className="space-y-2 text-slate-600">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                <span><strong>Location Permission:</strong> Tap <em>"Use My Location"</em> and select <em>"Allow While Using App"</em>. The app computes straight-line distance locally via the Haversine formula (as-the-crow-flies, not pedestrian routing).</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                <span><strong>Camera Capture:</strong> Tapping "Take Photo" opens iOS native camera (<code className="bg-slate-200 px-1 rounded text-[10px]">capture="environment"</code>). Images are compressed in-browser before upload.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                <span><strong>Home Screen Icon:</strong> Tap Safari Share &gt; <em>"Add to Home Screen"</em> for full-screen web app access.</span>
              </li>
            </ul>
          </div>

          {/* Android Chrome Checklist */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2.5">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-600"></span> Android (Google Chrome) Checklist
            </h3>
            <ul className="space-y-2 text-slate-600">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                <span><strong>Precise Geolocation:</strong> Ensure location permission is granted for instant straight-line distance sorting.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                <span><strong>Install App:</strong> Tap the 3-dot Chrome menu and select <em>"Install App"</em> or <em>"Add to Home screen"</em>.</span>
              </li>
            </ul>
          </div>

          {/* Database Architecture & Setup Blocker Notice */}
          <div className="bg-amber-50/80 border border-amber-300 rounded-2xl p-4 space-y-2.5 text-amber-950">
            <h3 className="font-bold text-xs flex items-center gap-1.5 text-amber-900">
              <Database className="w-4 h-4 text-amber-700" /> Database Architecture & Production Blocker
            </h3>
            <p className="text-[11px] leading-relaxed">
              <strong>Current Storage:</strong> Check-ins are stored in a validated server-side instance store (<code className="bg-amber-100 px-1 rounded text-[10px]">data/reports.json</code>).
            </p>
            <p className="text-[11px] leading-relaxed">
              <strong>Honest Limitation:</strong> This instance store persists active session data for this server instance, but <em>is not a production durable database across container restarts or horizontally scaled instances</em>.
            </p>
            <p className="text-[11px] leading-relaxed">
              <strong>Production Setup Blocker:</strong> Replacing the instance store with a durable managed database (such as Google Cloud Firestore or Cloud SQL) requires user terms acceptance and project provisioning in AI Studio. No paid or external cloud database has been provisioned yet per project guidelines.
            </p>
          </div>

          {/* AI Privacy & Transparency Model */}
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 space-y-2.5">
            <h3 className="font-bold text-emerald-950 text-sm flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-800" /> Privacy & Truthful Campus Data Policy
            </h3>
            <ul className="space-y-2 text-emerald-900 text-[11px]">
              <li>
                <strong>No Unsubstantiated Claims:</strong> Building schedules fluctuate; we provide direct links to official Tulane operating schedules rather than unverified static hours.
              </li>
              <li>
                <strong>Straight-Line Distance:</strong> Distances computed with the Haversine formula represent straight-line spherical distance, not ground pedestrian walking path.
              </li>
              <li>
                <strong>No Fake Live Data:</strong> If no student has checked in within 60 minutes, the app displays <em>"No recent reports (last 60m)"</em>.
              </li>
              <li>
                <strong>Client-Side GPS Privacy:</strong> Exact GPS coordinates are never sent to or stored on the server.
              </li>
              <li>
                <strong>Ephemeral Photo Analysis:</strong> Analyzed in memory by Gemini (<code className="text-[10px] bg-emerald-100 px-1 rounded">gemini-3.8-flash</code>) on the server. Photos are never stored or made public. Gemini is strictly prohibited from guessing noise or full-room occupancy from a still photo.
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="min-h-[44px] px-5 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold shadow-sm transition"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};

