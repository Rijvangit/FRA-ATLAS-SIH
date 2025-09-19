// src/hooks/useOpenCV.js
import { useState, useEffect } from "react";

export default function useOpenCV() {
  const [cvReady, setCvReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkReady = () => {
      try {
        // More comprehensive check for OpenCV readiness
        if (typeof window !== 'undefined' && 
            window.cv && 
            window.cv.Mat && 
            window.cv.imread && 
            window.cv.cvtColor &&
            window.cv.GaussianBlur &&
            typeof window.cv.Mat === 'function' &&
            typeof window.cv.imread === 'function' &&
            typeof window.cv.cvtColor === 'function') {
          setCvReady(true);
          setIsLoading(false);
          console.log('✅ OpenCV.js is ready');
          return true;
        }
      } catch (error) {
        console.warn('Error checking OpenCV readiness:', error);
      }
      return false;
    };

    // Wait a bit before starting to check (give OpenCV time to load)
    const initialDelay = setTimeout(() => {
      // Check immediately after delay
      if (checkReady()) {
        return;
      }

      // If not ready, start polling
      let attempts = 0;
      const maxAttempts = 150; // 15 seconds with 100ms intervals
      
      const checkInterval = setInterval(() => {
        attempts++;
        
        try {
          if (checkReady()) {
            clearInterval(checkInterval);
          } else if (attempts >= maxAttempts) {
            clearInterval(checkInterval);
            setIsLoading(false);
            console.warn('⚠️ OpenCV.js failed to load within 15 seconds');
          }
        } catch (error) {
          console.warn('Error during OpenCV polling:', error);
          clearInterval(checkInterval);
          setIsLoading(false);
        }
      }, 100);
    }, 2000); // Wait 2 seconds before starting checks

    return () => {
      clearTimeout(initialDelay);
    };
  }, []);

  return { cvReady, isLoading };
}
