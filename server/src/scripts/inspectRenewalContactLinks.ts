import { PrismaClient } from '../../prisma/v2-client';

const prisma = new PrismaClient();

async function main() {
  const triggers = await prisma.$queryRawUnsafe<any[]>(
    `SELECT TRIGGER_NAME, EVENT_OBJECT_TABLE, ACTION_TIMING, EVENT_MANIPULATION, ACTION_STATEMENT
     FROM INFORMATION_SCHEMA.TRIGGERS
     WHERE TRIGGER_SCHEMA = DATABASE()
       AND EVENT_OBJECT_TABLE IN ('renewal_account', 'renewal_account_contact', 'renewal_contact')`
  );

  const recentLinks = await prisma.$queryRawUnsafe<any[]>(
    `SELECT ra.id AS account_id, ra.order_number, ra.created_at, rac.contact_id, rc.client_company_id, rc.name, rc.email, rc.mobile
     FROM renewal_account ra
     JOIN renewal_account_contact rac ON rac.renewal_account_id = ra.id
     JOIN renewal_contact rc ON rc.id = rac.contact_id
     WHERE ra.order_number LIKE 'ANG-VERIFY-%'
        OR ra.order_number LIKE 'TRN-VERIFY-%'
        OR ra.order_number LIKE 'ANG-NEW-VERIFY-%'
     ORDER BY ra.id DESC, rac.contact_id ASC
     LIMIT 60`
  );
  const accountContactIndexes = await prisma.$queryRawUnsafe<any[]>(
    `SHOW INDEX FROM renewal_account_contact`
  );

  console.log('Triggers');
  console.dir(triggers, { depth: null });
  console.log('\nRecent verification links');
  console.dir(recentLinks, { depth: null });
  console.log('\nrenewal_account_contact indexes');
  console.dir(accountContactIndexes, { depth: null });
}

main()
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
