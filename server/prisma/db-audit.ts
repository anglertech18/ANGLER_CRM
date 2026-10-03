import { PrismaClient } from './v2-client';
const p = new PrismaClient();

async function main() {
  const [cc, ra, rsi, rc, rr, ret, no, co, cont, pay, docs, audit] = await Promise.all([
    p.clientCompany.count(),
    p.renewalAccount.count(),
    p.renewalServiceInstance.count(),
    p.renewalCycle.count(),
    p.renewalReminder.count(),
    (p as any).renewalNotificationTemplate.count(),
    p.notificationOutbox.count(),
    p.company.count(),
    (p as any).renewalContact.count(),
    p.renewalPayment.count(),
    p.renewalDocument.count(),
    p.renewalAuditLog.count(),
  ]);
  console.log('=== DB AUDIT ===');
  console.log('ClientCompany    :', cc);
  console.log('RenewalAccount   :', ra);
  console.log('ServiceInstance  :', rsi);
  console.log('RenewalCycle     :', rc);
  console.log('RenewalReminder  :', rr);
  console.log('Notif Template   :', ret);
  console.log('NotifOutbox      :', no);
  console.log('Company(internal):', co);
  console.log('RenewalContact   :', cont);
  console.log('RenewalPayment   :', pay);
  console.log('RenewalDocument  :', docs);
  console.log('AuditLog         :', audit);

  const templates = await (p as any).renewalNotificationTemplate.findMany({
    select: { id: true, name: true, subject: true, channel: true }
  });
  console.log('\n=== TEMPLATES ===');
  templates.forEach((t: any) => console.log(` [${t.id}] ${t.name} | ${t.channel} | ${t.subject}`));

  const sampleOutbox = await p.notificationOutbox.findFirst({
    select: { id: true, subject: true, recipient_name: true, recipient: true, status: true, rendered_body: true }
  });
  if (sampleOutbox) {
    console.log('\n=== SAMPLE OUTBOX ENTRY ===');
    console.log('Status:', sampleOutbox.status);
    console.log('To:', sampleOutbox.recipient_name, '<' + sampleOutbox.recipient + '>');
    console.log('Subject:', sampleOutbox.subject);
    console.log('Body preview (first 200 chars):', (sampleOutbox.rendered_body || '').slice(0, 200));
  }

  await p.$disconnect();
}

main().catch(e => { console.error(e.message); process.exit(1); });
