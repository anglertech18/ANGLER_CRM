import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function configureServiceMasters() {
  console.log('Starting Service Master configuration...');

  // Get all service masters
  const serviceMasters = await prisma.renewalServiceMaster.findMany({
    where: { is_active: true }
  });

  console.log(`Found ${serviceMasters.length} active service masters`);

  // Configure ANGLER service masters (show all technical fields)
  const anglerServices = serviceMasters.filter(s => 
    s.name.toLowerCase().includes('domain') || 
    s.name.toLowerCase().includes('server') ||
    s.name.toLowerCase().includes('email') ||
    s.name.toLowerCase().includes('ssl') ||
    s.name.toLowerCase().includes('hosting')
  );

  console.log(`Configuring ${anglerServices.length} ANGLER service masters...`);

  for (const service of anglerServices) {
    await prisma.renewalServiceMaster.update({
      where: { id: service.id },
      data: {
        supports_provider: true,
        requires_provider: false,
        supports_server_name: true,
        requires_server_name: false,
        supports_plan_name: true,
        requires_plan_name: false,
        supports_login_username: true,
        requires_login_username: false,
        supports_quantity: true,
        requires_quantity: false,
        quantity_label: 'No. of Email IDs'
      }
    });
    console.log(`✓ Configured ANGLER: ${service.name}`);
  }

  // Configure TRINETRA service masters (hide technical fields, use quantity)
  const trinetraServices = serviceMasters.filter(s => 
    s.name.toLowerCase().includes('fms') || 
    s.name.toLowerCase().includes('vehicle') ||
    s.name.toLowerCase().includes('tracking') ||
    s.name.toLowerCase().includes('camera') ||
    s.name.toLowerCase().includes('gps')
  );

  console.log(`Configuring ${trinetraServices.length} TRINETRA service masters...`);

  for (const service of trinetraServices) {
    await prisma.renewalServiceMaster.update({
      where: { id: service.id },
      data: {
        supports_provider: false,
        requires_provider: false,
        supports_server_name: false,
        requires_server_name: false,
        supports_plan_name: false,
        requires_plan_name: false,
        supports_login_username: false,
        requires_login_username: false,
        supports_quantity: true,
        requires_quantity: true,
        quantity_label: 'No. of Vehicles'
      }
    });
    console.log(`✓ Configured TRINETRA: ${service.name}`);
  }

  // Configure camera services for TRINETRA
  const cameraServices = serviceMasters.filter(s => 
    s.name.toLowerCase().includes('camera') || 
    s.name.toLowerCase().includes('cctv')
  );

  console.log(`Configuring ${cameraServices.length} Camera service masters...`);

  for (const service of cameraServices) {
    await prisma.renewalServiceMaster.update({
      where: { id: service.id },
      data: {
        supports_provider: false,
        requires_provider: false,
        supports_server_name: false,
        requires_server_name: false,
        supports_plan_name: false,
        requires_plan_name: false,
        supports_login_username: false,
        requires_login_username: false,
        supports_quantity: true,
        requires_quantity: true,
        quantity_label: 'No. of Cameras'
      }
    });
    console.log(`✓ Configured Camera: ${service.name}`);
  }

  console.log('Service Master configuration completed!');
}

configureServiceMasters()
  .catch((e) => {
    console.error('Error configuring service masters:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
