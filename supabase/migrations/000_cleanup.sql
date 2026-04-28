-- Cleanup migration: drop tables with incomplete schemas from previous failed migrations

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS monthly_target_bonus CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS brand_deposits CASCADE;
DROP TABLE IF EXISTS dealer_deposits CASCADE;
DROP TABLE IF EXISTS dealers CASCADE;
DROP TABLE IF EXISTS brand_policies CASCADE;
DROP TABLE IF EXISTS social_media_posts CASCADE;
DROP TABLE IF EXISTS growth_fund CASCADE;
DROP TABLE IF EXISTS commissions CASCADE;
DROP TABLE IF EXISTS progress_logs CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS employees CASCADE;
DROP TABLE IF EXISTS departments CASCADE;

-- Drop types
DROP TYPE IF EXISTS brand_deposit_status CASCADE;
DROP TYPE IF EXISTS deposit_type CASCADE;
DROP TYPE IF EXISTS dealer_status CASCADE;
DROP TYPE IF EXISTS deposit_status CASCADE;
DROP TYPE IF EXISTS social_media_status CASCADE;
DROP TYPE IF EXISTS social_media_platform CASCADE;
DROP TYPE IF EXISTS growth_fund_category CASCADE;
DROP TYPE IF EXISTS commission_status CASCADE;
DROP TYPE IF EXISTS commission_type CASCADE;
DROP TYPE IF EXISTS customer_type CASCADE;
DROP TYPE IF EXISTS customer_stage CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;
