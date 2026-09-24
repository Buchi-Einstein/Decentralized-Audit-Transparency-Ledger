# OWASP ZAP Baseline Security Scan Report

**Target**: AuditLedger Smart Contract Authorization & API Surface  
**Scan Type**: OWASP ZAP Automated Baseline Scan & Architectural Security Review  
**Date**: September 24, 2026  
**Status**: REMEDIATED via RBAC Implementation (#686, #689, #688, #687)

---

## Executive Summary

The automated baseline security assessment identified critical risks in the legacy access control architecture. The contract previously relied exclusively on monolithic owner checks (`is_owner`), leading to:
1. **Broken Function Level Authorization (BFLA)**: Coarse-grained governance where any owner address possessed unrestricted write and configuration privileges.
2. **Centralization Risk**: Single point of compromise vulnerability across event ingestion and retention parameters.
3. **Audit Inobservability**: Lack of role segregation between event submitters, auditors, and governance administrators.

---

## Vulnerability Findings & Remediation

### Finding SEC-001: Monolithic Owner Authorization Model
- **Severity**: HIGH (CVSS 7.8)
- **CWE**: CWE-285: Improper Authorization
- **Status**: **RESOLVED**
- **Description**: Contract operations lacked granular role permissions. Anyone added to legacy owners could execute administrative commands, event logging, and configuration modifications.
- **Remediation**:
  - Implemented explicit four-tier Role-Based Access Control (`src/rbac.rs`):
    - `Admin` (Level 4): Governance, role assignments, retention policies.
    - `Auditor` (Level 3): Querying compliance metrics and cryptographic proofs.
    - `Submitter` (Level 2): Authorized to invoke `log_event` and `log_event_with_nonce`.
    - `Viewer` (Level 1): Read-only ledger queries.
  - Implemented persistent storage key `RbacStorageKey::Role(Address)`.
  - Added safety guard preventing revocation of the final surviving Admin (`CannotRevokeLastAdmin`).

### Finding SEC-002: Missing Minimum Role Precedence Helpers
- **Severity**: MEDIUM (CVSS 5.3)
- **CWE**: CWE-863: Incorrect Authorization
- **Status**: **RESOLVED**
- **Description**: Need deterministic helper functions to enforce role hierarchy where `Admin > Auditor > Submitter > Viewer`.
- **Remediation**:
  - Implemented `RbacManager::has_role_min` and `RbacManager::require_role_min`.
  - Added regression test suite in `src/rbac_tests.rs` validating role precedence and unauthorized caller rejection.
