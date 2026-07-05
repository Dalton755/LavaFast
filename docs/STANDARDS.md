# 📐 Padrões de Desenvolvimento - LavaFast ERP

## Objetivo

Este documento define os padrões obrigatórios para o desenvolvimento do LavaFast ERP.

Todos os colaboradores devem seguir estas convenções.

---

# Estrutura do Projeto

Frontend

```
src/

core/
modules/
shared/
layouts/
styles/
assets/
```

Backend

```
src/

config/
constants/
controllers/
services/
repositories/
routes/
middlewares/
modules/
utils/
```

---

# Convenção de Nomes

## Componentes React

Sempre em PascalCase.

Exemplo:

```
OperationCard.jsx
DashboardHeader.jsx
ActionButton.jsx
```

---

## Hooks

Sempre iniciar com use.

```
useSolicitacoes.js

useRealtime.js

useClock.js
```

---

## Services

Sempre terminar com Service.

```
NotificationService.js

WorkflowService.js

SoundService.js
```

---

## Repositories

Sempre terminar com Repository.

```
SolicitacaoRepository.js

UsuarioRepository.js
```

---

## Managers

Utilizados apenas para infraestrutura.

```
RealtimeManager.js

StorageManager.js
```

---

## Context

Sempre terminar com Context.

```
LojaContext.jsx

AuthContext.jsx
```

---

# Organização de um componente React

Todos os componentes seguirão esta ordem.

```jsx
// Imports

// Constantes

// Hooks

// Funções auxiliares

// JSX

// Export
```

---

# Organização de um Service

```text
Imports

Classe

Métodos públicos

Métodos privados

Export
```

---

# Organização de um Repository

```text
Imports

Classe

CRUD

Consultas

Export
```

---

# Organização do Backend

Fluxo obrigatório.

```
Controller

↓

Service

↓

Repository

↓

Banco
```

Nunca acessar Repository diretamente pelo Controller.

---

# Clean Code

Regras obrigatórias.

## Responsabilidade única

Cada arquivo deve possuir apenas uma responsabilidade.

---

## Funções pequenas

Preferencialmente menores que 30 linhas.

---

## Evitar duplicação

Sempre reutilizar código.

---

## Evitar comentários

Comentários apenas quando realmente necessários.

Prefira nomes autoexplicativos.

---

## Evitar números mágicos

Ruim

```
if(status==3)
```

Bom

```
if(status===STATUS.FINALIZADA)
```

---

# Imports

Sempre organizar nesta ordem.

1. Bibliotecas externas

2. Core

3. Shared

4. Modules

5. Arquivos locais

---

# Commits

Padrão adotado.

```
feat:

fix:

refactor:

docs:

style:

test:

chore:
```

Exemplos

```
feat: adiciona upload de fotos

fix: corrige atualização do realtime

docs: cria roadmap

refactor: reorganiza dashboard
```

---

# Branches

Padrão.

```
main

develop

feature/nome

fix/nome
```

---

# Pull Request

Checklist obrigatório.

- Código revisado

- ESLint sem erros

- Build funcionando

- Responsabilidade única

- Testes executados

- Documentação atualizada

---

# Filosofia do Projeto

Antes de escrever código, responder:

- Qual problema estou resolvendo?

- Existe código semelhante?

- Este arquivo pertence a qual módulo?

- Estou aumentando ou reduzindo o acoplamento?

- Essa solução continuará boa daqui a um ano?