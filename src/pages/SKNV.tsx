/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  LayoutGrid, 
  Trash2, 
  Search,
  ChevronDown,
  ShoppingBag, 
  Boxes, 
  Users, 
  Grid2X2, 
  Zap, 
  Trophy, 
  TrendingUp, 
  Target, 
  BarChart3,
  Download,
  Filter,
  User,
  Check,
  CheckSquare,
  Square,
  Image as ImageIcon,
  Loader2,
  Store,
  Undo2,
  Camera,
  Link
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toPng } from 'html-to-image';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types ---

interface MarketInfo {
  name: string;
  targetST: number;
  actualReal: number;
  actualVirtual: number;
}

interface CategoryData {
  name: string;
  actual: number;
  target: number;
  rate: number;
}

interface StaffData {
  displayName: string;
  fullId: string;
  actualVal: number;
  virtualVal: number;
  effVal: number;
  target?: number;
  rate?: number;
}

interface StaffMatrixData {
  displayName: string;
  fullId: string;
  achieved: number;
  totalCats: number;
  rate: number;
  rawValues: number[];
  projectedRates: number[];
}

// --- Storage Keys ---
const STORAGE_KEYS = {
  MARKET: 'BI_PRO_MARK_V30',
  STAFF: 'BI_PRO_STAF_V30',
  CAT: 'BI_PRO_CAT_V30',
  STAFF_CAT: 'BI_PRO_SCAT_V30',
  ADJUSTMENT: 'BI_PRO_ADJUST_V30',
  EXCLUDED_STAFF: 'BI_PRO_EXCLUDED_V30',
  EXCLUDED_MARKETS: 'BI_PRO_EX_MARK_V30',
  DAYS_PASSED: 'BI_PRO_DAYS_PASSED_V30',
  TOTAL_DAYS: 'BI_PRO_TOTAL_DAYS_V30',
  SELECTED_MONTH: 'BI_PRO_SEL_MONTH_V30',
  CAT_ADJUSTMENTS: 'BI_PRO_CAT_ADJ_V30'
};

