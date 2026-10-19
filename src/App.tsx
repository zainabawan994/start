import React, { useState, useEffect } from 'react';
import { Place, CommunityReport } from './types/accessibility';
import { INITIAL_PLACES, INITIAL_REPORTS } from './data/mockPlaces';
import { Header, NavigationTab } from './components/Header';
import { MobileNav } from './components/MobileNav';
import { PlaceCard } from './components/PlaceCard';
import { PlaceDetailModal } from './components/PlaceDetailModal';
import { AiClassifierModal } from './components/AiClassifierModal';
import { AiScannerView } from './components/AiScannerView';
import { MapDiscoveryView } from './components/MapDiscoveryView';
import { CommunityFeed } from './components/CommunityFeed';
import { AddPlaceModal } from './components/AddPlaceModal';
import { MLModelStudio } from './components/MLModelStudio';
import { AdminPortal } from './components/AdminPortal';
import { 
  Search, 
  Camera, 
  AlertTriangle, 
  CheckCircle2,
  LayoutGrid,
  GraduationCap,
  Stethoscope,
  Trees,
  Landmark,
  TrainFront,
  UtensilsCrossed,
  DoorOpen,
  ArrowUpDown,
  Bath,
  Volume2,
  VolumeX,
  Sparkles,
  Accessibility
} from 'lucide-react';

