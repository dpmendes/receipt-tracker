import React, { useState, useRef, useTransition } from "react";
import { generateReceiptImage, PRESET_RECEIPTS } from "../utils/receiptGenerator";
import { Receipt, ReceiptItem } from "../types";
import { 
  Camera, 
  Upload, 
  FileText, 
  Check, 
  Plus, 
  Trash2, 
  RotateCcw, 
  Calendar,
  ChevronRight,
  ArrowRight,
  Sparkles,
  AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface ReceiptScannerProps {
  userId: string;
  onReceiptSaved: (receipt: Receipt) => void;
}

type ScanStep = "idle" | "scanning" | "confirm_shop" | "confirm_items";

export default function ReceiptScanner({ userId, onReceiptSaved }: ReceiptScannerProps) {
  const [step, setStep] = useState<ScanStep>("idle");
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  
  // OCR Extracted data
  const [shopName, setShopName] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("2026-07-04");
  const [items, setItems] = useState<ReceiptItem[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);
  
  // UI states
  const [isPending, startTransition] = useTransition();
  const [ocrError, setOcrError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Custom simulation presets inputs
  const [customShop, setCustomShop] = useState("Mercado Alvorada");
  const [customItems, setCustomItems] = useState([
    { name: "Pão de Forma Integral", quantity: 1, unitPrice: 8.50 },
    { name: "Queijo Prato Fatiado 200g", quantity: 1, unitPrice: 14.90 },
    { name: "Presunto Cozido Seara 200g", quantity: 1, unitPrice: 11.20 }
  ]);

  // Handle Preset Trigger
  const handleScanPreset = async (presetId: string) => {
    setOcrError(null);
    setStep("scanning");

    let preset = PRESET_RECEIPTS.find((p) => p.id === presetId);
    let imageBase64 = "";

    if (preset) {
      imageBase64 = generateReceiptImage({
        shopName: preset.shopName,
        date: preset.date,
        items: preset.items
      });
    } else {
      // Custom generator values
      imageBase64 = generateReceiptImage({
        shopName: customShop,
        date: "2026-07-04",
        items: customItems
      });
    }

    setReceiptImage(imageBase64);
    await processReceiptWithGemini(imageBase64);
  };

  // Convert uploaded/captured file to Base64
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setOcrError(null);
    setStep("scanning");

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      setReceiptImage(base64);
      await processReceiptWithGemini(base64);
    };
    reader.readAsDataURL(file);
  };

  // Call Server-Side Gemini API
  const processReceiptWithGemini = async (base64Data: string) => {
    try {
      // Remove data:image/...;base64, prefix
      const cleanBase64 = base64Data.split(",")[1] || base64Data;

      const response = await fetch("/api/parse-receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: cleanBase64, mimeType: "image/jpeg" }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to scan receipt");
      }

      const parsedReceipt = await response.json();

      startTransition(() => {
        setShopName(parsedReceipt.shopName || "Unknown Shop");
        setPurchaseDate(parsedReceipt.date || "2026-07-04");
        setItems(parsedReceipt.items || []);
        setTotalAmount(parsedReceipt.totalAmount || 0);
        setStep("confirm_shop");
      });
    } catch (err: any) {
      console.error(err);
      setOcrError(err.message || "An error occurred during Gemini analysis. Please try again.");
      setStep("idle");
    }
  };

  // Confirming Shop Name and advancing to item verification
  const handleConfirmShopName = () => {
    setStep("confirm_items");
  };

  // Modify individual receipt line item
  const handleUpdateItem = (index: number, field: keyof ReceiptItem, value: any) => {
    const updated = [...items];
    if (field === "quantity") {
      updated[index].quantity = parseFloat(value) || 0;
    } else if (field === "price") {
      updated[index].price = parseFloat(value) || 0;
    } else {
      updated[index].name = value;
    }
    setItems(updated);
    
    // Recalculate totalAmount from modified items
    const sum = updated.reduce((s, it) => s + (it.price * (it.quantity || 1)), 0);
    setTotalAmount(parseFloat(sum.toFixed(2)));
  };

  // Add Item to Receipt
  const handleAddItem = () => {
    setItems([...items, { name: "New Item", quantity: 1, price: 0.0 }]);
  };

  // Delete Item from Receipt
  const handleRemoveItem = (index: number) => {
    const updated = items.filter((_, i) => i !== index);
    setItems(updated);
    const sum = updated.reduce((s, it) => s + (it.price * (it.quantity || 1)), 0);
    setTotalAmount(parseFloat(sum.toFixed(2)));
  };

  // Save the confirmed receipt record to Firestore
  const handleSaveToDatabase = () => {
    const finalReceipt: Receipt = {
      id: "rcpt_" + Date.now().toString(),
      userId,
      shopName,
      date: purchaseDate,
      totalAmount,
      status: "confirmed",
      createdAt: Date.now(),
      items
    };

    onReceiptSaved(finalReceipt);
    
    // Reset scanner state
    setStep("idle");
    setReceiptImage(null);
  };

  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 flex flex-col md:flex-row gap-8 items-stretch max-w-6xl mx-auto" id="receipt-scanner-root">
      
      {/* LEFT PANEL: Camera / Image Canvas Viewport */}
      <div className="flex-1 flex flex-col justify-between border-b md:border-b-0 md:border-r border-slate-200 pb-6 md:pb-0 md:pr-8">
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-indigo-600 font-semibold" id="receipt-viewport-title">
            <Camera className="w-5 h-5" />
            <span className="text-sm uppercase tracking-wider font-bold">Receipt Camera Viewport</span>
          </div>

          <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl relative overflow-hidden flex items-center justify-center min-h-[360px]" id="viewport-canvas">
            {receiptImage ? (
              <div className="relative w-full h-full p-4 flex justify-center">
                <img 
                  src={receiptImage} 
                  alt="Receipt Preview" 
                  className="max-h-[380px] object-contain rounded-lg shadow-sm"
                  id="preview-img"
                  referrerPolicy="no-referrer"
                />
                
                {/* scanning laser beam */}
                {step === "scanning" && (
                  <motion.div 
                    initial={{ top: "0%" }}
                    animate={{ top: "100%" }}
                    transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                    className="absolute left-0 w-full h-1 bg-emerald-400 opacity-80 shadow-[0_0_8px_#34d399]"
                  />
                )}
              </div>
            ) : (
              <div className="text-center p-8 space-y-4 max-w-sm">
                <div className="w-16 h-16 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center mx-auto shadow-inner">
                  <Upload className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <p className="font-semibold text-slate-700">Scan physical receipt</p>
                  <p className="text-xs text-slate-400">Take a photo, drag and drop, or select one of our premium store presets to simulate OCR parsing.</p>
                </div>
                
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                />

                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-xl inline-flex items-center gap-2 transition-all cursor-pointer shadow-sm"
                  id="btn-upload-camera"
                >
                  <Camera className="w-4 h-4" />
                  Capture / Upload
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Dynamic Preset Simulation Bar */}
        {step === "idle" && (
          <div className="mt-6 space-y-3 pt-6 border-t border-slate-200" id="presets-panel">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-widest flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-indigo-500" /> Choose a Real-time OCR Preset
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {PRESET_RECEIPTS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => handleScanPreset(preset.id)}
                  className="p-3 text-left border border-slate-200 hover:border-indigo-400 rounded-xl bg-white hover:bg-indigo-50/20 transition-all text-xs flex flex-col justify-between cursor-pointer"
                >
                  <span className="font-bold text-slate-700 block truncate">{preset.name}</span>
                  <span className="text-[10px] text-slate-400 block mt-1">
                    {preset.items.length} items • R$ {preset.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0).toFixed(2)}
                  </span>
                </button>
              ))}
            </div>

            {/* Custom simulation creator */}
            <details className="text-xs text-slate-500 cursor-pointer pt-2">
              <summary className="hover:text-indigo-600 font-medium">Create custom mock receipt details to test</summary>
              <div className="mt-3 p-3 bg-slate-50 rounded-xl space-y-3 border border-slate-200 cursor-default">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase">Custom Shop Name</label>
                  <input 
                    type="text" 
                    value={customShop} 
                    onChange={(e) => setCustomShop(e.target.value)}
                    className="w-full mt-1 px-3 py-1.5 border border-slate-200 bg-white rounded-lg text-xs"
                  />
                </div>
                <button
                  onClick={() => handleScanPreset("custom")}
                  className="w-full py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all cursor-pointer"
                >
                  Generate & Scan this custom receipt
                </button>
              </div>
            </details>
          </div>
        )}
      </div>

      {/* RIGHT PANEL: Processing Stages & Confirmations */}
      <div className="flex-1 flex flex-col justify-between" id="scanner-steps-container">
        <AnimatePresence mode="wait">
          
          {/* STEP: Idle / Waiting */}
          {step === "idle" && (
            <motion.div 
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4"
            >
              <FileText className="w-16 h-16 text-slate-300" />
              <div className="space-y-1">
                <h3 className="font-semibold text-slate-700 text-lg">Waiting for scan</h3>
                <p className="text-sm text-slate-400 max-w-xs mx-auto">Upload a photo of your receipt or run a preset to begin the extraction flow.</p>
              </div>
              {ocrError && (
                <div className="p-3 bg-rose-50 text-rose-600 rounded-xl text-xs flex items-center gap-2 max-w-sm border border-rose-100">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{ocrError}</span>
                </div>
              )}
            </motion.div>
          )}

          {/* STEP: Scanning OCR Animation */}
          {step === "scanning" && (
            <motion.div 
              key="scanning"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4"
              id="step-scanning-ocr"
            >
              <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-600 rounded-full animate-spin" />
              <div className="space-y-1">
                <h3 className="font-semibold text-slate-700 text-lg">AI Recognizing Receipt...</h3>
                <p className="text-sm text-slate-400">Gemini is parsing the store name, extracting receipt rows, multiplying quantities, and converting currencies to BRL.</p>
              </div>
            </motion.div>
          )}

          {/* STEP: Shop Confirmation */}
          {step === "confirm_shop" && (
            <motion.div 
              key="confirm_shop"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: -20 }}
              className="space-y-6 p-2"
              id="step-confirm-shop"
            >
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">Step 1 of 2</span>
                <h3 className="font-bold text-slate-900 text-xl">Confirm Establishment</h3>
                <p className="text-xs text-slate-400">Review the shop name recognized from the receipt header.</p>
              </div>

              <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <label className="block text-xs font-bold text-slate-400 uppercase">Shop Name</label>
                <input 
                  type="text" 
                  value={shopName} 
                  onChange={(e) => setShopName(e.target.value)}
                  className="w-full bg-white px-4 py-3 text-lg font-bold text-slate-800 border border-slate-200 rounded-xl shadow-inner focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                  placeholder="Enter Shop Name"
                  id="shop-name-input"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep("idle")}
                  className="px-4 py-2 text-xs font-medium text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center gap-1 transition-all cursor-pointer border border-slate-200/50"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Start Over
                </button>
                <button
                  onClick={handleConfirmShopName}
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                  id="confirm-shop-next-btn"
                >
                  Confirm Shop Name
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP: Confirm items details */}
          {step === "confirm_items" && (
            <motion.div 
              key="confirm_items"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6 flex flex-col justify-between h-full"
              id="step-confirm-items"
            >
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Step 2 of 2</span>
                    <h3 className="font-bold text-slate-900 text-xl">Verify Items Table</h3>
                    <p className="text-xs text-slate-400">Edit values directly if Gemini misread any quantities or prices.</p>
                  </div>
                  
                  {/* Shop & Date Badges */}
                  <div className="text-right space-y-1">
                    <span className="inline-block px-2.5 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-lg truncate max-w-[150px]">
                      {shopName}
                    </span>
                    <div className="flex items-center gap-1 justify-end text-slate-500 text-xs font-medium mt-1">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      <input 
                        type="date" 
                        value={purchaseDate} 
                        onChange={(e) => setPurchaseDate(e.target.value)}
                        className="border-0 bg-transparent p-0 text-slate-600 focus:ring-0 font-medium text-xs w-24 cursor-pointer outline-none"
                        id="purchase-date-input"
                      />
                    </div>
                  </div>
                </div>

                {/* Items Table container */}
                <div className="max-h-[250px] overflow-y-auto border border-slate-200 rounded-2xl" id="table-confirm-items">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/50 text-slate-400 font-bold border-b border-slate-200">
                        <th className="py-2.5 px-3">Description</th>
                        <th className="py-2.5 px-3 w-16 text-center">Qty</th>
                        <th className="py-2.5 px-3 w-20 text-right">Price (BRL)</th>
                        <th className="py-2.5 px-3 w-10 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/30 transition-all">
                          <td className="p-2">
                            <input 
                              type="text" 
                              value={item.name}
                              onChange={(e) => handleUpdateItem(idx, "name", e.target.value)}
                              className="w-full bg-transparent border-0 focus:ring-1 focus:ring-indigo-500 rounded px-1.5 py-1 font-semibold text-slate-800 outline-none"
                            />
                          </td>
                          <td className="p-2 text-center">
                            <input 
                              type="number" 
                              step="any"
                              value={item.quantity}
                              onChange={(e) => handleUpdateItem(idx, "quantity", e.target.value)}
                              className="w-full bg-transparent border-0 focus:ring-1 focus:ring-indigo-500 rounded text-center py-1 font-medium text-slate-700 outline-none"
                            />
                          </td>
                          <td className="p-2 text-right">
                            <input 
                              type="number" 
                              step="0.01"
                              value={item.price}
                              onChange={(e) => handleUpdateItem(idx, "price", e.target.value)}
                              className="w-full bg-transparent border-0 focus:ring-1 focus:ring-indigo-500 rounded text-right py-1 font-bold text-rose-600 outline-none"
                            />
                          </td>
                          <td className="p-2 text-center">
                            <button
                              onClick={() => handleRemoveItem(idx)}
                              className="text-slate-300 hover:text-rose-500 p-1 rounded transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <button
                    onClick={handleAddItem}
                    className="px-3 py-1.5 bg-white border border-slate-200 hover:border-indigo-400 text-indigo-600 rounded-lg flex items-center gap-1 font-medium text-xs transition-all cursor-pointer shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Row
                  </button>
                  <div className="text-right text-xs">
                    <span className="text-slate-400 font-bold mr-1">Total:</span>
                    <span className="font-black text-slate-800 text-sm">R$ {totalAmount.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-200">
                <button
                  onClick={() => setStep("confirm_shop")}
                  className="px-3.5 py-2.5 text-xs font-semibold text-slate-500 bg-slate-50 hover:bg-slate-100 rounded-xl flex items-center gap-1 transition-all cursor-pointer border border-slate-200"
                >
                  Back
                </button>
                <button
                  onClick={handleSaveToDatabase}
                  className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                  id="confirm-items-save-btn"
                >
                  <Check className="w-4 h-4" /> Save Purchase Record
                </button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

    </div>
  );
}
