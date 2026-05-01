import fs from 'fs';
import RBush from 'rbush';

const geojson = JSON.parse(fs.readFileSync('land_10m.geojson', 'utf8'));
const tree = new RBush();

let polygons = [];

function processPolygon(coords, id) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const ring of coords) {
    for (const p of ring) {
      if (p[0] < minX) minX = p[0];
      if (p[0] > maxX) maxX = p[0];
      if (p[1] < minY) minY = p[1];
      if (p[1] > maxY) maxY = p[1];
    }
  }
  polygons.push({ minX, minY, maxX, maxY, id, coords });
}

let id = 0;
for (const feature of geojson.features) {
  if (feature.geometry.type === 'Polygon') {
    processPolygon(feature.geometry.coordinates, id++);
  } else if (feature.geometry.type === 'MultiPolygon') {
    for (const poly of feature.geometry.coordinates) {
      processPolygon(poly, id++);
    }
  }
}

tree.load(polygons);
console.log('Total polygons:', polygons.length);
