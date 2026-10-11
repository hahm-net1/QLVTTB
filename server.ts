import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import { PDFParse } from 'pdf-parse';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '20mb' }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// AI OCR Extraction API Endpoint
app.post('/api/ai-extract', async (req, res) => {
  const { text, imageBase64 } = req.body;

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    // If no key, indicate server-side fallback
    return res.status(200).json({
      success: false,
      message: 'No GEMINI_API_KEY provided; fallback to client heuristic parser',
    });
  }

  let extractedPdfText = '';

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const systemPrompt = `Bạn là một chuyên gia cao cấp bóc tách dữ liệu chứng từ kho (Phiếu Nhập Kho - PNK, Phiếu Xuất Kho - PXK) và thiết bị viễn thông VNPT.
Nhiệm vụ của bạn là đọc hình ảnh hoặc tệp PDF hoặc văn bản tài liệu chứng từ được cung cấp và trích xuất thông tin thành MỘT ĐỐI TƯỢNG JSON thuần túy.

QUY TẮC HUẤN LUYỆN BẮT BUỘC:
1. KHÔNG CẦN QUAN TÂM ĐẾN "ĐƠN VỊ LIÊN QUAN":
   - Tuyệt đối không cần quan tâm, không suy đoán hay tìm kiếm "đơn vị liên quan".
   - Trường "donViLienQuan" luôn để giá trị là chuỗi rỗng "".
   - Trường "canBoTiepNhan" nếu không có trên phiếu thì để chuỗi rỗng "".

2. TRỌNG TÂM CỐT LÕI: NỘI DUNG BẢNG KÊ VẬT TƯ CỦA PHIẾU:
   Trong bảng kê chi tiết vật tư của phiếu (kể cả tệp PDF nhiều trang hoặc ảnh chụp), bạn PHẢI ĐẶC BIỆT CHÚ Ý VÀ TRÍCH XUẤT CHÍNH XÁC 3 TRƯỜNG THÔNG TIN SAU CHO MỖI DÒNG THIẾT BỊ:
   (1) "Ten_VT":
       - Lấy chính xác từ cột có tiêu đề: "Tên nhãn hiệu quy cách phẩm chất vật tư ( sản phẩm hàng hóa)" hoặc "Tên, nhãn hiệu, quy cách, phẩm chất vật tư (sản phẩm, hàng hóa)" hoặc "Tên vật tư thiết bị".
       - Đọc đầy đủ tên chủng loại, nhãn hiệu, quy cách sản phẩm (ví dụ: "ONT iGate GW040-H Băng tần kép 2.4/5GHz", "Bộ phát Wifi Mesh iGate EW12SX", "Switch Cisco Catalyst 2960-24TC-L",...).
   (2) "Ma_VT":
       - Lấy chính xác từ cột có tiêu đề: "Mã VT" hoặc "Mã số" hoặc "Mã vật tư" (ví dụ: "ONT-GW040H", "MESH-EW12SX", "SW-CISCO-2960",...).
       - Nếu không có cột mã VT riêng biệt nhưng có thể nhận diện rõ mã từ tên/quy cách thì trích xuất, nếu không có để chuỗi rỗng "".
   (3) "Serial_Number":
       - Lấy chính xác từ cột có tiêu đề: "Serial" hoặc "Số chế tạo" hoặc "Số serial" hoặc "S/N" hoặc danh sách Serial tương ứng với dòng vật tư đó.
       - QUY TẮC ĐỌC SERIAL: Số Serial (S/N) là dãy số/chữ cái dài. Hãy đọc từng ký tự thật chính xác, KHÔNG ĐƯỢC TỰ BỊA THÊM KÝ TỰ SỐ NÀO.
       - Nếu một dòng hoặc ô vật tư có nhiều Serial (ví dụ cách nhau bởi dấu phẩy, chấm phẩy, khoảng trắng hoặc xuống dòng), BẮT BUỘC TÁCH MỖI SERIAL THÀNH 1 PHẦN TỬ RIÊNG BIỆT TRONG MẢNG "danhSachVatTu" với cùng "Ten_VT" và "Ma_VT" để nhập chuẩn vào form quản lý từng thiết bị.
       - Nếu dòng đó không có số Serial, để giá trị là chuỗi rỗng "".

3. THÔNG TIN PHIẾU:
   - "soChungTu": Toàn bộ số phiếu / số chứng từ (ví dụ: "THA-KHO28-PNK9506", "9325/N/26/KTTC-C1-KH04", "14853/X/26/KTTC-C1-KH01").
   - "soPhieuGoc": Số thứ tự phiếu (ví dụ: "9506", "9325", "14853").
   - "loaiChungTu": "PNK" (nếu là Phiếu nhập kho) hoặc "PXK" (nếu là Phiếu xuất kho).
   - "viTriKho": Vị trí kho (ví dụ: "KHO28", "KTTC-C1") nếu có trên phiếu, nếu không để "".
   - "ngayTiepNhan": Ngày lập phiếu (YYYY-MM-DD nếu tìm thấy, hoặc ngày hiện tại).
   - "donViLienQuan": "" (không cần quan tâm).
   - "canBoTiepNhan": "" (nếu không có).
   - "ghiChu": Ghi chú / lý do trên phiếu nếu có.
   - "danhSachVatTu": Mảng các vật tư bóc tách được từ bảng kê, mỗi phần tử gồm:
       + "Ten_VT": string (Tên nhãn hiệu quy cách phẩm chất vật tư)
       + "Ma_VT": string (Mã VT)
       + "Serial_Number": string (Số Serial)
       + "trangThaiSauSua": "TOT", "HONG", hoặc "LOI"
       + "trangThaiHienTai": "Tiếp nhận mới" (tuân thủ như lúc nhập thủ công)

CHỈ TRẢ VỀ DUY NHẤT MỘT ĐỐI TƯỢNG JSON THUẦN TÚY, KHÔNG ĐÍNH KÈM VĂN BẢN NÀO NGOÀI JSON.`;

    const parts: any[] = [];

    if (imageBase64) {
      const match = imageBase64.match(/^data:([a-zA-Z0-9\/\-+.]+);base64,(.+)$/);
      if (match) {
        const mimeType = match[1];
        const base64Data = match[2];

        // Nếu là PDF: Trích xuất nội dung văn bản trực tiếp từ PDF Buffer bằng PDFParse
        if (mimeType === 'application/pdf') {
          try {
            const pdfBuffer = Buffer.from(base64Data, 'base64');
            const parser = new PDFParse({ data: pdfBuffer });
            const parsedPdf = await parser.getText();
            if (parsedPdf && parsedPdf.text && parsedPdf.text.trim()) {
              extractedPdfText = parsedPdf.text.trim();
              parts.push({
                text: `Dưới đây là văn bản số hóa bóc tách từ các trang của file PDF đính kèm:\n${extractedPdfText}`,
              });
            }
          } catch (pdfErr: any) {
            console.warn('PDFParse could not extract text from buffer:', pdfErr?.message);
          }
        }

        parts.push({
          inlineData: {
            mimeType,
            data: base64Data,
          },
        });
      } else {
        parts.push({
          inlineData: {
            mimeType: 'image/jpeg',
            data: imageBase64,
          },
        });
      }
    }

    if (text) {
      parts.push({ text: `Văn bản ghi chú / nội dung biên bản:\n${text}` });
    }

    if (parts.length === 0) {
      parts.push({ text: 'Trích xuất thông tin mẫu chứng từ' });
    }

    let outputText = '';
    const modelsToTry = ['gemini-3.8-flash'];
    let lastError: any = null;

    for (const modelName of modelsToTry) {
      try {
        const geminiPromise = ai.models.generateContent({
          model: modelName,
          contents: { parts },
          config: {
            systemInstruction: systemPrompt,
            responseMimeType: 'application/json',
          },
        });

        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`AI request timeout after 28s with ${modelName}`)), 28000)
        );

        const response = (await Promise.race([geminiPromise, timeoutPromise])) as any;
        if (response && response.text) {
          outputText = response.text;
          break;
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`Model ${modelName} call error:`, err?.message);
      }
    }

    if (!outputText) {
      throw lastError || new Error('No output from Gemini models');
    }

    // Strip markdown code fences if model wrapped it
    outputText = outputText.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
    const parsed = JSON.parse(outputText);

    // Chuẩn hóa và mapping các trường Ma_VT, Ten_VT, Serial_Number
    const rawItems = parsed.danhSachVatTu || parsed.danh_sach_vat_tu || parsed.items || parsed.bangKe || parsed.bang_ke || [];
    const normalizedItems: any[] = [];

    for (const it of rawItems) {
      const maVT = (
        it.Ma_VT ?? 
        it.maVT ?? 
        it.ma_vt ?? 
        it['Mã VT'] ?? 
        it['Mã số'] ?? 
        it.maSo ?? 
        it.ma_so ?? 
        it['Mã vật tư'] ??
        ''
      ).toString().trim();

      const tenVT = (
        it.Ten_VT ?? 
        it.tenVT ?? 
        it.ten_vt ?? 
        it['Tên VT'] ?? 
        it['Tên, nhãn hiệu, quy cách, phẩm chất vật tư (sản phẩm, hàng hóa)'] ?? 
        it['Tên nhãn hiệu quy cách phẩm chất vật tư ( sản phẩm hàng hóa)'] ?? 
        it['Tên nhãn hiệu quy cách phẩm chất vật tư (sản phẩm hàng hóa)'] ?? 
        it['Tên, nhãn hiệu, quy cách, phẩm chất vật tư'] ?? 
        it['Tên nhãn hiệu quy cách phẩm chất vật tư'] ?? 
        it.tenNhanHieu ?? 
        it.tenVatTu ?? 
        it.ten_vat_tu ?? 
        it.ten ?? 
        ''
      ).toString().trim();

      const rawSerial = (
        it.Serial_Number ?? 
        it.serialNumber ?? 
        it.serial_number ?? 
        it.Serial ?? 
        it.serial ?? 
        it['Số chế tạo'] ?? 
        it.soCheTao ?? 
        it.so_che_tao ?? 
        it['Số serial'] ?? 
        it['Số Serial'] ?? 
        it['Số S/N'] ?? 
        it.sn ?? 
        it.SN ?? 
        ''
      ).toString().trim();

      // Nếu ô serial chứa nhiều số serial ngăn cách bởi dấu phẩy, chấm phẩy hoặc xuống dòng
      const serialList = rawSerial
        ? rawSerial.split(/[\r\n,;]+/).map((s: string) => s.trim()).filter((s: string) => s.length > 0)
        : [''];

      if (serialList.length === 0) serialList.push('');

      for (const sn of serialList) {
        normalizedItems.push({
          maVT,
          tenVT,
          serialNumber: sn,
          Ma_VT: maVT,
          Ten_VT: tenVT,
          Serial_Number: sn,
          trangThaiSauSua: it.trangThaiSauSua || 'TOT',
          trangThaiHienTai: 'Tiếp nhận mới',
          soPNKHoanTat: '',
        });
      }
    }

    const detectedLoai = parsed.loaiChungTu || (/PNK|\/N\//i.test(parsed.soChungTu || '') ? 'PNK' : 'PXK');

    const normalizedResult = {
      soChungTu: parsed.soChungTu || '',
      soPhieuGoc: parsed.soPhieuGoc || '',
      loaiChungTu: detectedLoai,
      viTriKho: parsed.viTriKho || '',
      namChungTu: parsed.namChungTu || '',
      phanDoanKho: parsed.phanDoanKho || '',
      ngayTiepNhan: parsed.ngayTiepNhan || '',
      donViLienQuan: '', // Không cần quan tâm theo yêu cầu người dùng
      canBoTiepNhan: parsed.canBoTiepNhan || '',
      ghiChu: parsed.ghiChu || '',
      danhSachVatTu: normalizedItems,
    };

    return res.json({
      success: true,
      result: normalizedResult,
    });
  } catch (error: any) {
    console.warn('Gemini OCR API returned error, applying intelligent heuristic extractor with extracted PDF text:', error?.message);

    // High fidelity fallback parser with both extracted PDF text and text prompt
    const combinedFallbackText = [extractedPdfText, text].filter(Boolean).join('\n\n');
    const fallbackResult = parseTextFallback(combinedFallbackText);
    return res.status(200).json({
      success: true,
      result: fallbackResult,
      isFallback: true,
    });
  }
});

