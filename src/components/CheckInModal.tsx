import { useModalFocus } from '../utils/useModalFocus.ts';
import React, { useState, useRef } from 'react';
import { Spot, CrowdLevel, NoiseLevel, OutletAvailability, PhotoAnalysisResult } from '../types.ts';
import { 
  X, 
  Camera, 
  Upload, 
  Sparkles, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ShieldCheck, 
  HelpCircle,
  Eye,
  Sun,
  BatteryCharging
} from 'lucide-react';

interface CheckInModalProps {
  spot: Spot;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CheckInModal: React.FC<CheckInModalProps> = ({
  spot,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const modalRef = useModalFocus(isOpen, onClose);

  // Form State
  const [selectedFloor, setSelectedFloor] = useState<string>(
    spot.floorsOrZones[0] || ''
  );
  const [crowd, setCrowd] = useState<CrowdLevel | null>(null);
  const [noise, setNoise] = useState<NoiseLevel | null>(null);
  const [outlets, setOutlets] = useState<OutletAvailability>('unknown');
  const [note, setNote] = useState<string>('');

  // Photo State
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [photoMime, setPhotoMime] = useState<string>('image/jpeg');
  const [photoSizeKb, setPhotoSizeKb] = useState<number>(0);
  const [isAnalyzingPhoto, setIsAnalyzingPhoto] = useState<boolean>(false);
  const [photoAnalysis, setPhotoAnalysis] = useState<PhotoAnalysisResult | null>(null);
  const [photoAnalysisError, setPhotoAnalysisError] = useState<string | null>(null);

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // Compress image on client before analysis
  const processImageFile = (file: File) => {
    setPhotoAnalysis(null);
    setPhotoAnalysisError(null);

    const failImage = () => setPhotoAnalysisError('This image could not be opened. Try a JPEG, PNG, or WebP photo.');
    const reader = new FileReader();
    reader.onerror = failImage;
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = failImage;
      img.onload = () => {
        // Resize to maximum 1200x1200px while maintaining aspect ratio
        const maxDim = 1200;
        let width = img.width;
        let height = img.height;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) { failImage(); return; }

        ctx.drawImage(img, 0, 0, width, height);
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.82);
        const approxKb = Math.round((compressedBase64.length * 3) / 4 / 1024);

        setPhotoBase64(compressedBase64);
        setPhotoMime('image/jpeg');
        setPhotoSizeKb(approxKb);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const isImage = file.type.startsWith('image/') || /\.(jpe?g|png|webp|heic|heif)$/i.test(file.name);
      if (!isImage) {
        setPhotoAnalysisError('Unsupported image format. Please select a JPEG, PNG, or WebP photo.');
        return;
      }
      if (file.size > 15 * 1024 * 1024) {
        setPhotoAnalysisError('Image file is too large. Please select a photo under 15MB.');
        return;
      }
      processImageFile(file);
    }
  };

  const removePhoto = () => {
    setPhotoBase64(null);
    setPhotoAnalysis(null);
    setPhotoAnalysisError(null);
    if (cameraInputRef.current) cameraInputRef.current.value = '';
    if (galleryInputRef.current) galleryInputRef.current.value = '';
  };

  // Explicit Analyze photo action
  const handleAnalyzePhoto = async () => {
    if (!photoBase64) return;
    setIsAnalyzingPhoto(true);
    setPhotoAnalysisError(null);

    try {
      const res = await fetch('/api/analyze-photo', {
        method: 'POST',
        signal: AbortSignal.timeout(30000),
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: photoBase64,
          mimeType: photoMime,
          spotName: spot.name,
        }),
      });

