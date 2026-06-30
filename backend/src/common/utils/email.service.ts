import nodemailer from 'nodemailer';
import { config } from '../../config';

class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  private async getTransporter(): Promise<nodemailer.Transporter> {
    if (this.transporter) {
      return this.transporter;
    }

    const { smtp } = config;

    // Check if configuration exists
    if (smtp.user && smtp.pass) {
      this.transporter = nodemailer.createTransport({
        host: smtp.host,
        port: smtp.port,
        secure: smtp.port === 465, // true for port 465, false for other ports
        auth: {
          user: smtp.user,
          pass: smtp.pass,
        },
      });
    } else {
      // Fallback: Using Ethereal Email for testing/academic fallback
      console.log('⚠️ Email SMTP credentials not provided. Creating test account via Ethereal...');
      try {
        const testAccount = await nodemailer.createTestAccount();
        this.transporter = nodemailer.createTransport({
          host: 'smtp.ethereal.email',
          port: 587,
          secure: false,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass,
          },
        });
        console.log(`🚀 Ethereal credentials generated. User: ${testAccount.user}`);
      } catch (err) {
        console.error('❌ Failed to create ethereal test email account. Falling back to console logging.', err);
        // Create a dummy transporter
        this.transporter = {
          sendMail: async (options: any) => {
            console.log(`✉️ DUMMY EMAIL SENT to ${options.to}`);
            console.log(`Subject: ${options.subject}`);
            console.log(`Body:\n${options.text || options.html}`);
            return { messageId: 'dummy-id' };
          },
        } as any;
      }
    }

    return this.transporter!;
  }

  async sendOTP(email: string, otp: string): Promise<void> {
    const transporter = await this.getTransporter();
    const mailOptions = {
      from: config.smtp.from || '"EventBox Admin" <noreply@eventbox.com>',
      to: email,
      subject: 'EventBox - Xác thực Đăng ký tài khoản',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
          <h2 style="color: #0891b2; text-align: center;">Xác thực tài khoản EventBox</h2>
          <p>Chào bạn,</p>
          <p>Cảm ơn bạn đã đăng ký tài khoản trên hệ thống EventBox. Dưới đây là mã xác thực OTP của bạn:</p>
          <div style="background-color: #f0fdfa; border: 1px dashed #0d9488; border-radius: 8px; padding: 15px; text-align: center; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #0f766e;">${otp}</span>
          </div>
          <p style="color: #666; font-size: 14px;">Lưu ý: Mã OTP này có hiệu lực trong vòng <b>5 phút</b>. Vui lòng không chia sẻ mã này với bất kỳ ai.</p>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="font-size: 12px; color: #999; text-align: center;">Đây là email tự động, vui lòng không phản hồi email này.</p>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`📧 OTP Email sent successfully to ${email}. Message ID: ${info.messageId}`);
    if (info.messageId && !config.smtp.user) {
      // If using Ethereal, log the preview URL
      console.log(`🔗 Preview Email at: ${nodemailer.getTestMessageUrl(info)}`);
    }
  }

  async sendStaffCredential(email: string, name: string, passwordPlain: string): Promise<void> {
    const transporter = await this.getTransporter();
    const mailOptions = {
      from: config.smtp.from || '"EventBox Admin" <noreply@eventbox.com>',
      to: email,
      subject: 'EventBox - Thông tin tài khoản nhân viên (STAFF)',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 12px;">
          <h2 style="color: #0891b2; text-align: center;">Tạo tài khoản STAFF thành công</h2>
          <p>Chào <b>${name}</b>,</p>
          <p>Bạn đã được quản trị viên cấp tài khoản nhân viên (STAFF) trên hệ thống EventBox. Dưới đây là thông tin đăng nhập của bạn:</p>
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; margin: 20px 0;">
            <p style="margin: 5px 0;"><b>Email đăng nhập:</b> ${email}</p>
            <p style="margin: 5px 0;"><b>Mật khẩu ban đầu:</b> <span style="font-family: monospace; font-size: 16px; color: #e11d48; background: #ffe4e6; padding: 2px 6px; border-radius: 4px;">${passwordPlain}</span></p>
          </div>
          <p>Vui lòng đăng nhập hệ thống và đổi mật khẩu ngay để đảm bảo an toàn thông tin.</p>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="font-size: 12px; color: #999; text-align: center;">Hệ thống quản lý sự kiện EventBox.</p>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`📧 Staff Credential Email sent to ${email}. Message ID: ${info.messageId}`);
    if (info.messageId && !config.smtp.user) {
      console.log(`🔗 Preview Email at: ${nodemailer.getTestMessageUrl(info)}`);
    }
  }
}

export const emailService = new EmailService();
