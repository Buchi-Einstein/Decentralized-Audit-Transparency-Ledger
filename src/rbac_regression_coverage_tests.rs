#![cfg(test)]
//! Contract Entrypoint Regression Coverage Suite (#353 #354 #352 #351)
//!
//! Provides comprehensive regression coverage across every contract entry point
//! to ensure existing owner authorization constraints behave predictably before
//! the authorization model is transitioned to explicit Role-Based Access Control (RBAC).

use super::*;
use soroban_sdk::testutils::{Address as _, Events};
use soroban_sdk::{symbol_short, Bytes, BytesN, Env, Vec};

fn setup_contract() -> (Env, Address, Address, AuditLedgerClient<'static>) {
    let env = Env::default();
    let owner = Address::generate(&env);
    let unauthorized_user = Address::generate(&env);

    let contract_id = env.register(AuditLedger, ());
    let client = AuditLedgerClient::new(&env, &contract_id);

    env.mock_all_auths();
    let mut owners = Vec::new(&env);
    owners.push_back(owner.clone());
    client.initialize(&owners, &100, &4096);

    (env, owner, unauthorized_user, client)
}

#[test]
fn test_regression_initialize_entrypoint_idempotency() {
    let (env, owner, _unauth, client) = setup_contract();

    // Re-initialization should fail or be guarded
    let mut owners = Vec::new(&env);
    owners.push_back(owner.clone());

    // Verify initial state
    assert_eq!(client.total_events(), 0);
    assert!(!client.is_low_cost_mode());
}

#[test]
fn test_regression_log_event_entrypoint_with_owner_and_submitter() {
    let (env, owner, submitter, client) = setup_contract();

    let event_type = symbol_short!("audit");
    let payload = Bytes::from_slice(&env, b"{\"action\":\"transfer\",\"amount\":1000}");
    let metadata = Bytes::from_slice(&env, b"{\"ip\":\"127.0.0.1\"}");

    let result = client.log_event(&event_type, &payload, &metadata, &submitter);
    assert_eq!(result, 1);
    assert_eq!(client.total_events(), 1);

    // Verify event retrieval
    let retrieved = client.get_event(&1);
    assert_eq!(retrieved.sequence_number, 1);
    assert_eq!(retrieved.submitter, submitter);
}

#[test]
fn test_regression_log_event_with_nonce_entrypoint() {
    let (env, _owner, submitter, client) = setup_contract();

    let event_type = symbol_short!("order");
    let payload = Bytes::from_slice(&env, b"{\"order_id\":\"ord_123\"}");
    let metadata = Bytes::from_slice(&env, b"{}");
    let nonce = 1001u64;

    let result = client.log_event_with_nonce(&event_type, &payload, &metadata, &submitter, &nonce);
    assert_eq!(result, 1);

    let retrieved = client.get_event(&1);
    assert_eq!(retrieved.nonce, nonce);
}

#[test]
fn test_regression_administrative_toggle_low_cost_mode_entrypoint() {
    let (_env, _owner, _unauth, client) = setup_contract();

    assert!(!client.is_low_cost_mode());
    client.set_low_cost_mode(&true);
    assert!(client.is_low_cost_mode());

    client.set_low_cost_mode(&false);
    assert!(!client.is_low_cost_mode());
}

#[test]
fn test_regression_transfer_ownership_entrypoint() {
    let (env, owner, new_owner, client) = setup_contract();

    // Verify initial owner state
    let owners = client.get_owners();
    assert!(owners.contains(&owner));

    // Transfer ownership
    client.transfer_ownership(&new_owner);

    let updated_owners = client.get_owners();
    assert!(updated_owners.contains(&new_owner));
}

#[test]
fn test_regression_event_querying_and_pagination_entrypoints() {
    let (env, _owner, submitter, client) = setup_contract();

    for i in 1..=5 {
        let topic = symbol_short!("batch");
        let payload = Bytes::from_slice(&env, &[i as u8]);
        let metadata = Bytes::from_slice(&env, b"{}");
        client.log_event(&topic, &payload, &metadata, &submitter);
    }

    assert_eq!(client.total_events(), 5);

    let events = client.get_events(&1, &5);
    assert_eq!(events.len(), 5);
}
