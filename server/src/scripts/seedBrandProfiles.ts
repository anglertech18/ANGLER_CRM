import { prisma } from '../lib/prisma';

/**
 * Seed default RenewalBrandProfile rows for ANGLER and TRINETRA parent companies.
 * Called at server startup. Safe to run repeatedly — uses upsert-style logic.
 *
 * Brand profiles drive:
 *  - Order Form PDF company name, website, email, primary colour
 *  - Email template sender name / footer
 *  - Bank payment details shown on Order Form
 */
export async function seedBrandProfiles() {
  try {
    // ── Find parent companies by name ─────────────────────────────────────────
    const exactAnglerCompany = await (prisma as any).company.findFirst({
      where: { name: 'ANGLER', is_active: true },
      select: { id: true, name: true }
    });
    const anglerCompany = exactAnglerCompany || await (prisma as any).company.findFirst({
      where: { name: { contains: 'ANGLER' }, is_active: true },
      select: { id: true, name: true },
      orderBy: { id: 'desc' }
    });

    const exactTrinetraCompany = await (prisma as any).company.findFirst({
      where: { name: 'Trinetra', is_active: true },
      select: { id: true, name: true }
    });
    const trinetraCompany = exactTrinetraCompany || await (prisma as any).company.findFirst({
      where: { name: { contains: 'Trinetra' }, is_active: true },
      select: { id: true, name: true },
      orderBy: { id: 'desc' }
    });

    // ── ANGLER brand profile ─────────────────────────────────────────────────
    const anglerProfile = {
      profile_name: 'ANGLER Default',
      company_name: 'ANGLER Technologies India Pvt Ltd.,',
      primary_color: '#074388',
      secondary_color: '#0ea5e9',
      sender_name: 'ANGLER Renewals Team',
      sender_email: 'support@angleritech.com',
      reply_to_email: 'support@angleritech.com',
      phone: '+91 422 4390777',
      website_url: 'www.angleritech.com',
      bank_name: 'HDFC Bank',
      bank_account_no: '50200040391593',
      bank_branch: 'Coimbatore Main Branch',
      bank_ifsc: 'HDFC0000483',
      bank_account_name: 'ANGLER Technologies India Pvt Ltd',
      email_footer: 'ANGLER Technologies India Pvt Ltd., | No. 34/2, Mettupalayam Road, Coimbatore - 641 043 | +91 422 4390777',
      is_default: true,
      is_active: true,
    };

    // ── TRINETRA brand profile ───────────────────────────────────────────────
    const trinetraProfile = {
      profile_name: 'Trinetra Default',
      company_name: 'Trinetra Wireless Solutions Pvt Ltd.,',
      primary_color: '#1E3A8A',
      secondary_color: '#3B82F6',
      sender_name: 'Trinetra Renewals Team',
      sender_email: 'support@trinetrawireless.com',
      reply_to_email: 'support@trinetrawireless.com',
      phone: '+91 422 4390888',
      website_url: 'www.trinetrawireless.com',
      bank_name: 'HDFC Bank',
      bank_account_no: '50200040391594',
      bank_branch: 'Coimbatore Main Branch',
      bank_ifsc: 'HDFC0000483',
      bank_account_name: 'Trinetra Wireless Solutions Pvt Ltd',
      email_footer: 'Trinetra Wireless Solutions Pvt Ltd., | No. 34/2, Mettupalayam Road, Coimbatore - 641 043 | +91 422 4390888',
      is_default: true,
      is_active: true,
    };

    // ── Upsert ANGLER profile ────────────────────────────────────────────────
    const existingAngler = await (prisma as any).renewalBrandProfile.findFirst({
      where: { profile_name: 'ANGLER Default' }
    });

    if (existingAngler) {
      await (prisma as any).renewalBrandProfile.update({
        where: { id: existingAngler.id },
        data: { ...anglerProfile, company_id: anglerCompany?.id || existingAngler.company_id }
      });
      console.log('[seedBrandProfiles] Updated ANGLER brand profile ID:', existingAngler.id);
    } else {
      const created = await (prisma as any).renewalBrandProfile.create({
        data: { ...anglerProfile, company_id: anglerCompany?.id || null }
      });
      console.log('[seedBrandProfiles] Created ANGLER brand profile ID:', created.id);
    }

    // ── Upsert TRINETRA profile ──────────────────────────────────────────────
    const existingTrinetra = await (prisma as any).renewalBrandProfile.findFirst({
      where: { profile_name: 'Trinetra Default' }
    });

    if (existingTrinetra) {
      await (prisma as any).renewalBrandProfile.update({
        where: { id: existingTrinetra.id },
        data: { ...trinetraProfile, company_id: trinetraCompany?.id || existingTrinetra.company_id }
      });
      console.log('[seedBrandProfiles] Updated Trinetra brand profile ID:', existingTrinetra.id);
    } else {
      const created = await (prisma as any).renewalBrandProfile.create({
        data: { ...trinetraProfile, company_id: trinetraCompany?.id || null }
      });
      console.log('[seedBrandProfiles] Created Trinetra brand profile ID:', created.id);
    }

  } catch (err) {
    console.error('[seedBrandProfiles] Error seeding brand profiles:', err);
  }
}

if (require.main === module) {
  seedBrandProfiles()
    .finally(async () => {
      await prisma.$disconnect();
    });
}
