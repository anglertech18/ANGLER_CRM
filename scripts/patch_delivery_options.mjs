import { readFileSync, writeFileSync } from 'fs';

// 1. renewalDualWriteService.ts
{
  const file = 'server/src/services/renewalDualWriteService.ts';
  let c = readFileSync(file, 'utf8');
  const isCRLF = c.includes('\r\n');
  c = c.split(/\r?\n/).join('\n');

  const oldCode = `    // Resolve execution mode dynamically from channel
    let executionMode = 'AUTOMATIC';
    if (reminder.channel === 'PHONE' || reminder.channel === 'CALL' || reminder.action_type === 'CALL') {
      executionMode = 'MANUAL';
    } else if (reminder.channel === 'WHATSAPP' || reminder.action_type === 'WHATSAPP') {
      executionMode = 'APPROVAL_REQUIRED';
    }`;

  const newCode = `    // Resolve execution mode dynamically from channel
    let executionMode = 'AUTOMATIC';
    if (reminder.channel === 'PHONE' || reminder.channel === 'CALL' || reminder.action_type === 'CALL') {
      executionMode = 'MANUAL';
    } else if (reminder.channel === 'EMAIL_DRAFT' || reminder.action_type === 'EMAIL_DRAFT' || reminder.channel === 'WHATSAPP' || reminder.action_type === 'WHATSAPP') {
      executionMode = 'APPROVAL_REQUIRED';
    }`;

  if (c.includes(oldCode)) {
    c = c.replace(oldCode, newCode);
    console.log('✅ renewalDualWriteService.ts: EMAIL_DRAFT mapped to APPROVAL_REQUIRED');
  } else {
    console.error('❌ renewalDualWriteService.ts: oldCode not found');
  }

  if (isCRLF) c = c.split('\n').join('\r\n');
  writeFileSync(file, c, 'utf8');
}

// 2. RenewalSettings.tsx
{
  const file = 'client/src/pages/settings/RenewalSettings.tsx';
  let c = readFileSync(file, 'utf8');
  const isCRLF = c.includes('\r\n');
  c = c.split(/\r?\n/).join('\n');

  const oldChannelSelect = `                        <label className="text-[9px] font-bold text-slate-500">CHANNEL
                          <select value={step.channel} onChange={e => updateStep(idx, 'channel', e.target.value)} className="form-input text-xs w-full mt-1">
                            <option value="EMAIL">Email</option>
                            <option value="PHONE">Telephone / Call Task</option>
                            <option value="WHATSAPP">WhatsApp</option>
                            <option value="IN_APP">In-app Task</option>
                          </select>
                        </label>`;

  const newChannelSelect = `                        <label className="text-[9px] font-bold text-slate-500">CHANNEL / DELIVERY
                          <select value={step.channel} onChange={e => updateStep(idx, 'channel', e.target.value)} className="form-input text-xs w-full mt-1 font-semibold text-blue-900 bg-white">
                            <option value="EMAIL_DIRECT">✉ Email (Auto Send / Direct)</option>
                            <option value="EMAIL_DRAFT">📝 Email (Draft — Approval Required)</option>
                            <option value="EMAIL">✉ Email (Standard Auto)</option>
                            <option value="PHONE">☎ Telephone / Call Task</option>
                            <option value="WHATSAPP">💬 WhatsApp</option>
                            <option value="IN_APP">📌 In-app Task</option>
                          </select>
                        </label>`;

  const oldTemplateFilter = `{templates.filter((template: any) => !template.channel || template.channel === step.channel).map((template: any) => <option key={template.id} value={template.id}>{template.name}</option>)}`;

  const newTemplateFilter = `{templates.filter((template: any) => {
                            if (!template.channel) return true;
                            if (step.channel === template.channel) return true;
                            if (String(step.channel).startsWith('EMAIL') && String(template.channel).startsWith('EMAIL')) return true;
                            return false;
                          }).map((template: any) => <option key={template.id} value={template.id}>{template.name}</option>)}`;

  if (c.includes(oldChannelSelect)) {
    c = c.replace(oldChannelSelect, newChannelSelect);
    console.log('✅ RenewalSettings.tsx: Channel dropdown updated with Auto Send & Draft options');
  } else {
    console.error('❌ RenewalSettings.tsx: oldChannelSelect not found');
  }

  if (c.includes(oldTemplateFilter)) {
    c = c.replace(oldTemplateFilter, newTemplateFilter);
    console.log('✅ RenewalSettings.tsx: Template filter updated for all email channels');
  } else {
    console.error('❌ RenewalSettings.tsx: oldTemplateFilter not found');
  }

  if (isCRLF) c = c.split('\n').join('\r\n');
  writeFileSync(file, c, 'utf8');
}
