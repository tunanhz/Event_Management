import { Request, Response, NextFunction } from 'express';

// Generic validation middleware factory
// Can be extended with Zod or Joi later
export const validateRequest = (schema: any) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    // Placeholder for validation logic
    // Will integrate with Zod/Joi when schemas are defined
    next();
  };
};
