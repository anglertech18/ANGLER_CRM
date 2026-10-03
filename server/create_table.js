const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  try {
    const query = `
      CREATE TABLE IF NOT EXISTS \`BulkUploadStaging\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`user_id\` int NOT NULL,
        \`file_name\` varchar(191) DEFAULT NULL,
        \`original_row_data\` text NOT NULL,
        \`mapped_data\` text NOT NULL,
        \`has_validation_error\` tinyint(1) NOT NULL DEFAULT '0',
        \`error_message\` text,
        \`created_at\` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        PRIMARY KEY (\`id\`),
        KEY \`BulkUploadStaging_user_id_fkey\` (\`user_id\`),
        CONSTRAINT \`BulkUploadStaging_user_id_fkey\` FOREIGN KEY (\`user_id\`) REFERENCES \`User\` (\`id\`) ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;
    await prisma.$executeRawUnsafe(query);
    console.log("Table BulkUploadStaging created successfully!");
  } catch(e) {
    console.error("Error creating table:", e);
  } finally {
    await prisma.$disconnect();
  }
}
main();
