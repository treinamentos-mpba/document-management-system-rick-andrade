---
description: Revisa um endpoint do backend contra a spec e as convenções do projeto.
name: revisar-endpoint
argument-hint: endpoint (ex. POST /upload) ou arquivo (ex. backend/src/controllers/documentController.js)
agent: code-reviewer
---

# Revisar endpoint do backend

Revise o endpoint `${input:endpoint:endpoint ou arquivo}` percorrendo todas as camadas
envolvidas (`routes -> controllers -> services -> repositories`) em `backend/src`.

## Referências

- Contrato de API e requisitos: [docs/specs/dms-spec.md](../../docs/specs/dms-spec.md)
- Convenções do projeto: [copilot-instructions.md](../copilot-instructions.md)

## Critérios de revisão

1. **Conformidade com a spec**: entrada, saída e códigos de status conforme o contrato de API.
2. **Arquitetura**: fluxo de dependência respeitado; camadas internas não conhecem camadas externas.
3. **Tratamento de erros**: erros tratados nos limites do sistema (entrada HTTP, leitura/escrita de arquivos) com respostas HTTP adequadas.
4. **Segurança**: validação de entrada, proteção contra path traversal no download, limites de upload.
5. **Qualidade**: SOLID, DRY, KISS; funções pequenas e nomes descritivos em inglês.
6. **Restrições**: armazenamento estritamente local (multer + diskStorage em `backend/storage`), metadados em memória.

## Formato da saída

- Liste os problemas encontrados por severidade (alta, média, baixa), indicando arquivo e linha.
- Para cada problema, explique o impacto e sugira a correção.
- Finalize com um resumo: o endpoint está conforme a spec? Sim/não e por quê.

Não altere código durante a revisão.
