/* =====================================================================
   NILORIX — الإعدادات (املأ الملف ده مرة واحدة — الشرح في README.md)
   ===================================================================== */

/* 1) Firebase — من Firebase Console ← Project settings ← Your apps ← Web app ← Config
      (البيانات دي عادي تبقى ظاهرة في الموقع، الحماية بتبقى من firestore.rules) */
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBzAEPBKIecvXShacTQG4QD8suqaPnTyno",
  authDomain: "nilorix-75361.firebaseapp.com",
  projectId: "nilorix-75361",
  storageBucket: "nilorix-75361.firebasestorage.app",
  messagingSenderId: "413256952587",
  appId: "1:413256952587:web:6088bf48f998e01015900e",
};

/* 2) إيميل الأدمن — اللي يسجّل دخول بيه يقدر يفتح لوحة التحكم (nilorixstoreadmmin5656.html)
      (لازم يبقى نفس الإيميل المكتوب في firestore.rules) */
const ADMIN_EMAILS = ["nilorixstore@gmail.com"];

/* 3) عناوين المحافظ اللي العميل هيحوّل عليها — راجعها كويس جداً */
const WALLETS = {
  usdt_bep20: "0x6DB2089647cC05a54430e7480cC620e0520C83D7",
  usdt_trc20: "PUT_YOUR_USDT_TRC20_ADDRESS",   // مقفولة حالياً — حط العنوان هنا لما تحب تفعّلها
  ltc:        "PUT_YOUR_LTC_ADDRESS",          // مقفولة حالياً
};

/* 3b) الدفع بالفيزا / Apple Pay / Google Pay — عن طريق Transak
       العميل بيشتري USDT بالكارت (هو اللي بيدفع رسومهم ~3-5%) والـ USDT بيوصل محفظتك BEP20 على طول.
       سجّل في https://transak.com (Partner / Business) وحط الـ API Key هنا — الزرار مش هيظهر لحد ما تحطه */
const CARD_PAY = {
  transakApiKey: "PUT_YOUR_TRANSAK_API_KEY",
};

/* 4) الإيميل اللي توصله إشعارات الأوردرات الجديدة (عن طريق FormSubmit) */
const NOTIFY_EMAIL = "nilorixstore@gmail.com";

/* جروب الديسكورد — بيظهر في الفوتر وفي شات الدعم */
const DISCORD_URL = "https://discord.gg/pmzKfQuE5";

/* (used by the automatic payment checker on the server — functions/api/verify.js) */
try { globalThis.NX_CONFIG = { FIREBASE_CONFIG, WALLETS }; } catch (e) {}
