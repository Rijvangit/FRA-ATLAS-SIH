-- Add OCR results table to the database
-- This table stores OCR processing results with extracted field data

CREATE TABLE IF NOT EXISTS ocr_results (
    id SERIAL PRIMARY KEY,
    filename VARCHAR(255) NOT NULL,
    raw_text TEXT NOT NULL,
    extracted_json JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_ocr_results_filename ON ocr_results(filename);
CREATE INDEX IF NOT EXISTS idx_ocr_results_created_at ON ocr_results(created_at);
CREATE INDEX IF NOT EXISTS idx_ocr_results_extracted_json ON ocr_results USING GIN(extracted_json);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_ocr_results_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_ocr_results_updated_at
    BEFORE UPDATE ON ocr_results
    FOR EACH ROW
    EXECUTE FUNCTION update_ocr_results_updated_at();

-- Add comments for documentation
COMMENT ON TABLE ocr_results IS 'Stores OCR processing results with extracted field data';
COMMENT ON COLUMN ocr_results.filename IS 'Original filename of the processed document';
COMMENT ON COLUMN ocr_results.raw_text IS 'Raw text extracted by OCR';
COMMENT ON COLUMN ocr_results.extracted_json IS 'Structured data extracted using regex patterns';
COMMENT ON COLUMN ocr_results.created_at IS 'Timestamp when the record was created';
COMMENT ON COLUMN ocr_results.updated_at IS 'Timestamp when the record was last updated';
