const { PrismaClient } = require('../prisma/v2-client');
const prisma = new PrismaClient();

async function main() {
    // Add product_id column
    try {
        await prisma.$executeRawUnsafe(`ALTER TABLE cashflow_tracker ADD COLUMN product_id INT NULL`);
        console.log('Added product_id');
    } catch (e) {
        if (e.message.includes('Duplicate column')) console.log('product_id already exists');
        else throw e;
    }

    // Add monthly_stretch_target column
    try {
        await prisma.$executeRawUnsafe(`ALTER TABLE cashflow_tracker ADD COLUMN monthly_stretch_target DECIMAL(15,2) NULL`);
        console.log('Added monthly_stretch_target');
    } catch (e) {
        if (e.message.includes('Duplicate column')) console.log('monthly_stretch_target already exists');
        else throw e;
    }

    // Add bant_poa_edc column
    try {
        await prisma.$executeRawUnsafe(`ALTER TABLE cashflow_tracker ADD COLUMN bant_poa_edc DATETIME(3) NULL`);
        console.log('Added bant_poa_edc');
    } catch (e) {
        if (e.message.includes('Duplicate column')) console.log('bant_poa_edc already exists');
        else throw e;
    }

    // Add FK for product_id
    try {
        await prisma.$executeRawUnsafe(`ALTER TABLE cashflow_tracker ADD CONSTRAINT cashflow_tracker_product_fkey FOREIGN KEY (product_id) REFERENCES Product(id) ON DELETE SET NULL ON UPDATE CASCADE`);
        console.log('Added product FK');
    } catch (e) {
        if (e.message.includes('Duplicate key')) console.log('product FK already exists');
        else console.log('FK warning (may already exist):', e.message);
    }

    console.log('Done.');
}

main().then(() => prisma.$disconnect()).catch(e => { console.error(e); prisma.$disconnect(); process.exit(1); });
