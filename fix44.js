var fs = require('fs');
var f = 'src/components/mesjid/ChatView.tsx';
var c = fs.readFileSync(f, 'utf8');
var q = String.fromCharCode(39);
if (c.indexOf('import FullscreenImageViewer') === -1) {
  c = c.replace('import UserAvatar from ' + q + './UserAvatar' + q,
    'import UserAvatar from ' + q + './UserAvatar' + q + '\nimport FullscreenImageViewer from ' + q + './FullscreenImageViewer' + q);
  console.log('[OK] added import');
}
if (c.indexOf('bg-black/95 z-50') !== -1) {
  c = c.replace(/\{lightboxSrc && \([\s\S]*?\}\)\s*\}/,
    '<FullscreenImageViewer src={lightboxSrc} open={!!lightboxSrc} onClose={() => setLightboxSrc(null)} />');
  console.log('[OK] replaced lightbox');
}
fs.writeFileSync(f, c, 'utf8');
console.log('ChatView done');
