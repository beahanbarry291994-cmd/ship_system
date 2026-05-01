import fs from 'fs';

const lines = fs.readFileSync('server.ts', 'utf8').split('\n');

const newCode = `
const segmentTree = new RBush();
const polygonTree = new RBush();

function initGlobalLand() {
  let segments: any[] = [];
  let polygons: any[] = [];
  
  const localPolygons = [
    [{lat: 37.8100, lng: -122.4800}, {lat: 37.8050, lng: -122.4500}, {lat: 37.8080, lng: -122.4300}, {lat: 37.8000, lng: -122.4000}, {lat: 37.7800, lng: -122.3800}, {lat: 37.7500, lng: -122.3800}, {lat: 37.7000, lng: -122.3800}, {lat: 37.6500, lng: -122.3800}, {lat: 37.6000, lng: -122.3500}, {lat: 37.5500, lng: -122.3000}, {lat: 37.5500, lng: -122.5500}, {lat: 37.7500, lng: -122.5500}],
    [{lat: 37.9500, lng: -122.4000}, {lat: 37.9000, lng: -122.3500}, {lat: 37.8800, lng: -122.3200}, {lat: 37.8300, lng: -122.3000}, {lat: 37.8000, lng: -122.3200}, {lat: 37.7500, lng: -122.2500}, {lat: 37.7000, lng: -122.2000}, {lat: 37.6500, lng: -122.1500}, {lat: 37.6500, lng: -122.0000}, {lat: 37.9500, lng: -122.0000}],
    [{lat: 37.8200, lng: -122.4800}, {lat: 37.8300, lng: -122.4600}, {lat: 37.8500, lng: -122.4500}, {lat: 37.8600, lng: -122.4200}, {lat: 37.8800, lng: -122.4200}, {lat: 37.9500, lng: -122.4500}, {lat: 37.9500, lng: -122.6000}, {lat: 37.8200, lng: -122.6000}],
    [{lat: 37.8280, lng: -122.4240}, {lat: 37.8280, lng: -122.4220}, {lat: 37.8250, lng: -122.4210}, {lat: 37.8250, lng: -122.4240}],
    [{lat: 37.8300, lng: -122.3750}, {lat: 37.8300, lng: -122.3650}, {lat: 37.8150, lng: -122.3600}, {lat: 37.8050, lng: -122.3650}, {lat: 37.8050, lng: -122.3700}, {lat: 37.8150, lng: -122.3750}],
    [{lat: 37.8650, lng: -122.4400}, {lat: 37.8650, lng: -122.4200}, {lat: 37.8550, lng: -122.4200}, {lat: 37.8550, lng: -122.4400}]
  ];

  for (const poly of localPolygons) {
    let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
    const coords = poly.map(p => {
      if (p.lng < minLng) minLng = p.lng;
      if (p.lng > maxLng) maxLng = p.lng;
      if (p.lat < minLat) minLat = p.lat;
      if (p.lat > maxLat) maxLat = p.lat;
      return [p.lng, p.lat];
    });
    polygons.push({ minX: minLng, minY: minLat, maxX: maxLng, maxY: maxLat, coords: [coords] });

    for (let i = 0; i < poly.length; i++) {
      const p1 = toLocal(poly[i].lat, poly[i].lng);
      const p2 = toLocal(poly[(i+1)%poly.length].lat, poly[(i+1)%poly.length].lng);
      segments.push({
        minX: Math.min(p1.x, p2.x), minY: Math.min(p1.y, p2.y),
        maxX: Math.max(p1.x, p2.x), maxY: Math.max(p1.y, p2.y),
        p1, p2
      });
    }
  }

  try {
    const geojson = JSON.parse(fs.readFileSync('land_10m.geojson', 'utf8'));
    function processPolygon(coords: any[]) {
      let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
      for (const ring of coords) {
        for (const p of ring) {
          if (p[0] < minLng) minLng = p[0];
          if (p[0] > maxLng) maxLng = p[0];
          if (p[1] < minLat) minLat = p[1];
          if (p[1] > maxLat) maxLat = p[1];
        }
        for (let i = 0; i < ring.length - 1; i++) {
          const p1 = toLocal(ring[i][1], ring[i][0]);
          const p2 = toLocal(ring[i+1][1], ring[i+1][0]);
          segments.push({
            minX: Math.min(p1.x, p2.x), minY: Math.min(p1.y, p2.y),
            maxX: Math.max(p1.x, p2.x), maxY: Math.max(p1.y, p2.y),
            p1, p2
          });
        }
      }
      polygons.push({ minX: minLng, minY: minLat, maxX: maxLng, maxY: maxLat, coords });
    }

    for (const feature of geojson.features) {
      if (feature.geometry.type === 'Polygon') {
        processPolygon(feature.geometry.coordinates);
      } else if (feature.geometry.type === 'MultiPolygon') {
        for (const poly of feature.geometry.coordinates) {
          processPolygon(poly);
        }
      }
    }
  } catch (e) {
    console.error('Could not load land_10m.geojson', e);
  }

  segmentTree.load(segments);
  polygonTree.load(polygons);
  console.log('Loaded global land data. Segments:', segments.length, 'Polygons:', polygons.length);
}

initGlobalLand();

function pointToSegmentDistance(px: number, py: number, x1: number, y1: number, x2: number, y2: number) {
  const l2 = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
  if (l2 === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
}

function getDistanceToPolygons(px: number, py: number, _ignored?: any[]) {
  const searchRadius = 2000;
  const results = segmentTree.search({
    minX: px - searchRadius, minY: py - searchRadius,
    maxX: px + searchRadius, maxY: py + searchRadius
  });
  
  if (results.length === 0) return searchRadius;
  
  let minDist = Infinity;
  for (const seg of results as any[]) {
    const dist = pointToSegmentDistance(px, py, seg.p1.x, seg.p1.y, seg.p2.x, seg.p2.y);
    if (dist < minDist) minDist = dist;
  }
  return minDist;
}

const landPolygons: any[] = []; // Dummy for compatibility
`;

const startIdx = lines.findIndex(l => l.startsWith('const landPolygons = ['));
const endIdx = lines.findIndex(l => l.startsWith('  return minDist;')) + 1; // end of getDistanceToPolygons

lines.splice(startIdx, endIdx - startIdx + 1, newCode);

fs.writeFileSync('server.ts', lines.join('\n'));
console.log('Updated server.ts');
