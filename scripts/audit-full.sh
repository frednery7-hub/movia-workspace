#!/bin/bash
# ================================================
# AUDIT FULL - Varredura Completa do Projeto Movia
# ================================================

echo "INICIANDO AUDITORIA COMPLETA DO MOVIA"
echo "===================================="

PROJECT_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
cd "$PROJECT_ROOT"

echo "Diretorio atual: $PWD"
echo ""

echo "1. VERIFICACAO DE ESTRUTURA"
echo "---------------------------"
ls -la apps/backend/prisma/ 2>/dev/null | grep -E "schema|seed" || echo "Pasta prisma nao encontrada"
echo "shared-data existe? $([ -d packages/shared-data ] && echo "SIM" || echo "NAO")"
echo "geo-engine existe? $([ -f packages/shared-data/src/utils/geo-engine.ts ] && echo "SIM" || echo "NAO")"
echo "graph-builder existe? $([ -f packages/shared-data/src/graph/graph-builder.ts ] && echo "SIM" || echo "NAO")"
echo ""

echo "2. VERIFICACAO PRISMA"
echo "---------------------"
cd apps/backend
npx prisma generate --schema=./prisma/schema.prisma --quiet && echo "Prisma Client gerado com sucesso" || echo "Falha ao gerar Prisma Client"
echo ""

echo "3. VERIFICACAO DE BUILD"
echo "-----------------------"
pnpm --filter backend build && echo "Build do Backend OK" || echo "Build do Backend FALHOU"
echo ""

echo "4. VERIFICACAO TYPESCRIPT"
echo "-------------------------"
npx tsc --noEmit --skipLibCheck && echo "TypeScript sem erros" || echo "Erros de TypeScript detectados"
echo ""

echo "Auditoria concluida."
