import { prisma } from '../lib/prisma';

async function main() {
  const companies = await prisma.company.findMany({
    where: {
      OR: [
        { name: { contains: 'ANGLER' } as any },
        { name: { contains: 'Trinetra' } as any },
      ],
    } as any,
    select: { id: true, name: true, order_form_template_id: true },
    orderBy: { id: 'asc' },
  });

  const templates = await (prisma as any).renewalNotificationTemplate.findMany({
    where: {
      is_active: true,
      OR: [
        { name: { contains: 'Order Form' } },
        { name: { contains: 'Trinetra' } },
        { name: { contains: 'FMS' } },
        { name: { contains: 'iWay' } },
        { category_code: 'FOLLOWUP' },
      ],
    },
    select: {
      id: true,
      name: true,
      category_code: true,
      channel: true,
      subject: true,
      brand_profile_id: true,
      is_published: true,
    },
    orderBy: { id: 'asc' },
  });

  const policies = await (prisma as any).renewalReminderPolicy.findMany({
    where: { is_active: true },
    include: {
      category: { select: { id: true, name: true, company_id: true } },
      steps: { orderBy: { step_number: 'asc' } },
    },
    orderBy: { id: 'asc' },
  });

  const trinetra = companies.find((company) => company.name === 'Trinetra');
  const serviceDefaults = trinetra
    ? await (prisma as any).renewalServiceMaster.findMany({
        where: { company_id: trinetra.id, is_active: true },
        select: {
          id: true,
          name: true,
          default_reminder_policy_id: true,
          default_policy: { select: { id: true, name: true } },
        },
        orderBy: { name: 'asc' },
      })
    : [];

  console.log(JSON.stringify({
    companies,
    templates,
    serviceDefaults,
    policies: policies.map((policy: any) => ({
      id: policy.id,
      name: policy.name,
      company_id: policy.company_id,
      is_default: policy.is_default,
      category: policy.category,
      service_category_id: policy.service_category_id,
      service_master_id: policy.service_master_id,
      steps: policy.steps.map((step: any) => ({
        step_number: step.step_number,
        offset_days: step.offset_days,
        action_type: step.action_type,
        channel: step.channel,
        recipient_type: step.recipient_type,
        template_id: step.template_id,
        attach_order_form: step.attach_order_form,
        is_enabled: step.is_enabled,
      })),
    })),
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
