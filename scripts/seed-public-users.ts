import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function seed() {
  // Hash password
  const hash = await bcrypt.hash('12345678', 10)

  // Create Teacher
  const teacher = await prisma.user.upsert({
    where: { username: 'ustaz_jihad' },
    update: {},
    create: {
      username: 'ustaz_jihad',
      password: hash,
      displayName: 'Ustaz Jihad',
      role: 'TEACHER',
      side: 'MEN',
    },
  })
  await prisma.teacherProfile.upsert({
    where: { userId: teacher.id },
    update: { subject: 'Quran & Islamic Studies' },
    create: { userId: teacher.id, subject: 'Quran & Islamic Studies' },
  })

  // Create Student
  const student = await prisma.user.upsert({
    where: { username: 'student_ahmed' },
    update: {},
    create: {
      username: 'student_ahmed',
      password: hash,
      displayName: 'Ahmed Mohamed',
      role: 'STUDENT',
      side: 'MEN',
    },
  })
  await prisma.studentProfile.upsert({
    where: { userId: student.id },
    update: { grade: 'Level 3' },
    create: { userId: student.id, grade: 'Level 3' },
  })

  // Create Parent
  const parent = await prisma.user.upsert({
    where: { username: 'parent_mohamed' },
    update: {},
    create: {
      username: 'parent_mohamed',
      password: hash,
      displayName: 'Mohamed Ahmed',
      role: 'PARENT',
      side: 'MEN',
    },
  })
  await prisma.parentProfile.upsert({
    where: { userId: parent.id },
    update: {},
    create: { userId: parent.id },
  })

  // Link student to parent
  await prisma.studentProfile.update({
    where: { userId: student.id },
    data: { parentId: parent.id },
  })

  // Create a DM chat between teacher and parent
  const existingChat = await prisma.chat.findFirst({
    where: {
      type: 'DIRECT',
      members: {
        some: { userId: teacher.id },
      },
    },
    include: { members: true },
  })
  if (!existingChat || !existingChat.members.some(m => m.userId === parent.id)) {
    const chat = await prisma.chat.create({
      data: {
        name: 'Ustaz Jihad - Mohamed Ahmed',
        type: 'DIRECT',
        side: 'MEN',
        members: {
          create: [
            { userId: teacher.id },
            { userId: parent.id },
          ],
        },
      },
    })
    console.log('Created DM chat:', chat.id)
  }

  console.log('=== ACCOUNTS CREATED ===')
  console.log(`Teacher:  ustaz_jihad / 12345678`)
  console.log(`Student:  student_ahmed / 12345678`)
  console.log(`Parent:   parent_mohamed / 12345678`)
}

seed()
  .catch(console.error)
  .finally(() => prisma.$disconnect())