#![cfg(test)]
//! Unit tests for contract Role-Based Access Control (#686 #689 #688 #687)

use super::rbac::*;
use soroban_sdk::testutils::Address as _;
use soroban_sdk::{Address, Env};

#[test]
fn test_rbac_initialize_and_role_precedence() {
    let env = Env::default();
    let admin = Address::generate(&env);
    let auditor = Address::generate(&env);
    let submitter = Address::generate(&env);
    let viewer = Address::generate(&env);

    env.mock_all_auths();
    RbacManager::initialize_admin(&env, &admin);

    assert_eq!(RbacManager::get_role(&env, &admin), Some(Role::Admin));
    assert!(RbacManager::has_role_min(&env, &admin, Role::Admin));
    assert!(RbacManager::has_role_min(&env, &admin, Role::Auditor));
    assert!(RbacManager::has_role_min(&env, &admin, Role::Submitter));
    assert!(RbacManager::has_role_min(&env, &admin, Role::Viewer));

    // Admin sets Auditor role
    RbacManager::set_role(&env, &admin, &auditor, Role::Auditor).unwrap();
    assert_eq!(RbacManager::get_role(&env, &auditor), Some(Role::Auditor));
    assert!(RbacManager::has_role_min(&env, &auditor, Role::Auditor));
    assert!(RbacManager::has_role_min(&env, &auditor, Role::Submitter));
    assert!(!RbacManager::has_role_min(&env, &auditor, Role::Admin));

    // Admin sets Submitter role
    RbacManager::set_role(&env, &admin, &submitter, Role::Submitter).unwrap();
    assert_eq!(RbacManager::get_role(&env, &submitter), Some(Role::Submitter));
    assert!(RbacManager::has_role_min(&env, &submitter, Role::Submitter));
    assert!(!RbacManager::has_role_min(&env, &submitter, Role::Auditor));

    // Admin sets Viewer role
    RbacManager::set_role(&env, &admin, &viewer, Role::Viewer).unwrap();
    assert_eq!(RbacManager::get_role(&env, &viewer), Some(Role::Viewer));
    assert!(RbacManager::has_role_min(&env, &viewer, Role::Viewer));
    assert!(!RbacManager::has_role_min(&env, &viewer, Role::Submitter));
}

#[test]
fn test_rbac_unauthorized_role_modification_fails() {
    let env = Env::default();
    let admin = Address::generate(&env);
    let non_admin = Address::generate(&env);
    let target = Address::generate(&env);

    env.mock_all_auths();
    RbacManager::initialize_admin(&env, &admin);

    // Non-admin attempting to set role must fail with InsufficientRole
    let res = RbacManager::set_role(&env, &non_admin, &target, Role::Submitter);
    assert_eq!(res, Err(RbacError::InsufficientRole));
}

#[test]
fn test_rbac_prevent_revoking_last_admin() {
    let env = Env::default();
    let admin = Address::generate(&env);

    env.mock_all_auths();
    RbacManager::initialize_admin(&env, &admin);

    // Attempting to demote sole admin must fail
    let res = RbacManager::set_role(&env, &admin, &admin, Role::Viewer);
    assert_eq!(res, Err(RbacError::CannotRevokeLastAdmin));
}
