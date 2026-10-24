import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { VectorStore } from "./sqlite";
import type { L0Record } from "./types";

/**
 * A exclusao por sessao no store sqlite (#105).
 *
 * O filtro de isolamento compara o `team_id` da linha com o `team_id` do
 * filtro. A consulta que monta as linhas da sessao nao trazia o
 * `team_id`: ele chegava `undefined`, a comparacao falhava sempre e a
 * funcao devolvia 0 — sem erro, sem aviso. A falha era silenciosa: o
 * HTTP respondia 200 com `deleted_count: 0`.
 */
function record(id: string, teamId: string): L0Record {
  return {
    id,
    sessionKey: "sess-probe",
    sessionId: "sess-probe",
    teamId,
    userId: "usr-1",
    agentId: "agt-1",
    role: "user",
    messageText: `mensagem ${id}`,
    recordedAt: new Date().toISOString(),
    timestamp: Date.now(),
  };
}

function storeWith(records: L0Record[]): VectorStore {
  const dir = mkdtempSync(join(tmpdir(), "tdai-store-"));
  const store = new VectorStore(join(dir, "memory.db"), 0);
  // O esquema (e as consultas preparadas) nascem no `init()`: sem ele a
  // tabela nao existe e o `upsert` devolve false em silencio.
  store.init();
  for (const item of records) {
    store.upsertL0(item, undefined);
  }
  return store;
}

describe("a exclusao por sessao no store sqlite", () => {
  it("apaga as mensagens da sessao quando o filtro traz o time", () => {
    const store = storeWith([record("r1", "team-a"), record("r2", "team-a")]);

    const deleted = store.deleteL0BySession("sess-probe", {
      teamId: "team-a",
      userId: "usr-1",
      agentId: "agt-1",
    });

    expect(deleted).toBe(2);
  });

  it("apaga as mensagens da sessao quando o filtro nao traz o time", () => {
    const store = storeWith([record("r1", "team-a"), record("r2", "team-a")]);

    expect(store.deleteL0BySession("sess-probe", { userId: "usr-1" })).toBe(2);
  });

  it("nao apaga as mensagens de outro time", () => {
    const store = storeWith([record("r1", "team-a"), record("r2", "team-b")]);

    const deleted = store.deleteL0BySession("sess-probe", { teamId: "team-b" });

    expect(deleted).toBe(1);
  });

  it("apaga um registro so quando o filtro traz o time dele", () => {
    const store = storeWith([record("r1", "team-a")]);

    expect(store.deleteL0("r1", { teamId: "team-a" })).toBe(true);
    expect(store.deleteL0("r1", { teamId: "team-b" })).toBe(false);
  });
});
