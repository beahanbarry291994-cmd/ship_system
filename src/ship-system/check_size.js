import fs from 'fs';
const stats = fs.statSync('land.geojson');
console.log(stats.size);
