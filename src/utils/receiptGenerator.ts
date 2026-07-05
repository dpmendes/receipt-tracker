/**
 * Draws a realistic store receipt on a hidden HTML Canvas and returns its base64 JPEG data URL.
 * This allows real optical recognition testing using Gemini on the backend with dynamic inputs!
 */

export interface ReceiptGeneratorInput {
  shopName: string;
  date: string; // YYYY-MM-DD
  items: Array<{ name: string; quantity: number; unitPrice: number }>;
}

export function generateReceiptImage(input: ReceiptGeneratorInput): string {
  const canvas = document.createElement("canvas");
  canvas.width = 450;
  
  // Calculate height dynamically based on the number of items
  const itemHeight = 35;
  const padding = 120;
  canvas.height = padding * 2 + input.items.length * itemHeight + 160;

  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  // 1. Draw Receipt Paper Background
  ctx.fillStyle = "#fcfbfa";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Add paper texture / subtle vertical shadow lines for 3D receipt effect
  ctx.fillStyle = "#f5f3f0";
  ctx.fillRect(0, 0, 8, canvas.height);
  ctx.fillRect(canvas.width - 8, 0, 8, canvas.height);

  // Subtle crumpled paper lines
  ctx.strokeStyle = "rgba(0,0,0,0.03)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (let i = 40; i < canvas.height; i += 120) {
    ctx.moveTo(0, i);
    ctx.lineTo(canvas.width, i + (Math.random() - 0.5) * 15);
  }
  ctx.stroke();

  // 2. Setup typography styles
  ctx.fillStyle = "#1e1e1e"; // Ink color
  
  // Header: Shop Name (Bold uppercase)
  ctx.font = "bold 24px 'Courier New', Courier, monospace";
  ctx.textAlign = "center";
  ctx.fillText(input.shopName.toUpperCase(), canvas.width / 2, 60);

  // Subheader: Store details
  ctx.font = "14px 'Courier New', Courier, monospace";
  ctx.fillText("AVENIDA PAULISTA, 1000 - SÃO PAULO/SP", canvas.width / 2, 90);
  ctx.fillText("CNPJ: 12.345.678/0001-90", canvas.width / 2, 110);
  ctx.fillText(`DATA: ${input.date}  HORA: 14:32:05`, canvas.width / 2, 130);
  ctx.fillText(`CUPOM FISCAL: ${Math.floor(100000 + Math.random() * 900000)}`, canvas.width / 2, 150);

  // Divider
  ctx.fillText("----------------------------------------------", canvas.width / 2, 175);

  // Table Headers
  ctx.textAlign = "left";
  ctx.font = "bold 13px 'Courier New', Courier, monospace";
  ctx.fillText("ITEM DESCRIÇÃO", 20, 195);
  ctx.textAlign = "right";
  ctx.fillText("QTD x UNIT", 320, 195);
  ctx.fillText("VALOR (R$)", 430, 195);

  ctx.textAlign = "center";
  ctx.font = "13px 'Courier New', Courier, monospace";
  ctx.fillText("----------------------------------------------", canvas.width / 2, 210);

  // 3. Draw items list
  let currentY = 235;
  let computedTotal = 0;

  input.items.forEach((item, index) => {
    const itemTotal = item.quantity * item.unitPrice;
    computedTotal += itemTotal;

    ctx.textAlign = "left";
    ctx.font = "bold 14px 'Courier New', Courier, monospace";
    // Number prefix
    const numPrefix = String(index + 1).padStart(2, "0");
    ctx.fillText(`${numPrefix} ${item.name.toUpperCase()}`, 20, currentY);

    ctx.textAlign = "right";
    ctx.font = "14px 'Courier New', Courier, monospace";
    const qtdUnitStr = `${item.quantity.toFixed(1)} x ${item.unitPrice.toFixed(2)}`;
    ctx.fillText(qtdUnitStr, 320, currentY);

    const totalStr = itemTotal.toFixed(2);
    ctx.fillText(totalStr, 430, currentY);

    currentY += itemHeight;
  });

  // Divider
  ctx.textAlign = "center";
  ctx.fillText("----------------------------------------------", canvas.width / 2, currentY);
  currentY += 25;

  // 4. Draw Total
  ctx.textAlign = "left";
  ctx.font = "bold 18px 'Courier New', Courier, monospace";
  ctx.fillText("VALOR TOTAL R$", 20, currentY);
  
  ctx.textAlign = "right";
  ctx.fillText(computedTotal.toFixed(2), 430, currentY);
  currentY += 35;

  // Divider
  ctx.textAlign = "center";
  ctx.font = "13px 'Courier New', Courier, monospace";
  ctx.fillText("----------------------------------------------", canvas.width / 2, currentY);
  currentY += 25;

  // 5. Draw barcode and footer
  ctx.font = "12px 'Courier New', Courier, monospace";
  ctx.fillText("OBRIGADO POR COMPRAR CONOSCO!", canvas.width / 2, currentY);
  currentY += 25;

  // Draw some barcode vertical stripes
  ctx.fillStyle = "#1e1e1e";
  const barcodeXStart = (canvas.width - 250) / 2;
  for (let i = 0; i < 50; i++) {
    const barWidth = Math.random() > 0.4 ? 4 : 2;
    const spacing = Math.random() > 0.3 ? 3 : 1;
    ctx.fillRect(barcodeXStart + i * 5, currentY, barWidth, 35);
  }
  currentY += 50;

  ctx.fillStyle = "#666666";
  ctx.font = "10px 'Courier New', Courier, monospace";
  ctx.fillText("Tributos Totais Incidentes (Lei 12.741/12) - R$ " + (computedTotal * 0.18).toFixed(2), canvas.width / 2, currentY);

  return canvas.toDataURL("image/jpeg", 0.9);
}

