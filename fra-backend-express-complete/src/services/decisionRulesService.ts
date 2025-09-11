import { pool } from '../db/pool';

export interface DecisionRule {
  id?: number;
  rule_name: string;
  description?: string;
  conditions: Record<string, any>;
  action: string;
  is_active: boolean;
  priority: number;
  created_at?: Date;
  updated_at?: Date;
}

export interface RuleCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'not_contains' | 'in' | 'not_in';
  value: any;
}

export interface RuleEvaluationResult {
  rule_id: number;
  rule_name: string;
  matched: boolean;
  action: string;
  conditions_met: string[];
  conditions_failed: string[];
  evaluation_time: number;
}

export class DecisionRulesService {
  /**
   * Get all decision rules
   */
  async getAllRules(): Promise<DecisionRule[]> {
    const query = `
      SELECT id, rule_name, description, conditions, action, is_active, priority, created_at, updated_at
      FROM decision_rules
      ORDER BY priority ASC, created_at DESC
    `;
    
    const result = await pool.query(query);
    return result.rows.map((row: any) => ({
      ...row,
      conditions: typeof row.conditions === 'string' ? JSON.parse(row.conditions) : row.conditions
    }));
  }

  /**
   * Get active decision rules only
   */
  async getActiveRules(): Promise<DecisionRule[]> {
    const query = `
      SELECT id, rule_name, description, conditions, action, is_active, priority, created_at, updated_at
      FROM decision_rules
      WHERE is_active = true
      ORDER BY priority ASC, created_at DESC
    `;
    
    const result = await pool.query(query);
    return result.rows.map((row: any) => ({
      ...row,
      conditions: typeof row.conditions === 'string' ? JSON.parse(row.conditions) : row.conditions
    }));
  }

  /**
   * Get a specific decision rule by ID
   */
  async getRuleById(id: number): Promise<DecisionRule | null> {
    const query = `
      SELECT id, rule_name, description, conditions, action, is_active, priority, created_at, updated_at
      FROM decision_rules
      WHERE id = $1
    `;
    
    const result = await pool.query(query, [id]);
    if (!result.rows[0]) return null;
    const row: any = result.rows[0];
    return {
      ...row,
      conditions: typeof row.conditions === 'string' ? JSON.parse(row.conditions) : row.conditions
    };
  }

