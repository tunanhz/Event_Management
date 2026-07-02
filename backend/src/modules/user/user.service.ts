import { UserRepository, mockUsersStore } from './user.repository';
import { IUser } from './user.model';
import { OTP } from './otp.model';
import { AppError } from '../../common/utils/AppError';
import { PaginationQuery, PaginatedResult } from '../../common/types';
import { emailService } from '../../common/utils/email.service';
import { generateToken } from '../../common/utils/jwt';
import { OAuth2Client } from 'google-auth-library';
import { config } from '../../config';
import { isDbConnected } from '../../config/database';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

const googleClient = new OAuth2Client(config.google.clientId);

// In-Memory store for temporary OTPs when DB is offline
let mockOtpStore: { email: string; otp: string; createdAt: Date }[] = [];

export class UserService {
  private userRepository: UserRepository;

  constructor() {
    this.userRepository = new UserRepository();
  }

  // ─── Authentication Services ──────────────────────────────────────────

  async sendOTP(email: string): Promise<void> {
    if (!email) {
      throw new AppError('Email is required', 400);
    }

    // Generate 6 digit numeric OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    const lowerEmail = email.toLowerCase().trim();

    // Clear previous OTPs for this email
    if (isDbConnected) {
      await OTP.deleteMany({ email: lowerEmail });
      
      // Store new OTP
      await OTP.create({
        email: lowerEmail,
        otp,
      });
    } else {
      mockOtpStore = mockOtpStore.filter(o => o.email !== lowerEmail);
      mockOtpStore.push({
        email: lowerEmail,
        otp,
        createdAt: new Date(),
      });
    }

    // Send via email service
    await emailService.sendOTP(email, otp);
  }

  async registerWithOTP(data: Partial<IUser> & { otpCode: string; password?: string }): Promise<{ user: IUser; token: string }> {
    const { email, password, fullName, phone, role = 'PARTICIPANT', otpCode } = data as any;

    if (!email || !password || !fullName || !otpCode) {
      throw new AppError('Email, password, fullName, and OTP code are required', 400);
    }

    const lowerEmail = email.toLowerCase().trim();

    // Enforce role constraints (only PARTICIPANT or ORGANIZER can self-register)
    // Exception: Allow ADMIN registration only if there are no ADMINs in the database (Bootstrap)
    if (role === 'ADMIN') {
      const adminCount = await this.userRepository.countAdmins();
      if (adminCount > 0) {
        throw new AppError('Cannot register as ADMIN. Only the first system administrator can be registered this way.', 403);
      }
    } else if (role === 'STAFF') {
      throw new AppError('STAFF accounts cannot self-register. They must be created by an ADMIN.', 403);
    } else if (!['PARTICIPANT', 'ORGANIZER'].includes(role)) {
      throw new AppError('Invalid registration role', 400);
    }

    // Check if user already exists
    const existingUser = await this.userRepository.findByEmail(lowerEmail);
    if (existingUser) {
      throw new AppError('Email already registered', 409);
    }

    // Verify OTP
    let savedOtp: any;
    if (isDbConnected) {
      savedOtp = await OTP.findOne({ email: lowerEmail }).sort({ createdAt: -1 });
    } else {
      const userOtps = mockOtpStore.filter(o => o.email === lowerEmail);
      savedOtp = userOtps.length > 0 ? userOtps[userOtps.length - 1] : null;
    }

    if (!savedOtp || savedOtp.otp !== otpCode) {
      throw new AppError('Mã OTP không hợp lệ hoặc đã hết hạn', 400);
    }

    // Create User
    const newUser = await this.userRepository.create({
      fullName,
      email: lowerEmail,
      passwordHash: password,
      phone,
      role,
      accountStatus: 'ACTIVE',
    });

    // Delete OTP after successful registration
    if (isDbConnected) {
      await OTP.deleteMany({ email: lowerEmail });
    } else {
      mockOtpStore = mockOtpStore.filter(o => o.email !== lowerEmail);
    }

    // Exclude password from returned user object
    const userJson = newUser.toJSON();
    delete userJson.passwordHash;

    // Generate JWT
    const token = generateToken({
      id: (newUser._id as any).toString(),
      email: newUser.email,
      role: newUser.role,
    });

    return { user: userJson as any, token };
  }

