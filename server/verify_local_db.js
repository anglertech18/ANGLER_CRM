const { execSync } = require('child_process');

// Use Prisma to connect to local DB and run verification queries
process.env.DATABASE_URL = 'mysql://root:@127.0.0.1:3306/kannan_angler_crm_v1';

const { PrismaClient } = require('./prisma/v2-client');
const prisma = new PrismaClient();

async function verifyLocalDB() {
  console.log('\n========================================');
  console.log('  ANGLER CRM - LOCAL DB AUDIT REPORT');
  console.log('========================================\n');

  try {
    // 1. Check all renewal tables exist via raw query
    const tables = await prisma.$queryRaw`
      SELECT TABLE_NAME, TABLE_ROWS, DATA_LENGTH, CREATE_TIME
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = 'kannan_angler_crm_v1' AND TABLE_NAME LIKE 'renewal%'
      ORDER BY TABLE_NAME;
    `;
    console.log('📋 RENEWAL TABLES FOUND:');
    console.table(tables);

    // 2. Verify bulk-upload critical lookup tables have data
    const checks = [
      { label: 'renewal_service_category', query: prisma.$queryRaw`SELECT COUNT(*) as count FROM renewal_service_category` },
      { label: 'renewal_service_master', query: prisma.$queryRaw`SELECT COUNT(*) as count FROM renewal_service_master` },
      { label: 'renewal_provider', query: prisma.$queryRaw`SELECT COUNT(*) as count FROM renewal_provider` },
      { label: 'renewal_provider_sub_item', query: prisma.$queryRaw`SELECT COUNT(*) as count FROM renewal_provider_sub_item` },
      { label: 'renewal_reminder_policy', query: prisma.$queryRaw`SELECT COUNT(*) as count FROM renewal_reminder_policy` },
    ];

    console.log('\n📊 MASTER DATA COUNTS:');
    for (const c of checks) {
      try {
        const result = await c.query;
        console.log(`  ✅ ${c.label}: ${result[0].count} records`);
      } catch (e) {
        console.log(`  ❌ ${c.label}: TABLE MISSING or ERROR - ${e.message}`);
      }
    }

    // 3. Verify renewal_provider_sub_item has no duplicates
    const dupes = await prisma.$queryRaw`
      SELECT provider_id, name, COUNT(*) as cnt
      FROM renewal_provider_sub_item
      GROUP BY provider_id, name
      HAVING cnt > 1;
    `;
    if (dupes.length === 0) {
      console.log('\n✅ renewal_provider_sub_item: NO DUPLICATES');
    } else {
      console.log('\n⚠️  renewal_provider_sub_item DUPLICATES FOUND:');
      console.table(dupes);
    }

    // 4. Check columns on renewal_service_instance (for bulk upload fields)
    const instanceCols = await prisma.$queryRaw`
      SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = 'kannan_angler_crm_v1' AND TABLE_NAME = 'renewal_service_instance'
      ORDER BY ORDINAL_POSITION;
    `;
    console.log('\n📋 renewal_service_instance COLUMNS:');
    console.table(instanceCols);

    // 5. Check columns on renewal_cycle
    const cycleCols = await prisma.$queryRaw`
      SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = 'kannan_angler_crm_v1' AND TABLE_NAME = 'renewal_cycle'
      ORDER BY ORDINAL_POSITION;
    `;
    console.log('\n📋 renewal_cycle COLUMNS:');
    console.table(cycleCols);

    // 6. Check columns on renewal_account
    const accountCols = await prisma.$queryRaw`
      SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = 'kannan_angler_crm_v1' AND TABLE_NAME = 'renewal_account'
      ORDER BY ORDINAL_POSITION;
    `;
    console.log('\n📋 renewal_account COLUMNS:');
    console.table(accountCols);

    // 7. Check renewal_contact columns
    const contactCols = await prisma.$queryRaw`
      SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = 'kannan_angler_crm_v1' AND TABLE_NAME = 'renewal_contact'
      ORDER BY ORDINAL_POSITION;
    `;
    console.log('\n📋 renewal_contact COLUMNS:');
    console.table(contactCols);

    // 8. Check client_company table exists
    try {
      const clientCos = await prisma.$queryRaw`SELECT COUNT(*) as count FROM client_company`;
      console.log(`\n✅ client_company: ${clientCos[0].count} records`);
    } catch (e) {
      console.log(`\n❌ client_company TABLE MISSING: ${e.message}`);
    }

    // 9. Check unique constraint on renewal_provider_sub_item
    const uniqueKeys = await prisma.$queryRaw`
      SELECT CONSTRAINT_NAME, CONSTRAINT_TYPE
      FROM information_schema.TABLE_CONSTRAINTS
      WHERE TABLE_SCHEMA = 'kannan_angler_crm_v1'
        AND TABLE_NAME = 'renewal_provider_sub_item'
        AND CONSTRAINT_TYPE IN ('UNIQUE', 'PRIMARY KEY');
    `;
    console.log('\n🔑 renewal_provider_sub_item CONSTRAINTS:');
    console.table(uniqueKeys);

    // 10. Show sample provider sub items
    const sampleSubItems = await prisma.$queryRaw`
      SELECT p.name as provider_name, psi.name as sub_item_name, psi.type
      FROM renewal_provider_sub_item psi
      JOIN renewal_provider p ON p.id = psi.provider_id
      ORDER BY p.name, psi.name
      LIMIT 20;
    `;
    console.log('\n🔍 SAMPLE PROVIDER SUB-ITEMS (up to 20):');
    console.table(sampleSubItems);

    console.log('\n========================================');
    console.log('  AUDIT COMPLETE');
    console.log('========================================\n');
  } catch (err) {
    console.error('❌ AUDIT FAILED:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

verifyLocalDB();
