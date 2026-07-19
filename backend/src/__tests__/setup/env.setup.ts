/**
 * Runs before the test framework is installed (jest `setupFiles`).
 *
 * Pins every environment-derived value the app reads at import time, so tests
 * never depend on a developer's local `.env` and never reach a real SMTP /
 * Google / VNPAY endpoint.
 */
process.env.NODE_ENV = 'test';
// dotenv v17 prints a tip banner on load; keep the runner output clean.
process.env.DOTENV_CONFIG_QUIET = 'true';
process.env.JWT_SECRET = 'test_jwt_secret_for_event_management_suite';
process.env.JWT_EXPIRES_IN = '1h';
process.env.FRONTEND_URL = 'http://localhost:3000';

// Deterministic VNPAY credentials — the signature tests assert exact hashes.
process.env.VNPAY_TMN_CODE = 'TESTTMN01';
process.env.VNPAY_HASH_SECRET = 'TESTHASHSECRET0123456789';
process.env.VNPAY_URL = 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
process.env.VNPAY_RETURN_URL = 'http://localhost:5000/api/payments/vnpay/return';

// Empty credentials keep the mail/Google/Groq clients in their inert branch.
process.env.SMTP_USER = '';
process.env.SMTP_PASS = '';
process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';
process.env.GROQ_API_KEY = '';
