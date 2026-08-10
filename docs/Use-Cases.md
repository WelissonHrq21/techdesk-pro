# TechDesk Pro - Use Cases

## UC-001 - Register Customer
Actor: Receptionist or Administrator

Flow:
1. User enters customer information.
2. System validates required fields.
3. System creates customer record.

---

## UC-002 - Register Equipment
Actor: Receptionist or Administrator

Flow:
1. User selects a customer.
2. User enters equipment information.
3. System links equipment to customer.

---

## UC-003 - Open Service Order
Actor: Receptionist or Administrator

Flow:
1. User selects customer and equipment.
2. User enters reported issue, accessories and password.
3. System creates service order with status "Received".

---

## UC-004 - Register Diagnosis
Actor: Technician

Flow:
1. Technician opens a service order.
2. Technician enters diagnosis.
3. System updates the service order.

---

## UC-005 - Create Budget Version
Actor: Technician or Administrator

Flow:
1. User selects a service order.
2. User enters diagnosis, solution, parts and value.
3. System creates a new budget version.

---

## UC-006 - Approve or Reject Budget
Actor: Receptionist, Technician or Administrator

Flow:
1. User opens a budget.
2. User registers customer decision.
3. System updates service order status.

---

## UC-007 - Finish Service Order
Actor: Technician or Administrator

Flow:
1. User marks service as completed.
2. System changes status to "Finished".

---

## UC-008 - Deliver Equipment
Actor: Receptionist or Administrator

Flow:
1. User confirms equipment delivery.
2. System changes status to "Delivered".