export default function StaffHealth({ onNavigate }: { onNavigate?: (page: 'general' | 'realtime' | 'update' | 'staff') => void }) {
  // --- State ---
  const [marketInput, setMarketInput] = useState(() => localStorage.getItem(STORAGE_KEYS.MARKET) || '');
  const [staffInput, setStaffInput] = useState(() => localStorage.getItem(STORAGE_KEYS.STAFF) || '');
  const [categoryInput, setCategoryInput] = useState(() => localStorage.getItem(STORAGE_KEYS.CAT) || '');
  const [staffCategoryInput, setStaffCategoryInput] = useState(() => localStorage.getItem(STORAGE_KEYS.STAFF_CAT) || '');
  const [manualAdjustment, setManualAdjustment] = useState(() => Number(localStorage.getItem(STORAGE_KEYS.ADJUSTMENT)) || 0);
  
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SELECTED_MONTH);
    if (saved) return saved;
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const [categoryAdjustments, setCategoryAdjustments] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.CAT_ADJUSTMENTS);
    return saved ? JSON.parse(saved) : {};
  });

  const [daysPassed, setDaysPassed] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.DAYS_PASSED);
    if (saved) return Number(saved);
    const now = new Date();
    let d = now.getDate() - 1;
    return d < 1 ? 1 : d;
  });
  const [totalDays, setTotalDays] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.TOTAL_DAYS);
    if (saved) return Number(saved);
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  });

  // Filter state
  const [excludedStaffIds, setExcludedStaffIds] = useState<string[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.EXCLUDED_STAFF);
    return saved ? JSON.parse(saved) : [];
  });
  const [excludedMarketNames, setExcludedMarketNames] = useState<string[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.EXCLUDED_MARKETS);
    return saved ? JSON.parse(saved) : [];
  });
  
  const [processedData, setProcessedData] = useState<{
    markets: MarketInfo[];
    catData: CategoryData[];
    staffRankData: StaffData[];
    staffEffData: StaffData[];
    staffMatrix: StaffMatrixData[];
  }>({
    markets: [],
    catData: [],
    staffRankData: [],
    staffEffData: [],
    staffMatrix: []
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [isCapturing, setIsCapturing] = useState<string | null>(null);

  // Refs for capture
  const captureRefs = {
    staffRank: useRef<HTMLDivElement>(null),
    staffEff: useRef<HTMLDivElement>(null),
    staffMatrixDetail: useRef<HTMLDivElement>(null)
  };

  // --- Effects ---
  useEffect(() => {
    // Auto process if data exists
    if (marketInput || staffInput || categoryInput || staffCategoryInput) {
      setTimeout(() => {
        handleProcess();
      }, 100);
    }
  }, []);

  const displayData = useMemo(() => {
    if (processedData.markets.length === 0) return null;

    const visibleMarkets = processedData.markets.filter(m => !excludedMarketNames.includes(m.name));
    const visibleStaffRaw = processedData.staffRankData.filter(s => !excludedStaffIds.includes(s.fullId));
    const visibleStaffCount = visibleStaffRaw.length;

    if (visibleStaffCount === 0) {
      return {
        ...processedData,
        markets: visibleMarkets,
        staffRankData: [],
        staffMatrix: [],
        staffEffData: processedData.staffEffData.filter(s => !excludedStaffIds.includes(s.fullId))
      };
    }

    const totalMarketTarget = visibleMarkets.reduce((acc, m) => acc + m.targetST, 0);
    const targetPerStaff = totalMarketTarget / visibleStaffCount;

    // Recalculate Category Data
    const catData = processedData.catData.map(c => {
      let rate = 0;
      if (c.target > 0 && daysPassed > 0) {
        rate = ((c.actual / daysPassed) * totalDays) / c.target * 100;
        rate = Math.round(rate * 10) / 10;
      }
      return { ...c, rate };
    });

    // Recalculate Staff Rank Data
    const staffRankData = visibleStaffRaw.map(s => {
      let rate = 0;
      if (targetPerStaff > 0 && daysPassed > 0) {
        rate = ((s.virtualVal / daysPassed) * totalDays) / targetPerStaff * 100;
      }
      return {
        ...s,
        target: targetPerStaff,
        rate
      };
    }).sort((a, b) => (b.rate || 0) - (a.rate || 0));

    // Recalculate Staff Matrix Data
    const staffMatrix = processedData.staffMatrix
      .filter(s => !excludedStaffIds.includes(s.fullId))
      .map(s => {
        let achieved = 0;
        processedData.catData.forEach((cat, idx) => {
          const targetPerStaffPerCat = cat.target / visibleStaffCount;
          if (s.rawValues && s.rawValues[idx] >= targetPerStaffPerCat) {
            achieved++;
          }
        });
        return {
          ...s,
          achieved,
          rate: (achieved / s.totalCats) * 100
        };
      }).sort((a, b) => b.rate - a.rate);

    // Filter Staff Eff Data
    const staffEffData = processedData.staffEffData
      .filter(s => !excludedStaffIds.includes(s.fullId));

    return {
      ...processedData,
      markets: visibleMarkets,
      catData,
      staffRankData,
      staffEffData,
      staffMatrix
    };
  }, [processedData, excludedStaffIds, excludedMarketNames, daysPassed, totalDays]);

  // --- Effects ---
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.MARKET, marketInput);
    localStorage.setItem(STORAGE_KEYS.STAFF, staffInput);
    localStorage.setItem(STORAGE_KEYS.CAT, categoryInput);
    localStorage.setItem(STORAGE_KEYS.STAFF_CAT, staffCategoryInput);
    localStorage.setItem(STORAGE_KEYS.ADJUSTMENT, manualAdjustment.toString());
    localStorage.setItem(STORAGE_KEYS.EXCLUDED_STAFF, JSON.stringify(excludedStaffIds));
    localStorage.setItem(STORAGE_KEYS.EXCLUDED_MARKETS, JSON.stringify(excludedMarketNames));
    localStorage.setItem(STORAGE_KEYS.DAYS_PASSED, daysPassed.toString());
    localStorage.setItem(STORAGE_KEYS.TOTAL_DAYS, totalDays.toString());
    localStorage.setItem(STORAGE_KEYS.SELECTED_MONTH, selectedMonth);
  }, [marketInput, staffInput, categoryInput, staffCategoryInput, manualAdjustment, excludedStaffIds, excludedMarketNames, daysPassed, totalDays, selectedMonth]);

  // Auto-process on load if data exists
  useEffect(() => {
    if (marketInput || staffInput || categoryInput || staffCategoryInput) {
      handleProcess();
    }
  }, []);

  // --- Parsing Logic ---

  const parseMarketData = (input: string, adjustment: number): MarketInfo[] => {
    const val = input.trim();
    if (!val) return [];
    const lines = val.split('\n');
    const results: MarketInfo[] = [];

    const cleanNum = (s: string) => {
      if (!s) return 0;
      // Remove all characters except digits, dots, commas, and minus
      let clean = s.replace(/[^\d,.-]/g, '');
      
      const lastDot = clean.lastIndexOf('.');
      const lastComma = clean.lastIndexOf(',');

      if (lastComma !== -1 && lastDot !== -1) {
        if (lastComma > lastDot) {
          // Vietnamese: 1.234,56
          return parseFloat(clean.replace(/\./g, '').replace(',', '.'));
        } else {
          // English: 1,234.56
          return parseFloat(clean.replace(/,/g, ''));
        }
      } else if (lastComma !== -1) {
        // Only comma. In BI reports for revenue, 1,553 is almost always 1553.
        // If it's followed by exactly 3 digits, treat as thousands separator.
        const parts = clean.split(',');
        if (parts.length === 2 && parts[1].length === 3) {
          return parseFloat(clean.replace(',', ''));
        }
        // Otherwise treat as decimal (e.g. 83,17)
        return parseFloat(clean.replace(',', '.'));
      } else if (lastDot !== -1) {
        // Only dot. 
        const parts = clean.split('.');
        if (parts.length === 2 && parts[1].length === 3) {
          // Likely thousands: 7.626
          return parseFloat(clean.replace('.', ''));
        }
        // Likely decimal: 155.96
        return parseFloat(clean);
      }
      return parseFloat(clean) || 0;
    };

    for (const line of lines) {
      const cleanLine = line.trim();
      if (cleanLine.toLowerCase().startsWith("tổng") || cleanLine.toLowerCase().startsWith("tên miền")) continue;
      
      const regex = /-?[\d,.]+(%?)/g;
      let match;
      const numberMatches: RegExpExecArray[] = [];
      while ((match = regex.exec(cleanLine)) !== null) {
        numberMatches.push(match);
      }
      
      if (numberMatches.length >= 5) {
        let firstPercentIdx = -1;
        for (let i = 0; i < numberMatches.length; i++) {
          if (numberMatches[i][0].includes('%')) {
            firstPercentIdx = i;
            break;
          }
        }

        if (firstPercentIdx >= 4) {
          // Anchor: numberMatches[firstPercentIdx] is "% HT Target Dự Kiến (QĐ)"
          // index - 4: DTLK (Actual Real) - This is where data starts
          
          const actualReal = cleanNum(numberMatches[firstPercentIdx - 4][0]);
          const actualVirtual = cleanNum(numberMatches[firstPercentIdx - 2][0]);
          const virtualProj = cleanNum(numberMatches[firstPercentIdx - 1][0]);
          let efficiency = cleanNum(numberMatches[firstPercentIdx][0]);
          
          if (efficiency > 0) {
            const rate = efficiency > 5 ? efficiency / 100 : efficiency;
            const baseTarget = virtualProj / rate;
            const adjustedTarget = baseTarget * (1 + adjustment / 100);
            
            // Extract name: everything before the first data column
            const firstDataMatch = numberMatches[firstPercentIdx - 4];
            let marketName = "7038";
            
            if (firstDataMatch.index !== undefined) {
               const rawName = cleanLine.substring(0, firstDataMatch.index).trim();
               // Clean up trailing dashes if present
               let name = rawName.replace(/[-_]+$/, '').trim();
               // Remove trailing number (likely Store ID) if it exists
               // e.g. "12 Trần Hưng Đạo 169" -> "12 Trần Hưng Đạo"
               name = name.replace(/\s+\d+$/, '').trim();
               
               marketName = name;
               if (!marketName) marketName = "7038";
            }
            
            if (!results.some(m => m.name === marketName)) {
              results.push({ name: marketName, targetST: adjustedTarget, actualReal, actualVirtual });
            }
          }
        }
      }
    }
    return results;
  };

  const parseCategoryData = (input: string, daysPassed: number, totalDays: number, catAdjustments: Record<string, number>): CategoryData[] => {
    const val = input.trim();
    if (!val) return [];
    const lines = val.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const results: CategoryData[] = [];
    let currentCatName = "";
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const numbers = line.match(/-?[\d,.]+(%?)/g);
      
      // A data line must have at least 4 numbers and contain a '%' sign
      const isDataLine = numbers && numbers.length >= 4 && line.includes('%');
      
      if (!isDataLine) {
        if (!line.startsWith("Tổng") && !line.includes("Target")) {
          currentCatName = line.replace(/^ĐML_/, '').trim();
        }
        continue;
      }
      
      // It's a data line (Dòng 3)
      const lastNumberStr = numbers[numbers.length - 1];
      const hasRank = !lastNumberStr.includes('%') && !isNaN(parseFloat(lastNumberStr));
      
      if (!hasRank) {
        continue; // "dữ liệu chỉ lấy khi cột xếp hạng trong miền có dữ liệu"
      }
      
      const cleanNum = (s: string) => parseFloat(s.replace(/,/g, ''));
      
      // Dòng 3: Lấy dữ liệu theo thứ tự từ trái qua phải
      // numbers[0] = Số_1, numbers[1] = Số_2, numbers[2] = Số_3, numbers[3] = Số_4
      
      // Lũy kế: Số thứ 2 từ trái qua
      let actual = 0;
      if (numbers.length >= 2) {
        actual = cleanNum(numbers[1]);
        // Làm tròn 1 chữ số thập phân
        actual = Math.round(actual * 10) / 10;
      }
      
      // Target: Số thứ 3 từ trái qua
      let target = 0;
      if (numbers.length >= 3) {
        target = cleanNum(numbers[2]);
        // Làm tròn 1 chữ số thập phân
        target = Math.round(target * 10) / 10;
      }
      
      let extractedName = "";
      let isSLLK = false;
      let isDTLK = false;
      const isSM = (s: string) => /ĐIỆN MÁY XANH|THẾ GIỚI DI ĐỘNG|ĐMX|TGDĐ|TOPZONE/i.test(s);

      // Dòng 1: Tên ngành hàng
      let candidate = "";
      if (i >= 2) candidate = lines[i - 2];
      if (!candidate || isSM(candidate) || candidate.startsWith("Tổng")) {
        if (i >= 1) candidate = lines[i - 1];
      }
      if (!candidate || isSM(candidate) || candidate.startsWith("Tổng")) {
        candidate = currentCatName;
      }

      if (candidate && !isSM(candidate) && !candidate.startsWith("Tổng")) {
        extractedName = candidate.replace(/^ĐML_/, '').trim();
      }
      
      if (extractedName.includes('SLLK')) isSLLK = true;
      if (extractedName.includes('DTLK')) isDTLK = true;
      
      if (extractedName) {
        // Cắt bỏ từ cụm từ SLLK hoặc DTLK về sau
        extractedName = extractedName.split(/SLLK|DTLK/)[0].trim();
        
        if (isSLLK) extractedName += " - SLLK";
        else if (isDTLK) extractedName += " - DTLK";
        
        // Apply category adjustment using the full name (e.g., "TIVI - SLLK")
        const adj = catAdjustments[extractedName] ?? 100;
        if (adj !== 100) {
          target = target * (adj / 100);
        }
        
        results.push({
          name: extractedName,
          target,
          actual,
          rate: 0 // Calculated in useMemo
        });
      }
    }
    return results;
  };

  const parseStaffMatrixData = (input: string, staffCount: number, categoryTargets: CategoryData[], daysPassed: number, totalDays: number): StaffMatrixData[] => {
    const val = input.trim();
    if (!val || !staffCount || categoryTargets.length === 0) return [];
    const lines = val.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const results: StaffMatrixData[] = [];
    const targetPerStaffPerCat: Record<string, number> = {};
    categoryTargets.forEach(cat => { targetPerStaffPerCat[cat.name] = cat.target / staffCount; });
    
    lines.forEach(line => {
      const match = line.match(/(.+) - (\d+)/);
      if (match) {
        const fullName = match[1].trim();
        const id = match[2];
        const numbers = line.substring(match[0].length).match(/-?[\d,.]+/g);
        if (numbers) {
          const rawValues = numbers.map(n => parseFloat(n.replace(/,/g, '')));
          let achieved = 0;
          const projectedRates: number[] = [];

          for (let i = 0; i < Math.min(rawValues.length, categoryTargets.length); i++) {
            const catName = categoryTargets[i].name;
            const target = targetPerStaffPerCat[catName];
            let projectedRate = 0;
            
            if (target > 0 && daysPassed > 0) {
              // Formula: %HT = ((Accumulated / DaysPassed) * TotalDays) / Target
              projectedRate = ((rawValues[i] / daysPassed) * totalDays) / target * 100;
            }
            
            projectedRates.push(projectedRate);
            if (projectedRate >= 100) achieved++;
          }

          results.push({ 
            displayName: fullName.split(' ').pop() || fullName, 
            fullId: id, 
            achieved, 
            totalCats: categoryTargets.length, 
            rate: (achieved / categoryTargets.length) * 100,
            rawValues,
            projectedRates
          });
        }
      }
    });
    return results.sort((a, b) => b.rate - a.rate);
  };

  const handleProcess = () => {
    setIsProcessing(true);
    setTimeout(() => {
      const markets = parseMarketData(marketInput, manualAdjustment);
      const catData = parseCategoryData(categoryInput, daysPassed, totalDays, categoryAdjustments);
      
      const linesStaff = staffInput.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      let validStaffCount = 0;
      const staffDataRaw: StaffData[] = [];
      
      linesStaff.forEach(line => {
        const match = line.match(/(.+) - (\d+)\s+([\d,.]+)\s+([\d,.]+)\s+([\d,.]+)/);
        if (match && !["trưởng ca", "quản lý", "tđkh", "tổ trưởng", "bảo vệ"].some(r => match[1].toLowerCase().includes(r))) {
          validStaffCount++;
          staffDataRaw.push({ 
            displayName: match[1].trim().split(' ').pop() || match[1].trim(), 
            fullId: match[2], 
            actualVal: parseFloat(match[3].replace(/,/g, '')), 
            virtualVal: parseFloat(match[4].replace(/,/g, '')), 
            effVal: parseFloat(match[5].replace(/,/g, '')) 
          });
        }
      });

      let staffRankData: StaffData[] = [];
      if (markets.length > 0 && validStaffCount > 0) {
        const totalTarget = markets.reduce((acc, m) => acc + m.targetST, 0);
        const target = totalTarget / validStaffCount;
        staffRankData = staffDataRaw.map(i => {
          // Formula: %HT = ((Accumulated / DaysPassed) * TotalDays) / Target
          let rate = 0;
          if (target > 0 && daysPassed > 0) {
            rate = ((i.virtualVal / daysPassed) * totalDays) / target * 100;
          }
          return { 
            ...i, 
            target, 
            rate 
          };
        }).sort((a, b) => (b.rate || 0) - (a.rate || 0));
      }

      const staffEffData = [...staffDataRaw].sort((a, b) => b.effVal - a.effVal);
      const staffMatrix = parseStaffMatrixData(staffCategoryInput, validStaffCount, catData, daysPassed, totalDays);

      setProcessedData({
        markets,
        catData,
        staffRankData,
        staffEffData,
        staffMatrix
      });
      setIsProcessing(false);
    }, 500);
  };

  // --- Capture Logic ---

  const captureElement = async (ref: React.RefObject<HTMLDivElement | null>, fileName: string) => {
    if (!ref.current) return;
    setIsCapturing(fileName);
    try {
      const dataUrl = await toPng(ref.current, {
        cacheBust: true,
        backgroundColor: "#f8fafc",
        pixelRatio: 2,
      });
      const link = document.createElement('a');
      link.download = `${fileName}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error('Capture failed:', error);
    } finally {
      setIsCapturing(null);
    }
  };

  const batchDownload = async () => {
    const downloads = [
      { ref: captureRefs.staffRank, name: '1_DoanhThu_NhanVien' },
      { ref: captureRefs.staffEff, name: '2_HieuQua_NhanVien' },
      { ref: captureRefs.staffMatrixDetail, name: '3_ChiTiet_ThiDua_NganhHang' },
    ];

    for (const item of downloads) {
      if (item.ref.current) {
        await captureElement(item.ref, item.name);
        // Small delay between downloads
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
  };

  // --- Helper Components ---

  const getRankBadge = (index: number, total: number) => {
    if (index < 3) return (
      <span className="bg-emerald-100 text-emerald-700 font-black text-[10px] px-2 py-1 rounded border border-emerald-200 inline-flex items-center justify-center gap-1 min-w-[60px]">
        <Trophy size={10} /> TOP {index + 1}
      </span>
    );
    if (total >= 6 && index >= total - 3) return (
      <span className="bg-rose-100 text-rose-700 font-bold text-[10px] px-2 py-1 rounded border border-rose-200 inline-flex items-center justify-center min-w-[60px]">
        BOT {total - index}
      </span>
    );
    return <span className="text-slate-300">-</span>;
  };

  const calculateProjected = (marketInfo: MarketInfo) => {
    const projectedAbsoluteValue = (marketInfo.actualVirtual / daysPassed) * totalDays;
    const projectedPercentage = (projectedAbsoluteValue / marketInfo.targetST) * 100;
    
    return {
      projectedAbsoluteValue,
      projectedPercentage
    };
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans text-slate-800">
      {/* Top Navigation Bar */}
      <div className="p-4 md:p-8">
        {/* Header */}
        <header className="max-w-6xl mx-auto mb-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-200">
            <LayoutGrid size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase leading-none">💪 SỨC KHOẺ NHÂN VIÊN</h1>
            <p className="text-[11px] text-slate-400 font-bold tracking-widest uppercase mt-1">v8.1.0 • Precision Analytics</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Data management moved to UpdateData page */}
        </div>
      </header>

      <main className="max-w-6xl mx-auto">
        {!displayData && !isProcessing && (
          <div className="text-center py-20">
            <p className="text-slate-400 font-bold">Chưa có dữ liệu báo cáo.</p>
            <p className="text-slate-400 text-sm mt-2">Vui lòng cập nhật dữ liệu tại trang "Cập nhật Data".</p>
          </div>
        )}

        {/* Results Section */}
        <AnimatePresence>
          {displayData && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              {/* Action Bar */}
              <div className="flex flex-wrap justify-center lg:justify-end gap-3 bg-white p-3 rounded-2xl shadow-sm border border-slate-200">
                <button 
                  onClick={() => captureElement(captureRefs.staffRank, 'DoanhThu_NhanVien')}
                  className="flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-2 rounded-xl text-[10px] font-black uppercase border border-indigo-100 hover:bg-indigo-100 transition-all"
                >
                  <Camera size={12} /> DOANH THU QUY ĐỔI
                </button>
                <button 
                  onClick={() => captureElement(captureRefs.staffEff, 'HieuQua_NhanVien')}
                  className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-xl text-[10px] font-black uppercase border border-emerald-100 hover:bg-emerald-100 transition-all"
                >
                  <Camera size={12} /> HIỆU QUẢ QUY ĐỔI
                </button>
                <button 
                  onClick={() => captureElement(captureRefs.staffMatrixDetail, 'ChiTiet_ThiDua_NganhHang')}
                  className="flex items-center gap-2 bg-purple-50 text-purple-700 px-4 py-2 rounded-xl text-[10px] font-black uppercase border border-purple-100 hover:bg-purple-100 transition-all"
                >
                  <Camera size={12} /> CHI TIẾT THI ĐUA
                </button>
                <div className="w-px bg-slate-200 mx-1 hidden lg:block" />
                <button 
                  onClick={batchDownload}
                  className="flex items-center gap-2 bg-slate-900 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase shadow-lg hover:bg-black transition-all"
                >
                  <Download size={12} /> Tải 3 Ảnh Báo Cáo
                </button>
              </div>

              {/* Filter Card moved to UpdateData page */}

              {/* Tables */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                {/* Staff Rank */}
                <div ref={captureRefs.staffRank} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-6 bg-indigo-600 rounded-full" />
                      <h3 className="font-black text-slate-800 text-sm uppercase tracking-wider">🥇 DOANH THU QUY ĐỔI</h3>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-indigo-50/80 border-y border-indigo-100/50">
                        <tr>
                          <th className="px-2 py-3 md:px-6 md:py-4 text-[10px] md:text-[11px] font-black text-indigo-800 uppercase tracking-wider">Nhân viên</th>
                          <th className="px-2 py-3 md:px-4 md:py-4 text-[10px] md:text-[11px] font-black text-indigo-800 uppercase tracking-wider text-center">Target</th>
                          <th className="px-2 py-3 md:px-4 md:py-4 text-[10px] md:text-[11px] font-black text-indigo-800 uppercase tracking-wider text-center">Lũy kế</th>
                          <th className="px-2 py-3 md:px-6 md:py-4 text-[10px] md:text-[11px] font-black text-indigo-800 uppercase tracking-wider text-right">%HT</th>
                          <th className="px-2 py-3 md:px-4 md:py-4 text-[10px] md:text-[11px] font-black text-indigo-800 uppercase tracking-wider text-center">TOP/BOT</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {displayData.staffRankData
                          .map((item, idx) => (
                          <tr key={idx} className="even:bg-slate-50/50 hover:bg-indigo-50/40 transition-colors">
                            <td className="px-2 py-3 md:px-6 md:py-4">
                              <p className="text-[11px] md:text-xs font-bold text-slate-800 uppercase">{item.displayName} - {item.fullId}</p>
                            </td>
                            <td className="px-2 py-3 md:px-4 md:py-4 text-[11px] md:text-xs text-slate-400 text-center">{Math.round(item.target || 0).toLocaleString('vi-VN')}</td>
                            <td className="px-2 py-3 md:px-4 md:py-4 text-[11px] md:text-xs font-bold text-slate-800 text-center">{Math.round(item.virtualVal).toLocaleString('vi-VN')}</td>
                            <td className={cn(
                              "px-2 py-3 md:px-6 md:py-4 text-[11px] md:text-xs font-black text-right",
                              (item.rate || 0) < 80 ? "text-rose-500" : (item.rate || 0) < 100 ? "text-amber-500" : "text-indigo-600"
                            )}>
                              {(item.rate || 0).toFixed(1)}%
                            </td>
                            <td className="px-2 py-3 md:px-4 md:py-4 text-center">
                              {getRankBadge(idx, displayData.staffRankData.length)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Staff Efficiency */}
                <div ref={captureRefs.staffEff} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-6 bg-emerald-500 rounded-full" />
                      <h3 className="font-black text-slate-800 text-sm uppercase tracking-wider">⚡ HIỆU QUẢ QUY ĐỔI</h3>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-emerald-50/80 border-y border-emerald-100/50">
                        <tr>
                          <th className="px-2 py-3 md:px-6 md:py-4 text-[10px] md:text-[11px] font-black text-emerald-800 uppercase tracking-wider">Nhân viên</th>
                          <th className="px-2 py-3 md:px-4 md:py-4 text-[10px] md:text-[11px] font-black text-emerald-800 uppercase tracking-wider text-center">DT Thực</th>
                          <th className="px-2 py-3 md:px-4 md:py-4 text-[10px] md:text-[11px] font-black text-emerald-800 uppercase tracking-wider text-center">DT Quy đổi</th>
                          <th className="px-2 py-3 md:px-6 md:py-4 text-[10px] md:text-[11px] font-black text-emerald-800 uppercase tracking-wider text-right">HQ</th>
                          <th className="px-2 py-3 md:px-4 md:py-4 text-[10px] md:text-[11px] font-black text-emerald-800 uppercase tracking-wider text-center">TOP/BOT</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {displayData.staffEffData
                          .map((item, idx) => (
                          <tr key={idx} className="even:bg-slate-50/50 hover:bg-indigo-50/40 transition-colors">
                            <td className="px-2 py-3 md:px-6 md:py-4">
                              <p className="text-[11px] md:text-xs font-bold text-slate-800 uppercase">{item.displayName} - {item.fullId}</p>
                            </td>
                            <td className="px-2 py-3 md:px-4 md:py-4 text-[11px] md:text-xs text-slate-400 text-center">{Math.round(item.actualVal).toLocaleString('vi-VN')}</td>
                            <td className="px-2 py-3 md:px-4 md:py-4 text-[11px] md:text-xs font-bold text-slate-800 text-center">{Math.round(item.virtualVal).toLocaleString('vi-VN')}</td>
                            <td className="px-2 py-3 md:px-6 md:py-4 text-[11px] md:text-xs font-black text-emerald-600 text-right">
                              {Math.round(item.effVal * 100)}%
                            </td>
                            <td className="px-2 py-3 md:px-4 md:py-4 text-center">
                              {getRankBadge(idx, displayData.staffEffData.length)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Staff Matrix Detail Table */}
                <div ref={captureRefs.staffMatrixDetail} className="col-span-1 lg:col-span-2 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden mt-8">
                  <div className="p-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-6 bg-purple-600 rounded-full" />
                      <h3 className="font-black text-slate-800 text-sm uppercase tracking-wider">📊 ALL NGÀNH HÀNG NHÂN VIÊN TÍNH DỰ KIẾN DỰA TRÊN TARGET NGÀNH HÀNG SIÊU THỊ</h3>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-purple-50/80 border-y border-purple-100/50">
                        <tr>
                          <th className="px-4 py-4 text-[11px] font-black text-purple-800 uppercase tracking-wider sticky left-0 bg-purple-50 z-10 border-r border-purple-100">Nhân viên</th>
                          <th className="px-2 py-4 text-[10px] font-black text-purple-800 uppercase tracking-wider text-center border-r border-purple-100 w-20">Đạt / Tổng</th>
                          <th className="px-2 py-4 text-[10px] font-black text-purple-800 uppercase tracking-wider text-center border-r border-purple-100 w-16">Tỷ lệ</th>
                          {displayData.catData.map((cat, idx) => (
                            <th key={idx} className="px-2 py-4 text-[10px] font-black text-purple-800 uppercase tracking-wider text-center min-w-[100px] border-r border-purple-100 last:border-r-0">
                              {cat.name}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {displayData.staffMatrix.map((item, idx) => (
                          <tr key={idx} className="even:bg-slate-50/50 hover:bg-indigo-50/40 transition-colors">
                            <td className="px-4 py-3 text-xs font-bold text-slate-800 sticky left-0 bg-white even:bg-slate-50/50 border-r border-slate-100">
                              {item.displayName}
                            </td>
                            <td className="px-2 py-3 text-xs font-bold text-slate-600 text-center border-r border-slate-100">
                              {item.achieved} / {item.totalCats}
                            </td>
                            <td className={cn(
                              "px-2 py-3 text-xs font-black text-center border-r border-slate-100",
                              item.rate < 80 ? "text-rose-500" : item.rate < 100 ? "text-amber-500" : "text-emerald-500"
                            )}>
                              {item.rate.toFixed(0)}%
                            </td>
                            {item.projectedRates && item.projectedRates.map((rate, rIdx) => (
                              <td key={rIdx} className={cn(
                                "px-2 py-3 text-[11px] font-bold text-center border-r border-slate-100 last:border-r-0",
                                rate < 80 ? "text-rose-500" : rate < 100 ? "text-amber-500" : "text-emerald-600"
                              )}>
                                {rate.toFixed(1)}%
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="max-w-6xl mx-auto mt-16 pt-8 border-t border-slate-200 text-center">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
          ⚙️ BI PROCESOR • Built by Võ Vũ Linh @{new Date().getFullYear()}
        </p>
      </footer>

      {/* Capture Overlay */}
      <AnimatePresence>
        {isCapturing && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center gap-4"
          >
            <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-black text-slate-900 uppercase tracking-widest">Đang tạo ảnh: {isCapturing}...</p>
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </div>
  );
}
