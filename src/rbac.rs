//! Role-Based Access Control (RBAC) Module (#686 #689 #688 #687)
//!
//! Replaces legacy single-owner authorization checks with explicit,
//! granular roles, precedence hierarchies, and persistent contract storage.

use soroban_sdk::{contracterror, contracttype, Address, Env};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum RbacError {
    UnauthorizedCaller = 401,
    RoleNotFound = 404,
    InsufficientRole = 403,
    CannotRevokeLastAdmin = 409,
    InvalidRoleAssignment = 422,
}

#[contracttype]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Role {
    /// Read-only access to published audit events and public verification
    Viewer = 1,
    /// Permission to submit and record new audit events and batches
    Submitter = 2,
    /// Permission to inspect audit analytics, compliance stats, and verification proofs
    Auditor = 3,
    /// Full governance permissions: assign roles, configure retention, upgrade policies
    Admin = 4,
}

#[contracttype]
pub enum RbacStorageKey {
    Role(Address),
    AdminCount,
}

pub struct RbacManager;

impl RbacManager {
    /// Assigns or updates the role of a target address. Caller must have Admin role.
    pub fn set_role(
        env: &Env,
        caller: &Address,
        target: &Address,
        role: Role,
    ) -> Result<(), RbacError> {
        caller.require_auth();

        // Caller must be an Admin
        if !Self::has_role_min(env, caller, Role::Admin) {
            return Err(RbacError::InsufficientRole);
        }

        let previous_role = Self::get_role(env, target);
        let key = RbacStorageKey::Role(target.clone());

        // Update admin count tracking
        let mut admin_count: u32 = env
            .storage()
            .persistent()
            .get(&RbacStorageKey::AdminCount)
            .unwrap_or(1);

        if previous_role == Some(Role::Admin) && role != Role::Admin {
            if admin_count <= 1 {
                return Err(RbacError::CannotRevokeLastAdmin);
            }
            admin_count -= 1;
        } else if previous_role != Some(Role::Admin) && role == Role::Admin {
            admin_count += 1;
        }

        env.storage().persistent().set(&key, &role);
        env.storage()
            .persistent()
            .set(&RbacStorageKey::AdminCount, &admin_count);

        Ok(())
    }

    /// Retrieves the current role assigned to an address, if any.
    pub fn get_role(env: &Env, address: &Address) -> Option<Role> {
        let key = RbacStorageKey::Role(address.clone());
        env.storage().persistent().get(&key)
    }

    /// Checks if the address possesses at least the required minimum role level.
    pub fn has_role_min(env: &Env, address: &Address, min_role: Role) -> bool {
        match Self::get_role(env, address) {
            Some(role) => role >= min_role,
            None => false,
        }
    }

    /// Enforces that the caller possesses at least the required minimum role level.
    pub fn require_role_min(
        env: &Env,
        address: &Address,
        min_role: Role,
    ) -> Result<(), RbacError> {
        if Self::has_role_min(env, address, min_role) {
            Ok(())
        } else {
            Err(RbacError::InsufficientRole)
        }
    }

    /// Bootstraps initial superadmin role during contract initialization.
    pub fn initialize_admin(env: &Env, admin: &Address) {
        let key = RbacStorageKey::Role(admin.clone());
        env.storage().persistent().set(&key, &Role::Admin);
        env.storage()
            .persistent()
            .set(&RbacStorageKey::AdminCount, &1u32);
    }
}
