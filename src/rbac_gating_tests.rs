#![cfg(test)]
//! RBAC Gating and Precedence Unit Tests (#686 #689 #688 #687)

use super::rbac::*;
use soroban_sdk::testutils::Address as _;
use soroban_sdk::{Address, Env};

#[test]
fn test_rbac_roles_and_privilege_ladder() {
    let env = Env::default();
    let admin = Address::generate(&env);
    let auditor = Address::generate(&env);
    let submitter = Address::generate(&env);
    let viewer = Address::generate(&env);

    env.mock_all_auths();
    Rbac::init_admin(&env, &admin);

    assert_eq!(Rbac::get_role(&env, &admin), Some(Role::Admin));
    assert!(Rbac::has_role_min(&env, &admin, Role::Admin));

    // Assign Auditor
    Rbac::set_role(&env, &admin, &auditor, Role::Auditor).unwrap();
    assert_eq!(Rbac::get_role(&env, &auditor), Some(Role::Auditor));
    assert!(Rbac::has_role_min(&env, &auditor, Role::Auditor));
    assert!(Rbac::has_role_min(&env, &auditor, Role::Submitter));
    assert!(Rbac::has_role_min(&env, &auditor, Role::Viewer));
    assert!(!Rbac::has_role_min(&env, &auditor, Role::Admin));

    // Assign Submitter
    Rbac::set_role(&env, &admin, &submitter, Role::Submitter).unwrap();
    assert_eq!(Rbac::get_role(&env, &submitter), Some(Role::Submitter));
    assert!(Rbac::has_role_min(&env, &submitter, Role::Submitter));
    assert!(Rbac::has_role_min(&env, &submitter, Role::Viewer));
    assert!(!Rbac::has_role_min(&env, &submitter, Role::Auditor));

    // Assign Viewer
    Rbac::set_role(&env, &admin, &viewer, Role::Viewer).unwrap();
    assert_eq!(Rbac::get_role(&env, &viewer), Some(Role::Viewer));
    assert!(Rbac::has_role_min(&env, &viewer, Role::Viewer));
    assert!(!Rbac::has_role_min(&env, &viewer, Role::Submitter));
}

#[test]
fn test_rbac_non_admin_cannot_promote() {
    let env = Env::default();
    let admin = Address::generate(&env);
    let rogue = Address::generate(&env);
    let target = Address::generate(&env);

    env.mock_all_auths();
    Rbac::init_admin(&env, &admin);

    let err = Rbac::set_role(&env, &rogue, &target, Role::Admin);
    assert_eq!(err, Err(RbacError::InsufficientRole));
}

#[test]
fn test_rbac_cannot_remove_sole_admin() {
    let env = Env::default();
    let admin = Address::generate(&env);

    env.mock_all_auths();
    Rbac::init_admin(&env, &admin);

    let err = Rbac::set_role(&env, &admin, &admin, Role::Viewer);
    assert_eq!(err, Err(RbacError::CannotRevokeLastAdmin));
}
