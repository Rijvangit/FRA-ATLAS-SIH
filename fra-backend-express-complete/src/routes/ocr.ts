import express from 'express';
import { OCRService, OCRResult } from '../ocr/ocrService';
import { pool } from '../db/pool';
import path from 'path';
import fs from 'fs';

const router = express.Router();

// Initialize OCR service
const configPath = path.join(__dirname, '../ocr/config.json');
const outputDir = path.join(__dirname, '../../outputs');
const ocrService = new OCRService(configPath, outputDir);

/**
 * @swagger
 * /api/ocr/save:
 *   post:
 *     summary: Process and save OCR data
 *     tags: [OCR]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               filename:
 *                 type: string
 *                 description: Name of the uploaded file
 *               raw_text:
 *                 type: string
 *                 description: Raw OCR extracted text
 *     responses:
 *       200:
 *         description: OCR data processed and saved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                 id:
 *                   type: number
 *                 extracted:
 *                   type: object
 *                 files:
 *                   type: object
 *                   properties:
 *                     rawFile:
 *                       type: string
 *                     fieldsFile:
 *                       type: string
 *       500:
 *         description: Internal server error
 */
router.post('/save', async (req, res) => {
  try {
    const { filename = 'upload.png', raw_text = '' } = req.body;

    if (!raw_text.trim()) {
      return res.status(400).json({ 
        ok: false, 
        error: 'No OCR text provided' 
      });
    }

    // Process OCR data
    const result = await ocrService.processOCR(filename, raw_text);

    // Save to database
    const query = `
      INSERT INTO ocr_results (filename, raw_text, extracted_json) 
      VALUES ($1, $2, $3) 
      RETURNING id, created_at
    `;
    
    const values = [
      filename, 
      raw_text, 
      JSON.stringify(result.extracted)
    ];

    const dbResult = await pool.query(query, values);
    const { id, created_at } = dbResult.rows[0];

    res.json({
      ok: true,
      id,
      extracted: result.extracted,
      files: result.files,
      created_at
    });

  } catch (error) {
    console.error('OCR save error:', error);
    res.status(500).json({ 
      ok: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

/**
 * @swagger
 * /api/ocr/results:
 *   get:
 *     summary: Get all OCR results
 *     tags: [OCR]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Maximum number of results to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of results to skip
 *     responses:
 *       200:
 *         description: List of OCR results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 results:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: number
 *                       filename:
 *                         type: string
 *                       raw_text:
 *                         type: string
 *                       extracted_json:
 *                         type: object
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *                 total:
 *                   type: number
 *                 limit:
 *                   type: number
 *                 offset:
 *                   type: number
 */
router.get('/results', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    // Get total count
    const countQuery = 'SELECT COUNT(*) FROM ocr_results';
    const countResult = await pool.query(countQuery);
    const total = parseInt(countResult.rows[0].count);

    // Get results
    const query = `
      SELECT id, filename, raw_text, extracted_json, created_at 
      FROM ocr_results 
      ORDER BY created_at DESC 
      LIMIT $1 OFFSET $2
    `;
    
    const result = await pool.query(query, [limit, offset]);
    
    res.json({
      results: result.rows,
      total,
      limit,
      offset
    });

  } catch (error) {
    console.error('OCR results error:', error);
    res.status(500).json({ 
      ok: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

/**
 * @swagger
 * /api/ocr/results/{id}:
 *   get:
 *     summary: Get specific OCR result by ID
 *     tags: [OCR]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: OCR result ID
 *     responses:
 *       200:
 *         description: OCR result details
 *       404:
 *         description: OCR result not found
 */
router.get('/results/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const query = `
      SELECT id, filename, raw_text, extracted_json, created_at 
      FROM ocr_results 
      WHERE id = $1
    `;
    
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        ok: false, 
        error: 'OCR result not found' 
      });
    }

    res.json({
      ok: true,
      result: result.rows[0]
    });

  } catch (error) {
    console.error('OCR result error:', error);
    res.status(500).json({ 
      ok: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

/**
 * @swagger
 * /api/ocr/process-fra-document:
 *   post:
 *     summary: Process FRA document with specialized field extraction
 *     tags: [OCR]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               filename:
 *                 type: string
 *                 description: Name of the FRA document
 *               raw_text:
 *                 type: string
 *                 description: Raw OCR extracted text from FRA document
 *     responses:
 *       200:
 *         description: FRA document processed successfully
 */
router.post('/process-fra-document', async (req, res) => {
  try {
    const { filename = 'fra_document.png', raw_text = '' } = req.body;

    if (!raw_text.trim()) {
      return res.status(400).json({ 
        ok: false, 
        error: 'No OCR text provided' 
      });
    }

    // Use FRA-specific field extraction
    const fraConfig = OCRService.getFRAConfig();
    const fraOCRService = new OCRService(
      path.join(__dirname, '../ocr/fra-config.json'), 
      outputDir
    );

    // Save FRA config if it doesn't exist
    const fraConfigPath = path.join(__dirname, '../ocr/fra-config.json');
    if (!fs.existsSync(fraConfigPath)) {
      fs.writeFileSync(fraConfigPath, JSON.stringify(fraConfig, null, 2));
    }

    const result = await fraOCRService.processOCR(filename, raw_text);

    // Save to database with FRA-specific metadata
    const query = `
      INSERT INTO ocr_results (filename, raw_text, extracted_json) 
      VALUES ($1, $2, $3) 
      RETURNING id, created_at
    `;
    
    const values = [
      filename, 
      raw_text, 
      JSON.stringify(result.extracted)
    ];

    const dbResult = await pool.query(query, values);
    const { id, created_at } = dbResult.rows[0];

    res.json({
      ok: true,
      id,
      extracted: result.extracted,
      files: result.files,
      created_at,
      document_type: 'FRA_DOCUMENT'
    });

  } catch (error) {
    console.error('FRA document processing error:', error);
    res.status(500).json({ 
      ok: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

export default router;
