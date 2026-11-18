import { InventoryPhanLoai, InventoryLogType } from '../types';

export interface InventoryStatusMeta {
  value: InventoryPhanLoai;
  label: string;
  shortLabel: string;
  badgeClass: string;
  dotClass: string;
}

export const INVENTORY_STATUS_META: Record<InventoryPhanLoai, InventoryStatusMeta> = {
  CHUA_PHAN_LOAI: {
    value: 'CHUA_PHAN_LOAI',
    label: 'Chờ phân loại',
    shortLabel: 'Chờ phân loại',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-300',
    dotClass: 'bg-slate-400',
  },
  VAT_TU_TOT: {
    value: 'VAT_TU_TOT',
    label: 'Vật tư tốt',
    shortLabel: 'Tốt',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-300',
    dotClass: 'bg-emerald-500',
  },
  VAT_TU_LOI: {
    value: 'VAT_TU_LOI',
    label: 'Vật tư lỗi',
    shortLabel: 'Lỗi',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-300',
    dotClass: 'bg-rose-500',
  },
  TAI_SAN: {
    value: 'TAI_SAN',
    label: 'Tài sản',
    shortLabel: 'Tài sản',
    badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-300',
    dotClass: 'bg-indigo-500',
  },
};

export const INVENTORY_LOG_TYPE_LABELS: Record<InventoryLogType, string> = {
  NHAP_MOI: 'Nhập kho mới',
  NHAP_CHUYEN_DOI: 'Chuyển từ phiếu #lab',
  XUAT_SU_DUNG: 'Xuất kho sử dụng',
  DIEU_CHINH: 'Điều chỉnh kiểm kê',
  PHAN_LOAI: 'Phân loại trạng thái',
  TACH_DONG: 'Tách số lượng / Trạng thái',
};

export const PRESET_BRANDS: string[] = [
  'VNPT / iGate',
  'Huawei',
  'ZTE',
  'Nokia / Alcatel',
  'Cisco',
  'Juniper',
  'Raisecom',
  'TP-Link',
  'MikroTik',
  'Dasan',
  'Comway',
  'Sumitomo',
  'Fujikura',
  'EXFO',
  'Yokogawa',
];

export const PRESET_DEVICE_LINES: string[] = [
  'ONT / Modem GPON',
  'Wifi Mesh / Router Wifi',
  'OLT / Card OLT',
  'Switch / L2-L3',
  'Router Core / BRAS',
  'Module SFP / Quang',
  'Truyền dẫn / DWDM / SDH',
  'Converter / Media',
  'Thiết bị đo / Máy hàn cáp',
  'Nguồn / Ắc quy / Rectifier',
  'Cáp / Phụ kiện quang',
];

export interface BrandLineSuggestion {
  hangSanXuat: string;
  dongThietBi: string;
  matchedRule: string;
}

/**
 * Rule-based deterministic suggestion from explicit tokens inside tenVT / maVT.
 * Never fabricates data; returns null when no reliable token matches.
 */
