import { useState, useTransition, FormEvent } from "react";
import { ShoppingListItem, Receipt, TripSuggestion, TripOptimizationResponse } from "../types";
import { 
  Sparkles, 
  Plus, 
  Trash2, 
  CheckCircle, 
  Check, 
  MapPin, 
  AlertCircle, 
  ArrowRight,
  Info,
  CalendarDays
} from "lucide-react";
import { db } from "../firebase";
import { collection, doc, addDoc, deleteDoc, setDoc } from "firebase/firestore";

interface TripSuggestionsProps {
  userId: string;
  shoppingList: ShoppingListItem[];
  receipts: Receipt[];
}

export default function TripSuggestions({ userId, shoppingList, receipts }: TripSuggestionsProps) {
  const [newItemName, setNewItemName] = useState("");
  const [suggestions, setSuggestions] = useState<TripOptimizationResponse | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Add Item to Shopping List
  const handleAddItem = async (e: FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;

    try {
      const itemId = "item_" + Date.now().toString();
      await setDoc(doc(db, "shopping_list", itemId), {
        id: itemId,
        userId,
        name: newItemName.trim(),
        status: "pending",
        createdAt: Date.now()
      });
      setNewItemName("");
    } catch (err) {
      console.error("Error adding shopping item:", err);
    }
  };

  // Toggle Shopping Item Status
  const handleToggleItem = async (item: ShoppingListItem) => {
    try {
      await setDoc(doc(db, "shopping_list", item.id), {
        ...item,
        status: item.status === "pending" ? "bought" : "pending"
      });
    } catch (err) {
      console.error("Error toggling shopping item:", err);
    }
  };

  // Delete Shopping Item
  const handleDeleteItem = async (itemId: string) => {
    try {
      await deleteDoc(doc(db, "shopping_list", itemId));
    } catch (err) {
      console.error("Error deleting shopping item:", err);
    }
  };

  // Ask AI for Suggestions
  const handleGetAISuggestions = () => {
    const pendingItems = shoppingList
      .filter((i) => i.status === "pending")
      .map((i) => i.name);

    if (pendingItems.length === 0) {
      setError("Please add some pending items to your shopping list first!");
      return;
    }

    setError(null);
    setSuggestions(null);

    // Prepare purchase history summary for Gemini
    const historySummary = receipts
      .filter((r) => r.status === "confirmed")
      .map((r) => ({
        shopName: r.shopName,
        date: r.date,
        items: r.items.map((it) => ({ name: it.name, price: it.price }))
      }));

    startTransition(async () => {
      try {
        const response = await fetch("/api/suggestions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            shoppingItems: pendingItems,
            history: historySummary
          })
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || "Failed to generate suggestions");
        }

        const optimizationData = await response.json();
        setSuggestions(optimizationData);
      } catch (err: any) {
        console.error("Error getting AI suggestions:", err);
        setError(err.message || "Could not retrieve trip optimization. Try again.");
      }
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start max-w-6xl mx-auto" id="trip-suggestions-root">
      
      {/* LEFT: Current Shopping List */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-6" id="shopping-list-panel">
        <div className="space-y-1">
          <h3 className="font-bold text-slate-900 text-lg">My Active Shopping List</h3>
          <p className="text-xs text-slate-400">Add things you need. AI will map these to the best shops based on your history.</p>
        </div>

        {/* Form to add item */}
        <form onSubmit={handleAddItem} className="flex gap-2" id="add-shopping-item-form">
          <input
            type="text"
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            placeholder="Type item (e.g. Leite, Pão, Carne...)"
            className="flex-1 bg-slate-50 px-4 py-2 text-sm border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-medium"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-bold flex items-center gap-1 cursor-pointer transition-all shadow-sm shrink-0"
          >
            <Plus className="w-4 h-4" /> Add Item
          </button>
        </form>

        {/* Shopping Items List */}
        <div className="space-y-2 overflow-y-auto max-h-[300px]" id="shopping-items-list">
          {shoppingList.length > 0 ? (
            shoppingList.map((item) => (
              <div 
                key={item.id}
                className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                  item.status === "bought" 
                    ? "bg-slate-50 border-slate-100 opacity-60" 
                    : "bg-white border-slate-200 hover:border-slate-300 shadow-sm"
                }`}
              >
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleToggleItem(item)}
                    className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all cursor-pointer ${
                      item.status === "bought" 
                        ? "bg-emerald-500 border-emerald-500 text-white" 
                        : "border-slate-300 hover:border-indigo-500"
                    }`}
                  >
                    {item.status === "bought" && <Check className="w-3.5 h-3.5" />}
                  </button>
                  <span className={`text-sm font-semibold ${item.status === "bought" ? "line-through text-slate-400" : "text-slate-800"}`}>
                    {item.name}
                  </span>
                </div>
                <button
                  onClick={() => handleDeleteItem(item.id)}
                  className="text-slate-300 hover:text-rose-500 p-1 rounded transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          ) : (
            <div className="text-center py-10 text-slate-400 text-sm border border-dashed border-slate-200 rounded-xl">
              <p>Your shopping list is empty.</p>
              <p className="text-xs">Add items to test trip aggregation.</p>
            </div>
          )}
        </div>

        {/* Ask AI Trigger */}
        <div className="pt-4 border-t border-slate-200" id="suggest-ai-box">
          <button
            onClick={handleGetAISuggestions}
            disabled={isPending || shoppingList.filter(i => i.status === "pending").length === 0}
            className={`w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
              isPending 
                ? "bg-indigo-50 text-indigo-400 cursor-not-allowed" 
                : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-600/10"
            }`}
            id="btn-get-ai-suggestions"
          >
            <Sparkles className="w-4 h-4 animate-pulse" />
            {isPending ? "Analyzing & Aggregating..." : "Suggest Trip Optimization"}
          </button>
          
          {error && (
            <div className="mt-3 p-3 bg-rose-50 text-rose-600 rounded-xl text-xs flex items-center gap-2 border border-rose-100">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT: AI Optimization Output */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-6" id="ai-suggestions-panel">
        <div className="space-y-1">
          <h3 className="font-bold text-slate-900 text-lg flex items-center gap-1.5">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            <span>AI Trip Planner & Aggregator</span>
          </h3>
          <p className="text-xs text-slate-400">Optimized stop-by-stop itinerary suggestions using history to combine shopping trips.</p>
        </div>

        {isPending ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-3" id="ai-suggestion-loading">
            <div className="w-8 h-8 border-3 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
            <p className="text-xs font-semibold text-slate-500">Scanning purchase history & grouping items...</p>
          </div>
        ) : suggestions ? (
          <div className="space-y-6" id="ai-suggestion-results">
            {/* Summary text */}
            <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 text-slate-700 text-xs flex gap-3">
              <Info className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
              <p className="leading-relaxed">{suggestions.summary}</p>
            </div>

            {/* Stop timeline */}
            <div className="space-y-4 relative pl-4 before:content-[''] before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {suggestions.trips.map((trip, idx) => (
                <div key={idx} className="relative space-y-2">
                  {/* Pin Circle */}
                  <div className="absolute -left-[29px] top-1.5 w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center border-4 border-white shadow-sm">
                    <MapPin className="w-2.5 h-2.5" />
                  </div>

                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 hover:border-indigo-300 transition-all space-y-3">
                    <div className="flex justify-between items-center">
                      <h4 className="font-bold text-slate-800 text-sm uppercase tracking-tight">{trip.shopName}</h4>
                      <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-bold">Stop #{idx + 1}</span>
                    </div>

                    <p className="text-xs text-slate-500 font-medium italic">"{trip.reason}"</p>

                    <div className="space-y-1 pt-1 border-t border-slate-200">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Buy here:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {trip.items.map((item, i) => (
                          <span key={i} className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700">
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="text-center">
              <button
                onClick={() => setSuggestions(null)}
                className="text-xs text-slate-400 hover:text-slate-600 font-bold flex items-center gap-1 mx-auto cursor-pointer"
              >
                Clear Suggestions
              </button>
            </div>
          </div>
        ) : (
          <div className="py-16 text-center space-y-4 border border-dashed border-slate-200 rounded-3xl" id="suggestions-empty-state">
            <CalendarDays className="w-12 h-12 text-slate-300 mx-auto" />
            <div className="space-y-1">
              <p className="font-semibold text-slate-600 text-sm">No Active Plan Generated</p>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">Click "Suggest Trip Optimization" to let Gemini search history and plan your purchases.</p>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
