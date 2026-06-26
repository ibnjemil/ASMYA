const {PrismaClient}=require('@prisma/client');
const prisma=new PrismaClient();
(async()=>{
  const users=[
    {id:crypto.randomUUID(),username:'ustaz_jihad_m',password:'12345678',displayName:'Ustaz Jihad (Amir)',role:'SUPERIOR_AMIR',side:'MEN',createdAt:new Date(),updatedAt:new Date()},
    {id:crypto.randomUUID(),username:'ustaz_jihad',password:'12345678',displayName:'Ustaz Jihad (Teacher)',role:'TEACHER',side:'MEN',createdAt:new Date(),updatedAt:new Date()},
    {id:crypto.randomUUID(),username:'student_ahmed',password:'12345678',displayName:'Ahmed Student',role:'STUDENT',side:'MEN',createdAt:new Date(),updatedAt:new Date()},
    {id:crypto.randomUUID(),username:'parent_mohamed',password:'12345678',displayName:'Mohamed Parent',role:'PARENT',side:'MEN',createdAt:new Date(),updatedAt:new Date()},
  ];
  for(const u of users){
    const r=await prisma.user.upsert({where:{username:u.username},create:u,update:u});
    console.log('Created:',r.username,r.role);
  }
  const count=await prisma.user.count();
  console.log('Total users:',count);
  await prisma.\$disconnect();
})();
