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

  async sendStaffActivation(email: string, name: string, passwordPlain: string, activationLink: string): Promise<void> {
    const transporter = await this.getTransporter();
    const mailOptions = {
      from: config.smtp.from || '"EventBox Admin" <noreply@eventbox.com>',
      to: email,
      subject: 'EventBox - Kích hoạt tài khoản nhân viên (STAFF)',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 12px;">
          <h2 style="color: #0891b2; text-align: center;">Kích hoạt tài khoản STAFF</h2>
          <p>Chào <b>${name}</b>,</p>
          <p>Bạn đã được quản trị viên cấp tài khoản nhân viên (STAFF) trên hệ thống EventBox. Dưới đây là thông tin đăng nhập tạm thời của bạn:</p>
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; margin: 20px 0;">
            <p style="margin: 5px 0;"><b>Email đăng nhập:</b> ${email}</p>
            <p style="margin: 5px 0;"><b>Mật khẩu tạm thời:</b> <span style="font-family: monospace; font-size: 16px; color: #e11d48; background: #ffe4e6; padding: 2px 6px; border-radius: 4px;">${passwordPlain}</span></p>
          </div>
          <p style="font-weight: bold; color: #0891b2;">Vui lòng kích chọn nút dưới đây để kích hoạt tài khoản, cập nhật họ tên và thay đổi mật khẩu của bạn:</p>
          <div style="text-align: center; margin: 25px 0;">
            <a href="${activationLink}" style="background-color: #0891b2; color: #ffffff; padding: 12px 24px; text-decoration: none; font-weight: bold; border-radius: 8px; display: inline-block; box-shadow: 0 4px 10px rgba(8,145,178,0.25);">Kích hoạt & Thiết lập tài khoản</a>
          </div>
          <p style="color: #e11d48; font-size: 13px;">* Lưu ý: Tài khoản của bạn sẽ không thể đăng nhập cho đến khi được kích hoạt qua đường link trên.</p>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="font-size: 12px; color: #999; text-align: center;">Hệ thống quản lý sự kiện EventBox.</p>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`📧 Staff Activation Email sent to ${email}. Message ID: ${info.messageId}`);
    if (info.messageId && !config.smtp.user) {
      console.log(`🔗 Preview Email at: ${nodemailer.getTestMessageUrl(info)}`);
    }
  }

  /** Sent once a registration is confirmed PAID — the only reliable delivery
   *  channel available: User.email is required, User.phone is optional and
   *  there is no SMS gateway in this codebase. */
  async sendRegistrationConfirmation(
    email: string,
    info: {
      eventTitle: string;
      ticketName: string;
      quantity: number;
      totalAmount: number;
      /** The organizer's custom "Tin nhắn xác nhận" (Event.confirmationMessage), if set. */
      customMessage?: string;
    }
  ): Promise<void> {
    const transporter = await this.getTransporter();
    const amount = info.totalAmount.toLocaleString('vi-VN');
    const mailOptions = {
      from: config.smtp.from || '"EventBox Admin" <noreply@eventbox.com>',
      to: email,
      subject: `EventBox - Xác nhận đặt vé "${info.eventTitle}"`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
          <h2 style="color: #0891b2; text-align: center;">Đặt vé thành công!</h2>
          <p>${info.customMessage ? info.customMessage : 'Cảm ơn bạn đã đặt vé trên EventBox.'}</p>
          <div style="background-color: #f0fdfa; border: 1px dashed #0d9488; border-radius: 8px; padding: 15px; margin: 20px 0;">
            <p style="margin: 5px 0;"><b>Sự kiện:</b> ${info.eventTitle}</p>
            <p style="margin: 5px 0;"><b>Loại vé:</b> ${info.ticketName} x${info.quantity}</p>
            <p style="margin: 5px 0;"><b>Tổng tiền:</b> ${amount}đ</p>
          </div>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="font-size: 12px; color: #999; text-align: center;">Đây là email tự động, vui lòng không phản hồi email này.</p>
        </div>
      `,
    };

    const sent = await transporter.sendMail(mailOptions);
    console.log(`📧 Registration confirmation email sent to ${email}. Message ID: ${sent.messageId}`);
    if (sent.messageId && !config.smtp.user) {
      console.log(`🔗 Preview Email at: ${nodemailer.getTestMessageUrl(sent)}`);
    }
  }

  async sendEventApprovalNotification(email: string, eventTitle: string, serviceCost: number = 0): Promise<void> {
    const transporter = await this.getTransporter();
    const isDepositRequired = serviceCost > 0;
    const depositVnd = (Math.round(serviceCost * 0.2)).toLocaleString('vi-VN');

    const mailOptions = {
      from: config.smtp.from || '"EventBox Admin" <noreply@eventbox.com>',
      to: email,
      subject: `EventBox - Thông báo Phê duyệt sự kiện "${eventTitle}"`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
          <h2 style="color: #059669; text-align: center;">🎉 Sự kiện đã được Phê duyệt!</h2>
          <p>Chào bạn,</p>
          <p>Ban quản trị EventBox xin thông báo sự kiện <b>"${eventTitle}"</b> của bạn đã được kiểm duyệt thành công.</p>
          ${
            isDepositRequired
              ? `<div style="background-color: #fffbeb; border: 1px dashed #d97706; border-radius: 8px; padding: 15px; margin: 20px 0;">
                  <p style="margin: 5px 0; color: #b45309; font-weight: bold;">⚠️ Trạng thái: Chờ cọc 20% dịch vụ hệ thống</p>
                  <p style="margin: 5px 0;">Số tiền đặt cọc cần thanh toán: <b>${depositVnd} VNĐ</b></p>
                  <p style="margin: 5px 0; font-size: 13px; color: #666;">Vui lòng đăng nhập vào kênh Ban tổ chức để hoàn tất thanh toán cọc trước khi sự kiện được mở bán công khai.</p>
                </div>`
              : `<div style="background-color: #ecfdf5; border: 1px dashed #059669; border-radius: 8px; padding: 15px; margin: 20px 0;">
                  <p style="margin: 5px 0; color: #047857; font-weight: bold;">✅ Trạng thái: Đã công bố chính thức (PUBLISHED)</p>
                  <p style="margin: 5px 0; font-size: 13px; color: #666;">Sự kiện hiện đã hiển thị trên Trang chủ và sẵn sàng tiếp nhận khán giả đặt vé.</p>
                </div>`
          }
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="font-size: 12px; color: #999; text-align: center;">Ban Quản Trị Hệ Thống EventBox.</p>
        </div>
      `,
    };

    const sent = await transporter.sendMail(mailOptions);
    console.log(`📧 Event Approval Email sent to ${email}. Message ID: ${sent.messageId}`);
    if (sent.messageId && !config.smtp.user) {
      console.log(`🔗 Preview Email at: ${nodemailer.getTestMessageUrl(sent)}`);
    }
  }

  async sendEventRejectionNotification(email: string, eventTitle: string, reason: string): Promise<void> {
    const transporter = await this.getTransporter();
    const mailOptions = {
      from: config.smtp.from || '"EventBox Admin" <noreply@eventbox.com>',
      to: email,
      subject: `EventBox - Thông báo Yêu cầu chỉnh sửa sự kiện "${eventTitle}"`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
          <h2 style="color: #dc2626; text-align: center;">Yêu cầu Chỉnh sửa Hồ sơ Sự kiện</h2>
          <p>Chào bạn,</p>
          <p>Ban quản trị EventBox đã kiểm duyệt hồ sơ sự kiện <b>"${eventTitle}"</b> của bạn. Hiện tại sự kiện chưa đủ điều kiện công bố do các nguyên nhân sau:</p>
          <div style="background-color: #fef2f2; border: 1px dashed #dc2626; border-radius: 8px; padding: 15px; margin: 20px 0;">
            <p style="margin: 0; color: #991b1b; font-weight: bold;">Lý do từ chối / Cần chỉnh sửa:</p>
            <p style="margin: 8px 0 0 0; color: #7f1d1d; font-size: 14px; white-space: pre-line;">${reason}</p>
          </div>
          <p style="font-size: 13px; color: #4b5563;">Vui lòng đăng nhập vào trang Ban tổ chức, tiến hành cập nhật lại các thông tin theo yêu cầu và bấm <b>Gửi duyệt lại</b>.</p>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="font-size: 12px; color: #999; text-align: center;">Ban Quản Trị Hệ Thống EventBox.</p>
        </div>
      `,
    };

    const sent = await transporter.sendMail(mailOptions);
    console.log(`📧 Event Rejection Email sent to ${email}. Message ID: ${sent.messageId}`);
    if (sent.messageId && !config.smtp.user) {
      console.log(`🔗 Preview Email at: ${nodemailer.getTestMessageUrl(sent)}`);
    }
  }
}

export const emailService = new EmailService();

