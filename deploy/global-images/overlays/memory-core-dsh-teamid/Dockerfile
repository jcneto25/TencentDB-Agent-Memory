# Overlay: a imagem publicada do memory-core + a correção do #105.
#
# A imagem `agentmemory/memory-core:latest` não traz a correção: o
# `deleteL0BySession` monta as linhas da sessão sem o `team_id`, e o filtro de
# isolamento compara `undefined` com o `team_id` pedido — a exclusão devolvia
# `deleted_count: 0` e não apagava nada, em silêncio.
#
# Por que overlay e não build do zero: a imagem publicada não é a fonte do
# repo (elas divergem em outras áreas), então um build do zero traria
# mudanças que ninguém revisou. Aqui só UM arquivo muda — e o diff entre ele
# e o arquivo em execução é exatamente a correção (12 linhas).
#
# O arquivo copiado é a fonte do repo (o commit 108bb82 já traz a correção),
# então não há cópia para divergir.
#
# Build (a partir da raiz do repo):
#   docker build -f deploy/global-images/overlays/memory-core-dsh-teamid/Dockerfile \
#     -t agentmemory/memory-core:dsh-teamid MemoryCore/src/core/store
FROM agentmemory/memory-core:latest
COPY sqlite.ts /app/src/core/store/sqlite.ts
