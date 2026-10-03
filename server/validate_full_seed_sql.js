const fs = require('fs');
const path = require('path');

const prismaSchemaPath = path.join(__dirname, 'prisma', 'schema.prisma');
const sqlFilePath = path.join(__dirname, 'prisma', 'production_master_seed.sql');

const schemaContent = fs.readFileSync(prismaSchemaPath, 'utf8');
const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

console.log('=== AUDITING PRODUCTION MASTER SEED SQL AGAINST PRISMA SCHEMA ===\n');

// Extract models mapping to table names
const modelBlockRegex = /model\s+(\w+)\s*\{([\s\S]*?)\n\}/g;
let match;
const schemaModels = {};

while ((match = modelBlockRegex.exec(schemaContent)) !== null) {
  const modelName = match[1];
  const body = match[2];
  
  const mapMatch = body.match(/@@map\("([^"]+)"\)/);
  const tableName = mapMatch ? mapMatch[1] : modelName.toLowerCase();
  
  // Extract fields
  const fields = [];
  const lines = body.split('\n');
  for (let line of lines) {
    line = line.trim();
    if (!line || line.startsWith('//') || line.startsWith('@@')) continue;
    const fieldMatch = line.match(/^(\w+)\s+(\w+(\?|\[\])?)/);
    if (fieldMatch) {
      const fieldName = fieldMatch[1];
      const fieldType = fieldMatch[2];
      // Skip relation fields
      if (!['String', 'Int', 'Float', 'Decimal', 'Boolean', 'DateTime', 'Json', 'BigInt'].includes(fieldType.replace('?', ''))) {
        continue;
      }
      fields.push(fieldName);
    }
  }
  
  schemaModels[tableName] = { modelName, fields };
}

// Find all CREATE TABLE in SQL
const createTableRegex = /CREATE TABLE IF NOT EXISTS `([^`]+)`\s*\(([\s\S]*?)\)\s*ENGINE/gi;
const sqlTables = {};
let createMatch;

while ((createMatch = createTableRegex.exec(sqlContent)) !== null) {
  const tableName = createMatch[1];
  const tableBody = createMatch[2];
  
  const cols = [];
  const colLines = tableBody.split('\n');
  for (let line of colLines) {
    line = line.trim();
    const colMatch = line.match(/^`([^`]+)`/);
    if (colMatch) {
      cols.push(colMatch[1]);
    }
  }
  sqlTables[tableName] = cols;
}

// Find all ALTER TABLE ADD COLUMN in SQL
const alterColRegex = /ALTER TABLE `?(\w+)`?\s+ADD COLUMN IF NOT EXISTS `?(\w+)`?/gi;
let alterMatch;
while ((alterMatch = alterColRegex.exec(sqlContent)) !== null) {
  const tableName = alterMatch[1];
  const colName = alterMatch[2];
  if (!sqlTables[tableName]) {
    sqlTables[tableName] = [];
  }
  if (!sqlTables[tableName].includes(colName)) {
    sqlTables[tableName].push(colName);
  }
}

// Check coverage for all renewal tables
const renewalTables = Object.keys(schemaModels).filter(t => 
  t.startsWith('renewal') || 
  t.includes('notification') || 
  t.includes('whatsapp') || 
  t.includes('cron') || 
  t.includes('smtp')
);

console.log(`Checking ${renewalTables.length} Renewal & System Tables...\n`);

let missingCount = 0;
renewalTables.forEach(tableName => {
  const modelInfo = schemaModels[tableName];
  const sqlCols = sqlTables[tableName] || [];
  const missingCols = [];
  
  modelInfo.fields.forEach(f => {
    if (!sqlCols.includes(f)) {
      missingCols.push(f);
    }
  });
  
  if (!sqlTables[tableName]) {
    console.log(`❌ Table missing completely: \`${tableName}\``);
    missingCount++;
  } else if (missingCols.length > 0) {
    console.log(`⚠️ Table \`${tableName}\` is missing columns: ${missingCols.join(', ')}`);
    missingCount++;
  } else {
    console.log(`✅ Table \`${tableName}\` (Model: ${modelInfo.modelName}): 100% Complete (${modelInfo.fields.length} columns matched)`);
  }
});

console.log(`\nAudit Complete! Total Table/Column Discrepancies: ${missingCount}`);
