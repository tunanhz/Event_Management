import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { useAuth } from '@/context/AuthContext';
import type { User } from '@/context/AuthContext';

jest.mock('@/context/AuthContext');

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

const mockUser = (role: User['role']): User => ({
  _id: '123',
  fullName: 'Test User',
  email: 'test@example.com',
  phone: '0123456789',
  role,
  accountStatus: 'ACTIVE',
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
});

describe('RoleGuard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('loading state', () => {
    it('should show spinner while loading', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: true,
        login: jest.fn(),
        register: jest.fn(),
        loginWithGoogle: jest.fn(),
        logout: jest.fn(),
        refreshUser: jest.fn(),
      } as any);

      render(
        <RoleGuard allow={['PARTICIPANT']}>
          <div>Protected Content</div>
        </RoleGuard>
      );

      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('should not show protected content during loading', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: true,
        login: jest.fn(),
        register: jest.fn(),
        loginWithGoogle: jest.fn(),
        logout: jest.fn(),
        refreshUser: jest.fn(),
      } as any);

      render(
        <RoleGuard allow={['PARTICIPANT']}>
          <div>Protected Content</div>
        </RoleGuard>
      );

      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });

    it('should display full-screen spinner', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: true,
        login: jest.fn(),
        register: jest.fn(),
        loginWithGoogle: jest.fn(),
        logout: jest.fn(),
        refreshUser: jest.fn(),
      } as any);

      const { container } = render(
        <RoleGuard allow={['PARTICIPANT']}>
          <div>Protected Content</div>
        </RoleGuard>
      );

      const loader = container.querySelector('div');
      expect(loader).toHaveStyle({ height: 'height: 100dvh' });
    });
  });

  describe('allowed roles', () => {
    it('should render children for allowed role', () => {
      mockUseAuth.mockReturnValue({
        user: mockUser('PARTICIPANT'),
        loading: false,
        login: jest.fn(),
        register: jest.fn(),
        loginWithGoogle: jest.fn(),
        logout: jest.fn(),
        refreshUser: jest.fn(),
      } as any);

      render(
        <RoleGuard allow={['PARTICIPANT']}>
          <div>Protected Content</div>
        </RoleGuard>
      );

      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });

    it('should render children for ADMIN role when allowed', () => {
      mockUseAuth.mockReturnValue({
        user: mockUser('ADMIN'),
        loading: false,
        login: jest.fn(),
        register: jest.fn(),
        loginWithGoogle: jest.fn(),
        logout: jest.fn(),
        refreshUser: jest.fn(),
      } as any);

      render(
        <RoleGuard allow={['ADMIN']}>
          <div>Admin Only</div>
        </RoleGuard>
      );

      expect(screen.getByText('Admin Only')).toBeInTheDocument();
    });

    it('should render children for ORGANIZER role when allowed', () => {
      mockUseAuth.mockReturnValue({
        user: mockUser('ORGANIZER'),
        loading: false,
        login: jest.fn(),
        register: jest.fn(),
        loginWithGoogle: jest.fn(),
        logout: jest.fn(),
        refreshUser: jest.fn(),
      } as any);

      render(
        <RoleGuard allow={['ORGANIZER']}>
          <div>Organizer Only</div>
        </RoleGuard>
      );

      expect(screen.getByText('Organizer Only')).toBeInTheDocument();
    });

    it('should render children for STAFF role when allowed', () => {
      mockUseAuth.mockReturnValue({
        user: mockUser('STAFF'),
        loading: false,
        login: jest.fn(),
        register: jest.fn(),
        loginWithGoogle: jest.fn(),
        logout: jest.fn(),
        refreshUser: jest.fn(),
      } as any);

      render(
        <RoleGuard allow={['STAFF']}>
          <div>Staff Only</div>
        </RoleGuard>
      );

      expect(screen.getByText('Staff Only')).toBeInTheDocument();
    });

    it('should render children when role is in allowed array', () => {
      mockUseAuth.mockReturnValue({
        user: mockUser('ORGANIZER'),
        loading: false,
        login: jest.fn(),
        register: jest.fn(),
        loginWithGoogle: jest.fn(),
        logout: jest.fn(),
        refreshUser: jest.fn(),
      } as any);

      render(
        <RoleGuard allow={['ADMIN', 'ORGANIZER', 'PARTICIPANT']}>
          <div>Multi-role Content</div>
        </RoleGuard>
      );

      expect(screen.getByText('Multi-role Content')).toBeInTheDocument();
    });
  });

  describe('denied roles', () => {
    it('should show access denied for disallowed role', () => {
      mockUseAuth.mockReturnValue({
        user: mockUser('PARTICIPANT'),
        loading: false,
        login: jest.fn(),
        register: jest.fn(),
        loginWithGoogle: jest.fn(),
        logout: jest.fn(),
        refreshUser: jest.fn(),
      } as any);

      render(
        <RoleGuard allow={['ADMIN']}>
          <div>Admin Only</div>
        </RoleGuard>
      );

      expect(screen.queryByText('Admin Only')).not.toBeInTheDocument();
      expect(screen.getByText(/quyền truy cập bị từ chối/i)).toBeInTheDocument();
    });

    it('should show default message for denied access', () => {
      mockUseAuth.mockReturnValue({
        user: mockUser('PARTICIPANT'),
        loading: false,
        login: jest.fn(),
        register: jest.fn(),
        loginWithGoogle: jest.fn(),
        logout: jest.fn(),
        refreshUser: jest.fn(),
      } as any);

      render(
        <RoleGuard allow={['ADMIN']}>
          <div>Admin Only</div>
        </RoleGuard>
      );

      expect(
        screen.getByText(/bạn không có quyền truy cập khu vực này/i)
      ).toBeInTheDocument();
    });

    it('should show custom title when denied', () => {
      mockUseAuth.mockReturnValue({
        user: mockUser('STAFF'),
        loading: false,
        login: jest.fn(),
        register: jest.fn(),
        loginWithGoogle: jest.fn(),
        logout: jest.fn(),
        refreshUser: jest.fn(),
      } as any);

      render(
        <RoleGuard allow={['ADMIN']} title="Admin Access Required">
          <div>Admin Only</div>
        </RoleGuard>
      );

      expect(screen.getByText('Admin Access Required')).toBeInTheDocument();
    });

    it('should show custom message when denied', () => {
      mockUseAuth.mockReturnValue({
        user: mockUser('PARTICIPANT'),
        loading: false,
        login: jest.fn(),
        register: jest.fn(),
        loginWithGoogle: jest.fn(),
        logout: jest.fn(),
        refreshUser: jest.fn(),
      } as any);

      render(
        <RoleGuard
          allow={['ORGANIZER']}
          message="Only event organizers can access this page."
        >
          <div>Organizer Only</div>
        </RoleGuard>
      );

      expect(
        screen.getByText('Only event organizers can access this page.')
      ).toBeInTheDocument();
    });

    it('should show both custom title and message', () => {
      mockUseAuth.mockReturnValue({
        user: mockUser('PARTICIPANT'),
        loading: false,
        login: jest.fn(),
        register: jest.fn(),
        loginWithGoogle: jest.fn(),
        logout: jest.fn(),
        refreshUser: jest.fn(),
      } as any);

      render(
        <RoleGuard
          allow={['ADMIN']}
          title="Restricted Area"
          message="Contact support for access."
        >
          <div>Restricted</div>
        </RoleGuard>
      );

      expect(screen.getByText('Restricted Area')).toBeInTheDocument();
      expect(screen.getByText('Contact support for access.')).toBeInTheDocument();
    });
  });

  describe('unauthenticated access', () => {
    it('should show access denied for null user', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: false,
        login: jest.fn(),
        register: jest.fn(),
        loginWithGoogle: jest.fn(),
        logout: jest.fn(),
        refreshUser: jest.fn(),
      } as any);

      render(
        <RoleGuard allow={['PARTICIPANT']}>
          <div>Protected Content</div>
        </RoleGuard>
      );

      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
      expect(
        screen.getByText(/quyền truy cập bị từ chối/i)
      ).toBeInTheDocument();
    });

    it('should show default message for unauthenticated user', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: false,
        login: jest.fn(),
        register: jest.fn(),
        loginWithGoogle: jest.fn(),
        logout: jest.fn(),
        refreshUser: jest.fn(),
      } as any);

      render(
        <RoleGuard allow={['ADMIN']}>
          <div>Admin Only</div>
        </RoleGuard>
      );

      expect(
        screen.getByText(/bạn không có quyền truy cập khu vực này/i)
      ).toBeInTheDocument();
    });
  });

  describe('access denied screen', () => {
    it('should display shield icon on denied access', () => {
      mockUseAuth.mockReturnValue({
        user: mockUser('PARTICIPANT'),
        loading: false,
        login: jest.fn(),
        register: jest.fn(),
        loginWithGoogle: jest.fn(),
        logout: jest.fn(),
        refreshUser: jest.fn(),
      } as any);

      const { container } = render(
        <RoleGuard allow={['ADMIN']}>
          <div>Admin Only</div>
        </RoleGuard>
      );

      // Check for SVG element (lucide-react ShieldAlert)
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('should display back to home link', () => {
      mockUseAuth.mockReturnValue({
        user: mockUser('STAFF'),
        loading: false,
        login: jest.fn(),
        register: jest.fn(),
        loginWithGoogle: jest.fn(),
        logout: jest.fn(),
        refreshUser: jest.fn(),
      } as any);

      render(
        <RoleGuard allow={['ORGANIZER']}>
          <div>Organizer Only</div>
        </RoleGuard>
      );

      const homeLink = screen.getByRole('link', { name: /về trang chủ/i });
      expect(homeLink).toHaveAttribute('href', '/');
    });

    it('should be full-screen on denied access', () => {
      mockUseAuth.mockReturnValue({
        user: mockUser('PARTICIPANT'),
        loading: false,
        login: jest.fn(),
        register: jest.fn(),
        loginWithGoogle: jest.fn(),
        logout: jest.fn(),
        refreshUser: jest.fn(),
      } as any);

      const { container } = render(
        <RoleGuard allow={['ADMIN']}>
          <div>Admin Only</div>
        </RoleGuard>
      );

      const wrapper = container.firstChild;
      expect(wrapper).toHaveStyle({ height: 'height: 100dvh' });
    });
  });

  describe('multiple roles', () => {
    it('should allow access if user has any of multiple allowed roles', () => {
      mockUseAuth.mockReturnValue({
        user: mockUser('ORGANIZER'),
        loading: false,
        login: jest.fn(),
        register: jest.fn(),
        loginWithGoogle: jest.fn(),
        logout: jest.fn(),
        refreshUser: jest.fn(),
      } as any);

      render(
        <RoleGuard allow={['ADMIN', 'ORGANIZER', 'PARTICIPANT']}>
          <div>Multi-role Protected</div>
        </RoleGuard>
      );

      expect(screen.getByText('Multi-role Protected')).toBeInTheDocument();
    });

    it('should deny access if user not in multiple allowed roles', () => {
      mockUseAuth.mockReturnValue({
        user: mockUser('PARTICIPANT'),
        loading: false,
        login: jest.fn(),
        register: jest.fn(),
        loginWithGoogle: jest.fn(),
        logout: jest.fn(),
        refreshUser: jest.fn(),
      } as any);

      render(
        <RoleGuard allow={['ADMIN', 'ORGANIZER']}>
          <div>Restricted to Admins and Organizers</div>
        </RoleGuard>
      );

      expect(
        screen.queryByText('Restricted to Admins and Organizers')
      ).not.toBeInTheDocument();
      expect(
        screen.getByText(/quyền truy cập bị từ chối/i)
      ).toBeInTheDocument();
    });
  });

  describe('complex children', () => {
    it('should render complex nested children when allowed', () => {
      mockUseAuth.mockReturnValue({
        user: mockUser('ADMIN'),
        loading: false,
        login: jest.fn(),
        register: jest.fn(),
        loginWithGoogle: jest.fn(),
        logout: jest.fn(),
        refreshUser: jest.fn(),
      } as any);

      render(
        <RoleGuard allow={['ADMIN']}>
          <div>
            <h1>Dashboard</h1>
            <p>Welcome Admin</p>
            <button>Settings</button>
          </div>
        </RoleGuard>
      );

      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Welcome Admin')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Settings' })).toBeInTheDocument();
    });

    it('should not render complex children when denied', () => {
      mockUseAuth.mockReturnValue({
        user: mockUser('PARTICIPANT'),
        loading: false,
        login: jest.fn(),
        register: jest.fn(),
        loginWithGoogle: jest.fn(),
        logout: jest.fn(),
        refreshUser: jest.fn(),
      } as any);

      render(
        <RoleGuard allow={['ADMIN']}>
          <div>
            <h1>Admin Dashboard</h1>
            <button>Delete User</button>
          </div>
        </RoleGuard>
      );

      expect(screen.queryByText('Admin Dashboard')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Delete User' })).not.toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('should handle empty allow array (deny all)', () => {
      mockUseAuth.mockReturnValue({
        user: mockUser('ADMIN'),
        loading: false,
        login: jest.fn(),
        register: jest.fn(),
        loginWithGoogle: jest.fn(),
        logout: jest.fn(),
        refreshUser: jest.fn(),
      } as any);

      render(
        <RoleGuard allow={[]}>
          <div>Never Allowed</div>
        </RoleGuard>
      );

      expect(screen.queryByText('Never Allowed')).not.toBeInTheDocument();
      expect(
        screen.getByText(/quyền truy cập bị từ chối/i)
      ).toBeInTheDocument();
    });

    it('should maintain full-screen layout for both allowed and denied', () => {
      const { container: container1 } = render(
        <RoleGuard allow={['PARTICIPANT']}>
          <div>Content</div>
        </RoleGuard>
      );

      mockUseAuth.mockReturnValue({
        user: mockUser('ADMIN'),
        loading: false,
        login: jest.fn(),
        register: jest.fn(),
        loginWithGoogle: jest.fn(),
        logout: jest.fn(),
        refreshUser: jest.fn(),
      } as any);

      const { container: container2 } = render(
        <RoleGuard allow={['ADMIN']}>
          <div>Admin Content</div>
        </RoleGuard>
      );

      const wrapper1 = container1.firstChild;
      const wrapper2 = container2.firstChild;
      expect(wrapper1).toHaveStyle({ height: 'height: 100dvh' });
      expect(wrapper2).toHaveStyle({ height: 'height: 100dvh' });
    });

    it('should use default messages when not provided', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: false,
        login: jest.fn(),
        register: jest.fn(),
        loginWithGoogle: jest.fn(),
        logout: jest.fn(),
        refreshUser: jest.fn(),
      } as any);

      render(
        <RoleGuard allow={['ADMIN']}>
          <div>Protected</div>
        </RoleGuard>
      );

      expect(screen.getByText(/quyền truy cập bị từ chối/i)).toBeInTheDocument();
      expect(
        screen.getByText(/bạn không có quyền truy cập khu vực này/i)
      ).toBeInTheDocument();
    });
  });

  describe('state transitions', () => {
    it('should transition from loading to allowed content', async () => {
      const { rerender } = render(
        <RoleGuard allow={['PARTICIPANT']}>
          <div>Protected Content</div>
        </RoleGuard>
      );

      mockUseAuth.mockReturnValue({
        user: null,
        loading: true,
        login: jest.fn(),
        register: jest.fn(),
        loginWithGoogle: jest.fn(),
        logout: jest.fn(),
        refreshUser: jest.fn(),
      } as any);

      rerender(
        <RoleGuard allow={['PARTICIPANT']}>
          <div>Protected Content</div>
        </RoleGuard>
      );

      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();

      mockUseAuth.mockReturnValue({
        user: mockUser('PARTICIPANT'),
        loading: false,
        login: jest.fn(),
        register: jest.fn(),
        loginWithGoogle: jest.fn(),
        logout: jest.fn(),
        refreshUser: jest.fn(),
      } as any);

      rerender(
        <RoleGuard allow={['PARTICIPANT']}>
          <div>Protected Content</div>
        </RoleGuard>
      );

      await waitFor(() => {
        expect(screen.getByText('Protected Content')).toBeInTheDocument();
      });
    });

    it('should transition from loading to denied', async () => {
      const { rerender } = render(
        <RoleGuard allow={['ADMIN']}>
          <div>Admin Only</div>
        </RoleGuard>
      );

      mockUseAuth.mockReturnValue({
        user: null,
        loading: true,
        login: jest.fn(),
        register: jest.fn(),
        loginWithGoogle: jest.fn(),
        logout: jest.fn(),
        refreshUser: jest.fn(),
      } as any);

      rerender(
        <RoleGuard allow={['ADMIN']}>
          <div>Admin Only</div>
        </RoleGuard>
      );

      expect(screen.queryByText('Admin Only')).not.toBeInTheDocument();

      mockUseAuth.mockReturnValue({
        user: mockUser('PARTICIPANT'),
        loading: false,
        login: jest.fn(),
        register: jest.fn(),
        loginWithGoogle: jest.fn(),
        logout: jest.fn(),
        refreshUser: jest.fn(),
      } as any);

      rerender(
        <RoleGuard allow={['ADMIN']}>
          <div>Admin Only</div>
        </RoleGuard>
      );

      await waitFor(() => {
        expect(screen.queryByText('Admin Only')).not.toBeInTheDocument();
        expect(
          screen.getByText(/quyền truy cập bị từ chối/i)
        ).toBeInTheDocument();
      });
    });
  });
});
