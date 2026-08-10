import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { AppError } from "../errors/AppError"
import { logger } from "../config/logger";

export function errorHandler(err: unknown, req: Request, res: Response, next: NextFunction){
    if (err instanceof ZodError) {
        return res.status(400).json({
            message: "Validation failed",
            errors: err.issues
        });
    }

    if (err instanceof AppError){
        return res.status(err.statusCode).json({
            message: err.message
        })
    }

    logger.error({
        err,
        requestId: req.id,
        method: req.method,
        url: req.originalUrl,
    }, "unexpected error");

    return res.status(500).json({
        message: "Internal server error"
    });
}
