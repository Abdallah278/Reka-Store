// Runs before every test file. Establish a deterministic, isolated environment.
process.env.NODE_ENV = "test";
process.env.OWNER_OPEN_IDS = "owner-open-id";
process.env.OWNER_OPEN_ID = "";
process.env.JWT_SECRET = "test-secret-test-secret-test-secret";
process.env.VITE_APP_ID = "reka-test-app";
process.env.ADMIN_HOSTNAME = "";
process.env.MAX_UPLOAD_BYTES = String(64 * 1024); // 64 KB keeps oversize fixtures small
delete process.env.DATABASE_URL; // tests must never reach a real database
