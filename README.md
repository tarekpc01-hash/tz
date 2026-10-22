# NILORIX — Gaming Beyond Limits

متجر ألعاب ومنتجات رقمية بياخد أوردرات حقيقية: حسابات للعملاء، دفع بالكريبتو (USDT BEP20 / USDT TRC20 / LTC)،
صفحة لكل أوردر فيها شات، لوحة تحكم للأدمن، تقييمات حقيقية، وإشعار على الإيميل مع كل أوردر.

---

## ⚙️ التشغيل لأول مرة (حوالي 15 دقيقة — مرة واحدة بس)

### 1) اعمل مشروع Firebase (مجاني)
1. ادخل https://console.firebase.google.com واعمل **Add project** (سمّيه nilorix مثلاً). Google Analytics مش ضروري.
2. من الصفحة الرئيسية للمشروع دوس على أيقونة **Web `</>`** ← سمّي التطبيق ← **Register app**.
3. هيظهرلك كود فيه `firebaseConfig` — انسخ القيم دي وحطها في **`config.js`** مكان `PASTE_...`.

### 2) فعّل تسجيل الدخول
1. من القايمة: **Build ← Authentication ← Get started**.
2. في **Sign-in method** فعّل: **Email/Password** و **Google**.
3. في **Settings ← Authorized domains** دوس **Add domain** وضيف دومين موقعك، مثلاً: `USERNAME.github.io`

### 3) اعمل قاعدة البيانات
1. **Build ← Firestore Database ← Create database** ← اختار **Production mode** ← اختار أقرب منطقة (مثلاً `eur3`).
2. افتح تبويب **Rules**، امسح اللي فيه، والصق محتوى ملف **`firestore.rules`** كله.
3. ⚠ في الملف ده غيّر `put_your_admin_email@gmail.com` لإيميلك إنت (بحروف صغيرة) ← **Publish**.

### 4) املأ باقي `config.js`
- `ADMIN_EMAILS` ← نفس إيميلك اللي حطيته في الـ rules.
- `WALLETS` ← عناوين محافظك الـ 3. **راجعها حرف حرف** — أي غلطة الفلوس هتروح لحد تاني.
  (لو مش عاوز طريقة منهم سيبها `PUT_...` وهتظهر للعميل "Not available")
- `NOTIFY_EMAIL` ← الإيميل اللي توصله إشعارات الأوردرات.

### 5) ارفع على GitHub
ارفع كل الملفات والفولدرات زي ما هي، ولو GitHub Pages مش مفعّل: **Settings ← Pages ← Branch: main ← Save**.

### 6) فعّل إيميل الإشعارات
أول أوردر يتعمل هيوصلك إيميل من **FormSubmit** يطلب تأكيد ← دوس **Activate**. من بعدها كل أوردر جديد بيوصلك.
(لو حابب تخبي إيميلك: FormSubmit هيبعتلك "alias" — حطه في `NOTIFY_EMAIL` بداله.)

### 7) ادخل لوحة التحكم
افتح `موقعك/nilorixstoreadmmin5656.html` وسجّل دخول **بجوجل** بإيميل الأدمن.
لو سجلت بإيميل وباسوورد لازم تأكد الإيميل الأول (الصفحة هتبعتلك لينك التأكيد) — ده عشان محدش ينتحل إيميلك.

✅ جرّب أوردر بنفسك بمبلغ صغير قبل ما تعلن عن الموقع.

---

## 🛒 الأوردر بيمشي إزاي

| الخطوة | العميل | إنت (nilorixstoreadmmin5656.html) |
|---|---|---|
| 1 | يختار الكمية ويدوس **Pay** | |
| 2 | يكتب بيانات حسابه في اللعبة ويختار طريقة الدفع ← **Place order** (لازم حساب) | يوصلك إيميل 🛒 |
| 3 | يشوف العنوان والمبلغ بالظبط + QR، يحوّل، ويلصق الـ **TXID** ← **I've paid** | يوصلك إيميل 💰 |
| 4 | | تفتح الـ TXID (لينك جاهز) وتتأكد من: الشبكة + العنوان + المبلغ ← **Payment received** (أو **Payment not found**) |
| 5 | | تشحن الأوردر ← **Mark as delivered** |
| 6 | يدوس **I received my order** ← يقيّم ⭐ | التقييم يظهر في صفحة اللعبة |
| ⚠ | لو مستلمش: **I didn't receive it — open a dispute** ← يختار السبب ويكتب التفاصيل | يوصلك إيميل ⚠ DISPUTE + يظهر في تبويب **Disputes** ← **Re-delivered** أو **Resolved — complete** أو **Refund & cancel** |

- الشات شغال في صفحة كل أوردر طول الوقت (العميل ↔ إنت).
- الـ Dispute متاح بس والأوردر **Delivered** — والأوردر اللي عليه Dispute مش بيتقفل لوحده لحد ما إنت تحله.
- أسباب الـ Dispute اللي العميل بيختار منها في `DISPUTE_REASONS` في `data.js`.
- لو العميل مأكدش الاستلام خلال 3 أيام الأوردر بيتقفل لوحده (`AUTO_COMPLETE_DAYS` في `data.js`).
- لو حد لعب في السعر من المتصفح، لوحة التحكم بتطلعلك ⚠ وبتوريك السعر الحقيقي — **راجعه قبل ما تشحن**.

