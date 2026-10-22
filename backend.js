/* =====================================================================
   NILORIX — backend (Firebase: accounts, orders, chat, reviews)
   مفيش داعي تعدّل الملف ده — الإعدادات في config.js
   ===================================================================== */

const NX = (() => {
  const configured = typeof firebase !== "undefined"
    && typeof FIREBASE_CONFIG !== "undefined"
    && FIREBASE_CONFIG.apiKey && !FIREBASE_CONFIG.apiKey.startsWith("PASTE");

  let auth = null, db = null;
  if (configured) {
    try {
      firebase.initializeApp(FIREBASE_CONFIG);
      auth = firebase.auth();
      db = firebase.firestore();
    } catch (e) { console.error("Firebase init failed", e); }
  }
  const enabled = !!(auth && db);

  /* ---------- auth state ---------- */
  let user = null;          // firebase user
  let profile = null;       // users/{uid} doc
  let authKnown = false;
  const authListeners = [];
  const isAdminEmail = () => !!(user && user.email && ADMIN_EMAILS.map(e => e.toLowerCase()).includes(user.email.toLowerCase()));
  const isAdmin = () => isAdminEmail() && !!user.emailVerified;   // must be verified (Google sign-in is verified automatically)

  function emitAuth() { authListeners.forEach(fn => { try { fn(user, profile); } catch (e) { console.error(e); } }); }
  function onAuth(fn) { authListeners.push(fn); if (authKnown) fn(user, profile); }

  if (enabled) {
    auth.onAuthStateChanged(async u => {
      user = u;
      profile = null;
      if (u) {
        try {
          const snap = await db.collection("users").doc(u.uid).get();
          profile = snap.exists ? snap.data() : null;
          if (!profile) {
            profile = { name: u.displayName || (u.email || "").split("@")[0], email: u.email || "", photo: u.photoURL || "", createdAt: Date.now() };
            await db.collection("users").doc(u.uid).set(profile);
          }
        } catch (e) { console.error(e); profile = { name: u.displayName || "", email: u.email || "", photo: "" }; }
      }
      authKnown = true;
      emitAuth();
    });
  } else {
    authKnown = true;
  }

  /* ---------- accounts ---------- */
  const errText = (e) => {
    const c = (e && e.code) || "";
    if (c.includes("email-already-in-use")) return "This email already has an account — sign in instead.";
    if (c.includes("invalid-email")) return "Please enter a valid email.";
    if (c.includes("weak-password")) return "Password must be at least 6 characters.";
    if (c.includes("wrong-password") || c.includes("invalid-credential") || c.includes("user-not-found")) return "Wrong email or password.";
    if (c.includes("too-many-requests")) return "Too many attempts — try again in a few minutes.";
    if (c.includes("popup-closed")) return "Sign-in window was closed.";
    if (c.includes("unauthorized-domain")) return "This website isn't authorized in Firebase yet (Authentication → Settings → Authorized domains).";
    return (e && e.message) || "Something went wrong.";
  };

  async function signUp(name, email, password) {
    const cred = await auth.createUserWithEmailAndPassword(email, password);
    try { await cred.user.updateProfile({ displayName: name }); } catch {}
    profile = { name, email, photo: "", createdAt: Date.now() };
    await db.collection("users").doc(cred.user.uid).set(profile);
    user = cred.user; emitAuth();
  }
  const signIn = (email, password) => auth.signInWithEmailAndPassword(email, password);
  const signInGoogle = () => auth.signInWithPopup(new firebase.auth.GoogleAuthProvider());
  const resetPassword = (email) => auth.sendPasswordResetEmail(email);
  const signOut = () => auth.signOut();
  const sendVerification = () => user && user.sendEmailVerification();
  const reloadUser = async () => { if (user) { await user.reload(); user = auth.currentUser; emitAuth(); } };

  async function saveProfile(p) {
    if (!user) throw new Error("Not signed in");
    profile = { ...profile, ...p };
    await db.collection("users").doc(user.uid).set(profile, { merge: true });
    emitAuth();
  }

  /* ---------- orders ---------- */
  const orders = () => db.collection("orders");

  async function createOrder(o) {
    const now = Date.now();
    const ref = await orders().add({
      ...o,
      uid: user.uid,
      buyerEmail: user.email || "",
      buyerName: (profile && profile.name) || "",
      status: "awaiting_payment",
      createdAt: now,
      updatedAt: now,
    });
    return ref.id;
  }

  function watchMyOrders(cb) {
    if (!user) { cb([]); return () => {}; }
    return orders().where("uid", "==", user.uid).onSnapshot(
      s => cb(s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => b.createdAt - a.createdAt)),
      e => { console.error(e); cb([]); });
  }
  function watchOrder(id, cb, onErr) {
    return orders().doc(id).onSnapshot(
      d => cb(d.exists ? { id: d.id, ...d.data() } : null),
      e => { console.error(e); onErr && onErr(e); });
  }
  const updateOrder = (id, data) => orders().doc(id).update({ ...data, updatedAt: Date.now() });

  /* buyer actions */
  const submitPayment = (id, txHash) => updateOrder(id, { status: "payment_submitted", txHash, paidAt: Date.now() });
  const cancelOrder   = (id) => updateOrder(id, { status: "cancelled", cancelledBy: "buyer" });
  const markReceived  = (id) => updateOrder(id, { status: "completed", completedAt: Date.now() });
  const openDispute   = (id, reason) => updateOrder(id, { status: "disputed", disputeReason: reason, disputedAt: Date.now() });

  /* chat */
  const messages = (id) => orders().doc(id).collection("messages");
  function watchMessages(id, cb) {
    return messages(id).onSnapshot(
      s => cb(s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => a.createdAt - b.createdAt)),
      e => { console.error(e); cb([]); });
  }
  const sendMessage = (id, text, from) => messages(id).add({ uid: user.uid, from, text, createdAt: Date.now() });

  /* ---------- support tickets (chat widget) ---------- */
  const tickets = () => db.collection("tickets");
  async function createTicket(reason, text, orderId) {
    const now = Date.now();
    const ref = await tickets().add({
      uid: user.uid, buyerEmail: user.email || "", buyerName: (profile && profile.name) || "",
      reason, orderId: orderId || "", status: "open",
      createdAt: now, updatedAt: now, lastFrom: "buyer", lastText: text.slice(0, 200),
    });
    await tickets().doc(ref.id).collection("messages").add({ uid: user.uid, from: "buyer", text, createdAt: now });
    return ref.id;
  }
  function watchMyTickets(cb) {
    if (!user) { cb([]); return () => {}; }
    return tickets().where("uid", "==", user.uid).onSnapshot(
      s => cb(s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => b.updatedAt - a.updatedAt)),
      e => { console.error(e); cb([]); });
  }
  function watchAllTickets(cb, onErr) {
    return tickets().orderBy("updatedAt", "desc").limit(300).onSnapshot(
      s => cb(s.docs.map(d => ({ id: d.id, ...d.data() }))),
      e => { console.error(e); onErr && onErr(e); });
  }
  function watchTicketMessages(id, cb) {
    return tickets().doc(id).collection("messages").onSnapshot(
      s => cb(s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => a.createdAt - b.createdAt)),
      e => { console.error(e); cb([]); });
  }
  async function sendTicketMessage(id, text, from) {
    const now = Date.now();
    await tickets().doc(id).collection("messages").add({ uid: user.uid, from, text, createdAt: now });
    const upd = { updatedAt: now, lastFrom: from, lastText: text.slice(0, 200) };
    if (from === "buyer") upd.status = "open";
    await tickets().doc(id).update(upd);
  }
  const setTicketStatus = (id, status) => tickets().doc(id).update({ status, updatedAt: Date.now() });

  /* ---------- reviews (public) ---------- */
  async function loadReviews() {
    try {
      const s = await db.collection("reviews").limit(1000).get();
      return s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => b.createdAt - a.createdAt);
    } catch (e) { console.error(e); return []; }
  }
  /* admin only: deleted reviews are moved to "deletedReviews" (hidden from the site, kept for the admin) */
  async function deleteReview(r) {
    const { id, ...data } = r;
    await db.collection("deletedReviews").doc(id).set({ ...data, deletedAt: Date.now() });
    await db.collection("reviews").doc(id).delete();
  }
  async function restoreReview(r) {
    const { id, deletedAt, ...data } = r;
    await db.collection("reviews").doc(id).set(data);
    await db.collection("deletedReviews").doc(id).delete();
  }
  async function loadDeletedReviews() {
    try {
      const s = await db.collection("deletedReviews").limit(1000).get();
      return s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (b.deletedAt || 0) - (a.deletedAt || 0));
    } catch (e) { console.error(e); return []; }
  }
  const addReview = (orderId, r) => db.collection("reviews").doc(orderId).set({ ...r, uid: user.uid, auto: false, createdAt: Date.now() });
  /* admin only: 5★ automatic review for an order the buyer didn't review within AUTO_COMPLETE_DAYS */
  const addAutoReview = (o) => db.collection("reviews").doc(o.id).set({
    uid: o.uid, name: o.buyerName || "Customer", photo: "", stars: 5, text: "", auto: true,
    item: (o.items || []).map(i => i.label).join(", "),
    gids: [...new Set((o.items || []).map(i => i.gid))],
    createdAt: Date.now(),
  });

  /* ---------- store stats (public, admin writes) ---------- */
  async function loadSales() {
    try { const d = await db.collection("stats").doc("sales").get(); return d.exists ? d.data() : {}; }
    catch (e) { console.error(e); return {}; }
  }
  /* ---------- prices set from the admin panel (public read) ---------- */
  async function loadPrices() {
    try { const d = await db.collection("config").doc("prices").get(); return d.exists ? d.data() : {}; }
    catch (e) { console.error(e); return {}; }
  }
  const savePrices = (obj) => db.collection("config").doc("prices").set(obj);

  /* لوحة التحكم بتكتب الأرقام الحقيقية هنا (عدد الأوردرات + المبيعات لكل لعبة) */
  const setStats = (obj) => db.collection("stats").doc("sales").set(obj);
  async function addSales(counts) {
    const ref = db.collection("stats").doc("sales");
    const d = await ref.get();
    const cur = d.exists ? d.data() : {};
    Object.entries(counts).forEach(([k, v]) => { cur[k] = (cur[k] || 0) + v; });
    cur._orders = (cur._orders || 0) + 1;   // عدد الأوردرات اللي اتسلّمت فعلاً
    await ref.set(cur);
  }

  /* ---------- admin ---------- */
  function watchAllOrders(cb, onErr) {
    return orders().orderBy("createdAt", "desc").limit(500).onSnapshot(
      s => cb(s.docs.map(d => ({ id: d.id, ...d.data() }))),
      e => { console.error(e); onErr && onErr(e); });
  }

  /* ---------- email notification to the shop owner (FormSubmit) ---------- */
  function notifyOwner(subject, lines) {
    if (typeof NOTIFY_EMAIL === "undefined" || !NOTIFY_EMAIL || NOTIFY_EMAIL.startsWith("PUT_")) return;
    try {
      fetch(`https://formsubmit.co/ajax/${encodeURIComponent(NOTIFY_EMAIL)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ _subject: subject, _template: "table", ...lines }),
      }).catch(() => {});
    } catch {}
  }

  return {
    enabled, onAuth, get user() { return user; }, get profile() { return profile; }, isAdmin, isAdminEmail, sendVerification, reloadUser,
    errText, signUp, signIn, signInGoogle, resetPassword, signOut, saveProfile,
    createOrder, watchMyOrders, watchOrder, updateOrder, submitPayment, cancelOrder, markReceived, openDispute,
    watchMessages, sendMessage, createTicket, watchMyTickets, watchAllTickets, watchTicketMessages, sendTicketMessage, setTicketStatus, loadReviews, addReview, deleteReview, restoreReview, loadDeletedReviews, addAutoReview, loadSales, addSales, setStats, loadPrices, savePrices, watchAllOrders, notifyOwner,
  };
})();
