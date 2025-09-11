// Express backend to receive OCR text and save into MySQL + outputs/
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const mkdirp = require('mkdirp');
const mysql = require('mysql2/promise');

const app = express();
app.use(cors());
app.use(bodyParser.json({limit:'10mb'}));

const OUT_DIR = path.join(__dirname, '..', 'outputs');
mkdirp.sync(OUT_DIR);

// MySQL connection settings - EDIT THESE before running
const DB_CONFIG = {
  host: process.env.MYSQL_HOST || 'localhost',
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'ocr_db'
};

// config for field extraction (regex patterns)
const config = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8'));

async function ensureDB(){
  // creates database and table if not exist
  const conn = await mysql.createConnection({
    host: DB_CONFIG.host, user: DB_CONFIG.user, password: DB_CONFIG.password
  });
  await conn.query(`CREATE DATABASE IF NOT EXISTS \`${DB_CONFIG.database}\``);
  await conn.end();
  const pool = await mysql.createPool(DB_CONFIG);
  await pool.query(`CREATE TABLE IF NOT EXISTS ocr_results (
    id INT AUTO_INCREMENT PRIMARY KEY,
    filename VARCHAR(255),
    raw_text LONGTEXT,
    extracted_json JSON,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  await pool.end();
}

function extractFields(raw){
  const out = {};
  for(const f of config.fields){
    try{
      const re = new RegExp(f.pattern,'g');
      const m = re.exec(raw);
      if(m && m[1]) out[f.name] = m[1];
      else if(m) out[f.name] = m[0];
      else out[f.name] = null;
    }catch(e){
      out[f.name] = null;
    }
  }
  return out;
}

app.get('/', (req,res)=> res.send('OCR MySQL backend running. POST /save-ocr'));

app.post('/save-ocr', async (req,res)=>{
  try{
    const { filename='upload.png', raw_text='' } = req.body;
    await ensureDB();
    const extracted = extractFields(raw_text);
    const ts = Date.now();
    const rawPath = path.join(OUT_DIR, `${ts}_raw.txt`);
    const fieldsPath = path.join(OUT_DIR, `${ts}_fields.json`);
    fs.writeFileSync(rawPath, raw_text, 'utf8');
    fs.writeFileSync(fieldsPath, JSON.stringify(extracted, null, 2), 'utf8');

    const pool = await mysql.createPool(DB_CONFIG);
    const [result] = await pool.query('INSERT INTO ocr_results (filename, raw_text, extracted_json) VALUES (?,?,?)', [filename, raw_text, JSON.stringify(extracted)]);
    await pool.end();

    res.json({ ok:true, id: result.insertId, raw_file: rawPath, fields_file: fieldsPath, extracted });
  }catch(e){
    console.error(e);
    res.status(500).json({ ok:false, error: e.message });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, ()=> console.log('Server listening on', PORT));
