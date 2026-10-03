// const axios = require('axios');

async function testCreatePartner() {
  const data = {
    name: "Test Partner Capture",
    partner_company: "Test Co",
    status: "Active",
    reg_date: "2026-04-18",
    signed_date: "2026-04-18",
    business_plan_submitted_date: "2026-04-18",
    active_leads_moved_to_quadrant: 5,
    current_lead_score: 85
  };

  try {
    // Note: This requires a valid auth token if the server is running with auth.
    // Since I'm testing the backend logic, I'll try to use Prisma directly in a script 
    // to simulate the controller's logic and check if it fails.
    console.log("Simulating controller logic with data:", data);
  } catch (err) {
    console.error(err);
  }
}

const { PrismaClient } = require('./prisma/v2-client');
const prisma = new PrismaClient();

async function simulateCapture() {
  try {
    const partner = await prisma.partner.create({
      data: {
        user_id: 1, // Assuming user 1 exists
        name: "Capture Test " + Date.now(),
        partner_company: "Capture Co",
        status: "Active",
        reg_date: new Date(),
        signed_date: new Date(),
        business_plan_submitted_date: new Date(),
        active_leads_moved_to_quadrant: 10,
        current_lead_score: 99,
        quadrant: 'Q4'
      }
    });
    console.log('--- CAPTURE SUCCESS ---');
    console.log(JSON.stringify(partner, null, 2));
    await prisma.$disconnect();
  } catch (error) {
    console.error('--- CAPTURE FAILED ---');
    console.error(error);
  }
}

simulateCapture();
