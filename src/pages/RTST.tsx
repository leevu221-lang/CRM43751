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
  marketName?: string;
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
  MARKET: 'BI_REAL_MARK_V1',
  STAFF: 'BI_REAL_STAF_V1',
  CAT: 'BI_REAL_CAT_V1',
  STAFF_CAT: 'BI_REAL_SCAT_V1',
  ADJUSTMENT: 'BI_REAL_ADJUST_V1',
  EXCLUDED_STAFF: 'BI_REAL_EXCLUDED_V1',
  EXCLUDED_MARKETS: 'BI_REAL_EX_MARK_V1',
  DAYS_PASSED: 'BI_REAL_DAYS_PASSED_V1',
  TOTAL_DAYS: 'BI_REAL_TOTAL_DAYS_V1',
  SELECTED_MONTH: 'BI_REAL_SEL_MONTH_V1'
};

export default function RealtimeReport() {
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

  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newMonth = e.target.value;
    setSelectedMonth(newMonth);
    
    if (!newMonth) return;
    const [yearStr, monthStr] = newMonth.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const currentDate = now.getDate();
    
    const calculatedTotalDays = new Date(year, month, 0).getDate();
    setTotalDays(calculatedTotalDays);
    
    if (year < currentYear || (year === currentYear && month < currentMonth)) {
      setDaysPassed(calculatedTotalDays);
    } else if (year === currentYear && month === currentMonth) {
      let d = currentDate - 1;
      setDaysPassed(d < 1 ? 1 : d);
    } else {
      setDaysPassed(0);
    }
  };
  
  const [excludedStaffIds, setExcludedStaffIds] = useState<string[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.EXCLUDED_STAFF);
    return saved ? JSON.parse(saved) : [];
  });
  const [excludedMarketNames, setExcludedMarketNames] = useState<string[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.EXCLUDED_MARKETS);
    return saved ? JSON.parse(saved) : [];
  });
  
  const [isMarketDropdownOpen, setIsMarketDropdownOpen] = useState(false);
  
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
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const [deletedData, setDeletedData] = useState<{
    marketInput: string;
    staffInput: string;
    categoryInput: string;
    staffCategoryInput: string;
    manualAdjustment: number;
    excludedStaffIds: string[];
    excludedMarketNames: string[];
    processedData: {
      markets: MarketInfo[];
      catData: CategoryData[];
      staffRankData: StaffData[];
      staffEffData: StaffData[];
      staffMatrix: StaffMatrixData[];
    };
  } | null>(() => {
    const saved = localStorage.getItem('bi_realtime_deleted_data');
    return saved ? JSON.parse(saved) : null;
  });

  const [showConfirm, setShowConfirm] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const captureRefs = {
    marketSummary: useRef<HTMLDivElement>(null),
    catRank: useRef<HTMLDivElement>(null),
    staffCatCov: useRef<HTMLDivElement>(null),
    staffRank: useRef<HTMLDivElement>(null),
    staffEff: useRef<HTMLDivElement>(null),
    staffMatrixDetail: useRef<HTMLDivElement>(null),
    combinedReport: useRef<HTMLDivElement>(null),
  };

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
      if (c.target > 0) {
        rate = (c.actual / c.target) * 100;
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
    setLastSaved(new Date());
  }, [marketInput, staffInput, categoryInput, staffCategoryInput, manualAdjustment, excludedStaffIds, excludedMarketNames, daysPassed, totalDays, selectedMonth]);

  useEffect(() => {
    if (deletedData) {
      localStorage.setItem('bi_realtime_deleted_data', JSON.stringify(deletedData));
    } else {
      localStorage.removeItem('bi_realtime_deleted_data');
    }
  }, [deletedData]);

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
      
      if (numberMatches.length >= 3) {
        // Tìm cột %HT làm điểm neo (thường là cột 5 hoặc cuối cùng của cụm dữ liệu chính)
        let firstPercentIdx = -1;
        for (let i = 0; i < numberMatches.length; i++) {
          if (numberMatches[i][0].includes('%')) {
            firstPercentIdx = i;
            break;
          }
        }

        let targetIdx = 2;   // Mặc định Cột 4 (index 2 nếu không có STT)
        let revenueIdx = 1;  // Mặc định Cột 3 (index 1 nếu không có STT)
        let realIdx = 0;     // Mặc định Cột 2 (index 0 nếu không có STT)

        // Nếu tìm thấy cột %, tính ngược lại để đảm bảo chính xác
        if (firstPercentIdx !== -1) {
          targetIdx = firstPercentIdx - 1;
          revenueIdx = firstPercentIdx - 2;
          realIdx = firstPercentIdx - 3;
        }

        if (targetIdx >= 0 && revenueIdx >= 0 && numberMatches.length > Math.max(targetIdx, revenueIdx)) {
          const actualReal = realIdx >= 0 ? cleanNum(numberMatches[realIdx][0]) : cleanNum(numberMatches[revenueIdx][0]);
          const actualVirtual = cleanNum(numberMatches[revenueIdx][0]);
          const baseTarget = cleanNum(numberMatches[targetIdx][0]);
          
          if (baseTarget > 0 || actualVirtual > 0) {
            const adjustedTarget = baseTarget * (1 + adjustment / 100);
            
            // Trích xuất tên: lấy phần văn bản trước số đầu tiên của dữ liệu
            const firstNumIdx = numberMatches[0].index!;
            const rawName = cleanLine.substring(0, firstNumIdx).trim();
            let name = rawName.replace(/^[0-9.\s]+/, '').replace(/[-_]+$/, '').trim();
            name = name.replace(/\s+\d+$/, '').trim();
            
            let marketName = name || "7038";
            
            if (!results.some(m => m.name === marketName)) {
              results.push({ name: marketName, targetST: adjustedTarget, actualReal, actualVirtual });
            }
          }
        }
      }
    }
    return results;
  };

  const parseCategoryData = (input: string, daysPassed: number, totalDays: number, markets: MarketInfo[]): CategoryData[] => {
    const val = input.trim();
    if (!val) return [];
    const lines = val.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const results: CategoryData[] = [];
    let currentCatName = "";
    let currentMarketName = "7038";
    const sortedMarkets = [...markets].sort((a, b) => b.name.length - a.name.length);
    
    const normalize = (s: string) => s.replace(/\s+/g, ' ').toLowerCase();

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const normLine = normalize(line);
      
      // Update current market if found in the line
      if (line.length > 5 && !line.includes('%')) {
        const matchedMarket = sortedMarkets.find(m => {
          const normName = normalize(m.name);
          return normLine.includes(normName) || (normLine.includes('-') && normName.includes(normLine));
        });
        if (matchedMarket) {
          currentMarketName = matchedMarket.name;
        }
      }

      const numbers = line.match(/-?[\d,.]+(%?)/g);
      
      // A data line must have at least 4 numbers and contain a '%' sign
      const isDataLine = numbers && numbers.length >= 4 && line.includes('%');
      
      if (!isDataLine) {
        if (!line.startsWith("Tổng")) {
          let catName = line.replace(/^ĐML_/, '').trim();
          if (catName.match(/DT Realtime|SL Realtime|DT REALTIME|SL REALTIME|Target/i)) {
             catName = catName.split(/DT Realtime|SL Realtime|DT REALTIME|SL REALTIME|Target/i)[0].trim();
          }
          
          const normCat = normalize(catName);
          const isMarket = sortedMarkets.some(m => {
            const normName = normalize(m.name);
            return normCat.includes(normName) || (normCat.includes('-') && normName.includes(normCat));
          });
          
          if (!isMarket && catName) {
            currentCatName = catName;
          }
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
      
      // %HT = REALTIME / TAGET
      let rate = 0;
      if (target > 0) {
        rate = (actual / target) * 100;
        // Làm tròn 1 chữ số thập phân cho %HT
        rate = Math.round(rate * 10) / 10;
      }
      
      let extractedName = currentCatName;
      let isSLLK = false;
      let isDTLK = false;
      
      if (extractedName.includes('SLLK')) isSLLK = true;
      if (extractedName.includes('DTLK')) isDTLK = true;
      
      if (extractedName) {
        // Cắt bỏ từ cụm từ SLLK hoặc DTLK về sau
        extractedName = extractedName.split(/SLLK|DTLK/)[0].trim();
        
        // Cắt bỏ từ cụm từ SL REALTIME hoặc DT REALTIME về sau
        extractedName = extractedName.split(/SL REALTIME|DT REALTIME/i)[0].trim();
        // Clean up any trailing dashes or spaces left after removal
        extractedName = extractedName.replace(/[-_]+$/, '').trim();
        
        if (isSLLK) extractedName += " - SLLK";
        else if (isDTLK) extractedName += " - DTLK";
        
        results.push({
          name: extractedName,
          target,
          actual,
          rate,
          marketName: currentMarketName
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
      const catData = parseCategoryData(categoryInput, daysPassed, totalDays, markets);
      
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

  const clearAll = () => {
    setShowConfirm(true);
  };

  const handleConfirmClear = () => {
    setDeletedData({
      marketInput,
      staffInput,
      categoryInput,
      staffCategoryInput,
      manualAdjustment,
      excludedStaffIds,
      excludedMarketNames,
      processedData
    });
    setMarketInput('');
    setStaffInput('');
    setCategoryInput('');
    setStaffCategoryInput('');
    setManualAdjustment(0);
    setExcludedStaffIds([]);
    setExcludedMarketNames([]);
    setProcessedData({
      markets: [],
      catData: [],
      staffRankData: [],
      staffEffData: [],
      staffMatrix: []
    });
    Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
    setShowConfirm(false);
  };

  const restoreData = () => {
    if (deletedData) {
      setMarketInput(deletedData.marketInput);
      setStaffInput(deletedData.staffInput);
      setCategoryInput(deletedData.categoryInput);
      setStaffCategoryInput(deletedData.staffCategoryInput);
      setManualAdjustment(deletedData.manualAdjustment);
      setExcludedStaffIds(deletedData.excludedStaffIds);
      setExcludedMarketNames(deletedData.excludedMarketNames);
      setProcessedData(deletedData.processedData);
      setDeletedData(null);
    }
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
      { ref: captureRefs.marketSummary, name: '1_Dashboard_SieuThi' },
      { ref: captureRefs.catRank, name: '2_NganhHang_SieuThi' },
      { ref: captureRefs.staffCatCov, name: '3_DoPhu_NhanVien' },
      { ref: captureRefs.staffRank, name: '4_DoanhThu_NhanVien' },
      { ref: captureRefs.staffEff, name: '5_HieuQua_NhanVien' },
      { ref: captureRefs.staffMatrixDetail, name: '6_ChiTiet_ThiDua_NganhHang' },
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
    if (index === 0) return (
      <span className="bg-yellow-100 text-yellow-700 font-black text-[10px] px-2 py-1 rounded border border-yellow-200 flex items-center gap-1">
        <Trophy size={10} /> TOP 1
      </span>
    );
    if (index === 1) return (
      <span className="bg-slate-100 text-slate-700 font-black text-[10px] px-2 py-1 rounded border border-slate-200 flex items-center gap-1">
        <Trophy size={10} /> TOP 2
      </span>
    );
    if (index === 2) return (
      <span className="bg-orange-50 text-orange-700 font-black text-[10px] px-2 py-1 rounded border border-orange-100 flex items-center gap-1">
        <Trophy size={10} /> TOP 3
      </span>
    );
    if (total >= 6 && index >= total - 3) return (
      <span className="bg-red-50 text-red-600 font-bold text-[10px] px-2 py-1 rounded border border-red-100">
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
            <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase leading-none">⚡ BI REALTIME SIÊU THỊ</h1>
            <p className="text-[11px] text-slate-400 font-bold tracking-widest uppercase mt-1">v1.0.0 • Realtime Analytics</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {deletedData && (
            <button 
              onClick={restoreData}
              className="group flex items-center gap-2 bg-white text-emerald-600 px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-emerald-50 transition-all border border-slate-200 shadow-sm"
            >
              <Undo2 size={14} className="group-hover:-rotate-45 transition-transform" />
              KHÔI PHỤC
            </button>
          )}
          <button 
            onClick={clearAll}
            className="group flex items-center gap-2 bg-white text-red-500 px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-red-50 transition-all border border-slate-200 shadow-sm"
          >
            <Trash2 size={14} className="group-hover:scale-110 transition-transform" />
            XÓA DỮ LIỆU
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto">
        {/* Input Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm border-t-4 border-t-blue-500 relative">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <h2 className="text-xs font-black text-slate-500 flex items-center gap-2 uppercase">
                    <ShoppingBag size={14} className="text-blue-500" /> 1. BI Tổng quan Siêu thị
                  </h2>
                  <a 
                    href="https://bi.thegioididong.com/khoi-ban-hang-sub?id=13559&tab=bcth&rt=1&dm=1" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 bg-blue-50 text-blue-600 px-2 py-1 rounded-md text-[10px] font-bold hover:bg-blue-100 transition-colors border border-blue-100"
                  >
                    <Link size={10} /> RT BC TỔNG HỢP
                  </a>
                </div>
                {lastSaved && <span className="text-[9px] font-bold text-slate-300 uppercase italic">Đã lưu tự động</span>}
              </div>
              <textarea 
                value={marketInput}
                onChange={(e) => setMarketInput(e.target.value)}
                rows={3}
                placeholder="Dán dòng Siêu thị tổng quan từ BI..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all resize-none font-mono"
              />
            </section>
            <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm border-t-4 border-t-amber-500 relative">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <h2 className="text-xs font-black text-slate-500 flex items-center gap-2 uppercase">
                    <Boxes size={14} className="text-amber-500" /> 3. BI Ngành hàng Siêu thị
                  </h2>
                  <a 
                    href="https://bi.thegioididong.com/thi-dua?id=-1&tab=1&rt=1&dm=2&mt=2" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 bg-amber-50 text-amber-600 px-2 py-1 rounded-md text-[10px] font-bold hover:bg-amber-100 transition-colors border border-amber-100"
                  >
                    <Link size={10} /> RT NH SIÊU THỊ
                  </a>
                </div>
                {lastSaved && <span className="text-[9px] font-bold text-slate-300 uppercase italic">Đã lưu tự động</span>}
              </div>
              <textarea 
                value={categoryInput}
                onChange={(e) => setCategoryInput(e.target.value)}
                rows={6}
                placeholder="Dán bảng Thi đua Miền..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm focus:ring-2 focus:ring-amber-500 focus:bg-white outline-none transition-all resize-none font-mono"
              />
            </section>
        </div>

        {/* Controls */}
        <div className="flex flex-col items-center gap-6 mb-12">
          <button 
            onClick={handleProcess}
            disabled={isProcessing}
            className="group relative bg-slate-900 text-white px-12 py-4 rounded-2xl text-sm font-black uppercase tracking-widest shadow-2xl shadow-slate-200 hover:bg-black hover:-translate-y-1 transition-all active:scale-95 disabled:opacity-70 disabled:pointer-events-none"
          >
            {isProcessing ? (
              <span className="flex items-center gap-2">
                <Loader2 size={18} className="animate-spin" /> ĐANG PHÂN TÍCH...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Zap size={18} className="fill-yellow-400 text-yellow-400" /> PHÂN TÍCH DỮ LIỆU
              </span>
            )}
          </button>
        </div>

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
                  onClick={() => captureElement(captureRefs.combinedReport, 'BaoCao_SieuThi')}
                  className="flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-xl text-[10px] font-black uppercase border border-blue-100 hover:bg-blue-100 transition-all"
                >
                  <Camera size={12} /> DASH SIÊU THỊ
                </button>
                <button 
                  onClick={() => captureElement(captureRefs.catRank, 'NganhHang_SieuThi')}
                  className="flex items-center gap-2 bg-amber-50 text-amber-700 px-4 py-2 rounded-xl text-[10px] font-black uppercase border border-amber-100 hover:bg-amber-100 transition-all"
                >
                  <Camera size={12} /> REALTIME NGÀNH HÀNG
                </button>
                <div className="w-px bg-slate-200 mx-1 hidden lg:block" />
                <button 
                  onClick={batchDownload}
                  className="flex items-center gap-2 bg-slate-900 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase shadow-lg hover:bg-black transition-all"
                >
                  <Download size={12} /> Tải 6 Ảnh Báo Cáo
                </button>
              </div>

              {/* Filter Card */}
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row items-center gap-4">
                <div className="flex items-center gap-2 text-slate-400 px-2 border-r border-slate-100 hidden md:flex">
                  <Filter size={16} />
                  <span className="text-[10px] font-black uppercase tracking-wider">Bộ lọc:</span>
                </div>
                
                <div className="flex-1 flex flex-wrap gap-4">
                  {/* Market Selection Dropdown */}
                  <div className="relative">
                    <button 
                      onClick={() => setIsMarketDropdownOpen(!isMarketDropdownOpen)}
                      className="flex items-center gap-2 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold hover:bg-slate-100 transition-all whitespace-nowrap"
                    >
                      <Store size={14} className="text-blue-500" />
                      <span>ST Hiển thị ({processedData.markets.length - excludedMarketNames.length}/{processedData.markets.length})</span>
                      <ChevronDown size={14} className={cn("transition-transform", isMarketDropdownOpen && "rotate-180")} />
                    </button>

                    <AnimatePresence>
                      {isMarketDropdownOpen && (
                        <>
                          <div 
                            className="fixed inset-0 z-[70]" 
                            onClick={() => setIsMarketDropdownOpen(false)} 
                          />
                          <motion.div 
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            className="absolute top-full left-0 mt-2 min-w-[240px] max-w-[320px] bg-white border border-slate-200 rounded-2xl shadow-2xl z-[80] overflow-hidden"
                          >
                            <div className="p-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between gap-4">
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Danh sách siêu thị</span>
                              <div className="flex gap-2">
                                <button 
                                  onClick={() => setExcludedMarketNames([])}
                                  className="text-[9px] font-bold text-indigo-600 hover:underline"
                                >
                                  Hiện hết
                                </button>
                                <button 
                                  onClick={() => setExcludedMarketNames(processedData.markets.map(m => m.name))}
                                  className="text-[9px] font-bold text-red-600 hover:underline"
                                >
                                  Ẩn hết
                                </button>
                              </div>
                            </div>
                            <div className="max-h-64 overflow-y-auto p-2 space-y-1">
                              {processedData.markets.map((market) => {
                                const isExcluded = excludedMarketNames.includes(market.name);
                                return (
                                  <button
                                    key={market.name}
                                    onClick={() => {
                                      setExcludedMarketNames(prev => 
                                        isExcluded 
                                          ? prev.filter(name => name !== market.name)
                                          : [...prev, market.name]
                                      );
                                    }}
                                    className={cn(
                                      "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors",
                                      isExcluded ? "opacity-50 hover:bg-slate-50" : "hover:bg-blue-50"
                                    )}
                                  >
                                    {isExcluded ? (
                                      <Square size={16} className="text-slate-300" />
                                    ) : (
                                      <CheckSquare size={16} className="text-blue-600" />
                                    )}
                                    <div className="flex-1 overflow-hidden">
                                      <p className={cn("text-xs font-bold truncate", !isExcluded ? "text-slate-800" : "text-slate-400")}>
                                        {market.name}
                                      </p>
                                    </div>
                                    {!isExcluded && <Check size={12} className="text-blue-600" />}
                                  </button>
                                );
                              })}
                            </div>
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>


                </div>

                {(excludedStaffIds.length > 0 || excludedMarketNames.length > 0) && (
                  <button 
                    onClick={() => { setExcludedStaffIds([]); setExcludedMarketNames([]); }}
                    className="text-[10px] font-black text-red-500 hover:text-red-600 uppercase tracking-wider px-4 py-2 bg-red-50 rounded-xl transition-all"
                  >
                    Xóa lọc
                  </button>
                )}
              </div>

              {/* Combined Report Container */}
              <div ref={captureRefs.combinedReport} className="space-y-8 bg-[#f8fafc] p-2 rounded-3xl">
                {/* Dashboard Cards */}
                <div ref={captureRefs.marketSummary} className="space-y-6">
                  {displayData.markets
                    .map((market, mIdx) => (
                      <div 
                        key={mIdx}
                        className="p-6 bg-[#f8fafc] rounded-3xl transition-all duration-300 shadow-sm border border-slate-100"
                      >
                        <div className="mb-6 border-b border-slate-200 pb-4 flex items-center justify-between">
                          <div>
                            <h2 className="text-lg md:text-2xl font-black text-slate-900 break-words">[RT] BC TỔNG HỢP - {market.name}</h2>
                            <p className="text-[10px] md:text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">
                              Cập nhật: {new Date().toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit', day: 'numeric', month: 'numeric', year: 'numeric' })}
                            </p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                          {[
                            { label: 'TARGET QUY ĐỔI Bi', value: `${Math.round(market.targetST).toLocaleString('vi-VN')} TR`, color: 'bg-blue-600', icon: <Target size={20} /> },
                            { label: 'DOANH THU QUY ĐỔI Bi', value: `${Math.round(market.actualVirtual).toLocaleString('vi-VN')} TR`, color: 'bg-emerald-600', icon: <TrendingUp size={20} /> },
                            { label: '% HT TARGET QĐ', value: `${((market.actualVirtual / market.targetST) * 100).toFixed(1)}%`, color: 'bg-amber-500', icon: <BarChart3 size={20} /> },
                            { label: 'Hiệu quả QĐ', value: `${market.actualReal > 0 ? (((market.actualVirtual - market.actualReal) / market.actualReal) * 100).toFixed(1) : 0}%`, color: 'bg-rose-500', icon: <Zap size={20} /> },
                          ].map((card, i) => (
                            <div key={i} className={cn("relative overflow-hidden rounded-3xl p-6 text-white shadow-xl", card.color)}>
                              <div className="relative z-10">
                                <p className="text-[10px] font-black uppercase opacity-80 tracking-wider mb-2">{card.label}</p>
                                <p className="text-3xl font-black">{card.value}</p>
                              </div>
                              <div className="absolute -right-4 -bottom-4 opacity-10 rotate-12 scale-150">
                                {card.icon}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                </div>

                {/* Tables */}
                <div className="grid grid-cols-1 gap-8 items-start">
                  {/* Category Rank - Compact Table for Mobile */}
                  <div ref={captureRefs.catRank} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-5 bg-amber-500 rounded-full" />
                        <h3 className="font-black text-slate-800 text-xs uppercase tracking-wider">📦 [RT] REALTIME NGÀNH HÀNG SIÊU THỊ</h3>
                      </div>
                    </div>
                    
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead className="bg-amber-50/80 border-y border-amber-100/50">
                          <tr>
                            <th className="px-2 py-2 text-[9px] md:text-[11px] font-black text-amber-800 uppercase tracking-wider">Ngành hàng</th>
                            <th className="px-1 py-2 md:px-4 md:py-4 text-[9px] md:text-[11px] font-black text-amber-800 uppercase tracking-wider text-center">Target</th>
                            <th className="px-1 py-2 md:px-4 md:py-4 text-[9px] md:text-[11px] font-black text-amber-800 uppercase tracking-wider text-center">Realtime</th>
                            <th className="px-1 py-2 md:px-6 md:py-4 text-[9px] md:text-[11px] font-black text-amber-800 uppercase tracking-wider text-center md:text-right">%HT</th>
                            <th className="px-1 py-2 md:px-4 md:py-4 text-[9px] md:text-[11px] font-black text-amber-800 uppercase tracking-wider text-center">Còn lại</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {displayData.catData.sort((a, b) => b.rate - a.rate).map((item, idx) => (
                            <tr key={idx} className="even:bg-slate-50/50 hover:bg-indigo-50/40 transition-colors">
                              <td className="px-2 py-2 md:px-6 md:py-4 text-[10px] md:text-xs font-bold text-slate-700 truncate max-w-[120px] md:max-w-none">{item.name}</td>
                              <td className="px-1 py-2 md:px-4 md:py-4 text-[10px] md:text-xs text-slate-400 text-center">{item.target.toLocaleString('vi-VN')}</td>
                              <td className="px-1 py-2 md:px-4 md:py-4 text-[10px] md:text-xs font-bold text-slate-800 text-center">{item.actual.toLocaleString('vi-VN')}</td>
                              <td className={cn(
                                "px-1 py-2 md:px-6 md:py-4 text-[10px] md:text-xs font-black text-center md:text-right",
                                item.rate < 80 ? "text-rose-500" : item.rate < 100 ? "text-amber-500" : "text-emerald-500"
                              )}>
                                {item.rate.toFixed(1)}%
                              </td>
                              <td className="px-1 py-2 md:px-4 md:py-4 text-[10px] md:text-xs font-bold text-center">
                                {(item.actual - item.target) < 0 ? (
                                  <span className="text-rose-500">{(item.actual - item.target).toLocaleString('vi-VN')}</span>
                                ) : null}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>

              {/* Staff Matrix Detail Table (Hidden for Capture) */}
              <div ref={captureRefs.staffMatrixDetail} className="fixed -left-[9999px] top-0 w-[1200px] bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden mt-8">
                  <div className="p-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-6 bg-purple-600 rounded-full" />
                      <h3 className="font-black text-slate-800 text-sm uppercase tracking-wider">📊 [RT] CHI TIẾT THI ĐUA NGÀNH HÀNG</h3>
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
            </motion.div>
          )}
        </AnimatePresence>
        {/* Confirmation Modal */}
        <AnimatePresence>
          {showConfirm && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
              onClick={() => setShowConfirm(false)}
            >
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl"
                onClick={e => e.stopPropagation()}
              >
                <div className="flex items-center gap-4 mb-4 text-red-600">
                  <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                    <Trash2 size={24} />
                  </div>
                  <h3 className="text-lg font-bold">Xác nhận xóa dữ liệu</h3>
                </div>
                <p className="text-slate-600 mb-6">
                  Bạn có chắc chắn muốn xóa toàn bộ dữ liệu không? Hành động này sẽ xóa hết các thông tin bạn đã nhập.
                  <br/><br/>
                  <span className="text-xs text-slate-400 italic">* Bạn có thể khôi phục lại ngay sau khi xóa nếu đổi ý.</span>
                </p>
                <div className="flex justify-end gap-3">
                  <button 
                    onClick={() => setShowConfirm(false)}
                    className="px-4 py-2 rounded-xl text-slate-600 font-bold hover:bg-slate-100 transition-colors"
                  >
                    Hủy bỏ
                  </button>
                  <button 
                    onClick={handleConfirmClear}
                    className="px-4 py-2 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 transition-colors shadow-lg shadow-red-200"
                  >
                    Xóa ngay
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Detail Modal */}
        <AnimatePresence>
          {showDetailModal && displayData && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto"
              onClick={() => setShowDetailModal(false)}
            >
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-3xl p-6 max-w-[95vw] w-full shadow-2xl my-8"
                onClick={e => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-8 bg-purple-600 rounded-full" />
                    <h3 className="font-black text-slate-800 text-xl uppercase tracking-wider">📊 CHI TIẾT THI ĐUA NGÀNH HÀNG</h3>
                  </div>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => captureElement(captureRefs.staffMatrixDetail, 'ChiTiet_ThiDua_NganhHang')}
                      className="flex items-center gap-2 bg-purple-50 text-purple-700 px-4 py-2 rounded-xl text-xs font-bold uppercase hover:bg-purple-100 transition-all border border-purple-100"
                    >
                      <Camera size={16} /> CHỤP ẢNH
                    </button>
                    <button 
                      onClick={() => setShowDetailModal(false)}
                      className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                    >
                      <Undo2 size={24} className="text-slate-400" />
                    </button>
                  </div>
                </div>
                
                <div className="overflow-x-auto max-h-[80vh]">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-purple-50/80 border-y border-purple-100/50 sticky top-0 z-20">
                      <tr>
                        <th className="px-4 py-4 text-[11px] font-black text-purple-800 uppercase tracking-wider sticky left-0 bg-purple-50 z-10 border-r border-purple-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Nhân viên</th>
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
                          <td className="px-4 py-3 text-xs font-bold text-slate-800 sticky left-0 bg-white even:bg-slate-50/50 border-r border-slate-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
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
              </motion.div>
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
