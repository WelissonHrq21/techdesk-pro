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
          budgetItems: {
            type: "array",
            items: { $ref: "#/components/schemas/BudgetItem" },
          },
        },
      },
      BudgetItem: {
        type: "object",
        required: [
          "id",
          "type",
          "description",
          "partId",
          "quantity",
          "unitPrice",
        ],
        properties: {
          id: { type: "string", format: "uuid" },
          type: { type: "string", enum: ["PART", "SERVICE"] },
          description: {
            type: "string",
            description:
              "Immutable item description. PART snapshots the Part name; SERVICE uses the submitted description.",
          },
          partId: {
            type: "string",
            format: "uuid",
            nullable: true,
            description:
              "Required for PART and null/absent for SERVICE.",
          },
          quantity: { type: "integer" },
          unitPrice: { type: "string" },
        },
      },
      BudgetPartItemInput: {
        type: "object",
        required: ["partId", "quantity", "unitPrice"],
        additionalProperties: false,
        description:
          "PART item. The type may be omitted for legacy clients and is then treated as PART. The response description snapshots the current Part name.",
        properties: {
          type: { type: "string", enum: ["PART"], default: "PART" },
          partId: { type: "string", format: "uuid" },
          quantity: { type: "integer", minimum: 1 },
          unitPrice: { type: "number", exclusiveMinimum: 0 },
        },
      },
      BudgetServiceItemInput: {
        type: "object",
        required: ["type", "description", "quantity", "unitPrice"],
        additionalProperties: false,
        description:
          "SERVICE item. It never references a Part and never participates in stock consumption.",
        properties: {
          type: { type: "string", enum: ["SERVICE"] },
          partId: {
            type: "string",
            nullable: true,
            enum: [null],
            description: "May be omitted or null; a Part UUID is rejected.",
          },
          description: { type: "string", minLength: 1, maxLength: 200 },
          quantity: { type: "integer", minimum: 1 },
          unitPrice: { type: "number", exclusiveMinimum: 0 },
        },
      },
      BudgetItemInput: {
        oneOf: [
          { $ref: "#/components/schemas/BudgetPartItemInput" },
          { $ref: "#/components/schemas/BudgetServiceItemInput" },
        ],
      },
      CreateBudgetRequest: {
        type: "object",
        required: ["items"],
        additionalProperties: false,
        example: {
          items: [
            {
              type: "PART",
              partId: "7cb52e44-e0e8-4a72-884e-cb29ba1efdc9",
              quantity: 1,
              unitPrice: 250,
            },
            {
              type: "SERVICE",
              description: "Operating system installation",
              quantity: 1,
              unitPrice: 100,
            },
          ],
        },
        properties: {
          items: {
            type: "array",
            minItems: 1,
            items: { $ref: "#/components/schemas/BudgetItemInput" },
          },
        },
      },
      CreateBudgetRevisionRequest: {
        type: "object",
        required: ["items"],
        additionalProperties: false,
        description:
          "Creates a new immutable version. The version is calculated by the server and concurrent changes to the same service order return 409.",
        properties: {
          items: {
            type: "array",
            minItems: 1,
            items: { $ref: "#/components/schemas/BudgetItemInput" },
          },
          observation: { type: "string", maxLength: 500 },
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
          stockStatus: {
            type: "string",
            enum: ["OK", "LOW_STOCK", "OUT_OF_STOCK"],
            description:
              "Derived from stock and minimumStock. Zero stock is always OUT_OF_STOCK; minimumStock 0 disables LOW_STOCK alerts.",
          },
          minimumStock: {
            type: "integer",
            minimum: 0,
            default: 0,
            description:
              "Zero means no positive minimum stock is configured.",
          },
          supplier: { type: "string", nullable: true },
        },
      },
      CreatePartRequest: {
        type: "object",
        required: ["name", "brand", "currentPrice"],
        additionalProperties: false,
        properties: {
          name: { type: "string", minLength: 1, maxLength: 100 },
          brand: { type: "string", minLength: 1, maxLength: 100 },
          currentPrice: { type: "number", exclusiveMinimum: 0 },
          minimumStock: { type: "integer", minimum: 0, default: 0 },
          supplier: { type: "string", maxLength: 150 },
        },
      },
      UpdatePartRequest: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string", minLength: 1, maxLength: 100 },
          brand: { type: "string", minLength: 1, maxLength: 100 },
          currentPrice: { type: "number", exclusiveMinimum: 0 },
          minimumStock: { type: "integer", minimum: 0 },
          supplier: { type: "string", maxLength: 150 },
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
      PaginatedStockMovements: {
        type: "object",
        required: ["data", "meta"],
        properties: {
          data: {
            type: "array",
            items: { $ref: "#/components/schemas/StockMovement" },
          },
          meta: { $ref: "#/components/schemas/PaginationMeta" },
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
      post: { tags: ["Budgets"], summary: "Create a PART, SERVICE, or mixed budget. Roles: ADMIN, TECHNICIAN", description: "SERVICE-only budgets are valid. Legacy items without type remain PART when partId is present. The server calculates the next version and snapshots descriptions and prices.", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }], requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/CreateBudgetRequest" } } } }, responses: { "201": { description: "Complete budget version created" }, "400": { description: "Invalid PART or SERVICE item, or service order status" }, "404": { description: "Service order or Part not found" }, "409": { description: "Budget version changed concurrently; reload and try again" } } },
    },
    "/service-orders/{id}/budgets/revision": {
      post: { tags: ["Budgets"], summary: "Create an immutable mixed budget revision. Roles: ADMIN, TECHNICIAN", description: "Preserves all previous versions. Creation is atomic and serialized per service order; a concurrent same-version revision returns 409.", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }], requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/CreateBudgetRevisionRequest" } } } }, responses: { "201": { description: "Complete budget revision created" }, "400": { description: "Invalid PART or SERVICE item, or service order status" }, "404": { description: "Service order, previous budget, user, or Part not found" }, "409": { description: "Budget version changed concurrently or revision conflicts with consumed Parts" } } },
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
      get: {
        tags: ["Parts"],
        summary: "List parts. Roles: ADMIN, RECEPTION, TECHNICIAN",
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", minimum: 1, default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 100, default: 20 } },
          { name: "search", in: "query", schema: { type: "string" } },
          {
            name: "stockStatus",
            in: "query",
            schema: { type: "string", enum: ["OK", "LOW_STOCK", "OUT_OF_STOCK"] },
          },
        ],
        responses: { "200": { description: "Paginated parts" } },
      },
      post: { tags: ["Parts"], summary: "Create part. Roles: ADMIN", requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/CreatePartRequest" } } } }, responses: { "201": { description: "Part created" } } },
    },
    "/parts/{id}": {
      get: { tags: ["Parts"], summary: "Get part", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { "200": { description: "Part" } } },
      put: { tags: ["Parts"], summary: "Update part. Roles: ADMIN", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }], requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/UpdatePartRequest" } } } }, responses: { "200": { description: "Part updated" } } },
      delete: { tags: ["Parts"], summary: "Deactivate part. Roles: ADMIN", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { "200": { description: "Part deactivated" } } },
    },
    "/parts/{id}/stock/entry": {
      post: { tags: ["Stock"], summary: "Create stock entry. Roles: ADMIN", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { "201": { description: "Stock entry created" } } },
    },
    "/parts/{id}/stock/exit": {
      post: { tags: ["Stock"], summary: "Create atomic manual stock exit. Roles: ADMIN", description: "Locks the Part row, validates the latest balance, decrements stock and creates the EXIT movement in one transaction.", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { "201": { description: "Stock exit created" }, "409": { description: "Insufficient stock after concurrent update" } } },
    },
    "/parts/{id}/stock-movements": {
      get: {
        tags: ["Stock"],
        summary: "List paginated stock movements. Roles: ADMIN, RECEPTION, TECHNICIAN",
        description: "Newest first with deterministic createdAt DESC, id DESC ordering. dateFrom and dateTo are inclusive UTC calendar days.",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
          { name: "page", in: "query", schema: { type: "integer", minimum: 1, default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 100, default: 20 } },
          { name: "type", in: "query", schema: { type: "string", enum: ["ENTRY", "EXIT", "ADJUSTMENT", "REVERSAL"] } },
          { name: "dateFrom", in: "query", schema: { type: "string", format: "date" } },
          { name: "dateTo", in: "query", schema: { type: "string", format: "date" } },
        ],
        responses: {
          "200": {
            description: "Paginated stock movements",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/PaginatedStockMovements" },
              },
            },
          },
          "400": { description: "Invalid pagination or filter" },
          "404": { description: "Part not found" },
        },
      },
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
