import React, { useState, useRef } from 'react';
import apiService from '../services/api';

const OCRUpload = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [ocrResult, setOcrResult] = useState(null);
  const [error, setError] = useState(null);
  const [useCamera, setUseCamera] = useState(false);
  const [stream, setStream] = useState(null);
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

    try {
      // Convert file to base64 for OCR processing
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          // For now, we'll simulate OCR processing
          // In a real implementation, you'd send the image to a Tesseract.js service
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

          // Send to backend for processing
          const result = await apiService.processOCR({
            filename: selectedFile.name,
            raw_text: mockOcrText
          });

          setOcrResult(result);
        } catch (err) {
          setError('OCR processing failed: ' + err.message);
        } finally {
          setIsProcessing(false);
        }
      };
      reader.readAsDataURL(selectedFile);
    } catch (err) {
      setError('File processing failed: ' + err.message);
      setIsProcessing(false);
    }
  };

  const processFRADocument = async () => {
    if (!selectedFile) {
      setError('Please select a file first');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
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
        } catch (err) {
          setError('FRA document processing failed: ' + err.message);
        } finally {
          setIsProcessing(false);
        }
      };
      reader.readAsDataURL(selectedFile);
    } catch (err) {
      setError('File processing failed: ' + err.message);
      setIsProcessing(false);
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
      <h2 className="text-xl font-bold mb-4">Document OCR Processing</h2>
      
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
          onClick={resetForm}
          className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
        >
          Reset
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 rounded text-red-700">
          ⚠️ {error}
        </div>
      )}

      {/* OCR Results */}
      {ocrResult && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Extracted Data:</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(ocrResult.extracted || {}).map(([key, value]) => (
              <div key={key} className="p-3 bg-gray-50 rounded-lg">
                <label className="text-sm font-medium text-gray-600 capitalize">
                  {key.replace(/_/g, ' ')}:
                </label>
                <p className="text-gray-800">{value || 'Not found'}</p>
              </div>
            ))}
          </div>

          <div className="mt-4">
            <h4 className="font-medium mb-2">Raw OCR Text:</h4>
            <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto max-h-40">
              {ocrResult.raw_text || 'No raw text available'}
            </pre>
          </div>

          <div className="mt-4 p-3 bg-green-100 border border-green-400 rounded text-green-700">
            ✅ Document processed successfully! ID: {ocrResult.id}
          </div>
        </div>
      )}
    </div>
  );
};

export default OCRUpload;
