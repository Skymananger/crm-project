import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const parseCatalogImage = async (base64Image: string): Promise<any[]> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: base64Image.split(',')[1] || base64Image,
            },
          },
          {
            text: "Extract product list from this catalog/price list image. Identify 'name', 'sku', 'category' and 'price'. Return strictly a JSON array of objects.",
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              sku: { type: Type.STRING },
              category: { type: Type.STRING },
              price: { type: Type.NUMBER }
            },
            required: ["name", "price"]
          }
        }
      }
    });

    return JSON.parse(response.text || "[]");
  } catch (error) {
    console.error("Error parsing catalog:", error);
    return [];
  }
};

export const parseProductText = async (rawText: string): Promise<any[]> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Analise o seguinte texto copiado de uma planilha de produtos. 
      Extraia: nome, sku (código), custo (cost) e preço de venda (price). 
      Se o custo não estiver explícito, tente inferir ou deixe 0.
      Retorne um array JSON. Texto: \n${rawText}`,
      config: {
        responseMimeType: "application/json",
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              sku: { type: Type.STRING },
              cost: { type: Type.NUMBER },
              price: { type: Type.NUMBER },
              category: { type: Type.STRING }
            },
            required: ["name", "price", "cost"]
          }
        }
      }
    });
    return JSON.parse(response.text || "[]");
  } catch (error) {
    console.error("Error parsing product text:", error);
    return [];
  }
};

export const generateMarketingImage = async (prompt: string): Promise<string | null> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: `High-end professional product photography for luxury kitchenware: ${prompt}. Minimalist, elegant, high lighting, studio quality.` }]
      },
      config: {
        imageConfig: {
          aspectRatio: "1:1"
        }
      }
    });

    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    }
    return null;
  } catch (error) {
    console.error("Error generating image:", error);
    return null;
  }
};

export const getRouteStrategyStream = async (city: string, teamSize: number, onChunk: (text: string) => void): Promise<void> => {
  try {
    const response = await ai.models.generateContentStream({
      model: 'gemini-3-flash-preview',
      contents: `Suggest a strategic sales prospecting route for a kitchenware distributor in ${city} for a team of ${teamSize} people. Focus on high-income neighborhoods and strategic points. Provide a structured plan in Portuguese. Use markdown for better formatting.`,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }
      }
    });

    let fullText = "";
    for await (const chunk of response) {
      const text = chunk.text;
      if (text) {
        fullText += text;
        onChunk(fullText);
      }
    }
  } catch (error) {
    console.error("Error getting route strategy stream:", error);
    onChunk("Erro ao conectar com o serviço de IA para gerar a rota.");
  }
};

export const getRouteStrategy = async (city: string, teamSize: number): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Suggest a strategic sales prospecting route for a kitchenware distributor in ${city} for a team of ${teamSize} people. Focus on high-income neighborhoods and strategic points. Provide a structured plan in Portuguese.`,
    });
    return response.text || "Não foi possível gerar a estratégia no momento.";
  } catch (error) {
    console.error("Error getting route strategy:", error);
    return "Erro ao conectar com o serviço de IA.";
  }
};