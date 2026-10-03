import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function updatePasswords() {
    try {
        const newPassword = 'angler@crm';
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        const usersToUpdate = [
            'selvam@angleritech.com',
            'asha@angleritech.com'
        ];

        for (const email of usersToUpdate) {
            const user = await prisma.user.findUnique({
                where: { email }
            });

            if (user) {
                await prisma.user.update({
                    where: { email },
                    data: {
                        password_hash: hashedPassword,
                        is_active: true  // Ensure account is active
                    }
                });
                console.log(`✓ Password updated successfully for ${email}`);
            } else {
                console.log(`✗ User not found: ${email}`);
            }
        }

        console.log('\n✓ Password update completed!');
        console.log(`New password for both users: ${newPassword}`);
    } catch (error) {
        console.error('Error updating passwords:', error);
    } finally {
        await prisma.$disconnect();
    }
}

updatePasswords();
