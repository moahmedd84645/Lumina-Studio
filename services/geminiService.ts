import { GoogleGenAI } from "@google/genai";
import { Language } from "../types";

// Helper to remove the "data:image/png;base64," prefix
const cleanBase64 = (base64Str: string) => {
  return base64Str.split(',')[1] || base64Str;
};

const getMimeType = (base64Str: string) => {
  const match = base64Str.match(/^data:(.+);base64,/);
  return match ? match[1] : 'image/png';
};

export const identifyImageContent = async (base64Image: string, lang: Language): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const model = 'gemini-2.5-flash';

    const prompt = lang === 'ar' 
      ? 'حدد المنتج أو الكائن الرئيسي في هذه الصورة. قدم وصفًا موجزًا ​​وغنيًا بالمعلومات باللغة العربية.'
      : 'Identify the main product or object in this image. Provide a concise, informative description.';

    const response = await ai.models.generateContent({
      model,
      contents: {
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: getMimeType(base64Image),
              data: cleanBase64(base64Image)
            }
          }
        ]
      }
    });

    return response.text || (lang === 'ar' ? 'لم يتم العثور على وصف.' : 'No description found.');
  } catch (error) {
    console.error("Identify Error:", error);
    throw error;
  }
};

export const editImageWithAI = async (base64Image: string, instruction: string): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    // Using gemini-2.5-flash-image for image-to-image/editing tasks
    const model = 'gemini-2.5-flash-image';

    // Enhance prompt intelligence
    const smartPrompt = `
      You are an expert AI photo editor in Firsial Studio.
      The user has provided the following instruction: "${instruction}".
      
      Guidelines:
      1. If the instruction is vague (e.g., "make it better", "cool effect"), creatively improve the image aesthetics (lighting, contrast, sharpness) or apply a cinematic style.
      2. If the instruction is specific (e.g., "remove the cat"), follow it precisely.
      3. Maintain high visual quality and resolution.
      4. Ensure the output is natural and seamless.
    `;

    const response = await ai.models.generateContent({
      model,
      contents: {
        parts: [
          { text: smartPrompt },
          {
            inlineData: {
              mimeType: getMimeType(base64Image),
              data: cleanBase64(base64Image)
            }
          }
        ]
      }
    });

    // Extract image from response with robust safety checks for TypeScript
    const candidates = response.candidates;
    if (candidates && candidates.length > 0) {
      const firstCandidate = candidates[0];
      const content = firstCandidate.content;
      const parts = content?.parts;
      
      if (parts) {
        for (const part of parts) {
          if (part.inlineData) {
            return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
          }
        }
      }
    }
    
    throw new Error("No image generated.");
  } catch (error) {
    console.error("AI Edit Error:", error);
    throw error;
  }
};