import React, { useState } from 'react';
import BarcodeScannerComponent from "react-qr-barcode-scanner";

const BarcodeScanner = () => {
  const [data, setData] = useState('No se ha escaneado ningún código');

  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ width: '100%', maxWidth: '500px', margin: '0 auto' }}>
        <BarcodeScannerComponent
          width={'100%'}
          height={'100%'}
          onUpdate={(err, result) => {
            if (result) {
              setData(result.text);
            } else {
              setData('No se ha escaneado ningún código');
            }
          }}
        />
      </div>
      <p>{data}</p>
    </div>
  );
};

export default BarcodeScanner;
