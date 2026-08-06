var fs = require('fs');
var path = require('path');
var base = process.cwd();

// Fix 1: layout.tsx broken imports + duplicate );
var layout = fs.readFileSync(path.join(base, 'src/app/layout.tsx'), 'utf8');
layout = layout.replace(/import PWAInstallPrompt\s*\nimport PushSetup from '@\/components\/mesjid\/PushSetup'\s*from "@\/components\/mesjid\/PWAInstallPrompt";/, "import PWAInstallPrompt from \"@/components/mesjid/PWAInstallPrompt\";\nimport PushSetup from '@/components/mesjid/PushSetup';");
layout = layout.replace(/  \);\s*\n  \);\s*\n\}/, "  );\n}");
fs.writeFileSync(path.join(base, 'src/app/layout.tsx'), layout, 'utf8');
console.log('1/2 layout.tsx fixed');

// Fix 2: UrgentPlanBanner - COMPLETE REWRITE huge + non-cancellable
var banner = "import { useState, useEffect } from 'react'\n" +
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
"  var plans = store.plans\n" +
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
"    <div className=\"relative z-[100]\">\n" +
"      <div className=\"absolute inset-0 bg-red-500/30 animate-ping\" style={{animationDuration:'2s'}} />\n" +
"      <div className=\"absolute inset-0 bg-red-600/20 animate-pulse\" />\n" +
"      <motion.div\n" +
"        initial={{ y: -120, opacity: 0 }}\n" +
"        animate={{ y: 0, opacity: 1 }}\n" +
"        className=\"relative bg-gradient-to-r from-red-800 via-red-600 to-red-800 text-white py-6 px-6 shadow-2xl shadow-red-500/50 border-b-4 border-yellow-400\"\n" +
"      >\n" +
"        <div className=\"flex items-center gap-4\">\n" +
"          <div className=\"relative shrink-0\">\n" +
"            <div className=\"absolute inset-0 bg-yellow-400/30 rounded-full animate-ping\" style={{animationDuration:'1.5s'}} />\n" +
"            <div className=\"relative bg-yellow-400/20 p-3 rounded-full\">\n" +
"              <AlertTriangle className=\"w-10 h-10 text-yellow-300 animate-pulse\" />\n" +
"            </div>\n" +
"          </div>\n" +
"          <div className=\"flex-1 min-w-0\">\n" +
"            <div className=\"flex items-center gap-2 mb-1\">\n" +
"              <span className=\"bg-yellow-400 text-red-900 text-xs font-black px-2.5 py-1 rounded-md uppercase tracking-widest\">Urgent</span>\n" +
"              <span className=\"text-white/60 text-xs\">Plan Deadline</span>\n" +
"            </div>\n" +
"            <p className=\"font-bold text-xl truncate leading-tight\">{urgentPlan.title}</p>\n" +
"            <p className=\"text-red-100/80 text-base mt-1\">\n" +
"              Due in: <span className=\"font-mono font-black text-yellow-300 text-lg\">{timeLeft}</span>\n" +
"            </p>\n" +
"          </div>\n" +
"          <div className=\"shrink-0 hidden sm:block\">\n" +
"            <div className=\"bg-white/15 backdrop-blur-sm px-4 py-2.5 rounded-xl border border-white/20 text-center\">\n" +
"              <p className=\"text-[10px] text-white/60 uppercase tracking-wider\">Time Left</p>\n" +
"              <p className=\"font-mono font-black text-2xl text-yellow-300\">{timeLeft}</p>\n" +
"            </div>\n" +
"          </div>\n" +
"        </div>\n" +
"      </motion.div>\n" +
"    </div>\n" +
"  )\n" +
"}\n";
fs.writeFileSync(path.join(base, 'src/components/mesjid/UrgentPlanBanner.tsx'), banner, 'utf8');
console.log('2/2 UrgentPlanBanner.tsx - HUGE non-cancellable rewrite');

console.log('\nAll fixed! Push now.');
