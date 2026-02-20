import { Request, Response, NextFunction } from "express";
import { ZodType, ZodError } from "zod";

export const validate = (schema: ZodType<any>) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      return next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          message: "Validation failed",
          errors: error.issues.map((e) => ({
            field: e.path[1], // path is usually ['body', 'field_name']
            message: e.message,
          })),
        });
      }
      return res
        .status(500)
        .json({ message: "Internal server error during validation" });
    }
  };
};

// Simplified version for just body validation which is more common
export const validateBody = (schema: ZodType<any>) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync(req.body);
      return next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          message: "Validation failed",
          errors: error.issues.map((e) => ({
            field: e.path[0],
            message: e.message,
          })),
        });
      }
      return res
        .status(500)
        .json({ message: "Internal server error during validation" });
    }
  };
};
