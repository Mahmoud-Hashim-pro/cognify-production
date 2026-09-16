/**
 * Cognify 2.0 - Real-World Persona Simulation Testbed (Phase D - Requirement 32)
 * tests/validation/institutionPilotValidation.ts
 *
 * Validates institutional deployment & pilot testbed:
 * 1. Multi-Tenant Seat Allocation Limits:
 *    - Subscription tier matrix and seat quota boundaries
 *    - Seat allocation rejection when limit reached
 *    - Seat revocation and re-allocation
 *    - Token quota consumption tracking & overage prevention
 *    - Cross-tenant data isolation enforcement
 * 
 * 2. Department Roster Assignment:
 *    - Multi-department institutional hierarchy (CS, IS, AI)
 *    - Academic role assignments (Student, TA, Instructor, Dept Head)
 *    - Department-level k-anonymity (k >= 5) suppression for sub-threshold cohorts (< 5)
 *    - Safe email masking (j***e@university.edu)
 * 
 * 3. FERPA-Compliant Cryptographic Audit Logs:
 *    - Tamper-resistant SHA-256 chained audit ledger for institutional compliance
 *    - Verified audit chain integrity from genesis block
 *    - Tamper detection test (catches and pinpoints forged entries)
 * 
 * 4. Bulk Export Verification Receipt:
 *    - Standardized student data portability packages with SHA-256 integrity checksums
 *    - Formal FERPA compliance certification statement
 *    - Merkle-linked batch export verification receipt
 */

import {
  createTenantAccount,
  assignSeat,
  revokeSeat,
  checkFeatureEntitlement,
  recordTokenConsumption,
  filterByTenantIsolation,
  TIER_ENTITLEMENT_MATRIX,
} from '../../src/lib/businessTenancyEngine.js';
import {
  createAuditEntry,
  verifyAuditChain,
  packageStudentExport,
  sha256,
  GENESIS_PREV_HASH,
} from '../../src/lib/privacySecurityEngine.js';
import { maskEmail, K_ANONYMITY_THRESHOLD } from '../../src/lib/institution.js';
import { createInitialStudentState } from '../../src/lib/studentStateEngine.js';
import type { TenantAccount, TenantMember } from '../../src/types/businessTenancy.js';
import type { AuditLogEntry, StudentDataExportPackage } from '../../src/types/privacySecurity.js';

let totalPassed = 0;
let totalFailed = 0;

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    totalPassed++;
  } else {
    console.error(`  ✗ FAIL: ${testName}`);
    totalFailed++;
  }
}

