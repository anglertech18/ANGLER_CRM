<role>
You are a senior full-stack engineer working on the existing ANGLER CRM Renewal Module.

Treat this as a production bug fix, not a redesign or exploratory task.

Implement the fix directly in the existing repository. Do not stop at analysis, recommendations, or a proposed solution.
</role>

<task_id>
P0-RENEWAL-CONTACT-001
</task_id>

<objective>
Fix the Renewal Module so that:

1. The actual customer contact selected for a renewal service is persisted as `customer_contact_id`.
2. Service-level `customer_contact` resolves correctly after create/update.
3. The UI never displays hardcoded/mock contact data when a service has no linked contact.
4. Assigned-user fallbacks also never display fake people.
5. Existing renewal records with no service-level contact show a neutral empty state instead of invented data.

Do not change unrelated renewal workflows.
</objective>

<confirmed_root_cause>
The root cause has already been investigated and confirmed. Do NOT spend time repeating broad analysis unless the repository currently contradicts these findings.

1. RenewalForm does not send service-level contact

File:
`RenewalForm.tsx`

Relevant area:
approximately lines `768-795`

The create/update payload currently sends account-level:

`contact_ids`

but individual service payloads do NOT contain:

`customer_contact_id`

A previous search confirmed zero occurrences of `customer_contact_id` in `RenewalForm.tsx`.

2. Backend therefore stores NULL

File:
`renewalService.ts`

Approximately line 67:

`customer_contact_id` is assigned from `svc.customer_contact_id`; otherwise it is stored as `null`.

The backend therefore already has support for the field, but the frontend does not provide it.

Approximately lines 73-74 only propagate data from the service contact into the related junction logic. They do NOT infer the service contact from account-level contacts.

Do not create a second competing backend mapping mechanism.

3. UI then reads a null `service.customer_contact` and substitutes hardcoded mock values.

Known affected locations:

`MappingDashboard.tsx`

Approximately lines 480/484:
`customer_contact?.name || 'Megna Kapoor'`

Approximately line 485:
fallback:
`'IT Manager'`

Approximately line 488:
fallback:
`'megna.kapoor@seacorp.in'`

Approximately line 489:
fallback:
`'+91 98765 43210'`

Approximately lines 943-944:
table fallback:
`'Megna Kapoor'`
`'IT Manager'`

Approximately line 469:
assigned-user fallback:
`'Ravi Singh'`

`RenewalDetail.tsx`

Approximately line 652:
fallbacks:
`'Primary Contact'`
`'accounts@client.com'`

`RenewalFollowUps.tsx`

Approximately line 608:
fallback:
`'Primary Contact'`

Account-level contacts themselves are working correctly.

Example:
`RenewalDetail.tsx` around lines 850-856 reads:

`contacts[].contact`

correctly.

Therefore the defect is specifically the missing service-level `customer_contact_id` plus unsafe presentation fallbacks.

`Megna Kapoor` also appears as an input/example placeholder around `RenewalForm.tsx:1984`. Do not confuse an input placeholder with actual persisted data, but remove or make it generic if keeping that sample name could create further confusion.
</confirmed_root_cause>

<implementation_requirements>

## 1. Inspect only the necessary code first

Before editing, inspect:

- `RenewalForm.tsx`
- the renewal service/form TypeScript types
- create/update payload construction
- `renewalService.ts`
- API request validation/DTO/schema if applicable
- renewal service retrieval/include/select logic
- `MappingDashboard.tsx`
- `RenewalDetail.tsx`
- `RenewalFollowUps.tsx`
- the neutral empty-state convention already used by `RenewalReports.tsx`

Search the renewal module for these exact literals:

- `Megna Kapoor`
- `megna.kapoor@seacorp.in`
- `+91 98765 43210`
- `IT Manager`
- `Ravi Singh`
- `Primary Contact`
- `accounts@client.com`

Determine which occurrences are runtime fallbacks versus legitimate placeholders/test fixtures.

Do not inspect unrelated modules unless required by an actual dependency.

---

## 2. Fix service-level contact persistence

Update the Renewal form's service model/state so each service can carry:

`customer_contact_id`

Use the actual ID type defined by the repository. Do not assume whether it is UUID, number, bigint, or string.

