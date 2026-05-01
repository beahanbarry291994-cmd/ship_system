const https = require('https');
const fs = require('fs');

const file = fs.createWriteStream("land_10m.geojson");
https.get("https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_land.geojson", function(response) {
  response.pipe(file);
  file.on('finish', function() {
    file.close();
    console.log("Downloaded land_10m.geojson");
  });
});
