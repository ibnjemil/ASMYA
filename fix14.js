let c = require('fs').readFileSync('src/components/mesjid/ChatView.tsx', 'utf8');
let lines = c.split('\n');
for (let i = 290; i < 310; i++) {
  if (lines[i] && lines[i].trim() === '}' && lines[i-1] && lines[i-1].trim() === '}') {
    lines.splice(i, 1);
    console.log('Removed extra } at line ' + (i+1));
    break;
  }
}
require('fs').writeFileSync('src/components/mesjid/ChatView.tsx', lines.join('\n'), 'utf8');
console.log('SAVED');