export function suggestBrandAndLine(tenVT: string, maVT: string = ''): BrandLineSuggestion | null {
  const raw = `${tenVT || ''} ${maVT || ''}`.trim();
  if (!raw) return null;

  const text = raw.toUpperCase();

  let brand = '';
  let line = '';
  let matchedRule = '';

  // 1. Detect Brand from explicit keywords
  if (/\b(VNPT|IGATE|GW020|GW040|GW240|EW12|EW30|EW12S|EW12C|XG020|XGPON)\b/i.test(text)) {
    brand = 'VNPT / iGate';
    matchedRule = 'VNPT / iGate';
  } else if (/\b(ZTE|ZXA10|C300|C320|C600|C650|F670|F660|F601|F680|GTGH|GTGO|PRWH|PRAM|SCXM|GFGH)\b/i.test(text)) {
    brand = 'ZTE';
    matchedRule = 'ZTE';
  } else if (/\b(HUAWEI|MA56|MA58|MA5608|MA5680|MA5800|HG8|EG8|H80[0-9]|GPFD|GPUF|GPHF|GPBH|OSN|OPTIX|NE40|NE80|S57\d{2}|S67\d{2})\b/i.test(text)) {
    brand = 'Huawei';
    matchedRule = 'Huawei';
  } else if (/\b(NOKIA|ALCATEL|ALCL|7360|7750|7210|ISAM|G-?040|G-?240|G-?140|NGLT|FANT|FGLT|NT-?A|NT-?B)\b/i.test(text)) {
    brand = 'Nokia / Alcatel';
    matchedRule = 'Nokia / Alcatel';
  } else if (/\b(CISCO|CATALYST|WS-C|C2960|C3560|C3650|C3750|C3850|C9200|C9300|ASR|ISR|NEXUS)\b/i.test(text)) {
    brand = 'Cisco';
    matchedRule = 'Cisco';
  } else if (/\b(JUNIPER|EX\d{4}|MX\d{2,4}|QFX\d{4}|SRX\d{3,4})\b/i.test(text)) {
    brand = 'Juniper';
    matchedRule = 'Juniper';
  } else if (/\b(RAISECOM|ISCOM|RC00[12]|HT803)\b/i.test(text)) {
    brand = 'Raisecom';
    matchedRule = 'Raisecom';
  } else if (/\b(TP-?LINK|TPLINK|ARCHER|TL-)\b/i.test(text)) {
    brand = 'TP-Link';
    matchedRule = 'TP-Link';
  } else if (/\b(MIKROTIK|CCR\d+|CRS\d+|RB\d+)\b/i.test(text)) {
    brand = 'MikroTik';
    matchedRule = 'MikroTik';
  } else if (/\b(DASAN|V58\d+|H66\d+|H64\d+)\b/i.test(text)) {
    brand = 'Dasan';
    matchedRule = 'Dasan';
  } else if (/\b(COMWAY)\b/i.test(text)) {
    brand = 'Comway';
    matchedRule = 'Comway';
  } else if (/\b(SUMITOMO)\b/i.test(text)) {
    brand = 'Sumitomo';
    matchedRule = 'Sumitomo';
  } else if (/\b(FUJIKURA|FSM-)\b/i.test(text)) {
    brand = 'Fujikura';
    matchedRule = 'Fujikura';
  } else if (/\b(EXFO|FTB-)\b/i.test(text)) {
    brand = 'EXFO';
    matchedRule = 'EXFO';
  } else if (/\b(YOKOGAWA|AQ\d{4})\b/i.test(text)) {
    brand = 'Yokogawa';
    matchedRule = 'Yokogawa';
  }

  // 2. Detect Device Line from explicit keywords
  if (/\b(SFP\+?|QSFP|XFP|MODULE\s*QUANG|GPON\s*[BC]\+?|10G-?LR|10G-?SR|1G-?LX)\b/i.test(text)) {
    line = 'Module SFP / Quang';
  } else if (/\b(MESH|EW12|EW30|REPEATER|ACCESS\s*POINT|AP\s*WIFI)\b/i.test(text)) {
    line = 'Wifi Mesh / Router Wifi';
  } else if (/\b(ONT|MODEM|GW020|GW040|GW240|F670|F660|F601|F680|HG8|EG8|G-?040|G-?240|G-?140|H66\d+|H64\d+)\b/i.test(text)) {
    line = 'ONT / Modem GPON';
  } else if (/\b(OLT|CARD\s*OLT|C300|C320|C600|C650|MA56|MA58|7360|GTGH|GTGO|GPFD|GPUF|GPHF|GPBH|NGLT|FANT|FGLT|PRWH|SCXM|GFGH)\b/i.test(text)) {
    line = 'OLT / Card OLT';
  } else if (/\b(SWITCH|CATALYST|WS-C|C2960|C3560|C3650|C3750|C3850|C9200|C9300|ISCOM|EX\d{4}|QFX\d{4}|S57\d{2}|S67\d{2})\b/i.test(text)) {
    line = 'Switch / L2-L3';
  } else if (/\b(ROUTER|ASR|ISR|NE40|NE80|7750|MX\d{2,4}|CCR\d+|BRAS)\b/i.test(text)) {
    line = 'Router Core / BRAS';
  } else if (/\b(OSN|OPTIX|DWDM|SDH|TRUYỀN\s*DẪN|TRUYEN\s*DAN)\b/i.test(text)) {
    line = 'Truyền dẫn / DWDM / SDH';
  } else if (/\b(CONVERTER|MEDIA|QUANG\s*ĐIỆN|QUANG\s*DIEN)\b/i.test(text)) {
    line = 'Converter / Media';
  } else if (/\b(MÁY\s*HÀN|MAY\s*HAN|OTDR|MÁY\s*ĐO|MAY\s*DO|COMWAY|SUMITOMO|FUJIKURA|EXFO|YOKOGAWA)\b/i.test(text)) {
    line = 'Thiết bị đo / Máy hàn cáp';
  } else if (/\b(NGUỒN|NGUON|RECTIFIER|ẮC\s*QUY|AC\s*QUY|BATTERY|UPS|POWER)\b/i.test(text)) {
    line = 'Nguồn / Ắc quy / Rectifier';
  }

  if (!brand && !line) return null;

  return {
    hangSanXuat: brand,
    dongThietBi: line,
    matchedRule: matchedRule || line,
  };
}
