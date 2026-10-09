import React, { useState } from 'react';
import { Search, X, Check, Package, Cpu } from 'lucide-react';
import { THIET_BI_MAU } from '../constants/sampleData';
import { ThietBiMau } from '../types';

interface EquipmentCatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (item: ThietBiMau) => void;
}

export const EquipmentCatalogModal: React.FC<EquipmentCatalogModalProps> = ({
  isOpen,
  onClose,
  onSelect,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Tất cả');

  if (!isOpen) return null;

  const categories = ['Tất cả', ...Array.from(new Set(THIET_BI_MAU.map((item) => item.loai)))];

  const filteredItems = THIET_BI_MAU.filter((item) => {
    const matchSearch =
      item.tenVT.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.maVT.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCategory = selectedCategory === 'Tất cả' || item.loai === selectedCategory;
    return matchSearch && matchCategory;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="bg-[#004b93] text-white px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-cyan-300" />
            <h3 className="font-bold text-base">Danh mục thiết bị chuẩn</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Filter */}
        <div className="p-3 bg-slate-50 border-b border-slate-200 space-y-2.5">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm theo mã (ONT-..., MESH-...) hoặc tên thiết bị..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#00a3e0] focus:border-[#00a3e0]"
              autoFocus
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Categories Pill Bar */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-[#004b93] text-white'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* List of items */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {filteredItems.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <Cpu className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <p className="text-sm">Không tìm thấy thiết bị phù hợp</p>
            </div>
          ) : (
            filteredItems.map((item) => (
              <div
                key={item.maVT}
                onClick={() => {
                  onSelect(item);
                  onClose();
                }}
                className="group p-3 rounded-xl border border-slate-200 hover:border-[#00a3e0] hover:bg-cyan-50/40 transition-all cursor-pointer flex items-center justify-between active:scale-[0.99]"
              >
                <div className="min-w-0 pr-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-[#004b93]/10 text-[#004b93]">
                      {item.maVT}
                    </span>
                    <span className="text-[11px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                      {item.loai}
                    </span>
                  </div>
                  <h4 className="text-sm font-semibold text-slate-800 group-hover:text-[#004b93] transition-colors leading-snug">
                    {item.tenVT}
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">Đơn vị tính: {item.donViTinh}</p>
                </div>

                <div className="shrink-0 flex items-center">
                  <span className="w-8 h-8 rounded-full bg-slate-100 group-hover:bg-[#00a3e0] group-hover:text-white text-slate-500 flex items-center justify-center transition-colors">
                    <Check className="w-4 h-4" />
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-xs text-slate-500">
          <span>{filteredItems.length} thiết bị có sẵn</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
