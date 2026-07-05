export interface ReceiptItem {
  name: string;
  quantity: number;
  price: number; // in BRL
}

export interface Receipt {
  id: string;
  userId: string;
  shopName: string;
  date: string; // YYYY-MM-DD
  totalAmount: number; // in BRL
  status: "pending" | "confirmed";
  createdAt: number;
  items: ReceiptItem[];
}

export interface ShoppingListItem {
  id: string;
  userId: string;
  name: string;
  status: "pending" | "bought";
  createdAt: number;
}

export interface TripSuggestion {
  shopName: string;
  items: string[];
  reason: string;
}

export interface TripOptimizationResponse {
  trips: TripSuggestion[];
  summary: string;
}
