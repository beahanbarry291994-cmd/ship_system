import fs from 'fs';
import RBush from 'rbush';

const R = 6378137;
const BASE_LAT = 37.8267;
const BASE_LNG = -122.4230;

function toLocal(lat, lng) {
  const x = lng * R * Math.PI / 180;
  const y = R * Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360));
  const refX = BASE_LNG * R * Math.PI / 180;
  const refY = R * Math.log(Math.tan(Math.PI / 4 + BASE_LAT * Math.PI / 360));
  return { x: x - refX, y: y - refY };
}

const geojson = JSON.parse(fs.readFileSync('land.geojson', 'utf8'));
const tree = new RBush();

let segments = [];

function processPolygon(coords) {
  for (const ring of coords) {
    for (let i = 0; i < ring.length - 1; i++) {
      const p1 = toLocal(ring[i][1], ring[i][0]);
      const p2 = toLocal(ring[i+1][1], ring[i+1][0]);
      const minX = Math.min(p1.x, p2.x);
      const maxX = Math.max(p1.x, p2.x);
      const minY = Math.min(p1.y, p2.y);
      const maxY = Math.max(p1.y, p2.y);
      segments.push({ minX, minY, maxX, maxY, p1, p2 });
    }
  }
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

tree.load(segments);

const testX = 0;
const testY = 0;
let minDist = Infinity;
for (const seg of segments) {
  const dist = Math.hypot(seg.p1.x - testX, seg.p1.y - testY);
  if (dist < minDist) minDist = dist;
}
console.log('Min distance to any land segment from SF:', minDist);
