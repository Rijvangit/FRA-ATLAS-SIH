import express from 'express';
import { DecisionRulesService, RuleEvaluationResult } from '../services/decisionRulesService';

const router = express.Router();
const decisionRulesService = new DecisionRulesService();

/**
 * @swagger
 * /api/decision-rules:
 *   get:
 *     summary: Get all decision rules
 *     tags: [Decision Rules]
 *     parameters:
 *       - in: query
 *         name: active_only
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Return only active rules
 *     responses:
 *       200:
 *         description: List of decision rules
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 rules:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: number
 *                       rule_name:
 *                         type: string
 *                       description:
 *                         type: string
 *                       conditions:
 *                         type: object
 *                       action:
 *                         type: string
 *                       is_active:
 *                         type: boolean
 *                       priority:
 *                         type: number
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *                       updated_at:
 *                         type: string
 *                         format: date-time
 */
router.get('/', async (req, res) => {
  try {
    const activeOnly = req.query.active_only === 'true';
    const rules = activeOnly 
      ? await decisionRulesService.getActiveRules()
      : await decisionRulesService.getAllRules();
    
    res.json({ rules });
  } catch (error) {
    console.error('Error fetching decision rules:', error);
    res.status(500).json({ 
      error: 'Failed to fetch decision rules',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @swagger
 * /api/decision-rules/{id}:
 *   get:
 *     summary: Get a specific decision rule by ID
 *     tags: [Decision Rules]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Decision rule ID
 *     responses:
 *       200:
 *         description: Decision rule details
 *       404:
 *         description: Decision rule not found
 */
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid rule ID' });
    }

    const rule = await decisionRulesService.getRuleById(id);
    if (!rule) {
      return res.status(404).json({ error: 'Decision rule not found' });
    }

    res.json({ rule });
  } catch (error) {
    console.error('Error fetching decision rule:', error);
    res.status(500).json({ 
      error: 'Failed to fetch decision rule',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @swagger
 * /api/decision-rules:
 *   post:
 *     summary: Create a new decision rule
 *     tags: [Decision Rules]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - rule_name
 *               - conditions
 *               - action
 *             properties:
 *               rule_name:
 *                 type: string
 *                 description: Human-readable name for the rule
 *               description:
 *                 type: string
 *                 description: Detailed description of the rule
 *               conditions:
 *                 type: object
 *                 description: Rule conditions and logic
 *               action:
 *                 type: string
 *                 description: Action to take when conditions are met
 *               is_active:
 *                 type: boolean
 *                 default: true
 *               priority:
 *                 type: integer
 *                 default: 100
 *     responses:
 *       201:
 *         description: Decision rule created successfully
 *       400:
 *         description: Invalid input data
 */
router.post('/', async (req, res) => {
  try {
    const { rule_name, description, conditions, action, is_active = true, priority = 100 } = req.body;

    if (!rule_name || !conditions || !action) {
      return res.status(400).json({ 
        error: 'Missing required fields: rule_name, conditions, and action are required' 
      });
    }

    const rule = await decisionRulesService.createRule({
      rule_name,
      description,
      conditions,
      action,
      is_active,
      priority
    });

    res.status(201).json({ rule });
  } catch (error) {
    console.error('Error creating decision rule:', error);
    res.status(500).json({ 
      error: 'Failed to create decision rule',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @swagger
 * /api/decision-rules/{id}:
 *   put:
 *     summary: Update a decision rule
 *     tags: [Decision Rules]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Decision rule ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               rule_name:
 *                 type: string
 *               description:
 *                 type: string
 *               conditions:
 *                 type: object
 *               action:
 *                 type: string
 *               is_active:
 *                 type: boolean
 *               priority:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Decision rule updated successfully
 *       404:
 *         description: Decision rule not found
 */
router.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid rule ID' });
    }

    const rule = await decisionRulesService.updateRule(id, req.body);
    if (!rule) {
      return res.status(404).json({ error: 'Decision rule not found' });
    }

    res.json({ rule });
  } catch (error) {
    console.error('Error updating decision rule:', error);
    res.status(500).json({ 
      error: 'Failed to update decision rule',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @swagger
 * /api/decision-rules/{id}:
 *   delete:
 *     summary: Delete a decision rule
 *     tags: [Decision Rules]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Decision rule ID
 *     responses:
 *       200:
 *         description: Decision rule deleted successfully
 *       404:
 *         description: Decision rule not found
 */
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid rule ID' });
    }

    const deleted = await decisionRulesService.deleteRule(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Decision rule not found' });
    }

    res.json({ message: 'Decision rule deleted successfully' });
  } catch (error) {
    console.error('Error deleting decision rule:', error);
    res.status(500).json({ 
      error: 'Failed to delete decision rule',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @swagger
 * /api/decision-rules/evaluate:
 *   post:
 *     summary: Evaluate decision rules against given data
 *     tags: [Decision Rules]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Data to evaluate against decision rules
 *             example:
 *               claim_type: "individual"
 *               area_hectares: 3.5
 *               forest_type: "protected"
 *               has_land_survey: true
 *               has_village_certificate: false
 *               witnesses_count: 2
 *     responses:
 *       200:
 *         description: Rule evaluation results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 evaluation_results:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       rule_id:
 *                         type: number
 *                       rule_name:
 *                         type: string
 *                       matched:
 *                         type: boolean
 *                       action:
 *                         type: string
 *                       conditions_met:
 *                         type: array
 *                         items:
 *                           type: string
 *                       conditions_failed:
 *                         type: array
 *                         items:
 *                           type: string
 *                       evaluation_time:
 *                         type: number
 *                 recommendations:
 *                   type: object
 *                   properties:
 *                     actions:
 *                       type: array
 *                       items:
 *                         type: string
 *                     high_priority_actions:
 *                       type: array
 *                       items:
 *                         type: string
 *                     warnings:
 *                       type: array
 *                       items:
 *                         type: string
 */
router.post('/evaluate', async (req, res) => {
  try {
    const data = req.body;
    
    if (!data || typeof data !== 'object') {
      return res.status(400).json({ error: 'Invalid data provided for evaluation' });
    }

    const evaluationResults = await decisionRulesService.evaluateRules(data);
    const recommendations = decisionRulesService.getRecommendedActions(evaluationResults);

    res.json({
      evaluation_results: evaluationResults,
      recommendations
    });
  } catch (error) {
    console.error('Error evaluating decision rules:', error);
    res.status(500).json({ 
      error: 'Failed to evaluate decision rules',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @swagger
 * /api/decision-rules/sample:
 *   post:
 *     summary: Create sample FRA decision rules
 *     tags: [Decision Rules]
 *     responses:
 *       200:
 *         description: Sample rules created successfully
 */
router.post('/sample', async (req, res) => {
  try {
    await decisionRulesService.createSampleRules();
    res.json({ message: 'Sample decision rules created successfully' });
  } catch (error) {
    console.error('Error creating sample rules:', error);
    res.status(500).json({ 
      error: 'Failed to create sample rules',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
