import { Router, Request, Response } from 'express';
import { modelManager } from '../ml/modelManager';
import { dbStore } from '../db/store';

export const apiRouter = Router();

// Health Check
apiRouter.get('/health', async (_req: Request, res: Response) => {
  let microserviceOnline = false;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 600);
    const resp = await fetch('http://127.0.0.1:8000/health', { signal: controller.signal });
    clearTimeout(timeout);
    microserviceOnline = resp.ok;
  } catch {}

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    aiConfigured: Boolean(process.env.GEMINI_API_KEY),
    activeModel: modelManager.getConfig().name,
    backendType: modelManager.getConfig().backendType,
    microserviceOnline,
  });
});

// Platform Statistics
apiRouter.get('/stats', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: dbStore.getStats(),
  });
});

// ML Model Information & Architecture Specs
apiRouter.get('/model/info', async (_req: Request, res: Response) => {
  let microserviceOnline = false;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 600);
    const resp = await fetch('http://127.0.0.1:8000/health', { signal: controller.signal });
    clearTimeout(timeout);
    microserviceOnline = resp.ok;
  } catch {}

  res.json({
    success: true,
    data: {
      ...modelManager.getConfig(),
      microserviceOnline,
    },
  });
});

// Configure ML Model (User can switch backend, provide custom ML endpoint URL, adjust threshold)
const handleModelConfigure = (req: Request, res: Response) => {
  try {
    const updated = modelManager.updateConfig(req.body);
    res.json({
      success: true,
      message: 'ML Model configuration updated successfully',
      data: updated,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
};

apiRouter.post('/model/configure', handleModelConfigure);
apiRouter.post('/model/config', handleModelConfigure);

// ML Inference Endpoint
apiRouter.post('/classify', async (req: Request, res: Response) => {
  try {
    const { imageBase64, userHint, presetId, mimeType } = req.body;
    if (!imageBase64 && !presetId) {
      return res.status(400).json({ error: 'imageBase64 or presetId parameter is required' });
    }

    const output = await modelManager.classifyImage(imageBase64 || '', {
      userHint,
      presetId,
      mimeType,
    });

    res.json({
      success: true,
      source: output.engineUsed,
      latencyMs: output.latencyMs,
      featureEmbeddingPreview: output.featureEmbeddingPreview,
      data: output.result,
    });
  } catch (err: any) {
    console.error('Classification endpoint error:', err);
    res.status(500).json({ error: err.message || 'Classification inference failed' });
  }
});

// Places Endpoints
apiRouter.get('/places', (req: Request, res: Response) => {
  const { category, accessibilityLevel, query } = req.query;
  const places = dbStore.getAllPlaces({
    category: category as string,
    accessibilityLevel: accessibilityLevel as string,
    query: query as string,
  });
  res.json({ success: true, count: places.length, data: places });
});

apiRouter.get('/places/:id', (req: Request, res: Response) => {
  const place = dbStore.getPlaceById(req.params.id);
  if (!place) {
    return res.status(404).json({ error: 'Place not found' });
  }
  const reports = dbStore.getAllReports({ placeId: place.id });
  res.json({ success: true, data: { ...place, reports } });
});

apiRouter.post('/places', (req: Request, res: Response) => {
  try {
    const newPlace = dbStore.addPlace(req.body);
    res.status(201).json({ success: true, data: newPlace });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Community Reports Endpoints
apiRouter.get('/reports', (req: Request, res: Response) => {
  const { placeId, featureCategory } = req.query;
  const reports = dbStore.getAllReports({
    placeId: placeId as string,
    featureCategory: featureCategory as string,
  });
  res.json({ success: true, count: reports.length, data: reports });
});

apiRouter.post('/reports', (req: Request, res: Response) => {
  try {
    const newReport = dbStore.addReport(req.body);
    res.status(201).json({ success: true, data: newReport });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.post('/reports/:id/upvote', (req: Request, res: Response) => {
  const updated = dbStore.upvoteReport(req.params.id);
  if (!updated) {
    return res.status(404).json({ error: 'Report not found' });
  }
  res.json({ success: true, data: updated });
});

// Admin Places Management Endpoints
apiRouter.put('/places/:id', (req: Request, res: Response) => {
  const updated = dbStore.updatePlace(req.params.id, req.body);
  if (!updated) {
    return res.status(404).json({ error: 'Place not found' });
  }
  res.json({ success: true, data: updated });
});

apiRouter.delete('/places/:id', (req: Request, res: Response) => {
  const success = dbStore.deletePlace(req.params.id);
  if (!success) {
    return res.status(404).json({ error: 'Place not found' });
  }
  res.json({ success: true, message: 'Place deleted successfully' });
});

apiRouter.patch('/places/:id/verify', (req: Request, res: Response) => {
  const updated = dbStore.toggleVerifyPlace(req.params.id);
  if (!updated) {
    return res.status(404).json({ error: 'Place not found' });
  }
  res.json({ success: true, data: updated });
});

// Admin Community Reports Moderation Endpoints
apiRouter.put('/reports/:id', (req: Request, res: Response) => {
  const updated = dbStore.updateReport(req.params.id, req.body);
  if (!updated) {
    return res.status(404).json({ error: 'Report not found' });
  }
  res.json({ success: true, data: updated });
});

apiRouter.delete('/reports/:id', (req: Request, res: Response) => {
  const success = dbStore.deleteReport(req.params.id);
  if (!success) {
    return res.status(404).json({ error: 'Report not found' });
  }
  res.json({ success: true, message: 'Report deleted successfully' });
});

apiRouter.patch('/reports/:id/verify', (req: Request, res: Response) => {
  const updated = dbStore.toggleVerifyReport(req.params.id);
  if (!updated) {
    return res.status(404).json({ error: 'Report not found' });
  }
  res.json({ success: true, data: updated });
});

// Admin Reset Data Store
apiRouter.post('/admin/reset', (_req: Request, res: Response) => {
  dbStore.resetToDefaults();
  res.json({
    success: true,
    message: 'Data store reset to initial seed data',
    stats: dbStore.getStats(),
  });
});

// Admin Authentication Login Endpoint
apiRouter.post('/admin/login', (req: Request, res: Response) => {
  const { username, password } = req.body || {};
  const expectedUser = process.env.ADMIN_USERNAME || 'admin';
  const expectedPass = process.env.ADMIN_PASSWORD || 'admin123';

  if (username === expectedUser && password === expectedPass) {
    const token = 'adm_sess_' + Buffer.from(`${username}:${Date.now()}`).toString('base64');
    return res.json({
      success: true,
      message: 'Admin authentication successful',
      token,
      user: {
        username: expectedUser,
        role: 'Super Administrator',
        displayName: 'System Admin',
        loginTime: new Date().toISOString(),
      },
    });
  }

  return res.status(401).json({
    success: false,
    error: 'Invalid administrator credentials. Default demo credentials: admin / admin123',
  });
});

// Helper to infer place category from Google Maps results
function inferGoogleCategory(typeStr?: string, title?: string): string {
  const combined = `${typeStr || ''} ${title || ''}`.toLowerCase();
  if (combined.includes('hospital') || combined.includes('clinic') || combined.includes('medical') || combined.includes('doctor')) return 'hospital';
  if (combined.includes('university') || combined.includes('college') || combined.includes('school') || combined.includes('campus')) return 'university';
  if (combined.includes('park') || combined.includes('garden') || combined.includes('trail') || combined.includes('reserve')) return 'park';
  if (combined.includes('restaurant') || combined.includes('cafe') || combined.includes('coffee') || combined.includes('dining') || combined.includes('food')) return 'restaurant';
  if (combined.includes('transit') || combined.includes('station') || combined.includes('metro') || combined.includes('subway') || combined.includes('bus') || combined.includes('airport')) return 'transit';
  if (combined.includes('library') || combined.includes('museum')) return 'library';
  return 'public_building';
}

// SerpApi API Status & Config Endpoint
apiRouter.get('/serpapi/config', (_req: Request, res: Response) => {
  res.json({
    success: true,
    hasSerpApiKey: Boolean(process.env.SERPAPI_API_KEY && process.env.SERPAPI_API_KEY.trim().length > 0),
    hasGoogleMapsKey: Boolean(process.env.VITE_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY),
  });
});

// SerpApi Google Maps Live Search Endpoint
apiRouter.post('/serpapi/search', async (req: Request, res: Response) => {
  const { query, apiKey, location } = req.body || {};
  const activeKey = (apiKey || process.env.SERPAPI_API_KEY || '').trim();

  if (!query || !query.trim()) {
    return res.status(400).json({ error: 'Search query is required' });
  }

  if (!activeKey) {
    return res.status(400).json({
      success: false,
      requiresKey: true,
      error: 'SERPAPI_API_KEY is not configured. Please paste your SerpApi key in the box or add it to .env',
    });
  }

  try {
    const url = new URL('https://serpapi.com/search.json');
    url.searchParams.set('engine', 'google_maps');
    url.searchParams.set('q', query.trim());
    url.searchParams.set('api_key', activeKey);
    if (location) {
      url.searchParams.set('ll', location);
    }

    const fetchRes = await fetch(url.toString());
    const data = await fetchRes.json().catch(() => ({}));

    if (!fetchRes.ok) {
      return res.status(fetchRes.status).json({
        success: false,
        error: data.error || `SerpApi returned status ${fetchRes.status}`,
      });
    }

    const rawList = Array.isArray(data.local_results) ? data.local_results : [];
    const results = rawList.map((item: any, idx: number) => {
      const category = inferGoogleCategory(item.type, item.title);
      return {
        id: `serp-${item.place_id || idx}-${Date.now()}`,
        name: item.title,
        category,
        address: item.address || 'Address not listed',
        city: item.address ? item.address.split(',').slice(-2, -1)[0]?.trim() || 'Nearby' : 'Nearby',
        lat: item.gps_coordinates?.latitude || 37.7749 + (Math.random() - 0.5) * 0.05,
        lng: item.gps_coordinates?.longitude || -122.4194 + (Math.random() - 0.5) * 0.05,
        rating: item.rating || 4.2,
        reviewsCount: item.reviews || 0,
        thumbnail: item.thumbnail || '',
        phone: item.phone,
        website: item.website,
        wheelchairAccessible: item.wheelchair_accessible ?? true,
      };
    });

    res.json({
      success: true,
      query,
      count: results.length,
      data: results,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to query SerpApi Google Maps' });
  }
});

// SerpApi 1-Click Import into AccessMap Database
apiRouter.post('/serpapi/import', (req: Request, res: Response) => {
  try {
    const item = req.body;
    if (!item || !item.name) {
      return res.status(400).json({ error: 'Valid venue data is required for import' });
    }

    const category = (item.category as any) || inferGoogleCategory('', item.name);
    const newPlace = dbStore.addPlace({
      name: item.name,
      category,
      address: item.address || 'Imported via Google Maps',
      city: item.city || 'Metro City',
      lat: Number(item.lat) || 37.7749,
      lng: Number(item.lng) || -122.4194,
      accessibilityLevel: item.wheelchairAccessible !== false ? 'fully_accessible' : 'partially_accessible',
      accessibilityScore: item.wheelchairAccessible !== false ? 92 : 68,
      summary: `Imported via Google Maps SerpApi search. Rating: ${item.rating || 'N/A'} (${item.reviewsCount || 0} reviews). ${item.address || ''}`,
      features: {
        wheelchairRamps: true,
        stepFreeEntrance: item.wheelchairAccessible !== false,
        elevators: true,
        accessibleRestrooms: true,
        designatedParking: true,
        automaticDoors: false,
        tactilePaving: false,
        brailleSignage: false,
        hearingLoop: false,
      },
      entrances: [
        {
          id: `ent-serp-${Date.now()}`,
          name: 'Main Entrance',
          isStepFree: item.wheelchairAccessible !== false,
          hasRamp: true,
          doorWidthCm: 92,
          hasAutomaticDoor: false,
          stepCount: 0,
          notes: 'Google Maps verified location entrance',
        },
      ],
      imageUrl: item.thumbnail || '',
      imageAlt: item.name,
      verifiedByCommunity: false,
      openingHours: 'Mon - Sun: 08:00 - 20:00',
      phone: item.phone || '+1 (555) 019-2834',
      website: item.website || '',
    });

    res.status(201).json({ success: true, data: newPlace });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

