import { prisma } from '../src/lib/prisma';

async function main() {
    const partners = await prisma.partner.findMany({
        include: { user: true }
    });
    console.log('Total Partners:', partners.length);
    partners.forEach(p => {
        console.log(`ID: ${p.id}, Company: ${p.partner_company}, Name: ${p.name}, User: ${p.user?.first_name} (ID: ${p.user_id})`);
    });
}

main().catch(console.error).finally(() => prisma.$disconnect());