  async loginWithEmail(email: string, passwordPlain: string): Promise<{ user: IUser; token: string }> {
    if (!email || !passwordPlain) {
      throw new AppError('Email and password are required', 400);
    }

    const user = await this.userRepository.findByEmailForAuth(email.toLowerCase());
    if (!user) {
      throw new AppError('Email hoặc mật khẩu không chính xác', 401);
    }

    if (user.accountStatus === 'PENDING') {
      throw new AppError('Tài khoản của bạn chưa được kích hoạt. Vui lòng kiểm tra email kích hoạt.', 403);
    }

    if (user.accountStatus === 'BANNED') {
      throw new AppError('Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.', 403);
    }

    const isMatch = await user.comparePassword(passwordPlain);
    if (!isMatch) {
      throw new AppError('Email hoặc mật khẩu không chính xác', 401);
    }

    const userJson = user.toJSON();
    delete userJson.passwordHash;

    const token = generateToken({
      id: (user._id as any).toString(),
      email: user.email,
      role: user.role,
    });

    return { user: userJson as any, token };
  }

  async loginWithGoogle(googleToken: string): Promise<{ user: IUser; token: string }> {
    if (!googleToken) {
      throw new AppError('Google token is required', 400);
    }

    let email = '';
    let name = '';
    let avatar = '';

    // Mock Authentication Logic for local testing/academic demo
    if (googleToken.startsWith('mock_')) {
      const id = googleToken.replace('mock_', '');
      email = `${id}@gmail.com`.toLowerCase();
      name = id.charAt(0).toUpperCase() + id.slice(1);
      avatar = `https://api.dicebear.com/7.x/adventurer/svg?seed=${name}`;
    } else if (!config.google.clientId) {
      // If client ID is not configured, treat token as the mock email address for testing ease
      email = googleToken.includes('@') ? googleToken.toLowerCase() : 'google_test@gmail.com';
      name = email.split('@')[0];
      name = name.charAt(0).toUpperCase() + name.slice(1);
      avatar = `https://api.dicebear.com/7.x/adventurer/svg?seed=${name}`;
    } else {
      try {
        const ticket = await googleClient.verifyIdToken({
          idToken: googleToken,
          audience: config.google.clientId,
        });
        const payload = ticket.getPayload();
        if (!payload || !payload.email) {
          throw new AppError('Xác thực Google thất bại: Không tìm thấy Email.', 400);
        }
        email = payload.email.toLowerCase();
        name = payload.name || 'Google User';
        avatar = payload.picture || '';
      } catch (err: any) {
        if (config.nodeEnv === 'development') {
          console.warn('⚠️ Google Token verification failed. Falling back to Mock authentication for testing:', err.message);
          email = 'google_demo_fallback@gmail.com';
          name = 'Google Demo User';
          avatar = 'https://api.dicebear.com/7.x/adventurer/svg?seed=fallback';
        } else {
          throw new AppError(`Google verification failed: ${err.message}`, 400);
        }
      }
    }

    // Check if user exists in database
    let user = await this.userRepository.findByEmail(email);

    if (!user) {
      // Create new user (automatically role PARTICIPANT)
      user = await this.userRepository.create({
        fullName: name,
        email,
        role: 'PARTICIPANT',
        accountStatus: 'ACTIVE',
        avatar,
      });
    } else if (user.accountStatus === 'BANNED') {
      throw new AppError('Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.', 403);
    }

    const token = generateToken({
      id: (user._id as any).toString(),
      email: user.email,
      role: user.role,
    });

    return { user, token };
  }

  // ─── Admin Management Services ────────────────────────────────────────

