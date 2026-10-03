const { PrismaClient } = require('./prisma/v2-client');
const prisma = new PrismaClient();

async function main() {
  console.log('🏦 Safely adding bank fields to renewal_brand_profile...');

  const STATEMENTS = [
    `ALTER TABLE renewal_brand_profile ADD COLUMN IF NOT EXISTS bank_name VARCHAR(200) NULL;`,
    `ALTER TABLE renewal_brand_profile ADD COLUMN IF NOT EXISTS bank_account_no VARCHAR(100) NULL;`,
    `ALTER TABLE renewal_brand_profile ADD COLUMN IF NOT EXISTS bank_branch VARCHAR(200) NULL;`,
    `ALTER TABLE renewal_brand_profile ADD COLUMN IF NOT EXISTS bank_ifsc VARCHAR(50) NULL;`,
    `ALTER TABLE renewal_brand_profile ADD COLUMN IF NOT EXISTS bank_account_name VARCHAR(200) NULL;`
  ];

  for (const sql of STATEMENTS) {
    try {
      await prisma.$executeRawUnsafe(sql);
    } catch (err) {
      console.log('Notice:', err.message);
    }
  }

  console.log('✅ Bank fields added safely to local database!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
