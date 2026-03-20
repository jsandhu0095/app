import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: Request) {
  try {
    const { imageUrl } = await req.json();

    const imageResp = await fetch(imageUrl);
    const arrayBuffer = await imageResp.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // ✨ NEW: Forcing the AI into strict JSON Mode so it NEVER forgets a key
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      generationConfig: { responseMimeType: "application/json" } 
    });

    // ✨ We give it a literal template to fill out
    const prompt = `You are an expert auto parts appraiser. Look at this car part.
    You must respond with a valid JSON object exactly matching this structure:
    {
      "title": "A short, catchy title for a marketplace listing",
      "ebay_search_term": "A highly optimized 3-to-4 word search string for eBay (e.g., Porsche Brake Caliper)",
      "condition": "A brief assessment of the visible condition",
      "description": "A professional, persuasive marketplace listing description",
      "estimated_price": 150
    }
    Remember: estimated_price must be a raw number.`;

    const imageParts = [
      {
        inlineData: {
          data: buffer.toString("base64"),
          mimeType: imageResp.headers.get("content-type") || "image/jpeg",
        },
      },
    ];

    const result = await model.generateContent([prompt, ...imageParts]);
    const responseText = result.response.text();
    
    // Because we used strict JSON mode, we don't need messy regex cleanup anymore!
    const aiData = JSON.parse(responseText);
    
    // Log what the AI actually built so we can see it in the VS Code terminal
    console.log("🧠 AI Raw Output:", aiData); 

    return NextResponse.json(aiData);
  } catch (error: any) {
    console.error("❌ AI Route Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}