import { describe, it, expect, vi, beforeEach } from "vitest";

// We'll mock firestore functions used by PaymentService
vi.mock("firebase/firestore", () => {
  return {
    collection: vi.fn(() => ({})),
    doc: vi.fn(() => ({})),
    addDoc: vi.fn(async () => ({ id: "payment1" })),
    runTransaction: vi.fn(async (db, fn) => {
      // call the transaction function with a fake tx object
      const tx = {
        set: vi.fn(),
        update: vi.fn(),
        get: vi.fn(async () => ({
          exists: () => true,
          data: () => ({ remainingSessions: 2, sessionsPaid: 4 }),
        })),
        delete: vi.fn(),
      };
      await fn(tx);
      return;
    }),
    Timestamp: { now: () => new Date() },
    increment: (n) => n,
  };
});

vi.mock("../src/firebase", () => ({ db: {} }));

import { PaymentService } from "../src/services/payment-service";

describe("PaymentService (basic smoke)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("processPayment should return success for simple payment", async () => {
    const result = await PaymentService.processPayment({
      amount: 100,
      clientId: "c1",
    });
    expect(result.success).toBe(true);
    expect(result.paymentId).toBeDefined();
  });

  it("createAppointmentAndConsumeSession should handle missing sessions gracefully", async () => {
    const appointmentData = { clientId: "c1", usedCentralRemaining: true };
    const res = await PaymentService.createAppointmentAndConsumeSession(
      appointmentData,
      null
    );
    // With the mocked tx.get returning remainingSessions:2 the transaction should succeed
    expect(res.success).toBe(true);
    expect(res.appointmentId).toBeDefined();
  });
});
