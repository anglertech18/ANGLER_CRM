const { PrismaClient } = require('./prisma/custom-client');
const prisma = new PrismaClient();

async function test() {
    try {
        console.log("Enquiry fields:", Object.keys(prisma._dmmf.modelMap.Enquiry.fields.reduce((acc, f) => ({...acc, [f.name]: true}), {})));
    } catch (e) {
        console.error(e);
    }
    await prisma.$disconnect();
}
test();
