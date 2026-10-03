const { PrismaClient } = require('./prisma/custom-client');
const prisma = new PrismaClient();

async function test() {
    try {
        const dmmf = require('./prisma/custom-client').Prisma.dmmf;
        const createInput = dmmf.schema.inputObjectTypes.prisma.find(t => t.name === 'EnquiryCreateInput');
        console.log(createInput.fields.map(f => f.name));
    } catch (e) {
        console.error(e.message);
    }
}
test();
