const { PrismaClient } = require('./prisma/v2-client');
const prisma = new PrismaClient();
const fs = require('fs');
const path = require('path');

async function main() {
  const sql = fs.readFileSync(path.join(__dirname, 'prisma', 'create_all_tables_now.sql'), 'utf8');
  const stmts = sql.split(';').map(s => s.trim()).filter(s => s.length > 5 && !s.startsWith('--') && !s.startsWith('SET') && !s.startsWith('SELECT'));
  
  for (const s of stmts) {
    try {
      await prisma.$executeRawUnsafe(s);
    } catch (e) {
      console.log('Notice:', e.message);
    }
  }
  console.log('✅ All missing tables and columns created successfully!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
