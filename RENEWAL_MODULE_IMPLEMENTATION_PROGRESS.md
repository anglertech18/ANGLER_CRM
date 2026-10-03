# CRM Renewal Module - Implementation Progress Report

**Date**: 2026-08-13
**Branch**: kannan_renewal_module_v2
**Status**: In Progress - Schema Changes Blocked by Migration History Issue

---

## Executive Summary

This implementation addresses the P0 parent company bulk import bug and extends the Service Master architecture to support ANGLER/TRINETRA dynamic field requirements. The code changes are complete, but database schema migration is blocked by a pre-existing migration history issue that must be resolved by the database administrator.

---

## Completed Changes

### 1. P0 Parent Company Bulk Import Bug Fix ✅

**File**: `server/src/services/renewalBulkUploadService.ts`

**Changes**:
- Removed the buggy parent company inference logic: `const isTrinetraSvc = item.serviceObj ? true : false;`
- Added explicit `requestParentCompanyId` parameter to `processBulkUpload` function
- Added validation that parent company must be explicitly provided
- Added parent company existence verification before import
- Removed silent auto-creation of Client Companies during bulk import
- Removed silent auto-creation of Contacts during bulk import
- Updated result interface to remove `companiesCreated` and `contactsCreated` counters

**Impact**: Eliminates data contamination risk from typos creating unintended customers.

---

### 2. Contact Role Normalization Fix ✅

**File**: `server/src/services/renewalBulkUploadService.ts`

**Changes**:
- Modified `normalizeContactRole` function to preserve original values instead of forcing unknown roles to `PRIMARY`
- Ambiguous values like "Transport", "HR", "Admin" are now returned as-is for manual review
- Only deterministic approved synonyms are mapped (Finance → BILLING, etc.)

**Impact**: Prevents incorrect automatic role assignments that could affect notification routing.

---

### 3. Hardcoded 18% Tax Calculation Removal ✅

**File**: `server/src/services/renewalBulkUploadService.ts`

**Changes**:
- Removed universal tax calculation: `taxAmount = Math.round(subtotal * 0.18 * 100) / 100`
- Changed to use `amountDue` directly from Excel
- Added comment that tax should come from configuration

**Impact**: Eliminates incorrect tax assumptions for services with different tax rates.

---

### 4. ANGLER V2 Bulk Template Extension ✅

**File**: `server/src/services/renewalBulkUploadService.ts`

**Changes**:
- Extended template from 26 columns to 30 columns
- Added new columns: Address, GST Number, Invoice Date, Status, Login User Name
- Updated labels: Provider Name → Service Provider Name, Server Account → Server Name, Quantity → No. of Email IDs
- Added Address/GST validation against Client Master records with warning on mismatch
- Added Invoice Date handling

**Impact**: Aligns bulk import with latest accepted ANGLER business requirements.

---

### 5. TRINETRA V2 Bulk Template Creation ✅

**File**: `server/src/services/renewalBulkUploadService.ts`

**Changes**:
- Added new template type: `TRINETRA_V2`
- Template has 24 columns (vs 30 for ANGLER)
- Hides technical fields: Domain/Server Identifier, Service Provider, Server Name, Service Plan
- Focuses on: Quantity, Activation/Expiry, Amount, Cycle Status
- Implemented column count detection to auto-detect template type during parsing

**Impact**: Supports TRINETRA's different field requirements without data contamination.

---

### 6. Parent Company Context for Bulk Upload API ✅

**File**: `server/src/controllers/renewalBulkUploadController.ts`

**Changes**:
- Added `parentCompanyId` query parameter to `downloadTemplate` endpoint
- Added `parentCompanyId` body parameter to `processUpload` endpoint
- Added `templateVersion` query parameter for versioned templates
- Updated filename generation to include company name and version
- Added `getCompanyName` helper function

**Impact**: Enables proper parent company scoping for bulk operations.

---

### 7. Service Master Schema Extensions ✅

**File**: `server/prisma/schema.prisma`

