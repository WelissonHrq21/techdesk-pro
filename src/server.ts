/// <reference path="./@types/express/index.d.ts" />

import { app } from "./app";
import { env } from "./config/env";
import { logger } from "./config/logger";
import { prisma } from "./config/prisma";

const server = app.listen(env.PORT, () => {
    logger.info({ port: env.PORT }, "Server is running");
});

async function shutdown(signal: string) {
    logger.info({ signal }, "shutting down");

    server.close(async () => {
        await prisma.$disconnect();
        logger.info("shutdown complete");
        process.exit(0);
    });
}

process.on("SIGTERM", () => {
    void shutdown("SIGTERM");
});

process.on("SIGINT", () => {
    void shutdown("SIGINT");
});
