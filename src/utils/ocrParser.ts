import { AIOCRExtractResult, LoaiChungTu, TrangThaiSauSua } from '../types';
import { THIET_BI_MAU } from '../constants/sampleData';

/**
 * Heuristic client-side parser for OCR text / notes
 */
export function parseTextDocumentHeuristic(rawText: string): AIOCRExtractResult {
  const lines = rawText.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
  const result: AIOCRExtractResult = {
    danhSachVatTu: [],
    extractedText: rawText,
    confidenceScore: 90,
  };

  const upperText = rawText.toUpperCase();

  // 1. Phân tích cấu trúc số chứng từ chuẩn:
  // PNK: 9325/N/26/KTTC-C1-KH04 (9325: số PNK, N: đại diện PNK, 26: năm 2026, KTTC-C1: vị trí kho, KH04: phân đoạn)
  // PXK: 14853/X/26/KTTC-C1-KH01 (14853: số PXK, X: đại diện PXK, 26: năm 2026, KTTC-C1: vị trí kho, KH01: phân đoạn)
  const vnptStandardMatch = rawText.match(
    /\b(\d+)\s*\/\s*([NX])\s*\/\s*(\d{2})\s*\/\s*([A-Za-z0-9]+(?:-[A-Za-z0-9]+)*)\b/i
  );

  if (vnptStandardMatch) {
    const soPhieuGoc = vnptStandardMatch[1];
    const loaiChar = vnptStandardMatch[2].toUpperCase();
    const nam2Digits = vnptStandardMatch[3];
    result.soPhieuGoc = soPhieuGoc;
    result.namChungTu = `20${nam2Digits}`;

    const khoFull = vnptStandardMatch[4];
    const parts = khoFull.split('-');
    if (parts.length >= 3 && /^KH\d+/i.test(parts[parts.length - 1])) {
      result.phanDoanKho = parts[parts.length - 1];
      result.viTriKho = parts.slice(0, parts.length - 1).join('-');
    } else {
      result.viTriKho = khoFull;
    }

    if (loaiChar === 'N') {
      result.loaiChungTu = 'PNK';
    } else if (loaiChar === 'X') {
      result.loaiChungTu = 'PXK';
    }

    result.soChungTu = `${soPhieuGoc}/${loaiChar}/${nam2Digits}/${khoFull}`;
  } else {
    // 1b. Dự phòng nhận diện loại chứng từ & số chứng từ tổng quát
    if (upperText.includes('PHIẾU NHẬP KHO') || upperText.includes('PNK') || upperText.includes('NHẬP KHO')) {
      result.loaiChungTu = 'PNK';
    } else if (upperText.includes('PHIẾU XUẤT KHO') || upperText.includes('PXK') || upperText.includes('XUẤT KHO')) {
      result.loaiChungTu = 'PXK';
    } else if (upperText.includes('GỬI') || upperText.includes('MƯỢN') || upperText.includes('GM-') || upperText.includes('BBBG')) {
      result.loaiChungTu = 'GUI_MUON';
    } else {
      result.loaiChungTu = 'PXK';
    }

    const soChungTuMatch =
      rawText.match(/(?:Số(?:\s+chứng\s+từ|\s+phiếu|\s+hiệu)?[:\s]+)([A-Z0-9\-_/]+)/i) ||
      rawText.match(/\b((?:PXK|PNK|GM|BBBG)[-_/]\d[\w\-_/]*)\b/i);
    if (soChungTuMatch) {
      result.soChungTu = soChungTuMatch[1].trim();
      if (/PNK|\/N\//i.test(result.soChungTu)) result.loaiChungTu = 'PNK';
      else if (/PXK|\/X\//i.test(result.soChungTu)) result.loaiChungTu = 'PXK';
    }
  }

  // 2. Ngay Tiep Nhan
  const dateMatchVN = rawText.match(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/);
  const dateMatchISO = rawText.match(/(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  const dateMatchText = rawText.match(/ngày\s+(\d{1,2})\s+tháng\s+(\d{1,2})\s+năm\s+(\d{4})/i);

  if (dateMatchText) {
    const d = dateMatchText[1].padStart(2, '0');
    const m = dateMatchText[2].padStart(2, '0');
    const y = dateMatchText[3];
    result.ngayTiepNhan = `${y}-${m}-${d}`;
  } else if (dateMatchISO) {
    const y = dateMatchISO[1];
    const m = dateMatchISO[2].padStart(2, '0');
    const d = dateMatchISO[3].padStart(2, '0');
    result.ngayTiepNhan = `${y}-${m}-${d}`;
  } else if (dateMatchVN) {
    const d = dateMatchVN[1].padStart(2, '0');
    const m = dateMatchVN[2].padStart(2, '0');
    const y = dateMatchVN[3];
    result.ngayTiepNhan = `${y}-${m}-${d}`;
  } else {
    const currentYear = result.namChungTu || '2026';
    result.ngayTiepNhan = `${currentYear}-10-09`;
  }

  // 3. Don Vi Lien Quan
  const donViMatch =
    rawText.match(/(?:Đơn\s+vị(?:\s+liên\s+quan|\s+giao|\s+nhận|\s+giao\/nhận)?|Bên\s+mượn|Khách\s+hàng|Nơi\s+nhận)[:\s]+([^\n\r]+)/i);
  if (donViMatch) {
    result.donViLienQuan = donViMatch[1].trim();
  } else if (result.viTriKho) {
    result.donViLienQuan = result.phanDoanKho ? `Kho ${result.viTriKho} (${result.phanDoanKho})` : `Kho ${result.viTriKho}`;
  } else {
    result.donViLienQuan = 'Trung tâm Viễn thông VNPT';
  }

  // 4. Can Bo Tiep Nhan
  const canBoMatch =
    rawText.match(/(?:Cán\s+bộ(?:\s+tiếp\s+nhận|\s+kỹ\s+thuật|\s+phụ\s+trách)?|Người\s+tiếp\s+nhận|Thủ\s+kho|CBKT(?:\s+nhận)?|CBKT)[:\s]+([^\n\r]+)/i);
  if (canBoMatch) {
    result.canBoTiepNhan = canBoMatch[1].trim();
  }

  // 5. Ghi Chu
  const ghiChuMatch = rawText.match(/(?:Ghi\s+chú|Nội\s+dung|Lý\s+do|Mục\s+đích)[:\s]+([^\n\r]+)/i);
  if (ghiChuMatch) {
    result.ghiChu = ghiChuMatch[1].trim();
  } else {
    result.ghiChu = result.loaiChungTu === 'PNK' ? 'Nhập kho vật tư thiết bị sau bảo dưỡng / thu hồi' : 'Xuất kho thiết bị kỹ thuật';
  }

  // 6. Chi Tiet Vat Tu (Parse equipment lines)
  const vatTuItems: AIOCRExtractResult['danhSachVatTu'] = [];

  for (const line of lines) {
    // Check if line looks like an equipment line
    const isEquipmentLine =
      line.includes('S/N') ||
      line.includes('Serial') ||
      line.includes('SN') ||
      line.includes('Mã VT') ||
      line.includes('ONT') ||
      line.includes('Mesh') ||
      line.includes('iGate') ||
      line.includes('Switch') ||
      line.includes('Adapter') ||
      line.includes('Cáp') ||
      line.includes('Máy hàn') ||
      line.includes('Dao cắt') ||
      line.includes('Smartbox') ||
      line.includes('Thiết bị') ||
      line.includes('Vật tư');

    if (isEquipmentLine) {
      // Find serial number
      let serialNumber = '';
      const snMatch =
        line.match(/(?:S\/N|Serial|SN|IMEI)[:\s]+([A-Za-z0-9\-_]+)/i) ||
        line.match(/\b([A-Z]{2,}[0-9]{4,}[A-Za-z0-9]*)\b/) ||
        line.match(/\b([A-Z0-9]{8,18})\b/);
      if (snMatch) {
        serialNumber = snMatch[1].trim();
      }

      // Check Trang Thai Sau Sua (Tốt, Hỏng, Lỗi)
      let trangThaiSauSua: TrangThaiSauSua = 'TOT';
      if (/hỏng|cháy|chết|hư|kém/i.test(line)) {
        trangThaiSauSua = 'HONG';
      } else if (/lỗi|sét đánh|hỏng cổng|chập|chờ/i.test(line)) {
        trangThaiSauSua = 'LOI';
      } else if (/tốt|đạt|hoạt động bình thường|ok|chuẩn/i.test(line)) {
        trangThaiSauSua = 'TOT';
      }

      // Check Trang Thai Hien Tai: Tuân thủ như lúc nhập thủ công chỉ có trạng thái là "Tiếp nhận mới"
      const trangThaiHienTai = 'Tiếp nhận mới';

      // Match against VNPT equipment catalog
      let matchedCatalog = THIET_BI_MAU.find(
        (m) =>
          line.toLowerCase().includes(m.maVT.toLowerCase()) ||
          line.toLowerCase().includes(m.tenVT.toLowerCase().slice(0, 15))
      );

      let tenVT = '';
      let maVT = '';

      if (matchedCatalog) {
        maVT = matchedCatalog.maVT;
        tenVT = matchedCatalog.tenVT;
      } else {
        const cleanLine = line
          .replace(/^\d+[\.\-\)]\s*/, '')
          .replace(/\|\s*S\/N.*/i, '')
          .replace(/S\/N.*/i, '')
          .replace(/Mã VT[:\s]*/i, '')
          .trim();
        tenVT = cleanLine.slice(0, 50) || 'Thiết bị viễn thông VNPT';
        maVT = 'ONT-GW040H';
      }

      vatTuItems.push({
        maVT: maVT || '',
        tenVT: tenVT || '',
        serialNumber: serialNumber || '',
        Ma_VT: maVT || '',
        Ten_VT: tenVT || '',
        Serial_Number: serialNumber || '',
        trangThaiSauSua,
        soPNKHoanTat: '',
        trangThaiHienTai,
      });
    }
  }

  result.danhSachVatTu = vatTuItems;
  return result;
}

/**
 * Call AI OCR service with backend or fallback
 */
export async function extractDocumentWithAI(
  inputText: string,
  imageBase64?: string
): Promise<AIOCRExtractResult> {
  try {
    const res = await fetch('/api/ai-extract', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: inputText,
        imageBase64,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.success && data.result) {
        const rawRes = data.result;
        const normalizedItems = (rawRes.danhSachVatTu || []).map((it: any) => {
          const maVT = (it.Ma_VT ?? it.maVT ?? '').toString().trim();
          const tenVT = (it.Ten_VT ?? it.tenVT ?? '').toString().trim();
          const serialNumber = (it.Serial_Number ?? it.serialNumber ?? '').toString().trim();
          return {
            maVT,
            tenVT,
            serialNumber,
            Ma_VT: maVT,
            Ten_VT: tenVT,
            Serial_Number: serialNumber,
            trangThaiSauSua: it.trangThaiSauSua || 'TOT',
            trangThaiHienTai: 'Tiếp nhận mới',
            soPNKHoanTat: '',
          };
        });

        return {
          ...rawRes,
          danhSachVatTu: normalizedItems,
        };
      }
    }
  } catch (err) {
    console.warn('Backend /api/ai-extract not available or failed, falling back to local heuristic OCR parser', err);
  }

  // Fallback to high quality heuristic parser
  return parseTextDocumentHeuristic(inputText);
}
