# ADR-001 — Cloud SQL como banco de produção

**Status:** Aceito
**Data:** 2026-07-07

## Contexto

O banco de produção era um AWS RDS PostgreSQL, enquanto todo o resto da
infraestrutura (Cloud Run, Artifact Registry, Secret Manager) já rodava no
Google Cloud. Isso significava:

- Duas contas de nuvem para manter, faturar e auditar.
- O backend no Cloud Run atravessando a internet pública para alcançar o
  banco na AWS — latência desnecessária e superfície de rede exposta.
- Créditos disponíveis no GCP sem uso, enquanto a AWS cobrava.

## Decisão

Migrar o banco para o **Cloud SQL (PostgreSQL 15)**, na mesma região do
Cloud Run (`southamerica-east1`), e conectar via **socket Unix do Cloud SQL
Connector**, autenticado por IAM.

## Alternativas consideradas

**Manter o RDS.** Rejeitada: nenhum benefício técnico, e mantém os custos e
a complexidade de operar em duas nuvens.

**Cloud SQL com IP público e rede autorizada.** Rejeitada como solução
final: exigiria manter uma lista de IPs autorizados, e o Cloud Run não tem
IP fixo. Foi usada apenas como passo temporário durante a migração dos
dados.

**Banco autogerenciado em VM.** Rejeitada: assume responsabilidade por
backup, patching e alta disponibilidade sem ganho proporcional para o
tamanho atual do projeto.

## Consequências

**Positivas:**
- O backend alcança o banco por socket Unix, sem expor conexão direta à
  internet. O acesso é autenticado por IAM.
- Latência menor (mesma região).
- Uma nuvem só: uma conta, um faturamento, uma superfície de auditoria.
- Backups automáticos e patching gerenciados pelo Cloud SQL.

**Negativas / aceitas:**
- Vendor lock-in maior no Google Cloud. Aceito: o custo de sair é
  proporcional ao de qualquer banco gerenciado, e o Postgres continua
  sendo Postgres.
- O tier `db-f1-micro` é suficiente para staging, mas terá de crescer com
  o uso real.
