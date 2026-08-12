var fs = require('fs');
var f = 'src/app/api/users/route.ts';
var c = fs.readFileSync(f, 'utf8');

var ROLE_TO_CHAT = {
  EDUCATION_AMIR: 'Education Group',
  COMMUNITY_AMIR: 'Community Group',
  ADMIN_AMIR: 'Admin Group',
  FINANCE_AMIR: 'Finance Group',
  PROGRAM_AMIR: 'Program Group',
  SOCIAL_MEDIA_AMIR: 'Social Media Group'
};

var oldBlock = c.match(/if \(SUB_AMIR_ROLES\.includes\(subAmirUser\.role\)\)[\s\S]*?^\s{4}\}/m);
if (oldBlock) {
  var newBlock = '      if (SUB_AMIR_ROLES.includes(subAmirUser.role)) {\n'
    + '        const chatName = ROLE_TO_CHAT[subAmirUser.role]\n'
    + '        if (chatName) {\n'
    + '          const subAmirGroupChat = await db.chat.findFirst({\n'
    + '            where: { name: chatName, type: ChatType.SUB_AMIR_GROUP, side },\n'
    + '            select: { id: true },\n'
    + '          })\n'
    + '          if (subAmirGroupChat) chatIdsToAdd.push(subAmirGroupChat.id)\n'
    + '        }\n'
    + '      } else if (SMALL_AMIR_ROLES.includes(subAmirUser.role)) {\n'
    + '        const chatName = ROLE_TO_CHAT[subAmirUser.role]\n'
    + '        if (chatName) {\n'
    + '          const smallAmirGroupChat = await db.chat.findFirst({\n'
    + '            where: { name: chatName, type: ChatType.SMALL_AMIR_GROUP, side },\n'
    + '            select: { id: true },\n'
    + '          })\n'
    + '          if (smallAmirGroupChat) chatIdsToAdd.push(smallAmirGroupChat.id)\n'
    + '        }\n'
    + '        const adminGroup = await db.chat.findFirst({\n'
    + '          where: { name: ROLE_TO_CHAT.ADMIN_AMIR, type: ChatType.SUB_AMIR_GROUP, side },\n'
    + '          select: { id: true },\n'
    + '        })\n'
    + '        if (adminGroup) chatIdsToAdd.push(adminGroup.id)\n'
    + '      }';
  c = c.replace(oldBlock[0], newBlock);
  fs.writeFileSync(f, c, 'utf8');
  console.log('[OK] Follower group name mapping fixed');
} else {
  console.log('[SKIP] Pattern not found - may already be fixed');
}
