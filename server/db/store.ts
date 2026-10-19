import fs from 'fs';
import path from 'path';
import { Place, CommunityReport } from '../../src/types/accessibility';
import { INITIAL_PLACES, INITIAL_REPORTS } from '../../src/data/mockPlaces';
import { supabase, isSupabaseConfigured } from './supabaseClient';

function placeToRow(p: Place): any {
  return {
    id: p.id,
    name: p.name,
    category: p.category,
    address: p.address,
    city: p.city,
    lat: p.lat,
    lng: p.lng,
    distance_km: p.distanceKm,
    accessibility_level: p.accessibilityLevel,
    accessibility_score: p.accessibilityScore,
    summary: p.summary,
    features: p.features,
    entrances: p.entrances,
    image_url: p.imageUrl,
    image_alt: p.imageAlt,
    photos_count: p.photosCount,
    reports_count: p.reportsCount,
    last_updated: p.lastUpdated,
    verified_by_community: p.verifiedByCommunity,
    opening_hours: p.openingHours,
    phone: p.phone,
    website: p.website,
  };
}

function rowToPlace(r: any): Place {
  return {
    id: r.id,
    name: r.name,
    category: r.category,
    address: r.address,
    city: r.city,
    lat: r.lat,
    lng: r.lng,
    distanceKm: r.distance_km ?? r.distanceKm ?? 0.8,
    accessibilityLevel: r.accessibility_level ?? r.accessibilityLevel ?? 'fully_accessible',
    accessibilityScore: r.accessibility_score ?? r.accessibilityScore ?? 90,
    summary: r.summary || '',
    features: r.features || {},
    entrances: r.entrances || [],
    imageUrl: r.image_url ?? r.imageUrl ?? '',
    imageAlt: r.image_alt ?? r.imageAlt ?? '',
    photosCount: r.photos_count ?? r.photosCount ?? 1,
    reportsCount: r.reports_count ?? r.reportsCount ?? 0,
    lastUpdated: r.last_updated ?? r.lastUpdated ?? '',
    verifiedByCommunity: r.verified_by_community ?? r.verifiedByCommunity ?? true,
    openingHours: r.opening_hours ?? r.openingHours,
    phone: r.phone,
    website: r.website,
  };
}

function reportToRow(r: CommunityReport): any {
  return {
    id: r.id,
    place_id: r.placeId,
    place_name: r.placeName,
    place_category: r.placeCategory,
    author_name: r.authorName,
    author_type: r.authorType,
    feature_category: r.featureCategory,
    photo_url: r.photoUrl,
    photo_alt: r.photoAlt,
    ai_classification: r.aiClassification,
    notes: r.notes,
    date: r.date,
    upvotes: r.upvotes,
    is_verified: r.isVerified,
  };
}

function rowToReport(r: any): CommunityReport {
  return {
    id: r.id,
    placeId: r.place_id ?? r.placeId,
    placeName: r.place_name ?? r.placeName,
    placeCategory: r.place_category ?? r.placeCategory,
    authorName: r.author_name ?? r.authorName,
    authorType: r.author_type ?? r.authorType,
    featureCategory: r.feature_category ?? r.featureCategory,
    photoUrl: r.photo_url ?? r.photoUrl ?? '',
    photoAlt: r.photo_alt ?? r.photoAlt ?? '',
    aiClassification: r.ai_classification ?? r.aiClassification,
    notes: r.notes ?? '',
    date: r.date,
    upvotes: r.upvotes ?? 0,
    isVerified: r.is_verified ?? r.isVerified ?? true,
  };
}

class DataStore {
  private places: Place[];
  private reports: CommunityReport[];
  private dbFilePath: string;
  private supabaseActive: boolean = false;

  constructor() {
    this.places = [...INITIAL_PLACES];
    this.reports = [...INITIAL_REPORTS];
    this.dbFilePath = path.resolve(process.cwd(), '.data_store.json');
    this.loadFromDisk();

    // Initialize Supabase sync if credentials are configured
    if (isSupabaseConfigured()) {
      this.initSupabaseSync();
    } else {
      console.log('📦 Supabase credentials not set in .env yet. Running in local JSON-backed store with real places.');
    }
  }

  public isSupabaseConnected(): boolean {
    return this.supabaseActive;
  }

