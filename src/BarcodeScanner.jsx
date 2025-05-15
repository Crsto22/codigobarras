import { useState, useEffect, useRef } from "react";
import { Camera, Check, AlertCircle, RefreshCw, Smartphone, Copy, Monitor, History } from "lucide-react";
// Importar la biblioteca desde npm en lugar de cargarla desde CDN
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";

export default function BarcodeScanner() {
  const [hasCamera, setHasCamera] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [cameras, setCameras] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState("");
  const [scanHistory, setScanHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  
  const scannerContainerRef = useRef(null);
  const scannerInstanceRef = useRef(null);

  // Verificar disponibilidad de cámara y listar cámaras disponibles
  useEffect(() => {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      setHasCamera(true);
      
      // Intentar obtener la lista de cámaras disponibles
      const fetchCameras = async () => {
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const videoDevices = devices.filter(device => device.kind === 'videoinput');
          
          setCameras(videoDevices);
          
          // Seleccionar cámara trasera por defecto si está disponible
          const backCamera = videoDevices.find(device => 
            device.label.toLowerCase().includes('back') || 
            device.label.toLowerCase().includes('trasera') ||
            device.label.toLowerCase().includes('rear')
          );
          
          if (backCamera) {
            setSelectedCamera(backCamera.deviceId);
          } else if (videoDevices.length > 0) {
            setSelectedCamera(videoDevices[0].deviceId);
          }
          
        } catch (err) {
          console.error("Error al enumerar dispositivos:", err);
        }
      };
      
      fetchCameras();
    } else {
      setError("Tu dispositivo no soporta acceso a la cámara");
    }
    
    // Cargar historial del almacenamiento local
    const savedHistory = localStorage.getItem('qrScanHistory');
    if (savedHistory) {
      try {
        setScanHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error("Error al cargar historial:", e);
      }
    }
  }, []);

  // Iniciar el escáner
  const startScanner = async () => {
    setError("");
    setResult("");
    setScanning(true);
    
    try {
      // Crear una instancia del escáner usando la importación de npm
      const html5QrCode = new Html5Qrcode("scanner-container");
      scannerInstanceRef.current = html5QrCode;
      
      // Configuración del escáner
      const config = {
        fps: 10,               // Cuadros por segundo
        qrbox: { width: 250, height: 250 },  // Tamaño de la caja de escaneo
        aspectRatio: 1.0,      // Relación de aspecto de la cámara
        formatsToSupport: Object.values(Html5QrcodeSupportedFormats) // Usar todos los formatos disponibles
      };
      
      // Iniciar el escáner con la cámara seleccionada o la trasera por defecto
      await html5QrCode.start(
        selectedCamera ? { deviceId: selectedCamera } : { facingMode: "environment" },
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
          
          // Guardar en el historial
          const newScan = {
            text: decodedText,
            format: decodedResult.result.format.formatName,
            timestamp: new Date().toISOString()
          };
          
          const updatedHistory = [newScan, ...scanHistory].slice(0, 20); // Limitar a los últimos 20
          setScanHistory(updatedHistory);
          
          // Guardar en localStorage
          try {
            localStorage.setItem('qrScanHistory', JSON.stringify(updatedHistory));
          } catch (e) {
            console.error("Error al guardar en localStorage:", e);
          }
        })
        .catch(err => {
          console.error("Error al detener el escáner:", err);
        });
    }
  };

  // Copiar el resultado al portapapeles
  const copyToClipboard = () => {
    if (result) {
      navigator.clipboard.writeText(result)
        .then(() => {
          alert("Texto copiado al portapapeles");
        })
        .catch(err => {
          console.error("Error al copiar:", err);
          alert("No se pudo copiar el texto");
        });
    }
  };
  
  // Función para cargar un scan del historial
  const loadFromHistory = (scanItem) => {
    setResult(scanItem.text);
    setShowHistory(false);
  };
  
  // Limpiar historial
  const clearHistory = () => {
    setScanHistory([]);
    localStorage.removeItem('qrScanHistory');
    setShowHistory(false);
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

  // Formatear fecha para mostrar
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
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
      
      {/* Selección de cámara */}
      {cameras.length > 1 && !scanning && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Seleccionar cámara:</label>
          <select 
            value={selectedCamera}
            onChange={(e) => setSelectedCamera(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          >
            {cameras.map((camera, index) => (
              <option key={camera.deviceId} value={camera.deviceId}>
                {camera.label || `Cámara ${index + 1}`}
              </option>
            ))}
          </select>
        </div>
      )}
      
      {/* Área para el escáner/resultado/error */}
      <div className="w-full aspect-square bg-gray-100 rounded-lg mb-4 overflow-hidden relative">
        {/* Contenedor para el escáner HTML5 QR Code */}
        <div 
          id="scanner-container" 
          ref={scannerContainerRef}
          className={`w-full h-full ${scanning ? 'block' : 'hidden'}`}
        ></div>
        
        {/* Mostrar resultado */}
        {result && !scanning && !showHistory && (
          <div className="flex flex-col items-center justify-center h-full w-full bg-green-100 p-4">
            <Check size={48} className="text-green-600 mb-2" />
            <p className="text-green-800 font-medium text-center mb-2">¡Código detectado!</p>
            <div className="bg-white px-4 py-2 rounded-lg w-full mb-2">
              <p className="font-bold text-gray-800 break-all text-center">{result}</p>
            </div>
            <button
              onClick={copyToClipboard}
              className="flex items-center justify-center text-blue-600 text-sm px-2 py-1 rounded hover:bg-blue-50"
            >
              <Copy size={16} className="mr-1" />
              Copiar al portapapeles
            </button>
          </div>
        )}
        
        {/* Mostrar error */}
        {error && !scanning && !showHistory && (
          <div className="flex flex-col items-center justify-center h-full w-full bg-red-100 p-4">
            <AlertCircle size={48} className="text-red-600 mb-2" />
            <p className="text-red-800 font-medium text-center">{error}</p>
          </div>
        )}
        
        {/* Estado inicial */}
        {!scanning && !result && !error && !showHistory && (
          <div className="flex flex-col items-center justify-center h-full p-4">
            <Camera size={48} className="text-gray-400 mb-2" />
            <p className="text-gray-500 text-center">Haz clic en "Comenzar Escaneo" para detectar códigos</p>
          </div>
        )}
        
        {/* Mostrar historial */}
        {showHistory && (
          <div className="h-full w-full overflow-y-auto p-4">
            <h3 className="font-bold text-gray-800 mb-2">Historial de escaneos</h3>
            
            {scanHistory.length === 0 ? (
              <p className="text-gray-500">No hay elementos en el historial</p>
            ) : (
              <div className="space-y-2">
                {scanHistory.map((scan, index) => (
                  <div 
                    key={index} 
                    className="bg-white p-2 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50"
                    onClick={() => loadFromHistory(scan)}
                  >
                    <p className="font-medium text-gray-800 truncate">{scan.text}</p>
                    <div className="flex justify-between items-center text-xs text-gray-500">
                      <span>{scan.format}</span>
                      <span>{formatDate(scan.timestamp)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {scanHistory.length > 0 && (
              <button
                onClick={clearHistory}
                className="mt-4 text-red-600 text-sm font-medium hover:text-red-800"
              >
                Borrar historial
              </button>
            )}
          </div>
        )}
      </div>
      
      {/* Botones de control */}
      <div className="w-full space-y-2">
        {/* Botón para iniciar */}
        {!scanning && !showHistory && (
          <button
            onClick={startScanner}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg flex items-center justify-center transition-colors"
            disabled={!hasCamera}
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
        {(result || error) && !scanning && !showHistory && (
          <button
            onClick={resetScanner}
            className="w-full bg-gray-600 hover:bg-gray-700 text-white font-medium py-3 px-4 rounded-lg flex items-center justify-center transition-colors"
          >
            <RefreshCw className="mr-2" size={20} />
            Escanear Otro Código
          </button>
        )}
        
        {/* Botón para volver del historial */}
        {showHistory && (
          <button
            onClick={() => setShowHistory(false)}
            className="w-full bg-gray-600 hover:bg-gray-700 text-white font-medium py-3 px-4 rounded-lg flex items-center justify-center transition-colors"
          >
            <Camera className="mr-2" size={20} />
            Volver al Escáner
          </button>
        )}
      </div>
      
      {/* Botones adicionales */}
      <div className="mt-4 flex justify-between">
        {/* Botón de historial */}
        <button
          onClick={() => setShowHistory(!showHistory)}
          className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${
            showHistory ? 'bg-blue-100 text-blue-800' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <History size={16} className="mr-1" />
          Historial
        </button>
        
        {/* Cambiar cámara (si hay múltiples) */}
        {cameras.length > 1 && (
          <button
            className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-gray-600 hover:bg-gray-100"
          >
            <Smartphone size={16} className="mr-1" />
            Cámaras: {cameras.length}
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