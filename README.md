# 🏗️ Construction Project Manager

Built with **Next.js 15**, **Supabase** (PostgreSQL), deployed on **Vercel**.

---

## 🚀 Setup (step by step)

### 1 · Supabase — database
1. Go to [supabase.com](https://supabase.com) → create account → new project (US East region)
2. **SQL Editor** → paste contents of `supabase/schema.sql` → **Run**
3. **Settings → API** → copy:
   - `Project URL`
   - `anon public` key

### 2 · Environment variables
```
# Create a file named .env.local in the project root:
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 3 · Run locally

**Windows (PowerShell):**
```powershell
# Clean install
Remove-Item -Recurse -Force node_modules
npm install
npm run dev
```

**Mac / Linux:**
```bash
rm -rf node_modules
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) 🎉

### 4 · Import your Excel data
```bash
# Install Python dependencies
pip install pandas openpyxl supabase python-dotenv

# Run the import script
python scripts/import_excel.py "path/to/your/file.xlsm"
```

### 5 · Push to GitHub
```bash
git init
git add .
git commit -m "initial commit"
git remote add origin https://github.com/your-username/construction-pm.git
git push -u origin main
```

### 6 · Deploy on Vercel
1. [vercel.com](https://vercel.com) → **New Project** → import your GitHub repo
2. **Environment Variables** → add both Supabase keys
3. **Deploy** ✅

---

## 🔧 Troubleshooting (Windows)

| Problem | Fix |
|---|---|
| `rm -rf` not found | Use `Remove-Item -Recurse -Force node_modules` |
| Port 3000 in use | App auto-picks next port (3001, 3002…) — open that URL |
| EPERM on node_modules delete | Close VS Code / terminal, retry in a new terminal |
| Recharts compile error | Make sure `transpilePackages: ['recharts']` is in `next.config.js` |

---

## 📁 Project Structure

```
construction-pm/
├── app/
│   ├── dashboard/          # KPIs + charts
│   ├── projects/
│   │   ├── page.tsx        # Project list with search & filters
│   │   ├── new/            # Create new project
│   │   └── [id]/           # View / Edit project
│   └── globals.css
├── components/
│   ├── Navbar.tsx          # Top navigation bar
│   └── ProjectForm.tsx     # Form with auto-calculated financials
├── lib/
│   ├── supabase.ts         # Database client + CRUD functions
│   └── types.ts            # TypeScript types
├── scripts/
│   └── import_excel.py     # Import existing Excel data
└── supabase/
    └── schema.sql          # Database schema (run this first)
```

## 📊 Financial Field Logic

The form has **manual inputs** and **auto-calculated** fields:

| Field | Formula |
|---|---|
| Frame L,N,E Price/SF | Frame L,N,E Price ÷ Floor SF |
| Frame Material/SF | Frame Material ÷ Floor SF |
| Truss/SF | Truss Price ÷ Floor SF |
| Siding L&M/SF | Siding L&M ÷ Floor SF |
| Total Price/SF | Sum of all four /SF fields |
| Total Contract Price | Total Price/SF × Floor SF |
| Contract Price + CO's | Total Contract Price + Change Orders |