**Changes**:
- Added boolean flags to `RenewalServiceMaster`:
  - `requires_provider`, `supports_server_name`, `requires_server_name`
  - `supports_plan_name`, `requires_plan_name`
  - `supports_login_username`, `requires_login_username`
  - `requires_quantity`, `quantity_label`
- Added fields to `RenewalServiceInstance`:
  - `login_username` (for ANGLER requirement)
  - `service_transaction_type` (REGISTRATION/RENEWAL distinction)
- Added missing relations to `RenewalServiceCategory` (parent-child hierarchy)
- Added missing back-relations to enable Service Master relations

**Impact**: Provides the data model for dynamic field configuration.

---

### 8. Field Rule Resolver Service ✅

**File**: `server/src/services/renewalFieldRuleResolver.ts` (NEW)

**Features**:
- `resolveServiceFieldRules()` - Returns field visibility/requiredness/label configuration
- `validateServiceInstance()` - Validates instance data against resolved rules
- `getServiceMastersForCompany()` - Placeholder for Company → Service Master mapping
- Designed for future parent company override support

**Impact**: Provides backend service for consistent field rule resolution.

---

## Blocked Changes

### 1. Database Migration ❌ BLOCKED

**Issue**: Pre-existing migration history error

**Details**:
- Migration `20260704120000_create_cashflow_and_dailyreport_tables` has a foreign key constraint error
- Error: `Can't create table cashflow_tracker (errno: 150 "Foreign key constraint is incorrectly formed")`
- Prisma cannot apply new migrations until this is resolved

**Required Action**: Database administrator must:
1. Investigate the `cashflow_tracker` table foreign key constraint issue
2. Either fix the constraint or mark the migration as resolved
3. Test with `npx prisma migrate dev` to verify shadow database works

**Migration File**: `server/prisma/migrations/20260813_extend_renewal_service_master_and_instance/migration.sql`

**SQL Changes Ready**:
- Add 9 new columns to `renewal_service_master`
- Add 2 new columns to `renewal_service_instance`
- Add parent-child hierarchy to `renewal_service_category`
- Add missing indexes and foreign keys

---

## Pending Work

### 1. Service Master Configuration ❌

**Status**: Cannot proceed until migration is applied

**Required**:
- Configure ANGLER Service Masters with correct field behavior:
  - Domain Renewal: identifier required, provider visible, quantity hidden
  - Server Renewal: identifier required, provider visible, server visible
  - Office 365 Email: identifier required, quantity visible with label "No. of Email IDs", login_username visible
  - CMS AMC: identifier required, other fields per business requirements
  - SSL Renewal: identifier required, provider visible

- Configure TRINETRA Service Masters to hide technical fields:
  - FMS: identifier hidden, provider hidden, server hidden, plan hidden, quantity visible with label "No. of Vehicles"
  - 4G Dome Camera: similar to FMS, label "No. of Cameras"
  - iWay: similar, label "No. of Licenses"
  - IoT: similar, label "No. of Devices"

---

### 2. Company → Service Master Mapping ❌

**Status**: Recommended but not yet implemented

**Rationale**: Current Service Masters are different between ANGLER and TRINETRA, so Service Master-level configuration is sufficient. Mapping table would be needed only if the same Service Master is shared between companies with different behavior.

**Proposed Schema** (if needed in future):
```prisma
model RenewalCompanyServiceMaster {
  company_id         Int
  service_master_id  Int
  is_active          Boolean  @default(true)
  
  company            Company  @relation(fields: [company_id])
  service_master     RenewalServiceMaster  @relation(fields: [service_master_id])
  
  @@unique([company_id, service_master_id])
}
```

---

### 3. Frontend RenewalForm Integration ❌

**Status**: Cannot proceed until backend resolver is tested and migration applied

**Required**:
- Import `resolveServiceFieldRules` API or use existing Service Master API
- Extend conditional rendering to all technical fields (not just identifier)
- Add quantity label override support
- Update field labels dynamically based on resolved rules
- Preserve hidden field values during edit (do not erase)

---

### 4. Admin UI for Service Master Configuration ❌

**Status**: Cannot proceed until migration applied

**Required**:
- Add field configuration controls to Service Master edit page
- For each field: Show/Required toggles, Label input
- Preview functionality to see field behavior
- Save/validate against Service Master schema

