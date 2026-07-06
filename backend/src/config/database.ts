import mongoose from 'mongoose';
import { config } from './index';

export let isDbConnected = false;

export const connectDatabase = async (): Promise<void> => {
  try {
    await mongoose.connect(config.mongodbUri);
    console.log('📦 MongoDB connected successfully');
    isDbConnected = true;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    console.warn('\n⚠️  WARNING: Không thể kết nối tới MongoDB!');
    console.warn('⚠️  Hệ thống tự động chuyển sang CHẾ ĐỘ OFFLINE MOCK (lưu dữ liệu tạm thời trong RAM).');
    console.warn('⚠️  Bạn vẫn có thể đăng ký, đăng nhập và test chức năng Admin bình thường.\n');
    isDbConnected = false;
  }
};