export default function App() {
  // Persistence state
  const [places, setPlaces] = useState<Place[]>(() => {
    try {
      const saved = localStorage.getItem('accessibility_mapper_places');
      return saved ? JSON.parse(saved) : INITIAL_PLACES;
    } catch {
      return INITIAL_PLACES;
    }
  });

  const [reports, setReports] = useState<CommunityReport[]>(() => {
    try {
      const saved = localStorage.getItem('accessibility_mapper_reports');
      return saved ? JSON.parse(saved) : INITIAL_REPORTS;
    } catch {
      return INITIAL_REPORTS;
    }
  });

  const [highContrast, setHighContrast] = useState<boolean>(() => {
    return localStorage.getItem('accessibility_mapper_high_contrast') === 'true';
  });

  // URL-based routing (e.g. / for main app, /admin for dedicated Admin Portal)
  const [currentPath, setCurrentPath] = useState<string>(() => {
    return typeof window !== 'undefined' ? window.location.pathname || '/' : '/';
  });

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname || '/');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = (path: string) => {
    if (typeof window !== 'undefined' && window.location.pathname !== path) {
      window.history.pushState({}, '', path);
    }
    setCurrentPath(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const isAdminRoute = currentPath.startsWith('/admin');

  // Navigation and filter states
  const [activeTab, setActiveTab] = useState<NavigationTab>('discover');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedFeature, setSelectedFeature] = useState<'all' | 'ramps' | 'stepFree' | 'elevators' | 'restrooms'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [displayLimit, setDisplayLimit] = useState<number>(6);

  // Modals
  const [selectedPlaceForDetail, setSelectedPlaceForDetail] = useState<Place | null>(null);
  const [selectedMapPlaceId, setSelectedMapPlaceId] = useState<string | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannerTargetPlace, setScannerTargetPlace] = useState<Place | null>(null);
  const [isAddPlaceOpen, setIsAddPlaceOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Load from backend on mount
  useEffect(() => {
    fetchBackendData();
  }, []);

  const fetchBackendData = async () => {
    try {
      const [placesRes, reportsRes] = await Promise.all([
        fetch('/api/places'),
        fetch('/api/reports'),
      ]);

      if (placesRes.ok) {
        const placesJson = await placesRes.json();
        if (Array.isArray(placesJson.data) && placesJson.data.length > 0) {
          setPlaces(placesJson.data);
        }
      }

      if (reportsRes.ok) {
        const reportsJson = await reportsRes.json();
        if (Array.isArray(reportsJson.data) && reportsJson.data.length > 0) {
          setReports(reportsJson.data);
        }
      }
    } catch (e) {
      console.warn('Backend sync fallback to local storage:', e);
    }
  };

  // Sync storage
  useEffect(() => {
    try {
      localStorage.setItem('accessibility_mapper_places', JSON.stringify(places));
    } catch (e) {
      console.warn('Storage sync error:', e);
    }
  }, [places]);

  useEffect(() => {
    try {
      localStorage.setItem('accessibility_mapper_reports', JSON.stringify(reports));
    } catch (e) {
      console.warn('Storage sync error:', e);
    }
  }, [reports]);

  useEffect(() => {
    localStorage.setItem('accessibility_mapper_high_contrast', String(highContrast));
  }, [highContrast]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  const handleOpenScannerForPlace = (place?: Place) => {
    setScannerTargetPlace(place || null);
    setIsScannerOpen(true);
  };

  const handleReportCreated = async (newReport: CommunityReport) => {
    setReports((prev) => [newReport, ...prev]);

    setPlaces((prev) =>
      prev.map((p) => {
        if (p.id === newReport.placeId) {
          const isBarrier = newReport.featureCategory === 'stairs_barrier';
          return {
            ...p,
            reportsCount: p.reportsCount + 1,
            photosCount: p.photosCount + 1,
            accessibilityLevel: isBarrier ? 'barrier_reported' : p.accessibilityLevel,
            accessibilityScore: isBarrier
              ? Math.max(30, p.accessibilityScore - 12)
              : Math.min(100, p.accessibilityScore + 2),
            lastUpdated: newReport.date,
          };
        }
        return p;
      })
    );

    showToast(`Audit saved for ${newReport.placeName}!`);

    try {
      await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newReport),
      });
    } catch (e) {
      console.warn('Backend report sync error:', e);
    }
  };

  const handlePlaceAdded = async (newPlace: Place) => {
    setPlaces((prev) => [newPlace, ...prev]);
    showToast(`Added ${newPlace.name}!`);

    try {
      await fetch('/api/places', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPlace),
      });
    } catch (e) {
      console.warn('Backend place sync error:', e);
    }
  };

  const handleUpvoteReport = async (reportId: string) => {
    setReports((prev) =>
      prev.map((r) => (r.id === reportId ? { ...r, upvotes: r.upvotes + 1 } : r))
    );
    showToast('Upvote recorded!');

    try {
      await fetch(`/api/reports/${reportId}/upvote`, { method: 'POST' });
    } catch (e) {
      console.warn('Backend upvote sync error:', e);
    }
  };

  const handleSelectPlaceById = (placeId: string) => {
    const found = places.find((p) => p.id === placeId);
    if (found) {
      setSelectedPlaceForDetail(found);
    }
  };

  const handleViewOnMap = (place: Place) => {
    setSelectedMapPlaceId(place.id);
    setActiveTab('map');
    setSelectedPlaceForDetail(null);
  };

  // Voice overview for people with visual or reading challenges
  const handleVoiceOverview = () => {
    if (!('speechSynthesis' in window)) return;

    if (isVoiceActive) {
      window.speechSynthesis.cancel();
      setIsVoiceActive(false);
      return;
    }

    window.speechSynthesis.cancel();
    const accessibleCount = places.filter(p => p.accessibilityLevel === 'fully_accessible').length;
    const text = `Welcome to AccessMap. Found ${places.length} places. ${accessibleCount} are fully accessible with step-free entrances and ramps. Use the quick buttons below to find ramps, step-free doors, or elevators.`;
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.onend = () => setIsVoiceActive(false);
    utterance.onerror = () => setIsVoiceActive(false);

    setIsVoiceActive(true);
    window.speechSynthesis.speak(utterance);
  };

  // Filtered places
  const filteredPlaces = places.filter((p) => {
    if (selectedCategory !== 'all' && p.category !== selectedCategory) return false;
    if (selectedStatus !== 'all' && p.accessibilityLevel !== selectedStatus) return false;
    
    // Quick feature filter
    if (selectedFeature === 'ramps' && !p.features.wheelchairRamps) return false;
    if (selectedFeature === 'stepFree' && !p.features.stepFreeEntrance) return false;
    if (selectedFeature === 'elevators' && !p.features.elevators) return false;
    if (selectedFeature === 'restrooms' && !p.features.accessibleRestrooms) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = p.name.toLowerCase().includes(q);
      const matchAddress = p.address.toLowerCase().includes(q);
      const matchCategory = p.category.toLowerCase().includes(q);
      return matchName || matchAddress || matchCategory;
    }
    return true;
  });

  // Curated visible places for clean, uncluttered home experience
  const visiblePlaces = searchQuery || selectedCategory !== 'all' || selectedStatus !== 'all' || selectedFeature !== 'all'
    ? filteredPlaces
    : filteredPlaces.slice(0, displayLimit);

  // Feature counts for decorated cards
  const rampCount = places.filter(p => p.features.wheelchairRamps).length;
  const stepFreeCount = places.filter(p => p.features.stepFreeEntrance).length;
  const elevatorCount = places.filter(p => p.features.elevators).length;
  const restroomCount = places.filter(p => p.features.accessibleRestrooms).length;

  // Dedicated Isolated Admin Portal Route (/admin)
  if (isAdminRoute) {
    return (
      <>
        <AdminPortal
          places={places}
          reports={reports}
          onPlacesUpdated={(updated) => setPlaces(updated)}
          onReportsUpdated={(updated) => setReports(updated)}
          onOpenAddPlace={() => setIsAddPlaceOpen(true)}
          onExitToPublic={() => navigateTo('/')}
          highContrast={highContrast}
          onToggleContrast={() => setHighContrast(!highContrast)}
        />

        {/* Add Place Modal for Admin use */}
        <AddPlaceModal
          isOpen={isAddPlaceOpen}
          onClose={() => setIsAddPlaceOpen(false)}
          onPlaceAdded={handlePlaceAdded}
          highContrast={highContrast}
        />
      </>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col transition-colors ${
      highContrast ? 'bg-black text-white' : 'bg-[#EDE8F5] text-[#1E2548]'
    }`}>
      {/* Top Header */}
      <Header
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab)}
        onOpenScanner={() => handleOpenScannerForPlace()}
        onOpenAddPlace={() => setIsAddPlaceOpen(true)}
        highContrast={highContrast}
        onToggleContrast={() => setHighContrast(!highContrast)}
      />

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-5 pb-24 md:pb-10">
        {/* Toast Notification */}
        {toastMessage && (
          <div className="fixed bottom-20 md:bottom-6 right-6 z-50 bg-[#1E2548] text-white text-xs px-4 py-2.5 rounded-xl shadow-xl border border-[#7091E6]/40 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#7091E6]" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Tab 1: Explore / Home View */}
        {activeTab === 'discover' && (
          <div className="space-y-5">

            {/* Premium Hero Banner */}
            <div className={`relative overflow-hidden rounded-3xl shadow-lg border transition-all ${
              highContrast 
                ? 'bg-black border-yellow-400 text-white' 
                : 'bg-gradient-to-br from-[#1E2548] via-[#2d3a70] to-[#3D52A0] text-white border-white/10'
            }`}>
              {/* Subtle decorative orbs */}
              {!highContrast && (
                <>
                  <div className="absolute top-0 right-0 w-64 h-64 bg-[#7091E6]/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none" />
                  <div className="absolute bottom-0 left-16 w-48 h-48 bg-[#ADBBDA]/10 rounded-full blur-2xl translate-y-1/2 pointer-events-none" />
                </>
              )}
              <div className="relative z-10 p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                <div className="space-y-2.5 max-w-lg">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-[#EDE8F5] text-[11px] font-bold border border-white/15">
                    <Sparkles className="w-3.5 h-3.5 text-[#ADBBDA]" />
                    <span>AI-Powered Accessibility Platform</span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white leading-tight">
                    Find Accessible Places,{' '}
                    <span className="text-[#ADBBDA]">
                      Near You
                    </span>
                  </h1>
                  <p className="text-sm text-white/70 leading-relaxed">
                    Discover step-free entrances, ramps & verified amenities — all in one place.
                  </p>
                  {/* Key Stats Row */}
                  <div className="flex items-center gap-4 pt-1">
                    <div className="text-center">
                      <div className="text-xl font-black text-white">{places.filter(p => p.accessibilityLevel === 'fully_accessible').length}</div>
                      <div className="text-[10px] text-white/50 font-semibold uppercase tracking-wide">Fully Accessible</div>
                    </div>
                    <div className="w-px h-8 bg-white/20" />
                    <div className="text-center">
                      <div className="text-xl font-black text-white">{rampCount}</div>
                      <div className="text-[10px] text-white/50 font-semibold uppercase tracking-wide">With Ramps</div>
                    </div>
                    <div className="w-px h-8 bg-white/20" />
                    <div className="text-center">
                      <div className="text-xl font-black text-white">{places.length}</div>
                      <div className="text-[10px] text-white/50 font-semibold uppercase tracking-wide">Total Venues</div>
                    </div>
                  </div>
                </div>

                {/* Hero CTA Buttons */}
                <div className="flex sm:flex-col items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleOpenScannerForPlace()}
                    className="px-4 py-2.5 rounded-2xl bg-white hover:bg-slate-100 text-[#1E2548] text-xs font-bold transition-all flex items-center gap-2 shadow-md min-h-[42px] cursor-pointer w-full sm:w-auto justify-center"
                  >
                    <Camera className="w-4 h-4 text-[#3D52A0]" />
                    <span>Scan Entrance</span>
                  </button>
                  <button
                    onClick={handleVoiceOverview}
                    title="Audio Overview"
                    className="px-4 py-2.5 rounded-2xl bg-white/15 hover:bg-white/25 backdrop-blur-md text-white text-xs font-bold transition-all flex items-center gap-2 border border-white/20 min-h-[42px] cursor-pointer w-full sm:w-auto justify-center"
                  >
                    {isVoiceActive ? (
                      <VolumeX className="w-4 h-4 text-amber-300 animate-pulse" />
                    ) : (
                      <Volume2 className="w-4 h-4 text-[#EDE8F5]" />
                    )}
                    <span>{isVoiceActive ? 'Stop' : 'Voice Guide'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Feature Filter Pills */}
            <div className={`flex items-center gap-2 overflow-x-auto pb-0.5`}>
              {[
                { id: 'all' as const, label: 'All Features', icon: LayoutGrid },
                { id: 'ramps' as const, label: '♿ Ramps', icon: ArrowUpDown },
                { id: 'stepFree' as const, label: '🚪 Step-Free', icon: DoorOpen },
                { id: 'elevators' as const, label: '🔼 Elevators', icon: ArrowUpDown },
                { id: 'restrooms' as const, label: '🚻 Restrooms', icon: Bath },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setSelectedFeature(f.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border cursor-pointer min-h-[36px] ${
                    selectedFeature === f.id
                      ? 'bg-[#3D52A0] text-white border-[#3D52A0] shadow-sm'
                      : highContrast
                        ? 'bg-black text-yellow-400 border-yellow-400'
                        : 'bg-white text-[#3D52A0] border-[#ADBBDA]/60 hover:bg-[#EDE8F5]'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Search & Category Bar */}
            <div className={`p-4 rounded-2xl border space-y-3 shadow-xs transition-all ${
              highContrast ? 'bg-black text-white border-yellow-400' : 'bg-white border-[#ADBBDA]/60'
            }`}>
              <div className="relative">
                <Search className="w-4 h-4 text-[#8697C4] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name, address or city..."
                  className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-[#ADBBDA]/70 text-sm focus:ring-2 focus:ring-[#7091E6] focus:border-[#7091E6] focus:outline-none bg-[#EDE8F5]/30 focus:bg-white text-[#1E2548] transition-all min-h-[42px]"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8697C4] hover:text-[#1E2548] text-sm font-bold p-1"
                  >
                    ×
                  </button>
                )}
              </div>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
                {[
                  { id: 'all', label: 'All', icon: LayoutGrid },
                  { id: 'university', label: 'University', icon: GraduationCap },
                  { id: 'hospital', label: 'Hospital', icon: Stethoscope },
                  { id: 'park', label: 'Park', icon: Trees },
                  { id: 'restaurant', label: 'Dining', icon: UtensilsCrossed },
                  { id: 'transit', label: 'Transit', icon: TrainFront },
                  { id: 'public_building', label: 'Civic', icon: Landmark },
                ].map((cat) => {
                  const Icon = cat.icon;
                  const isSelected = selectedCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap min-h-[34px] flex items-center gap-1.5 border cursor-pointer ${
                        isSelected
                          ? 'bg-[#3D52A0] text-white border-[#3D52A0]'
                          : 'bg-[#EDE8F5]/70 text-[#3D52A0] border-[#ADBBDA]/40 hover:bg-[#EDE8F5]'
                      }`}
                    >
                      <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-[#7091E6]'}`} />
                      <span>{cat.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Section Header */}
            <div className="flex items-center justify-between">
              <h2 className={`text-base font-bold ${ highContrast ? 'text-yellow-400' : 'text-[#1E2548]'}`}>
                {searchQuery || selectedCategory !== 'all' || selectedFeature !== 'all' ? 'Search Results' : 'Featured Venues'}
              </h2>
              <span className={`text-xs font-medium px-2.5 py-1 rounded-lg border ${
                highContrast ? 'text-yellow-400 border-yellow-400' : 'text-[#8697C4] bg-white border-[#ADBBDA]/60'
              }`}>
                {visiblePlaces.length} / {filteredPlaces.length}
              </span>
            </div>

            {/* Places Grid */}
            {filteredPlaces.length === 0 ? (
              <div className="text-center py-14 px-4 bg-white rounded-2xl border border-[#ADBBDA]/60 shadow-xs">
                <AlertTriangle className="w-8 h-8 text-[#8697C4] mx-auto mb-3" />
                <h3 className="text-base font-bold text-[#1E2548] mb-1">No places found</h3>
                <p className="text-xs text-[#8697C4] mb-4">Try clearing your filters or search term.</p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('all');
                    setSelectedStatus('all');
                    setSelectedFeature('all');
                  }}
                  className="px-5 py-2 rounded-xl bg-[#3D52A0] hover:bg-[#293872] text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {visiblePlaces.map((place) => (
                    <PlaceCard
                      key={place.id}
                      place={place}
                      onSelect={(p) => setSelectedPlaceForDetail(p)}
                      onViewOnMap={(p) => handleViewOnMap(p)}
                      highContrast={highContrast}
                    />
                  ))}
                </div>
                {!searchQuery && selectedCategory === 'all' && selectedFeature === 'all' && filteredPlaces.length > 6 && (
                  <div className="text-center pt-2">
                    {displayLimit < filteredPlaces.length ? (
                      <button
                        onClick={() => setDisplayLimit(filteredPlaces.length)}
                        className="px-6 py-2.5 rounded-2xl bg-white hover:bg-[#EDE8F5] text-[#3D52A0] font-bold text-xs border border-[#ADBBDA]/80 shadow-xs transition-all cursor-pointer"
                      >
                        View All {filteredPlaces.length} Places →
                      </button>
                    ) : (
                      <button
                        onClick={() => setDisplayLimit(6)}
                        className="px-6 py-2.5 rounded-2xl bg-white hover:bg-[#EDE8F5] text-slate-500 font-bold text-xs border border-[#ADBBDA]/80 shadow-xs transition-all cursor-pointer"
                      >
                        Show Less
                      </button>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Tab 2: Map View */}
        {activeTab === 'map' && (
          <MapDiscoveryView
            places={places}
            onSelectPlace={(p) => setSelectedPlaceForDetail(p)}
            onOpenReport={(p) => handleOpenScannerForPlace(p)}
            selectedPlaceId={selectedMapPlaceId}
            highContrast={highContrast}
            onPlaceAdded={handlePlaceAdded}
          />
        )}

        {/* Tab 3: Dedicated AI Scanner View */}
        {activeTab === 'scanner' && (
          <AiScannerView
            places={places}
            onReportCreated={handleReportCreated}
            highContrast={highContrast}
          />
        )}

        {/* Tab 4: Reports View */}
        {activeTab === 'community' && (
          <CommunityFeed
            reports={reports}
            places={places}
            onOpenScanner={() => handleOpenScannerForPlace()}
            onUpvoteReport={handleUpvoteReport}
            onSelectPlaceById={handleSelectPlaceById}
            onAddNewReport={handleReportCreated}
            highContrast={highContrast}
          />
        )}

        {/* Tab 5: ML Model Studio & Pipeline */}
        {activeTab === 'ml-studio' && (
          <MLModelStudio highContrast={highContrast} />
        )}
      </main>

      {/* Public Client Footer */}
      <footer className={`mt-12 py-6 border-t transition-colors ${
        highContrast ? 'bg-black text-white border-yellow-400' : 'bg-white/80 border-[#ADBBDA]/50 text-[#1E2548]'
      }`}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#3D52A0] text-[#EDE8F5] flex items-center justify-center font-bold shadow-xs shrink-0">
              <Accessibility className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-[#1E2548] block leading-tight">AccessMap</span>
              <span className="text-[11px] text-[#8697C4]">Accessibility Guide & Computer Vision Scanner</span>
            </div>
          </div>
          <div className="flex items-center gap-4 flex-wrap justify-center text-[#8697C4] font-medium">
            <button onClick={() => { setActiveTab('discover'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="hover:text-[#3D52A0] transition-colors">Places</button>
            <button onClick={() => { setActiveTab('map'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="hover:text-[#3D52A0] transition-colors">Map</button>
            <button onClick={() => { setActiveTab('scanner'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="hover:text-[#3D52A0] transition-colors">Scanner</button>
            <button onClick={() => { setActiveTab('ml-studio'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="hover:text-[#3D52A0] transition-colors">ML Studio</button>
            <button onClick={() => { setActiveTab('community'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="hover:text-[#3D52A0] transition-colors">Reports</button>
          </div>
        </div>
      </footer>

      {/* Place Detail Inspection Modal */}
      <PlaceDetailModal
        place={selectedPlaceForDetail}
        reports={reports}
        onClose={() => setSelectedPlaceForDetail(null)}
        onOpenReportForPlace={(p) => handleOpenScannerForPlace(p)}
        onViewOnMap={(p) => handleViewOnMap(p)}
        highContrast={highContrast}
      />

      {/* AI Classifier Quick Modal (when opened from a Place Card) */}
      <AiClassifierModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        places={places}
        initialPlace={scannerTargetPlace}
        onReportCreated={handleReportCreated}
        highContrast={highContrast}
      />

      {/* Add New Public Place Modal */}
      <AddPlaceModal
        isOpen={isAddPlaceOpen}
        onClose={() => setIsAddPlaceOpen(false)}
        onPlaceAdded={handlePlaceAdded}
        highContrast={highContrast}
      />

      {/* Fixed Mobile Bottom Navigation Tab Bar */}
      <MobileNav
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab)}
        highContrast={highContrast}
      />
    </div>
  );
}
