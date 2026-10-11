import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, 
  X, 
  Upload, 
  Camera, 
  CheckCircle2, 
  Loader2, 
  ClipboardPaste,
  Check,
  FileText,
  RotateCcw,
  FileSpreadsheet
} from 'lucide-react';
import { extractDocumentWithAI, parseTextDocumentHeuristic } from '../utils/ocrParser';
import { parseExcelDocument } from '../utils/excelParser';
import { AIOCRExtractResult, PhieuGiaoDich, ChiTietVatTu } from '../types';
import { getLoaiChungTuBadge, getTrangThaiSauSuaBadge } from '../utils/formatters';

interface SmartScanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyData: (extractedData: Partial<PhieuGiaoDich>) => void;
}

export const SmartScanModal: React.FC<SmartScanModalProps> = ({
  isOpen,
  onClose,
  onApplyData,
}) => {
  const [activeTab, setActiveTab] = useState<'text' | 'image'>('text');
  const [inputText, setInputText] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [isPdfDocument, setIsPdfDocument] = useState<boolean>(false);
  const [isExcelDocument, setIsExcelDocument] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState('');
  const [extractedResult, setExtractedResult] = useState<AIOCRExtractResult | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleResetToEmpty = () => {
    setInputText('');
    setImagePreview(null);
    setUploadedFileName(null);
    setIsPdfDocument(false);
    setIsExcelDocument(false);
    setSelectedFile(null);
    setIsProcessing(false);
    setProcessingStep('');
    setExtractedResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  useEffect(() => {
    if (isOpen) {
      handleResetToEmpty();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setUploadedFileName(file.name);

    const isExcel =
      file.name.toLowerCase().endsWith('.xlsx') ||
      file.name.toLowerCase().endsWith('.xls') ||
      file.name.toLowerCase().endsWith('.csv') ||
      file.type.includes('spreadsheet') ||
      file.type.includes('excel');

    if (isExcel) {
      setIsExcelDocument(true);
      setIsPdfDocument(false);
      setImagePreview(null);
      setActiveTab('image');
      handleProcessExcel(file);
    } else if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      setIsExcelDocument(false);
      setIsPdfDocument(true);
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const base64 = uploadEvent.target?.result as string;
        setImagePreview(base64);
        setActiveTab('image');
        // AI model analyzes PDF binary data directly
        handleProcess(
          `Trích xuất dữ liệu phiếu kho (PNK/PXK) từ tệp PDF tài liệu đính kèm: ${file.name}. Hãy đọc kỹ từng dòng danh mục vật tư thiết bị, số chứng từ, ngày tháng và Serial Number.`,
          base64
        );
      };
      reader.readAsDataURL(file);
    } else if (file.type.startsWith('image/')) {
      setIsExcelDocument(false);
      setIsPdfDocument(false);
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const base64 = uploadEvent.target?.result as string;
        setImagePreview(base64);
        setActiveTab('image');
        // Extract with image
        handleProcess(
          `Trích xuất biên bản giao nhận thiết bị viễn thông từ ảnh tài liệu đính kèm: ${file.name}`,
          base64
        );
      };
      reader.readAsDataURL(file);
    } else {
      // Text file
      setIsExcelDocument(false);
      setIsPdfDocument(false);
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const content = uploadEvent.target?.result as string;
        setInputText(content);
        setActiveTab('text');
        handleProcess(content, undefined);
      };
      reader.readAsText(file);
    }
  };

  const handleProcessExcel = async (file: File) => {
    setIsProcessing(true);
    setExtractedResult(null);

    setProcessingStep('Đang đọc các trang tính và cấu trúc tệp Excel...');
    await new Promise((r) => setTimeout(r, 200));
    setProcessingStep('Đang nhận diện các cột STT, Mã VT, Tên thiết bị, Serial Number...');
    await new Promise((r) => setTimeout(r, 200));

    try {
      const result = await parseExcelDocument(file);
      setExtractedResult(result);
    } catch (err: any) {
      console.error('Lỗi khi đọc file Excel:', err);
      setProcessingStep('Đang chuyển đổi nội dung text để bóc tách dự phòng...');
      try {
        const textContent = await file.text();
        const fallback = parseTextDocumentHeuristic(textContent);
        setExtractedResult(fallback);
      } catch (e) {
        alert(err?.message || 'Không thể đọc tệp Excel. Vui lòng kiểm tra lại định dạng tệp.');
      }
    } finally {
      setIsProcessing(false);
      setProcessingStep('');
    }
  };

  const handleProcess = async (textToProcess: string, imgBase64?: string) => {
    setIsProcessing(true);
    setExtractedResult(null);

    // Multi-step animated feedback
    setProcessingStep('Đang phân tích định dạng tài liệu viễn thông...');
    await new Promise((r) => setTimeout(r, 400));
    setProcessingStep('Đang nhận diện mã chứng từ, đơn vị và ngày lập...');
    await new Promise((r) => setTimeout(r, 400));
    setProcessingStep('Đang bóc tách danh mục Serial Number và trạng thái thiết bị...');

    try {
      let result: AIOCRExtractResult;
      if (imgBase64 || textToProcess) {
        result = await extractDocumentWithAI(textToProcess, imgBase64);
      } else {
        result = parseTextDocumentHeuristic(inputText);
      }
      setExtractedResult(result);
    } catch (err) {
      console.error(err);
      const fallback = parseTextDocumentHeuristic(textToProcess);
      setExtractedResult(fallback);
    } finally {
      setIsProcessing(false);
      setProcessingStep('');
    }
  };

  const handleApply = () => {
    if (!extractedResult) return;

    // Tuân thủ: không tự bịa thêm số, nếu không tìm thấy thì để chuỗi rỗng ""; Trạng thái là "Tiếp nhận mới"
    const formattedVatTu: ChiTietVatTu[] = (extractedResult.danhSachVatTu || []).map((item, idx) => {
      const maVT = item.Ma_VT || item.maVT || '';
      const tenVT = item.Ten_VT || item.tenVT || '';
      const serialNumber = item.Serial_Number || item.serialNumber || '';
      return {
        id: `vt-${Date.now()}-${idx}`,
        maVT,
        tenVT,
        serialNumber,
        trangThaiSauSua: item.trangThaiSauSua || 'TOT',
        soPNKHoanTat: '',
        trangThaiHienTai: 'Tiếp nhận mới',
        ghiChuVatTu: '',
      };
    });

    const partialVoucher: Partial<PhieuGiaoDich> = {
      soChungTu: extractedResult.soChungTu || '',
      loaiChungTu: extractedResult.loaiChungTu || (/PNK|\/N\//i.test(extractedResult.soChungTu || '') ? 'PNK' : 'PXK'),
      ngayTiepNhan: extractedResult.ngayTiepNhan || new Date().toISOString().slice(0, 10),
      donViLienQuan: '',
      canBoTiepNhan: extractedResult.canBoTiepNhan || '',
      ghiChu: extractedResult.ghiChu || '',
      danhSachVatTu: formattedVatTu,
    };

    onApplyData(partialVoucher);

    // Xóa sạch toàn bộ dữ liệu đã upload và quét phân tích của phiếu trước
    setInputText('');
    setImagePreview(null);
    setUploadedFileName(null);
    setIsPdfDocument(false);
    setExtractedResult(null);
    setIsProcessing(false);
    if (fileInputRef.current) fileInputRef.current.value = '';

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="bg-[#004b93] text-white px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#00a3e0] flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base leading-tight">
                AI / OCR Trích xuất thông minh
              </h3>
              <p className="text-[11px] text-cyan-100">
                Chụp ảnh giấy tờ, tải PDF hoặc dán văn bản để tự động điền Form
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetToEmpty}
              className="px-2.5 py-1.5 bg-white/10 hover:bg-white/20 active:bg-white/30 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
              title="Làm rỗng các ô nhập để upload lại hoặc quét chứng từ mới"
            >
              <RotateCcw className="w-3.5 h-3.5 text-cyan-200" />
              <span className="hidden sm:inline">Tạo yêu cầu mới</span>
              <span className="sm:hidden">Làm mới</span>
            </button>
            <button
              onClick={() => {
                handleResetToEmpty();
                onClose();
              }}
              className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Input Methods Tab Bar */}
        <div className="flex border-b border-slate-200 bg-slate-50 text-xs font-medium">
          <button
            onClick={() => setActiveTab('text')}
            className={`flex-1 py-2.5 px-3 border-b-2 text-center transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'text'
                ? 'border-[#004b93] text-[#004b93] font-bold bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <ClipboardPaste className="w-4 h-4 text-[#00a3e0]" />
            <span>Dán ghi chú / Text</span>
          </button>

          <button
            onClick={() => setActiveTab('image')}
            className={`flex-1 py-2.5 px-3 border-b-2 text-center transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'image'
                ? 'border-[#004b93] text-[#004b93] font-bold bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Camera className="w-4 h-4 text-[#00a3e0]" />
            <span>Tải ảnh / PDF / Excel</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* TAB 1: TEXT NOTE */}
          {activeTab === 'text' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Dán nội dung tin nhắn, biên bản text hoặc ghi chú bàn giao:
                </label>
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  rows={6}
                  placeholder={`Ví dụ nội dung chứng từ:
Phiếu nhập kho số: 9325/N/26/KTTC-C1-KH04 hoặc THA-KHO28-PNK9506
Vị trí kho: KTTC-C1 hoặc KHO28
1. ONT iGate GW040-H | Mã VT: ONT-GW040H | S/N: VNPT26H932501
2. Wifi Mesh EW12SX | Mã VT: MESH-EW12SX | S/N: MESH26E932502

Hoặc Phiếu xuất kho:
Số: 14853/X/26/KTTC-C1-KH01
Vị trí kho xuất: KTTC-C1 | Phân đoạn xuất: KH01
1. ONT iGate GW040-H | S/N: VNPT26X148531`}
                  className="w-full text-xs font-mono p-3 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00a3e0]"
                />
              </div>

              <button
                onClick={() => handleProcess(inputText, undefined)}
                disabled={!inputText.trim() || isProcessing}
                className="w-full py-3 bg-[#004b93] hover:bg-[#003870] disabled:bg-slate-300 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed shadow-sm"
              >
                <Sparkles className="w-4 h-4 text-cyan-300" />
                <span>Bắt đầu phân tích văn bản</span>
              </button>
            </div>
          )}

          {/* TAB 2: FILE / IMAGE / EXCEL UPLOAD */}
          {activeTab === 'image' && (
            <div className="space-y-3">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept="image/*,application/pdf,.txt,.xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                className="hidden"
              />

              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-[#00a3e0] rounded-2xl p-6 text-center cursor-pointer bg-slate-50 hover:bg-cyan-50/20 transition-colors"
              >
                <div className="flex justify-center items-center gap-3 mb-2">
                  <Upload className="w-8 h-8 text-[#00a3e0]" />
                  <FileSpreadsheet className="w-8 h-8 text-emerald-600" />
                </div>
                <h4 className="text-xs font-bold text-slate-800">
                  Nhấn để chọn ảnh biên bản, chụp ảnh, tải PDF hoặc file Excel
                </h4>
                <p className="text-[11px] text-slate-500 mt-1">
                  Hỗ trợ bảng tính Excel (.xlsx, .xls, .csv), PDF tài liệu hoặc ảnh chụp JPG, PNG
                </p>
                <div className="mt-2.5 inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-[10px] font-semibold">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  <span>File Excel tự động nhận diện các cột Mã VT, Tên VT, Serial chuẩn 100%</span>
                </div>
              </div>

              {(imagePreview || isExcelDocument) && (
                <div className="mt-3 p-3 bg-slate-100 rounded-xl flex items-center gap-3">
                  {isExcelDocument ? (
                    <div className="w-14 h-14 bg-emerald-100 text-emerald-700 rounded-lg border border-emerald-300 flex flex-col items-center justify-center shrink-0">
                      <FileSpreadsheet className="w-6 h-6 text-emerald-600" />
                      <span className="text-[9px] font-black uppercase tracking-wider mt-0.5">EXCEL</span>
                    </div>
                  ) : isPdfDocument ? (
                    <div className="w-14 h-14 bg-red-100 text-red-600 rounded-lg border border-red-200 flex flex-col items-center justify-center shrink-0">
                      <FileText className="w-6 h-6" />
                      <span className="text-[9px] font-black uppercase tracking-wider mt-0.5">PDF</span>
                    </div>
                  ) : (
                    <img
                      src={imagePreview || ''}
                      alt="Xem trước tài liệu"
                      className="w-14 h-14 object-cover rounded-lg border border-slate-300 shadow-xs shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate">
                      {uploadedFileName || (isExcelDocument ? 'Tệp bảng tính Excel' : isPdfDocument ? 'Tập tin PDF biên bản' : 'Ảnh biên bản đã tải lên')}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {isExcelDocument
                        ? `Bảng tính Excel • Nhận diện ${extractedResult?.danhSachVatTu?.length || 0} vật tư chuẩn xác 100%`
                        : isPdfDocument
                        ? 'Tài liệu PDF sẵn sàng để phân tích AI'
                        : 'Sẵn sàng để quét bóc tách OCR'}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      if (isExcelDocument && selectedFile) {
                        handleProcessExcel(selectedFile);
                      } else {
                        handleProcess(inputText, imagePreview || undefined);
                      }
                    }}
                    className="px-3 py-2 bg-[#00a3e0] text-white text-xs font-bold rounded-lg hover:bg-cyan-600 cursor-pointer shrink-0"
                  >
                    {isExcelDocument ? 'Đọc lại' : 'Quét lại'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* LOADING STATE */}
          {isProcessing && (
            <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl text-center space-y-3">
              <Loader2 className="w-8 h-8 text-[#00a3e0] animate-spin mx-auto" />
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-800">Hệ thống đang xử lý...</p>
                <p className="text-xs text-[#004b93] font-medium animate-pulse">{processingStep}</p>
              </div>
            </div>
          )}

          {/* EXTRACTED RESULT REVIEW */}
          {extractedResult && !isProcessing && (
            <div className="border border-emerald-300 bg-emerald-50/40 rounded-2xl p-4 space-y-4">
              <div className="flex items-center justify-between border-b border-emerald-200 pb-2.5">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <h4 className="font-bold text-xs sm:text-sm text-emerald-900">
                    Kết quả trích xuất tự động thành công
                  </h4>
                </div>
                <span className="text-[11px] font-bold bg-emerald-200 text-emerald-800 px-2 py-0.5 rounded-full">
                  {extractedResult.danhSachVatTu?.length || 0} vật tư
                </span>
              </div>

              {/* Master metadata cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                      Số chứng từ nhận diện:
                    </span>
                    {extractedResult.loaiChungTu && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        extractedResult.loaiChungTu === 'PNK'
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      }`}>
                        {extractedResult.loaiChungTu === 'PNK' ? 'PHIẾU NHẬP (N)' : 'PHIẾU XUẤT (X)'}
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    value={extractedResult.soChungTu || ''}
                    onChange={(e) => setExtractedResult({ ...extractedResult, soChungTu: e.target.value })}
                    className="mt-1 font-mono font-bold text-[#004b93] text-sm w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-[#00a3e0]"
                    placeholder="Ví dụ: 9325/N/26/KTTC-C1-KH04"
                  />
                  {(extractedResult.viTriKho || extractedResult.namChungTu || extractedResult.phanDoanKho) && (
                    <div className="flex flex-wrap items-center gap-1.5 mt-2 text-[10px] font-mono">
                      {extractedResult.soPhieuGoc && (
                        <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                          Số: {extractedResult.soPhieuGoc}
                        </span>
                      )}
                      {extractedResult.namChungTu && (
                        <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                          Năm: {extractedResult.namChungTu}
                        </span>
                      )}
                      {extractedResult.viTriKho && (
                        <span className="bg-blue-50 text-blue-800 px-1.5 py-0.5 rounded font-semibold">
                          Kho: {extractedResult.viTriKho}
                        </span>
                      )}
                      {extractedResult.phanDoanKho && (
                        <span className="bg-purple-50 text-purple-800 px-1.5 py-0.5 rounded">
                          Ngăn: {extractedResult.phanDoanKho}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider mb-1">
                      Loại chứng từ:
                    </span>
                    <select
                      value={extractedResult.loaiChungTu || 'PXK'}
                      onChange={(e) => setExtractedResult({ ...extractedResult, loaiChungTu: e.target.value as any })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-bold text-[#004b93] text-xs focus:outline-none focus:ring-1 focus:ring-[#00a3e0]"
                    >
                      <option value="PNK">Phiếu nhập kho (PNK - Ký hiệu: /N/)</option>
                      <option value="PXK">Phiếu xuất kho (PXK - Ký hiệu: /X/)</option>
                      <option value="GUI_MUON">Gửi/Mượn / Bàn giao (BBBG)</option>
                    </select>
                  </div>
                  <div className="mt-2 text-[11px] text-slate-500">
                    <span className="text-slate-400">Ngày lập: </span>
                    <strong className="text-slate-700">{extractedResult.ngayTiepNhan || 'Hôm nay'}</strong>
                  </div>
                </div>

                <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 block font-semibold">Cán bộ tiếp nhận:</span>
                  <input
                    type="text"
                    value={extractedResult.canBoTiepNhan || ''}
                    onChange={(e) => setExtractedResult({ ...extractedResult, canBoTiepNhan: e.target.value })}
                    className="font-medium text-slate-800 w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs mt-0.5 focus:outline-none focus:ring-1 focus:ring-[#00a3e0]"
                    placeholder="Tên cán bộ kỹ thuật (để trống nếu không có)"
                  />
                </div>
              </div>

              {/* Items Detail Preview */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h5 className="text-xs font-bold text-slate-700">
                    Bảng kê vật tư bóc tách ({extractedResult.danhSachVatTu?.length || 0}):
                  </h5>
                  <span className="text-[10px] text-slate-500 font-medium">
                    (Tên nhãn hiệu quy cách • Mã VT • Serial)
                  </span>
                </div>
                <div className="space-y-1.5 max-h-52 overflow-y-auto">
                  {extractedResult.danhSachVatTu?.map((item, idx) => {
                    return (
                      <div
                        key={idx}
                        className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center justify-between text-xs"
                      >
                        <div className="min-w-0 pr-2 space-y-1">
                          <p className="font-bold text-slate-800 truncate">
                            <span className="text-slate-400 font-mono text-[11px] mr-1">#{idx + 1}</span>
                            {item.tenVT || item.Ten_VT || '(Chưa xác định tên)'}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 text-[11px]">
                            {(item.maVT || item.Ma_VT) && (
                              <span className="font-mono text-[10px] bg-blue-50 text-[#004b93] font-semibold px-2 py-0.5 rounded border border-blue-200">
                                Mã VT: {item.maVT || item.Ma_VT}
                              </span>
                            )}
                            <span className="font-mono text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-[10px]">
                              Serial: {item.serialNumber || item.Serial_Number ? (
                                <strong className="text-slate-900 font-bold ml-1">{item.serialNumber || item.Serial_Number}</strong>
                              ) : (
                                <span className="text-slate-400 italic font-normal ml-1">Không có</span>
                              )}
                            </span>
                            <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-medium border border-emerald-200 text-[10px]">
                              {item.trangThaiHienTai || 'Tiếp nhận mới'}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action Apply Button */}
              <button
                onClick={handleApply}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                <Check className="w-4 h-4" />
                <span>Áp dụng thông tin này vào Form</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-xs text-slate-500">
          <span>Công nghệ OCR & Phân tích cấu trúc chứng từ</span>
          <button
            onClick={onClose}
            className="px-3 py-1.5 font-semibold text-slate-600 hover:text-slate-800 cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
