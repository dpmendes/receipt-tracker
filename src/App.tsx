import { useState, useEffect } from "react";
import { Receipt, ShoppingListItem } from "./types";
import OverviewDashboard from "./components/OverviewDashboard";
import ReceiptScanner from "./components/ReceiptScanner";
import TripSuggestions from "./components/TripSuggestions";
import { 
  ScanLine, 
  Sparkles, 
  LayoutDashboard, 
  User as UserIcon, 
  TrendingUp, 
  AlertCircle,
  HelpCircle,
  Clock
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface LocalUser {
  uid: string;
  email: string;
  isAnonymous: boolean;
}

export default function App() {
  const [user, setUser] = useState<LocalUser | null>(null);
  const [activeTab, setActiveTab] = useState<"dashboard" | "scanner" | "trips">("dashboard");
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [shoppingList, setShoppingList] = useState<ShoppingListItem[]>([]);
  const [isInitializing, setIsInitializing] = useState(true);

  // 1. Authenticate and verify connection locally
  useEffect(() => {
    setUser({
      uid: "shopper_guest_user_brl",
      email: "guest@shopper-receipts.io",
      isAnonymous: true
    });
  }, []);

  // 2. Fetch and seed data once user is authenticated entirely using standard browser localStorage
  useEffect(() => {
    if (!user) return;

    // Load user-specific local storage items
    const localReceipts = localStorage.getItem(`shopper_receipts_${user.uid}`);
    const localShopping = localStorage.getItem(`shopper_shopping_list_${user.uid}`);

    let loadedReceipts: Receipt[] = localReceipts ? JSON.parse(localReceipts) : [];
    let loadedShopping: ShoppingListItem[] = localShopping ? JSON.parse(localShopping) : [];

    // Auto-seed initially so analytics dashboard looks stunning on first load
    if (loadedReceipts.length === 0) {
      loadedReceipts = [
        {
          id: "seed_rcpt_1",
          userId: user.uid,
          shopName: "Pão de Açúcar",
          date: "2026-07-01",
          totalAmount: 115.10,
          status: "confirmed",
          createdAt: Date.now() - 3 * 24 * 60 * 60 * 1000,
          items: [
            { name: "Arroz Integral Camil 1kg", quantity: 2, price: 7.90 },
            { name: "Leite Integral Ninho 1L", quantity: 4, price: 5.49 },
            { name: "Azeite de Oliva Extravirgem Gallo 500ml", quantity: 1, price: 38.50 },
            { name: "Café Melitta Vácuo 500g", quantity: 1, price: 18.90 },
            { name: "Detergente Ypê Coco 500ml", quantity: 3, price: 2.30 }
          ]
        },
        {
          id: "seed_rcpt_2",
          userId: user.uid,
          shopName: "Padaria Real",
          date: "2026-07-03",
          totalAmount: 51.40,
          status: "confirmed",
          createdAt: Date.now() - 1 * 24 * 60 * 60 * 1000,
          items: [
            { name: "Pão Francês kg", quantity: 0.6, price: 18.50 },
            { name: "Pão de Queijo Mini Porção", quantity: 2, price: 12.00 },
            { name: "Suco de Laranja Natural 1L", quantity: 1, price: 14.90 }
          ]
        },
        {
          id: "seed_rcpt_3",
          userId: user.uid,
          shopName: "Açougue Swift",
          date: "2026-07-04",
          totalAmount: 180.70,
          status: "confirmed",
          createdAt: Date.now(),
          items: [
            { name: "Picanha Nobre Swift kg", quantity: 1.2, price: 89.90 },
            { name: "Coração de Alcatra Swift kg", quantity: 1.5, price: 48.00 }
          ]
        }
      ];
      localStorage.setItem(`shopper_receipts_${user.uid}`, JSON.stringify(loadedReceipts));
    }

    if (loadedShopping.length === 0) {
      loadedShopping = [
        {
          id: "seed_item_1",
          userId: user.uid,
          name: "Carvão Vegetal Sacão 5kg",
          status: "pending",
          createdAt: Date.now() - 12 * 60 * 60 * 1000
        },
        {
          id: "seed_item_2",
          userId: user.uid,
          name: "Bolo de Cenoura com Chocolate",
          status: "pending",
          createdAt: Date.now() - 10 * 60 * 60 * 1000
        }
      ];
      localStorage.setItem(`shopper_shopping_list_${user.uid}`, JSON.stringify(loadedShopping));
    }

    setReceipts(loadedReceipts);
    setShoppingList(loadedShopping);
    setIsInitializing(false);
  }, [user]);

  // Callback when a scanned receipt is verified and saved
  const handleReceiptSaved = (receipt: Receipt) => {
    if (!user) return;
    const updatedReceipts = [receipt, ...receipts];
    setReceipts(updatedReceipts);
    localStorage.setItem(`shopper_receipts_${user.uid}`, JSON.stringify(updatedReceipts));
  };

  // Add Shopping List Item
  const handleAddShoppingItem = (name: string) => {
    if (!user) return;
    const newItem: ShoppingListItem = {
      id: "item_" + Date.now().toString(),
      userId: user.uid,
      name: name.trim(),
      status: "pending",
      createdAt: Date.now()
    };
    const updated = [newItem, ...shoppingList];
    setShoppingList(updated);
    localStorage.setItem(`shopper_shopping_list_${user.uid}`, JSON.stringify(updated));
  };

  // Toggle Shopping List Item status
  const handleToggleShoppingItem = (itemId: string) => {
    if (!user) return;
    const updated = shoppingList.map(item => {
      if (item.id === itemId) {
        return {
          ...item,
          status: item.status === "pending" ? "bought" : "pending" as const
        };
      }
      return item;
    });
    setShoppingList(updated);
    localStorage.setItem(`shopper_shopping_list_${user.uid}`, JSON.stringify(updated));
  };

  // Delete Shopping List Item
  const handleDeleteShoppingItem = (itemId: string) => {
    if (!user) return;
    const updated = shoppingList.filter(item => item.id !== itemId);
    setShoppingList(updated);
    localStorage.setItem(`shopper_shopping_list_${user.uid}`, JSON.stringify(updated));
  };

  // Delete specific receipt
  const handleDeleteReceipt = (receiptId: string) => {
    if (!user) return;
    const updated = receipts.filter(r => r.id !== receiptId);
    setReceipts(updated);
    localStorage.setItem(`shopper_receipts_${user.uid}`, JSON.stringify(updated));
  };

  // Clear demo/mock data
  const handleClearDemoData = () => {
    if (!user) return;
    const updatedReceipts = receipts.filter(r => !r.id.startsWith("seed_rcpt_"));
    const updatedShopping = shoppingList.filter(item => !item.id.startsWith("seed_item_"));
    setReceipts(updatedReceipts);
    setShoppingList(updatedShopping);
    localStorage.setItem(`shopper_receipts_${user.uid}`, JSON.stringify(updatedReceipts));
    localStorage.setItem(`shopper_shopping_list_${user.uid}`, JSON.stringify(updatedShopping));
  };

  // Clear all data (empty slate)
  const handleClearAllData = () => {
    if (!user) return;
    setReceipts([]);
    setShoppingList([]);
    localStorage.setItem(`shopper_receipts_${user.uid}`, JSON.stringify([]));
    localStorage.setItem(`shopper_shopping_list_${user.uid}`, JSON.stringify([]));
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin" />
        <p className="text-sm font-semibold text-slate-500">Initializing secure local phone sandbox...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col antialiased">
      
      {/* 1. Header with branding & metadata info */}
      <header className="bg-white border-b border-slate-100 py-4 px-6 shrink-0 shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          
          {/* Logo & Meta */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-sm font-bold text-lg">
              <ScanLine className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-extrabold text-slate-900 tracking-tight text-base sm:text-lg">Shopper Receipts</h1>
              <p className="text-xs text-slate-400 font-semibold flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-300" />
                July 4, 2026 • Currencies in BRL (R$)
              </p>
            </div>
          </div>

          {/* Tab Selection Navigation */}
          <nav className="flex bg-slate-100 p-1.5 rounded-xl border border-slate-200/50" id="main-navigation">
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === "dashboard"
                  ? "bg-white text-indigo-600 shadow-sm border border-slate-200/40"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              Analytics Dashboard
            </button>
            <button
              onClick={() => setActiveTab("scanner")}
              className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === "scanner"
                  ? "bg-white text-indigo-600 shadow-sm border border-slate-200/40"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <ScanLine className="w-4 h-4" />
              OCR Scanner
            </button>
            <button
              onClick={() => setActiveTab("trips")}
              className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === "trips"
                  ? "bg-white text-indigo-600 shadow-sm border border-slate-200/40"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Sparkles className="w-4 h-4" />
              Trip Aggregator
            </button>
          </nav>

          {/* User Auth Info */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <div className="p-2 bg-slate-50 border border-slate-200/60 rounded-xl flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center text-xs font-bold">
                <UserIcon className="w-3.5 h-3.5" />
              </div>
              <span className="text-[11px] font-bold text-slate-600 truncate max-w-[120px]">
                {user?.isAnonymous ? "Anonymous User" : user?.email}
              </span>
            </div>
          </div>

        </div>
      </header>

      {/* 2. Main content block with view switcher */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6">
        <AnimatePresence mode="wait">
          
          {/* VIEW: Analytics Dashboard */}
          {activeTab === "dashboard" && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
              <OverviewDashboard 
                receipts={receipts} 
                onDeleteReceipt={handleDeleteReceipt}
                onClearDemoData={handleClearDemoData}
                onClearAllData={handleClearAllData}
              />
            </motion.div>
          )}

          {/* VIEW: Receipt Scanner */}
          {activeTab === "scanner" && (
            <motion.div
              key="scanner"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
              <div className="text-center space-y-1 py-4">
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Receipt OCR Scanning Engine</h2>
                <p className="text-slate-500 text-sm max-w-lg mx-auto">
                  Take a snapshot of your receipt or select a store preset to trigger our advanced server-side Gemini OCR engine.
                </p>
              </div>
              <ReceiptScanner userId={user?.uid || ""} onReceiptSaved={handleReceiptSaved} />
            </motion.div>
          )}

          {/* VIEW: Shopping List & Trip Aggregator suggestions */}
          {activeTab === "trips" && (
            <motion.div
              key="trips"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
              <div className="text-center space-y-1 py-4">
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">AI Trip Planner & Aggregator</h2>
                <p className="text-slate-500 text-sm max-w-lg mx-auto">
                  Consolidate your shopping list items into fewer physical trips using historical purchases and store catalog analysis.
                </p>
              </div>
              <TripSuggestions 
                userId={user?.uid || ""} 
                shoppingList={shoppingList} 
                receipts={receipts} 
                onAddItem={handleAddShoppingItem}
                onToggleItem={handleToggleShoppingItem}
                onDeleteItem={handleDeleteShoppingItem}
              />
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* 3. Footer */}
      <footer className="bg-white border-t border-slate-100 py-4 px-6 text-center text-xs text-slate-400 shrink-0 font-medium">
        <p>© 2026 Shopper Receipts. Designed in Bento Grid aesthetics with secure local browser persistence.</p>
      </footer>

    </div>
  );
}
