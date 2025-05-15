import React, { useEffect, useRef, useState } from 'react';
import { X, Camera, AlertCircle } from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

const DrawerEscanearCodigoBarras = ({ isOpen, onClose, onBarcodeScanned, colors }) => {
  const scannerRef = useRef(null);
  const scannerContainerRef = useRef(null);
  const [error, setError] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [cameras, setCameras] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState('');

  useEffect(() => {
    if (isOpen) {
      // Check for camera availability and list available cameras
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const fetchCameras = async () => {
          try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devices.filter(device => device.kind === 'videoinput');
            setCameras(videoDevices);

            // Prefer rear camera if available
            const backCamera = videoDevices.find(device =>
              device.label.toLowerCase().includes('back') ||
              device.label.toLowerCase().includes('trasera') ||
              device.label.toLowerCase().includes('rear')
            );
            setSelectedCamera(backCamera ? backCamera.deviceId : videoDevices[0]?.deviceId || '');
          } catch (err) {
            console.error('Error enumerating devices:', err);
            setError('No se pudieron detectar cámaras.');
          }
        };
        fetchCameras();
      } else {
        setError('Tu dispositivo no soporta acceso a la cámara.');
      }

      // Start scanner automatically
      setTimeout(() => startScanner(), 500);
    }

    // Cleanup on unmount or close
    return () => {
      if (scannerRef.current && isScanning) {
        scannerRef.current.stop().catch(err => console.error('Error stopping scanner:', err));
        scannerRef.current.clear();
      }
    };
  }, [isOpen]);

  const startScanner = async () => {
    setError('');
    setIsScanning(true);

    try {
      const html5QrCode = new Html5Qrcode('barcode-scanner', { verbose: false });
      scannerRef.current = html5QrCode;

      const config = {
        fps: 10,
        qrbox: { width: 280, height: 120 }, // Optimized for barcodes
        aspectRatio: window.innerWidth < 600 ? 1.0 : 3/1,
        formatsToSupport: [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.CODE_93,
          Html5QrcodeSupportedFormats.CODABAR,
          Html5QrcodeSupportedFormats.ITF,
        ],
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true,
        },
      };

      await html5QrCode.start(
        selectedCamera ? { deviceId: selectedCamera } : { facingMode: 'environment' },
        config,
        (decodedText) => {
          // On success, stop scanner, update parent input, and close
          if (scannerRef.current) {
            scannerRef.current.stop().then(() => {
              scannerRef.current = null;
              setIsScanning(false);
              onBarcodeScanned(decodedText);
              onClose();
            }).catch(err => console.error('Error stopping scanner:', err));
          }
        },
        () => {} // Ignore scan failures (e.g., NotFoundException)
      );
    } catch (err) {
      console.error('Error starting scanner:', err);
      setError('No se pudo iniciar el escáner: ' + err.message);
      setIsScanning(false);
    }
  };

  const stopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.stop().then(() => {
        scannerRef.current = null;
        setIsScanning(false);
      }).catch(err => {
        console.error('Error stopping scanner:', err);
        setError('Error al detener el escáner.');
        setIsScanning(false);
      });
    }
  };

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 bg-opacity-50 z-40" onClick={onClose} />
      )}
      <div
        className={`fixed inset-0 bg-white rounded-t-2xl shadow-lg z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
        style={{
          maxHeight: '100vh',
          overflowY: 'auto',
          '--tw-ring-color': colors.primary,
        }}
      >
        <div className="p-4 h-full flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Escanear Código de Barras</h2>
            <button onClick={onClose} disabled={isScanning}>
              <X className="h-6 w-6 text-gray-500" />
            </button>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="w-full max-w-lg h-80 bg-gray-100 rounded-lg overflow-hidden relative mb-4">
              <div
                id="barcode-scanner"
                ref={scannerContainerRef}
                className={`w-full h-full ${isScanning ? 'block' : 'hidden'}`}
                style={{ position: 'relative' }}
              >
                {isScanning && (
                  <div
                    className="absolute top-1/2 left-0 w-full h-0.5 bg-red-500 z-10 opacity-70"
                    style={{ transform: 'translateY(-50%)' }}
                  >
                    <div className="absolute left-0 h-16 w-0.5 bg-red-500" style={{ top: '-32px' }}></div>
                    <div className="absolute right-0 h-16 w-0.5 bg-red-500" style={{ top: '-32px' }}></div>
                  </div>
                )}
              </div>
              {error && !isScanning && (
                <div className="flex flex-col items-center justify-center h-full w-full bg-red-100 p-4">
                  <AlertCircle size={48} className="text-red-600 mb-2" />
                  <p className="text-red-800 font-medium text-center">{error}</p>
                </div>
              )}
              {!isScanning && !error && (
                <div className="flex flex-col items-center justify-center h-full p-4">
                  <Camera size={48} className="text-gray-400 mb-2" />
                  <p className="text-gray-500 text-center">Iniciando cámara...</p>
                </div>
              )}>
            </div>
            {cameras.length > 1 && !isScanning && (
              <div className="w-full max-w-md mb-4">
                <select
                  value={selectedCamera}
                  onChange={(e) => {
                    setSelectedCamera(e.target.value);
                    setTimeout(() => startScanner(), 300);
                  }}
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
            <p className="mt-2 text-sm text-gray-600 text-center">
              Alinea el código de barras con la línea roja para escanear.
            </p>
            {isScanning && !error && (
              <p className="mt-2 text-sm text-gray-500">Escaneando...</p>
            )}
            {isScanning && (
              <button
                onClick={stopScanner}
                className="mt-4 bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg"
              >
                Detener Escaneo
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default DrawerEscanearCodigoBarras;