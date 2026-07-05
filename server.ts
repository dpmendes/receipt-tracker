import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Increase body limit for image uploads
app.use(express.json({ limit: "10mb" }));

// Initialize Gemini Client
const ai = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    })
  : null;

// API: Parse receipt image
app.post("/api/parse-receipt", async (req, res) => {
  try {
    const { imageBase64, mimeType = "image/jpeg" } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: "Missing receipt image base64 data" });
    }

    if (!ai) {
      return res.status(500).json({
        error: "Gemini API key is not configured. Please add GEMINI_API_KEY to your Secrets.",
      });
    }

    const imagePart = {
      inlineData: {
        mimeType,
        data: imageBase64,
      },
    };

    const promptText = `
      Analyze this receipt image. It is likely a grocery, bakery, pastry, or meat store receipt from Brazil (prices in BRL, R$).
      Identify and extract:
      1. Shop name: The brand or name of the establishment.
      2. Purchase date: format as 'YYYY-MM-DD'. If not found, guess based on context or default to the current date: 2026-07-04.
      3. Items bought: For each item, extract the name, the quantity (integer or float, default to 1 if not specified), and the price paid for that item/line in BRL (e.g. if 3 units cost R$ 15 total, the line price is 15.00). Keep names clean and clear.
      4. Total amount: The overall sum paid in BRL.

      Ensure prices are returned as decimal numbers.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: { parts: [imagePart, { text: promptText }] },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            shopName: {
              type: Type.STRING,
              description: "The name of the shop / store, e.g. 'Pão de Açúcar'",
            },
            date: {
              type: Type.STRING,
              description: "The purchase date in format YYYY-MM-DD",
            },
            totalAmount: {
              type: Type.NUMBER,
              description: "The total amount paid in BRL",
            },
            items: {
              type: Type.ARRAY,
              description: "The list of items purchased",
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING, description: "Name of the item" },
                  quantity: { type: Type.NUMBER, description: "Quantity of the item" },
                  price: { type: Type.NUMBER, description: "Price paid for this line item in BRL" },
                },
                required: ["name", "quantity", "price"],
              },
            },
          },
          required: ["shopName", "date", "totalAmount", "items"],
        },
      },
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("No response text received from Gemini model.");
    }

    const receiptData = JSON.parse(resultText);
    res.json(receiptData);
  } catch (error: any) {
    console.error("Error parsing receipt:", error);
    res.status(500).json({ error: error.message || "Failed to analyze receipt" });
  }
});

// API: Trip Optimization and Shopping List Suggestions
app.post("/api/suggestions", async (req, res) => {
  try {
    const { shoppingItems, history } = req.body;

    if (!shoppingItems || !Array.isArray(shoppingItems) || shoppingItems.length === 0) {
      return res.status(400).json({ error: "Missing shopping items list" });
    }

    if (!ai) {
      return res.status(500).json({
        error: "Gemini API key is not configured. Please add GEMINI_API_KEY to your Secrets.",
      });
    }

    const promptText = `
      You are an expert shopping planner and trip optimizer. 
      The user needs to buy these items:
      ${JSON.stringify(shoppingItems)}

      Here is their historical purchase log (what they bought, from which shops, and at what prices):
      ${JSON.stringify(history)}

      Task:
      Suggest how they can aggregate these items to MINIMIZE the number of times they have to visit different shops.
      For instance, if they need 'milk' and 'meat', and they usually buy 'milk' at Bakery and Grocery, and 'meat' at Butcher and Grocery, they can buy BOTH at Grocery to complete the trip in a single visit!
      Also factor in past prices if available to suggest where it's cheaper.

      Respond strictly in JSON matching the schema below. Keep the explanation brief, friendly, in English or Portuguese (use English for general structure but feel free to refer to the products directly).
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: promptText,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            trips: {
              type: Type.ARRAY,
              description: "Optimized list of shops to visit",
              items: {
                type: Type.OBJECT,
                properties: {
                  shopName: { type: Type.STRING, description: "Name of the shop to visit" },
                  items: { 
                    type: Type.ARRAY, 
                    items: { type: Type.STRING },
                    description: "Items to buy at this shop" 
                  },
                  reason: { type: Type.STRING, description: "Explanation of why this shop is selected for these items" }
                },
                required: ["shopName", "items", "reason"]
              }
            },
            summary: {
              type: Type.STRING,
              description: "A summary explanation of the optimization plan and how many trips were saved."
            }
          },
          required: ["trips", "summary"]
        }
      }
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("No response from Gemini");
    }

    res.json(JSON.parse(resultText));
  } catch (error: any) {
    console.error("Error optimizing shopping trips:", error);
    res.status(500).json({ error: error.message || "Failed to optimize trips" });
  }
});

// Setup dev/prod servers
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
