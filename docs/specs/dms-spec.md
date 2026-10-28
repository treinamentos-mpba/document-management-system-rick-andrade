# Especificação - Document Management System

## 1. Objetivo

Entregar uma aplicação web simples para que usuários enviem documentos, consultem os documentos de sua propriedade e baixem seus arquivos, mantendo os arquivos no filesystem local da aplicação.

## 2. Escopo

### Dentro do escopo

- Envio de um documento por requisição.
- Listagem dos metadados dos documentos do usuário atual.
- Download de um documento pelo identificador.
- Associação de cada documento a um proprietário.
- Interface React para upload, listagem e download, consumindo a API via `/api`.
- Persistência dos arquivos no filesystem local com `multer` e `diskStorage`.
- Persistência dos metadados em memória durante a execução do backend.

### Fora do escopo

- Armazenamento em nuvem, banco de dados ou provedores de upload externos.
- Versionamento, edição, exclusão ou compartilhamento de documentos.
- Autenticação, cadastro e administração de usuários neste MVP.
- Busca avançada, paginação, classificação e pré-visualização de arquivos.
- Garantia de persistência dos metadados após reiniciar o backend.

## 3. Requisitos funcionais

| ID | Requisito |
| --- | --- |
| RF-01 | O sistema deve aceitar o envio de um arquivo no campo `file` via `multipart/form-data`. |
| RF-02 | O sistema deve rejeitar requisições de upload sem arquivo e retornar erro HTTP `400`. |
| RF-03 | O sistema deve gravar o conteúdo recebido no diretório local configurado, usando `multer` com `diskStorage`. |
| RF-04 | O nome físico gravado deve ser gerado pelo servidor e não deve depender do nome original fornecido pelo cliente. |
| RF-05 | Após um upload bem-sucedido, o sistema deve gerar um identificador único e armazenar os metadados do documento em memória. |
| RF-06 | O sistema deve listar somente documentos pertencentes ao usuário atual. Uma lista sem documentos deve ser retornada como `200` com array vazio. |
| RF-07 | O sistema deve permitir o download pelo identificador apenas quando o documento pertencer ao usuário atual. |
| RF-08 | O sistema deve retornar `404` para identificador inexistente, documento de outro proprietário ou arquivo ausente no filesystem, sem revelar dados de outro usuário. |
| RF-09 | O frontend deve permitir selecionar e enviar um arquivo, apresentar o resultado ou erro do envio, atualizar a lista e iniciar o download de um documento. |
| RF-10 | O frontend deve apresentar estados de carregamento, lista vazia e erro nas operações de upload, listagem e download. |

## 4. Requisitos não funcionais

| ID | Requisito |
| --- | --- |
| RNF-01 | O backend deve ser implementado em Node.js e Express, em CommonJS, mantendo as dependências já previstas no projeto. |
| RNF-02 | O backend deve separar rotas, controllers, services e repositories, com dependências no sentido `routes -> controllers -> services -> repositories`. |
| RNF-03 | As rotas devem delegar o trabalho e não conter regras de negócio nem acesso direto ao filesystem ou à coleção de metadados. |
| RNF-04 | Os arquivos devem ser armazenados exclusivamente no filesystem local da aplicação, por `multer` com `diskStorage`, no diretório padrão `backend/storage`. Não usar armazenamento externo. |
| RNF-05 | Os metadados devem permanecer em memória nesta fase. Reiniciar o processo pode apagar os metadados, mesmo que os arquivos continuem no disco. |
| RNF-06 | O diretório de armazenamento, a porta e o limite máximo de upload devem ser configuráveis por variáveis de ambiente, com padrões documentados. |
| RNF-07 | O limite padrão proposto para upload é `10 MiB`; arquivos maiores devem ser rejeitados com HTTP `413`. O limite deve poder ser alterado por configuração. |
| RNF-08 | Erros da API devem usar respostas JSON consistentes e não expor caminhos locais, stack traces ou detalhes internos. Downloads bem-sucedidos retornam o conteúdo binário e um `Content-Disposition` baseado no nome original, devidamente tratado como nome de arquivo. |
| RNF-09 | O frontend deve usar componentes funcionais e hooks, reutilizar componentes e acessar o backend com `fetch` pelo prefixo `/api`, conforme o proxy do Vite. |
| RNF-10 | O backend deve tratar falhas de escrita e leitura do filesystem. Se o registro dos metadados falhar após a gravação, o arquivo recém-criado deve ser removido quando possível. |

### Premissas e limitações do MVP

