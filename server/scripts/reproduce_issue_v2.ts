
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
    console.log('🔄 Starting Lead Creation Fix Verification (Round 2)...');

    // 1. Get User & Token
    const user = await prisma.user.findFirst({ where: { email: 'sales1@crm.com' } });
    const sbu = await prisma.sBU.findFirst();

    if (!user || !process.env.JWT_SECRET || !sbu) {
        console.error('❌ User, SBU, or JWT_SECRET not found.');
        return;
    }

    const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
    );

    // 2. Prepare Payload with the FAULTY field (empty object)
    const payload = {
        first_name: "TestLeadFixed",
        last_name: "Verification",
        sales_sbu_id: String(sbu.id),
        lead_owner_id: String(user.id),
        email: "fixed.repro@example.com",

        // This was causing the crash
        pain_points_files: {},

        // Required fields per schema/validation
        budget_yes_no: "true",
        authority_yes_no: "true",
        need_yes_no: "true",
        timeline_yes_no: "true",
        telecalling_qualified: "true"
    };

    console.log('📤 Sending Payload with FAULTY field:', JSON.stringify(payload, null, 2));

    // 3. Send Request
    try {
        const response = await fetch('http://localhost:5000/api/leads', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        console.log(`\n📥 Response Status: ${response.status} ${response.statusText}`);

        if (response.status === 201) {
            console.log('✅ SUCCESS! Lead created despite bad payload.');
            const json = await response.json();
            console.log('Lead ID:', json.id);
        } else {
            console.log('❌ FAILED.');
            const text = await response.text();
            console.log('Response:', text);
        }

    } catch (error) {
        console.error('❌ Fetch Error:', error);
    }
}

main()
    .catch(console.error)
    .finally(async () => await prisma.$disconnect());
