/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutGrid, 
  Trash2, 
  ShoppingBag, 
  Boxes, 
  Users, 
  Grid2X2, 
  Zap, 
  Loader2,
  Undo2,
  Link,
  Filter,
  Store,
  ChevronDown,
  Square,
  CheckSquare,
  Check,
  Target,
  Upload
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types ---

interface MarketInfo {
  name: string;
  targetST: number;
  baseTarget: number;
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
  CAT_ADJUSTMENTS: 'BI_PRO_CAT_ADJ_V30',
  CLUSTER_REPORT: 'BI_PRO_CLUST_REP_V30',
  CLUSTER_COMPETITION: 'BI_PRO_CLUST_COMP_V30'
};

interface UpdateDataProps {
  onNavigate: (page: 'general' | 'realtime' | 'update' | 'staff') => void;
}

export default function UpdateData({ onNavigate }: UpdateDataProps) {
  // --- State ---
  const [marketInput, setMarketInput] = useState(() => localStorage.getItem(STORAGE_KEYS.MARKET) || '');
  const [staffInput, setStaffInput] = useState(() => localStorage.getItem(STORAGE_KEYS.STAFF) || '');
  const [categoryInput, setCategoryInput] = useState(() => localStorage.getItem(STORAGE_KEYS.CAT) || '');
  const [staffCategoryInput, setStaffCategoryInput] = useState(() => localStorage.getItem(STORAGE_KEYS.STAFF_CAT) || '');
  const [clusterReportInput, setClusterReportInput] = useState(() => localStorage.getItem(STORAGE_KEYS.CLUSTER_REPORT) || '');
  const [clusterCompetitionInput, setClusterCompetitionInput] = useState(() => localStorage.getItem(STORAGE_KEYS.CLUSTER_COMPETITION) || '');
  // --- Multi-Market State ---
  const [marketDataMap, setMarketDataMap] = useState<Record<string, { market: string, staff: string, cat: string, staffCat?: string }>>(() => {
    const saved = localStorage.getItem('BI_PRO_MARKET_MAP_V30');
    return saved ? JSON.parse(saved) : {};
  });
  const [activeMarketName, setActiveMarketName] = useState<string | null>(() => {
    const saved = localStorage.getItem('BI_PRO_ACTIVE_MARKET_V30');
    return saved || null;
  });

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

  const [excludedStaffIds, setExcludedStaffIds] = useState<string[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.EXCLUDED_STAFF);
    return saved ? JSON.parse(saved) : [];
  });
  const [excludedMarketNames, setExcludedMarketNames] = useState<string[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.EXCLUDED_MARKETS);
    return saved ? JSON.parse(saved) : [];
  });

  const [categoryAdjustments, setCategoryAdjustments] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.CAT_ADJUSTMENTS);
    return saved ? JSON.parse(saved) : {};
  });

  const [activeTab, setActiveTab] = useState('DỮ LIỆU NGUỒN');
  const [isMarketDropdownOpen, setIsMarketDropdownOpen] = useState(false);
  const [isStaffDropdownOpen, setIsStaffDropdownOpen] = useState(false);

  const [targetConfigMap, setTargetConfigMap] = useState<Record<string, {
    total: number;
    traGop: number;
    quyDoi: number;
    totalAdj: number;
    traGopAdj: number;
    quyDoiAdj: number;
  }>>(() => {
    const saved = localStorage.getItem('BI_PRO_TARGET_MAP_V30');
    return saved ? JSON.parse(saved) : {};
  });
  
  const targetConfig = useMemo(() => {
    if (activeMarketName && targetConfigMap[activeMarketName]) {
      return targetConfigMap[activeMarketName];
    }
    return {
      total: 3524.6,
      traGop: 45,
      quyDoi: 40,
      totalAdj: 100,
      traGopAdj: 100,
      quyDoiAdj: 100
    };
  }, [activeMarketName, targetConfigMap]);

  const setTargetConfig = (updater: (prev: typeof targetConfig) => typeof targetConfig) => {
    if (activeMarketName) {
      setTargetConfigMap(prev => {
        const current = prev[activeMarketName] || {
          total: 3524.6,
          traGop: 45,
          quyDoi: 40,
          totalAdj: 100,
          traGopAdj: 100,
          quyDoiAdj: 100
        };
        return {
          ...prev,
          [activeMarketName]: updater(current)
        };
      });
    }
  };

  const [previewData, setPreviewData] = useState<{
    markets: MarketInfo[];
    staff: { displayName: string; fullId: string }[];
  }>({ markets: [], staff: [] });

  const [isProcessing, setIsProcessing] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [deletedData, setDeletedData] = useState<any | null>(null);

  // --- Parsing Logic ---

  const parseMarketData = (input: string, adjustment: number): MarketInfo[] => {
    const val = input.trim();
    if (!val) return [];
    const lines = val.split('\n');
    const results: MarketInfo[] = [];

    const cleanNum = (s: string) => {
      if (!s) return 0;
      let clean = s.replace(/[^\d,.-]/g, '');
      const lastDot = clean.lastIndexOf('.');
      const lastComma = clean.lastIndexOf(',');

      if (lastComma !== -1 && lastDot !== -1) {
        if (lastComma > lastDot) {
          return parseFloat(clean.replace(/\./g, '').replace(',', '.'));
        } else {
          return parseFloat(clean.replace(/,/g, ''));
        }
      } else if (lastComma !== -1) {
        const parts = clean.split(',');
        if (parts.length === 2 && parts[1].length === 3) {
          return parseFloat(clean.replace(',', ''));
        }
        return parseFloat(clean.replace(',', '.'));
      } else if (lastDot !== -1) {
        const parts = clean.split('.');
        if (parts.length === 2 && parts[1].length === 3) {
          return parseFloat(clean.replace('.', ''));
        }
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
          const actualReal = cleanNum(numberMatches[firstPercentIdx - 4][0]);
          const actualVirtual = cleanNum(numberMatches[firstPercentIdx - 2][0]);
          const virtualProj = cleanNum(numberMatches[firstPercentIdx - 1][0]);
          let efficiency = cleanNum(numberMatches[firstPercentIdx][0]);
          
          if (efficiency > 0) {
            const rate = efficiency > 5 ? efficiency / 100 : efficiency;
            const baseTarget = virtualProj / rate;
            const adjustedTarget = baseTarget * (1 + adjustment / 100);
            
            const firstDataMatch = numberMatches[firstPercentIdx - 4];
            let marketName = "7038";
            
            if (firstDataMatch.index !== undefined) {
               const rawName = cleanLine.substring(0, firstDataMatch.index).trim();
               let name = rawName.replace(/[-_]+$/, '').trim();
               name = name.replace(/\s+\d+$/, '').trim();
               marketName = name;
               if (!marketName) marketName = "7038";
            }
            
            if (!results.some(m => m.name === marketName)) {
              results.push({ name: marketName, targetST: adjustedTarget, baseTarget, actualReal, actualVirtual });
            }
          }
        }
      }
    }
    return results;
  };

  const parseStaffList = (input: string): { displayName: string; fullId: string }[] => {
    const val = input.trim();
    if (!val) return [];
    const lines = val.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const results: { displayName: string; fullId: string }[] = [];
    
    lines.forEach(line => {
      const match = line.match(/(.+) - (\d+)/);
      if (match) {
        const fullName = match[1].trim();
        const id = match[2];
        results.push({ 
          displayName: fullName.split(' ').pop() || fullName, 
          fullId: id
        });
      }
    });
    return results;
  };

  // --- Effects ---
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.MARKET, marketInput);
    localStorage.setItem(STORAGE_KEYS.STAFF, staffInput);
    localStorage.setItem(STORAGE_KEYS.CAT, categoryInput);
    localStorage.setItem(STORAGE_KEYS.STAFF_CAT, staffCategoryInput);
    localStorage.setItem(STORAGE_KEYS.ADJUSTMENT, targetConfig.totalAdj.toString());
    localStorage.setItem(STORAGE_KEYS.DAYS_PASSED, daysPassed.toString());
    localStorage.setItem(STORAGE_KEYS.TOTAL_DAYS, totalDays.toString());
    localStorage.setItem(STORAGE_KEYS.SELECTED_MONTH, selectedMonth);
    localStorage.setItem(STORAGE_KEYS.EXCLUDED_STAFF, JSON.stringify(excludedStaffIds));
    localStorage.setItem(STORAGE_KEYS.EXCLUDED_MARKETS, JSON.stringify(excludedMarketNames));
    localStorage.setItem(STORAGE_KEYS.CAT_ADJUSTMENTS, JSON.stringify(categoryAdjustments));
    localStorage.setItem(STORAGE_KEYS.CLUSTER_REPORT, clusterReportInput);
    localStorage.setItem(STORAGE_KEYS.CLUSTER_COMPETITION, clusterCompetitionInput);
    localStorage.setItem('BI_PRO_MARKET_MAP_V30', JSON.stringify(marketDataMap));
    localStorage.setItem('BI_PRO_TARGET_MAP_V30', JSON.stringify(targetConfigMap));
    if (activeMarketName) localStorage.setItem('BI_PRO_ACTIVE_MARKET_V30', activeMarketName);
    setLastSaved(new Date());

    // Aggregate all data for preview
    const allMarketInput = [
      ...Object.values(marketDataMap).map(d => d.market),
      activeMarketName ? '' : marketInput,
      clusterReportInput,
      clusterCompetitionInput
    ].filter(Boolean).join('\n');
    const allStaffInput = [
      ...Object.values(marketDataMap).map(d => d.staff),
      activeMarketName ? '' : staffInput
    ].filter(Boolean).join('\n');
    
    const markets = parseMarketData(allMarketInput, targetConfig.totalAdj - 100);
    const staff = parseStaffList(staffCategoryInput || allStaffInput);
    setPreviewData({ markets, staff });

    // Auto-detect active market from current input if not set
    if (!activeMarketName && markets.length > 0) {
      setActiveMarketName(markets[0].name);
    }
  }, [marketInput, staffInput, categoryInput, staffCategoryInput, clusterReportInput, clusterCompetitionInput, targetConfig.totalAdj, daysPassed, totalDays, selectedMonth, excludedStaffIds, excludedMarketNames, categoryAdjustments, marketDataMap, activeMarketName, targetConfigMap]);

  // Sync current inputs to map
  useEffect(() => {
    if (activeMarketName) {
      setMarketDataMap(prev => {
        const current = prev[activeMarketName];
        if (current && current.market === marketInput && current.staff === staffInput && current.cat === categoryInput && current.staffCat === staffCategoryInput) {
          return prev;
        }
        return {
          ...prev,
          [activeMarketName]: {
            market: marketInput,
            staff: staffInput,
            cat: categoryInput,
            staffCat: staffCategoryInput
          }
        };
      });
    }
  }, [marketInput, staffInput, categoryInput, staffCategoryInput, activeMarketName]);

  useEffect(() => {
    const includedMarkets = previewData.markets.filter(m => !excludedMarketNames.includes(m.name));
    
    // If a specific market is active, use its data, otherwise use the sum of included markets
    const activeMarket = activeMarketName ? includedMarkets.find(m => m.name === activeMarketName) : null;
    const newTotal = activeMarket ? activeMarket.baseTarget : includedMarkets.reduce((sum, m) => sum + m.baseTarget, 0);
    
    if (newTotal >= 0) {
      setTargetConfig(prev => {
        if (Math.abs(prev.total - newTotal) < 0.01) return prev;
        return { ...prev, total: newTotal };
      });
    }
  }, [previewData.markets, excludedMarketNames, activeMarketName]);

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

  const handleProcess = () => {
    setIsProcessing(true);
    
    // Aggregate all data from map and cluster inputs
    const allMarketInput = [
      ...Object.values(marketDataMap).map(d => d.market),
      activeMarketName ? '' : marketInput,
      clusterReportInput,
      clusterCompetitionInput
    ].filter(Boolean).join('\n');
    
    const allStaffInput = [
      ...Object.values(marketDataMap).map(d => d.staff),
      activeMarketName ? '' : staffInput
    ].filter(Boolean).join('\n');
    
    const allCatInput = [
      ...Object.values(marketDataMap).map(d => d.cat),
      activeMarketName ? '' : categoryInput,
      clusterReportInput,
      clusterCompetitionInput
    ].filter(Boolean).join('\n');
    
    const allStaffCatInput = [
      ...Object.values(marketDataMap).map(d => d.staffCat),
      activeMarketName ? '' : staffCategoryInput
    ].filter(Boolean).join('\n');
    
    localStorage.setItem(STORAGE_KEYS.MARKET, allMarketInput);
    localStorage.setItem(STORAGE_KEYS.STAFF, allStaffInput);
    localStorage.setItem(STORAGE_KEYS.CAT, allCatInput);
    localStorage.setItem(STORAGE_KEYS.STAFF_CAT, allStaffCatInput);
    
    setTimeout(() => {
      setIsProcessing(false);
      onNavigate('general');
    }, 500);
  };

  const clearAll = () => {
    setShowConfirm(true);
  };

  const handleConfirmClear = () => {
    // Lưu dữ liệu trước khi xóa
    setDeletedData({
      market: marketInput,
      staff: staffInput,
      cat: categoryInput,
      staffCat: staffCategoryInput,
      excludedStaff: excludedStaffIds,
      excludedMarkets: excludedMarketNames,
      marketMap: marketDataMap,
      activeMarket: activeMarketName
    });

    setMarketInput('');
    setStaffInput('');
    setCategoryInput('');
    setStaffCategoryInput('');
    setExcludedStaffIds([]);
    setExcludedMarketNames([]);
    setMarketDataMap({});
    setActiveMarketName(null);
    
    localStorage.removeItem(STORAGE_KEYS.MARKET);
    localStorage.removeItem(STORAGE_KEYS.STAFF);
    localStorage.removeItem(STORAGE_KEYS.CAT);
    localStorage.removeItem(STORAGE_KEYS.STAFF_CAT);
    localStorage.removeItem(STORAGE_KEYS.ADJUSTMENT);
    localStorage.removeItem(STORAGE_KEYS.EXCLUDED_STAFF);
    localStorage.removeItem('BI_PRO_MARKET_MAP_V30');
    localStorage.removeItem('BI_PRO_TARGET_MAP_V30');
    localStorage.removeItem('BI_PRO_ACTIVE_MARKET_V30');
    localStorage.removeItem(STORAGE_KEYS.EXCLUDED_MARKETS);
    
    setShowConfirm(false);
  };

  const handleUndo = () => {
    if (deletedData) {
      setMarketInput(deletedData.market);
      setStaffInput(deletedData.staff);
      setCategoryInput(deletedData.cat);
      setStaffCategoryInput(deletedData.staffCat);
      setExcludedStaffIds(deletedData.excludedStaff);
      setExcludedMarketNames(deletedData.excludedMarkets);
      setMarketDataMap(deletedData.marketMap);
      setActiveMarketName(deletedData.activeMarket);
      setDeletedData(null);
    }
  };

  const competitionData = useMemo(() => {
    const parseInput = (input: string, targetMarket: string | null) => {
      const val = input.trim();
      if (!val) return [];
      const lines = val.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      const results: { name: string; targetBI: number; market: string }[] = [];
      let currentCatName = "";
      let currentMarketName = ""; // Start empty to force detection
      
      const cleanNum = (s: string) => {
        if (!s) return 0;
        let clean = s.replace(/[^\d,.-]/g, '');
        const lastDot = clean.lastIndexOf('.');
        const lastComma = clean.lastIndexOf(',');

        if (lastComma !== -1 && lastDot !== -1) {
          if (lastComma > lastDot) {
            return parseFloat(clean.replace(/\./g, '').replace(',', '.'));
          } else {
            return parseFloat(clean.replace(/,/g, ''));
          }
        } else if (lastComma !== -1) {
          const parts = clean.split(',');
          if (parts.length === 2 && parts[1].length === 3) {
            return parseFloat(clean.replace(',', ''));
          }
          return parseFloat(clean.replace(',', '.'));
        } else if (lastDot !== -1) {
          const parts = clean.split('.');
          if (parts.length === 2 && parts[1].length === 3) {
            return parseFloat(clean.replace('.', ''));
          }
          return parseFloat(clean);
        }
        return parseFloat(clean) || 0;
      };

      const normalize = (s: string) => s.replace(/\s+/g, ' ').toLowerCase();
      const sortedMarkets = [...previewData.markets].sort((a, b) => b.name.length - a.name.length);

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const normLine = normalize(line);

        // Update current market if found
        // Look for exact matches or "ID - Name" format
        const matchedMarket = sortedMarkets.find(m => {
          const normName = normalize(m.name);
          // Match "7038" or "7038 - DMX..."
          return normLine === normName || normLine.startsWith(normName + " ") || normLine.startsWith(normName + "-");
        });
        
        if (matchedMarket) {
          currentMarketName = matchedMarket.name;
        }

        const numbers = line.match(/-?[\d,.]+(%?)/g);
        const isDataLine = numbers && numbers.length >= 4 && line.includes('%');
        
        if (!isDataLine) {
          if (!line.startsWith("Tổng") && !line.includes("Target")) {
            // Only update category if it's not a market name
            if (!matchedMarket) {
              currentCatName = line.replace(/^ĐML_/, '').trim();
            }
          }
        } else {
          // Robust market detection: if the line itself contains a market name at the start
          const matchedMarketInLine = sortedMarkets.find(m => {
            const normName = normalize(m.name);
            return normLine.startsWith(normName);
          });
          if (matchedMarketInLine) {
            currentMarketName = matchedMarketInLine.name;
          }

          // If we still don't have a market, and we only have one market in preview, default to it
          if (!currentMarketName && previewData.markets.length === 1) {
            currentMarketName = previewData.markets[0].name;
          }

          // Check if this market matches targetMarket
          if (targetMarket && currentMarketName !== targetMarket) continue;
          if (!targetMarket && !currentMarketName) continue; // Skip if no market context

          let extractedName = "";
          let isSLLK = false;
          let isDTLK = false;
          const isSM = (s: string) => /ĐIỆN MÁY XANH|THẾ GIỚI DI ĐỘNG|ĐMX|TGDĐ|TOPZONE|ĐMS|ĐMM|ĐML/i.test(s);
          const isTechnicalHeader = (s: string) => /^[A-Z0-9]{2,}_[A-Z0-9]{2,}_[A-Z0-9]{2,}/i.test(s) || /^(ĐMS|ĐMM|ĐML|ĐIỆN MÁY|THẾ GIỚI|TỔNG|CỤM|MIỀN)/i.test(s);

          const lastNumberStr = numbers[numbers.length - 1];
          const hasRank = !lastNumberStr.includes('%') && !isNaN(parseFloat(lastNumberStr));
          
          if (!hasRank) continue;

          let candidate = "";
          if (i >= 2) candidate = lines[i - 2];
          if (!candidate || isSM(candidate) || candidate.startsWith("Tổng")) {
            if (i >= 1) candidate = lines[i - 1];
          }
          if (!candidate || isSM(candidate) || candidate.startsWith("Tổng")) {
            candidate = currentCatName;
          }

          // If the data line itself has text at the beginning, it might be the category name
          const firstNumMatch = line.match(/-?[\d,.]+(%?)/);
          if (firstNumMatch && firstNumMatch.index! > 3) {
            const potentialCat = line.substring(0, firstNumMatch.index!).trim();
            // Remove market ID from start of category if present
            let cleanedPotential = potentialCat;
            if (currentMarketName && cleanedPotential.startsWith(currentMarketName)) {
              cleanedPotential = cleanedPotential.substring(currentMarketName.length).replace(/^[- ]+/, '').trim();
            }
            
            if (cleanedPotential && !isSM(cleanedPotential) && !cleanedPotential.startsWith("Tổng")) {
              candidate = cleanedPotential;
            }
          }

          if (candidate && !isSM(candidate) && !candidate.startsWith("Tổng") && !isTechnicalHeader(candidate)) {
            extractedName = candidate.replace(/^ĐML_/, '').trim();
          }

          if (extractedName && !isTechnicalHeader(extractedName)) {
            if (extractedName.includes('SLLK')) isSLLK = true;
            if (extractedName.includes('DTLK')) isDTLK = true;

            extractedName = extractedName.split(/SLLK|DTLK/)[0].trim();
            
            if (isSLLK) extractedName += " - SLLK";
            else if (isDTLK) extractedName += " - DTLK";

            if (extractedName && extractedName.length > 2) {
              const targetBI = numbers.length >= 3 ? cleanNum(numbers[2]) : 0;
              // Unique key includes market to avoid collisions if showing multiple
              const uniqueKey = `${currentMarketName}_${extractedName}`;
              if (!results.some(r => `${r.market}_${r.name}` === uniqueKey)) {
                results.push({ name: extractedName, targetBI, market: currentMarketName });
              }
            }
          }
        }
      }
      return results;
    };

    const fromCompetition = parseInput(clusterCompetitionInput, activeMarketName);
    const fromReport = parseInput(clusterReportInput, activeMarketName);
    
    const merged = [...fromCompetition];
    fromReport.forEach(item => {
      if (!merged.some(m => m.name === item.name)) {
        merged.push(item);
      }
    });
    
    return merged;
  }, [clusterCompetitionInput, clusterReportInput, activeMarketName, previewData.markets]);

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans text-slate-800">
      <div className="p-4 md:p-8">
          {/* Controls */}
          <div className="flex flex-col items-center gap-6 mb-12">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-md overflow-hidden">
              <div className="px-6 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
                <div className="w-1 h-4 bg-indigo-500 rounded-full"></div>
                <span className="text-xl font-black text-slate-900 uppercase tracking-[0.2em]">KHAI BÁO</span>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-4 p-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-slate-600 uppercase tracking-wider px-2">Tháng:</span>
                  <input 
                    type="month" 
                    value={selectedMonth}
                    onChange={handleMonthChange}
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-center"
                  />
                </div>
                <div className="w-px h-8 bg-slate-200 mx-2 hidden md:block"></div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-slate-600 uppercase tracking-wider px-2">Số ngày đã qua:</span>
                  <input 
                    type="number" 
                    value={daysPassed}
                    onChange={(e) => setDaysPassed(Number(e.target.value))}
                    className="w-20 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-center"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-slate-600 uppercase tracking-wider px-2">Tổng ngày:</span>
                  <input 
                    type="number" 
                    value={totalDays}
                    onChange={(e) => setTotalDays(Number(e.target.value))}
                    className="w-20 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-center"
                  />
                </div>
                <div className="w-px h-8 bg-slate-200 mx-2 hidden md:block"></div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-slate-600 uppercase tracking-wider px-2">Tăng Target thêm:</span>
                  <div className="relative">
                    <input 
                      type="number" 
                      value={targetConfig.totalAdj - 100}
                      onChange={(e) => setTargetConfig(prev => ({...prev, totalAdj: Number(e.target.value) + 100}))}
                      className="w-24 pl-4 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">%</span>
                  </div>
                </div>
                <div className="flex gap-2 ml-2">
                  <button 
                    onClick={handleProcess}
                    className="px-6 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 active:scale-95"
                  >
                    ÁP DỤNG
                  </button>
                  <button 
                    onClick={() => setTargetConfig(prev => ({...prev, totalAdj: 100}))}
                    className="px-4 py-2 bg-slate-100 text-slate-500 rounded-xl text-xs font-bold hover:bg-slate-200 transition-all"
                  >
                    XÓA
                  </button>
                </div>
              </div>
            </div>
            
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

        {/* Filter Card */}
        <div className="max-w-6xl mx-auto bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row items-center gap-4 mb-8">
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
                <span>ST Hiển thị ({previewData.markets.length - excludedMarketNames.length}/{previewData.markets.length})</span>
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
                            onClick={() => setExcludedMarketNames(previewData.markets.map(m => m.name))}
                            className="text-[9px] font-bold text-red-600 hover:underline"
                          >
                            Ẩn hết
                          </button>
                        </div>
                      </div>
                      <div className="max-h-64 overflow-y-auto p-2 space-y-1">
                        {previewData.markets.length === 0 && (
                          <p className="text-xs text-slate-400 p-2 text-center">Chưa có dữ liệu siêu thị</p>
                        )}
                        {previewData.markets.map((market) => {
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

            {/* Staff Selection Dropdown */}
            <div className="relative">
              <button 
                onClick={() => setIsStaffDropdownOpen(!isStaffDropdownOpen)}
                className="flex items-center gap-2 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold hover:bg-slate-100 transition-all whitespace-nowrap"
              >
                <Users size={14} className="text-indigo-500" />
                <span>NV Hiển thị ({previewData.staff.length - excludedStaffIds.length}/{previewData.staff.length})</span>
                <ChevronDown size={14} className={cn("transition-transform", isStaffDropdownOpen && "rotate-180")} />
              </button>

              <AnimatePresence>
                {isStaffDropdownOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-[70]" 
                      onClick={() => setIsStaffDropdownOpen(false)} 
                    />
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute top-full left-0 mt-2 min-w-[240px] max-w-[320px] bg-white border border-slate-200 rounded-2xl shadow-2xl z-[80] overflow-hidden"
                    >
                      <div className="p-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between gap-4">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Danh sách nhân viên</span>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => setExcludedStaffIds([])}
                            className="text-[9px] font-bold text-indigo-600 hover:underline"
                          >
                            Hiện hết
                          </button>
                          <button 
                            onClick={() => setExcludedStaffIds(previewData.staff.map(s => s.fullId))}
                            className="text-[9px] font-bold text-red-600 hover:underline"
                          >
                            Ẩn hết
                          </button>
                        </div>
                      </div>
                      <div className="max-h-64 overflow-y-auto p-2 space-y-1">
                        {previewData.staff.length === 0 && (
                          <p className="text-xs text-slate-400 p-2 text-center">Chưa có dữ liệu nhân viên</p>
                        )}
                        {previewData.staff.map((staff) => {
                          const isExcluded = excludedStaffIds.includes(staff.fullId);
                          return (
                            <button
                              key={staff.fullId}
                              onClick={() => {
                                setExcludedStaffIds(prev => 
                                  isExcluded 
                                    ? prev.filter(id => id !== staff.fullId)
                                    : [...prev, staff.fullId]
                                );
                              }}
                              className={cn(
                                "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors",
                                isExcluded ? "opacity-50 hover:bg-slate-50" : "hover:bg-indigo-50"
                              )}
                            >
                              {isExcluded ? (
                                <Square size={16} className="text-slate-300" />
                              ) : (
                                <CheckSquare size={16} className="text-indigo-600" />
                              )}
                              <div className="flex-1 overflow-hidden">
                                <p className={cn("text-xs font-bold truncate", !isExcluded ? "text-slate-800" : "text-slate-400")}>
                                  {staff.displayName}
                                </p>
                                <p className="text-[10px] text-slate-400 font-medium">{staff.fullId}</p>
                              </div>
                              {!isExcluded && <Check size={12} className="text-indigo-600" />}
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
        </div>

        {(excludedStaffIds.length > 0 || excludedMarketNames.length > 0) && (
            <div className="max-w-6xl mx-auto mb-4 flex justify-end">
              <button 
                onClick={() => { setExcludedStaffIds([]); setExcludedMarketNames([]); }}
                className="text-[10px] font-black text-red-500 hover:text-red-600 uppercase tracking-wider px-4 py-2 bg-red-50 rounded-xl transition-all"
              >
                XÓA LỌC
              </button>
            </div>
          )}

        {/* Header */}
        <header className="max-w-6xl mx-auto mb-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
          </div>
          <div className="flex items-center gap-3">
            {deletedData && (
              <button 
                onClick={handleUndo}
                className="group flex items-center gap-2 bg-white text-indigo-600 px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-indigo-50 transition-all border border-slate-200 shadow-sm"
              >
                <Undo2 size={14} className="group-hover:scale-110 transition-transform" />
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
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm mb-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center text-white">
                <Store size={20} />
              </div>
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">BÁO CÁO TỔNG HỢP CỤM</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-1">
                <label className="text-[11px] font-black text-slate-700 uppercase">BC TỔNG HỢP CỤM</label>
                <textarea 
                  value={clusterReportInput}
                  onChange={(e) => setClusterReportInput(e.target.value)}
                  rows={4}
                  placeholder="Dán dữ liệu BC Tổng hợp cụm..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs focus:ring-2 focus:ring-purple-500 outline-none resize-none font-mono"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-black text-slate-700 uppercase">NH THI ĐUA CỤM</label>
                <textarea 
                  value={clusterCompetitionInput}
                  onChange={(e) => setClusterCompetitionInput(e.target.value)}
                  rows={4}
                  placeholder="Dán dữ liệu NH Thi đua cụm..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs focus:ring-2 focus:ring-purple-500 outline-none resize-none font-mono"
                />
              </div>
            </div>
          </div>

          {/* CẤU HÌNH SIÊU THỊ Section */}
          <div className="grid grid-cols-1 gap-6 mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-white p-6 rounded-2xl border border-slate-200 shadow-sm gap-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white">
                  <LayoutGrid size={20} />
                </div>
                <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">CẤU HÌNH SIÊU THỊ</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    setActiveMarketName(null);
                    setMarketInput('');
                    setStaffInput('');
                    setCategoryInput('');
                  }}
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs font-bold transition-all border",
                    activeMarketName === null 
                      ? "bg-blue-50 text-blue-700 border-blue-200 ring-2 ring-blue-100" 
                      : "bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100"
                  )}
                >
                  TẤT CẢ
                </button>
                {previewData.markets.map(market => {
                  const isActive = activeMarketName === market.name;
                  return (
                    <button 
                      key={market.name}
                      onClick={() => {
                        setActiveMarketName(market.name);
                        const data = marketDataMap[market.name];
                        if (data) {
                          setMarketInput(data.market);
                          setStaffInput(data.staff);
                          setCategoryInput(data.cat);
                          setStaffCategoryInput(data.staffCat || '');
                        } else {
                          setMarketInput('');
                          setStaffInput('');
                          setCategoryInput('');
                          setStaffCategoryInput('');
                        }
                      }}
                      className={cn(
                        "px-4 py-2 rounded-xl text-xs font-bold transition-all border",
                        isActive 
                          ? "bg-blue-50 text-blue-700 border-blue-200 ring-2 ring-blue-100" 
                          : "bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100"
                      )}
                    >
                      {market.name}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="border-b border-slate-200 mb-6">
            <div className="flex gap-8">
              {['DỮ LIỆU NGUỒN', 'TARGET DOANH THU', 'TARGET THI ĐUA'].map(tab => (
                <button 
                  key={tab} 
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "pb-4 text-xs font-black text-slate-500 hover:text-indigo-600 border-b-2 transition-all",
                    activeTab === tab ? "text-indigo-600 border-indigo-600" : "border-transparent"
                  )}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

            {activeTab === 'TARGET DOANH THU' && (
              <div className="space-y-6">
                {[
                  { label: 'MỤC TIÊU TỔNG (QĐ)', key: 'total', adjKey: 'totalAdj', unit: 'Tr' },
                  { label: 'TARGET TRẢ GÓP', key: 'traGop', adjKey: 'traGopAdj', unit: '%' },
                  { label: 'TARGET QUY ĐỔI', key: 'quyDoi', adjKey: 'quyDoiAdj', unit: '%' },
                ].map((item, i) => {
                  const val = targetConfig[item.key as keyof typeof targetConfig] as number;
                  const adj = targetConfig[item.adjKey as keyof typeof targetConfig] as number;
                  const sau = val * (adj / 100);
                  return (
                    <div key={i} className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-4">
                          <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider w-32">{item.label}</h3>
                          <div className="flex gap-8">
                            <span className="text-xs font-bold text-slate-400">GỐC: <span className="text-slate-700">{val.toLocaleString('vi-VN', {maximumFractionDigits: item.key === 'total' ? 0 : undefined})}{item.unit}</span></span>
                            <span className="text-xs font-bold text-indigo-400">SAU: <span className="text-indigo-600">{sau.toLocaleString('vi-VN', {maximumFractionDigits: item.key === 'total' ? 0 : 1})}{item.unit}</span></span>
                          </div>
                        </div>
                        <div className="relative w-24">
                          <input 
                            type="number"
                            value={adj}
                            onChange={(e) => setTargetConfig(prev => ({...prev, [item.adjKey]: Number(e.target.value)}))}
                            className="w-full pl-3 pr-8 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-black text-indigo-600 outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">%</span>
                        </div>
                      </div>
                      <input 
                        type="range" 
                        min="0" max="200"
                        value={adj}
                        onChange={(e) => setTargetConfig(prev => ({...prev, [item.adjKey]: Number(e.target.value)}))}
                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600" 
                      />
                    </div>
                  );
                })}
              </div>
            )}

            {activeTab === 'TARGET THI ĐUA' && (
              <div className="space-y-6">
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                  <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">BẢNG TARGET THI ĐUA NGÀNH HÀNG</h3>
                      <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-2 py-1 shadow-sm">
                        <span className="text-[10px] font-black text-slate-400 uppercase">ALL TARGET:</span>
                        <input 
                          type="number"
                          id="bulk-target-input"
                          placeholder="100"
                          className="w-12 text-center text-[10px] font-black text-indigo-600 outline-none"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const val = Number((e.target as HTMLInputElement).value);
                              if (!isNaN(val)) {
                                const newAdjs = { ...categoryAdjustments };
                                competitionData.forEach(item => {
                                  newAdjs[item.name] = val;
                                });
                                setCategoryAdjustments(newAdjs);
                              }
                            }
                          }}
                        />
                        <span className="text-[10px] font-bold text-slate-400 mr-1">%</span>
                        <button 
                          onClick={() => {
                            const input = document.getElementById('bulk-target-input') as HTMLInputElement;
                            const val = Number(input.value);
                            if (!isNaN(val) && input.value !== "") {
                              const newAdjs = { ...categoryAdjustments };
                              competitionData.forEach(item => {
                                newAdjs[item.name] = val;
                              });
                              setCategoryAdjustments(newAdjs);
                            }
                          }}
                          className="p-1 hover:bg-indigo-50 rounded text-indigo-600 transition-colors"
                          title="Áp dụng cho tất cả"
                        >
                          <Check size={12} strokeWidth={3} />
                        </button>
                      </div>
                    </div>
                    <button 
                      onClick={handleProcess}
                      className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-[10px] font-black uppercase hover:bg-indigo-700 transition-all shadow-md active:scale-95"
                    >
                      ÁP DỤNG CHO CÁC BẢNG
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50/50 border-b border-slate-100">
                          <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider">Siêu Thị</th>
                          <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider">Tên Ngành Hàng</th>
                          <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider text-center">Target BI</th>
                          <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider text-center">Target Sau</th>
                          <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider text-right w-32">% Target Mong Muốn</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {competitionData.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-4 py-8 text-center text-slate-400 text-xs font-medium">
                              {activeMarketName 
                                ? `Chưa có dữ liệu ngành hàng cho siêu thị ${activeMarketName}.` 
                                : "Chưa có dữ liệu ngành hàng. Vui lòng chọn siêu thị và dán dữ liệu."}
                            </td>
                          </tr>
                        ) : (
                          competitionData.map((item, idx) => {
                            const adj = categoryAdjustments[item.name] ?? 100;
                            const targetSau = item.targetBI * (adj / 100);
                            return (
                              <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-4 py-3 text-[10px] font-black text-slate-400">{item.market}</td>
                                <td className="px-4 py-3 text-xs font-bold text-slate-700">{item.name}</td>
                                <td className="px-4 py-3 text-xs text-slate-400 text-center font-medium">{item.targetBI.toLocaleString('vi-VN')}</td>
                                <td className="px-4 py-3 text-xs text-indigo-600 text-center font-black">{targetSau.toLocaleString('vi-VN', { maximumFractionDigits: 1 })}</td>
                                <td className="px-4 py-3 text-right">
                                  <div className="relative inline-block w-24">
                                    <input 
                                      type="number"
                                      value={adj}
                                      onChange={(e) => {
                                        const newVal = Number(e.target.value);
                                        setCategoryAdjustments(prev => ({
                                          ...prev,
                                          [item.name]: newVal
                                        }));
                                      }}
                                      className="w-full pl-3 pr-8 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-black text-indigo-600 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                                    />
                                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">%</span>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'DỮ LIỆU NGUỒN' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-400"></span> BC DOANH THU
                  </h3>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">DOANH THU TỔNG</label>
                    <textarea 
                      value={marketInput}
                      onChange={(e) => setMarketInput(e.target.value)}
                      rows={5}
                      placeholder="Dán báo cáo doanh thu vào đây..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs focus:ring-2 focus:ring-blue-500 outline-none resize-none font-mono"
                    />
                  </div>
                  
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-2 mt-6">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span> BC D.THU THEO NV
                  </h3>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">D.THU NHÂN VIÊN</label>
                    <textarea 
                      value={staffInput}
                      onChange={(e) => setStaffInput(e.target.value)}
                      rows={5}
                      placeholder="DOANH THU"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs focus:ring-2 focus:ring-emerald-500 outline-none resize-none font-mono"
                    />
                  </div>
                </div>
                <div className="space-y-4">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-purple-400"></span> T.ĐUA NHÂN VIÊN
                  </h3>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">THI ĐUA NV</label>
                    <textarea 
                      value={staffCategoryInput}
                      onChange={(e) => setStaffCategoryInput(e.target.value)}
                      rows={5}
                      placeholder="THI ĐUA NV"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs focus:ring-2 focus:ring-purple-500 outline-none resize-none font-mono"
                    />
                  </div>

                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-2 mt-6">
                    <span className="w-2 h-2 rounded-full bg-amber-400"></span> TRẢ GÓP & CHI TIẾT NH
                  </h3>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">MA TRẬN NH</label>
                    <textarea 
                      value={categoryInput}
                      onChange={(e) => setCategoryInput(e.target.value)}
                      rows={5}
                      placeholder="MA TRẬN NH"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs focus:ring-2 focus:ring-amber-500 outline-none resize-none font-mono"
                    />
                  </div>
                </div>
              </div>
            )}

          {/* Input Grid */}
          <div className="grid grid-cols-1 gap-6">
          </div>
        </main>

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
        
        {/* Footer */}
        <footer className="max-w-6xl mx-auto mt-16 pt-8 border-t border-slate-200 text-center">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
            ⚙️ BI PROCESOR • Built by Võ Vũ Linh @{new Date().getFullYear()}
          </p>
        </footer>
      </div>
    </div>
  );
}
