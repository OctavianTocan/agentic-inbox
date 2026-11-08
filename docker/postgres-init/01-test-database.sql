-- Dedicated database for the api test suite. The tests truncate every table
-- between cases, so they must never touch the live `agentic_inbox` database.
SELECT 'CREATE DATABASE agentic_inbox_test OWNER agentic_inbox'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'agentic_inbox_test')\gexec
