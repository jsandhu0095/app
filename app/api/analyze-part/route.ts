import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

// 🚨 WARNING: HARDCODED API KEY 🚨
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
export async function POST(req: Request) {
  try {
    const { imageUrl } = await req.json();

    if (!imageUrl) {
      return NextResponse.json({ error: "No image URL provided" }, { status: 400 });
    }

    // 1. Fetch the raw image file from Supabase so Gemini can actually "see" it
    const imageResponse = await fetch(imageUrl);
    const arrayBuffer = await imageResponse.arrayBuffer();
    const base64Image = Buffer.from(arrayBuffer).toString('base64');
    const mimeType = imageResponse.headers.get('content-type') || 'image/jpeg';

    // 2. The Prompt
    const prompt = `You are an expert auto parts appraiser. Look at this car part. Return a JSON object with exactly three keys: 'title' (a short, accurate eBay title), 'condition' (a brief assessment of visual condition), and 'description' (a professional 3-sentence marketplace description for selling this used part).`;

    // 3. Ask Gemini
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            { inlineData: { data: base64Image, mimeType: mimeType } }
          ]
        }
      ],
      config: {
        // Force Gemini to always reply in perfect JSON format
        responseMimeType: "application/json",
      }
    });

    // 4. Send the result back to your frontend
    // ✨ THE FIX: Removed the () from response.text ✨
    const aiData = JSON.parse(response.text || '{}');
    return NextResponse.json(aiData);

  } catch (error: any) {
    console.error("Gemini Error:", error);
    return NextResponse.json({ error: "Failed to analyze image" }, { status: 500 });
  }
}