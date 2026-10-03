
import { PrismaClient, Role, UserStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    const email = 'ceo@crm.com';
    const passwordHash = await bcrypt.hash('angler', 10);

    const admin = await prisma.user.upsert({
        where: { email },
        update: {
            password_hash: passwordHash,
            first_name: 'CEO',
            last_name: null,
            role: Role.CEO,
            status: UserStatus.ACTIVE,
            is_active: true,
        },
        create: {
            email,
            password_hash: passwordHash,
            first_name: 'CEO',
            role: Role.CEO,
            status: UserStatus.ACTIVE,
            is_active: true,
        },
    });

    // Grant full privileges across all modules
    const modules = ['Leads', 'Calls', 'Reports', 'Masters', 'Users', 'Dashboard'];
    for (const module of modules) {
        await prisma.privilege.upsert({
            where: { user_id_module_name: { user_id: admin.id, module_name: module } },
            update: { can_view: true, can_add: true, can_edit: true, can_delete: true },
            create: {
                user_id: admin.id,
                module_name: module,
                can_view: true,
                can_add: true,
                can_edit: true,
                can_delete: true,
            },
        });
    }

    console.log('Admin account ready:');
    console.log(`  Email:    ${admin.email}`);
    console.log(`  Password: angler`);
    console.log(`  Role:     ${admin.role}`);
    console.log(`  Status:   ${admin.status}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
