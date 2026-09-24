//! Role-Based Access Control (RBAC) Architecture (#686 #689 #688 #687)
//!
//! Replaces legacy owner checks with explicit, granular role-based access control
//! across all contract entrypoints per TODO.md specification.

use soroban_sdk::{contracterror, contracttype, Address, Env};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum RbacError {
    UnauthorizedCaller = 401,
    InsufficientRole = 403,
    RoleNotFound = 404,
    CannotRevokeLastAdmin = 409,
    InvalidRole = 422,
}

#[contracttype]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Role {
    /// Read-only access to ledger state and audit event verification
    Viewer = 1,
    /// Permission to append events (`log_event`, `log_event_with_nonce`, batches)
    Submitter = 2,
    /// Permission to inspect statistics, compliance metrics, and audit trails
    Auditor = 3,
    /// Governance authority: role assignments, policy configurations, upgrades
    Admin = 4,
}

#[contracttype]
pub enum RbacKey {
    Role(Address),
    AdminCount,
}

pub struct Rbac;

impl Rbac {
    /// Bootstraps the initial administrator during contract initialization.
    pub fn init_admin(env: &Env, admin: &Address) {
        env.storage().persistent().set(&RbacKey::Role(admin.clone()), &Role::Admin);
        env.storage().persistent().set(&RbacKey::AdminCount, &1u32);
    }

    /// Sets or modifies the role of target address. Restricted to Admin callers.
    pub fn set_role(env: &Env, caller: &Address, target: &Address, role: Role) -> Result<(), RbacError> {
        caller.require_auth();

        if !Self::has_role_min(env, caller, Role::Admin) {
            return Err(RbacError::InsufficientRole);
        }

        let previous = Self::get_role(env, target);
        let mut admin_count: u32 = env.storage().persistent().get(&RbacKey::AdminCount).unwrap_or(1);

        if previous == Some(Role::Admin) && role != Role::Admin {
            if admin_count <= 1 {
                return Err(RbacError::CannotRevokeLastAdmin);
            }
            admin_count -= 1;
        } else if previous != Some(Role::Admin) && role == Role::Admin {
            admin_count += 1;
        }

        env.storage().persistent().set(&RbacKey::Role(target.clone()), &role);
        env.storage().persistent().set(&RbacKey::AdminCount, &admin_count);

        Ok(())
    }

    /// Public inquiry returning the role assigned to an address.
    pub fn get_role(env: &Env, address: &Address) -> Option<Role> {
        env.storage().persistent().get(&RbacKey::Role(address.clone()))
    }

    /// Checks if an address satisfies the minimum required role.
    pub fn has_role_min(env: &Env, address: &Address, min_role: Role) -> bool {
        match Self::get_role(env, address) {
            Some(role) => role >= min_role,
            None => false,
        }
    }

    /// Enforces minimum role requirement, returning an error if insufficient.
    pub fn require_role_min(env: &Env, address: &Address, min_role: Role) -> Result<(), RbacError> {
        if Self::has_role_min(env, address, min_role) {
            Ok(())
        } else {
            Err(RbacError::InsufficientRole)
        }
    }
}
