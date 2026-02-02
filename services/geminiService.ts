
import { GoogleGenAI } from "@google/genai";
import { StoryGoal, Atmosphere } from '../types';

export const generateStoryBackgrounds = async (
  theme: string,
  goal: StoryGoal,
  atmosphere: Atmosphere,
  brandColor: string
): Promise<string[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

  // Prompt engineering for negative space (文字を載せるスペースの確保)
  const prompt = `Create a high-quality vertical background image for Instagram Stories (9:16 aspect ratio).
    Theme: ${theme}.
    Atmosphere: ${atmosphere}.
    Goal: ${goal}.
    Brand Base Color: ${brandColor}.
    
    CRITICAL REQUIREMENT: This is a background for text. 
    1. Leave the center 60% of the image mostly empty or with very low contrast/minimal detail (NEGATIVE SPACE).
    2. Place decorative elements, textures, or focused imagery ONLY at the very top 15% and bottom 20% of the frame.
    3. Ensure there is absolutely NO busy texture in the middle where white or black text will be placed.
    4. Keep the colors consistent with the theme.
    5. Avoid any text or human faces in the center.
    6. High resolution, aesthetic, professional photography style.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        imageConfig: {
          aspectRatio: "9:16"
        }
      }
    });

    const imageUrls: string[] = [];
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        imageUrls.push(`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`);
      }
    }
    
    // Fallback if no image returned (for mockup stability)
    if (imageUrls.length === 0) {
      return [`https://picsum.photos/seed/${Math.random()}/1080/1920`];
    }

    return imageUrls;
  } catch (error) {
    console.error("Image generation failed:", error);
    return [`https://picsum.photos/seed/${Math.random()}/1080/1920`];
  }
};
