
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
    console.log('🔄 Starting Lead Update Fix Verification...');

    // 1. Get User & Token
    const user = await prisma.user.findFirst({ where: { email: 'sales1@crm.com' } });
    if (!user || !process.env.JWT_SECRET) {
        console.error('❌ User or JWT_SECRET not found.');
        return;
    }

    const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
    );

    // 2. Find a lead to update
    const lead = await prisma.lead.findFirst({ where: { lead_owner_id: user.id } });
    if (!lead) {
        console.error('❌ No lead found to update.');
        return;
    }
    console.log(`Found Lead ID: ${lead.id}`);

    // 3. Prepare Payload with FAULTY field (empty object)
    const payload = {
        first_name: "UpdatedName",
        pain_points_files: {},  // The culprit
        collaterals: ["2"] // Testing collaterals update too
    };

    console.log('📤 Sending Update Payload:', JSON.stringify(payload, null, 2));

    // 4. Send Request
    try {
        const response = await fetch(`http://localhost:5000/api/leads/${lead.id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        console.log(`\n📥 Response Status: ${response.status} ${response.statusText}`);

        if (response.status === 200) {
            console.log('✅ SUCCESS! Lead updated.');
            const json = await response.json();
            console.log('Updated Name:', json.first_name);
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
