var fs = require('fs');
var path = require('path');
var base = process.cwd();

// 1. Banner - FIXED position (overlay, doesn't push content)
var banner = "'use client'\n" +
"import { useState, useEffect } from 'react'\n" +
"import { motion } from 'framer-motion'\n" +
"import { AlertTriangle } from 'lucide-react'\n" +
"import { useStore } from '@/lib/store'\n\n" +
"function getTimeLeft(dueDate) {\n" +
"  var diff = new Date(dueDate).getTime() - Date.now()\n" +
"  if (diff <= 0) return 'OVERDUE'\n" +
"  var d = Math.floor(diff / 86400000)\n" +
"  var h = Math.floor((diff % 86400000) / 3600000)\n" +
"  var m = Math.floor((diff % 3600000) / 60000)\n" +
"  var s = Math.floor((diff % 60000) / 1000)\n" +
"  var p = []\n" +
"  if (d > 0) p.push(d + 'd')\n" +
"  p.push(h + 'h'); p.push(m + 'm'); p.push(s + 's')\n" +
"  return p.join(' ')\n" +
"}\n\n" +
"export default function UrgentPlanBanner() {\n" +
"  var store = useStore()\n" +
"  var plans = (store.plans || [])\n" +
"  var timeLeftState = useState('')\n" +
"  var timeLeft = timeLeftState[0]\n" +
"  var setTimeLeft = timeLeftState[1]\n" +
"  var urgentPlan = plans\n" +
"    .filter(function(p) { return p.status !== 'COMPLETED' && p.dueDate && new Date(p.dueDate).getTime() > Date.now() && (p.urgency === 'CRITICAL' || p.urgency === 'HIGH' || p.isUrgent) })\n" +
"    .sort(function(a, b) { return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime() })[0]\n" +
"  useEffect(function() {\n" +
"    if (!urgentPlan) return\n" +
"    var tick = function() { setTimeLeft(getTimeLeft(urgentPlan.dueDate)) }\n" +
"    tick(); var id = setInterval(tick, 1000); return function() { clearInterval(id) }\n" +
"  }, [urgentPlan ? urgentPlan.id : ''])\n" +
"  if (!urgentPlan) return null\n" +
"  return (\n" +
"    <div className=\"fixed top-0 left-0 right-0 z-[100]\">\n" +
"      <div className=\"bg-red-600/20 animate-ping absolute inset-0\" style={{animationDuration:'2s'}} />\n" +
"      <motion.div\n" +
"        initial={{ y: -60, opacity: 0 }} animate={{ y: 0, opacity: 1 }}\n" +
"        className=\"relative bg-gradient-to-r from-red-800 via-red-600 to-red-800 text-white py-2.5 px-4 flex items-center gap-3 shadow-lg shadow-red-500/30 border-b-2 border-yellow-400\"\n" +
"      >\n" +
"        <div className=\"relative shrink-0\">\n" +
"          <div className=\"absolute inset-0 bg-yellow-400/30 rounded-full animate-ping\" style={{animationDuration:'1.5s'}} />\n" +
"          <div className=\"relative bg-yellow-400/20 p-1.5 rounded-full\">\n" +
"            <AlertTriangle className=\"w-5 h-5 text-yellow-300 animate-pulse\" />\n" +
"          </div>\n" +
"        </div>\n" +
"        <div className=\"flex-1 min-w-0\">\n" +
"          <div className=\"flex items-center gap-2\">\n" +
"            <span className=\"bg-yellow-400 text-red-900 text-[10px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest\">Urgent</span>\n" +
"            <p className=\"font-bold text-sm truncate\">{urgentPlan.title}</p>\n" +
"          </div>\n" +
"          <p className=\"text-red-100/80 text-xs\">\n" +
"            Due: <span className=\"font-mono font-bold text-yellow-300\">{timeLeft}</span>\n" +
"          </p>\n" +
"        </div>\n" +
"      </motion.div>\n" +
"    </div>\n" +
"  )\n" +
"}\n";
fs.writeFileSync(path.join(base, 'src/components/mesjid/UrgentPlanBanner.tsx'), banner, 'utf8');
console.log('1/3 Banner - fixed position overlay');

// 2. Reports - remove mediaUrl from ORM create, raw SQL only
var r = fs.readFileSync(path.join(base, 'src/app/api/reports/route.ts'), 'utf8');
r = r.replace('mediaUrl: mediaUrl || null,\n      },', '      },');
r = r.replace("    if (mediaUrl) {\n      try {\n        var lib = await import('@libsql/client')\n        var cl = lib.createClient({ url: process.env.ASMYA_DB_URL, authToken: process.env.TURSO_AUTH_TOKEN })\n        await cl.execute({ sql: 'UPDATE \"Report\" SET \"mediaUrl\" = ? WHERE id = ?', args: [mediaUrl, report.id] })\n        report.mediaUrl = mediaUrl\n      } catch (e) { console.error('Report mediaUrl:', e) }\n    }\n", "    if (mediaUrl) {\n      try {\n        var lib = await import('@libsql/client')\n        var cr = lib.createClient\n        if (!cr) { var mod = lib; cr = mod.createClient || mod.default }\n        var cl = cr({ url: process.env.ASMYA_DB_URL, authToken: process.env.TURSO_AUTH_TOKEN })\n        await cl.execute({ sql: 'UPDATE \"Report\" SET \"mediaUrl\" = ? WHERE id = ?', args: [mediaUrl, report.id] })\n      } catch (e) { console.error('Report mediaUrl:', e) }\n    }\n");
fs.writeFileSync(path.join(base, 'src/app/api/reports/route.ts'), r, 'utf8');
console.log('2/3 Reports - mediaUrl raw SQL only');

// 3. Cashbook - remove mediaUrl from ORM create, raw SQL only
var c = fs.readFileSync(path.join(base, 'src/app/api/cash-entries/route.ts'), 'utf8');
c = c.replace('mediaUrl: mediaUrl || null,\n      },', '      },');
c = c.replace("    if (mediaUrl) {\n      try {\n        var lib = await import('@libsql/client')\n        var cl = lib.createClient({ url: process.env.ASMYA_DB_URL, authToken: process.env.TURSO_AUTH_TOKEN })\n        await cl.execute({ sql: 'UPDATE \"CashEntry\" SET \"mediaUrl\" = ? WHERE id = ?', args: [mediaUrl, entry.id] })\n        entry.mediaUrl = mediaUrl\n      } catch (e) { console.error('CashEntry mediaUrl:', e) }\n    }\n", "    if (mediaUrl) {\n      try {\n        var lib = await import('@libsql/client')\n        var cr = lib.createClient\n        if (!cr) { var mod = lib; cr = mod.createClient || mod.default }\n        var cl = cr({ url: process.env.ASMYA_DB_URL, authToken: process.env.TURSO_AUTH_TOKEN })\n        await cl.execute({ sql: 'UPDATE \"CashEntry\" SET \"mediaUrl\" = ? WHERE id = ?', args: [mediaUrl, entry.id] })\n      } catch (e) { console.error('CashEntry mediaUrl:', e) }\n    }\n");
fs.writeFileSync(path.join(base, 'src/app/api/cash-entries/route.ts'), c, 'utf8');
console.log('3/3 Cashbook - mediaUrl raw SQL only');

console.log('\nAll done! Push now.');
