-- ==============================================================================
-- ACCESSMAP ACCESSIBILITY DATABASE SCHEMA FOR SUPABASE
-- Run this script in your Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql)
-- ==============================================================================

-- 1. Create Places Table
create table if not exists public.places (
  id text primary key,
  name text not null,
  category text not null,
  address text not null,
  city text not null,
  lat double precision not null,
  lng double precision not null,
  distance_km double precision default 0.8,
  accessibility_level text not null check (accessibility_level in ('fully_accessible', 'partially_accessible', 'barrier_reported')),
  accessibility_score integer not null default 90,
  summary text,
  features jsonb not null default '{}'::jsonb,
  entrances jsonb not null default '[]'::jsonb,
  image_url text,
  image_alt text,
  photos_count integer default 1,
  reports_count integer default 0,
  last_updated text,
  verified_by_community boolean default true,
  opening_hours text,
  phone text,
  website text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Create Community Reports Table
create table if not exists public.reports (
  id text primary key,
  place_id text not null,
  place_name text not null,
  place_category text not null,
  author_name text not null,
  author_type text not null,
  feature_category text not null,
  photo_url text,
  photo_alt text,
  ai_classification jsonb default '{}'::jsonb,
  notes text,
  date text not null,
  upvotes integer default 0,
  is_verified boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Create Indexes for High Performance
create index if not exists idx_places_city on public.places(city);
create index if not exists idx_places_category on public.places(category);
create index if not exists idx_places_accessibility on public.places(accessibility_level);
create index if not exists idx_reports_place_id on public.reports(place_id);

-- 4. Enable Row Level Security (RLS)
alter table public.places enable row level security;
alter table public.reports enable row level security;

-- Drop existing policies if re-running
drop policy if exists "Allow public read access on places" on public.places;
drop policy if exists "Allow public insert on places" on public.places;
drop policy if exists "Allow public update on places" on public.places;
drop policy if exists "Allow public read access on reports" on public.reports;
drop policy if exists "Allow public insert on reports" on public.reports;
drop policy if exists "Allow public update on reports" on public.reports;

-- Public Access Policies
create policy "Allow public read access on places" on public.places for select using (true);
create policy "Allow public insert on places" on public.places for insert with check (true);
create policy "Allow public update on places" on public.places for update using (true);

create policy "Allow public read access on reports" on public.reports for select using (true);
create policy "Allow public insert on reports" on public.reports for insert with check (true);
create policy "Allow public update on reports" on public.reports for update using (true);

-- 5. Seed Real Places Data (University of Haripur, THQ Hassan Abdal, DHQ Haripur, Taxila Museum, PAF-IAST, Khanpur Dam)
insert into public.places (
  id, name, category, address, city, lat, lng, distance_km, 
  accessibility_level, accessibility_score, summary, 
  features, entrances, image_url, image_alt, photos_count, reports_count, 
  last_updated, verified_by_community, opening_hours, phone, website
) values
(
  'uoh-haripur',
  'The University of Haripur · Main Academic Campus',
  'university',
  'Hattar Road, Haripur, Khyber Pakhtunkhwa 22620, Pakistan',
  'Haripur',
  33.9965,
  72.9340,
  0.5,
  'fully_accessible',
  98,
  'Public research university campus with gradual concrete wheelchair ramps, stainless steel handrails, wide double-door academic entrances, and ground-level accessible lecture halls.',
  '{"wheelchairRamps": true, "stepFreeEntrance": true, "elevators": true, "accessibleRestrooms": true, "designatedParking": true, "automaticDoors": true, "tactilePaving": true, "brailleSignage": true, "hearingLoop": false}'::jsonb,
  '[
    {"id": "ent-uoh-1", "name": "Main Academic Quad Entrance", "isStepFree": true, "hasRamp": true, "slopeRatio": "1:14 (Gentle)", "doorWidthCm": 115, "hasAutomaticDoor": true, "stepCount": 0, "notes": "Wide paved approach ramp with dual stainless steel handrails directly connecting to main central foyer."},
    {"id": "ent-uoh-2", "name": "IT & Computer Science Complex", "isStepFree": true, "hasRamp": true, "slopeRatio": "1:12 Compliant", "doorWidthCm": 105, "hasAutomaticDoor": false, "stepCount": 0, "notes": "Level ramp entrance with designated accessible parking bays directly outside."},
    {"id": "ent-uoh-3", "name": "Old Admin Block Side Steps", "isStepFree": false, "hasRamp": false, "slopeRatio": "Steep steps", "doorWidthCm": 85, "hasAutomaticDoor": false, "stepCount": 6, "notes": "Barrier alert: 6 brick steps. Please use the South Quad Ramp 30m away."}
  ]'::jsonb,
  '/places/uoh_campus.jpg',
  'The University of Haripur academic campus with wide accessible entrance ramp',
  16,
  42,
  '2026-10-19',
  true,
  'Mon - Fri: 08:00 - 16:00',
  '+92 995 920600',
  'https://uoh.edu.pk'
),
(
  'thq-hassan-abdal',
  'THQ Hospital Hassan Abdal · Emergency & Trauma Center',
  'hospital',
  'Hazara Road, near GT Road, Hassan Abdal, District Attock, Punjab, Pakistan',
  'Hassan Abdal',
  33.8211,
  72.6953,
  1.2,
  'fully_accessible',
  96,
  'Tehsil Headquarter Hospital featuring a modern 24/7 Emergency & Trauma Center with dedicated ambulance bay, zero-step stretcher ramps, automatic sliding doors, and accessible emergency washrooms.',
  '{"wheelchairRamps": true, "stepFreeEntrance": true, "elevators": true, "accessibleRestrooms": true, "designatedParking": true, "automaticDoors": true, "tactilePaving": true, "brailleSignage": false, "hearingLoop": false}'::jsonb,
  '[
    {"id": "ent-thq-1", "name": "24/7 Emergency & Trauma Bay", "isStepFree": true, "hasRamp": true, "slopeRatio": "1:16 (Very Gentle)", "doorWidthCm": 140, "hasAutomaticDoor": true, "stepCount": 0, "notes": "Level driveway transition with direct ambulance pull-in and smooth wheelchair ramp leading into triage."},
    {"id": "ent-thq-2", "name": "Main Outpatient (OPD) Reception", "isStepFree": true, "hasRamp": true, "slopeRatio": "1:12 Compliant", "doorWidthCm": 110, "hasAutomaticDoor": false, "stepCount": 0, "notes": "Wide double doors with handrails on both sides, patient assistance desk right inside."}
  ]'::jsonb,
  '/places/thq_hassan_abdal.jpg',
  'THQ Hospital Hassan Abdal 24/7 Emergency and Trauma Center with ambulance bay and wheelchair ramp',
  24,
  58,
  '2026-10-19',
  true,
  '24/7 Emergency & Inpatient · OPD: 08:00 - 14:00',
  '+92 57 2520333',
  'https://pmuhealth.gop.pk'
),
(
  'dhq-haripur',
  'District Headquarter (DHQ) Hospital Haripur',
  'hospital',
  'Circular Road, GT Road, Haripur, Khyber Pakhtunkhwa, Pakistan',
  'Haripur',
  33.9998,
  72.9320,
  0.8,
  'fully_accessible',
  92,
  'Major district referral hospital with renovated trauma unit, patient wheelchair ramp access, dedicated ambulance reception, and accessible ground-floor diagnostic wards.',
  '{"wheelchairRamps": true, "stepFreeEntrance": true, "elevators": true, "accessibleRestrooms": true, "designatedParking": true, "automaticDoors": false, "tactilePaving": false, "brailleSignage": false, "hearingLoop": false}'::jsonb,
  '[
    {"id": "ent-dhq-1", "name": "Main Emergency Ramp Entrance", "isStepFree": true, "hasRamp": true, "slopeRatio": "1:14 (Gentle)", "doorWidthCm": 130, "hasAutomaticDoor": false, "stepCount": 0, "notes": "Wide concrete ramp with safety rails accommodating stretchers and wheelchairs simultaneously."},
    {"id": "ent-dhq-2", "name": "Specialist OPD Wing", "isStepFree": true, "hasRamp": true, "slopeRatio": "1:12 Compliant", "doorWidthCm": 100, "hasAutomaticDoor": false, "stepCount": 0, "notes": "Step-free ramp from visitor parking area."}
  ]'::jsonb,
  '/places/dhq_hospital_haripur.jpg',
  'DHQ Hospital Haripur entrance with wide patient access ramp',
  18,
  35,
  '2026-10-18',
  true,
  '24/7 Emergency Services',
  '+92 995 615330',
  'https://healthkp.gov.pk'
),
(
  'taxila-museum',
  'Taxila Museum & Ancient Gandhara Heritage Site',
  'public_building',
  'Taxila Museum Road, Taxila (near Hassan Abdal), Punjab, Pakistan',
  'Taxila',
  33.7437,
  72.8367,
  1.8,
  'fully_accessible',
  94,
  'Historic UNESCO-recognized archaeological museum housing renowned Gandhara collections. Features accessible brick courtyard ramps, paved stone walkways through the gardens, and wide museum gallery doorways.',
  '{"wheelchairRamps": true, "stepFreeEntrance": true, "elevators": false, "accessibleRestrooms": true, "designatedParking": true, "automaticDoors": false, "tactilePaving": true, "brailleSignage": true, "hearingLoop": false}'::jsonb,
  '[
    {"id": "ent-tax-1", "name": "Garden Promenade & Main Gallery Ramp", "isStepFree": true, "hasRamp": true, "slopeRatio": "1:15 (Very Gentle)", "doorWidthCm": 120, "hasAutomaticDoor": false, "stepCount": 0, "notes": "Paved red-brick ramp with decorative dark iron handrails bypassing front stone steps into museum rotunda."},
    {"id": "ent-tax-2", "name": "Courtyard Archaeological Garden", "isStepFree": true, "hasRamp": false, "slopeRatio": "Level Ground", "doorWidthCm": 150, "hasAutomaticDoor": false, "stepCount": 0, "notes": "Completely level stone pathway across the historic gardens and sculpture displays."}
  ]'::jsonb,
  '/places/taxila_museum.jpg',
  'Taxila Museum Indo-Saracenic historic building with accessible ramp in garden',
  31,
  67,
  '2026-10-17',
  true,
  'Tue - Sun: 09:00 - 17:00 (Closed Mondays)',
  '+92 51 9314108',
  'https://taxilamuseum.com'
),
(
  'paf-iast-haripur',
  'Pak-Austria Fachhochschule: Institute of Applied Sciences (PAF-IAST)',
  'university',
  'Khanpur Road, Mang, Haripur, Khyber Pakhtunkhwa, Pakistan',
  'Haripur',
  33.9555,
  72.9860,
  2.4,
  'fully_accessible',
  99,
  'Austrian-partnered state-of-the-art campus designed to European accessibility standards with seamless zero-threshold glass sliding doors, universal access elevators, tactile indoor paving, and barrier-free science labs.',
  '{"wheelchairRamps": true, "stepFreeEntrance": true, "elevators": true, "accessibleRestrooms": true, "designatedParking": true, "automaticDoors": true, "tactilePaving": true, "brailleSignage": true, "hearingLoop": true}'::jsonb,
  '[
    {"id": "ent-paf-1", "name": "Main Technological Atrium", "isStepFree": true, "hasRamp": true, "slopeRatio": "Level & 1:16 Gentle Ramp", "doorWidthCm": 160, "hasAutomaticDoor": true, "stepCount": 0, "notes": "Sensory-activated sliding double doors, high-contrast tactile wayfinding tiles, and elevator access to all floors."}
  ]'::jsonb,
  '/places/paf_iast_haripur.jpg',
  'Pak-Austria Fachhochschule modern university campus with universal accessibility and elevators',
  28,
  51,
  '2026-10-19',
  true,
  'Mon - Fri: 08:30 - 17:00',
  '+92 995 645112',
  'https://paf-iast.edu.pk'
),
(
  'khanpur-dam',
  'Khanpur Dam Viewpoint & Tourism Promenade',
  'park',
  'Khanpur Dam Promenade, Haripur, Khyber Pakhtunkhwa, Pakistan',
  'Haripur',
  33.8055,
  72.9350,
  3.1,
  'partially_accessible',
  82,
  'Scenic waterfront tourism destination overlooking the turquoise Haro river reservoir. Features a paved lakeside promenade with accessibility ramps to viewing terraces and dedicated family rest areas.',
  '{"wheelchairRamps": true, "stepFreeEntrance": true, "elevators": false, "accessibleRestrooms": true, "designatedParking": true, "automaticDoors": false, "tactilePaving": false, "brailleSignage": false, "hearingLoop": false}'::jsonb,
  '[
    {"id": "ent-kpr-1", "name": "Waterfront Promenade Ramp", "isStepFree": true, "hasRamp": true, "slopeRatio": "1:12 Compliant", "doorWidthCm": 180, "hasAutomaticDoor": false, "stepCount": 0, "notes": "Wide paved promenade ramp with safety railings giving panoramic barrier-free views of Khanpur Lake."},
    {"id": "ent-kpr-2", "name": "Boating Jetty Access", "isStepFree": false, "hasRamp": false, "slopeRatio": "Steep rocky steps", "doorWidthCm": 90, "hasAutomaticDoor": false, "stepCount": 18, "notes": "Barrier alert: 18 natural stone steps down to the floating boat jetty. Promenade area remains accessible."}
  ]'::jsonb,
  '/places/khanpur_dam_haripur.jpg',
  'Khanpur Dam viewpoint with paved accessible promenade and barrier-free platform',
  19,
  44,
  '2026-10-16',
  true,
  'Daily: 06:00 - 20:00',
  '+92 995 627100',
  'https://kptourism.com'
)
on conflict (id) do update set
  name = excluded.name,
  category = excluded.category,
  address = excluded.address,
  city = excluded.city,
  lat = excluded.lat,
  lng = excluded.lng,
  distance_km = excluded.distance_km,
  accessibility_level = excluded.accessibility_level,
  accessibility_score = excluded.accessibility_score,
  summary = excluded.summary,
  features = excluded.features,
  entrances = excluded.entrances,
  image_url = excluded.image_url,
  image_alt = excluded.image_alt,
  photos_count = excluded.photos_count,
  reports_count = excluded.reports_count,
  last_updated = excluded.last_updated,
  verified_by_community = excluded.verified_by_community,
  opening_hours = excluded.opening_hours,
  phone = excluded.phone,
  website = excluded.website;

