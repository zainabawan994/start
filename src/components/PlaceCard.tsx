import React from 'react';
import { Place } from '../types/accessibility';
import { 
  CheckCircle2, 
  AlertTriangle, 
  MapPin, 
  ShieldCheck,
  TrendingUp,
  DoorOpen,
  ArrowRight,
  Compass
} from 'lucide-react';

interface PlaceCardProps {
  place: Place;
  onSelect: (place: Place) => void;
  onViewOnMap: (place: Place) => void;
  highContrast: boolean;
}

export const PlaceCard: React.FC<PlaceCardProps> = ({
  place,
  onSelect,
  onViewOnMap,
  highContrast,
}) => {
  const isFullyAccessible = place.accessibilityLevel === 'fully_accessible';
  const isBarrierReported = place.accessibilityLevel === 'barrier_reported';

  return (
    <article
      onClick={() => onSelect(place)}
      className={`group cursor-pointer rounded-2xl border overflow-hidden flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 ${
        highContrast
          ? 'bg-black text-white border-yellow-400'
          : 'bg-white border-[#ADBBDA]/60 hover:border-[#7091E6] hover:shadow-lg'
      }`}
    >
      <div>
        {/* Photo Container */}
        <div className="relative aspect-[16/10] overflow-hidden bg-slate-900">
          <img
            src={place.imageUrl}
            alt={place.imageAlt || place.name}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

          {/* Clean Top-Left Badge */}
          <div className="absolute top-3 left-3">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold shadow-md backdrop-blur-md ${
              isFullyAccessible
                ? 'bg-emerald-600/90 text-white'
                : isBarrierReported
                ? 'bg-amber-600/90 text-white'
                : 'bg-[#3D52A0]/90 text-white'
            }`}>
              {isFullyAccessible ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Accessible ({place.accessibilityScore}%)</span>
                </>
              ) : isBarrierReported ? (
                <>
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Barrier Reported</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Partial Access</span>
                </>
              )}
            </span>
          </div>

          {/* Distance Tag on Bottom-Right of photo */}
          {place.distanceKm && (
            <div className="absolute bottom-2.5 right-3 px-2.5 py-0.5 rounded-lg bg-black/60 backdrop-blur-md text-white text-[11px] font-medium">
              {place.distanceKm} km away
            </div>
          )}
        </div>

        {/* Card Body - Minimal & Legible (Thora Sa Clean Data) */}
        <div className="p-4 space-y-2">
          {/* Category */}
          <span className="text-[11px] font-bold text-[#7091E6] uppercase tracking-wider block">
            {place.category.replace('_', ' ')}
          </span>

          {/* Title */}
          <h3 className="font-bold text-base text-[#1E2548] group-hover:text-[#3D52A0] transition-colors line-clamp-1 leading-snug">
            {place.name}
          </h3>

          {/* Address */}
          <p className="text-xs text-[#8697C4] flex items-center gap-1.5 line-clamp-1">
            <MapPin className="w-3.5 h-3.5 text-[#7091E6] shrink-0" />
            <span>{place.address}</span>
          </p>

          {/* 2 Key Concise Features Only */}
          <div className="pt-2 flex items-center gap-2 text-xs">
            {place.features.wheelchairRamps && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-[#EDE8F5] text-[#3D52A0] font-semibold text-[11px]">
                <TrendingUp className="w-3 h-3 text-[#7091E6]" />
                <span>Ramp</span>
              </span>
            )}
            {place.features.stepFreeEntrance && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-[#EDE8F5] text-[#3D52A0] font-semibold text-[11px]">
                <DoorOpen className="w-3 h-3 text-[#7091E6]" />
                <span>Step-Free</span>
              </span>
            )}
            {place.features.elevators && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-[#EDE8F5] text-[#3D52A0] font-semibold text-[11px]">
                <span>Elevator</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Clean Bottom Footer Bar */}
      <div className="px-4 py-3 bg-[#EDE8F5]/40 border-t border-[#ADBBDA]/30 flex items-center justify-between text-xs">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onViewOnMap(place);
          }}
          className="text-[#3D52A0] hover:text-[#1E2548] font-bold flex items-center gap-1.5 transition-colors cursor-pointer py-1"
        >
          <Compass className="w-3.5 h-3.5 text-[#7091E6]" />
          <span>Show on Map</span>
        </button>

        <span className="text-[#3D52A0] font-bold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
          <span>Details</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </span>
      </div>
    </article>
  );
};
