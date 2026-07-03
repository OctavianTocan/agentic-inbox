-- Dedicated database for the api test suite. The tests truncate every table
-- between cases, so they must never touch the live `cogram` database.
SELECT 'CREATE DATABASE cogram_test OWNER cogram'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'cogram_test')\gexec