  async getUserById(id: string): Promise<IUser> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new AppError('User not found', 404);
    }
    return user;
  }

  async getAllUsers(
    adminId: string,
    query: PaginationQuery & { role?: string; status?: string; search?: string }
  ): Promise<PaginatedResult<IUser>> {
    // Ensure admin user exists
    const admin = await this.userRepository.findById(adminId);
    if (!admin || admin.role !== 'ADMIN') {
      throw new AppError('Access denied: Admin role required', 403);
    }

    return this.userRepository.findAll(query);
  }

  async createStaffAccount(adminId: string, data: { fullName: string; email: string }): Promise<IUser> {
    const { fullName, email } = data;

    if (!fullName || !email) {
      throw new AppError('Full name and email are required for Staff account', 400);
    }

    // Ensure action is taken by admin
    const admin = await this.userRepository.findById(adminId);
    if (!admin || admin.role !== 'ADMIN') {
      throw new AppError('Access denied: Admin role required', 403);
    }

    const lowerEmail = email.toLowerCase();

    // Check if email already exists
    const existingUser = await this.userRepository.findByEmail(lowerEmail);
    if (existingUser) {
      throw new AppError('Email already registered', 409);
    }

    // Generate random 8-character password
    const passwordPlain = Math.random().toString(36).slice(-8) + Math.random().toString(36).toUpperCase().slice(-2);

    // Create Staff User in PENDING state
    const staff = await this.userRepository.create({
      fullName,
      email: lowerEmail,
      passwordHash: passwordPlain,
      role: 'STAFF',
      accountStatus: 'PENDING',
    });

    // Generate activation token
    const activationToken = jwt.sign(
      { id: (staff._id as any).toString(), email: staff.email, purpose: 'activation' },
      config.jwt.secret,
      { expiresIn: '7d' }
    );

    const activationLink = `${config.frontendUrl}/activate?token=${activationToken}`;

    // Send credentials and activation link via email
    try {
      await emailService.sendStaffActivation(lowerEmail, fullName, passwordPlain, activationLink);
    } catch (emailErr) {
      console.error(`❌ Failed to send credentials email to Staff ${lowerEmail}:`, emailErr);
    }

    const staffJson = staff.toJSON();
    delete staffJson.passwordHash;

    return staffJson as any;
  }

  async updateAccountStatus(adminId: string, targetUserId: string, status: 'ACTIVE' | 'BANNED'): Promise<IUser> {
    if (!['ACTIVE', 'BANNED'].includes(status)) {
      throw new AppError('Invalid account status', 400);
    }

    // Ensure action is taken by admin
    const admin = await this.userRepository.findById(adminId);
    if (!admin || admin.role !== 'ADMIN') {
      throw new AppError('Access denied: Admin role required', 403);
    }

    // Prevent admin from banning themselves
    if (adminId === targetUserId) {
      throw new AppError('Không thể tự khóa tài khoản của chính mình', 400);
    }

    const updatedUser = await this.userRepository.update(targetUserId, { accountStatus: status });
    if (!updatedUser) {
      throw new AppError('User not found', 404);
    }

    return updatedUser;
  }

  async updateAccountRole(adminId: string, targetUserId: string, role: 'ADMIN' | 'ORGANIZER' | 'PARTICIPANT' | 'STAFF'): Promise<IUser> {
    if (!['ADMIN', 'ORGANIZER', 'PARTICIPANT', 'STAFF'].includes(role)) {
      throw new AppError('Invalid user role', 400);
    }

    // Ensure action is taken by admin
    const admin = await this.userRepository.findById(adminId);
    if (!admin || admin.role !== 'ADMIN') {
      throw new AppError('Access denied: Admin role required', 403);
    }

    // Prevent admin from changing their own role (to prevent accidental lockout)
    if (adminId === targetUserId) {
      throw new AppError('Không thể tự thay đổi quyền hạn của chính mình', 400);
    }

    const updatedUser = await this.userRepository.update(targetUserId, { role });
    if (!updatedUser) {
      throw new AppError('User not found', 404);
    }

    return updatedUser;
  }

  async deleteUser(adminId: string, targetUserId: string): Promise<void> {
    // Ensure action is taken by admin
    const admin = await this.userRepository.findById(adminId);
    if (!admin || admin.role !== 'ADMIN') {
      throw new AppError('Access denied: Admin role required', 403);
    }

    if (adminId === targetUserId) {
      throw new AppError('Cannot delete your own admin account', 400);
    }

    const user = await this.userRepository.delete(targetUserId);
    if (!user) {
      throw new AppError('User not found', 404);
    }
  }

  async activateStaffAccount(token: string, fullName?: string, newPassword?: string): Promise<IUser> {
    if (!token) {
      throw new AppError('Activation token is required', 400);
    }

    try {
      const decoded = jwt.verify(token, config.jwt.secret) as any;
      if (!decoded || decoded.purpose !== 'activation') {
        throw new AppError('Mã kích hoạt không hợp lệ', 400);
      }

      // Fetch mongoose doc to allow hashing on save
      const user = await this.userRepository.findByIdDocument(decoded.id);
      if (!user) {
        throw new AppError('Không tìm thấy tài khoản', 404);
      }

      if (user.accountStatus !== 'PENDING') {
        throw new AppError('Tài khoản này đã được kích hoạt hoặc đang bị khóa.', 400);
      }

      // Update fields
      if (fullName) {
        user.fullName = fullName;
      }
      if (newPassword) {
        if (newPassword.length < 6) {
          throw new AppError('Mật khẩu mới phải có ít nhất 6 ký tự', 400);
        }
        if (!isDbConnected) {
          const salt = await bcrypt.genSalt(10);
          user.passwordHash = await bcrypt.hash(newPassword, salt);
        } else {
          user.passwordHash = newPassword;
        }
      }

      user.accountStatus = 'ACTIVE';

      if (isDbConnected) {
        await (user as any).save();
      } else {
        const idx = mockUsersStore.findIndex(u => u._id === decoded.id);
        if (idx !== -1) {
          mockUsersStore[idx].fullName = user.fullName;
          mockUsersStore[idx].passwordHash = user.passwordHash;
          mockUsersStore[idx].accountStatus = 'ACTIVE';
          mockUsersStore[idx].updatedAt = new Date();
        }
      }

      const userJson = isDbConnected ? (user as any).toJSON() : user;
      delete userJson.passwordHash;

      return userJson;
    } catch (err: any) {
      if (err.name === 'TokenExpiredError') {
        throw new AppError('Mã kích hoạt tài khoản đã hết hạn. Vui lòng liên hệ Admin để cấp lại.', 400);
      }
      throw new AppError(err.message || 'Kích hoạt tài khoản thất bại', 400);
    }
  }

  async updateProfile(userId: string, data: { fullName?: string; currentPassword?: string; newPassword?: string }): Promise<IUser> {
    const user = await this.userRepository.findByIdDocument(userId);
    if (!user) {
      throw new AppError('Không tìm thấy tài khoản', 404);
    }

    if (data.fullName) {
      user.fullName = data.fullName;
    }

    if (data.newPassword) {
      if (!data.currentPassword) {
        throw new AppError('Vui lòng nhập mật khẩu hiện tại để đổi mật khẩu', 400);
      }
      
      const userWithAuth = await this.userRepository.findByEmailForAuth(user.email);
      if (!userWithAuth) {
        throw new AppError('Tài khoản không hợp lệ', 404);
      }

      const isMatch = await userWithAuth.comparePassword(data.currentPassword);
      if (!isMatch) {
        throw new AppError('Mật khẩu hiện tại không chính xác', 400);
      }

      if (data.newPassword.length < 6) {
        throw new AppError('Mật khẩu mới phải có ít nhất 6 ký tự', 400);
      }

      if (!isDbConnected) {
        const salt = await bcrypt.genSalt(10);
        user.passwordHash = await bcrypt.hash(data.newPassword, salt);
      } else {
        user.passwordHash = data.newPassword;
      }
    }

    if (isDbConnected) {
      await (user as any).save();
    } else {
      const idx = mockUsersStore.findIndex(u => u._id === userId);
      if (idx !== -1) {
        mockUsersStore[idx].fullName = user.fullName;
        if (data.newPassword) {
          mockUsersStore[idx].passwordHash = user.passwordHash;
        }
        mockUsersStore[idx].updatedAt = new Date();
      }
    }

    const userJson = isDbConnected ? (user as any).toJSON() : user;
    delete userJson.passwordHash;
    return userJson;
  }
}

