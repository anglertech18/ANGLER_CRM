
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
    console.log('🔄 Starting Lead Creation Reproduction...');

    // 1. Get User
    const user = await prisma.user.findFirst({
        where: { email: 'sales1@crm.com' }
    });

    if (!user) {
        console.error('❌ User sales1@crm.com not found. Seed the DB first.');
        return;
    }

    console.log(`✅ Found user: ${user.email} (ID: ${user.id})`);

    // 2. Generate Token
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        console.error('❌ JWT_SECRET not found in environment.');
        return;
    }

    const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        secret,
        { expiresIn: '1h' }
    );
    console.log('✅ Generated JWT Token');

    // 3. Prepare Payload (Full payload mimicking LeadForm)
    const payload = {
        first_name: "TestLead",
        last_name: "Reproduction",
        sales_sbu_id: user.sbu_id ? String(user.sbu_id) : "1", // Send as string like frontend
        lead_owner_id: String(user.id),
        company_name: "Test Corp Reproduction",
        email: "test.repro@example.com",
        mobile_number: "1234567890",

        // Scores (Simulate strings from frontend)
        reduce_cost_score: "2",
        efficiency_score: "0",
        automation_score: "0",
        compliance_score: "0",

        // BANT
        budget_yes_no: "true",
        authority_yes_no: "true",
        need_yes_no: "true",
        timeline_yes_no: "true",

        // Contacts
        contacts: JSON.stringify([
            { name: "Contact One", email: "c1@example.com", designation: "Manager" }
        ]),

        // Boolean fields
        telecalling_qualified: "true"
    };

    console.log('📤 Sending Payload:', JSON.stringify(payload, null, 2));

    // 4. Send Request
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

        const text = await response.text();
        try {
            const json = JSON.parse(text);
            console.log('📥 Response Body:', JSON.stringify(json, null, 2));
        } catch (e) {
            console.log('📥 Response Body (Text):', text);
        }

    } catch (error) {
        console.error('❌ Fetch Error:', error);
    }
}

main()
    .catch(console.error)
    .finally(async () => await prisma.$disconnect());
