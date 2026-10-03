const fs = require('fs');
const path = require('path');

const prismaSchemaPath = path.join(__dirname, 'prisma', 'schema.prisma');
const sqlFilePath = path.join(__dirname, 'prisma', 'production_master_seed.sql');

const schemaContent = fs.readFileSync(prismaSchemaPath, 'utf8');
const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

const modelRegex = /model\s+(\w+)\s*\{([^}]+)\}/g;
let match;
const renewalModels = [];

while ((match = modelRegex.exec(schemaContent)) !== null) {
  const modelName = match[1];
  const modelBody = match[2];
  const mapMatch = modelBody.match(/@@map\("([^"]+)"\)/);
  const tableName = mapMatch ? mapMatch[1] : modelName.toLowerCase();
  
  if (modelName.startsWith('Renewal') || modelName.includes('Notification') || modelName.includes('Whatsapp') || modelName.includes('Cron') || modelName.includes('Smtp')) {
    renewalModels.push({ modelName, tableName });
  }
}

console.log(`🔍 Total Renewal & System Models Found: ${renewalModels.length}`);

const missing = [];
renewalModels.forEach(({ modelName, tableName }) => {
  const sqlCheck = new RegExp(`CREATE TABLE IF NOT EXISTS \`${tableName}\``, 'i');
  const existsInSql = sqlCheck.test(sqlContent);
  if (!existsInSql) {
    missing.push({ modelName, tableName });
  }
});

console.log('=== AUDIT RESULTS FOR RENEWAL & SYSTEM MODELS ===');
if (missing.length === 0) {
  console.log(`✅ 100% PERFECT AUDIT COVERAGE! All ${renewalModels.length} Renewal & System models are present in production_master_seed.sql!`);
} else {
  console.log(`⚠️ Missing ${missing.length} models:`);
  console.table(missing);
}
