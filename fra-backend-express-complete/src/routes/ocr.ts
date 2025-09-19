import express from 'express';
import { OCRService, OCRResult } from '../ocr/ocrService';
import { EnhancedOCRService } from '../ocr/enhancedOCRService';
import { pool } from '../db/pool';
import path from 'path';
import fs from 'fs';
import multer from 'multer';

// Extend Request interface to include file property
interface MulterRequest extends express.Request {
  file?: Express.Multer.File;
}

const router = express.Router();

// Initialize OCR services
const configPath = path.join(__dirname, '../ocr/config.json');
const hindiConfigPath = path.join(__dirname, '../ocr/enhanced-hindi-config.json');
const handwrittenConfigPath = path.join(__dirname, '../ocr/handwritten-config.json');
const outputDir = path.join(__dirname, '../../outputs');
const ocrService = new OCRService(configPath, outputDir);
const enhancedOCRService = new EnhancedOCRService(hindiConfigPath, outputDir);
const handwrittenOCRService = new EnhancedOCRService(handwrittenConfigPath, outputDir);

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req: any, file: any, cb: any) => {
    cb(null, outputDir);
  },
  filename: (req: any, file: any, cb: any) => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '');
    cb(null, `${timestamp}_${file.originalname}`);
  }
});

const upload = multer({ 
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req: any, file: any, cb: any) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Error handling middleware for multer
const handleMulterError = (err: any, req: any, res: any, next: any) => {
  if (err instanceof multer.MulterError) {
    console.error('Multer error:', err);
    return res.status(400).json({
      ok: false,
      error: 'File upload error',
      details: err.message
    });
  } else if (err) {
    console.error('Upload error:', err);
    return res.status(400).json({
      ok: false,
      error: 'Upload error',
      details: err.message
    });
  }
  next();
};

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

    // Use FRA-specific field extraction with enhanced Hindi support
    const fraConfig = OCRService.getFRAConfig();
    const fraOCRService = new EnhancedOCRService(
      path.join(__dirname, '../ocr/enhanced-hindi-config.json'), 
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

/**
 * @swagger
 * /api/ocr/process-image:
 *   post:
 *     summary: Process image file with enhanced OCR
 *     tags: [OCR]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Image file to process
 *     responses:
 *       200:
 *         description: Image processed successfully
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
 *                 confidence:
 *                   type: number
 *                 processing_time:
 *                   type: number
 *                 files:
 *                   type: object
 *                   properties:
 *                     rawFile:
 *                       type: string
 *                     fieldsFile:
 *                       type: string
 *       400:
 *         description: Bad request
 *       500:
 *         description: Internal server error
 */
router.post('/process-image', upload.single('image'), async (req: MulterRequest, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        ok: false, 
        error: 'No image file provided' 
      });
    }

    const { filename, path: filePath } = req.file;
    
    // Process image with enhanced OCR
    const result = await enhancedOCRService.processImageFile(filePath, filename);

    // Save to database
    const query = `
      INSERT INTO ocr_results (filename, raw_text, extracted_json) 
      VALUES ($1, $2, $3) 
      RETURNING id, created_at
    `;
    
    const values = [
      filename, 
      result.extracted, // This will be the raw text from OCR
      JSON.stringify(result.extracted)
    ];

    const dbResult = await pool.query(query, values);
    const { id, created_at } = dbResult.rows[0];

    res.json({
      ok: true,
      id,
      extracted: result.extracted,
      confidence: result.confidence,
      processing_time: result.processingTime,
      files: result.files,
      created_at
    });

  } catch (error) {
    console.error('Enhanced OCR processing error:', error);
    res.status(500).json({ 
      ok: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

/**
 * @swagger
 * /api/ocr/process-fra-image:
 *   post:
 *     summary: Process FRA document image with specialized field extraction
 *     tags: [OCR]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: FRA document image to process
 *     responses:
 *       200:
 *         description: FRA document processed successfully
 */
router.post('/process-fra-image', upload.single('image'), async (req: MulterRequest, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        ok: false, 
        error: 'No image file provided' 
      });
    }

    const { filename, path: filePath } = req.file;
    
    // Use FRA-specific configuration with enhanced Hindi support
    const fraConfigPath = path.join(__dirname, '../ocr/enhanced-hindi-config.json');
    const fraOCRService = new EnhancedOCRService(fraConfigPath, outputDir);

    // Process image with FRA-specific field extraction
    const result = await fraOCRService.processImageFile(filePath, filename);

    // Save to database with FRA-specific metadata
    const query = `
      INSERT INTO ocr_results (filename, raw_text, extracted_json) 
      VALUES ($1, $2, $3) 
      RETURNING id, created_at
    `;
    
    const values = [
      filename, 
      result.extracted, // This will be the raw text from OCR
      JSON.stringify(result.extracted)
    ];

    const dbResult = await pool.query(query, values);
    const { id, created_at } = dbResult.rows[0];

    res.json({
      ok: true,
      id,
      extracted: result.extracted,
      confidence: result.confidence,
      processing_time: result.processingTime,
      files: result.files,
      created_at,
      document_type: 'FRA_DOCUMENT'
    });

  } catch (error) {
    console.error('FRA image processing error:', error);
    res.status(500).json({ 
      ok: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

/**
 * @swagger
 * /api/ocr/health:
 *   get:
 *     summary: Check OCR service health
 *     tags: [OCR]
 *     responses:
 *       200:
 *         description: OCR service health status
 */
// Process handwritten document image
router.post('/process-handwritten', upload.single('image'), handleMulterError, async (req: MulterRequest, res: express.Response) => {
  try {
    console.log('Handwritten OCR request received');
    console.log('Content-Type:', req.headers['content-type']);
    console.log('File:', req.file);
    
    if (!req.file) {
      console.log('No file provided in request');
      return res.status(400).json({
        ok: false,
        error: 'No image file provided'
      });
    }

    const { filename, path: filePath } = req.file;
    
    // Process image with handwritten-specific settings
    const result = await handwrittenOCRService.processImageFile(filePath, filename);

    // Save to database
    const query = `
      INSERT INTO ocr_results (filename, raw_text, extracted_json, created_at)
      VALUES ($1, $2, $3, NOW())
      RETURNING id
    `;
    
    const values = [
      filename,
      result.rawText || '',
      JSON.stringify(result.extracted)
    ];

    const dbResult = await pool.query(query, values);
    const id = dbResult.rows[0].id;

    res.json({
      ok: true,
      id,
      filename,
      extracted: result.extracted,
      raw_text: result.rawText || '',
      confidence: result.confidence,
      processing_time: result.processingTime,
      document_type: 'handwritten_document',
      files: result.files
    });

  } catch (error) {
    console.error('Handwritten OCR processing error:', error);
    res.status(500).json({
      ok: false,
      error: 'Handwritten OCR processing failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.get('/health', async (req, res) => {
  try {
    // Test OCR service with a simple text
    const testResult = await enhancedOCRService.processOCR('test.txt', 'Test OCR processing');
    
    res.json({
      ok: true,
      status: 'healthy',
      service: 'Enhanced OCR Service',
      version: '2.0.0',
      features: [
        'Tesseract.js integration',
        'Image preprocessing',
        'Enhanced field extraction',
        'Confidence scoring',
        'Multiple pattern matching',
        'Handwritten text recognition',
        'Hindi and English support'
      ],
      test_result: {
        confidence: testResult.confidence,
        processing_time: testResult.processingTime
      }
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