  private async initSupabaseSync() {
    if (!supabase) return;
    try {
      console.log('⚡ Connecting to Supabase database...');
      const { data: remotePlaces, error: placesErr } = await supabase.from('places').select('*');
      
      if (placesErr) {
        console.warn('⚠️ Supabase places query warning:', placesErr.message);
        return;
      }

      if (Array.isArray(remotePlaces) && remotePlaces.length > 0) {
        this.places = remotePlaces.map(rowToPlace);
        console.log(`✅ Loaded ${this.places.length} places from Supabase cloud database.`);
      } else {
        // Table is empty, seed Supabase with the real places
        console.log('🌱 Seeding Supabase with initial real places (UoH, THQ Hassan Abdal, etc.)...');
        const rows = INITIAL_PLACES.map(placeToRow);
        const { error: seedErr } = await supabase.from('places').insert(rows);
        if (seedErr) {
          console.warn('Supabase seed error:', seedErr.message);
        } else {
          console.log(`✅ Seeded ${rows.length} places into Supabase.`);
        }
      }

      // Sync Reports
      const { data: remoteReports, error: repErr } = await supabase.from('reports').select('*');
      if (!repErr && Array.isArray(remoteReports) && remoteReports.length > 0) {
        this.reports = remoteReports.map(rowToReport);
      } else if (!repErr && Array.isArray(remoteReports) && remoteReports.length === 0) {
        const repRows = INITIAL_REPORTS.map(reportToRow);
        await supabase.from('reports').insert(repRows);
      }

      this.supabaseActive = true;
      this.saveToDisk();
    } catch (e) {
      console.warn('Supabase connection attempt error:', e);
    }
  }

  private loadFromDisk() {
    try {
      if (fs.existsSync(this.dbFilePath)) {
        const raw = fs.readFileSync(this.dbFilePath, 'utf-8');
        const data = JSON.parse(raw);
        if (Array.isArray(data.places) && data.places.length > 0) {
          // If existing data has old mock places (e.g. State Central University or Metro City),
          // upgrade to the real places data
          const hasOldData = data.places.some((p: Place) => p.city === 'Metro City' || p.id === 'place-1');
          if (hasOldData) {
            console.log('🔄 Upgrading legacy mock data in .data_store.json to real places (UoH, THQ Hassan Abdal, etc.)');
            this.places = [...INITIAL_PLACES];
            this.reports = [...INITIAL_REPORTS];
            this.saveToDisk();
            return;
          }
          this.places = data.places;
        }
        if (Array.isArray(data.reports) && data.reports.length > 0) {
          this.reports = data.reports;
        }
      } else {
        this.saveToDisk();
      }
    } catch (e) {
      console.warn('Failed to read database file, using in-memory store:', e);
    }
  }

  private saveToDisk() {
    try {
      fs.writeFileSync(
        this.dbFilePath,
        JSON.stringify({ places: this.places, reports: this.reports }, null, 2),
        'utf-8'
      );
    } catch (e) {
      console.warn('Failed to write database file:', e);
    }
  }

