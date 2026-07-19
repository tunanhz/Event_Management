/**
 * Shared seeding helpers for integration suites that need an authenticated
 * caller. Users are written through the real Mongoose model so the password
 * pre-save hook runs and `comparePassword` behaves exactly as in production.
 */
import { User, IUser } from '../../modules/user/user.model';
import { generateToken } from '../../common/utils/jwt';

export type UserRole = 'ADMIN' | 'ORGANIZER' | 'PARTICIPANT' | 'STAFF';

export interface SeededUser {
  user: IUser;
  id: string;
  /** Raw JWT — use as `Authorization: Bearer ${token}`. */
  token: string;
  /** Ready-made cookie header value — use as `.set('Cookie', cookie)`. */
  cookie: string;
  /** The pre-hash password, so login flows can be exercised. */
  password: string;
}

let emailCounter = 0;

/** Unique address per call so a suite can seed many users without collisions. */
export function uniqueEmail(prefix = 'user'): string {
  emailCounter += 1;
  return `${prefix}.${emailCounter}.${Date.now()}@example.com`;
}

/** Persist a user (password hashed by the model hook). */
export async function createTestUser(
  overrides: Partial<Record<keyof IUser, unknown>> & { password?: string } = {}
): Promise<{ user: IUser; password: string }> {
  const { password = 'Password@123', ...rest } = overrides as any;
  const user = await User.create({
    fullName: 'Test User',
    email: uniqueEmail(),
    passwordHash: password, // hashed by the pre-save hook
    role: 'PARTICIPANT',
    accountStatus: 'ACTIVE',
    ...rest,
  });
  return { user, password };
}

/** Persist a user of the given role and return its credentials. */
export async function createAuthedUser(
  role: UserRole = 'PARTICIPANT',
  overrides: Record<string, unknown> = {}
): Promise<SeededUser> {
  const { user, password } = await createTestUser({ role, ...overrides });
  const id = String(user._id);
  const token = generateToken({ id, email: user.email, role: user.role });
  return { user, id, token, cookie: `token=${token}`, password };
}

/** A syntactically valid JWT signed for a user id that no longer exists. */
export function tokenForMissingUser(id = '000000000000000000000000'): string {
  return generateToken({ id, email: 'ghost@example.com', role: 'PARTICIPANT' });
}
