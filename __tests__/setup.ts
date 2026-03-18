// Global test setup — runs before every test file
// Must set JWT env vars before lib/auth.ts is imported (module-level guards throw if unset)
process.env.JWT_SECRET = 'test-secret-key-for-unit-tests-at-least-32-chars'
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key-for-unit-tests-at-least-32-chars'
process.env.NODE_ENV = 'test'
