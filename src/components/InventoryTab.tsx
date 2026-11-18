import React, { useState, useMemo, useEffect } from 'react';
import {
  Package,
  Search,
  Filter,
  Sparkles,
  ArrowUpRight,
  GitBranch,
  Edit3,
  Trash2,
  History,
  FileSpreadsheet,
  Plus,
  Check,
  X,
  Lock,
  Layers,
  List,
  ChevronDown,
  ChevronRight,
  CheckSquare,
  Square,
  SlidersHorizontal,
  Building2,
} from 'lucide-react';
import {
  InventoryItem,
  InventoryLog,
  InventoryPhanLoai,
} from '../types';
import { usePrivateVault } from '../context/PrivateVaultContext';
import {
  INVENTORY_STATUS_META,
  INVENTORY_LOG_TYPE_LABELS,
  PRESET_BRANDS,
  PRESET_DEVICE_LINES,
  suggestBrandAndLine,
} from '../utils/inventoryClassifier';
import {
  exportInventoryToCSV,
  exportInventoryLogsToCSV,
} from '../utils/inventoryStorage';

interface InventoryTabProps {
  items: InventoryItem[];
  logs: InventoryLog[];
  onSaveItemsAndLogs: (itemsToSave: InventoryItem[], logsToSave: InventoryLog[]) => Promise<void>;
  onDeleteItem: (id: string) => Promise<void>;
  onShowToast: (msg: string) => void;
}

type ViewMode = 'table' | 'grouped';