Ensure `customer_contact_id` is included inside every applicable service object sent in both:

- create renewal
- update renewal

Do NOT rely only on account-level `contact_ids`.

Expected conceptual shape:

services: [
  {
    ...existingServiceFields,
    customer_contact_id: selectedContactId
  }
]

Use the project's actual interface/property names and existing payload structure.

Do not invent a parallel payload format.

---

## 3. Provide correct per-service contact selection

The preferred production behavior is a customer-contact selection at service level.

If the existing service UI already contains such a selector, wire it correctly instead of adding another one.

If no service-level selector exists, add the smallest appropriate `Customer Contact` selector to each service row/card/form section.

Rules:

- options must come only from contacts belonging to the currently selected client/company;
- respect the existing selected account contacts where applicable;
- do not allow a contact belonging to another company;
- store the selected contact's real ID;
- edit mode must pre-populate the persisted service contact;
- changing the service contact must update the outgoing payload;
- removing a contact from the selected company/account contacts must clear any service assignment that is no longer valid;
- changing client/company must clear service-level contact references that belong to the previous company.

Do not silently choose an arbitrary person when multiple contacts exist.

If exactly one valid customer contact exists, it is acceptable to auto-select it if that matches the existing UX conventions.

If multiple contacts exist, preserve or request an explicit service-level selection rather than blindly assigning `companyContactIds[0]`.

Never hardcode a contact ID.

---

## 4. Verify backend contract

The backend appears to already support:

`svc.customer_contact_id`

and persists it into:

`renewal_service_instance.customer_contact_id`

Confirm this against the current repository before changing backend logic.

If API validation/types currently strip or reject the field, make the smallest required update so `customer_contact_id` reaches `renewalService.ts`.

Do not duplicate contact assignment logic elsewhere.

Do not add a database migration unless inspection proves that the required column/relation is actually missing.

Any modified renewal create/update database operation must preserve the existing transaction boundary. Do not introduce an independent write after the main renewal transaction.

---

## 5. Verify retrieval/relationship loading

The frontend consumes:

`service.customer_contact`

After persistence, verify the canonical renewal/service read API loads or maps the linked customer-contact relation.

If it already does, leave it unchanged.

If it does not, make the smallest required change to the existing query/include/select/response mapping so the persisted contact is returned as `customer_contact`.

Do not create a second API solely for this issue.

---

## 6. Remove all fake display data

Runtime UI fallbacks must never impersonate real customer information.

Update `MappingDashboard.tsx`.

Remove runtime fallbacks such as:

- `Megna Kapoor`
- `IT Manager`
- `megna.kapoor@seacorp.in`
- `+91 98765 43210`
- `Ravi Singh`

Use the repository's neutral empty-state convention.

Preferred behavior:

Contact summary/name:
`No contact linked`

Individual missing fields such as designation/email/mobile:
`—`

Assigned user when genuinely missing:
`Unassigned`

Use existing project wording if an established convention already exists.

Update `RenewalDetail.tsx`.

Remove fake fallbacks:

- `Primary Contact`
- `accounts@client.com`

For missing service contact, display:

`No contact linked`

or `—` where appropriate.

Update `RenewalFollowUps.tsx`.

Remove:

`Primary Contact`

as fabricated data.

Use a neutral missing-contact state.

Match the convention already used by `RenewalReports.tsx` wherever possible.

---

## 7. Existing data handling

Do NOT manufacture contacts for historical records whose:

`renewal_service_instance.customer_contact_id`

is already NULL.

Those records must display the neutral empty state.

Do not create an automatic database backfill unless the repository contains an authoritative one-to-one mapping proving which account contact belongs to each service.

Having an account-level contact does not automatically prove that it is the correct service-level contact.

Historical records can receive the correct contact through their normal edit/update flow.

---

## 8. Keep the fix minimal

This is a targeted production bug fix.

Do NOT:

- redesign the Renewal module;
- refactor unrelated files;
- rewrite service architecture;
- introduce new state-management libraries;
- add unnecessary helpers/abstractions;
- change unrelated business rules;
- modify renewal-cycle logic;
- modify reminder logic;
- change pricing logic;
- change notification behavior;
- hardcode names, IDs, emails, phone numbers, roles, or other customer data;
- create a second contact mapping source;
- add speculative defensive logic for impossible internal states;
- remove or weaken existing tests just to make the build pass.

