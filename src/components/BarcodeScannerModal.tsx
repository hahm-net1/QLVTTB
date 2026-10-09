import React, { useState, useEffect, useRef } from 'react';
import { Camera, X, Check, RefreshCw, Zap, AlertCircle } from 'lucide-react';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (serial: string) => void;
  itemTitle?: string;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onScanSuccess,
  itemTitle = 'vật tư',
}) => {
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualInput, setManualInput] = useState('');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
      setManualInput('');
      setCameraError(null);
    }
    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const startCamera = async () => {
    setCameraError(null);
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
        setCameraActive(true);
      } else {
        setCameraError('Trình duyệt không hỗ trợ truy cập máy ảnh trực tiếp.');
      }
    } catch (err: any) {
      console.warn('Camera access denied or unavailable:', err);
      setCameraError('Không thể mở Camera (chưa cấp quyền hoặc không có thiết bị). Bạn có thể nhập mã hoặc dùng nút Quét giả lập.');
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const handleSimulateScan = () => {
    const prefixes = ['VT24H', 'VT20G', 'MESH12S', 'SW2960', 'SN-CMW', 'MYTV4K'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const randomSerial = `${prefix}${Math.floor(100000 + Math.random() * 900000)}`;
    onScanSuccess(randomSerial);
    onClose();
  };

  const handleApplyManual = () => {
    if (manualInput.trim()) {
      onScanSuccess(manualInput.trim().toUpperCase());
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-slate-900 text-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-700 flex flex-col">
        {/* Header */}
        <div className="px-4 py-3 bg-[#004b93] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-cyan-300" />
            <div>
              <h3 className="font-bold text-sm">Quét mã vạch / Số Serial</h3>
              <p className="text-[11px] text-cyan-100 truncate max-w-[220px]">
                Gán cho: {itemTitle}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewport / Camera Scanner Area */}
        <div className="relative aspect-4/3 bg-black flex items-center justify-center overflow-hidden">
          {cameraActive ? (
            <video
              ref={videoRef}
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="text-center p-4">
              <Camera className="w-12 h-12 text-slate-600 mx-auto mb-2" />
              <p className="text-xs text-slate-400">
                {cameraError || 'Đang khởi động camera máy ảnh...'}
              </p>
            </div>
          )}

          {/* Scanner Overlay Frame */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="w-3/4 h-1/2 border-2 border-[#00a3e0] rounded-xl relative shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]">
              {/* Corner markers */}
              <div className="absolute -top-1 -left-1 w-4 h-4 border-t-4 border-l-4 border-cyan-400" />
              <div className="absolute -top-1 -right-1 w-4 h-4 border-t-4 border-r-4 border-cyan-400" />
              <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-4 border-l-4 border-cyan-400" />
              <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-4 border-r-4 border-cyan-400" />
              
              {/* Laser line animation */}
              <div className="w-full h-0.5 bg-rose-500 shadow-[0_0_8px_#ef4444] animate-bounce absolute top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <div className="absolute bottom-2 left-0 right-0 text-center pointer-events-none">
            <span className="text-[11px] bg-black/60 px-2 py-1 rounded text-cyan-300">
              Căn chỉnh mã vạch / Serial vào giữa khung đỏ
            </span>
          </div>
        </div>

        {/* Quick simulation button */}
        <div className="p-3 bg-slate-800 border-t border-slate-700 space-y-3">
          <button
            onClick={handleSimulateScan}
            className="w-full py-2.5 px-4 bg-[#00a3e0] hover:bg-cyan-500 active:bg-cyan-600 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-sm"
          >
            <Zap className="w-4 h-4 text-amber-200" />
            <span>Chụp & Nhận diện Serial mẫu (Mô phỏng 1 chạm)</span>
          </button>

          {/* Manual Input */}
          <div className="pt-2 border-t border-slate-700">
            <label className="text-[11px] text-slate-300 block mb-1">
              Hoặc nhập thủ công Số Serial:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="VD: VT24H881920..."
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleApplyManual();
                }}
                className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#00a3e0]"
              />
              <button
                onClick={handleApplyManual}
                disabled={!manualInput.trim()}
                className="px-3 py-2 bg-emerald-600 disabled:bg-slate-700 text-white rounded-lg text-xs font-semibold cursor-pointer disabled:cursor-not-allowed flex items-center gap-1"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Xác nhận</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
