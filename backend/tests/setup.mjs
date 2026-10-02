process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  'postgresql://postgres:postgres@localhost:5432/inventory_db_test?schema=public';
process.env.JWT_SECRET = 'test-secret';
process.env.NODE_ENV = 'test';
