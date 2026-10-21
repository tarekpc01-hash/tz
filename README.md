# NILORIX — Gaming Beyond Limits

متجر ألعاب ومنتجات رقمية (V-Bucks, Robux, Gift Cards, Gaming Coins, Software).

## الملفات
```
index.html      الصفحة الرئيسية
style.css       التصميم
script.js       المنتجات + السلة + البحث + العملات
images/logo.svg اللوجو
```

## الرفع على GitHub Pages
1. ارفع كل الملفات (ومعها مجلد `images`) على الـ repo.
2. Settings → Pages → Source: `Deploy from a branch` → Branch: `main` / `(root)` → Save.
3. بعد دقيقة الموقع هيشتغل على: `https://USERNAME.github.io/REPO-NAME/`

## التعديل
- **المنتجات والأسعار**: في `script.js` داخل `products` — غيّر الاسم أو السعر أو ضيف منتج جديد.
- **صور المنتجات**: حط الصورة في `images/` واكتب مسارها في `img` (مثلاً `"images/vbucks-1000.png"`).
- **صور الألعاب**: نفس الفكرة في `games`.
- **صور الهيرو**: سمّيها `hero-left.png` و `hero-right.png` و `hero-bottom.png` وحطها في `images/`.
- **سعر العملة**: في `rates` داخل `script.js`.