- Não há autenticação implementada no seed. O backend deve obter o proprietário de um contexto de identidade confiável (`req.user.id`) quando disponível. Para execução local sem autenticação, deve usar um proprietário de desenvolvimento fixo, configurável por `DMS_DEFAULT_OWNER` e com padrão `local-user`. O cliente não pode escolher livremente o proprietário por campo de upload ou cabeçalho.
- O proprietário de desenvolvimento compartilhado não fornece isolamento entre pessoas e não deve ser tratado como controle de acesso em ambiente exposto. A inclusão de autenticação real exige uma especificação própria.
- Como os metadados ficam em memória, a listagem e a autorização dos downloads deixam de reconhecer arquivos após reinício do backend. Não implementar reconstrução automática do catálogo nesta fase.
- O limite de `10 MiB` é uma decisão inicial proposta e deve ser revisto se houver requisito de negócio diferente.
- Não há lista de tipos MIME permitidos definida. O MVP aceita qualquer tipo de arquivo dentro do limite configurado; validação por tipo exige decisão adicional e não substitui controles de segurança no consumo dos arquivos.

## 5. Modelo de dados

### Documento

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `id` | string | Sim | Identificador único, gerado pelo servidor (UUID). |
| `originalName` | string | Sim | Nome original fornecido no upload, usado para exibição e nome sugerido no download. |
| `storedName` | string | Sim | Nome interno gerado pelo servidor para o arquivo no disco; nunca exposto nas respostas públicas. |
| `size` | number | Sim | Tamanho do arquivo em bytes. |
| `uploadedAt` | string | Sim | Data e hora do upload em ISO 8601 UTC. |
| `owner` | string | Sim | Identificador do proprietário obtido do contexto de identidade do backend. |
| `mimeType` | string | Não | Tipo MIME recebido/detectado para uso informativo; não é garantia de segurança do conteúdo. |

### Regras de dados

- A coleção de documentos é mantida em memória pelo repository e indexada por `id`.
- `id`, `storedName`, `uploadedAt`, `size` e `owner` são definidos pelo backend; o cliente não pode sobrescrevê-los.
- `originalName` deve ser tratado como dado não confiável. Não usar esse valor para construir o caminho de armazenamento.
- O repository deve permitir criar metadados, listar por proprietário e buscar por identificador. O acesso para download deve confirmar também o proprietário.
- Não existe entidade persistente de usuário neste MVP; `owner` referencia a identidade fornecida pelo contexto da aplicação.

## 6. Contratos de API

### Convenções

- Os caminhos abaixo são os caminhos expostos pelo backend. No frontend, usar o prefixo `/api`, removido pelo proxy de desenvolvimento do Vite.
- Respostas de erro usam o formato `{ "error": { "code": "...", "message": "..." } }`.
- Os endpoints que retornam JSON usam `Content-Type: application/json; charset=utf-8`.
- As respostas não devem expor `storedName`, diretórios locais ou stack traces.

### `POST /upload`

Envia um arquivo para o usuário atual.

**Entrada**

- `Content-Type: multipart/form-data`
- Campo obrigatório: `file` (um arquivo).
- Não aceitar `owner`, `id`, `storedName` ou caminho de destino fornecidos pelo cliente.

**Sucesso: `201 Created`**

```json
{
  "id": "uuid",
  "originalName": "relatorio.pdf",
  "size": 12345,
  "uploadedAt": "2026-10-28T12:00:00.000Z",
  "owner": "local-user",
  "mimeType": "application/pdf"
}
```

O campo `mimeType` pode ser omitido quando indisponível. `storedName` não é retornado.

**Erros**

- `400 Bad Request`, `FILE_REQUIRED`: arquivo ausente ou requisição multipart inválida.
- `409 Conflict`, `DOCUMENT_LIMIT_REACHED`: o usuário atingiu o limite de documentos configurado.
- `413 Payload Too Large`, `FILE_TOO_LARGE`: arquivo excede o limite configurado.
- `500 Internal Server Error`, `UPLOAD_FAILED`: falha inesperada de gravação ou processamento, sem detalhes internos.

### `GET /documents`

Lista os documentos do usuário atual, sem incluir caminhos ou nomes físicos armazenados.

**Sucesso: `200 OK`**

```json
{
  "documents": [
    {
      "id": "uuid",
      "originalName": "relatorio.pdf",
      "size": 12345,
      "uploadedAt": "2026-10-28T12:00:00.000Z",
      "owner": "local-user",
      "mimeType": "application/pdf"
    }
  ]
}
```

Quando não houver documentos, `documents` deve ser `[]`. A ordem padrão é do mais recente para o mais antigo.

**Erros**

- `500 Internal Server Error`, `DOCUMENT_LIST_FAILED`: falha inesperada ao consultar o repository.

### `GET /documents/:id/download`

Baixa o conteúdo binário de um documento pertencente ao usuário atual.

**Sucesso: `200 OK`**

- Corpo: bytes do arquivo, sem envelope JSON.
- `Content-Type`: sempre `application/octet-stream`, para não refletir o tipo MIME informado pelo cliente (decisão de segurança; o `mimeType` registrado permanece apenas informativo nos metadados).
- `Content-Disposition: attachment`, com o nome original codificado de forma segura.
- `Content-Length`: calculado pelo servidor a partir do arquivo em disco.
- `X-Content-Type-Options: nosniff` em todas as respostas da API.