export const InventoryTab: React.FC<InventoryTabProps> = ({
  items,
  logs,
  onSaveItemsAndLogs,
  onDeleteItem,
  onShowToast,
}) => {
  const { isUnlocked, activePin, encryptNote, decryptNote } = usePrivateVault();

  // Decrypted private notes cache keyed by InventoryItem.id
  const [decryptedNotes, setDecryptedNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isUnlocked || !activePin) {
      setDecryptedNotes({});
      return;
    }
    let mounted = true;
    const run = async () => {
      const nextMap: Record<string, string> = {};
      for (const item of items) {
        if (item.privateNote && item.privateNote.trim()) {
          const plain = await decryptNote(item.privateNote);
          if (plain) nextMap[item.id] = plain;
        }
      }
      if (mounted) {
        setDecryptedNotes(nextMap);
      }
    };
    run();
    return () => {
      mounted = false;
    };
  }, [items, isUnlocked, activePin, decryptNote]);

  // Filters & View State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | InventoryPhanLoai>('ALL');
  const [brandFilter, setBrandFilter] = useState<string>('ALL');
  const [lineFilter, setLineFilter] = useState<string>('ALL');
  const [hideZeroStock, setHideZeroStock] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  // Multi-select & Bulk Edit State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkStatus, setBulkStatus] = useState<'' | InventoryPhanLoai>('');
  const [bulkBrand, setBulkBrand] = useState<string>('');
  const [bulkLine, setBulkLine] = useState<string>('');
  const [bulkLocation, setBulkLocation] = useState<string>('');
  const [isSavingBulk, setIsSavingBulk] = useState(false);

  // Modals State
  const [stockOutItem, setStockOutItem] = useState<InventoryItem | null>(null);
  const [stockOutQty, setStockOutQty] = useState<number>(1);
  const [stockOutRecipient, setStockOutRecipient] = useState<string>('');
  const [stockOutRef, setStockOutRef] = useState<string>('');
  const [stockOutReason, setStockOutReason] = useState<string>('');
  const [stockOutActor, setStockOutActor] = useState<string>('');

  const [splitItem, setSplitItem] = useState<InventoryItem | null>(null);
  const [splitQty, setSplitQty] = useState<number>(1);
  const [splitTargetStatus, setSplitTargetStatus] = useState<InventoryPhanLoai>('VAT_TU_TOT');
  const [splitLocation, setSplitLocation] = useState<string>('');
  const [splitReason, setSplitReason] = useState<string>('');

  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState<boolean>(false);
  const [editForm, setEditForm] = useState<{
    tenVT: string;
    maVT: string;
    serialNumber: string;
    phanLoai: InventoryPhanLoai;
    hangSanXuat: string;
    dongThietBi: string;
    viTriKho: string;
    donViTinh: string;
    soLuongTon: number;
    ghiChu: string;
    privateNotePlain: string;
    adjustReason: string;
  }>({
    tenVT: '',
    maVT: '',
    serialNumber: '',
    phanLoai: 'CHUA_PHAN_LOAI',
    hangSanXuat: '',
    dongThietBi: '',
    viTriKho: 'Kho tồn & Tài sản',
    donViTinh: 'Cái',
    soLuongTon: 1,
    ghiChu: '',
    privateNotePlain: '',
    adjustReason: '',
  });

  const [deleteTarget, setDeleteTarget] = useState<InventoryItem | null>(null);
  const [isLogsOpen, setIsLogsOpen] = useState<boolean>(false);
  const [logSearch, setLogSearch] = useState<string>('');
  const [logTypeFilter, setLogTypeFilter] = useState<string>('ALL');

  const [isSuggestModalOpen, setIsSuggestModalOpen] = useState<boolean>(false);
  const [selectedSuggestionIds, setSelectedSuggestionIds] = useState<Set<string>>(new Set());

  // Dynamic Brand & Line Lists from actual items + presets for datalists
  const distinctBrands = useMemo(() => {
    const set = new Set<string>();
    items.forEach((it) => {
      if (it.hangSanXuat && it.hangSanXuat.trim()) set.add(it.hangSanXuat.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'vi'));
  }, [items]);

  const distinctLines = useMemo(() => {
    const set = new Set<string>();
    items.forEach((it) => {
      if (brandFilter !== 'ALL' && brandFilter !== '__UNASSIGNED__') {
        if ((it.hangSanXuat || '').trim() !== brandFilter) return;
      }
      if (it.dongThietBi && it.dongThietBi.trim()) set.add(it.dongThietBi.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'vi'));
  }, [items, brandFilter]);

  const allBrandDatalist = useMemo(() => {
    return Array.from(new Set([...distinctBrands, ...PRESET_BRANDS]));
  }, [distinctBrands]);

  const allLineDatalist = useMemo(() => {
    const existingAll = items.map((i) => i.dongThietBi?.trim()).filter(Boolean) as string[];
    return Array.from(new Set([...existingAll, ...PRESET_DEVICE_LINES]));
  }, [items]);

  // Metrics across active stock (soLuongTon > 0)
  const metrics = useMemo(() => {
    let totalTon = 0;
    let chuaPhanLoai = 0;
    let vatTuTot = 0;
    let vatTuLoi = 0;
    let taiSan = 0;
    let zeroStockRows = 0;
    let unassignedBrandRows = 0;

    items.forEach((it) => {
      const qty = Math.max(0, Number(it.soLuongTon) || 0);
      if (qty === 0) {
        zeroStockRows += 1;
      } else {
        totalTon += qty;
        if (it.phanLoai === 'VAT_TU_TOT') vatTuTot += qty;
        else if (it.phanLoai === 'VAT_TU_LOI') vatTuLoi += qty;
        else if (it.phanLoai === 'TAI_SAN') taiSan += qty;
        else chuaPhanLoai += qty;

        if (!it.hangSanXuat?.trim() || !it.dongThietBi?.trim()) {
          unassignedBrandRows += 1;
        }
      }
    });

    return {
      totalTon,
      chuaPhanLoai,
      vatTuTot,
      vatTuLoi,
      taiSan,
      zeroStockRows,
      unassignedBrandRows,
      activeRows: items.length - zeroStockRows,
    };
  }, [items]);

  // Filtered Items
  const filteredItems = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return items.filter((it) => {
      if (hideZeroStock && (Number(it.soLuongTon) || 0) <= 0) return false;
      if (statusFilter !== 'ALL' && it.phanLoai !== statusFilter) return false;

      if (brandFilter === '__UNASSIGNED__') {
        if (it.hangSanXuat && it.hangSanXuat.trim()) return false;
      } else if (brandFilter !== 'ALL') {
        if ((it.hangSanXuat || '').trim() !== brandFilter) return false;
      }

      if (lineFilter === '__UNASSIGNED__') {
        if (it.dongThietBi && it.dongThietBi.trim()) return false;
      } else if (lineFilter !== 'ALL') {
        if ((it.dongThietBi || '').trim() !== lineFilter) return false;
      }

      if (!q) return true;
      const plainPrivate = (decryptedNotes[it.id] || '').toLowerCase();
      return (
        (it.tenVT || '').toLowerCase().includes(q) ||
        (it.maVT || '').toLowerCase().includes(q) ||
        (it.serialNumber || '').toLowerCase().includes(q) ||
        (it.soChungTuGoc || '').toLowerCase().includes(q) ||
        (it.hangSanXuat || '').toLowerCase().includes(q) ||
        (it.dongThietBi || '').toLowerCase().includes(q) ||
        (it.viTriKho || '').toLowerCase().includes(q) ||
        (it.ghiChu || '').toLowerCase().includes(q) ||
        plainPrivate.includes(q)
      );
    });
  }, [items, hideZeroStock, statusFilter, brandFilter, lineFilter, searchTerm, decryptedNotes]);

  // Grouped View Data (Brand -> Device Line)
  const groupedData = useMemo(() => {
    const groups: Record<
      string,
      {
        brand: string;
        line: string;
        key: string;
        totalTon: number;
        tot: number;
        loi: number;
        taiSan: number;
        choPL: number;
        rows: InventoryItem[];
      }
    > = {};

    filteredItems.forEach((it) => {
      const brand = it.hangSanXuat?.trim() || 'Chưa gán hãng';
      const line = it.dongThietBi?.trim() || 'Chưa gán dòng';
      const key = `${brand}|||${line}`;
      if (!groups[key]) {
        groups[key] = {
          brand,
          line,
          key,
          totalTon: 0,
          tot: 0,
          loi: 0,
          taiSan: 0,
          choPL: 0,
          rows: [],
        };
      }
      const qty = Number(it.soLuongTon) || 0;
      groups[key].totalTon += qty;
      if (it.phanLoai === 'VAT_TU_TOT') groups[key].tot += qty;
      else if (it.phanLoai === 'VAT_TU_LOI') groups[key].loi += qty;
      else if (it.phanLoai === 'TAI_SAN') groups[key].taiSan += qty;
      else groups[key].choPL += qty;
      groups[key].rows.push(it);
    });

    return Object.values(groups).sort((a, b) => {
      if (a.brand === 'Chưa gán hãng' && b.brand !== 'Chưa gán hãng') return 1;
      if (b.brand === 'Chưa gán hãng' && a.brand !== 'Chưa gán hãng') return -1;
      const cmp = a.brand.localeCompare(b.brand, 'vi');
      return cmp !== 0 ? cmp : a.line.localeCompare(b.line, 'vi');
    });
  }, [filteredItems]);

  // Auto-suggestions computed strictly from existing item names/codes where brand or line is empty
  const brandLineSuggestions = useMemo(() => {
    const candidates: Array<{
      item: InventoryItem;
      suggestedBrand: string;
      suggestedLine: string;
      matchedRule: string;
    }> = [];

    items.forEach((it) => {
      const missingBrand = !it.hangSanXuat?.trim();
      const missingLine = !it.dongThietBi?.trim();
      if (!missingBrand && !missingLine) return;

      const sug = suggestBrandAndLine(it.tenVT, it.maVT);
      if (!sug) return;

      const nextBrand = missingBrand ? sug.hangSanXuat : it.hangSanXuat;
      const nextLine = missingLine ? sug.dongThietBi : it.dongThietBi;
      if ((missingBrand && sug.hangSanXuat) || (missingLine && sug.dongThietBi)) {
        candidates.push({
          item: it,
          suggestedBrand: nextBrand,
          suggestedLine: nextLine,
          matchedRule: sug.matchedRule,
        });
      }
    });

    return candidates;
  }, [items]);

  // Selection helpers
  const allFilteredSelected =
    filteredItems.length > 0 && filteredItems.every((it) => selectedIds.includes(it.id));

  const toggleSelectAllFiltered = () => {
    if (allFilteredSelected) {
      const filteredSet = new Set(filteredItems.map((i) => i.id));
      setSelectedIds((prev) => prev.filter((id) => !filteredSet.has(id)));
    } else {
      const merged = new Set([...selectedIds, ...filteredItems.map((i) => i.id)]);
      setSelectedIds(Array.from(merged));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // Inline 1-click status change
  const handleQuickStatusChange = async (item: InventoryItem, newStatus: InventoryPhanLoai) => {
    if (item.phanLoai === newStatus) return;
    const now = new Date().toISOString();
    const updated: InventoryItem = {
      ...item,
      phanLoai: newStatus,
      updatedAt: now,
    };
    const log: InventoryLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      itemId: item.id,
      loaiBienDong: 'PHAN_LOAI',
      maVT: item.maVT,
      tenVT: item.tenVT,
      serialNumber: item.serialNumber,
      hangSanXuat: item.hangSanXuat,
      dongThietBi: item.dongThietBi,
      tuPhanLoai: item.phanLoai,
      denPhanLoai: newStatus,
      soLuongThayDoi: 0,
      tonTruoc: item.soLuongTon,
      tonSau: item.soLuongTon,
      nguoiThucHien: item.canBoNhap || 'Quản lý kho',
      lyDo: `Phân loại từ "${INVENTORY_STATUS_META[item.phanLoai].label}" sang "${INVENTORY_STATUS_META[newStatus].label}"`,
      timestamp: now,
    };

    await onSaveItemsAndLogs([updated], [log]);
    onShowToast(`Đã chuyển "${item.tenVT}" sang ${INVENTORY_STATUS_META[newStatus].label}`);
  };

  // Bulk Update
  const handleApplyBulkUpdate = async () => {
    if (selectedIds.length === 0) return;
    if (!bulkStatus && !bulkBrand.trim() && !bulkLine.trim() && !bulkLocation.trim()) {
      onShowToast('Vui lòng chọn ít nhất 1 thông tin cần cập nhật hàng loạt.');
      return;
    }

    setIsSavingBulk(true);
    try {
      const now = new Date().toISOString();
      const targetItems = items.filter((it) => selectedIds.includes(it.id));
      const updatedItems: InventoryItem[] = [];
      const newLogs: InventoryLog[] = [];

      targetItems.forEach((it, idx) => {
        const nextStatus = bulkStatus || it.phanLoai;
        const nextBrand = bulkBrand.trim() ? bulkBrand.trim() : it.hangSanXuat;
        const nextLine = bulkLine.trim() ? bulkLine.trim() : it.dongThietBi;
        const nextLoc = bulkLocation.trim() ? bulkLocation.trim() : it.viTriKho;

        updatedItems.push({
          ...it,
          phanLoai: nextStatus,
          hangSanXuat: nextBrand,
          dongThietBi: nextLine,
          viTriKho: nextLoc,
          updatedAt: now,
        });

        if (bulkStatus && bulkStatus !== it.phanLoai) {
          newLogs.push({
            id: `log-${Date.now()}-b${idx}-${Math.random().toString(36).slice(2, 5)}`,
            itemId: it.id,
            loaiBienDong: 'PHAN_LOAI',
            maVT: it.maVT,
            tenVT: it.tenVT,
            serialNumber: it.serialNumber,
            hangSanXuat: nextBrand,
            dongThietBi: nextLine,
            tuPhanLoai: it.phanLoai,
            denPhanLoai: nextStatus,
            soLuongThayDoi: 0,
            tonTruoc: it.soLuongTon,
            tonSau: it.soLuongTon,
            nguoiThucHien: 'Cập nhật hàng loạt',
            lyDo: `Phân loại hàng loạt -> ${INVENTORY_STATUS_META[nextStatus].label}`,
            timestamp: now,
          });
        }
      });

      await onSaveItemsAndLogs(updatedItems, newLogs);
      setSelectedIds([]);
      setBulkStatus('');
      setBulkBrand('');
      setBulkLine('');
      setBulkLocation('');
      onShowToast(`Đã cập nhật ${updatedItems.length} dòng vật tư / tài sản.`);
    } finally {
      setIsSavingBulk(false);
    }
  };

  // Apply Auto-Suggestions
  const openSuggestModal = () => {
    setSelectedSuggestionIds(new Set(brandLineSuggestions.map((s) => s.item.id)));
    setIsSuggestModalOpen(true);
  };

  const handleApplySuggestions = async () => {
    const chosen = brandLineSuggestions.filter((s) => selectedSuggestionIds.has(s.item.id));
    if (chosen.length === 0) {
      setIsSuggestModalOpen(false);
      return;
    }
    const now = new Date().toISOString();
    const updatedItems: InventoryItem[] = chosen.map((s) => ({
      ...s.item,
      hangSanXuat: s.suggestedBrand,
      dongThietBi: s.suggestedLine,
      updatedAt: now,
    }));
    await onSaveItemsAndLogs(updatedItems, []);
    setIsSuggestModalOpen(false);
    onShowToast(`Đã gán Hãng / Dòng thiết bị cho ${updatedItems.length} dòng.`);
  };

  // Open Stock Out
  const openStockOutModal = (item: InventoryItem) => {
    setStockOutItem(item);
    setStockOutQty(1);
    setStockOutRecipient('');
    setStockOutRef('');
    setStockOutReason('');
    setStockOutActor(item.canBoNhap || '');
  };

  const handleConfirmStockOut = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stockOutItem) return;
    const qtyOut = Math.max(1, Math.min(stockOutItem.soLuongTon, Number(stockOutQty) || 1));
    if (qtyOut <= 0 || qtyOut > stockOutItem.soLuongTon) return;

    const now = new Date().toISOString();
    const tonTruoc = stockOutItem.soLuongTon;
    const tonSau = Math.max(0, tonTruoc - qtyOut);

    const updatedItem: InventoryItem = {
      ...stockOutItem,
      soLuongTon: tonSau,
      updatedAt: now,
    };

    const log: InventoryLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      itemId: stockOutItem.id,
      loaiBienDong: 'XUAT_SU_DUNG',
      maVT: stockOutItem.maVT,
      tenVT: stockOutItem.tenVT,
      serialNumber: stockOutItem.serialNumber,
      hangSanXuat: stockOutItem.hangSanXuat,
      dongThietBi: stockOutItem.dongThietBi,
      tuPhanLoai: stockOutItem.phanLoai,
      denPhanLoai: stockOutItem.phanLoai,
      soLuongThayDoi: -qtyOut,
      tonTruoc,
      tonSau,
      nguoiThucHien: stockOutActor.trim() || 'Quản lý kho',
      nguoiNhan: stockOutRecipient.trim() || 'Không ghi nhận',
      soChungTuThamChieu: stockOutRef.trim(),
      lyDo: stockOutReason.trim() || 'Xuất kho sử dụng',
      timestamp: now,
    };

    await onSaveItemsAndLogs([updatedItem], [log]);
    setStockOutItem(null);
    onShowToast(`Đã xuất ${qtyOut} "${stockOutItem.tenVT}" (tồn còn ${tonSau}).`);
  };

  // Open Split / Transfer Status
  const openSplitModal = (item: InventoryItem) => {
    setSplitItem(item);
    setSplitQty(item.soLuongTon);
    const defaultNext: InventoryPhanLoai =
      item.phanLoai === 'CHUA_PHAN_LOAI'
        ? 'VAT_TU_TOT'
        : item.phanLoai === 'VAT_TU_TOT'
        ? 'VAT_TU_LOI'
        : 'VAT_TU_TOT';
    setSplitTargetStatus(defaultNext);
    setSplitLocation(item.viTriKho || '');
    setSplitReason('');
  };

  const handleConfirmSplit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!splitItem) return;
    const qtyMove = Math.max(1, Math.min(splitItem.soLuongTon, Number(splitQty) || 1));
    const now = new Date().toISOString();

    if (qtyMove >= splitItem.soLuongTon) {
      // Full conversion of this item's status
      const updated: InventoryItem = {
        ...splitItem,
        phanLoai: splitTargetStatus,
        viTriKho: splitLocation.trim() || splitItem.viTriKho,
        updatedAt: now,
      };
      const log: InventoryLog = {
        id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        itemId: splitItem.id,
        loaiBienDong: 'PHAN_LOAI',
        maVT: splitItem.maVT,
        tenVT: splitItem.tenVT,
        serialNumber: splitItem.serialNumber,
        hangSanXuat: splitItem.hangSanXuat,
        dongThietBi: splitItem.dongThietBi,
        tuPhanLoai: splitItem.phanLoai,
        denPhanLoai: splitTargetStatus,
        soLuongThayDoi: 0,
        tonTruoc: splitItem.soLuongTon,
        tonSau: splitItem.soLuongTon,
        nguoiThucHien: splitItem.canBoNhap || 'Quản lý kho',
        lyDo:
          splitReason.trim() ||
          `Chuyển trạng thái sang ${INVENTORY_STATUS_META[splitTargetStatus].label}`,
        timestamp: now,
      };
      await onSaveItemsAndLogs([updated], [log]);
      setSplitItem(null);
      onShowToast(`Đã chuyển trạng thái sang ${INVENTORY_STATUS_META[splitTargetStatus].label}.`);
      return;
    }

    // Partial split into a new row
    const remaining = splitItem.soLuongTon - qtyMove;
    const sourceUpdated: InventoryItem = {
      ...splitItem,
      soLuongTon: remaining,
      soLuongBanDau: Math.max(remaining, splitItem.soLuongBanDau - qtyMove),
      updatedAt: now,
    };

    const newItemId = `inv-split-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const newItem: InventoryItem = {
      ...splitItem,
      id: newItemId,
      soLuongTon: qtyMove,
      soLuongBanDau: qtyMove,
      phanLoai: splitTargetStatus,
      viTriKho: splitLocation.trim() || splitItem.viTriKho,
      migratedFromVoucherId: undefined,
      migratedFromItemId: undefined,
      createdAt: now,
      updatedAt: now,
    };

    const logSource: InventoryLog = {
      id: `log-${Date.now()}-s1-${Math.random().toString(36).slice(2, 5)}`,
      itemId: splitItem.id,
      loaiBienDong: 'TACH_DONG',
      maVT: splitItem.maVT,
      tenVT: splitItem.tenVT,
      serialNumber: splitItem.serialNumber,
      hangSanXuat: splitItem.hangSanXuat,
      dongThietBi: splitItem.dongThietBi,
      tuPhanLoai: splitItem.phanLoai,
      denPhanLoai: splitTargetStatus,
      soLuongThayDoi: -qtyMove,
      tonTruoc: splitItem.soLuongTon,
      tonSau: remaining,
      nguoiThucHien: splitItem.canBoNhap || 'Quản lý kho',
      lyDo:
        splitReason.trim() ||
        `Tách ${qtyMove} sang ${INVENTORY_STATUS_META[splitTargetStatus].label}`,
      timestamp: now,
    };

    const logTarget: InventoryLog = {
      id: `log-${Date.now()}-s2-${Math.random().toString(36).slice(2, 5)}`,
      itemId: newItemId,
      loaiBienDong: 'TACH_DONG',
      maVT: newItem.maVT,
      tenVT: newItem.tenVT,
      serialNumber: newItem.serialNumber,
      hangSanXuat: newItem.hangSanXuat,
      dongThietBi: newItem.dongThietBi,
      tuPhanLoai: splitItem.phanLoai,
      denPhanLoai: splitTargetStatus,
      soLuongThayDoi: qtyMove,
      tonTruoc: 0,
      tonSau: qtyMove,
      nguoiThucHien: splitItem.canBoNhap || 'Quản lý kho',
      lyDo:
        splitReason.trim() ||
        `Nhận tách ${qtyMove} từ dòng gốc (${INVENTORY_STATUS_META[splitItem.phanLoai].label})`,
      timestamp: now,
    };

    await onSaveItemsAndLogs([sourceUpdated, newItem], [logSource, logTarget]);
    setSplitItem(null);
    onShowToast(
      `Đã tách ${qtyMove} sang ${INVENTORY_STATUS_META[splitTargetStatus].label} (dòng gốc còn ${remaining}).`
    );
  };

  // Open Edit / Create New Modal
  const openEditModal = (item: InventoryItem) => {
    setIsCreatingNew(false);
    setEditingItem(item);
    setEditForm({
      tenVT: item.tenVT,
      maVT: item.maVT || '',
      serialNumber: item.serialNumber || '',
      phanLoai: item.phanLoai,
      hangSanXuat: item.hangSanXuat || '',
      dongThietBi: item.dongThietBi || '',
      viTriKho: item.viTriKho || '',
      donViTinh: item.donViTinh || 'Cái',
      soLuongTon: item.soLuongTon,
      ghiChu: item.ghiChu || '',
      privateNotePlain: decryptedNotes[item.id] || '',
      adjustReason: '',
    });
  };

  const openCreateModal = () => {
    setIsCreatingNew(true);
    setEditingItem(null);
    setEditForm({
      tenVT: '',
      maVT: '',
      serialNumber: '',
      phanLoai: 'VAT_TU_TOT',
      hangSanXuat: '',
      dongThietBi: '',
      viTriKho: 'Kho tồn & Tài sản',
      donViTinh: 'Cái',
      soLuongTon: 1,
      ghiChu: '',
      privateNotePlain: '',
      adjustReason: '',
    });
  };

  const handleSaveEditOrCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm.tenVT.trim()) return;

    const now = new Date().toISOString();
    const cipherPrivate =
      isUnlocked && activePin && editForm.privateNotePlain.trim()
        ? await encryptNote(editForm.privateNotePlain.trim())
        : '';

    const cleanQty = Math.max(0, Number(editForm.soLuongTon) || 0);

    if (isCreatingNew) {
      const newId = `inv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const newItem: InventoryItem = {
        id: newId,
        maVT: editForm.maVT.trim(),
        tenVT: editForm.tenVT.trim(),
        serialNumber: editForm.serialNumber.trim().toUpperCase(),
        soLuongTon: cleanQty,
        soLuongBanDau: cleanQty,
        donViTinh: editForm.donViTinh.trim() || 'Cái',
        phanLoai: editForm.phanLoai,
        hangSanXuat: editForm.hangSanXuat.trim(),
        dongThietBi: editForm.dongThietBi.trim(),
        viTriKho: editForm.viTriKho.trim() || 'Kho tồn & Tài sản',
        soChungTuGoc: 'NHAP-TRUC-TIEP',
        ngayNhap: now.slice(0, 10),
        canBoNhap: 'Quản lý kho',
        ghiChu: editForm.ghiChu.trim(),
        privateNote: cipherPrivate,
        createdAt: now,
        updatedAt: now,
      };
      const log: InventoryLog = {
        id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        itemId: newId,
        loaiBienDong: 'NHAP_MOI',
        maVT: newItem.maVT,
        tenVT: newItem.tenVT,
        serialNumber: newItem.serialNumber,
        hangSanXuat: newItem.hangSanXuat,
        dongThietBi: newItem.dongThietBi,
        denPhanLoai: newItem.phanLoai,
        soLuongThayDoi: cleanQty,
        tonTruoc: 0,
        tonSau: cleanQty,
        nguoiThucHien: 'Quản lý kho',
        soChungTuThamChieu: 'NHAP-TRUC-TIEP',
        lyDo: 'Thêm mới trực tiếp trong tab Kho tồn & Tài sản',
        timestamp: now,
      };
      await onSaveItemsAndLogs([newItem], [log]);
      setIsCreatingNew(false);
      onShowToast(`Đã thêm mới "${newItem.tenVT}" vào Kho tồn & Tài sản.`);
      return;
    }

    if (!editingItem) return;

    const logsToWrite: InventoryLog[] = [];
    if (cleanQty !== editingItem.soLuongTon) {
      logsToWrite.push({
        id: `log-${Date.now()}-adj-${Math.random().toString(36).slice(2, 5)}`,
        itemId: editingItem.id,
        loaiBienDong: 'DIEU_CHINH',
        maVT: editForm.maVT.trim(),
        tenVT: editForm.tenVT.trim(),
        serialNumber: editForm.serialNumber.trim().toUpperCase(),
        hangSanXuat: editForm.hangSanXuat.trim(),
        dongThietBi: editForm.dongThietBi.trim(),
        tuPhanLoai: editingItem.phanLoai,
        denPhanLoai: editForm.phanLoai,
        soLuongThayDoi: cleanQty - editingItem.soLuongTon,
        tonTruoc: editingItem.soLuongTon,
        tonSau: cleanQty,
        nguoiThucHien: 'Quản lý kho',
        lyDo: editForm.adjustReason.trim() || 'Điều chỉnh số lượng kiểm kê',
        timestamp: now,
      });
    } else if (editForm.phanLoai !== editingItem.phanLoai) {
      logsToWrite.push({
        id: `log-${Date.now()}-cls-${Math.random().toString(36).slice(2, 5)}`,
        itemId: editingItem.id,
        loaiBienDong: 'PHAN_LOAI',
        maVT: editForm.maVT.trim(),
        tenVT: editForm.tenVT.trim(),
        serialNumber: editForm.serialNumber.trim().toUpperCase(),
        hangSanXuat: editForm.hangSanXuat.trim(),
        dongThietBi: editForm.dongThietBi.trim(),
        tuPhanLoai: editingItem.phanLoai,
        denPhanLoai: editForm.phanLoai,
        soLuongThayDoi: 0,
        tonTruoc: editingItem.soLuongTon,
        tonSau: cleanQty,
        nguoiThucHien: 'Quản lý kho',
        lyDo: `Chuyển phân loại sang ${INVENTORY_STATUS_META[editForm.phanLoai].label}`,
        timestamp: now,
      });
    }

    const updatedItem: InventoryItem = {
      ...editingItem,
      tenVT: editForm.tenVT.trim(),
      maVT: editForm.maVT.trim(),
      serialNumber: editForm.serialNumber.trim().toUpperCase(),
      phanLoai: editForm.phanLoai,
      hangSanXuat: editForm.hangSanXuat.trim(),
      dongThietBi: editForm.dongThietBi.trim(),
      viTriKho: editForm.viTriKho.trim(),
      donViTinh: editForm.donViTinh.trim() || 'Cái',
      soLuongTon: cleanQty,
      soLuongBanDau: Math.max(editingItem.soLuongBanDau, cleanQty),
      ghiChu: editForm.ghiChu.trim(),
      privateNote: cipherPrivate,
      updatedAt: now,
    };

    await onSaveItemsAndLogs([updatedItem], logsToWrite);
    setEditingItem(null);
    onShowToast(`Đã cập nhật "${updatedItem.tenVT}".`);
  };

  // Filtered Logs for History Modal
  const filteredLogs = useMemo(() => {
    const q = logSearch.trim().toLowerCase();
    return logs.filter((l) => {
      if (logTypeFilter !== 'ALL' && l.loaiBienDong !== logTypeFilter) return false;
      if (!q) return true;
      return (
        (l.tenVT || '').toLowerCase().includes(q) ||
        (l.maVT || '').toLowerCase().includes(q) ||
        (l.serialNumber || '').toLowerCase().includes(q) ||
        (l.nguoiNhan || '').toLowerCase().includes(q) ||
        (l.soChungTuThamChieu || '').toLowerCase().includes(q) ||
        (l.lyDo || '').toLowerCase().includes(q)
      );
    });
  }, [logs, logSearch, logTypeFilter]);

  if (!isUnlocked) return null;

  const renderItemRow = (item: InventoryItem, idx: number, showBrandLine = true) => {
    const statusMeta = INVENTORY_STATUS_META[item.phanLoai];
    const isSelected = selectedIds.includes(item.id);
    const plainPrivate = decryptedNotes[item.id];
    const isOut = item.soLuongTon <= 0;

    return (
      <tr
        key={item.id}
        className={`transition-colors ${
          isSelected
            ? 'bg-blue-50/70'
            : isOut
            ? 'bg-slate-50/60 text-slate-400'
            : 'hover:bg-slate-50/90'
        }`}
      >
        <td className="py-2.5 px-2.5 text-center align-top">
          <button
            type="button"
            onClick={() => toggleSelectOne(item.id)}
            className="text-slate-400 hover:text-[#004b93] cursor-pointer mt-0.5"
            aria-label="Chọn dòng"
          >
            {isSelected ? (
              <CheckSquare className="w-4 h-4 text-[#004b93]" />
            ) : (
              <Square className="w-4 h-4" />
            )}
          </button>
        </td>

        <td className="py-2.5 px-2 text-center font-mono text-[11px] text-slate-400 align-top">
          {idx + 1}
        </td>

        <td className="py-2.5 px-3 align-top min-w-[230px]">
          <div className="font-semibold text-slate-900 leading-snug">{item.tenVT}</div>
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 mt-1 text-[11px] text-slate-500">
            {item.maVT && (
              <span className="font-mono font-semibold text-[#004b93]">
                Mã: {item.maVT}
              </span>
            )}
            {item.serialNumber && (
              <span className="font-mono font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                S/N: {item.serialNumber}
              </span>
            )}
            {item.soChungTuGoc && (
              <span className="font-mono text-slate-400">
                CT: {item.soChungTuGoc}
              </span>
            )}
          </div>
          {item.ghiChu && (
            <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">{item.ghiChu}</p>
          )}
          {plainPrivate && (
            <div className="mt-1 inline-flex items-center gap-1 text-[11px] text-indigo-800 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
              <Lock className="w-3 h-3 text-indigo-600 shrink-0" />
              <span>{plainPrivate}</span>
            </div>
          )}
        </td>

        {showBrandLine && (
          <td className="py-2.5 px-3 align-top min-w-[155px]">
            {item.hangSanXuat || item.dongThietBi ? (
              <div className="space-y-0.5">
                <div className="text-xs font-semibold text-slate-800">
                  {item.hangSanXuat || <span className="text-slate-400 italic">Chưa gán hãng</span>}
                </div>
                <div className="text-[11px] text-slate-500">
                  {item.dongThietBi || <span className="text-slate-400 italic">Chưa gán dòng</span>}
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => openEditModal(item)}
                className="text-[11px] text-amber-700 hover:text-amber-900 underline decoration-dashed cursor-pointer"
              >
                + Gán hãng / dòng
              </button>
            )}
          </td>
        )}

        <td className="py-2.5 px-3 align-top">
          <select
            value={item.phanLoai}
            onChange={(e) =>
              handleQuickStatusChange(item, e.target.value as InventoryPhanLoai)
            }
            className={`text-[11px] font-bold px-2 py-1 rounded-lg border cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#00a3e0] ${statusMeta.badgeClass}`}
          >
            <option value="CHUA_PHAN_LOAI">Chờ phân loại</option>
            <option value="VAT_TU_TOT">Vật tư tốt</option>
            <option value="VAT_TU_LOI">Vật tư lỗi</option>
            <option value="TAI_SAN">Tài sản</option>
          </select>
        </td>

        <td className="py-2.5 px-3 text-right align-top whitespace-nowrap">
          <div className="font-mono tabular-nums text-sm font-black text-slate-900">
            {item.soLuongTon}
            <span className="text-[11px] font-normal text-slate-400 ml-1">
              / {item.soLuongBanDau} {item.donViTinh}
            </span>
          </div>
          {isOut && (
            <span className="text-[10px] font-semibold text-slate-400">Đã xuất hết</span>
          )}
        </td>

        <td className="py-2.5 px-3 align-top text-xs text-slate-600 min-w-[120px]">
          {item.viTriKho || '—'}
        </td>

        <td className="py-2.5 px-2.5 align-top whitespace-nowrap text-right">
          <div className="inline-flex items-center gap-1">
            {item.soLuongTon > 0 && (
              <>
                <button
                  type="button"
                  onClick={() => openStockOutModal(item)}
                  className="px-2 py-1 bg-[#004b93] hover:bg-[#003870] text-white text-[11px] font-semibold rounded-lg inline-flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
                  title="Xuất kho sử dụng / điều chuyển"
                >
                  <ArrowUpRight className="w-3 h-3" />
                  <span>Xuất</span>
                </button>
                <button
                  type="button"
                  onClick={() => openSplitModal(item)}
                  className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 text-[11px] font-semibold rounded-lg inline-flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
                  title="Tách số lượng hoặc chuyển trạng thái"
                >
                  <GitBranch className="w-3 h-3" />
                  <span>Tách</span>
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => openEditModal(item)}
              className="p-1.5 text-slate-500 hover:text-[#004b93] hover:bg-slate-100 rounded-lg cursor-pointer"
              title="Sửa thông tin / Hãng / Dòng / Ghi chú riêng"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setDeleteTarget(item)}
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
              title="Xóa dòng tồn kho"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </td>
      </tr>
    );
  };

  return (
    <div className="max-w-7xl mx-auto space-y-4 pb-24">
      {/* Header Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Package className="w-5 h-5 text-[#004b93]" />
              <span>Kho tồn & Tài sản</span>
            </h2>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
              <Lock className="w-3 h-3" />
              <span>Bảo vệ bởi mã PIN • Nhập qua #lab</span>
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Theo dõi độc lập vật tư tốt, vật tư lỗi và tài sản theo hãng/dòng thiết bị. Số liệu sửa chữa không bị ảnh hưởng.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {brandLineSuggestions.length > 0 && (
            <button
              type="button"
              onClick={openSuggestModal}
              className="px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>Gợi ý Hãng/Dòng ({brandLineSuggestions.length})</span>
            </button>
          )}
          <button
            type="button"
            onClick={openCreateModal}
            className="px-3 py-2 bg-[#004b93] hover:bg-[#003870] text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Thêm trực tiếp</span>
          </button>
          <button
            type="button"
            onClick={() => setIsLogsOpen(true)}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
          >
            <History className="w-3.5 h-3.5 text-[#004b93]" />
            <span>Lịch sử ({logs.length})</span>
          </button>
          <button
            type="button"
            onClick={() => {
              exportInventoryToCSV(filteredItems, decryptedNotes);
              onShowToast('Đã xuất danh sách Kho tồn & Tài sản ra CSV.');
            }}
            disabled={filteredItems.length === 0}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Xuất CSV</span>
          </button>
        </div>
      </div>

      {/* Summary Metric Strip (Clickable Status Filters) */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
        {[
          {
            key: 'ALL' as const,
            label: 'Tổng tồn khả dụng',
            value: metrics.totalTon,
            sub: `${metrics.activeRows} dòng còn tồn`,
            activeBorder: 'border-[#004b93] bg-blue-50/60',
            textColor: 'text-[#004b93]',
          },
          {
            key: 'CHUA_PHAN_LOAI' as const,
            label: 'Chờ phân loại',
            value: metrics.chuaPhanLoai,
            sub: 'Cần gán tốt / lỗi / TS',
            activeBorder: 'border-slate-500 bg-slate-100',
            textColor: 'text-slate-700',
          },
          {
            key: 'VAT_TU_TOT' as const,
            label: 'Vật tư tốt',
            value: metrics.vatTuTot,
            sub: 'Sẵn sàng xuất dùng',
            activeBorder: 'border-emerald-500 bg-emerald-50/70',
            textColor: 'text-emerald-700',
          },
          {
            key: 'VAT_TU_LOI' as const,
            label: 'Vật tư lỗi',
            value: metrics.vatTuLoi,
            sub: 'Chờ kiểm tra / xử lý',
            activeBorder: 'border-rose-500 bg-rose-50/70',
            textColor: 'text-rose-700',
          },
          {
            key: 'TAI_SAN' as const,
            label: 'Tài sản',
            value: metrics.taiSan,
            sub: 'Quản lý theo dòng TB',
            activeBorder: 'border-indigo-500 bg-indigo-50/70',
            textColor: 'text-indigo-700',
          },
        ].map((card) => {
          const isActive = statusFilter === card.key;
          return (
            <button
              key={card.key}
              type="button"
              onClick={() => setStatusFilter(card.key)}
              className={`text-left p-3.5 rounded-xl border transition-colors cursor-pointer ${
                isActive
                  ? card.activeBorder
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                {card.label}
              </div>
              <div className={`text-2xl font-black font-mono tabular-nums mt-0.5 ${card.textColor}`}>
                {card.value}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5 truncate">{card.sub}</div>
            </button>
          );
        })}
      </div>

      {/* Multi-Facet Search & Filter Toolbar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3.5 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5">
          {/* Search Input */}
          <div className="relative md:col-span-5">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm tên VT, mã VT, serial, hãng, dòng thiết bị, ghi chú..."
              className="w-full h-10 pl-9 pr-8 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#00a3e0] focus:bg-white"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Brand Filter */}
          <div className="md:col-span-3">
            <select
              value={brandFilter}
              onChange={(e) => {
                setBrandFilter(e.target.value);
                setLineFilter('ALL');
              }}
              className="w-full h-10 px-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#00a3e0]"
            >
              <option value="ALL">Tất cả Hãng SX ({distinctBrands.length})</option>
              <option value="__UNASSIGNED__">Chưa gán Hãng SX</option>
              {distinctBrands.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          {/* Device Line Filter */}
          <div className="md:col-span-2">
            <select
              value={lineFilter}
              onChange={(e) => setLineFilter(e.target.value)}
              className="w-full h-10 px-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#00a3e0]"
            >
              <option value="ALL">Tất cả Dòng TB</option>
              <option value="__UNASSIGNED__">Chưa gán Dòng</option>
              {distinctLines.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </div>

          {/* View Mode Switcher */}
          <div className="md:col-span-2 flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`flex-1 h-8 rounded-lg text-xs font-bold inline-flex items-center justify-center gap-1 cursor-pointer transition-colors whitespace-nowrap ${
                viewMode === 'table'
                  ? 'bg-white text-[#004b93] shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Bảng</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grouped')}
              className={`flex-1 h-8 rounded-lg text-xs font-bold inline-flex items-center justify-center gap-1 cursor-pointer transition-colors whitespace-nowrap ${
                viewMode === 'grouped'
                  ? 'bg-white text-[#004b93] shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Theo Hãng</span>
            </button>
          </div>
        </div>

        {/* Secondary Toolbar Row */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
          <div className="flex flex-wrap items-center gap-3 text-slate-600">
            <span>
              Hiển thị <b className="font-mono tabular-nums text-slate-900">{filteredItems.length}</b> dòng •{' '}
              Tổng tồn:{' '}
              <b className="font-mono tabular-nums text-[#004b93]">
                {filteredItems.reduce((s, i) => s + (Number(i.soLuongTon) || 0), 0)}
              </b>
            </span>
            {(statusFilter !== 'ALL' || brandFilter !== 'ALL' || lineFilter !== 'ALL' || searchTerm) && (
              <button
                type="button"
                onClick={() => {
                  setStatusFilter('ALL');
                  setBrandFilter('ALL');
                  setLineFilter('ALL');
                  setSearchTerm('');
                }}
                className="text-rose-600 hover:text-rose-800 font-semibold inline-flex items-center gap-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Xóa bộ lọc</span>
              </button>
            )}
          </div>

          <label className="inline-flex items-center gap-2 text-xs text-slate-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={hideZeroStock}
              onChange={(e) => setHideZeroStock(e.target.checked)}
              className="rounded border-slate-300 text-[#004b93] focus:ring-[#00a3e0]"
            />
            <span>
              Ẩn dòng đã xuất hết (Tồn = 0)
              {metrics.zeroStockRows > 0 && (
                <span className="text-slate-400 ml-1">({metrics.zeroStockRows})</span>
              )}
            </span>
          </label>
        </div>
      </div>

      {/* Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <div className="bg-blue-50 border border-[#00a3e0] rounded-2xl p-3.5 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs font-bold text-[#004b93] flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4" />
              <span>
                Đang chọn <span className="font-mono tabular-nums">{selectedIds.length}</span> dòng để cập nhật hàng loạt
              </span>
            </div>
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="text-xs text-slate-600 hover:text-slate-900 font-semibold cursor-pointer"
            >
              Bỏ chọn tất cả
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
            <select
              value={bulkStatus}
              onChange={(e) => setBulkStatus(e.target.value as '' | InventoryPhanLoai)}
              className="h-9 px-2.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800"
            >
              <option value="">-- Phân loại (giữ nguyên) --</option>
              <option value="CHUA_PHAN_LOAI">Chờ phân loại</option>
              <option value="VAT_TU_TOT">Vật tư tốt</option>
              <option value="VAT_TU_LOI">Vật tư lỗi</option>
              <option value="TAI_SAN">Tài sản</option>
            </select>

            <input
              type="text"
              list="inv-brand-datalist"
              value={bulkBrand}
              onChange={(e) => setBulkBrand(e.target.value)}
              placeholder="Hãng SX (để trống = giữ nguyên)"
              className="h-9 px-2.5 bg-white border border-slate-300 rounded-lg text-xs"
            />

            <input
              type="text"
              list="inv-line-datalist"
              value={bulkLine}
              onChange={(e) => setBulkLine(e.target.value)}
              placeholder="Dòng TB (để trống = giữ nguyên)"
              className="h-9 px-2.5 bg-white border border-slate-300 rounded-lg text-xs"
            />

            <input
              type="text"
              value={bulkLocation}
              onChange={(e) => setBulkLocation(e.target.value)}
              placeholder="Vị trí kho / Người giữ"
              className="h-9 px-2.5 bg-white border border-slate-300 rounded-lg text-xs"
            />

            <button
              type="button"
              disabled={isSavingBulk}
              onClick={handleApplyBulkUpdate}
              className="h-9 px-3 bg-[#004b93] hover:bg-[#003870] disabled:opacity-50 text-white rounded-lg text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Áp dụng ({selectedIds.length})</span>
            </button>
          </div>
        </div>
      )}

      {/* Datalists for Smart Combo Inputs */}
      <datalist id="inv-brand-datalist">
        {allBrandDatalist.map((b) => (
          <option key={b} value={b} />
        ))}
      </datalist>
      <datalist id="inv-line-datalist">
        {allLineDatalist.map((l) => (
          <option key={l} value={l} />
        ))}
      </datalist>

      {/* Main Content Area: Empty vs Table vs Grouped */}
      {filteredItems.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-3">
          <Package className="w-11 h-11 text-slate-300 mx-auto" />
          <h3 className="font-bold text-slate-700 text-base">
            {items.length === 0
              ? 'Chưa có dữ liệu trong Kho tồn & Tài sản'
              : 'Không có vật tư nào khớp với bộ lọc hiện tại'}
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {items.length === 0
              ? 'Bạn có thể tạo phiếu nhập / quét AI OCR / upload Excel như bình thường và gõ từ khóa #lab vào mục Ghi chú chứng từ để hệ thống tự động rẽ nhánh vào đây.'
              : 'Thử bỏ bớt bộ lọc hoặc tắt "Ẩn dòng đã xuất hết" để kiểm tra toàn bộ danh mục.'}
          </p>
        </div>
      ) : viewMode === 'table' ? (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                <tr>
                  <th className="py-3 px-2.5 w-10 text-center">
                    <button
                      type="button"
                      onClick={toggleSelectAllFiltered}
                      className="text-slate-500 hover:text-[#004b93] cursor-pointer"
                      title="Chọn / bỏ chọn tất cả dòng đang hiển thị"
                    >
                      {allFilteredSelected ? (
                        <CheckSquare className="w-4 h-4 text-[#004b93]" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                  <th className="py-3 px-2 w-10 text-center">STT</th>
                  <th className="py-3 px-3">Thiết bị / Mã VT / Serial</th>
                  <th className="py-3 px-3">Hãng & Dòng TB</th>
                  <th className="py-3 px-3 w-36">Phân loại</th>
                  <th className="py-3 px-3 text-right w-28">Tồn kho</th>
                  <th className="py-3 px-3">Vị trí / Nơi giữ</th>
                  <th className="py-3 px-3 text-right w-44">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.map((it, idx) => renderItemRow(it, idx, true))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {groupedData.map((group) => {
            const isCollapsed = Boolean(collapsedGroups[group.key]);
            return (
              <div
                key={group.key}
                className="bg-white border border-slate-200 rounded-2xl overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() =>
                    setCollapsedGroups((prev) => ({
                      ...prev,
                      [group.key]: !prev[group.key],
                    }))
                  }
                  className="w-full px-4 py-3 bg-slate-50 hover:bg-slate-100/80 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-left cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    {isCollapsed ? (
                      <ChevronRight className="w-4 h-4 text-slate-500" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-500" />
                    )}
                    <Building2 className="w-4 h-4 text-[#004b93]" />
                    <span className="font-bold text-sm text-slate-900">{group.brand}</span>
                    <span className="text-slate-300">/</span>
                    <span className="font-semibold text-xs text-slate-700">{group.line}</span>
                    <span className="text-[11px] text-slate-500 font-mono">
                      ({group.rows.length} dòng)
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono tabular-nums">
                    <span className="px-2 py-0.5 rounded bg-blue-50 text-[#004b93] border border-blue-200 font-bold">
                      Tổng tồn: {group.totalTon}
                    </span>
                    {group.tot > 0 && (
                      <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
                        Tốt: {group.tot}
                      </span>
                    )}
                    {group.loi > 0 && (
                      <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 font-bold">
                        Lỗi: {group.loi}
                      </span>
                    )}
                    {group.taiSan > 0 && (
                      <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold">
                        TS: {group.taiSan}
                      </span>
                    )}
                    {group.choPL > 0 && (
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-300 font-bold">
                        Chờ PL: {group.choPL}
                      </span>
                    )}
                  </div>
                </button>

                {!isCollapsed && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <tbody className="divide-y divide-slate-100">
                        {group.rows.map((it, idx) => renderItemRow(it, idx, false))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal 1: Stock-Out (Xuất kho sử dụng) */}
      {stockOutItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
          onClick={() => setStockOutItem(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-[#004b93] text-white px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-sm">
                <ArrowUpRight className="w-4 h-4 text-cyan-300" />
                <span>Xuất kho sử dụng</span>
              </div>
              <button
                type="button"
                onClick={() => setStockOutItem(null)}
                className="text-white/70 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmStockOut} className="p-5 space-y-3.5 text-xs">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1">
                <div className="font-bold text-slate-900 text-sm">{stockOutItem.tenVT}</div>
                <div className="text-slate-500 flex flex-wrap gap-2 font-mono">
                  {stockOutItem.maVT && <span>Mã: {stockOutItem.maVT}</span>}
                  {stockOutItem.serialNumber && <span>S/N: {stockOutItem.serialNumber}</span>}
                  <span>
                    Hiện tồn: <b className="text-[#004b93]">{stockOutItem.soLuongTon}</b> {stockOutItem.donViTinh}
                  </span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-700">Số lượng xuất *</label>
                  <button
                    type="button"
                    onClick={() => setStockOutQty(stockOutItem.soLuongTon)}
                    className="text-[11px] font-bold text-[#004b93] hover:underline cursor-pointer"
                  >
                    Xuất hết ({stockOutItem.soLuongTon})
                  </button>
                </div>
                <input
                  type="number"
                  min={1}
                  max={stockOutItem.soLuongTon}
                  required
                  value={stockOutQty}
                  onChange={(e) =>
                    setStockOutQty(
                      Math.max(1, Math.min(stockOutItem.soLuongTon, parseInt(e.target.value, 10) || 1))
                    )
                  }
                  className="w-full h-10 px-3 border border-slate-300 rounded-xl font-mono font-bold text-sm"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Người nhận / Đơn vị sử dụng *
                </label>
                <input
                  type="text"
                  required
                  value={stockOutRecipient}
                  onChange={(e) => setStockOutRecipient(e.target.value)}
                  placeholder="VD: Tổ KT Đống Đa / Nguyễn Văn A..."
                  className="w-full h-10 px-3 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Số CT tham chiếu</label>
                  <input
                    type="text"
                    value={stockOutRef}
                    onChange={(e) => setStockOutRef(e.target.value)}
                    placeholder="VD: PXK-..."
                    className="w-full h-10 px-3 border border-slate-300 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Người xuất kho</label>
                  <input
                    type="text"
                    value={stockOutActor}
                    onChange={(e) => setStockOutActor(e.target.value)}
                    placeholder="Tên cán bộ xuất..."
                    className="w-full h-10 px-3 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Lý do / Mục đích xuất</label>
                <input
                  type="text"
                  value={stockOutReason}
                  onChange={(e) => setStockOutReason(e.target.value)}
                  placeholder="VD: Thay thế card lỗi tại trạm, cấp phát sử dụng..."
                  className="w-full h-10 px-3 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setStockOutItem(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-semibold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#004b93] hover:bg-[#003870] text-white font-bold cursor-pointer"
                >
                  Xác nhận xuất kho
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Split Quantity / Transfer Status */}
      {splitItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
          onClick={() => setSplitItem(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-slate-800 text-white px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-sm">
                <GitBranch className="w-4 h-4 text-cyan-300" />
                <span>Tách số lượng / Chuyển phân loại</span>
              </div>
              <button
                type="button"
                onClick={() => setSplitItem(null)}
                className="text-white/70 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmSplit} className="p-5 space-y-3.5 text-xs">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1">
                <div className="font-bold text-slate-900 text-sm">{splitItem.tenVT}</div>
                <div className="text-slate-600">
                  Trạng thái hiện tại: <b>{INVENTORY_STATUS_META[splitItem.phanLoai].label}</b> • Tồn:{' '}
                  <b className="font-mono text-[#004b93]">{splitItem.soLuongTon}</b>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    SL chuyển (1..{splitItem.soLuongTon})
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={splitItem.soLuongTon}
                    required
                    value={splitQty}
                    onChange={(e) =>
                      setSplitQty(
                        Math.max(1, Math.min(splitItem.soLuongTon, parseInt(e.target.value, 10) || 1))
                      )
                    }
                    className="w-full h-10 px-3 border border-slate-300 rounded-xl font-mono font-bold text-sm"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Chuyển sang loại</label>
                  <select
                    value={splitTargetStatus}
                    onChange={(e) => setSplitTargetStatus(e.target.value as InventoryPhanLoai)}
                    className="w-full h-10 px-2.5 border border-slate-300 rounded-xl font-semibold"
                  >
                    <option value="VAT_TU_TOT">Vật tư tốt</option>
                    <option value="VAT_TU_LOI">Vật tư lỗi</option>
                    <option value="TAI_SAN">Tài sản</option>
                    <option value="CHUA_PHAN_LOAI">Chờ phân loại</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Vị trí mới (tùy chọn)</label>
                <input
                  type="text"
                  value={splitLocation}
                  onChange={(e) => setSplitLocation(e.target.value)}
                  className="w-full h-10 px-3 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Lý do chuyển / tách</label>
                <input
                  type="text"
                  value={splitReason}
                  onChange={(e) => setSplitReason(e.target.value)}
                  placeholder="VD: Test kiểm tra tách riêng card lỗi..."
                  className="w-full h-10 px-3 border border-slate-300 rounded-xl"
                />
              </div>

              <p className="text-[11px] text-slate-500">
                {splitQty < splitItem.soLuongTon
                  ? `Sẽ tách ${splitQty} thành dòng mới ở trạng thái "${INVENTORY_STATUS_META[splitTargetStatus].label}". Dòng gốc còn ${splitItem.soLuongTon - splitQty}.`
                  : `Sẽ chuyển toàn bộ ${splitItem.soLuongTon} sang trạng thái "${INVENTORY_STATUS_META[splitTargetStatus].label}".`}
              </p>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSplitItem(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-semibold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold cursor-pointer"
                >
                  Xác nhận
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Edit / Create Inventory Item */}
      {(editingItem || isCreatingNew) && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
          onClick={() => {
            setEditingItem(null);
            setIsCreatingNew(false);
          }}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-[#004b93] text-white px-5 py-3.5 flex items-center justify-between sticky top-0 z-10">
              <div className="font-bold text-sm">
                {isCreatingNew ? 'Thêm vật tư / tài sản trực tiếp' : 'Cập nhật thông tin & Phân loại'}
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingItem(null);
                  setIsCreatingNew(false);
                }}
                className="text-white/70 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditOrCreate} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Tên thiết bị / Vật tư *</label>
                <input
                  type="text"
                  required
                  value={editForm.tenVT}
                  onChange={(e) => setEditForm({ ...editForm, tenVT: e.target.value })}
                  className="w-full h-10 px-3 border border-slate-300 rounded-xl font-semibold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Mã VT</label>
                  <input
                    type="text"
                    value={editForm.maVT}
                    onChange={(e) => setEditForm({ ...editForm, maVT: e.target.value })}
                    className="w-full h-10 px-3 border border-slate-300 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Serial Number (S/N)</label>
                  <input
                    type="text"
                    value={editForm.serialNumber}
                    onChange={(e) =>
                      setEditForm({ ...editForm, serialNumber: e.target.value.toUpperCase() })
                    }
                    className="w-full h-10 px-3 border border-slate-300 rounded-xl font-mono font-bold text-rose-700"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Phân loại</label>
                  <select
                    value={editForm.phanLoai}
                    onChange={(e) =>
                      setEditForm({ ...editForm, phanLoai: e.target.value as InventoryPhanLoai })
                    }
                    className="w-full h-10 px-2.5 border border-slate-300 rounded-xl font-bold"
                  >
                    <option value="CHUA_PHAN_LOAI">Chờ phân loại</option>
                    <option value="VAT_TU_TOT">Vật tư tốt</option>
                    <option value="VAT_TU_LOI">Vật tư lỗi</option>
                    <option value="TAI_SAN">Tài sản</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Hãng sản xuất</label>
                  <input
                    type="text"
                    list="inv-brand-datalist"
                    value={editForm.hangSanXuat}
                    onChange={(e) => setEditForm({ ...editForm, hangSanXuat: e.target.value })}
                    placeholder="Chọn hoặc gõ tên hãng (VD: Huawei, ZTE, Cisco...)"
                    className="w-full h-10 px-3 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Dòng thiết bị</label>
                  <input
                    type="text"
                    list="inv-line-datalist"
                    value={editForm.dongThietBi}
                    onChange={(e) => setEditForm({ ...editForm, dongThietBi: e.target.value })}
                    placeholder="VD: OLT / Card OLT, ONT, Switch..."
                    className="w-full h-10 px-3 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Số lượng tồn</label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={editForm.soLuongTon}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        soLuongTon: Math.max(0, parseInt(e.target.value, 10) || 0),
                      })
                    }
                    className="w-full h-10 px-3 border border-slate-300 rounded-xl font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Đơn vị tính</label>
                  <input
                    type="text"
                    value={editForm.donViTinh}
                    onChange={(e) => setEditForm({ ...editForm, donViTinh: e.target.value })}
                    className="w-full h-10 px-3 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Vị trí / Người giữ</label>
                  <input
                    type="text"
                    value={editForm.viTriKho}
                    onChange={(e) => setEditForm({ ...editForm, viTriKho: e.target.value })}
                    className="w-full h-10 px-3 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              {!isCreatingNew && editingItem && editForm.soLuongTon !== editingItem.soLuongTon && (
                <div>
                  <label className="block font-bold text-amber-800 mb-1">
                    Lý do điều chỉnh số lượng tồn ({editingItem.soLuongTon} → {editForm.soLuongTon})
                  </label>
                  <input
                    type="text"
                    value={editForm.adjustReason}
                    onChange={(e) => setEditForm({ ...editForm, adjustReason: e.target.value })}
                    placeholder="VD: Kiểm kê thực tế lại kho..."
                    className="w-full h-10 px-3 bg-amber-50 border border-amber-300 rounded-xl"
                  />
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">Ghi chú chung</label>
                <input
                  type="text"
                  value={editForm.ghiChu}
                  onChange={(e) => setEditForm({ ...editForm, ghiChu: e.target.value })}
                  className="w-full h-10 px-3 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-indigo-700 mb-1 flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Ghi chú riêng tư (mã hóa AES-256)</span>
                </label>
                <input
                  type="text"
                  value={editForm.privateNotePlain}
                  onChange={(e) => setEditForm({ ...editForm, privateNotePlain: e.target.value })}
                  placeholder="Nội dung riêng tư sẽ được mã hóa bằng mã PIN của bạn..."
                  className="w-full h-10 px-3 bg-indigo-50/50 border border-indigo-200 rounded-xl text-indigo-950"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setEditingItem(null);
                    setIsCreatingNew(false);
                  }}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-semibold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#004b93] hover:bg-[#003870] text-white font-bold cursor-pointer"
                >
                  {isCreatingNew ? 'Thêm mới' : 'Lưu thay đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 4: Auto-Suggest Brand/Line Preview */}
      {isSuggestModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
          onClick={() => setIsSuggestModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[88vh] flex flex-col border border-slate-200 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-[#004b93] text-white px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-sm">
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>Gợi ý Hãng SX & Dòng thiết bị từ tên có sẵn</span>
              </div>
              <button
                type="button"
                onClick={() => setIsSuggestModalOpen(false)}
                className="text-white/70 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 text-xs text-slate-600 border-b border-slate-100">
              Hệ thống đối chiếu từ khóa có trong Tên / Mã VT hiện tại (không tự bịa dữ liệu). Bỏ chọn các dòng bạn muốn giữ nguyên trước khi áp dụng.
            </div>

            <div className="overflow-y-auto flex-1">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 text-[11px] font-bold text-slate-600 uppercase">
                  <tr>
                    <th className="py-2.5 px-3 w-10 text-center">Chọn</th>
                    <th className="py-2.5 px-3">Tên vật tư / Mã VT</th>
                    <th className="py-2.5 px-3">Gợi ý Hãng SX</th>
                    <th className="py-2.5 px-3">Gợi ý Dòng thiết bị</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {brandLineSuggestions.map((s) => {
                    const checked = selectedSuggestionIds.has(s.item.id);
                    return (
                      <tr key={s.item.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              const next = new Set(selectedSuggestionIds);
                              if (checked) next.delete(s.item.id);
                              else next.add(s.item.id);
                              setSelectedSuggestionIds(next);
                            }}
                          />
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-slate-900">{s.item.tenVT}</div>
                          {s.item.maVT && (
                            <div className="text-[11px] font-mono text-slate-500">{s.item.maVT}</div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-[#004b93]">
                          {s.suggestedBrand || '—'}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-slate-700">
                          {s.suggestedLine || '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="p-4 border-t border-slate-200 flex items-center justify-between text-xs bg-slate-50">
              <span className="text-slate-600">
                Đã chọn <b>{selectedSuggestionIds.size}</b> / {brandLineSuggestions.length} dòng
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsSuggestModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 font-semibold cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  onClick={handleApplySuggestions}
                  className="px-5 py-2 rounded-xl bg-[#004b93] hover:bg-[#003870] text-white font-bold cursor-pointer"
                >
                  Áp dụng đã chọn
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal 5: History Logs */}
      {isLogsOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
          onClick={() => setIsLogsOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[88vh] flex flex-col border border-slate-200 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-[#004b93] text-white px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-sm">
                <History className="w-4 h-4 text-cyan-300" />
                <span>Lịch sử Xuất - Nhập - Phân loại Kho tồn & Tài sản</span>
              </div>
              <button
                type="button"
                onClick={() => setIsLogsOpen(false)}
                className="text-white/70 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 border-b border-slate-200 flex flex-wrap items-center gap-2 bg-slate-50 text-xs">
              <input
                type="text"
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                placeholder="Tìm tên VT, serial, người nhận, số chứng từ, lý do..."
                className="flex-1 min-w-[200px] h-9 px-3 bg-white border border-slate-300 rounded-xl"
              />
              <select
                value={logTypeFilter}
                onChange={(e) => setLogTypeFilter(e.target.value)}
                className="h-9 px-2.5 bg-white border border-slate-300 rounded-xl font-semibold"
              >
                <option value="ALL">Tất cả biến động</option>
                <option value="NHAP_MOI">Nhập kho mới</option>
                <option value="NHAP_CHUYEN_DOI">Chuyển từ phiếu #lab</option>
                <option value="XUAT_SU_DUNG">Xuất kho sử dụng</option>
                <option value="PHAN_LOAI">Phân loại trạng thái</option>
                <option value="TACH_DONG">Tách số lượng</option>
                <option value="DIEU_CHINH">Điều chỉnh kiểm kê</option>
              </select>
              <button
                type="button"
                onClick={() => {
                  exportInventoryLogsToCSV(filteredLogs);
                  onShowToast('Đã xuất lịch sử biến động ra CSV.');
                }}
                disabled={filteredLogs.length === 0}
                className="h-9 px-3 bg-white border border-slate-300 hover:bg-slate-100 rounded-xl font-semibold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Xuất CSV</span>
              </button>
            </div>

            <div className="overflow-y-auto flex-1">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 text-[11px] font-bold text-slate-600 uppercase">
                  <tr>
                    <th className="py-2.5 px-3">Thời gian</th>
                    <th className="py-2.5 px-3">Biến động</th>
                    <th className="py-2.5 px-3">Thiết bị / Serial</th>
                    <th className="py-2.5 px-3 text-right">Thay đổi</th>
                    <th className="py-2.5 px-3 text-right">Tồn sau</th>
                    <th className="py-2.5 px-3">Người nhận & Lý do</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        Chưa có nhật ký biến động nào.
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleString('vi-VN')}
                        </td>
                        <td className="py-2 px-3 font-semibold text-slate-700 whitespace-nowrap">
                          {INVENTORY_LOG_TYPE_LABELS[log.loaiBienDong] || log.loaiBienDong}
                        </td>
                        <td className="py-2 px-3">
                          <div className="font-semibold text-slate-900">{log.tenVT}</div>
                          {log.serialNumber && (
                            <span className="font-mono text-[11px] text-slate-500">
                              S/N: {log.serialNumber}
                            </span>
                          )}
                        </td>
                        <td
                          className={`py-2 px-3 text-right font-mono font-bold tabular-nums ${
                            log.soLuongThayDoi > 0
                              ? 'text-emerald-700'
                              : log.soLuongThayDoi < 0
                              ? 'text-rose-700'
                              : 'text-slate-500'
                          }`}
                        >
                          {log.soLuongThayDoi > 0
                            ? `+${log.soLuongThayDoi}`
                            : log.soLuongThayDoi}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold tabular-nums text-slate-800">
                          {log.tonSau}
                        </td>
                        <td className="py-2 px-3 text-slate-600">
                          {log.nguoiNhan && (
                            <span className="font-semibold text-slate-800 mr-1.5">
                              [{log.nguoiNhan}]
                            </span>
                          )}
                          <span>{log.lyDo}</span>
                          {log.soChungTuThamChieu && (
                            <span className="ml-1.5 font-mono text-[11px] text-[#004b93]">
                              ({log.soChungTuThamChieu})
                            </span>
                          )}
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

      {/* Modal 6: Delete Confirmation */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
          onClick={() => setDeleteTarget(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-5 border border-slate-200 space-y-4 text-xs sm:text-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="font-bold text-slate-900 text-base">Xác nhận xóa khỏi Kho tồn</div>
            <p className="text-slate-600">
              Bạn có chắc chắn muốn xóa dòng{' '}
              <b className="text-slate-900">{deleteTarget.tenVT}</b> (Tồn: {deleteTarget.soLuongTon})?
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-semibold cursor-pointer text-xs"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={async () => {
                  const target = deleteTarget;
                  setDeleteTarget(null);
                  await onDeleteItem(target.id);
                  onShowToast(`Đã xóa "${target.tenVT}".`);
                }}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold cursor-pointer text-xs"
              >
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
