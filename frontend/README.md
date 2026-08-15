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

## Configuração

Copie `.env.example` para `.env`:

```bash
cp .env.example .env
```

Variável principal:

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

## Build de produção

```bash
npm run build
```

O build gera `dist/`.

Também existe imagem Docker própria:

```bash
docker build --build-arg VITE_API_URL=https://api.example.com -t techdesk-frontend .
```

A imagem usa Nginx e fallback para `index.html`, preservando rotas SPA como `/login`, `/customers`, `/service-orders/:id`, `/parts`, `/users`, `/settings` e `/track/:token`.

## Fluxo atual

- `/login`: autentica em `POST /sessions`.
- `/dashboard`: rota protegida com dados de `GET /dashboard/summary`.
- `/customers`: busca, paginação e criação de clientes.
- `/customers/:id`: detalhe, edição, desativação admin e equipamentos do cliente.
- `/equipments`: busca e paginação global de equipamentos.
- `/service-orders/new`: abertura de OS com cliente, equipamento e acessórios.
- `/service-orders/:id`: detalhe da OS com timeline, budgets e peças consumidas.
- `/me`: usado para restaurar sessão no refresh.
- `401`: limpa sessão e envia para `/login`.
- `403`: mantém sessão e exibe mensagem de permissão quando aplicável.

O JWT fica em `localStorage` para a v1. Uma evolução futura pode trocar para cookie HttpOnly.