-- 6. Seed Community Reports
insert into public.reports (
  id, place_id, place_name, place_category, author_name, author_type, 
  feature_category, photo_url, photo_alt, ai_classification, notes, date, upvotes, is_verified
) values
(
  'rep-uoh-1',
  'uoh-haripur',
  'The University of Haripur · Main Academic Campus',
  'university',
  'Hamza Khan (Student)',
  'wheelchair_user',
  'ramp',
  '/places/uoh_campus.jpg',
  'UoH Main Quad entrance ramp audit',
  '{"predictedCategory": "ramp", "predictedLabel": "Universal Wheelchair Ramp with Dual Handrails", "confidence": 97.4, "wasUserCorrected": false, "complianceScore": 98, "slopeEstimate": "1:14 (Very Gentle Slope)"}'::jsonb,
  'The main academic quad entrance has an excellent gentle ramp with stainless steel handrails on both sides. Wheelchair navigation between departments and the library is very smooth.',
  '2026-10-19',
  31,
  true
),
(
  'rep-thq-1',
  'thq-hassan-abdal',
  'THQ Hospital Hassan Abdal · Emergency & Trauma Center',
  'hospital',
  'Dr. Tariq Mehmood',
  'caregiver',
  'accessible_entrance',
  '/places/thq_hassan_abdal.jpg',
  'THQ Hospital Hassan Abdal Emergency Ramp Audit',
  '{"predictedCategory": "accessible_entrance", "predictedLabel": "Level Emergency Drop-off with Patient Stretcher Ramp", "confidence": 98.2, "wasUserCorrected": false, "complianceScore": 96, "slopeEstimate": "Level (0%) to 1:16"}'::jsonb,
  'Ambulance bay directly connects to the trauma center with a zero-threshold ramp. Emergency entrance is fully wheelchair and stretcher friendly 24 hours a day.',
  '2026-10-18',
  46,
  true
),
(
  'rep-tax-1',
  'taxila-museum',
  'Taxila Museum & Ancient Gandhara Heritage Site',
  'public_building',
  'Ayesha Siddiqui',
  'accessibility_auditor',
  'ramp',
  '/places/taxila_museum.jpg',
  'Taxila Museum Garden Ramp Audit',
  '{"predictedCategory": "ramp", "predictedLabel": "Historic Garden Brick Wheelchair Ramp", "confidence": 96.1, "wasUserCorrected": false, "complianceScore": 94, "slopeEstimate": "1:15 Gentle"}'::jsonb,
  'The historic brick ramp seamlessly blends with the museum architecture, allowing full access into the central sculpture gallery without climbing any steps.',
  '2026-10-17',
  28,
  true
)
on conflict (id) do nothing;
