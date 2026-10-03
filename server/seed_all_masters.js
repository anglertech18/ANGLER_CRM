const { PrismaClient } = require('./prisma/v2-client');
const prisma = new PrismaClient();
const fs = require('fs');
const path = require('path');

async function main() {
  console.log('🚀 Starting Production-Grade Master Data Seeding on Local Database...');

  // 1. Ensure Table `renewal_service_plan_master` exists
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS renewal_service_plan_master (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL UNIQUE,
      category_code VARCHAR(50) NULL DEFAULT 'SERVER',
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 2. Service Categories
  const categories = [
    { name: 'Domain Services', code: 'DOMAIN', color: '#6366f1', sort_order: 1 },
    { name: 'Hosting & Server', code: 'SERVER', color: '#3b82f6', sort_order: 2 },
    { name: 'Email Services', code: 'EMAIL', color: '#10b981', sort_order: 3 },
    { name: 'SSL Certificates', code: 'SSL', color: '#f59e0b', sort_order: 4 },
    { name: 'Annual Maintenance (AMC)', code: 'AMC', color: '#ec4899', sort_order: 5 },
    { name: 'Technical Support & Security', code: 'SUPPORT', color: '#8b5cf6', sort_order: 6 },
  ];

  const catMap = new Map();
  for (const c of categories) {
    let cat = await prisma.renewalServiceCategory.findFirst({ where: { code: c.code } });
    if (!cat) {
      cat = await prisma.renewalServiceCategory.create({
        data: { name: c.name, code: c.code, color: c.color, sort_order: c.sort_order, is_active: true }
      });
    }
    catMap.set(c.code, cat.id);
  }
  console.log('✅ Service Categories verified/seeded.');

  // 3. Service Masters
  const serviceMasters = [
    {
      name: 'Domain Renewal',
      catCode: 'DOMAIN',
      identifier_label: 'Domain Name',
      supports_quantity: false,
      supports_amc: false,
    },
    {
      name: 'Server Renewal',
      catCode: 'SERVER',
      identifier_label: 'Domain Name',
      supports_quantity: false,
      supports_amc: false,
    },
    {
      name: 'G Suite Email Server Renewal',
      catCode: 'EMAIL',
      identifier_label: 'Domain Name',
      supports_quantity: true, // No. of Users
      supports_amc: false,
    },
    {
      name: 'Office 365 Email Server Renewal',
      catCode: 'EMAIL',
      identifier_label: 'Domain Name',
      supports_quantity: true, // No. of Users
      supports_amc: false,
    },
    {
      name: 'SSL Renewal',
      catCode: 'SSL',
      identifier_label: 'Domain Name',
      supports_quantity: true, // No. of Users
      supports_amc: false,
    },
    {
      name: 'CMS Website AMC Renewal',
      catCode: 'AMC',
      identifier_label: 'Website URL',
      supports_quantity: false,
      supports_amc: true,
    },
    {
      name: 'Website Optimization and Security Services',
      catCode: 'SUPPORT',
      identifier_label: 'Website URL',
      supports_quantity: false,
      supports_amc: false,
    },
  ];

  for (const sm of serviceMasters) {
    const catId = catMap.get(sm.catCode);
    const existing = await prisma.renewalServiceMaster.findFirst({ where: { name: sm.name } });
    if (!existing) {
      await prisma.renewalServiceMaster.create({
        data: {
          name: sm.name,
          category_id: catId,
          identifier_label: sm.identifier_label,
          supports_quantity: sm.supports_quantity,
          supports_amc: sm.supports_amc,
          requires_identifier: true,
          is_active: true,
        }
      });
    } else {
      await prisma.renewalServiceMaster.update({
        where: { id: existing.id },
        data: {
          category_id: catId,
          identifier_label: sm.identifier_label,
          supports_quantity: sm.supports_quantity,
          supports_amc: sm.supports_amc,
        }
      });
    }
  }
  console.log('✅ Service Masters verified/seeded.');

  // 4. Server Service Plans (12 items)
  const servicePlans = [
    'Budget Starter Server',
    'Basic Server',
    'Basic Managed Wordpress Server',
    'Value Starter Server',
    'Value Special Server',
    'Business Server',
    'Cloud Startup Server',
    'Corporate Server',
    'Dedicated Server',
    'VPS Server',
    'VPS Windows Server',
    'Economy Server',
  ];

  for (const planName of servicePlans) {
    const existing = await prisma.renewalServicePlanMaster.findFirst({ where: { name: planName } });
    if (!existing) {
      await prisma.renewalServicePlanMaster.create({
        data: { name: planName, category_code: 'SERVER', is_active: true }
      });
    }
  }
  console.log('✅ Server Service Plans verified/seeded.');

  // 5. Providers & Sub-Items

  // 5a. Email Service Providers (Shiviom, Lease Packet, Zoho)
  const emailProviders = [
    {
      name: 'Shiviom',
      category: 'EMAIL',
      items: [
        { name: 'G Suite', type: 'EMAIL_SERVICE' },
        { name: 'Office 365', type: 'EMAIL_SERVICE' },
      ]
    },
    {
      name: 'Lease Packet',
      category: 'EMAIL',
      items: [
        { name: 'G Suite', type: 'EMAIL_SERVICE' },
        { name: 'Office 365', type: 'EMAIL_SERVICE' },
      ]
    },
    {
      name: 'Zoho',
      category: 'EMAIL',
      items: [
        { name: 'Zoho', type: 'EMAIL_SERVICE' },
      ]
    }
  ];

  // 5b. Domain Registrars (Godaddy, Only Domains, Network Solutions, Domgys, Google, Bigrock, Pair Domains)
  const domainRegistrars = [
    {
      name: 'Godaddy',
      category: 'DOMAIN',
      items: [
        { name: 'Angjandom9', type: 'DOMAIN_USER' },
        { name: 'duinkop', type: 'DOMAIN_USER' },
        { name: 'AndDomTrf9', type: 'DOMAIN_USER' },
        { name: 'it@lgbforge.com', type: 'DOMAIN_USER' },
        { name: 'chakradivers', type: 'DOMAIN_USER' },
        { name: 'skyfast', type: 'DOMAIN_USER' },
        { name: 'kalpakachemicals', type: 'DOMAIN_USER' },
        { name: 'cumar9', type: 'DOMAIN_USER' },
        { name: 'AngDom11', type: 'DOMAIN_USER' },
        { name: 'AngDom12', type: 'DOMAIN_USER' },
      ]
    },
    {
      name: 'Only Domains',
      category: 'DOMAIN',
      items: [
        { name: 'Angler', type: 'DOMAIN_USER' }
      ]
    },
    {
      name: 'Network Solutions',
      category: 'DOMAIN',
      items: [
        { name: 'lmwsclcn', type: 'DOMAIN_USER' },
        { name: 'ANGLERITECH', type: 'DOMAIN_USER' },
      ]
    },
    {
      name: 'Domgys',
      category: 'DOMAIN',
      items: [
        { name: 'domain@angleritech.com', type: 'DOMAIN_USER' }
      ]
    },
    {
      name: 'Google',
      category: 'DOMAIN',
      items: [
        { name: 'anglerdomain@gmail.com', type: 'DOMAIN_USER' }
      ]
    },
    {
      name: 'Bigrock',
      category: 'DOMAIN',
      items: [
        { name: 'domain@angleritech.com', type: 'DOMAIN_USER' },
        { name: 'accounts@angleritech.com', type: 'DOMAIN_USER' },
        { name: 'aet_ashwin@yahoo.com', type: 'DOMAIN_USER' },
      ]
    },
    {
      name: 'Pair Domains',
      category: 'DOMAIN',
      items: [
        { name: 'cumar9', type: 'DOMAIN_USER' },
        { name: 'jantang9', type: 'DOMAIN_USER' },
      ]
    }
  ];

  // 5c. Server Service Providers (Pair, Hostinger, Verio, Godaddy)
  const serverProviders = [
    {
      name: 'Pair',
      category: 'SERVER',
      items: [
        { name: 'Angler02', type: 'SERVER' },
        { name: 'Angler99', type: 'SERVER' },
        { name: 'Anglerdr', type: 'SERVER' },
        { name: 'rasivqs3', type: 'SERVER' },
        { name: 'ANGVPS11', type: 'SERVER' },
        { name: 'ANGVPS12', type: 'SERVER' },
        { name: 'ANGVPS13', type: 'SERVER' },
        { name: 'ANGVPS14', type: 'SERVER' },
        { name: 'ANGVPS15', type: 'SERVER' },
        { name: 'Pravang', type: 'SERVER' },
        { name: 'Injectoplast', type: 'SERVER' },
        { name: 'Revathi', type: 'SERVER' },
        { name: 'djmpc2', type: 'SERVER' },
        { name: 'turbods1', type: 'SERVER' },
        { name: 'angdedvmand97', type: 'SERVER' },
        { name: 'angwpp1', type: 'SERVER' },
        { name: 'vktpr9', type: 'SERVER' },
      ]
    },
    {
      name: 'Hostinger',
      category: 'SERVER',
      items: [
        { name: 'Single Web Hosting', type: 'SERVER' },
        { name: 'Business Web Hosting', type: 'SERVER' },
        { name: 'Cloud Startup', type: 'SERVER' },
        { name: 'KVM 1', type: 'SERVER' },
        { name: 'KVM 2', type: 'SERVER' },
        { name: 'KVM 4', type: 'SERVER' },
        { name: 'KVM 8', type: 'SERVER' },
      ]
    },
    {
      name: 'Verio',
      category: 'SERVER',
      items: [
        { name: 'Verio', type: 'SERVER' }
      ]
    },
    {
      name: 'Godaddy (Server)',
      category: 'SERVER',
      items: [
        { name: 'Ultimate Managed Wordpress', type: 'SERVER' },
        { name: 'Basic Managed Wordpress', type: 'SERVER' },
        { name: 'Web Hosting Deluxe', type: 'SERVER' },
      ]
    }
  ];

  const allProviders = [...emailProviders, ...domainRegistrars, ...serverProviders];

  for (const prov of allProviders) {
    let p = await prisma.renewalProvider.findFirst({ where: { name: prov.name } });
    if (!p) {
      p = await prisma.renewalProvider.create({
        data: { name: prov.name, category_code: prov.category, is_active: true }
      });
    } else {
      await prisma.renewalProvider.update({
        where: { id: p.id },
        data: { category_code: prov.category }
      });
    }

    for (const item of prov.items) {
      const existingSub = await prisma.renewalProviderSubItem.findFirst({
        where: { provider_id: p.id, name: item.name, type: item.type }
      });
      if (!existingSub) {
        await prisma.renewalProviderSubItem.create({
          data: { provider_id: p.id, name: item.name, type: item.type, is_active: true }
        });
      }
    }
  }

  console.log('✅ Providers & Sub-Items (Email, Domain Registrars, Server Names) verified/seeded.');

  console.log('🎉 Production Master Data Seeding completed successfully!');
}

main()
  .catch((e) => console.error('❌ Error during master seeding:', e))
  .finally(() => prisma.$disconnect());
