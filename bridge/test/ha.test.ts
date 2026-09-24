/**
 * Bridge Relayer High Availability & Leader Election Tests (#452 #455 #457 #459)
 */

import {
  LeaderElector,
  StateSynchronizer,
  RelayerHealthMonitor,
  LeaseLock,
} from "../relayer/ha";

describe("Bridge Relayer High Availability Suite", () => {
  let sharedLease: LeaseLock | null = null;
  const mockStore = {
    getLease: async () => sharedLease,
    setLease: async (l: LeaseLock) => {
      sharedLease = l;
      return true;
    },
  };

  beforeEach(() => {
    sharedLease = null;
  });

  it("should elect a single leader when multiple nodes start", async () => {
    const nodeA = new LeaderElector("node-a", 200, 50, mockStore);
    const nodeB = new LeaderElector("node-b", 200, 50, mockStore);

    await nodeA.start();
    await nodeB.start();

    // Allow loop to tick
    await new Promise((r) => setTimeout(r, 80));

    const leaders = [nodeA.isLeader(), nodeB.isLeader()].filter(Boolean);
    expect(leaders.length).toBe(1);

    await nodeA.stop();
    await nodeB.stop();
  });

  it("should trigger automatic failover when leader stops", async () => {
    const nodeA = new LeaderElector("node-a", 100, 30, mockStore);
    const nodeB = new LeaderElector("node-b", 100, 30, mockStore);

    await nodeA.start();
    await new Promise((r) => setTimeout(r, 50));
    expect(nodeA.isLeader()).toBe(true);

    await nodeB.start();
    expect(nodeB.isLeader()).toBe(false);

    // Stop leader Node A
    await nodeA.stop();

    // Wait for lease expiry and failover
    await new Promise((r) => setTimeout(r, 150));

    expect(nodeB.isLeader()).toBe(true);
    await nodeB.stop();
  });

  it("should synchronize state and report accurate health status", async () => {
    const nodeA = new LeaderElector("node-a", 500, 100, mockStore);
    const sync = new StateSynchronizer();
    const monitor = new RelayerHealthMonitor(nodeA, sync);

    expect(monitor.isAlive()).toBe(true);
    expect(monitor.isReady()).toBe(true);

    sync.updateLeaderState(1042, "0xabcd1234", 1);
    const status = monitor.getStatusJson();

    expect(status.lastSequence).toBe(1042);
    expect(status.status).toBe("HEALTHY");

    monitor.setRpcHealth(false);
    expect(monitor.isReady()).toBe(false);
    expect(monitor.getStatusJson().status).toBe("DEGRADED");
  });
});
