
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    // 1. Check if user exists
    const email = 'sales1@crm.com';
    const password = 'password123'; // Seeded password

    console.log(`🔍 Checking user: ${email}`);
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
        console.error('❌ User not found in DB!');
        return;
    }
    console.log(`✅ User found. Active? ${user.is_active}`);
    console.log(`🔑 Stored Hash: ${user.password_hash.substring(0, 10)}...`);

    // 2. Test Password Match
    const isMatch = await bcrypt.compare(password, user.password_hash);
    console.log(`🔐 Password '${password}' match result: ${isMatch}`);

    if (isMatch) {
        console.log('✅ Login SHOULD succeed.');
    } else {
        console.error('❌ Password Mismatch! Seeded data might be wrong or corrupted.');
    }

    // 3. Test API Login (mimic curl)
    try {
        const response = await fetch('http://localhost:5000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        console.log(`\n📡 API Login Status: ${response.status}`);
        const data = await response.json();
        console.log('📡 API Data:', data);
    } catch (e) {
        console.error('❌ API Fetch Failed:', e);
    }
}

main()
    .catch(console.error)
    .finally(async () => await prisma.$disconnect());
