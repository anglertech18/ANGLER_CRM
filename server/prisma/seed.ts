import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting minimal database seeding...');

    // 1. MASTER DATA - Essential Companies
    console.log('📊 Seeding Companies...');
    const companies = await Promise.all([
        'TechCorp Industries',
        'Global Solutions Ltd'
    ].map(name =>
        prisma.company.upsert({ where: { name }, update: {}, create: { name } })
    ));

    // 2. SBUs
    console.log('🏢 Seeding SBUs...');
    const sbus = [];
    const sbu1 = await prisma.sBU.create({
        data: { name: 'North Region', company_id: companies[0].id }
    });
    const sbu2 = await prisma.sBU.create({
        data: { name: 'South Region', company_id: companies[0].id }
    });
    sbus.push(sbu1, sbu2);

    // 3. Job Titles
    console.log('💼 Seeding Job Titles...');
    const jobTitles = await Promise.all([
        'CEO', 'CTO', 'VP Sales', 'Sales Manager', 'IT Manager'
    ].map(name =>
        prisma.jobTitle.upsert({ where: { name }, update: {}, create: { name } })
    ));

    // 4. Lead Sources
    console.log('📍 Seeding Lead Sources...');
    const leadSources = await Promise.all([
        'Website', 'Referral', 'LinkedIn', 'Cold Call'
    ].map(name =>
        prisma.leadSource.upsert({ where: { name }, update: {}, create: { name } })
    ));

    // 5. Industries
    console.log('🏭 Seeding Industries...');
    const industries = await Promise.all([
        'Technology', 'Finance', 'Healthcare'
    ].map(name =>
        prisma.industry.upsert({ where: { name }, update: {}, create: { name } })
    ));

    // 6. Geography
    console.log('🌍 Seeding Geography...');
    const countries = await Promise.all([
        'USA', 'India'
    ].map(name =>
        prisma.country.upsert({ where: { name }, update: {}, create: { name } })
    ));

    const state1 = await prisma.state.create({
        data: { name: 'California', country_id: countries[0].id }
    });
    const state2 = await prisma.state.create({
        data: { name: 'Maharashtra', country_id: countries[1].id }
    });

    const city1 = await prisma.city.create({
        data: { name: 'San Francisco', state_id: state1.id }
    });
    const city2 = await prisma.city.create({
        data: { name: 'Mumbai', state_id: state2.id }
    });

    // 7. Products
    console.log('📦 Seeding Products...');
    const products = await Promise.all([
        'CRM Software', 'ERP System'
    ].map(name =>
        prisma.product.upsert({ where: { name }, update: {}, create: { name } })
    ));

    // 7a. EIT Services
    console.log('⚙️ Seeding EIT Services...');
    const eitServices = await Promise.all([
        'Annual Maintenance', 'Implementation Support', 'Training Services'
    ].map(name =>
        prisma.eitService.upsert({ where: { name }, update: {}, create: { name, count_type: 'Mandays' } })
    ));

    // 7b. IM Services
    console.log('🔧 Seeding IM Services...');
    const imServices = await Promise.all([
        'IT Infrastructure Management', 'Security Audit', 'Cloud Migration'
    ].map(name =>
        prisma.imService.upsert({ where: { name }, update: {}, create: { name, count_type: 'Nodes' } })
    ));

    // 7c. Avatars
    console.log('👤 Seeding Avatars...');
    const avatars = await Promise.all([
        'Professional', 'Technical', 'Decision Maker'
    ].map(name =>
        prisma.avatar.upsert({ where: { name }, update: {}, create: { name } })
    ));

    // 7d. Source of DB
    console.log('📂 Seeding Source of DB...');
    const sourceOfDBNames = ['Cold Database', 'Referral', 'Website', 'Event', 'LinkedIn', 'Purchased Data'];
    const sourcesOfDB = [];
    for (const name of sourceOfDBNames) {
        sourcesOfDB.push(await prisma.sourceOfDB.upsert({ where: { name }, update: {}, create: { name } }));
    }

    // 7e. Call Status
    console.log('📞 Seeding Call Status...');
    const callStatusNames = ['Not Connected', 'Connected', 'Follow Up Required', 'Interested', 'Not Interested', 'Call Back Later', 'Converted to Lead'];
    const callStatuses = [];
    for (const name of callStatusNames) {
        callStatuses.push(await prisma.callStatus.upsert({ where: { name }, update: {}, create: { name } }));
    }

    // 8. Personas (requires product_id)
    console.log('👥 Seeding Personas...');
    const persona1 = await prisma.persona.create({
        data: { name: 'Decision Maker', product_id: products[0].id }
    });
    const persona2 = await prisma.persona.create({
        data: { name: 'Influencer', product_id: products[1].id }
    });
    const personas = [persona1, persona2];

    // 9. Sales Stages
    console.log('📈 Seeding Sales Stages...');
    const salesStagesNames = ['Prospecting', 'Qualification', 'Proposal', 'Negotiation', 'Order Won', 'Lost'];
    const salesStages = [];
    for (const name of salesStagesNames) {
        salesStages.push(await prisma.salesStage.upsert({ where: { name }, update: {}, create: { name } }));
    }

    // 10. Activities
    console.log('📅 Seeding Activities...');
    const activityNames = ['Call', 'Email', 'Meeting', 'Demo', 'Follow-up'];
    const activities = [];
    for (const name of activityNames) {
        activities.push(await prisma.activity.upsert({ where: { name }, update: {}, create: { name } }));
    }

    // 11. USERS
    console.log('👤 Seeding Users...');
    const passwordHash = await bcrypt.hash('password123', 10);

    const ceo = await prisma.user.upsert({
        where: { email: 'ceo@crm.com' },
        update: {},
        create: {
            email: 'ceo@crm.com',
            password_hash: passwordHash,
            first_name: 'John',
            last_name: 'CEO',
            role: Role.CEO,
            company_id: companies[0].id
        }
    });

    const manager1 = await prisma.user.upsert({
        where: { email: 'manager1@crm.com' },
        update: {},
        create: {
            email: 'manager1@crm.com',
            password_hash: passwordHash,
            first_name: 'Manager',
            last_name: 'One',
            role: Role.SalesManager,
            company_id: companies[0].id,
            sbu_id: sbu1.id,
            reporting_manager_id: ceo.id
        }
    });

    const salesPerson1 = await prisma.user.upsert({
        where: { email: 'sales1@crm.com' },
        update: {},
        create: {
            email: 'sales1@crm.com',
            password_hash: passwordHash,
            first_name: 'Sales',
            last_name: 'Person One',
            role: Role.SalesPerson,
            company_id: companies[0].id,
            sbu_id: sbu1.id,
            reporting_manager_id: manager1.id
        }
    });

    // 12. PRIVILEGES
    console.log('🔐 Seeding Privileges...');
    const modules = ['Leads', 'Calls', 'Reports', 'Masters', 'Users', 'Dashboard'];
    const allUsers = [ceo, manager1, salesPerson1];

    for (const user of allUsers) {
        for (const module of modules) {
            await prisma.privilege.upsert({
                where: { user_id_module_name: { user_id: user.id, module_name: module } },
                update: {},
                create: {
                    user_id: user.id,
                    module_name: module,
                    can_view: true,
                    can_add: user.role !== Role.SalesPerson || module !== 'Users',
                    can_edit: true,
                    can_delete: user.role === Role.CEO || user.role === Role.SalesManager
                }
            });
        }
    }

    // 13. SAMPLE LEADS (Only 3)
    console.log('🎯 Seeding 3 sample leads...');

    // Lead 1: High Score, Complete BANT (Q1) - Product Lead
    await prisma.lead.create({
        data: {
            created_by_id: salesPerson1.id,
            sales_sbu_id: sbu1.id,
            lead_owner_id: salesPerson1.id,
            salutation: 'Mr',
            first_name: 'Michael',
            last_name: 'Chen',
            company_id: companies[0].id,
            job_title_id: jobTitles[1].id, // CTO
            avatar_id: avatars[2].id, // Decision Maker
            lead_source_id: leadSources[0].id, // Website
            industry_id: industries[0].id, // Technology
            address: '123 Tech Street, Suite 100',
            country_id: countries[0].id,
            state_id: state1.id,
            city_id: city1.id,
            pin_code: '94102',
            annual_turnover: 5000000,
            mobile_number: '9876543210',
            whatsapp_number: '9876543210',
            email: 'michael.chen@techcorp.com',
            website: 'www.techcorp.com',
            product_or_service: 'Product',
            product_id: products[0].id,
            persona_id: personas[0].id,
            where_find_them_id: leadSources[0].id,
            telecalling_qualified: true,
            device_count: '100',
            employee_count: '250',
            requirement_desc: 'Looking for CRM Software to manage sales pipeline',
            pain_points: 'Critical: Manual processes causing delays',
            demo_completed: true,
            pilot_provided: true,
            lead_score: 95,
            // BANT - All Yes
            budget_yes_no: true,
            budget_allocated: '$75,000',
            approval_stage: 'Board Approved',
            authority_yes_no: true,
            decision_maker: 'Michael Chen - CTO',
            need_yes_no: true,
            pain_points_desc: 'Urgent need for sales automation. Current system outdated, losing deals',
            timeline_yes_no: true,
            expected_closure_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
            quadrant: 'Q1',
            follow_up_activity_id: activities[2].id, // Meeting
            next_activity_id: activities[3].id, // Demo
            sales_stage_id: salesStages[2].id, // Proposal
            is_farming: false
        }
    });

    // Lead 2: Medium Score, Partial BANT (Q2) - EIT Service Lead
    await prisma.lead.create({
        data: {
            created_by_id: manager1.id,
            sales_sbu_id: sbu1.id,
            lead_owner_id: manager1.id,
            salutation: 'Ms',
            first_name: 'Sarah',
            last_name: 'Williams',
            company_id: companies[1].id,
            job_title_id: jobTitles[2].id, // VP Sales
            avatar_id: avatars[2].id, // Decision Maker
            lead_source_id: leadSources[2].id, // LinkedIn
            industry_id: industries[1].id, // Finance
            address: '456 Finance Ave',
            country_id: countries[1].id,
            state_id: state2.id,
            city_id: city2.id,
            pin_code: '400001',
            annual_turnover: 3000000,
            mobile_number: '9876543211',
            email: 'sarah.williams@globalsolutions.com',
            website: 'www.globalsolutions.com',
            product_or_service: 'EitService',
            eit_service_id: eitServices[0].id,
            where_find_them_id: leadSources[2].id,
            telecalling_qualified: true,
            employee_count: '150',
            requirement_desc: 'Exploring ERP options for finance automation',
            pain_points: 'Need better reporting capabilities',
            demo_completed: false,
            pilot_provided: false,
            lead_score: 45,
            // BANT - Partial
            budget_yes_no: false,
            authority_yes_no: true,
            decision_maker: 'Sarah Williams - VP Sales',
            need_yes_no: true,
            pain_points_desc: 'Looking to improve efficiency',
            timeline_yes_no: true,
            expected_closure_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
            quadrant: 'Q2',
            follow_up_activity_id: activities[0].id, // Call
            next_activity_id: activities[1].id, // Email
            sales_stage_id: salesStages[1].id, // Qualification
            is_farming: false
        }
    });

    // Lead 3: Low Score, No BANT (Q4) - IM Service Lead
    await prisma.lead.create({
        data: {
            created_by_id: salesPerson1.id,
            sales_sbu_id: sbu1.id,
            lead_owner_id: salesPerson1.id,
            salutation: 'Mr',
            first_name: 'David',
            last_name: 'Johnson',
            company_id: companies[0].id,
            job_title_id: jobTitles[4].id, // IT Manager
            avatar_id: avatars[1].id, // Technical
            lead_source_id: leadSources[3].id, // Cold Call
            industry_id: industries[2].id, // Healthcare
            address: '789 Health Plaza',
            country_id: countries[0].id,
            state_id: state1.id,
            city_id: city1.id,
            pin_code: '94103',
            annual_turnover: 1000000,
            mobile_number: '9876543212',
            email: 'david.johnson@healthcorp.com',
            product_or_service: 'ImService',
            im_service_id: imServices[0].id,
            where_find_them_id: leadSources[3].id,
            telecalling_qualified: false,
            employee_count: '50',
            requirement_desc: 'Initial inquiry about CRM',
            pain_points: 'Exploring options',
            demo_completed: false,
            pilot_provided: false,
            lead_score: 15,
            // BANT - All No
            budget_yes_no: false,
            authority_yes_no: false,
            need_yes_no: false,
            timeline_yes_no: false,
            quadrant: 'Q4',
            follow_up_activity_id: activities[0].id, // Call
            next_activity_id: activities[0].id, // Call
            sales_stage_id: salesStages[0].id, // Prospecting
            is_farming: false
        }
    });

    console.log('✅ Minimal seeding completed successfully!');
    console.log('📊 Created:');
    console.log('   - 2 Companies');
    console.log('   - 2 SBUs');
    console.log('   - 3 Users (CEO, Manager, Sales Person)');
    console.log('   - 3 Sample Leads (Q1, Q2, Q4)');
    console.log('   - Essential master data only');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
