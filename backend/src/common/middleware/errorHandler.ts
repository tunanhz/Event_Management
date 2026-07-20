import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { AppError } from '../utils/AppError';

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
    return;
  }

  // Mongoose schema validation (maxlength, enum, required…) on client input
  // is a bad request, not a server fault.
  if (err instanceof mongoose.Error.ValidationError) {
    const detail = Object.values(err.errors)
      .map((e) => e.message)
      .join('; ');
    res.status(400).json({ success: false, message: `Dữ liệu không hợp lệ: ${detail}` });
    return;
  }

  // Malformed ObjectId / date / number reaching a query or write.
  if (err instanceof mongoose.Error.CastError) {
    res.status(400).json({ success: false, message: 'Dữ liệu không hợp lệ (sai định dạng)' });
    return;
  }

  // Unique-index race (e.g. two requests claiming the same slug at once).
  if ((err as any)?.code === 11000) {
    res.status(400).json({ success: false, message: 'Giá trị đã tồn tại (trùng dữ liệu duy nhất)' });
    return;
  }

  console.error('Unhandled Error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};