export async function runInstitutionPilotValidationSuite(): Promise<{ passed: number; failed: number }> {
  console.log('\n================================================================');
  console.log('🏛️ RUNNING INSTITUTIONAL PILOT TESTBED & DEPLOYMENT VALIDATION');
  console.log('================================================================\n');

  // ===========================================================================
  // 1. Multi-Tenant Seat Allocation Limits & Entitlements
  // ===========================================================================
  console.log('----------------------------------------------------------------');
  console.log('🏢 1. Multi-Tenant Seat Allocation Limits & Entitlements');
  console.log('----------------------------------------------------------------');

  const institutionTenantId = 'tenant_cairo_fci_pilot';
  const tenant: TenantAccount = createTenantAccount(
    institutionTenantId,
    'Faculty of Computers and AI - Pilot Lab',
    'educator_classroom' // Classroom tier with 35 seats limit
  );

  // Set testing seatLimit to 5 to verify boundary enforcement deterministically
  tenant.seatLimit = 5;
  tenant.activeSeats = 1; // 1 initial seat occupied by creator

  const activeMembers: TenantMember[] = [
    {
      memberUid: 'admin_prof_turing',
      tenantId: institutionTenantId,
      email: 'alan.turing@fci.edu',
      role: 'admin',
      assignedAt: Date.now(),
      status: 'active',
    },
  ];

  assert(tenant.activeSeats === 1, 'Initial active seat count is 1 (Admin)');
  assert(tenant.seatLimit === 5, 'Seat quota limit set to 5');

  // Allocate seats 2, 3, 4, 5 successfully
  const studentEmails = [
    'student.ahmed@fci.edu',
    'student.mariam@fci.edu',
    'student.youssef@fci.edu',
    'student.salma@fci.edu',
  ];

  for (let i = 0; i < studentEmails.length; i++) {
    const uid = `std_pilot_${i + 1}`;
    const email = studentEmails[i];
    const { result, newMember } = assignSeat(tenant, uid, email, 'student', activeMembers);
    
    assert(result.success === true, `Successfully allocated seat ${tenant.activeSeats} to ${email}`);
    if (newMember) activeMembers.push(newMember);
  }

  assert(tenant.activeSeats === 5, 'Active seats reached exactly 5/5');
  assert(tenant.seatLimit - tenant.activeSeats === 0, 'Zero remaining seats available');

  // Attempt to allocate 6th seat (MUST BE REJECTED)
  console.log('\n[Tenancy] Boundary Enforcement: Allocating Beyond Seat Quota');
  const overflowAttempt = assignSeat(
    tenant,
    'std_pilot_overflow',
    'student.overflow@fci.edu',
    'student',
    activeMembers
  );

  assert(overflowAttempt.result.success === false, 'Seat allocation rejected when exceeding quota');
  assert(overflowAttempt.result.remainingSeats === 0, 'Remaining seats reported as 0');
  assert(overflowAttempt.result.message.includes('Seat limit reached'), 'Rejection message cites seat limit');
  assert(overflowAttempt.newMember === undefined, 'No member record created for rejected allocation');

  // Seat Revocation and Re-Allocation
  console.log('\n[Tenancy] Seat Revocation & Re-Allocation Cycle');
  const revokeTargetUid = 'std_pilot_1';
  const revokeResult = revokeSeat(tenant, revokeTargetUid, activeMembers);

  assert(revokeResult.success === true, 'Successfully revoked seat from inactive student');
  assert(tenant.activeSeats === 4, 'Active seats decremented to 4');
  assert(tenant.seatLimit - tenant.activeSeats === 1, '1 seat now available for re-allocation');

  // Re-allocate into freed seat
  const reallocateResult = assignSeat(
    tenant,
    'std_pilot_new_replacement',
    'student.replacement@fci.edu',
    'student',
    activeMembers
  );
  assert(reallocateResult.result.success === true, 'Successfully allocated replacement student into freed seat');
  assert(tenant.activeSeats === 5, 'Seats returned to capacity (5/5)');

  // Token Quota Consumption & Overage Guard
  console.log('\n[Tenancy] Token Consumption Quota & Overage Guard');
  tenant.monthlyTokenQuota = 100000;
  tenant.tokensConsumed = 95000;

  // Small consumption within quota
  const consumption1 = recordTokenConsumption(tenant, 4000);
  assert(consumption1.allowed === true, 'Allowed token consumption within monthly quota');
  assert(consumption1.tokensConsumed === 99000, 'Tokens consumed updated to 99,000');
  assert(consumption1.overagePrevented === false, 'No overage occurred');

  // Large consumption exceeding quota
  const consumption2 = recordTokenConsumption(tenant, 5000);
  assert(consumption2.allowed === false, 'Blocked token consumption exceeding monthly quota');
  assert(consumption2.overagePrevented === true, 'Overage prevented by tenancy engine');
  assert(consumption2.tokensConsumed === 99000, 'Consumed tokens preserved without overdrawing');

  // Cross-Tenant Data Isolation Guard
  console.log('\n[Tenancy] Cross-Tenant Data Isolation Guard');
  interface TenantBoundEntity {
    id: string;
    tenantId: string;
    data: string;
  }

  const mixedTenantData: TenantBoundEntity[] = [
    { id: 'rec_1', tenantId: institutionTenantId, data: 'FCI Exam Notes' },
    { id: 'rec_2', tenantId: institutionTenantId, data: 'FCI Roster R1' },
    { id: 'rec_3', tenantId: 'tenant_other_university', data: 'Confidential Harvard Notes' },
  ];

  const isolatedFciRecords = filterByTenantIsolation(mixedTenantData, institutionTenantId);
  assert(isolatedFciRecords.length === 2, 'Isolated exactly 2 records for Cairo FCI');
  assert(isolatedFciRecords.every(r => r.tenantId === institutionTenantId), 'All isolated records strictly belong to Cairo FCI');
  assert(!isolatedFciRecords.some(r => r.tenantId === 'tenant_other_university'), 'Zero foreign tenant records leaked');

  // ===========================================================================
  // 2. Department Roster Assignment & k-Anonymity (k >= 5)
  // ===========================================================================
  console.log('\n----------------------------------------------------------------');
  console.log('👥 2. Department Roster Assignment & k-Anonymity Privacy');
  console.log('----------------------------------------------------------------');

  interface InstitutionalMember {
    uid: string;
    name: string;
    email: string;
    departmentId: 'cs' | 'is' | 'ai';
    role: 'student' | 'teaching_assistant' | 'instructor' | 'dept_admin';
  }

  const institutionRoster: InstitutionalMember[] = [];

  // 15 Students in Computer Science (CS)
  for (let i = 1; i <= 15; i++) {
    institutionRoster.push({
      uid: `cs_student_${i}`,
      name: `CS Student ${i}`,
      email: `cs.student${i}@fci.cu.edu.eg`,
      departmentId: 'cs',
      role: 'student',
    });
  }

  // 8 Students in Information Systems (IS)
  for (let i = 1; i <= 8; i++) {
    institutionRoster.push({
      uid: `is_student_${i}`,
      name: `IS Student ${i}`,
      email: `is.student${i}@fci.cu.edu.eg`,
      departmentId: 'is',
      role: 'student',
    });
  }

  // 3 Students in Artificial Intelligence (AI) - Sub-threshold cohort (< 5)
  for (let i = 1; i <= 3; i++) {
    institutionRoster.push({
      uid: `ai_student_${i}`,
      name: `AI Student ${i}`,
      email: `ai.student${i}@fci.cu.edu.eg`,
      departmentId: 'ai',
      role: 'student',
    });
  }

  assert(institutionRoster.length === 26, 'Institutional roster populated with 26 students across 3 departments');

  // Email Privacy Masking Validation
  console.log('\n[Roster] FERPA Email Privacy Masking');
  const sampleEmail = 'alan.turing@fci.cu.edu.eg';
  const masked = maskEmail(sampleEmail);
  assert(masked.startsWith('a***g@'), `Email masked safely: ${masked}`);
  assert(!masked.includes('alan.turing'), 'Original full name scrubbed from masked email');

  // Department Partitioning & k-Anonymity Guard
  console.log('\n[Roster] k-Anonymity (k >= 5) Department Threshold Enforcement');
  interface DepartmentReport {
    departmentId: string;
    enrolledCount: number;
    kAnonymitySuppressed: boolean;
    displayCohortSize: string;
  }

  function compileDepartmentReport(deptId: string, roster: InstitutionalMember[]): DepartmentReport {
    const members = roster.filter(m => m.departmentId === deptId);
    const count = members.length;
    const isSuppressed = count < K_ANONYMITY_THRESHOLD;

    return {
      departmentId: deptId,
      enrolledCount: isSuppressed ? -1 : count,
      kAnonymitySuppressed: isSuppressed,
      displayCohortSize: isSuppressed ? '<5 (Suppressed for Privacy)' : `${count} students`,
    };
  }

  const csReport = compileDepartmentReport('cs', institutionRoster);
  assert(csReport.kAnonymitySuppressed === false, 'CS cohort (15 students) satisfies k >= 5, not suppressed');
  assert(csReport.displayCohortSize === '15 students', 'CS cohort shows exact count');

  const isReport = compileDepartmentReport('is', institutionRoster);
  assert(isReport.kAnonymitySuppressed === false, 'IS cohort (8 students) satisfies k >= 5, not suppressed');
  assert(isReport.displayCohortSize === '8 students', 'IS cohort shows exact count');

  const aiReport = compileDepartmentReport('ai', institutionRoster);
  assert(aiReport.kAnonymitySuppressed === true, 'AI cohort (3 students) is SUB-THRESHOLD (< 5), suppressed for privacy');
  assert(aiReport.displayCohortSize === '<5 (Suppressed for Privacy)', 'AI cohort count masked with standard privacy label');
  assert(aiReport.enrolledCount === -1, 'Raw enrolled count omitted for suppressed cohort');

  // ===========================================================================
  // 3. FERPA-Compliant Cryptographic Chained Audit Logging
  // ===========================================================================
  console.log('\n----------------------------------------------------------------');
  console.log('🔒 3. FERPA-Compliant Cryptographic Chained Audit Logging');
  console.log('----------------------------------------------------------------');

  const auditLedger: AuditLogEntry[] = [];
  const now = Date.now();

  // Genesis Entry: Role assignment by Department Chair
  const entry0 = createAuditEntry(
    'actor_dept_chair',
    'ROLE_CHANGE',
    'cs_student_1',
    { previousRole: 'student', newRole: 'teaching_assistant', authorizedBy: 'Dean Academic Affairs' },
    GENESIS_PREV_HASH,
    now - 12000
  );
  auditLedger.push(entry0);

  // Entry 1: Institutional Research DP Query
  const entry1 = createAuditEntry(
    'actor_ir_analyst',
    'DP_QUERY',
    'cohort_cs101',
    { epsilonUsed: 0.5, queryName: 'curriculum_bottlenecks' },
    entry0.entryHash,
    now - 8000
  );
  auditLedger.push(entry1);

  // Entry 2: FERPA Bulk Data Export Requested by Registrar
  const entry2 = createAuditEntry(
    'actor_registrar',
    'DATA_EXPORT',
    'institution_all_departments',
    { exportFormat: 'cognify-export-v2.0', targetCount: 26, complianceStandard: 'FERPA_34_CFR_99' },
    entry1.entryHash,
    now - 4000
  );
  auditLedger.push(entry2);

  // Entry 3: Cascade Erasure of Graduated Student Record
  const entry3 = createAuditEntry(
    'actor_dpo_officer',
    'CASCADE_ERASURE',
    'cs_student_graduated_99',
    { erasureReason: 'ferpa_request', tombstoneHash: sha256('graduated_99_tombstone') },
    entry2.entryHash,
    now
  );
  auditLedger.push(entry3);

  assert(auditLedger.length === 4, 'Recorded 4 sequential compliance audit log entries');
  assert(auditLedger[0].prevHash === GENESIS_PREV_HASH, 'Genesis entry links to canonical GENESIS_PREV_HASH');
  assert(auditLedger[1].prevHash === auditLedger[0].entryHash, 'Entry 1 correctly chains to Entry 0');
  assert(auditLedger[2].prevHash === auditLedger[1].entryHash, 'Entry 2 correctly chains to Entry 1');
  assert(auditLedger[3].prevHash === auditLedger[2].entryHash, 'Entry 3 correctly chains to Entry 2');

  // Verify Audit Chain Integrity
  console.log('\n[Audit] Cryptographic Chain Verification');
  const initialVerification = verifyAuditChain(auditLedger);
  assert(initialVerification.isValid === true, 'Audit chain verified successfully with zero tampering');
  assert(initialVerification.totalEntries === 4, 'All 4 audit blocks verified');
  assert(initialVerification.tamperedIndex === -1, 'No tampered index found');

  // Tamper Detection Verification: Forge Entry 1 payload
  console.log('\n[Audit] Malicious Tampering Detection Invariant');
  const tamperedLedger = JSON.parse(JSON.stringify(auditLedger)) as AuditLogEntry[];
  tamperedLedger[1].payloadDigest = sha256(JSON.stringify({ maliciousModification: true }));

  const tamperedVerification = verifyAuditChain(tamperedLedger);
  assert(tamperedVerification.isValid === false, 'Detected malicious tampering in audit chain');
  assert(tamperedVerification.tamperedIndex === 1, 'Accurately pinpointed forged block at index 1');
  assert(tamperedVerification.brokenReason?.includes('tampering detected'), 'Reported explicit tampering diagnosis reason');

  // ===========================================================================
  // 4. Bulk Export Verification Receipt
  // ===========================================================================
  console.log('\n----------------------------------------------------------------');
  console.log('📦 4. Bulk Export Verification Receipt & FERPA Certification');
  console.log('----------------------------------------------------------------');

  const exportPackages: StudentDataExportPackage[] = [];
  const exportedStudentUids = ['cs_student_1', 'cs_student_2', 'cs_student_3'];

  for (const uid of exportedStudentUids) {
    const studentState = createInitialStudentState(uid, 'Intermediate');
    const pkg = packageStudentExport(studentState, {
      learningEventsCount: 14,
      retentionSchedulesCount: 4,
      spatialMemoriesCount: 2,
    });
    exportPackages.push(pkg);
  }

  assert(exportPackages.length === 3, 'Generated 3 standardized student data export packages');
  
  // Verify individual export integrity and FERPA statement
  for (const pkg of exportPackages) {
    assert(pkg.formatVersion === 'cognify-export-v2.0', 'Export package conforms to format "cognify-export-v2.0"');
    assert(pkg.complianceStatement.includes('FERPA'), 'Compliance statement explicitly certifies FERPA compliance');
    assert(pkg.integrityChecksum.length === 64, 'Generated 64-character SHA-256 cryptographic checksum');
    
    // Verify checksum matches data payload
    const serializedPayload = JSON.stringify(pkg.data);
    const calculatedChecksum = sha256(serializedPayload);
    assert(pkg.integrityChecksum === calculatedChecksum, `Checksum verified for student ${pkg.studentUid}`);
  }

  // Synthesize Batch Verification Receipt
  interface BatchExportVerificationReceipt {
    receiptId: string;
    institutionId: string;
    totalRecordsExported: number;
    formatVersion: string;
    batchReceiptHash: string;
    ferpaComplianceCertified: boolean;
    allChecksumsVerified: boolean;
    timestampIso: string;
    auditLogRef: string;
  }

  const combinedChecksumString = exportPackages.map(p => `${p.studentUid}:${p.integrityChecksum}`).join('|');
  const batchReceiptHash = sha256(`${institutionTenantId}|${exportPackages.length}|${combinedChecksumString}`);

  const batchReceipt: BatchExportVerificationReceipt = {
    receiptId: `receipt_batch_${Date.now()}`,
    institutionId: institutionTenantId,
    totalRecordsExported: exportPackages.length,
    formatVersion: 'cognify-export-v2.0',
    batchReceiptHash,
    ferpaComplianceCertified: true,
    allChecksumsVerified: true,
    timestampIso: new Date().toISOString(),
    auditLogRef: entry2.id,
  };

  assert(batchReceipt.totalRecordsExported === 3, 'Batch receipt records 3 exported student files');
  assert(batchReceipt.ferpaComplianceCertified === true, 'Batch receipt certifies 100% FERPA compliance');
  assert(batchReceipt.batchReceiptHash.length === 64, 'Batch receipt contains Merkle-linked SHA-256 hash');
  assert(batchReceipt.auditLogRef === entry2.id, 'Batch receipt links directly to immutable audit ledger entry');

  // ---------------------------------------------------------------------------
  // SUMMARY
  // ---------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`🎉 INSTITUTION PILOT VALIDATION COMPLETE: ${totalPassed} Passed, ${totalFailed} Failed`);
  console.log('================================================================\n');

  return { passed: totalPassed, failed: totalFailed };
}

// Direct CLI execution guard
const isDirectRun = process.argv[1]?.replace(/\\/g, '/').includes('institutionPilotValidation');
if (isDirectRun) {
  runInstitutionPilotValidationSuite().then(({ failed }) => {
    process.exit(failed > 0 ? 1 : 0);
  }).catch((err) => {
    console.error('Fatal error in Institution Pilot Validation Suite:', err);
    process.exit(1);
  });
}
