var fs = require('fs');
var f = fs.readFileSync('src/components/mesjid/UrgentPlanBanner.tsx', 'utf8');
if (f.indexOf("'use client'") === -1) {
  fs.writeFileSync('src/components/mesjid/UrgentPlanBanner.tsx', "'use client'\n" + f, 'utf8');
  console.log('Added use client');
} else {
  console.log('Already has use client');
}