      if (!res.ok) {
        let msg = 'Failed to analyze photo';
        try {
          const contentType = res.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            const errData = await res.json();
            msg = errData.error || msg;
          } else {
            msg = 'Photo analysis service is temporarily unavailable. Please retry.';
          }
        } catch {
          msg = 'Photo analysis service is temporarily unavailable. Please retry.';
        }
        throw new Error(msg);
      }

      let data: any;
      try {
        data = await res.json();
      } catch {
        throw new Error('Received unexpected response format. Please retry.');
      }

      setPhotoAnalysis(data.analysis);

      // Pre-fill fields if Gemini suggested values, but allow student to adjust
      if (data.analysis.suggestedCrowdLevel) {
        setCrowd(data.analysis.suggestedCrowdLevel);
      }
      if (data.analysis.suggestedOutletAvailability) {
        setOutlets(data.analysis.suggestedOutletAvailability);
      }
    } catch (err: any) {
      console.error('Photo analysis error:', err);
      setPhotoAnalysisError(err.message || 'Error analyzing photo with Gemini');
    } finally {
      setIsAnalyzingPhoto(false);
    }
  };

  // Submit check-in to shared persistent database
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!crowd || !noise) { setSubmitError('Please select the crowd and noise levels you observed.'); return; }
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const payload = {
        crowd,
        noise,
        outlets,
        floorOrArea: selectedFloor,
        note: note.trim() || undefined,
        hasPhotoAnalysis: Boolean(photoAnalysis),
        photoEstimates: photoAnalysis ? {
          visibleSeats: photoAnalysis.visibleSeatsEstimate,
          lighting: photoAnalysis.lighting,
          visibleOutlets: photoAnalysis.visibleOutlets,
        } : undefined,
      };

      const res = await fetch(`/api/spots/${spot.id}/reports`, {
        method: 'POST',
        signal: AbortSignal.timeout(30000),
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        let msg = 'Failed to post check-in';
        try {
          const contentType = res.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            const errData = await res.json();
            msg = errData.error || msg;
          } else {
            msg = 'Check-in service is temporarily unavailable. Please retry in a few moments.';
          }
        } catch {
          msg = 'Check-in service is temporarily unavailable. Please retry in a few moments.';
        }
        throw new Error(msg);
      }

      let data: any;
      try {
        data = await res.json();
      } catch {
        throw new Error('Received unexpected response format. Please retry.');
      }

      setSubmitSuccess(true);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1200);
    } catch (err: any) {
      console.error('Check-in submission error:', err);
      setSubmitError(err.message || 'Network error submitting report');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div ref={modalRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Report study conditions" className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      <div 
        className="w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200 pb-safe"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-start justify-between bg-slate-50/80">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 mb-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Anonymous Peer Check-in
            </div>
            <h2 className="text-lg font-bold text-slate-900">{spot.name}</h2>
            <p className="text-xs text-slate-500">Updates live for all Tulane students</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {submitSuccess ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Check-in Recorded!</h3>
              <p className="text-sm text-slate-600 max-w-xs mx-auto">
                Thank you! Your live update is now saved and broadcasting to other students across campus. Roll Wave!
              </p>
            </div>
          ) : (
            <form id="checkin-form" onSubmit={handleSubmit} className="space-y-5">
              {/* Floor / Specific Zone Selector */}
              {spot.floorsOrZones.length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Floor or Zone
                  </label>
                  <select
                    aria-label="Floor or zone"
                    value={selectedFloor}
                    onChange={(e) => setSelectedFloor(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-base sm:text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-700"
                  >
                    {spot.floorsOrZones.map((zone, idx) => (
                      <option key={idx} value={zone}>
                        {zone}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Crowd Level */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Current Crowd Level
                </label>
                <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                  {(['empty', 'light', 'moderate', 'busy', 'packed'] as CrowdLevel[]).map((level) => {
                    const isPicked = crowd === level;
                    const labels: Record<CrowdLevel, string> = {
                      empty: 'Empty',
                      light: 'Light',
                      moderate: 'Mod',
                      busy: 'Busy',
                      packed: 'Full',
                    };
                    const colorStyles: Record<CrowdLevel, string> = {
                      empty: isPicked ? 'bg-emerald-700 text-white border-emerald-700 shadow-sm' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100',
                      light: isPicked ? 'bg-teal-700 text-white border-teal-700 shadow-sm' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100',
                      moderate: isPicked ? 'bg-amber-600 text-white border-amber-600 shadow-sm' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100',
                      busy: isPicked ? 'bg-orange-600 text-white border-orange-600 shadow-sm' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100',
                      packed: isPicked ? 'bg-rose-700 text-white border-rose-700 shadow-sm' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100',
                    };

                    return (
                      <button
                        key={level}
                        type="button"
                        onClick={() => setCrowd(level)}
                        className={`min-h-[44px] py-2 px-1 rounded-xl border text-xs font-semibold text-center transition flex flex-col items-center justify-center ${colorStyles[level]}`}
                      >
                        <span className="capitalize">{labels[level]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Noise Level */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Noise Level
                </label>
                <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
                  {(['silent', 'quiet', 'moderate', 'loud'] as NoiseLevel[]).map((level) => {
                    const isPicked = noise === level;
                    return (
                      <button
                        key={level}
                        type="button"
                        onClick={() => setNoise(level)}
                        className={`min-h-[44px] py-2 px-2 rounded-xl border text-xs font-semibold text-center transition flex items-center justify-center capitalize ${
                          isPicked
                            ? 'bg-emerald-800 text-white border-emerald-800 shadow-sm'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {level}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Outlet Availability */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Power Outlets Available
                </label>
                <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                  {(['plentiful', 'some', 'rare', 'none', 'unknown'] as OutletAvailability[]).map((level) => {
                    const isPicked = outlets === level;
                    return (
                      <button
                        key={level}
                        type="button"
                        onClick={() => setOutlets(level)}
                        className={`min-h-[44px] py-2 px-2 rounded-xl border text-xs font-semibold text-center transition flex items-center justify-center capitalize ${
                          isPicked
                            ? 'bg-emerald-800 text-white border-emerald-800 shadow-sm'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {level}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Optional Camera & Photo Analysis (with Gemini) */}
              <div className="pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-emerald-800" />
                    Optional Study Space Photo
                  </label>
                  <span className="text-[11px] text-slate-400 font-medium">Privacy Protected</span>
                </div>

                <p className="text-[11px] text-slate-500 mb-3 leading-relaxed">
                  Analyze photo with Gemini AI to estimate visible seating, lighting, and outlets. 
                  <strong className="text-slate-700"> Photos are analyzed in memory and NOT stored or made public.</strong> Please avoid identifiable people.
                </p>

                {!photoBase64 && photoAnalysisError && <p role="alert" className="text-sm text-rose-700 mb-3">{photoAnalysisError}</p>}

                {/* Hidden File Inputs */}
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <input
                  ref={galleryInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />

                {!photoBase64 ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => cameraInputRef.current?.click()}
                        className="min-h-[44px] flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition"
                      >
                        <Camera className="w-4 h-4 text-emerald-800" />
                        Take Photo
                      </button>
                      <button
                        type="button"
                        onClick={() => galleryInputRef.current?.click()}
                        className="min-h-[44px] flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition"
                      >
                        <Upload className="w-4 h-4 text-emerald-800" />
                        Upload Photo
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-500 text-center leading-tight">
                      Take Photo opens rear camera. If camera is blocked in browser settings, allow camera in Safari/Chrome site settings or use Upload Photo.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Thumbnail & Actions */}
                    <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-900/5 p-2 flex items-center gap-3">
                      <img
                        src={photoBase64}
                        alt="Study space preview"
                        className="w-16 h-16 object-cover rounded-lg border border-slate-200"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-800 truncate">Photo selected</p>
                        <p className="text-[11px] text-slate-500">~{photoSizeKb} KB compressed</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={handleAnalyzePhoto}
                          disabled={isAnalyzingPhoto}
                          className="min-h-[44px] px-3 py-1.5 bg-emerald-800 hover:bg-emerald-900 active:scale-95 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition disabled:opacity-50"
                        >
                          {isAnalyzingPhoto ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              Analyzing...
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                              Analyze Photo
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={removePhoto}
                          className="p-2.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 transition"
                          title="Remove photo"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Photo Analysis Error */}
                    {photoAnalysisError && (
                      <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>{photoAnalysisError}</span>
                      </div>
                    )}

                    {/* Photo Analysis Results Card */}
                    {photoAnalysis && (
                      <div className="rounded-xl bg-emerald-50/80 border border-emerald-200 p-3.5 space-y-2.5 text-xs text-emerald-950">
                        <div className="flex items-center justify-between">
                          <span className="font-bold flex items-center gap-1.5 text-emerald-900">
                            <Sparkles className="w-3.5 h-3.5 text-emerald-700" /> Gemini AI Visual Estimates
                          </span>
                          <span className="text-[10px] text-emerald-700 bg-white/70 px-2 py-0.5 rounded-full font-medium border border-emerald-200">
                            Pre-filled for review
                          </span>
                        </div>

                        <div className="space-y-1.5 text-[11px]">
                          <div className="flex items-start gap-2">
                            <Eye className="w-3.5 h-3.5 text-emerald-700 shrink-0 mt-0.5" />
                            <span><strong>Visible Seating:</strong> {photoAnalysis.visibleSeatsEstimate}</span>
                          </div>
                          <div className="flex items-start gap-2">
                            <Sun className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                            <span><strong>Lighting:</strong> {photoAnalysis.lighting}</span>
                          </div>
                          <div className="flex items-start gap-2">
                            <BatteryCharging className="w-3.5 h-3.5 text-emerald-700 shrink-0 mt-0.5" />
                            <span><strong>Visible Outlets:</strong> {photoAnalysis.visibleOutlets}</span>
                          </div>
                        </div>

                        <p className="text-[10px] text-slate-500 bg-white/80 p-2 rounded-lg border border-emerald-100 italic">
                          {photoAnalysis.disclaimer}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Optional Peer Note */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Optional Tip or Note for Classmates
                  </label>
                  <span className="text-[11px] text-slate-400">
                    {note.length} / 280
                  </span>
                </div>
                <textarea
                  aria-label="Optional tip for classmates"
                  value={note}
                  onChange={(e) => setNote(e.target.value.slice(0, 280))}
                  placeholder="e.g. 4th floor quiet carrels have plenty of open seats near north windows, AC running cold..."
                  rows={2}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-base sm:text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-700 resize-none"
                />
              </div>

              {/* Submission Error Banner */}
              {submitError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{submitError}</span>
                </div>
              )}
            </form>
          )}
        </div>

        {/* Footer Actions */}
        {!submitSuccess && (
          <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="min-h-[44px] px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="checkin-form"
              disabled={isSubmitting || !crowd || !noise}
              className="min-h-[44px] flex-1 sm:flex-initial px-6 py-2.5 bg-emerald-800 hover:bg-emerald-900 active:scale-[0.98] text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Broadcasting live...
                </>
              ) : (
                'Submit Real Check-In'
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

