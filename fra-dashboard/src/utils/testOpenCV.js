// Wait for OpenCV to be fully loaded
export async function waitForOpenCV() {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && window.cv && window.cv.Mat) {
      resolve(true);
      return;
    }
    
    const checkInterval = setInterval(() => {
      if (typeof window !== 'undefined' && window.cv && window.cv.Mat) {
        clearInterval(checkInterval);
        resolve(true);
      }
    }, 100);
    
    // Timeout after 10 seconds
    setTimeout(() => {
      clearInterval(checkInterval);
      resolve(false);
    }, 10000);
  });
}

// Test OpenCV.js integration
export async function testOpenCVIntegration() {
  try {
    console.log('🔍 Testing OpenCV.js integration...');
    
    // Wait for OpenCV to be loaded
    const openCVReady = await waitForOpenCV();
    if (!openCVReady) {
      console.warn('❌ OpenCV.js not loaded');
      return false;
    }
    
    // Additional safety check
    if (typeof window === 'undefined' || !window.cv || !window.cv.Mat || !window.cv.imread) {
      console.warn('❌ OpenCV.js not properly loaded');
      return false;
    }
    
    console.log('✅ OpenCV.js is loaded');
    console.log('📊 OpenCV version:', window.cv.getBuildInformation ? 'Available' : 'Not available');
    
    // Test basic OpenCV functionality
    try {
      // Create a simple test image
      const canvas = document.createElement('canvas');
      canvas.width = 100;
      canvas.height = 100;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, 100, 100);
      ctx.fillStyle = 'black';
      ctx.fillRect(25, 25, 50, 50);
      
      // Test OpenCV operations with additional safety checks
      if (window.cv.imread && window.cv.cvtColor && window.cv.Mat) {
        const src = window.cv.imread(canvas);
        const gray = new window.cv.Mat();
        window.cv.cvtColor(src, gray, window.cv.COLOR_RGBA2GRAY, 0);
        
        console.log('✅ Basic OpenCV operations working');
        console.log('📏 Image dimensions:', src.rows, 'x', src.cols);
        
        // Clean up
        src.delete();
        gray.delete();
      } else {
        console.warn('❌ Required OpenCV functions not available');
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('❌ OpenCV test failed:', error);
      return false;
    }
  } catch (error) {
    console.error('❌ OpenCV integration test error:', error);
    return false;
  }
}

// Auto-test when module loads - REMOVED to prevent script errors
// The testOpenCVIntegration function should only be called explicitly
