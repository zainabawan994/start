import React, { useState, useEffect } from 'react';
import { Place } from '../types/accessibility';
import { 
  Search, 
  MapPin, 
  Plus, 
  Check, 
  Sparkles, 
  X, 
  Globe, 
  Key, 
  ExternalLink, 
  Star, 
  ShieldCheck, 
  AlertCircle,
  Loader2,
  Building2,
  CheckCircle2
} from 'lucide-react';

interface SerpApiSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPlaceImported: (newPlace: Place) => void;
  highContrast: boolean;
}

interface SerpResult {
  id: string;
  name: string;
  category: string;
  address: string;
  city: string;
  lat: number;
  lng: number;
  rating: number;
  reviewsCount: number;
  thumbnail: string;
  phone?: string;
  website?: string;
  wheelchairAccessible: boolean;
}

export const SerpApiSearchModal: React.FC<SerpApiSearchModalProps> = ({
  isOpen,
  onClose,
  onPlaceImported,
  highContrast,
}) => {
  const [query, setQuery] = useState('Wheelchair accessible venues in San Francisco');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [hasServerKey, setHasServerKey] = useState(false);
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<SerpResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [importedIds, setImportedIds] = useState<Set<string>>(new Set());
  const [importingId, setImportingId] = useState<string | null>(null);

  // Check backend SerpApi configuration on open
  useEffect(() => {
    if (isOpen) {
      checkSerpConfig();
    }
  }, [isOpen]);

  const checkSerpConfig = async () => {
    try {
      const res = await fetch('/api/serpapi/config');
      if (res.ok) {
        const data = await res.json();
        setHasServerKey(Boolean(data.hasSerpApiKey));
        if (!data.hasSerpApiKey) {
          setShowKeyInput(true);
        }
      }
    } catch {}
  };

  if (!isOpen) return null;

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch('/api/serpapi/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: query.trim(),
          apiKey: apiKeyInput.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setResults(data.data || []);
        if (data.data?.length === 0) {
          setError('No Google Maps results found for this query. Try a different city or category.');
        }
      } else {
        setError(data.error || 'Failed to search places with SerpApi.');
        if (data.requiresKey) {
          setShowKeyInput(true);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Error connecting to SerpApi search service.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImportPlace = async (item: SerpResult) => {
    setImportingId(item.id);
    try {
      const res = await fetch('/api/serpapi/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          onPlaceImported(json.data);
          setImportedIds((prev) => new Set(prev).add(item.id));
        }
      } else {
        alert('Could not import this venue.');
      }
    } catch {
      alert('Error importing venue.');
    } finally {
      setImportingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className={`w-full max-w-2xl max-h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border transition-all ${
        highContrast
          ? 'bg-black text-white border-yellow-400'
          : 'bg-white border-[#ADBBDA]/80'
      }`}>
        {/* Header */}
        <div className={`p-5 sm:p-6 border-b flex items-center justify-between gap-4 ${
          highContrast ? 'bg-black border-yellow-400' : 'bg-gradient-to-r from-[#1E2548] to-[#3D52A0] text-white'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 text-white flex items-center justify-center font-bold border border-white/20 shrink-0">
              <Globe className="w-5 h-5 text-[#EDE8F5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold tracking-tight leading-tight">
                  Google Maps Live Search (SerpApi)
                </h2>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Live API
                </span>
              </div>
              <p className="text-xs text-[#EDE8F5]/80">
                Search live real-world places from Google Maps and import them directly with coordinates into AccessMap.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Config Section */}
        <div className="p-5 sm:p-6 space-y-3.5 overflow-y-auto">
          {/* Key status indicator */}
          <div className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-[#EDE8F5] text-[#3D52A0] border border-[#ADBBDA]/60">
            <div className="flex items-center gap-2">
              <Key className="w-3.5 h-3.5 text-[#7091E6]" />
              <span>
                {hasServerKey 
                  ? 'SERPAPI_API_KEY detected in .env file' 
                  : 'SerpApi key needed for live queries'}
              </span>
            </div>
            <button
              onClick={() => setShowKeyInput(!showKeyInput)}
              className="font-bold underline text-[#1E2548] hover:text-[#3D52A0]"
            >
              {showKeyInput ? 'Hide Key Field' : 'Enter / Change Key'}
            </button>
          </div>

          {/* Optional manual key input */}
          {showKeyInput && (
            <div className="p-3 rounded-xl bg-slate-50 border border-[#ADBBDA]/60 space-y-2">
              <label className="block text-xs font-bold text-[#1E2548]">
                SerpApi Private API Key (Optional Override)
              </label>
              <input
                type="password"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder="Paste your SerpApi Key (or set in .env as SERPAPI_API_KEY)"
                className="w-full px-3 py-2 rounded-lg border border-[#ADBBDA]/70 text-xs font-mono bg-white text-[#1E2548] focus:outline-none focus:ring-2 focus:ring-[#7091E6]"
              />
              <p className="text-[11px] text-[#8697C4]">
                Get a free key at <a href="https://serpapi.com" target="_blank" rel="noreferrer" className="underline font-bold text-[#3D52A0]">serpapi.com</a>. Free accounts include 100 searches/month.
              </p>
            </div>
          )}

          {/* Search Form */}
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#8697C4] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g. Accessible universities in San Francisco, or hospitals in London"
                className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-[#ADBBDA]/70 text-xs sm:text-sm text-[#1E2548] focus:ring-2 focus:ring-[#7091E6] focus:outline-none bg-[#EDE8F5]/30 focus:bg-white"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2.5 bg-[#3D52A0] hover:bg-[#293872] disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm shrink-0 min-h-[42px]"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Globe className="w-4 h-4 text-[#EDE8F5]" />
              )}
              <span>{isLoading ? 'Searching...' : 'Search Google Maps'}</span>
            </button>
          </form>

          {/* Quick Preset Queries */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
            <span className="text-[#8697C4] font-bold mr-1 shrink-0">Presets:</span>
            {[
              'Wheelchair accessible colleges San Francisco',
              'Hospitals in New York with step free entrance',
              'Accessible public libraries',
              'Accessible dining places & ramps',
            ].map((p, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  setQuery(p);
                }}
                className="px-2.5 py-1 rounded-lg bg-[#EDE8F5] text-[#3D52A0] hover:bg-[#ADBBDA]/40 whitespace-nowrap font-medium border border-[#ADBBDA]/50"
              >
                {p.slice(0, 28)}...
              </button>
            ))}
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Results List */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between text-xs text-[#8697C4]">
              <span>Results found: <strong>{results.length}</strong></span>
              {results.length > 0 && <span>Click "+ Import" to add place with coordinates to map</span>}
            </div>

            {results.length === 0 && !isLoading && !error && (
              <div className="text-center py-8 border-2 border-dashed border-[#ADBBDA]/40 rounded-2xl p-6 text-xs text-[#8697C4]">
                <Globe className="w-8 h-8 text-[#ADBBDA] mx-auto mb-2" />
                <p className="font-bold text-[#1E2548]">Search Google Maps live via SerpApi</p>
                <p className="mt-1">Enter a search keyword above or click one of the quick presets to fetch real-world locations.</p>
              </div>
            )}

            {results.map((item) => {
              const isImported = importedIds.has(item.id);
              const isImporting = importingId === item.id;

              return (
                <div
                  key={item.id}
                  className="p-3.5 rounded-2xl border border-[#ADBBDA]/60 bg-white hover:border-[#7091E6] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    {item.thumbnail ? (
                      <img
                        src={item.thumbnail}
                        alt={item.name}
                        className="w-14 h-14 rounded-xl object-cover shrink-0 border border-[#ADBBDA]/40"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-[#EDE8F5] text-[#3D52A0] flex items-center justify-center font-bold shrink-0">
                        <Building2 className="w-6 h-6 text-[#7091E6]" />
                      </div>
                    )}

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-sm text-[#1E2548] truncate">
                          {item.name}
                        </h4>
                        <span className="px-2 py-0.5 rounded-md bg-[#EDE8F5] text-[#3D52A0] text-[10px] font-bold capitalize">
                          {item.category.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-xs text-[#8697C4] truncate mt-0.5 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-[#7091E6] shrink-0" />
                        <span>{item.address}</span>
                      </p>
                      <div className="flex items-center gap-3 text-[11px] text-[#3D52A0] mt-1">
                        <span className="flex items-center gap-1 font-bold text-amber-500">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                          <span>{item.rating} ({item.reviewsCount})</span>
                        </span>
                        <span className="font-mono text-[#8697C4]">
                          {item.lat.toFixed(4)}, {item.lng.toFixed(4)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Import Button */}
                  <div className="sm:self-center shrink-0">
                    {isImported ? (
                      <button
                        disabled
                        className="px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center gap-1.5 cursor-default"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Added to Map</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleImportPlace(item)}
                        disabled={isImporting}
                        className="px-3.5 py-1.5 rounded-xl bg-[#1E2548] hover:bg-[#3D52A0] text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs"
                      >
                        {isImporting ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Plus className="w-3.5 h-3.5 text-[#7091E6]" />
                        )}
                        <span>{isImporting ? 'Importing...' : 'Add to Map'}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#ADBBDA]/40 bg-[#EDE8F5]/40 flex items-center justify-between text-xs text-[#8697C4]">
          <span>Powered by SerpApi Google Maps Engine</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-white border border-[#ADBBDA]/60 text-[#1E2548] hover:bg-slate-50 font-bold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
