const fs = require('fs');
let c = fs.readFileSync('src/app/api/chats/route.ts', 'utf8');
const s1 = "      // Auto-fix: ensure follower is in their amir's group chat\n      if (reqUser";
const r1 = "      // Auto-fix: ensure follower is in their amir's group chat\n      try {\n      if (reqUser";
const s2 = "\n      const memberships = await db.chatMember.findMany({";
const r2 = "\n      } catch (e) { console.error('Auto-fix:', e) }\n      const memberships = await db.chatMember.findMany({";
if (c.includes(s1) && c.includes(s2)) {
  c = c.replace(s1, r1).replace(s2, r2);
  fs.writeFileSync('src/app/api/chats/route.ts', c, 'utf8');
  console.log('OK');
} else {
  console.log('NOT FOUND');
}
