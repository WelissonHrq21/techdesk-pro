import pinoHttp from "pino-http";
import { createRequestId, logger } from "../config/logger";

export const httpLogger = pinoHttp({
  logger,
  genReqId(request, response) {
    const existingRequestId = request.headers["x-request-id"];
    const requestId =
      typeof existingRequestId === "string"
        ? existingRequestId
        : createRequestId();

    response.setHeader("X-Request-Id", requestId);

    return requestId;
  },
  customSuccessMessage() {
    return "request completed";
  },
  customErrorMessage() {
    return "request failed";
  },
});
