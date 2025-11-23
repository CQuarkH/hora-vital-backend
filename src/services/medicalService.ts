import prisma from "../db/prisma";

export const getAllSpecialties = async () => {
    return prisma.specialty.findMany({
        where: { isActive: true },
        select: {
            id: true,
            name: true,
            description: true,
        },
    });
};

export const getDoctors = async (specialtyId?: string) => {
    const whereClause: any = {
        isActive: true,
    };

    if (specialtyId) {
        whereClause.specialtyId = specialtyId;
    }

    return prisma.doctorProfile.findMany({
        where: whereClause,
        include: {
            user: {
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                },
            },
            specialty: {
                select: {
                    id: true,
                    name: true,
                },
            },
        },
    });
};