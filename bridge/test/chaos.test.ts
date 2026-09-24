/**
 * Chaos Engineering & Automated Recovery Tests (#461 #458 #462 #460)
 */

import { ChaosEngine, AutomatedRecoveryTester } from "../relayer/chaos";

describe("Bridge Relayer Chaos Engineering Tests", () => {
  let chaos: ChaosEngine;
  let recoveryTester: AutomatedRecoveryTester;

  beforeEach(() => {
    chaos = new ChaosEngine();
    recoveryTester = new AutomatedRecoveryTester(chaos);
  });

  afterEach(() => {
    chaos.disable();
  });

  it("should successfully simulate network partition between relay chains", async () => {
    chaos.enable();
    chaos.isolateChain("chain-polkadot");

    expect(chaos.isPartitioned("chain-stellar", "chain-polkadot")).toBe(true);

    let caughtError: Error | null = null;
    try {
      await chaos.intercept("chain-stellar", "chain-polkadot", async () => {
        return "success";
      });
    } catch (e: any) {
      caughtError = e;
    }

    expect(caughtError).not.toBeNull();
    expect(caughtError?.message).toContain("Network partition");

    // Heal partition
    chaos.healPartition("chain-polkadot");
    expect(chaos.isPartitioned("chain-stellar", "chain-polkadot")).toBe(false);

    const result = await chaos.intercept("chain-stellar", "chain-polkadot", async () => {
      return "healthy";
    });
    expect(result).toBe("healthy");
  });

  it("should inject latency and withstand slow RPC responses", async () => {
    const chaosWithLatency = new ChaosEngine({
      enabled: true,
      latencyMs: 50,
      latencyJitterMs: 10,
    });

    const start = Date.now();
    const res = await chaosWithLatency.intercept("chain-stellar", "chain-eth", async () => {
      return "completed";
    });
    const elapsed = Date.now() - start;

    expect(res).toBe("completed");
    expect(elapsed).toBeGreaterThanOrEqual(35);
  });

  it("should test automated recovery and verify zero message loss", async () => {
    const chaosFaulty = new ChaosEngine({
      enabled: true,
      faultProbability: 0.5,
      faultType: "RPC_ERROR_INJECTION",
    });

    const tester = new AutomatedRecoveryTester(chaosFaulty);
    const result = await tester.runChaosScenario(
      "RPC Transient Failure Recovery",
      "RPC_ERROR_INJECTION",
      10,
      async (txId) => {
        return true;
      }
    );

    expect(result.status).toBe("PASSED");
    expect(result.zeroMessageLossVerified).toBe(true);
    expect(result.recoveredCount + result.unrecoveredCount).toBe(10);
  });
});
