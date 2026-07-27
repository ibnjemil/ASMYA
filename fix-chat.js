const fs = require('fs');
let c = fs.readFileSync('src/components/mesjid/ChatView.tsx', 'utf8');
c = c.replace("className={'px-3.5 py-2 rounded-2xl text-sm leading-relaxed ' + (isOwn ? 'bg-gradient-to-br from-amber-600/90 to-amber-700/90 text-white rounded-tr-md' : 'glass-card rounded-tl-md')}", "className={isDel ? 'px-2 py-1 rounded-xl opacity-40' : ('px-3.5 py-2 rounded-2xl text-sm leading-relaxed ' + (isOwn ? 'bg-gradient-to-br from-amber-600/90 to-amber-700/90 text-white rounded-tr-md' : 'glass-card rounded-tl-md'))}");
c = c.replace("onClick={() => handleDownload(msg)}", "onClick={(e) => { e.stopPropagation(); setLightboxSrc(msg.mediaUrl) }}");
c = c.replace("const [hoveredId, setHoveredId]", "const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)\n  const [hoveredId, setHoveredId]");
c = c.replace("    </div>\n  )\n}", "      {lightboxSrc && (\n        <div className=\"fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4\" onClick={() => setLightboxSrc(null)}>\n          <button className=\"absolute top-4 right-4 text-white/70 hover:text-white p-2\"><X className=\"w-6 h-6\" /></button>\n          <img src={lightboxSrc} alt=\"\" className=\"max-w-full max-h-full object-contain rounded-lg\" onClick={(e) => e.stopPropagation()} />\n        </div>\n      )}\n    </div>\n  )\n}");
c = c.replace(/<button onClick=\{\(\) => cameraRef\.current\?\.click\(\)\}[^>]*><Camera[^\/]*\/><\/button>\n?/g, '');
fs.writeFileSync('src/components/mesjid/ChatView.tsx', c, 'utf8');
console.log('ALL FIXES APPLIED');
