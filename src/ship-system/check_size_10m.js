import fs from 'fs';
const stats = fs.statSync('land_10m.geojson');
console.log(stats.size);
