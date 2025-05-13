import { useState, useEffect, useRef } from "react";
import { Camera, Check, AlertCircle, RefreshCw } from "lucide-react";

export default function BarcodeScanner() {
  const [hasCamera, setHasCamera] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  
  const scannerContainerRef = useRef(null);
  const scannerInstanceRef = useRef(null);

  // Verificar disponibilidad de cámara
  useEffect(() => {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      setHasCamera(true);
    } else {
      setError("Tu dispositivo no soporta acceso a la cámara");
    }
  }, []);

  // Cargar la biblioteca HTML5 QR Code Scanner
  useEffect(() => {
    // Función para cargar el script desde CDN
    const loadHtml5QrcodeScannerScript = () => {
      return new Promise((resolve, reject) => {
        if (window.Html5Qrcode) {
          return resolve(window.Html5Qrcode);
        }
        
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html5-qrcode/2.3.8/html5-qrcode.min.js';
        script.async = true;
        script.onload = () => resolve(window.Html5Qrcode);
        script.onerror = () => reject(new Error("No se pudo cargar HTML5 QR Code Scanner"));
        document.body.appendChild(script);
      });
    };

    loadHtml5QrcodeScannerScript()
      .then(() => console.log("HTML5 QR Code Scanner cargado correctamente"))
      .catch(err => {
        console.error("Error al cargar la biblioteca:", err);
        setError("No se pudo cargar la biblioteca de escaneo");
      });
  }, []);

  // Iniciar el escáner
  const startScanner = async () => {
    setError("");
    setResult("");
    setScanning(true);
    
    try {
      // Verificar que la biblioteca esté cargada
      if (!window.Html5Qrcode) {
        throw new Error("La biblioteca de escaneo no está disponible");
      }
      
      // Crear una instancia del escáner
      const html5QrCode = new window.Html5Qrcode("scanner-container");
      scannerInstanceRef.current = html5QrCode;
      
      // Configuración del escáner
      const config = {
        fps: 10,               // Cuadros por segundo
        qrbox: { width: 250, height: 250 },  // Tamaño de la caja de escaneo
        aspectRatio: 1.0,      // Relación de aspecto de la cámara
        formatsToSupport: [    // Formatos a soportar
          0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 
          13, 14, 15, 16, 17, 18, 19, 20
        ]
      };
      
      // Iniciar el escáner con la cámara trasera
      await html5QrCode.start(
        { facingMode: "environment" }, // Preferir cámara trasera
        config,
        onScanSuccess,
        onScanFailure
      );
      
    } catch (err) {
      console.error("Error al iniciar el escáner:", err);
      setError("No se pudo iniciar el escáner: " + err.message);
      setScanning(false);
    }
  };

  // Función de éxito en el escaneo
  const onScanSuccess = (decodedText, decodedResult) => {
    // Detener el escáner cuando se detecte un código
    if (scannerInstanceRef.current) {
      scannerInstanceRef.current.stop()
        .then(() => {
          console.log("Escáner detenido correctamente");
          scannerInstanceRef.current = null;
          
          // Almacenar el resultado y actualizar el estado
          setResult(decodedText);
          setScanning(false);
        })
        .catch(err => {
          console.error("Error al detener el escáner:", err);
        });
    }
  };

  // Función para manejar errores de escaneo (no es necesario hacer nada aquí)
  const onScanFailure = (error) => {
    // No hacemos nada aquí para evitar inundar la consola con errores
    // ya que este método se llama cuando no hay un código en el frame
  };

  // Detener el escáner manualmente
  const stopScanner = () => {
    if (scannerInstanceRef.current) {
      scannerInstanceRef.current.stop()
        .then(() => {
          console.log("Escáner detenido correctamente");
          scannerInstanceRef.current = null;
          setScanning(false);
        })
        .catch(err => {
          console.error("Error al detener el escáner:", err);
          setError("Error al detener el escáner");
          setScanning(false);
        });
    }
  };

  // Función para reiniciar el escáner
  const resetScanner = () => {
    setResult("");
    setError("");
    startScanner();
  };

  // Limpiar al desmontar el componente
  useEffect(() => {
    return () => {
      if (scannerInstanceRef.current) {
        scannerInstanceRef.current.stop()
          .catch(err => console.error("Error al limpiar el escáner:", err));
      }
    };
  }, []);

  return (
    <div className="w-full max-w-md mx-auto p-4 bg-white rounded-lg shadow-lg">
      <h2 className="text-xl font-bold mb-4 text-center text-gray-800">Escáner de Códigos</h2>
      
      {/* Área para el escáner/resultado/error */}
      <div className="w-full aspect-square bg-gray-100 rounded-lg mb-4 overflow-hidden relative">
        {/* Contenedor para el escáner HTML5 QR Code */}
        <div 
          id="scanner-container" 
          ref={scannerContainerRef}
          className={`w-full h-full ${scanning ? 'block' : 'hidden'}`}
        ></div>
        
        {/* Mostrar resultado */}
        {result && !scanning && (
          <div className="flex flex-col items-center justify-center h-full w-full bg-green-100 p-4">
            <Check size={48} className="text-green-600 mb-2" />
            <p className="text-green-800 font-medium text-center mb-2">¡Código detectado!</p>
            <div className="bg-white px-4 py-2 rounded-lg w-full">
              <p className="font-bold text-gray-800 break-all text-center">{result}</p>
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
    </div>
  );
}