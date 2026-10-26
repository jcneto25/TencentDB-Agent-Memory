#!/usr/bin/env bash
# Constrói a imagem local que carrega a correção que ainda não entrou numa
# imagem publicada.
#
#   agentmemory/memory-core:latest  ->  agentmemory/memory-core:dsh-teamid
#     #105: o deleteL0BySession precisa trazer o `team_id` na consulta — sem
#     ele, o filtro de isolamento nunca casa e a exclusão por sessão devolve 0
#     sem apagar nada.
#
# É um *overlay*: a imagem publicada + UM arquivo do repo. O resto do código
# da imagem publicada fica intacto — o diff entre o arquivo em execução e o do
# repo é exatamente a correção (12 linhas).
#
# Por que overlay e não build do zero: a imagem publicada não é a fonte do
# repo (elas divergem em outras áreas), então um build do zero traria mudanças
# que ninguém revisou.
#
# O `start-all.sh` chama este script antes de subir a stack; o `.env` aponta
# para a tag daqui. Um `PULL=1` não quebra: a imagem não está em registry, e o
# pull_image tolera uma imagem que já existe localmente.
#
# Uso:  ./build-overlays.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
DOCKER="${DOCKER:-docker}"

echo "→ construindo agentmemory/memory-core:dsh-teamid"
"$DOCKER" build \
  -f "$REPO_ROOT/deploy/global-images/overlays/memory-core-dsh-teamid/Dockerfile" \
  -t "agentmemory/memory-core:dsh-teamid" \
  "$REPO_ROOT/MemoryCore/src/core/store" >/dev/null
echo "  pronto: agentmemory/memory-core:dsh-teamid"
