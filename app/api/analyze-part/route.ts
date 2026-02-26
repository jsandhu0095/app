import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Make sure you have your GEMINI_API_KEY in your .env.local file!
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: Request) {
  try {
    const { imageUrl } = await req.json();

    // Fetch the image from Supabase so Gemini can see it
    const imageResp = await fetch(imageUrl);
    const arrayBuffer = await imageResp.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // ✨ NEW: The Appraiser Prompt ✨
    const prompt = `You are an expert auto parts appraiser. Look at this car part.
    Return ONLY a valid JSON object with these exact keys:
    "title": A short, catchy title for a marketplace listing.
    "condition": A brief assessment of the visible condition.
    "description": A professional, persuasive marketplace listing description.
    "estimated_price": A single number (integer) representing the estimated fair market value on eBay in USD. Do not include dollar signs or commas, just the raw number.`;

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
    
    // Clean up the AI's response to ensure it's perfect JSON
    const jsonString = responseText.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim();
    const aiData = JSON.parse(jsonString);

    return NextResponse.json(aiData);
  } catch (error: any) {
    console.error("AI Route Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}