import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedRenewalData() {
  console.log('Starting Renewal Module data seeding...');

  // Create Service Categories
  console.log('Creating Service Categories...');
  const domainCategory = await prisma.renewalServiceCategory.upsert({
    where: { id: 1 },
    update: {},
    create: {
      name: 'Domain Services',
      code: 'DOMAIN',
      is_active: true
    }
  });

  const serverCategory = await prisma.renewalServiceCategory.upsert({
    where: { id: 2 },
    update: {},
    create: {
      name: 'Server Services',
      code: 'SERVER',
      is_active: true
    }
  });

  const emailCategory = await prisma.renewalServiceCategory.upsert({
    where: { id: 3 },
    update: {},
    create: {
      name: 'Email Services',
      code: 'EMAIL',
      is_active: true
    }
  });

  const vehicleCategory = await prisma.renewalServiceCategory.upsert({
    where: { id: 4 },
    update: {},
    create: {
      name: 'Vehicle Tracking',
      code: 'VEHICLE',
      is_active: true
    }
  });

  const cameraCategory = await prisma.renewalServiceCategory.upsert({
    where: { id: 5 },
    update: {},
    create: {
      name: 'Camera Systems',
      code: 'CAMERA',
      is_active: true
    }
  });

  console.log('✓ Created Service Categories');

  // Create ANGLER Service Masters (with technical fields)
  console.log('Creating ANGLER Service Masters...');
  const domainService = await prisma.renewalServiceMaster.upsert({
    where: { id: 1 },
    update: {},
    create: {
      name: 'Domain Renewal',
      identifier_label: 'Domain Name',
      is_active: true,
      category_id: domainCategory.id,
      sort_order: 1,
      supports_provider: true,
      requires_provider: false,
      supports_server_name: false,
      requires_server_name: false,
      supports_plan_name: true,
      requires_plan_name: false,
      supports_login_username: true,
      requires_login_username: false,
      supports_quantity: true,
      requires_quantity: false,
      quantity_label: 'No. of Years'
    }
  });

  const serverService = await prisma.renewalServiceMaster.upsert({
    where: { id: 2 },
    update: {},
    create: {
      name: 'Server Hosting',
      identifier_label: 'Server Name/IP',
      is_active: true,
      category_id: serverCategory.id,
      sort_order: 2,
      supports_provider: true,
      requires_provider: true,
      supports_server_name: true,
      requires_server_name: true,
      supports_plan_name: true,
      requires_plan_name: false,
      supports_login_username: true,
      requires_login_username: false,
      supports_quantity: true,
      requires_quantity: false,
      quantity_label: 'No. of CPU Cores'
    }
  });

  const emailService = await prisma.renewalServiceMaster.upsert({
    where: { id: 3 },
    update: {},
    create: {
      name: 'Email Hosting',
      identifier_label: 'Email Domain',
      is_active: true,
      category_id: emailCategory.id,
      sort_order: 3,
      supports_provider: true,
      requires_provider: false,
      supports_server_name: false,
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

  console.log('✓ Created ANGLER Service Masters');

  // Create TRINETRA Service Masters (without technical fields)
  console.log('Creating TRINETRA Service Masters...');
  const fmsService = await prisma.renewalServiceMaster.upsert({
    where: { id: 4 },
    update: {},
    create: {
      name: 'FMS / Vehicle Tracking',
      identifier_label: 'FMS ID',
      is_active: true,
      category_id: vehicleCategory.id,
      sort_order: 4,
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

  const cameraService = await prisma.renewalServiceMaster.upsert({
    where: { id: 5 },
    update: {},
    create: {
      name: 'Camera/CCTV System',
      identifier_label: 'Camera System ID',
      is_active: true,
      category_id: cameraCategory.id,
      sort_order: 5,
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

  console.log('✓ Created TRINETRA Service Masters');

  // Create Providers
  console.log('Creating Providers...');
  const godaddy = await prisma.renewalProvider.upsert({
    where: { id: 1 },
    update: {},
    create: {
      name: 'GoDaddy',
      is_active: true
    }
  });

  const aws = await prisma.renewalProvider.upsert({
    where: { id: 2 },
    update: {},
    create: {
      name: 'AWS',
      is_active: true
    }
  });

  const google = await prisma.renewalProvider.upsert({
    where: { id: 3 },
    update: {},
    create: {
      name: 'Google Workspace',
      is_active: true
    }
  });

  console.log('✓ Created Providers');

  // Create Service Plans
  console.log('Creating Service Plans...');
  await prisma.renewalServicePlanMaster.upsert({
    where: { id: 1 },
    update: {},
    create: {
      name: 'Basic Domain Plan',
      is_active: true,
      category_code: 'DOMAIN'
    }
  });

  await prisma.renewalServicePlanMaster.upsert({
    where: { id: 2 },
    update: {},
    create: {
      name: 'Premium Domain Plan',
      is_active: true,
      category_code: 'DOMAIN'
    }
  });

  await prisma.renewalServicePlanMaster.upsert({
    where: { id: 3 },
    update: {},
    create: {
      name: 'Basic Server Plan',
      is_active: true,
      category_code: 'SERVER'
    }
  });

  await prisma.renewalServicePlanMaster.upsert({
    where: { id: 4 },
    update: {},
    create: {
      name: 'Enterprise Server Plan',
      is_active: true,
      category_code: 'SERVER'
    }
  });

  console.log('✓ Created Service Plans');

  // Create Reminder Policies
  console.log('Creating Reminder Policies...');
  const domainPolicy = await prisma.renewalReminderPolicy.upsert({
    where: { id: 1 },
    update: {},
    create: {
      name: 'Domain Default',
      is_active: true,
      is_default: true
    }
  });

  const trinetraPolicy = await prisma.renewalReminderPolicy.upsert({
    where: { id: 2 },
    update: {},
    create: {
      name: 'Trinetra Default',
      is_active: true,
      is_default: true
    }
  });

  console.log('✓ Created Reminder Policies');

  // Update Service Masters with default policies
  console.log('Updating Service Masters with default policies...');
  await prisma.renewalServiceMaster.updateMany({
    where: { id: { in: [1, 2, 3] } },
    data: { default_reminder_policy_id: domainPolicy.id }
  });

  await prisma.renewalServiceMaster.updateMany({
    where: { id: { in: [4, 5] } },
    data: { default_reminder_policy_id: trinetraPolicy.id }
  });

  console.log('✓ Updated Service Masters with default policies');

  console.log('Renewal Module data seeding completed successfully!');
}

seedRenewalData()
  .catch((e) => {
    console.error('Error seeding renewal data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
