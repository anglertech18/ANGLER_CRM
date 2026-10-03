const jwt = require('jsonwebtoken');

const token = jwt.sign(
    { id: 1, email: 'ceo@crm.com', role: 'CEO' },
    'supersecretkey',
    { expiresIn: '1h' }
);

const LEAD_ID = 70;

async function main() {
    let res = await fetch(`http://localhost:5000/api/leads/${LEAD_ID}`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    let lead = await res.json();
    console.log('BEFORE — authority_yes_no:', lead.authority_yes_no, 'decision_maker_score:', lead.decision_maker_score);

    const form = new FormData();
    form.append('first_name', lead.first_name || '');
    form.append('sales_stage_id', String(lead.sales_stage_id));
    form.append('lead_owner_id', String(lead.lead_owner_id));
    form.append('authority_yes_no', 'true');
    form.append('decision_maker_score', '2');
    form.append('decision_maker', 'Test DM');
    form.append('budget_yes_no', String(!!lead.budget_yes_no));
    form.append('need_yes_no', String(!!lead.need_yes_no));
    form.append('timeline_yes_no', String(!!lead.timeline_yes_no));

    res = await fetch(`http://localhost:5000/api/leads/${LEAD_ID}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body: form
    });
    console.log('PUT status:', res.status);
    if (res.status >= 400) { console.log(await res.text()); return; }

    res = await fetch(`http://localhost:5000/api/leads/${LEAD_ID}`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    lead = await res.json();
    console.log('AFTER reopen — authority_yes_no:', lead.authority_yes_no, 'decision_maker_score:', lead.decision_maker_score, 'decision_maker:', lead.decision_maker);
}

main().catch(e => console.error(e));
