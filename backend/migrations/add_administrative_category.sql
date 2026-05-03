-- Add Administrative category to existing database
-- Run this if your Categories table already exists and you want to add the new category

IF NOT EXISTS (SELECT 1 FROM Categories WHERE prefix = 'AD')
    INSERT INTO Categories (name, prefix, description) 
    VALUES ('Administrative', 'AD', 'Administrative maps');
