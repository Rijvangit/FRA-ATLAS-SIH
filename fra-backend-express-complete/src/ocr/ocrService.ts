import fs from 'fs';
import path from 'path';
import * as mkdirp from 'mkdirp';

export interface OCRField {
  name: string;
  pattern: string;
}

export interface OCRConfig {
  fields: OCRField[];
}

export interface OCRExtractedData {
  [key: string]: string | null;
}

export interface OCRResult {
  id?: number;
  filename: string;
  raw_text: string;
  extracted_json: OCRExtractedData;
  created_at?: Date;
}

export class OCRService {
  private config: OCRConfig;
  private outputDir: string;

  constructor(configPath: string, outputDir: string) {
    try {
      this.config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch (error) {
      console.warn(`Config file not found at ${configPath}, using default FRA config`);
      this.config = OCRService.getFRAConfig();
    }
    this.outputDir = outputDir;
    mkdirp.sync(this.outputDir);
  }

  /**
   * Extract fields from raw OCR text using regex patterns
   */
  extractFields(rawText: string): OCRExtractedData {
    const extracted: OCRExtractedData = {};
    
    for (const field of this.config.fields) {
      try {
        const regex = new RegExp(field.pattern, 'g');
        const match = regex.exec(rawText);
        
        if (match && match[1]) {
          extracted[field.name] = match[1];
        } else if (match) {
          extracted[field.name] = match[0];
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
   * Process OCR data and return structured result
   */
  async processOCR(filename: string, rawText: string): Promise<{
    extracted: OCRExtractedData;
    files: {rawFile: string, fieldsFile: string};
  }> {
    const extracted = this.extractFields(rawText);
    const files = await this.saveToFiles(filename, rawText, extracted);
    
    return {
      extracted,
      files
    };
  }

  /**
   * Get FRA-specific field extraction patterns
   */
  static getFRAConfig(): OCRConfig {
    return {
      fields: [
        {
          name: "claimant_name",
          pattern: "Claimant\\s+Name[\\s:]+([A-Za-z\\s]+?)(?:\\n|Village|District|State|Claim)"
        },
        {
          name: "village_name",
          pattern: "Village[\\s:]+([A-Za-z\\s]+?)(?:\\n|District|State|Block|Claim)"
        },
        {
          name: "district",
          pattern: "District[\\s:]+([A-Za-z\\s]+?)(?:\\n|State|Block|Village|Claim)"
        },
        {
          name: "state",
          pattern: "State[\\s:]+([A-Za-z\\s]+?)(?:\\n|District|Block|Village|Claim)"
        },
        {
          name: "claim_number",
          pattern: "Claim[\\s#:]+([A-Z0-9\\-]+)"
        },
        {
          name: "area_hectares",
          pattern: "Area[\\s:]+([0-9]+(?:\\.[0-9]+)?)\\s*hectares?"
        },
        {
          name: "date_submitted",
          pattern: "Date[\\s]+Submitted[\\s:]+([0-9\\-/]+)"
        },
        {
          name: "land_type",
          pattern: "Land[\\s]?Type[\\s:]+([A-Za-z\\s]+?)(?:\\n|Area|Claim|Village)"
        }
      ]
    };
  }
}
