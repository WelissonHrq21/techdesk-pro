import pinoHttp, { stdSerializers } from "pino-http";
import { createRequestId, logger } from "../config/logger";

export const httpLogger = pinoHttp({
  logger,
  serializers: {
    req(request) {
      const serializedRequest = stdSerializers.req(request);

      if (serializedRequest.url?.startsWith("/public/service-orders/")) {
        serializedRequest.url = "/public/service-orders/:token";
      }

      return serializedRequest;
    },
  },
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
