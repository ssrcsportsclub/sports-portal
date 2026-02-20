import { Request, Response, NextFunction } from "express";

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  // Log the error for internal debugging
  console.error(`[Error] ${err.stack || err.message}`);

  // Determine status code (default to 500)
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;

  // Send sanitized response to the client
  res.status(statusCode).json({
    message:
      process.env.NODE_ENV === "production"
        ? "Internal Server Error"
        : err.message,
    // stack: process.env.NODE_ENV === "production" ? null : err.stack,
  });
};
