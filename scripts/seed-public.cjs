const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function seed() {
  const hash = (pw) => bcrypt.hashSync(pw, 10);

  const teacher = await prisma.user.upsert({
    where: { username: 'ustaz_jihad' },
    update: {},
    create: {
      username: 'ustaz_jihad',
      password: hash('teacher123'),
      displayName: 'Ustaz Jihad',
      role: 'TEACHER',
      side: 'MEN',
    },
  });

  await prisma.teacherProfile.upsert({
    where: { userId: teacher.id },
    update: { subject: 'Quran & Islamic Studies' },
    create: { userId: teacher.id, subject: 'Quran & Islamic Studies' },
  });

  const student = await prisma.user.upsert({
    where: { username: 'ahmed_student' },
    update: {},
    create: {
      username: 'ahmed_student',
      password: hash('student123'),
      displayName: 'Ahmed Mohamed',
      role: 'STUDENT',
      side: 'MEN',
    },
  });

  await prisma.studentProfile.upsert({
    where: { userId: student.id },
    update: {},
    create: { userId: student.id, grade: 'Grade 5' },
  });

  const parent = await prisma.user.upsert({
    where: { username: 'mohamed_parent' },
    update: {},
    create: {
      username: 'mohamed_parent',
      password: hash('parent123'),
      displayName: 'Mohamed Ali',
      role: 'PARENT',
      side: 'MEN',
    },
  });

  await prisma.parentProfile.upsert({
    where: { userId: parent.id },
    update: { phone: '+251911234567' },
    create: { userId: parent.id, phone: '+251911234567' },
  });

  await prisma.studentProfile.update({
    where: { userId: student.id },
    data: { parentId: parent.id },
  });

  const chat = await prisma.chat.upsert({
    where: { id: 'teacher-parent-dm' },
    update: {},
    create: {
      id: 'teacher-parent-dm',
      name: 'Ustaz Jihad - Mohamed Ali',
      type: 'DIRECT',
      side: 'MEN',
    },
  });

  await prisma.chatMember.upsert({
    where: { chatId_userId: { chatId: chat.id, userId: teacher.id } },
    update: {},
    create: { chatId: chat.id, userId: teacher.id },
  });

  await prisma.chatMember.upsert({
    where: { chatId_userId: { chatId: chat.id, userId: parent.id } },
    update: {},
    create: { chatId: chat.id, userId: parent.id },
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  await prisma.testResult.create({
    data: {
      studentId: student.id,
      teacherId: teacher.id,
      title: 'Surah Al-Mulk Recitation',
      subject: 'Quran',
      score: 85,
      maxScore: 100,
      notes: 'Good memorization, minor pronunciation issues',
    },
  });

  await prisma.attendanceRecord.upsert({
    where: { studentId_date: { studentId: student.id, date: today } },
    update: {},
    create: { studentId: student.id, date: today, status: 'PRESENT' },
  });

  await prisma.dailyActivityRecord.upsert({
    where: { studentId_date_type: { studentId: student.id, date: today, type: 'REVISING' } },
    update: {},
    create: {
      studentId: student.id, date: today, type: 'REVISING',
      completed: true, notes: 'Revised Surah Al-Mulk verses 1-10',
    },
  });

  await prisma.dailyActivityRecord.upsert({
    where: { studentId_date_type: { studentId: student.id, date: today, type: 'READING' } },
    update: {},
    create: {
      studentId: student.id, date: today, type: 'READING', completed: false,
    },
  });

  await prisma.announcement.create({
    data: {
      title: 'Welcome to ASMYA Learning',
      content: 'Daily revision and reading sessions have started. Please ensure your child completes their daily revision tasks.',
      createdBy: teacher.id,
      side: 'MEN',
      isPublic: true,
    },
  });

  console.log('=== ASMYA Public Path Accounts ===');
  console.log('TEACHER  -> ustaz_jihad / teacher123');
  console.log('STUDENT  -> ahmed_student / student123');
  console.log('PARENT   -> mohamed_parent / parent123');
}

seed().catch(console.error).finally(() => prisma.$disconnect());