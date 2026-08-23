import express from "express";
import cors from "cors";
import helmet from "helmet";
import { env } from "./config/env";
import { customerRouter } from "./routes/customer.routes";
import { dashboardRouter } from "./routes/dashboard.routes";
import { docsRouter } from "./routes/docs.routes";
import { equipmentRouter } from "./routes/equipment.routes";
import { errorHandler } from "./middlewares/errorHandler";
import { httpLogger } from "./middlewares/httpLogger";
import { ensureAuthenticated } from "./middlewares/ensureAuthenticated";
import { healthRouter } from "./routes/health.routes";
import { serviceOrderRouter } from "./routes/service-order.routes";
import { budgetRouter } from "./routes/budget.routes";
import { partRouter } from "./routes/part.routes";
import { publicRouter } from "./routes/public.routes";
import { sessionRouter } from "./routes/session.routes";
import { settingsRouter } from "./routes/settings.routes";
import { setupRouter } from "./routes/setup.routes";
import { stockRouter } from "./routes/stock.routes";
import { userRouter } from "./routes/user.routes";
import { configureTrustProxy } from "./config/trustProxy";


const app = express();
configureTrustProxy(app);
app.use(helmet());
app.use(cors({
  origin: env.CORS_ORIGIN,
}));
app.use(express.json({
  limit: "1mb",
}));
app.use(httpLogger);
app.use(healthRouter);

if (env.SWAGGER_ENABLED) {
  app.use(docsRouter);
}

app.use(sessionRouter);
app.use(publicRouter);

const privateRoutePrefixes = [
  "/customers",
  "/dashboard",
  "/equipments",
  "/service-orders",
  "/budgets",
  "/parts",
  "/settings",
  "/setup",
  "/stock-movements",
  "/users",
];

app.use((request, response, next) => {
  const isPrivateRoute = privateRoutePrefixes.some((prefix) => {
    return (
      request.path === prefix || request.path.startsWith(`${prefix}/`)
    );
  });

  if (!isPrivateRoute) {
    return next();
  }

  return ensureAuthenticated(request, response, next);
});

app.use(customerRouter);
app.use(dashboardRouter);
app.use(equipmentRouter);
app.use(serviceOrderRouter);
app.use(budgetRouter);
app.use(partRouter);
app.use(settingsRouter);
app.use(setupRouter);
app.use(stockRouter);
app.use(userRouter);

app.use((request, response) => {
  return response.status(404).json({
    message: "Route not found",
  });
});

app.use(errorHandler);

export { app };
