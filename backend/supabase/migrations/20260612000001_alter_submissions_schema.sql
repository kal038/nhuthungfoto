-- Rename columns for clarity
ALTER TABLE submissions RENAME COLUMN original_photo_url TO original_photo_key;
ALTER TABLE submissions RENAME COLUMN processed_photo_url TO processed_photo_key;

-- Make original_photo_key non-nullable (safe — no existing NULLs)
ALTER TABLE submissions ALTER COLUMN original_photo_key SET NOT NULL;



