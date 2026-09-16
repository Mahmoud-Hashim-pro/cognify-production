/**
 * Milestone 20 Verification Suite: Business & Multi-Tenant Management
 * Tests Subscription Tier Entitlement Matrix, Tenant Seat Allocation,
 * Token Quota Overages, and Cross-Tenant Data Isolation.
 */

import {
  TIER_ENTITLEMENT_MATRIX,
  createTenantAccount,
  checkFeatureEntitlement,
  assignSeat,
  revokeSeat,
  recordTokenConsumption,
  filterByTenantIsolation
} from '../src/lib/businessTenancyEngine';
import type { TenantMember } from '../src/types/businessTenancy';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  [PASS] ${testName}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${testName}${detail ? ` - ${detail}` : ''}`);
    failed++;
  }
}

export async function runBusinessTenancyVerification(): Promise<{ passed: number; failed: number }> {
  console.log('\n--- Running Suite 51: Milestone 20 (Business & Multi-Tenant Management) ---');

  // ==========================================================================
  // Test Group 1: Subscription Tier Entitlements
  // ==========================================================================
  console.log('Group 1: Subscription Tier Matrix & Entitlement Checks');
  assert(TIER_ENTITLEMENT_MATRIX.free_spark.maxSeats === 1, 'Free tier has 1 seat');
  assert(TIER_ENTITLEMENT_MATRIX.educator_classroom.maxSeats === 35, 'Educator tier has 35 seats');
  assert(TIER_ENTITLEMENT_MATRIX.institutional_enterprise.maxSeats === 5000, 'Enterprise tier has 5,000 seats');

  const freeTenant = createTenantAccount('t_free', 'Free Student', 'free_spark');
  const proTenant = createTenantAccount('t_pro', 'Pro Student', 'pro_student');
  const eduTenant = createTenantAccount('t_edu', 'Classroom Beta', 'educator_classroom');
  const univTenant = createTenantAccount('t_univ', 'Metropolitan Univ', 'institutional_enterprise');

  // Free Tier Entitlements
  const freeApiKey = checkFeatureEntitlement(freeTenant, 'customApiKeys');
  assert(freeApiKey.allowed === false, 'Free tier forbidden from BYO API keys');
  const freeExport = checkFeatureEntitlement(freeTenant, 'dataExportGdpr');
  assert(freeExport.allowed === true, 'Free tier allowed GDPR data export');

  // Pro Tier Entitlements
  const proApiKey = checkFeatureEntitlement(proTenant, 'customApiKeys');
  assert(proApiKey.allowed === true, 'Pro tier allowed BYO API keys');
  const proClass = checkFeatureEntitlement(proTenant, 'classroomAnalytics');
  assert(proClass.allowed === false, 'Pro tier forbidden from classroom analytics');

  // Educator Tier Entitlements
  const eduClass = checkFeatureEntitlement(eduTenant, 'classroomAnalytics');
  assert(eduClass.allowed === true, 'Educator tier allowed classroom analytics');
  const eduDiff = checkFeatureEntitlement(eduTenant, 'differentiatedPlanner');
  assert(eduDiff.allowed === true, 'Educator tier allowed differentiated instruction planner');

  // Enterprise Tier Entitlements
  const univRadar = checkFeatureEntitlement(univTenant, 'institutionalRadar');
  assert(univRadar.allowed === true, 'Enterprise tier allowed institutional early warning radar');
  const univKAnon = checkFeatureEntitlement(univTenant, 'kAnonymityReporting');
  assert(univKAnon.allowed === true, 'Enterprise tier allowed k-anonymity reports');

  // Inactive Tenant
  const suspendedTenant = { ...freeTenant, status: 'suspended' as const };
  const suspendedCheck = checkFeatureEntitlement(suspendedTenant, 'dataExportGdpr');
  assert(suspendedCheck.allowed === false, 'Suspended tenant denied features');

  // ==========================================================================
  // Test Group 2: Seat Allocation & Enforcement
  // ==========================================================================
  console.log('Group 2: Tenant Seat Allocation & Roster Enforcement');
  const smallTenant = createTenantAccount('t_small', 'Small Cohort', 'educator_classroom');
  smallTenant.seatLimit = 3; // artificially small for test
  smallTenant.activeSeats = 1; // owner has 1

  const memberRoster: TenantMember[] = [
    { memberUid: 'owner_1', tenantId: 't_small', email: 'owner@test.edu', role: 'owner', assignedAt: Date.now(), status: 'active' }
  ];

  // Assign Seat 2
  const a1 = assignSeat(smallTenant, 'user_2', 'user2@test.edu', 'student', memberRoster);
  assert(a1.result.success === true, 'Assigns 2nd seat successfully');
  assert(smallTenant.activeSeats === 2, 'Active seats incremented to 2');
  if (a1.newMember) memberRoster.push(a1.newMember);

  // Assign Seat 3 (Cap reached)
  const a2 = assignSeat(smallTenant, 'user_3', 'user3@test.edu', 'student', memberRoster);
  assert(a2.result.success === true, 'Assigns 3rd seat successfully (limit reached)');
  assert(smallTenant.activeSeats === 3, 'Active seats incremented to 3');
  if (a2.newMember) memberRoster.push(a2.newMember);

  // Attempt Seat 4 (Must be rejected)
  const a3 = assignSeat(smallTenant, 'user_4', 'user4@test.edu', 'student', memberRoster);
  assert(a3.result.success === false, '4th seat rejected when seat limit reached');
  assert(a3.result.remainingSeats === 0, 'Reports 0 remaining seats');
  assert(smallTenant.activeSeats === 3, 'Active seats capped at 3');

  // Re-assigning existing active user returns existing seat without incrementing
  const aReassign = assignSeat(smallTenant, 'user_2', 'user2@test.edu', 'student', memberRoster);
  assert(aReassign.result.success === true, 'Re-assigning existing active user succeeds');
  assert(smallTenant.activeSeats === 3, 'Active seats not duplicated on re-assignment');

  // Revoke Seat 2
  const rev = revokeSeat(smallTenant, 'user_2', memberRoster);
  assert(rev.success === true, 'Revoking seat succeeds');
  assert(smallTenant.activeSeats === 2, 'Active seats decremented to 2');
  const revokedMem = memberRoster.find(m => m.memberUid === 'user_2');
  assert(revokedMem?.status === 'revoked', 'Member marked as revoked in roster');

  // ==========================================================================
  // Test Group 3: Token Quota & Overage Prevention
  // ==========================================================================
  console.log('Group 3: Monthly Token Quota Enforcement');
  const tokenTenant = createTenantAccount('t_tok', 'Token Test', 'free_spark');
  // Free spark quota is 250,000
  const tRes1 = recordTokenConsumption(tokenTenant, 100000);
  assert(tRes1.allowed === true, 'Consumes 100k tokens within quota');
  assert(tokenTenant.tokensConsumed === 100000, 'Tokens consumed recorded as 100k');
  assert(tRes1.remainingTokens === 150000, 'Remaining tokens is 150k');

  // Consume another 100k
  const tRes2 = recordTokenConsumption(tokenTenant, 100000);
  assert(tRes2.allowed === true, 'Consumes 2nd 100k tokens');
  assert(tRes2.remainingTokens === 50000, 'Remaining tokens is 50k');

  // Attempt to consume 60k (would exceed 250k)
  const tRes3 = recordTokenConsumption(tokenTenant, 60000);
  assert(tRes3.allowed === false, 'Blocks consumption exceeding monthly quota');
  assert(tRes3.overagePrevented === true, 'Flags overagePrevented = true');
  assert(tokenTenant.tokensConsumed === 200000, 'Tokens consumed remains at 200k (prevented overage)');

  // ==========================================================================
  // Test Group 4: Cross-Tenant Isolation Safeguards
  // ==========================================================================
  console.log('Group 4: Strict Cross-Tenant Isolation');
  const mixedRecords = [
    { id: '1', tenantId: 'tenant_alpha', data: 'Secret Alpha 1' },
    { id: '2', tenantId: 'tenant_beta', data: 'Secret Beta 1' },
    { id: '3', tenantId: 'tenant_alpha', data: 'Secret Alpha 2' },
    { id: '4', tenantId: 'tenant_gamma', data: 'Secret Gamma 1' }
  ];

  const alphaOnly = filterByTenantIsolation(mixedRecords, 'tenant_alpha');
  assert(alphaOnly.length === 2, 'Tenant Alpha query returns strictly 2 records');
  assert(alphaOnly.every(r => r.tenantId === 'tenant_alpha'), 'Zero cross-tenant records leaked to Alpha');

  const emptyTenant = filterByTenantIsolation(mixedRecords, '');
  assert(emptyTenant.length === 0, 'Empty tenantId returns 0 records (safe fallback)');

  console.log(`\nMilestone 20 Verification Finished: ${passed} passed, ${failed} failed.`);
  return { passed, failed };
}

if (process.argv[1]?.includes('businessTenancyVerification')) {
  runBusinessTenancyVerification().then(res => {
    if (res.failed > 0) process.exit(1);
  });
}