// Representative presets
export const PRESET_RECEIPTS = [
  {
    id: "grocery",
    name: "Pão de Açúcar (Grocery)",
    shopName: "Pão de Açúcar",
    date: "2026-07-01",
    items: [
      { name: "Arroz Integral Camil 1kg", quantity: 2, unitPrice: 7.90 },
      { name: "Leite Integral Ninho 1L", quantity: 4, unitPrice: 5.49 },
      { name: "Café Melitta Vácuo 500g", quantity: 1, unitPrice: 18.90 },
      { name: "Azeite de Oliva Extravirgem Gallo 500ml", quantity: 1, unitPrice: 38.50 },
      { name: "Detergente Ypê Coco 500ml", quantity: 3, unitPrice: 2.30 }
    ]
  },
  {
    id: "bakery",
    name: "Padaria Real (Pastry & Bread)",
    shopName: "Padaria Real",
    date: "2026-07-03",
    items: [
      { name: "Pão Francês kg", quantity: 0.6, unitPrice: 18.50 },
      { name: "Pão de Queijo Mini Porção", quantity: 2, unitPrice: 12.00 },
      { name: "Bolo de Cenoura com Chocolate", quantity: 1, unitPrice: 24.50 },
      { name: "Suco de Laranja Natural 1L", quantity: 1, unitPrice: 14.90 }
    ]
  },
  {
    id: "meat",
    name: "Butcher Shop - Swift (Meat & Poultry)",
    shopName: "Açougue Swift",
    date: "2026-07-04",
    items: [
      { name: "Picanha Nobre Swift kg", quantity: 1.2, unitPrice: 89.90 },
      { name: "Coração de Alcatra Swift kg", quantity: 1.5, unitPrice: 48.00 },
      { name: "Linguiça Toscana Churrasco kg", quantity: 1.0, unitPrice: 22.90 },
      { name: "Carvão Vegetal Sacão 5kg", quantity: 1, unitPrice: 19.90 }
    ]
  }
];
