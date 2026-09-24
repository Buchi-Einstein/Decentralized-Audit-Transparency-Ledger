/**
 * High Availability for Bridge Relayers (#452 #455 #457 #459)
 *
 * Implements leader election, automatic failover, state synchronization,
 * and Kubernetes health check endpoints for zero-downtime cross-chain relayers.
 */

import { EventEmitter } from "events";

export type RelayerRole = "LEADER" | "STANDBY";

export interface RelayerState {
  term: number;
  lastSequenceNumber: number;
  lastProcessedHash: string;
  updatedAt: number;
  syncLagMs: number;
}

export interface LeaseLock {
  leaderId: string;
  term: number;
  acquiredAt: number;
  expiresAt: number;
}

export class LeaderElector extends EventEmitter {
  private currentRole: RelayerRole = "STANDBY";
  private currentTerm: number = 0;
  private currentLease: LeaseLock | null = null;
  private heartbeatTimer?: NodeJS.Timeout;
  private isRunning: boolean = false;

  constructor(
    public readonly nodeId: string,
    private leaseDurationMs: number = 5000,
    private renewIntervalMs: number = 2000,
    private sharedLeaseStore?: { getLease: () => Promise<LeaseLock | null>; setLease: (l: LeaseLock) => Promise<boolean> }
  ) {
    super();
  }

  public getRole(): RelayerRole {
    return this.currentRole;
  }

  public getTerm(): number {
    return this.currentTerm;
  }

  public isLeader(): boolean {
    return this.currentRole === "LEADER";
  }

  public async start(): Promise<void> {
    this.isRunning = true;
    this.runElectionLoop();
  }

  public async stop(): Promise<void> {
    this.isRunning = false;
    if (this.heartbeatTimer) {
      clearTimeout(this.heartbeatTimer);
    }
    if (this.currentRole === "LEADER") {
      await this.stepDown();
    }
  }

  private async runElectionLoop(): Promise<void> {
    if (!this.isRunning) return;

    try {
      if (this.currentRole === "LEADER") {
        await this.renewLeadership();
      } else {
        await this.tryAcquireLeadership();
      }
    } catch (err) {
      this.emit("error", err);
    }

    if (this.isRunning) {
      this.heartbeatTimer = setTimeout(() => this.runElectionLoop(), this.renewIntervalMs);
    }
  }

  private async tryAcquireLeadership(): Promise<void> {
    const now = Date.now();
    const existingLease = this.sharedLeaseStore
      ? await this.sharedLeaseStore.getLease()
      : this.currentLease;

    if (!existingLease || existingLease.expiresAt < now) {
      // Lease is expired or unheld -> acquire
      const nextTerm = (existingLease?.term ?? 0) + 1;
      const newLease: LeaseLock = {
        leaderId: this.nodeId,
        term: nextTerm,
        acquiredAt: now,
        expiresAt: now + this.leaseDurationMs,
      };

      let success = true;
      if (this.sharedLeaseStore) {
        success = await this.sharedLeaseStore.setLease(newLease);
      } else {
        this.currentLease = newLease;
      }

      if (success) {
        this.currentRole = "LEADER";
        this.currentTerm = nextTerm;
        this.emit("promoted", { term: nextTerm, nodeId: this.nodeId });
      }
    }
  }

  private async renewLeadership(): Promise<void> {
    const now = Date.now();
    const newLease: LeaseLock = {
      leaderId: this.nodeId,
      term: this.currentTerm,
      acquiredAt: now,
      expiresAt: now + this.leaseDurationMs,
    };

    let success = true;
    if (this.sharedLeaseStore) {
      success = await this.sharedLeaseStore.setLease(newLease);
    } else {
      this.currentLease = newLease;
    }

    if (!success) {
      await this.stepDown();
    }
  }

  public async stepDown(): Promise<void> {
    if (this.currentRole === "LEADER") {
      this.currentRole = "STANDBY";
      this.currentLease = null;
      this.emit("demoted", { nodeId: this.nodeId, term: this.currentTerm });
    }
  }
}

/**
 * State Synchronizer ensures continuous synchronization of relayer cursors
 * between the active leader and standby nodes to facilitate seamless failover.
 */
export class StateSynchronizer extends EventEmitter {
  private state: RelayerState = {
    term: 0,
    lastSequenceNumber: 0,
    lastProcessedHash: "",
    updatedAt: Date.now(),
    syncLagMs: 0,
  };

  public getState(): RelayerState {
    return { ...this.state };
  }

  public updateLeaderState(seq: number, hash: string, term: number): void {
    const now = Date.now();
    this.state = {
      term,
      lastSequenceNumber: seq,
      lastProcessedHash: hash,
      updatedAt: now,
      syncLagMs: 0,
    };
    this.emit("stateUpdated", this.state);
  }

  public applyReplicaState(leaderState: RelayerState): void {
    const now = Date.now();
    this.state = {
      ...leaderState,
      syncLagMs: Math.max(0, now - leaderState.updatedAt),
    };
    this.emit("replicaSynced", this.state);
  }
}

/**
 * Health check monitor providing Kubernetes-compatible liveness and readiness state.
 */
export class RelayerHealthMonitor {
  private rpcHealthy: boolean = true;
  private databaseHealthy: boolean = true;

  constructor(
    private elector: LeaderElector,
    private synchronizer: StateSynchronizer
  ) {}

  public setRpcHealth(status: boolean): void {
    this.rpcHealthy = status;
  }

  public setDatabaseHealth(status: boolean): void {
    this.databaseHealthy = status;
  }

  public isAlive(): boolean {
    return true; // Process is running
  }

  public isReady(): boolean {
    return this.rpcHealthy && this.databaseHealthy;
  }

  public getStatusJson(): Record<string, any> {
    const state = this.synchronizer.getState();
    return {
      status: this.isReady() ? "HEALTHY" : "DEGRADED",
      nodeId: this.elector.nodeId,
      role: this.elector.getRole(),
      isLeader: this.elector.isLeader(),
      term: this.elector.getTerm(),
      lastSequence: state.lastSequenceNumber,
      syncLagMs: state.syncLagMs,
      timestamp: Date.now(),
    };
  }
}
