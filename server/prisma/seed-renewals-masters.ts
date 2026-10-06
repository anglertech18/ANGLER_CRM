const { prisma } = require('../src/lib/prisma');

async function main() {
  console.log("🌱 Seeding Renewal Categories and Service Masters...");

  // 1. Seed Categories
  const categories = [
    { name: 'Domain Services', code: 'DOMAIN', color: '#6366f1', sort_order: 1 },
    { name: 'Hosting & Server', code: 'SERVER', color: '#3b82f6', sort_order: 2 },
    { name: 'Email Services', code: 'EMAIL', color: '#10b981', sort_order: 3 },
    { name: 'SSL Certificates', code: 'SSL', color: '#f59e0b', sort_order: 4 },
    { name: 'Annual Maintenance (AMC)', code: 'AMC', color: '#ec4899', sort_order: 5 },
    { name: 'Technical Support & Security', code: 'SUPPORT', color: '#8b5cf6', sort_order: 6 },
  ];

  const categoryMap = new Map();

  for (const cat of categories) {
    const existing = await prisma.renewalServiceCategory.findFirst({
      where: { code: cat.code }
    });

    if (existing) {
      console.log(`  Category [${cat.code}] already exists.`);
      categoryMap.set(cat.code, existing.id);
    } else {
      const created = await prisma.renewalServiceCategory.create({
        data: {
          name: cat.name,
          code: cat.code,
          color: cat.color,
          sort_order: cat.sort_order,
          is_active: true
        }
      });
      console.log(`  Created Category [${cat.code}] (ID: ${created.id})`);
      categoryMap.set(cat.code, created.id);
    }
  }

  // 2. Seed Service Masters with Default Prices
  const serviceMasters = [
    {
      name: 'Domain Renewal',
      catCode: 'DOMAIN',
      identifier_label: 'Domain Name',
      supports_quantity: false,
      supports_amc: false,
      base_price: 1200,
      billing_unit: 'YEAR',
    },
    {
      name: 'Server Renewal',
      catCode: 'SERVER',
      identifier_label: 'Server Identifier / URL',
      supports_quantity: false,
      supports_amc: false,
      base_price: 15000,
      billing_unit: 'YEAR',
    },
    {
      name: 'G Suite Email Server Renewal',
      catCode: 'EMAIL',
      identifier_label: 'Domain Name',
      supports_quantity: true, // No. of Users
      supports_amc: false,
      base_price: 3600,
      billing_unit: 'YEAR',
    },
    {
      name: 'Office 365 Email Server Renewal',
      catCode: 'EMAIL',
      identifier_label: 'Domain Name',
      supports_quantity: true, // No. of Users
      supports_amc: false,
      base_price: 4200,
      billing_unit: 'YEAR',
    },
    {
      name: 'SSL Renewal',
      catCode: 'SSL',
      identifier_label: 'Domain Name',
      supports_quantity: true, // No. of Users/Servers
      supports_amc: false,
      base_price: 2500,
      billing_unit: 'YEAR',
    },
    {
      name: 'CMS Website AMC Renewal',
      catCode: 'AMC',
      identifier_label: 'Website URL',
      supports_quantity: false,
      supports_amc: true, // Annual Charges
      base_price: 25000,
      billing_unit: 'YEAR',
    },
    {
      name: 'Website Optimization and Security Services',
      catCode: 'SUPPORT',
      identifier_label: 'Website URL',
      supports_quantity: false,
      supports_amc: false,
      base_price: 12000,
      billing_unit: 'YEAR',
    }
  ];

  for (const svc of serviceMasters) {
    const catId = categoryMap.get(svc.catCode);
    if (!catId) {
      console.warn(`  Warning: Category ID not found for code ${svc.catCode}`);
      continue;
    }

    let targetSvc = await prisma.renewalServiceMaster.findFirst({
      where: { name: svc.name }
    });

    if (targetSvc) {
      console.log(`  Service Master [${svc.name}] already exists.`);
    } else {
      targetSvc = await prisma.renewalServiceMaster.create({
        data: {
          name: svc.name,
          category_id: catId,
          identifier_label: svc.identifier_label,
          requires_identifier: true,
          default_duration_value: 12,
          default_duration_unit: 'months',
          supports_quantity: svc.supports_quantity,
          supports_provider: true,
          supports_amc: svc.supports_amc,
          supports_support_package: false,
          is_active: true
        }
      });
      console.log(`  Created Service Master [${svc.name}]`);
    }

    // Seed default price for the service master if not exists
    const priceExists = await prisma.renewalServicePrice.findFirst({
      where: { service_master_id: targetSvc.id }
    });

    if (!priceExists) {
      await prisma.renewalServicePrice.create({
        data: {
          service_master_id: targetSvc.id,
          base_price: svc.base_price,
          billing_unit: svc.billing_unit,
          currency: 'INR',
          effective_from: new Date(),
          is_current: true,
        }
      });
      console.log(`  Added default price for [${svc.name}]: ₹${svc.base_price}/${svc.billing_unit}`);
    }
  }

  console.log("✅ Seeding of Categories, Service Masters, and Default Prices completed!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
