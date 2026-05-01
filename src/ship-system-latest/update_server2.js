import fs from 'fs';
const data = fs.readFileSync('land_10m.geojson', 'utf8');
let fixed = '';
try {
  JSON.parse(data);
  fixed = data;
  console.log('JSON was already valid');
} catch (e) {
  console.log('Error:', e.message);
  const posMatch = e.message.match(/at position (\d+)/);
  if (posMatch) {
    const errorPos = parseInt(posMatch[1]);
    console.log('Error at position:', errorPos);
    const candidate = data.substring(0, errorPos);
    // Find the last complete feature end
    const lastFeatureEnd = candidate.lastIndexOf('},');
    if (lastFeatureEnd !== -1) {
      fixed = candidate.substring(0, lastFeatureEnd + 1) + ']}';
      console.log('Fixed JSON by trimming at last feature end');
    } else {
      const lastBrace = candidate.lastIndexOf('}');
      if (lastBrace !== -1) {
        fixed = candidate.substring(0, lastBrace + 1) + ']}';
        console.log('Fixed JSON by trimming at last brace');
      }
    }
  }
}
if (fixed) {
  try {
    JSON.parse(fixed);
    fs.writeFileSync('land_fixed.geojson', fixed);
    console.log('SUCCESS: Valid fixed JSON saved');
  } catch (e2) {
    console.log('FAILURE: Fixed JSON still invalid:', e2.message);
  }
}
