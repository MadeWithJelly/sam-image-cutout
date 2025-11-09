import { useRef, useState } from 'react';

interface ImageInputProps {
  onImageSelected: (imageData: ImageData, imageElement: HTMLImageElement) => void;
}

export function ImageInput({ onImageSelected }: ImageInputProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      onImageSelected(imageData, img);
    };
    img.src = URL.createObjectURL(file);
  };

  const startWebcam = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 }
      });
      setStream(mediaStream);
      setIsCapturing(true);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error('Error accessing webcam:', err);
      alert('Could not access webcam. Please check permissions.');
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    const img = new Image();
    img.onload = () => {
      onImageSelected(imageData, img);
      stopWebcam();
    };
    img.src = canvas.toDataURL();
  };

  const stopWebcam = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      setIsCapturing(false);
    }
  };

  return (
    <div className="image-input">
      <div className="input-buttons">
        <button onClick={() => fileInputRef.current?.click()}>
          Upload Image
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleFileUpload}
        />

        {!isCapturing ? (
          <button onClick={startWebcam}>Use Webcam</button>
        ) : (
          <>
            <button onClick={capturePhoto}>Capture Photo</button>
            <button onClick={stopWebcam}>Cancel</button>
          </>
        )}
      </div>

      {isCapturing && (
        <div className="webcam-preview">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            style={{ maxWidth: '100%', borderRadius: '8px' }}
          />
        </div>
      )}
    </div>
  );
}
