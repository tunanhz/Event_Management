import { Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { UserRepository } from '../../modules/user/user.repository';
import { AppError } from '../utils/AppError';
import { AuthRequest } from '../types';

const userRepository = new UserRepository();

export const isAuthenticated = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    let token = '';

    // 1. Read token from HTTP-only cookie
    if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    } 
    // 2. Fallback: Read token from Authorization header
    else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return next(new AppError('Vui lòng đăng nhập để thực hiện chức năng này', 401));
    }

    // Verify token
    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (err) {
      return next(new AppError('Token không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.', 401));
    }

    // Check if user still exists in database
    const user = await userRepository.findById(decoded.id);
    if (!user) {
      return next(new AppError('Tài khoản không tồn tại trên hệ thống', 401));
    }

    // Check if user is banned
    if (user.accountStatus === 'BANNED') {
      return next(new AppError('Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.', 403));
    }

    // Assign decoded user payload to request
    req.user = {
      id: (user._id as any).toString(),
      email: user.email,
      role: user.role,
    };

    next();
  } catch (error) {
    next(error);
  }
};

export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('Vui lòng đăng nhập để thực hiện chức năng này', 401));
    }

    if (!roles.includes(req.user.role)) {
      return next(new AppError('Bạn không có quyền thực hiện hành động này', 403));
    }

    next();
  };
};
