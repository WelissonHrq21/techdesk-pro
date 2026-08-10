# TechDesk Pro - Domain Model

## Entities

### Customer
Representa o cliente da assistência.

Attributes:
- Name
- Phone
- Email
- ZIP Code
- Address
- Status

Relationships:
- One customer can have many equipment.

---

### Equipment
Representa um equipamento físico de um cliente.

Attributes:
- Type
- Brand
- Model
- Serial Number
- Status

Relationships:
- One equipment belongs to one customer.
- One equipment can have many service orders.

---

### Service Order
Representa o atendimento de um equipamento.

Attributes:
- Reported Issue
- Password
- Status
- Opening Date
- Diagnosis

Relationships:
- One service order belongs to one equipment.
- One service order can have many accessories.
- One service order can have many budget versions.
- One service order can have one responsible user.

---

### Accessory
Representa os acessórios entregues junto com o equipamento.

Attributes:
- Description
- Quantity
- Observation

Relationships:
- One accessory belongs to one service order.

---

### Budget
Representa uma versão de orçamento da Ordem de Serviço.

Attributes:
- Version
- Value
- Parts
- Created At

Relationships:
- One budget belongs to one service order.

---

### User
Representa um funcionário que acessa o sistema.

Attributes:
- Name
- Login
- Password
- Role
- Status

Relationships:
- One user can be responsible for many service orders.