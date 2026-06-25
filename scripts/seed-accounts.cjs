const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function seed() {
  console.log('Seeding accounts...');

  // 1. Create Teacher (Ustaz)
  const teacher = await db.user.upsert({
    where: { username: 'ustaz_jihad' },
    update: {},
    create: {
      username: 'ustaz_jihad',
      password: '12345678',
      displayName: 'Ustaz Jihad',
      role: 'TEACHER',
      side: 'MEN',
      teacherProfile: { create: { subject: 'Quran & Islamic Studies' } },
    },
    include: { teacherProfile: true },
  });
  console.log('Teacher created:', teacher.username, teacher.id);

  // 2. Create Student (created by teacher)
  const student = await db.user.upsert({
    where: { username: 'student_ahmed' },
    update: {},
    create: {
      username: 'student_ahmed',
      password: '12345678',
      displayName: 'Ahmed Mohamed',
      role: 'STUDENT',
      side: 'MEN',
      studentProfile: { create: { grade: 'Level 3' } },
    },
    include: { studentProfile: true },
  });
  console.log('Student created:', student.username, student.id);

  // 3. Create Parent (linked to student)
  const parent = await db.user.upsert({
    where: { username: 'parent_mohamed' },
    update: {},
    create: {
      username: 'parent_mohamed',
      password: '12345678',
      displayName: 'Mohamed Ahmed',
      role: 'PARENT',
      side: 'MEN',
      parentProfile: { create: {} },
    },
    include: { parentProfile: true },
  });

  // Link student to parent
  await db.studentProfile.update({
    where: { userId: student.id },
    data: { parentId: parent.id },
  });
  console.log('Parent created:', parent.username, parent.id, '(child:', student.displayName, ')');

  // 4. Create a second student for more data
  const student2 = await db.user.upsert({
    where: { username: 'student_yusuf' },
    update: {},
    create: {
      username: 'student_yusuf',
      password: '12345678',
      displayName: 'Yusuf Ibrahim',
      role: 'STUDENT',
      side: 'MEN',
      studentProfile: { create: { grade: 'Level 2' } },
    },
    include: { studentProfile: true },
  });

  // Link second student to same parent
  await db.studentProfile.update({
    where: { userId: student2.id },
    data: { parentId: parent.id },
  });
  console.log('Student2 created:', student2.username, student2.id);

  console.log('\nAll accounts seeded!');
  console.log('---');
  console.log('Teacher: ustaz_jihad / 12345678');
  console.log('Student: student_ahmed / 12345678');
  console.log('Student: student_yusuf / 12345678');
  console.log('Parent:  parent_mohamed / 12345678');

  await db.$disconnect();
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});