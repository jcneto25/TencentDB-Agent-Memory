import { describe, expect, it } from "vitest";
import { extractClientIdentity } from "../identity.js";

/**
 * O harness (DSH) manda a sessao no header `x-deepseek-harness-session-id`.
 * Sem esse header, o proxy nao acha conversa para injetar a memoria e cai
 * em `injectedSkipped=true`.
 */
describe("o header de sessao do harness", () => {
  it("vira a sessao quando o harness manda", () => {
    const identity = extractClientIdentity(
      {
        authorization: "Bearer sk-mem-teste",
        "x-deepseek-harness-session-id": "sessao-dsh-42",
      },
      undefined,
      "dsh",
    );

    expect(identity.sessionId).toBe("sessao-dsh-42");
  });

  it("nao derruba os headers que ja eram lidos", () => {
    const identity = extractClientIdentity(
      {
        authorization: "Bearer sk-mem-teste",
        "x-conversation-id": "conversa-7",
      },
      undefined,
      "dsh",
    );

    expect(identity.sessionId).toBe("conversa-7");
  });

  it("deixa a sessao nula quando ninguem manda", () => {
    const identity = extractClientIdentity(
      { authorization: "Bearer sk-mem-teste" },
      undefined,
      "dsh",
    );

    expect(identity.sessionId).toBeNull();
  });
});
