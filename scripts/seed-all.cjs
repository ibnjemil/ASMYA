const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');
const db = new PrismaClient();

async function seed() {
  console.log('Seeding ASMYA database...');

  // ============ SEED AMIR USERS ============
  const MEN_USERS = [
    { username: 'ustaz_jihad_m', displayName: 'Ustaz Jihad', role: 'SUPERIOR_AMIR', side: 'MEN' },
    { username: 'vice_amir_m', displayName: 'Vice Amir', role: 'VICE_AMIR', side: 'MEN' },
    { username: 'secretary_m', displayName: 'Secretary', role: 'SECRETARY', side: 'MEN' },
    { username: 'education_amir_m', displayName: 'Education Amir', role: 'EDUCATION_AMIR', side: 'MEN' },
    { username: 'community_amir_m', displayName: 'Community Amir', role: 'COMMUNITY_AMIR', side: 'MEN' },
    { username: 'admin_amir_m', displayName: 'Admin Amir', role: 'ADMIN_AMIR', side: 'MEN' },
    { username: 'finance_amir_m', displayName: 'Finance Amir', role: 'FINANCE_AMIR', side: 'MEN' },
    { username: 'program_amir_m', displayName: 'Program Amir', role: 'PROGRAM_AMIR', side: 'MEN' },
    { username: 'social_media_amir_m', displayName: 'Social Media Amir', role: 'SOCIAL_MEDIA_AMIR', side: 'MEN' },
  ];

  const WOMEN_USERS = [
    { username: 'vice_amir_w', displayName: 'Vice Amirah', role: 'VICE_AMIR', side: 'WOMEN' },
    { username: 'secretary_w', displayName: 'Secretary Amirah', role: 'SECRETARY', side: 'WOMEN' },
    { username: 'education_amir_w', displayName: 'Education Amirah', role: 'EDUCATION_AMIR', side: 'WOMEN' },
    { username: 'community_amir_w', displayName: 'Community Amirah', role: 'COMMUNITY_AMIR', side: 'WOMEN' },
    { username: 'admin_amir_w', displayName: 'Admin Amirah', role: 'ADMIN_AMIR', side: 'WOMEN' },
    { username: 'finance_amir_w', displayName: 'Finance Amirah', role: 'FINANCE_AMIR', side: 'WOMEN' },
    { username: 'program_amir_w', displayName: 'Program Amirah', role: 'PROGRAM_AMIR', side: 'WOMEN' },
    { username: 'social_media_amir_w', displayName: 'Social Media Amirah', role: 'SOCIAL_MEDIA_AMIR', side: 'WOMEN' },
  ];

  const createdUsers = new Map();

  for (const u of [...MEN_USERS, ...WOMEN_USERS]) {
    const user = await db.user.create({
      data: {
        id: uuidv4(),
        username: u.username,
        displayName: u.displayName,
        password: '12345678',
        role: u.role,
        side: u.side,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    createdUsers.set(u.username, user.id);
    console.log(`  Created: ${u.username} (${u.role})`);
  }

  // ============ SEED TEACHER/STUDENT/PARENT ============
  const teacherId = uuidv4();
  const teacher = await db.user.create({
    data: {
      id: teacherId,
      username: 'ustaz_jihad',
      displayName: 'Ustaz Jihad',
      password: '12345678',
      role: 'TEACHER',
      side: 'MEN',
      createdAt: new Date(),
      updatedAt: new Date(),
      teacherProfile: { create: { id: uuidv4(), subject: 'Quran & Islamic Studies' } },
    },
  });
  createdUsers.set('ustaz_jihad', teacher.id);

  const student1Id = uuidv4();
  const student1 = await db.user.create({
    data: {
      id: student1Id,
      username: 'student_ahmed',
      displayName: 'Ahmed Mohamed',
      password: '12345678',
      role: 'STUDENT',
      side: 'MEN',
      createdAt: new Date(),
      updatedAt: new Date(),
      studentProfile: { create: { id: uuidv4(), grade: 'Level 3' } },
    },
  });
  createdUsers.set('student_ahmed', student1.id);

  const student2Id = uuidv4();
  const student2 = await db.user.create({
    data: {
      id: student2Id,
      username: 'student_yusuf',
      displayName: 'Yusuf Ibrahim',
      password: '12345678',
      role: 'STUDENT',
      side: 'MEN',
      createdAt: new Date(),
      updatedAt: new Date(),
      studentProfile: { create: { id: uuidv4(), grade: 'Level 2' } },
    },
  });
  createdUsers.set('student_yusuf', student2.id);

  const parentId = uuidv4();
  const parent = await db.user.create({
    data: {
      id: parentId,
      username: 'parent_mohamed',
      displayName: 'Mohamed Ahmed',
      password: '12345678',
      role: 'PARENT',
      side: 'MEN',
      createdAt: new Date(),
      updatedAt: new Date(),
      parentProfile: { create: { id: uuidv4() } },
    },
  });
  createdUsers.set('parent_mohamed', parent.id);

  // Link students to parent
  await db.studentProfile.update({
    where: { userId: student1Id },
    data: { parentId: parentId },
  });
  await db.studentProfile.update({
    where: { userId: student2Id },
    data: { parentId: parentId },
  });

  console.log('  Created: ustaz_jihad (TEACHER)');
  console.log('  Created: student_ahmed (STUDENT)');
  console.log('  Created: student_yusuf (STUDENT)');
  console.log('  Created: parent_mohamed (PARENT)');

  // ============ SEED CHAT ROOMS ============
  const CHAT_TEMPLATES = [
    { name: 'Nine Amir Council', type: 'NINE_AMIR', side: 'MEN' },
    { name: 'Nine Amir Council', type: 'NINE_AMIR', side: 'WOMEN' },
    { name: 'Three Main Amirs', type: 'THREE_MAIN', side: 'MEN' },
    { name: 'Three Main Amirs', type: 'THREE_MAIN', side: 'WOMEN' },
    { name: 'Education Group', type: 'SUB_AMIR_GROUP', side: 'MEN', roleFilter: 'EDUCATION_AMIR' },
    { name: 'Education Group', type: 'SUB_AMIR_GROUP', side: 'WOMEN', roleFilter: 'EDUCATION_AMIR' },
    { name: 'Community Group', type: 'SUB_AMIR_GROUP', side: 'MEN', roleFilter: 'COMMUNITY_AMIR' },
    { name: 'Community Group', type: 'SUB_AMIR_GROUP', side: 'WOMEN', roleFilter: 'COMMUNITY_AMIR' },
    { name: 'Admin Group', type: 'SUB_AMIR_GROUP', side: 'MEN', roleFilter: 'ADMIN_AMIR' },
    { name: 'Admin Group', type: 'SUB_AMIR_GROUP', side: 'WOMEN', roleFilter: 'ADMIN_AMIR' },
    { name: 'Finance Group', type: 'SMALL_AMIR_GROUP', side: 'MEN', roleFilter: 'FINANCE_AMIR' },
    { name: 'Finance Group', type: 'SMALL_AMIR_GROUP', side: 'WOMEN', roleFilter: 'FINANCE_AMIR' },
    { name: 'Program Group', type: 'SMALL_AMIR_GROUP', side: 'MEN', roleFilter: 'PROGRAM_AMIR' },
    { name: 'Program Group', type: 'SMALL_AMIR_GROUP', side: 'WOMEN', roleFilter: 'PROGRAM_AMIR' },
    { name: 'Social Media Group', type: 'SMALL_AMIR_GROUP', side: 'MEN', roleFilter: 'SOCIAL_MEDIA_AMIR' },
    { name: 'Social Media Group', type: 'SMALL_AMIR_GROUP', side: 'WOMEN', roleFilter: 'SOCIAL_MEDIA_AMIR' },
    { name: 'Public Channel', type: 'PUBLIC', side: 'MEN' },
    { name: 'Public Channel', type: 'PUBLIC', side: 'WOMEN' },
  ];

  for (const ct of CHAT_TEMPLATES) {
    const chat = await db.chat.create({
      data: {
        id: uuidv4(),
        name: ct.name,
        type: ct.type,
        side: ct.side,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Determine members
    const memberIds = [];
    if (ct.type === 'NINE_AMIR') {
      const list = ct.side === 'MEN' ? MEN_USERS : WOMEN_USERS;
      for (const u of list) { const id = createdUsers.get(u.username); if (id) memberIds.push(id); }
      if (ct.side === 'WOMEN') { const id = createdUsers.get('ustaz_jihad_m'); if (id) memberIds.push(id); }
    } else if (ct.type === 'THREE_MAIN') {
      const unames = ct.side === 'MEN'
        ? ['ustaz_jihad_m', 'vice_amir_m', 'secretary_m']
        : ['vice_amir_w', 'secretary_w', 'ustaz_jihad_m'];
      for (const n of unames) { const id = createdUsers.get(n); if (id) memberIds.push(id); }
    } else {
      const list = ct.side === 'MEN' ? MEN_USERS : WOMEN_USERS;
      for (const u of list) { if (u.role === ct.roleFilter) { const id = createdUsers.get(u.username); if (id) memberIds.push(id); } }
    }

    for (const uid of memberIds) {
      await db.chatMember.create({
        data: { chatId: chat.id, userId: uid, joinedAt: new Date() },
      });
    }
    console.log(`  Chat: ${ct.name} [${ct.side}] - ${memberIds.length} members`);
  }

  console.log('\n=== Seeding Complete ===');
  console.log(`Total users: ${createdUsers.size}`);
  console.log(`Total chats: ${CHAT_TEMPLATES.length}`);
  console.log('\nLogin credentials (all passwords: 12345678):');
  console.log('  Superior Amir: ustaz_jihad_m / 12345678');
  console.log('  Vice Amir (Men): vice_amir_m / 12345678');
  console.log('  Teacher: ustaz_jihad / 12345678');
  console.log('  Student: student_ahmed / 12345678');
  console.log('  Parent: parent_mohamed / 12345678');

  await db.$disconnect();
}

seed().catch((e) => { console.error('Seed error:', e); process.exit(1); });