---

## 📁 الملفات

```
index.html      الصفحة الرئيسية
game.html       صفحة اللعبة (game.html?id=robux)
checkout.html   الدفع: بيانات الحساب + طريقة الدفع
order.html      صفحة الأوردر: الدفع، الحالة، الشات، تأكيد الاستلام
orders.html     أوردراتي
nilorixstoreadmmin5656.html      لوحة التحكم (ليك بس)

config.js       ⚙ إعداداتك: Firebase · إيميل الأدمن · المحافظ · إيميل الإشعارات
data.js         🎮 الألعاب والباقات والأسعار وبيانات الحساب المطلوبة لكل لعبة
firestore.rules 🔒 قواعد الحماية (بتتلصق في Firebase)

style.css · common.js · backend.js · home.js · game.js · checkout.js · order.js · orders.js · admin.js
images/         اللوجو وصور الألعاب
```

## ✏️ التعديل
- **الأسعار والباقات والألعاب** ← `data.js` (مكتوب جنب كل حاجة شرح).
- **البيانات اللي العميل بيكتبها لكل لعبة** (UID / Username / Email) ← `ACCOUNT_FIELDS` في `data.js`.
  ⚠ متطلبش باسوورد في الخانات دي — لو محتاج حاجة زيادة اطلبها في الشات.
- **وقت التوصيل** ← `DELIVERY_TIME` في `data.js`.
- **صور الألعاب** ← `images/games/` بنفس الاسم المكتوب في `img`.
- **سعر صرف العملات المعروضة** ← `rates` في `data.js` (الدفع نفسه دايماً بالدولار).

## ℹ️ حدود الخطة المجانية
Firebase المجاني (Spark) بيكفي لحد حوالي 50 ألف قراءة في اليوم — كفاية جداً لبداية المتجر.
FormSubmit مجاني ومش محتاج حساب.

---

## 🤖 تأكيد الدفع الأوتوماتيك (USDT BEP20) — 0 fees

- كل أوردر بياخد **مبلغ مميز** (زي `12.0037 USDT`)، والسيرفر بيكشف على البلوكتشين وأول ما المبلغ يوصل محفظتك الأوردر بيتحول **Processing** لوحده.
- الكود في `functions/api/verify.js` (بيشتغل على Cloudflare Pages Functions ببلاش).
- **مش بيأكد أي أوردر إلا لو:** العملية USDT الرسمي، رايحة لمحفظتك، المبلغ صح، العملية ناجحة، أحدث من الأوردر، ومتستخدمتش قبل كده، والسعر مطابق لقايمة الأسعار.
- أي حالة مش واضحة → الأوردر بيروح **Payment sent — verifying** وانت تراجعه بإيدك، ومكتوب جنبه السبب.

### الإعداد (مرة واحدة)
1. Firebase Console ← ⚙ **Project settings** ← **Service accounts** ← **Generate new private key** ← هينزل ملف JSON.
   ⚠ الملف ده سري جداً — متبعتهوش لحد ومترفعهوش على GitHub.
2. Cloudflare ← Workers & Pages ← مشروع الموقع ← **Settings** ← **Variables and Secrets** ← **Add**:
   - Type: **Secret** · Name: `FIREBASE_SA` · Value: الصق محتوى ملف الـ JSON كله.
3. اعمل **Retry deployment** (أو ارفع أي تعديل على GitHub).
4. اختبار: افتح `https://nilorix.com/api/verify` — لازم يظهر `{"ok":true,...}`.

لو الخطوات دي متعملتش، الموقع بيشتغل عادي زي الأول (العميل يحط الـ TX وانت تأكد بإيدك).

## 💳 الدفع بالفيزا / Apple Pay / Google Pay (Transak)
- العميل بيشتري USDT بالكارت عن طريق Transak (هو اللي بيدفع رسومهم ~3–5%) والـ USDT بيوصل محفظتك BEP20 على طول، والأوردر بيتأكد لوحده.
- الكود في `functions/api/card.js` — بيعمل لينك الدفع الآمن من السيرفر (Transak بقى يطلب كده).
- الإعداد: Cloudflare ← المشروع ← Settings ← Variables and Secrets:
  - `TRANSAK_API_KEY` = الـ API Key (من Transak ← Developers)
  - `TRANSAK_API_SECRET` = الـ API Secret — **Type: Secret**
  - `TRANSAK_ENV` = `staging` للتجربة، وبعد موافقة الـ KYB غيّرها لـ `production` وحط مفاتيح الـ Production.
- زرار **Pay with Card** بيظهر لوحده أول ما المفاتيح تتحط (ومكتوب جنبه TEST في وضع التجربة).
- أقل أوردر يظهر فيه الزرار: `CARD_PAY.minUsd` في `config.js`.
