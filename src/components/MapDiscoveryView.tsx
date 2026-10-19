import React, { useState, useEffect, useRef } from 'react';
import { Place } from '../types/accessibility';
import { SerpApiSearchModal } from './SerpApiSearchModal';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  MapPin, 
  Navigation, 
  Search, 
  ChevronRight, 
  Compass, 
  CheckCircle2, 
  TrendingUp, 
  ArrowUpDown, 
  Bath, 
  ShieldCheck, 
  Building2, 
  Layers,
  Globe,
  ExternalLink,
  LocateFixed,
  X,
  Maximize2,
  SlidersHorizontal,
  ChevronDown
} from 'lucide-react';

interface MapDiscoveryViewProps {
  places: Place[];
  onSelectPlace: (place: Place) => void;
  onOpenReport: (place: Place) => void;
  highContrast: boolean;
  selectedPlaceId?: string | null;
  onPlaceAdded?: (newPlace: Place) => void;
}

type TileLayerKey = 'streets' | 'satellite' | 'terrain' | 'osm';

const TILE_LAYERS: Record<TileLayerKey, { name: string; url: string; subdomains?: string[]; attribution: string; maxZoom: number }> = {
  streets: {
    name: 'Google Streets',
    url: 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
    attribution: '&copy; Google Maps',
    maxZoom: 20,
  },
  satellite: {
    name: 'Google Satellite',
    url: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
    attribution: '&copy; Google Maps',
    maxZoom: 20,
  },
  terrain: {
    name: 'Google Terrain',
    url: 'https://mt1.google.com/vt/lyrs=p&x={x}&y={y}&z={z}',
    attribution: '&copy; Google Maps',
    maxZoom: 20,
  },
  osm: {
    name: 'OpenStreetMap',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    subdomains: ['a', 'b', 'c'],
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19,
  },
};

