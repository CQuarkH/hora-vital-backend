import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
    console.log("Seeding database...");

    // 1. Specialties
    const specialties = [
        { name: "Medicina General", description: "Atención primaria" },
        { name: "Cardiología", description: "Corazón y sistema circulatorio" },
        { name: "Pediatría", description: "Atención de niños" },
        { name: "Dermatología", description: "Piel" },
    ];

    for (const s of specialties) {
        await prisma.specialty.upsert({
            where: { name: s.name },
            update: {},
            create: s,
        });
    }
    console.log("Specialties seeded.");

    // 2. Doctors
    const hashedPassword = await bcrypt.hash("password123", 10);

    const doctors = [
        {
            firstName: "María",
            lastName: "Rodríguez",
            email: "maria.rodriguez@hospital.com",
            rut: "10.000.001-1",
            specialty: "Medicina General",
        },
        {
            firstName: "Luis",
            lastName: "Torres",
            email: "luis.torres@hospital.com",
            rut: "10.000.001-2",
            specialty: "Medicina General",
        },
        {
            firstName: "Carlos",
            lastName: "Mendoza",
            email: "carlos.mendoza@hospital.com",
            rut: "10.000.002-2",
            specialty: "Cardiología",
        },
        {
            firstName: "Ana",
            lastName: "Silva",
            email: "ana.silva@hospital.com",
            rut: "10.000.003-3",
            specialty: "Pediatría",
        },
        {
            firstName: "Roberto",
            lastName: "Gómez",
            email: "roberto.gomez@hospital.com",
            rut: "10.000.003-4",
            specialty: "Pediatría",
        },
        {
            firstName: "Laura",
            lastName: "Gómez",
            email: "laura.gomez@hospital.com",
            rut: "10.000.004-4",
            specialty: "Dermatología",
        },
        {
            firstName: "Patricia",
            lastName: "Díaz",
            email: "patricia.diaz@hospital.com",
            rut: "10.000.004-5",
            specialty: "Dermatología",
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
                role: "DOCTOR",
            },
        });

        const specialty = await prisma.specialty.findUnique({
            where: { name: d.specialty },
        });

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

            for (let day = 1; day <= 5; day++) {
                await prisma.schedule.createMany({
                    data: [
                        {
                            doctorProfileId: doctorProfile.id,
                            dayOfWeek: day,
                            startTime: "09:00",
                            endTime: "13:00",
                            slotDuration: 30,
                        },
                        {
                            doctorProfileId: doctorProfile.id,
                            dayOfWeek: day,
                            startTime: "14:00",
                            endTime: "18:00",
                            slotDuration: 30,
                        },
                    ],
                    skipDuplicates: true,
                });
            }
        }
    }
    console.log("Doctors seeded.");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });