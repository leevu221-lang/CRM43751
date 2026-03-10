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

export default function GeneralReport({ onNavigate }: { onNavigate?: (page: 'general' | 'realtime' | 'update' | 'staff') => void }) {
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
  const [catFilter, setCatFilter] = useState<'ALL' | 'SLLK' | 'DTLK'>('ALL');
  const [marketFilter, setMarketFilter] = useState<string>('ALL');

  // Refs for capture
  const captureRefs = {
    marketSummary: useRef<HTMLDivElement>(null),
    catRank: useRef<HTMLDivElement>(null)
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
      let mName = c.marketName;
      if (mName === "7038" && visibleMarkets.length === 1) {
        mName = visibleMarkets[0].name;
      }
      return { ...c, rate, marketName: mName };
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

  const parseCategoryData = (input: string, daysPassed: number, totalDays: number, catAdjustments: Record<string, number>, markets: MarketInfo[]): CategoryData[] => {
    const val = input.trim();
    if (!val) return [];
    const lines = val.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const results: CategoryData[] = [];
    let currentCatName = "";
    let currentMarketName = "7038";
    const sortedMarkets = [...markets].sort((a, b) => b.name.length - a.name.length);
    
    const normalize = (s: string) => s.replace(/\s+/g, ' ').toLowerCase();

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

      // Robust market detection: if the line itself contains a market name
      const matchedMarketInLine = sortedMarkets.find(m => {
        const normName = normalize(m.name);
        return normLine.includes(normName);
      });
      if (matchedMarketInLine) {
        currentMarketName = matchedMarketInLine.name;
      }
      
      const isSM = (s: string) => /ĐIỆN MÁY XANH|THẾ GIỚI DI ĐỘNG|ĐMX|TGDĐ|TOPZONE|ĐMS|ĐMM|ĐML/i.test(s);
      const isTechnicalHeader = (s: string) => /^[A-Z0-9]{2,}_[A-Z0-9]{2,}_[A-Z0-9]{2,}/i.test(s) || /^(ĐMS|ĐMM|ĐML|ĐIỆN MÁY|THẾ GIỚI|TỔNG|CỤM|MIỀN)/i.test(s);

      // If the data line itself has text at the beginning, it might be the category name
      const firstNumMatch = line.match(/-?[\d,.]+(%?)/);
      if (firstNumMatch && firstNumMatch.index! > 3) {
        const potentialCat = line.substring(0, firstNumMatch.index!).trim();
        if (potentialCat && !isSM(potentialCat) && !potentialCat.startsWith("Tổng") && !isTechnicalHeader(potentialCat)) {
          currentCatName = potentialCat;
        }
      }
      
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
      
      let extractedName = currentCatName;
      if (isTechnicalHeader(extractedName)) {
        continue;
      }

      let isSLLK = false;
      let isDTLK = false;
      
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
          rate: 0, // Calculated in useMemo
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
      const catData = parseCategoryData(categoryInput, daysPassed, totalDays, categoryAdjustments, markets);
      
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
      { ref: captureRefs.marketSummary, name: '1_Dashboard_SieuThi' },
      { ref: captureRefs.catRank, name: '2_NganhHang_SieuThi' },
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
            <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase leading-none">📈 BI LUỸ KẾ TỔNG HỢP</h1>
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
                  onClick={() => captureElement(captureRefs.marketSummary, 'BaoCao_SieuThi')}
                  className="flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-xl text-[10px] font-black uppercase border border-blue-100 hover:bg-blue-100 transition-all"
                >
                  <Camera size={12} /> DASH SIÊU THỊ
                </button>
                <button 
                  onClick={() => captureElement(captureRefs.catRank, 'NganhHang_SieuThi')}
                  className="flex items-center gap-2 bg-amber-50 text-amber-700 px-4 py-2 rounded-xl text-[10px] font-black uppercase border border-amber-100 hover:bg-amber-100 transition-all"
                >
                  <Camera size={12} /> TIẾN ĐỘ NGÀNH HÀNG
                </button>
                <div className="w-px bg-slate-200 mx-1 hidden lg:block" />
                <button 
                  onClick={batchDownload}
                  className="flex items-center gap-2 bg-slate-900 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase shadow-lg hover:bg-black transition-all"
                >
                  <Download size={12} /> Tải 2 Ảnh Báo Cáo
                </button>
              </div>

              {/* Market Filter */}
              <div className="flex items-center gap-3 bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
                <Store size={18} className="text-indigo-600" />
                <span className="text-sm font-bold text-slate-700">Chọn siêu thị:</span>
                <select
                  value={marketFilter}
                  onChange={(e) => setMarketFilter(e.target.value)}
                  className="flex-1 bg-slate-50 border border-slate-200 text-slate-700 text-sm font-bold rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
                >
                  <option value="ALL">Tất cả siêu thị</option>
                  {displayData.markets.map(m => (
                    <option key={m.name} value={m.name}>{m.name}</option>
                  ))}
                </select>
              </div>

              {/* Filter Card moved to UpdateData page */}

              {/* Dashboard Cards */}
              <div ref={captureRefs.marketSummary} className="space-y-6">
                {displayData.markets
                  .filter(market => marketFilter === 'ALL' || market.name === marketFilter)
                  .map((market, mIdx) => (
                    <div 
                      key={mIdx}
                      className="p-6 bg-[#f8fafc] rounded-3xl transition-all duration-300 shadow-sm border border-slate-100"
                    >
                      <div className="mb-6 border-b border-slate-200 pb-4 flex items-center justify-between">
                        <div>
                          <h2 className="text-2xl font-black text-slate-900">[LK] BC TỔNG HỢP - {market.name}</h2>
                          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">
                            Cập nhật: {new Date().toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit', day: 'numeric', month: 'numeric', year: 'numeric' })}
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {[
                          { label: 'Target Quy Đổi', value: Math.round(market.targetST).toLocaleString('vi-VN'), color: 'bg-blue-600', icon: <Target size={20} /> },
                          { label: 'DT Quy đổi', value: Math.round(market.actualVirtual).toLocaleString('vi-VN'), color: 'bg-emerald-600', icon: <TrendingUp size={20} /> },
                          { label: '% HT Target', value: `${Math.round(calculateProjected(market).projectedPercentage)}%`, color: 'bg-amber-500', icon: <BarChart3 size={20} /> },
                          { label: 'Hiệu quả QĐ', value: `${Math.round(((market.actualVirtual - market.actualReal) / market.actualReal) * 100)}%`, color: 'bg-rose-500', icon: <Zap size={20} /> },
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
                {/* Category Rank */}
                <div ref={captureRefs.catRank} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-6 bg-amber-500 rounded-full" />
                      <h3 className="font-black text-slate-800 text-sm uppercase tracking-wider">
                        📦 [LK] TIẾN ĐỘ NGÀNH HÀNG SIÊU THỊ
                        <span className="ml-2 px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-[10px] font-bold">
                          {displayData.catData.filter(item => {
                            if (catFilter === 'ALL') return true;
                            if (catFilter === 'SLLK') return item.name.toUpperCase().includes('SLLK');
                            if (catFilter === 'DTLK') return item.name.toUpperCase().includes('DTLK');
                            return true;
                          }).filter(item => {
                            if (marketFilter === 'ALL') return true;
                            return item.marketName === marketFilter;
                          }).length} NGÀNH HÀNG
                        </span>
                      </h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider hidden md:inline-block">Lọc:</span>
                      <select
                        value={catFilter}
                        onChange={(e) => setCatFilter(e.target.value as any)}
                        className="bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none cursor-pointer"
                      >
                        <option value="ALL">Tất cả</option>
                        <option value="SLLK">Thi đua SLLK</option>
                        <option value="DTLK">Thi đua DTLK</option>
                      </select>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-amber-50/80 border-y border-amber-100/50">
                        <tr>
                          <th className="px-2 py-3 md:px-6 md:py-4 text-[10px] md:text-[11px] font-black text-amber-800 uppercase tracking-wider">Ngành hàng</th>
                          <th className="px-2 py-3 md:px-4 md:py-4 text-[10px] md:text-[11px] font-black text-amber-800 uppercase tracking-wider text-center">Target</th>
                          <th className="px-2 py-3 md:px-4 md:py-4 text-[10px] md:text-[11px] font-black text-amber-800 uppercase tracking-wider text-center">Lũy kế</th>
                          <th className="px-2 py-3 md:px-6 md:py-4 text-[10px] md:text-[11px] font-black text-amber-800 uppercase tracking-wider text-right">%HT</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {displayData.catData
                          .filter(item => {
                            if (catFilter === 'ALL') return true;
                            if (catFilter === 'SLLK') return item.name.toUpperCase().includes('SLLK');
                            if (catFilter === 'DTLK') return item.name.toUpperCase().includes('DTLK');
                            return true;
                          })
                          .filter(item => {
                            if (marketFilter === 'ALL') return true;
                            return item.marketName === marketFilter;
                          })
                          .sort((a, b) => b.rate - a.rate)
                          .map((item, idx) => (
                            <tr key={idx} className="even:bg-slate-50/50 hover:bg-indigo-50/40 transition-colors">
                              <td className="px-2 py-3 md:px-6 md:py-4 text-[11px] md:text-xs font-bold text-slate-700">{item.name}</td>
                              <td className="px-2 py-3 md:px-4 md:py-4 text-[11px] md:text-xs text-slate-400 text-center">{item.target.toLocaleString('vi-VN')}</td>
                              <td className="px-2 py-3 md:px-4 md:py-4 text-[11px] md:text-xs font-bold text-slate-800 text-center">{item.actual.toLocaleString('vi-VN')}</td>
                              <td className={cn(
                                "px-2 py-3 md:px-6 md:py-4 text-[11px] md:text-xs font-black text-right",
                                item.rate < 80 ? "text-rose-500" : item.rate < 100 ? "text-amber-500" : "text-emerald-500"
                              )}>
                                {item.rate.toFixed(1)}%
                              </td>
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