export const MapDiscoveryView: React.FC<MapDiscoveryViewProps> = ({
  places,
  onSelectPlace,
  onOpenReport,
  highContrast,
  selectedPlaceId,
  onPlaceAdded,
}) => {
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(places[0] || null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [requireRamp, setRequireRamp] = useState(false);
  const [requireStepFree, setRequireStepFree] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [activeLayer, setActiveLayer] = useState<TileLayerKey>('streets');
  const [showLayerMenu, setShowLayerMenu] = useState(false);
  const [isSerpModalOpen, setIsSerpModalOpen] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);

  // Leaflet map container & instance refs
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const activeTileLayerRef = useRef<L.TileLayer | null>(null);

  // Sync selectedPlaceId prop
  useEffect(() => {
    if (selectedPlaceId) {
      const found = places.find((p) => p.id === selectedPlaceId);
      if (found) {
        setSelectedPlace(found);
        if (mapInstanceRef.current && typeof found.lat === 'number' && typeof found.lng === 'number') {
          mapInstanceRef.current.flyTo([found.lat, found.lng], 16, { duration: 1 });
        }
      }
    }
  }, [selectedPlaceId, places]);

  // Filter places cleanly
  const filteredPlaces = places.filter((p) => {
    if (selectedCategory !== 'all' && p.category !== selectedCategory) return false;
    if (requireRamp && !p.features.wheelchairRamps) return false;
    if (requireStepFree && !p.features.stepFreeEntrance) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return p.name.toLowerCase().includes(q) || p.address.toLowerCase().includes(q);
    }
    return true;
  });

  // Initialize Leaflet Map once
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const initialCenter: [number, number] = [
      selectedPlace?.lat || (places[0]?.lat ?? 37.7749),
      selectedPlace?.lng || (places[0]?.lng ?? -122.4194),
    ];

    const map = L.map(mapContainerRef.current, {
      center: initialCenter,
      zoom: 14,
      zoomControl: false,
    });

    // Custom positioned zoom control at bottom-right
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Initial Real Google Streets Tile Layer
    const layerConfig = TILE_LAYERS.streets;
    const tileLayer = L.tileLayer(layerConfig.url, {
      attribution: layerConfig.attribution,
      maxZoom: layerConfig.maxZoom,
    }).addTo(map);

    activeTileLayerRef.current = tileLayer;

    // Layer for markers
    const markersLayer = L.layerGroup().addTo(map);
    markersLayerRef.current = markersLayer;

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Switch Tile Layer (Google Streets, Google Satellite, Terrain, OSM)
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    if (activeTileLayerRef.current) {
      map.removeLayer(activeTileLayerRef.current);
    }

    const config = TILE_LAYERS[activeLayer];
    const newLayer = L.tileLayer(config.url, {
      attribution: config.attribution,
      maxZoom: config.maxZoom,
      subdomains: config.subdomains || ['mt0', 'mt1', 'mt2', 'mt3'],
    }).addTo(map);

    activeTileLayerRef.current = newLayer;
  }, [activeLayer]);

  // Update Markers when filteredPlaces or selectedPlace changes
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;

    const layer = markersLayerRef.current;
    layer.clearLayers();

    const bounds = L.latLngBounds([]);

    filteredPlaces.forEach((place) => {
      if (typeof place.lat !== 'number' || typeof place.lng !== 'number') return;

      const isSelected = selectedPlace?.id === place.id;
      const isFullyAcc = place.accessibilityLevel === 'fully_accessible';
      const isBarrier = place.accessibilityLevel === 'barrier_reported';
      const pinColor = isFullyAcc ? '#2563EB' : isBarrier ? '#EA580C' : '#4F46E5';

      // Real Google Maps-style teardrop pin with accessibility score badge
      const customIcon = L.divIcon({
        className: 'real-google-map-pin',
        html: `
          <div style="
            position: relative;
            display: flex;
            flex-direction: column;
            align-items: center;
            transform: translate(-50%, -100%);
            cursor: pointer;
          ">
            <!-- Pin Header Label -->
            <div style="
              background: ${pinColor};
              color: white;
              padding: 2px 7px;
              border-radius: 999px;
              font-size: 10px;
              font-weight: 800;
              box-shadow: 0 3px 10px rgba(0,0,0,0.3);
              border: 1.5px solid white;
              white-space: nowrap;
              display: flex;
              align-items: center;
              gap: 3px;
              margin-bottom: -2px;
              z-index: 2;
              transform: ${isSelected ? 'scale(1.15)' : 'scale(1)'};
              transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
            ">
              <span>♿ ${place.accessibilityScore}%</span>
            </div>

            <!-- Teardrop Pin Body -->
            <svg width="28" height="36" viewBox="0 0 28 36" fill="none" style="filter: drop-shadow(0 3px 4px rgba(0,0,0,0.35));">
              <path d="M14 0C6.268 0 0 6.268 0 14C0 24.5 14 36 14 36C14 36 28 24.5 28 14C28 6.268 21.732 0 14 0Z" fill="${pinColor}" />
              <circle cx="14" cy="14" r="8" fill="white" />
              <circle cx="14" cy="14" r="4.5" fill="${pinColor}" />
            </svg>
          </div>
        `,
        iconSize: [32, 42],
        iconAnchor: [16, 40],
        popupAnchor: [0, -42],
      });

      const marker = L.marker([place.lat, place.lng], { icon: customIcon });

      marker.on('click', () => {
        setSelectedPlace(place);
        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([place.lat, place.lng], 16, { duration: 0.8 });
        }
      });

      // Interactive popup
      const popupHtml = `
        <div style="font-family: inherit; font-size: 12px; width: 220px; padding: 2px;">
          <h4 style="font-weight: 800; margin: 0 0 3px; font-size: 13px; color: #1E2548; line-height: 1.2;">
            ${place.name}
          </h4>
          <p style="margin: 0 0 8px; color: #64748B; font-size: 11px;">${place.address}</p>
          <div style="display: flex; gap: 4px; align-items: center; margin-bottom: 8px;">
            <span style="background: ${isFullyAcc ? '#DBEAFE' : '#FFEDD5'}; color: ${pinColor}; font-weight: 800; padding: 2px 8px; border-radius: 999px; font-size: 10px;">
              ${place.accessibilityScore}% Accessible
            </span>
            ${place.features.wheelchairRamps ? '<span style="color: #059669; font-weight: 700; font-size: 10px;">✓ Ramp</span>' : ''}
          </div>
        </div>
      `;
      marker.bindPopup(popupHtml);

      layer.addLayer(marker);
      bounds.extend([place.lat, place.lng]);
    });

    if (!selectedPlaceId && filteredPlaces.length > 1 && bounds.isValid()) {
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }, [filteredPlaces, selectedPlace]);

  // GPS Location detection
  const handleDetectLocation = () => {
    setIsLocating(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setIsLocating(false);
          const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude];
          setUserLocation(coords);

          if (mapInstanceRef.current) {
            mapInstanceRef.current.flyTo(coords, 16, { duration: 1.2 });

            if (userMarkerRef.current) {
              userMarkerRef.current.remove();
            }

            const userIcon = L.divIcon({
              className: 'user-gps-marker',
              html: `
                <div style="
                  width: 20px; 
                  height: 20px; 
                  background: #2563EB; 
                  border-radius: 50%; 
                  border: 3px solid white; 
                  box-shadow: 0 0 14px rgba(37, 99, 235, 0.8);
                  transform: translate(-50%, -50%);
                "></div>
              `,
              iconSize: [20, 20],
              iconAnchor: [10, 10],
            });

            userMarkerRef.current = L.marker(coords, { icon: userIcon })
              .bindPopup('<b>Your Current Location</b>')
              .addTo(mapInstanceRef.current);
          }
        },
        () => {
          setIsLocating(false);
          alert('Could not retrieve GPS location.');
        },
        { timeout: 7000 }
      );
    } else {
      setIsLocating(false);
      alert('Geolocation is not supported by your browser.');
    }
  };

  const handlePlaceImportedFromSerp = (newPlace: Place) => {
    if (onPlaceAdded) {
      onPlaceAdded(newPlace);
    }
    setSelectedPlace(newPlace);
    if (mapInstanceRef.current && newPlace.lat && newPlace.lng) {
      mapInstanceRef.current.flyTo([newPlace.lat, newPlace.lng], 16, { duration: 1.2 });
    }
  };

  return (
    <div className="space-y-3">
      {/* Google Maps Style Clean Container */}
      <div className={`relative rounded-3xl overflow-hidden border shadow-md transition-all ${
        highContrast ? 'bg-black border-yellow-400' : 'bg-white border-[#ADBBDA]/60'
      }`}>
        {/* Floating Top Control Bar (Just like Google Maps UI) */}
        <div className="absolute top-3.5 left-3.5 right-3.5 z-400 flex flex-wrap items-center justify-between gap-2.5 pointer-events-none">
          {/* Search Box on Top-Left */}
          <div className="flex items-center gap-2 pointer-events-auto flex-1 max-w-md">
            <div className="relative w-full shadow-lg rounded-2xl bg-white/95 backdrop-blur-md border border-slate-200">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search venue or street..."
                className="w-full pl-9 pr-8 py-2.5 rounded-2xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none bg-transparent"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-sm font-bold"
                >
                  ×
                </button>
              )}
            </div>
          </div>

          {/* Floating Actions on Top-Right */}
          <div className="flex items-center gap-2 pointer-events-auto">

            {/* Map Layer Switcher Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowLayerMenu(!showLayerMenu)}
                className="px-3 py-2.5 rounded-2xl bg-white/95 hover:bg-white text-slate-800 text-xs font-bold transition-all shadow-md flex items-center gap-1.5 border border-slate-200 min-h-[40px] cursor-pointer"
                title="Change Map Style"
              >
                <Layers className="w-3.5 h-3.5 text-[#3D52A0]" />
                <span className="capitalize">{TILE_LAYERS[activeLayer].name.split(' ')[1] || 'Streets'}</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {showLayerMenu && (
                <div className="absolute right-0 mt-1.5 w-44 rounded-2xl bg-white shadow-xl border border-slate-200 py-1.5 z-500 animate-in fade-in text-xs font-semibold">
                  {(Object.keys(TILE_LAYERS) as TileLayerKey[]).map((key) => (
                    <button
                      key={key}
                      onClick={() => {
                        setActiveLayer(key);
                        setShowLayerMenu(false);
                      }}
                      className={`w-full px-3 py-2 text-left flex items-center justify-between hover:bg-slate-50 transition-colors ${
                        activeLayer === key ? 'text-[#3D52A0] font-bold bg-[#EDE8F5]/60' : 'text-slate-700'
                      }`}
                    >
                      <span>{TILE_LAYERS[key].name}</span>
                      {activeLayer === key && <CheckCircle2 className="w-3.5 h-3.5 text-[#3D52A0]" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* GPS Location Button */}
            <button
              onClick={handleDetectLocation}
              disabled={isLocating}
              className={`p-2.5 rounded-2xl transition-all shadow-md border min-h-[40px] flex items-center justify-center cursor-pointer ${
                userLocation
                  ? 'bg-[#3D52A0] text-white border-[#3D52A0]'
                  : 'bg-white/95 hover:bg-white text-slate-700 border-slate-200'
              }`}
              title="Locate my position"
            >
              <Navigation className={`w-4 h-4 ${isLocating ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Real Leaflet Map Area */}
        <div className="relative w-full h-[540px]">
          <div ref={mapContainerRef} className="w-full h-full z-10" />

          {/* Quick Floating Venue Card at Bottom of Map */}
          {selectedPlace && (
            <div className="absolute bottom-4 left-4 right-4 sm:right-auto sm:max-w-md z-400 pointer-events-auto">
              <div className="p-3.5 rounded-2xl bg-white/95 backdrop-blur-md shadow-xl border border-slate-200 flex items-center gap-3.5">
                <img
                  src={selectedPlace.imageUrl}
                  alt={selectedPlace.name}
                  className="w-16 h-16 rounded-xl object-cover shrink-0 border border-slate-200"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-md bg-[#EDE8F5] text-[#3D52A0]">
                      {selectedPlace.category}
                    </span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                      {selectedPlace.accessibilityScore}% Access Score
                    </span>
                  </div>
                  <h4 className="font-bold text-sm text-slate-900 truncate mt-0.5">
                    {selectedPlace.name}
                  </h4>
                  <p className="text-[11px] text-slate-500 truncate flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-[#7091E6] shrink-0" />
                    <span>{selectedPlace.address}</span>
                  </p>
                </div>

                <div className="flex flex-col gap-1.5 shrink-0">
                  <button
                    onClick={() => onSelectPlace(selectedPlace)}
                    className="px-3 py-1.5 rounded-xl bg-[#3D52A0] hover:bg-[#293872] text-white text-xs font-bold transition-all shadow-xs"
                  >
                    Details
                  </button>
                  <button
                    onClick={() => onOpenReport(selectedPlace)}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-all"
                  >
                    Audit
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SerpApi Live Search Modal */}
      <SerpApiSearchModal
        isOpen={isSerpModalOpen}
        onClose={() => setIsSerpModalOpen(false)}
        onPlaceImported={handlePlaceImportedFromSerp}
        highContrast={highContrast}
      />
    </div>
  );
};
