import { GoogleGenAI, Type } from "@google/genai";
import { Ingredient } from "../types";
import { v4 as uuidv4 } from 'uuid';

const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key not found");
  return new GoogleGenAI({ apiKey });
};

export const parseRecipeText = async (text: string): Promise<Partial<Ingredient>[]> => {
  try {
    const ai = getAiClient();
    
    // We ask Gemini to parse the unstructured text into our Ingredient schema
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Extract the ingredients from the following recipe text. 
      For each ingredient, try to identify:
      1. Name
      2. Category: 'dry', 'wet', or 'additive'. 
         - 'dry': Flour, sugar, salt, baking powder, spices.
         - 'wet': Eggs, milk, water, oil, butter, extracts.
         - 'additive': Optional mix-ins or variants like chocolate chips, nuts, dried fruit, oreos, sprinkles, frosting toppings.
      3. Quantity used in the recipe (as a string, keep fractions like "1/2")
      4. Unit used in the recipe (convert to one of: g, kg, oz, lb, ml, l, cup, tbsp, tsp, pcs)
      
      Also, if you can estimate a standard purchase unit and quantity for this item from a grocery store, include that (e.g., usually bought in 1kg bags or 5lb bags). 
      If purchase price is unknown, leave it 0.

      Recipe Text: "${text}"`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              category: { type: Type.STRING, enum: ['dry', 'wet', 'additive'] },
              recipeQuantity: { type: Type.STRING }, // return string to keep "1/4"
              recipeUnit: { type: Type.STRING }, 
              purchaseQuantity: { type: Type.STRING }, // return string
              purchaseUnit: { type: Type.STRING },
            },
            required: ["name", "category", "recipeQuantity", "recipeUnit"]
          }
        }
      }
    });

    const rawData = JSON.parse(response.text || "[]");

    // Map to our strict types
    return rawData.map((item: any) => ({
      id: uuidv4(),
      name: item.name,
      category: validateCategory(item.category),
      recipeQuantity: item.recipeQuantity?.toString() || "0",
      recipeUnit: normalizeUnit(item.recipeUnit),
      purchaseQuantity: item.purchaseQuantity?.toString() || "1", 
      purchaseUnit: normalizeUnit(item.purchaseUnit || item.recipeUnit), 
      purchasePrice: 0 
    }));

  } catch (error) {
    console.error("Failed to parse recipe with Gemini:", error);
    throw error;
  }
};

const validateCategory = (cat: string): 'dry' | 'wet' | 'additive' => {
  if (cat === 'wet') return 'wet';
  if (cat === 'additive') return 'additive';
  return 'dry';
};

const normalizeUnit = (u: string): string => {
  const lower = u?.toLowerCase().trim() || 'pcs';
  if (['g', 'gram', 'grams'].includes(lower)) return 'g';
  if (['kg', 'kilogram', 'kilo'].includes(lower)) return 'kg';
  if (['oz', 'ounce', 'ounces'].includes(lower)) return 'oz';
  if (['lb', 'lbs', 'pound', 'pounds'].includes(lower)) return 'lb';
  if (['ml', 'milliliter'].includes(lower)) return 'ml';
  if (['l', 'liter', 'liters'].includes(lower)) return 'l';
  if (['cup', 'cups'].includes(lower)) return 'cup';
  if (['tbsp', 'tablespoon', 'tablespoons'].includes(lower)) return 'tbsp';
  if (['tsp', 'teaspoon', 'teaspoons'].includes(lower)) return 'tsp';
  return 'pcs';
};