import React from 'react';
import { render, screen, cleanup, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProfileInfoForm } from '@/components/account/ProfileInfoForm';
import { ChangePasswordForm } from '@/components/account/ChangePasswordForm';
import { useAuth } from '@/context/AuthContext';

jest.mock('@/context/AuthContext');
jest.mock('@/lib/client-api');

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

describe('ProfileInfoForm', () => {
  const mockUser = {
    _id: '123',
    fullName: 'Nguyễn Văn A',
    email: 'nguyen@example.com',
    phone: '0901234567',
    role: 'PARTICIPANT' as const,
    accountStatus: 'ACTIVE' as const,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  };

  let mockRefreshUser: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRefreshUser = jest.fn();
    mockUseAuth.mockReturnValue({
      user: mockUser,
      loading: false,
      refreshUser: mockRefreshUser,
      login: jest.fn(),
      register: jest.fn(),
      loginWithGoogle: jest.fn(),
      logout: jest.fn(),
    } as any);
  });

  afterEach(() => {
    cleanup();
  });

  describe('rendering', () => {
    it('should render form title', () => {
      render(<ProfileInfoForm />);
      expect(screen.getByText('Thông tin cá nhân')).toBeInTheDocument();
    });

    it('should render full name field', () => {
      render(<ProfileInfoForm />);
      expect(screen.getByLabelText(/họ và tên/i)).toBeInTheDocument();
    });

    it('should render email field as read-only', () => {
      render(<ProfileInfoForm />);
      const emailInput = screen.getByLabelText(/email/i);
      expect(emailInput).toHaveAttribute('readOnly');
      expect(emailInput).toHaveValue(mockUser.email);
    });

    it('should show helper text for email field', () => {
      render(<ProfileInfoForm />);
      expect(screen.getByText(/email đăng nhập không thể thay đổi/i)).toBeInTheDocument();
    });

    it('should render phone field as read-only', () => {
      render(<ProfileInfoForm />);
      const phoneInput = screen.getByLabelText(/số điện thoại/i);
      expect(phoneInput).toHaveAttribute('readOnly');
      expect(phoneInput).toHaveValue(mockUser.phone);
    });

    it('should pre-fill full name from user context', () => {
      render(<ProfileInfoForm />);
      const nameInput = screen.getByLabelText(/họ và tên/i) as HTMLInputElement;
      expect(nameInput.value).toBe(mockUser.fullName);
    });

    it('should render save button', () => {
      render(<ProfileInfoForm />);
      expect(screen.getByRole('button', { name: /lưu thay đổi/i })).toBeInTheDocument();
    });

    it('should render section with correct semantic HTML', () => {
      const { container } = render(<ProfileInfoForm />);
      const section = container.querySelector('section');
      expect(section).toBeInTheDocument();
      expect(section?.tagName).toBe('SECTION');
    });
  });

  describe('form behavior', () => {
    it('should disable save button when no changes made', () => {
      render(<ProfileInfoForm />);
      const saveBtn = screen.getByRole('button', { name: /lưu thay đổi/i });
      expect(saveBtn).toBeDisabled();
    });

    it('should enable save button when name changes', async () => {
      const user = userEvent.setup();
      render(<ProfileInfoForm />);
      const nameInput = screen.getByLabelText(/họ và tên/i);
      await user.clear(nameInput);
      await user.type(nameInput, 'Nguyễn Văn B');
      const saveBtn = screen.getByRole('button', { name: /lưu thay đổi/i });
      expect(saveBtn).not.toBeDisabled();
    });

    it('should disable save button when reverting to original name', async () => {
      const user = userEvent.setup();
      render(<ProfileInfoForm />);
      const nameInput = screen.getByLabelText(/họ và tên/i);
      await user.clear(nameInput);
      await user.type(nameInput, 'Different Name');
      await user.clear(nameInput);
      await user.type(nameInput, mockUser.fullName);
      const saveBtn = screen.getByRole('button', { name: /lưu thay đổi/i });
      expect(saveBtn).toBeDisabled();
    });

    it('should show validation error when submitting empty name', async () => {
      const user = userEvent.setup();
      render(<ProfileInfoForm />);
      const nameInput = screen.getByLabelText(/họ và tên/i);
      await user.clear(nameInput);
      const saveBtn = screen.getByRole('button', { name: /lưu thay đổi/i });
      await user.type(nameInput, ' ');
      await user.clear(nameInput);
      expect(saveBtn).not.toBeDisabled();
      await user.click(saveBtn);
      expect(screen.getByText(/họ và tên không được để trống/i)).toBeInTheDocument();
    });

    it('should have error alert with proper aria-live', async () => {
      const user = userEvent.setup();
      render(<ProfileInfoForm />);
      const nameInput = screen.getByLabelText(/họ và tên/i);
      await user.clear(nameInput);
      await user.type(nameInput, ' ');
      await user.clear(nameInput);
      const saveBtn = screen.getByRole('button', { name: /lưu thay đổi/i });
      await user.click(saveBtn);
      const alert = screen.getByRole('alert');
      expect(alert).toHaveAttribute('aria-live', 'assertive');
    });

    it('should handle missing fullName gracefully', () => {
      mockUseAuth.mockReturnValue({
        user: { ...mockUser, fullName: '' },
        loading: false,
        refreshUser: mockRefreshUser,
        login: jest.fn(),
        register: jest.fn(),
        loginWithGoogle: jest.fn(),
        logout: jest.fn(),
      } as any);

      render(<ProfileInfoForm />);
      const nameInput = screen.getByLabelText(/họ và tên/i) as HTMLInputElement;
      expect(nameInput.value).toBe('');
    });

    it('should display fallback text for missing phone', () => {
      mockUseAuth.mockReturnValue({
        user: { ...mockUser, phone: undefined },
        loading: false,
        refreshUser: mockRefreshUser,
        login: jest.fn(),
        register: jest.fn(),
        loginWithGoogle: jest.fn(),
        logout: jest.fn(),
      } as any);

      render(<ProfileInfoForm />);
      const phoneInput = screen.getByLabelText(/số điện thoại/i) as HTMLInputElement;
      expect(phoneInput.value).toBe('Chưa cập nhật');
    });
  });
});

