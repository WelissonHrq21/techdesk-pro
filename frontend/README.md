# TechDesk Pro Web

Frontend React + TypeScript do TechDesk Pro.

## Stack

- Vite
- React
- React Router
- Axios
- TanStack Query
- React Hook Form
- Zod
- Tailwind CSS
- lucide-react

## Configuracao

Copie `.env.example` para `.env`:

```bash
cp .env.example .env
```

Variavel principal:

```env
VITE_API_URL=http://localhost:3333
```

## Scripts

```bash
npm run dev
npm run build
npm run lint
npm run preview
```

## Fluxo Atual

- `/login`: autentica em `POST /sessions`.
- `/dashboard`: rota protegida com dados de `GET /dashboard/summary`.
- `/customers`: busca, paginacao e criacao de clientes.
- `/customers/:id`: detalhe, edicao, desativacao admin e equipamentos do cliente.
- `/equipments`: busca e paginacao global de equipamentos.
- `/service-orders/new`: abertura de OS com cliente, equipamento e acessorios.
- `/service-orders/:id`: detalhe da OS com timeline, budgets e pecas consumidas.
- `/me`: usado para restaurar sessao no refresh.
- `401`: limpa sessao e envia para `/login`.
- `403`: mantem sessao e exibe mensagem de permissao quando aplicavel.

O JWT fica em `localStorage` para o MVP. Uma evolucao futura pode trocar para cookie HttpOnly.
