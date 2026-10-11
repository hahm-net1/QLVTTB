import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';

/**
 * Xuất biên bản sang file PDF A4 chuẩn sắc nét và kích hoạt lệnh in ấn.
 * Sử dụng thư viện html2canvas-pro (hỗ trợ hoàn hảo Tailwind CSS v4, không gian màu oklch, oklab, hex, rgb)
 * kết hợp jsPDF để tạo tệp PDF A4 đa trang sắc nét, không bị trang trắng hoặc cắt cột.
 */
export async function generateVoucherPDF(
  element: HTMLElement,
  fileName: string = 'Bien-Ban-Giao-Nhan.pdf',
  triggerPrint: boolean = false
): Promise<void> {
  if (!element) {
    throw new Error('Không tìm thấy phần tử để tạo PDF');
  }

  // 1. Chuyển đổi phần tử biểu mẫu sang Canvas với độ phân giải cao (scale: 2)
  const canvas = await html2canvas(element, {
    scale: 2, // 2x DPI giúp chữ và nét kẻ sắc nét
    useCORS: true, // Cho phép nạp tài nguyên an toàn
    logging: false,
    backgroundColor: '#ffffff',
    windowWidth: 1024, // Giả lập màn hình desktop chuẩn để hiển thị toàn bộ cột bảng biểu
    scrollX: 0,
    scrollY: 0,
    onclone: (_clonedDoc, clonedElement) => {
      // Ẩn tất cả các nút hành động hoặc phần tử chỉ dùng trên màn hình
      clonedElement.querySelectorAll('.print\\:hidden').forEach((el) => {
        (el as HTMLElement).style.setProperty('display', 'none', 'important');
      });

      // Ẩn chế độ xem dạng thẻ trên điện thoại (sm:hidden)
      clonedElement.querySelectorAll('.sm\\:hidden').forEach((el) => {
        (el as HTMLElement).style.setProperty('display', 'none', 'important');
      });

      // Hiện trọn vẹn bảng biểu danh mục thiết bị chính thức (hidden sm:block và overflow-x-auto)
      clonedElement.querySelectorAll('.hidden.sm\\:block, .overflow-x-auto').forEach((el) => {
        const htmlEl = el as HTMLElement;
        htmlEl.style.setProperty('display', 'block', 'important');
        htmlEl.style.setProperty('overflow', 'visible', 'important');
        htmlEl.style.setProperty('width', '100%', 'important');
      });

      // Định dạng khung biên bản với chiều rộng khổ chuẩn A4, viền lề thoáng đẹp
      clonedElement.style.setProperty('width', '800px', 'important');
      clonedElement.style.setProperty('max-width', '800px', 'important');
      clonedElement.style.setProperty('min-width', '800px', 'important');
      clonedElement.style.setProperty('background-color', '#ffffff', 'important');
      clonedElement.style.setProperty('padding', '24px', 'important');
      clonedElement.style.setProperty('box-sizing', 'border-box', 'important');
      clonedElement.style.setProperty('box-shadow', 'none', 'important');
    },
  });

  if (!canvas || canvas.width === 0 || canvas.height === 0) {
    throw new Error('Không thể kết xuất hình ảnh của biểu mẫu');
  }

  const imgData = canvas.toDataURL('image/png');

  // 2. Khởi tạo tài liệu PDF khổ A4 tiêu chuẩn (210 x 297 mm)
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 8; // lề 8mm giúp biểu mẫu rộng rãi, trang nhã
  const contentWidth = pageWidth - margin * 2; // 194 mm
  const contentHeight = (canvas.height * contentWidth) / canvas.width;

  let heightLeft = contentHeight;
  let position = margin;
  let page = 1;

  // Trang đầu tiên
  pdf.addImage(imgData, 'PNG', margin, position, contentWidth, contentHeight, undefined, 'FAST');
  heightLeft -= (pageHeight - margin * 2);

  // Phân trang tự động nếu danh sách vật tư dài hơn 1 trang A4
  while (heightLeft > 0) {
    pdf.addPage();
    page++;
    position = margin - (page - 1) * (pageHeight - margin * 2);
    pdf.addImage(imgData, 'PNG', margin, position, contentWidth, contentHeight, undefined, 'FAST');

    // Che phủ nhẹ viền trên & dưới trang sau để giữ lề trang chuẩn mực
    pdf.setFillColor(255, 255, 255);
    pdf.rect(0, 0, pageWidth, margin, 'F');
    pdf.rect(0, pageHeight - margin, pageWidth, margin, 'F');

    heightLeft -= (pageHeight - margin * 2);
  }

  // 3. Tải tệp PDF về máy người dùng
  const safeFileName = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;
  pdf.save(safeFileName);

  // 4. Kích hoạt lệnh in ấn hệ thống nếu được yêu cầu
  if (triggerPrint) {
    setTimeout(() => {
      window.print();
    }, 400);
  }
}
