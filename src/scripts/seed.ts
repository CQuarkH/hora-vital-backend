import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Iniciando seed de la base de datos...');

    const saltRounds = 10;
    const defaultPassword = 'Password123!';
    const hashedPassword = await bcrypt.hash(defaultPassword, saltRounds);

    // 1. ESPECIALIDADES
    console.log('📋 Creando especialidades...');
    const specialties = [
        { name: 'Medicina General', description: 'Atención primaria' },
        { name: 'Cardiología', description: 'Corazón y sistema circulatorio' },
        { name: 'Pediatría', description: 'Atención de niños' },
        { name: 'Dermatología', description: 'Piel' },
    ];

    const createdSpecialties: Record<string, any> = {};
    for (const s of specialties) {
        const specialty = await prisma.specialty.upsert({
            where: { name: s.name },
            update: {},
            create: s,
        });
        createdSpecialties[s.name] = specialty;
    }
    console.log('✅ Especialidades creadas');

    // 2. USUARIOS ADMINISTRATIVOS
    console.log('👥 Creando usuarios administrativos...');

    // Admin
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
    console.log('  ✓ Admin creado:', admin.email);

    // Secretaria
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
    console.log('  ✓ Secretaria creada:', secretary.email);

    // 3 PACIENTES DE PRUEBA
    console.log('🏥 Creando pacientes de prueba...');

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
    console.log('  ✓ Paciente creado:', patient.email);

    // 4. DOCTORES (solo datos para agendar)
    console.log('👨‍⚕️ Creando doctores...');

    const doctors = [
        {
            firstName: 'María',
            lastName: 'Rodríguez',
            email: 'maria.rodriguez@hospital.com',
            rut: '10.000.001-1',
            specialty: 'Medicina General',
        },
        {
            firstName: 'Luis',
            lastName: 'Torres',
            email: 'luis.torres@hospital.com',
            rut: '10.000.001-2',
            specialty: 'Medicina General',
        },
        {
            firstName: 'Carlos',
            lastName: 'Mendoza',
            email: 'carlos.mendoza@hospital.com',
            rut: '10.000.002-2',
            specialty: 'Cardiología',
        },
        {
            firstName: 'Ana',
            lastName: 'Silva',
            email: 'ana.silva@hospital.com',
            rut: '10.000.003-3',
            specialty: 'Pediatría',
        },
        {
            firstName: 'Roberto',
            lastName: 'Gómez',
            email: 'roberto.gomez@hospital.com',
            rut: '10.000.003-4',
            specialty: 'Pediatría',
        },
        {
            firstName: 'Laura',
            lastName: 'Gómez',
            email: 'laura.gomez@hospital.com',
            rut: '10.000.004-4',
            specialty: 'Dermatología',
        },
        {
            firstName: 'Patricia',
            lastName: 'Díaz',
            email: 'patricia.diaz@hospital.com',
            rut: '10.000.004-5',
            specialty: 'Dermatología',
        },
    ];

    for (const d of doctors) {
        const user = await prisma.user.upsert({
            where: { email: d.email },
            update: {},
            create: {
                firstName: d.firstName,
                lastName: d.lastName,
                email: d.email,
                rut: d.rut,
                password: hashedPassword,
                role: Role.DOCTOR,
            },
        });

        const specialty = createdSpecialties[d.specialty];
        if (specialty) {
            const doctorProfile = await prisma.doctorProfile.upsert({
                where: { userId: user.id },
                update: {},
                create: {
                    userId: user.id,
                    specialtyId: specialty.id,
                    licenseNumber: `LIC-${d.rut}`,
                },
            });

            // Crear horarios (Lunes a Viernes)
            for (let day = 1; day <= 5; day++) {
                await prisma.schedule.createMany({
                    data: [
                        {
                            doctorProfileId: doctorProfile.id,
                            dayOfWeek: day,
                            startTime: '09:00',
                            endTime: '13:00',
                            slotDuration: 30,
                        },
                        {
                            doctorProfileId: doctorProfile.id,
                            dayOfWeek: day,
                            startTime: '14:00',
                            endTime: '18:00',
                            slotDuration: 30,
                        },
                    ],
                    skipDuplicates: true,
                });
            }
            console.log(`  ✓ Doctor creado: ${d.firstName} ${d.lastName} (${d.specialty})`);
        }
    }

    console.log('\n✨ Seed completado exitosamente!\n');
    console.log('📝 Credenciales de acceso:');
    console.log('  Admin:      admin@horavital.cl / Password123!');
    console.log('  Secretaria: secretaria@horavital.cl / Password123!');
    console.log('  Paciente:   paciente@horavital.cl / Password123!');
    console.log('\n⚠️  Los doctores son solo datos en la BD (no tienen dashboard)');
}

main()
    .catch((e) => {
        console.error('❌ Error en seed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });