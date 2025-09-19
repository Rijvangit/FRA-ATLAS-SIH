import fs from 'fs';
import path from 'path';
import * as mkdirp from 'mkdirp';
import Tesseract from 'tesseract.js';
import sharp from 'sharp';

export interface OCRField {
  name: string;
  pattern: string;
  confidence?: number;
  alternatives?: string[];
}

export interface OCRConfig {
  fields: OCRField[];
  preprocessing?: {
    enabled: boolean;
    denoise: boolean;
    contrast: number;
    brightness: number;
    sharpen: boolean;
  };
  tesseract?: {
    language: string;
    oem: number;
    psm: number;
  };
}

export interface OCRExtractedData {
  [key: string]: string | null;
}

export interface OCRResult {
  id?: number;
  filename: string;
  raw_text: string;
  extracted_json: OCRExtractedData;
  confidence: number;
  processing_time: number;
  created_at?: Date;
}

export interface ImagePreprocessingOptions {
  denoise?: boolean;
  contrast?: number;
  brightness?: number;
  sharpen?: boolean;
  resize?: { width?: number; height?: number };
  isHandwritten?: boolean;
}

export class EnhancedOCRService {
  private config: OCRConfig;
  private outputDir: string;

  constructor(configPath: string, outputDir: string) {
    try {
      this.config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch (error) {
      console.warn(`Config file not found at ${configPath}, using default FRA config`);
      this.config = EnhancedOCRService.getDefaultConfig();
    }
    this.outputDir = outputDir;
    mkdirp.sync(this.outputDir);
  }

  /**
   * Preprocess image to improve OCR accuracy, especially for handwritten and Hindi text
   */
  private async preprocessImage(imageBuffer: Buffer, options: ImagePreprocessingOptions = {}): Promise<Buffer> {
    const {
      denoise = true,
      contrast = 1.6, // Increased for better handwritten text recognition
      brightness = 1.4, // Increased for better handwritten text recognition
      sharpen = true,
      resize,
      isHandwritten = false // New option for handwritten text
    } = options;

    let pipeline = sharp(imageBuffer);

    // Convert to grayscale for better OCR
    pipeline = pipeline.grayscale();

    // Resize if specified - use higher resolution for better text recognition
    if (resize) {
      pipeline = pipeline.resize(resize.width, resize.height, {
        fit: 'inside',
        withoutEnlargement: false, // Allow enlargement for better recognition
        kernel: sharp.kernel.lanczos3 // Better quality for text
      });
    } else {
      // Auto-resize for better text recognition
      const metadata = await sharp(imageBuffer).metadata();
      const minWidth = isHandwritten ? 1500 : 1200; // Higher resolution for handwritten text
      if (metadata.width && metadata.width < minWidth) {
        pipeline = pipeline.resize(minWidth, null, {
          fit: 'inside',
          withoutEnlargement: false,
          kernel: sharp.kernel.lanczos3
        });
      }
    }

    // Apply contrast and brightness with handwritten text adjustments
    pipeline = pipeline.modulate({
      brightness,
      saturation: contrast,
      hue: 0 // Keep original hue
    });

    // Apply gamma correction for better text visibility
    pipeline = pipeline.gamma(isHandwritten ? 1.3 : 1.2); // Higher gamma for handwritten text

    // Apply sharpening with handwritten text specific settings
    if (sharpen) {
      if (isHandwritten) {
        // More aggressive sharpening for handwritten text
        pipeline = pipeline.sharpen(1.2, 1.2, 2.5);
      } else {
        pipeline = pipeline.sharpen(1.0, 1.0, 2.0);
      }
    }

    // Apply denoising with handwritten text specific settings
    if (denoise) {
      if (isHandwritten) {
        // Less aggressive denoising for handwritten text to preserve character details
        pipeline = pipeline.median(1);
      } else {
        pipeline = pipeline.median(2);
      }
    }

    // Apply additional contrast enhancement
    pipeline = pipeline.linear(isHandwritten ? 1.2 : 1.1, -(128 * (isHandwritten ? 0.15 : 0.1)));

    // Apply unsharp mask for better text clarity
    if (isHandwritten) {
      // More aggressive unsharp mask for handwritten text
      pipeline = pipeline.convolve({
        width: 3,
        height: 3,
        kernel: [-1, -1, -1, -1, 10, -1, -1, -1, -1]
      });
    } else {
      pipeline = pipeline.convolve({
        width: 3,
        height: 3,
        kernel: [-1, -1, -1, -1, 9, -1, -1, -1, -1]
      });
    }

    // Additional handwritten text enhancements
    if (isHandwritten) {
      // Apply additional edge enhancement for handwritten text
      pipeline = pipeline.convolve({
        width: 3,
        height: 3,
        kernel: [0, -1, 0, -1, 5, -1, 0, -1, 0]
      });
    }

    return await pipeline.png().toBuffer();
  }

  /**
   * Perform OCR on image with Tesseract.js supporting handwritten, Hindi and English text
   */
  private async performOCR(imageBuffer: Buffer, options: any = {}): Promise<{
    text: string;
    confidence: number;
    processingTime: number;
  }> {
    const startTime = Date.now();
    const isHandwritten = options.isHandwritten || false;
    
    const tesseractOptions = {
      logger: (m: any) => {
        if (m.status === 'recognizing text') {
          console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
        }
      },
      // Enhanced options for better text recognition
      oem: 1, // LSTM OCR Engine Mode
      psm: isHandwritten ? 8 : 6, // Single word for handwritten, single block for printed
      tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,-/:()[]{}"\'!@#$%^&*+=<>?|\\~` \u0900-\u097F',
      preserve_interword_spaces: '1',
      // Additional options for handwritten text
      ...(isHandwritten && {
        tessedit_pageseg_mode: '8', // Single word
        tessedit_ocr_engine_mode: '1', // LSTM only
        classify_bln_numeric_mode: '1', // Numeric mode
        textord_min_linesize: '2.5', // Minimum line size
        textord_old_baselines: '1', // Use old baseline detection
        textord_old_xheight: '1', // Use old x-height detection
        textord_min_xheight: '8', // Minimum x-height
        textord_force_make_prop_words: 'F', // Don't force proportional words
        textord_force_make_prop_fit: 'F', // Don't force proportional fit
        textord_debug_tabfind: '0', // Disable debug
        textord_heavy_nr: '1' // Heavy noise reduction
      }),
      ...options
    };

    // Try multiple approaches for better Hindi recognition
    let result;
    let bestResult = null;
    let bestConfidence = 0;

    try {
      // First attempt: Hindi + English with enhanced settings
      console.log('Attempting Hindi+English OCR...');
      result = await Tesseract.recognize(imageBuffer, 'hin+eng', tesseractOptions);
      if (result.data.confidence > bestConfidence) {
        bestResult = result;
        bestConfidence = result.data.confidence;
      }
    } catch (error) {
      console.log('Hindi+English OCR failed:', error instanceof Error ? error.message : String(error));
    }

    try {
      // Second attempt: Hindi only
      console.log('Attempting Hindi-only OCR...');
      result = await Tesseract.recognize(imageBuffer, 'hin', {
        ...tesseractOptions,
        psm: 3 // Fully automatic page segmentation
      });
      if (result.data.confidence > bestConfidence) {
        bestResult = result;
        bestConfidence = result.data.confidence;
      }
    } catch (error) {
      console.log('Hindi-only OCR failed:', error instanceof Error ? error.message : String(error));
    }

    try {
      // Third attempt: English only as fallback
      console.log('Attempting English-only OCR...');
      result = await Tesseract.recognize(imageBuffer, 'eng', {
        ...tesseractOptions,
        psm: 6
      });
      if (result.data.confidence > bestConfidence) {
        bestResult = result;
        bestConfidence = result.data.confidence;
      }
    } catch (error) {
      console.log('English-only OCR failed:', error instanceof Error ? error.message : String(error));
    }

    // Use the best result
    if (!bestResult) {
      throw new Error('All OCR attempts failed');
    }

    // Post-process the text for better Hindi accuracy
    const processedText = this.postProcessHindiText(bestResult.data.text);
    
    const processingTime = Date.now() - startTime;

    return {
      text: processedText,
      confidence: bestResult.data.confidence,
      processingTime
    };
  }

  /**
   * Extract fields from raw OCR text using improved regex patterns
   */
  extractFields(rawText: string): OCRExtractedData {
    const extracted: OCRExtractedData = {};
    
    for (const field of this.config.fields) {
      try {
        // Try multiple patterns for better accuracy
        const patterns = [
          field.pattern,
          ...(field.alternatives || [])
        ];

        let bestMatch = null;
        let bestConfidence = 0;

        for (const pattern of patterns) {
          const regex = new RegExp(pattern, 'gi');
          const matches = [...rawText.matchAll(regex)];
          
          for (const match of matches) {
            const confidence = this.calculateMatchConfidence(match[0], field.name);
            if (confidence > bestConfidence) {
              bestMatch = match[1] || match[0];
              bestConfidence = confidence;
            }
          }
        }

        if (bestMatch && bestConfidence > (field.confidence || 0.3)) {
          extracted[field.name] = this.cleanExtractedValue(bestMatch);
        } else {
          extracted[field.name] = null;
        }
      } catch (error) {
        console.error(`Error processing field ${field.name}:`, error);
        extracted[field.name] = null;
      }
    }
    
    return extracted;
  }

  /**
   * Calculate confidence score for a match with improved ID/date distinction
   */
  private calculateMatchConfidence(match: string, fieldName: string): number {
    let confidence = 0.5; // Base confidence

    // Length-based confidence
    if (match.length > 3) confidence += 0.2;
    if (match.length > 10) confidence += 0.1;

    // Pattern-specific confidence adjustments
    switch (fieldName) {
      case 'claimant_name':
        // Check for Hindi or English names
        if (/^[A-Z][a-z]+(\s[A-Z][a-z]+)*$/.test(match)) confidence += 0.3;
        if (/^[\u0900-\u097F]+(\s[\u0900-\u097F]+)*$/.test(match)) confidence += 0.3;
        break;
      case 'village_name':
      case 'district':
      case 'state':
        if (/^[A-Z][a-z\s]+$/.test(match)) confidence += 0.2;
        if (/^[\u0900-\u097F]+(\s[\u0900-\u097F]+)*$/.test(match)) confidence += 0.2;
        break;
      case 'claim_number':
      case 'letter_number':
        // Strong pattern for claim/letter numbers (alphanumeric with separators)
        if (/^[A-Z0-9\-\\/]+$/.test(match)) confidence += 0.4;
        // Penalize if it looks like a date
        if (/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/.test(match)) confidence -= 0.3;
        break;
      case 'area_hectares':
        // Only numeric values with optional decimal
        if (/^\d+(\.\d+)?$/.test(match)) confidence += 0.4;
        break;
      case 'date_submitted':
        // Strong pattern for dates (DD/MM/YYYY or DD-MM-YYYY)
        if (/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/.test(match)) confidence += 0.4;
        // Penalize if it looks like an ID number
        if (/^[A-Z0-9\-\\/]+$/.test(match) && !/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/.test(match)) confidence -= 0.3;
        break;
      case 'project_name':
        // Project names are usually longer and contain mixed characters
        if (match.length > 10) confidence += 0.2;
        if (/[A-Za-z\u0900-\u097F\s]+/.test(match)) confidence += 0.2;
        break;
    }

    return Math.min(Math.max(confidence, 0.0), 1.0);
  }

  /**
   * Post-process Hindi text to improve accuracy
   */
  private postProcessHindiText(text: string): string {
    let processedText = text;

    // Common Hindi OCR error corrections
    const hindiCorrections = {
      // Common character misrecognitions
      '।': '।', // Ensure proper Hindi period
      '॥': '॥', // Ensure proper Hindi double period
      '़': '़', // Ensure proper nukta
      '्': '्', // Ensure proper halant
      'ा': 'ा', // Ensure proper aa matra
      'ि': 'ि', // Ensure proper i matra
      'ी': 'ी', // Ensure proper ii matra
      'ु': 'ु', // Ensure proper u matra
      'ू': 'ू', // Ensure proper uu matra
      'े': 'े', // Ensure proper e matra
      'ै': 'ै', // Ensure proper ai matra
      'ो': 'ो', // Ensure proper o matra
      'ौ': 'ौ', // Ensure proper au matra
      
      // Common word corrections
      'कलेक्टर': 'कलेक्टर',
      'जिला': 'जिला',
      'राज्य': 'राज्य',
      'ग्राम': 'ग्राम',
      'दिनांक': 'दिनांक',
      'पत्र': 'पत्र',
      'क्रमांक': 'क्रमांक',
      'विषय': 'विषय',
      'परियोजना': 'परियोजना',
      'हेक्टेयर': 'हेक्टेयर',
      'भूमि': 'भूमि',
      'क्षेत्र': 'क्षेत्र',
      'वन': 'वन',
      'अधिकार': 'अधिकार',
      'अधिनियम': 'अधिनियम',
      'आवेदक': 'आवेदक',
      'नाम': 'नाम',
      'पिता': 'पिता',
      'पति': 'पति',
      'जाति': 'जाति',
      'व्यवसाय': 'व्यवसाय',
      'पता': 'पता',
      'विवरण': 'विवरण',
      'सीमा': 'सीमा',
      'गवाह': 'गवाह',
      'साक्षी': 'साक्षी'
    };

    // Apply corrections
    for (const [incorrect, correct] of Object.entries(hindiCorrections)) {
      processedText = processedText.replace(new RegExp(incorrect, 'g'), correct);
    }

    // Fix common spacing issues in Hindi text
    processedText = processedText
      .replace(/([^\u0900-\u097F\s])([\u0900-\u097F])/g, '$1 $2') // Add space before Hindi text
      .replace(/([\u0900-\u097F])([^\u0900-\u097F\s])/g, '$1 $2') // Add space after Hindi text
      .replace(/\s+/g, ' ') // Normalize multiple spaces
      .trim();

    return processedText;
  }

  /**
   * Clean and normalize extracted values with Hindi support
   */
  private cleanExtractedValue(value: string): string {
    return value
      .trim()
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/[^\w\s\-\.\/\u0900-\u097F]/g, '') // Keep Hindi characters
      .replace(/\b\s+\b/g, ' ') // Remove extra spaces between words
      .replace(/([^\u0900-\u097F\s])([\u0900-\u097F])/g, '$1 $2') // Fix Hindi spacing
      .replace(/([\u0900-\u097F])([^\u0900-\u097F\s])/g, '$1 $2'); // Fix Hindi spacing
  }

  /**
   * Detect if the text appears to be handwritten based on various characteristics
   */
  private detectHandwrittenText(text: string): boolean {
    // Check for common handwritten characteristics
    const handwrittenIndicators = [
      // Irregular spacing and formatting
      /\s{3,}/g, // Multiple spaces
      /\n\s*\n/g, // Multiple line breaks
      /[A-Z]{2,}\s*[A-Z]{2,}/g, // Multiple consecutive uppercase words
      // Common handwritten document patterns
      /PATTA\s+HOLDER/i,
      /OFFICIAL\s+DOCUMENT/i,
      /NAME\s*[-:]/i,
      /VILLAGE\s*[-:]/i,
      /DISTRICT\s*[-:]/i,
      /STATE\s*[-:]/i,
      /ID\s+NUMBER\s*[-:]/i,
      /DATE\s*[-:]/i,
      /CLAIM\s+ID\s*[-:]/i,
      /AREA\s*[-:]/i
    ];

    let indicatorCount = 0;
    for (const indicator of handwrittenIndicators) {
      if (indicator.test(text)) {
        indicatorCount++;
      }
    }

    // If we find 3 or more indicators, likely handwritten
    return indicatorCount >= 3;
  }

  /**
   * Process image file with OCR
   */
  async processImageFile(filePath: string, filename: string): Promise<{
    extracted: OCRExtractedData;
    rawText: string;
    files: {rawFile: string, fieldsFile: string};
    confidence: number;
    processingTime: number;
  }> {
    try {
      // Read image file
      const imageBuffer = fs.readFileSync(filePath);
      
      // First, try to detect if it's handwritten with a quick OCR
      const quickOCR = await this.performOCR(imageBuffer, { psm: 6 });
      const isHandwritten = this.detectHandwrittenText(quickOCR.text);
      
      // Preprocess image with appropriate settings
      const preprocessedBuffer = await this.preprocessImage(imageBuffer, {
        ...this.config.preprocessing,
        isHandwritten,
        contrast: isHandwritten ? 1.8 : this.config.preprocessing?.contrast || 1.6,
        brightness: isHandwritten ? 1.5 : this.config.preprocessing?.brightness || 1.4
      });
      
      // Perform OCR with appropriate settings
      const ocrResult = await this.performOCR(preprocessedBuffer, {
        ...this.config.tesseract,
        isHandwritten,
        psm: isHandwritten ? 8 : this.config.tesseract?.psm || 6
      });
      
      // Extract fields
      const extracted = this.extractFields(ocrResult.text);
      
      // Save results
      const files = await this.saveToFiles(filename, ocrResult.text, extracted);
      
      return {
        extracted,
        rawText: ocrResult.text,
        files,
        confidence: ocrResult.confidence,
        processingTime: ocrResult.processingTime
      };
    } catch (error) {
      console.error('Error processing image file:', error);
      throw new Error(`OCR processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Process OCR data from text input
   */
  async processOCR(filename: string, rawText: string): Promise<{
    extracted: OCRExtractedData;
    files: {rawFile: string, fieldsFile: string};
    confidence: number;
    processingTime: number;
  }> {
    const startTime = Date.now();
    
    const extracted = this.extractFields(rawText);
    const files = await this.saveToFiles(filename, rawText, extracted);
    const processingTime = Date.now() - startTime;
    
    return {
      extracted,
      files,
      confidence: 0.8, // Default confidence for text input
      processingTime
    };
  }

  /**
   * Save OCR results to files
   */
  async saveToFiles(filename: string, rawText: string, extractedData: OCRExtractedData): Promise<{rawFile: string, fieldsFile: string}> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '');
    const rawFile = path.join(this.outputDir, `${timestamp}_raw.txt`);
    const fieldsFile = path.join(this.outputDir, `${timestamp}_fields.json`);
    
    fs.writeFileSync(rawFile, rawText, 'utf8');
    fs.writeFileSync(fieldsFile, JSON.stringify(extractedData, null, 2), 'utf8');
    
    return { rawFile, fieldsFile };
  }

  /**
   * Get default configuration with improved patterns for Hindi and English
   */
  static getDefaultConfig(): OCRConfig {
    return {
      fields: [
        {
          name: "claimant_name",
          pattern: "(?:Claimant\\s+Name|नाम|आवेदक\\s+का\\s+नाम)[\\s:]+([A-Za-z\\u0900-\\u097F\\s]+?)(?:\\n|Village|District|State|Claim|Father|ग्राम|जिला|राज्य)",
          alternatives: [
            "Name[\\s:]+([A-Za-z\\u0900-\\u097F\\s]+?)(?:\\n|Village|District|State|Claim)",
            "Applicant[\\s:]+([A-Za-z\\u0900-\\u097F\\s]+?)(?:\\n|Village|District|State|Claim)",
            "नाम[\\s:]+([A-Za-z\\u0900-\\u097F\\s]+?)(?:\\n|ग्राम|जिला|राज्य)",
            "आवेदक[\\s:]+([A-Za-z\\u0900-\\u097F\\s]+?)(?:\\n|ग्राम|जिला|राज्य)"
          ],
          confidence: 0.6
        },
        {
          name: "village_name",
          pattern: "Village[\\s:]+([A-Za-z\\s]+?)(?:\\n|District|State|Block|Claim|Taluka)",
          alternatives: [
            "Village\\s+Name[\\s:]+([A-Za-z\\s]+?)(?:\\n|District|State|Block|Claim)",
            "Gram[\\s:]+([A-Za-z\\s]+?)(?:\\n|District|State|Block|Claim)"
          ],
          confidence: 0.5
        },
        {
          name: "district",
          pattern: "District[\\s:]+([A-Za-z\\s]+?)(?:\\n|State|Block|Village|Claim|Taluka)",
          alternatives: [
            "District\\s+Name[\\s:]+([A-Za-z\\s]+?)(?:\\n|State|Block|Village|Claim)",
            "Zilla[\\s:]+([A-Za-z\\s]+?)(?:\\n|State|Block|Village|Claim)"
          ],
          confidence: 0.5
        },
        {
          name: "state",
          pattern: "State[\\s:]+([A-Za-z\\s]+?)(?:\\n|District|Block|Village|Claim|$)",
          alternatives: [
            "State\\s+Name[\\s:]+([A-Za-z\\s]+?)(?:\\n|District|Block|Village|Claim)",
            "Rajasthan[\\s:]+([A-Za-z\\s]+?)(?:\\n|District|Block|Village|Claim)"
          ],
          confidence: 0.5
        },
        {
          name: "claim_number",
          pattern: "Claim[\\s#:]+([A-Z0-9\\-]+)",
          alternatives: [
            "Claim\\s+No[\\s#:]+([A-Z0-9\\-]+)",
            "Application[\\s#:]+([A-Z0-9\\-]+)",
            "Case[\\s#:]+([A-Z0-9\\-]+)"
          ],
          confidence: 0.7
        },
        {
          name: "area_hectares",
          pattern: "Area[\\s:]+([0-9]+(?:\\.[0-9]+)?)\\s*hectares?",
          alternatives: [
            "Area[\\s:]+([0-9]+(?:\\.[0-9]+)?)\\s*ha",
            "Land[\\s:]+([0-9]+(?:\\.[0-9]+)?)\\s*hectares?",
            "Size[\\s:]+([0-9]+(?:\\.[0-9]+)?)\\s*hectares?"
          ],
          confidence: 0.6
        },
        {
          name: "date_submitted",
          pattern: "Date[\\s]+Submitted[\\s:]+([0-9\\-/]+)",
          alternatives: [
            "Submitted[\\s:]+([0-9\\-/]+)",
            "Application[\\s]+Date[\\s:]+([0-9\\-/]+)",
            "Date[\\s:]+([0-9\\-/]+)"
          ],
          confidence: 0.6
        },
        {
          name: "land_type",
          pattern: "Land[\\s]?Type[\\s:]+([A-Za-z\\s]+?)(?:\\n|Area|Claim|Village)",
          alternatives: [
            "Type[\\s]+of[\\s]+Land[\\s:]+([A-Za-z\\s]+?)(?:\\n|Area|Claim|Village)",
            "Category[\\s:]+([A-Za-z\\s]+?)(?:\\n|Area|Claim|Village)"
          ],
          confidence: 0.5
        },
        {
          name: "father_husband_name",
          pattern: "Father[\\s/]Husband[\\s:]+([A-Za-z\\s]+?)(?:\\n|Village|District|State)",
          alternatives: [
            "Father[\\s:]+([A-Za-z\\s]+?)(?:\\n|Village|District|State)",
            "Husband[\\s:]+([A-Za-z\\s]+?)(?:\\n|Village|District|State)",
            "Guardian[\\s:]+([A-Za-z\\s]+?)(?:\\n|Village|District|State)"
          ],
          confidence: 0.5
        },
        {
          name: "caste",
          pattern: "Caste[\\s:]+([A-Za-z\\s]+?)(?:\\n|Village|District|State|Father)",
          alternatives: [
            "Community[\\s:]+([A-Za-z\\s]+?)(?:\\n|Village|District|State|Father)",
            "Category[\\s:]+([A-Za-z\\s]+?)(?:\\n|Village|District|State|Father)"
          ],
          confidence: 0.5
        },
        {
          name: "occupation",
          pattern: "Occupation[\\s:]+([A-Za-z\\s]+?)(?:\\n|Village|District|State|Father)",
          alternatives: [
            "Profession[\\s:]+([A-Za-z\\s]+?)(?:\\n|Village|District|State|Father)",
            "Work[\\s:]+([A-Za-z\\s]+?)(?:\\n|Village|District|State|Father)"
          ],
          confidence: 0.5
        },
        {
          name: "address",
          pattern: "Address[\\s:]+([A-Za-z0-9\\s,\\.\\-]+?)(?:\\n|Village|District|State|Father)",
          alternatives: [
            "Residence[\\s:]+([A-Za-z0-9\\s,\\.\\-]+?)(?:\\n|Village|District|State|Father)",
            "Location[\\s:]+([A-Za-z0-9\\s,\\.\\-]+?)(?:\\n|Village|District|State|Father)"
          ],
          confidence: 0.4
        },
        {
          name: "land_description",
          pattern: "Land[\\s]?Description[\\s:]+([A-Za-z0-9\\s,\\.\\-]+?)(?:\\n|Area|Claim|Village)",
          alternatives: [
            "Description[\\s:]+([A-Za-z0-9\\s,\\.\\-]+?)(?:\\n|Area|Claim|Village)",
            "Details[\\s:]+([A-Za-z0-9\\s,\\.\\-]+?)(?:\\n|Area|Claim|Village)"
          ],
          confidence: 0.4
        },
        {
          name: "boundaries",
          pattern: "Boundaries[\\s:]+([A-Za-z0-9\\s,\\.\\-]+?)(?:\\n|Area|Claim|Village|Land)",
          alternatives: [
            "Boundary[\\s:]+([A-Za-z0-9\\s,\\.\\-]+?)(?:\\n|Area|Claim|Village|Land)",
            "Limits[\\s:]+([A-Za-z0-9\\s,\\.\\-]+?)(?:\\n|Area|Claim|Village|Land)"
          ],
          confidence: 0.4
        },
        {
          name: "witnesses",
          pattern: "Witnesses[\\s:]+([A-Za-z0-9\\s,\\.\\-]+?)(?:\\n|Area|Claim|Village|Land)",
          alternatives: [
            "Witness[\\s:]+([A-Za-z0-9\\s,\\.\\-]+?)(?:\\n|Area|Claim|Village|Land)",
            "Signatories[\\s:]+([A-Za-z0-9\\s,\\.\\-]+?)(?:\\n|Area|Claim|Village|Land)"
          ],
          confidence: 0.4
        }
      ],
      preprocessing: {
        enabled: true,
        denoise: true,
        contrast: 1.2,
        brightness: 1.1,
        sharpen: true
      },
      tesseract: {
        language: 'eng',
        oem: 1, // LSTM OCR Engine Mode
        psm: 6  // Assume a single uniform block of text
      }
    };
  }
}
