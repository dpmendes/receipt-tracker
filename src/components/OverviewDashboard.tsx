import { useMemo, useState } from "react";
import { Receipt } from "../types";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { ShoppingBag, TrendingUp, Calendar, Award, Download, Trash2, Search, AlertTriangle } from "lucide-react";

interface OverviewDashboardProps {
  receipts: Receipt[];
  onDeleteReceipt: (id: string) => void;
  onClearDemoData: () => void;
  onClearAllData: () => void;
}

export default function OverviewDashboard({ 
  receipts,
  onDeleteReceipt,
  onClearDemoData,
  onClearAllData
}: OverviewDashboardProps) {
  const [searchTerm, setSearchTerm] = useState("");

  // 1. Filter receipts that are confirmed
  const confirmedReceipts = useMemo(() => {
    return receipts.filter((r) => r.status === "confirmed");
  }, [receipts]);

  // Current date coordinates (base date: 2026-07-04, which is Saturday of Week 27)
  const currentDate = new Date("2026-07-04");

  // Helper: check if a date string is in the current week (Sunday to Saturday)
  const isCurrentWeek = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return false;
    
    // Difference in time
    const diffTime = currentDate.getTime() - d.getTime();
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    
    // Within last 7 days and same week logic
    return diffDays >= 0 && diffDays <= 7;
  };

  // Helper: check if a date string is in the current month (July 2026)
  const isCurrentMonth = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return false;
    return d.getFullYear() === 2026 && d.getMonth() === 6; // July is index 6
  };

  // 2. Weekly Spendings Calculation
  const weeklySpend = useMemo(() => {
    return confirmedReceipts
      .filter((r) => isCurrentWeek(r.date))
      .reduce((sum, r) => sum + r.totalAmount, 0);
  }, [confirmedReceipts]);

  // 3. Monthly Spendings Calculation
  const monthlySpend = useMemo(() => {
    return confirmedReceipts
      .filter((r) => isCurrentMonth(r.date))
      .reduce((sum, r) => sum + r.totalAmount, 0);
  }, [confirmedReceipts]);

  // 4. Estimate Month Spendings (Monthly projection)
  // Let's estimate month spending based on monthly Spend. Since current date is July 4th (4 days into July),
  // we can project: (monthlySpend / 4) * 31, or if they have more general historical data, average weekly * 4.
  // Let's do a reliable projection: if July spend exists, project based on days elapsed (4 out of 31 days).
  // Otherwise, default to weekly * 4.3.
  const estimatedMonthSpend = useMemo(() => {
    if (monthlySpend > 0) {
      const daysElapsed = 4; // July 1st to July 4th
      return (monthlySpend / daysElapsed) * 31;
    }
    return weeklySpend * 4.33;
  }, [weeklySpend, monthlySpend]);

  // 5. Spendings by Shop
  const shopData = useMemo(() => {
    const shops: Record<string, number> = {};
    confirmedReceipts.forEach((r) => {
      shops[r.shopName] = (shops[r.shopName] || 0) + r.totalAmount;
    });

    return Object.entries(shops).map(([name, value]) => ({
      name,
      value: parseFloat(value.toFixed(2)),
    }));
  }, [confirmedReceipts]);

  // 6. Most expensive items of the week/month
  const expensiveItems = useMemo(() => {
    const itemsList: Array<{ name: string; price: number; shopName: string; date: string }> = [];
    
    confirmedReceipts.forEach((r) => {
      r.items.forEach((item) => {
        itemsList.push({
          name: item.name,
          price: item.price,
          shopName: r.shopName,
          date: r.date,
        });
      });
    });

    // Sort by price descending
    return itemsList.sort((a, b) => b.price - a.price).slice(0, 5);
  }, [confirmedReceipts]);

  // 7. Recharts weekly timeline spend (Grouped by Date)
  const timelineData = useMemo(() => {
    const dates: Record<string, number> = {};
    // Last 14 days
    for (let i = 13; i >= 0; i--) {
      const d = new Date("2026-07-04");
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split("T")[0];
      dates[key] = 0;
    }

    confirmedReceipts.forEach((r) => {
      if (dates[r.date] !== undefined) {
        dates[r.date] += r.totalAmount;
      }
    });

    return Object.entries(dates).map(([dateStr, amount]) => {
      // Format date for chart label (e.g., "04/07")
      const parts = dateStr.split("-");
      const label = `${parts[2]}/${parts[1]}`;
      return {
        date: label,
        Amount: parseFloat(amount.toFixed(2)),
      };
    });
  }, [confirmedReceipts]);

  const COLORS = ["#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

  const handleExportCSV = () => {
    if (receipts.length === 0) {
      alert("Nenhum comprovante disponível para exportar.");
      return;
    }

    // Header columns
    const headers = [
      "ID do Comprovante",
      "Data",
      "Estabelecimento",
      "Item",
      "Quantidade",
      "Preco Unitario (BRL)",
      "Subtotal Item (BRL)",
      "Total do Comprovante (BRL)",
      "Status",
      "Criado Em"
    ];

    const rows: string[][] = [];

    // Process each receipt
    receipts.forEach((receipt) => {
      const createdAtDate = new Date(receipt.createdAt).toLocaleString("pt-BR");
      
      if (receipt.items && receipt.items.length > 0) {
        receipt.items.forEach((item) => {
          const subtotal = item.quantity * item.price;
          rows.push([
            receipt.id,
            receipt.date,
            receipt.shopName,
            item.name,
            item.quantity.toString(),
            item.price.toFixed(2),
            subtotal.toFixed(2),
            receipt.totalAmount.toFixed(2),
            receipt.status,
            createdAtDate
          ]);
        });
      } else {
        rows.push([
          receipt.id,
          receipt.date,
          receipt.shopName,
          "Nenhum item cadastrado",
          "0",
          "0.00",
          "0.00",
          receipt.totalAmount.toFixed(2),
          receipt.status,
          createdAtDate
        ]);
      }
    });

    // Generate CSV Content (Add BOM to ensure correct encoding in Excel)
    const csvContent = "\uFEFF" + [
      headers.join(","),
      ...rows.map(row => row.map(val => `"${val.replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `shopper_receipts_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter list of receipts based on search term
  const filteredReceiptsList = useMemo(() => {
    return receipts.filter((r) =>
      r.shopName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.date.includes(searchTerm)
    );
  }, [receipts, searchTerm]);

  // Check if any demo data exists
  const hasDemoData = useMemo(() => {
    return receipts.some((r) => r.id.startsWith("seed_rcpt_"));
  }, [receipts]);

  return (
    <div className="grid grid-cols-12 gap-5" id="dashboard-container">
      {/* 0. Header Action Bar */}
      <div className="col-span-12 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-sm" id="dashboard-header-bar">
        <div>
          <h2 className="text-base font-black text-slate-900 tracking-tight">Consolidação e Visão Geral</h2>
          <p className="text-xs text-slate-400 mt-0.5">Visão analítica dos seus gastos baseada em comprovantes escaneados localmente.</p>
        </div>
        <button
          onClick={handleExportCSV}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center gap-2 transition-all cursor-pointer shadow-sm shadow-indigo-600/10 shrink-0"
          id="btn-export-csv"
        >
          <Download className="w-4 h-4" />
          Exportar Comprovantes (CSV)
        </button>
      </div>

      {/* 1. Quick Stats Card (Bento Premium highlighted box) */}
      <div className="col-span-12 md:col-span-4 bg-indigo-600 rounded-3xl p-6 text-white flex flex-col justify-between shadow-lg min-h-[300px]" id="card-quick-stats">
        <div>
          <p className="text-indigo-200 text-xs font-semibold uppercase tracking-wider">Gastos da Semana (Current)</p>
          <h3 className="text-4xl font-black mt-1">R$ {weeklySpend.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</h3>
          <p className="text-indigo-100 text-xs mt-1.5 opacity-85">Week of Jul 1st - Jul 4th</p>
        </div>
        
        <div className="my-4 border-t border-indigo-500/50"></div>

        <div className="space-y-4">
          <div>
            <p className="text-indigo-200 text-xs font-semibold uppercase tracking-wider">Gastos do Mês (July)</p>
            <h4 className="text-2xl font-bold mt-0.5">R$ {monthlySpend.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</h4>
          </div>
          <div>
            <p className="text-indigo-200 text-xs font-semibold uppercase tracking-wider">Estimativa Mensal</p>
            <h4 className="text-xl font-semibold mt-0.5 text-indigo-100">R$ {estimatedMonthSpend.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</h4>
          </div>
        </div>
      </div>

      {/* 2. Spendings by Shop Card (Bento white box with Pie Chart) */}
      <div className="col-span-12 md:col-span-4 bg-white rounded-3xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between min-h-[300px]" id="chart-shops-container">
        <div>
          <h3 className="text-sm font-bold text-slate-800">Gasto por Estabelecimento</h3>
          <p className="text-xs text-slate-400 mt-0.5">Distribution of expenditures per shop</p>
        </div>

        <div className="h-44 w-full flex items-center justify-center relative my-2">
          {shopData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={shopData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={65}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {shopData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `R$ ${value}`} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-xs text-slate-400">Sem dados de estabelecimentos</p>
          )}
        </div>

        <div className="space-y-1.5 max-h-[80px] overflow-y-auto">
          {shopData.map((shop, index) => (
            <div key={shop.name} className="flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-1.5 truncate">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <span className="font-semibold text-slate-600 truncate">{shop.name}</span>
              </div>
              <span className="font-bold text-slate-800 shrink-0">R$ {shop.value.toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Top Most Expensive Items Card (Bento dark box) */}
      <div className="col-span-12 md:col-span-4 bg-slate-900 rounded-3xl p-6 text-white shadow-lg flex flex-col justify-between min-h-[300px]" id="expensive-items-list">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-400" />
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Top Itens Caros (Semana/Mês)</h3>
          </div>
          <div className="space-y-3 max-h-[200px] overflow-y-auto pr-1">
            {expensiveItems.length > 0 ? (
              expensiveItems.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center border-b border-slate-800 pb-2 last:border-0 last:pb-0">
                  <div className="truncate pr-2">
                    <p className="text-xs font-bold text-white truncate">{item.name}</p>
                    <p className="text-[10px] text-slate-400 truncate">{item.shopName} • {new Date(item.date).toLocaleDateString("pt-BR")}</p>
                  </div>
                  <span className="text-xs font-black text-rose-400 shrink-0">R$ {item.price.toFixed(2)}</span>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 py-4">Nenhum item encontrado.</p>
            )}
          </div>
        </div>
      </div>

      {/* 4. Timeline Daily Expenditures Card (Bento full-width box) */}
      <div className="col-span-12 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4" id="chart-timeline-container">
        <div>
          <h3 className="font-bold text-slate-800 text-base">Histórico de Gastos Diários (Últimos 14 Dias)</h3>
          <p className="text-xs text-slate-400">Visual trend of purchases in Brazilian Real (BRL)</p>
        </div>
        <div className="h-64 w-full">
          {timelineData.some((d) => d.Amount > 0) ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={timelineData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(value) => [`R$ ${parseFloat(value as string).toFixed(2)}`, "Spent"]}
                  contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0" }}
                />
                <Bar dataKey="Amount" fill="#4f46e5" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 text-sm">
              <p>Nenhum registro nos últimos 14 dias</p>
            </div>
          )}
        </div>
      </div>

      {/* 5. Receipt Management and Local Data Control */}
      <div className="col-span-12 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6" id="receipt-management-container">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-5">
          <div>
            <h3 className="font-black text-slate-900 text-base">Gerenciamento e Histórico de Comprovantes</h3>
            <p className="text-xs text-slate-400 mt-0.5">Visualize todos os comprovantes escaneados localmente, busque por loja ou remova lançamentos incorretos.</p>
          </div>
          
          {/* Search Bar */}
          <div className="relative w-full sm:w-64">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              placeholder="Buscar por estabelecimento..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-700"
            />
          </div>
        </div>

        {/* Table/List Area */}
        {filteredReceiptsList.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Estabelecimento</th>
                  <th className="py-3 px-4">Data da Compra</th>
                  <th className="py-3 px-4">Itens</th>
                  <th className="py-3 px-4 text-right">Valor Total</th>
                  <th className="py-3 px-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-xs">
                {filteredReceiptsList.map((rcpt) => {
                  const isDemo = rcpt.id.startsWith("seed_rcpt_");
                  return (
                    <tr key={rcpt.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div>
                            <p className="font-bold text-slate-800">{rcpt.shopName}</p>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-black uppercase tracking-wide inline-block mt-0.5 ${
                              isDemo ? "bg-amber-50 text-amber-600 border border-amber-200/40" : "bg-emerald-50 text-emerald-600 border border-emerald-200/40"
                            }`}>
                              {isDemo ? "Demonstração" : "Escaneado"}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-500">
                        {new Date(rcpt.date + "T00:00:00").toLocaleDateString("pt-BR")}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-700">{rcpt.items?.length || 0}</span>{" "}
                        <span className="text-slate-400 text-[11px]">
                          ({rcpt.items?.[0]?.name ? `${rcpt.items[0].name.slice(0, 30)}...` : "Sem itens"})
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-black text-slate-900">
                        R$ {rcpt.totalAmount.toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => {
                            if (confirm(`Tem certeza de que deseja remover o comprovante do "${rcpt.shopName}" de R$ ${rcpt.totalAmount.toFixed(2)}?`)) {
                              onDeleteReceipt(rcpt.id);
                            }
                          }}
                          className="p-1.5 text-rose-500 hover:text-white hover:bg-rose-500 rounded-lg transition-all cursor-pointer inline-flex items-center"
                          title="Remover Comprovante"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-8 text-center text-slate-400 text-xs">
            Nenhum comprovante correspondente encontrado.
          </div>
        )}

        {/* Local Storage Sandbox Operations */}
        <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-5 mt-4">
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
              Zona de Administração do Armazenamento Local
            </h4>
            <p className="text-[11px] text-slate-400 leading-relaxed max-w-2xl">
              Todos os seus comprovantes são guardados diretamente no sandbox de armazenamento do seu navegador/celular. 
              Você pode remover a massa de dados demonstrativos iniciais ou apagar todo o seu histórico para reiniciar do zero.
            </p>
          </div>
          
          <div className="flex flex-wrap gap-2 shrink-0">
            {hasDemoData && (
              <button
                onClick={() => {
                  if (confirm("Deseja remover apenas os dados ilustrativos (demonstração)? Seus comprovantes escaneados reais serão preservados.")) {
                    onClearDemoData();
                  }
                }}
                className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-sm"
              >
                Remover Dados de Demonstração
              </button>
            )}
            
            <button
              onClick={() => {
                if (confirm("ATENÇÃO: Isso apagará permanentemente todos os comprovantes escaneados e a lista de compras. Deseja continuar?")) {
                  onClearAllData();
                }
              }}
              className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 font-bold text-xs rounded-xl transition-all cursor-pointer"
            >
              Limpar Todo o Sandbox (Zerar)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
