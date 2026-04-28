-- Fix password hashes: set correct bcrypt hash for "123456"
-- Generated hash: bcrypt('123456', 10)

UPDATE employees SET password_hash = '$2b$10$kijS3yMFoq1z2nq8DuFA1.fsIasJUhSpyWjFTe0uXCWZlPvaQZPZe';
