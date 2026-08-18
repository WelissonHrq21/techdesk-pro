export const openApiDocument = {
  openapi: "3.0.3",
  info: {
    title: "TechDesk Pro API",
    version: "1.1.0",
    description: "API for technical assistance management",
  },
  servers: [
    {
      url: "http://localhost:3333",
      description: "Development",
    },
  ],
  tags: [
    { name: "Sessions" },
    { name: "Users" },
    { name: "Customers" },
    { name: "Equipments" },
    { name: "Service Orders" },
    { name: "Budgets" },
    { name: "Parts" },
    { name: "Stock" },
    { name: "Settings" },
    { name: "Setup" },
    { name: "Public" },
    { name: "Dashboard" },
    { name: "Health" },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
    schemas: {
      ApiError: {
        type: "object",
        properties: {
          message: { type: "string" },
        },
      },
      ValidationError: {
        type: "object",
        properties: {
          message: { type: "string", example: "Validation failed" },
          errors: { type: "array", items: { type: "object" } },
        },
      },
      PaginationMeta: {
        type: "object",
        properties: {
          page: { type: "integer", example: 1 },
          limit: { type: "integer", example: 20 },
          total: { type: "integer", example: 143 },
          totalPages: { type: "integer", example: 8 },
        },
      },
      User: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          name: { type: "string" },
          login: { type: "string" },
          role: {
            type: "string",
            enum: ["ADMIN", "RECEPTION", "TECHNICIAN"],
          },
          active: { type: "boolean" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      AuthUser: {
        allOf: [
          { $ref: "#/components/schemas/User" },
          {
            type: "object",
            properties: {
              setupCompleted: { type: "boolean" },
            },
          },
        ],
      },
      CompanySettings: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          name: { type: "string" },
          document: { type: "string", nullable: true },
          phone: { type: "string", nullable: true },
          email: { type: "string", nullable: true },
          address: { type: "string", nullable: true },
          zipCode: { type: "string", nullable: true },
          setupCompleted: { type: "boolean" },
          setupCompletedAt: {
            type: "string",
            format: "date-time",
            nullable: true,
          },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      SetupStatus: {
        type: "object",
        properties: {
          setupCompleted: { type: "boolean" },
          setupCompletedAt: {
            type: "string",
            format: "date-time",
            nullable: true,
          },
          companySettings: {
            allOf: [{ $ref: "#/components/schemas/CompanySettings" }],
            nullable: true,
          },
          initialUsers: {
            type: "array",
            items: { $ref: "#/components/schemas/User" },
          },
        },
      },
      SetupCompanyRequest: {
        type: "object",
        required: ["name"],
        additionalProperties: false,
        properties: {
          name: { type: "string", minLength: 1 },
          document: { type: "string", nullable: true },
          phone: { type: "string", nullable: true },
          email: { type: "string", nullable: true },
          address: { type: "string", nullable: true },
          zipCode: { type: "string", nullable: true },
        },
      },
      SetupAdminRequest: {
        type: "object",
        required: ["name", "login"],
        additionalProperties: false,
        properties: {
          name: { type: "string", minLength: 1, maxLength: 100 },
          login: { type: "string", minLength: 3, maxLength: 50 },
        },
      },
      SetupUserRequest: {
        type: "object",
        required: ["name", "login", "role", "password"],
        additionalProperties: false,
        properties: {
          name: { type: "string", minLength: 1, maxLength: 100 },
          login: { type: "string", minLength: 3, maxLength: 50 },
          password: { type: "string", minLength: 6, maxLength: 100 },
          role: { type: "string", enum: ["RECEPTION", "TECHNICIAN"] },
        },
      },
      CompleteSetupRequest: {
        type: "object",
        required: ["backupAcknowledged"],
        additionalProperties: false,
        properties: {
          backupAcknowledged: { type: "boolean", enum: [true] },
        },
      },
      Customer: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          name: { type: "string" },
          phone: { type: "string" },
          document: {
            type: "string",
            nullable: true,
            description:
              "Optional CPF/CNPJ. CPF is normalized with digits only. CNPJ is normalized without mask, uppercase, and may be numeric or alphanumeric. Omitted from TECHNICIAN responses and never exposed by public tracking.",
            example: "12ABC34501DE35",
          },
          email: { type: "string", nullable: true },
          active: { type: "boolean" },
        },
      },
      Equipment: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          type: { type: "string" },
          brand: { type: "string" },
          model: { type: "string" },
          serialNumber: { type: "string", nullable: true },
        },
      },
      ServiceOrder: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          number: { type: "integer" },
          status: {
            type: "string",
            enum: [
              "RECEIVED",
              "IN_ANALYSIS",
              "AWAITING_APPROVAL",
              "BUDGET_CHANGED_AWAITING_APPROVAL",
              "BUDGET_APPROVED",
              "BUDGET_REJECTED",
              "IN_MAINTENANCE",
              "FINISHED",
              "AWAITING_PICKUP",
              "DELIVERED",
              "CANCELLED",
            ],
          },
          reportedIssue: { type: "string" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      Budget: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          version: { type: "integer" },
          totalValue: { type: "string" },
          serviceOrderId: { type: "string", format: "uuid" },
        },
      },
      BudgetItem: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          partId: { type: "string", format: "uuid" },
          quantity: { type: "integer" },
          unitPrice: { type: "string" },
        },
      },
      Part: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          name: { type: "string" },
          brand: { type: "string" },
          currentPrice: { type: "string" },
          stock: { type: "integer" },
          supplier: { type: "string", nullable: true },
        },
      },
      StockMovement: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          type: {
            type: "string",
            enum: ["ENTRY", "EXIT", "ADJUSTMENT", "REVERSAL"],
          },
          quantity: { type: "integer" },
          reason: { type: "string", nullable: true },
          partId: { type: "string", format: "uuid" },
          serviceOrderId: {
            type: "string",
            format: "uuid",
            nullable: true,
          },
          userId: { type: "string", format: "uuid", nullable: true },
          reversalOfMovementId: {
            type: "string",
            format: "uuid",
            nullable: true,
          },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      ReverseStockMovementRequest: {
        type: "object",
        required: ["quantity", "reason"],
        additionalProperties: false,
        properties: {
          quantity: {
            type: "integer",
            minimum: 1,
            example: 1,
          },
          reason: {
            type: "string",
            minLength: 1,
            maxLength: 500,
            example: "Part will not be used",
          },
        },
      },
    },
  },
  security: [{ bearerAuth: [] }],
  paths: {
    "/health": {
      get: {
        tags: ["Health"],
        security: [],
        summary: "Liveness check",
        responses: { "200": { description: "Process is alive" } },
      },
    },
    "/ready": {
      get: {
        tags: ["Health"],
        security: [],
        summary: "Readiness check",
        responses: {
          "200": { description: "Application is ready" },
          "503": { description: "Application is not ready" },
        },
      },
    },
    "/sessions": {
      post: {
        tags: ["Sessions"],
        security: [],
        summary: "Authenticate user",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["login", "password"],
                properties: {
                  login: { type: "string" },
                  password: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Authenticated" },
          "401": { description: "Invalid login or password" },
        },
      },
    },
    "/me": {
      get: {
        tags: ["Sessions"],
        summary: "Get authenticated profile",
        responses: {
          "200": {
            description: "Profile",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AuthUser" },
              },
            },
          },
          "401": { description: "Unauthorized" },
        },
      },
    },
    "/me/password": {
      put: {
        tags: ["Sessions"],
        summary: "Change own password. Roles: authenticated users",
        responses: { "200": { description: "Password changed" }, "400": { description: "Invalid current password or new password" } },
      },
    },
    "/settings/company": {
      get: {
        tags: ["Settings"],
        summary: "Get company settings. Roles: ADMIN, RECEPTION, TECHNICIAN",
        responses: { "200": { description: "Company settings" } },
      },
      put: {
        tags: ["Settings"],
        summary: "Update company settings. Roles: ADMIN",
        responses: { "200": { description: "Company settings updated" }, "403": { description: "Forbidden" } },
      },
    },
    "/setup/status": {
      get: {
        tags: ["Setup"],
        summary: "Get first-run setup status. Roles: ADMIN",
        responses: {
          "200": {
            description: "Setup status",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/SetupStatus" },
              },
            },
          },
          "401": { description: "Unauthorized" },
          "403": { description: "Forbidden" },
        },
      },
    },
    "/setup/company": {
      patch: {
        tags: ["Setup"],
        summary: "Save company data during first-run setup. Roles: ADMIN",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/SetupCompanyRequest" },
            },
          },
        },
        responses: {
          "200": { description: "Company setup saved" },
          "400": { description: "Invalid request" },
          "401": { description: "Unauthorized" },
          "403": { description: "Forbidden" },
          "409": { description: "Setup already completed" },
        },
      },
    },
    "/setup/admin": {
      patch: {
        tags: ["Setup"],
        summary: "Update bootstrap admin name and login during first-run setup. Roles: ADMIN",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/SetupAdminRequest" },
            },
          },
        },
        responses: {
          "200": { description: "Admin updated" },
          "400": { description: "Invalid request" },
          "401": { description: "Unauthorized" },
          "403": { description: "Forbidden" },
          "409": { description: "Setup already completed or login conflict" },
        },
      },
    },
    "/setup/users": {
      post: {
        tags: ["Setup"],
        summary: "Create optional initial reception or technician users. Roles: ADMIN",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/SetupUserRequest" },
            },
          },
        },
        responses: {
          "201": { description: "Initial user created" },
          "400": { description: "Invalid request" },
          "401": { description: "Unauthorized" },
          "403": { description: "Forbidden" },
          "409": { description: "Setup already completed or login conflict" },
        },
      },
    },
    "/setup/complete": {
      post: {
        tags: ["Setup"],
        summary: "Complete first-run setup. Roles: ADMIN",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CompleteSetupRequest" },
            },
          },
        },
        responses: {
          "200": { description: "Setup completed" },
          "400": { description: "Missing company settings or backup acknowledgement" },
          "401": { description: "Unauthorized" },
          "403": { description: "Forbidden" },
        },
      },
    },
    "/public/service-orders/{token}": {
      get: {
        tags: ["Public"],
        security: [],
        summary: "Public service order tracking by secure token",
        parameters: [{ name: "token", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: { "200": { description: "Limited public service order" }, "404": { description: "Not found" } },
      },
    },
    "/users": {
      get: { tags: ["Users"], summary: "List users. Roles: ADMIN", responses: { "200": { description: "Users" } } },
      post: { tags: ["Users"], summary: "Create user. Roles: ADMIN", responses: { "201": { description: "User created" } } },
    },
    "/users/{id}": {
      get: { tags: ["Users"], summary: "Get user. Roles: ADMIN", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { "200": { description: "User" } } },
      put: { tags: ["Users"], summary: "Update user. Roles: ADMIN", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { "200": { description: "User updated" } } },
      delete: { tags: ["Users"], summary: "Deactivate user. Roles: ADMIN", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { "200": { description: "User deactivated" } } },
    },
    "/customers": {
      get: { tags: ["Customers"], summary: "List customers. Roles: ADMIN, RECEPTION, TECHNICIAN", responses: { "200": { description: "Paginated customers" } } },
      post: { tags: ["Customers"], summary: "Create customer. Roles: ADMIN, RECEPTION", responses: { "201": { description: "Customer created" } } },
    },
    "/customers/{id}": {
      get: { tags: ["Customers"], summary: "Get customer", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { "200": { description: "Customer" } } },
      put: { tags: ["Customers"], summary: "Update customer. Roles: ADMIN, RECEPTION", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { "200": { description: "Customer updated" } } },
      delete: { tags: ["Customers"], summary: "Deactivate customer. Roles: ADMIN", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { "200": { description: "Customer deactivated" } } },
    },
    "/equipments": {
      get: { tags: ["Equipments"], summary: "List equipments. Roles: ADMIN, RECEPTION, TECHNICIAN", responses: { "200": { description: "Paginated equipments" } } },
      post: { tags: ["Equipments"], summary: "Create equipment. Roles: ADMIN, RECEPTION", responses: { "201": { description: "Equipment created" } } },
    },
    "/equipments/{id}": {
      get: { tags: ["Equipments"], summary: "Get equipment", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { "200": { description: "Equipment" } } },
      put: { tags: ["Equipments"], summary: "Update equipment. Roles: ADMIN, RECEPTION", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { "200": { description: "Equipment updated" } } },
      delete: { tags: ["Equipments"], summary: "Deactivate equipment. Roles: ADMIN", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { "200": { description: "Equipment deactivated" } } },
    },
    "/service-orders": {
      get: { tags: ["Service Orders"], summary: "List service orders with filters. Roles: ADMIN, RECEPTION, TECHNICIAN", responses: { "200": { description: "Paginated service orders" } } },
      post: { tags: ["Service Orders"], summary: "Create service order. Roles: ADMIN, RECEPTION, TECHNICIAN", responses: { "201": { description: "Service order created" } } },
    },
    "/service-orders/{id}": {
      get: { tags: ["Service Orders"], summary: "Get service order detail", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { "200": { description: "Service order" } } },
    },
    "/service-orders/{id}/status": {
      patch: { tags: ["Service Orders"], summary: "Change service order status. Roles depend on transition", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { "200": { description: "Status changed" } } },
    },
    "/service-orders/{id}/diagnosis": {
      patch: { tags: ["Service Orders"], summary: "Update diagnosis. Roles: ADMIN, TECHNICIAN", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { "200": { description: "Diagnosis updated" } } },
    },
    "/service-orders/{id}/budgets": {
      post: { tags: ["Budgets"], summary: "Create budget. Roles: ADMIN, TECHNICIAN", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { "201": { description: "Budget created" } } },
    },
    "/service-orders/{id}/budgets/revision": {
      post: { tags: ["Budgets"], summary: "Create budget revision. Roles: ADMIN, TECHNICIAN", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { "201": { description: "Budget revision created" } } },
    },
    "/budgets/{id}/approve": {
      post: { tags: ["Budgets"], summary: "Approve budget. Roles: ADMIN, RECEPTION", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { "200": { description: "Budget approved" } } },
    },
    "/budgets/{id}/reject": {
      post: { tags: ["Budgets"], summary: "Reject budget. Roles: ADMIN, RECEPTION", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { "200": { description: "Budget rejected" } } },
    },
    "/service-orders/{id}/parts/{partId}/consume": {
      post: { tags: ["Stock"], summary: "Consume part in service order. Roles: ADMIN, TECHNICIAN", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }, { name: "partId", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { "201": { description: "Part consumed" } } },
    },
    "/parts": {
      get: { tags: ["Parts"], summary: "List parts. Roles: ADMIN, RECEPTION, TECHNICIAN", responses: { "200": { description: "Paginated parts" } } },
      post: { tags: ["Parts"], summary: "Create part. Roles: ADMIN", responses: { "201": { description: "Part created" } } },
    },
    "/parts/{id}": {
      get: { tags: ["Parts"], summary: "Get part", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { "200": { description: "Part" } } },
      put: { tags: ["Parts"], summary: "Update part. Roles: ADMIN", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { "200": { description: "Part updated" } } },
      delete: { tags: ["Parts"], summary: "Deactivate part. Roles: ADMIN", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { "200": { description: "Part deactivated" } } },
    },
    "/parts/{id}/stock/entry": {
      post: { tags: ["Stock"], summary: "Create stock entry. Roles: ADMIN", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { "201": { description: "Stock entry created" } } },
    },
    "/parts/{id}/stock/exit": {
      post: { tags: ["Stock"], summary: "Create manual stock exit. Roles: ADMIN", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { "201": { description: "Stock exit created" } } },
    },
    "/parts/{id}/stock-movements": {
      get: { tags: ["Stock"], summary: "List stock movements. Roles: ADMIN, RECEPTION, TECHNICIAN", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { "200": { description: "Stock movements" } } },
    },
    "/stock-movements/{id}/reverse": {
      post: {
        tags: ["Stock"],
        summary: "Reverse service-order stock consumption. Roles: ADMIN, TECHNICIAN",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" }, description: "Original EXIT stock movement ID" }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ReverseStockMovementRequest" },
            },
          },
        },
        responses: {
          "201": { description: "Stock reversal created" },
          "400": { description: "Invalid movement, status or request" },
          "403": { description: "Forbidden" },
          "404": { description: "Stock movement not found" },
          "409": { description: "Reversal quantity exceeds available quantity" },
        },
      },
    },
    "/dashboard/summary": {
      get: { tags: ["Dashboard"], summary: "Get dashboard summary. Roles: ADMIN, RECEPTION, TECHNICIAN", responses: { "200": { description: "Dashboard summary" } } },
    },
  },
};
