import React, { useState, useMemo, useEffect } from 'react';
import { 
  BarChart3, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Wrench, 
  PackageCheck, 
  Send, 
  Layers, 
  FileText,
  TrendingUp,
  Download,
  FileSpreadsheet,
  Calendar,
  Clock,
  ChevronDown,
  ChevronUp,
  Cpu,
  X,
  Filter,
  Lock,
  KeyRound,
  ShieldCheck,
  Search,
  FlaskConical
} from 'lucide-react';
import { PhieuGiaoDich } from '../types';
import { usePrivateVault } from '../context/PrivateVaultContext';

interface DashboardStatsProps {
  vouchers: PhieuGiaoDich[];
  onExportCSV: () => void;
  onExportJSON: () => void;
  onNewVoucher: () => void;
}

type TimeGroupingMode = 'day' | 'week' | 'month' | 'year';

interface PrivateItemRecord {
  itemId: string;
  voucherId: string;
  soChungTu: string;
  loaiChungTu: string;
  ngayTiepNhan: string;
  donViLienQuan: string;
  maVT: string;
  tenVT: string;
  serialNumber: string;
  trangThaiSauSua: string;
  trangThaiHienTai: string;
  plainNote: string;
}

interface LabItemRecord {
  itemId: string;
  voucherId: string;
  soChungTu: string;
  loaiChungTu: string;
  ngayTiepNhan: string;
  donViLienQuan: string;
  canBoTiepNhan: string;
  maVT: string;
  tenVT: string;
  serialNumber: string;
  soLuong: number;
  trangThaiSauSua: string;
  trangThaiHienTai: string;
  ghiChuVatTu: string;
  plainPrivateNote?: string;
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({
  vouchers,
  onExportCSV,
  onExportJSON,
  onNewVoucher,
}) => {
  const { isUnlocked, activePin, decryptNote, lockVault } = usePrivateVault();

  // State bộ lọc phạm vi kho (Chỉ hiển thị khi đã mở khóa PIN bảo mật)
  const [warehouseScope, setWarehouseScope] = useState<'ALL' | 'REPAIR' | 'LAB'>('ALL');

  // State thống kê cá nhân (Ghi chú riêng tư)
  const [privateRecords, setPrivateRecords] = useState<PrivateItemRecord[]>([]);
  const [privateSearch, setPrivateSearch] = useState<string>('');
  const [privateStatusFilter, setPrivateStatusFilter] = useState<'ALL' | 'TOT' | 'HONG' | 'LOI'>('ALL');

  // State thống kê chuyên sâu Kho Lab (chỉ khi mở khóa PIN)
  const [labRecords, setLabRecords] = useState<LabItemRecord[]>([]);
  const [labSearch, setLabSearch] = useState<string>('');
  const [labStatusFilter, setLabStatusFilter] = useState<'ALL' | 'TOT' | 'HONG' | 'LOI'>('ALL');

  // State thống kê card sau sửa theo thời gian
  const [timeMode, setTimeMode] = useState<TimeGroupingMode>('day');
  const [statsStartDate, setStatsStartDate] = useState<string>('');
  const [statsEndDate, setStatsEndDate] = useState<string>('');
  const [expandedPeriodKey, setExpandedPeriodKey] = useState<string | null>(null);

  // Danh sách chứng từ theo quyền truy cập & phạm vi kho đã chọn
  // Khi chưa mở khóa bằng PIN: ẨN HOÀN TOÀN TẤT CẢ VẬT TƯ & PHIẾU KHO LAB
  const scopedVouchers = useMemo(() => {
    if (!isUnlocked) {
      return vouchers.filter((v) => !v.isLab);
    }
    if (warehouseScope === 'LAB') {
      return vouchers.filter((v) => v.isLab);
    }
    if (warehouseScope === 'REPAIR') {
      return vouchers.filter((v) => !v.isLab);
    }
    return vouchers;
  }, [vouchers, isUnlocked, warehouseScope]);

  // Compute metrics
  const totalVouchers = scopedVouchers.length;

  // Helper kiểm tra BBBG đã hoàn thành gán PNK
  const isCompletedBBBG = (v: PhieuGiaoDich) => {
    const isBB = v.loaiChungTu === 'GUI_MUON' || (v.loaiChungTu as string) === 'BBBG';
    if (!isBB) return false;
    const hasCompletedNote = Boolean(v.ghiChu && v.ghiChu.includes('Đã hoàn thành nhập kho đơn vị'));
    const allAssigned = Boolean(
      v.danhSachVatTu &&
      v.danhSachVatTu.length > 0 &&
      v.danhSachVatTu.every(
        (it) => it.soPNKHoanTat && it.soPNKHoanTat.trim() !== '' && it.trangThaiHienTai !== 'Tạm nhận'
      )
    );
    return hasCompletedNote || allAssigned;
  };

  // Số lượng BBBG đã hoàn thành gán PNK
  const completedBBBGVouchers = scopedVouchers.filter((v) => isCompletedBBBG(v));
  const countCompletedBBBG = completedBBBGVouchers.length;
  // Số lượng vật tư của BBBG đã hoàn thành gán PNK được loại trừ để chống trùng lặp
  const excludedCompletedItemsCount = completedBBBGVouchers.reduce((sum, v) => sum + v.danhSachVatTu.length, 0);

  // DANH SÁCH VẬT TƯ KIỂM ĐẾM TRONG KHO (CHỐNG TRÙNG LẶP):
  const allItems = scopedVouchers.flatMap((v) => {
    const isBB = v.loaiChungTu === 'GUI_MUON' || (v.loaiChungTu as string) === 'BBBG';
    if (!isBB) {
      return v.danhSachVatTu;
    }
    if (isCompletedBBBG(v)) {
      // Đã hoàn thành nhập kho đơn vị: KHÔNG kiểm đếm trong các thống kê kho
      return [];
    }
    // BBBG chưa hoàn thành: chỉ kiểm đếm các vật tư còn đang "Tạm nhận"
    return v.danhSachVatTu.filter((it) => !it.soPNKHoanTat || it.trangThaiHienTai === 'Tạm nhận');
  });

  const totalItems = allItems.reduce((sum, i) => sum + (Number(i.soLuong) || 1), 0);

  const countNKTot = allItems
    .filter((i) => i.trangThaiHienTai === 'NK tốt')
    .reduce((sum, i) => sum + (Number(i.soLuong) || 1), 0);

  const countNKHong = allItems
    .filter((i) => i.trangThaiHienTai === 'NK hỏng')
    .reduce((sum, i) => sum + (Number(i.soLuong) || 1), 0);

  const countKTT = allItems
    .filter((i) => i.trangThaiHienTai === 'Kiểm tra thêm' || i.trangThaiHienTai === 'Đang sửa chữa')
    .reduce((sum, i) => sum + (Number(i.soLuong) || 1), 0);

  const countTiepNhanMoi = allItems
    .filter((i) => !i.trangThaiHienTai || i.trangThaiHienTai === 'Tiếp nhận mới')
    .reduce((sum, i) => sum + (Number(i.soLuong) || 1), 0);

  const countTamNhan = allItems
    .filter((i) => i.trangThaiHienTai === 'Tạm nhận')
    .reduce((sum, i) => sum + (Number(i.soLuong) || 1), 0);

  const pctTot = totalItems > 0 ? Math.round((countNKTot / totalItems) * 100) : 0;
  const pctHong = totalItems > 0 ? Math.round((countNKHong / totalItems) * 100) : 0;
  const pctKTT = totalItems > 0 ? Math.round((countKTT / totalItems) * 100) : 0;
  const pctMoi = totalItems > 0 ? Math.round((countTiepNhanMoi / totalItems) * 100) : 0;
  const pctTamNhan = totalItems > 0 ? Math.round((countTamNhan / totalItems) * 100) : 0;

  // Voucher type breakdown
  const countPXK = scopedVouchers.filter((v) => v.loaiChungTu === 'PXK').length;
  const countPNK = scopedVouchers.filter((v) => v.loaiChungTu === 'PNK').length;
  const countGM = scopedVouchers.filter((v) => v.loaiChungTu === 'GUI_MUON' || (v.loaiChungTu as string) === 'BBBG').length;

  // Top equipment types (Mã VT & Tên VT)
  interface EquipStat {
    maVT: string;
    tenVT: string;
    count: number;
    countTot: number;
    countHong: number;
  }
  const equipMap: Record<string, EquipStat> = {};
  allItems.forEach((item) => {
    const ma = item.maVT?.trim() || '';
    const ten = item.tenVT?.trim() || '';
    const key = ma || ten || 'Chưa xác định';
    if (!equipMap[key]) {
      equipMap[key] = {
        maVT: ma || 'N/A',
        tenVT: ten || 'Chưa đặt tên vật tư',
        count: 0,
        countTot: 0,
        countHong: 0,
      };
    } else {
      if ((!equipMap[key].tenVT || equipMap[key].tenVT === 'Chưa đặt tên vật tư') && ten) {
        equipMap[key].tenVT = ten;
      }
      if ((equipMap[key].maVT === 'N/A' || !equipMap[key].maVT) && ma) {
        equipMap[key].maVT = ma;
      }
    }
    const qty = Number(item.soLuong) || 1;
    equipMap[key].count += qty;
    if (item.trangThaiHienTai === 'NK tốt') equipMap[key].countTot += qty;
    if (item.trangThaiHienTai === 'NK hỏng') equipMap[key].countHong += qty;
  });

  const topEquip = Object.values(equipMap)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // -------------------------------------------------------------
  // THỐNG KÊ SỐ CARD THEO THỜI GIAN
  // (theo ngày, theo tuần, theo tháng, theo năm)
  // -------------------------------------------------------------
  const postRepairCards = useMemo(() => {
    const list: Array<{
      id: string;
      soChungTu: string;
      loaiChungTu: string;
      maVT: string;
      tenVT: string;
      serialNumber: string;
      soLuong?: number;
      trangThaiSauSua: string;
      trangThaiHienTai: string;
      timestamp: number;
      dateStr: string;
      formattedTime: string;
    }> = [];

    scopedVouchers.forEach((v) => {
      (v.danhSachVatTu || []).forEach((it) => {
        const isPostRepair =
          it.trangThaiHienTai === 'NK tốt' ||
          it.trangThaiHienTai === 'NK hỏng' ||
          it.trangThaiHienTai === 'Kiểm tra thêm' ||
          it.trangThaiHienTai === 'Đang sửa chữa' ||
          (Boolean(it.trangThaiSauSua) && it.trangThaiHienTai !== 'Tiếp nhận mới' && it.trangThaiHienTai !== 'Tạm nhận' && it.trangThaiHienTai !== 'Đã gán');

        if (isPostRepair) {
          const rawTime = it.updatedAt || v.updatedAt || v.createdAt || v.ngayTiepNhan;
          let d: Date;
          if (rawTime && rawTime.length === 10 && rawTime.includes('-')) {
            const [y, m, day] = rawTime.split('-').map(Number);
            d = new Date(y, m - 1, day, 12, 0, 0);
          } else if (rawTime) {
            d = new Date(rawTime);
            if (isNaN(d.getTime())) d = new Date();
          } else {
            d = new Date();
          }

          const timestamp = d.getTime();
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          const dateStr = `${y}-${m}-${day}`;
          const hours = String(d.getHours()).padStart(2, '0');
          const minutes = String(d.getMinutes()).padStart(2, '0');
          const formattedTime = `${hours}:${minutes} ${day}/${m}/${y}`;

          list.push({
            id: it.id,
            soChungTu: v.soChungTu,
            loaiChungTu: v.loaiChungTu,
            maVT: it.maVT || '',
            tenVT: it.tenVT || 'Thiết bị viễn thông',
            serialNumber: it.serialNumber || '',
            soLuong: (it.soLuong ?? 0) > 0 ? Number(it.soLuong) : 1,
            trangThaiSauSua: it.trangThaiSauSua || (it.trangThaiHienTai === 'NK tốt' ? 'TOT' : it.trangThaiHienTai === 'NK hỏng' ? 'HONG' : 'LOI'),
            trangThaiHienTai: it.trangThaiHienTai,
            timestamp,
            dateStr,
            formattedTime,
          });
          }
        });
      });

      return list;
    }, [scopedVouchers]);

    // Lọc theo khoảng thời gian nếu người dùng chọn
    const filteredPostRepairCards = useMemo(() => {
      return postRepairCards.filter((card) => {
        if (statsStartDate && card.dateStr < statsStartDate) return false;
        if (statsEndDate && card.dateStr > statsEndDate) return false;
        return true;
      });
    }, [postRepairCards, statsStartDate, statsEndDate]);

    // Gom nhóm thống kê theo: ngày, tuần, tháng, năm
    const timeGroupedStats = useMemo(() => {
      interface PeriodBucket {
        key: string;
        label: string;
        subLabel: string;
        sortTime: number;
        total: number;
        tot: number;
        hong: number;
        ktt: number;
        cards: typeof filteredPostRepairCards;
      }

      const map: Record<string, PeriodBucket> = {};

      filteredPostRepairCards.forEach((card) => {
        const d = new Date(card.timestamp);
        let key = '';
        let label = '';
        let subLabel = '';
        let sortTime = 0;

        if (timeMode === 'day') {
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          key = `${year}-${month}-${day}`;
          label = `Ngày ${day}/${month}/${year}`;
          subLabel = `${day}/${month}/${year}`;
          sortTime = new Date(year, d.getMonth(), d.getDate()).getTime();
        } else if (timeMode === 'week') {
          const dayOfWeek = (d.getDay() + 6) % 7; // Monday = 0
          const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - dayOfWeek);
          const sunday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - dayOfWeek + 6);

          const mDay = String(monday.getDate()).padStart(2, '0');
          const mMonth = String(monday.getMonth() + 1).padStart(2, '0');
          const mYear = monday.getFullYear();

          const sDay = String(sunday.getDate()).padStart(2, '0');
          const sMonth = String(sunday.getMonth() + 1).padStart(2, '0');
          const sYear = sunday.getFullYear();

          const target = new Date(monday.valueOf());
          target.setDate(target.getDate() + 3);
          const firstThursday = target.valueOf();
          target.setMonth(0, 1);
          if (target.getDay() !== 4) {
            target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
          }
          const weekNum = 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);

          key = `${mYear}-W${String(weekNum).padStart(2, '0')}`;
          label = `Tuần ${weekNum} (${mYear})`;
          subLabel = `Từ ${mDay}/${mMonth}/${mYear} đến ${sDay}/${sMonth}/${sYear}`;
          sortTime = monday.getTime();
        } else if (timeMode === 'month') {
          const year = d.getFullYear();
          const month = d.getMonth() + 1;
          key = `${year}-${String(month).padStart(2, '0')}`;
          label = `Tháng ${String(month).padStart(2, '0')}/${year}`;
          subLabel = `Tháng ${month} năm ${year}`;
          sortTime = new Date(year, d.getMonth(), 1).getTime();
        } else {
          // year
          const year = d.getFullYear();
          key = `${year}`;
          label = `Năm ${year}`;
          subLabel = `Cả năm ${year}`;
          sortTime = new Date(year, 0, 1).getTime();
        }

        if (!map[key]) {
          map[key] = {
            key,
            label,
            subLabel,
            sortTime,
            total: 0,
            tot: 0,
            hong: 0,
            ktt: 0,
            cards: [],
          };
        }

        const cardQty = Number((card as any).soLuong) || 1;
        map[key].total += cardQty;
        const isTot = card.trangThaiHienTai === 'NK tốt' || card.trangThaiSauSua === 'TOT';
        const isHong = card.trangThaiHienTai === 'NK hỏng' || card.trangThaiSauSua === 'HONG';
        if (isTot) {
          map[key].tot += cardQty;
        } else if (isHong) {
          map[key].hong += cardQty;
        } else {
          map[key].ktt += cardQty;
        }
        map[key].cards.push(card);
      });

