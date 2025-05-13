import { useState, useEffect, useRef } from "react";
import { Camera, Check, AlertCircle, RefreshCw } from "lucide-react";

export default function BarcodeScanner() {
  const [hasCamera, setHasCamera] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const scanIntervalRef = useRef(null);

  // Verificar disponibilidad de cámara
  useEffect(() => {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      setHasCamera(true);
    } else {
      setError("Tu dispositivo no soporta acceso a la cámara");
    }
  }, []);

  // Limpieza al desmontar
  useEffect(() => {
    return () => {
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Iniciar la cámara y el escaneo
  const startScanner = async () => {
    setError("");
    setResult("");
    setScanning(true);
    
    try {
      // Solicitar acceso a la cámara (preferiblemente la trasera)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      
      // Guardar referencia al stream
      streamRef.current = stream;
      
      // Asignar el stream al video y comenzar a reproducir
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        // Esperar a que el video esté listo para reproducirse
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play()
            .then(() => {
              // Comenzar a escanear una vez que el video esté reproduciéndose
              startScanningProcess();
            })
            .catch(err => {
              console.error("Error al reproducir el video:", err);
              setError("No se pudo iniciar la reproducción de video");
              stopScanner();
            });
        };
      }
    } catch (err) {
      console.error("Error al acceder a la cámara:", err);
      setError("No se pudo acceder a la cámara. Verifica los permisos del navegador.");
      setScanning(false);
    }
  };

  // Detener la cámara y el escaneo
  const stopScanner = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    setScanning(false);
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  // Iniciar el proceso de escaneo periódico
  const startScanningProcess = () => {
    // Asegurarse de que no haya un intervalo previo activo
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
    }
    
    // Configurar el intervalo para capturar y analizar frames
    scanIntervalRef.current = setInterval(() => {
      scanVideoFrame();
    }, 200); // Escanear cada 200ms (5 veces por segundo)
  };

  // Capturar y analizar un frame del video
  const scanVideoFrame = () => {
    if (!videoRef.current || !canvasRef.current || !scanning) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    // Ajustar el tamaño del canvas al video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Dibujar el frame actual en el canvas
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Obtener los datos de la imagen
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    try {
      // Usar jsQR para detectar códigos QR o de barras
      // (Cargado dinámicamente en tiempo de ejecución)
      if (window.jsQR) {
        const code = window.jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "dontInvert"
        });
        
        // Si se detecta un código
        if (code) {
          console.log("¡Código detectado!", code.data);
          setResult(code.data);
          stopScanner();
        }
      } else {
        console.warn("La biblioteca jsQR no está cargada");
      }
    } catch (err) {
      console.error("Error al procesar el frame:", err);
    }
  };

  // Función para restablecer y escanear de nuevo
  const resetScanner = () => {
    setResult("");
    setError("");
    startScanner();
  };

  // Efectos para cargar dinámicamente jsQR si no está disponible
  useEffect(() => {
    if (!window.jsQR) {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js';
      script.async = true;
      script.onload = () => console.log("jsQR cargado correctamente");
      script.onerror = () => setError("No se pudo cargar la biblioteca de escaneo");
      document.body.appendChild(script);
      
      return () => {
        document.body.removeChild(script);
      };
    }
  }, []);

  return (
    <div className="w-full max-w-md mx-auto p-4 bg-white rounded-lg shadow-lg">
      <h2 className="text-xl font-bold mb-4 text-center text-gray-800">Escáner de Códigos</h2>
      
      {/* Área para la cámara/resultado/error */}
      <div className="w-full aspect-square bg-gray-100 rounded-lg mb-4 overflow-hidden relative">
        {/* Video de la cámara */}
        {scanning && (
          <video 
            ref={videoRef}
            className="h-full w-full object-cover"
            playsInline 
            autoPlay
            muted
          />
        )}
        
        {/* Canvas oculto para procesar frames */}
        <canvas 
          ref={canvasRef} 
          className="hidden"
        />
        
        {/* Superponer cuadro de escáner si está escaneando */}
        {scanning && (
          <div className="absolute inset-0 border-2 border-red-500 rounded-lg pointer-events-none">
            <div className="absolute top-0 left-0 right-0 h-1 bg-red-500 animate-scan"></div>
          </div>
        )}
        
        {/* Mostrar resultado */}
        {result && !scanning && (
          <div className="flex flex-col items-center justify-center h-full w-full bg-green-100 p-4">
            <Check size={48} className="text-green-600 mb-2" />
            <p className="text-green-800 font-medium text-center mb-2">¡Código detectado!</p>
            <div className="bg-white px-4 py-2 rounded-lg w-full text-center">
              <p className="font-bold text-gray-800 break-all">{result}</p>
            </div>
          </div>
        )}
        
        {/* Mostrar error */}
        {error && !scanning && (
          <div className="flex flex-col items-center justify-center h-full w-full bg-red-100 p-4">
            <AlertCircle size={48} className="text-red-600 mb-2" />
            <p className="text-red-800 font-medium text-center">{error}</p>
          </div>
        )}
        
        {/* Estado inicial */}
        {!scanning && !result && !error && (
          <div className="flex flex-col items-center justify-center h-full p-4">
            <Camera size={48} className="text-gray-400 mb-2" />
            <p className="text-gray-500 text-center">Haz clic en "Comenzar Escaneo" para detectar códigos</p>
          </div>
        )}
      </div>
      
      {/* Botones de control */}
      <div className="w-full space-y-2">
        {/* Botón para iniciar */}
        {!scanning && !result && !error && (
          <button
            onClick={startScanner}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg flex items-center justify-center transition-colors"
          >
            <Camera className="mr-2" size={20} />
            Comenzar Escaneo
          </button>
        )}
        
        {/* Botón para detener */}
        {scanning && (
          <button
            onClick={stopScanner}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
          >
            Detener Escaneo
          </button>
        )}
        
        {/* Botón para reiniciar */}
        {(result || error) && (
          <button
            onClick={resetScanner}
            className="w-full bg-gray-600 hover:bg-gray-700 text-white font-medium py-3 px-4 rounded-lg flex items-center justify-center transition-colors"
          >
            <RefreshCw className="mr-2" size={20} />
            Escanear Otro Código
          </button>
        )}
      </div>
      
      {/* Instrucciones */}
      <div className="mt-4">
        <p className="text-sm text-gray-500 text-center">
          Apunta la cámara directamente al código para escanearlo automáticamente.
        </p>
      </div>
      
      {/* Estilos para la animación de escaneo */}
      <style jsx>{`
        @keyframes scan {
          0% { transform: translateY(0); }
          50% { transform: translateY(100%); }
          100% { transform: translateY(0); }
        }
        .animate-scan {
          animation: scan 1.5s linear infinite;
        }
      `}</style>
    </div>
  );
}