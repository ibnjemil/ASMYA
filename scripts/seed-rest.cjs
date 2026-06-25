const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');
const db = new PrismaClient();

async function seed() {
  console.log('Seeding teacher/student/parent + chats...');

  const existing = await db.user.findMany({ select: { username: true } });
  const existingNames = new Set(existing.map(u => u.username));
  console.log(`Existing users: ${existingNames.size}`);

  // Create teacher if not exists
  if (!existingNames.has('ustaz_jihad')) {
    const t = await db.user.create({
      data: {
        id: uuidv4(), username: 'ustaz_jihad', displayName: 'Ustaz Jihad',
        password: '12345678', role: 'TEACHER', side: 'MEN',
        createdAt: new Date(), updatedAt: new Date(),
      },
    });
    await db.teacherProfile.create({ data: { id: uuidv4(), userId: t.id, subject: 'Quran & Islamic Studies' } });
    console.log('  Created: ustaz_jihad (TEACHER)');
  }

  // Create students
  const students = [
    { username: 'student_ahmed', displayName: 'Ahmed Mohamed', grade: 'Level 3' },
    { username: 'student_yusuf', displayName: 'Yusuf Ibrahim', grade: 'Level 2' },
  ];
  const studentIds = [];
  for (const s of students) {
    if (!existingNames.has(s.username)) {
      const stu = await db.user.create({
        data: {
          id: uuidv4(), username: s.username, displayName: s.displayName,
          password: '12345678', role: 'STUDENT', side: 'MEN',
          createdAt: new Date(), updatedAt: new Date(),
        },
      });
      await db.studentProfile.create({ data: { id: uuidv4(), userId: stu.id, grade: s.grade } });
      studentIds.push(stu.id);
      console.log(`  Created: ${s.username} (STUDENT)`);
    } else {
      const stu = await db.user.findUnique({ where: { username: s.username } });
      studentIds.push(stu.id);
    }
  }

  // Create parent
  let parentId;
  if (!existingNames.has('parent_mohamed')) {
    const p = await db.user.create({
      data: {
        id: uuidv4(), username: 'parent_mohamed', displayName: 'Mohamed Ahmed',
        password: '12345678', role: 'PARENT', side: 'MEN',
        createdAt: new Date(), updatedAt: new Date(),
      },
    });
    await db.parentProfile.create({ data: { id: uuidv4(), userId: p.id } });
    parentId = p.id;
    console.log('  Created: parent_mohamed (PARENT)');
  } else {
    parentId = (await db.user.findUnique({ where: { username: 'parent_mohamed' } })).id;
  }

  // Link students to parent
  for (const sid of studentIds) {
    await db.studentProfile.update({ where: { userId: sid }, data: { parentId } });
  }

  // ============ SEED CHAT ROOMS ============
  const chatCount = await db.chat.count();
  if (chatCount === 0) {
    const MEN_USERS = ['ustaz_jihad_m', 'vice_amir_m', 'secretary_m', 'education_amir_m', 'community_amir_m', 'admin_amir_m', 'finance_amir_m', 'program_amir_m', 'social_media_amir_m'];
    const WOMEN_USERS = ['vice_amir_w', 'secretary_w', 'education_amir_w', 'community_amir_w', 'admin_amir_w', 'finance_amir_w', 'program_amir_w', 'social_media_amir_w'];

    const allUsers = {};
    const users = await db.user.findMany({ select: { username: true, id: true, role: true, side: true } });
    users.forEach(u => { allUsers[u.username] = u; });

    const CHATS = [
      { name: 'Nine Amir Council', type: 'NINE_AMIR', side: 'MEN', members: MEN_USERS },
      { name: 'Nine Amir Council', type: 'NINE_AMIR', side: 'WOMEN', members: [...WOMEN_USERS, 'ustaz_jihad_m'] },
      { name: 'Three Main Amirs', type: 'THREE_MAIN', side: 'MEN', members: ['ustaz_jihad_m', 'vice_amir_m', 'secretary_m'] },
      { name: 'Three Main Amirs', type: 'THREE_MAIN', side: 'WOMEN', members: ['vice_amir_w', 'secretary_w', 'ustaz_jihad_m'] },
      { name: 'Education Group', type: 'SUB_AMIR_GROUP', side: 'MEN', members: ['education_amir_m'] },
      { name: 'Education Group', type: 'SUB_AMIR_GROUP', side: 'WOMEN', members: ['education_amir_w'] },
      { name: 'Community Group', type: 'SUB_AMIR_GROUP', side: 'MEN', members: ['community_amir_m'] },
      { name: 'Community Group', type: 'SUB_AMIR_GROUP', side: 'WOMEN', members: ['community_amir_w'] },
      { name: 'Admin Group', type: 'SUB_AMIR_GROUP', side: 'MEN', members: ['admin_amir_m'] },
      { name: 'Admin Group', type: 'SUB_AMIR_GROUP', side: 'WOMEN', members: ['admin_amir_w'] },
      { name: 'Finance Group', type: 'SMALL_AMIR_GROUP', side: 'MEN', members: ['finance_amir_m'] },
      { name: 'Finance Group', type: 'SMALL_AMIR_GROUP', side: 'WOMEN', members: ['finance_amir_w'] },
      { name: 'Program Group', type: 'SMALL_AMIR_GROUP', side: 'MEN', members: ['program_amir_m'] },
      { name: 'Program Group', type: 'SMALL_AMIR_GROUP', side: 'WOMEN', members: ['program_amir_w'] },
      { name: 'Social Media Group', type: 'SMALL_AMIR_GROUP', side: 'MEN', members: ['social_media_amir_m'] },
      { name: 'Social Media Group', type: 'SMALL_AMIR_GROUP', side: 'WOMEN', members: ['social_media_amir_w'] },
      { name: 'Public Channel', type: 'PUBLIC', side: 'MEN', members: MEN_USERS },
      { name: 'Public Channel', type: 'PUBLIC', side: 'WOMEN', members: WOMEN_USERS },
    ];

    for (const ct of CHATS) {
      const chat = await db.chat.create({
        data: { id: uuidv4(), name: ct.name, type: ct.type, side: ct.side, createdAt: new Date(), updatedAt: new Date() },
      });
      for (const uname of ct.members) {
        const u = allUsers[uname];
        if (u) {
          await db.chatMember.create({ data: { id: uuidv4(), chatId: chat.id, userId: u.id, joinedAt: new Date() } });
        }
      }
      console.log(`  Chat: ${ct.name} [${ct.side}]`);
    }
  } else {
    console.log(`  Chats already exist (${chatCount})`);
  }

  console.log('\nDone! Login: ustaz_jihad_m / 12345678');
  await db.$disconnect();
}

seed().catch(e => { console.error(e); process.exit(1); });