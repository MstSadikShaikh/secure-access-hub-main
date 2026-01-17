import jsQR from 'jsqr';

export interface QRDecodeResult {
  success: boolean;
  data: string | null;
  error?: string;
}

export async function decodeQRFromImage(file: File): Promise<QRDecodeResult> {
  return new Promise((resolve) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);

      const imageData = ctx?.getImageData(0, 0, canvas.width, canvas.height);
      if (imageData) {
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        if (code?.data) {
          resolve({ success: true, data: code.data });
        } else {
          resolve({ success: false, data: null, error: 'No QR code found in image' });
        }
      } else {
        resolve({ success: false, data: null, error: 'Failed to process image' });
      }
      
      // Clean up
      URL.revokeObjectURL(img.src);
    };

    img.onerror = () => {
      resolve({ success: false, data: null, error: 'Failed to load image' });
      URL.revokeObjectURL(img.src);
    };

    img.src = URL.createObjectURL(file);
  });
}

export function isValidUrl(text: string): boolean {
  // Check if text is a valid URL or UPI link
  return (
    text.startsWith('http://') ||
    text.startsWith('https://') ||
    text.startsWith('upi://') ||
    text.startsWith('www.')
  );
}

export function normalizeUrl(text: string): string {
  if (text.startsWith('www.')) {
    return `https://${text}`;
  }
  return text;
}
