// utils/imagePreprocess.js
// OpenCV.js image preprocessing for enhanced OCR accuracy
// Make sure you have OpenCV.js loaded in your project

// Wait for OpenCV to be fully loaded
async function waitForOpenCV() {
  return new Promise((resolve) => {
    // Check if we're in a browser environment
    if (typeof window === 'undefined') {
      resolve(false);
      return;
    }

    // Check if OpenCV is already loaded with all required functions
    const isOpenCVReady = () => {
      try {
        return window.cv && 
               window.cv.Mat && 
               window.cv.imread && 
               window.cv.cvtColor &&
               window.cv.GaussianBlur &&
               typeof window.cv.Mat === 'function' &&
               typeof window.cv.imread === 'function' &&
               typeof window.cv.cvtColor === 'function';
      } catch (error) {
        console.warn('Error checking OpenCV readiness:', error);
        return false;
      }
    };

    if (isOpenCVReady()) {
      resolve(true);
      return;
    }
    
    // Poll for OpenCV to be loaded
    let attempts = 0;
    const maxAttempts = 100; // 10 seconds with 100ms intervals
    
    const checkInterval = setInterval(() => {
      attempts++;
      
      if (isOpenCVReady()) {
        clearInterval(checkInterval);
        console.log('✅ OpenCV.js loaded successfully');
        resolve(true);
      } else if (attempts >= maxAttempts) {
        clearInterval(checkInterval);
        console.warn('⚠️ OpenCV.js failed to load within 10 seconds');
        resolve(false);
      }
    }, 100);
  });
}


export async function preprocessImage(file, options = {}) {
  return new Promise(async (resolve, reject) => {
    try {
      // Wait for OpenCV to be loaded
      const openCVReady = await waitForOpenCV();
      if (!openCVReady) {
        console.warn('OpenCV.js not loaded, skipping preprocessing');
        resolve(file);
        return;
      }

    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        // Load image into OpenCV
        let src = window.cv.imread(canvas);
        let gray = new window.cv.Mat();
        let thresh = new window.cv.Mat();

        // 1. Convert to grayscale
        window.cv.cvtColor(src, gray, window.cv.COLOR_RGBA2GRAY, 0);

        // 2. Gaussian blur (denoise) - lighter for handwritten text
        window.cv.GaussianBlur(gray, gray, new window.cv.Size(3, 3), 0);

        // 3. Adaptive Threshold (binarization) - optimized for handwritten text
        window.cv.adaptiveThreshold(
          gray,
          thresh,
          255,
          window.cv.ADAPTIVE_THRESH_GAUSSIAN_C,
          window.cv.THRESH_BINARY,
          25,
          15
        );

        // 4. Morphological operations (clean noise) - gentle for handwritten text
        let kernel = window.cv.getStructuringElement(window.cv.MORPH_RECT, new window.cv.Size(2, 2));
        window.cv.morphologyEx(thresh, thresh, window.cv.MORPH_OPEN, kernel);

        // 5. Additional preprocessing for handwritten text
        if (options.isHandwritten) {
          // Dilate slightly to connect broken strokes
          let dilateKernel = window.cv.getStructuringElement(window.cv.MORPH_RECT, new window.cv.Size(1, 1));
          window.cv.dilate(thresh, thresh, dilateKernel);
          dilateKernel.delete();
        }

        // 6. Resize image for better OCR (higher resolution for handwritten text)
        let resized = new window.cv.Mat();
        let scale = options.isHandwritten ? 
          (options.maxWidth ? options.maxWidth / src.cols : 2.0) : 
          (options.maxWidth ? options.maxWidth / src.cols : 1.5);
        
        window.cv.resize(
          thresh,
          resized,
          new window.cv.Size(0, 0),
          scale,
          scale,
          window.cv.INTER_LINEAR
        );

        // 7. Additional contrast enhancement for handwritten text
        if (options.isHandwritten) {
          let enhanced = new window.cv.Mat();
          resized.convertTo(enhanced, -1, 1.2, 10); // alpha=1.2, beta=10
          resized = enhanced;
        }

        // Put back into canvas
        window.cv.imshow(canvas, resized);

        // Export as Blob (for Tesseract)
        canvas.toBlob(
          (blob) => {
            src.delete();
            gray.delete();
            thresh.delete();
            resized.delete();
            kernel.delete();
            resolve(blob);
          },
          "image/png",
          0.95
        );
      } catch (err) {
        console.error('Preprocessing error:', err);
        resolve(file); // Return original file if preprocessing fails
      }
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
    } catch (error) {
      console.error('Error in preprocessImage:', error);
      reject(error);
    }
  });
}

