# 🏛️ Arquitetura do LavaFast ERP

## Objetivo

Este documento define a arquitetura oficial do LavaFast ERP.

Toda nova funcionalidade deverá seguir esta arquitetura.

---

# Visão Geral

```
                React + Vite
                      │
                      ▼
              API (Node + Express)
                      │
                      ▼
           PostgreSQL (Supabase)
              │               │
              ▼               ▼
        Realtime         Storage
              │
              ▼
        EventBus (Core)
              │
              ▼
     Componentes React
```

---

# Arquitetura do Frontend

```
src/

core/
│
├── EventBus
├── RealtimeManager
├── NotificationService
├── SoundService
├── LoadingService
└── ErrorService

modules/

shared/

layouts/

styles/

assets/
```

---

# Core

O Core contém toda infraestrutura reutilizável.

Nenhuma regra de negócio deve existir dentro do Core.

Exemplos:

- EventBus
- Realtime
- Toast
- Sons
- Loading
- Modais

---

# Modules

Cada módulo representa um domínio do sistema.

Exemplo:

```
modules/

dashboard/

financeiro/

usuarios/

operacoes/

solicitacoes/
```

Cada módulo poderá possuir:

```
components/

hooks/

pages/

services/

api/
```

Todo código referente ao módulo deverá permanecer dentro dele.

---

# Shared

Tudo que pode ser reutilizado.

Exemplos:

```
Button

Modal

Input

utils

hooks

lib
```

---

# Backend

A API seguirá arquitetura em camadas.

```
Controller

↓

Service

↓

Repository

↓

Supabase
```

Responsabilidades:

Controller

- HTTP
- Request
- Response

Service

- Regras de negócio

Repository

- Banco de dados

---

# Banco

Schema:

operacoes

financeiro

cadastros

...

Cada módulo terá seu próprio schema sempre que fizer sentido.

---

# Realtime

Todo evento do Supabase deverá passar pelo RealtimeManager.

Nenhum componente React poderá conversar diretamente com o Supabase Realtime.

Fluxo:

Supabase

↓

RealtimeManager

↓

EventBus

↓

Componentes

---

# EventBus

O EventBus será responsável pela comunicação entre módulos.

Exemplo:

```
EventBus.emit(
    "novaSolicitacao",
    dados
)
```

Os componentes interessados apenas escutam o evento.

---

# SOLID

O projeto seguirá os princípios SOLID.

Principalmente:

- Single Responsibility
- Open/Closed
- Dependency Inversion

---

# Clean Code

Regras obrigatórias:

- Funções pequenas
- Componentes pequenos
- Um arquivo = uma responsabilidade
- Nomes autoexplicativos
- Evitar duplicação
- Evitar comentários desnecessários

---

# Fluxo de Desenvolvimento

Toda funcionalidade seguirá este fluxo:

1. Arquitetura
2. Banco
3. Backend
4. Frontend
5. UX
6. Testes
7. Documentação
8. Commit