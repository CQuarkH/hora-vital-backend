// scripts/createAdmin.ts
import prisma from '../src/db/prisma';
import bcrypt from 'bcrypt';

async function main(){
  const hashed = await bcrypt.hash('Admin1234', 12);
  const user = await prisma.user.create({
    data: {
      name: 'Admin Inicial',
      email: 'admin@example.com',
      password: hashed,
      role: 'ADMIN',
      isActive: true,
    }
  });
  console.log('Admin creado:', user);
  await prisma.$disconnect();
}
main().catch(e => { console.error(e); prisma.$disconnect(); process.exit(1); });