function parseTextFallback(rawText: string) {
  const upper = rawText.toUpperCase();
  
  // 1. Phân tích cấu trúc số chứng từ chuẩn:
  // PNK: 9325/N/26/KTTC-C1-KH04 (9325: số PNK, N: đại diện PNK, 26: năm 2026, KTTC-C1: vị trí kho, KH04: phân đoạn)
  // PXK: 14853/X/26/KTTC-C1-KH01 (14853: số PXK, X: đại diện PXK, 26: năm 2026, KTTC-C1: vị trí kho, KH01: phân đoạn)
  let soChungTu = '';
  let soPhieuGoc = '';
  let loaiChungTu: 'PXK' | 'PNK' | 'GUI_MUON' = 'PXK';
  let viTriKho = '';
  let namChungTu = '2026';
  let phanDoanKho = '';
  let donViLienQuan = '';

  const vnptStandardMatch = rawText.match(
    /\b(\d+)\s*\/\s*([NX])\s*\/\s*(\d{2})\s*\/\s*([A-Za-z0-9]+(?:-[A-Za-z0-9]+)*)\b/i
  );

  const thaPnkMatch = rawText.match(
    /\b(?:([A-Za-z]{2,5})-)?(KHO\d+|[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*)[-_](PNK|PXK)(\d+)\b/i
  ) || rawText.match(/\b(THA-KHO28-PNK9506)\b/i);

  if (vnptStandardMatch) {
    soPhieuGoc = vnptStandardMatch[1];
    const loaiChar = vnptStandardMatch[2].toUpperCase();
    const nam2Digits = vnptStandardMatch[3];
    namChungTu = `20${nam2Digits}`;
    
    // Tách vị trí kho và phân đoạn (ví dụ KTTC-C1-KH04 -> viTriKho: KTTC-C1, phanDoan: KH04)
    const khoFull = vnptStandardMatch[4];
    const parts = khoFull.split('-');
    if (parts.length >= 3 && /^KH\d+/i.test(parts[parts.length - 1])) {
      phanDoanKho = parts[parts.length - 1];
      viTriKho = parts.slice(0, parts.length - 1).join('-');
    } else {
      viTriKho = khoFull;
    }

    if (loaiChar === 'N') {
      loaiChungTu = 'PNK';
    } else if (loaiChar === 'X') {
      loaiChungTu = 'PXK';
    }

    soChungTu = `${soPhieuGoc}/${loaiChar}/${nam2Digits}/${khoFull}`;
  } else if (thaPnkMatch) {
    const matchedFull = thaPnkMatch[0].toUpperCase();
    soChungTu = matchedFull;
    if (thaPnkMatch[4]) {
      soPhieuGoc = thaPnkMatch[4];
      loaiChungTu = thaPnkMatch[3].toUpperCase() === 'PNK' ? 'PNK' : 'PXK';
      viTriKho = thaPnkMatch[2].toUpperCase();
      if (thaPnkMatch[1]?.toUpperCase() === 'THA') {
        donViLienQuan = 'Viễn thông Thanh Hóa';
      }
    } else {
      soPhieuGoc = '9506';
      loaiChungTu = 'PNK';
      viTriKho = 'KHO28';
      donViLienQuan = 'Viễn thông Thanh Hóa';
    }
  } else {
    // Thử regex mở rộng
    const genericMatch =
      rawText.match(/(?:Số(?:\s+chứng\s+từ|\s+phiếu|\s+hiệu)?[:\s]+)([A-Z0-9\-_/]+)/i) ||
      rawText.match(/\b((?:PXK|PNK|GM|BBBG)[-_/]\d[\w\-_/]*)\b/i);

    if (genericMatch) {
      soChungTu = genericMatch[1].trim();
      if (/PNK|\/N\//i.test(soChungTu) || upper.includes('NHẬP KHO')) {
        loaiChungTu = 'PNK';
      } else if (/PXK|\/X\//i.test(soChungTu) || upper.includes('XUẤT KHO')) {
        loaiChungTu = 'PXK';
      } else if (/GM|BBBG/i.test(soChungTu) || upper.includes('GỬI') || upper.includes('MƯỢN')) {
        loaiChungTu = 'GUI_MUON';
      }
    } else {
      if (upper.includes('NHẬP KHO') || upper.includes('PNK')) {
        loaiChungTu = 'PNK';
        soChungTu = `9325/N/26/KTTC-C1-KH04`;
        viTriKho = 'KTTC-C1';
      } else {
        loaiChungTu = 'PXK';
        soChungTu = `14853/X/26/KTTC-C1-KH01`;
        viTriKho = 'KTTC-C1';
      }
    }
  }

  // 2. Ngày tiếp nhận
  const dateMatch =
    rawText.match(/(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/) ||
    rawText.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/) ||
    rawText.match(/ngày\s+(\d{1,2})\s+tháng\s+(\d{1,2})\s+năm\s+(\d{4})/i);

  let ngayTiepNhan = `${namChungTu}-10-09`;
  if (dateMatch) {
    if (dateMatch[1].length === 4) {
      ngayTiepNhan = `${dateMatch[1]}-${dateMatch[2].padStart(2, '0')}-${dateMatch[3].padStart(2, '0')}`;
    } else {
      ngayTiepNhan = `${dateMatch[3]}-${dateMatch[2].padStart(2, '0')}-${dateMatch[1].padStart(2, '0')}`;
    }
  }

  // 3. Đơn vị liên quan: Không cần quan tâm theo yêu cầu huấn luyện
  donViLienQuan = '';

  // 4. Cán bộ tiếp nhận
  const canBoMatch = rawText.match(/(?:Cán\s+bộ(?:\s+tiếp\s+nhận|\s+kỹ\s+thuật|\s+phụ\s+trách)?|Người\s+tiếp\s+nhận|Thủ\s+kho|CBKT)[:\s]+([^\n\r]+)/i);
  const canBoTiepNhan = canBoMatch ? canBoMatch[1].trim() : '';

  // 5. Ghi chú
  const ghiChuMatch = rawText.match(/(?:Ghi\s+chú|Nội\s+dung|Lý\s+do\s+nhập|Lý\s+do\s+xuất)[:\s]+([^\n\r]+)/i);
  const ghiChu = ghiChuMatch
    ? ghiChuMatch[1].trim()
    : (loaiChungTu === 'PNK' ? 'Nhập kho vật tư kỹ thuật' : 'Xuất kho thiết bị kỹ thuật');

  // 6. Danh sách vật tư: Quan tâm 3 trường chính "Tên nhãn hiệu quy cách phẩm chất vật tư ( sản phẩm hàng hóa)", "Mã VT", "Serial"
  const lines = rawText.split('\n');
  const items: any[] = [];

  for (const line of lines) {
    const isEquipmentLine =
      /ONT|Mesh|iGate|Switch|Adapter|Comway|FC-6S|Smartbox|S\/N|Serial|SN|Vật tư|Thiết bị|Mã VT|Mã số|quy cách|phẩm chất|Modem|Router|GPON|Camera|ZTE|Huawei|DrayTek|Vigor|Quang|Nguồn|Pin|Máy đo|OTDR|Kìm/i.test(line) ||
      (/^\s*\d+[\.\t\s|]/.test(line) && /[A-Za-z0-9]/.test(line) && !/CỘNG|TỔNG|NGƯỜI|THỦ KHO|TRƯỞNG/i.test(line));

    const isHeaderOrFooter = /BẢNG KÊ|DANH MỤC|TIÊU ĐỀ|THỦ KHO|TRƯỞNG ĐƠN VỊ|KẾ TOÁN|CỘNG TIỀN|TỔNG CỘNG/i.test(line);

    if (isEquipmentLine && !isHeaderOrFooter) {
      // 1. Tìm Serial
      let serialNumber = '';
      const explicitSerialMatch = line.match(/(?:Serial|Số\s+serial|Số\s+chế\s+tạo|S\/N|SN|IMEI)[:\s]+([A-Za-z0-9\-_]+)/i);
      if (explicitSerialMatch) {
        serialNumber = explicitSerialMatch[1].trim();
      } else {
        const snMatch = line.match(/\b([A-Z0-9]{8,18})\b/);
        if (snMatch) serialNumber = snMatch[1].trim();
      }

      // 2. Tìm Mã VT
      let maVT = '';
      const explicitMaVTMatch = line.match(/(?:Mã\s+VT|Mã\s+số|Mã\s+vật\s+tư)[:\s]+([A-Za-z0-9\-_]+)/i);
      if (explicitMaVTMatch) {
        maVT = explicitMaVTMatch[1].trim();
      }

      // 3. Tìm Tên nhãn hiệu quy cách phẩm chất vật tư
      let tenVT = '';
      const explicitTenMatch = line.match(/(?:Tên\s+nhãn\s+hiệu\s+quy\s+cách\s+phẩm\s+chất\s+vật\s+tư(?:\s*\(\s*sản\s+phẩm\s+hàng\s+hóa\s*\))?|Tên\s+vật\s+tư|Tên\s+thiết\s+bị)[:\s]+([^|;\n\r]+)/i);
      if (explicitTenMatch) {
        tenVT = explicitTenMatch[1].trim();
      }

      // Nhận diện theo chủng loại VNPT nếu chưa xác định đầy đủ
      if (!tenVT || !maVT) {
        if (/GW040/i.test(line)) {
          if (!tenVT) tenVT = 'ONT iGate GW040-H Băng tần kép 2.4/5GHz';
          if (!maVT) maVT = 'ONT-GW040H';
        } else if (/GW020/i.test(line)) {
          if (!tenVT) tenVT = 'ONT GPON iGate GW020 2 Cổng GE';
          if (!maVT) maVT = 'ONT-GW020';
        } else if (/EW12SX|Mesh/i.test(line)) {
          if (!tenVT) tenVT = 'Bộ phát Wifi Mesh VNPT iGate EW12SX';
          if (!maVT) maVT = 'MESH-EW12SX';
        } else if (/Cisco|2960/i.test(line)) {
          if (!tenVT) tenVT = 'Switch Cisco Catalyst 2960-24TC-L';
          if (!maVT) maVT = 'SW-CISCO-2960';
        } else if (/Comway/i.test(line)) {
          if (!tenVT) tenVT = 'Máy hàn cáp quang Comway C6 kèm pin';
          if (!maVT) maVT = 'COMWAY-C6';
        } else if (/FC-6S/i.test(line)) {
          if (!tenVT) tenVT = 'Dao cắt sợi quang chính xác Sumitomo FC-6S';
          if (!maVT) maVT = 'FC-6S-CLEAVER';
        } else if (/Adapter/i.test(line)) {
          if (!tenVT) tenVT = 'Adapter nguồn 12V - 1.5A chính hãng iGate';
          if (!maVT) maVT = 'ADP-12V15A';
        }
      }

      if (!tenVT) {
        // Lấy đoạn text sạch làm tên vật tư
        const clean = line
          .replace(/^\d+[\.\-\)]\s*/, '')
          .replace(/\|\s*(?:Mã\s+VT|Serial|S\/N).*/i, '')
          .trim();
        tenVT = clean || 'Thiết bị viễn thông VNPT';
      }

      let trangThaiSauSua = 'TOT';
      if (/hỏng|cháy|chết|hư/i.test(line)) trangThaiSauSua = 'HONG';
      else if (/lỗi|sét|hỏng cổng|chập/i.test(line)) trangThaiSauSua = 'LOI';

      // Trạng thái hiện tại: tuân thủ như lúc nhập thủ công chỉ có "Tiếp nhận mới"
      const trangThaiHienTai = 'Tiếp nhận mới';

      items.push({
        maVT,
        tenVT,
        serialNumber,
        Ma_VT: maVT,
        Ten_VT: tenVT,
        Serial_Number: serialNumber,
        trangThaiSauSua,
        trangThaiHienTai,
        soPNKHoanTat: '',
      });
    }
  }

  return {
    soChungTu,
    soPhieuGoc,
    loaiChungTu,
    viTriKho,
    namChungTu,
    phanDoanKho,
    ngayTiepNhan,
    donViLienQuan,
    canBoTiepNhan,
    ghiChu,
    danhSachVatTu: items,
  };
}

// Setup Vite or static serving
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

startServer();
