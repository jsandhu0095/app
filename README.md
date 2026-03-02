# 🚗 PartOutPro

PartOutPro is a full-stack, AI-powered operating system built specifically for car flippers, mechanics, and auto dismantlers. It replaces chaotic spreadsheets and guesswork with a streamlined mobile-first dashboard to track donor cars, individual parts, hidden expenses, and real-time profit margins.

## ✨ Key Features

* **🧠 AI Appraiser (Powered by Gemini 2.5 Flash):** Snap a photo of any car part. The integrated AI vision model instantly identifies the part, assesses visible condition, writes a highly-converting marketplace description, and estimates its fair market value on eBay in USD.
* **📊 Dynamic Financial Engine:** Tracks original car purchase price, logs hidden expenses (towing, storage, shipping), and calculates total revenue, net profit, and break-even percentages in real-time.
* **📸 Multi-Photo Inventory:** Upload and swipe through multiple high-resolution photos per part directly from your phone.
* **🔍 Advanced Garage Management:** Quickly filter your inventory with real-time search, and use inline editing to adjust prices on the fly without deleting records.
* **🔐 Secure & Private:** Authenticated user accounts ensure your financial data and inventory are locked down and visible only to you.
* **📈 CSV Export:** One-click download of your entire garage's financial data into an Excel-ready spreadsheet for tax season or personal backups.

## 🛠️ Tech Stack

* **Frontend:** Next.js (React), Tailwind CSS
* **Backend & Database:** Supabase (PostgreSQL, Row Level Security, Storage)
* **AI Integration:** Google Generative AI (`@google/generative-ai`)
* **Hosting & Deployment:** Vercel

## 🚀 Getting Started (Local Development)

1. **Clone the repository:**
   ```bash
   git clone [https://github.com/your-username/part-out-pro.git](https://github.com/your-username/part-out-pro.git)