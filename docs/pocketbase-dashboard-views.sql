-- Dashboard SQL Views for PocketBase
-- Run these in PocketBase Admin → Settings → SQL Executor
--
-- PocketBase View Rules:
-- 1. No wildcard (*) columns - must explicitly list columns
-- 2. Must have a unique 'id' column - use (ROW_NUMBER() OVER()) as id if needed
-- 3. Expressions must be aliased with valid field names (camelCase or snake_case)
-- 4. Combined expressions must be wrapped in parenthesis

-- ============================================
-- View 1: Provider Statistics Summary
-- ============================================
CREATE VIEW IF NOT EXISTS v_provider_stats AS
SELECT
    (ROW_NUMBER() OVER()) as id,
    provider,
    COUNT(id) as total_evaluations,
    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as successful,
    SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
    (ROUND(100.0 * SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) / COUNT(id), 2)) as success_rate,
    (ROUND(AVG(CASE WHEN status = 'completed' THEN duration_ms ELSE NULL END), 0)) as avg_duration_ms,
    MIN(created) as first_evaluation,
    MAX(created) as last_evaluation
FROM ai_results
GROUP BY provider;

-- ============================================
-- View 2: Daily Evaluation Trends
-- ============================================
CREATE VIEW IF NOT EXISTS v_daily_trends AS
SELECT
    (ROW_NUMBER() OVER()) as id,
    DATE(e.created) as eval_date,
    COUNT(DISTINCT e.id) as evaluation_count,
    COUNT(ar.id) as total_ai_results,
    SUM(CASE WHEN ar.status = 'completed' THEN 1 ELSE 0 END) as successful_results,
    (ROUND(100.0 * SUM(CASE WHEN ar.status = 'completed' THEN 1 ELSE 0 END) / NULLIF(COUNT(ar.id), 0), 2)) as success_rate,
    (ROUND(AVG(CASE WHEN ar.status = 'completed' THEN ar.duration_ms ELSE NULL END), 0)) as avg_duration_ms
FROM evaluations e
LEFT JOIN ai_results ar ON ar.evaluation = e.id
GROUP BY DATE(e.created)
ORDER BY eval_date DESC;

-- ============================================
-- View 3: Provider Daily Performance
-- ============================================
CREATE VIEW IF NOT EXISTS v_provider_daily AS
SELECT
    (ROW_NUMBER() OVER()) as id,
    DATE(created) as eval_date,
    provider,
    COUNT(id) as total,
    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as successful,
    (ROUND(100.0 * SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) / COUNT(id), 2)) as success_rate,
    (ROUND(AVG(CASE WHEN status = 'completed' THEN duration_ms ELSE NULL END), 0)) as avg_duration_ms
FROM ai_results
GROUP BY DATE(created), provider
ORDER BY eval_date DESC, provider;

-- ============================================
-- View 4: Field Recognition Rates
-- ============================================
CREATE VIEW IF NOT EXISTS v_field_recognition AS
SELECT
    (ROW_NUMBER() OVER()) as id,
    provider,
    COUNT(id) as total_completed,
    SUM(CASE WHEN json_extract(extracted_data, '$.product_name') IS NOT NULL
        AND json_extract(extracted_data, '$.product_name') != '' THEN 1 ELSE 0 END) as has_product_name,
    SUM(CASE WHEN json_extract(extracted_data, '$.brand') IS NOT NULL
        AND json_extract(extracted_data, '$.brand') != '' THEN 1 ELSE 0 END) as has_brand,
    SUM(CASE WHEN json_extract(extracted_data, '$.manufacturer') IS NOT NULL
        AND json_extract(extracted_data, '$.manufacturer') != '' THEN 1 ELSE 0 END) as has_manufacturer,
    SUM(CASE WHEN json_extract(extracted_data, '$.formulation_type') IS NOT NULL
        AND json_extract(extracted_data, '$.formulation_type') != '' THEN 1 ELSE 0 END) as has_formulation_type,
    SUM(CASE WHEN json_extract(extracted_data, '$.cannabis_info') IS NOT NULL THEN 1 ELSE 0 END) as has_cannabis_info,
    SUM(CASE WHEN json_extract(extracted_data, '$.cannabis_facts') IS NOT NULL THEN 1 ELSE 0 END) as has_cannabis_facts,
    SUM(CASE WHEN json_extract(extracted_data, '$.drug_facts') IS NOT NULL THEN 1 ELSE 0 END) as has_drug_facts,
    SUM(CASE WHEN json_extract(extracted_data, '$.supplement_facts') IS NOT NULL THEN 1 ELSE 0 END) as has_supplement_facts
FROM ai_results
WHERE status = 'completed' AND extracted_data IS NOT NULL
GROUP BY provider;

-- ============================================
-- View 5: Evaluation Summary with Provider Count
-- ============================================
CREATE VIEW IF NOT EXISTS v_evaluation_summary AS
SELECT
    e.id as id,
    e.product_name as product_name,
    e.status as eval_status,
    e.total_duration_ms as total_duration_ms,
    e.created as created,
    COUNT(ar.id) as provider_count,
    SUM(CASE WHEN ar.status = 'completed' THEN 1 ELSE 0 END) as providers_completed,
    SUM(CASE WHEN ar.status = 'failed' THEN 1 ELSE 0 END) as providers_failed,
    GROUP_CONCAT(CASE WHEN ar.status = 'completed' THEN ar.provider ELSE NULL END) as successful_providers
FROM evaluations e
LEFT JOIN ai_results ar ON ar.evaluation = e.id
GROUP BY e.id
ORDER BY e.created DESC;

-- ============================================
-- View 6: Field Value Comparison (for Consensus)
-- ============================================
CREATE VIEW IF NOT EXISTS v_field_values AS
SELECT
    ar.id as id,
    ar.evaluation as evaluation,
    ar.provider as provider,
    ar.status as status,
    ar.created as created,
    LOWER(TRIM(json_extract(ar.extracted_data, '$.product_name'))) as product_name_normalized,
    LOWER(TRIM(json_extract(ar.extracted_data, '$.brand'))) as brand_normalized,
    LOWER(TRIM(json_extract(ar.extracted_data, '$.manufacturer'))) as manufacturer_normalized,
    json_extract(ar.extracted_data, '$.formulation_type') as formulation_type,
    json_extract(ar.extracted_data, '$.cannabis_info.thc_content') as thc_content,
    json_extract(ar.extracted_data, '$.cannabis_info.cbd_content') as cbd_content,
    json_extract(ar.extracted_data, '$.cannabis_info.strain_name') as strain_name,
    json_extract(ar.extracted_data, '$.cannabis_info.product_type') as cannabis_product_type
FROM ai_results ar
WHERE ar.status = 'completed';

-- ============================================
-- Verify views were created
-- ============================================
-- Run these to test:
-- SELECT id, provider, total_evaluations, success_rate FROM v_provider_stats;
-- SELECT id, eval_date, evaluation_count, success_rate FROM v_daily_trends LIMIT 10;
-- SELECT id, provider, total_completed, has_product_name, has_cannabis_info FROM v_field_recognition;
-- SELECT id, product_name, eval_status, providers_completed FROM v_evaluation_summary LIMIT 10;
-- SELECT id, evaluation, provider, product_name_normalized FROM v_field_values LIMIT 10;
