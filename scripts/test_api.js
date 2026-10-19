async function test() {
  try {
    const res = await fetch('http://localhost:3000/api/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        placeId: 'uoh-haripur',
        placeName: 'The University of Haripur · Main Academic Campus',
        placeCategory: 'university',
        authorName: 'Ahmad Raza (Student)',
        authorType: 'community_member',
        featureCategory: 'ramp',
        photoUrl: '/places/uoh_campus.jpg',
        photoAlt: 'UoH Entrance Ramp',
        notes: 'Testing save scan: Main gate ramp has gentle incline and smooth pavers.',
        upvotes: 1,
        isVerified: true,
        aiClassification: {
          predictedCategory: 'ramp',
          predictedLabel: 'Wheelchair Ramp Verified',
          confidence: 96.5,
          complianceScore: 95
        }
      })
    });
    const data = await res.json();
    console.log('STATUS:', res.status);
    console.log('DATA:', JSON.stringify(data, null, 2));

    const checkRes = await fetch('http://localhost:3000/api/reports?placeId=uoh-haripur');
    const checkData = await checkRes.json();
    console.log('REPORTS COUNT:', checkData.count);
  } catch (e) {
    console.error('ERROR:', e);
  }
}

test();
