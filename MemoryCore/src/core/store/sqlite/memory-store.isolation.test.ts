import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { VectorStore } from "./memory-store.js";
import type { L0Record } from "../types.js";

/**
 * A exclusao por sessao no store sqlite (#105).
 *
 * O filtro de isolamento compara as colunas da linha com o filtro pedido.
 * Se a consulta que monta as linhas da sessao nao trouxer uma dessas
 * colunas, ela chega `undefined`, a comparacao falha sempre e a funcao
 * devolve 0 — sem erro, sem aviso. A falha era silenciosa: o HTTP
 * respondia 200 com `deleted_count: 0`.
 *
 * A promessa guardada aqui: **toda** dimensao do filtro (time, tarefa,
 * usuario, agente) tem que valer na exclusao por sessao. Uma dimensao
 * que a consulta nao traz volta como `undefined` e derruba a exclusao
 * inteira.
 */
function record(id: string, over: Partial<L0Record> = {}): L0Record {
  return {
    id,
    sessionKey: "sess-probe",
    sessionId: "sess-probe",
    teamId: "team-a",
    taskId: "task-a",
    userId: "usr-1",
    agentId: "agt-1",
    role: "user",
    messageText: `mensagem ${id}`,
    recordedAt: new Date().toISOString(),
    timestamp: Date.now(),
    ...over,
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
    const store = storeWith([record("r1"), record("r2")]);

    const deleted = store.deleteL0BySession("sess-probe", {
      teamId: "team-a",
      userId: "usr-1",
      agentId: "agt-1",
    });

    expect(deleted).toBe(2);
  });

  it("apaga as mensagens da sessao quando o filtro nao traz o time", () => {
    const store = storeWith([record("r1"), record("r2")]);

    expect(store.deleteL0BySession("sess-probe", { userId: "usr-1" })).toBe(2);
  });

  it("nao apaga as mensagens de outro time", () => {
    const store = storeWith([record("r1"), record("r2", { teamId: "team-b" })]);

    const deleted = store.deleteL0BySession("sess-probe", { teamId: "team-b" });

    expect(deleted).toBe(1);
  });

  it("respeita a tarefa do filtro", () => {
    const store = storeWith([record("r1"), record("r2", { taskId: "task-b" })]);

    const deleted = store.deleteL0BySession("sess-probe", { taskId: "task-b" });

    expect(deleted).toBe(1);
  });

  it("respeita o agente do filtro", () => {
    const store = storeWith([record("r1"), record("r2", { agentId: "agt-2" })]);

    const deleted = store.deleteL0BySession("sess-probe", { agentId: "agt-2" });

    expect(deleted).toBe(1);
  });

  it("apaga um registro so quando o filtro traz o time dele", () => {
    const store = storeWith([record("r1")]);

    expect(store.deleteL0("r1", { teamId: "team-a" })).toBe(true);
    expect(store.deleteL0("r1", { teamId: "team-b" })).toBe(false);
  });
});
