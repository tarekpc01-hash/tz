# NILORIX — Gaming Beyond Limits

متجر ألعاب ومنتجات رقمية (V-Bucks, Robux, Gift Cards, Gaming Coins, Software).

## الملفات
```
index.html      الصفحة الرئيسية
game.html       صفحة اللعبة (game.html?id=robux مثلاً)
style.css       التصميم
common.js       بيانات الألعاب + الهيدر + السلة + البحث (عدّل الألعاب من هنا)
home.js         أقسام الصفحة الرئيسية
game.js         صفحة اللعبة (الكمية، Pay، البائع، التقييمات)
images/         اللوجو والصور
```

## الرفع على GitHub Pages
1. ارفع كل الملفات (ومعها مجلد `images`) على الـ repo.
2. Settings → Pages → Source: `Deploy from a branch` → Branch: `main` / `(root)` → Save.
3. بعد دقيقة الموقع هيشتغل على: `https://USERNAME.github.io/REPO-NAME/`

## التعديل
- **المنتجات والأسعار**: في `common.js` داخل `games` — غيّر الاسم أو السعر أو ضيف منتج جديد.
- **صور المنتجات**: حط الصورة في `images/` واكتب مسارها في `img` (مثلاً `"images/vbucks-1000.png"`).
- **صور الألعاب**: نفس الفكرة في `games`.
- **صور الهيرو**: سمّيها `hero-left.png` و `hero-right.png` و `hero-bottom.png` وحطها في `images/`.
- **سعر العملة**: في `rates` داخل `common.js`.
- **التقييمات**: حط تقييمات عملائك الحقيقية في `reviews` لكل لعبة في `common.js`.
- **عدد الأوردرات**: رقم `sold` لكل لعبة — حط الرقم الحقيقي.