      return Object.values(map)
        .map((bucket) => ({
          ...bucket,
          cards: bucket.cards.sort((a, b) => b.timestamp - a.timestamp),
        }))
        .sort((a, b) => b.sortTime - a.sortTime);
    }, [filteredPostRepairCards, timeMode]);

    const totalCardsUpdated = filteredPostRepairCards.reduce((sum, c) => sum + (Number((c as any).soLuong) || 1), 0);
    const totalCardsTot = filteredPostRepairCards
      .filter((c) => c.trangThaiHienTai === 'NK tốt' || c.trangThaiSauSua === 'TOT')
      .reduce((sum, c) => sum + (Number((c as any).soLuong) || 1), 0);
    const totalCardsHong = filteredPostRepairCards
      .filter((c) => c.trangThaiHienTai === 'NK hỏng' || c.trangThaiSauSua === 'HONG')
      .reduce((sum, c) => sum + (Number((c as any).soLuong) || 1), 0);
    const totalCardsKTT = filteredPostRepairCards
      .filter((c) => c.trangThaiHienTai !== 'NK tốt' && c.trangThaiSauSua !== 'TOT' && c.trangThaiHienTai !== 'NK hỏng' && c.trangThaiSauSua !== 'HONG')
      .reduce((sum, c) => sum + (Number((c as any).soLuong) || 1), 0);
    const pctCardsTot = totalCardsUpdated > 0 ? Math.round((totalCardsTot / totalCardsUpdated) * 100) : 0;

  // Giải mã các ghi chú riêng tư khi mở khóa bảo mật
  useEffect(() => {
    if (!isUnlocked || !activePin) {
      setPrivateRecords([]);
      return;
    }

    let isMounted = true;
    const loadPrivateRecords = async () => {
      const list: PrivateItemRecord[] = [];
      for (const v of vouchers) {
        for (const it of (v.danhSachVatTu || [])) {
          if (it.privateNote && it.privateNote.trim()) {
            const plain = await decryptNote(it.privateNote);
            if (plain) {
              list.push({
                itemId: it.id,
                voucherId: v.id,
                soChungTu: v.soChungTu,
                loaiChungTu: v.loaiChungTu,
                ngayTiepNhan: v.ngayTiepNhan,
                donViLienQuan: v.donViLienQuan,
                maVT: it.maVT || '',
                tenVT: it.tenVT || '',
                serialNumber: it.serialNumber || '',
                trangThaiSauSua: it.trangThaiSauSua,
                trangThaiHienTai: it.trangThaiHienTai || '',
                plainNote: plain,
              });
            }
          }
        }
      }
      if (isMounted) {
        setPrivateRecords(list);
      }
    };

    loadPrivateRecords();
    return () => {
      isMounted = false;
    };
  }, [vouchers, isUnlocked, activePin, decryptNote]);

  // Bộ lọc danh sách ghi chú riêng tư cá nhân
  const filteredPrivateRecords = useMemo(() => {
    return privateRecords.filter((rec) => {
      if (privateStatusFilter !== 'ALL' && rec.trangThaiSauSua !== privateStatusFilter) {
        return false;
      }
      if (!privateSearch.trim()) return true;
      const q = privateSearch.toLowerCase();
      return (
        rec.serialNumber.toLowerCase().includes(q) ||
        rec.tenVT.toLowerCase().includes(q) ||
        rec.maVT.toLowerCase().includes(q) ||
        rec.soChungTu.toLowerCase().includes(q) ||
        rec.plainNote.toLowerCase().includes(q) ||
        rec.donViLienQuan.toLowerCase().includes(q)
      );
    });
  }, [privateRecords, privateSearch, privateStatusFilter]);

  const privateCountTot = privateRecords.filter((r) => r.trangThaiSauSua === 'TOT').length;
  const privateCountHong = privateRecords.filter((r) => r.trangThaiSauSua === 'HONG').length;
  const privateCountLoi = privateRecords.filter((r) => r.trangThaiSauSua === 'LOI').length;

  const handleExportPrivateCSV = () => {
    if (privateRecords.length === 0) return;
    const headers = ['STT', 'Số chứng từ', 'Ngày lập', 'Đơn vị', 'Mã VT', 'Tên thiết bị', 'Số Serial', 'Trạng thái', 'Ghi chú riêng tư'];
    const rows = privateRecords.map((r, i) => [
      i + 1,
      `"${r.soChungTu}"`,
      `"${r.ngayTiepNhan}"`,
      `"${r.donViLienQuan}"`,
      `"${r.maVT}"`,
      `"${r.tenVT}"`,
      `"${r.serialNumber}"`,
      `"${r.trangThaiSauSua}"`,
      `"${r.plainNote.replace(/"/g, '""')}"`,
    ]);
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Thong_ke_Ghi_chu_rieng_tu_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  };

  // Tải danh sách vật tư thuộc Kho Lab khi đã mở khóa bảo mật
  useEffect(() => {
    if (!isUnlocked || !activePin) {
      setLabRecords([]);
      return;
    }

    let isMounted = true;
    const loadLabRecords = async () => {
      const list: LabItemRecord[] = [];
      for (const v of vouchers) {
        const voucherIsLab = Boolean(v.isLab);
        for (const it of (v.danhSachVatTu || [])) {
          if (voucherIsLab || it.isLab) {
            let plainNote = '';
            if (it.privateNote && it.privateNote.trim()) {
              plainNote = (await decryptNote(it.privateNote)) || '';
            }
            list.push({
              itemId: it.id,
              voucherId: v.id,
              soChungTu: v.soChungTu,
              loaiChungTu: v.loaiChungTu,
              ngayTiepNhan: v.ngayTiepNhan,
              donViLienQuan: v.donViLienQuan,
              canBoTiepNhan: v.canBoTiepNhan,
              maVT: it.maVT || '',
              tenVT: it.tenVT || '',
              serialNumber: it.serialNumber || '',
              soLuong: (it.soLuong ?? 0) > 0 ? Number(it.soLuong) : 1,
              trangThaiSauSua: it.trangThaiSauSua || 'TOT',
              trangThaiHienTai: it.trangThaiHienTai || '',
              ghiChuVatTu: it.ghiChuVatTu || '',
              plainPrivateNote: plainNote,
            });
          }
        }
      }
      if (isMounted) {
        setLabRecords(list);
      }
    };

    loadLabRecords();
    return () => {
      isMounted = false;
    };
  }, [vouchers, isUnlocked, activePin, decryptNote]);

  // Bộ lọc danh mục vật tư Kho Lab
  const filteredLabRecords = useMemo(() => {
    return labRecords.filter((rec) => {
      if (labStatusFilter !== 'ALL' && rec.trangThaiSauSua !== labStatusFilter) {
        return false;
      }
      if (!labSearch.trim()) return true;
      const q = labSearch.toLowerCase();
      return (
        rec.serialNumber.toLowerCase().includes(q) ||
        rec.tenVT.toLowerCase().includes(q) ||
        rec.maVT.toLowerCase().includes(q) ||
        rec.soChungTu.toLowerCase().includes(q) ||
        rec.ghiChuVatTu.toLowerCase().includes(q) ||
        (rec.plainPrivateNote && rec.plainPrivateNote.toLowerCase().includes(q)) ||
        rec.donViLienQuan.toLowerCase().includes(q)
      );
    });
  }, [labRecords, labSearch, labStatusFilter]);

  const labTotalQty = labRecords.reduce((sum, r) => sum + (Number(r.soLuong) || 1), 0);
  const labCountTot = labRecords
    .filter((r) => r.trangThaiSauSua === 'TOT' || r.trangThaiHienTai === 'NK tốt')
    .reduce((sum, r) => sum + (Number(r.soLuong) || 1), 0);
  const labCountHong = labRecords
    .filter((r) => r.trangThaiSauSua === 'HONG' || r.trangThaiHienTai === 'NK hỏng')
    .reduce((sum, r) => sum + (Number(r.soLuong) || 1), 0);
  const labCountKTT = labRecords
    .filter(
      (r) =>
        r.trangThaiSauSua === 'LOI' ||
        r.trangThaiHienTai === 'Kiểm tra thêm' ||
        r.trangThaiHienTai === 'Đang sửa chữa' ||
        r.trangThaiHienTai === 'Tạm nhận'
    )
    .reduce((sum, r) => sum + (Number(r.soLuong) || 1), 0);

  const handleExportLabCSV = () => {
    if (labRecords.length === 0) return;
    const headers = [
      'STT',
      'Số chứng từ',
      'Loại phiếu',
      'Ngày tiếp nhận',
      'Đơn vị liên quan',
      'Cán bộ tiếp nhận',
      'Mã VT',
      'Tên thiết bị',
      'Số Serial (S/N)',
      'Số lượng',
      'Trạng thái sau sửa',
      'Trạng thái hiện tại',
      'Ghi chú thiết bị',
      'Ghi chú riêng tư (nếu có)',
    ];
    const rows = labRecords.map((r, i) => [
      i + 1,
      `"${r.soChungTu}"`,
      `"${r.loaiChungTu}"`,
      `"${r.ngayTiepNhan}"`,
      `"${r.donViLienQuan}"`,
      `"${r.canBoTiepNhan}"`,
      `"${r.maVT}"`,
      `"${r.tenVT}"`,
      `"${r.serialNumber}"`,
      r.soLuong || 1,
      `"${r.trangThaiSauSua}"`,
      `"${r.trangThaiHienTai}"`,
      `"${(r.ghiChuVatTu || '').replace(/"/g, '""')}"`,
      `"${(r.plainPrivateNote || '').replace(/"/g, '""')}"`,
    ]);
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Thong_ke_Kho_Lab_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  };

  return (
    <div className="max-w-6xl mx-auto space-y-5 pb-24">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-[#004b93] via-[#003870] to-[#00a3e0] text-white p-5 rounded-2xl shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-cyan-300" />
            Trung tâm Thống kê & Báo cáo Vật tư & Thiết bị
          </h2>
          <p className="text-xs text-cyan-100 mt-1">
            Tổng hợp dữ liệu phiếu tiếp nhận, tỉ lệ sửa chữa thành công và phân bổ luồng thiết bị
          </p>
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={onExportCSV}
            className="flex-1 sm:flex-none px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer border border-white/20 transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-300" />
            <span>Xuất CSV</span>
          </button>
          <button
            onClick={onExportJSON}
            className="flex-1 sm:flex-none px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer border border-white/20 transition-colors"
          >
            <Download className="w-4 h-4 text-cyan-300" />
            <span>Sao lưu JSON</span>
          </button>
        </div>
      </div>

      {/* THỐNG KÊ CÁ NHÂN: GHI CHÚ RIÊNG TƯ (CHỈ HIỂN THỊ KHI ĐÃ MỞ KHÓA BẢO MẬT) */}
      {isUnlocked && (
        <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 text-white p-5 sm:p-6 rounded-3xl shadow-xl border border-indigo-500/30 space-y-5 animate-in fade-in duration-300">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-indigo-500/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center shrink-0">
                <KeyRound className="w-5 h-5 text-indigo-300" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base sm:text-lg font-bold text-white">
                    Thống kê cá nhân • Ghi chú riêng tư
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Đã giải mã AES-256</span>
                  </span>
                </div>
                <p className="text-xs text-indigo-200 mt-0.5">
                  Tổng hợp danh mục vật tư & card được gắn ghi chú bảo mật cá nhân
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-center">
              <button
                type="button"
                onClick={handleExportPrivateCSV}
                disabled={privateRecords.length === 0}
                className="px-3 py-1.5 bg-indigo-800/80 hover:bg-indigo-700 disabled:opacity-40 text-white text-xs font-semibold rounded-xl border border-indigo-400/30 flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm"
              >
                <Download className="w-3.5 h-3.5 text-cyan-300" />
                <span>Xuất CSV</span>
              </button>
              <button
                type="button"
                onClick={lockVault}
                className="px-3 py-1.5 bg-rose-900/60 hover:bg-rose-800 text-rose-200 text-xs font-semibold rounded-xl border border-rose-500/30 flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm"
                title="Khóa ngay và ẩn toàn bộ ghi chú"
              >
                <Lock className="w-3.5 h-3.5 text-rose-300" />
                <span>Khóa ngay</span>
              </button>
            </div>
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white/5 border border-white/10 p-3.5 rounded-2xl">
              <p className="text-[11px] font-semibold text-indigo-200 uppercase">Có ghi chú riêng</p>
              <h4 className="text-xl sm:text-2xl font-black text-white mt-1">{privateRecords.length}</h4>
              <p className="text-[10px] text-indigo-300">Tổng số vật tư ghi chú</p>
            </div>

            <div className="bg-white/5 border border-white/10 p-3.5 rounded-2xl">
              <p className="text-[11px] font-semibold text-emerald-300 uppercase">Trạng thái Tốt</p>
              <h4 className="text-xl sm:text-2xl font-black text-emerald-400 mt-1">{privateCountTot}</h4>
              <p className="text-[10px] text-emerald-200">Đạt chuẩn sau sửa</p>
            </div>

            <div className="bg-white/5 border border-white/10 p-3.5 rounded-2xl">
              <p className="text-[11px] font-semibold text-rose-300 uppercase">Trạng thái Hỏng</p>
              <h4 className="text-xl sm:text-2xl font-black text-rose-400 mt-1">{privateCountHong}</h4>
              <p className="text-[10px] text-rose-200">Không đạt chuẩn</p>
            </div>

            <div className="bg-white/5 border border-white/10 p-3.5 rounded-2xl">
              <p className="text-[11px] font-semibold text-amber-300 uppercase">Trạng thái Lỗi / Khác</p>
              <h4 className="text-xl sm:text-2xl font-black text-amber-400 mt-1">{privateCountLoi}</h4>
              <p className="text-[10px] text-amber-200">Cần kiểm tra thêm</p>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-black/20 p-2.5 rounded-2xl border border-white/5">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-indigo-300 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={privateSearch}
                onChange={(e) => setPrivateSearch(e.target.value)}
                placeholder="Tìm nhanh theo Serial, Tên VT, Mã VT, Số phiếu, Ghi chú riêng..."
                className="w-full pl-9 pr-3 py-2 bg-white/10 border border-white/10 rounded-xl text-xs text-white placeholder:text-indigo-300/70 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white/15 transition-all"
              />
              {privateSearch && (
                <button
                  type="button"
                  onClick={() => setPrivateSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-indigo-300 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 self-end sm:self-center">
              {(['ALL', 'TOT', 'HONG', 'LOI'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setPrivateStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    privateStatusFilter === st
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-white/5 text-indigo-200 hover:bg-white/10'
                  }`}
                >
                  {st === 'ALL' ? 'Tất cả' : st === 'TOT' ? 'Tốt' : st === 'HONG' ? 'Hỏng' : 'Lỗi'}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/60">
            <div className="overflow-x-auto max-h-[420px]">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="sticky top-0 bg-slate-950/90 backdrop-blur-xs text-indigo-200 font-bold uppercase text-[11px] border-b border-white/10">
                  <tr>
                    <th className="py-2.5 px-3 text-center w-12">STT</th>
                    <th className="py-2.5 px-3 w-32">Số phiếu</th>
                    <th className="py-2.5 px-3 w-32">Ngày lập</th>
                    <th className="py-2.5 px-3 w-40">Mã & Tên VT</th>
                    <th className="py-2.5 px-3 w-40">Số Serial (S/N)</th>
                    <th className="py-2.5 px-3 w-28 text-center">Trạng thái</th>
                    <th className="py-2.5 px-3">Ghi chú riêng tư (Đã giải mã)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredPrivateRecords.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-indigo-200/70 text-xs italic">
                        {privateRecords.length === 0
                          ? 'Chưa có vật tư nào được lưu kèm Ghi chú riêng tư. Bạn có thể mở phiếu để thêm ghi chú riêng bất cứ lúc nào.'
                          : 'Không tìm thấy vật tư nào khớp với từ khóa tìm kiếm.'}
                      </td>
                    </tr>
                  ) : (
                    filteredPrivateRecords.map((rec, i) => (
                      <tr key={rec.itemId} className="hover:bg-white/5 transition-colors">
                        <td className="py-2.5 px-3 text-center text-indigo-300 font-bold">{i + 1}</td>
                        <td className="py-2.5 px-3 font-mono font-bold text-cyan-300">{rec.soChungTu}</td>
                        <td className="py-2.5 px-3 text-indigo-200">{rec.ngayTiepNhan}</td>
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-white">{rec.tenVT}</div>
                          {rec.maVT && <span className="font-mono text-[10px] text-indigo-300">Mã: {rec.maVT}</span>}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="font-mono font-bold text-rose-300 bg-rose-950/40 border border-rose-500/30 px-2 py-0.5 rounded">
                            {rec.serialNumber || '—'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                              rec.trangThaiSauSua === 'TOT'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : rec.trangThaiSauSua === 'HONG'
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            }`}
                          >
                            {rec.trangThaiSauSua === 'TOT' ? 'Tốt' : rec.trangThaiSauSua === 'HONG' ? 'Hỏng' : 'Lỗi'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-1.5 bg-indigo-900/40 border border-indigo-400/30 text-indigo-100 px-2.5 py-1.5 rounded-xl font-medium">
                            <Lock className="w-3.5 h-3.5 text-indigo-300 shrink-0" />
                            <span>{rec.plainNote}</span>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* THỐNG KÊ KHO LAB (CHỈ HIỂN THỊ KHI ĐÃ MỞ KHÓA BẢO MẬT BẰNG MÃ PIN) */}
      {isUnlocked && (
        <div className="bg-gradient-to-br from-purple-950 via-slate-900 to-indigo-950 text-white p-5 sm:p-6 rounded-3xl shadow-xl border border-purple-500/30 space-y-5 animate-in fade-in duration-300">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-purple-500/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center shrink-0">
                <FlaskConical className="w-5 h-5 text-purple-300" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base sm:text-lg font-bold text-white">
                    Quản lý & Thống kê Kho Lab
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                    <FlaskConical className="w-3.5 h-3.5" />
                    <span>Từ khóa ẩn #lab</span>
                  </span>
                </div>
                <p className="text-xs text-purple-200 mt-0.5">
                  Tổng hợp toàn bộ vật tư & thiết bị thuộc Kho Lab (nghiên cứu & thử nghiệm bảo mật)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-center">
              <button
                type="button"
                onClick={handleExportLabCSV}
                disabled={labRecords.length === 0}
                className="px-3 py-1.5 bg-purple-800/80 hover:bg-purple-700 disabled:opacity-40 text-white text-xs font-semibold rounded-xl border border-purple-400/30 flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm"
              >
                <Download className="w-3.5 h-3.5 text-cyan-300" />
                <span>Xuất CSV Kho Lab</span>
              </button>
            </div>
          </div>

          {/* Metric Cards Kho Lab */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white/5 border border-white/10 p-3.5 rounded-2xl">
              <p className="text-[11px] font-semibold text-purple-200 uppercase">Tổng VT Kho Lab</p>
              <h4 className="text-xl sm:text-2xl font-black text-white mt-0.5">{labTotalQty}</h4>
              <p className="text-[11px] text-purple-300 mt-1">
                {labRecords.length} dòng vật tư đã phân loại
              </p>
            </div>
            <div className="bg-emerald-500/10 border border-emerald-500/20 p-3.5 rounded-2xl">
              <p className="text-[11px] font-semibold text-emerald-300 uppercase">NK Tốt (Sẵn sàng)</p>
              <h4 className="text-xl sm:text-2xl font-black text-emerald-300 mt-0.5">{labCountTot}</h4>
              <p className="text-[11px] text-emerald-200/80 mt-1">
                {labTotalQty > 0 ? Math.round((labCountTot / labTotalQty) * 100) : 0}% đạt tiêu chuẩn
              </p>
            </div>
            <div className="bg-rose-500/10 border border-rose-500/20 p-3.5 rounded-2xl">
              <p className="text-[11px] font-semibold text-rose-300 uppercase">NK Hỏng / Lỗi</p>
              <h4 className="text-xl sm:text-2xl font-black text-rose-300 mt-0.5">{labCountHong}</h4>
              <p className="text-[11px] text-rose-200/80 mt-1">Cần nghiên cứu thêm</p>
            </div>
            <div className="bg-amber-500/10 border border-amber-500/20 p-3.5 rounded-2xl">
              <p className="text-[11px] font-semibold text-amber-300 uppercase">Đang sửa / Tạm nhận</p>
              <h4 className="text-xl sm:text-2xl font-black text-amber-300 mt-0.5">{labCountKTT}</h4>
              <p className="text-[11px] text-amber-200/80 mt-1">Chờ xử lý kỹ thuật</p>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-purple-300 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={labSearch}
                onChange={(e) => setLabSearch(e.target.value)}
                placeholder="Tìm Serial, tên vật tư, số chứng từ Kho Lab..."
                className="w-full pl-9 pr-3 py-2 bg-white/10 border border-purple-400/30 rounded-xl text-xs text-white placeholder:text-purple-300/60 focus:outline-none focus:ring-2 focus:ring-purple-400/50"
              />
              {labSearch && (
                <button
                  type="button"
                  onClick={() => setLabSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-purple-300 hover:text-white cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto">
              <button
                type="button"
                onClick={() => setLabStatusFilter('ALL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                  labStatusFilter === 'ALL'
                    ? 'bg-purple-600 text-white'
                    : 'bg-white/5 text-purple-200 hover:bg-white/10'
                }`}
              >
                Tất cả ({labTotalQty})
              </button>
              <button
                type="button"
                onClick={() => setLabStatusFilter('TOT')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                  labStatusFilter === 'TOT'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white/5 text-emerald-300 hover:bg-white/10'
                }`}
              >
                Tốt ({labCountTot})
              </button>
              <button
                type="button"
                onClick={() => setLabStatusFilter('HONG')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                  labStatusFilter === 'HONG'
                    ? 'bg-rose-600 text-white'
                    : 'bg-white/5 text-rose-300 hover:bg-white/10'
                }`}
              >
                Hỏng ({labCountHong})
              </button>
              <button
                type="button"
                onClick={() => setLabStatusFilter('LOI')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                  labStatusFilter === 'LOI'
                    ? 'bg-amber-600 text-white'
                    : 'bg-white/5 text-amber-300 hover:bg-white/10'
                }`}
              >
                Lỗi ({labRecords.filter((r) => r.trangThaiSauSua === 'LOI').reduce((s, r) => s + (Number(r.soLuong) || 1), 0)})
              </button>
            </div>
          </div>

          {/* Table of Lab Items */}
          <div className="bg-black/20 rounded-2xl border border-purple-500/20 overflow-hidden">
            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-left text-xs">
                <thead className="bg-white/5 text-purple-200 font-bold sticky top-0 backdrop-blur-md">
                  <tr>
                    <th className="py-2.5 px-3 text-center w-12">STT</th>
                    <th className="py-2.5 px-3">Chứng từ</th>
                    <th className="py-2.5 px-3">Ngày nhận</th>
                    <th className="py-2.5 px-3">Tên thiết bị</th>
                    <th className="py-2.5 px-3">Serial Number</th>
                    <th className="py-2.5 px-2 text-center w-14">SL</th>
                    <th className="py-2.5 px-3 text-center">Trạng thái</th>
                    <th className="py-2.5 px-3">Ghi chú</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredLabRecords.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-purple-200/70 text-xs italic">
                        {labRecords.length === 0
                          ? 'Chưa có vật tư nào được phân loại vào Kho Lab. Khi tạo phiếu nhập, gõ từ khóa #lab vào mục ghi chú chung để đưa vào Kho Lab.'
                          : 'Không tìm thấy vật tư Kho Lab nào khớp với từ khóa tìm kiếm.'}
                      </td>
                    </tr>
                  ) : (
                    filteredLabRecords.map((rec, i) => (
                      <tr key={rec.itemId} className="hover:bg-white/5 transition-colors">
                        <td className="py-2.5 px-3 text-center text-purple-300 font-bold">{i + 1}</td>
                        <td className="py-2.5 px-3 font-mono font-bold text-cyan-300">{rec.soChungTu}</td>
                        <td className="py-2.5 px-3 text-purple-200">{rec.ngayTiepNhan}</td>
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-white">{rec.tenVT}</div>
                          {rec.maVT && <span className="font-mono text-[10px] text-purple-300">Mã: {rec.maVT}</span>}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="font-mono font-bold text-amber-300 bg-amber-950/40 border border-amber-500/30 px-2 py-0.5 rounded">
                            {rec.serialNumber || '—'}
                          </span>
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          <span className="font-bold text-cyan-200 bg-cyan-950/40 border border-cyan-500/30 px-2 py-0.5 rounded">
                            {rec.soLuong || 1}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                              rec.trangThaiSauSua === 'TOT'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : rec.trangThaiSauSua === 'HONG'
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            }`}
                          >
                            {rec.trangThaiSauSua === 'TOT' ? 'Tốt' : rec.trangThaiSauSua === 'HONG' ? 'Hỏng' : 'Lỗi'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="space-y-1">
                            {rec.ghiChuVatTu && (
                              <span className="text-purple-200 text-[11px] block">{rec.ghiChuVatTu}</span>
                            )}
                            {rec.plainPrivateNote && (
                              <div className="inline-flex items-center gap-1 bg-indigo-900/60 border border-indigo-400/40 text-indigo-100 px-2 py-0.5 rounded text-[10px] font-medium">
                                <Lock className="w-3 h-3 text-indigo-300" />
                                <span>{rec.plainPrivateNote}</span>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Scope Selector Bar for General Stats (Chỉ hiển thị khi đã mở khóa PIN) */}
      {isUnlocked && (
        <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2">
            <span className="font-bold text-xs sm:text-sm text-slate-800 flex items-center gap-1.5">
              <FlaskConical className="w-4 h-4 text-purple-600" />
              Phạm vi thống kê biểu đồ:
            </span>
            <span className="text-xs text-slate-500 hidden md:inline">
              (Lựa chọn hiển thị số liệu theo từng kho hoặc gộp tất cả)
            </span>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setWarehouseScope('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                warehouseScope === 'ALL'
                  ? 'bg-[#004b93] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tất cả kho ({vouchers.length} phiếu)
            </button>
            <button
              type="button"
              onClick={() => setWarehouseScope('REPAIR')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                warehouseScope === 'REPAIR'
                  ? 'bg-[#004b93] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Kho Sửa chữa ({vouchers.filter((v) => !v.isLab).length} phiếu)
            </button>
            <button
              type="button"
              onClick={() => setWarehouseScope('LAB')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all flex items-center gap-1 ${
                warehouseScope === 'LAB'
                  ? 'bg-purple-700 text-white shadow-xs'
                  : 'text-purple-700 hover:bg-purple-50'
              }`}
            >
              <FlaskConical className="w-3.5 h-3.5" />
              <span>Kho Lab ({vouchers.filter((v) => v.isLab).length} phiếu)</span>
            </button>
          </div>
        </div>
      )}

      {/* 4 Quick Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-[#004b93] flex items-center justify-center shrink-0">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase">Tổng số phiếu</p>
            <h3 className="text-xl sm:text-2xl font-black text-slate-800">{totalVouchers}</h3>
            <p className="text-[10px] text-slate-500">{countPXK} PXK, {countPNK} PNK, {countGM} BBBG</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-[#004b93] flex items-center justify-center shrink-0">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase">Tiếp nhận mới</p>
            <h3 className="text-xl sm:text-2xl font-black text-[#004b93]">{countTiepNhanMoi}</h3>
            <p className="text-[10px] text-blue-700 font-semibold">{pctMoi}% (Chờ sửa chữa / {totalItems} TB)</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase">NK tốt (Đạt chuẩn)</p>
            <h3 className="text-xl sm:text-2xl font-black text-emerald-600">{countNKTot}</h3>
            <p className="text-[10px] text-emerald-700 font-semibold">{pctTot}% tổng thiết bị</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <XCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase">NK Hỏng & Cần KT</p>
            <h3 className="text-xl sm:text-2xl font-black text-rose-600">{countNKHong + countKTT}</h3>
            <p className="text-[10px] text-slate-500 font-semibold">{countNKHong} hỏng, {countKTT} kiểm tra thêm</p>
          </div>
        </div>
      </div>

      {/* THỐNG KÊ SỐ CARD THEO THỜI GIAN */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        {/* Header & Mode Switcher */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-800 flex items-center gap-2">
              <Cpu className="w-4 h-4 sm:w-5 sm:h-5 text-[#004b93]" />
              Thống kê số card theo thời gian
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Theo dõi số lượng card/thiết bị được cập nhật kết quả kiểm thử & sau sửa chữa theo ngày, theo tuần, theo tháng, theo năm
            </p>
          </div>

          {/* Time Grouping Selector: Theo ngày, theo tuần, theo tháng, theo năm */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl self-start md:self-center">
            {[
              { id: 'day', label: 'Theo ngày' },
              { id: 'week', label: 'Theo tuần' },
              { id: 'month', label: 'Theo tháng' },
              { id: 'year', label: 'Theo năm' },
            ].map((mode) => (
              <button
                key={mode.id}
                type="button"
                onClick={() => setTimeMode(mode.id as TimeGroupingMode)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  timeMode === mode.id
                    ? 'bg-[#004b93] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </div>

        {/* Filter bar: Khoảng thời gian & Quick Metrics */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200/80">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-semibold text-slate-600 flex items-center gap-1 shrink-0">
              <Calendar className="w-3.5 h-3.5 text-[#004b93]" />
              Khoảng thời gian:
            </span>
            <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-lg px-2 py-1 shadow-2xs">
              <span className="text-[11px] text-slate-400">Từ:</span>
              <input
                type="date"
                value={statsStartDate}
                onChange={(e) => setStatsStartDate(e.target.value)}
                className="text-xs text-slate-700 bg-transparent focus:outline-none cursor-pointer"
              />
            </div>
            <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-lg px-2 py-1 shadow-2xs">
              <span className="text-[11px] text-slate-400">Đến:</span>
              <input
                type="date"
                value={statsEndDate}
                onChange={(e) => setStatsEndDate(e.target.value)}
                className="text-xs text-slate-700 bg-transparent focus:outline-none cursor-pointer"
              />
            </div>
            {(statsStartDate || statsEndDate) && (
              <button
                type="button"
                onClick={() => {
                  setStatsStartDate('');
                  setStatsEndDate('');
                }}
                className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg font-bold text-[11px] transition-colors flex items-center gap-1 cursor-pointer"
                title="Xóa bộ lọc khoảng thời gian"
              >
                <X className="w-3 h-3" />
                <span>Xóa lọc</span>
              </button>
            )}
          </div>

          {/* Quick Metrics Badges for Card Post-Repair */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="px-2.5 py-1 bg-blue-50 text-[#004b93] border border-blue-200 rounded-lg font-bold flex items-center gap-1.5">
              <span>Tổng card:</span>
              <span className="font-mono text-sm">{totalCardsUpdated}</span>
            </span>
            <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg font-bold flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Tốt:</span>
              <span className="font-mono">{totalCardsTot} ({pctCardsTot}%)</span>
            </span>
            <span className="px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg font-bold flex items-center gap-1.5">
              <XCircle className="w-3.5 h-3.5" />
              <span>Hỏng:</span>
              <span className="font-mono">{totalCardsHong}</span>
            </span>
            {totalCardsKTT > 0 && (
              <span className="px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Kiểm tra thêm:</span>
                <span className="font-mono">{totalCardsKTT}</span>
              </span>
            )}
          </div>
        </div>

        {/* Time-grouped stats list */}
        {timeGroupedStats.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
            Không có card nào được cập nhật trạng thái sau sửa trong khoảng thời gian này.
          </div>
        ) : (
          <div className="space-y-2.5">
            {timeGroupedStats.map((bucket) => {
              const isExpanded = expandedPeriodKey === bucket.key;
              const pctBucketTot = bucket.total > 0 ? Math.round((bucket.tot / bucket.total) * 100) : 0;
              return (
                <div
                  key={bucket.key}
                  className="border border-slate-200 rounded-xl bg-white overflow-hidden transition-all shadow-2xs"
                >
                  {/* Period Header Row */}
                  <div
                    onClick={() => setExpandedPeriodKey(isExpanded ? null : bucket.key)}
                    className="p-3 sm:p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 cursor-pointer hover:bg-slate-50/80 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-blue-50 text-[#004b93] font-bold flex items-center justify-center shrink-0">
                        <Clock className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-slate-800 flex flex-wrap items-center gap-2">
                          <span>{bucket.label}</span>
                          <span className="text-[11px] font-semibold text-slate-500 font-mono">({bucket.subLabel})</span>
                        </h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs font-extrabold text-[#004b93]">
                            {bucket.total} card đã cập nhật
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <div className="flex items-center gap-1.5 text-[11px]">
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 font-bold rounded-md border border-emerald-200">
                          {bucket.tot} Đạt ({pctBucketTot}%)
                        </span>
                        {bucket.hong > 0 && (
                          <span className="px-2 py-0.5 bg-rose-50 text-rose-700 font-bold rounded-md border border-rose-200">
                            {bucket.hong} Hỏng
                          </span>
                        )}
                        {bucket.ktt > 0 && (
                          <span className="px-2 py-0.5 bg-amber-50 text-amber-700 font-bold rounded-md border border-amber-200">
                            {bucket.ktt} KT thêm
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                        title={isExpanded ? 'Thu gọn danh sách card' : 'Xem danh sách card chi tiết'}
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-slate-600" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-600" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Card Detail Table */}
                  {isExpanded && (
                    <div className="border-t border-slate-100 bg-slate-50/60 p-3 animate-in fade-in">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                              <th className="py-2 px-2.5 w-10 text-center">STT</th>
                              <th className="py-2 px-2.5">Số Serial</th>
                              <th className="py-2 px-2.5">Tên thiết bị / Mã VT</th>
                              <th className="py-2 px-2.5">Số phiếu</th>
                              <th className="py-2 px-2.5 text-center">Trạng thái sau sửa</th>
                              <th className="py-2 px-2.5 text-right">Thời điểm cập nhật</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {bucket.cards.map((c, idx) => {
                              const isTot = c.trangThaiHienTai === 'NK tốt' || c.trangThaiSauSua === 'TOT';
                              const isHong = c.trangThaiHienTai === 'NK hỏng' || c.trangThaiSauSua === 'HONG';
                              return (
                                <tr key={`${c.id}-${idx}`} className="hover:bg-white/80 transition-colors">
                                  <td className="py-2 px-2.5 text-center font-mono text-slate-400 text-[11px]">
                                    {idx + 1}
                                  </td>
                                  <td className="py-2 px-2.5">
                                    <span className="font-mono font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200 text-xs">
                                      {c.serialNumber || 'N/A'}
                                    </span>
                                  </td>
                                  <td className="py-2 px-2.5 min-w-[180px]">
                                    <div className="font-semibold text-slate-800">{c.tenVT}</div>
                                    {c.maVT && (
                                      <div className="text-[10px] font-mono text-slate-400">{c.maVT}</div>
                                    )}
                                  </td>
                                  <td className="py-2 px-2.5">
                                    <span className="font-mono text-xs font-semibold text-[#004b93]">
                                      {c.soChungTu}
                                    </span>
                                  </td>
                                  <td className="py-2 px-2.5 text-center">
                                    {isTot ? (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                        <span>Tốt ({c.trangThaiHienTai})</span>
                                      </span>
                                    ) : isHong ? (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                                        <XCircle className="w-3 h-3 text-rose-600" />
                                        <span>Hỏng ({c.trangThaiHienTai})</span>
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                        <AlertTriangle className="w-3 h-3 text-amber-600" />
                                        <span>{c.trangThaiHienTai || 'Kiểm tra thêm'}</span>
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-2 px-2.5 text-right font-mono text-slate-500 text-[11px]">
                                    {c.formattedTime}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Middle Grid: Repair Quality & Workflow status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Quality Breakdown */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#004b93]" />
            Tình trạng & Phân loại thiết bị
          </h3>

          <div className="space-y-3">
            {/* Tiếp nhận mới */}
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-blue-700 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-blue-500" /> Tiếp nhận mới (Chờ sửa chữa)
                </span>
                <span className="font-mono">{countTiepNhanMoi} ({pctMoi}%)</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-blue-500 h-2.5 rounded-full transition-all"
                  style={{ width: `${pctMoi}%` }}
                />
              </div>
            </div>

            {/* Tạm nhận (BBBG chờ gán PNK) */}
            {countTamNhan > 0 && (
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-amber-800 flex items-center gap-1.5">
                    <PackageCheck className="w-3.5 h-3.5 text-amber-600" /> Tạm nhận (BBBG chờ gán PNK)
                  </span>
                  <span className="font-mono">{countTamNhan} ({pctTamNhan}%)</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-amber-500 h-2.5 rounded-full transition-all"
                    style={{ width: `${pctTamNhan}%` }}
                  />
                </div>
              </div>
            )}

            {/* NK Tốt */}
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-emerald-700 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> NK tốt (Hoạt động chuẩn)
                </span>
                <span className="font-mono">{countNKTot} ({pctTot}%)</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-emerald-500 h-2.5 rounded-full transition-all"
                  style={{ width: `${pctTot}%` }}
                />
              </div>
            </div>

            {/* Kiểm tra thêm */}
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-amber-700 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> Kiểm tra thêm (Cần xử lý tiếp)
                </span>
                <span className="font-mono">{countKTT} ({pctKTT}%)</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-amber-500 h-2.5 rounded-full transition-all"
                  style={{ width: `${pctKTT}%` }}
                />
              </div>
            </div>

            {/* NK Hỏng */}
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-rose-700 flex items-center gap-1.5">
                  <XCircle className="w-3.5 h-3.5 text-rose-500" /> NK hỏng (Không thể khắc phục)
                </span>
                <span className="font-mono">{countNKHong} ({pctHong}%)</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-rose-500 h-2.5 rounded-full transition-all"
                  style={{ width: `${pctHong}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Workflow Location Distribution */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <PackageCheck className="w-4 h-4 text-[#00a3e0]" />
            Hiện trạng phân bổ thiết bị
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
            <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl">
              <Layers className="w-4 h-4 text-blue-600 mx-auto mb-1" />
              <p className="text-base font-black text-blue-700">{countTiepNhanMoi}</p>
              <p className="text-[10px] text-blue-800 font-bold">Tiếp nhận mới</p>
            </div>

            <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl">
              <PackageCheck className="w-4 h-4 text-amber-600 mx-auto mb-1" />
              <p className="text-base font-black text-amber-700">{countTamNhan}</p>
              <p className="text-[10px] text-amber-800 font-bold">Tạm nhận (BBBG)</p>
            </div>

            <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 mx-auto mb-1" />
              <p className="text-base font-black text-emerald-700">{countNKTot}</p>
              <p className="text-[10px] text-emerald-800 font-bold">NK tốt</p>
            </div>

            <div className="p-2.5 bg-amber-50/70 border border-amber-200 rounded-xl">
              <AlertTriangle className="w-4 h-4 text-amber-600 mx-auto mb-1" />
              <p className="text-base font-black text-amber-700">{countKTT}</p>
              <p className="text-[10px] text-amber-800 font-bold">Kiểm tra thêm</p>
            </div>

            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl">
              <XCircle className="w-4 h-4 text-rose-600 mx-auto mb-1" />
              <p className="text-base font-black text-rose-700">{countNKHong}</p>
              <p className="text-[10px] text-rose-800 font-bold">NK hỏng</p>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1.5">
            <p className="font-semibold text-slate-700">Phân loại chứng từ đã lập:</p>
            <div className="flex justify-between">
              <span>PXK (Phiếu xuất kho):</span>
              <span className="font-bold text-[#004b93]">{countPXK} phiếu</span>
            </div>
            <div className="flex justify-between">
              <span>PNK (Phiếu nhập kho):</span>
              <span className="font-bold text-emerald-700">{countPNK} phiếu</span>
            </div>
            <div className="flex justify-between">
              <span>BBBG:</span>
              <span className="font-bold text-amber-700">
                {countGM} phiếu {countCompletedBBBG > 0 && `(${countCompletedBBBG} đã hoàn thành gán PNK)`}
              </span>
            </div>
            {countCompletedBBBG > 0 && (
              <div className="pt-1.5 border-t border-slate-200 text-[11px] text-emerald-700 font-medium flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>
                  Đã loại trừ <b>{excludedCompletedItemsCount}</b> vật tư từ <b>{countCompletedBBBG}</b> BBBG đã hoàn thành nhập kho đơn vị để chống trùng lặp số liệu.
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Top 5 Most Processed Equipment */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-3">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#004b93]" />
            Top chủng loại thiết bị xử lý nhiều nhất
          </h3>
          <span className="text-[11px] text-slate-500 font-medium">
             </span>
        </div>

        {topEquip.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-400">
            Chưa có dữ liệu thiết bị nào trong hệ thống.
          </div>
        ) : (
          <div className="space-y-2">
            {topEquip.map((item, index) => {
              const pctOfTotal = totalItems > 0 ? Math.round((item.count / totalItems) * 100) : 0;
              return (
                <div
                  key={index}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100/70 border border-slate-200/80 transition-colors gap-2.5 text-xs"
                >
                  <div className="flex items-start sm:items-center gap-2.5 min-w-0">
                    <span className={`w-5 h-5 rounded-full font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5 sm:mt-0 ${
                      index === 0
                        ? 'bg-amber-100 text-amber-800 font-extrabold'
                        : index === 1
                        ? 'bg-slate-200 text-slate-800'
                        : index === 2
                        ? 'bg-orange-100 text-orange-800'
                        : 'bg-blue-100/70 text-[#004b93]'
                    }`}>
                      {index + 1}
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                        {item.maVT && item.maVT !== 'N/A' && (
                          <span className="font-mono font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200 text-[11px]">
                            {item.maVT}
                          </span>
                        )}
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-slate-500 font-medium shrink-0">Tên VT:</span>
                          <span className="font-semibold text-slate-800 truncate" title={item.tenVT}>
                            {item.tenVT}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center pl-7 sm:pl-0">
                    <span className="text-[11px] text-slate-400 font-medium">
                      ({pctOfTotal}%)
                    </span>
                    <span className="font-bold text-[#004b93] bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs whitespace-nowrap">
                      {item.count} thiết bị
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