---

### 5. Backend Validation Integration ❌

**Status**: Resolver created but not integrated

**Required**:
- Integrate `validateServiceInstance` into `createRenewalAccount`
- Integrate into bulk upload validation
- Ensure validation errors are surfaced to UI
- Test Draft vs Activation validation behavior

---

### 6. Policy-Driven Order Form Dispatch Verification ❌

**Status**: Not addressed in this phase

**Required**:
- Create end-to-end test: FMS reminder due → Trinetra PDF attached → outbox dispatch
- Verify idempotency: repeated worker run should not duplicate
- Verify next cycle: same policy step can send again
- Verify template resolution: correct parent company Order Form

---

### 7. Comprehensive Test Suite ❌

**Status**: Cannot proceed until migration applied

**Required Tests**:
- ANGLER parent resolution
- TRINETRA parent resolution
- Parent company bug regression
- Field visibility/requiredness states
- Quantity label variations
- ANGLER V2 vs TRINETRA V2 parsing
- Address/GST match/mismatch validation
- Historical hidden data preservation
- Pricing resolution integration
- Draft vs Activation validation

---

## Files Modified

1. `server/src/services/renewalBulkUploadService.ts` - Bulk upload logic fixes and V2 templates
2. `server/src/controllers/renewalBulkUploadController.ts` - Parent company context API
3. `server/prisma/schema.prisma` - Service Master and Service Instance extensions
4. `server/src/services/renewalFieldRuleResolver.ts` - NEW: Field rule resolver service
5. `server/prisma/migrations/20260813_extend_renewal_service_master_and_instance/migration.sql` - NEW: Migration SQL (blocked)

---

## Risk Assessment

### P0 Risks
- **Migration History Block**: Cannot deploy schema changes until DB admin resolves foreign key constraint issue
- **Historical Data Impact**: Once migration is applied, ensure hidden field values are preserved (no deletion/nulling)

### P1 Risks
- **Template Detection**: Column count detection is fragile; should add explicit template version header
- **Service Master Configuration**: Incorrect flag settings could break existing services
- **Backward Compatibility**: Existing bulk upload files may not work with new parsing logic

### P2 Risks
- **Frontend Integration**: Complex conditional rendering logic may have edge cases
- **Validation Timing**: Too strict validation may block legitimate Draft records

---

## Next Steps

### Immediate (DB Admin Required)
1. Resolve migration history issue for `20260704120000_create_cashflow_and_dailyreport_tables`
2. Test migration: `npx prisma migrate dev`
3. Apply migration to development environment

### Post-Migration (Development Team)
1. Configure Service Master flags for ANGLER services
2. Configure Service Master flags for TRINETRA services
3. Integrate field rule resolver into `createRenewalAccount`
4. Integrate field rule resolver into bulk upload validation
5. Update frontend RenewalForm to use resolved rules
6. Add comprehensive test suite
7. Verify build: `npm run build` (server), `npm run build` (client)

### Future Enhancements
1. Add Company → Service Master mapping if services are shared
2. Add parent company field override table if needed
3. Implement policy-driven Order Form dispatch tests
4. Add template version header to Excel files for robust detection

---

## Business Impact

### Positive
- Eliminates data contamination from typo-based customer creation
- Supports TRINETRA's different field requirements without workarounds
- Aligns bulk import with latest ANGLER business requirements
- Removes incorrect tax assumptions
- Provides foundation for dynamic field configuration

### Temporary
- Bulk upload behavior changes (stricter validation) may require user training
- New template versions require user adoption
- Migration downtime required when schema changes are applied

---

## Dependencies

- Database administrator intervention for migration history issue
- Service Master business requirements clarification for flag settings
- Frontend team for RenewalForm integration
- QA team for comprehensive testing

---

## Sign-Off

**Schema Changes**: ✅ Ready (pending migration resolution)
**Code Changes**: ✅ Complete
**Testing**: ❌ Blocked by migration
**Documentation**: ✅ Complete

**Recommended**: Do not deploy to production until migration is resolved and testing is complete.
