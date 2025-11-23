import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    const saltRounds = 10;
    const password = 'Password123!';
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // 1. Admin
    const admin = await prisma.user.upsert({
        where: { email: 'admin@horavital.cl' },
        update: {},
        create: {
            firstName: 'Admin',
            lastName: 'Principal',
            rut: '11.111.111-1',
            email: 'admin@horavital.cl',
            password: hashedPassword,
            role: Role.ADMIN,
            phone: '+56911111111',
        },
    });
    console.log({ admin });

    // 2. Secretary
    const secretary = await prisma.user.upsert({
        where: { email: 'secretaria@horavital.cl' },
        update: {},
        create: {
            firstName: 'Maria',
            lastName: 'Secretaria',
            rut: '22.222.222-2',
            email: 'secretaria@horavital.cl',
            password: hashedPassword,
            role: Role.SECRETARY,
            phone: '+56922222222',
        },
    });
    console.log({ secretary });

    // 3. Patient
    const patient = await prisma.user.upsert({
        where: { email: 'paciente@horavital.cl' },
        update: {},
        create: {
            firstName: 'Juan',
            lastName: 'Paciente',
            rut: '33.333.333-3',
            email: 'paciente@horavital.cl',
            password: hashedPassword,
            role: Role.PATIENT,
            phone: '+56933333333',
            birthDate: new Date('1990-01-01'),
            gender: 'Masculino',
            address: 'Calle Falsa 123',
        },
    });
    console.log({ patient });
}
main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
