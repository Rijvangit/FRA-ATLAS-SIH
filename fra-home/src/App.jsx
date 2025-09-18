import { motion } from "framer-motion";
import { Map, AlertCircle, LayoutDashboard, UploadCloud } from "lucide-react";
import './app.css';

export default function App() {
  const layers = [
    { id: "upload", label: "UPLOAD/SCAN", icon: <UploadCloud className="w-6 h-6" />, url: "https://your-upload-link.com" }, // replace with your upload link
    { id: "atlas", label: "FRA ATLAS", icon: <Map className="w-6 h-6" />, url: "https://trinetra-map1.onrender.com/" },
    { id: "alert", label: "ALERT SYSTEM", icon: <AlertCircle className="w-6 h-6" />, url: "https://fra-trinetralert.onrender.com/" },
    { id: "dashboard", label: "DASHBOARD", icon: <LayoutDashboard className="w-6 h-6" />, url: "https://fra-trinetralert.onrender.com/" },
  ];

  const buttonGradient = 'linear-gradient(135deg, #4facfe, #00f2fe)';

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      flexDirection: 'column', 
      justifyContent: 'center', 
      alignItems: 'center', 
      background: '#fefefe'
    }}>

      {/* Blue-themed Floating Blobs */}
      <motion.div
        className="absolute top-10 left-10 w-60 h-60 rounded-full z-0"
        style={{
          background: 'linear-gradient(135deg, #a0e9ff, #4facfe)',
          filter: 'blur(80px)',
        }}
        animate={{ y: [0, 50, 0], x: [0, 50, 0] }}
        transition={{ duration: 3, repeat: Infinity, repeatType: "reverse" }}
      ></motion.div>

      <motion.div
        className="absolute bottom-20 right-10 w-80 h-80 rounded-full z-0"
        style={{
          background: 'linear-gradient(135deg, #00f2fe, #1e90ff)',
          filter: 'blur(100px)',
        }}
        animate={{ y: [0, -50, 0], x: [0, -50, 0] }}
        transition={{ duration: 4, repeat: Infinity, repeatType: "reverse" }}
      ></motion.div>

      {/* Main Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8 }}
        style={{
          zIndex: 10,
          minWidth: '300px',
          maxWidth: '900px',
          backgroundColor: '#ffffff',
          borderRadius: '2rem',
          padding: '3rem 2rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          boxShadow: '0 20px 50px rgba(0,0,0,0.08)',
        }}
      >
        {/* Title */}
        <h1 style={{
          fontSize: '3rem',
          fontWeight: '800',
          color: '#1e1e2f',
          textAlign: 'center',
          marginBottom: '0.5rem',
        }}>TRINETRA</h1>

        {/* Subtitle */}
        <p style={{
          fontSize: '1rem',
          fontWeight: '500',
          color: '#3c3c50',
          textAlign: 'center',
          maxWidth: '650px',
          lineHeight: '1.5',
          marginBottom: '2rem',
        }}>
          Tribal Rights Intelligent Network for Empowerment through Technology, Research & Analysis
        </p>

        {/* Buttons */}
        <div style={{
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'center',
          gap: '20px',
          flexWrap: 'wrap',
        }}>
          {layers.map((layer, index) => (
            <motion.button
              key={layer.id}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ type: "spring", stiffness: 150, damping: 15, delay: index * 0.1 }}
              whileHover={{
                scale: 1.05,
                boxShadow: '0 0 20px 5px rgba(0,180,255,0.4)',
              }}
              whileTap={{ scale: 0.95 }}
              onClick={() => window.open(layer.url, "_blank")}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                flex: '1 1 180px',
                maxWidth: '250px',
                padding: '15px 25px',
                borderRadius: '16px',
                background: buttonGradient,
                color: 'white',
                fontWeight: 600,
                fontSize: '1.1rem',
                cursor: 'pointer',
                boxShadow: '0 8px 20px rgba(0,0,0,0.12)',
                border: 'none',
                transition: 'all 0.3s ease',
              }}
            >
              {layer.icon}
              {layer.label}
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* Footer */}
      <footer style={{
        marginTop: '3rem',
        width: '100%',
        textAlign: 'center',
        color: '#555',
        zIndex: 10,
      }}>
        <p>© {new Date().getFullYear()} TRINETRA Project. All rights reserved.</p>
      </footer>

    </div>
  );
}
