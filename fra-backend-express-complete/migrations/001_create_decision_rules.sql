-- Migration: Create Decision Rules Table for DSS
-- Description: Creates the decision_rules table and supporting functions for the Decision Support System

CREATE TABLE IF NOT EXISTS decision_rules (
  id SERIAL PRIMARY KEY,
  rule_name TEXT NOT NULL,
  description TEXT,
  conditions JSONB NOT NULL,
  action TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  priority INTEGER DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_decision_rules_active ON decision_rules(is_active);
CREATE INDEX IF NOT EXISTS idx_decision_rules_priority ON decision_rules(priority);
CREATE INDEX IF NOT EXISTS idx_decision_rules_conditions ON decision_rules USING GIN(conditions);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION set_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS decision_rules_set_updated_at ON decision_rules;
CREATE TRIGGER decision_rules_set_updated_at
BEFORE UPDATE ON decision_rules
FOR EACH ROW
EXECUTE PROCEDURE set_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE decision_rules IS 'Decision rules for the Forest Rights Act Decision Support System';
COMMENT ON COLUMN decision_rules.rule_name IS 'Human-readable name for the decision rule';
COMMENT ON COLUMN decision_rules.description IS 'Detailed description of what the rule does';
COMMENT ON COLUMN decision_rules.conditions IS 'JSONB object containing the rule conditions and logic';
COMMENT ON COLUMN decision_rules.action IS 'Action to take when conditions are met';
COMMENT ON COLUMN decision_rules.is_active IS 'Whether the rule is currently active';
COMMENT ON COLUMN decision_rules.priority IS 'Rule priority (lower numbers = higher priority)';
COMMENT ON COLUMN decision_rules.created_at IS 'Timestamp when the rule was created';
COMMENT ON COLUMN decision_rules.updated_at IS 'Timestamp when the rule was last updated';