// Advanced preprocessing specifically for handwritten documents
export async function preprocessHandwrittenImage(file, options = {}) {
  return new Promise(async (resolve, reject) => {
    // Wait for OpenCV to be loaded
    const openCVReady = await waitForOpenCV();
    if (!openCVReady) {
      console.warn('OpenCV.js not loaded, skipping handwritten preprocessing');
      resolve(file);
      return;
    }

    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        // Load image into OpenCV
        let src = window.cv.imread(canvas);
        let gray = new window.cv.Mat();
        let thresh = new window.cv.Mat();
        let denoised = new window.cv.Mat();

        // 1. Convert to grayscale
        window.cv.cvtColor(src, gray, window.cv.COLOR_RGBA2GRAY, 0);

        // 2. Noise reduction - more aggressive for handwritten text
        // Use Gaussian blur as alternative to fastNlMeansDenoising
        window.cv.GaussianBlur(gray, denoised, new window.cv.Size(5, 5), 0);

        // 3. Additional noise reduction with median filter
        let medianFiltered = new window.cv.Mat();
        window.cv.medianBlur(denoised, medianFiltered, 3);
        denoised = medianFiltered;

        // 4. Contrast enhancement
        let enhanced = new window.cv.Mat();
        denoised.convertTo(enhanced, -1, 1.3, 20); // alpha=1.3, beta=20

        // 5. Adaptive Threshold - optimized for handwritten text
        window.cv.adaptiveThreshold(
          enhanced,
          thresh,
          255,
          window.cv.ADAPTIVE_THRESH_GAUSSIAN_C,
          window.cv.THRESH_BINARY,
          21,
          10
        );

        // 6. Morphological operations for handwritten text
        let kernel = window.cv.getStructuringElement(window.cv.MORPH_RECT, new window.cv.Size(2, 2));
        window.cv.morphologyEx(thresh, thresh, window.cv.MORPH_CLOSE, kernel);

        // 7. Dilate to connect broken strokes
        let dilateKernel = window.cv.getStructuringElement(window.cv.MORPH_RECT, new window.cv.Size(1, 1));
        window.cv.dilate(thresh, thresh, dilateKernel);

        // 8. Erode to clean up noise
        let erodeKernel = window.cv.getStructuringElement(window.cv.MORPH_RECT, new window.cv.Size(1, 1));
        window.cv.erode(thresh, thresh, erodeKernel);

        // 9. Resize for better OCR (higher resolution for handwritten text)
        let resized = new window.cv.Mat();
        let scale = options.maxWidth ? options.maxWidth / src.cols : 2.5;
        window.cv.resize(
          thresh,
          resized,
          new window.cv.Size(0, 0),
          scale,
          scale,
          window.cv.INTER_CUBIC // Better quality for handwritten text
        );

        // 10. Final contrast enhancement
        let final = new window.cv.Mat();
        resized.convertTo(final, -1, 1.1, 5);

        // Put back into canvas
        window.cv.imshow(canvas, final);

        // Export as Blob
        canvas.toBlob(
          (blob) => {
            src.delete();
            gray.delete();
            thresh.delete();
            denoised.delete();
            medianFiltered.delete();
            enhanced.delete();
            resized.delete();
            final.delete();
            kernel.delete();
            dilateKernel.delete();
            erodeKernel.delete();
            resolve(blob);
          },
          "image/png",
          0.95
        );
      } catch (err) {
        console.error('Handwritten preprocessing error:', err);
        resolve(file); // Return original file if preprocessing fails
      }
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

// Deskew function to auto-rotate tilted documents
export async function deskewImage(file, options = {}) {
  return new Promise(async (resolve, reject) => {
    // Wait for OpenCV to be loaded
    const openCVReady = await waitForOpenCV();
    if (!openCVReady) {
      console.warn('OpenCV.js not loaded, skipping deskewing');
      resolve(file);
      return;
    }

    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        let src = window.cv.imread(canvas);
        let gray = new window.cv.Mat();
        let edges = new window.cv.Mat();
        let lines = new window.cv.Mat();

        // Convert to grayscale
        window.cv.cvtColor(src, gray, window.cv.COLOR_RGBA2GRAY, 0);

        // Edge detection
        window.cv.Canny(gray, edges, 50, 150, 3, false);

        // Hough line detection
        window.cv.HoughLines(edges, lines, 1, Math.PI / 180, 100, 0, 0);

        // Calculate rotation angle
        let angle = 0;
        if (lines.rows > 0) {
          let sum = 0;
          for (let i = 0; i < lines.rows; i++) {
            // eslint-disable-next-line no-unused-vars
            let rho = lines.data32F[i * 2]; // Distance from origin
            let theta = lines.data32F[i * 2 + 1]; // Angle in radians
            sum += theta;
          }
          angle = (sum / lines.rows) * 180 / Math.PI - 90;
        }

        // Rotate image if angle is significant
        if (Math.abs(angle) > 0.5) {
          let center = new window.cv.Point(src.cols / 2, src.rows / 2);
          let rotationMatrix = window.cv.getRotationMatrix2D(center, angle, 1.0);
          let rotated = new window.cv.Mat();
          window.cv.warpAffine(src, rotated, rotationMatrix, src.size());
          window.cv.imshow(canvas, rotated);
          rotated.delete();
          rotationMatrix.delete();
        } else {
          window.cv.imshow(canvas, src);
        }

        // Export as Blob
        canvas.toBlob(
          (blob) => {
            src.delete();
            gray.delete();
            edges.delete();
            lines.delete();
            resolve(blob);
          },
          "image/png",
          0.95
        );
      } catch (err) {
        console.error('Deskew error:', err);
        resolve(file); // Return original file if deskewing fails
      }
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

// Simple preprocessing function using only basic OpenCV functions
export async function preprocessImageSimple(file, options = {}) {
  return new Promise(async (resolve, reject) => {
    // Wait for OpenCV to be loaded
    const openCVReady = await waitForOpenCV();
    if (!openCVReady) {
      console.warn('OpenCV.js not loaded, skipping preprocessing');
      resolve(file);
      return;
    }

    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        // Load image into OpenCV
        let src = window.cv.imread(canvas);
        let gray = new window.cv.Mat();
        let thresh = new window.cv.Mat();

        // 1. Convert to grayscale
        window.cv.cvtColor(src, gray, window.cv.COLOR_RGBA2GRAY, 0);

        // 2. Gaussian blur for noise reduction
        window.cv.GaussianBlur(gray, gray, new window.cv.Size(3, 3), 0);

        // 3. Adaptive threshold
        window.cv.adaptiveThreshold(
          gray,
          thresh,
          255,
          window.cv.ADAPTIVE_THRESH_GAUSSIAN_C,
          window.cv.THRESH_BINARY,
          25,
          15
        );

        // 4. Morphological operations
        let kernel = window.cv.getStructuringElement(window.cv.MORPH_RECT, new window.cv.Size(2, 2));
        window.cv.morphologyEx(thresh, thresh, window.cv.MORPH_OPEN, kernel);

        // 5. Resize for better OCR
        let resized = new window.cv.Mat();
        let scale = options.maxWidth ? options.maxWidth / src.cols : 1.5;
        window.cv.resize(thresh, resized, new window.cv.Size(0, 0), scale, scale, window.cv.INTER_LINEAR);

        // Put back into canvas
        window.cv.imshow(canvas, resized);

        // Export as Blob
        canvas.toBlob(
          (blob) => {
            src.delete();
            gray.delete();
            thresh.delete();
            resized.delete();
            kernel.delete();
            resolve(blob);
          },
          "image/png",
          0.95
        );
      } catch (err) {
        console.error('Simple preprocessing error:', err);
        resolve(file); // Return original file if preprocessing fails
      }
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

// Simple fallback preprocessing without OpenCV
function simplePreprocessing(file, options = {}) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Basic resizing
      const maxWidth = options.maxWidth || 1200;
      const scale = Math.min(maxWidth / img.width, maxWidth / img.height);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      
      // Draw image
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      // Basic contrast enhancement
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      for (let i = 0; i < data.length; i += 4) {
        // Simple contrast enhancement
        data[i] = Math.min(255, data[i] * 1.2);     // Red
        data[i + 1] = Math.min(255, data[i + 1] * 1.2); // Green
        data[i + 2] = Math.min(255, data[i + 2] * 1.2); // Blue
      }
      
      ctx.putImageData(imageData, 0, 0);
      
      // Convert to blob
      canvas.toBlob((blob) => {
        resolve(blob);
      }, 'image/png', 0.95);
    };
    img.onerror = () => resolve(file);
    img.src = URL.createObjectURL(file);
  });
}

// Combined preprocessing function
export async function preprocessForOCR(file, options = {}) {
  try {
    // Wait for OpenCV to be loaded
    const openCVReady = await waitForOpenCV();
    if (!openCVReady) {
      console.warn('OpenCV.js not loaded, using simple preprocessing fallback');
      return await simplePreprocessing(file, options);
    }

    let processedFile = file;
    
    // Step 1: Deskew if needed
    if (options.deskew) {
      processedFile = await deskewImage(processedFile, options);
    }
    
    // Step 2: Apply appropriate preprocessing
    if (options.isHandwritten) {
      try {
        processedFile = await preprocessHandwrittenImage(processedFile, options);
      } catch (error) {
        console.warn('Handwritten preprocessing failed, using simple preprocessing:', error);
        processedFile = await preprocessImageSimple(processedFile, options);
      }
    } else {
      processedFile = await preprocessImage(processedFile, options);
    }
    
    return processedFile;
  } catch (error) {
    console.error('Preprocessing failed, using fallback:', error);
    return await simplePreprocessing(file, options);
  }
}