  /**
   * Create a new decision rule
   */
  async createRule(rule: Omit<DecisionRule, 'id' | 'created_at' | 'updated_at'>): Promise<DecisionRule> {
    const query = `
      INSERT INTO decision_rules (rule_name, description, conditions, action, is_active, priority)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, rule_name, description, conditions, action, is_active, priority, created_at, updated_at
    `;
    
    const values = [
      rule.rule_name,
      rule.description,
      JSON.stringify(rule.conditions),
      rule.action,
      rule.is_active,
      rule.priority
    ];
    
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Update an existing decision rule
   */
  async updateRule(id: number, rule: Partial<Omit<DecisionRule, 'id' | 'created_at' | 'updated_at'>>): Promise<DecisionRule | null> {
    const fields = [];
    const values = [];
    let paramCount = 1;

    if (rule.rule_name !== undefined) {
      fields.push(`rule_name = $${paramCount++}`);
      values.push(rule.rule_name);
    }
    if (rule.description !== undefined) {
      fields.push(`description = $${paramCount++}`);
      values.push(rule.description);
    }
    if (rule.conditions !== undefined) {
      fields.push(`conditions = $${paramCount++}`);
      values.push(JSON.stringify(rule.conditions));
    }
    if (rule.action !== undefined) {
      fields.push(`action = $${paramCount++}`);
      values.push(rule.action);
    }
    if (rule.is_active !== undefined) {
      fields.push(`is_active = $${paramCount++}`);
      values.push(rule.is_active);
    }
    if (rule.priority !== undefined) {
      fields.push(`priority = $${paramCount++}`);
      values.push(rule.priority);
    }

    if (fields.length === 0) {
      return this.getRuleById(id);
    }

    values.push(id);
    const query = `
      UPDATE decision_rules
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, rule_name, description, conditions, action, is_active, priority, created_at, updated_at
    `;
    
    const result = await pool.query(query, values);
    return result.rows[0] || null;
  }

  /**
   * Delete a decision rule
   */
  async deleteRule(id: number): Promise<boolean> {
    const query = 'DELETE FROM decision_rules WHERE id = $1';
    const result = await pool.query(query, [id]);
    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Evaluate a single condition
   */
  private evaluateCondition(condition: RuleCondition, data: Record<string, any>): boolean {
    const { field, operator, value } = condition;
    const fieldValue = data[field];

    if (fieldValue === undefined || fieldValue === null) {
      return false;
    }

    switch (operator) {
      case 'equals':
        return fieldValue === value;
      case 'not_equals':
        return fieldValue !== value;
      case 'greater_than':
        return Number(fieldValue) > Number(value);
      case 'less_than':
        return Number(fieldValue) < Number(value);
      case 'contains':
        return String(fieldValue).toLowerCase().includes(String(value).toLowerCase());
      case 'not_contains':
        return !String(fieldValue).toLowerCase().includes(String(value).toLowerCase());
      case 'in':
        return Array.isArray(value) && value.includes(fieldValue);
      case 'not_in':
        return Array.isArray(value) && !value.includes(fieldValue);
      default:
        return false;
    }
  }

  /**
   * Evaluate all conditions for a rule
   */
  private evaluateRuleConditions(conditions: Record<string, any>, data: Record<string, any>): {
    matched: boolean;
    conditions_met: string[];
    conditions_failed: string[];
  } {
    const conditions_met: string[] = [];
    const conditions_failed: string[] = [];
    let matched = true;

    // Handle different condition structures
    if (conditions.and && Array.isArray(conditions.and)) {
      // AND logic - all conditions must be true
      for (const condition of conditions.and) {
        const conditionResult = this.evaluateCondition(condition, data);
        if (conditionResult) {
          conditions_met.push(`${condition.field} ${condition.operator} ${condition.value}`);
        } else {
          conditions_failed.push(`${condition.field} ${condition.operator} ${condition.value}`);
          matched = false;
        }
      }
    } else if (conditions.or && Array.isArray(conditions.or)) {
      // OR logic - at least one condition must be true
      matched = false;
      for (const condition of conditions.or) {
        const conditionResult = this.evaluateCondition(condition, data);
        if (conditionResult) {
          conditions_met.push(`${condition.field} ${condition.operator} ${condition.value}`);
          matched = true;
        } else {
          conditions_failed.push(`${condition.field} ${condition.operator} ${condition.value}`);
        }
      }
    } else {
      // Single condition - check if it has the required properties
      if (conditions.field && conditions.operator && conditions.value !== undefined) {
        const conditionResult = this.evaluateCondition(conditions as RuleCondition, data);
        if (conditionResult) {
          conditions_met.push(`${conditions.field} ${conditions.operator} ${conditions.value}`);
        } else {
          conditions_failed.push(`${conditions.field} ${conditions.operator} ${conditions.value}`);
          matched = false;
        }
      } else {
        conditions_failed.push('Invalid condition format');
        matched = false;
      }
    }

    return { matched, conditions_met, conditions_failed };
  }

  /**
   * Evaluate decision rules against given data
   */
  async evaluateRules(data: Record<string, any>): Promise<RuleEvaluationResult[]> {
    const startTime = Date.now();
    const rules = await this.getActiveRules();
    const results: RuleEvaluationResult[] = [];

    for (const rule of rules) {
      const ruleStartTime = Date.now();
      const evaluation = this.evaluateRuleConditions(rule.conditions, data);
      
      results.push({
        rule_id: rule.id!,
        rule_name: rule.rule_name,
        matched: evaluation.matched,
        action: rule.action,
        conditions_met: evaluation.conditions_met,
        conditions_failed: evaluation.conditions_failed,
        evaluation_time: Date.now() - ruleStartTime
      });
    }

    return results.sort((a, b) => a.rule_id - b.rule_id);
  }

  /**
   * Get recommended actions based on evaluation results
   */
  getRecommendedActions(evaluationResults: RuleEvaluationResult[]): {
    actions: string[];
    high_priority_actions: string[];
    warnings: string[];
  } {
    const actions: string[] = [];
    const high_priority_actions: string[] = [];
    const warnings: string[] = [];

    for (const result of evaluationResults) {
      if (result.matched) {
        if (result.action.toLowerCase().includes('urgent') || result.action.toLowerCase().includes('critical')) {
          high_priority_actions.push(result.action);
        } else {
          actions.push(result.action);
        }
      } else if (result.conditions_failed.length > 0) {
        warnings.push(`Rule "${result.rule_name}" conditions not met: ${result.conditions_failed.join(', ')}`);
      }
    }

    return { actions, high_priority_actions, warnings };
  }

  /**
   * Create sample FRA decision rules
   */
  async createSampleRules(): Promise<void> {
    const sampleRules = [
      {
        rule_name: 'High Risk Area Alert',
        description: 'Alert when claim is in high-risk forest area',
        conditions: {
          and: [
            { field: 'forest_type', operator: 'equals', value: 'protected' },
            { field: 'area_hectares', operator: 'greater_than', value: 5 }
          ]
        },
        action: 'URGENT: Review claim in protected forest area - requires special approval',
        is_active: true,
        priority: 10
      },
      {
        rule_name: 'Community Claim Validation',
        description: 'Validate community claims have proper documentation',
        conditions: {
          and: [
            { field: 'claim_type', operator: 'equals', value: 'community' },
            { field: 'witnesses_count', operator: 'less_than', value: 3 }
          ]
        },
        action: 'Request additional witnesses for community claim validation',
        is_active: true,
        priority: 20
      },
      {
        rule_name: 'Area Size Check',
        description: 'Check if claimed area is within reasonable limits',
        conditions: {
          field: 'area_hectares',
          operator: 'greater_than',
          value: 10
        },
        action: 'Verify land survey and boundaries - area exceeds 10 hectares',
        is_active: true,
        priority: 30
      },
      {
        rule_name: 'Documentation Completeness',
        description: 'Check if all required documents are present',
        conditions: {
          and: [
            { field: 'has_land_survey', operator: 'equals', value: false },
            { field: 'has_village_certificate', operator: 'equals', value: false }
          ]
        },
        action: 'Request missing documentation: land survey and village certificate required',
        is_active: true,
        priority: 40
      }
    ];

    for (const rule of sampleRules) {
      try {
        await this.createRule(rule);
      } catch (error) {
        console.log(`Sample rule "${rule.rule_name}" may already exist`);
      }
    }
  }
}
