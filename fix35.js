const fs = require('fs');
const f = 'C:\\Users\\reyan\\ASMYA\\src\\app\\api\\users\\route.ts';
let lines = fs.readFileSync(f, 'utf8').split(/\r?\n/);

// Find: } else if (role === Role.FOLLOWER && subAmirId) {
let start = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('role === Role.FOLLOWER && subAmirId')) {
    start = i;
    break;
  }
}

// Find: // Create chat memberships (this marks the END of the follower block)
let end = -1;
for (let i = start; i < lines.length; i++) {
  if (lines[i].includes('// Create chat memberships')) {
    // Walk backwards to find the closing } of the else-if
    for (let j = i - 1; j >= start; j--) {
      if (lines[j].trim() === '}') {
        end = j;
        break;
      }
    }
    break;
  }
}

console.log('Follower block: lines ' + (start+1) + ' to ' + (end+1));
console.log('Removing ' + (end - start + 1) + ' lines');

// The correct replacement block
const newBlock = [
  '    } else if (role === Role.FOLLOWER && subAmirId) {',
  '      const subAmirUser = await db.user.findUnique({ where: { id: subAmirId }, select: { role: true } })',
  '      if (subAmirUser) {',
  '        async function findOrCreateGroup(name, type, chatSide) {',
  '          let group = await db.chat.findFirst({ where: { name, type }, select: { id: true } })',
  '          if (!group) {',
  '            group = await db.chat.create({ data: { name, type, side: chatSide }, select: { id: true } })',
  '            await db.chatMember.upsert({ where: { chatId_userId: { chatId: group.id, userId: subAmirId } }, create: { chatId: group.id, userId: subAmirId }, update: {} })',
  '            console.log("Created group chat:", name)',
  '          }',
  '          return group',
  '        }',
  '        if (SUB_AMIR_ROLES.includes(subAmirUser.role)) {',
  '          const roleLabel = subAmirUser.role.replace("_AMIR", "")',
  '          const group = await findOrCreateGroup(roleLabel + "_GROUP_" + side, "SUB_AMIR_GROUP", side)',
  '          if (group) chatIdsToAdd.push(group.id)',
  '        } else if (SMALL_AMIR_ROLES.includes(subAmirUser.role)) {',
  '          const roleLabel = subAmirUser.role.replace("_AMIR", "")',
  '          const smallGroup = await findOrCreateGroup(roleLabel + "_GROUP_" + side, "SMALL_AMIR_GROUP", side)',
  '          if (smallGroup) chatIdsToAdd.push(smallGroup.id)',
  '          const parentMemberships = await db.chatMember.findMany({ where: { userId: subAmirId, chat: { type: "SUB_AMIR_GROUP" } }, include: { chat: { select: { id: true } } } })',
  '          for (const m of parentMemberships) chatIdsToAdd.push(m.chat.id)',
  '        }',
  '      }',
  '    }',
];

lines.splice(start, end - start + 1, ...newBlock);
fs.writeFileSync(f, lines.join('\n'));
console.log('DONE - file saved');
