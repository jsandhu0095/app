import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { query } = await req.json();
    console.log(`🔍 Original AI Title: "${query}"`);
    
    // ✨ The FIXED Query Optimizer ✨
    // 1. Strip out hyphens, commas, and weird symbols
    let optimizedQuery = query.replace(/[^a-zA-Z0-9 ]/g, ' ');
    
    // 2. Remove common AI fluff AND colors that ruin eBay searches
    optimizedQuery = optimizedQuery.replace(/\b(genuine|oem|finish|color|style|authentic|dark|light|grey|gray|black|white|silver|matte|gloss)\b/gi, '');
    
    // 3. Remove extra spaces
    optimizedQuery = optimizedQuery.replace(/\s+/g, ' ').trim();
    
    console.log(`🧼 Cleaned up for eBay: "${optimizedQuery}"`);
    
    const appId = process.env.EBAY_APP_ID;
    const certId = process.env.EBAY_CERT_ID;

    if (!appId || !certId) {
      return NextResponse.json({ error: "Missing eBay keys in .env.local" }, { status: 400 });
    }

    // The eBay Handshake
    const authHeader = Buffer.from(`${appId}:${certId}`).toString('base64');
    
    const tokenRes = await fetch('https://api.ebay.com/identity/v1/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${authHeader}`
      },
      body: 'grant_type=client_credentials&scope=https://api.ebay.com/oauth/api_scope'
    });

    const tokenData = await tokenRes.json();
    
    if (!tokenRes.ok) throw new Error(`eBay Auth Failed: ${tokenData.error_description}`);
    
    const accessToken = tokenData.access_token;

    // The Pro Flipper Hack (Negative Keywords)
    const smartQuery = `${optimizedQuery} -toy -diecast -rc -scale -model -hotwheels -miniature`;
    console.log(`🧠 Final String sent to eBay: "${smartQuery}"`);

    // Search the Market
    const searchUrl = `https://api.ebay.com/buy/browse/v1/item_summary/search?q=${encodeURIComponent(smartQuery)}&filter=buyingOptions:{FIXED_PRICE}&limit=5`;

    const searchRes = await fetch(searchUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    const searchData = await searchRes.json();
    console.log(`✅ eBay returned ${searchData.itemSummaries ? searchData.itemSummaries.length : 0} items.`);

    return NextResponse.json({
      success: true,
      items: searchData.itemSummaries || []
    });

  } catch (error: any) {
    console.error("❌ eBay API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}