# Architecture Decision Records (ADR)

Registros das decisões de arquitetura do Movia: o contexto em que foram
tomadas, as alternativas consideradas e as consequências aceitas.

Um ADR não descreve o que o código faz — isso o código já diz. Ele
registra **por que** foi feito assim, para que uma pessoa (inclusive o
próprio autor, meses depois) entenda o raciocínio antes de mudar algo.

| ADR | Decisão | Status |
|---|---|---|
| [001](001-cloud-sql.md) | Cloud SQL como banco de produção | Aceito |
| [002](002-offline-sqlite.md) | SQLite local para o modo offline | Aceito |
| [003](003-motor-de-rota-proprio.md) | Motor de rota em grafo próprio | Aceito |
| [004](004-eta-preditor-read-only.md) | ETA composto; preditor não escreve no NetworkState | Aceito |
| [005](005-privacidade-anonima.md) | Identidade anônima por dispositivo | Aceito |
| [006](006-workload-identity-federation.md) | WIF em vez de chaves de service account | Aceito |
