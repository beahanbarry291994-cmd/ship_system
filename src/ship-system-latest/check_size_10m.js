import fs from 'fs';
const stats = fs.statSync('land_10m.geojson');
console.log(`Size: ${stats.size / 1024 / 1024} MB`);
