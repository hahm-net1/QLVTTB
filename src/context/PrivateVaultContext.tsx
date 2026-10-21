import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  hasVaultVerifier, 
  setVaultPin, 
  verifyPin, 
  encryptWithPin, 
  decryptWithPin,
  getSavedSessionPin,
  saveSessionPin,
  clearSessionPin 
} from '../utils/privateVault';
import { ShieldCheck, Lock, KeyRound, Eye, EyeOff, X, Check } from 'lucide-react';

interface PrivateVaultContextType {
  isUnlocked: boolean;
  activePin: string | null;
  hasPinConfigured: boolean;
  openStealthModal: () => void;
  lockVault: () => void;
  encryptNote: (text: string) => Promise<string>;
  decryptNote: (cipher: string) => Promise<string | null>;
}

const PrivateVaultContext = createContext<PrivateVaultContextType | undefined>(undefined);

export const PrivateVaultProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isUnlocked, setIsUnlocked] = useState<boolean>(false);
  const [activePin, setActivePin] = useState<string | null>(null);
  const [hasPinConfigured, setHasPinConfigured] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // Form states in Secret Modal
  const [pinInput, setPinInput] = useState<string>('');
  const [confirmPinInput, setConfirmPinInput] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Initialize and check if a session PIN was already saved or if verifier exists
  useEffect(() => {
    const configured = hasVaultVerifier();
    setHasPinConfigured(configured);

    const savedPin = getSavedSessionPin();
    if (savedPin) {
      if (configured) {
        verifyPin(savedPin).then((valid) => {
          if (valid) {
            setActivePin(savedPin);
            setIsUnlocked(true);
          } else {
            clearSessionPin();
          }
        });
      } else {
        // Active pin set previously in session
        setActivePin(savedPin);
        setIsUnlocked(true);
      }
    }
  }, []);

  // Keyboard shortcut listener for Stealth Mode (Ctrl+Shift+P, Alt+Shift+P, Ctrl+Shift+S)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey && e.shiftKey && (e.key === 'P' || e.key === 'p' || e.key === 'S' || e.key === 's')) ||
        (e.altKey && e.shiftKey && (e.key === 'P' || e.key === 'p'))
      ) {
        e.preventDefault();
        openStealthModal();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasPinConfigured]);

  const openStealthModal = useCallback(() => {
    setHasPinConfigured(hasVaultVerifier());
    setPinInput('');
    setConfirmPinInput('');
    setErrorMessage(null);
    setIsModalOpen(true);
  }, []);

  const closeStealthModal = () => {
    setIsModalOpen(false);
    setPinInput('');
    setConfirmPinInput('');
    setErrorMessage(null);
  };

  const lockVault = useCallback(() => {
    setActivePin(null);
    setIsUnlocked(false);
    clearSessionPin();
  }, []);

  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanPin = pinInput.trim();
    if (!cleanPin) {
      setErrorMessage('Vui lòng nhập Mã PIN.');
      return;
    }

    if (cleanPin.length < 4) {
      setErrorMessage('Mã PIN cần tối thiểu 4 ký tự/số.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (!hasPinConfigured) {
        // First-time setup: automatically initialize PIN
        if (cleanPin !== confirmPinInput.trim()) {
          setErrorMessage('Mã PIN xác nhận không khớp. Vui lòng kiểm tra lại.');
          setIsSubmitting(false);
          return;
        }

        await setVaultPin(cleanPin);
        setHasPinConfigured(true);
        setActivePin(cleanPin);
        saveSessionPin(cleanPin);
        setIsUnlocked(true);
        closeStealthModal();
      } else {
        // Existing PIN: Verify
        const isValid = await verifyPin(cleanPin);
        if (isValid) {
          setActivePin(cleanPin);
          saveSessionPin(cleanPin);
          setIsUnlocked(true);
          closeStealthModal();
        } else {
          setErrorMessage('Mã PIN không chính xác. Vui lòng thử lại!');
        }
      }
    } catch (err) {
      setErrorMessage('Có lỗi xảy ra khi xác thực PIN. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const encryptNote = useCallback(
    async (text: string): Promise<string> => {
      if (!text || !activePin) return text || '';
      return await encryptWithPin(text, activePin);
    },
    [activePin]
  );

  const decryptNote = useCallback(
    async (cipher: string): Promise<string | null> => {
      if (!cipher || !activePin) return cipher || null;
      return await decryptWithPin(cipher, activePin);
    },
    [activePin]
  );

  return (
    <PrivateVaultContext.Provider
      value={{
        isUnlocked,
        activePin,
        hasPinConfigured,
        openStealthModal,
        lockVault,
        encryptNote,
        decryptNote,
      }}
    >
      {children}

      {/* Stealth Mode Secret PIN Dialog (Only visible after secret trigger) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden transform scale-100 transition-all">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center">
                  <KeyRound className="w-5 h-5 text-indigo-300" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">
                    {!hasPinConfigured ? 'Kích hoạt Mã PIN Riêng tư' : 'Mở khóa Chế độ Riêng tư'}
                  </h3>
                  <p className="text-xs text-indigo-200">
                    Bảo mật ghi chú bằng mã hóa AES-256 đầu-cuối
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeStealthModal}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleModalSubmit} className="p-5 sm:p-6 space-y-4">
              {!hasPinConfigured ? (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 space-y-1">
                  <p className="font-semibold flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
                    Kích hoạt lần đầu:
                  </p>
                  <p>
                    Vui lòng đặt Mã PIN của bạn. Dữ liệu Private Note sẽ được mã hóa trực tiếp bằng PIN này trước khi lưu lên Firestore. Không ai khác có thể đọc được khi chưa mở khóa.
                  </p>
                </div>
              ) : (
                <p className="text-xs text-slate-600">
                  Nhập mã PIN bí mật của bạn để giải mã và quản lý các ghi chú riêng tư:
                </p>
              )}

              {errorMessage && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs px-3.5 py-2.5 rounded-xl font-medium animate-in shake">
                  {errorMessage}
                </div>
              )}

              {/* PIN input */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {!hasPinConfigured ? 'Tạo Mã PIN bí mật' : 'Nhập Mã PIN'}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={pinInput}
                    onChange={(e) => setPinInput(e.target.value)}
                    placeholder="Nhập mã PIN..."
                    autoFocus
                    maxLength={32}
                    className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm PIN if first time */}
              {!hasPinConfigured && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Xác nhận lại Mã PIN
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPinInput}
                    onChange={(e) => setConfirmPinInput(e.target.value)}
                    placeholder="Nhập lại mã PIN để xác nhận..."
                    maxLength={32}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                  />
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={closeStealthModal}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>{!hasPinConfigured ? 'Kích hoạt PIN' : 'Mở khóa'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PrivateVaultContext.Provider>
  );
};

export const usePrivateVault = (): PrivateVaultContextType => {
  const context = useContext(PrivateVaultContext);
  if (!context) {
    throw new Error('usePrivateVault must be used within PrivateVaultProvider');
  }
  return context;
};
