INSERT INTO decision_rules (rule_name, description, conditions, action, priority)
VALUES
(
  'Agriculture_ST_under_4ha',
  'ST claimant with agriculture land below or equal to 4 ha → Approve IFR',
  '{
    "all": [
      {"field":"land_use","op":"eq","value":"agriculture"},
      {"field":"claimant_category","op":"eq","value":"ST"},
      {"field":"area_ha","op":"lte","value":4}
    ]
  }',
  'approve_ifr',
  10
),
(
  'CFR_overlap_protected_area',
  'If CFR overlaps with a Protected Area → Escalate to committee',
  '{
    "any": [
      {"field":"overlap_PA","op":"eq","value":true}
    ]
  }',
  'escalate_to_committee',
  20
);
