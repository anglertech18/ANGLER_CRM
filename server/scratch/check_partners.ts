import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const partners = await prisma.partner.findMany({
        include: { user: true }
    });
    console.log('Total Partners:', partners.length);
    partners.forEach(p => {
        console.log(`ID: ${p.id}, Company: ${p.partner_company}, Name: ${p.name}, Date: ${p.enquiry_interest_date}, User: ${p.user?.first_name} (ID: ${p.user_id})`);
    });
}

main().catch(console.error).finally(() => prisma.$disconnect());
