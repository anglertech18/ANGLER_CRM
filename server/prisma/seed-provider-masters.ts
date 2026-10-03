import { prisma } from '../src/lib/prisma';

export async function seedProviderMasters() {
  console.log('🌱 Seeding Provider, Server, Domain, Email & Service Plan masters from Excel reference...');

  // 1. Server Providers & Server Names
  const serverProviders = [
    {
      name: 'Pair',
      servers: [
        'Angler02', 'Angler99', 'Anglerdr', 'rasivqs3',
        'ANGVPS11', 'ANGVPS12', 'ANGVPS13', 'ANGVPS14', 'ANGVPS15',
        'Pravang', 'Injectoplast', 'Revathi', 'djmpc2', 'turbods1',
        'angdedvmand97', 'angwpp1', 'vktpr9'
      ]
    },
    {
      name: 'Hostinger',
      servers: [
        'Single Web Hosting', 'Business Web Hosting', 'Cloud Startup',
        'KVM 1', 'KVM 2', 'KVM 4', 'KVM 8'
      ]
    },
    {
      name: 'Verio',
      servers: ['Verio']
    },
    {
      name: 'GoDaddy',
      servers: ['Ultimate Managed Wordpress', 'Basic Managed Wordpress', 'Web Hosting Deluxe']
    }
  ];

  for (const prov of serverProviders) {
    let p = await (prisma as any).renewalProvider.findFirst({ where: { name: prov.name } });
    if (!p) {
      p = await (prisma as any).renewalProvider.create({
        data: { name: prov.name, is_active: true }
      });
    }

    for (const serverName of prov.servers) {
      const existing = await (prisma as any).renewalProviderSubItem.findFirst({
        where: { provider_id: p.id, name: serverName }
      });
      if (!existing) {
        await (prisma as any).renewalProviderSubItem.create({
          data: { provider_id: p.id, name: serverName, type: 'SERVER', is_active: true }
        });
      }
    }
    console.log(`  ✓ Server Provider: ${prov.name} (${prov.servers.length} servers/plans)`);
  }

  // 2. Domain Registrars & Account Usernames
  const domainRegistrars = [
    {
      name: 'GoDaddy (Domains)',
      accounts: [
        'Angjandom9', 'duinkop', 'AndDomTrf9', 'it@lgbforge.com',
        'chakradivers', 'skyfast', 'kalpakachemicals', 'cumar9',
        'AngDom11', 'AngDom12'
      ]
    },
    {
      name: 'Only Domains',
      accounts: ['Angler']
    },
    {
      name: 'Network Solutions',
      accounts: ['Imwsclcn', 'ANGLERITECH']
    },
    {
      name: 'Domgys',
      accounts: ['domain@angleritech.com']
    },
    {
      name: 'Google Domains',
      accounts: ['anglerdomain@gmail.com']
    },
    {
      name: 'BigRock',
      accounts: ['domain@angleritech.com', 'accounts@angleritech.com', 'aet_ashwin@yahoo.com']
    },
    {
      name: 'Pair Domains',
      accounts: ['cumar9', 'jantang9']
    }
  ];

  for (const reg of domainRegistrars) {
    let p = await (prisma as any).renewalProvider.findFirst({ where: { name: reg.name } });
    if (!p) {
      p = await (prisma as any).renewalProvider.create({
        data: { name: reg.name, is_active: true }
      });
    }

    for (const accName of reg.accounts) {
      const existing = await (prisma as any).renewalProviderSubItem.findFirst({
        where: { provider_id: p.id, name: accName }
      });
      if (!existing) {
        await (prisma as any).renewalProviderSubItem.create({
          data: { provider_id: p.id, name: accName, type: 'DOMAIN_USER', is_active: true }
        });
      }
    }
    console.log(`  ✓ Domain Registrar: ${reg.name} (${reg.accounts.length} accounts)`);
  }

  // 3. Email Service Providers & Email Services
  const emailProviders = [
    {
      name: 'Shiviom',
      services: ['G Suite', 'Office 365']
    },
    {
      name: 'Lease Packet',
      services: ['G Suite', 'Office 365']
    },
    {
      name: 'Zoho Email',
      services: ['Zoho']
    }
  ];

  for (const ep of emailProviders) {
    let p = await (prisma as any).renewalProvider.findFirst({ where: { name: ep.name } });
    if (!p) {
      p = await (prisma as any).renewalProvider.create({
        data: { name: ep.name, is_active: true }
      });
    }

    for (const svcName of ep.services) {
      const existing = await (prisma as any).renewalProviderSubItem.findFirst({
        where: { provider_id: p.id, name: svcName }
      });
      if (!existing) {
        await (prisma as any).renewalProviderSubItem.create({
          data: { provider_id: p.id, name: svcName, type: 'EMAIL_SERVICE', is_active: true }
        });
      }
    }
    console.log(`  ✓ Email Provider: ${ep.name} (${ep.services.length} services)`);
  }

  // 4. Service Plans Master
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
    'Economy Server'
  ];

  for (const planName of servicePlans) {
    const existing = await (prisma as any).renewalServicePlanMaster.findFirst({ where: { name: planName } });
    if (!existing) {
      await (prisma as any).renewalServicePlanMaster.create({
        data: { name: planName, category_code: 'SERVER', is_active: true }
      });
    }
  }
  console.log(`  ✓ Service Plans: Seeded ${servicePlans.length} plans`);

  console.log('✅ Provider & Service Plan Master seeding complete!');
}

if (require.main === module) {
  seedProviderMasters()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
}