Reuse existing components, API clients, types, patterns, styling, and service methods wherever possible.
</implementation_requirements>

<acceptance_criteria>
The task is complete only when ALL of the following are true:

AC01 — Create
Creating a renewal with a selected service customer contact sends the real `customer_contact_id`.

AC02 — Persistence
The selected value is stored in `renewal_service_instance.customer_contact_id`.

AC03 — Retrieval
Reloading/refetching the renewal returns the corresponding `service.customer_contact`.

AC04 — Correct display
Mapping Dashboard displays the actual persisted service customer contact.

AC05 — Edit
Opening an existing renewal correctly pre-populates its service contact.

AC06 — Update
Changing a service contact and saving persists the new contact.

AC07 — Company isolation
Contacts from another customer/company cannot be assigned to the service.

AC08 — Invalid contact cleanup
Changing the selected company or removing an account contact clears invalid service-contact assignments rather than submitting stale IDs.

AC09 — Historical NULL data
An existing service with `customer_contact_id = null` displays `No contact linked` / `—`, never fake data.

AC10 — No mock customer identity
No production display path substitutes:
`Megna Kapoor`,
`megna.kapoor@seacorp.in`,
`+91 98765 43210`,
`IT Manager`,
`Primary Contact`,
or `accounts@client.com`
for missing service data.

AC11 — Assigned user
A missing assigned user never displays `Ravi Singh`; use the real assigned user or `Unassigned`.

AC12 — No regression
Account-level `contacts[].contact` continues to work as before.

AC13 — No duplicate source of truth
`customer_contact_id` remains the canonical service-level relationship. Do not derive arbitrary service contacts at display time.

AC14 — Build
Affected frontend/backend code passes the repository's existing TypeScript/build checks.

AC15 — Tests
Relevant existing tests continue to pass.
</acceptance_criteria>

<verification>
After implementation, verify the complete path:

UI selection
→ RenewalForm service state
→ create/update payload
→ API validation
→ renewalService
→ database `customer_contact_id`
→ API relation loading
→ `service.customer_contact`
→ Mapping/Detail/Follow-up UI

Run the repository's existing relevant checks.

At minimum, where available:

- TypeScript/typecheck
- frontend build
- backend build
- relevant unit/integration tests
- lint for touched files

Do not introduce a new testing framework just for this bug.

Add targeted tests only using the project's existing test infrastructure.

Manually or through existing tests validate these scenarios:

1. One company contact + one service.
2. Multiple company contacts with a specific contact assigned to a service.
3. Two services assigned to different contacts.
4. Create then reload.
5. Edit contact then reload.
6. Existing service with NULL contact.
7. Company changed after a service contact was selected.
8. Selected account contact removed after being assigned to a service.
9. Missing assigned internal user.
10. No hardcoded dummy identity appears anywhere in the affected production UI.

Finally search the affected production source again for the known dummy literals.

If a literal remains only in a legitimate test fixture or generic input example, state that clearly. Otherwise remove it.
</verification>

<execution_rules>
- Implement the changes directly.
- Do not ask whether to implement Part 1 or Part 2. Implement both persistence and display fixes.
- Do not merely provide code snippets if repository-editing tools are available.
- Do not repeat the root-cause investigation already supplied.
- Inspect actual files before modifying them.
- Never claim a field, type, API, or relationship exists without reading the relevant code.
- Prefer editing existing code over creating new files.
- If temporary files are created, remove them before completion.
- Review the final diff for accidental unrelated changes.
- Keep the change set as small as reasonably possible.
- Solve the underlying data-flow problem; do not make tests pass through hardcoded workarounds.
</execution_rules>

<final_response>
Keep the final response concise.

Report only:

1. Root cause fixed — one short sentence.
2. Files changed.
3. What changed in the service-contact data flow.
4. Which dummy fallbacks were removed.
5. Tests/build/verification commands executed and their results.
6. Any genuine remaining issue/blocker, only if one exists.

Do not provide a long explanation and do not dump entire source files into the response.
</final_response>