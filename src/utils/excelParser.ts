import * as XLSX from 'xlsx';
import { AIOCRExtractResult, LoaiChungTu, TrangThaiSauSua } from '../types';

/**
 * Trích xuất thông tin phiếu và danh sách vật tư từ tệp Excel (.xlsx, .xls, .csv)
 */
export async function parseExcelDocument(file: File): Promise<AIOCRExtractResult> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });

  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    throw new Error('Tệp Excel không có trang tính (sheet) nào.');
  }

  // Chọn sheet đầu tiên có dữ liệu
  let selectedSheetName = workbook.SheetNames[0];
  let sheet = workbook.Sheets[selectedSheetName];
  
  // Chuyển sheet sang dạng mảng 2 chiều (mỗi dòng là một mảng ô)
  const rows: any[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: '',
    blankrows: false,
    raw: false,
  });

  if (!rows || rows.length === 0) {
    throw new Error('Trang tính Excel không có dữ liệu.');
  }

  const result: AIOCRExtractResult = {
    soChungTu: '',
    loaiChungTu: 'PNK',
    ngayTiepNhan: new Date().toISOString().split('T')[0],
    donViLienQuan: '',
    canBoTiepNhan: '',
    ghiChu: `Nhập từ file Excel: ${file.name}`,
    danhSachVatTu: [],
    confidenceScore: 100,
    extractedText: '',
  };

  // 1. Quét tìm thông tin chứng từ ở các dòng đầu tiên (metadata)
  const metaSearchLimit = Math.min(rows.length, 15);
  for (let r = 0; r < metaSearchLimit; r++) {
    const row = rows[r];
    const rowStr = row.map((c) => String(c || '').trim()).join(' ');

    // Tìm Số chứng từ / Số phiếu
    if (!result.soChungTu) {
      const matchSoCT = rowStr.match(/(?:Số\s*(?:chứng\s*từ|phiếu|CT|PNK|PXK)?[:\s]+)([A-Za-z0-9_\-\/\.]{4,35})/i) ||
                        rowStr.match(/\b(\d{3,6}\/[NX]\/\d{2}\/[A-Za-z0-9\-]+)\b/i) ||
                        rowStr.match(/\b([A-Z]{2,4}-[A-Z0-9]+-(?:PNK|PXK)\d+)\b/i);
      if (matchSoCT) {
        result.soChungTu = matchSoCT[1].trim();
      }
    }

    // Nhận diện loại chứng từ PNK / PXK
    if (/phiếu\s*xuất\s*kho|\bPXK\b|\/X\//i.test(rowStr)) {
      result.loaiChungTu = 'PXK';
    } else if (/phiếu\s*nhập\s*kho|\bPNK\b|\/N\//i.test(rowStr)) {
      result.loaiChungTu = 'PNK';
    } else if (/mượn|gửi|bàn\s*giao|bbbg/i.test(rowStr)) {
      result.loaiChungTu = 'BBBG';
    }

    // Tìm Ngày tháng
    const matchNgay = rowStr.match(/(?:ngày|date)[:\s]+(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/i) ||
                      rowStr.match(/(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/);
    if (matchNgay && !result.ngayTiepNhan) {
      if (matchNgay[3] && matchNgay[3].length === 4) {
        const dd = matchNgay[1].padStart(2, '0');
        const mm = matchNgay[2].padStart(2, '0');
        const yyyy = matchNgay[3];
        result.ngayTiepNhan = `${yyyy}-${mm}-${dd}`;
      }
    }

    // Tìm Đơn vị liên quan / Đơn vị giao nhận
    if (!result.donViLienQuan) {
      const matchDonVi = rowStr.match(/(?:đơn\s*vị|khách\s*hàng|người\s*giao|nơi\s*nhận|đối\s*tác)[:\s]+([^,;\n\t]{3,50})/i);
      if (matchDonVi) {
        result.donViLienQuan = matchDonVi[1].trim();
      }
    }

    // Tìm Cán bộ tiếp nhận / Người giao
    if (!result.canBoTiepNhan) {
      const matchCanBo = rowStr.match(/(?:cán\s*bộ|người\s*nhận|thủ\s*kho|người\s*lập)[:\s]+([^,;\n\t]{3,40})/i);
      if (matchCanBo) {
        result.canBoTiepNhan = matchCanBo[1].trim();
      }
    }
  }

  // 2. Tìm dòng tiêu đề (header) của bảng danh sách vật tư
  let headerRowIndex = -1;
  let colIndexMap = {
    stt: -1,
    maVT: -1,
    tenVT: -1,
    serialNumber: -1,
    trangThai: -1,
    ghiChu: -1,
  };

  for (let r = 0; r < Math.min(rows.length, 25); r++) {
    const row = rows[r];
    let foundKeywords = 0;

    let tempMap = {
      stt: -1,
      maVT: -1,
      tenVT: -1,
      serialNumber: -1,
      trangThai: -1,
      ghiChu: -1,
    };

    for (let c = 0; c < row.length; c++) {
      const val = String(row[c] || '').trim().toLowerCase();
      if (!val) continue;

      if (/^(stt|tt|no\.?)$/i.test(val)) {
        tempMap.stt = c;
        foundKeywords++;
      } else if (/(mã\s*(?:vt|vật\s*tư|tb|thiết\s*bị|hàng|sp)|ma_vt|item\s*code|part\s*number)/i.test(val)) {
        tempMap.maVT = c;
        foundKeywords += 2;
      } else if (/(tên\s*(?:vt|vật\s*tư|tb|thiết\s*bị|hàng|quy\s*cách|phẩm\s*chất)|ten_vt|description|item\s*name)/i.test(val)) {
        tempMap.tenVT = c;
        foundKeywords += 2;
      } else if (/(serial|s\/n|sn|serial\s*number|số\s*máy|số\s*khung|số\s*chế\s*tạo|s_n)/i.test(val)) {
        tempMap.serialNumber = c;
        foundKeywords += 3;
      } else if (/(trạng\s*thái|tình\s*trạng|chất\s*lượng|phẩm\s*chất|status)/i.test(val)) {
        tempMap.trangThai = c;
        foundKeywords++;
      } else if (/(ghi\s*chú|note|remark)/i.test(val)) {
        tempMap.ghiChu = c;
        foundKeywords++;
      }
    }

    // Nếu dòng có ít nhất 2 cột đặc trưng của bảng vật tư (ví dụ có Serial hoặc Tên VT hoặc Mã VT)
    if (foundKeywords >= 3 || (tempMap.serialNumber !== -1 && (tempMap.tenVT !== -1 || tempMap.maVT !== -1))) {
      headerRowIndex = r;
      colIndexMap = tempMap;
      break;
    }
  }

  // 3. Trích xuất danh sách vật tư theo các dòng dữ liệu
  const vatTuList: Array<{
    maVT: string;
    tenVT: string;
    serialNumber: string;
    trangThaiSauSua: TrangThaiSauSua;
  }> = [];

  const startRow = headerRowIndex !== -1 ? headerRowIndex + 1 : 0;

  for (let r = startRow; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.length === 0) continue;

    const rowFullText = row.map((c) => String(c || '').trim()).join(' ');
    // Bỏ qua các dòng tổng kết hoặc chữ ký
    if (/^(tổng\s*cộng|cộng|người\s*lập|thủ\s*kho|trưởng\s*đơn\s*vị|kế\s*toán|ký\s*tên|giám\s*đốc)/i.test(rowFullText)) {
      continue;
    }

    let maVT = '';
    let tenVT = '';
    let serialNumber = '';
    let trangThaiSauSua: TrangThaiSauSua = 'TOT';

    if (headerRowIndex !== -1) {
      if (colIndexMap.maVT !== -1 && row[colIndexMap.maVT]) {
        maVT = String(row[colIndexMap.maVT]).trim();
      }
      if (colIndexMap.tenVT !== -1 && row[colIndexMap.tenVT]) {
        tenVT = String(row[colIndexMap.tenVT]).trim();
      }
      if (colIndexMap.serialNumber !== -1 && row[colIndexMap.serialNumber]) {
        serialNumber = String(row[colIndexMap.serialNumber]).trim();
      }
      if (colIndexMap.trangThai !== -1 && row[colIndexMap.trangThai]) {
        const tt = String(row[colIndexMap.trangThai]).toLowerCase();
        if (tt.includes('hỏng') || tt.includes('hong') || tt.includes('bad')) trangThaiSauSua = 'HONG';
        else if (tt.includes('lỗi') || tt.includes('loi') || tt.includes('chờ')) trangThaiSauSua = 'LOI';
        else trangThaiSauSua = 'TOT';
      }
    }

    // Heuristic bổ sung: Nếu chưa tìm được qua header, dò tìm từng ô trong dòng
    if (!serialNumber || (!maVT && !tenVT)) {
      for (let c = 0; c < row.length; c++) {
        const cell = String(row[c] || '').trim();
        if (!cell) continue;

        // Nhận diện Serial: chuỗi từ 6-30 ký tự, có định dạng chữ số, hoặc bắt đầu bằng tiền tố viễn thông quen thuộc
        if (
          !serialNumber &&
          /^(VNPT|ALCL|HWTC|ZTE|SBC|G-?[0-9A-Z]{6,}|[A-Z0-9]{8,24})$/i.test(cell) &&
          !/^(TỔNG|CỘNG|PHIẾU|NGÀY|THÁNG|VNPT-)/i.test(cell)
        ) {
          serialNumber = cell;
        } else if (
          !maVT &&
          /^(ONT-|MESH-|GW|EW|AP-|SW-|MODEM-|ROUTER-|CAB-|VT-)/i.test(cell)
        ) {
          maVT = cell;
        } else if (
          !tenVT &&
          cell.length > 3 &&
          !/^\d+$/.test(cell) &&
          !cell.startsWith('202') &&
          !cell.includes('/')
        ) {
          if (!maVT) maVT = cell;
          else tenVT = cell;
        }
      }
    }

    // Nếu dòng có ít nhất Serial hoặc Tên/Mã thiết bị hợp lệ
    if (serialNumber || (tenVT && tenVT.length > 2) || (maVT && maVT.length > 2)) {
      // Chuẩn hóa tên thiết bị nếu trống
      if (!tenVT && maVT) tenVT = maVT;
      if (!maVT && tenVT) maVT = tenVT.split(/\s+/)[0] || 'VT-GEN';

      vatTuList.push({
        maVT,
        tenVT,
        serialNumber,
        trangThaiSauSua,
      });
    }
  }

  result.danhSachVatTu = vatTuList;

  // Tạo tóm tắt text hiển thị
  result.extractedText = `Tệp: ${file.name}\nTổng số dòng thiết bị trích xuất: ${vatTuList.length}\n` +
    vatTuList.map((v, i) => `${i + 1}. [${v.maVT}] ${v.tenVT} - S/N: ${v.serialNumber || '(Không có)'}`).join('\n');

  return result;
}
