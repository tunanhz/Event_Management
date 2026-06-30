import { Request, Response } from 'express';
import { UserService } from './user.service';
import { asyncHandler } from '../../common/utils/asyncHandler';
import { ApiResponse } from '../../common/utils/ApiResponse';
import { AuthRequest } from '../../common/types';

export class UserController {
  private userService: UserService;

  constructor() {
    this.userService = new UserService();
  }

  // ─── Authentication Endpoints ──────────────────────────────────────────

  sendOTP = asyncHandler(async (req: Request, res: Response) => {
    const { email } = req.body;
    await this.userService.sendOTP(email);
    res.json(ApiResponse.ok(null, 'Mã OTP đã được gửi đến email của bạn. Vui lòng kiểm tra hộp thư!'));
  });

  register = asyncHandler(async (req: Request, res: Response) => {
    const { user, token } = await this.userService.registerWithOTP(req.body);
    
    // Set HTTP-Only Cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.status(201).json(ApiResponse.created({ user, token }, 'Đăng ký tài khoản thành công!'));
  });

  login = asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body;
    const { user, token } = await this.userService.loginWithEmail(email, password);

    // Set HTTP-Only Cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.json(ApiResponse.ok({ user, token }, 'Đăng nhập thành công!'));
  });

  googleLogin = asyncHandler(async (req: Request, res: Response) => {
    const { credential } = req.body; // Google ID Token
    const { user, token } = await this.userService.loginWithGoogle(credential);

    // Set HTTP-Only Cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.json(ApiResponse.ok({ user, token }, 'Đăng nhập bằng Google thành công!'));
  });

  logout = asyncHandler(async (req: Request, res: Response) => {
    res.clearCookie('token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });
    res.json(ApiResponse.ok(null, 'Đăng xuất thành công!'));
  });

  getMe = asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.user) {
      res.status(401).json(ApiResponse.error('Chưa đăng nhập'));
      return;
    }
    const user = await this.userService.getUserById(req.user.id);
    res.json(ApiResponse.ok(user, 'Lấy thông tin người dùng thành công'));
  });

  // ─── Admin Management Endpoints ────────────────────────────────────────

  getAllUsers = asyncHandler(async (req: AuthRequest, res: Response) => {
    const adminId = req.user!.id;
    const { page, limit, role, status, search } = req.query;

    const result = await this.userService.getAllUsers(adminId, {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      role: typeof role === 'string' ? role : undefined,
      status: typeof status === 'string' ? status : undefined,
      search: typeof search === 'string' ? search : undefined,
    });

    res.json(ApiResponse.ok(result.data, 'Tải danh sách tài khoản thành công', result.pagination));
  });

  createStaff = asyncHandler(async (req: AuthRequest, res: Response) => {
    const adminId = req.user!.id;
    const staff = await this.userService.createStaffAccount(adminId, req.body);
    res.status(201).json(ApiResponse.created(staff, 'Tạo tài khoản STAFF thành công và đã gửi mail cấp thông tin'));
  });

  updateRole = asyncHandler(async (req: AuthRequest, res: Response) => {
    const adminId = req.user!.id;
    const { role } = req.body;
    const user = await this.userService.updateAccountRole(adminId, req.params.id as string, role as any);
    res.json(ApiResponse.ok(user, 'Cập nhật quyền hạn tài khoản thành công'));
  });

  updateStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
    const adminId = req.user!.id;
    const { status } = req.body;
    const user = await this.userService.updateAccountStatus(adminId, req.params.id as string, status as any);
    res.json(ApiResponse.ok(user, 'Cập nhật trạng thái tài khoản thành công'));
  });

  delete = asyncHandler(async (req: AuthRequest, res: Response) => {
    const adminId = req.user!.id;
    await this.userService.deleteUser(adminId, req.params.id as string);
    res.json(ApiResponse.ok(null, 'Xóa tài khoản thành công'));
  });
}
