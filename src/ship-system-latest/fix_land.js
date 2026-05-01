import fs from 'fs';

function fixGeoJSON(filename, outputFilename) {
  try {
    const data = fs.readFileSync(filename, 'utf8');
    const features = [];
    const featureStartStr = '{"type":"Feature"';
    let pos = data.indexOf(featureStartStr);
    
    while (pos !== -1) {
      let nextPos = data.indexOf(featureStartStr, pos + 1);
      let chunk = nextPos === -1 ? data.substring(pos) : data.substring(pos, nextPos);
      
      chunk = chunk.trim();
      if (chunk.endsWith(',')) chunk = chunk.slice(0, -1);
      
      let found = false;
      // Try to find the last closing brace and add necessary ones to make it valid
      const lastBrace = chunk.lastIndexOf('}');
      if (lastBrace !== -1) {
        let candidate = chunk.substring(0, lastBrace + 1);
        for (let b = 0; b < 10; b++) {
          try {
            const f = JSON.parse(candidate);
            if (f.geometry && f.geometry.coordinates) {
              features.push(f);
              found = true;
              break;
            }
          } catch (e) {}
          candidate += '}';
        }
      }
      pos = nextPos;
    }
    
    const result = {
      type: "FeatureCollection",
      features: features
    };
    fs.writeFileSync(outputFilename, JSON.stringify(result));
    console.log(`Extracted ${features.length} features from ${filename} to ${outputFilename}`);
    return true;
  } catch (e) {
    console.error(`Failed to fix ${filename}:`, e);
    return false;
  }
}

fixGeoJSON('land_10m.geojson', 'land_fixed.geojson');
