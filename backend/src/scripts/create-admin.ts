/**
 * Seed / reset the system administrator account in MongoDB.
 *
 * Usage:  npm run seed:admin
 *
 * Idempotent: creates the admin if missing, otherwise promotes the existing
 * account to ADMIN and resets its password. Credentials match the offline
 * mock admin so the same login works whether MongoDB is connected or not.
 */
import mongoose from 'mongoose';
import { config } from '../config';
import { User } from '../modules/user/user.model';

const ADMIN = {
  fullName: 'System Admin',
  email: 'admin@eventbox.vn',
  password: 'Admin@123456',
  phone: '0987654321',
};

async function run(): Promise<void> {
  // Fail fast if the database is not reachable.
  await mongoose.connect(config.mongodbUri, { serverSelectionTimeoutMS: 8000 });
  console.log('📦 Đã kết nối MongoDB:', config.mongodbUri);

  // +passwordHash so the pre-save hook re-hashes when we set a new password.
  let user = await User.findOne({ email: ADMIN.email }).select('+passwordHash');

  if (user) {
    user.fullName = ADMIN.fullName;
    user.phone = ADMIN.phone;
    user.role = 'ADMIN';
    user.accountStatus = 'ACTIVE';
    user.passwordHash = ADMIN.password; // hashed by the model's pre-save hook
    await user.save();
    console.log('♻️  Tài khoản đã tồn tại → cập nhật thành ADMIN & đặt lại mật khẩu.');
  } else {
    user = new User({
      fullName: ADMIN.fullName,
      email: ADMIN.email,
      passwordHash: ADMIN.password, // hashed by the model's pre-save hook
      phone: ADMIN.phone,
      role: 'ADMIN',
      accountStatus: 'ACTIVE',
    });
    await user.save();
    console.log('✅ Đã tạo tài khoản ADMIN mới.');
  }

  console.log('\n──────── THÔNG TIN ĐĂNG NHẬP ADMIN ────────');
  console.log('  Email:    ' + ADMIN.email);
  console.log('  Password: ' + ADMIN.password);
  console.log('────────────────────────────────────────────\n');

  await mongoose.disconnect();
  process.exit(0);
}

run().catch(async (err) => {
  console.error('❌ Seed admin thất bại:', err?.message || err);
  console.error('   → Kiểm tra MONGODB_URI trong backend/.env và đảm bảo MongoDB đang chạy.');
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