**Erros**

- `404 Not Found`, `DOCUMENT_NOT_FOUND`: identificador inexistente, documento de outro proprietário ou arquivo ausente no filesystem.
- `500 Internal Server Error`, `DOWNLOAD_FAILED`: falha de leitura não equivalente a arquivo ausente; não expor detalhes locais.

### `GET /health`

Endpoint técnico já existente no seed. Deve continuar respondendo `200 OK` com `{ "status": "ok" }` enquanto o processo estiver ativo.

## 7. Decisões arquiteturais

### Backend

- `routes/`: registra caminhos e middlewares e encaminha para controllers.
- `controllers/`: interpreta parâmetros e multipart, obtém o usuário do contexto, chama services e traduz resultados para status e respostas HTTP.
- `services/`: aplica as regras de negócio, como limite de tamanho, associação de proprietário e autorização de listagem/download.
- `repositories/`: mantém metadados em memória e encapsula operações de filesystem local necessárias ao armazenamento e leitura dos arquivos.
- Multer com `diskStorage` é configurado no limite HTTP como middleware de upload; a configuração do destino usa a variável de ambiente e nomes internos gerados pelo servidor.
- O app Express compõe os routers e middlewares. Rotas públicas de documentos permanecem `/upload`, `/documents` e `/documents/:id/download`; não adicionar `/api` ao backend, pois o Vite remove esse prefixo no proxy local.

### Frontend

- React + Vite, com componentes funcionais e hooks.
- `services/` centraliza chamadas `fetch` para `/api/upload`, `/api/documents` e `/api/documents/:id/download`.
- `UploadComponent`, `DocumentList` e `DownloadButton` têm responsabilidades distintas e são compostos pela página principal.
- A interface não define proprietário; a associação ocorre no backend.

### Configuração

| Variável | Padrão proposto | Uso |
| --- | --- | --- |
| `PORT` | `3000` | Porta HTTP do backend; já compatível com o seed e proxy Vite. |
| `STORAGE_DIR` | `backend/storage` (resolvido de forma independente do diretório atual do processo) | Diretório local de gravação dos arquivos. |
| `MAX_FILE_SIZE` | `10485760` | Limite de upload em bytes (10 MiB). |
| `MAX_DOCUMENTS_PER_OWNER` | `100` | Quantidade máxima de documentos por proprietário; uploads além do limite retornam `409`. |
| `DMS_DEFAULT_OWNER` | `local-user` | Proprietário fixo apenas para execução local sem autenticação. |
| `VITE_MAX_FILE_SIZE` (frontend) | `10485760` | Limite exibido/validado no frontend antes do envio; deve acompanhar `MAX_FILE_SIZE`. |

## 8. Plano de execução

Este plano descreve etapas futuras. Esta entrega consiste apenas neste documento; não inclui implementação ou alteração de arquivos de backend ou frontend.

1. Revisar esta especificação e confirmar as premissas de identidade, limite de upload, respostas de erro e comportamento após reinício.
2. Implementar e testar o backend por camada: repository de metadados/arquivos, services de upload/listagem/download, controllers e rotas; integrar `multer` com `diskStorage` e manter `/health`.
3. Implementar o frontend: serviço HTTP com `fetch`, formulário de upload, listagem, download e estados de carregamento, vazio e erro.
4. Integrar frontend e backend via proxy `/api`, verificando o fluxo completo de envio, listagem e download para o usuário atual.
5. Executar testes automatizados do backend e build do frontend; validar limites e erros de upload, isolamento por proprietário, arquivo ausente, reinício do backend e nome de download.
6. Revisar documentação e configuração de ambiente, registrando limitações do armazenamento de metadados em memória e a ausência de autenticação.

## 9. Critérios de aceite

- Um arquivo dentro do limite é gravado em `backend/storage` com nome físico gerado pelo servidor e recebe metadados em memória.
- Upload sem arquivo e upload acima do limite retornam, respectivamente, `400` e `413` no formato de erro definido.
- `GET /documents` retorna apenas documentos do proprietário atual e retorna array vazio quando não há itens.
- Um proprietário pode baixar seu documento; identificadores inexistentes, documentos alheios e arquivos ausentes retornam `404` sem revelar caminhos locais.
- O frontend consegue enviar, listar e baixar arquivos usando o proxy `/api`, com tratamento visível de erros e carregamento.
- A estrutura backend respeita a direção `routes -> controllers -> services -> repositories`, sem regra de negócio em rotas nem acesso à persistência em controllers.
- O arquivo permanece local; não são introduzidos armazenamento externo, banco de dados ou alterações de implementação fora do escopo desta especificação.