  // Places
  public getAllPlaces(filters?: { category?: string; accessibilityLevel?: string; query?: string }): Place[] {
    let result = [...this.places];
    if (filters?.category && filters.category !== 'all') {
      result = result.filter((p) => p.category === filters.category);
    }
    if (filters?.accessibilityLevel && filters.accessibilityLevel !== 'all') {
      result = result.filter((p) => p.accessibilityLevel === filters.accessibilityLevel);
    }
    if (filters?.query) {
      const q = filters.query.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.address.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.city.toLowerCase().includes(q)
      );
    }
    return result;
  }

  public getPlaceById(id: string): Place | undefined {
    return this.places.find((p) => p.id === id);
  }

  public addPlace(placeData: Omit<Place, 'id' | 'lastUpdated' | 'photosCount' | 'reportsCount'>): Place {
    const newPlace: Place = {
      ...placeData,
      id: `place-${Date.now()}`,
      photosCount: 1,
      reportsCount: 1,
      lastUpdated: new Date().toISOString().split('T')[0],
      verifiedByCommunity: true,
    };
    this.places.unshift(newPlace);
    this.saveToDisk();

    // Async write to Supabase if configured
    if (supabase && isSupabaseConfigured()) {
      supabase.from('places').insert(placeToRow(newPlace)).then(({ error }) => {
        if (error) console.warn('Supabase addPlace error:', error.message);
      });
    }

    return newPlace;
  }

  public updatePlace(id: string, updates: Partial<Place>): Place | null {
    const index = this.places.findIndex((p) => p.id === id);
    if (index === -1) return null;

    this.places[index] = {
      ...this.places[index],
      ...updates,
      lastUpdated: new Date().toISOString().split('T')[0],
      features: {
        ...this.places[index].features,
        ...(updates.features || {}),
      },
    };
    this.saveToDisk();

    // Async update to Supabase if configured
    if (supabase && isSupabaseConfigured()) {
      supabase.from('places').update(placeToRow(this.places[index])).eq('id', id).then(({ error }) => {
        if (error) console.warn('Supabase updatePlace error:', error.message);
      });
    }

    return this.places[index];
  }

  public deletePlace(id: string): boolean {
    const initialLen = this.places.length;
    this.places = this.places.filter((p) => p.id !== id);
    this.reports = this.reports.filter((r) => r.placeId !== id);
    if (this.places.length !== initialLen) {
      this.saveToDisk();

      if (supabase && isSupabaseConfigured()) {
        supabase.from('places').delete().eq('id', id).then(({ error }) => {
          if (error) console.warn('Supabase deletePlace error:', error.message);
        });
      }

      return true;
    }
    return false;
  }

  public toggleVerifyPlace(id: string): Place | null {
    const place = this.places.find((p) => p.id === id);
    if (!place) return null;
    place.verifiedByCommunity = !place.verifiedByCommunity;
    place.lastUpdated = new Date().toISOString().split('T')[0];
    this.saveToDisk();

    if (supabase && isSupabaseConfigured()) {
      supabase.from('places').update({ verified_by_community: place.verifiedByCommunity }).eq('id', id).then(({ error }) => {
        if (error) console.warn('Supabase toggleVerify error:', error.message);
      });
    }

    return place;
  }

  // Reports
  public getAllReports(filters?: { placeId?: string; featureCategory?: string }): CommunityReport[] {
    let result = [...this.reports];
    if (filters?.placeId) {
      result = result.filter((r) => r.placeId === filters.placeId);
    }
    if (filters?.featureCategory && filters.featureCategory !== 'all') {
      result = result.filter((r) => r.featureCategory === filters.featureCategory);
    }
    return result;
  }

  public addReport(reportData: Omit<CommunityReport, 'id' | 'date' | 'upvotes' | 'isVerified'>): CommunityReport {
    const newReport: CommunityReport = {
      ...reportData,
      id: `rep-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      upvotes: 0,
      isVerified: true,
    };
    this.reports.unshift(newReport);

    // Update place's reports count
    const place = this.places.find((p) => p.id === reportData.placeId);
    if (place) {
      place.reportsCount = (place.reportsCount || 0) + 1;
      place.photosCount = (place.photosCount || 0) + 1;
      place.lastUpdated = newReport.date;
    }

    this.saveToDisk();

    if (supabase && isSupabaseConfigured()) {
      supabase.from('reports').insert(reportToRow(newReport)).then(({ error }) => {
        if (error) console.warn('Supabase addReport error:', error.message);
      });
    }

    return newReport;
  }

  public upvoteReport(id: string): CommunityReport | null {
    const report = this.reports.find((r) => r.id === id);
    if (!report) return null;
    report.upvotes = (report.upvotes || 0) + 1;
    this.saveToDisk();

    if (supabase && isSupabaseConfigured()) {
      supabase.from('reports').update({ upvotes: report.upvotes }).eq('id', id).then(({ error }) => {
        if (error) console.warn('Supabase upvoteReport error:', error.message);
      });
    }

    return report;
  }

  public updateReport(id: string, updates: Partial<CommunityReport>): CommunityReport | null {
    const index = this.reports.findIndex((r) => r.id === id);
    if (index === -1) return null;

    this.reports[index] = {
      ...this.reports[index],
      ...updates,
    };
    this.saveToDisk();

    if (supabase && isSupabaseConfigured()) {
      supabase.from('reports').update(reportToRow(this.reports[index])).eq('id', id).then(({ error }) => {
        if (error) console.warn('Supabase updateReport error:', error.message);
      });
    }

    return this.reports[index];
  }

  public deleteReport(id: string): boolean {
    const initialLen = this.reports.length;
    this.reports = this.reports.filter((r) => r.id !== id);
    if (this.reports.length !== initialLen) {
      this.saveToDisk();

      if (supabase && isSupabaseConfigured()) {
        supabase.from('reports').delete().eq('id', id).then(({ error }) => {
          if (error) console.warn('Supabase deleteReport error:', error.message);
        });
      }
      return true;
    }
    return false;
  }

  public toggleVerifyReport(id: string): CommunityReport | null {
    const report = this.reports.find((r) => r.id === id);
    if (!report) return null;
    report.isVerified = !report.isVerified;
    this.saveToDisk();

    if (supabase && isSupabaseConfigured()) {
      supabase.from('reports').update({ is_verified: report.isVerified }).eq('id', id).then(({ error }) => {
        if (error) console.warn('Supabase toggleVerifyReport error:', error.message);
      });
    }

    return report;
  }

  public resetToDefaults(): void {
    this.places = [...INITIAL_PLACES];
    this.reports = [...INITIAL_REPORTS];
    this.saveToDisk();
  }

  // Statistics for Dashboard & Admin
  public getStats() {
    const totalPlaces = this.places.length;
    const fullyAccessible = this.places.filter((p) => p.accessibilityLevel === 'fully_accessible').length;
    const partiallyAccessible = this.places.filter((p) => p.accessibilityLevel === 'partially_accessible').length;
    const barrierReported = this.places.filter((p) => p.accessibilityLevel === 'barrier_reported').length;
    const totalReports = this.reports.length;
    const totalAudits = this.places.reduce((acc, p) => acc + (p.reportsCount || 0), 0);

    const avgScore = totalPlaces > 0
      ? Math.round(this.places.reduce((acc, p) => acc + p.accessibilityScore, 0) / totalPlaces)
      : 0;

    return {
      totalPlaces,
      fullyAccessible,
      partiallyAccessible,
      barrierReported,
      totalReports,
      totalAudits,
      averageScore: avgScore,
      supabaseConnected: this.supabaseActive,
    };
  }
}

export const dbStore = new DataStore();
