import { prisma } from '../lib/prisma';
import { generateOrderFormPDF } from '../utils/orderFormPdfGenerator';

async function main() {
  const accounts = await (prisma as any).renewalAccount.findMany({
    where: { company_id: { in: [2, 3] }, is_active: true },
    select: {
      id: true,
      company_id: true,
      order_number: true,
      client_company: { select: { name: true } },
      company: { select: { name: true, order_form_template_id: true } },
    },
    orderBy: { id: 'asc' },
    take: 50,
  });

  const angler = accounts.find((account: any) => account.company_id === 3);
  const trinetra = accounts.find((account: any) => account.company_id === 2);
  if (!angler) throw new Error('Need one ANGLER renewal account to generate proof PDF');
  if (!trinetra) throw new Error('Need one Trinetra renewal account to generate proof PDF');

  const anglerPdf = await generateOrderFormPDF(angler.id);
  const trinetraPdf = await generateOrderFormPDF(trinetra.id);

  console.log(JSON.stringify({
    angler: { account: angler, pdf: anglerPdf },
    trinetra: { account: trinetra, pdf: trinetraPdf },
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
