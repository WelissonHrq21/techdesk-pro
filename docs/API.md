# TechDesk Pro - API

## Sessions

POST /sessions
Authenticate user and return JWT.

GET /me
Get authenticated user profile.

## Customers

POST /customers
Create customer.

GET /customers
List customers with pagination and search.

Query:
page, limit, search

GET /customers/:id
Get customer details.

PUT /customers/:id
Update customer.

PATCH /customers/:id/status
Activate or deactivate customer.

---

## Equipment

POST /equipment
Create equipment.

GET /equipment
List equipment with pagination and search.

Query:
page, limit, search, customerId

GET /equipment/:id
Get equipment details.

PUT /equipment/:id
Update equipment.

PATCH /equipment/:id/status
Activate or deactivate equipment.

---

## Service Orders

POST /service-orders
Create service order.

GET /service-orders
List service orders with pagination, filters and search.

Query:
page, limit, status, search, dateFrom, dateTo, customerId, equipmentId, sortBy, sortOrder

GET /service-orders/:id
Get service order details.

PATCH /service-orders/:id/status
Update service order status.

---

## Budgets

POST /service-orders/:id/budgets
Create budget version.

GET /service-orders/:id/budgets
List budget versions.

---

## Users

POST /users
Create user.

GET /users
List users.

GET /users/:id
Get user details.

PUT /users/:id
Update user.

DELETE /users/:id
Deactivate user.

---

## Parts

GET /parts
List parts with pagination, search and maxStock filter.

Query:
page, limit, search, maxStock

---

## Dashboard

GET /dashboard/summary
Get operational dashboard summary.

Returns service order counters, budget decision counters, stock counters, recent service orders and recent stock movements.
