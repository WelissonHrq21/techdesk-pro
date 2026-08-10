import { Router } from "express";
import swaggerUi from "swagger-ui-express";
import { openApiDocument } from "../docs/openapi";

const docsRouter = Router();

docsRouter.use("/docs", swaggerUi.serve, swaggerUi.setup(openApiDocument));

export { docsRouter };
