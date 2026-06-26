"use client";

import React, { useState, useMemo } from "react";
import { 
  BookOpen, 
  MessageSquare, 
  Calculator, 
  Search, 
  ShieldAlert, 
  Coins, 
  CheckCircle,
  Database
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface DocsClientProps {
  systemDocsText: string;
  geminiChatText: string;
}

export default function DocsClient({ systemDocsText, geminiChatText }: DocsClientProps) {
  const [activeTab, setActiveTab] = useState<"system" | "chat" | "calculator">("system");
  const [searchQuery, setSearchQuery] = useState("");

  // Calculator State
  const [teams, setTeams] = useState(19);
  const [stories, setStories] = useState(27);
  const [videoSize, setVideoSize] = useState(100); // in MB
  const [audioSize, setAudioSize] = useState(100); // in MB
  const [reviewCount, setReviewCount] = useState(3);

  // Calculations for cost
  const calculations = useMemo(() => {
    // 1 story template: 1 video (videoSize) + 2 audio reference (2 x 10MB)
    const templateSize = videoSize + 20; 
    const totalTemplateStorage = (stories * templateSize) / 1024; // in GB
    
    // Output per month: teams * audioSize
    const monthlyOutputStorage = (teams * audioSize) / 1024; // in GB
    const totalOutputStorage = monthlyOutputStorage * stories; // in GB
    
    const totalStorageEnd = totalTemplateStorage + totalOutputStorage; // in GB
    
    // Monthly egress: (teams * templateSize) + (teams * audioSize * reviewCount)
    const monthlyEgress = ((teams * templateSize) + (teams * audioSize * reviewCount)) / 1024; // in GB
    
    // Cloudflare R2 Pricing
    // Storage: Free up to 10GB, then $0.015 / GB
    // Egress: Free
    const calculateR2StorageCost = (gb: number) => {
      const billableGb = Math.max(0, gb - 10);
      return billableGb * 0.015;
    };
    
    const r2CostBulan1 = calculateR2StorageCost(totalTemplateStorage + monthlyOutputStorage);
    const r2CostBulanAkhir = calculateR2StorageCost(totalStorageEnd);
    const r2TotalCostAccumulated = Array.from({ length: stories }).reduce<number>((acc, _, idx) => {
      const currentStorage = totalTemplateStorage + (monthlyOutputStorage * (idx + 1));
      return acc + calculateR2StorageCost(currentStorage);
    }, 0);

    // Google Cloud Storage (GCS) Pricing (Standard Storage, Jakarta/Asia Region)
    // Storage: Free 5GB only in US, so Jakarta starts at $0.02 / GB
    // Egress: $0.12 / GB (international)
    const gcsStorageRate = 0.02; // $0.02 per GB
    const gcsEgressRate = 0.12; // $0.12 per GB
    
    const gcsStorageCostBulan1 = (totalTemplateStorage + monthlyOutputStorage) * gcsStorageRate;
    const gcsStorageCostBulanAkhir = totalStorageEnd * gcsStorageRate;
    const gcsEgressCostPerMonth = monthlyEgress * gcsEgressRate;
    
    const gcsCostBulan1 = gcsStorageCostBulan1 + gcsEgressCostPerMonth;
    const gcsCostBulanAkhir = gcsStorageCostBulanAkhir + gcsEgressCostPerMonth;
    const gcsTotalCostAccumulated = Array.from({ length: stories }).reduce<number>((acc, _, idx) => {
      const currentStorage = totalTemplateStorage + (monthlyOutputStorage * (idx + 1));
      const storageCost = currentStorage * gcsStorageRate;
      return acc + storageCost + gcsEgressCostPerMonth;
    }, 0);

    const formatIdr = (usd: number) => {
      const idr = usd * 15500;
      if (idr === 0) return "Rp 0";
      return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0
      }).format(idr);
    };

    return {
      templateSize,
      totalTemplateStorage: totalTemplateStorage.toFixed(2),
      monthlyOutputStorage: monthlyOutputStorage.toFixed(2),
      totalStorageEnd: totalStorageEnd.toFixed(2),
      monthlyEgress: monthlyEgress.toFixed(2),
      r2CostBulan1: formatIdr(r2CostBulan1),
      r2CostBulanAkhir: formatIdr(r2CostBulanAkhir),
      r2TotalCost: formatIdr(r2TotalCostAccumulated),
      r2CostUsd: r2CostBulanAkhir.toFixed(2),
      gcsCostBulan1: formatIdr(gcsCostBulan1),
      gcsCostBulanAkhir: formatIdr(gcsCostBulanAkhir),
      gcsTotalCost: formatIdr(gcsTotalCostAccumulated),
      gcsCostUsd: gcsCostBulanAkhir.toFixed(2),
      savingBulanAkhir: formatIdr(gcsCostBulanAkhir - r2CostBulanAkhir),
      savingTotal: formatIdr(gcsTotalCostAccumulated - r2TotalCostAccumulated)
    };
  }, [teams, stories, videoSize, audioSize, reviewCount]);

  // Markdown Custom Parser and Highlight
  const renderMarkdown = (text: string) => {
    if (!text) return null;
    
    const lines = text.split("\n");
    let tableHeaders: string[] = [];
    let tableRows: string[][] = [];
    let listItems: string[] = [];
    const renderedElements: React.ReactNode[] = [];
    let keyCounter = 0;

    const flushList = () => {
      if (listItems.length > 0) {
        renderedElements.push(
          <ul key={`list-${keyCounter++}`} className="list-disc pl-6 mb-4 space-y-2 text-slate-300">
            {listItems.map((item, index) => (
              <li key={`li-${index}`} dangerouslySetInnerHTML={{ __html: parseInlineStyles(item) }} />
            ))}
          </ul>
        );
        listItems = [];
      }
    };

    const flushTable = () => {
      if (tableRows.length > 0 || tableHeaders.length > 0) {
        renderedElements.push(
          <div key={`table-wrapper-${keyCounter++}`} className="overflow-x-auto my-6 border border-slate-800 rounded-lg">
            <table className="min-w-full divide-y divide-slate-800 text-sm">
              <thead className="bg-slate-900/50">
                <tr>
                  {tableHeaders.map((header, idx) => (
                    <th key={`th-${idx}`} className="px-4 py-3 text-left font-semibold text-slate-200">
                      {header.trim()}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-slate-950/20">
                {tableRows.map((row, rIdx) => (
                  <tr key={`tr-${rIdx}`} className="hover:bg-slate-900/20 transition-colors">
                    {row.map((cell, cIdx) => (
                      <td 
                        key={`td-${cIdx}`} 
                        className="px-4 py-3 text-slate-300"
                        dangerouslySetInnerHTML={{ __html: parseInlineStyles(cell.trim()) }}
                      />
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        tableHeaders = [];
        tableRows = [];
      }
    };

    const parseInlineStyles = (raw: string) => {
      let parsed = raw
        // Bold
        .replace(/\*\*(.*?)\*\*/g, "<strong class='text-violet-400 font-bold'>$1</strong>")
        // Italic
        .replace(/\*(.*?)\*/g, "<em>$1</em>")
        // Inline Code
        .replace(/`(.*?)`/g, "<code class='bg-slate-800 text-pink-400 px-1.5 py-0.5 rounded text-xs font-mono border border-slate-700'>$1</code>")
        // Links
        .replace(/\[(.*?)\]\((.*?)\)/g, "<span class='text-violet-400 font-medium underline decoration-violet-500/50 hover:text-violet-300'>$1</span>");
      
      // Simple text highlighting for search
      if (searchQuery.trim() !== "") {
        const regex = new RegExp(`(${escapeRegex(searchQuery)})`, "gi");
        parsed = parsed.replace(regex, "<mark class='bg-yellow-500/30 text-yellow-200 border-b border-yellow-400 px-0.5 rounded-xs'>$1</mark>");
      }
      
      return parsed;
    };

    const escapeRegex = (string: string) => {
      return string.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Heading 1
      if (trimmed.startsWith("# ")) {
        flushList();
        flushTable();
        const content = trimmed.substring(2);
        renderedElements.push(
          <h1 key={`h1-${keyCounter++}`} className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-fuchsia-400 to-cyan-400 mt-8 mb-4 border-b border-slate-800 pb-2">
            {content}
          </h1>
        );
        continue;
      }

      // Heading 2
      if (trimmed.startsWith("## ")) {
        flushList();
        flushTable();
        const content = trimmed.substring(3);
        renderedElements.push(
          <h2 key={`h2-${keyCounter++}`} className="text-2xl font-bold text-slate-100 mt-8 mb-3 flex items-center gap-2">
            <span className="h-4 w-1 rounded bg-violet-500" />
            {content}
          </h2>
        );
        continue;
      }

      // Heading 3
      if (trimmed.startsWith("### ")) {
        flushList();
        flushTable();
        const content = trimmed.substring(4);
        renderedElements.push(
          <h3 key={`h3-${keyCounter++}`} className="text-xl font-semibold text-cyan-300 mt-6 mb-2">
            {content}
          </h3>
        );
        continue;
      }

      // Alert Callouts (> [!NOTE] or > [!IMPORTANT] etc.)
      if (trimmed.startsWith("> ")) {
        flushList();
        flushTable();
        let alertType = "note";
        let title = "Note";
        const alertLines: string[] = [];
        
        // Read block of alerts
        while (i < lines.length && lines[i].trim().startsWith("> ")) {
          const lText = lines[i].trim().substring(2).trim();
          if (lText.startsWith("[!IMPORTANT]")) {
            alertType = "important";
            title = "PENTING";
          } else if (lText.startsWith("[!WARNING]")) {
            alertType = "warning";
            title = "PERINGATAN";
          } else if (lText.startsWith("[!NOTE]")) {
            alertType = "note";
            title = "CATATAN";
          } else {
            alertLines.push(lText);
          }
          i++;
        }
        i--; // Step back for loop increment

        const alertStyles = {
          important: "bg-red-950/20 border-red-500/30 text-red-200",
          warning: "bg-amber-950/20 border-amber-500/30 text-amber-200",
          note: "bg-violet-950/20 border-violet-500/30 text-violet-200"
        };
        
        renderedElements.push(
          <div key={`alert-${keyCounter++}`} className={`p-4 border-l-4 rounded-r-lg my-4 flex gap-3 ${alertStyles[alertType as keyof typeof alertStyles]}`}>
            <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-xs uppercase tracking-wider opacity-90 mb-1">{title}</div>
              <div className="text-sm space-y-1">
                {alertLines.map((aLine, aIdx) => (
                  <p key={aIdx} dangerouslySetInnerHTML={{ __html: parseInlineStyles(aLine) }} />
                ))}
              </div>
            </div>
          </div>
        );
        continue;
      }

      // Unordered list
      if (trimmed.startsWith("* ") || trimmed.startsWith("- ")) {
        flushTable();
        listItems.push(trimmed.substring(2));
        continue;
      }

      // Tables
      if (trimmed.startsWith("|")) {
        flushList();
        const cells = trimmed.split("|").slice(1, -1);
        if (trimmed.includes("---")) {
          // Divider line, ignore
          continue;
        }
        if (tableHeaders.length === 0) {
          tableHeaders = cells;
        } else {
          tableRows.push(cells);
        }
        continue;
      }

      // Blank line
      if (trimmed === "") {
        flushList();
        flushTable();
        continue;
      }

      // Standard Paragraph
      flushList();
      flushTable();
      
      // Check if it's a code block toggle
      if (trimmed.startsWith("```")) {
        const codeLines: string[] = [];
        i++; // skip toggle line
        while (i < lines.length && !lines[i].trim().startsWith("```")) {
          codeLines.push(lines[i]);
          i++;
        }
        renderedElements.push(
          <pre key={`code-${keyCounter++}`} className="bg-slate-950/80 border border-slate-800 p-4 rounded-lg text-xs font-mono text-cyan-400 overflow-x-auto my-4 max-w-full">
            <code>{codeLines.join("\n")}</code>
          </pre>
        );
        continue;
      }

      renderedElements.push(
        <p 
          key={`p-${keyCounter++}`} 
          className="text-slate-300 text-sm leading-relaxed mb-4"
          dangerouslySetInnerHTML={{ __html: parseInlineStyles(trimmed) }}
        />
      );
    }

    // Clear any dangling items
    flushList();
    flushTable();

    return renderedElements;
  };

  const filteredSystemDocs = useMemo(() => {
    if (!searchQuery) return systemDocsText;
    // Simple filter to check if text contains search term (case insensitive)
    return systemDocsText;
  }, [systemDocsText, searchQuery]);

  const filteredGeminiChat = useMemo(() => {
    if (!searchQuery) return geminiChatText;
    return geminiChatText;
  }, [geminiChatText, searchQuery]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-violet-500/30 selection:text-violet-200">
      {/* Background Gradients */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-violet-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-[400px] h-[400px] bg-cyan-600/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Glass Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-slate-950/70 border-b border-slate-900 px-6 py-4">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-violet-500/20">
              <Database className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                ARK System Hub <span className="text-xs bg-slate-800 text-slate-300 font-normal px-2.5 py-0.5 rounded-full border border-slate-700">Dokumentasi Publik</span>
              </h1>
              <p className="text-xs text-slate-400">Analisis kebutuhan lapangan, kapasitas storage, dan mitigasi keamanan.</p>
            </div>
          </div>
          
          {/* Tabs Navigation */}
          <div className="flex bg-slate-900/60 border border-slate-800 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab("system")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === "system" 
                  ? "bg-violet-600 text-white shadow-md shadow-violet-600/20" 
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <BookOpen className="h-4 w-4" />
              Sistem Dokumentasi
            </button>
            <button
              onClick={() => setActiveTab("chat")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === "chat" 
                  ? "bg-violet-600 text-white shadow-md shadow-violet-600/20" 
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <MessageSquare className="h-4 w-4" />
              Tanya Jawab Gemini
            </button>
            <button
              onClick={() => setActiveTab("calculator")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === "calculator" 
                  ? "bg-violet-600 text-white shadow-md shadow-violet-600/20" 
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Calculator className="h-4 w-4" />
              Simulator Biaya Cloud
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        
        {/* Search Bar for Documents */}
        {activeTab !== "calculator" && (
          <div className="relative mb-6 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input
              type="text"
              placeholder="Cari dalam dokumen (contoh: R2, OPFS, biaya)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-900/40 hover:bg-slate-900/60 focus:bg-slate-900 border border-slate-800 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 rounded-xl text-sm transition-all text-slate-200 outline-hidden placeholder:text-slate-500"
            />
          </div>
        )}

        <AnimatePresence mode="wait">
          {/* Tab 1: System Documentation */}
          {activeTab === "system" && (
            <motion.div
              key="system-docs"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="bg-slate-900/20 border border-slate-900/60 p-6 md:p-8 rounded-2xl backdrop-blur-xs"
            >
              <div className="prose prose-invert max-w-none">
                {renderMarkdown(filteredSystemDocs)}
              </div>
            </motion.div>
          )}

          {/* Tab 2: Gemini Chat History */}
          {activeTab === "chat" && (
            <motion.div
              key="gemini-chat"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="bg-slate-900/20 border border-slate-900/60 p-6 md:p-8 rounded-2xl backdrop-blur-xs"
            >
              <div className="prose prose-invert max-w-none">
                {renderMarkdown(filteredGeminiChat)}
              </div>
            </motion.div>
          )}

          {/* Tab 3: Interactive Cost Calculator */}
          {activeTab === "calculator" && (
            <motion.div
              key="cost-calculator"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {/* Card Introduction */}
              <div className="bg-gradient-to-r from-violet-950/40 via-fuchsia-950/20 to-slate-900/40 border border-slate-800 p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                    <Coins className="h-5 w-5 text-yellow-400" />
                    Simulasi & Pembanding Biaya Infrastruktur Storage
                  </h3>
                  <p className="text-sm text-slate-400">Sesuaikan parameter di bawah untuk melihat perbedaan biaya antara Cloudflare R2 dan Google Cloud Storage.</p>
                </div>
                <div className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs font-semibold text-center md:text-right shrink-0">
                  Cloudflare R2 Egress Rate: Rp 0 / GB (Gratis Selamanya)
                </div>
              </div>

              {/* Grid Inputs & Cost cards */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Left Side: Parameters / Inputs */}
                <div className="lg:col-span-1 bg-slate-900/40 border border-slate-900 p-6 rounded-2xl space-y-6">
                  <h4 className="font-bold text-slate-200 pb-3 border-b border-slate-800 text-sm tracking-wider uppercase">Parameter Proyek</h4>
                  
                  {/* Slider 1: Teams */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400 font-medium">Jumlah Tim Bahasa (Suku)</span>
                      <span className="text-violet-400 font-bold">{teams} Tim</span>
                    </div>
                    <input 
                      type="range" 
                      min="1" 
                      max="50" 
                      value={teams} 
                      onChange={(e) => setTeams(parseInt(e.target.value))}
                      className="w-full accent-violet-500" 
                    />
                  </div>

                  {/* Slider 2: Stories */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400 font-medium">Durasi Proyek (Cerita)</span>
                      <span className="text-violet-400 font-bold">{stories} Cerita (Bulan)</span>
                    </div>
                    <input 
                      type="range" 
                      min="1" 
                      max="50" 
                      value={stories} 
                      onChange={(e) => setStories(parseInt(e.target.value))}
                      className="w-full accent-violet-500" 
                    />
                  </div>

                  {/* Slider 3: Video Size */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400 font-medium">Ukuran Video Panduan</span>
                      <span className="text-violet-400 font-bold">{videoSize} MB / cerita</span>
                    </div>
                    <input 
                      type="range" 
                      min="10" 
                      max="300" 
                      value={videoSize} 
                      onChange={(e) => setVideoSize(parseInt(e.target.value))}
                      className="w-full accent-violet-500" 
                    />
                  </div>

                  {/* Slider 4: Audio Output Size */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400 font-medium">Ukuran Audio mixing final</span>
                      <span className="text-violet-400 font-bold">{audioSize} MB / cerita</span>
                    </div>
                    <input 
                      type="range" 
                      min="10" 
                      max="300" 
                      value={audioSize} 
                      onChange={(e) => setAudioSize(parseInt(e.target.value))}
                      className="w-full accent-violet-500" 
                    />
                  </div>

                  {/* Slider 5: Reviews */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400 font-medium">Jumlah Review per File (Egress)</span>
                      <span className="text-violet-400 font-bold">{reviewCount} Kali streaming</span>
                    </div>
                    <input 
                      type="range" 
                      min="1" 
                      max="10" 
                      value={reviewCount} 
                      onChange={(e) => setReviewCount(parseInt(e.target.value))}
                      className="w-full accent-violet-500" 
                    />
                  </div>

                  <div className="pt-4 border-t border-slate-800 space-y-3">
                    <h5 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Estimasi Data Proyek</h5>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/50">
                        <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Total Storage Akhir</div>
                        <div className="text-lg font-bold text-cyan-300">{calculations.totalStorageEnd} GB</div>
                      </div>
                      <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/50">
                        <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Egress per Bulan</div>
                        <div className="text-lg font-bold text-cyan-300">{calculations.monthlyEgress} GB</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Side: Cloudflare R2 vs GCS Cost Comparison */}
                <div className="lg:col-span-2 space-y-6">
                  
                  {/* Cost comparison cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    {/* Cloudflare R2 Card */}
                    <div className="bg-slate-900/30 border border-violet-500/20 hover:border-violet-500/40 p-6 rounded-2xl relative overflow-hidden group transition-all">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-violet-600/5 rounded-full blur-xl group-hover:bg-violet-600/10 transition-all" />
                      <div className="flex items-center justify-between mb-4">
                        <div className="text-sm font-bold text-violet-400 tracking-wide uppercase">Cloudflare R2</div>
                        <span className="text-[10px] bg-violet-500/10 text-violet-300 px-2 py-0.5 rounded border border-violet-500/20 font-semibold uppercase">Egress Rp 0</span>
                      </div>
                      
                      <div className="space-y-4">
                        <div>
                          <div className="text-xs text-slate-400">Total Akumulasi Biaya Storage (Bulan 1-27)</div>
                          <div className="text-3xl font-extrabold text-white mt-1">{calculations.r2TotalCost}</div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/60 text-xs">
                          <div>
                            <span className="text-slate-400 block">Bulan 1</span>
                            <span className="font-semibold text-slate-200">{calculations.r2CostBulan1}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block">Bulan Terakhir</span>
                            <span className="font-semibold text-slate-200">{calculations.r2CostBulanAkhir} <span className="text-[10px] text-slate-400">(${calculations.r2CostUsd})</span></span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-4 p-3 bg-violet-950/20 border border-violet-800/20 rounded-xl flex items-start gap-2.5 text-xs text-violet-200">
                        <CheckCircle className="h-4 w-4 shrink-0 mt-0.5 text-violet-400" />
                        <span>Hemat operasional di awal dengan kuota gratis 10 GB &amp; egress Rp 0 selamanya.</span>
                      </div>
                    </div>

                    {/* Google Cloud Storage Card */}
                    <div className="bg-slate-900/20 border border-slate-800/80 p-6 rounded-2xl relative overflow-hidden group">
                      <div className="flex items-center justify-between mb-4">
                        <div className="text-sm font-bold text-slate-400 tracking-wide uppercase">Google Cloud Storage</div>
                        <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded border border-slate-700 font-semibold uppercase">Ada Egress Fee</span>
                      </div>
                      
                      <div className="space-y-4">
                        <div>
                          <div className="text-xs text-slate-400">Total Akumulasi Biaya (Storage + Egress)</div>
                          <div className="text-3xl font-extrabold text-slate-300 mt-1">{calculations.gcsTotalCost}</div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/60 text-xs">
                          <div>
                            <span className="text-slate-400 block">Bulan 1</span>
                            <span className="font-semibold text-slate-300">{calculations.gcsCostBulan1}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block">Bulan Terakhir</span>
                            <span className="font-semibold text-slate-300">{calculations.gcsCostBulanAkhir} <span className="text-[10px] text-slate-400">(${calculations.gcsCostUsd})</span></span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-4 p-3 bg-slate-950/40 border border-slate-800 rounded-xl flex items-start gap-2.5 text-xs text-slate-400">
                        <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5 text-amber-500" />
                        <span>Egress fee $0.12/GB memicu biaya membengkak seiring bertambahnya streaming audio.</span>
                      </div>
                    </div>

                  </div>

                  {/* Savings summary card */}
                  <div className="bg-gradient-to-br from-emerald-950/20 to-cyan-950/10 border border-emerald-500/20 p-6 rounded-2xl">
                    <h4 className="text-sm font-bold text-emerald-400 uppercase tracking-wider mb-2">Analisis Potensi Penghematan Dana</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                      <div className="space-y-1">
                        <span className="text-xs text-slate-400">Penghematan di Bulan Terakhir (Bulan ke-{stories}):</span>
                        <div className="text-2xl font-extrabold text-white flex items-center gap-2">
                          {calculations.savingBulanAkhir} <span className="text-xs text-emerald-400 font-medium">/ bulan</span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <span className="text-xs text-slate-400">Total Penghematan Akumulatif Selama {stories} Bulan:</span>
                        <div className="text-2xl font-extrabold text-emerald-400 flex items-center gap-2">
                          {calculations.savingTotal} <span className="text-xs bg-emerald-500/10 text-emerald-300 px-2 py-0.5 rounded font-semibold uppercase">Efisiensi Maksimal</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Additional notes */}
                  <div className="bg-slate-900/10 border border-slate-900 p-4 rounded-xl text-xs text-slate-400 space-y-2">
                    <p className="font-semibold text-slate-300">Catatan Simulasi:</p>
                    <ul className="list-disc pl-4 space-y-1">
                      <li>Konversi Dolar ke Rupiah menggunakan kurs standard Rp 15.500 / USD.</li>
                      <li>Perhitungan Cloudflare R2 memotong kuota gratis penyimpanan 10 GB yang diberikan setiap bulan.</li>
                      <li>Perhitungan GCS tidak menggunakan region gratisan US (Oregon/Iowa) karena regional Asia-Jakarta ($0.02/GB) sangat penting untuk menghindari latensi parah di lapangan, dan egress rate internasional sebesar $0.12 per GB berlaku untuk unduhan.</li>
                    </ul>
                  </div>

                </div>

              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </main>
      
      {/* Footer */}
      <footer className="max-w-6xl mx-auto px-6 py-12 border-t border-slate-900 mt-12 text-center text-xs text-slate-500">
        <p className="mb-2">ARK System Hub &amp; Documentation Portal. Dibangun khusus untuk analisis arsitektur &amp; monitoring operasional.</p>
        <p>Seluruh API Key &amp; Kunci Privat disembunyikan dan dienkripsi di sisi server.</p>
      </footer>
    </div>
  );
}
