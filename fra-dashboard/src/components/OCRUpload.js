import React, { useState, useRef } from 'react';
import apiService from '../services/api';
import Tesseract from 'tesseract.js';

const OCRUpload = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [ocrResult, setOcrResult] = useState(null);
  const [error, setError] = useState(null);
  const [useCamera, setUseCamera] = useState(false);
  const [stream, setStream] = useState(null);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [useRealOCR, setUseRealOCR] = useState(true);
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
      setPreview(URL.createObjectURL(file));
      setError(null);
      setOcrResult(null);
    }
  };

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      setStream(mediaStream);
      setUseCamera(true);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      setError('Camera access denied: ' + err.message);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      setUseCamera(false);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      const context = canvas.getContext('2d');
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0);
      
      canvas.toBlob((blob) => {
        const file = new File([blob], 'camera_capture.png', { type: 'image/png' });
        setSelectedFile(file);
        setPreview(canvas.toDataURL());
        stopCamera();
      });
    }
  };

  const processOCR = async () => {
    if (!selectedFile) {
      setError('Please select a file first');
      return;
    }


    setIsProcessing(true);
    setError(null);
    setOcrProgress(0);

    try {
      if (useRealOCR) {
        let processedFile = selectedFile;
        

        // Use real Tesseract.js OCR processing with enhanced Hindi + English support
        const result = await Tesseract.recognize(processedFile, 'hin+eng', {
          logger: (m) => {
            if (m.status === 'recognizing text') {
              setOcrProgress(Math.round(m.progress * 100));
            }
          },
          // Enhanced OCR options for better Hindi recognition
          oem: 1, // LSTM OCR Engine Mode
          psm: 6, // Assume a single uniform block of text
          tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,-/:()[]{}"\'!@#$%^&*+=<>?|\\~` \u0900-\u097F',
          preserve_interword_spaces: '1',
        });

        // Send to backend for field extraction
        const backendResult = await apiService.processOCR({
          filename: selectedFile.name,
          raw_text: result.data.text
        });

        setOcrResult({
          ...backendResult,
          confidence: result.data.confidence,
          processing_time: result.data.processing_time
        });
      } else {
        // Fallback to mock data for testing
        const mockOcrText = `FRA CLAIM DOCUMENT
          
Claimant Name: John Doe
Village: Sample Village
District: Sample District
State: Maharashtra
Claim Number: FRA-2025-001
Area: 2.5 hectares
Date Submitted: 09/09/2025
Land Type: Forest Land
Father/Husband Name: Richard Doe
Caste: Scheduled Tribe
Occupation: Farmer
Address: Sample Village, Sample District, Maharashtra
Land Description: Dense forest area with mixed vegetation
Boundaries: North - River, South - Road, East - Hill, West - Field
Witnesses: Jane Smith, Bob Johnson`;

        const result = await apiService.processOCR({
          filename: selectedFile.name,
          raw_text: mockOcrText
        });

        setOcrResult(result);
      }
    } catch (err) {
      setError('OCR processing failed: ' + err.message);
    } finally {
      setIsProcessing(false);
      setOcrProgress(0);
    }
  };

  const processFRADocument = async () => {
    if (!selectedFile) {
      setError('Please select a file first');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setOcrProgress(0);

    try {
      if (useRealOCR) {
        // Use real Tesseract.js OCR processing for FRA documents with enhanced Hindi + English support
        const result = await Tesseract.recognize(selectedFile, 'hin+eng', {
          logger: (m) => {
            if (m.status === 'recognizing text') {
              setOcrProgress(Math.round(m.progress * 100));
            }
          },
          // Enhanced OCR options for better Hindi FRA document recognition
          oem: 1, // LSTM OCR Engine Mode
          psm: 6, // Assume a single uniform block of text
          tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,-/:()[]{}"\'!@#$%^&*+=<>?|\\~` \u0900-\u097F',
          preserve_interword_spaces: '1',
        });

        // Send to backend for FRA-specific field extraction
        const backendResult = await apiService.processFRADocument({
          filename: selectedFile.name,
          raw_text: result.data.text
        });

        setOcrResult({
          ...backendResult,
          confidence: result.data.confidence,
          processing_time: result.data.processing_time
        });
      } else {
        // Fallback to mock data for testing
        const mockOcrText = `FRA CLAIM DOCUMENT
          
Claimant Name: John Doe
Village: Sample Village
District: Sample District
State: Maharashtra
Claim Number: FRA-2025-001
Area: 2.5 hectares
Date Submitted: 09/09/2025
Land Type: Forest Land
Father/Husband Name: Richard Doe
Caste: Scheduled Tribe
Occupation: Farmer
Address: Sample Village, Sample District, Maharashtra
Land Description: Dense forest area with mixed vegetation
Boundaries: North - River, South - Road, East - Hill, West - Field
Witnesses: Jane Smith, Bob Johnson`;

        const result = await apiService.processFRADocument({
          filename: selectedFile.name,
          raw_text: mockOcrText
        });

        setOcrResult(result);
      }
    } catch (err) {
      setError('FRA document processing failed: ' + err.message);
    } finally {
      setIsProcessing(false);
      setOcrProgress(0);
    }
  };

  const processHandwrittenDocument = async () => {
    if (!selectedFile) {
      setError('Please select a file first');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setOcrProgress(0);

    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('image', selectedFile);

      // Send to backend for handwritten document processing
      const result = await apiService.processHandwritten(formData);

      setOcrResult({
        ...result,
        document_type: 'handwritten_document'
      });
    } catch (err) {
      console.error('Handwritten OCR processing error:', err);
      setError(`Handwritten OCR processing failed: ${err.message}`);
    } finally {
      setIsProcessing(false);
      setOcrProgress(0);
    }
  };

  const resetForm = () => {
    setSelectedFile(null);
    setPreview(null);
    setOcrResult(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow">
      <h2 className="text-xl font-bold mb-4">Enhanced Document OCR Processing</h2>
      
      {/* OCR Mode Toggle */}
      <div className="mb-4 p-3 bg-blue-50 rounded-lg">
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={useRealOCR}
              onChange={(e) => setUseRealOCR(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm font-medium">Use Real OCR (Tesseract.js)</span>
          </label>
          <span className="text-xs text-gray-600">
            {useRealOCR ? 'Real OCR processing enabled' : 'Mock data mode'}
          </span>
        </div>
      </div>
      
      {/* File Upload Section */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="p-2 border rounded-lg"
          />
          
          {!useCamera ? (
            <button
              onClick={startCamera}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              Use Camera
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={capturePhoto}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
              >
                Capture Photo
              </button>
              <button
                onClick={stopCamera}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
              >
                Stop Camera
              </button>
            </div>
          )}
        </div>

        {/* Camera Video */}
        {useCamera && (
          <div className="mb-4">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full max-w-md rounded-lg border"
            />
            <canvas ref={canvasRef} style={{ display: 'none' }} />
          </div>
        )}

        {/* Image Preview */}
        {preview && (
          <div className="mb-4">
            <img
              src={preview}
              alt="Preview"
              className="max-w-full h-64 object-contain rounded-lg border"
            />
          </div>
        )}
      </div>


      {/* Processing Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <button
          onClick={processOCR}
          disabled={!selectedFile || isProcessing}
          className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isProcessing ? 'Processing...' : 'Process OCR'}
        </button>
        
        <button
          onClick={processFRADocument}
          disabled={!selectedFile || isProcessing}
          className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isProcessing ? 'Processing...' : 'Process FRA Document'}
        </button>
        
        <button
          onClick={processHandwrittenDocument}
          disabled={!selectedFile || isProcessing}
          className="px-6 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isProcessing ? 'Processing...' : 'Process Handwritten Document'}
        </button>
        
        <button
          onClick={resetForm}
          className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
        >
          Reset
        </button>
      </div>

      {/* Preprocessing Progress Indicator */}

      {/* OCR Progress Indicator */}
      {isProcessing && ocrProgress > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">OCR Progress</span>
            <span className="text-sm text-gray-500">{ocrProgress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${ocrProgress}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 rounded text-red-700">
          ⚠️ {error}
        </div>
      )}

      {/* OCR Results */}
      {ocrResult && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Extracted Data:</h3>
            <div className="flex gap-4 text-sm">
              {ocrResult.confidence && (
                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">
                  Confidence: {Math.round(ocrResult.confidence)}%
                </span>
              )}
              {ocrResult.processing_time && (
                <span className="px-2 py-1 bg-green-100 text-green-800 rounded">
                  Time: {ocrResult.processing_time}ms
                </span>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {Object.entries(ocrResult.extracted || {}).map(([key, value]) => (
              <div key={key} className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-semibold text-gray-700 capitalize">
                    {key.replace(/_/g, ' ')}:
                  </label>
                  {value && (
                    <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full">
                      ✓ Extracted
                    </span>
                  )}
                </div>
                <div className="min-h-[2.5rem] flex items-center">
                  <p className="text-gray-800 text-base font-medium">
                    {value || (
                      <span className="text-gray-400 italic">Not found</span>
                    )}
                  </p>
                </div>
                {value && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                      <span>Confidence</span>
                      <span>{Math.min((value.length / 20) * 100, 100)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-green-400 to-green-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min((value.length / 20) * 100, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-lg text-gray-700">Raw OCR Text</h4>
              <span className="text-xs text-gray-500">
                {ocrResult.raw_text ? `${ocrResult.raw_text.length} characters` : 'No text'}
              </span>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <pre className="text-sm text-gray-800 whitespace-pre-wrap overflow-auto max-h-60 font-mono leading-relaxed">
                {ocrResult.raw_text || 'No raw text available'}
              </pre>
            </div>
          </div>

          <div className="mt-4 p-3 bg-green-100 border border-green-400 rounded text-green-700">
            ✅ Document processed successfully! ID: {ocrResult.id}
            {ocrResult.document_type && (
              <span className="ml-2 px-2 py-1 bg-green-200 rounded text-xs">
                {ocrResult.document_type}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default OCRUpload;
