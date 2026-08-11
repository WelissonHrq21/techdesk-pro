import { http, HttpResponse } from "msw";

const apiUrl = "http://localhost:3333";

export const handlers = [
  http.get(`${apiUrl}/public/service-orders/valid-token`, () => {
    return HttpResponse.json({
      number: 142,
      status: "IN_MAINTENANCE",
      createdAt: "2026-08-11T10:00:00.000Z",
      updatedAt: "2026-08-11T12:00:00.000Z",
      equipment: {
        type: "Notebook",
        brand: "Acer",
        model: "Nitro 5",
      },
    });
  }),
  http.get(`${apiUrl}/public/service-orders/invalid-token`, () => {
    return HttpResponse.json(
      { message: "Public service order not found" },
      { status: 404 }
    );
  }),
];