describe('ChangePasswordForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  describe('rendering', () => {
    it('should render form title', () => {
      render(<ChangePasswordForm />);
      expect(screen.getByText('Đổi mật khẩu')).toBeInTheDocument();
    });

    it('should render current password field', () => {
      render(<ChangePasswordForm />);
      expect(screen.getByLabelText(/mật khẩu hiện tại/i)).toBeInTheDocument();
    });

    it('should render new password field', () => {
      const { container } = render(<ChangePasswordForm />);
      // Get by ID to avoid label text conflicts
      const newPwdField = container.querySelector('#newPassword');
      expect(newPwdField).toBeInTheDocument();
    });

    it('should render confirm password field', () => {
      render(<ChangePasswordForm />);
      expect(screen.getByLabelText(/xác nhận mật khẩu mới/i)).toBeInTheDocument();
    });

    it('should show helper text for new password', () => {
      render(<ChangePasswordForm />);
      expect(screen.getByText(/ít nhất 6 ký tự/i)).toBeInTheDocument();
    });

    it('should render update button', () => {
      render(<ChangePasswordForm />);
      expect(screen.getByRole('button', { name: /cập nhật mật khẩu/i })).toBeInTheDocument();
    });

    it('should start with empty password fields', () => {
      render(<ChangePasswordForm />);
      const inputs = screen.getAllByDisplayValue('');
      expect(inputs.length).toBeGreaterThan(0);
    });
  });

  describe('validation', () => {
    it('should reject new password shorter than 6 characters', async () => {
      const user = userEvent.setup();
      const { container } = render(<ChangePasswordForm />);
      const currentPwd = container.querySelector('#currentPassword') as HTMLInputElement;
      const newPwd = container.querySelector('#newPassword') as HTMLInputElement;
      const confirmPwd = container.querySelector('#confirmPassword') as HTMLInputElement;
      const submitBtn = screen.getByRole('button', { name: /cập nhật/i });

      await user.type(currentPwd, 'oldpass123');
      await user.type(newPwd, 'short');
      await user.type(confirmPwd, 'short');
      await user.click(submitBtn);

      expect(screen.getByText(/mật khẩu mới phải có ít nhất 6 ký tự/i)).toBeInTheDocument();
    });

    it('should reject mismatched password confirmation', async () => {
      const user = userEvent.setup();
      const { container } = render(<ChangePasswordForm />);
      const newPwd = container.querySelector('#newPassword') as HTMLInputElement;
      const confirmPwd = container.querySelector('#confirmPassword') as HTMLInputElement;

      await user.type(newPwd, 'newpass123');
      await user.type(confirmPwd, 'different123');

      expect(screen.getByText(/mật khẩu xác nhận không khớp/i)).toBeInTheDocument();
    });

    it('should clear error when user corrects mismatched confirmation', async () => {
      const user = userEvent.setup();
      const { container } = render(<ChangePasswordForm />);
      const newPwd = container.querySelector('#newPassword') as HTMLInputElement;
      const confirmPwd = container.querySelector('#confirmPassword') as HTMLInputElement;

      await user.type(newPwd, 'newpass123');
      await user.type(confirmPwd, 'different');

      expect(screen.getByText(/mật khẩu xác nhận không khớp/i)).toBeInTheDocument();

      await user.clear(confirmPwd);
      await user.type(confirmPwd, 'newpass123');

      expect(screen.queryByText(/mật khẩu xác nhận không khớp/i)).not.toBeInTheDocument();
    });

    it('should have error alert with proper aria-live when validation fails', async () => {
      const user = userEvent.setup();
      render(<ChangePasswordForm />);
      const submitBtn = screen.getByRole('button', { name: /cập nhật mật khẩu/i });

      await user.click(submitBtn);

      const alert = screen.getByRole('alert');
      expect(alert).toHaveAttribute('aria-live', 'assertive');
    });
  });

  describe('accessibility', () => {
    it('should have proper label associations', () => {
      render(<ChangePasswordForm />);
      const currentPwd = screen.getByLabelText(/mật khẩu hiện tại/i);
      expect(currentPwd).toHaveAttribute('id', 'currentPassword');
    });

    it('should have password show/hide toggle on password fields', () => {
      const { container } = render(<ChangePasswordForm />);
      const form = container.querySelector('form')!;
      const eyeButtons = within(form).getAllByRole('button').filter((b) =>
        b.getAttribute('aria-label')?.match(/Hiện|Ẩn/)
      );
      expect(eyeButtons.length).toBeGreaterThan(0);
    });
  });
});
