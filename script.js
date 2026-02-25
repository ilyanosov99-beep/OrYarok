/* ===== script block 1 (from original HTML) ===== */
/* ===== DB/STORAGE LAYER (v1) =====
   - Single access point for storage with safe fallback when localStorage is blocked/disabled.
   - Exposes: window.DBStorage (getItem/setItem/removeItem/getJSON/setJSON)
              window.DB (get/set/del/key/KEYS)
*/
(function(){
  if(window.DBStorage && window.DB) return;

  var mem = Object.create(null);

  function canUseLocalStorage(){
    try{
      if(!('localStorage' in window) || !window.localStorage) return false;
      var t = '__ls_test__' + String(Date.now()) + '_' + String(Math.random());
      window.localStorage.setItem(t, '1');
      window.localStorage.removeItem(t);
      return true;
    }catch(e){
      return false;
    }
  }

  var useLS = canUseLocalStorage();

  function _memHas(k){ return Object.prototype.hasOwnProperty.call(mem, k); }

  function getItem(key){
    key = String(key||'');
    if(!key) return null;
    try{
      if(useLS) return window.localStorage.getItem(key);
    }catch(e){
      useLS = false;
    }
    return _memHas(key) ? mem[key] : null;
  }

  function setItem(key, value){
    key = String(key||'');
    if(!key) return;
    var v = (value === undefined) ? 'undefined' : String(value);
    try{
      if(useLS){ window.localStorage.setItem(key, v); try{ if(window.FBBridge && typeof window.FBBridge.onLocalSet === 'function') window.FBBridge.onLocalSet(key, v); }catch(__e){} return; }
    }catch(e){
      useLS = false;
    }
    mem[key] = v;
  }

  function removeItem(key){
    key = String(key||'');
    if(!key) return;
    try{
      if(useLS){ window.localStorage.removeItem(key); try{ if(window.FBBridge && typeof window.FBBridge.onLocalRemove === 'function') window.FBBridge.onLocalRemove(key); }catch(__e){} return; }
    }catch(e){
      useLS = false;
    }
    try{ delete mem[key]; }catch(_){}
  }

  function getJSON(key, fallback){
    var raw = getItem(key);
    if(raw == null || raw === '') return fallback;
    try{
      var obj = JSON.parse(raw);
      return obj;
    }catch(e){
      return fallback;
    }
  }

  function setJSON(key, obj){
    try{
      setItem(key, JSON.stringify(obj));
    }catch(e){
      // last resort
      try{ setItem(key, '{}'); }catch(_){}
    }
  }

  window.DBStorage = {
    getItem: getItem,
    setItem: setItem,
    removeItem: removeItem,
    getJSON: getJSON,
    setJSON: setJSON,
    _mem: mem
  };

  // Central keys: static keys only. Dynamic keys live under DB.key.*
  var KEYS = {
    studentsRegistry: 'students_registry_v1',
    appUsers: 'appUsers',
    studentLoggedIn: 'student_logged_in',
    studentUsername: 'student_username',
    shopPendingPayment: 'shop_pending_payment_v1'
  };

  function keyStudentProfile(tz){ return 'student_profile_' + String(tz||'').trim(); }
  function keyStudentProgress(tz){ return 'student_progress_' + String(tz||'').trim(); }
  function keyStudentPayments(tz){ return 'student_payments_' + String(tz||'').trim(); }
  function keyStudentCredit(tz){ return 'student_credit_money_' + String(tz||'').trim(); }
  function keyStudentExtraSpent(id){ return 'student_credit_extra_spent_' + String(id||'').trim(); }

  function get(key, fallback){
    return getJSON(key, fallback);
  }
  function set(key, value){
    return setJSON(key, value);
  }
  function del(key){
    return removeItem(key);
  }

  window.DB = {
    KEYS: KEYS,
    key: {
      studentProfile: keyStudentProfile,
      studentProgress: keyStudentProgress,
      studentPayments: keyStudentPayments
    },
    get: get,
    set: set,
    del: del
  };
})();

/* ===== GLOBAL HELPERS (v1) =====
   Some modules call these helpers outside of specific render scopes.
   Keep them global to avoid ReferenceError and ensure "יתרה" works everywhere.
*/
if(typeof window.keyStudentCredit !== 'function'){
  window.keyStudentCredit = function(tz){
    return 'student_credit_money_' + String(tz||'').trim();
  };
}

if(typeof window.parseNum !== 'function'){
  window.parseNum = function(v){
    if(v === undefined || v === null) return null;
    if(typeof v === 'number') return isFinite(v) ? v : null;
    var s = String(v).replace(/,/g,'').trim();
    if(!s) return null;
    var n = parseFloat(s);
    return isFinite(n) ? n : null;
  };
}

if(typeof window.fmtMoney !== 'function'){
  window.fmtMoney = function(v){
    if(v === undefined || v === null || v === '') return '—';
    var n = window.parseNum(v);
    if(n === null) return String(v);
    var n2 = Math.round(n * 100) / 100;
    try{ return n2.toLocaleString('he-IL') + '₪'; }catch(e){ return String(n2) + '₪'; }
  };
}

/* ===== script block 2 (from original HTML) ===== */
var tapSound=null;
try{tapSound=new Audio("click.mp3");tapSound.volume=0.5;}catch(e){tapSound=null;}

function pressOn(el){
  try{el.classList.add('is-pressed');}catch(e){}
  try{if(navigator.vibrate) navigator.vibrate(20);}catch(e){}
  if(tapSound){try{tapSound.currentTime=0;tapSound.play();}catch(e){}}
}
function pressOff(el){try{el.classList.remove('is-pressed');}catch(e){}}

(function(){
  var els=document.querySelectorAll('[data-tap]');
  for(var i=0;i<els.length;i++){
    (function(el){
      el.addEventListener('touchstart',function(){pressOn(el);},{passive:true});
      el.addEventListener('touchend',function(){pressOff(el);},{passive:true});
      // Fix: long-press can trigger context-menu/cancel without firing touchend on some Android WebViews
      el.addEventListener('touchcancel',function(){pressOff(el);},{passive:true});
      try{ el.addEventListener('pointercancel',function(){pressOff(el);},{passive:true}); }catch(_e){}
      // Clear pressed state if a context menu is opened (prevents stuck "pressed" on long press)
      el.addEventListener('contextmenu',function(e){
        try{ pressOff(el); }catch(_e){}
        try{ if(e && e.preventDefault) e.preventDefault(); }catch(_e){}
        return false;
      },{passive:false});
      el.addEventListener('mousedown',function(){pressOn(el);});
      el.addEventListener('mouseup',function(){pressOff(el);});
      el.addEventListener('mouseleave',function(){pressOff(el);});
    })(els[i]);
  }
})();

function showHomeButton(){var btn=document.getElementById('homeBtn');if(btn) btn.style.display='inline-flex';}
function hideHomeButton(){var btn=document.getElementById('homeBtn');if(btn) btn.style.display='none';}


function reviveOverlayEl(id){
  try{
    var el = document.getElementById(id);
    if(!el) return;
    // Some Android WebViews keep inline styles after "kill" hacks; clear them when reopening overlays
    el.style.display = "";
    el.style.opacity = "";
    el.style.pointerEvents = "";
  }catch(e){}
}

function openMenu(){
  try{
    var cur = null;
    try{ if(typeof getCurrentPageId === "function") cur = getCurrentPageId(); }catch(e){ cur = null; }
    var __shopBlock = ["shopHomePage","shopPage","helmetPage","glovesPage","lockPage","intercomPage","usedBikesPage"];
    if(cur && __shopBlock.indexOf(cur) !== -1) return;
    // If shop overlays are open, also block menu open to avoid hiding the cart/details UI
    if(document.body && document.body.classList.contains("shopcart-open")) return;
    var det = null; try{ det = document.getElementById("shopDetailsOverlay"); }catch(_){ det = null; }
    if(det && !det.classList.contains("hidden")) return;
    var conf = null; try{ conf = document.getElementById("shopAddConfirmOverlay"); }catch(_){ conf = null; }
    if(conf && !conf.classList.contains("hidden")) return;
  }catch(e){}
  resetMenuState();
  reviveOverlayEl('menuScrim');

  cancelEdgeShowTimer();
const backBtn = document.getElementById('menuHeaderBack');
  if (backBtn) backBtn.hidden = true;
  closePopup(true);
  document.body.classList.add('menu-open');
  try{ if(window.APP_STATE && typeof window.APP_STATE.set === 'function') window.APP_STATE.set({ menuOpen: true }); }catch(e){}
  try{ if(typeof syncAppStateFromDOM === 'function') syncAppStateFromDOM(); }catch(e){}

  var side=document.getElementById('sideMenu');
  if(side) side.setAttribute('aria-hidden','false');
  resetMenuItems();
  setTimeout(function(){animateMenuItems();},120);
  var sc=document.getElementById('menuScroll');
  if(sc) sc.scrollTop=0;

    updateEdgeHandles();
    updateEdgeHandlePositions();
    rafEdgeFollow(420);
}
function closeMenu(){  resetMenuState();

  cancelEdgeShowTimer();

if(!document.body.classList.contains('menu-open')) return;
  document.body.classList.add('menu-closing');
  document.body.classList.remove('menu-open');
  try{ if(window.APP_STATE && typeof window.APP_STATE.set === 'function') window.APP_STATE.set({ menuOpen: false, menuSection: 'main' }); }catch(e){}
  try{ if(typeof syncAppStateFromDOM === 'function') syncAppStateFromDOM(); }catch(e){}

var side=document.getElementById('sideMenu');
  if(side) side.setAttribute('aria-hidden','true');
  resetMenuItems();

  // Start the edge-handle return animation immediately when closing begins
  updateEdgeHandles();
  updateEdgeHandlePositions();
  rafEdgeFollow(420);

  setTimeout(function(){
    document.body.classList.remove('menu-closing');

    // final sync (no extra delay)
    updateEdgeHandles();
    updateEdgeHandlePositions();
  }, 400);
}
// Ensure the right-menu scrim truly blocks all interaction behind it (no event bubbling)
(function(){
  var scrim = document.getElementById('menuScrim');
  if(!scrim) return;

  // Remove inline onclick to avoid click-through edge cases; rebind safely
  try{ scrim.onclick = null; scrim.removeAttribute('onclick'); }catch(e){}

  function closeNow(e){
    if(e){
      try{ e.preventDefault(); }catch(_){}
      try{ e.stopPropagation(); }catch(_){}
      try{ if(e.stopImmediatePropagation) e.stopImmediatePropagation(); }catch(_){}
    }
    closeMenu();
  }

  // Close immediately on first touch/pointer down (no need to lift finger)
  scrim.addEventListener('pointerdown', closeNow, true);
  scrim.addEventListener('touchstart', closeNow, {passive:false, capture:true});
  scrim.addEventListener('mousedown', closeNow, true);

  // Fallback
  scrim.addEventListener('click', closeNow, true);

  // Also block all gestures from reaching the page / other listeners
  ['touchmove','touchend','pointermove','pointerup'].forEach(function(evt){
    scrim.addEventListener(evt, function(e){
      e.preventDefault();
      e.stopPropagation();
    }, {passive:false, capture:true});
  });
})();

function syncShopOnState(forcePageId){
  try{
    var pid = (forcePageId !== undefined && forcePageId !== null) ? String(forcePageId) : '';
    if(!pid){
      var active = document.querySelector('.page.active');
      pid = active ? active.id : '';
    }
    var shopPages = ['glovesPage','helmetPage','intercomPage','lockPage','usedBikesPage','shopCartPage','shopCheckoutPage'];
    var isShop = shopPages.indexOf(pid) !== -1;
    document.body.classList.toggle('shop-on', isShop);
    var isCart = (pid === 'shopCartPage' || pid === 'shopCheckoutPage');
    document.body.classList.toggle('shopcart-page', isCart);
  }catch(e){
    // fallback: never block navigation
  }
}

function openPopup(name){
  closeMenu();
  closeAllPages(true);
  closePopup(false);
  // cart icon should appear only in shop category subpages (not in the shop popup)
  if(name === 'shop') document.body.classList.remove('shop-on');
var overlay=document.getElementById(name+"Overlay");
  if(!overlay) return;
  overlay.classList.add("show");
  document.body.classList.add("popup-open");
  animatePopupItems(overlay);
}
function closePopup(removeClass){
  if(removeClass===undefined) removeClass=true;
  var overlays=document.querySelectorAll(".overlay");
  for(var i=0;i<overlays.length;i++){
    overlays[i].classList.remove("show");
    resetPopupItems(overlays[i]);
  }
  if(removeClass) document.body.classList.remove("popup-open");
  syncShopOnState();
}
// Lightweight overlay helpers (used by book-test warnings etc.)
var __scrollLockY = 0;
function __lockScrollForOverlay(){
  try{
    if(document.body.classList.contains('scroll-locked')) return;
    __scrollLockY = window.scrollY || 0;
    document.body.classList.add('scroll-locked');
    document.body.style.top = (-__scrollLockY) + 'px';
  }catch(e){}
}
function __unlockScrollForOverlay(){
  try{
    if(!document.body.classList.contains('scroll-locked')) return;
    document.body.classList.remove('scroll-locked');
    document.body.style.top = '';
    window.scrollTo(0, __scrollLockY || 0);
  }catch(e){}
}
function openOverlay(el){
  try{
    if(!el) return;
    if(typeof el === "string") el = document.getElementById(el);
    if(!el) return;
    el.classList.add("show");
    document.body.classList.add("popup-open");
    __lockScrollForOverlay();
    try{ animatePopupItems(el); }catch(e){}
  }catch(e){}
}
function closeOverlay(el){
  try{
    if(!el) return;
    if(typeof el === "string") el = document.getElementById(el);
    if(!el) return;
    el.classList.remove("show");
    try{ resetPopupItems(el); }catch(e){}
    // remove popup-open if nothing else is open
    try{
      if(!document.querySelector(".overlay.show")){
        document.body.classList.remove("popup-open");
        __unlockScrollForOverlay();
      }
    }catch(e){}
    try{ syncShopOnState(); }catch(e){}
  }catch(e){}
}

function __uiSafetyReset(){
  try{
    var body = document.body;
    // If no overlay is actually visible, ensure popup classes are cleared
    if(!document.querySelector('.overlay.show')){
      body.classList.remove('popup-open');
      __unlockScrollForOverlay();
    }
    // If no sub-page is actually visible, ensure page-open is cleared so home is clickable
    var shownPages = Array.prototype.slice.call(document.querySelectorAll('.page.show'));
    if(!shownPages || shownPages.length === 0){
      body.classList.remove('page-open');
      body.classList.remove('reveal-home');
    }
    // If manager/admin panels are not actually visible, clear stuck mode classes that hide home
    try{
      var mgr = document.getElementById('managerOverlay');
      if(body.classList.contains('manager-open')){
        var hidden = !mgr || (mgr.getAttribute('aria-hidden') === 'true');
        if(hidden){
          body.classList.remove('manager-open');
          // Clear any body fixed-lock left from manager modals
          try{
            if(document.body.getAttribute('data-bodylock') === '1'){
              document.body.removeAttribute('data-bodylock');
              document.body.style.position = '';
              document.body.style.top = '';
              document.body.style.left = '';
              document.body.style.right = '';
              try{ window.scrollTo(0, 0); }catch(e){}
            }
          }catch(e){}
        }
      }
    }catch(e){}
    try{
      var adm = document.getElementById('adminOverlay');
      if(body.classList.contains('admin-open')){
        var ah = !adm || (adm.getAttribute('aria-hidden') === 'true');
        if(ah){ body.classList.remove('admin-open'); }
      }
    }catch(e){}
    // Also clear menu locks if no menu is visible
    if(!body.classList.contains('menu-open') && !body.classList.contains('rightmenu-open')){
      // nothing
    }
  }catch(e){}
}

/* Leave Message (Info -> Contact) */
function openLeaveMessage(){
  try{
    var fn=document.getElementById('lmFirstName');
    var ln=document.getElementById('lmLastName');
    var ph=document.getElementById('lmPhone');
    var msg=document.getElementById('lmMessage');
    if(fn) fn.value='';
    if(ln) ln.value='';
    if(ph) ph.value='';
    if(msg) msg.value='';
    openOverlay('leaveMessageOverlay');
    try{ if(fn) fn.focus(); }catch(e){}
  }catch(e){}
}
function sendLeaveMessage(){
  try{
    var fn=(document.getElementById('lmFirstName')||{}).value||'';
    var ln=(document.getElementById('lmLastName')||{}).value||'';
    var ph=(document.getElementById('lmPhone')||{}).value||'';
    var msg=(document.getElementById('lmMessage')||{}).value||'';
    fn=String(fn).trim(); ln=String(ln).trim(); ph=String(ph).trim(); msg=String(msg).trim();

    if(!fn || !ln || !ph){
      alert('חובה למלא: שם, שם משפחה ומספר פלאפון');
      return;
    }

    var item={
      firstName: fn,
      lastName: ln,
      phone: ph,
      message: msg,
      createdAt: new Date().toISOString()
    };

    // If message sent by a logged-in student, keep sender id for secretary reply
    try{
      var li = (DBStorage.getItem("student_logged_in")||"") === "1";
      var su = (DBStorage.getItem("student_username")||"").trim();
      if(li && su) item.senderUser = su;
    }catch(e){}

    // Store locally (no backend in demo)
    try{
      var key='leaveMessages';
      var arr=[];
      try{ arr=JSON.parse(localStorage.getItem(key)||'[]')||[]; }catch(e){ arr=[]; }
      arr.push(item);
      localStorage.setItem(key, JSON.stringify(arr));
    }catch(e){}

    alert('ההודעה נשלחה בהצלחה');
    closeOverlay('leaveMessageOverlay');
  }catch(e){}
}



function animatePopupItems(overlay){
  // No stagger: all items fade-in together, synced with home fade-out
  var items = overlay.querySelectorAll(".popup-box .popup-item");
  if(items && items.length){
    for(var i=0;i<items.length;i++) items[i].classList.remove("pop-in");
    requestAnimationFrame(function(){
      for(var j=0;j<items.length;j++) items[j].classList.add("pop-in");
    });
    return;
  }

  var imgs = overlay.querySelectorAll(".popup-box img");
  for(var k=0;k<imgs.length;k++) imgs[k].classList.remove("pop-in");
  requestAnimationFrame(function(){
    for(var t=0;t<imgs.length;t++) imgs[t].classList.add("pop-in");
  });
}

function resetPopupItems(overlay){
  var items = overlay.querySelectorAll(".popup-box .popup-item");
  for(var i=0;i<items.length;i++) items[i].classList.remove("pop-in");
  var imgs=overlay.querySelectorAll(".popup-box img");
  for(var j=0;j<imgs.length;j++) imgs[j].classList.remove("pop-in");
}

var PAGE_STACK = [];
function __blurActiveInputs(){
  try{
    var ae = document.activeElement;
    if(ae && typeof ae.blur === "function") ae.blur();
  }catch(e){}
  try{
    var ta = document.getElementById("forumNewQuestionText");
    if(ta && typeof ta.blur === "function") ta.blur();
  }catch(e){}
}

/* ===== Global App State (v1) ===== */
(function(){
  try{
    var w = (typeof window !== "undefined") ? window : null;
    if(!w) return;

    var st = w.APP_STATE || {};
    if(st && st.__v === 1){
      w.APP_STATE = st;
    }else{
      st.__v = 1;

      function def(k, v){
        if(st[k] === undefined) st[k] = v;
      }

      def("userRole", "guest");           // guest | student | admin | manager
      def("currentPage", null);           // page id
      def("pageOpen", false);
      def("popupOpen", false);
      def("menuOpen", false);             // right menu
      def("studentMenuOpen", false);      // left menu
      def("menuSection", "main");         // main | studentInfo
      def("authOpen", false);
      def("startOpen", false);
      def("payOpen", false);
      def("shopOn", false);
      def("shopCartOpen", false);

      def("activeStudentTz", null);
      def("activeStudent", null);

      st.__listeners = st.__listeners || [];

      st.get = function(k){ return st[k]; };

      st.set = function(patch){
        if(!patch || typeof patch !== "object") return;
        var changed = false;
        for(var k in patch){
          if(!Object.prototype.hasOwnProperty.call(patch, k)) continue;
          if(st[k] !== patch[k]){
            st[k] = patch[k];
            changed = true;
          }
        }
        if(changed){
          try{
            for(var i=0;i<st.__listeners.length;i++){
              try{ st.__listeners[i](st, patch); }catch(e){}
            }
          }catch(e){}
        }
      };

      st.subscribe = function(fn){
        if(typeof fn !== "function") return function(){};
        st.__listeners.push(fn);
        return function(){
          try{
            var idx = st.__listeners.indexOf(fn);
            if(idx >= 0) st.__listeners.splice(idx, 1);
          }catch(e){}
        };
      };

      w.APP_STATE = st;
    }

    w.syncAppStateFromDOM = function(){
      try{
        var body = document.body;
        if(!body) return;

        var role = "guest";
        try{
          if(body.classList.contains("admin-open")) role = "admin";
          else if(body.classList.contains("manager-open") || body.classList.contains("manager-mode")) role = "manager";
          else{
            var u = "";
            try{ if(typeof getLoggedInUser === "function") u = String(getLoggedInUser()||""); }catch(e){ u = ""; }
            u = (u||"").trim();
            if(u && u !== "אורח") role = "student";
          }
        }catch(e){ role = "guest"; }

        var pid = null;
        try{ if(typeof getCurrentPageId === "function") pid = getCurrentPageId(); }catch(e){ pid = null; }

        try{
          w.APP_STATE.set({
            userRole: role,
            currentPage: pid,
            pageOpen: body.classList.contains("page-open"),
            popupOpen: body.classList.contains("popup-open"),
            menuOpen: body.classList.contains("menu-open") || body.classList.contains("menu-closing"),
            studentMenuOpen: body.classList.contains("student-menu-open") || body.classList.contains("student-menu-closing"),
            authOpen: body.classList.contains("auth-open"),
            startOpen: body.classList.contains("start-open"),
            payOpen: body.classList.contains("pay-open"),
            shopOn: body.classList.contains("shop-on"),
            shopCartOpen: body.classList.contains("shopcart-open")
          });
        }catch(e){}
      }catch(e){}
    };

    // Initial sync
    if(document.readyState === "loading"){
      document.addEventListener("DOMContentLoaded", function(){
        try{ w.syncAppStateFromDOM(); }catch(e){}
        try{ __uiSafetyReset(); }catch(e){}
      });
    }else{
      setTimeout(function(){ try{ w.syncAppStateFromDOM(); }catch(e){}
        try{ __uiSafetyReset(); }catch(e){} }, 0);
    }
  }catch(e){}
})();



function blurActiveElementSafe(){
  try{
    var ae = document.activeElement;
    if(!ae) return;
    var tag = (ae.tagName||'').toUpperCase();
    if(tag === 'INPUT' || tag === 'TEXTAREA' || ae.isContentEditable){
      try{ ae.blur(); }catch(e){}
    }
  }catch(e){}
}
function getCurrentPageId(){
  var cur = document.querySelector('.page.show');
  return cur ? cur.id : null;
}


function positionHomeBottomActions(){
  try{
    var ba = document.querySelector('.bottom-actions');
    if(!ba) return;
    // Keep START/SHOP locked to CSS bottom positioning (like v1 visual), never set 'top'
    ba.style.top = '';
  }catch(e){}
}

try{
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', function(){
setTimeout(function(){
}, 150);
      setTimeout(function(){
}, 600);
    });
  }else{
    setTimeout(function(){
}, 0);
    setTimeout(function(){
}, 150);
    setTimeout(function(){
}, 600);
  }
  window.addEventListener('load', function(){
});
  window.addEventListener('resize', function(){
});
}catch(e){}


function openPage(pageId, pushToStack){
  if(pushToStack === undefined) pushToStack = true;

  // אם התפריט פתוח – סוגרים אותו, אבל לא סוגרים את הסאב-פייג'ים בפתיחת התפריט.
  closeMenu();
  closePopup(true);
  try{ __blurActiveInputs(); }catch(e){}

  try{
    if(window.APP_STATE && typeof window.APP_STATE.set === 'function') window.APP_STATE.set({ currentPage: pageId, pageOpen: true });
    else if(window.APP_STATE){ window.APP_STATE.currentPage = pageId; window.APP_STATE.pageOpen = true; }
  }catch(e){}

  var currentId = getCurrentPageId();
  // Never keep a sub-page under another sub-page:
  // if a page is already open, opening another replaces it (no back stack).
  if(currentId && currentId !== pageId){
    try{ if(PAGE_STACK) PAGE_STACK.length = 0; }catch(e){}
    pushToStack = false;
  }

  if(currentId && currentId !== pageId && pushToStack){
    PAGE_STACK.push(currentId);
  }

  // לא סוגרים "הכל" כדי לא לשבור אנימציות, רק מסתירים את שאר הדפים
  var pages = document.querySelectorAll('.page');
  for(var i=0;i<pages.length;i++){
    pages[i].classList.remove('show');
  }

  var page = document.getElementById(pageId);
  if(!page) return;

  // reset any leftover inline styles from drag-close (prevents bounce/glitches)
  try{
    page.classList.remove('closing-down');
    page.style.transition = '';
    page.style.transform = '';
    page.style.opacity = '';
    page.style.visibility = '';
    page.style.pointerEvents = '';
  }catch(e){}

  page.classList.add('show');
  try{ ensureCloseSliderOnPage(page); }catch(e){}
  document.body.classList.add('page-open');
  syncShopOnState(pageId);
  try{ if(typeof syncAppStateFromDOM === 'function') syncAppStateFromDOM(); }catch(e){}
  
  try{
    document.dispatchEvent(new CustomEvent("app:pageopen",{detail:{pageId:pageId}}));
  }catch(e){}
try{ updateEdgeHandles(); }catch(e){}
  showHomeButton();

  // Ensure the inner scroll starts at the top (prevents clipped header on open)
  try{
    var inner = page.querySelector('.page-inner');
    if(inner){
      try{ inner.scrollTop = 0; }catch(e){}
      try{ if(inner.scrollTo) inner.scrollTo(0,0); }catch(e){}
      requestAnimationFrame(function(){
        try{ inner.scrollTop = 0; }catch(e){}
        try{ if(inner.scrollTo) inner.scrollTo(0,0); }catch(e){}
      });
    }
  }catch(e){}

  // Populate student profile when opening
  if(pageId === 'studentProfilePage'){
    try{ if(typeof window.renderStudentProfile === 'function') window.renderStudentProfile(); }catch(e){}
  }

  if(pageId === 'timerPage'){
    



setTimeout(function(){ try{ timerEnsureInit(); }catch(e){} },0);

/* Add labels under popup icons (from img alt) */
(function(){
  function wrapOverlay(overlay){
    var box = overlay.querySelector('.popup-box');
    if(!box) return;
    // wrap only direct img children
    var imgs = Array.prototype.slice.call(box.children).filter(function(ch){ return ch && ch.tagName === 'IMG'; });
    for(var i=0;i<imgs.length;i++){
      var img = imgs[i];
      if(img.parentElement && img.parentElement.classList && img.parentElement.classList.contains('popup-item')) continue;

      var wrap = document.createElement('div');
      wrap.className = 'popup-item';

      var label = document.createElement('div');
      label.className = 'popup-label';
      label.textContent = (img.getAttribute('alt') || '').trim();

      // keep inline cursor styles & onclick on img
      box.insertBefore(wrap, img);
      wrap.appendChild(img);
      if(label.textContent) wrap.appendChild(label);
    }
  }

  function run(){
    var overlays = document.querySelectorAll('.overlay');
    for(var i=0;i<overlays.length;i++) wrapOverlay(overlays[i]);
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
})();

    timerRender();
  }
}

function closeAllPages(hideBtn){
  if(hideBtn === undefined) hideBtn = true;
  try{ __blurActiveInputs(); }catch(e){}

  var pages = document.querySelectorAll('.page');
  for(var i=0;i<pages.length;i++){
    pages[i].classList.remove('show');
  }
  document.body.classList.remove('page-open');
  document.body.classList.remove('reveal-home');
  document.body.classList.remove('shop-on');
  try{
    if(window.APP_STATE && typeof window.APP_STATE.set === 'function') window.APP_STATE.set({ currentPage: null, pageOpen: false });
    else if(window.APP_STATE){ window.APP_STATE.currentPage = null; window.APP_STATE.pageOpen = false; }
  }catch(e){}
  try{ closeShopCart(true); }catch(e){}

  try{ updateEdgeHandles(); }catch(e){}
  try{ if(typeof syncAppStateFromDOM === 'function') syncAppStateFromDOM(); }catch(e){}
  if(hideBtn) hideHomeButton();

  if(hideBtn){
    PAGE_STACK = [];
  }
  // If admin forum mode was active, restore the admin overlay state
  try{
    if(document.body && document.body.classList && document.body.classList.contains('admin-forum-mode')){
      if(typeof __adminExitForumMode === 'function') __adminExitForumMode();
      else document.body.classList.remove('admin-forum-mode');
    }
  }catch(e){}

}

function goBackStep(){
  // סגירת סאב-פייג' = חזרה לדף הקודם (אם קיים), אחרת חזרה לבית
  try{ closeMenu(); }catch(e){}
  try{ closePopup(true); }catch(e){}
  try{ __blurActiveInputs(); }catch(e){}

  var wasAdminForum = false;
  try{ wasAdminForum = document.body.classList.contains('admin-forum-mode'); }catch(e){}

  // go back by stack (prevents blank screen after closing a sub-page)
  try{
    if(PAGE_STACK && PAGE_STACK.length){
      var prev = PAGE_STACK.pop();
      openPage(prev, false);
    }else{
      closeAllPages(true);
    }
  }catch(e){
    try{ closeAllPages(true); }catch(e2){}
  }

  if(wasAdminForum){
    try{ if(typeof __adminExitForumMode === 'function') __adminExitForumMode(); }catch(e){}
  }
}


function openMotoLocation(){window.open("https://www.google.com/maps?q=31.747240,35.209516","_blank");}
function openCarLocation(){window.open("https://www.google.com/maps?q=31.748651,35.214261","_blank");}
function openGreenForm(){window.open("https://govforms.gov.il/mw/forms/RishumTheory@mot.gov.il","_blank");}

function callCars(){window.location.href="tel:0773234451";}
function callMotorcycles(){window.location.href="tel:0548151477";}

function openWhatsApp(){
  // ברירת מחדל: וואטסאפ לאופנועים
  window.open("https://wa.me/972548151477", "_blank");
}

function resetMenuItems(){
  var items=document.querySelectorAll('#sideMenu .menu-item');
  for(var i=0;i<items.length;i++) items[i].classList.remove('menu-in');
}
function animateMenuItems(){
  var items=document.querySelectorAll('#sideMenu .menu-item');
  resetMenuItems();
  for(var i=0;i<items.length;i++){
    (function(btn,idx){
      setTimeout(function(){btn.classList.add('menu-in');},100*idx);
    })(items[i],i);
  }
}

(function(){
  // Right side menu: open behavior should match the left profile menu.
  // We allow a short swipe-in gesture from the RIGHT edge, then open fully (no draggable partial-open).
  var side = document.getElementById('sideMenu');
  if(!side) return;

  var tracking = false;
  var startX = 0, startY = 0;

  function canSwipeOpenRight(){
    // Disable right-menu swipe if the student menu is open or auth overlay is open
    if(document.body.classList.contains('student-menu-open') || document.body.classList.contains('auth-open')) return false;

    // Block right-menu swipe-open inside shop pages (prevents cart/details from disappearing)
    try{
      var cur = null;
      try{ if(typeof getCurrentPageId === "function") cur = getCurrentPageId(); }catch(e){ cur = null; }
      var __shopBlock = ["shopHomePage","shopPage","helmetPage","glovesPage","lockPage","intercomPage","usedBikesPage","shopCartPage","shopCheckoutPage","shopGatewayPage"];
      if((document.body && document.body.classList && document.body.classList.contains("shop-on")) || (cur && __shopBlock.indexOf(cur) !== -1)){
        return false;
      }
    }catch(e){}

    // Already open? no need
    if(document.body.classList.contains('menu-open') || document.body.classList.contains('menu-opening')) return false;

    return true;
  }

  // Swipe open from right 10%
  document.addEventListener('touchstart', function(e){
    if(!canSwipeOpenRight()) return;
    if(!e.touches || !e.touches[0]) return;

    var t = e.touches[0];
    var edge = window.innerWidth * 0.90; // right 10%
    if(t.clientX < edge) return;

    tracking = true;
    startX = t.clientX;
    startY = t.clientY;
  }, {passive:true});

  document.addEventListener('touchmove', function(e){
    if(!tracking) return;
    if(!e.touches || !e.touches[0]) return;

    var t = e.touches[0];
    var dx = t.clientX - startX; // swipe left => negative
    var dy = t.clientY - startY;

    // too vertical => cancel
    if(Math.abs(dy) > 42){
      tracking = false;
      return;
    }

    // small swipe (like left menu) => open fully
    if(dx < -60){
      tracking = false;
      try{ openMenu(); }catch(err){}
    }
  }, {passive:true});

  document.addEventListener('touchend', function(){ tracking = false; }, {passive:true});
  document.addEventListener('touchcancel', function(){ tracking = false; }, {passive:true});
})();

/* Swipe-down close for right menu: removed */

function ensureCloseSliderOnPage(page){
  if(page._closeSliderBound) return;
  page._closeSliderBound = true;

  // Scroll happens inside .page-inner (not on .page)
  var scrollEl = page.querySelector('.page-inner') || page;

  var startY = 0;
  var active = false;
  var dragging = false;
  var lastDy = 0;

  function thresholdPx(){ return Math.round(window.innerHeight * 0.40); } // ✅ 40%

  function canStart(){
    try{ return (scrollEl.scrollTop <= 0); }catch(e){ return true; }
  }

  function onStart(y){
    if(!page.classList.contains('show')) return;
    if(!canStart()){ active = false; dragging = false; lastDy = 0; return; }
    startY = y;
    active = true;
    dragging = false;
    lastDy = 0;
    page.classList.add('dragging-close');
    page.style.transition = 'none';
    try{ document.body.classList.remove('reveal-home'); }catch(e){}
    page.style.opacity = '1';
  }

  function revealHome(dy){
    try{
      var H = window.innerHeight || document.documentElement.clientHeight || 800;
      setHomeRevealByDy(dy, H);
    }catch(e){}
  }

  function onMove(y, ev){
    if(!active) return;

    var dy = y - startY;

    // ✅ אם המשתמש גורר למעלה/או עדיין בתוך תנועת גלילה רגילה – לא חוסמים
    if(dy <= 8){
      revealHome(0);
      return;
    }

    dragging = true;
    lastDy = dy;

    if(ev && ev.cancelable) ev.preventDefault();
    page.style.transform = 'translateY(' + dy + 'px)';
    revealHome(dy);
  }

  function onEnd(){
    if(!active) return;
    active = false;

    page.classList.remove('dragging-close');

    var commitClose = (dragging && lastDy >= thresholdPx());

    if(commitClose){
      // ✅ no spring: continue down from current position and close
      var endY = Math.round(window.innerHeight + 80);
      var revealAt = (window.innerHeight * 0.50); // bottom 50%

      // Slide down only (no fade, no spring)
      page.style.transition = 'transform 220ms ease-out';
      page.style.opacity = '1';
      // keep current position
      page.style.transform = 'translateY(' + lastDy + 'px)';
      try{ page.getBoundingClientRect(); }catch(e){}
      // Show home icons when the page enters the bottom 50% during the closing slide
      (function(){
        try{
          if(lastDy >= revealAt){
            document.body.classList.add('reveal-home');
            return;
          }
          // Delay reveal until the transform passes the threshold (approx.)
          document.body.classList.remove('reveal-home');
          var dur = 220;
          var denom = (endY - lastDy);
          var p = denom > 1 ? ((revealAt - lastDy) / denom) : 0;
          if(p < 0) p = 0;
          if(p > 1) p = 1;
          var t = Math.round(dur * p);
          setTimeout(function(){
            try{ document.body.classList.add('reveal-home'); }catch(e){}
          }, t);
        }catch(e){}
      })();
      // continue down and close
      page.style.transform = 'translateY(' + endY + 'px)';

      var done = false;
      var cleanup = function(){
        if(done) return;
        done = true;
        try{ page.removeEventListener('transitionend', cleanup); }catch(e){}
        // hide instantly while already offscreen, then close (prevents any bounce flash)
        try{
          page.style.transition = 'none';
          page.style.opacity = '0';
        }catch(e){}
        try{ goBackStep(); }catch(e){ try{ closeAllPages(true); }catch(e2){} }
        // reset styles without triggering transitions
        try{
          page.style.transform = '';
          page.style.opacity = '';
        }catch(e){}
        requestAnimationFrame(function(){
          try{ page.style.transition = ''; }catch(e){}
        });
      };
      page.addEventListener('transitionend', cleanup);
      setTimeout(cleanup, 260);
    }else{
      // ✅ return back smoothly
      try{ document.body.classList.remove('reveal-home'); }catch(e){}
      page.style.transition = 'transform 180ms ease-out';
      page.style.transform = 'translateY(0px)';

      var done2 = false;
      var cleanup2 = function(){
        if(done2) return;
        done2 = true;
        try{ page.removeEventListener('transitionend', cleanup2); }catch(e){}
        page.style.transition = '';
        page.style.transform = '';
        page.style.opacity = '';
      };
      page.addEventListener('transitionend', cleanup2);
      setTimeout(cleanup2, 240);
    }

    dragging = false;
    lastDy = 0;
  }

  // ✅ מאזינים על אזור הגלילה כדי לדעת אם אפשר להתחיל סגירה
  scrollEl.addEventListener('touchstart', function(e){
    if(e.touches && e.touches.length===1) onStart(e.touches[0].clientY);
  }, {passive:true});

  scrollEl.addEventListener('touchmove', function(e){
    if(e.touches && e.touches.length===1) onMove(e.touches[0].clientY, e);
  }, {passive:false});

  scrollEl.addEventListener('touchend', function(){ onEnd(); }, {passive:true});
  scrollEl.addEventListener('touchcancel', function(){ onEnd(); }, {passive:true});

  // Mouse (desktop)
  scrollEl.addEventListener('mousedown', function(e){ onStart(e.clientY); });
  document.addEventListener('mousemove', function(e){ onMove(e.clientY, e); });
  document.addEventListener('mouseup', function(){ onEnd(); });
}

// === Top buttons fade sync (HOME vs PROFILE) ===
// Rule: as soon as a sub-page starts moving down, for every 1% the page moves down
// home button fades out 1% (100->0) and profile button fades in 1% (0->100).
// Implemented as a read-only watcher on the active .page.show transform.
(function(){
  var _raf = 0;
  var _lastProgress = -1;

  function clamp01(x){
    x = Number(x);
    if(!isFinite(x)) x = 0;
    if(x < 0) x = 0;
    if(x > 1) x = 1;
    return x;
  }

  function getTranslateY(el){
    try{
      var cs = window.getComputedStyle(el);
      var tr = cs && cs.transform ? cs.transform : '';
      if(!tr || tr === 'none') return 0;

      // matrix(a,b,c,d,tx,ty)
      var m2 = tr.match(/^matrix\(([^)]+)\)$/);
      if(m2 && m2[1]){
        var parts = m2[1].split(',').map(function(s){ return parseFloat(s.trim()); });
        return parts.length >= 6 ? (parts[5] || 0) : 0;
      }

      // matrix3d(..., ty, ...)
      var m3 = tr.match(/^matrix3d\(([^)]+)\)$/);
      if(m3 && m3[1]){
        var p3 = m3[1].split(',').map(function(s){ return parseFloat(s.trim()); });
        return p3.length >= 16 ? (p3[13] || 0) : 0;
      }
    }catch(e){}
    return 0;
  }

  function apply(progress){
    var hb = document.getElementById('homeBtn');
    var pb = document.getElementById('profileBtn');
    if(!hb || !pb) return;

    // Smooth fade between HOME and PROFILE
    try{ if(!hb.style.transition) hb.style.transition = 'opacity 180ms ease'; }catch(e){}
    try{ if(!pb.style.transition) pb.style.transition = 'opacity 180ms ease'; }catch(e){}

    var homeOp = String(1 - progress);
    var profOp = String(progress);

    try{ hb.style.opacity = homeOp; }catch(e){}
    try{ pb.style.opacity = profOp; }catch(e){}

    // Prevent invisible button from intercepting taps
    try{ hb.style.pointerEvents = (progress >= 0.98) ? 'none' : 'auto'; }catch(e){}
    try{ pb.style.pointerEvents = (progress <= 0.02) ? 'none' : 'auto'; }catch(e){}
  }

  function reset(){
    var hb = document.getElementById('homeBtn');
    var pb = document.getElementById('profileBtn');
    if(hb){
      try{ hb.style.opacity = ''; }catch(e){}
      try{ hb.style.transition = ''; }catch(e){}
      try{ hb.style.pointerEvents = ''; }catch(e){}
    }
    if(pb){
      try{ pb.style.opacity = ''; }catch(e){}
      try{ pb.style.transition = ''; }catch(e){}
      try{ pb.style.pointerEvents = ''; }catch(e){}
    }
  }

  function tick(){
    _raf = requestAnimationFrame(tick);

    // Only while a sub-page is open
    if(!document.body.classList.contains('page-open')){
      if(_lastProgress !== -1){
        _lastProgress = -1;
        reset();
      }
      return;
    }

    var page = document.querySelector('.page.show');
    if(!page){
      if(_lastProgress !== -1){
        _lastProgress = -1;
        reset();
      }
      return;
    }

    var H = (window.innerHeight || document.documentElement.clientHeight || 800);
    var ty = getTranslateY(page);
    var progress = clamp01(ty / H);

    // Update only when changed meaningfully
    if(Math.abs(progress - _lastProgress) >= 0.005){
      _lastProgress = progress;
      apply(progress);
    }
  }

  function start(){
    if(_raf) return;
    _raf = requestAnimationFrame(tick);
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
var TIMER={
  inited:false,
  activeUser:"",
  lessons:1,
  secondsLeft:40*60,
  running:false,
  endAtMs:0,
  tickId:null,
  alarmOn:false,
  vibrateId:null,
  audioCtx:null,
  alarmOsc:null,
  alarmGain:null,
  alarmPulseId:null,
  wakeLockSentinel:null,
  wakeLockWanted:false,
  session:null,
  lastSavedAt:0,
  stateLoaded:false
};

function timerLSGet(key, fallback){
  try{
    var raw=DBStorage.getItem(key);
    if(!raw) return fallback;
    return JSON.parse(raw);
  }catch(e){ return fallback; }
}
function timerLSSet(key, obj){
  try{ DBStorage.setItem(key, JSON.stringify(obj)); }catch(e){}
}
function timerLSDel(key){
  try{
    if(key==null || String(key).trim()==="") return;
    DBStorage.removeItem(String(key));
  }catch(e){}
}

/* ===== Timer per-profile binding (v1) ===== */
function timerIsLoggedIn(){
  try{ return (DBStorage.getItem("student_logged_in")||"") === "1" && !!timerGetStudentUsername(); }catch(e){ return false; }
}

function timerSnapshot(){
  return {
    v: 2,
    user: timerActiveUser() || "",
    lessons: TIMER.lessons,
    secondsLeft: TIMER.secondsLeft,
    running: !!TIMER.running,
    endAtMs: TIMER.endAtMs || 0,
    alarmOn: !!TIMER.alarmOn,
    session: TIMER.session || null
  };
}

function timerSaveStateToUser(u){
  u = (u==null?"":String(u)).trim();
  if(!u) return;
  try{
    // keep secondsLeft accurate when running
    if(TIMER.running && TIMER.endAtMs){
      var msLeft = TIMER.endAtMs - Date.now();
      var sLeft = Math.ceil(msLeft/1000);
      if(sLeft < 0) sLeft = 0;
      TIMER.secondsLeft = sLeft;
    }
  }catch(e){}
  try{ timerLSSet(timerStateKeyForUser(u), timerSnapshot()); }catch(e){}
}

function timerResetRuntimeToDefault(){
  try{
    if(TIMER.tickId){ clearInterval(TIMER.tickId); TIMER.tickId=null; }
  }catch(e){}
  try{ timerReleaseWakeLock(); }catch(e){}
  try{ timerStopAlarm(); }catch(e){}
  TIMER.running=false;
  TIMER.endAtMs=0;
  TIMER.alarmOn=false;
  TIMER.session=null;
  TIMER.lessons=1;
  TIMER.secondsLeft=40*60;
  TIMER.lastSavedAt=0;
  TIMER.stateLoaded=false;
}

function timerLoadStateForUser(u, opts){
  opts = opts || {};
  u = (u==null?"":String(u)).trim();
  if(!u) return;

  // If switching user, detach current runtime (without overwriting storage)
  if(TIMER.activeUser && TIMER.activeUser !== u){
    try{ timerSaveStateToUser(TIMER.activeUser); }catch(e){}
    timerResetRuntimeToDefault();
  }

  TIMER.activeUser = u;

  // Load alert prefs for this user
  try{ timerLoadPrefsForUser(u); }catch(e){}
  try{ timerApplyPrefsToUI(); }catch(e){}

  // Load state
  var key = timerStateKeyForUser(u);
  var st = timerLSGet(key, null);

  // Migration from older single-key storage
  if(!st){
    var old = timerLSGet("timer_state_v1", null);
    if(old && typeof old === "object"){
      // If old has a user, respect it. Otherwise, assume current user.
      try{
        var oldUser = (old.user || (old.session && old.session.user) || "").trim();
        if(!oldUser || oldUser === u){
          timerLSSet(key, old);
          timerLSDel("timer_state_v1");
          st = old;
        }
      }catch(e){}
    }
  }

  // Apply loaded state
  if(st && typeof st === "object"){
    if(Number.isFinite(+st.lessons) && +st.lessons>0) TIMER.lessons = Math.max(0.5, Math.min(20, timerSnapHalf(+st.lessons)));
    if(Number.isFinite(+st.secondsLeft) && +st.secondsLeft>=0) TIMER.secondsLeft = (+st.secondsLeft|0);
    TIMER.endAtMs = Number.isFinite(+st.endAtMs) ? (+st.endAtMs) : 0;
    TIMER.running = !!st.running;
    TIMER.session = (st.session && typeof st.session === "object") ? st.session : null;
  }else{
    // default
    TIMER.lessons = 1;
    TIMER.secondsLeft = 40*60;
    TIMER.running = false;
    TIMER.endAtMs = 0;
    TIMER.session = null;
  }

  TIMER.stateLoaded = true;

  // Recompute if running
  if(TIMER.running && TIMER.endAtMs){
    var msLeft2 = TIMER.endAtMs - Date.now();
    var sLeft2 = Math.ceil(msLeft2/1000);
    if(sLeft2 < 0) sLeft2 = 0;
    TIMER.secondsLeft = sLeft2;

    if(sLeft2 <= 0){
      TIMER.running = false;
      TIMER.secondsLeft = 0;
      try{ if(TIMER.tickId){ clearInterval(TIMER.tickId); TIMER.tickId=null; } }catch(e){}
      try{ timerReleaseWakeLock(); }catch(e){}
      // Only alert when user is logged-in (prevents guest vibrations)
      if(timerIsLoggedIn()){
        try{ timerTimeUp(true); }catch(e){}
      }
      try{ timerSaveState(true); }catch(e){}
      return;
    }

    try{ if(TIMER.tickId) clearInterval(TIMER.tickId); }catch(e){}
    TIMER.tickId = setInterval(timerTick, 250);
    try{ timerAcquireWakeLock(); }catch(e){}
  }else{
    try{ if(TIMER.tickId){ clearInterval(TIMER.tickId); TIMER.tickId=null; } }catch(e){}
    try{ timerReleaseWakeLock(); }catch(e){}
  }
}

window.timerHandleLogin = function(username){
  try{
    var u = (username==null?"":String(username)).trim();
    if(!u) return;
    timerEnsureInit();
    timerLoadStateForUser(u);
    timerRender();
  }catch(e){}
};

window.timerHandleLogout = function(prevUsername){
  try{
    var u = (prevUsername==null?"":String(prevUsername)).trim() || timerActiveUser();
    if(u && TIMER.activeUser === u){
      try{ timerSaveStateToUser(u); }catch(e){}
    }
  }catch(e){}
  // Stop runtime + hide visuals (do NOT overwrite saved per-user state)
  try{
    if(TIMER.tickId){ clearInterval(TIMER.tickId); TIMER.tickId=null; }
  }catch(e){}
  try{ timerReleaseWakeLock(); }catch(e){}
  try{ timerStopAlarm(); }catch(e){}
  TIMER.activeUser = "";
  TIMER.running = false;
  TIMER.endAtMs = 0;
  TIMER.session = null;
  TIMER.stateLoaded = false;
  TIMER.lessons = 1;
  TIMER.secondsLeft = 40*60;
  try{ homeDigitalTimerUpdate(); }catch(e){}
};
function timerGetStudentUsername(){
  try{
    // Only treat as active when actually logged-in
    if((DBStorage.getItem("student_logged_in")||"") !== "1") return "";
    return (DBStorage.getItem("student_username")||"").trim();
  }catch(e){ return ""; }
}
function timerActiveUser(){
  try{ return (TIMER && TIMER.activeUser) ? String(TIMER.activeUser||"") : ""; }catch(e){ return ""; }
}
function timerStateKeyForUser(u){
  u = (u==null ? "" : String(u)).trim();
  return u ? ("timer_state_v1_" + u) : null;
}
function timerStateKey(){
  return timerStateKeyForUser(timerActiveUser() || timerGetStudentUsername());
}

/* ===== Timer alert prefs (sound/vibration) v2 ===== */
function timerPrefsKeyForUser(u){
  u = (u==null ? "" : String(u)).trim();
  return u ? ("timer_prefs_v1_" + u) : null;
}
function timerDefaultPrefs(){
  return { sound:"beep", volume:70, vibeStyle:"classic", vibePower:70 };
}
function timerNormalizePrefs(p){
  if(!p || typeof p!=="object") p = timerDefaultPrefs();
  if(typeof p.sound!=="string") p.sound = "beep";
  if(typeof p.vibeStyle!=="string") p.vibeStyle = "classic";
  p.volume = Math.max(0, Math.min(100, parseInt(p.volume,10)||0));
  p.vibePower = Math.max(0, Math.min(100, parseInt(p.vibePower,10)||0));
  // Guard values
    var okSound = {"beep":1,"bell":1,"alarm":1,"low":1,"siren":1,"mute":1};
  if(!okSound[p.sound]) p.sound="beep";
    var okV = {"classic":1,"short":1,"long":1,"double":1,"sos":1,"steady":1,"off":1};
  if(!okV[p.vibeStyle]) p.vibeStyle="classic";
  // Map legacy values to new UX (no "mute/off" in pickers)
  if(p.sound==="siren") p.sound="alarm";
  if(p.sound==="mute"){ p.volume = 0; p.sound="beep"; }
  if(p.vibeStyle==="off"){ p.vibePower = 0; p.vibeStyle="classic"; }
return p;
}
function timerLoadPrefsForUser(u){
  u = (u==null ? "" : String(u)).trim();
  var key = timerPrefsKeyForUser(u);
  var p = key ? timerLSGet(key, null) : null;
  p = timerNormalizePrefs(p);
  TIMER.prefs = p;
  return p;
}
function timerSavePrefsForUser(u, p){
  u = (u==null ? "" : String(u)).trim();
  var key = timerPrefsKeyForUser(u);
  if(!key) return;
  p = timerNormalizePrefs(p);
  timerLSSet(key, p);
  TIMER.prefs = p;
}
function timerPrefs(){
  try{
    var u = timerActiveUser() || timerGetStudentUsername();
    if(!TIMER.prefs) return timerLoadPrefsForUser(u);
    return TIMER.prefs;
  }catch(e){
    return timerDefaultPrefs();
  }
}
function timerAlarmPeakFromVolume(vol0to100){
  var v = Math.max(0, Math.min(100, parseInt(vol0to100,10)||0)) / 100;
  // 0..1.0
    return Math.max(0.0, Math.min(1.0, v));
}
function timerScalePattern(pat, scalePulse){
  try{
    var out=[];
    for(var i=0;i<pat.length;i++){
      var ms=+pat[i]||0;
      if(i%2===0){ // pulse
        ms = Math.round(ms * scalePulse);
      }
      ms = Math.max(30, Math.min(2500, ms));
      out.push(ms);
    }
    return out;
  }catch(e){ return pat; }
}
function timerVibeBasePattern(style){
  switch(String(style||"classic")){
    case "short": return [160,120,160,120,220];
    case "long": return [420,220,520,260,700];
    case "double": return [220,120,220,320,220];
    case "sos": return [150,120,150,120,150,220,420,180,420,180,420,220,150,120,150,120,150];
    case "steady": return [900,250];
    case "off": return [];
    default: return [400,200,400,200,600,250,600,250,800];
  }
}
function timerVibePattern(style, power0to100){
  var p = Math.max(0, Math.min(100, parseInt(power0to100,10)||0));
  if(style==="off" || p===0) return [];
  // scale pulses between 0.6..1.6
  var s = 0.6 + (p/100)*1.0;
  return timerScalePattern(timerVibeBasePattern(style), s);
}
function timerVibeRepeatMs(style, power0to100){
  var p = Math.max(0, Math.min(100, parseInt(power0to100,10)||0));
  if(style==="off" || p===0) return 999999;
  var base = 2200;
  if(style==="short") base = 1700;
  if(style==="long") base = 2600;
  if(style==="double") base = 1900;
  if(style==="sos") base = 3200;
  if(style==="steady") base = 1400;
  // higher power repeats a bit faster
  var k = 1.0 - (p/100)*0.30;
  return Math.max(900, Math.round(base * k));
}
function timerApplyPrefsToUI(){
  try{
    var p = timerPrefs();
    var soundSel=document.getElementById('timerSoundSelect');
    var volRange=document.getElementById('timerVolumeRange');
    var volVal=document.getElementById('timerVolumeVal');
    var vibSel=document.getElementById('timerVibeStyleSelect');
    var vibRange=document.getElementById('timerVibePowerRange');
    var vibVal=document.getElementById('timerVibePowerVal');

    

  var testBtn=document.getElementById('timerTestAlertBtn');
if(soundSel) soundSel.value = p.sound || "beep";
    if(volRange) volRange.value = String(p.volume!=null ? p.volume : 70);
    if(volVal) volVal.textContent = String((p.volume!=null ? p.volume : 70)) + "%";
    if(vibSel) vibSel.value = p.vibeStyle || "classic";
    if(vibRange) vibRange.value = String(p.vibePower!=null ? p.vibePower : 70);
    if(vibVal) vibVal.textContent = String((p.vibePower!=null ? p.vibePower : 70)) + "%";
  
    try{ timerUpdatePickerButtons(); }catch(e){}
}catch(e){}
}

/* ===== TIMER PICKER (custom) ===== */
function timerUpdatePickerButtons(){
  try{
    var soundSel=document.getElementById('timerSoundSelect');
    var soundBtn=document.getElementById('timerSoundBtn');
    if(soundSel && soundBtn){
      var o = soundSel.options && soundSel.options[soundSel.selectedIndex];
      soundBtn.textContent = (o && o.textContent) ? o.textContent : "בחר";
    }
    var vibSel=document.getElementById('timerVibeStyleSelect');
    var vibBtn=document.getElementById('timerVibeStyleBtn');
    if(vibSel && vibBtn){
      var o2 = vibSel.options && vibSel.options[vibSel.selectedIndex];
      vibBtn.textContent = (o2 && o2.textContent) ? o2.textContent : "בחר";
    }
  }catch(e){}
}

(function(){
  var state = { selectEl:null, titleEl:null, listEl:null };
  function qs(id){ try{ return document.getElementById(id);}catch(e){ return null; } }
  function closePicker(){
    try{
      document.body.classList.remove('ts-picker-open');
      var ov = qs('tsPickerOverlay');
      if(ov) ov.setAttribute('aria-hidden','true');
      window.__tsPickerOpen = false;
    }catch(e){}
  }
  function openPicker(selectEl, title){
    if(!selectEl) return;
    try{
      // cancel any pull-down drag state (prevents header/handle glitches)
      try{ dragging=false; active=null; }catch(_){}
      window.__tsPickerOpen = true;

      var ov = qs('tsPickerOverlay');
      var titleEl = qs('tsPickerTitle');
      var listEl = qs('tsPickerList');
      if(!ov || !titleEl || !listEl) return;

      document.body.classList.add('ts-picker-open');
      ov.setAttribute('aria-hidden','false');

      titleEl.textContent = title || "בחר";
      listEl.innerHTML = '';

      var cur = selectEl.value;

      for(var i=0;i<selectEl.options.length;i++){
        (function(opt){
          var btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'ts-picker-item tap';
          btn.setAttribute('data-tap','');
          if(opt.value === cur) btn.classList.add('selected');

          var lbl = document.createElement('div');
          lbl.className = 'ts-pi-label';
          lbl.textContent = opt.textContent || opt.value;

          var chk = document.createElement('div');
          chk.className = 'ts-pi-check';

          btn.appendChild(lbl);
          btn.appendChild(chk);
          // Click handler (keep scroll smooth inside picker list)
          btn.addEventListener('click', function(){
            try{
              selectEl.value = opt.value;
              try{ selectEl.dispatchEvent(new Event('change',{bubbles:true})); }catch(e2){
                var ev = document.createEvent('Event'); ev.initEvent('change', true, true); selectEl.dispatchEvent(ev);
              }
              timerUpdatePickerButtons();
            }catch(e3){}
            closePicker();
          });
listEl.appendChild(btn);
        })(selectEl.options[i]);
      }
    }catch(e){}
  }

  // expose for timer init
  window.__timerOpenPicker = openPicker;
  window.__timerClosePicker = closePicker;

  // close handlers (install after DOM is ready)
  function installCloseHandlers(){
    try{
      var ov = qs('tsPickerOverlay');
      if(ov && !ov.__tsBound){
        ov.__tsBound = true;
        ov.addEventListener('click', function(){ closePicker(); }, {passive:true});
        ov.addEventListener('touchstart', function(e){ /* capture */ }, {passive:true});
      }
      var c = qs('tsPickerCloseBtn');
      if(c && !c.__tsBound){
        c.__tsBound = true;
        var fn = function(e){
          try{ if(e){ e.preventDefault(); e.stopPropagation(); } }catch(_){ }
          closePicker();
        };
        c.addEventListener('click', fn, {passive:false});
        c.addEventListener('touchend', fn, {passive:false});
        c.addEventListener('pointerup', fn, {passive:false});
      }
    }catch(e){}
  }
  try{
    if(document.readyState === 'loading'){
      document.addEventListener('DOMContentLoaded', installCloseHandlers, {once:true});
    }else{
      installCloseHandlers();
    }
  }catch(e){}
})();


function timerRestartAlarmWithPrefs(){
  try{
    if(!TIMER.alarmOn) return;
    timerStopAlarm();
    timerStartAlarm();
  }catch(e){}
}

function timerThrottleSave(force){
  var now=Date.now();
  if(force) return true;
  if(!TIMER.lastSavedAt) return true;
  return (now - TIMER.lastSavedAt) > 900;
}

function timerSaveState(force){
  if(!timerActiveUser()) return;
  if(!timerThrottleSave(!!force)) return;
  TIMER.lastSavedAt=Date.now();
  try{ timerSaveStateToUser(timerActiveUser()); }catch(e){}
}

function timerLoadState(){
  var u = timerGetStudentUsername();
  if(!u) return;
  timerLoadStateForUser(u);
}

function timerClearState(){
  var k = timerStateKey();
  if(!k) return;
  timerLSDel(k);
}

async function timerAcquireWakeLock(){
  try{
    if(!TIMER.running) return;
    if(!('wakeLock' in navigator)) return;
    TIMER.wakeLockWanted=true;
    if(TIMER.wakeLockSentinel) return;
    TIMER.wakeLockSentinel = await navigator.wakeLock.request('screen');
    try{
      TIMER.wakeLockSentinel.addEventListener('release', function(){
        TIMER.wakeLockSentinel=null;
      });
    }catch(e){}
  }catch(e){
    TIMER.wakeLockSentinel=null;
  }
}

function timerReleaseWakeLock(){
  TIMER.wakeLockWanted=false;
  try{
    if(TIMER.wakeLockSentinel && typeof TIMER.wakeLockSentinel.release==="function"){
      TIMER.wakeLockSentinel.release();
    }
  }catch(e){}
  TIMER.wakeLockSentinel=null;
}

function timerSessionEnsure(){
  if(TIMER.session && typeof TIMER.session==="object" && !TIMER.session.endedAtMs) return;
  var u=(timerActiveUser()||timerGetStudentUsername());
  TIMER.session={
    id: "lsn_"+Date.now()+"_"+Math.floor(Math.random()*100000),
    user: u || "",
    lessons: timerSnapHalf(TIMER.lessons),
    plannedSec: Math.round(timerSnapHalf(TIMER.lessons)*40*60),
    startedAtMs: Date.now(),
    pausedTotalMs: 0,
    pauseStartMs: 0,
    endedAtMs: 0,
    status: "running"
  };
}

function timerSessionActualSec(nowMs){
  try{
    if(!TIMER.session) return 0;
    var end = nowMs || Date.now();
    var started = +TIMER.session.startedAtMs || end;
    var pausedTotal = +TIMER.session.pausedTotalMs || 0;
    var pauseStart = +TIMER.session.pauseStartMs || 0;
    if(pauseStart && TIMER.session.status==="paused") pausedTotal += (end - pauseStart);
    var sec = Math.round((end - started - pausedTotal)/1000);
    if(sec<0) sec=0;
    return sec;
  }catch(e){ return 0; }
}

function timerAppendLogEntry(storageKey, entry, max){
  try{
    var obj=timerLSGet(storageKey, {});
    if(!obj || typeof obj!=="object") obj={};
    if(!Array.isArray(obj.lessonsLog)) obj.lessonsLog=[];
    obj.lessonsLog.unshift(entry);
    var m = max || 200;
    if(obj.lessonsLog.length>m) obj.lessonsLog.length=m;
    timerLSSet(storageKey, obj);
  }catch(e){}
}

function timerUpdateStudentProfileAndDb(username, deltaLessons, entry){
  if(!username) return;

  // student_profile_<username>
  try{
    var key="student_profile_"+username;
    var prof=timerLSGet(key, {});
    if(!prof || typeof prof!=="object") prof={};
    var done = Number(prof.lessonsDone||prof.lessons_done||0);
    if(!Number.isFinite(done)) done=0;
    done += (deltaLessons|0);
    if(done<0) done=0;
    prof.lessonsDone = done;

    var left = prof.lessonsLeft!=null ? Number(prof.lessonsLeft) : null;
    if(left!=null && Number.isFinite(left)){
      left -= (deltaLessons|0);
      if(left<0) left=0;
      prof.lessonsLeft = left;
    }

    if(!Array.isArray(prof.lessonsLog)) prof.lessonsLog=[];
    prof.lessonsLog.unshift(entry);
    if(prof.lessonsLog.length>200) prof.lessonsLog.length=200;

    prof.lastLessonAt = entry && entry.endedAtIso ? entry.endedAtIso : (new Date()).toISOString();
    timerLSSet(key, prof);
  }catch(e){}

  // Try update db caches (best-effort)
  try{
    var keys=["students_db_v1","students_db","studentsDb","students","demo_students","students_db_data"];
    for(var i=0;i<keys.length;i++){
      var k=keys[i];
      var raw=DBStorage.getItem(k);
      if(!raw) continue;
      var parsed=null;
      try{ parsed=JSON.parse(raw); }catch(e2){ parsed=null; }
      if(!parsed) continue;

      var updated=false;

      function updateRecord(rec){
        if(!rec || typeof rec!=="object") return false;
        var tz = rec.tz||rec.id||rec.userId||rec.username||rec.user||rec.uid||rec.teudatZehut||rec["תז"]||rec['ת"ז'];
        if(tz==null) return false;
        if(String(tz)!==String(username)) return false;

        var v = rec.lessonsDone!=null ? Number(rec.lessonsDone) : (rec.lessons_done!=null ? Number(rec.lessons_done) : 0);
        if(!Number.isFinite(v)) v=0;
        v += (deltaLessons|0);
        if(v<0) v=0;
        rec.lessonsDone = v;
        return true;
      }

      if(Array.isArray(parsed)){
        for(var j=0;j<parsed.length;j++){
          if(updateRecord(parsed[j])) updated=true;
        }
      }else if(typeof parsed==="object"){
        // direct record by key
        if(parsed[username] && typeof parsed[username]==="object"){
          if(updateRecord(parsed[username])) updated=true;
        }
        // common containers
        var containers=["students","data","records","list","items","users","db"];
        for(var c=0;c<containers.length;c++){
          var arr=parsed[containers[c]];
          if(Array.isArray(arr)){
            for(var jj=0;jj<arr.length;jj++){
              if(updateRecord(arr[jj])) updated=true;
            }
          }
        }
      }

      if(updated){
        try{ DBStorage.setItem(k, JSON.stringify(parsed)); }catch(e3){}
      }
    }
  }catch(e){}
}

function timerFinalizeSession(status, opts){
  opts = opts || {};
  if(!TIMER.session || typeof TIMER.session!=="object") return;

  var now=Date.now();
  var entry={
    id: TIMER.session.id || ("lsn_"+now),
    user: TIMER.session.user || timerActiveUser() || timerGetStudentUsername() || "",
    lessons: TIMER.session.lessons || TIMER.lessons || 1,
    plannedSec: TIMER.session.plannedSec || (TIMER.lessons*40*60),
    actualSec: timerSessionActualSec(now),
    status: status || "unknown",
    startedAtIso: (new Date(TIMER.session.startedAtMs||now)).toISOString(),
    endedAtIso: (new Date(now)).toISOString()
  };

  // Save to admin_profile
  timerAppendLogEntry("admin_profile", entry, 300);

  // Save to student profile + increment counters on completed
  // NOTE: שיעורים שבוצעו מתעדכנים רק מטיימר האדמין (לא מטיימר התלמיד).

  TIMER.session=null;
  timerSaveState(true);
}

function timerMarkSessionPaused(){
  try{
    if(!TIMER.session) timerSessionEnsure();
    TIMER.session.status="paused";
    TIMER.session.pauseStartMs = Date.now();
  }catch(e){}
}
function timerMarkSessionResumed(){
  try{
    if(!TIMER.session) timerSessionEnsure();
    if(TIMER.session.pauseStartMs){
      TIMER.session.pausedTotalMs = (+TIMER.session.pausedTotalMs||0) + (Date.now() - (+TIMER.session.pauseStartMs||Date.now()));
      TIMER.session.pauseStartMs = 0;
    }
    TIMER.session.status="running";
  }catch(e){}
}

function timerEnsureInit(){
  if(TIMER.inited) return;
  TIMER.inited=true;

  var up=document.getElementById('lessonsUp');
  var down=document.getElementById('lessonsDown');
  var startBtn=document.getElementById('timerStartBtn');
  var pauseBtn=document.getElementById('timerPauseBtn');
  var resetBtn=document.getElementById('timerResetBtn');
  var timeUpBtn=document.getElementById('timeUpBtn');

  var testBtn=document.getElementById('timerTestAlertBtn');

  if(up) up.onclick=function(){timerChangeLessons(+0.5);};
  if(down) down.onclick=function(){timerChangeLessons(-0.5);};
  if(startBtn) startBtn.onclick=function(){timerStart();};
  if(pauseBtn) pauseBtn.onclick=function(){timerTogglePause();};
  if(resetBtn) resetBtn.onclick=function(){timerReset();};
  if(testBtn) testBtn.onclick=function(){timerTestAlert();};
  // Separate test buttons (sound / vibration)
  var testSoundBtn=document.getElementById('timerTestSoundBtn');
  var testVibeBtn=document.getElementById('timerTestVibeBtn');

  if(testSoundBtn){
    if(typeof bindReleaseTap==='function') bindReleaseTap(testSoundBtn, function(){ timerTestSound(); });
    else testSoundBtn.onclick=function(){ timerTestSound(); };
  }
  if(testVibeBtn){
    if(typeof bindReleaseTap==='function') bindReleaseTap(testVibeBtn, function(){ timerTestVibe(); });
    else testVibeBtn.onclick=function(){ timerTestVibe(); };
  }


  // Alert prefs controls
  var soundSel=document.getElementById('timerSoundSelect');
  var volRange=document.getElementById('timerVolumeRange');
  var volVal=document.getElementById('timerVolumeVal');
  var vibSel=document.getElementById('timerVibeStyleSelect');
  var vibRange=document.getElementById('timerVibePowerRange');
  var vibVal=document.getElementById('timerVibePowerVal');

  if(!TIMER._prefsBound){
    TIMER._prefsBound=true;

    function saveFromUI(){
      var u = timerActiveUser() || timerGetStudentUsername();
      if(!u) return;
      var p = timerPrefs();
      if(soundSel) p.sound = soundSel.value;
      if(volRange) p.volume = parseInt(volRange.value,10)||0;
      if(vibSel) p.vibeStyle = vibSel.value;
      if(vibRange) p.vibePower = parseInt(vibRange.value,10)||0;
      timerSavePrefsForUser(u, p);

      if(volVal) volVal.textContent = String(p.volume) + "%";
      if(vibVal) vibVal.textContent = String(p.vibePower) + "%";

      // Apply immediately if alarm is currently ringing
      timerRestartAlarmWithPrefs();
    }

    if(soundSel) soundSel.addEventListener('change', saveFromUI);
    if(vibSel) vibSel.addEventListener('change', saveFromUI);
    
    // Custom pickers (avoid native <select> issues in Android WebView)
    try{
      var soundBtn=document.getElementById('timerSoundBtn');
      var vibBtn=document.getElementById('timerVibeStyleBtn');
      if(soundBtn){
        if(typeof bindReleaseTap === 'function') bindReleaseTap(soundBtn, function(){
          try{ if(window.__timerOpenPicker) window.__timerOpenPicker(soundSel, 'בחר צליל'); }catch(e){}
        });
        else soundBtn.onclick=function(){ try{ if(window.__timerOpenPicker) window.__timerOpenPicker(soundSel, 'בחר צליל'); }catch(e){} };
      }
      if(vibBtn){
        if(typeof bindReleaseTap === 'function') bindReleaseTap(vibBtn, function(){
          try{ if(window.__timerOpenPicker) window.__timerOpenPicker(vibSel, 'בחר סגנון רטט'); }catch(e){}
        });
        else vibBtn.onclick=function(){ try{ if(window.__timerOpenPicker) window.__timerOpenPicker(vibSel, 'בחר סגנון רטט'); }catch(e){} };
      }
    }catch(e){}
if(volRange) volRange.addEventListener('input', function(){ if(volVal) volVal.textContent=String(parseInt(volRange.value,10)||0)+"%"; });
    if(vibRange) vibRange.addEventListener('input', function(){ if(vibVal) vibVal.textContent=String(parseInt(vibRange.value,10)||0)+"%"; });
    if(volRange) volRange.addEventListener('change', saveFromUI);
    if(vibRange) vibRange.addEventListener('change', saveFromUI);
  }

  if(timeUpBtn) timeUpBtn.onclick=function(){
    // Clear alarm + save lesson as completed (only if timer actually ended)
    timerStopAlarm();
    if(TIMER && !TIMER.running && TIMER.secondsLeft<=0){
      timerFinalizeSession("completed");
    }
    timerReset();
  };

  if(!TIMER._visBound){
    TIMER._visBound=true;
    document.addEventListener('visibilitychange', function(){
      if(document.hidden){
        timerReleaseWakeLock();
      }else{
        if(TIMER.running) timerAcquireWakeLock();
      }
    });
  }

  var u = timerGetStudentUsername();
  if(u){
    timerLoadStateForUser(u);
    try{ timerLoadPrefsForUser(u); }catch(e){}
    try{ timerApplyPrefsToUI(); }catch(e){}

    // If nothing loaded, set defaults
    if(!Number.isFinite(TIMER.lessons) || TIMER.lessons<1) TIMER.lessons=1;
    if(!Number.isFinite(TIMER.secondsLeft) || TIMER.secondsLeft<0) TIMER.secondsLeft = TIMER.lessons*40*60;

    timerRender();
    timerSaveState(true);
  }else{
    // Logged out: hide timer on home and stop runtime alarms/intervals (state remains saved per-profile)
    try{ if(TIMER.tickId){clearInterval(TIMER.tickId);TIMER.tickId=null;} }catch(e){}
    try{ timerReleaseWakeLock(); }catch(e){}
    try{ timerStopAlarm(); }catch(e){}
    TIMER.activeUser = "";
    TIMER.running = false;
    TIMER.endAtMs = 0;
    TIMER.session = null;
    TIMER.stateLoaded = false;
    TIMER.lessons = 1;
    TIMER.secondsLeft = 40*60;
    try{ TIMER.prefs = timerDefaultPrefs(); }catch(e){}
    try{ timerApplyPrefsToUI(); }catch(e){}
    timerRender();
  }
}

function timerSnapHalf(n){
  n = Number(n);
  if(!Number.isFinite(n)) return 1;
  return Math.round(n * 2) / 2;
}

function timerChangeLessons(delta){
  if(TIMER.running) return;
  var n = timerSnapHalf(TIMER.lessons + Number(delta||0));
  if(n < 0.5) n = 0.5;
  if(n > 20) n = 20;
  timerApplyLessons(n);
  timerSaveState(true);
  timerRender();
}

function timerApplyLessons(n){
  n = timerSnapHalf(n);
  if(n < 0.5) n = 0.5;
  if(n > 20) n = 20;
  TIMER.lessons = n;
  TIMER.secondsLeft = Math.round(n * 40 * 60);
}
function timerStart(){
  timerEnsureInit();
  timerStopAlarm();

  if(TIMER.secondsLeft<=0) timerApplyLessons(TIMER.lessons);

  timerSessionEnsure();
  try{
    TIMER.session.lessons = timerSnapHalf(TIMER.lessons);
    TIMER.session.plannedSec = Math.round(timerSnapHalf(TIMER.lessons)*40*60);
    TIMER.session.status = "running";
  }catch(e){}

  TIMER.running=true;
  TIMER.endAtMs=Date.now()+TIMER.secondsLeft*1000;

  if(TIMER.tickId) clearInterval(TIMER.tickId);
  TIMER.tickId=setInterval(timerTick,250);

  timerAcquireWakeLock();
  timerSaveState(true);
  timerRender();
}

function timerTogglePause(){
  timerEnsureInit();

  if(!TIMER.running){
    if(TIMER.secondsLeft<=0) return;

    TIMER.running=true;
    TIMER.endAtMs=Date.now()+TIMER.secondsLeft*1000;

    if(TIMER.tickId) clearInterval(TIMER.tickId);
    TIMER.tickId=setInterval(timerTick,250);

    timerMarkSessionResumed();
    timerAcquireWakeLock();
    timerSaveState(true);
    timerRender();
    return;
  }

  // Pause
  var msLeft=TIMER.endAtMs-Date.now();
  var sLeft=Math.ceil(msLeft/1000);
  if(sLeft<0) sLeft=0;
  TIMER.secondsLeft=sLeft;

  TIMER.running=false;
  if(TIMER.tickId){clearInterval(TIMER.tickId);TIMER.tickId=null;}

  timerMarkSessionPaused();
  timerReleaseWakeLock();
  timerSaveState(true);
  timerRender();
}

function timerReset(){
  timerEnsureInit();

  var wasRunning = !!TIMER.running;
  var hadTimeUp = (!TIMER.running && TIMER.secondsLeft<=0);

  TIMER.running=false;
  if(TIMER.tickId){clearInterval(TIMER.tickId);TIMER.tickId=null;}

  timerReleaseWakeLock();
  timerStopAlarm();

  // If a session exists and it wasn't completed, finalize it as reset
  if(TIMER.session){
    if(hadTimeUp){
      timerFinalizeSession("reset_after_timeup");
    }else if(wasRunning || (TIMER.secondsLeft < (TIMER.lessons*40*60))){
      timerFinalizeSession("reset");
    }else{
      TIMER.session=null;
    }
  }

  timerApplyLessons(TIMER.lessons);
  timerSaveState(true);
  timerRender();
}

function timerTick(){
  if(!TIMER.running) return;

  var msLeft=TIMER.endAtMs-Date.now();
  var sLeft=Math.ceil(msLeft/1000);
  if(sLeft<0) sLeft=0;

  TIMER.secondsLeft=sLeft;
  timerRender();
  timerSaveState(false);

  if(sLeft<=0){
    TIMER.running=false;
    if(TIMER.tickId){clearInterval(TIMER.tickId);TIMER.tickId=null;}

    timerReleaseWakeLock();

    try{
      if(!TIMER.session) timerSessionEnsure();
      TIMER.session.status="timeup";
      TIMER.session.endedAtMs=Date.now();
      TIMER.session.pauseStartMs=0;
    }catch(e){}

    timerSaveState(true);
    timerTimeUp();
  }
}

function timerTimeUp(fromRestore){
  timerRender();
  timerStartAlarm();
  timerSaveState(true);
}

function timerRender(){
  var d=document.getElementById('timerDisplay');
  var lc=document.getElementById('lessonsCount');
  var startBtn=document.getElementById('timerStartBtn');
  var pauseBtn=document.getElementById('timerPauseBtn');
  var resetBtn=document.getElementById('timerResetBtn');
  var timeUpBtn=document.getElementById('timeUpBtn');

  if(lc) lc.textContent=String(TIMER.lessons);
  if(d) d.textContent=timerFormatHMS(TIMER.secondsLeft);

  if(startBtn){
    startBtn.textContent=TIMER.running?"רץ...":"התחל";
    startBtn.disabled=TIMER.running;
    startBtn.classList.remove('white','gray');
    startBtn.classList.add(TIMER.running?'gray':'white');
  }

  if(pauseBtn){
    var canPause=(TIMER.secondsLeft>0);
    pauseBtn.disabled=!canPause;
    pauseBtn.textContent=TIMER.running?"עצור":"המשך";
    pauseBtn.classList.remove('white','gray');
    pauseBtn.classList.add(canPause?'white':'gray');
  }

  if(resetBtn){
    resetBtn.disabled=false;
    resetBtn.classList.remove('gray');
    if(!resetBtn.classList.contains('white')) resetBtn.classList.add('white');
  }

  if(timeUpBtn){
    if(TIMER.secondsLeft<=0 && !TIMER.running) timeUpBtn.classList.add('show');
    else timeUpBtn.classList.remove('show');
  }

  // Home digital timer (visual overlay on main screen)
  homeDigitalTimerUpdate();
}

function timerFormatHMS(totalSec){
  var s=totalSec|0;
  var h=Math.floor(s/3600); s-=h*3600;
  var m=Math.floor(s/60); s-=m*60;
  return pad2(h)+":"+pad2(m)+":"+pad2(s);
}
function pad2(n){n=n|0;return (n<10?"0"+n:""+n);}

/* ===== Home Digital Timer overlay (visual only) ===== */
function homeDigitalTimerUpdate(){
  var box = document.getElementById('homeDigitalTimer');
  if(!box) return;

  // show only on HOME (no pages/popup/menu) and only while timer is actually running
  var onHome =
            !document.body.classList.contains('page-open')
            && !document.body.classList.contains('auth-open')
            && !document.body.classList.contains('popup-open')
            && !document.body.classList.contains('start-open')
            && !document.body.classList.contains('pay-open')
            && !document.body.classList.contains('student-menu-open');

  var loggedUser = timerGetStudentUsername();
  var shouldShow = !!(onHome && loggedUser && TIMER && TIMER.running && TIMER.secondsLeft > 0 && (timerActiveUser()===loggedUser));

  if(!shouldShow){
    box.classList.remove('show');
    box.setAttribute('aria-hidden','true');
    return;
  }

  var str = timerFormatHMS(TIMER.secondsLeft); // "HH:MM:SS"
  var parts = str.split(':');
  if(parts.length === 3){
    var h = document.getElementById('hdtH');
    var m = document.getElementById('hdtM');
    var s = document.getElementById('hdtS');
    if(h) h.textContent = parts[0];
    if(m) m.textContent = parts[1];
    if(s) s.textContent = parts[2];
  }

  box.classList.add('show');
  box.setAttribute('aria-hidden','false');
}

function timerStartAlarm(){
  if(TIMER.alarmOn) return;
  TIMER.alarmOn=true;

  var prefs = null;
  try{ prefs = timerPrefs(); }catch(e){ prefs = null; }
  prefs = timerNormalizePrefs(prefs);

  var vibeStyle = String(prefs.vibeStyle || "classic");
  var vibePower = parseInt(prefs.vibePower,10); if(!Number.isFinite(vibePower)) vibePower = 70;

  var sound = String(prefs.sound || "beep");
  var volume = parseInt(prefs.volume,10); if(!Number.isFinite(volume)) volume = 70;

  // Vibration
  try{
    if(navigator.vibrate && vibeStyle !== "off" && vibePower > 0){
      var pat = timerVibePattern(vibeStyle, vibePower);
      if(pat && pat.length){
        navigator.vibrate(pat);
        var every = timerVibeRepeatMs(vibeStyle, vibePower);
        TIMER.vibrateId=setInterval(function(){
          try{ navigator.vibrate(pat); }catch(e){}
        }, every);
      }
    }
  }catch(e){}

  // Sound
  try{
    if(volume <= 0) sound = "mute";
    var AC=window.AudioContext||window.webkitAudioContext;
    if(AC && sound !== "mute"){
      TIMER.audioCtx=new AC();
      try{ if(TIMER.audioCtx.state === "suspended") TIMER.audioCtx.resume(); }catch(e){}

      TIMER.alarmGain=TIMER.audioCtx.createGain();
      TIMER.alarmGain.gain.value=0.0001;
      TIMER.alarmGain.connect(TIMER.audioCtx.destination);

      TIMER.alarmOsc=TIMER.audioCtx.createOscillator();

      // Sound presets
      var baseFreq = 880;
      if(sound==="low") baseFreq = 440;
      if(sound==="bell") baseFreq = 660;
      if(sound==="alarm" || sound==="siren") baseFreq = 700;

      if(sound==="bell") TIMER.alarmOsc.type="sine";
      else if(sound==="alarm" || sound==="siren") TIMER.alarmOsc.type="sawtooth";
      else TIMER.alarmOsc.type="square";

      TIMER.alarmOsc.frequency.value=baseFreq;
      TIMER.alarmOsc.connect(TIMER.alarmGain);
      TIMER.alarmOsc.start();

      var peak = timerAlarmPeakFromVolume(volume);
      var phase = 0;
      var sirenUp = true;

      TIMER.alarmPulseId=setInterval(function(){
        try{
          if(!TIMER.alarmGain || !TIMER.audioCtx) return;

          // frequency step per pulse
          phase++;
          if(sound==="beep"){
            TIMER.alarmOsc.frequency.setValueAtTime(880, TIMER.audioCtx.currentTime);
          }else if(sound==="low"){
            TIMER.alarmOsc.frequency.setValueAtTime(440, TIMER.audioCtx.currentTime);
          }else if(sound==="bell"){
            var f = (phase%2===0) ? 660 : 880;
            TIMER.alarmOsc.frequency.setValueAtTime(f, TIMER.audioCtx.currentTime);
          }else if(sound==="alarm" || sound==="siren"){
            var f1 = sirenUp ? 520 : 1080;
            var f2 = sirenUp ? 1080 : 520;
            TIMER.alarmOsc.frequency.setValueAtTime(f1, TIMER.audioCtx.currentTime);
            TIMER.alarmOsc.frequency.linearRampToValueAtTime(f2, TIMER.audioCtx.currentTime + 0.22);
            sirenUp = !sirenUp;
          }

          // envelope
          TIMER.alarmGain.gain.setValueAtTime(0.0001, TIMER.audioCtx.currentTime);
          TIMER.alarmGain.gain.linearRampToValueAtTime(peak, TIMER.audioCtx.currentTime+0.02);
          TIMER.alarmGain.gain.linearRampToValueAtTime(0.0001, TIMER.audioCtx.currentTime+0.18);
        }catch(e){}
      },260);
    }
  }catch(e){}
}


function timerStopAlarm(){
  TIMER.alarmOn=false;
  try{
    if(TIMER.vibrateId){clearInterval(TIMER.vibrateId);TIMER.vibrateId=null;}
    if(navigator.vibrate) navigator.vibrate(0);
  }catch(e){}
  try{
    if(TIMER.alarmPulseId){clearInterval(TIMER.alarmPulseId);TIMER.alarmPulseId=null;}
    if(TIMER.alarmOsc){TIMER.alarmOsc.stop();TIMER.alarmOsc.disconnect();TIMER.alarmOsc=null;}
    if(TIMER.alarmGain){TIMER.alarmGain.disconnect();TIMER.alarmGain=null;}
    if(TIMER.audioCtx){TIMER.audioCtx.close();TIMER.audioCtx=null;}
  }catch(e){}
}

function timerTestAlert(){
  try{
    if(TIMER._testInProgress) return;
    TIMER._testInProgress = true;

    // Ensure audio is allowed (must be within user gesture)
    try{ if(TIMER.audioCtx && TIMER.audioCtx.state === "suspended") TIMER.audioCtx.resume(); }catch(e){}

    // Stop any running alarm first (safety)
    try{ timerStopAlarm(); }catch(e){}

    // Start preview
    timerStartAlarm();

    // Stop quickly so it's just a preview (no endless pulses)
    setTimeout(function(){
      try{ timerStopAlarm(); }catch(e){}
      TIMER._testInProgress = false;
    }, 1200);
  }catch(e){
    try{ TIMER._testInProgress = false; }catch(_){}
  }
}

function timerTestSound(){
  try{
    const p = timerNormalizePrefs(timerPrefs());
    timerPreviewSound(String(p.sound||'bell'), Number(p.volume));
  }catch(e){}
}
function timerTestVibe(){
  try{
    const p = timerNormalizePrefs(timerPrefs());
    timerPreviewVibe(String(p.vibeStyle||'classic'), Number(p.vibePower));
  }catch(e){}
}

function timerPreviewSound(sound, volume){
  try{
    // stop any alarm preview currently running
    try{ clearInterval(TIMER._previewSoundInt); }catch(e){}
    try{ clearTimeout(TIMER._previewSoundTmo); }catch(e){}
    TIMER._previewSoundInt = null;
    TIMER._previewSoundTmo = null;

    const AC = window.AudioContext || window.webkitAudioContext;
    if(!AC) return;
    if(sound === 'mute') return;

    volume = Math.max(0, Math.min(100, Number(volume)||0));
    const peak = timerAlarmPeakFromVolume(volume);
    if(peak <= 0) return;

    // close previous preview ctx if exists
    try{ if(TIMER._previewSoundOsc){ TIMER._previewSoundOsc.stop(); } }catch(e){}
    try{ if(TIMER._previewSoundCtx){ TIMER._previewSoundCtx.close(); } }catch(e){}
    TIMER._previewSoundCtx = new AC();
    const ctx = TIMER._previewSoundCtx;
    if(ctx.state === 'suspended' && ctx.resume) ctx.resume().catch(()=>{});

    const gain = ctx.createGain();
    gain.gain.value = 0.0001;
    gain.connect(ctx.destination);

    const osc = ctx.createOscillator();
    osc.type = (sound === 'alarm') ? 'sawtooth' : (sound === 'bell' ? 'sine' : 'square');
    osc.frequency.value = (sound === 'low') ? 420 : 820;
    osc.connect(gain);
    osc.start();
    TIMER._previewSoundOsc = osc;

    const t0 = Date.now();
    let step = 0;

    function setOn(on){
      const t = ctx.currentTime;
      const target = on ? peak : 0.0001;
      gain.gain.cancelScheduledValues(t);
      gain.gain.setValueAtTime(gain.gain.value, t);
      gain.gain.linearRampToValueAtTime(target, t + 0.01);
    }

    TIMER._previewSoundInt = setInterval(function(){
      const elapsed = Date.now() - t0;

      if(sound === 'beep'){
        const on = (step % 2 === 0);
        osc.frequency.setValueAtTime(900, ctx.currentTime);
        setOn(on);
      }else if(sound === 'bell'){
        // two short notes then a pause
        const phase = step % 6; // 0..5
        const on = (phase === 0 || phase === 2);
        const freq = (phase === 0) ? 660 : 880;
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        setOn(on);
      }else if(sound === 'low'){
        const on = (step % 2 === 0);
        osc.frequency.setValueAtTime(420, ctx.currentTime);
        setOn(on);
      }else if(sound === 'alarm'){
        // siren-like sweep
        const up = (step % 6) < 3;
        const freq = up ? (650 + (step%3)*220) : (1100 - (step%3)*220);
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        setOn(true);
      }else{
        osc.frequency.setValueAtTime(820, ctx.currentTime);
        setOn(step % 2 === 0);
      }

      step++;
      if(elapsed > 1600){
        try{ clearInterval(TIMER._previewSoundInt); }catch(e){}
        TIMER._previewSoundInt = null;
        // fade out quickly and close
        const t = ctx.currentTime;
        gain.gain.cancelScheduledValues(t);
        gain.gain.setValueAtTime(gain.gain.value, t);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
        TIMER._previewSoundTmo = setTimeout(function(){
          try{ osc.stop(); }catch(e){}
          try{ ctx.close(); }catch(e){}
          TIMER._previewSoundOsc = null;
          TIMER._previewSoundCtx = null;
        }, 120);
      }
    }, 160);
  }catch(e){}
}

function timerPreviewVibe(style, power){
  try{
    if(!navigator.vibrate) return;

    power = Math.max(0, Math.min(100, Number(power)||0));
    const pat = timerVibePattern(style, power);
    if(!pat || !pat.length) return;

    try{ navigator.vibrate(0); }catch(e){}
    navigator.vibrate(pat);

    setTimeout(function(){
      try{ navigator.vibrate(0); }catch(e){}
    }, 1800);
  }catch(e){}
}


(function(){
  var imgs=document.querySelectorAll('img');
  for(var i=0;i<imgs.length;i++){
    imgs[i].addEventListener('error',function(){this.style.display='none';});
  }
})();

timerEnsureInit();

(function(){
  var tpl = document.getElementById('pageCloseSliderTpl');
  if(!tpl) return;

  var pages = document.querySelectorAll('.page');
  for(var i=0;i<pages.length;i++){
    if(!pages[i].querySelector('[data-page-close-slider]')){
      pages[i].appendChild(tpl.content.cloneNode(true));
    }
  }
})();

/* Swipe-down close for all sub pages (only when at top of the inner scroll) */
(function(){
  var THRESH = 0.20; // ✅ 20%

  var REVEAL_START = 0.40; // ✅ start reveal when page moved down 40% (remaining 60% visible)
  var mainPage = document.getElementById('mainPage');
  var _homeRAF = 0;

  function setHomeRevealByDy(dy, H){
    try{
      if(!mainPage) mainPage = document.getElementById('mainPage');
      if(!mainPage) return;

      var hh = H || window.innerHeight || document.documentElement.clientHeight || 800;
      var start = hh * REVEAL_START;
      var denom = hh - start;

      dy = Number(dy) || 0;
      var clamped = dy;
      if(clamped < 0) clamped = 0;
      if(clamped > hh) clamped = hh;

      var p = denom > 1 ? ((clamped - start) / denom) : 0;
      if(p < 0) p = 0;
      if(p > 1) p = 1;

      try{
        if(p > 0) document.body.classList.add('reveal-home');
        else document.body.classList.remove('reveal-home');
      }catch(e){}

      if(p <= 0){
        mainPage.style.opacity = '0';
        mainPage.style.visibility = 'hidden';
      }else{
        mainPage.style.visibility = 'visible';
        mainPage.style.opacity = String(p);
      }
    }catch(e){}
  }

  function clearHomeReveal(){
    try{
      if(!mainPage) mainPage = document.getElementById('mainPage');
      if(mainPage){
        mainPage.style.opacity = '';
        mainPage.style.visibility = '';
      }
      try{ document.body.classList.remove('reveal-home'); }catch(e){}
    }catch(e){}
  }

  function animateHomeReveal(fromDy, toDy, ms, H){
    try{
      if(_homeRAF){ cancelAnimationFrame(_homeRAF); _homeRAF = 0; }
      var start = (performance && performance.now) ? performance.now() : Date.now();
      var dur = Math.max(0, Number(ms)||0);
      var from = Number(fromDy)||0;
      var to = Number(toDy)||0;

      function step(now){
        var t = dur<=0 ? 1 : ((now - start) / dur);
        if(t < 0) t = 0;
        if(t > 1) t = 1;
        var dy = from + (to - from) * t;
        setHomeRevealByDy(dy, H);
        if(t < 1){
          _homeRAF = requestAnimationFrame(step);
        }else{
          _homeRAF = 0;
        }
      }
      _homeRAF = requestAnimationFrame(step);
    }catch(e){}
  }

  function bindPage(page){
    if(page._swipeCloseBound) return;
    page._swipeCloseBound = true;

    var scrollEl = page.querySelector('.page-inner') || page;

    var startY = 0;
    var lastY = 0;
    var dragging = false;
    var armed = false;

    function canStart(){
      try{ return (scrollEl.scrollTop <= 0); }catch(e){ return true; }
    }

    function setTransform(dy){
      page.style.transition = 'none';
      page.style.transform = 'translateY(' + dy + 'px)';
    }

    function resetTransform(){
      page.style.transition = '';
      page.style.transform = '';
    }

    function revealHome(dy){
      try{
        var H = window.innerHeight || document.documentElement.clientHeight || 800;
        setHomeRevealByDy(dy, H);
      }catch(e){}
    }
function closeWithSlide(dy, h){
      // Continue DOWN only (no bounce up). Reveal home icons smoothly from 60%->0% remaining.
      var H = h || window.innerHeight || document.documentElement.clientHeight || 800;
      var endY = Math.max(H + 80, H);

      try{ page.classList.add('closing-down'); }catch(e){}
      try{ page.style.pointerEvents = 'none'; }catch(e){}

      // sync initial reveal to current dy
      try{ setHomeRevealByDy(dy, H); }catch(e){}

      requestAnimationFrame(function(){
        try{
          var ms = 420;

          // drive home icons reveal in lockstep with the closing animation
          try{ animateHomeReveal(Math.max(0, Number(dy)||0), H, ms, H); }catch(e){}

          page.style.transition = 'transform ' + ms + 'ms ease-out';
          page.style.transform = 'translateY(' + endY + 'px)';

          setTimeout(function(){
            try{
              if(typeof goBackStep === 'function') goBackStep();
              else if(typeof closeAllPages === 'function') closeAllPages(true);
              else page.classList.remove('show');
            }catch(e){}

            // Hard-hide while already offscreen (prevents any bounce flash)
            try{
              page.style.transition = 'none';
              page.style.opacity = '0';
              page.style.visibility = 'hidden';
              page.style.pointerEvents = 'none';
              page.style.transform = 'translateY(' + endY + 'px)';
            }catch(e){}

            try{ page.classList.remove('closing-down'); }catch(e){}

            // clear inline reveal control after returning home
            try{ requestAnimationFrame(function(){ clearHomeReveal(); }); }catch(e){ clearHomeReveal(); }
          }, ms + 20);
        }catch(e){}
      });
    }

    function onStart(y){
      if(!page.classList.contains('show')) return;
      if(isMenuOpen()) return;

      // only if there's no more text above
      if(!canStart()){
        armed = false;
        dragging = false;
        return;
      }
      startY = y;
      lastY = y;
      armed = true;
      dragging = false;
      revealHome(0);
    }

    function onMove(y, ev){
      if(!armed) return;

      // if user scrolled up in the meantime, cancel
      if(!canStart()){
        armed = false;
        dragging = false;
        resetTransform();
        revealHome(0);
        return;
      }

      var dy = y - startY;
      lastY = y;

      // allow normal scroll / taps until small pull
      if(dy <= 8){ revealHome(0); return; }

      if(dy < 0){ revealHome(0); return; }

      dragging = true;
      if(ev && ev.cancelable) ev.preventDefault();
      setTransform(dy);
      revealHome(dy);
    }

    function onEnd(){
      if(!armed) return;
      armed = false;

      if(!dragging){
        resetTransform();
        revealHome(0);
        return;
      }

      var dy = lastY - startY;
      var h = window.innerHeight || document.documentElement.clientHeight || 800;

      if(dy >= h * THRESH){
        // keep current transform and continue sliding DOWN
        closeWithSlide(dy, h);
      }else{
        // not enough: snap back to the top
        resetTransform();
        revealHome(0);
      }
      dragging = false;
    }

    // Touch on inner scroller
    scrollEl.addEventListener('touchstart', function(e){
      if(e.touches && e.touches.length===1) onStart(e.touches[0].clientY);
    }, {passive:true});

    scrollEl.addEventListener('touchmove', function(e){
      if(e.touches && e.touches.length===1) onMove(e.touches[0].clientY, e);
    }, {passive:false});

    scrollEl.addEventListener('touchend', function(){ onEnd(); }, {passive:true});
    scrollEl.addEventListener('touchcancel', function(){ onEnd(); }, {passive:true});
  }

  function bindAll(){
    var pages = document.querySelectorAll('.page');
    for(var i=0;i<pages.length;i++) bindPage(pages[i]);
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bindAll);
  else bindAll();
})();

// ===== Side menu in-place navigation (student info) =====
function openProfileMenu(){
  const main = document.getElementById('menuMainSection');
  const student = document.getElementById('menuStudentSection');
  const scroll = document.getElementById('menuScroll');
  if(main){ main.setAttribute('aria-hidden','true'); }
  if(student){ student.setAttribute('aria-hidden','false'); }
  if(scroll){ scroll.scrollTop = 0; }
  const titleEl = document.getElementById('menuHeaderTitle');
  if(titleEl) titleEl.textContent = 'תפריט';
  try{ if(window.APP_STATE && typeof window.APP_STATE.set === 'function') window.APP_STATE.set({ menuSection: 'studentInfo' }); }catch(e){}
  const backBtn = document.getElementById('menuHeaderBack');
  if (backBtn) backBtn.hidden = false;
}

function headerArrowAction(){
  const student = document.getElementById('menuStudentSection');
  // if submenu is visible/active => back, else close menu
  const inSub = !!(student && (student.classList.contains('active') || student.getAttribute('aria-hidden') === 'false' || student.style.display === 'block'));
  if(inSub){
    backToMainMenu();
  }else{
    closeMenu();
  }
}

function backToMainMenu(){
  const main = document.getElementById('menuMainSection');
  const student = document.getElementById('menuStudentSection');
  const scroll = document.getElementById('menuScroll');
  if(student){ student.setAttribute('aria-hidden','true'); }
  if(main){ main.setAttribute('aria-hidden','false'); }
  if(scroll){ scroll.scrollTop = 0; }
  const titleEl = document.getElementById('menuHeaderTitle');
  if(titleEl) titleEl.textContent = 'תפריט';
  try{ if(window.APP_STATE && typeof window.APP_STATE.set === 'function') window.APP_STATE.set({ menuSection: 'main' }); }catch(e){}
  const backBtn = document.getElementById('menuHeaderBack');
  if (backBtn) backBtn.hidden = false;
}

/* ===== script block 3 (from original HTML) ===== */
document.querySelectorAll('[data-title]').forEach(btn=>{
  btn.addEventListener('click',()=>{
    const title = btn.getAttribute('data-title');
    if(title){
      document.getElementById('headerTitle').textContent = title;
    }
  });
});

document.getElementById('headerBack')?.addEventListener('click',()=>{
  document.getElementById('headerTitle').textContent = 'תפריט';
});

/* ===== script block 4 (from original HTML) ===== */
(function(){
  const _openMenu = window.openMenu;
  window.openMenu = function(){
    // reset to main menu on every open
    document.body.classList.remove('submenu-open');
    document.querySelectorAll('.submenu, .submenu-section').forEach(el=>el.classList.remove('active','open','show'));
    document.querySelectorAll('.menu-main, .menu-main-section').forEach(el=>el.classList.add('active','show'));
    if (typeof _openMenu === 'function') _openMenu();
  };
})();

/* ===== script block 5 (from original HTML) ===== */
(function(){
  // Ensure opening the side menu always shows MAIN MENU
  function resetToMainMenu(){
    document.body.classList.remove('show-submenu');
    document.body.classList.add('show-menu');
  }
  // Hook common open triggers
  document.addEventListener('click', function(e){
    if(e.target.closest('.open-menu')) resetToMainMenu();
  });
  // Also reset on menu swipe open if handler exists
  window.addEventListener('menu:open', resetToMainMenu);
})();

/* ===== script block 6 (from original HTML) ===== */
function openProfileMenu(){
  document.getElementById('menuMainSection').classList.add('hidden');
  const s = document.getElementById('menuStudentSection');
  s.classList.add('active');
  s.setAttribute('aria-hidden','false');
  document.getElementById('menuHeaderTitle').textContent = 'INFO';
  document.getElementById('menuHeaderBack').hidden = false;
}

function backToMainMenu(){
  document.getElementById('menuMainSection').classList.remove('hidden');
  const s = document.getElementById('menuStudentSection');
  s.classList.remove('active');
  s.setAttribute('aria-hidden','true');
  document.getElementById('menuHeaderTitle').textContent = 'תפריט';
  document.getElementById('menuHeaderBack').hidden = true;
}

/* ===== script block 7 (from original HTML) ===== */
/* ===== FINAL MENU FIX (arrow only in submenu + close on tap outside) ===== */
(function(){
  const side = document.getElementById('sideMenu');
  function setMenuOpen(isOpen){
    document.body.classList.toggle('menu-open', !!isOpen);
    if(side){
      side.classList.toggle('open', !!isOpen); // used by swipe handlers in this file
      side.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
    }
  }

  // Override globally to avoid older duplicate handlers breaking things
  window.openMenu = function(){
    try{ if(typeof closePopup === 'function') closePopup(true); }catch(e){}
    try{ if(typeof resetMenuState === 'function') resetMenuState(); }catch(e){}
    try{ if(typeof backToMainMenu === 'function') backToMainMenu(); }catch(e){}

    // Header must be MAIN state on open
    const backBtn = document.getElementById('menuHeaderBack');
    const title  = document.getElementById('menuHeaderTitle');
    if(backBtn) backBtn.hidden = false;
    if(title) title.textContent = 'תפריט';
    try{ if(typeof updateMenuRoleSections === 'function') updateMenuRoleSections(); }catch(e){}
    try{ if(window.APP_STATE && typeof window.APP_STATE.set === 'function') window.APP_STATE.set({ menuSection: 'main' }); }catch(e){}

    setMenuOpen(true);

    try{ if(typeof resetMenuItems === 'function') resetMenuItems(); }catch(e){}
    setTimeout(function(){
      try{ if(typeof animateMenuItems === 'function') animateMenuItems(); }catch(e){}
    }, 120);

    const sc = document.getElementById('menuScroll');
    if(sc) sc.scrollTop = 0;
  };

  window.closeMenu = function(){
    try{ if(typeof resetMenuState === 'function') resetMenuState(); }catch(e){}
    setMenuOpen(false);
    try{ if(typeof resetMenuItems === 'function') resetMenuItems(); }catch(e){}
  };
  // Close on tap/click outside (works on mobile)
  function handleOutside(e){
    if(!document.body.classList.contains('menu-open')) return;
    const t = e.target;

    // ignore taps inside menu
    if(t && t.closest && t.closest('#sideMenu')) return;
    // everything else closes
    window.closeMenu();
  }
  document.addEventListener('pointerdown', handleOutside, true);
  document.addEventListener('touchstart', handleOutside, {passive:true, capture:true});

  // Escape closes (desktop)
  document.addEventListener('keydown', function(e){
    if(e.key === 'Escape' && document.body.classList.contains('menu-open')) window.closeMenu();
  });
})();

/* ===== script block 8 (from original HTML) ===== */
/* ===== MENU FIX (robust, no extra overlays) ===== */
(function(){
  function q(id){ return document.getElementById(id); }
  function visibleItems(){
    var items = [];
    var main = q('menuMainSection');
    var sub  = q('menuStudentSection');
    if(sub && sub.getAttribute('aria-hidden') === 'false'){
      items = sub.querySelectorAll('.menu-item');
    }else if(main){
      items = main.querySelectorAll('.menu-item');
    }
    return items;
  }
  function resetAllItems(){
    var all = document.querySelectorAll('#sideMenu .menu-item');
    for(var i=0;i<all.length;i++) all[i].classList.remove('menu-in');
  }
  function animateCurrent(){
    var items = visibleItems();
    resetAllItems();
    for(var i=0;i<items.length;i++){
      (function(btn,idx){
        setTimeout(function(){ btn.classList.add('menu-in'); }, 100*idx);
      })(items[i], i);
    }
  }

  window.openStudentMenu = function(){
    var main = q('menuMainSection');
    var sub  = q('menuStudentSection');
    var scroll = q('menuScroll');
    if(main) main.setAttribute('aria-hidden','true');
    if(sub)  sub.setAttribute('aria-hidden','false');
    if(scroll) scroll.scrollTop = 0;

    var title = q('menuHeaderTitle'); if(title) title.textContent = 'INFO';
    try{ if(window.APP_STATE && typeof window.APP_STATE.set === 'function') window.APP_STATE.set({ menuSection: 'studentInfo' }); }catch(e){}
    var back = q('menuHeaderBack'); if(back) back.hidden = false;

    // animate submenu items so they aren't invisible
    setTimeout(animateCurrent, 30);
  };

  window.backToMainMenu = function(){
    var main = q('menuMainSection');
    var sub  = q('menuStudentSection');
    var scroll = q('menuScroll');
    if(sub)  sub.setAttribute('aria-hidden','true');
    if(main) main.setAttribute('aria-hidden','false');
    if(scroll) scroll.scrollTop = 0;

    var title = q('menuHeaderTitle'); if(title) title.textContent = 'תפריט';
    var back = q('menuHeaderBack'); if(back) back.hidden = true;

    setTimeout(animateCurrent, 30);
  };

  window.headerArrowAction = function(){
    var sub = q('menuStudentSection');
    var inSub = !!(sub && sub.getAttribute('aria-hidden') === 'false');
    if(inSub) window.backToMainMenu();
    else if(typeof window.closeMenu === 'function') window.closeMenu();
  };

  // When menu opens, ensure main state & animate only main items
  var _openMenu = window.openMenu;
  window.openMenu = function(){
    try{ window.backToMainMenu(); }catch(e){}
    // Only one menu can be open: close student menu when opening the right menu
    try{ if(typeof window.closeProfileMenu === 'function') window.closeProfileMenu(); }catch(e){}
    if(typeof _openMenu === 'function') _openMenu();
    setTimeout(animateCurrent, 140);
  };

  // If something else opens the menu without animation, still animate
  document.addEventListener('DOMContentLoaded', function(){
    // ensure initial state
    try{ window.backToMainMenu(); }catch(e){}
  });
})();

/* =======================
   PROFILE SANDBOX (Embedded)
   ======================= */
(function(){
  var state = {
    loggedIn: false,
    username: null,
    otp: null,
    authMode: 'login',
    postAuthPage: null,
    postAuthOpenProfileMenu: false
  };

  function $(id){ return document.getElementById(id); }

  function makeTxId(){
    return 'tx_' + String(Date.now()) + '_' + String(Math.random()).slice(2);
  }

  function toast(msg){
    var el = $("toast");
    if(!el) return;
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(function(){ el.classList.remove("show"); }, 1600);
  }

  // expose toast globally for other modules
  try{ window.toast = toast; }catch(e){}


  function saveAuth(){
    try{
      DBStorage.setItem("student_logged_in", state.loggedIn ? "1" : "0");
      DBStorage.setItem("student_username", state.username || "");
    }catch(e){}
  }
  function loadAuth(){
    try{
      state.loggedIn = DBStorage.getItem("student_logged_in") === "1";
      state.username = DBStorage.getItem("student_username") || null;
    }catch(e){
      state.loggedIn = false;
      state.username = null;
    }
  }

  // ===== Per-student progress (LocalStorage) =====
  function _progressKey(){
    return state.username ? ("student_progress_" + String(state.username)) : null;
  }
  function loadProgress(){
    var key = _progressKey();
    if(!key) return {};
    try{
      var raw = DBStorage.getItem(key);
      if(!raw) return {};
      var obj = JSON.parse(raw);
      return (obj && typeof obj === "object") ? obj : {};
    }catch(e){
      return {};
    }
  }
  function saveProgress(p){
    var key = _progressKey();
    if(!key) return;
    try{ DBStorage.setItem(key, JSON.stringify(p||{})); }catch(e){}
  }
  function touchProgress(patch){
    if(!state.username) return;
    var p = loadProgress();
    if(!p || typeof p !== "object") p = {};
    try{
      for(var k in patch){
        if(Object.prototype.hasOwnProperty.call(patch, k)) p[k] = patch[k];
      }
    }catch(e){}
    saveProgress(p);
  }

  // Track page opens as "progress"
  try{
    document.addEventListener("app:pageopen", function(ev){
      if(!state.loggedIn || !state.username) return;
      var d = ev && ev.detail ? ev.detail : null;
      var pid = d && d.pageId ? String(d.pageId) : "";
      if(!pid) return;
      touchProgress({ lastPage: pid, lastPageAt: Date.now() });
    });
  }catch(e){}

  

  // ===== Private Messages (LocalStorage) =====
  function pmEscapeHtml(s){
    if(s === undefined || s === null) s = "";
    return String(s)
      .replace(/&/g,"&amp;")
      .replace(/</g,"&lt;")
      .replace(/>/g,"&gt;")
      .replace(/"/g,"&quot;")
      .replace(/'/g,"&#39;");
  }

  function _pmKey(){
    return (state && state.username) ? ("pm_" + state.username) : null;
  }

  function _pmRead(){
    var key = _pmKey();
    if(!key) return null;
    try{
      var raw = DBStorage.getItem(key);
      var arr = raw ? JSON.parse(raw) : [];
      return (Array.isArray(arr) ? arr : []);
    }catch(e){
      return [];
    }
  }

  function _pmWrite(arr){
    var key = _pmKey();
    if(!key) return;
    try{ DBStorage.setItem(key, JSON.stringify(arr || [])); }catch(e){}
  }

  function updatePrivateMessagesBadge(){
    var badge = document.getElementById("privateMessagesBadge");
    if(!badge){ return; }
    if(!state || !state.loggedIn || !state.username){
      badge.style.display = "none";
      return;
    }
    var arr = _pmRead() || [];
    var hasUnread = false;
    for(var i=0;i<arr.length;i++){
      if(arr[i] && arr[i].unread){ hasUnread = true; break; }
    }
    badge.style.display = hasUnread ? "block" : "none";
  }
  window.updatePrivateMessagesBadge = updatePrivateMessagesBadge;

  function _pmEnsureSeed(){
    if(!state || !state.loggedIn || !state.username) return;
    var arr = _pmRead();
    if(arr && arr.length) return;

    var now = new Date();
    var seed = [{
      id: "m_" + now.getTime(),
      title: "ברוך הבא",
      body: "כאן יופיעו הודעות מבית הספר.",
      ts: now.toISOString(),
      unread: true
    }];
    _pmWrite(seed);
    updatePrivateMessagesBadge();
  }

  function pmToggleRead(id){
    var arr = _pmRead() || [];
    var i;
    for(i=0;i<arr.length;i++){
      if(arr[i] && arr[i].id === id) break;
    }
    if(i >= 0 && i < arr.length){
      arr[i].unread = !arr[i].unread;
      _pmWrite(arr);
      updatePrivateMessagesBadge();
      renderPrivateMessages();
    }
  }
  window.pmToggleRead = pmToggleRead;

  function pmMarkAllRead(){
    var arr = _pmRead() || [];
    var changed = false;
    for(var i=0;i<arr.length;i++){
      if(arr[i] && arr[i].unread){
        arr[i].unread = false;
        changed = true;
      }
    }
    if(changed){
      _pmWrite(arr);
      updatePrivateMessagesBadge();
    }
    renderPrivateMessages();
  }
  window.pmMarkAllRead = pmMarkAllRead;

  function pmCloseView(){
    var modal = document.getElementById("pmViewModal");
    if(!modal) return;
    try{ modal.classList.remove("show"); }catch(e){}
    try{ modal.style.display = "none"; }catch(e){}
    try{ modal.setAttribute("aria-hidden","true"); }catch(e){}
  }
  window.pmCloseView = pmCloseView;

  function pmOpenMessage(id){
    if(!id) return;
    if(!state || !state.loggedIn || !state.username){ return; }

    var arr = _pmRead() || [];
    var msg = null;
    for(var i=0;i<arr.length;i++){
      if(arr[i] && arr[i].id === id){
        msg = arr[i];
        if(msg && msg.unread){
          msg.unread = false;
          _pmWrite(arr);
        }
        break;
      }
    }

    // Update list + badge
    updatePrivateMessagesBadge();
    renderPrivateMessages();

    // Fill modal
    var modal = document.getElementById("pmViewModal");
    var titleEl = document.getElementById("pmViewTitle");
    var metaEl  = document.getElementById("pmViewMeta");
    var bodyEl  = document.getElementById("pmViewBody");
    if(titleEl){ titleEl.textContent = (msg && msg.title) ? String(msg.title) : "הודעה"; }
    if(bodyEl){ bodyEl.textContent = (msg && msg.body) ? String(msg.body) : ""; }
    if(metaEl){
      var dt = (msg && msg.ts) ? new Date(msg.ts) : new Date();
      var d  = dt.toLocaleDateString("he-IL");
      var t  = dt.toLocaleTimeString("he-IL", {hour:"2-digit", minute:"2-digit"});
      metaEl.textContent = t + " " + d;
    }

    // Bind close once
    var closeBtn = document.getElementById("pmViewClose");
    if(closeBtn && closeBtn.getAttribute("data-bound") !== "1"){
      closeBtn.setAttribute("data-bound","1");
      closeBtn.addEventListener("click", pmCloseView);
    }
    if(modal && modal.getAttribute("data-bound") !== "1"){
      modal.setAttribute("data-bound","1");
      modal.addEventListener("click", function(e){
        if(e && e.target === modal) pmCloseView();
      });
    }

    // Show modal
    if(modal){
      try{ modal.style.display = "flex"; }catch(e){}
      try{ modal.classList.add("show"); }catch(e){}
      try{ modal.setAttribute("aria-hidden","false"); }catch(e){}
    }
  }
  window.pmOpenMessage = pmOpenMessage;

  function renderPrivateMessages(){
    var list = document.getElementById("pmList");
    if(!list){ return; }

    if(!state || !state.loggedIn || !state.username){
      list.innerHTML = '<div class="pm-empty">כדי לראות הודעות יש להתחבר בפרופיל תלמיד.</div>';
      updatePrivateMessagesBadge();
      return;
    }

    _pmEnsureSeed();
    var arr = (_pmRead() || []).slice();
    arr.sort(function(a,b){
      var ats = (a && a.ts) ? a.ts : "";
      var bts = (b && b.ts) ? b.ts : "";
      return bts.localeCompare(ats);
    });

    if(!arr.length){
      list.innerHTML = '<div class="pm-empty">אין הודעות כרגע.</div>';
      updatePrivateMessagesBadge();
      return;
    }

    var html = '';

    for(var j=0;j<arr.length;j++){
      var m = arr[j] || {};
      var dt = m.ts ? new Date(m.ts) : new Date();
      var d  = dt.toLocaleDateString("he-IL");
      var t  = dt.toLocaleTimeString("he-IL", {hour:"2-digit", minute:"2-digit"});
      var title = pmEscapeHtml(m.title || "הודעה");
      var unread = !!m.unread;
      var idSafe = String(m.id || "").replace(/\\/g,"\\\\").replace(/'/g,"\\'");

      html += '<button class="pm-row ' + (unread ? 'unread' : '') + '" type="button" onclick="pmOpenMessage(\'' + idSafe + '\')">';
      html += '  <div class="pm-row-title"><span class="pm-dot" aria-hidden="true"></span><span>' + title + '</span></div>';
      html += '  <div class="pm-row-date">' + t + ' ' + d + '</div>';
      html += '</button>';
    }
    list.innerHTML = html;
    updatePrivateMessagesBadge();
  }
  window.renderPrivateMessages = renderPrivateMessages;

  // Send message programmatically (future admin panel / teacher side)
  window.sendPrivateMessage = function(targetUsername, title, body){
    if(!targetUsername) return;
    var key = "pm_" + targetUsername;
    var arr = [];
    try{
      var raw = DBStorage.getItem(key);
      var parsed = raw ? JSON.parse(raw) : [];
      arr = Array.isArray(parsed) ? parsed : [];
    }catch(e){ arr = []; }

    var now = new Date();
    arr.push({
      id: "m_" + now.getTime() + "_" + Math.floor(Math.random()*1000),
      title: String(title || "הודעה"),
      body: String(body || ""),
      ts: now.toISOString(),
      unread: true
    });

    try{ DBStorage.setItem(key, JSON.stringify(arr)); }catch(e){}
    if(state && state.loggedIn && state.username === targetUsername){
      try{ updatePrivateMessagesBadge(); }catch(e){}
      try{ renderPrivateMessages(); }catch(e){}
    }
  };

window.getStudentProgress = function(username){
    try{
      var u = username || state.username;
      if(!u) return {};
      var raw = DBStorage.getItem("student_progress_" + String(u));
      if(!raw) return {};
      var obj = JSON.parse(raw);
      return (obj && typeof obj === "object") ? obj : {};
    }catch(e){ return {}; }
  };
  window.setStudentProgress = function(username, patch){
    try{
      var u = username || state.username;
      if(!u) return;
      var key = "student_progress_" + String(u);
      var cur = {};
      try{
        var raw = DBStorage.getItem(key);
        if(raw) cur = JSON.parse(raw) || {};
      }catch(e2){ cur = {}; }
      if(!cur || typeof cur !== "object") cur = {};
      if(patch && typeof patch === "object"){
        for(var k in patch){
          if(Object.prototype.hasOwnProperty.call(patch,k)) cur[k] = patch[k];
        }
      }
      DBStorage.setItem(key, JSON.stringify(cur));
    }catch(e){}
  };

  function loadUsers(){
    var users = {};
    var hadRaw = false;

    try{
      var raw = DBStorage.getItem("appUsers");
      if(raw){
        hadRaw = true;
        var obj = JSON.parse(raw);
        if(obj){
          if(Array.isArray(obj)){
            // Support legacy formats: array of user records
            var out = {};
            for(var i=0;i<obj.length;i++){
              var r = obj[i] || {};
              if(!r || typeof r !== "object") continue;
              var user = r.tz || r.id || r.userId || r.username || r.user || r.uid || r.teudatZehut;
              var pass = r.password || r.pass || r.pw || r.pin || r.code || r.loginPassword;
              if(pass == null) pass = r.tempPassword;
              if(user != null && pass != null) out[String(user)] = String(pass);
            }
            users = out;
          }else if(typeof obj === "object"){
            users = obj;
          }
        }
      }
    }catch(e){ users = {}; }

    // Merge demo users from students_db_v1.js / storage (if available)
    try{
      var demo = (function(){
        function isObj(x){ return x && typeof x === "object"; }
        function addMap(out, k, v){
          k = String(k||"").trim();
          if(!k) return;
          if(v == null) return;
          var pv = String(v);
          if(!pv) return;
          if(out[k] == null) out[k] = pv;
        }
        function extract(data){
          var out = {};
          if(!data) return out;

          if(isObj(data) && !Array.isArray(data)){
            if(Array.isArray(data.students)) data = data.students;
            else if(Array.isArray(data.items)) data = data.items;
            else if(isObj(data.users) && !Array.isArray(data.users)){
              var uo = data.users;
              for(var kk in uo){
                if(Object.prototype.hasOwnProperty.call(uo, kk)) addMap(out, kk, uo[kk]);
              }
              return out;
            } else {
              var primCount = 0, total = 0;
              for(var kk2 in data){
                if(!Object.prototype.hasOwnProperty.call(data, kk2)) continue;
                total++;
                var vv = data[kk2];
                if(typeof vv === "string" || typeof vv === "number") primCount++;
              }
              if(total && primCount/total > 0.7){
                for(var kk3 in data){
                  if(Object.prototype.hasOwnProperty.call(data, kk3)) addMap(out, kk3, data[kk3]);
                }
                return out;
              }
            }
          }

          if(Array.isArray(data)){
            for(var i=0;i<data.length;i++){
              var r = data[i] || {};
              if(!isObj(r)) continue;
              var user = r.tz || r.id || r.userId || r.username || r.user || r.uid || r.teudatZehut;
              var pass = r.password || r.pass || r.pw || r.pin || r.code || r.loginPassword;
              if(pass == null) pass = r.tempPassword;
              if(user != null && pass != null) addMap(out, user, pass);
            }
          }
          return out;
        }

        try{
          var globals = [];
          if(window.STUDENTS_DB) globals.push(window.STUDENTS_DB);
          if(window.studentsDB) globals.push(window.studentsDB);
          if(window.students_db) globals.push(window.students_db);
          if(window.studentsDb) globals.push(window.studentsDb);
          if(window.demoStudents) globals.push(window.demoStudents);

          for(var gi=0;gi<globals.length;gi++){
            var outG = extract(globals[gi]);
            if(outG && Object.keys(outG).length) return outG;
          }
        }catch(e){}

        var keys = ["students_db_v1","students_db","studentsDb","students","demo_students","students_db_data"];
        for(var ki=0;ki<keys.length;ki++){
          try{
            var raw2 = DBStorage.getItem(keys[ki]);
            if(!raw2) continue;
            var parsed = JSON.parse(raw2);
            var out2 = extract(parsed);
            if(out2 && Object.keys(out2).length) return out2;
          }catch(e){}
          }

        return {};
      })();

      if(demo && typeof demo === "object"){
        for(var k in demo){
          if(Object.prototype.hasOwnProperty.call(demo, k)){
            if(users[k] == null) users[k] = String(demo[k]);
          }
        }
        if(Object.keys(demo).length && (!hadRaw)){
          try{ DBStorage.setItem("appUsers", JSON.stringify(users)); }catch(e){}
        }
      }
    }catch(e){}

    if(!users || typeof users !== "object") users = {};
    if(Object.keys(users).length === 0) return {"1":"1"}; // default demo user
    return users;
  }

/* ===== STUDENT PROFILE RENDER (v20) ===== */
window.renderStudentProfile = function(){
  function $(id){ return document.getElementById(id); }

  function makeTxId(){
    return 'tx_' + String(Date.now()) + '_' + String(Math.random()).slice(2);
  }
  function setText(id, val){
    var el = $(id);
    if(!el) return;
    var v = (val === undefined || val === null || String(val).trim() === "") ? "—" : String(val);
    el.textContent = v;
  }

  // Missing-profile hint element
  var missing = $("spMissingAlert");

  function pick(obj, keys){
    if(!obj) return "";
    for(var i=0;i<keys.length;i++){
      var k = keys[i];
      if(obj[k] !== undefined && obj[k] !== null && String(obj[k]).trim() !== "") return obj[k];
    }
    return "";
  }
  function digits(s){ return String(s||"").replace(/\D/g,""); }
  function normPhone(s){
    var d = digits(s);
    if(!d) return "";
    // keep leading 0 if present; if starts with 972 and length > 9, convert
    if(d.indexOf("972") === 0 && d.length >= 11){
      d = "0" + d.slice(3);
    }
    return d;
  }

function guessPhone(obj){
  try{
    if(!obj || typeof obj !== "object") return "";
    // direct common keys (including Hebrew variants and punctuation)
    var direct = [
      "phone","phoneNumber","phone_number","mobile","mobilePhone","mobile_phone","cell","cellPhone","cellphone",
      "מספר פלאפון","מס׳ פלאפון","מספרפלאפון","מספרטלפון","מספר טלפון","פלאפון","טלפון","טלפון נייד","טלפוןנייד","נייד",
      "טלפון 1","טלפון1","טלפון_1","phone1","phone_1"
    ];
    for(var i=0;i<direct.length;i++){
      var k = direct[i];
      if(obj[k] !== undefined && obj[k] !== null && String(obj[k]).trim() !== ""){
        return String(obj[k]);
      }
    }

    // key-name heuristic (covers unknown schemas like "טלפון:" / "מספר פלאפון (נייד)")
    for(var kk in obj){
      if(!Object.prototype.hasOwnProperty.call(obj, kk)) continue;
      var kls = String(kk||"");
      var kl = kls.toLowerCase();
      if(
        kl.indexOf("phone") !== -1 || kl.indexOf("mobile") !== -1 || kl.indexOf("cell") !== -1 ||
        kls.indexOf("טלפון") !== -1 || kls.indexOf("פלאפון") !== -1 || kls.indexOf("נייד") !== -1
      ){
        var vv = obj[kk];
        if(vv !== undefined && vv !== null && String(vv).trim() !== "") return String(vv);
      }
    }

    // scan values for phone-looking digit strings
    for(var k2 in obj){
      if(!Object.prototype.hasOwnProperty.call(obj, k2)) continue;
      var v2 = obj[k2];
      if(v2 === undefined || v2 === null) continue;
      var d = digits(String(v2));
      if(!d) continue;
      // normalize (handles +972)
      var n = normPhone(d);
      if(!n) continue;
      // Israeli phone lengths are typically 9-10 digits (including leading 0)
      if(n.length >= 9 && n.length <= 11){
        if(n.charAt(0) === "0") return n;
      }
    }
  }catch(e){}
  return "";
}

  function normDate(v){
    if(!v) return "";
    var s = String(v).trim();
    // If already looks like dd/mm/yyyy
    if(/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(s)) return s;
    // ISO yyyy-mm-dd
    var m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if(m){
      var y=m[1], mo=("0"+m[2]).slice(-2), d=("0"+m[3]).slice(-2);
      return d + "/" + mo + "/" + y;
    }
    return s;
  }
  function mapProfile(rec, fallbackUser){
    if(!rec || typeof rec !== "object") return null;
    var p = {};
    // Name
    p.firstName = pick(rec, ["firstName","fname","first_name","givenName","given_name","nameFirst","first","שם","שםפרטי"]);
    p.lastName  = pick(rec, ["lastName","lname","last_name","familyName","family_name","nameLast","last","משפחה","שםמשפחה"]);
    var full = pick(rec, ["fullName","name","שם_מלא","שםמלא"]);
    if((!p.firstName || !p.lastName) && full){
      var parts = String(full).trim().split(/\s+/);
      if(!p.firstName && parts.length) p.firstName = parts[0];
      if(!p.lastName && parts.length > 1) p.lastName = parts.slice(1).join(" ");
    }

    p.id = pick(rec, ["tz","id","userId","username","user","uid","teudatZehut","תז","ת\"ז"]);
    if(!p.id) p.id = fallbackUser || "";

    // Phone number can arrive in many schemas (including Hebrew keys with spaces)
    var _ph = pick(rec, [
      "phone","phoneNumber","phone_number","mobile","mobilePhone","mobile_phone","cell","cellPhone","cellphone",
      "מספרפלאפון","מספר פלאפון","מס׳ פלאפון","מספרטלפון","מספר טלפון","פלאפון","טלפון","טלפון נייד","טלפוןנייד","נייד",
      "טלפון 1","טלפון1","טלפון_1","phone1","phone_1"
    ]);
    if(!_ph) _ph = guessPhone(rec);
    p.phone = normPhone(_ph);
    p.email = pick(rec, ["email","mail","eMail"]);

    p.license = pick(rec, ["license","licenseType","license_type","licenseClass","license_class","type","rishayon","סוגרישיון","רישיון"]);
    p.testDate = normDate(pick(rec, ["testDate","nextTestDate","test_date","next_test_date","test","תאריךלטסט","טסט"]));

    p.lessonsDone = pick(rec, ["lessonsDone","lessonsCompleted","doneLessons","completedLessons","lessons_done","שיעוריםבוצעו","שיעוריםבבוצעו"]);
    p.lessonsLeft = pick(rec, ["lessonsLeft","lessonsRemaining","remainingLessons","lessons_left","שיעוריםשנשארו"]);
    p.testsTaken  = pick(rec, ["testsTaken","testsDone","tests","testCount","tests_taken","כמותטסטים","טסטים"]);

    // Preserve outside-training data (חוץ) if exists
    try{
      var olog = rec.outsideLog || rec.outLog || rec.outdoorLog;
      if(Array.isArray(olog)) p.outsideLog = olog;
      var oc = rec.outsideCount || rec.outCount;
      if(oc != null && oc !== '') p.outsideCount = oc;
    }catch(e){}

    return p;
  }

  function findProfileInData(data, username){
    if(!data) return null;

    // If direct record by key
    if(typeof data === "object" && !Array.isArray(data)){
      // direct match
      if(data[username] && typeof data[username] === "object") return mapProfile(data[username], username);

      // common nested containers
      var containers = ["students","data","records","list","items","users","db"];
      for(var ci=0;ci<containers.length;ci++){
        var c = data[containers[ci]];
        if(c){
          var got = findProfileInData(c, username);
          if(got) return got;
        }
      }
    }

    // Array of records
    if(Array.isArray(data)){
      for(var i=0;i<data.length;i++){
        var r = data[i];
        if(!r || typeof r !== "object") continue;
        var u = r.tz || r.id || r.userId || r.username || r.user || r.uid || r.teudatZehut || r["תז"] || r['ת"ז'];
        if(u != null && String(u) === String(username)){
          return mapProfile(r, username);
        }
      }
    }

    return null;
  }

  function getLoggedInUser(){
    try{ return DBStorage.getItem("student_username") || ""; }catch(e){ return ""; }
  }

  function getLocalProfile(username){
    if(!username) return null;
    try{
      var raw = DBStorage.getItem("student_profile_" + username);
      if(!raw) return null;
      var obj = JSON.parse(raw);
      return mapProfile(obj, username);
    }catch(e){ return null; }
  }

  // Read profile-like data from signup/registry store (students_registry_v1)
  function getRegistryProfile(userOrTz){
    userOrTz = String(userOrTz||"").trim();
    if(!userOrTz) return null;
    var z = userOrTz.replace(/\D/g, "");
    try{
      var raw = DBStorage.getItem("students_registry_v1");
      if(!raw) return null;
      var reg = JSON.parse(raw);
      if(!reg || typeof reg !== "object") return null;

      // Direct key lookup by tz
      if(z && reg[z] && typeof reg[z] === "object") return mapProfile(reg[z], z);
      if(reg[userOrTz] && typeof reg[userOrTz] === "object") return mapProfile(reg[userOrTz], userOrTz);

      // Scan values for matching ids / phone / username
      var uLow = userOrTz.toLowerCase();
      for(var key in reg){
        if(!Object.prototype.hasOwnProperty.call(reg,key)) continue;
        var r = reg[key];
        if(!r || typeof r !== "object") continue;
        var cand = [
          r.username, r.user, r.uid, r.userId, r.email,
          r.phone, r.mobile, r.phoneNumber, r.phone_number,
          r["מספר פלאפון"], r["מספרפלאפון"], r["פלאפון"], r["טלפון"], r["טלפון נייד"], r["נייד"],
          r.tz, r.id, r.teudatZehut, r["תז"], r['ת"ז'], r['ת״ז']
        ];
        for(var i=0;i<cand.length;i++){
          var c = cand[i];
          if(c==null) continue;
          var cs = String(c).trim();
          if(cs.toLowerCase && cs.toLowerCase() === uLow) return mapProfile(r, String(key));
          if(z && cs.replace(/\D/g,"") === z) return mapProfile(r, String(key));
        }
        // key itself might match
        if(z && String(key).replace(/\D/g,"") === z) return mapProfile(r, String(key));
        if(String(key).trim() === userOrTz) return mapProfile(r, String(key));
      }
    }catch(e){}
    return null;
  }

  function getDemoProfile(username){
    // Try globals first
    var globals = [
      // Lexical globals (students_db_v1.js often uses const, not window.*)
      (typeof STUDENTS_DB !== "undefined" ? STUDENTS_DB : null),
      (typeof studentsDB !== "undefined" ? studentsDB : null),
      (typeof students_db_v1 !== "undefined" ? students_db_v1 : null),
      (typeof students_db !== "undefined" ? students_db : null),
      (typeof studentsDb !== "undefined" ? studentsDb : null),
      (typeof students !== "undefined" ? students : null),
      (typeof demo_students !== "undefined" ? demo_students : null),
      (typeof students_db_data !== "undefined" ? students_db_data : null),

      // Window globals (fallback)
      window.STUDENTS_DB,
      window.studentsDB,
      window.students_db_v1,
      window.students_db,
      window.studentsDb,
      window.students,
      window.demo_students,
      window.students_db_data
    ];
    for(var i=0;i<globals.length;i++){
      try{
        var p = findProfileInData(globals[i], username);
        if(p) return p;
      }catch(e){}
    }

    // Try localStorage caches
    var keys = ["students_db_v1","students_db","studentsDb","students","demo_students","students_db_data"];
    for(var k=0;k<keys.length;k++){
      try{
        var raw = DBStorage.getItem(keys[k]);
        if(!raw) continue;
        var parsed = JSON.parse(raw);
        var p2 = findProfileInData(parsed, username);
        if(p2) return p2;
      }catch(e){}
    }

    return null;
  }

  var username = getLoggedInUser();

  // Allow manager/secretary to open a specific student's profile without logging in as that student
  try{
    var role = "";
    try{ role = (window.APP_STATE && window.APP_STATE.userRole) ? String(window.APP_STATE.userRole) : ""; }catch(e){}
    if(!role){
      if(document.body.classList.contains('secretary-mode')) role = "secretary";
      else if(document.body.classList.contains('manager-mode')) role = "manager";
    }
    // In secretary/manager mode allow opening a student's profile without logging in as that student.
    // Also allow when the current logged-in username is explicitly "מזכירה" / "מנהל" (in case APP_STATE role wasn't set).
    if(window.__profileViewTz && (role === "secretary" || role === "manager" || username === "מזכירה" || username === "מנהל")){
      username = String(window.__profileViewTz || "").trim() || username;
    }else{
      // prevent leaking view-as context into normal student login
      if(window.__profileViewTz && role !== "secretary" && role !== "manager"){
        window.__profileViewTz = null;
      }
    }
  }catch(e){}

  // Resolve the real student key (ת״ז) even if login is by username/phone/email (demo)
  function _normStr(v){ try{ return (v==null?"":String(v)).trim(); }catch(e){ return ""; } }
  function resolveStudentTzFromUsername(u){
    u = _normStr(u);
    if(!u) return "";
    var digits = u.replace(/\D/g,"");
    // If user already provided ת״ז (digits) keep it (Israel TZ is 9 digits; avoid treating phone numbers as TZ)
    if(digits && digits.length === 9) return digits;

    // Try to map by registry created on signup (students_registry_v1)
    try{
      var raw = DBStorage.getItem("students_registry_v1");
      if(!raw) return "";
      var reg = JSON.parse(raw);
      if(!reg || typeof reg !== "object") return "";
      var uLow = u.toLowerCase();
      for(var key in reg){
        if(!Object.prototype.hasOwnProperty.call(reg,key)) continue;
        var r = reg[key];
        if(!r || typeof r !== "object") continue;

        // direct key match
        if(String(key).trim() === u) return String(key);

        var cand = [
          r.username, r.user, r.uid, r.userId, r.email,
          r.phone, r.mobile, r.phoneNumber, r.phone_number,
          r["מספר פלאפון"], r["מספרפלאפון"], r["פלאפון"], r["טלפון"], r["טלפון נייד"], r["נייד"],
          r.tz, r.id, r.teudatZehut, r["תז"], r['ת"ז'], r['ת״ז']
        ];
        for(var i=0;i<cand.length;i++){
          var c = cand[i];
          if(c==null) continue;
          var cs = String(c).trim();
          if(cs.toLowerCase && cs.toLowerCase() === uLow) return String(key);
          if(digits && cs.replace(/\D/g,"") === digits) return String(key);
        }
      }
    }catch(e){}
    return "";
  }

  var activeTz = (resolveStudentTzFromUsername(username) || username || "").replace(/\D/g, "");

  // Load profile by resolved key (tz) and optionally merge with profile saved under login id
  var regA = getRegistryProfile(activeTz);
  var regB = (activeTz !== username) ? getRegistryProfile(username) : null;
  var profileA = getLocalProfile(activeTz) || getDemoProfile(activeTz);
  var profileB = (activeTz !== username) ? (getLocalProfile(username) || getDemoProfile(username)) : null;
  var profile = null;
  // Merge with registry as fallback (do NOT let empty fields overwrite)
  profile = Object.assign({}, regB || {}, regA || {}, profileB || {}, profileA || {});

  // Ensure phone is filled from any available source (including unknown schemas)
try{
  if(!profile) profile = {};
  var phoneFallback = (profile && profile.phone) ||
    (profileA && profileA.phone) || (profileB && profileB.phone) ||
    (regA && regA.phone) || (regB && regB.phone) || "";

  if(!phoneFallback){
    var rawP = null, rawR = null;
    try{ rawP = JSON.parse(DBStorage.getItem("student_profile_" + String(activeTz)) || "null"); }catch(_){}
    try{
      var _rawReg = JSON.parse(DBStorage.getItem("students_registry_v1") || "null");
      if(_rawReg && typeof _rawReg === "object"){
        rawR = _rawReg[String(activeTz)] || _rawReg[String(username)] || null;
      }
    }catch(_){}
    phoneFallback = guessPhone(rawP) || guessPhone(rawR) || "";
  }

  // Extra fallback: phone saved in school registration flow (license request) even if not in profile/registry yet
  if(!phoneFallback){
    try{
      var _tzN = String(activeTz||username||"").replace(/\D/g,"");
      if(_tzN && _tzN.length < 9) _tzN = _tzN.padStart(9,"0");

      // draft: school_reg_draft_v1 -> { data: { tz, phone, ... } }
      var _drRaw = DBStorage.getItem("school_reg_draft_v1");
      if(_drRaw){
        var _dr = JSON.parse(_drRaw || "null");
        var _d = _dr && _dr.data ? _dr.data : null;
        if(_d && typeof _d === "object"){
          var _dtz = String(_d.tz||"").replace(/\D/g,"");
          if(_dtz && _dtz.length < 9) _dtz = _dtz.padStart(9,"0");
          if(_tzN && _dtz && _dtz === _tzN){
            phoneFallback = _d.phone || _d["מספר פלאפון"] || _d["טלפון"] || "";
          }
        }
      }

      // requests: school_reg_requests_v1 -> [ { tz, phone, ... } ... ]
      if(!phoneFallback){
        var _rqRaw = DBStorage.getItem("school_reg_requests_v1");
        if(_rqRaw){
          var _arr = JSON.parse(_rqRaw || "[]");
          if(Array.isArray(_arr)){
            for(var qi=0; qi<_arr.length; qi++){
              var _r = _arr[qi];
              if(!_r || typeof _r !== "object") continue;
              var _rtz = String(_r.tz||_r.id||"").replace(/\D/g,"");
              if(_rtz && _rtz.length < 9) _rtz = _rtz.padStart(9,"0");
              if(_tzN && _rtz && _rtz === _tzN){
                phoneFallback = _r.phone || _r["מספר פלאפון"] || _r["טלפון"] || "";
                if(phoneFallback) break;
              }
            }
          }
        }
      }
    }catch(_e){}
  }

  if(phoneFallback) profile.phone = normPhone(phoneFallback);
}catch(e){}

  // Expose active student tz for other modules (e.g. lessons history modal)
  try{
    var sid = (profile && (profile.id || profile.tz || profile.userId || profile.teudatZehut || profile["תז"] || profile['ת"ז'])) || activeTz;
    if(typeof normalizeTz === "function") window.__activeStudentTz = normalizeTz(sid);
    else window.__activeStudentTz = String(sid||"").replace(/\D/g,"");
  }catch(e){}
  try{ if(window.APP_STATE) window.APP_STATE.activeStudentTz = window.__activeStudentTz || null; }catch(e){}

  if(!username || !profile){
    if(missing) missing.style.display = "block";
    setText("spFirstName", "");
    setText("spLastName", "");
    setText("spLicense", "");
    setText("spId", username || "");
    setText("spPhone", "");
    setText("spTestDate", "");
    setText("spLessonsDone", "");
    setText("spTestsTaken", "");
    try{ if(typeof window.renderStudentStats === "function") window.renderStudentStats(null, username); }catch(e){}
    return;
  }

  if(missing) missing.style.display = "none";

  setText("spFirstName", profile.firstName);
  setText("spLastName", profile.lastName);
  setText("spLicense", profile.license);
  setText("spId", profile.id);
  setText("spPhone", profile.phone);
  setText("spTestDate", profile.testDate);
  setText("spLessonsDone", profile.lessonsDone);
  setText("spTestsTaken", profile.testsTaken);

  try{ if(typeof window.renderStudentStats === "function") window.renderStudentStats(profile, username); }catch(e){}
};

/* ===== STUDENT PROFILE STATS (v2) ===== */
window.renderStudentStats = function(profile, username){
  function $(id){ return document.getElementById(id); }

  function makeTxId(){
    return 'tx_' + String(Date.now()) + '_' + String(Math.random()).slice(2);
  }
  function setText(id, val){
    var el = $(id);
    if(!el) return;
    var v = (val === undefined || val === null || String(val).trim() === "") ? "—" : String(val);
    el.textContent = v;
  }
  function setShow(id, show){
    var el = $(id);
    if(!el) return;
    el.style.display = show ? "block" : "none";
  }
  function parseNum(v){
    if(v === undefined || v === null) return null;
    var s = String(v).replace(/,/g,'').trim();
    var m = s.match(/-?\d+(?:\.\d+)?/);
    if(!m) return null;
    var n = parseFloat(m[0]);
    if(!isFinite(n)) return null;
    return n;
  }
  function fmtHalfNum(n){
    if(n === undefined || n === null) return null;
    var v = parseFloat(n);
    if(!isFinite(v)) return null;
    v = Math.round(v * 2) / 2;
    if(Math.abs(v - Math.round(v)) < 1e-9) return String(Math.round(v));
    return String(v);
  }

  function pct(done,total){
    if(!total || total <= 0) return 0;
    var p = Math.round((done/total)*100);
    if(p < 0) p = 0;
    if(p > 100) p = 100;
    return p;
  }
  function fmtMoney(v){
    if(v === undefined || v === null || v === "") return "—";
    var n = parseNum(v);
    if(n === null) return String(v);
    var n2 = Math.round(n * 100) / 100;
    try{ return n2.toLocaleString('he-IL') + "₪"; }catch(e){ return String(n2) + "₪"; }
  }


  function moneyToLessons(amount){
    var n = parseNum(amount);
    if(n === null) return null;
    var lessons = n / 150;
    lessons = Math.round(lessons * 2) / 2; // nearest 0.5
    return lessons;
  }
  function fmtLessonsCount(x){
    if(x === undefined || x === null || x === "") return "—";
    var n = Number(x);
    if(!isFinite(n)) return String(x);
    var v = Math.round(n * 2) / 2;
    var s = String(v);
    if(s.indexOf('.') >= 0){
      s = s.replace(/\.0$/, '');
    }
    var label = (v === 1) ? "שיעור" : "שיעורים";
    return s + " " + label;
  }
  function fmtMoneyWithLessons(v){
    var m = fmtMoney(v);
    if(m === "—") return "—";
    var l = moneyToLessons(v);
    if(l === null) return m;
    return m + " (" + fmtLessonsCount(l) + ")";
  }

  // defaults
  var done = null, total = null;
  var testDate = "";

  if(profile){
    done = parseNum(profile.lessonsDone);
    testDate = (profile.testDate != null) ? String(profile.testDate).trim() : "";
  }

  if(done != null) total = 15;

  // scheduled lessons (optional storage)
  var scheduled = [];
  try{
    if(username){
      var raw = DBStorage.getItem('student_scheduled_lessons_' + username);
      if(raw){
        var arr = JSON.parse(raw);
        if(Array.isArray(arr)) scheduled = arr;
      }
    }
  }catch(e){}

  // payments (optional storage)
  var pay = null;
  try{
    if(username){
      var rawp = DBStorage.getItem('student_payments_' + username);
      if(rawp){
        var obj = JSON.parse(rawp);
        if(obj && typeof obj === 'object') pay = obj;
      }
    }
  }catch(e){}

  var scheduledCount = Array.isArray(scheduled) ? scheduled.length : 0;

  // KPI
  setText('spKpiDone', (done != null) ? fmtHalfNum(done) : "—");
  // Outside (חוץ) KPI
  var outCount = 0;
  try{
    var olog = (profile && (profile.outsideLog || profile.outLog || profile.outdoorLog)) || null;
    if(Array.isArray(olog)) outCount = olog.length;
    else{
      var oc = parseFloat(profile && (profile.outsideCount || profile.outCount));
      if(isFinite(oc)) outCount = oc;
    }
  }catch(_e){}
  setText('spKpiOut', outCount);
  // Money credit balance (₪) - derived from payments/credit key (TZ-based)
  var creditMoney = 0;
  try{
    // prefer TZ key (admin + student mapping), fallback to username key
    var tzKey = "";
    try{ if(typeof resolveStudentTzFromUsername === "function" && username) tzKey = resolveStudentTzFromUsername(username); }catch(_e){}
    if(!tzKey && username){
      try{ tzKey = String(username||"").replace(/\D/g,""); }catch(_e2){}
    }

    var rawc = null;

    if(tzKey){
      rawc = DBStorage.getItem(keyStudentCredit(tzKey));
    }
    if((rawc === null || rawc === undefined || rawc === "") && username){
      rawc = DBStorage.getItem(keyStudentCredit(username));
    }

    var cm = parseFloat(rawc);
    if(isFinite(cm)) {
      creditMoney = cm;
    } else {
      // Fallback: compute from payment ledger if credit key is missing
      var payObj = null;
      if(tzKey) payObj = payLsGet(payKeyStudent(tzKey), null);
      if((!payObj || typeof payObj !== "object") && username) payObj = payLsGet(payKeyStudent(username), null);
      if(payObj && typeof payObj === "object"){
        payEnsureLedger(payObj, tzKey || username);
        var dueNow = Number(payObj.due);
        if(isFinite(dueNow)) creditMoney = dueNow;
      }
    }
  }catch(e){}
  
  // === CREDIT FROM COMPLETED LESSONS (v13) ===
  try{
    var __tzForBal = (tzKey || '').toString().trim();
    var __userForBal = (username || '').toString().trim();

    function __getLS(k){
      try{
        return (typeof DBStorage !== 'undefined' && DBStorage.getItem)
          ? DBStorage.getItem(k)
          : localStorage.getItem(k);
      }catch(e){ return null; }
    }
    function __setLS(k, v){
      try{
        if(typeof DBStorage !== 'undefined' && DBStorage.setItem) DBStorage.setItem(k, v);
        else localStorage.setItem(k, v);
      }catch(e){}
    }
    function __normTzBal(v){
      var d = String(v == null ? '' : v).replace(/\D/g,'');
      if(d && d.length < 9) d = d.padStart(9,'0');
      return d;
    }

    var __tzN = __normTzBal(__tzForBal) || __tzForBal;

    // Sum lesson units from Lesson Management (daily reports)
    var __rawReports = __getLS('admin_lesson_reports_v1');
    var __reportsObj = {};
    try{ __reportsObj = __rawReports ? JSON.parse(__rawReports) : {}; }catch(e){ __reportsObj = {}; }

    var __totalUnits = 0;
    function __parseUnits(r){
      if(!r || typeof r !== 'object') return 1;
      var ks = ['units','lessonUnits','lessons','lessonsCount','count','qty','amount','numLessons','num','value'];
      for(var i=0;i<ks.length;i++){
        var k = ks[i];
        if(r[k] == null) continue;
        var v = r[k];
        if(typeof v === 'number' && isFinite(v)) return v;
        if(typeof v === 'string'){
          var m = String(v).match(/([0-9]+(?:\.[0-9]+)?)/);
          if(m) return parseFloat(m[1]);
        }
      }
      return 1;
    }

    if(__reportsObj && typeof __reportsObj === 'object'){
      Object.keys(__reportsObj).forEach(function(dk){
        var arr = __reportsObj[dk];
        if(!Array.isArray(arr)) return;
        arr.forEach(function(r){
          if(!r) return;
          var typ = String((r.type || r.kind || r.eventType || 'lesson') || 'lesson').toLowerCase().trim();
          if(typ === 'outside') return; // outside is not charged from credit
          var rtz = String(r.tz || '').trim();
          if(__normTzBal(rtz) !== __tzN && rtz !== __tzForBal && rtz !== __userForBal) return;

          var u = __parseUnits(r);
          if(!isFinite(u) || u <= 0) u = 1;
          __totalUnits += u;
        });
      });
    }

    var __spent = Math.round(__totalUnits * 150);

    // Extra spending from credit (e.g., test order)
    var __extraSpent = 0;
    try{
      function __getExtra(id){
        if(!id) return 0;
        var v = __getLS(keyStudentExtraSpent(id));
        var n = parseFloat(v);
        return isFinite(n) ? n : 0;
      }
      if(__tzForBal) __extraSpent = __getExtra(__tzForBal);
      if((!__extraSpent || __extraSpent===0) && __userForBal) __extraSpent = __getExtra(__userForBal);
    }catch(e){ __extraSpent = 0; }
    if(isFinite(__extraSpent) && __extraSpent>0) __spent += Math.round(__extraSpent);

    // Test orders spending (400₪ each) from admin log
    try{
      var __testRaw = __getLS('admin_test_orders_v1');
      var __testObj = {};
      try{ __testObj = __testRaw ? JSON.parse(__testRaw) : {}; }catch(e){ __testObj = {}; }
      var __tSpent = 0;
      var __tzMatch = __normTzBal(__tzForBal) || __tzForBal;
      if(__testObj && typeof __testObj === 'object'){
        Object.keys(__testObj).forEach(function(dk){
          var arr = __testObj[dk];
          if(!Array.isArray(arr)) return;
          arr.forEach(function(r){
            if(!r) return;
            var rtz = __normTzBal(r.tz) || String(r.tz||'');
            if(__tzMatch && rtz && rtz === __tzMatch){
              var pr = Number(r.price);
              if(!isFinite(pr) || pr<=0) pr = 400;
              __tSpent += pr;
            }
          });
        });
      }
      if(isFinite(__tSpent) && __tSpent>0) __spent += Math.round(__tSpent);
    }catch(e){}

    // paid_total baseline (money added by payments) - source of truth: payment ledger (pay.paidTotal)
    function __paidKey(id){ return 'student_credit_paid_total_' + String(id||'').trim(); }

    var __paidTotal = NaN;

    // Prefer payment ledger totals (updates immediately when a payment is made)
    try{
      var __payObj = null;
      try{ if(typeof payObj === 'object' && payObj) __payObj = payObj; }catch(_e){}
      if(!__payObj && __tzForBal) __payObj = payLsGet(payKeyStudent(__tzForBal), null);
      if((!__payObj || typeof __payObj !== 'object') && __userForBal) __payObj = payLsGet(payKeyStudent(__userForBal), null);

      if(__payObj && typeof __payObj === 'object'){
        var __pt = Number(__payObj.paidTotal || __payObj.paid || 0);
        if(isFinite(__pt)) __paidTotal = __pt;
      }
    }catch(e){}

    // Fallback: stored baseline (older installs)
    if(!isFinite(__paidTotal)){
      var __paidRaw = null;
      if(__tzForBal) __paidRaw = __getLS(__paidKey(__tzForBal));
      if((__paidRaw === null || __paidRaw === undefined || __paidRaw === '') && __userForBal) __paidRaw = __getLS(__paidKey(__userForBal));
      __paidTotal = parseFloat(__paidRaw);
    }

    if(!isFinite(__paidTotal)){
      // Last resort: assume current credit includes payments already, so reverse by adding spent back
      var __cur = parseFloat(creditMoney);
      if(!isFinite(__cur)) __cur = 0;
      __paidTotal = __cur + (__spent||0);
    }

    // Keep baseline key updated for stability across sessions
    try{
      if(__tzForBal) __setLS(__paidKey(__tzForBal), String(__paidTotal));
      if(__userForBal) __setLS(__paidKey(__userForBal), String(__paidTotal));
    }catch(e){}

    var __newBal = __paidTotal - __spent;

    if(isFinite(__newBal)){
      creditMoney = __newBal;

      // Keep credit key in sync (profile + shop use this)
      if(__tzForBal) __setLS(keyStudentCredit(__tzForBal), String(Math.round(__newBal)));
      if(__userForBal) __setLS(keyStudentCredit(__userForBal), String(Math.round(__newBal)));
    }
  }catch(e){}

  setText('spBalanceMoney', fmtMoney(creditMoney));
  setText('spLessonsDone', (done != null) ? fmtHalfNum(done) : "—");
  setText('spKpiScheduled', scheduledCount);

  // Test
  var testStatus = $('spTestStatus');
  if(testStatus){
    if(testDate){
      testStatus.textContent = 'טסט נקבע ל: ' + testDate;
    }else{
      testStatus.textContent = 'אין טסט נקבע כרגע';
    }
  }

  // Scheduled lessons table
  var tbody = $('spSchedTbody');
  if(tbody) tbody.innerHTML = '';
  var wrap = $('spSchedWrap');
  var empty = $('spSchedEmpty');
  if(!scheduledCount){
    if(wrap) wrap.style.display = 'none';
    if(empty) empty.style.display = 'block';
    setText('spSchedPill', '0');
  }else{
    if(empty) empty.style.display = 'none';
    if(wrap) wrap.style.display = 'block';
    setText('spSchedPill', String(scheduledCount));

    if(tbody){
      for(var i=0;i<scheduled.length && i<10;i++){
        var r = scheduled[i] || {};
        var tr = document.createElement('tr');

        var tdD = document.createElement('td'); tdD.textContent = (r.date || r.day || r.when || '—');
        var tdT = document.createElement('td'); tdT.textContent = (r.time || r.hour || '—');
        var tdS = document.createElement('td'); tdS.textContent = (r.status || r.state || 'נקבע');

        tr.appendChild(tdD); tr.appendChild(tdT); tr.appendChild(tdS);
        tbody.appendChild(tr);
      }
    }
  }

  // Payments
  if(pay){
    setText('spPayPaid', fmtMoney(pay.paid)); 
    setText('spPayLast', pay.lastPayment || pay.last || '—');
    setText('spPayPill', 'מעודכן');
    if(pay.note) setText('spPayNote', pay.note);
    else setText('spPayNote', '—');
  }else{
    setText('spPayPaid', '—');
    setText('spPayDue',  '—');
    setText('spPayLast', '—');
    setText('spPayPill', '—');
    setText('spPayNote', 'אין נתוני תשלום שמורים');
  }
};

  function saveUsers(users){
    try{ DBStorage.setItem("appUsers", JSON.stringify(users||{})); }catch(e){}
  }

  function setAuthMode(){
    // v10: login only (signup flow removed)
    state.authMode = "login";
    var title = $("authTitle");
    var loginBtn = $("authLoginBtn");
    var swapBtn  = $("authSignupBtn");
    if(title) title.textContent = "התחברות";
    if(loginBtn) loginBtn.textContent = "להתחבר";
    if(swapBtn)  swapBtn.textContent  = "הירשם";
  }

  function getLoggedFirstName(){
    var u = state.username;
    if(!u) return null;

    // Prefer saved student profile (created in signup) - stored by tz/username
    try{
      var rawP = DBStorage.getItem("student_profile_" + String(u));
      if(rawP){
        var p = JSON.parse(rawP || "{}") || {};
        var fn = p.firstName || p.first_name || p.fname || p.firstname || p.name || p.first || null;
        if(fn){
          fn = String(fn).trim();
          if(fn) return fn.split(/\s+/)[0];
        }
      }
    }catch(e){}

    // Fallback: appUsers record (supports older structures)
    try{
      var users = loadUsers();
      if(users && users[String(u)]){
        var rec = users[String(u)] || {};
        var fn2 = rec.firstName || rec.first_name || rec.fname || rec.firstname || rec.name || rec.first || null;
        if(fn2){
          fn2 = String(fn2).trim();
          if(fn2) return fn2.split(/\s+/)[0];
        }
      }
    }catch(e){}

    return null;
  }

  function setStudentTitle(){
    var t = $("studentMenuTitle");
    if(!t) return;
    var fn = (state.loggedIn ? getLoggedFirstName() : null);
    var name = fn || (state.loggedIn ? (state.username || "אורח") : "אורח");
    t.textContent = "ברוך הבא: " + name;
  
    updateEdgeHandles();
}

  

// Edge handles: delayed show + follow menu transition
var edgeShowTimer = null;
function cancelEdgeShowTimer(){
  if(edgeShowTimer){
    clearTimeout(edgeShowTimer);
    edgeShowTimer = null;
  }
}
function scheduleEdgeShow(){
  cancelEdgeShowTimer();
  edgeShowTimer = setTimeout(function(){
    edgeShowTimer = null;
    try{ updateEdgeHandles(); }catch(e){}
  }, 0);
}
function rafEdgeFollow(ms){
  var start = (window.performance && performance.now) ? performance.now() : Date.now();
  function step(t){
    try{ updateEdgeHandlePositions(); }catch(e){}
    var now = (typeof t === "number") ? t : ((window.performance && performance.now) ? performance.now() : Date.now());
    if(now - start < ms){
      try{ requestAnimationFrame(step); }catch(e){}
    }
  }
  try{ requestAnimationFrame(step); }catch(e){ try{ updateEdgeHandlePositions(); }catch(e2){} }
}
function updateEdgeHandles(){
  var body = document.body;

  // Home = no overlays/menus/pages/popups at all.
  var anyPageOpen = !!document.querySelector(".page.show");
  var anyPopupOpen = !!document.querySelector(".overlay.show");

  var anyOverlay =
    body.classList.contains("menu-open") ||
    body.classList.contains("menu-opening") ||
    body.classList.contains("student-menu-open") ||
    body.classList.contains("student-menu-opening") ||
    body.classList.contains("popup-open") ||
    body.classList.contains("page-open") ||
    body.classList.contains("auth-open") ||
    body.classList.contains("start-open") ||
    body.classList.contains("pay-open") ||
    body.classList.contains("admin-open") ||
    body.classList.contains("manager-open") ||
    anyPageOpen ||
    anyPopupOpen;

  var onHome = !anyOverlay;

  var rh = $("rightEdgeHandle");
  if(rh){
    rh.style.display = "flex";
    if(onHome) rh.classList.add("edge-visible");
    else rh.classList.remove("edge-visible");
  }

  var lh = $("leftEdgeHandle");
  if(lh){
    var loggedIn = false;
    try{ loggedIn = DBStorage.getItem("student_logged_in") === "1"; }catch(e){}
    if(loggedIn){
      lh.style.display = "flex";
      if(onHome) lh.classList.add("edge-visible");
      else lh.classList.remove("edge-visible");
    }else{
      lh.classList.remove("edge-visible");
      lh.style.display = "none";
    }
  }

  if(onHome){
    try{ updateEdgeHandlePositions(); }catch(e){}
    try{ requestAnimationFrame(updateEdgeHandlePositions); }catch(e){}
  }
}

  function updateEdgeHandlePositions(){
    var rh = $("rightEdgeHandle");
    var lh = $("leftEdgeHandle");
    var vw = window.innerWidth || document.documentElement.clientWidth || 0;
    var vh = window.innerHeight || document.documentElement.clientHeight || 0;

    // Right menu handle: stick to the LEFT edge of the right menu when open,
    // otherwise peek from the screen edge (half hidden).
    if(rh){
      var side = $("sideMenu");
      var hw = rh.getBoundingClientRect().width || 28;
      var hh = rh.getBoundingClientRect().height || 48;

      var x = vw - (hw/2);
      var y = 170;

      if(side){
        var r = side.getBoundingClientRect();
        y = r.top + 120;

        var open = document.body.classList.contains("menu-open") || document.body.classList.contains("menu-closing");
        if(open){
          x = r.left - (hw/2);
        }else{
          x = vw - (hw/2);
        }
      }

      // shift down by half of the handle height
      y = y + (hh/2);

      // clamp
      if(vh){ y = Math.max(60, Math.min(vh - hh - 60, y)); }
      x = Math.max(-hw/2, Math.min(vw - hw/2, x));

      rh.style.left = x + "px";
      rh.style.top  = y + "px";
    }

    // Left (profile) menu handle: stick to the RIGHT edge of the left menu when open,
    // otherwise peek from the screen edge (half hidden).
    if(lh){
      var sm = $("studentMenuLeft");
      var hw2 = lh.getBoundingClientRect().width || 28;
      var hh2 = lh.getBoundingClientRect().height || 48;

      var x2 = - (hw2/2);
      var y2 = 120;

      if(sm){
        var r2 = sm.getBoundingClientRect();
        y2 = r2.top + 22;

        var open2 = document.body.classList.contains("student-menu-open") || document.body.classList.contains("student-menu-closing");
        if(open2){
          x2 = r2.right - (hw2/2);
        }else{
          x2 = - (hw2/2);
        }
      }

      // shift down by half of the handle height
      y2 = y2 + (hh2/2);

if(vh){ y2 = Math.max(60, Math.min(vh - hh2 - 60, y2)); }
      x2 = Math.max(-hw2/2, Math.min(vw - hw2/2, x2));

      lh.style.left = x2 + "px";
      lh.style.top  = y2 + "px";
    }
  }

function openAuth(mode){
    // Only one menu can be open
    try{ if(document.body.classList.contains('menu-open') && typeof window.closeMenu === 'function') window.closeMenu(); }catch(e){}
    try{ if(document.body.classList.contains('student-menu-open')) closeProfileMenu(); }catch(e){}
    try{ if(document.body.classList.contains('start-open')) closeStartOverlay(); }catch(e){}
    try{ if(document.body.classList.contains('pay-open')) closePaymentModal(); }catch(e){}

    var overlay = $("authOverlay");
    if(!overlay) return;

    // safety: release any temporary readonly used for IME reset
    try{ var u = $("authUsername"); if(u) u.readOnly = false; }catch(e){}
    document.body.classList.add("auth-open");
    overlay.setAttribute("aria-hidden","false");

    // reset to user/pass view
    showUserPass();
    setAuthMode();

    // Focus username immediately (mobile-friendly)
// Android first-focus IME bug workaround: force a proper text keyboard by toggling readonly + refocus.
try{
  var u = $("authUsername");
  if(u){
    try{ overlay && overlay.offsetHeight; }catch(e){}
    try{ u.type = "text"; }catch(e){}
    try{ u.setAttribute("inputmode","text"); }catch(e){}

    // Toggle readonly to "reset" the IME on some Android devices (first load only symptom)
    try{ u.readOnly = true; }catch(e){}

    requestAnimationFrame(function(){
      try{ u.focus({preventScroll:true}); }catch(e){ try{ u.focus(); }catch(e2){} }
      setTimeout(function(){
        try{ u.readOnly = false; }catch(e){}
        try{ u.focus({preventScroll:true}); }catch(e){ try{ u.focus(); }catch(e2){} }
        try{
          var len = (u.value || "").length;
          u.setSelectionRange(len, len);
        }catch(e){}
      }, 80);
    });
  }
}catch(e){}
}
function closeAuth(){
    var overlay = $("authOverlay");
    if(!overlay) return;

    // safety: release any temporary readonly used for IME reset
    try{ var u = $("authUsername"); if(u) u.readOnly = false; }catch(e){}

    // If user closed auth without completing login/signup, cancel any pending post-auth navigation
    if(!state.loggedIn){
      state.postAuthPage = null;
    }

    document.body.classList.remove("auth-open");
    try{ setAuthMode('login'); }catch(e){}
    overlay.setAttribute("aria-hidden","true");

    try{ __blurActiveInputs(); }catch(e){}
  }

  
  function syncStartOverlayActions(){
    var proc = $("startGoProcessBtn");
    var su = $("startGoSignupBtn");
    var li = $("startGoLoginBtn");
    if(!proc || !su || !li) return;

    if(state && state.loggedIn){
      proc.style.display = "inline-flex";
      su.style.display = "none";
      li.style.display = "none";
    } else {
      proc.style.display = "none";
      su.style.display = "inline-flex";
      li.style.display = "inline-flex";
    }
  }

function openStartOverlay(){
    syncStartOverlayActions();
    // close other UI layers
    try{ if(typeof window.closeMenu === 'function') window.closeMenu(); }catch(e){}
        try{ secSetResultsVisible(false); }catch(e){}
try{ closeProfileMenu(); }catch(e){}
    try{ closeAuth(); }catch(e){}
    try{ closePaymentModal(); }catch(e){}
    document.body.classList.add("start-open");
    var o = $("startOverlay");
    if(o) o.setAttribute("aria-hidden","false");
  }

  function closeStartOverlay(){
    document.body.classList.remove("start-open");
    var o = $("startOverlay");
    if(o) o.setAttribute("aria-hidden","true");
  }

  function beginAuthFromStart(mode){
    // If already logged in, go directly to the target page
    if(state.loggedIn){
      state.postAuthPage = null;
      closeStartOverlay();
      try{ openPage("licenseRequestPage"); }catch(e){}
      return;
    }

    // Signup goes to signup subpage
    if(mode === "signup"){
      try{ closeAuth(); }catch(e){}
      try{ openSignupPage(); }catch(e){}
      return;
    }

    // Login stays in the internal auth modal
    state.postAuthPage = "licenseRequestPage";
    closeStartOverlay();
    openAuth("login");
  }

  function openLicenseRequestPage(){
    try{ closeProfileMenu(); }catch(e){}
    try{ if(typeof window.closeMenu === 'function') window.closeMenu(); }catch(e){}
    openPage("licenseRequestPage");
  try{ if(typeof window.__licenseFlowRefresh==="function") window.__licenseFlowRefresh(); }catch(e){}
  }

  

  // --- Lessons <-> money helpers (0.5 precision) ---
  function calcLessonsFromDue(dueMoney){
    var n = parseFloat(dueMoney);
    if(!isFinite(n) || n < 0) n = 0;
    var lessons = n / 150;
    lessons = Math.round(lessons * 2) / 2;
    if(lessons < 0) lessons = 0;
    return lessons;
  }
  function fmtHalfLesson(v){
    var n = parseFloat(v);
    if(!isFinite(n)) n = 0;
    n = Math.round(n * 2) / 2;
    if(Math.abs(n - Math.round(n)) < 1e-9) return String(Math.round(n));
    return String(n);
  }
  try{
    if(!window.calcLessonsFromDue) window.calcLessonsFromDue = calcLessonsFromDue;
    if(!window.fmtHalfLesson) window.fmtHalfLesson = fmtHalfLesson;
  }catch(e){}

  /* ===== Payments (Packages) v1 ===== */
  var PAY = {
    bound:false,
    selectedPack:null,
    selectedLessons:0,
    selectedAmount:null,
    selectedNote:null
  };

  function payLsGet(key, fallback){
    try{
      var raw = DBStorage.getItem(key);
      if(!raw) return fallback;
      var obj = JSON.parse(raw);
      if(obj === undefined || obj === null) return fallback;

      // Normalize + backfill ledger for student payments object (source of truth for "due")
      try{
        if(typeof key === "string" && key.indexOf("student_payments_") === 0 && obj && typeof obj === "object"){
          var u = key.substring("student_payments_".length);
          var changed = false;
          if(!Array.isArray(obj.ledger)){ obj.ledger = []; changed = true; }
          if(!obj.__ledger_v1){
            var initAmt = NaN;
            var due0 = parseFloat(obj.due);
            if(isFinite(due0) && due0 > 0) initAmt = due0;

            if(!isFinite(initAmt) && u){
              try{
                var p = null;
                try{ p = JSON.parse(DBStorage.getItem(payKeyProfile(u))||"null"); }catch(_e){ p = null; }
                var ll = p ? parseFloat(p.lessonsLeft) : NaN;
                if(isFinite(ll) && ll > 0) initAmt = ll * 150;
              }catch(_e2){}
            }

            if(isFinite(initAmt) && initAmt > 0){
              obj.ledger.unshift({
                id: "ob_" + Date.now(),
                ts: Date.now(),
                type: "opening_balance",
                amount: Math.round(initAmt*100)/100,
                note: "יתרה קיימת"
              });
              changed = true;
            }
            obj.__ledger_v1 = 1;
            changed = true;
          }

          // Keep derived due in sync
          try{
            var s = 0;
            for(var i=0;i<obj.ledger.length;i++){
              var a = parseFloat(obj.ledger[i] && obj.ledger[i].amount);
              if(isFinite(a)) s += a;
            }
            s = Math.round(s*100)/100;
            if(s < 0) s = 0;
            if(!isFinite(parseFloat(obj.due)) || Math.abs(parseFloat(obj.due) - s) > 0.009){
              obj.due = s;
              changed = true;
            }
          }catch(_e3){}

          if(changed){
            try{ DBStorage.setItem(key, JSON.stringify(obj)); }catch(_e4){}
          }
        }
      }catch(_e5){}

      return obj;
    }catch(e){ return fallback; }
  }
  function payLsSet(key, obj){
    try{ DBStorage.setItem(key, JSON.stringify(obj)); }catch(e){}
  }

  // Ledger helpers (source of truth for "due")
  function payRound2(n){
    n = parseFloat(n);
    if(!isFinite(n)) n = 0;
    return Math.round(n*100)/100;
  }
  function payLedgerSum(payObj){
    try{
      if(!payObj || !Array.isArray(payObj.ledger)) return 0;
      var s = 0;
      for(var i=0;i<payObj.ledger.length;i++){
        var a = parseFloat(payObj.ledger[i] && payObj.ledger[i].amount);
        if(isFinite(a)) s += a;
      }
      s = payRound2(s);
      if(s < 0) s = 0;
      return s;
    }catch(e){ return 0; }
  }
  function payEnsureLedger(payObj, u){
    if(!payObj || typeof payObj !== "object") payObj = {};
    if(!Array.isArray(payObj.ledger)) payObj.ledger = [];
    if(!payObj.__ledger_v1){
      var initAmt = NaN;
      var due0 = parseFloat(payObj.due);
      if(isFinite(due0) && due0 > 0) initAmt = due0;

      if(!isFinite(initAmt) && u){
        try{
          var rawc = DBStorage.getItem(keyStudentCredit(u));
          var cm = parseFloat(rawc);
          if(isFinite(cm) && cm > 0) initAmt = cm;
        }catch(e){}
      }

      if(isFinite(initAmt) && initAmt > 0){
        payObj.ledger.unshift({
          id: "ob_" + Date.now(),
          ts: Date.now(),
          type: "opening_balance",
          amount: payRound2(initAmt),
          note: "יתרה קיימת"
        });
      }
      payObj.__ledger_v1 = 1;
      payObj.due = payLedgerSum(payObj);
    }else{
      payObj.due = payLedgerSum(payObj);
    }
    return payObj;
  }
  function payLedgerAdd(payObj, entry){
    payObj = payEnsureLedger(payObj, entry && entry.u);
    var e = entry && typeof entry === "object" ? entry : {};
    if(!e.ts) e.ts = Date.now();
    if(!e.id) e.id = "tx_" + e.ts + "_" + Math.random().toString(16).slice(2,8);
    if(e.amount != null) e.amount = payRound2(e.amount);
    if(!e.type) e.type = "tx";
    payObj.ledger.unshift(e);
    if(payObj.ledger.length > 300) payObj.ledger.length = 300;
    payObj.due = payLedgerSum(payObj);
    return payObj;
  }

  function payKeyStudent(u){ return "student_payments_" + String(u||""); }
  function payKeyProfile(u){ return "student_profile_" + String(u||""); }
  function payKeyAdmin(){ return "admin_payments_v1"; }

  function payParseAmount(v){
    var s = String(v||"").replace(/,/g,"").trim();
    if(!s) return 0;
    var n = parseFloat(s);
    if(!isFinite(n) || n < 0) return 0;
    return Math.round(n*100)/100;
  }

  function payPad2(n){ n = String(n||""); return (n.length===1) ? ("0"+n) : n; }
  function payFmtDateTime(ts){
    try{
      var d = new Date(ts||Date.now());
      var dd = payPad2(d.getDate());
      var mm = payPad2(d.getMonth()+1);
      var yy = d.getFullYear();
      var hh = payPad2(d.getHours());
      var mi = payPad2(d.getMinutes());
      return dd + "/" + mm + "/" + yy + " " + hh + ":" + mi;
    }catch(e){
      return "";
    }
  }

  function payGetUser(){
    try{
      // Prefer active student TZ in admin/student-profile context
      var tz = "";
      try{ tz = (window.__activeStudentTz || (window.APP_STATE && window.APP_STATE.activeStudentTz) || "") + ""; }catch(_e){}
      tz = String(tz||"").trim();
      if(tz) return tz;

      var u = (state && state.username) ? String(state.username) : "";
      u = String(u||"").trim();
      if(!u) return "";

      // Map username -> TZ when possible
      try{
        if(typeof resolveStudentTzFromUsername === "function"){
          var rtz = resolveStudentTzFromUsername(u);
          if(rtz) return String(rtz);
        }
      }catch(_e2){}

      // Fallback: digits inside username
      var digits = u.replace(/\D/g,"");
      if(digits && digits.length >= 7) return digits;

      return u;
    }catch(e){ return ""; }
  }

  function paySetMiniText(){
    var el = $("payMini");
    if(!el) return;
    var u = payGetUser();
    if(!u){
      el.textContent = "כדי לשמור תשלום בפרופיל – התחבר קודם.";
      return;
    }
    // Show current credit balance (יתרה) in ₪
    var credit = 0;
    try{
      var raw = DBStorage.getItem(keyStudentCredit(u));
      var n = parseFloat(raw);
      if(isFinite(n)) credit = n;
    }catch(e){}
    el.textContent = "מחובר: " + u + " · יתרה: " + fmtMoney(credit);
  }

function payClearPackSelection(){
    PAY.selectedPack = null;
    PAY.selectedLessons = 0;
    PAY.selectedAmount = null;
    PAY.selectedNote = null;
    try{
      var btns = document.querySelectorAll("#payOverlay .pay-pack");
      for(var i=0;i<btns.length;i++) btns[i].classList.remove("active");
    }catch(e){}
  }

  function paySelectPack(btn){
    if(!btn) return;
    payClearPackSelection();
    try{ btn.classList.add("active"); }catch(e){}
    var lessons = parseInt(btn.getAttribute("data-lessons")||"0",10);
    if(!isFinite(lessons) || lessons<0) lessons = 0;
    var amount = btn.getAttribute("data-amount");
    var note = btn.getAttribute("data-note");

    PAY.selectedPack = btn.getAttribute("data-pack") || null;
    PAY.selectedLessons = lessons|0;
    PAY.selectedAmount = amount != null ? String(amount) : null;
    PAY.selectedNote = note != null ? String(note) : null;

    try{
      var a = $("payAmount");
      var n = $("payNote");
      var r = $("receiptInput");
      // v8: reset receipt mode and input
      try{ if(window.PAY){ PAY.receiptMode = "email"; } }catch(e){}
      try{ if($("receiptEmailBtn")) $("receiptEmailBtn").classList.add("active"); }catch(e){}
      try{ if($("receiptPhoneBtn")) $("receiptPhoneBtn").classList.remove("active"); }catch(e){}
      try{ if(r){ r.value = ""; r.placeholder = "הכנס דואר אלקטרוני"; r.type = "email"; r.setAttribute("inputmode","email"); } }catch(e){}

      if(a && PAY.selectedAmount != null) a.value = String(PAY.selectedAmount);
      if(n && PAY.selectedNote != null) n.value = String(PAY.selectedNote);
    }catch(e){}

    paySetMiniText();
  }

  function payEnsureBound(){
    if(PAY.bound) return;
    PAY.bound = true;
    try{
      var btns = document.querySelectorAll("#payOverlay .pay-pack");
      for(var i=0;i<btns.length;i++){
        (function(b){
          b.addEventListener("click", function(e){
            try{ e.preventDefault(); e.stopPropagation(); }catch(_){}
            paySelectPack(b);
          });
        })(btns[i]);
      }
    }catch(e){}
  }

  function payAddReceipt(u, amount, note, lessonsAdded){
    var ts = Date.now();
    var receipt = {
      id: "pay_" + ts + "_" + Math.floor(Math.random()*100000),
      ts: ts,
      user: String(u||""),
      amount: amount,
      note: String(note||""),
      lessonsAdded: (lessonsAdded|0)
    };

    // Student payments
    var keyP = payKeyStudent(u);
    var pay = payLsGet(keyP, null);
    if(!pay || typeof pay !== "object") pay = {};
    if(!Array.isArray(pay.history)) pay.history = [];
    var paid = Number(pay.paid || pay.paidTotal || 0);
    if(!isFinite(paid)) paid = 0;
    paid += amount;
    pay.paid = paid;
    pay.paidTotal = paid;

    // "due" here means student's credit balance (יתרה) in ₪ for future lessons
    payEnsureLedger(pay, u);
    payLedgerAdd(pay, {
      ts: ts,
      type: "payment",
      amount: amount,
      note: receipt.note || note || "תשלום",
      meta: { lessonsAdded: (lessonsAdded|0) }
    });
pay.lastPayment = payFmtDateTime(ts);
    pay.note = receipt.note;
    var lp = Number(pay.lessonsPurchased || 0);
    if(!isFinite(lp)) lp = 0;
    lp += (lessonsAdded|0);
    pay.lessonsPurchased = lp;

    pay.history.unshift(receipt);
    if(pay.history.length > 80) pay.history.length = 80;
    payLsSet(keyP, pay);
    // Money credit (יתרה): keep in sync with payment ledger sum (pay.due)
    try{
      var ckey = keyStudentCredit(u);
      var dueNow = Number(pay.due);
      if(!isFinite(dueNow)) dueNow = payLedgerSum(pay);
      if(!isFinite(dueNow)) dueNow = 0;
      DBStorage.setItem(ckey, String(dueNow));
    }catch(e){}

    // Update student profile (lessonsLeft + payment summary)
    try{
      var profKey = payKeyProfile(u);
      var prof = payLsGet(profKey, null);
      if(!prof || typeof prof !== "object") prof = {};
      prof.lastPaymentAtMs = ts;
      prof.lastPayment = pay.lastPayment;
      prof.paymentsPaid = pay.paid;
      prof.paymentsDue = pay.due;
      prof.paymentsNote = pay.note;
      prof.paymentsLessonsPurchased = pay.lessonsPurchased;
      payLsSet(profKey, prof);
    }catch(e){}

    // Admin payments ledger
    try{
      var akey = payKeyAdmin();
      var arr = payLsGet(akey, []);
      if(!Array.isArray(arr)) arr = [];
      arr.unshift(receipt);
      if(arr.length > 600) arr.length = 600;
      payLsSet(akey, arr);
    }catch(e){}

    // Also save into admin_profile (same storage as lessons log)
    try{
      var ap = payLsGet("admin_profile", {});
      if(!ap || typeof ap !== "object") ap = {};
      if(!Array.isArray(ap.paymentsLog)) ap.paymentsLog = [];
      ap.paymentsLog.unshift(receipt);
      if(ap.paymentsLog.length > 600) ap.paymentsLog.length = 600;
      payLsSet("admin_profile", ap);
    }catch(e){}

    return receipt;
  }

  // Central finance API (single pipeline / source of truth)
  
function financeGetStudentBalanceByTz(tz){
    tz = String(tz||'').trim();
    if(!tz) return { balance: 0, due: 0 };

    // Single canonical pipeline for all screens: student_credit_money_<TZ>
    try{
      var raw = DBStorage.getItem(keyStudentCredit(tz));
      var n = Number(String(raw == null ? '' : raw).replace(/,/g,''));
      if(isFinite(n)) return { balance: n, due: n };
    }catch(e){}

    // Fallback only if credit is missing (do not merge legacy/new here)
    try{
      var keyP = payKeyStudent(tz);
      var payObj = payLsGet(keyP, null);
      if(payObj && typeof payObj === 'object'){
        payEnsureLedger(payObj, tz);
        var due = Number(payObj.due);
        if(!isFinite(due)) due = Number(payLedgerSum(payObj));
        if(isFinite(due)){
          try{ DBStorage.setItem(keyStudentCredit(tz), String(due)); }catch(_e){}
          return { balance: due, due: due };
        }
      }
    }catch(e){}

    return { balance: 0, due: 0 };
  }

  function financeAddPaymentByTz(tz, amount, meta){
    tz = String(tz||'').trim();
    var amt = Number(amount);
    if(!tz) throw new Error('חסר ת״ז');
    if(!isFinite(amt) || amt <= 0) throw new Error('סכום לא תקין');

    var m = (meta && typeof meta === 'object') ? meta : {};
    var note = String(m.note || 'תשלום מזכירה');

    // Canonical balance source (same pipeline everywhere)
    var beforeBal = 0;
    try{
      var raw = DBStorage.getItem(keyStudentCredit(tz));
      var n = Number(String(raw == null ? '' : raw).replace(/,/g,''));
      beforeBal = isFinite(n) ? n : 0;
    }catch(e){ beforeBal = 0; }
    var afterBal = Math.round((beforeBal + amt) * 100) / 100;

    // Record receipt/ledger on canonical TZ key
    var receipt = payAddReceipt(tz, amt, note, 0);

    // enrich last payment ledger meta (same canonical TZ key)
    try{
      var keyP = payKeyStudent(tz);
      var payObj = payLsGet(keyP, {}) || {};
      payEnsureLedger(payObj, tz);
      if(Array.isArray(payObj.ledger) && payObj.ledger.length){
        var e = payObj.ledger[0];
        if(e && e.type === 'payment'){
          if(!e.meta || typeof e.meta !== 'object') e.meta = {};
          e.meta.method = String(m.method || e.meta.method || '');
          e.meta.source = String(m.source || e.meta.source || 'secretary_payment');
          if(m.receiptRef) e.meta.receiptRef = String(m.receiptRef);
          if(m.createdByRole) e.meta.createdByRole = String(m.createdByRole);
          if(m.note) e.meta.note = String(m.note);
        }
      }
      // Keep display due aligned to canonical balance source
      payObj.due = afterBal;
      payLsSet(keyP, payObj);
    }catch(_e){}

    // Single source of truth balance key
    try{ DBStorage.setItem(keyStudentCredit(tz), String(afterBal)); }catch(_e){}

    // Keep profile summary aligned to the same pipeline value
    try{
      var prof = payLsGet(payKeyProfile(tz), {}) || {};
      if(typeof prof !== 'object') prof = {};
      prof.paymentsDue = afterBal;
      payLsSet(payKeyProfile(tz), prof);
    }catch(_e){}

    return receipt;
  }

  function financeCleanupLegacyStorage(){
    var report = { scanned: 0, migrated: 0, removed: 0, skipped: 0, errors: 0 };
    var seen = {};
    function _num(v){
      try{
        var n = Number(String(v == null ? '' : v).replace(/,/g,''));
        return isFinite(n) ? n : null;
      }catch(e){ return null; }
    }
    function _mergePay(dst, src, tz){
      if(!dst || typeof dst !== 'object') dst = {};
      if(!src || typeof src !== 'object') src = {};
      try{ payEnsureLedger(dst, tz); }catch(e){}
      try{ payEnsureLedger(src, tz); }catch(e){}
      try{
        var dLed = Array.isArray(dst.ledger) ? dst.ledger.slice() : [];
        var sLed = Array.isArray(src.ledger) ? src.ledger.slice() : [];
        var out = [];
        var map = {};
        function pushLedger(arr){
          for(var i=0;i<arr.length;i++){
            var e = arr[i];
            if(!e || typeof e !== 'object') continue;
            var k = String(e.id || '') || [String(e.type||''), String(e.ts||''), String(e.amount||''), String(e.note||'')].join('|');
            if(map[k]) continue;
            map[k] = 1;
            out.push(e);
          }
        }
        pushLedger(dLed); pushLedger(sLed);
        out.sort(function(a,b){ return Number((b&&b.ts)||0) - Number((a&&a.ts)||0); });
        dst.ledger = out;
      }catch(e){}
      try{
        var dh = Array.isArray(dst.history) ? dst.history.slice() : [];
        var sh = Array.isArray(src.history) ? src.history.slice() : [];
        var hout = [];
        var hmap = {};
        function pushHist(arr){
          for(var i=0;i<arr.length;i++){
            var r = arr[i];
            if(!r || typeof r !== 'object') continue;
            var hk = String(r.id || '') || [String(r.ts||''), String(r.amount||''), String(r.user||''), String(r.note||'')].join('|');
            if(hmap[hk]) continue;
            hmap[hk] = 1;
            hout.push(r);
          }
        }
        pushHist(dh); pushHist(sh);
        hout.sort(function(a,b){ return Number((b&&b.ts)||0) - Number((a&&a.ts)||0); });
        if(hout.length > 120) hout.length = 120;
        dst.history = hout;
      }catch(e){}
      try{
        var paidA = _num(dst.paid); if(paidA == null) paidA = _num(dst.paidTotal);
        var paidB = _num(src.paid); if(paidB == null) paidB = _num(src.paidTotal);
        var paid = Math.max(paidA == null ? 0 : paidA, paidB == null ? 0 : paidB);
        dst.paid = paid;
        dst.paidTotal = paid;
      }catch(e){}
      try{
        var lpA = Number(dst.lastPaymentAtMs || 0);
        var lpB = Number(src.lastPaymentAtMs || 0);
        if(lpB > lpA){
          dst.lastPaymentAtMs = src.lastPaymentAtMs;
          if(src.lastPayment) dst.lastPayment = src.lastPayment;
          if(src.note) dst.note = src.note;
        }else{
          if(!dst.lastPayment && src.lastPayment) dst.lastPayment = src.lastPayment;
          if(!dst.note && src.note) dst.note = src.note;
        }
      }catch(e){}
      try{
        var la = _num(dst.lessonsPurchased);
        var lb = _num(src.lessonsPurchased);
        if(la == null) la = 0;
        if(lb == null) lb = 0;
        dst.lessonsPurchased = Math.max(la, lb);
      }catch(e){}
      try{
        payEnsureLedger(dst, tz);
        dst.due = payRound2(payLedgerSum(dst));
      }catch(e){}
      return dst;
    }

    try{
      var keys = [];
      try{
        if(typeof localStorage !== 'undefined' && localStorage && typeof localStorage.length === 'number'){
          for(var i=0;i<localStorage.length;i++){
            var k = localStorage.key(i);
            if(typeof k === 'string') keys.push(k);
          }
        }
      }catch(e){}
      try{
        var mem = DBStorage && DBStorage._mem;
        if(mem && typeof mem === 'object'){
          for(var mk in mem){
            if(Object.prototype.hasOwnProperty.call(mem, mk)) keys.push(String(mk));
          }
        }
      }catch(e){}
      var uniq = [];
      for(var u=0;u<keys.length;u++){
        var kk = String(keys[u]||'');
        if(!kk || seen[kk]) continue;
        seen[kk] = 1;
        uniq.push(kk);
      }

      for(var j=0;j<uniq.length;j++){
        var key = uniq[j];
        if(key.indexOf('student_payments_') !== 0) continue;
        report.scanned++;
        var suffix = String(key.substring('student_payments_'.length) || '').trim();
        if(!suffix) { report.skipped++; continue; }
        if(/^\d{9}$/.test(suffix)) continue;

        var tz = '';
        try{ if(typeof resolveStudentTzFromUsername === 'function') tz = String(resolveStudentTzFromUsername(suffix) || '').trim(); }catch(e){}
        if(!/^\d{9}$/.test(tz)){ report.skipped++; continue; }

        try{
          var legacyObj = payLsGet(key, null);
          if(!legacyObj || typeof legacyObj !== 'object'){ report.skipped++; continue; }

          var canonKey = payKeyStudent(tz);
          var canonObj = payLsGet(canonKey, null);
          var merged = _mergePay(canonObj, legacyObj, tz);
          payLsSet(canonKey, merged);

          try{
            var legacyCreditKey = keyStudentCredit(suffix);
            var canonCreditKey = keyStudentCredit(tz);
            var canonCredit = _num(DBStorage.getItem(canonCreditKey));
            var legacyCredit = _num(DBStorage.getItem(legacyCreditKey));
            var dueNow = _num(merged && merged.due);
            if(dueNow == null) dueNow = _num(payLedgerSum(merged));
            var finalCredit = dueNow;
            if(finalCredit == null) finalCredit = Math.max(canonCredit == null ? 0 : canonCredit, legacyCredit == null ? 0 : legacyCredit);
            DBStorage.setItem(canonCreditKey, String(finalCredit == null ? 0 : finalCredit));
            if(legacyCreditKey !== canonCreditKey && DBStorage.getItem(legacyCreditKey) != null){
              DBStorage.removeItem(legacyCreditKey);
              report.removed++;
            }
          }catch(e){ report.errors++; }

          if(key !== canonKey){
            DBStorage.removeItem(key);
            report.removed++;
          }
          report.migrated++;
        }catch(e){
          report.errors++;
        }
      }
    }catch(e){
      report.errors++;
    }
    return report;
  }

  function financeRunLegacyCleanupOnce(){
    try{
      var doneKey = 'finance_legacy_cleanup_v2_done';
      var done = DBStorage.getItem(doneKey);
      if(done === '1') return;
      var rep = financeCleanupLegacyStorage();
      DBStorage.setItem(doneKey, '1');
      try{ window.__financeLegacyCleanupReport = rep; }catch(_e){}
    }catch(e){}
  }

  try{
    window.FinanceAPI = window.FinanceAPI || {};
    window.FinanceAPI.addPayment = financeAddPaymentByTz;
    window.FinanceAPI.getStudentBalance = financeGetStudentBalanceByTz;
    window.FinanceAPI.cleanupLegacyStorage = financeCleanupLegacyStorage;
    window.financeAPI = window.FinanceAPI;
  }catch(e){}
  try{ financeRunLegacyCleanupOnce(); }catch(e){}

  /* ===== SCHOOL REGISTRATION (Step 3) ===== */
  (function(){
    var LS_REQ_KEY = "school_reg_requests_v1";
    var LS_DRAFT_KEY = "school_reg_draft_v1";
    var LS_OTP_PREFIX = "school_reg_otp_";

    function $(id){ return document.getElementById(id); }

  function makeTxId(){
    return 'tx_' + String(Date.now()) + '_' + String(Math.random()).slice(2);
  }

    function toastSafe(msg){
      try{ if(typeof window.toast === "function") return window.toast(msg); }catch(e){}
      try{ alert(msg); }catch(e){}
    }

    function normPhone(p){
      if(!p) return "";
      var s = String(p).trim();
      s = s.replace(/[^\d+]/g, "");
      // common IL normalization: 05xxxxxxxx -> +9725xxxxxxx
      if(s.startsWith("05") && s.length === 10) s = "+972" + s.slice(1);
      if(s.startsWith("972") && !s.startsWith("+")) s = "+" + s;
      return s;
    }

    function validId(tz){
      var s = String(tz || "").replace(/\D/g,"");
      if(s.length < 5 || s.length > 9) return false;
      s = s.padStart(9,"0");
      var sum = 0;
      for(var i=0;i<9;i++){
        var num = Number(s[i]);
        var inc = num * ((i%2)+1);
        if(inc > 9) inc = (inc % 10) + 1;
        sum += inc;
      }
      return (sum % 10) === 0;
    }

    function isBusinessHoursNow(){
      // heuristic only (Israel): Sun-Thu 08:00-20:00
      try{
        var d = new Date();
        var day = d.getDay(); // 0 Sun ... 6 Sat
        var hr = d.getHours();
        var isWorkDay = (day >= 0 && day <= 4); // Sun-Thu
        var isWorkHr = (hr >= 8 && hr < 20);
        return isWorkDay && isWorkHr;
      }catch(e){ return true; }
    }

    function setStatus(msg, kind){
      var el = $("schoolRegStatus");
      if(!el) return;
      el.classList.remove("ok","err");
      if(kind) el.classList.add(kind);
      el.textContent = msg || "";
    }

    function getCurrentUser(){
      try{
        if(window.state && window.state.loggedIn && window.state.username) return String(window.state.username);
      }catch(e){}
      return "guest";
    }

    function readDraft(){
      try{
        var raw = DBStorage.getItem(LS_DRAFT_KEY);
        if(!raw) return null;
        var obj = JSON.parse(raw);
        return obj && typeof obj === "object" ? obj : null;
      }catch(e){ return null; }
    }
    function writeDraft(d){
      try{ DBStorage.setItem(LS_DRAFT_KEY, JSON.stringify(d || {})); }catch(e){}
    }

    function readOtp(phoneNorm){
      try{
        var raw = DBStorage.getItem(LS_OTP_PREFIX + phoneNorm);
        if(!raw) return null;
        var obj = JSON.parse(raw);
        return obj && typeof obj === "object" ? obj : null;
      }catch(e){ return null; }
    }
    function writeOtp(phoneNorm, obj){
      try{ DBStorage.setItem(LS_OTP_PREFIX + phoneNorm, JSON.stringify(obj || {})); }catch(e){}
    }

    function ensureCodeUI(show){
      var w = $("schoolRegCodeWrap");
      if(!w) return;
      if(show) w.classList.remove("hidden");
      else w.classList.add("hidden");
    }

    function genCode(){
      var n = Math.floor(1000 + Math.random()*9000);
      return String(n);
    }

    
    function readDobISO(){
      try{
        var d = ($("schoolRegDobDay")||{}).value || "";
        var m = ($("schoolRegDobMonth")||{}).value || "";
        var y = ($("schoolRegDobYear")||{}).value || "";
        d = String(d).replace(/\D/g,"");
        m = String(m).replace(/\D/g,"");
        y = String(y).replace(/\D/g,"");
        if(!d || !m || !y) return "";
        if(y.length !== 4) return "";
        if(d.length === 1) d = "0"+d;
        if(m.length === 1) m = "0"+m;
        if(d.length !== 2 || m.length !== 2) return "";
        var di = parseInt(d,10), mi = parseInt(m,10), yi = parseInt(y,10);
        if(!(yi>=1900 && yi<=2100)) return "";
        if(!(mi>=1 && mi<=12)) return "";
        if(!(di>=1 && di<=31)) return "";
        return y+"-"+m+"-"+d;
      }catch(e){ return ""; }
    }
    function fillDobFromISO(iso){
      try{
        if(!iso) return;
        var m = String(iso).match(/(\d{4})-(\d{2})-(\d{2})/);
        if(!m) return;
        if($("schoolRegDobYear")) $("schoolRegDobYear").value = m[1];
        if($("schoolRegDobMonth")) $("schoolRegDobMonth").value = m[2];
        if($("schoolRegDobDay")) $("schoolRegDobDay").value = m[3];
      }catch(e){}
    }

function getFormData(){
      var first = ($("schoolRegFirstName")||{}).value || "";
      var last = ($("schoolRegLastName")||{}).value || "";
      var birth = readDobISO();
      var tz = ($("schoolRegId")||{}).value || "";
      var lic = ($("schoolRegLicenseType")||{}).value || "";
      var phone = ($("schoolRegPhone")||{}).value || "";
      return {
        firstName:first.trim(),
        lastName:last.trim(),
        birthDate:birth,
        tz:String(tz).trim(),
        licenseType:lic,
        phone:String(phone).trim()
      };
    }

    function validateBase(d){
      if(!d.firstName || !d.lastName || !d.birthDate || !d.tz || !d.licenseType || !d.phone){
        setStatus("מלא את כל השדות כדי להמשיך.", "err");
        return false;
      }
      var tzDigits = d.tz.replace(/\D/g,"");
      if(tzDigits.length > 0 && !validId(tzDigits)){
        setStatus("ת\"ז לא תקינה.", "err");
        return false;
      }
      var pn = normPhone(d.phone);
      if(!pn || pn.length < 10){
        setStatus("מספר פלאפון לא תקין.", "err");
        return false;
      }
      return true;
    }

    function sendCode(){
      var d = getFormData();
      if(!validateBase(d)) return;

      var pn = normPhone(d.phone);
      var code = genCode();
      writeOtp(pn, { code: code, createdAt: Date.now(), verified: false });

      ensureCodeUI(true);

      // Save draft for convenience
      writeDraft({ data: d, phoneNorm: pn, codeSentAt: Date.now() });

      if(isBusinessHoursNow()){
        setStatus("קוד נשלח (דמו). הזן את הקוד כדי להשלים הרשמה.", "ok");
      }else{
        setStatus("מחוץ לשעות הפעילות – הקוד יישלח בשעות הפעילות (דמו). אפשר כבר להזין את הקוד כדי להמשיך.", "ok");
      }

      // Demo: show code via toast (so you can test)
      toastSafe("קוד (דמו): " + code);
      try{ var ci = $("schoolRegCodeInput"); if(ci) ci.focus(); }catch(e){}
    }

    function verifyCode(){
      var phone = ($("schoolRegPhone")||{}).value || "";
      var pn = normPhone(phone);
      var otp = readOtp(pn);
      if(!otp || !otp.code){
        setStatus("אין קוד פעיל. לחץ 'שלח קוד'.", "err");
        ensureCodeUI(true);
        return false;
      }
      var entered = (($("schoolRegCodeInput")||{}).value || "").trim();
      if(!entered){
        setStatus("הכנס קוד אימות.", "err");
        return false;
      }
      if(String(entered) !== String(otp.code)){
        setStatus("קוד שגוי. נסה שוב.", "err");
        return false;
      }
      otp.verified = true;
      otp.verifiedAt = Date.now();
      writeOtp(pn, otp);
      setStatus("הקוד אומת. אפשר לשלוח הרשמה.", "ok");
      return true;
    }

    function pushRequest(record){
      try{
        var raw = DBStorage.getItem(LS_REQ_KEY);
        var arr = raw ? JSON.parse(raw) : [];
        if(!Array.isArray(arr)) arr = [];
        arr.unshift(record);
        DBStorage.setItem(LS_REQ_KEY, JSON.stringify(arr));
      }catch(e){}
    }

    function submitReg(ev){
      if(ev && ev.preventDefault) ev.preventDefault();
      var d = getFormData();
      if(!validateBase(d)) return;

      var pn = normPhone(d.phone);
      var otp = readOtp(pn);
      if(!otp || !otp.code){
        ensureCodeUI(true);
        setStatus("לפני שליחת הרשמה צריך קוד. לחץ 'שלח קוד'.", "err");
        return;
      }
      if(!otp.verified){
        ensureCodeUI(true);
        setStatus("לפני שליחת הרשמה צריך לאמת קוד.", "err");
        return;
      }

      var now = Date.now();
      var record = {
        id: "REG-" + now + "-" + Math.floor(Math.random()*100000),
        createdAt: now,
        status: "sent_to_secretary_demo",
        submittedBy: getCurrentUser(),
        firstName: d.firstName,
        lastName: d.lastName,
        birthDate: d.birthDate,
        tz: d.tz.replace(/\D/g,""),
        licenseType: d.licenseType,
        phone: pn
      };

      pushRequest(record);
      writeDraft({ data: d, phoneNorm: pn, submittedAt: now });

      setStatus("ההרשמה נשלחה (דמו) ונשמרה. בהמשך זה יופיע אצל המזכירה.", "ok");
      try{
        var c3 = document.getElementById("licenseStep3Chk");
        if(c3) c3.checked = true;
        if(typeof window.__licenseFlowRefresh === "function") window.__licenseFlowRefresh();
      }catch(e){}


      try{ if(typeof window.patchStudentProgress==="function"){ window.patchStudentProgress({license_flow_step3_done_v2:1}); } else if(typeof touchProgress==="function"){ touchProgress({license_flow_step3_done_v2:1}); } }catch(e){}
      try{ if(typeof window.__licenseFlowRefresh==="function") window.__licenseFlowRefresh(); }catch(e){}

      // light reset
      try{ ($("schoolRegCodeInput")||{}).value = ""; }catch(e){}
      try{ ensureCodeUI(false); }catch(e){}
    }

    function fillFromDraft(){
      var dr = readDraft();
      if(!dr || !dr.data) return;
      var d = dr.data;
      try{ if($("schoolRegFirstName")) $("schoolRegFirstName").value = d.firstName || ""; }catch(e){}
      try{ if($("schoolRegLastName")) $("schoolRegLastName").value = d.lastName || ""; }catch(e){}
      try{ fillDobFromISO(d.birthDate || ""); }catch(e){}
      try{ if($("schoolRegId")) $("schoolRegId").value = d.tz || ""; }catch(e){}
      try{ if($("schoolRegLicenseType")) $("schoolRegLicenseType").value = d.licenseType || ""; }catch(e){}
      try{ if($("schoolRegPhone")) $("schoolRegPhone").value = d.phone || ""; }catch(e){}
      try{
        var pn = normPhone(d.phone);
        var otp = pn ? readOtp(pn) : null;
        if(otp && otp.code && !otp.verified) ensureCodeUI(true);
      }catch(e){}
    }

    
    function bindToggle(){
      var btn = $("schoolRegToggleBtn");
      var wrap = $("schoolRegWrap");
      if(!btn || !wrap) return;

      if(btn.__bound) return;
      btn.__bound = true;

      // Always start closed
      try{
        wrap.classList.add("hidden");
        btn.textContent = "פתיחת הרשמה לבית הספר";
        btn.setAttribute("aria-expanded","false");
      }catch(e){}

      btn.addEventListener("click", function(){
        try{
          var pageInner = document.querySelector("#licenseRequestPage .page-inner");
          var st = pageInner ? pageInner.scrollTop : 0;

          var isHidden = wrap.classList.contains("hidden");
          if(isHidden){
            wrap.classList.remove("hidden");
            btn.textContent = "סגור הרשמה לבית הספר";
            btn.setAttribute("aria-expanded","true");
          }else{
            wrap.classList.add("hidden");
            btn.textContent = "פתיחת הרשמה לבית הספר";
            btn.setAttribute("aria-expanded","false");
          }

          // Prevent jump (mobile auto-scroll / layout shift)
          if(pageInner){
            requestAnimationFrame(function(){ try{ pageInner.scrollTop = st; }catch(e){} });
            setTimeout(function(){ try{ pageInner.scrollTop = st; }catch(e){} }, 0);
          }
        }catch(e){}
      });
}

function bind(){

  // Mobile-safe tap binding (Android WebView sometimes drops click events)
  function bindTap(el, fn){
    if(!el) return;
    try{
      if(el.getAttribute && el.getAttribute("data-tapbound") === "1") return;
      el.setAttribute && el.setAttribute("data-tapbound","1");
    }catch(e){}
    var last = 0;
    function fire(e){
      var now = Date.now();
      if(now - last < 300) return;
      last = now;
      // Press visual feedback
      try{
        if(e && (e.type==="pointerdown" || e.type==="touchstart" || e.type==="mousedown")) _pressOn();
      }catch(_){}
      try{ if(e && e.preventDefault) e.preventDefault(); }catch(_){}
      try{ if(e && e.stopPropagation) e.stopPropagation(); }catch(_){}
      try{ if(e && e.stopImmediatePropagation) e.stopImmediatePropagation(); }catch(_){}
      try{ fn && fn(e); }catch(err){}
      return false;
    }
    try{ el.style && (el.style.touchAction = "manipulation"); }catch(e){}
    // Visual press effect (for left/profile menu and other tap elements)
    function _pressOn(){
      try{ el.classList && el.classList.add("is-pressed"); }catch(_){}
    }
    function _pressOff(){
      try{ el.classList && el.classList.remove("is-pressed"); }catch(_){}
    }
    // Ensure release always clears press state
    try{
      el.addEventListener("pointerup", _pressOff, true);
      el.addEventListener("pointercancel", _pressOff, true);
      el.addEventListener("touchend", _pressOff, true);
      el.addEventListener("touchcancel", _pressOff, true);
      el.addEventListener("mouseup", _pressOff, true);
      el.addEventListener("mouseleave", _pressOff, true);
      el.addEventListener("blur", _pressOff, true);
    }catch(_){}

    el.addEventListener("pointerdown", fire, true);
    el.addEventListener("touchstart", fire, {passive:false, capture:true});
    el.addEventListener("mousedown", fire, true);
    el.addEventListener("click", fire, true);

  // Release-based tap: fires ONLY on finger lift (prevents "tap-through" on Android)
  // Use for critical buttons inside modals (save/close/clear) to avoid accidental underlying clicks.
  function bindReleaseTap(el, fn){
    if(!el) return;
    try{
      if(el.getAttribute && el.getAttribute("data-releasebound") === "1") return;
      el.setAttribute && el.setAttribute("data-releasebound","1");
    }catch(e){}
    var down=false, startX=0, startY=0, moved=false;

    function pt(e){
      try{
        if(e && e.changedTouches && e.changedTouches[0]) return e.changedTouches[0];
        if(e && e.touches && e.touches[0]) return e.touches[0];
      }catch(_){}
      return e || {};
    }

    function onDown(e){
      down=true; moved=false;
      var p = pt(e);
      startX = p.clientX || 0;
      startY = p.clientY || 0;
    }

    function onMove(e){
      if(!down) return;
      var p = pt(e);
      var dx = (p.clientX||0) - startX;
      var dy = (p.clientY||0) - startY;
      if(Math.abs(dx) > 12 || Math.abs(dy) > 12) moved = true;
    }

    // global ghost-click suppression (scoped: allow side menus)
    if(!window.__releaseTapGlobalGuard){
      window.__releaseTapGlobalGuard = true;
      window.__suppressClickUntil = 0;
      window.__suppressGhostClicks = function(ms){
        window.__suppressClickUntil = Date.now() + (ms||320);
      };
      document.addEventListener("click", function(ev){
        try{
          if(Date.now() >= (window.__suppressClickUntil||0)) return;
          var t = ev && ev.target;
          // allow focusing/typing in form controls (important for Android keyboard + Hebrew IME)
          try{
            if(t){
              if(t.isContentEditable) return;
              var tag = (t.tagName||"").toUpperCase();
              if(tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || tag === "OPTION" || tag === "LABEL") return;
              if(t.closest && t.closest('input,textarea,select,option,label,[contenteditable="true"],[contenteditable=""],[contenteditable="plaintext-only"]')) return;
            }
          }catch(_){}
          // don't block side menus (right + left)
          if(t && (t.closest && (t.closest("#sideMenu") || t.closest("#studentMenuLeft")))) return;
          ev.preventDefault();
          ev.stopPropagation();
          ev.stopImmediatePropagation && ev.stopImmediatePropagation();
        }catch(e){}
      }, true);

      // Block tap-through while dock/keyboard are open (Android: tapping to dismiss keyboard must NOT press buttons behind)
      function __dockBlockThrough(ev){
        try{
          if(!dockOpen) return;
          // Let events inside dock pass
          var d = el("inputDock");
          if(d && d.contains(ev.target)) return;
          // Let scrim handle its own logic
          if(ev.target && ev.target.id === "dockScrim") return;
          try{ ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation && ev.stopImmediatePropagation(); }catch(_){}
          try{ swallowNextUserEvents(650); }catch(_){}
          try{
            var ae = document.activeElement;
            if(ae && ae.blur) ae.blur();
          }catch(_){}
          try{ closeDock(); }catch(_){}
        }catch(_){}
      }
      try{ document.addEventListener("pointerdown", __dockBlockThrough, true); }catch(_){}
      try{ document.addEventListener("touchstart", __dockBlockThrough, {capture:true, passive:false}); }catch(_){}
    }

    function fire(e){
      if(!down) return;
      down=false;
      if(moved) return;

      // Ensure release is still on this element (avoid accidental drag-release)
      try{
        var p = pt(e);
        if(p && typeof p.clientX === "number" && typeof p.clientY === "number"){
          var at = document.elementFromPoint(p.clientX, p.clientY);
          if(at && at !== el && !(el.contains && el.contains(at))) return;
        }
      }catch(_){}

      // mark as fired to block the subsequent synthetic click
      try{ el.__rlFiredAt = Date.now(); }catch(_){}

      try{ if(window.__suppressGhostClicks) window.__suppressGhostClicks(320); }catch(_){}

      try{ e && e.preventDefault && e.preventDefault(); }catch(_){}
      try{ e && e.stopPropagation && e.stopPropagation(); }catch(_){}
      try{ e && e.stopImmediatePropagation && e.stopImmediatePropagation(); }catch(_){}
      try{ fn && fn(e); }catch(err){}
      return false;
    }

    // pointer + touch
    try{ el.style && (el.style.touchAction = "manipulation"); }catch(e){}
    // Visual press effect (for left/profile menu and other tap elements)
    function _pressOn(){
      try{ el.classList && el.classList.add("is-pressed"); }catch(_){}
    }
    function _pressOff(){
      try{ el.classList && el.classList.remove("is-pressed"); }catch(_){}
    }
    // Ensure release always clears press state
    try{
      el.addEventListener("pointerup", _pressOff, true);
      el.addEventListener("pointercancel", _pressOff, true);
      el.addEventListener("touchend", _pressOff, true);
      el.addEventListener("touchcancel", _pressOff, true);
      el.addEventListener("mouseup", _pressOff, true);
      el.addEventListener("mouseleave", _pressOff, true);
      el.addEventListener("blur", _pressOff, true);
    }catch(_){}

    el.addEventListener("pointerdown", onDown, true);
    el.addEventListener("pointermove", onMove, true);
    el.addEventListener("pointerup", fire, true);
    el.addEventListener("pointercancel", function(){ down=false; }, true);

    el.addEventListener("touchstart", onDown, {passive:true, capture:true});
    el.addEventListener("touchmove", onMove, {passive:true, capture:true});
    el.addEventListener("touchend", fire, {passive:false, capture:true});
    el.addEventListener("touchcancel", function(){ down=false; }, {passive:true, capture:true});

    // Block the synthetic click after touchend
    el.addEventListener("click", function(ev){
      try{
        if(el.__rlFiredAt && (Date.now() - el.__rlFiredAt) < 900){
          ev.preventDefault();
          ev.stopPropagation();
          ev.stopImmediatePropagation && ev.stopImmediatePropagation();
          return false;
        }
      }catch(e){}
    }, true);
  }

  }

      var f = $("schoolRegForm");
      if(!f) return;

      // Bind once
      if(f.__bound) return;
      f.__bound = true;

      var btnSend = $("schoolRegSendCodeBtn");
      var btnVer = $("schoolRegVerifyBtn");

      if(btnSend) btnSend.addEventListener("click", function(){ setStatus(""); sendCode(); });
      if(btnVer) btnVer.addEventListener("click", function(){ setStatus(""); verifyCode(); });

      f.addEventListener("submit", function(e){ setStatus(""); submitReg(e); });

      // Save draft on input
      var ids = ["schoolRegFirstName","schoolRegLastName","schoolRegDobDay","schoolRegDobMonth","schoolRegDobYear","schoolRegId","schoolRegLicenseType","schoolRegPhone"];
      ids.forEach(function(id){
        var el = $(id);
        if(!el) return;
        el.addEventListener("input", function(){
          try{ writeDraft({ data: getFormData(), updatedAt: Date.now() }); }catch(e){}
        });
        el.addEventListener("change", function(){
          try{ writeDraft({ data: getFormData(), updatedAt: Date.now() }); }catch(e){}
        });
      });

      fillFromDraft();
    }

    function init(){
      bindToggle();
      bind();
    }

    if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
    else init();
  })();
  /* ===== /SCHOOL REGISTRATION (Step 3) ===== */
/* ===== LICENSE FLOW GATING (Steps 1-5) ===== */
(function(){
  function getEl(id){
    try{
      if(typeof window.$ === "function") return window.$(id);
    }catch(e){}
    return document.getElementById(id);
  }
  function readFlag(key){
    try{
      // Per-student flags (preferred)
      if(typeof window.getStudentProgress==="function"){
        var p = window.getStudentProgress();
        var v = p ? p[key] : null;
        return (v === 1 || v === "1" || v === true);
      }
    }catch(e){}
    return false;
  }
  function writeFlag(key, val){
    try{
      if(!window.state || !state.username) return;
      var patch = {}; patch[key] = val ? 1 : 0;
      if(typeof window.patchStudentProgress==="function") window.patchStudentProgress(patch);
      else if(typeof touchProgress==="function") touchProgress(patch);
    }catch(e){}
  }
  function setStepVisible(stepNum, visible){
    var el = document.querySelector('.license-step[data-step="' + stepNum + '"]');
    if(!el) return;
    el.style.display = visible ? "" : "none";
  }

  function refresh(){
    var chk1 = getEl("licenseStep1Chk");
    var chk2 = getEl("licenseStep2Chk");
    var chk3 = getEl("licenseStep3Chk");
    var chk4 = getEl("licenseStep4Chk");

    // Hydrate from saved progress
    if(chk1 && readFlag("license_flow_step1_done_v1")) chk1.checked = true;
    if(chk2 && readFlag("license_flow_step2_done_v1")) chk2.checked = true;
    if(chk3 && readFlag("license_flow_step3_done_v2")) chk3.checked = true;
    if(chk4 && readFlag("license_flow_step4_cash_v1")) chk4.checked = true;

    var step1Done = !!(chk1 && chk1.checked);
    var step2Done = !!(chk2 && chk2.checked);
    var step3Done = !!(chk3 && chk3.checked);
    var cashDone  = !!(chk4 && chk4.checked);
    var paidDone  = readFlag("license_flow_step4_paid_v1");

    setStepVisible(1, true);
    setStepVisible(2, step1Done);
    setStepVisible(3, step1Done && step2Done);

    var step4Visible = (step1Done && step2Done && step3Done);
    setStepVisible(4, step4Visible);
    setStepVisible(5, step4Visible && (cashDone || paidDone));

    // Payment button enabled only when step 4 is available
    var payBtn = getEl("licensePayLessonBtn");
    if(payBtn){
      payBtn.disabled = !step4Visible;
      try{
        payBtn.classList.remove("white","gray");
        payBtn.classList.add(step4Visible ? "white" : "gray");
      }catch(e){}
    }
  }


  window.__licenseFlowRefresh = refresh;

  function bind(){
    var chk1 = getEl("licenseStep1Chk");
    var chk2 = getEl("licenseStep2Chk");
    var chk3 = getEl("licenseStep3Chk");
    var chk4 = getEl("licenseStep4Chk");

    if(chk1){
      if(readFlag("license_flow_step1_done_v1")) chk1.checked = true;
      chk1.addEventListener("change", function(){
        // Step 1 cannot be rolled back
        if(!chk1.checked) chk1.checked = true;
        writeFlag("license_flow_step1_done_v1", true);
        refresh();
      });
    }
    if(chk2){
      if(readFlag("license_flow_step2_done_v1")) chk2.checked = true;
      chk2.addEventListener("change", function(){
        // Step 2 cannot be rolled back
        if(!chk2.checked) chk2.checked = true;
        writeFlag("license_flow_step2_done_v1", true);
        refresh();
      });
    }
    if(chk3){
      if(readFlag("license_flow_step3_done_v2")) chk3.checked = true;
      chk3.addEventListener("change", function(){
        writeFlag("license_flow_step3_done_v2", !!chk3.checked);
        refresh();
      });
    }
    if(chk4){
      if(readFlag("license_flow_step4_cash_v1")) chk4.checked = true;
      chk4.addEventListener("change", function(){
        writeFlag("license_flow_step4_cash_v1", !!chk4.checked);
        refresh();
      });
    }

    refresh();
  }


  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", bind);
  else bind();
})();
/* ===== /LICENSE FLOW GATING ===== */

// Prevent unwanted auto-open of the payment modal on app boot.
// The modal should open only from an explicit user action (tap/click).
try{
  if(typeof window !== 'undefined'){
    window.__PAY_BOOT_BLOCK = true;
    setTimeout(function(){ try{ window.__PAY_BOOT_BLOCK = false; }catch(e){} }, 1200);
    // Hard reset in case a previous session left the class on the body
    if(document.readyState === 'loading'){
      document.addEventListener('DOMContentLoaded', function(){
        try{ document.body.classList.remove('pay-open'); }catch(e){}
        try{ var o=document.getElementById('payOverlay'); if(o) o.setAttribute('aria-hidden','true'); }catch(e){}
        try{ if(typeof closePaymentModal==='function') closePaymentModal(); }catch(e){}
      }, { once:true });
    }else{
      try{ document.body.classList.remove('pay-open'); }catch(e){}
      try{ var o2=document.getElementById('payOverlay'); if(o2) o2.setAttribute('aria-hidden','true'); }catch(e){}
      try{ if(typeof closePaymentModal==='function') closePaymentModal(); }catch(e){}
    }
  }
}catch(e){}

function openPaymentModal(presetAmount, presetNote, forceUser){
    try{
      if(!forceUser && typeof window !== 'undefined' && window.__PAY_BOOT_BLOCK) return;
    }catch(e){}
    try{ closeProfileMenu(); }catch(e){}
    try{ if(typeof window.closeMenu === 'function') window.closeMenu(); }catch(e){}
    document.body.classList.add("pay-open");
    try{ document.documentElement.style.setProperty("--pay-vh", window.innerHeight + "px"); }catch(e){}
    var o = $("payOverlay");
    if(o){ o.setAttribute("aria-hidden","false"); try{ o.style.display = "flex"; }catch(e){} }

    // bind packages once
    try{ payEnsureBound(); }catch(e){}

    // reset selection every open
    try{ payClearPackSelection(); }catch(e){}

    // title/sub
    try{
      var t = $("payTitle");
    }catch(e){}

    try{
      var a = $("payAmount");
      var n = $("payNote");
      if(a) a.value = (presetAmount != null && String(presetAmount).trim() !== "") ? String(presetAmount) : "";
      if(n) n.value = (presetNote != null && String(presetNote).trim() !== "") ? String(presetNote) : "";
      try{ paySetMiniText(); }catch(e){}
      // v8: do not auto-focus (prevents page jump). Input handled via dock.
    }catch(e){}
  }

  function closePaymentModal(){
    try{ if(typeof closeDock==="function") closeDock(0); }catch(e){}
    document.body.classList.remove("pay-open");
    try{ document.documentElement.style.removeProperty("--pay-vh"); }catch(e){}
    var o = $("payOverlay");
    if(o){ o.setAttribute("aria-hidden","true"); try{ o.style.display = "none"; }catch(e){} }
  }


  /* ===== Payment Input Dock + Receipt toggle (v8) ===== */
  (function(){
    var dockOpen = false; try{ window.__dockOpen = false; window.__dockTarget = null; }catch(e){};
try{
  var k = (typeof keepScrimMs === "number") ? keepScrimMs : 0;
  if(k > 0){
    setTimeout(function(){ try{ hideDockScrim(); }catch(e){} }, k);
  }else{
    hideDockScrim();
  }
}catch(e){}
    var dockOpenedAt = 0;
    var dockFocusedOnce = false;
    var dockTarget = null;
    var dockScrollY = 0;
    var dockScrollX = 0;
    var dockLocked = false;

    function lockBody(){
      try{
        if(dockLocked) return;
        dockScrollY = window.scrollY || 0;
        dockScrollX = window.scrollX || 0;
        document.body.classList.add('dock-lock');
        document.documentElement.classList.add('dock-lock');
        /* no body fixed positioning - avoids layout/keyboard quirks */
        dockLocked = true;
      }catch(e){}
    }

    function unlockBody(){
      try{
        if(!dockLocked) return;
        document.body.classList.remove('dock-lock');
        document.documentElement.classList.remove('dock-lock');
        document.body.style.top = '';
        document.body.style.left = '';
        window.scrollTo(dockScrollX || 0, dockScrollY || 0);
        dockLocked = false;
      }catch(e){}
    }


    function el(id){ return document.getElementById(id); }
    // Dock scrim (blocks tap-through while dock/keyboard are open)
    function ensureDockScrim(){
      try{
        var sh = document.getElementById("dockScrim");
        if(sh) return sh;
        sh = document.createElement("div");
        sh.id = "dockScrim";
        sh.style.position = "fixed";
        sh.style.left = "0";
        sh.style.top = "0";
        sh.style.width = "100vw";
        sh.style.height = "100vh";
        sh.style.background = "rgba(0,0,0,0)"; // invisible
        sh.style.zIndex = "9999998";
        sh.style.display = "none";
        sh.style.pointerEvents = "auto";
        sh.style.touchAction = "none";
        sh.setAttribute("aria-hidden","true");
        sh.addEventListener("pointerdown", function(e){
          try{ e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation && e.stopImmediatePropagation(); }catch(_e){}
          try{
            var u = window.__dockOpeningUntil || 0;
            // During the SAME gesture that opened the dock, ignore the scrim so it won't close immediately.
            if(Date.now() < u) return false;
          }catch(_e){}
          // hard-blur to dismiss keyboard without allowing click-through
          try{ var ae = document.activeElement; if(ae && ae.blur) ae.blur(); }catch(_e){}
          try{ window.__dockScrimDown = 1; }catch(_e){}
          return false;
        }, {capture:true, passive:false});
        sh.addEventListener("pointerup", function(e){
          try{ e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation && e.stopImmediatePropagation(); }catch(_e){}
          try{
            var u = window.__dockOpeningUntil || 0;
            if(Date.now() < u) return false;
          }catch(_e){}
          try{ window.__dockScrimDown = 0; }catch(_e){}
          try{ swallowNextUserEvents(650); }catch(_e){}
          try{ closeDock(550); }catch(_e){}
          return false;
        }, {capture:true, passive:false});
        sh.addEventListener("click", function(e){
          try{ e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation && e.stopImmediatePropagation(); }catch(_e){}
          try{
            var u = window.__dockOpeningUntil || 0;
            if(Date.now() < u) return false;
          }catch(_e){}
          try{ swallowNextUserEvents(650); }catch(_e){}
          try{ closeDock(550); }catch(_e){}
          return false;
        }, true);
        document.body.appendChild(sh);
        return sh;
      }catch(e){}
      return null;
    }
    function showDockScrim(){
      try{
        var sh = ensureDockScrim();
        if(!sh) return;
        sh.style.display = "block";
        sh.setAttribute("aria-hidden","false");
      }catch(e){}
    }
    function hideDockScrim(){
      try{
        var sh = document.getElementById("dockScrim");
        if(!sh) return;
        sh.style.display = "none";
        sh.setAttribute("aria-hidden","true");
      }catch(e){}
    }



    // Track viewport height so we can detect keyboard *closing* without accidentally closing during keyboard *opening*.
    var __vvPrevH = 0;
    function setDockBottom(){
      try{
        var vv = window.visualViewport;
        if(!vv){
          document.documentElement.style.setProperty("--dock-bottom","0px");
          return;
        }
        var offset = Math.max(0, (window.innerHeight - vv.height - (vv.offsetTop||0)));
        document.documentElement.style.setProperty("--dock-bottom", offset + "px");

        // Close dock ONLY when keyboard is closing, not while it's opening.
        // Some Android WebViews fire visualViewport resize before our kb-open detector toggles,
        // which previously caused the dock to close immediately on first open.
        try{
          var prevH = __vvPrevH || 0;
          var curH = vv.height || 0;
          __vvPrevH = curH;

          if(dockOpen && dockFocusedOnce && (Date.now() - (dockOpenedAt||0) > 250)){
            // Keyboard closing manifests as viewport height increasing notably.
            var closing = (prevH && curH && (curH - prevH) > 120);
            if(closing){
              var ae = null;
              try{ ae = document.activeElement; }catch(e){}
              var focusedDock = !!(ae && ae.id === 'dockInput');
              if(!focusedDock){
                closeDock();
              }
            }
          }
        }catch(e){}
      }catch(e){}
    }

    function closeDock(keepScrimMs){
      var __prevId = null;
      try{ __prevId = dockTarget && dockTarget.id ? String(dockTarget.id) : null; }catch(e){}
      dockOpen = false; try{ window.__dockOpen = false; window.__dockTarget = null; }catch(e){};
      dockTarget = null;
      try{ document.dispatchEvent(new CustomEvent("dock:close",{detail:{targetId: __prevId}})); }catch(e){}
      dockFocusedOnce = false;
      unlockBody();
      try{ hideDockScrim(); }catch(e){}
      try{ document.body.classList.remove("dock-open"); }catch(e){}

      try{
        var dock = el("inputDock");
        if(dock){
          dock.style.transition = "";
          dock.style.transform = "";
          dock.style.opacity = "";
          dock.style.pointerEvents = "";
        }
      }catch(e){}
      try{ el("inputDock").setAttribute("aria-hidden","true"); }catch(e){}
      try{
        var di = el("dockInput");
        if(di && di.blur) di.blur();
      }catch(e){}
      // Hard-close keyboard: blur *current* activeElement immediately + next tick (handles Android/WebView quirks)
      try{
        var ae = document.activeElement;
        if(ae && ae.blur) ae.blur();
      }catch(e){}
      try{
        setTimeout(function(){
          try{
            var ae2 = document.activeElement;
            if(ae2 && ae2.blur) ae2.blur();
          }catch(e){}
        }, 0);
      }catch(e){}
      
      // EXTRA: Force-hide Android/WebView keyboard even when blur is ignored on first open
      try{
        if(!window.__kbKiller){
          var k = document.createElement('input');
          k.type = 'text';
          k.id = 'kbKiller';
          // Prevent keyboard from re-opening (blink) when focusing this element.
          // inputmode="none" + readonly keeps it focusable but should not summon the keyboard.
          try{ k.setAttribute('inputmode','none'); }catch(_e){}
          try{ k.setAttribute('readonly',''); }catch(_e){}
          try{ k.setAttribute('autocomplete','off'); }catch(_e){}
          try{ k.setAttribute('autocapitalize','off'); }catch(_e){}
          k.setAttribute('aria-hidden','true');
          k.style.position='fixed';
          k.style.opacity='0';
          k.style.pointerEvents='none';
          k.style.height='1px';
          k.style.width='1px';
          k.style.left='-9999px';
          k.style.top='0';
          document.body.appendChild(k);
          window.__kbKiller = k;
          // Extra-safe focus stealer: a hidden button (never opens IME) to reliably dismiss keyboard on some Android WebViews.
          try{
            if(!window.__kbKillerBtn){
              var b = document.createElement('button');
              b.type = 'button';
              b.id = 'kbKillerBtn';
              b.setAttribute('aria-hidden','true');
              b.tabIndex = -1;
              b.style.position='fixed';
              b.style.opacity='0';
              b.style.pointerEvents='none';
              b.style.height='1px';
              b.style.width='1px';
              b.style.left='-9999px';
              b.style.top='0';
              document.body.appendChild(b);
              window.__kbKillerBtn = b;
            }
          }catch(_e){}
        }
        // Only use the killer focus trick IF the keyboard is still open after blur.
        // Otherwise it can cause a visible blink (keyboard briefly reopens).
        function __kbLooksOpen(){
          try{
            var vv = window.visualViewport;
            if(vv && vv.height){
              return ((window.innerHeight - vv.height - (vv.offsetTop||0)) > 120);
            }
          }catch(_e){}
          return false;
        }

        // First run in this session: be more aggressive (user reported keyboard sometimes stays open on first close)
        try{ if(!window.__firstDockKbKillDone){ window.__firstDockKbKillDone = 1; } }catch(_e){}
        var __forceKillOnce = false;
        try{ __forceKillOnce = !!window.__firstDockKbKillDone && !window.__firstDockKbKillDone2; }catch(_e){}
        try{ if(__forceKillOnce) window.__firstDockKbKillDone2 = 1; }catch(_e){}

        function __tryKill(){
          try{
            /* always attempt a safe focus-steal to dismiss IME (first-open WebView bug) */
            try{
              var bb = window.__kbKillerBtn;
              if(bb){
                try{ bb.focus({preventScroll:true}); }catch(_e){ try{ bb.focus(); }catch(_e2){} }
                try{ bb.blur(); }catch(_e){}
              }
            }catch(_e){}
            var kk = window.__kbKiller;
            // If input killer is missing, button killer above may still work.
            if(!kk) kk = null;
            try{ kk.value=''; }catch(_e){}
            try{ kk.focus({preventScroll:true}); }catch(_e){ try{ kk.focus(); }catch(_e2){} }
            try{ kk.blur(); }catch(_e){}
          }catch(_e){}
        }

        // Give blur a moment to take effect.
        try{ setTimeout(__tryKill, 60); }catch(_e){}
        try{ setTimeout(__tryKill, 180); }catch(_e){}
      }catch(e){}
      try{
        setTimeout(function(){
          try{
            try{ document.activeElement && document.activeElement.blur && document.activeElement.blur(); }catch(_e){}
          }catch(_e){}
        }, 0);
      }catch(e){}
try{ document.documentElement.style.setProperty("--dock-bottom","0px"); }catch(e){}
    }

    

    function swallowNextUserEvents(ms){
      try{
        var until = Date.now() + (ms||400);
        var h = function(e){
          try{
            if(Date.now() > until){
              cleanup();
              return;
            }
            if(e){
              try{ e.preventDefault(); }catch(_e){}
              try{ e.stopPropagation(); }catch(_e2){}
              try{ e.stopImmediatePropagation && e.stopImmediatePropagation(); }catch(_e3){}
            }
          }catch(_){}
        };
        var cleanup = function(){
          try{ document.removeEventListener('click', h, true); }catch(_){}
          try{ document.removeEventListener('pointerdown', h, true); }catch(_){}
          try{ document.removeEventListener('touchstart', h, true); }catch(_){}
          try{ document.removeEventListener('pointerup', h, true); }catch(_){}
          try{ document.removeEventListener('touchend', h, true); }catch(_){}
        };
        document.addEventListener('click', h, true);
        document.addEventListener('pointerdown', h, true);
        document.addEventListener('touchstart', h, {capture:true, passive:false});
        document.addEventListener('pointerup', h, true);
        document.addEventListener('touchend', h, true);
        setTimeout(cleanup, (ms||400)+50);
      }catch(e){}
    }
function openDockFor(target, opts){
      try{
        if(!target) return;
        try{ showDockScrim(); }catch(e){}
        dockTarget = target; try{ window.__dockTarget = dockTarget; }catch(e){};
        dockOpen = true; try{ window.__dockOpen = true; 
        dockOpenedAt = Date.now();
        dockFocusedOnce = false;
        try{ window.__dockOpeningUntil = dockOpenedAt + 650; }catch(_e){}
window.__dockTarget = dockTarget; }catch(e){};
        lockBody();

        var title = (opts && opts.title) ? String(opts.title) : "הקלדה";
        var type  = (opts && opts.type) ? String(opts.type) : "text";
        var imode = (opts && opts.inputmode) ? String(opts.inputmode) : null;

        var dock = el("inputDock");
        var ti = el("dockTitle");
        var inp = el("dockInput");
        if(ti) ti.textContent = title;
        if(inp){
          inp.value = (target.value != null) ? String(target.value) : "";
          inp.type = type;
          if(imode) inp.setAttribute("inputmode", imode);
          else inp.removeAttribute("inputmode");
          // Enter key behavior on mobile keyboards
          try{
            var hint = (opts && opts.enterkeyhint) ? String(opts.enterkeyhint) : null;
            if(!hint){
              try{
                if(target && target.id === "receiptInput") hint = "next";
                else if(target && target.id === "payAmount") hint = "done";
              }catch(_e){}
            }
            if(hint) inp.setAttribute("enterkeyhint", hint);
            else inp.removeAttribute("enterkeyhint");
          }catch(e){}
        }

        try{ document.body.classList.add("dock-open"); }catch(e){}
        // Make dock instantly visible for focus (Android WebView can ignore focus on transitioned elements)
        try{ if(dock){ dock.style.transition='none'; dock.style.transform='translateY(0)'; dock.style.opacity='1'; dock.style.pointerEvents='auto'; dock.style.zIndex='9999999'; } }catch(e){}

        try{ dock && dock.setAttribute("aria-hidden","false"); }catch(e){}
        setDockBottom();

        // Focus must happen synchronously inside the user's gesture.
        // Many mobile browsers block focus in setTimeout.
var __skipDockFocus = false;
        try{ __skipDockFocus = !!window.__dockDeferFocus; }catch(_e){}

        if(!__skipDockFocus){
        try{
          if(inp){
            /* v7: Android/WebView first-open IME fix for payment dock
               Symptom: on first app entry, tapping pay fields shows only suggestion bar,
               then keyboard can get "stuck" and dock closes first. We prime the IME by:
               1) temporarily switching to text + readonly,
               2) focusing,
               3) restoring original type/inputmode + readonly=false,
               4) refocusing + selecting.
            */
            try{
              if(!window.__dockImePrimed){
                window.__dockImePrimed = 1;
                var __origType = null, __origImode = null;
                try{ __origType = inp.type; }catch(_e){}
                try{ __origImode = inp.getAttribute('inputmode'); }catch(_e){}
                try{ inp.type = "text"; }catch(_e){}
                try{ inp.setAttribute("inputmode","text"); }catch(_e){}
                try{ inp.readOnly = true; }catch(_e){}
                try{ if(dock) dock.offsetHeight; }catch(_e){}
                try{ inp.offsetHeight; }catch(_e){}
                try{ inp.focus({preventScroll:true}); }catch(_e){ try{ inp.focus(); }catch(_e2){} }
                try{ inp.click(); }catch(_e){}
                requestAnimationFrame(function(){
                  try{
                    try{ inp.readOnly = false; }catch(_e){}
                    try{ if(__origType) inp.type = __origType; }catch(_e){}
                    try{
                      if(__origImode != null && __origImode !== ""){
                        inp.setAttribute("inputmode", __origImode);
                      }else{
                        inp.removeAttribute("inputmode");
                      }
                    }catch(_e){}
                    try{ inp.focus({preventScroll:true}); }catch(_e){ try{ inp.focus(); }catch(_e2){} }
                    try{ inp.click(); }catch(_e){}
                    try{ inp.setSelectionRange(inp.value.length, inp.value.length); }catch(_e){}
                    setTimeout(function(){
                      try{ inp.focus({preventScroll:true}); }catch(_e){ try{ inp.focus(); }catch(_e2){} }
                      try{ inp.setSelectionRange(inp.value.length, inp.value.length); }catch(_e){}
                    }, 80);
                  }catch(_e){}
                });
              }
            }catch(_e){}

            // Try to open keyboard on first tap (Android WebView can be picky)
            try{ if(dock) dock.offsetHeight; }catch(_e){}
            try{ inp.offsetHeight; }catch(_e2){}
            inp.focus({preventScroll:true});
            try{ inp.click(); }catch(_e){}
            try{ inp.setSelectionRange(inp.value.length, inp.value.length); }catch(_e2){}

            // Extra focus reinforcement for first-time WebView keyboard quirks (still within gesture window)
            try{
              var g = window.__lastDockGestureAt||0;
              window.requestAnimationFrame(function(){
                try{
                  if((Date.now() - g) < 180 && document.activeElement !== inp){
                    inp.focus({preventScroll:true});
                    try{ inp.setSelectionRange(inp.value.length, inp.value.length); }catch(_e){}
                  }
                }catch(_e){}
              });
            }catch(_e){}


            // If focus didn't stick (some Android WebViews), try one more time immediately.
            try{
              if(document.activeElement !== inp){
                inp.focus();
                try{ inp.setSelectionRange(inp.value.length, inp.value.length); }catch(_e3){}
              }
            }catch(_e4){}
          }
        }
        catch(e){ try{ inp && inp.focus(); }catch(e2){} }
        }
        try{ if(dock){ setTimeout(function(){ try{ dock.style.transition='transform 160ms ease, opacity 160ms ease'; }catch(e){} }, 0); } }catch(e){}

      }catch(e){}
    }

    function bindDock(){
      var inp = el("dockInput");
      if(!inp) return;

      // Mark that the dock actually received focus at least once (used to close on Android back/keyboard hide)
      inp.addEventListener("focus", function(){ try{ dockFocusedOnce = true; }catch(e){} }, true);

      // Enter/Next handling: receipt -> amount, amount -> close keyboard
      inp.addEventListener("keydown", function(e){
        try{
          if(!dockOpen) return;
          var isEnter = (e && (e.key === "Enter" || e.keyCode === 13));
          if(!isEnter) return;
          try{ e.preventDefault(); e.stopPropagation(); }catch(_e){}

          // Next from receipt (email/phone) to amount
          try{
            if(dockTarget && dockTarget.id === "receiptInput"){
              var a = el("payAmount");
              if(a){
                try{ window.__dockDeferFocus = 0; }catch(_e){}
                try{ window.__lastDockGestureAt = Date.now(); }catch(_e){}
                openDockFor(a, {title:"סכום", type:"number", inputmode:"decimal", enterkeyhint:"done"});
              }else{
                closeDock();
              }
              return;
            }
          }catch(_e){}

          // Done on amount closes dock + keyboard
          try{
            if(dockTarget && dockTarget.id === "payAmount"){
              closeDock();
              return;
            }
          }catch(_e){}
        }catch(_e){}
      }, true);

      // When the keyboard is dismissed (blur), close the dock too.
      inp.addEventListener("blur", function(){
        try{
          var now = Date.now();
          // If focus failed right after opening, don't immediately close (prevents blink).
          if(dockOpen && (now - (dockOpenedAt||0) > 250)){
            setTimeout(function(){
              try{
                var ae = document.activeElement;
                if(dockOpen && (!ae || ae.id !== "dockInput")) closeDock();
              }catch(e){}
            }, 80);
          }
        }catch(e){}
      });

      inp.addEventListener("input", function(){
        try{
          if(!dockOpen || !dockTarget) return;
          dockTarget.value = inp.value;
          try{ dockTarget.dispatchEvent(new Event("input",{bubbles:true})); }catch(e2){}
          try{ dockTarget.dispatchEvent(new Event("change",{bubbles:true})); }catch(e3){}
          try{ inp.value = String(dockTarget.value ?? inp.value ?? ""); }catch(e4){}
          requestAnimationFrame(function(){ try{ inp.value = String((dockTarget && dockTarget.value) ?? inp.value ?? ""); }catch(_e){} });
        }catch(e){}
      });
      inp.addEventListener("keyup", function(){ try{ if(dockOpen && dockTarget) inp.value = String(dockTarget.value ?? inp.value ?? ""); }catch(e){} });
      inp.addEventListener("change", function(){ try{ if(dockOpen && dockTarget) inp.value = String(dockTarget.value ?? inp.value ?? ""); }catch(e){} });

      var closeBtn = el("dockCloseBtn");
      if(closeBtn){
        // Prevent closing payment modal via "click-through" after dock closes on mobile
        closeBtn.addEventListener("pointerdown", function(e){ try{ e.preventDefault(); e.stopPropagation(); }catch(_){ } }, {passive:false});
        closeBtn.addEventListener("touchstart", function(e){ try{ e.preventDefault(); e.stopPropagation(); }catch(_){ } }, {passive:false});
        closeBtn.addEventListener("pointerup", function(e){ try{ e.preventDefault(); e.stopPropagation(); }catch(_){ } try{ swallowNextUserEvents(500); }catch(_){} try{ el("dockInput").blur(); }catch(_e){} closeDock(); }, {passive:false});
        closeBtn.addEventListener("touchend", function(e){ try{ e.preventDefault(); e.stopPropagation(); }catch(_){ } try{ swallowNextUserEvents(500); }catch(_){} try{ el("dockInput").blur(); }catch(_e){} closeDock(); }, {passive:false});
        closeBtn.addEventListener("click", function(e){ try{ e.preventDefault(); e.stopPropagation(); }catch(_){ } /* handled above */ });
      }

      document.addEventListener("click", function(ev){
        try{
          if(!dockOpen) return;
          try{
            var u = window.__dockOpeningUntil || 0;
            if(u && Date.now() < u) return;
          }catch(_e){}
          var d = el("inputDock");
          if(d && d.contains(ev.target)) return;
          if(ev.target && (ev.target.id==="payAmount" || ev.target.id==="payNote" || ev.target.id==="receiptInput" || ev.target.id==="secStudentSearch")) return;
          try{ var sw = document.getElementById("secSearchWrap"); if(sw && sw.contains(ev.target)) return; }catch(_e){}
          closeDock();
        }catch(e){}
      }, true);

      try{
        if(window.visualViewport){
          window.visualViewport.addEventListener("resize", setDockBottom, {passive:true});
          window.visualViewport.addEventListener("scroll", setDockBottom, {passive:true});
        }
      }catch(e){}
      window.addEventListener("resize", setDockBottom, {passive:true});
    }

    function bindPayDock(){
      var a = el("payAmount");var __focusDockInputNow = function(){
  try{
    var inp = el("dockInput");
    if(!inp) return;
    try{ var d = el("inputDock"); if(d) d.offsetHeight; }catch(_e){}
    try{ inp.offsetHeight; }catch(_e){}
    inp.focus({preventScroll:true});
    try{ inp.click(); }catch(_e){}
    try{ inp.setSelectionRange(inp.value.length, inp.value.length); }catch(_e){}
  }catch(_e){}
};

      var n = el("payNote");
      var r = el("receiptInput");

      function hijack(inputEl, opts){
        if(!inputEl) return;

        // Prevent native keyboard & layout jump from the original input.
        try{ inputEl.readOnly = true; }catch(e){}
        try{ inputEl.setAttribute('readonly','readonly'); }catch(e){}
        try{ inputEl.setAttribute('inputmode','none'); }catch(e){}
        try{ inputEl.setAttribute('tabindex','-1'); }catch(e){}
        try{ inputEl.style.cursor = 'pointer'; }catch(e){}

        // If the original input ever receives focus (Android can do this on touchstart), redirect to the dock.
        try{
          inputEl.addEventListener('focus', function(ev){
            try{ ev && ev.preventDefault && ev.preventDefault(); }catch(e){}
            try{ ev && ev.stopPropagation && ev.stopPropagation(); }catch(e){}
            try{ inputEl.blur(); }catch(e){}
            var o = opts;
            try{ if(typeof opts === 'function') o = opts(); }catch(e){}
            // do NOT defer dock focus: this breaks first-time keyboard on Android/WebView
            try{ window.__dockDeferFocus = 0; }catch(e){}
            try{ window.__lastDockGestureAt = Date.now(); }catch(e){}
            openDockFor(inputEl, o);
          }, true);
        }catch(e){}

        var startX = 0, startY = 0, moved = false;
        var lastOpen = 0;

        function pt(ev){
          try{ return (ev && ev.touches && ev.touches[0]) ? ev.touches[0] : ev; }catch(e){}
          return ev || {};
        }

        var pendingOpen = false;
        function onDown(ev){
          try{
            pendingOpen = true;
            moved = false;
            var p = pt(ev);
            startX = p && p.clientX ? p.clientX : 0;
            startY = p && p.clientY ? p.clientY : 0;

            // Critical: block native focus on the hidden/original input.
            try{ ev && ev.preventDefault && ev.preventDefault(); }catch(e){}
            try{ ev && ev.stopPropagation && ev.stopPropagation(); }catch(e){}
            try{ ev && ev.stopImmediatePropagation && ev.stopImmediatePropagation(); }catch(e){}

            try{ inputEl && inputEl.blur && inputEl.blur(); }catch(e){}

            // Open dock immediately on DOWN so keyboard can open on FIRST entry (must be inside user gesture).
            var now = Date.now();
            if(now - lastOpen < 250) return; // guard double fire
            lastOpen = now;
            try{ window.__lastDockGestureAt = now; }catch(e){}
            // prevent scrim from instantly closing during this same gesture (DOM changes can re-target UP)
            try{ window.__dockOpeningUntil = now + 650; }catch(e){}
        try{ if(typeof swallowNextUserEvents==="function") swallowNextUserEvents(550); }catch(_e){}
    
            var o = opts;
            try{ if(typeof opts === 'function') o = opts(); }catch(e){}
            openDockFor(inputEl, o);
          }catch(e){}
        }

        function onMove(ev){
          try{
            var p = pt(ev);
            var x = p && p.clientX ? p.clientX : 0;
            var y = p && p.clientY ? p.clientY : 0;
            if(Math.abs(x-startX) > 8 || Math.abs(y-startY) > 8) moved = true;
          }catch(e){}
        }

        function onUp(ev){
          try{
            // We already opened on DOWN. Here we only cancel if it was a scroll gesture.
            if(moved){
              pendingOpen = false;
            try{
              if(dockOpen){
                try{ window.__dockDeferFocus = 0; }catch(e){}
                __focusDockInputNow();
              }
            }catch(e){}
              try{ window.closeInputDock && window.closeInputDock(true); }catch(e){}
              return;
            }
            pendingOpen = false;
          }catch(e){}
        }

        // Open dock on POINTERDOWN / TOUCHSTART so keyboard opens on FIRST time (inside user gesture).
        try{ inputEl.addEventListener('pointerdown', onDown, {capture:true, passive:false}); }catch(e){}
        try{ inputEl.addEventListener('pointermove', onMove, {capture:true, passive:true}); }catch(e){}
        try{ inputEl.addEventListener('pointerup', onUp, {capture:true, passive:true}); }catch(e){}

        try{ inputEl.addEventListener('touchstart', onDown, {capture:true, passive:false}); }catch(e){}
        try{ inputEl.addEventListener('touchmove', onMove, {capture:true, passive:true}); }catch(e){}
        try{ inputEl.addEventListener('touchend', onUp, {capture:true, passive:true}); }catch(e){}
      }

      hijack(a, {title:"סכום", type:"number", inputmode:"decimal"});
      hijack(n, {title:"הערה", type:"text", inputmode:"text"});
      hijack(r, function(){
        var mode = (window.PAY && PAY.receiptMode) ? String(PAY.receiptMode) : "email";
        if(mode === "phone") return {title:"מספר פלאפון", type:"tel", inputmode:"tel"};
        return {title:"דואר אלקטרוני", type:"email", inputmode:"email"};
      });

      var emailBtn = el("receiptEmailBtn");
      var phoneBtn = el("receiptPhoneBtn");

      function setMode(mode){
        try{
          if(!window.PAY) window.PAY = {};
          PAY.receiptMode = mode;
        }catch(e){}
        try{
          if(emailBtn) emailBtn.classList.toggle("active", mode==="email");
          if(phoneBtn) phoneBtn.classList.toggle("active", mode==="phone");
        }catch(e){}
        try{
          if(r){
            if(mode==="phone"){
              r.value = "";
              r.placeholder = "הכנס מספר פלאפון";
              r.type = "tel";
              r.setAttribute("inputmode","tel");
            }else{
              r.value = "";
              r.placeholder = "הכנס דואר אלקטרוני";
              r.type = "email";
              r.setAttribute("inputmode","email");
            }
          }
        }catch(e){}
      }

      if(emailBtn) emailBtn.addEventListener("click", function(){ setMode("email"); });
      if(phoneBtn) phoneBtn.addEventListener("click", function(){ setMode("phone"); });

      setMode("email");
    }

    function init(){
      bindDock();
      bindPayDock();
    }

    // Expose dock API for other modules (e.g., secretary search)
    try{ window.openDockFor = openDockFor; }catch(e){}
    try{ window.closeDock = closeDock; }catch(e){}
    try{ window.__dockApiReady = 1; }catch(e){}

    if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
    else init();
  })();
  /* ===== /Payment Input Dock + Receipt toggle (v8) ===== */


  function goToPayLessonFromCosts(){
    try{ window.__afterLoginOpenPayLesson = true; }catch(e){}
    try{ window.__licensePaymentFlow = true; }catch(e){}
    try{
      if(typeof window.requireStudentLogin === "function"){
        window.requireStudentLogin("studentProfilePage");
      }else{
        openPage("studentProfilePage", true);
      }
    }catch(e2){
      try{ openPage("studentProfilePage", true); }catch(e3){}
    }
    // Auto-open payment on login was removed (only open on explicit user action)
  }

  function showUserPass(){
    var a = $("authUserPass"), p = $("authPhoneStep");
    if(a) a.style.display = "block";
    if(p){ p.classList.remove("show"); p.setAttribute("aria-hidden","true"); }
  }
  function showPhoneStep(){
    var a = $("authUserPass"), p = $("authPhoneStep");
    if(a) a.style.display = "none";
    if(p){ p.classList.add("show"); p.setAttribute("aria-hidden","false"); }
    var hint = $("authCodeHint");
    if(hint){ hint.style.display="none"; hint.textContent=""; }
    state.otp = null;
    var phone = $("authPhone"); if(phone) phone.value = "";
    var code = $("authCode"); if(code) code.value = "";
    setTimeout(function(){ if(phone) phone.focus(); }, 30);
  }

  function loginSuccess(username){
    state.username = username;
        state.loggedIn = true;
        try{ updatePrivateMessagesBadge(); }catch(e){}
    saveAuth();
    setStudentTitle();
    
    try{ if(window.timerHandleLogin) window.timerHandleLogin(username); }catch(e){}
try{
      var _p = loadProgress();
      var _c = (_p && typeof _p === "object" && _p.loginCount) ? Number(_p.loginCount) : 0;
      if(!isFinite(_c)) _c = 0;
      touchProgress({ lastLoginAt: Date.now(), loginCount: _c + 1 });
    }catch(e){}
    
    updateEdgeHandles();
    updateEdgeHandlePositions();
closeAuth();
    toast("מחובר כעת");
    // If login was triggered from the home profile button, open the profile menu (not the student profile page)
    if(state.postAuthOpenProfileMenu){
      state.postAuthOpenProfileMenu = false;
      setTimeout(function(){ try{ openProfileMenu(); }catch(e){} }, 160);
    }

    try{ if(typeof window.renderStudentProfile === "function") window.renderStudentProfile(); }catch(e){}
    try{ if(typeof window.__licenseFlowRefresh==="function") window.__licenseFlowRefresh(); }catch(e){}

    // If auth came from Start button, open the target page
    if(state.postAuthPage){
      var target = state.postAuthPage;
      state.postAuthPage = null;
      setTimeout(function(){
        try{ closeProfileMenu(); }catch(e){}
        try{ if(typeof window.closeMenu === 'function') window.closeMenu(); }catch(e){}
      try{ if(typeof window.closeProfileMenu === 'function') window.closeProfileMenu(); }catch(e){}
        try{ openPage(target); }catch(e){}
        try{
          if(window.__afterLoginOpenPayLesson){
            window.__afterLoginOpenPayLesson = false;
            setTimeout(function(){ try{ openPaymentModal("", "תשלום על שיעור"); }catch(e){} }, 220);
          }
        }catch(e){}

      }, 180);
    }
  }

  function logout(){
    var prevUser = state.username;
    state.loggedIn = false;
    state.username = null;
    saveAuth();
    try{ updatePrivateMessagesBadge(); }catch(e){}
    try{ if(window.timerHandleLogout) window.timerHandleLogout(prevUser); }catch(e){}
try{ touchProgress({ lastLogoutAt: Date.now() }); }catch(e){}
    setStudentTitle();
    
    updateEdgeHandles();
    updateEdgeHandlePositions();
closeProfileMenu();
    toast("התנתקת");
  }

  // expose logout for manager-mode (menu-based) so it can log out on first tap
  try{ window.appLogout = logout; }catch(e){}

  function openProfileMenu(){
    if(!state.loggedIn) return;
    setStudentTitle();
    cancelEdgeShowTimer();
    reviveOverlayEl('studentMenuScrim');
    // Only one menu can be open: close the right menu if needed
    try{ if(document.body.classList.contains('menu-open') && typeof window.closeMenu === 'function') window.closeMenu(); }catch(e){}
    document.body.classList.add("student-menu-open");
    try{ if(window.APP_STATE && typeof window.APP_STATE.set === 'function') window.APP_STATE.set({ studentMenuOpen: true }); }catch(e){}
    try{ if(typeof syncAppStateFromDOM === 'function') syncAppStateFromDOM(); }catch(e){}

    var menu = $("studentMenuLeft");
    if(menu) menu.setAttribute("aria-hidden","false");

    // animate buttons (reuse menu-in class)
    var items = menu ? menu.querySelectorAll(".menu-item") : [];
    for(var i=0;i<items.length;i++){
      items[i].classList.remove("menu-in");
      (function(el, idx){
        setTimeout(function(){ el.classList.add("menu-in"); }, 70 + idx*100);
      })(items[i], i);
    }
    var sc = $("studentMenuScroll"); if(sc) sc.scrollTop = 0;

    updateEdgeHandles();
    updateEdgeHandlePositions();
    rafEdgeFollow(420);
  }

  function closeProfileMenu(){
    cancelEdgeShowTimer();
    document.body.classList.add("student-menu-closing");
    document.body.classList.remove("student-menu-open");
    try{ if(window.APP_STATE && typeof window.APP_STATE.set === 'function') window.APP_STATE.set({ studentMenuOpen: false }); }catch(e){}
    try{ if(typeof syncAppStateFromDOM === 'function') syncAppStateFromDOM(); }catch(e){}

    var menu = $("studentMenuLeft");
    if(menu) menu.setAttribute("aria-hidden","true");
    // reset anim
    var items = menu ? menu.querySelectorAll(".menu-item") : [];
    for(var i=0;i<items.length;i++) items[i].classList.remove("menu-in");

    // Start the edge-handle return animation immediately when closing begins
    updateEdgeHandles();
    updateEdgeHandlePositions();
    rafEdgeFollow(420);

    setTimeout(function(){
      document.body.classList.remove("student-menu-closing");

      // final sync (no extra delay)
      updateEdgeHandles();
      updateEdgeHandlePositions();
    }, 400);
  }

function toggleProfileMenu(){
    if(document.body.classList.contains("student-menu-open")) closeProfileMenu();
    else openProfileMenu();
  }

  function canSwipeOpen(){
    if(!state.loggedIn) return false;
    if(document.body.classList.contains('student-menu-open')) return false;
    if(document.body.classList.contains("menu-open") || document.body.classList.contains("menu-closing")) return false;       // right menu open
    if(document.body.classList.contains("popup-open")) return false;      // overlays open
    if(document.body.classList.contains("page-open")) return false;       // page open
    if(document.body.classList.contains("auth-open")) return false;       // auth open
    return true;
  }

  // --- Phone OTP (demo) ---
  function sendCode(){
    var phone = ($("authPhone") && $("authPhone").value || "").trim();
    if(phone.length < 7){
      toast("הכנס מספר תקין");
      return;
    }
    // demo code
    state.otp = String(Math.floor(100000 + Math.random()*900000));
    var hint = $("authCodeHint");
    if(hint){
      hint.style.display="block";
      hint.textContent = "קוד נשלח (בדמו: " + state.otp + ")";
    }
    toast("נשלח קוד");
    setTimeout(function(){ var c=$("authCode"); if(c) c.focus(); }, 60);
  }

  function verifyCode(){
    var code = ($("authCode") && $("authCode").value || "").trim();
    if(!state.otp){
      toast("שלח קוד קודם");
      return;
    }
    if(code !== state.otp){
      toast("קוד לא נכון");
      return;
    }
    var phone = ($("authPhone") && $("authPhone").value || "").trim();
    // display name: phone (masked)
    var name = phone.length >= 4 ? ("***" + phone.slice(-4)) : phone;
    loginSuccess(name);
  }

  // --- User/pass login (demo: 1/1) ---
  function loginUserPass(){
    // Normalize username aggressively (fixes cases where TZ is stored digits-only or includes hidden RTL/LTR marks)
    var rawU = (($("authUsername")||{}).value || "");
    var u = String(rawU).replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069\u200B-\u200D\uFEFF]/g,"").trim();
    var p = (($("authPassword")||{}).value || "");
    if(!u || !p){ toast("נא למלא שם משתמש וסיסמה"); return; }

    // candidate usernames to try (exact, trimmed, digits-only for TZ)
    function digitsOnly(s){ return String(s||"").replace(/\D/g,""); }
    var uDigits = digitsOnly(u);
    var uCandidates = [u];
    if(uDigits && uDigits !== u) uCandidates.push(uDigits);

    // IMPORTANT: prevent manager-mode leaking into student sessions
    try{ if(typeof disableManagerMode === "function") disableManagerMode(); }catch(e){}
    try{ if(typeof disableSecretaryMode === "function") disableSecretaryMode(); }catch(e){}



    
    // Secretary login (separate role)
    try{
      var suu = String(u||"").trim();
      var spp = String(p||"");
      var _suu = suu.replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069\u200B-\u200D\uFEFF]/g,"").trim();
      var _sl = _suu.toLowerCase();
      if(spp.trim() === "1" && (_suu === "מזכירה" || _sl === "secretary")){
        try{ if(typeof enableSecretaryMode === "function") enableSecretaryMode(true); }catch(e){}
        try{ state.postAuthOpenProfileMenu = true; }catch(e){}
        try{ loginSuccess("מזכירה"); }catch(e){
          try{ state.username = "מזכירה"; state.loggedIn = true; saveAuth(); }catch(e2){}
          try{ closeAuth(); }catch(e3){}
        }
        try{ if(typeof window.updateMenuRoleSections === "function") window.updateMenuRoleSections(); }catch(e){}
        return;
      }
    }catch(e){}


// Manager login (new, separate from admin)
    try{
      var muu = String(u||"").trim();
      var mpp = String(p||"");
      var _muu = muu.replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069\u200B-\u200D\uFEFF]/g,"").trim();
      var _ml = _muu.toLowerCase();
      if(mpp.trim() === "1" && (_muu === "מנהל" || _ml === "manager")){
        // Manager MUST be a real logged-in session (otherwise menus won't work)
        try{ if(typeof enableManagerMode === "function") enableManagerMode(true); }catch(e){}
        try{ state.postAuthOpenProfileMenu = true; }catch(e){}
        try{ loginSuccess("מנהל"); }catch(e){
          // fallback if loginSuccess is unavailable for some reason
          try{ state.username = "מנהל"; state.loggedIn = true; saveAuth(); }catch(e2){}
          try{ closeAuth(); }catch(e3){}
        }
        try{ if(typeof window.updateMenuRoleSections === "function") window.updateMenuRoleSections(); }catch(e){}
        try{ setTimeout(function(){ try{ openProfileMenu(); }catch(e){} }, 80); }catch(e){}
        try{ if(typeof toast === "function") toast("כניסת מנהל"); }catch(e){}
        return;
      }
    }catch(e){}
    // Admin login (opens embedded admin panel)
    try{
      var uu = String(u||"").trim();
      var pp = String(p||"");
      var ul = uu.toLowerCase();
      if(pp === "1" && (uu === "אדמין" || ul === "admin" || uu === "Admin")){
        try{ if(typeof closeAuth === "function") closeAuth(); }catch(e){}
        try{ if(typeof toast === "function") toast("כניסת אדמין"); }catch(e){}
        try{ if(typeof window.openAdminPanel === "function") window.openAdminPanel(); }catch(e){}
        return;
      }
    }catch(e){}

    var users = loadUsers();
    var rec = null;
    var hitUser = null;
    if(users && typeof users === "object"){
      for(var ci=0; ci<uCandidates.length; ci++){
        var key = uCandidates[ci];
        if(key != null && users[key] != null){ rec = users[key]; hitUser = key; break; }
      }
    }

    function getPass(v){
      if(v == null) return "";
      if(typeof v === "string" || typeof v === "number") return String(v);
      if(typeof v === "object"){
        var pv = v.password || v.pass || v.pw || v.pin || v.code || v.loginPassword || v.tempPassword;
        if(pv == null) return "";
        return String(pv);
      }
      return "";
    }

    var stored = getPass(rec);
    if(stored && stored === String(p)){
      loginSuccess(hitUser || u);
      return;
    }

    // Fallback: sometimes users were stored with trimmed keys or numeric-like keys
    try{
      var u2 = String(u).trim();
      if(u2 !== u && users && typeof users === "object"){
        var stored2 = getPass(users[u2]);
        if(stored2 && stored2 === String(p)){ loginSuccess(u2); return; }
      }
    }catch(e){}

    
    // v4 fallback: if no users exist yet (fresh install / missing students_db_v1.js),
    // allow demo login with password "1" so the app is usable.
    try{
      var usersCount = (users && typeof users==="object") ? Object.keys(users).length : 0;
      if(!rec && usersCount === 0 && String(p).trim() === "1"){
        var demoU = (uDigits || u);
        if(demoU){
          // create minimal profile shell if missing (does not overwrite existing)
          try{
            var profKey = "student_profile_" + String(demoU);
            if(!DBStorage.getItem(profKey)){
              DBStorage.setItem(profKey, JSON.stringify({ tz:String(demoU), firstName:"", lastName:"", createdAt:(new Date()).toISOString() }));
            }
          }catch(e){}
          loginSuccess(demoU);
          return;
        }
      }
    }catch(e){}

    toast("שם משתמש או סיסמה לא נכונים");
  }

  // expose for admin bridge
  try{ window.loginUserPass = loginUserPass; }catch(e){}

  

  // --- Wire UI ---

  try{ window.openStudentProfileSubpage = openStudentProfileSubpage; window.closeStudentProfileSubpage = closeStudentProfileSubpage; }catch(e){}

/* =======================
   SIGNUP PAGE LOGIC
   ======================= */
function openSignupPage(){
  try{
    // close menus/popups to avoid overlay conflicts
    closeMenu();
    closePopup(true);
  }catch(e){}
  openPage("signupPage", true);
  // reset UI
  try{
    var form = document.getElementById("su_signupForm");
    if(form) form.reset();
        try{ var tcb=document.getElementById("su_termsCb"); if(tcb) tcb.checked=false; }catch(e){}
    try{ var terr=document.getElementById("su_termsErr"); if(terr) terr.textContent=""; }catch(e){}
    try{ var tbox=document.getElementById("su_termsOverlay"); if(tbox){ tbox.classList.remove("show"); tbox.setAttribute("aria-hidden","true"); } }catch(e){}
var sw = document.getElementById("su_successWrap");
    if(sw) sw.classList.remove("show");
    var submit = document.getElementById("su_submitBtn");
    if(submit){ submit.disabled = false; submit.textContent = "יצירת פרופיל והתחלה"; }
    // clear invalid
    var fields = document.querySelectorAll("#signupPage .su-field.invalid");
    for(var i=0;i<fields.length;i++) fields[i].classList.remove("invalid");
    // scroll to top of page-inner
    var inner = document.querySelector("#signupPage .page-inner");
    if(inner) inner.scrollTop = 0;
  }catch(e){}
}

function closeSignupPage(){
  // go back like other pages
  try{ goBackStep(); }catch(e){ try{ closeAllPages(true); }catch(err){} }
}

function suDigits(s){ return String(s||"").replace(/\D/g,""); }
function suIsEmail(s){ return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s||"").trim()); }

function suSetInvalid(id, on){
  var el = document.getElementById("su_"+id);
  if(!el) return;
  if(on) el.classList.add("invalid");
  else el.classList.remove("invalid");
}


function suNormTz9(v){
  try{
    var z = String(v||"").replace(/\D/g,"");
    if(!z) return "";
    if(z.length < 9) z = z.padStart(9, "0");
    return z;
  }catch(e){ return ""; }
}

function suTzExistsInSystem(tz){
  try{
    var z = suNormTz9(tz);
    if(!z) return false;

    // appUsers can be object map {tz:pass} or array of records
    try{
      var rawUsers = DBStorage.getItem("appUsers");
      if(rawUsers){
        var users = JSON.parse(rawUsers);
        if(users && typeof users === "object"){
          if(!Array.isArray(users)){
            var keys = Object.keys(users);
            for(var i=0;i<keys.length;i++){
              if(suNormTz9(keys[i]) === z) return true;
            }
          }else{
            for(var j=0;j<users.length;j++){
              var u = users[j] || {};
              var cand = u.tz || u.id || u.userId || u.username || u.user || u.uid || u.teudatZehut || u["תז"] || u['ת"ז'] || u['ת״ז'];
              if(suNormTz9(cand) === z) return true;
            }
          }
        }
      }
    }catch(_e1){}

    // registry map / array
    try{
      var rawReg = DBStorage.getItem("students_registry_v1");
      if(rawReg){
        var reg = JSON.parse(rawReg);
        if(reg && typeof reg === "object"){
          if(!Array.isArray(reg)){
            var rKeys = Object.keys(reg);
            for(var k=0;k<rKeys.length;k++){
              var rk = rKeys[k];
              if(suNormTz9(rk) === z) return true;
              var rv = reg[rk] || {};
              var rc = rv.tz || rv.id || rv.teudatZehut || rv["תז"] || rv['ת"ז'] || rv['ת״ז'];
              if(suNormTz9(rc) === z) return true;
            }
          }else{
            for(var a=0;a<reg.length;a++){
              var rr = reg[a] || {};
              var ac = rr.tz || rr.id || rr.teudatZehut || rr["תז"] || rr['ת"ז'] || rr['ת״ז'];
              if(suNormTz9(ac) === z) return true;
            }
          }
        }
      }
    }catch(_e2){}

    try{
      if(DBStorage.getItem("student_profile_" + z) != null) return true;
    }catch(_e3){}

    return false;
  }catch(e){
    return false;
  }
}

function suSaveUser(tz, password, profile){
  try{
    var __z = suNormTz9(tz);
    if(__z && suTzExistsInSystem(__z)){
      try{ window.__suLastError = 'duplicate_tz'; }catch(_e){}
      return { ok:false, reason:'duplicate_tz' };
    }
    tz = __z || String(tz||'').trim();
  }catch(_e0){}
  try{
    var users = loadUsers();
    users[String(tz)] = String(password);
    DBStorage.setItem("appUsers", JSON.stringify(users));
  }catch(e){}
  try{
    DBStorage.setItem("student_profile_" + String(tz), JSON.stringify(profile||{}));
  }catch(e){}
  // Mirror signup into a local "students DB" registry so Admin can find newly registered students in this demo
  try{
    var regKey = "students_registry_v1";
    var regRaw = DBStorage.getItem(regKey);
    var reg = {};
    if(regRaw){
      try{ reg = JSON.parse(regRaw) || {}; }catch(_){ reg = {}; }
    }
    if(!reg || typeof reg !== "object" || Array.isArray(reg)) reg = {};
    reg[String(tz)] = Object.assign({ tz: String(tz) }, (profile||{}));
    DBStorage.setItem(regKey, JSON.stringify(reg));
  }catch(e){}
}

function bindSignupPage(){

  // Terms UI (overlay)
  var termsLink = document.getElementById("su_termsLink");
  var termsOverlay = document.getElementById("su_termsOverlay");
  var termsClose = document.getElementById("su_termsClose");
  var termsCb = document.getElementById("su_termsCb");
  var termsErr = document.getElementById("su_termsErr");

  function setTermsOpen(open){
    if(!termsOverlay) return;
    if(open) termsOverlay.classList.add("show");
    else termsOverlay.classList.remove("show");
    termsOverlay.setAttribute("aria-hidden", open ? "false" : "true");
  }

  if(termsLink){
    termsLink.addEventListener("click", function(e){
      e.preventDefault(); e.stopPropagation();
      setTermsOpen(true);
    });
  }
  if(termsClose){
    termsClose.addEventListener("click", function(e){
      e.preventDefault(); e.stopPropagation();
      setTermsOpen(false);
    });
  }
  if(termsOverlay){
    termsOverlay.addEventListener("click", function(e){
      if(e.target === termsOverlay) setTermsOpen(false);
    });
  }

  // OTP (demo) - send code for phone verification (currently shows code on screen)
  var suSendOtpBtn = document.getElementById("su_sendOtp");
  var suOtpField   = document.getElementById("su_f-otp");
  var suOtpInput   = document.getElementById("su_otp");
  var suOtpResend  = document.getElementById("su_otpResend");
  var suOtpStatus  = document.getElementById("su_otpStatus");
  var suOtpErrEl   = (suOtpField ? suOtpField.querySelector(".err") : null);
  var suOtpState = { code:null, timer:null };

  function suStartResendCooldown(seconds){
    if(!suOtpResend) return;
    try{ clearInterval(suOtpState.timer); }catch(e){}
    var left = Math.max(0, Number(seconds)||0);
    suOtpResend.disabled = true;
    suOtpResend.textContent = "לא קיבלתי קוד (" + left + ")";
    suOtpState.timer = setInterval(function(){
      left--;
      if(left <= 0){
        clearInterval(suOtpState.timer);
        suOtpResend.disabled = false;
        suOtpResend.textContent = "לא קיבלתי קוד";
      }else{
        suOtpResend.textContent = "לא קיבלתי קוד (" + left + ")";
      }
    }, 1000);
  }

  function suSendOtpDemo(){
    var phoneRaw = (document.getElementById("su_phone")||{}).value || "";
    var phone = suDigits(phoneRaw);
    var phoneOk = (phone.length >= 9);

    suSetInvalid("f-phone", !phoneOk);
    if(!phoneOk){
      if(suOtpErrEl) suOtpErrEl.textContent = "";
      if(suOtpStatus) suOtpStatus.textContent = "";
      try{ toast("מספר פלאפון לא תקין"); }catch(e){}
      return;
    }

    if(suOtpField) suOtpField.hidden = false;

    // Generate 6-digit demo code
    var code = String(Math.floor(100000 + Math.random() * 900000));
    suOtpState.code = code;

    if(suOtpErrEl) suOtpErrEl.textContent = "";
    if(suOtpStatus){
      suOtpStatus.style.display = "block";
      suOtpStatus.innerHTML = 'קוד אימות (דמו): <b style="color:#0b2f25">' + code + '</b>';
    }

    if(suOtpInput){
      suOtpInput.value = "";
      try{ setTimeout(function(){ suOtpInput.focus(); }, 50); }catch(e){}
    }

    suStartResendCooldown(20);
  }

  if(suSendOtpBtn){
    suSendOtpBtn.addEventListener("click", function(e){
      e.preventDefault(); e.stopPropagation();
      suSendOtpDemo();
    });
  }
  if(suOtpResend){
    suOtpResend.addEventListener("click", function(e){
      e.preventDefault(); e.stopPropagation();
      suSendOtpDemo();
    });
  }

  if(termsCb){
    termsCb.addEventListener("change", function(){
      if(termsCb.checked && termsErr) termsErr.textContent = "";
    });
  }

  var form = document.getElementById("su_signupForm");
  if(form){
    form.addEventListener("submit", function(e){
      e.preventDefault();
      e.stopPropagation();

      var firstName = (document.getElementById("su_firstName")||{}).value || "";
      var lastName  = (document.getElementById("su_lastName")||{}).value || "";
      var tz        = (document.getElementById("su_tz")||{}).value || "";
      var licenseType = (document.getElementById("su_licenseType")||{}).value || "";
      var phone     = (document.getElementById("su_phone")||{}).value || "";
      var email     = (document.getElementById("su_email")||{}).value || "";
      var email2    = (document.getElementById("su_email2")||{}).value || "";
      var pass      = (document.getElementById("su_password")||{}).value || "";
      var pass2     = (document.getElementById("su_password2")||{}).value || "";

      firstName = String(firstName).trim();
      lastName  = String(lastName).trim();
      tz        = suDigits(tz);
      phone     = suDigits(phone);
      email     = String(email).trim();
      email2    = String(email2).trim();

      var ok = true;

      suSetInvalid("f-firstName", !firstName); if(!firstName) ok=false;
      suSetInvalid("f-lastName", !lastName); if(!lastName) ok=false;

      var tzOk = (tz.length === 9);
      suSetInvalid("f-tz", !tzOk); if(!tzOk) ok=false;

      var phoneOk = (phone.length >= 9);
      suSetInvalid("f-phone", !phoneOk); if(!phoneOk) ok=false;

      // If OTP step is visible (user clicked "שלח קוד") - require correct code
      try{
        var otpField = document.getElementById("su_f-otp");
        var otpInput = document.getElementById("su_otp");
        var otpErr   = (otpField ? otpField.querySelector(".err") : null);
        if(otpErr) otpErr.textContent = "";
        if(otpField && otpField.hidden === false){
          var entered = suDigits((otpInput||{}).value || "");
          if(!suOtpState || !suOtpState.code){
            if(otpErr) otpErr.textContent = "נא ללחוץ על 'שלח קוד'.";
            ok = false;
          }else if(entered !== String(suOtpState.code)){
            if(otpErr) otpErr.textContent = "קוד אימות שגוי.";
            ok = false;
          }
        }
      }catch(err){}
      var emailOk = suIsEmail(email);
      suSetInvalid("f-email", !emailOk); if(!emailOk) ok=false;

      var email2Ok = (emailOk && email2 === email);
      suSetInvalid("f-email2", !email2Ok); if(!email2Ok) ok=false;

      var passOk = (String(pass).length >= 8);
      suSetInvalid("f-pass", !passOk); if(!passOk) ok=false;

      var pass2Ok = (passOk && pass2 === pass);
      suSetInvalid("f-pass2", !pass2Ok); if(!pass2Ok) ok=false;

      if(!ok){
        try{ toast("יש להשלים את השדות"); }catch(err){}
        return;
      }

      
      // Terms acceptance
      var termsCb = document.getElementById("su_termsCb");
      var termsErr = document.getElementById("su_termsErr");
      if(termsErr) termsErr.textContent = "";
      if(termsCb && !termsCb.checked){
        if(termsErr) termsErr.textContent = "חובה לאשר את תנאי השימוש";
        try{ toast("נא לאשר תנאי שימוש"); }catch(err){}
        try{ termsCb.scrollIntoView({behavior:"smooth", block:"center"}); }catch(e){}
        return;
      }

// Save
      var profile = {
        firstName:firstName,
        lastName:lastName,
        tz:tz,
        licenseType: String(licenseType||"").trim(),
        phone:phone,
        email:email,
        createdAt: Date.now()
      };
      if(suTzExistsInSystem(tz)){
        suSetInvalid("f-tz", true);
        try{ toast("תז כבר קיים במערכת"); }catch(err){}
        return;
      }

      var __suRes = suSaveUser(tz, pass, profile);
      if(__suRes && __suRes.ok === false){
        suSetInvalid("f-tz", true);
        try{ toast("תז כבר קיים במערכת"); }catch(err){}
        return;
      }

      // success UI
      var sw = document.getElementById("su_successWrap");
      if(sw) sw.classList.add("show");
      var submit = document.getElementById("su_submitBtn");
      if(submit){ submit.disabled = true; submit.textContent = "נרשמת בהצלחה"; }

      // log in and go to profile
      setTimeout(function(){
        try{
          loginSuccess(tz);
          if(window.__startSignupOpenLicense){
            window.__startSignupOpenLicense = false;
            try{ openLicenseRequestPage(); }catch(e){ try{ openPage("licenseRequestPage", true); }catch(e2){} }
          }else{
            openPage("studentProfilePage", true);
          }
        }catch(err){}
      }, 550);
    });
  }
}

function bind(){
    // Edge handles (tabs) for menus
    var rh = $("rightEdgeHandle");
    if(rh){
      rh.addEventListener("click", function(ev){
        ev.preventDefault();
        ev.stopPropagation();
        try{ if(ev.stopImmediatePropagation) ev.stopImmediatePropagation(); }catch(_){ }
        if(document.body.classList.contains("menu-open")) closeMenu();
        else openMenu();
        updateEdgeHandles();
        updateEdgeHandlePositions();
      });
    }

    var lh = $("leftEdgeHandle");
    if(lh){
      lh.addEventListener("click", function(ev){
        ev.preventDefault();
        ev.stopPropagation();
        try{ if(ev.stopImmediatePropagation) ev.stopImmediatePropagation(); }catch(_){ }
        if(!state.loggedIn) return;
        toggleProfileMenu();
        updateEdgeHandles();
        updateEdgeHandlePositions();
      });
    }

    window.addEventListener("resize", function(){
      try{
        if(document.body && (document.body.classList.contains("manager-open") || document.body.classList.contains("admin-open"))) return;
      }catch(e){}
      updateEdgeHandles();
      updateEdgeHandlePositions();
    });

    // Profile button on home
    var pb = $("profileBtn");
    if(pb){
      pb.addEventListener("click", function(ev){
        ev.preventDefault();
        ev.stopPropagation();
        if(state.loggedIn) openProfileMenu();
        else{
          state.postAuthPage = null;
          state.postAuthOpenProfileMenu = true;
          openAuth("login");
        }
});
    }

    updateEdgeHandles();

    // Keep edge-handles in sync after menu transitions (prevents disappearing after full open/close)
    var _side = $("sideMenu");
    if(_side){
      _side.addEventListener("transitionend", function(e){
        try{
          if(e && e.propertyName && e.propertyName !== "transform") return;
          updateEdgeHandles();
          updateEdgeHandlePositions();
        }catch(_){}
      }, {passive:true});
    }
    var _studentMenu = $("studentMenuLeft");
    if(_studentMenu){
      _studentMenu.addEventListener("transitionend", function(e){
        try{
          if(e && e.propertyName && e.propertyName !== "transform") return;
          updateEdgeHandles();
          updateEdgeHandlePositions();
        }catch(_){}
      }, {passive:true});
    }

    // Single, reliable sync for edge handles on ANY state change (menu/popup/page/start/etc).
    (function(){
      if(window.__edgeHandleObserverAttached) return;
      window.__edgeHandleObserverAttached = true;

      try{
        var mo = new MutationObserver(function(muts){
          for(var i=0;i<muts.length;i++){
            if(muts[i].attributeName === "class"){
              try{ updateEdgeHandles(); }catch(_){}
              try{ updateEdgeHandlePositions(); }catch(_){}
              break;
            }
          }
        });
        mo.observe(document.body, {attributes:true, attributeFilter:["class"]});
      }catch(_){}
    })();

    // Modal background click closes
    var ao = $("authOverlay");
    if(ao){
      ao.addEventListener("click", function(e){
        if(e && e.target !== ao) return;
        closeAuth();
      });
    }

    // Prevent any global touch/pointer handlers from stealing the first tap on inputs
    try{
      var am = document.querySelector("#authOverlay .auth-modal");
      if(am){
        am.addEventListener("pointerdown", function(e){ e.stopPropagation(); });
        am.addEventListener("touchstart", function(e){ e.stopPropagation(); }, {passive:true});
      }
    }catch(e){}
var loginBtn = $("authLoginBtn");
    if(loginBtn) loginBtn.addEventListener("click", loginUserPass);

    var closeBtn = $("authCloseBtn");
    if(closeBtn) closeBtn.addEventListener("click", closeAuth);
    var signupBtn = $("authSignupBtn");
    if(signupBtn) signupBtn.addEventListener("click", function(e){
      e.preventDefault();
      e.stopPropagation();
      closeAuth();
      try{ window.__startSignupOpenLicense = true; }catch(e){}
      openSignupPage();
    });

    var phoneBtn = $("authPhoneBtn");
    if(phoneBtn) phoneBtn.addEventListener("click", showPhoneStep);

    var backBtn = $("authBackBtn");
    if(backBtn) backBtn.addEventListener("click", showUserPass);

    var sendBtn = $("authSendCodeBtn");
    if(sendBtn) sendBtn.addEventListener("click", sendCode);

    var verifyBtn = $("authVerifyBtn");
    if(verifyBtn) verifyBtn.addEventListener("click", verifyCode);

    // scrim closes student menu (close immediately on first touch)
    var sm = $("studentMenuScrim");
    if(sm){
      var closeProfileNow = function(e){
        if(e){
          try{ e.preventDefault(); }catch(_){}
          try{ e.stopPropagation(); }catch(_){}
          try{ if(e.stopImmediatePropagation) e.stopImmediatePropagation(); }catch(_){}
        }
        closeProfileMenu();
      };
      sm.addEventListener("pointerdown", closeProfileNow, true);
      sm.addEventListener("touchstart", closeProfileNow, {passive:false, capture:true});
      sm.addEventListener("mousedown", closeProfileNow, true);
      sm.addEventListener("click", closeProfileNow, true);
      ["touchmove","touchend","pointermove","pointerup"].forEach(function(evt){
        sm.addEventListener(evt, function(e){
          e.preventDefault(); e.stopPropagation();
        }, {passive:false, capture:true});
      });
    }
// student menu button actions (demo)
    function demo(msg){ return function(){ toast(msg); }; }
    var book = $("bookTestBtn");
    if(book) book.addEventListener("click", function(){
      try{ closeProfileMenu(); }catch(e){}
      try{ openPage("bookTestPage"); }catch(e){}
      try{ if(typeof ensureCloseSliderOnPage === "function") ensureCloseSliderOnPage($("bookTestPage")); }catch(e){}
      try{ if(typeof window.renderBookTestPage === "function") window.renderBookTestPage(); }catch(e){}
    });
    var pm = $("privateMessagesBtn");
    if(pm) pm.addEventListener("click", function(){
      if(!state.loggedIn){ toast("צריך להתחבר"); try{ openAuth(); }catch(e){} return; }
      try{ closeProfileMenu(); }catch(e){}
      try{ openPage("privateMessagesPage"); }catch(e){}
      try{ renderPrivateMessages(); }catch(e){}
    });
var lo = $("studentLogoutBtn"); if(lo) lo.addEventListener("click", logout);

    

    var up = $("updateProfileBtn");
    if(up) up.addEventListener("click", function(){
      try{ closeProfileMenu(); }catch(e){}
      try{ openPage("studentProfilePage"); }catch(e){}
    });
// Enter-to-login (user/pass)
    var upass = $("authPassword");
    if(upass){
      upass.addEventListener("keydown", function(e){
        if(e.key === "Enter") loginUserPass();
      });
    }
    var code = $("authCode");
    if(code){
      code.addEventListener("keydown", function(e){
        if(e.key === "Enter") verifyCode();
      });
    }

    // Swipe open from left 10% (only after login)
    var startX = 0, startY = 0, tracking = false;
    document.addEventListener("touchstart", function(e){
      if(document.body.classList.contains("menu-open")) return;

      if(!canSwipeOpen()) return;
      if(!e.touches || !e.touches[0]) return;
      var t = e.touches[0];
      var edge = window.innerWidth * 0.10;
      if(t.clientX > edge) return;
      tracking = true;
      startX = t.clientX;
      startY = t.clientY;
    }, {passive:true});

    document.addEventListener("touchmove", function(e){
      if(!tracking) return;
      if(!e.touches || !e.touches[0]) return;
      var t = e.touches[0];
      var dx = t.clientX - startX;
      var dy = t.clientY - startY;
      if(Math.abs(dy) > 42){
        tracking = false;
        return;
      }
      if(dx > 60){
        tracking = false;
        openProfileMenu();
      }
    }, {passive:true});

    document.addEventListener("touchend", function(){ tracking = false; }, {passive:true});

    // Swipe close (left) when menu is open
    var menu = $("studentMenuLeft");
    if(menu){
      var cX=0, cY=0, cT=false;
      menu.addEventListener("touchstart", function(e){
        if(!document.body.classList.contains("student-menu-open")) return;
        if(!e.touches || !e.touches[0]) return;
        cT=true; cX=e.touches[0].clientX; cY=e.touches[0].clientY;
      }, {passive:true});
      menu.addEventListener("touchmove", function(e){
        if(!cT) return;
        if(!e.touches || !e.touches[0]) return;
        var dx = e.touches[0].clientX - cX;
        var dy = e.touches[0].clientY - cY;
        if(Math.abs(dy) > 42){ cT=false; return; }
        if(dx < -60){ cT=false; closeProfileMenu(); }
      }, {passive:true});
      menu.addEventListener("touchend", function(){ cT=false; }, {passive:true});
    }

    // Start button -> Start overlay (Signup/Login choice)
    var startBtn = $("startButton");
    if(startBtn){
      startBtn.addEventListener("click", function(e){
        e.preventDefault();
        openStartOverlay();
      });
    }

    var startOverlay = $("startOverlay");
    if(startOverlay){
      startOverlay.addEventListener("click", function(e){
        if(e.target === startOverlay) closeStartOverlay();
      });
    }
    var startGoSignupBtn = $("startGoSignupBtn");
    if(startGoSignupBtn) startGoSignupBtn.addEventListener("click", function(e){
      try{ if(e){ e.preventDefault(); e.stopPropagation(); } }catch(err){}
      try{ closeStartOverlay(); }catch(err){}
      openSignupPage();
    });
    var startGoLoginBtn = $("startGoLoginBtn");
    if(startGoLoginBtn) startGoLoginBtn.addEventListener("click", function(){ beginAuthFromStart("login"); });
    var startGoProcessBtn = $("startGoProcessBtn");
    if(startGoProcessBtn) startGoProcessBtn.addEventListener("click", function(){
      if(state && state.loggedIn){
        closeStartOverlay();
        openPage("licenseRequestPage");
  try{ if(typeof window.__licenseFlowRefresh==="function") window.__licenseFlowRefresh(); }catch(e){}
      }
    });

    // License request page navigation
    var licenseBtn = $("licenseRequestBtn");
    if(licenseBtn) licenseBtn.addEventListener("click", function(){ openLicenseRequestPage(); });

    // Payment from license page / menu
    var openPaymentBtn = $("openPaymentBtn");
    if(openPaymentBtn) openPaymentBtn.addEventListener("click", function(){ openPaymentModal("", "הגשת בקשה לרישיון", true); });

    var payLessonBtn = $("payLessonBtn");
    if(payLessonBtn) payLessonBtn.addEventListener("click", function(){ openPaymentModal("", "תשלום על שיעור", true); });

    var licensePayLessonBtn = $("licensePayLessonBtn");
    if(licensePayLessonBtn) licensePayLessonBtn.addEventListener("click", function(){ try{ window.__payContext = "license_request"; }catch(e){} goToPayLessonFromCosts(); });

    var payOverlay = $("payOverlay");
    if(payOverlay){
      payOverlay.addEventListener("click", function(e){
        if(e.target === payOverlay) closePaymentModal();
      });
    }
    var payCancelBtn = $("payCancelBtn");
    if(payCancelBtn) payCancelBtn.addEventListener("click", function(){ closePaymentModal(); });
    var payConfirmBtn = $("payConfirmBtn");
    if(payConfirmBtn) payConfirmBtn.addEventListener("click", function(){
      var u = payGetUser();
      if(!u){
        toast("צריך להתחבר כדי לשמור תשלום");
        try{ closePaymentModal(); }catch(e){}
        try{ openAuth("login"); }catch(e2){}
        return;
      }

      var amount = payParseAmount((($("payAmount")||{}).value||""));
      var note = String((($("payNote")||{}).value||"")).trim();
      if(!amount || amount <= 0){
        toast("הכנס סכום תקין");
        return;
      }
      if(!note) note = "תשלום";

      // v8: receipt contact (must fill one)
      try{
        var mode = (window.PAY && PAY.receiptMode) ? String(PAY.receiptMode) : "email";
        var rv = String((($("receiptInput")||{}).value||"")).trim();
        if(!rv){
          toast(mode==="phone" ? "חובה להזין מספר פלאפון לקבלה" : "חובה להזין דואר אלקטרוני לקבלה");
          return;
        }
      }catch(e){}

      var lessonsAdded = (PAY && PAY.selectedLessons) ? (PAY.selectedLessons|0) : 0;

      try{
        payAddReceipt(u, amount, note, lessonsAdded);
      }catch(e){}

      try{ payClearPackSelection(); }catch(e){}
      try{ paySetMiniText(); }catch(e){}

      try{
        if(window.__licensePaymentFlow){
          window.__licensePaymentFlow = false;
          if(typeof window.patchStudentProgress==="function") window.patchStudentProgress({license_flow_step4_paid_v1:1});
          else if(typeof touchProgress==="function") touchProgress({license_flow_step4_paid_v1:1});
        }
      }catch(e){}

      toast("שולם בהצלחה");

      try{
        if(window.__payContext === "license_request"){
          window.__payContext = null;
          if(typeof window.patchStudentProgress === "function") window.patchStudentProgress({license_flow_paid_ok_v1:1});
          else if(typeof window.touchProgress === "function") window.touchProgress({license_flow_paid_ok_v1:1});
          if(typeof window.__licenseFlowRefresh === "function") window.__licenseFlowRefresh();
        }
      }catch(e){}

      closePaymentModal();
      try{ if(typeof window.renderStudentProfile === "function") window.renderStudentProfile(); }catch(e){}
    try{ if(typeof window.__licenseFlowRefresh==="function") window.__licenseFlowRefresh(); }catch(e){}
    });

try{ bindSignupPage(); }catch(e){}
}

  // Alpha hit-testing for icon buttons: click only on visible pixels (ignore transparent PNG area)
  function setupAlphaHitTest(){
    try{
      const cache = new Map(); // src -> {w,h,data}
      function getInfo(img){
        const src = img.currentSrc || img.src;
        if(!src) return null;
        if(cache.has(src)) return cache.get(src);
        const w = img.naturalWidth || 0;
        const h = img.naturalHeight || 0;
        if(!w || !h) return null;
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        const ctx = c.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        let imageData;
        try{ imageData = ctx.getImageData(0, 0, w, h); }catch(e){ return null; }
        const info = { w, h, data: imageData.data };
        cache.set(src, info);
        return info;
      }

      function alphaAt(img, clientX, clientY){
        const rect = img.getBoundingClientRect();
        const x = clientX - rect.left;
        const y = clientY - rect.top;
        if(x < 0 || y < 0 || x > rect.width || y > rect.height) return 0;
        const info = getInfo(img);
        if(!info) return 255; // if we can't read pixels, allow click
        const ix = Math.max(0, Math.min(info.w - 1, Math.floor(x * (info.w / rect.width))));
        const iy = Math.max(0, Math.min(info.h - 1, Math.floor(y * (info.h / rect.height))));
        const idx = (iy * info.w + ix) * 4 + 3; // alpha channel
        return info.data[idx] || 0;
      }

      function attach(btn, threshold){
        if(!btn) return;
        const img = btn.querySelector('img');
        if(!img) return;

        if(img.complete) getInfo(img);
        else img.addEventListener('load', () => getInfo(img), { once: true });

        // transparency threshold: block clicks on fully/mostly transparent pixels around the icon
        // NOTE: keep conservative to avoid blocking legit taps.
        const TH = (typeof threshold === 'number') ? threshold : -1;

        function shouldBlock(ev){
          if(TH < 0) return false;
          let cx = ev.clientX, cy = ev.clientY;
          if((cx == null || cy == null) && ev.touches && ev.touches[0]){
            cx = ev.touches[0].clientX;
            cy = ev.touches[0].clientY;
          }
          if(cx == null || cy == null) return false;
          return alphaAt(img, cx, cy) <= TH;
        }

        function guard(ev){
          if(shouldBlock(ev)){
            ev.preventDefault();
            ev.stopPropagation();
            if(ev.stopImmediatePropagation) ev.stopImmediatePropagation();
            return false;
          }
        }

        // capture + passive:false to allow preventDefault on touch
        ['pointerdown','mousedown','touchstart','click'].forEach(type => {
          btn.addEventListener(type, guard, { capture: true, passive: false });
        });
      }

      // Only enable strict hit-testing for the big HOME buttons (START/SHOP).
      // Other icons stay permissive to avoid Android/WebView edge cases.
      attach(document.getElementById('startButton'), 10);
      attach(document.getElementById('shopBtn'), 10);
    }catch(e){}
  }

  // init
  loadAuth();
    setAuthMode("login"); // force login-only (external signup)
  setStudentTitle();
    try{ if(state.loggedIn && state.username){ if(window.timerHandleLogin) window.timerHandleLogin(state.username); } else { if(window.timerHandleLogout) window.timerHandleLogout(null); } }catch(e){}
// Expose helpers for the main (right) menu to enforce single-open-menu behavior
  try{
    window.openProfileMenu = openProfileMenu;
    window.closeProfileMenu = closeProfileMenu;
    window.isProfileMenuOpen = function(){ return document.body.classList.contains('student-menu-open'); };
  }catch(e){}

  // Allow external menu items to require student login for a target page
  try{
    window.requireStudentLogin = function(targetPage){
      try{
        var pid = (targetPage==null?"":String(targetPage));
        if(state.loggedIn && state.username){
          try{ openPage(pid); }catch(e){}
          return;
        }
        state.postAuthPage = pid || null;
        openAuth("login");
      }catch(e2){
        try{ openAuth("login"); }catch(e3){}
      }
    };
  }catch(e){}

  bind();
  setupAlphaHitTest();
    syncStartOverlayActions();
})();

/* ===== script block 9 (from original HTML) ===== */
(() => {
  'use strict';

  // ===== Helpers =====
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const nowMs = () => Date.now();

  // ===== Config =====
  const LESSON_SEC = 40 * 60;
  const MIN_LESSONS = 0.5;
  const MIN_TOTAL_SEC = MIN_LESSONS * LESSON_SEC;
  // ===== Lesson Management (Daily Files) =====
  const REPORTS_KEY = 'admin_lesson_reports_v1';
  const TEST_ORDERS_KEY = 'admin_test_orders_v1';

  const _pad2 = (n) => String(n).padStart(2, '0');
  function _dateKey(ms){
    const d = new Date(ms);
    return `${d.getFullYear()}-${_pad2(d.getMonth()+1)}-${_pad2(d.getDate())}`;
  }
  function _dateTitle(dateKey){
    // dateKey: YYYY-MM-DD
    const p = String(dateKey||'').split('-');
    if(p.length!==3) return String(dateKey||'');
    return `${p[2]}/${p[1]}/${p[0]}`;
  }
  function _hm(ms){
    const d = new Date(ms);
    return `${_pad2(d.getHours())}:${_pad2(d.getMinutes())}`;
  }

  function loadLessonReports(){
    try{
      const raw = DBStorage.getItem(REPORTS_KEY);
      const obj = raw ? JSON.parse(raw) : {};
      return (obj && typeof obj === 'object') ? obj : {};
    }catch(e){ return {}; }
  }
  function saveLessonReports(obj){
    try{ DBStorage.setItem(REPORTS_KEY, JSON.stringify(obj||{})); }catch(e){}

  }

  
  function loadTestOrders(){
    try{
      const raw = DBStorage.getItem(TEST_ORDERS_KEY);
      const obj = raw ? JSON.parse(raw) : {};
      return (obj && typeof obj === 'object') ? obj : {};
    }catch(e){ return {}; }
  }
  function saveTestOrders(obj){
    try{ DBStorage.setItem(TEST_ORDERS_KEY, JSON.stringify(obj||{})); }catch(e){}
  }

  function addTestOrderEntry(tz, name, price, txId){
    const tzN = (typeof normalizeTz === 'function') ? normalizeTz(tz) : String(tz||'').replace(/\D/g,'');
    const when = Date.now();
    const dateKey = (function(){
      try{
        const d = new Date(when);
        const y = d.getFullYear();
        const m = String(d.getMonth()+1).padStart(2,'0');
        const da = String(d.getDate()).padStart(2,'0');
        return `${y}-${m}-${da}`;
      }catch(e){ return 'unknown'; }
    })();

    const obj = loadTestOrders();
    if(!obj[dateKey] || !Array.isArray(obj[dateKey])) obj[dateKey] = [];
    // Idempotency: if txId exists already, do not add/charge again
const _tx = (txId == null ? '' : String(txId)).trim();
if(_tx){
  try{
    const arr = obj[dateKey];
    for(let i=0;i<arr.length;i++){
      const r = arr[i];
      if(r && String(r.txId||'').trim() === _tx) return false;
    }
  }catch(e){}
}

obj[dateKey].push({
  txId: _tx || undefined,
  tz: tzN || String(tz||''),
  name: (name == null ? '' : String(name)).trim(),
  price: Number(price) || 400,
  orderedAt: when,
  orderedTime: (function(){ try{ const d=new Date(when); return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0'); }catch(e){ return ''; } })()
});
    saveTestOrders(obj);
    return true;
  }

  // Backward compatibility: some older blocks referenced loadReports().
  // In this codebase, lesson reports are stored under REPORTS_KEY.
  function loadReports(){
    return loadLessonReports();
  }

  // Backward/forward compatible time readers for report records
  // (older versions used startedAtMs/endedAtMs instead of startMs/endMs)
  function _pickMsFromKeys(r, keys){
    for(const k of keys){
      if(!r || r[k] == null) continue;
      const n = Number(r[k]);
      if(Number.isFinite(n) && n > 0) return n;
    }
    return 0;
  }
  function _getStartMs(r){
    // Prefer numeric ms fields, but support legacy records that kept ISO fields only.
    var ms = _pickMsFromKeys(r, ['startMs','startedAtMs','startTimeMs','lessonStartMs','start']);
    if(ms) return ms;
    var iso = r && (r.startISO || r.startIso || r.startTimeISO || r.startTimeIso || r.startedISO || r.startedIso || r.startAtISO || r.startAtIso);
    if(typeof iso === 'string' && iso.trim()){
      var parsed = Date.parse(iso);
      if(isFinite(parsed)) return parsed;
    }
    return 0;
  }
  function _getEndMs(r){
    var ms = _pickMsFromKeys(r, ['endMs','endedAtMs','endTimeMs','lessonEndMs','end']);
    if(ms) return ms;
    var iso = r && (r.endISO || r.endIso || r.endTimeISO || r.endTimeIso || r.endedISO || r.endedIso || r.endAtISO || r.endAtIso);
    if(typeof iso === 'string' && iso.trim()){
      var parsed = Date.parse(iso);
      if(isFinite(parsed)) return parsed;
    }
    return 0;
  }

  function getReportEntriesForTz(targetTz, typeFilter){
    var reports = loadReports();
    var rows = [];
    var target = String(targetTz || '').trim();
    if(!target) return rows;

    function extractTimeLabel(v){
        if(v == null) return '';
        if(typeof v === 'number' && isFinite(v) && v > 0){
            return _hm(v);
        }
        if(typeof v === 'string'){
            var s = v.trim();
            var m = s.match(/(\d{1,2}:\d{2})/);
            if(m) return m[1];
            return '';
        }
        try{
            var ms = Date.parse(v);
            if(isFinite(ms)) return _hm(ms);
        }catch(e){}
        return '';
    }

    function parseUnits(r){
        var keys = ['units','lessonUnits','lessons','lessonsCount','count','qty','amount','numLessons','num','value'];
        for(var i=0;i<keys.length;i++){
            var k = keys[i];
            if(r && r[k] != null){
                var v = r[k];
                if(typeof v === 'number' && isFinite(v)) return v;
                if(typeof v === 'string'){
                    var m = v.match(/([0-9]+(?:\.[0-9]+)?)/);
                    if(m) return parseFloat(m[1]);
                }
            }
        }
        return 1;
    }

    Object.keys(reports || {}).forEach(function(dateKey){
        var arr = reports[dateKey] || [];
        if(!Array.isArray(arr)) return;

        arr.forEach(function(r){
            var typ = String((r && (r.type || r.kind || r.eventType)) || ((r && r.meta) ? r.meta.type : '') || '').trim().toLowerCase();
            var wanted = String(typeFilter || '').trim().toLowerCase();
            if(wanted){
                if(!typ) return;
                if(typ !== wanted) return;
            }
            var tzStr = String((r && r.tz) != null ? r.tz : '').trim();
            if(tzStr !== target) return;

            var startMs = _getStartMs(r);
            var endMs = _getEndMs(r);

            var startStr = '';
            var endStr = '';
            if(!startMs){
                startStr = extractTimeLabel((r && (r.startedAtStr || r.startTime || r.startLabel || r.startStr || r.start)) || (r && r.startedAt) || '');
            }
            if(!endMs){
                endStr = extractTimeLabel((r && (r.endedAtStr || r.endTime || r.endLabel || r.endStr || r.end)) || (r && r.endedAt) || '');
            }

            var units = parseUnits(r);
            if(!isFinite(units) || units <= 0) units = 1;

            rows.push({
                date: dateKey,
                startedAt: startMs ? Number(startMs) : null,
                endedAt: endMs ? Number(endMs) : null,
                startedAtStr: startStr || '',
                endedAtStr: endStr || '',
                units: units,
                raw: r
            });
        });
    });

    // newest first
    rows.sort(function(a,b){
        var aKey = a.endedAt || a.startedAt || 0;
        var bKey = b.endedAt || b.startedAt || 0;
        if(bKey !== aKey) return bKey - aKey;
        return String(b.date).localeCompare(String(a.date));
    });

    return rows;
}


  function buildLessonReportText(dateKey){
    const reports = loadLessonReports();
    const arr = Array.isArray(reports[dateKey]) ? reports[dateKey] : [];
    const titleDate = _dateTitle(dateKey);
    let out = `ניהול שיעורים - ${titleDate}\n`;
    out += `תאריך: ${titleDate}\n\n`;
    if(!arr.length){
      out += `אין רשומות.\n`;
      return out;
    }
    // Merge "outside" records into the related lesson record (same day + same student)
    function _isOutsideRecord(r){
      return !!(r && String(r.type || '').toLowerCase() === 'outside');
    }
    function _toMinutes(ms){
      const t = Number(ms);
      if(!Number.isFinite(t) || t <= 0) return null;
      try{
        const d = new Date(t);
        return d.getHours() * 60 + d.getMinutes();
      }catch(e){ return null; }
    }

    const lessons = [];
    const outs = [];
    (arr || []).forEach((r) => {
      if(!r) return;
      if(_isOutsideRecord(r)) outs.push(r);
      else lessons.push(Object.assign({ __outs: [] }, r));
    });

    // Assign each outside entry to the most plausible lesson of the same student on the same day.
    // Heuristic: pick the latest lesson whose start <= outside start (fallback: first lesson for that student).
    const outsSorted = outs.slice().sort((a,b)=> (_getStartMs(a)||0) - (_getStartMs(b)||0));
    const unassigned = [];
    outsSorted.forEach((o) => {
      const tz = String((o && o.tz) ? o.tz : '');
      const oStartMin = _toMinutes(_getStartMs(o));
      const cand = lessons.filter(l => String((l && l.tz) ? l.tz : '') === tz);
      if(!cand.length){ unassigned.push(o); return; }

      let chosen = cand[0];
      if(oStartMin != null){
        let best = null;
        let bestStart = -1;
        cand.forEach((l) => {
          const lStartMin = _toMinutes(_getStartMs(l));
          if(lStartMin == null) return;
          if(lStartMin <= oStartMin && lStartMin >= bestStart){
            bestStart = lStartMin;
            best = l;
          }
        });
        if(best) chosen = best;
      }
      if(chosen && chosen.__outs) chosen.__outs.push(o);
      else unassigned.push(o);
    });

    function _fmtRange(r){
      const sMs = _getStartMs(r);
      const eMs = _getEndMs(r);
      const start = sMs ? _hm(sMs) : '—';
      const end = eMs ? _hm(eMs) : '—';
      return { start, end };
    }

    let idx = 0;
    (lessons.length ? lessons : []).forEach((r) => {
      idx++;
      const fullName = (r && r.fullName) ? r.fullName : '—';
      const tz = (r && r.tz) ? r.tz : '—';
      const units = (r && Number.isFinite(Number(r.units))) ? Number(r.units) : 1;
      const range = _fmtRange(r);
      out += `${idx}) שם: ${fullName}\n`;
      out += `   ת״ז: ${tz}\n`;
      out += `   שיעורים: ${units}\n`;
      out += `   התחלה: ${range.start}   סיום: ${range.end}\n`;

      const oArr = Array.isArray(r.__outs) ? r.__outs : [];
      if(oArr.length){
        oArr.forEach((o) => {
          const oRange = _fmtRange(o);
          out += `   חוץ התחלה: ${oRange.start}   סיום: ${oRange.end}\n`;
        });
      }
      out += `-----------------------------\n`;
    });

    // If there are outside records with no matching lesson, print them at the end (rare).
    if(unassigned.length){
      out += `\nחוץ ללא שיוך לשיעור:\n`;
      unassigned.forEach((o, j) => {
        const fullName = (o && o.fullName) ? o.fullName : '—';
        const tz = (o && o.tz) ? o.tz : '—';
        const oRange = _fmtRange(o);
        out += `${j+1}) שם: ${fullName}\n`;
        out += `   ת״ז: ${tz}\n`;
        out += `   חוץ התחלה: ${oRange.start}   סיום: ${oRange.end}\n`;
        out += `-----------------------------\n`;
      });
    }

    return out.trimEnd() + '\n';
  }

  async function shareLessonReport(dateKey){
    const text = buildLessonReportText(dateKey);
    const titleDate = _dateTitle(dateKey);
    const filename = `ניהול_שיעורים_${dateKey}.txt`;
    try{
      if (navigator.share) {
        const file = new File([text], filename, { type: 'text/plain;charset=utf-8' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: `ניהול שיעורים - ${titleDate}` });
          return true;
        }
        await navigator.share({ title: `ניהול שיעורים - ${titleDate}`, text });
        return true;
      }
    }catch(e){
      return false;
    }
    return false;
  }

  function downloadLessonReport(dateKey){
    const text = buildLessonReportText(dateKey);
    const filename = `ניהול_שיעורים_${dateKey}.txt`;
    try{
      const blob = new Blob([text], { type:'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(()=>URL.revokeObjectURL(url), 800);
      return true;
    }catch(e){
      return false;
    }
  }
  function _inferUnitsFromTimes(startMs, endMs){
    try{
      const s = Number(startMs)||0;
      const e = Number(endMs)||0;
      const sec = Math.max(0, Math.round((e - s)/1000));
      const raw = sec / LESSON_SEC;
      // round to 0.5 steps
      const u = Math.round(raw * 2) / 2;
      return (u >= MIN_LESSONS) ? u : 0;
    }catch(e){ return 0; }
  }

  function addLessonToDailyReport(tz, startMs, endMs, meta){
    const st = getStudent(tz) || {};
    const fullName = studentFullName(st || {}).trim() || (st.fullName || st.name || '-');
    const key = _dateKey(endMs || nowMs());
    const reports = loadLessonReports();
    if(!Array.isArray(reports[key])) reports[key] = [];

    let type = 'lesson';
    let units = null;
    if(meta && typeof meta === 'object') {
      if(meta.type) type = String(meta.type);
      if(meta.units != null && isFinite(Number(meta.units))) units = Number(meta.units);
    }

    // Auto inference (backward compatibility)
    if(units == null) {
      const inf = _inferUnitsFromTimes(startMs, endMs);
      units = (inf || 1);
    }

    const rec = {
      fullName,
      tz: String(tz||''),
      startMs: Number.isFinite(startMs) ? Number(startMs) : 0,
      endMs: Number.isFinite(endMs) ? Number(endMs) : nowMs(),
      type,
      units
    };

    // De-duplicate identical records (prevents double blocks in "ניהול שיעורים")
    const sMs = _getStartMs(rec);
    const eMs = _getEndMs(rec);
    const dupe = (reports[key] || []).find(x => {
      if(!x) return false;
      if(String(x.tz||'') !== String(rec.tz||'')) return false;
      if(String(x.type||'lesson') !== String(rec.type||'lesson')) return false;
      const xs = _getStartMs(x);
      const xe = _getEndMs(x);
      if(!xs || !xe || !sMs || !eMs) return false;
      return (Math.abs(xs - sMs) <= 1000) && (Math.abs(xe - eMs) <= 1000);
    });

    var addedNew = false;
    if(dupe){
      // Keep the existing row, but enrich if needed
      if(rec.fullName && !dupe.fullName) dupe.fullName = rec.fullName;
      if(rec.units != null && (dupe.units == null || Number(dupe.units) < Number(rec.units))) dupe.units = rec.units;
      if(rec.startMs && (!dupe.startMs && !dupe.startedAtMs)) dupe.startMs = rec.startMs;
      if(rec.endMs && (!dupe.endMs && !dupe.endedAtMs)) dupe.endMs = rec.endMs;
    } else {
      reports[key].push(rec);
      addedNew = true;
    }
    saveLessonReports(reports);

    // Connect lessons -> payments/credit (יתרה): every lesson reduces credit by ₪150 per 1.0 unit (0.5 => ₪75)
    try{
      if(addedNew){
        var uTz = String(tz||'').trim();
        var uUnits = Number(units);
        if(uTz && isFinite(uUnits) && uUnits > 0){
          var charge = -Math.round((150 * uUnits) * 100) / 100;
          var payObj = payLsGet(payKeyStudent(uTz), null);
          if(!payObj || typeof payObj !== "object") payObj = {};
          payEnsureLedger(payObj, uTz);
          payLedgerAdd(payObj, {
            ts: Number.isFinite(endMs) ? Number(endMs) : Date.now(),
            type: (String(type||'lesson') === 'outside') ? 'outside_lesson_charge' : 'lesson_charge',
            amount: charge,
            note: ((String(type||'lesson') === 'outside') ? 'שיעור חוץ' : 'שיעור') + ' (' + uUnits + ')',
            meta: { units: uUnits }
          });
          payLsSet(payKeyStudent(uTz), payObj);
          try{
            var dueNow = Number(payObj.due);
            if(isFinite(dueNow)) DBStorage.setItem(keyStudentCredit(uTz), String(dueNow));
          }catch(e2){}
        }
      }
    }catch(e){}
    try{ renderLessonMgmtFiles(); }catch(e){}
  }

  let _adminTab = 'home';
  let _adminProfileCardOpen = false;
try{ window.setAdminTab = setAdminTab; }catch(e){}

    function setAdminTab(tab){
  if(tab==='tests') tab='main';
    _adminTab = tab || 'home';

    // NOTE: lessonMgmtCard is inside homeSearchCard. Do NOT hide the parent card,
    // otherwise the whole screen becomes blank on "ניהול שיעורים".
    const homeCard = $('homeSearchCard');
    const queueWrap = $('queueWrap');
    const resultBox = $('resultBox');
    const mgmtCard = $('lessonMgmtCard');
    const testCard = $('testOrdersCard');
    const quickHit = $('quickHit');

    if(homeCard) homeCard.style.display = 'block';
    if(queueWrap) queueWrap.style.display = (_adminTab==='home') ? 'block' : 'none';
    if(resultBox) resultBox.style.display = (_adminTab==='home' && _adminProfileCardOpen) ? 'block' : 'none';
    if(quickHit) quickHit.style.display = (_adminTab==='home') ? 'block' : 'none';
    if(mgmtCard) mgmtCard.style.display = (_adminTab==='lessons' || _adminTab==='tests') ? 'block' : 'none';
    if(testCard) testCard.style.display = (_adminTab==='tests') ? 'block' : 'none';

    // When showing test orders (nested inside lessonMgmtCard), hide lesson-files hint/list.
    try{
      const lf = $('lessonFilesList');
      const lh = $('lessonMgmtHint');
      if(lf) lf.style.display = (_adminTab==='lessons') ? 'block' : 'none';
      if(lh) lh.style.display = (_adminTab==='lessons') ? 'block' : 'none';
    }catch(e){}


    const tHome = $('tabAdminHome');
    const tMgmt = $('tabAdminLessonsMgmt');
    const tTests = $('tabAdminTestOrders');
    if(tHome) tHome.classList.toggle('active', _adminTab==='home');
    if(tMgmt) tMgmt.classList.toggle('active', _adminTab==='lessons');
    if(tTests) tTests.classList.toggle('active', _adminTab==='tests');

        const tForum = $('tabAdminForum');
    if(tForum) tForum.classList.toggle('active', _adminTab==='forum');

if(_adminTab==='lessons'){
      renderLessonMgmtFiles();
    }
    if(_adminTab==='tests'){
      renderTestOrdersFiles();
    }
  }

  function renderLessonMgmtFiles(){
    const wrap = $('lessonFilesList');
    if(!wrap) return;
    const reports = loadLessonReports();
    const keys = Object.keys(reports||{}).filter(k => Array.isArray(reports[k]) && reports[k].length);
    keys.sort((a,b) => String(b).localeCompare(String(a)));
    if(!keys.length){
      wrap.innerHTML = '<div class="empty-row">אין קבצים להציג</div>';
      return;
    }
    const parts = [];
    for(const k of keys){
      const count = (reports[k]||[]).length;
      const titleDate = _dateTitle(k);
      parts.push(`
        <div class="lesson-file" data-date="${esc(k)}">
          <div class="meta">
            <div class="title">קובץ ${titleDate}</div>
            <div class="sub">${count} רשומות</div>
          </div>
          <div class="actions">
            <button class="btn small" data-act="open" type="button">פתח</button>
            <button class="btn small" data-act="share" type="button">Share</button>
            <button class="btn small" data-act="download" type="button">הורד</button>
          </div>
        </div>
      `);
    }
    wrap.innerHTML = parts.join('');
  }

  function buildTestOrdersHTML(dateKey){
    const obj = loadTestOrders();
    const arr = (obj && obj[dateKey] && Array.isArray(obj[dateKey])) ? obj[dateKey] : [];
    if(!arr.length) return '<div class="empty-row">אין הזמנות</div>';

    const parts = [];
    const sorted = arr.slice().sort((a,b) => Number(b.orderedAt||0) - Number(a.orderedAt||0));
    for(const r of sorted){
      const nm = (r.name || '—');
      const tz = (r.tz || '—');
      const price = (Number(r.price)||400);
      const t = (r.orderedTime && String(r.orderedTime).trim()) ? String(r.orderedTime).trim() : (function(){
        try{
          const d = new Date(Number(r.orderedAt||0));
          const hh = String(d.getHours()).padStart(2,'0');
          const mm = String(d.getMinutes()).padStart(2,'0');
          return `${hh}:${mm}`;
        }catch(e){ return ''; }
      })();
      parts.push(`
        <div class="lesson-file" style="padding:10px 12px;">
          <div class="meta">
            <div class="title">${esc(nm)} • ${esc(tz)}</div>
            <div class="sub">${t} • ${price}₪</div>
          </div>
        </div>
      `);
    }
    return parts.join('');
  }

  function buildTestOrdersText(dateKey){
    const obj = loadTestOrders();
    const arr = (obj && obj[dateKey] && Array.isArray(obj[dateKey])) ? obj[dateKey] : [];
    const lines = [];
    lines.push('הזמנות טסטים - ' + _dateTitle(dateKey));
    lines.push('--------------------------------');
    const sorted = arr.slice().sort((a,b)=>Number(a.orderedAt||0)-Number(b.orderedAt||0));
    for(const r of sorted){
      const nm = (r.name || '—');
      const tz = (r.tz || '—');
      const price = (Number(r.price)||400);
      const t = (function(){
        try{
          const d = new Date(Number(r.orderedAt||0));
          const hh = String(d.getHours()).padStart(2,'0');
          const mm = String(d.getMinutes()).padStart(2,'0');
          return `${hh}:${mm}`;
        }catch(e){ return ''; }
      })();
      lines.push(`${t} | ${tz} | ${nm} | ${price}₪`);
    }
    return lines.join('\n');
  }

try{ window.renderTestOrdersFiles = renderTestOrdersFiles; }catch(e){}

    function renderTestOrdersFiles(){
    const wrap = $('testOrdersList');
    if(!wrap) return;
    const orders = loadTestOrders();
    const keys = Object.keys(orders||{}).filter(k => Array.isArray(orders[k]) && orders[k].length);
    keys.sort((a,b) => String(b).localeCompare(String(a)));
    if(!keys.length){
      wrap.innerHTML = '<div class="empty-row">אין הזמנות להציג</div>';
      return;
    }
    const parts = [];
    for(const k of keys){
      const count = (orders[k]||[]).length;
      const titleDate = _dateTitle(k);
      parts.push(`
        <div class="lesson-file" data-date="${esc(k)}">
          <div class="meta">
            <div class="title">קובץ ${titleDate}</div>
            <div class="sub">${count} הזמנות</div>
          </div>
          <div class="actions">
            <button class="btn small" data-act="open" type="button">פתח</button>
            <button class="btn small" data-act="share" type="button">Share</button>
          </div>
        </div>
      `);
    }
    wrap.innerHTML = parts.join('');
  }

  const normalizeLessonsCount = (v) => {
    const n = Number(v);
    if (!Number.isFinite(n) || n <= 0) return 1;
    const snapped = Math.round(n * 2) / 2;
    return Math.max(MIN_LESSONS, snapped);
  };

  const STORAGE_KEY = 'admin_queue_v1';

  // ===== DOM =====
  const tzInput = $('adminSearchTz');
  const btnSearch = $('btnSearch');
  const btnLogout = $('btnLogout');
  const msgBox = $('msgBox');
  const queueBody = $('queueBody');

  const quickHit = $('quickHit');
  const resultBox = $('resultBox');
  const btnCloseProfile = $('btnCloseProfile');
  const btnAddToQueue = $('btnAddToQueue');
  const btnStatusTest = $('btnStatusTest');
  const btnStatusOut = $('btnStatusOut');
  const rFullName = $('rFullName');
  const rTz = $('rTz');
  const rPhone = $('rPhone');
  const rLessonsDone = $('rLessonsDone');
const rBalanceMoney = $('rBalanceMoney');
  const rTestDate = $('rTestDate');
  const rPayments = $('rPayments');
  const rUsername = $('rUsername');
  // Modals (resolved after DOMContentLoaded because modal markup is below the script)
  let timerModalTitle = null;
  let timerModal = null;
  let timerModalText = null;
  let timerYes = null;
  let timerNo = null;
  let timerReset = null;
  let timerFinish = null;

  // Lesson report modal
  let lessonReportModal = null;
  let lessonReportTitle = null;
  let lessonReportContent = null;
  let lessonReportClose = null;
  let lessonReportShare = null;
  let lessonReportDownload = null;

  let lessonsModal = null;
  let lessonsCount = null;
  let lessonsMinus = null;
  let lessonsPlus = null;
  let lessonsClose = null;
// ===== State =====
  let dbApi = null;
  let queue = [];
  let expandedTz = null;
  let activeTimerModalTz = null;
  let activeLessonsModalTz = null;
  let selectedSearchTz = null;
  let tickHandle = null;
  let bound = false;

  // ===== Messaging =====
  function showMsg(text, kind = 'ok') {
    if (!msgBox) return;
    msgBox.style.display = text ? 'block' : 'none';
    msgBox.textContent = text || '';
    msgBox.classList.toggle('error', kind === 'error');
    msgBox.classList.toggle('ok', kind !== 'error');
  }
  // ===== Profile card / search result =====
  
  // ===== Profile card / search result =====
  function _getRegistryObj(){
    try{
      var raw = DBStorage.getItem("students_registry_v1");
      if(!raw) return null;
      var reg = JSON.parse(raw);
      return (reg && typeof reg === "object") ? reg : null;
    }catch(e){ return null; }
  }

  function _registryEntryByTz(tz){
    tz = normalizeTz(tz);
    if(!tz) return null;
    var reg = _getRegistryObj();
    if(!reg) return null;

    // Prefer direct key lookup (registry is keyed by ת״ז in most flows)
    try{
      var direct = reg[tz];
      if(direct && typeof direct === "object") return direct;
    }catch(e){}

    // Fallback: scan values for matching tz/id fields
    try{
      for(var k in reg){
        if(!Object.prototype.hasOwnProperty.call(reg,k)) continue;
        var r = reg[k];
        if(!r || typeof r !== "object") continue;
        var cand = [
          r.tz, r.id, r.teudatZehut, r["תז"], r['ת"ז'], r['ת״ז'],
          r.username, r.user, r.uid
        ];
        for(var i=0;i<cand.length;i++){
          var c = cand[i];
          if(c==null) continue;
          var cs = String(c).replace(/\D/g,'').trim();
          if(cs && cs === tz) return r;
        }
        // key itself might be tz
        var ks = String(k).replace(/\D/g,'').trim();
        if(ks && ks === tz) return r;
      }
    }catch(e){}
    return null;
  }

  function _localProfileByTz(tz){
    tz = normalizeTz(tz);
    if(!tz) return null;
    try{
      var raw = DBStorage.getItem("student_profile_" + tz);
      if(!raw) return null;
      var obj = JSON.parse(raw);
      return (obj && typeof obj === "object") ? obj : null;
    }catch(e){ return null; }
  }

  function _fullNameFrom(obj){
    if(!obj || typeof obj !== "object") return "";
    var direct = readAny(obj, ["fullName","fullname","name","שם מלא","שם_מלא"]);
    if(direct != null && String(direct).trim()) return String(direct).trim();
    var first = readAny(obj, ["firstName","firstname","fname","first","שם פרטי","שם_פרטי","שם"]);
    var last  = readAny(obj, ["lastName","lastname","lname","last","שם משפחה","שם_משפחה"]);
    var nm = (String(first||"").trim() + " " + String(last||"").trim()).trim();
    return nm;
  }

  function _licenseFrom(obj){
    if(!obj || typeof obj !== "object") return "";
    var lic = readAny(obj, ["license","licenseType","license_type","type","סוג רישיון","סוג_רישיון"]);
    return (lic != null) ? String(lic).trim() : "";
  }

  function _phoneFrom(obj){
    if(!obj || typeof obj !== "object") return "";
    var ph = readAny(obj, [
      "phone","phoneNumber","phone_number","mobile","cell",
      "מספר פלאפון","מספרפלאפון","פלאפון","טלפון","טלפון נייד","נייד"
    ]);
    return (ph != null) ? String(ph).trim() : "";
  }

  function _lessonsDoneFromProfile(obj){
    if(!obj || typeof obj !== "object") return null;
    var v = readAny(obj, ["lessonsDone","lessons_done","completedLessonsCount","completed_lessons_count"]);
    if(v != null && v !== "" && isFinite(+v)) return +v;

    // Derive from logs if present
    try{
      var logs = obj.completedLessonsHistory || obj.completedLessonsLog || obj.lessonsDoneLog || obj.lessonsLog;
      if(Array.isArray(logs)){
        var sum = 0;
        for(var i=0;i<logs.length;i++){
          var it = logs[i];
          var u = (it && typeof it === "object") ? parseFloat(it.units) : NaN;
          sum += (isFinite(u) ? u : 1);
        }
        if(isFinite(sum) && sum > 0) return sum;
        return logs.length;
      }
    }catch(e){}
    return null;
  }

  function showQuickHit(tz, s) {
    if (!quickHit) return;
    const z = normalizeTz(tz);
    if(!z){ hideQuickHit(); return; }

    // Prefer real profile/registry; fallback to demo (students_db_v1.js)
    var prof = _localProfileByTz(z);
    var regE = _registryEntryByTz(z);
    var name = _fullNameFrom(prof) || _fullNameFrom(regE) || (s ? (studentFullName(s) || "") : "");
    var license = _licenseFrom(prof) || _licenseFrom(regE) || (s ? (studentLicenseType(s) || "") : "");

    quickHit.dataset.tz = z;
    quickHit.innerHTML = `<div class="qhName">${esc(name || 'תלמיד')}</div><div class="qhSub">סוג רישיון: ${esc(license || '—')}</div>`;
    quickHit.style.display = 'block';
  }

  function hideQuickHit() {
    if (!quickHit) return;
    quickHit.dataset.tz = '';
    quickHit.innerHTML = '';
    quickHit.style.display = 'none';
  }

function openProfileCard(tz) {
    const z = normalizeTz(tz);
    if (!z) return;

    // Try to resolve demo DB, but do NOT depend on it
    if (!dbApi) dbApi = resolveStudentsDb();
    let s = null;
    try{ s = dbApi ? getStudent(z) : null; }catch(e){ s = null; }

    // Prefer real saved profile/registry
    const prof = _localProfileByTz(z);
    const regE = _registryEntryByTz(z);

    if (!prof && !regE && !s) {
      showMsg('לא נמצא תלמיד עם הת״ז שהזנת.', 'error');
      hideQuickHit();
      closeProfileCard();
      return;
    }

    selectedSearchTz = z;

    const fullName = _fullNameFrom(prof) || _fullNameFrom(regE) || (s ? (studentFullName(s) || '') : '');
    if (rFullName) rFullName.textContent = fullName || '—';
    if (rTz) rTz.textContent = z || '—';

    const phone = _phoneFrom(prof) || _phoneFrom(regE) || (s ? String(readAny(s, ['phone','phoneNumber','phone_number','mobile','cell','מספר פלאפון','מספרפלאפון','פלאפון','טלפון','טלפון נייד','נייד']) ?? '') : '');
    if (rPhone) rPhone.textContent = phone || '—';

    const done = (_lessonsDoneFromProfile(prof) ?? _lessonsDoneFromProfile(regE) ?? (s ? (studentLessonsDone(s) ?? null) : null));
    if (rLessonsDone) rLessonsDone.textContent = (done != null && done !== '' ? String(done) : '—');

    // Lessons left (remaining lessons) – prefer saved profile/registry, fallback to payments-derived calc

    try{
      var cm2 = 0;
      var rawcm2 = DBStorage.getItem(keyStudentCredit(z));
      var ncm2 = parseFloat(rawcm2);
      if(isFinite(ncm2)) cm2 = ncm2;
      if (rBalanceMoney) rBalanceMoney.textContent = fmtMoney(cm2);
    }catch(e){ if (rBalanceMoney) rBalanceMoney.textContent = fmtMoney(0); }

    const testDate =
      (prof ? (readAny(prof, ['testDate','תאריך טסט','תאריך_טסט']) ?? null) : null) ||
      (regE ? (readAny(regE, ['testDate','תאריך טסט','תאריך_טסט']) ?? null) : null) ||
      (s ? (readAny(s, ['testDate','תאריך טסט','תאריך_טסט']) ?? null) : null);
    if (rTestDate) rTestDate.textContent = (testDate != null && String(testDate).trim() ? String(testDate) : '—');

    if (rPayments){
      // Prefer locally saved payments (from pay modal)
      var localPay = null;
      try{
        var rawPay = DBStorage.getItem("student_payments_" + z);
        if(rawPay) localPay = JSON.parse(rawPay);
      }catch(e){ localPay = null; }

      if(localPay && typeof localPay === "object"){
        var paid = (localPay.paid != null) ? localPay.paid :
                   (localPay.totalPaid != null) ? localPay.totalPaid :
                   (localPay.total != null) ? localPay.total : null;
        var last = (localPay.last != null) ? localPay.last :
                   (localPay.lastPayment != null) ? localPay.lastPayment : null;
        var lp = (localPay.lessonsPurchased != null) ? localPay.lessonsPurchased :
                 (localPay.addedLessons != null) ? localPay.addedLessons : null;

        var txt = "";
        if(paid != null && paid !== "" && isFinite(+paid)) txt += (Math.round(+paid)).toLocaleString('he-IL') + "₪";
        else if(paid != null && paid !== "") txt += String(paid);

        if(last) txt += (txt ? " · " : "") + String(last);
        if(lp && isFinite(+lp) && (+lp)>0) txt += (txt ? " · " : "") + ("+ " + (+lp) + " שיעורים");

        rPayments.textContent = txt || "—";
      }else{
        // Fallback to profile/registry/demo
        var payVal =
          (prof ? (readAny(prof, ['paid','payment','שולם','תשלום']) ?? null) : null) ||
          (regE ? (readAny(regE, ['paid','payment','שולם','תשלום']) ?? null) : null) ||
          (s ? (readAny(s, ['paid','payment','שולם','תשלום']) ?? null) : null);
        rPayments.textContent = (payVal != null && String(payVal).trim() ? String(payVal) : '—');
      }
    }

    var un =
      (prof ? (readAny(prof, ['username','user','שם משתמש']) ?? null) : null) ||
      (regE ? (readAny(regE, ['username','user','שם משתמש']) ?? null) : null) ||
      (s ? (readAny(s, ['username','user','שם משתמש']) ?? null) : null);
    if (rUsername) rUsername.textContent = (un != null && String(un).trim() ? String(un) : '—');

    _adminProfileCardOpen = true;
    if (resultBox) resultBox.style.display = 'block';
  }

  function closeProfileCard() {
    selectedSearchTz = null;
    _adminProfileCardOpen = false;
    if (resultBox) resultBox.style.display = 'none';
  }

  function performSearch() {
    const tz = normalizeTz(tzInput?.value);
    if (!tz) {
      showMsg('הזן ת״ז תלמיד.', 'error');
      hideQuickHit();
      closeProfileCard();
      return;
    }

    // Demo DB is optional here
    if (!dbApi) dbApi = resolveStudentsDb();

    const prof = _localProfileByTz(tz);
    const regE = _registryEntryByTz(tz);

    let s = null;
    try{ s = dbApi ? getStudent(tz) : null; }catch(e){ s = null; }

    if (!prof && !regE && !s) {
      showMsg('לא נמצא תלמיד עם הת״ז שהזנת.', 'error');
      hideQuickHit();
      closeProfileCard();
      return;
    }

    showMsg('', 'ok');
    closeProfileCard();
    showQuickHit(tz, s);
  }

function onSearchTyping() {
  const tz = normalizeTz(tzInput?.value);
  if (!tz) { hideQuickHit(); return; }

  // Demo DB is optional here
  if (!dbApi) dbApi = resolveStudentsDb();

  const prof = _localProfileByTz(tz);
  const regE = _registryEntryByTz(tz);

  let s = null;
  try{ s = dbApi ? getStudent(tz) : null; }catch(e){ s = null; }

  if (!prof && !regE && !s) { hideQuickHit(); return; }

  showQuickHit(tz, s);
}

  function ensureInQueue(tz) {
    const z = normalizeTz(tz);
    if (!z) return null;
    let it = queue.find((x) => x.tz === z);
    if (!it) {
      addStudentToQueue(z);
      it = queue.find((x) => x.tz === z) || null;
    }
    return it;
  }

  function setStatusAndStart(tz, status) {
    const it = ensureInQueue(tz);
    if (!it) return;

    // If we were previously marked as "בחוץ" and now return, close & log the outside segment
    try{
      const now = nowMs();
      const prevWasOut = String(it.status || '') === 'בחוץ';
      const nextIsOut = String(status || '') === 'בחוץ';

      // Cleanup old v16 field if exists
      try{ if (it.outTimer) delete it.outTimer; }catch(e){}

      if (prevWasOut && !nextIsOut) {
        if (it.outsideSeg && it.outsideSeg.active) {
          it.outsideSeg.active = false;
          it.outsideSeg.endedAtMs = now;
        }
        if (it.outsideSeg && it.outsideSeg.startedAtMs && it.outsideSeg.endedAtMs && !it.outsideSeg.logged) {
          try { addOutsideTrainingToStudent(it.tz, it.outsideSeg.startedAtMs, it.outsideSeg.endedAtMs); } catch (e) {}
          it.outsideSeg.logged = true;
        }
      }

      // Update status
      it.status = status;

      // Mark "בחוץ" within the current 40-minute lesson (NO separate timer)
      if (nextIsOut) {
        it.didOutside = true;
        if (!it.outsideSeg || typeof it.outsideSeg !== 'object') it.outsideSeg = {};
        if (!it.outsideSeg.active) {
          it.outsideSeg.active = true;
          it.outsideSeg.startedAtMs = now;
          it.outsideSeg.endedAtMs = 0;
          it.outsideSeg.logged = false;
        }
      }
    }catch(e){
      it.status = status;
    }

    saveQueue();
    try{ renderQueue(); }catch(e){}

    // Start the 40-minute timer ONLY if not already running
    try{
      if (!it.timer || !it.timer.running) startTimer(it.tz);
    }catch(e){
      startTimer(it.tz);
    }
  }


  // ===== Outside return confirm (v20) =====
  let __pendingOutsideReturnTz = null;

  function openOutsideReturnConfirm(tz){
    try{
      tz = normalizeTz(tz);
      if(!tz) return;
      __pendingOutsideReturnTz = tz;

      var sub = document.getElementById('outsideReturnConfirmSub');
      if(sub){
        sub.textContent = '';
        try{
          var it = (Array.isArray(queue) ? queue.find(x => String(x.tz) === String(tz)) : null);
          var s = (typeof getStudent === 'function') ? (getStudent(tz) || {}) : {};
          var nm = '';
          try{ nm = studentFullName(s) || ''; }catch(e){ nm = ''; }
          var parts = [];
          if(nm) parts.push('תלמיד: ' + nm);
          if(it && it.outsideSeg && it.outsideSeg.startedAtMs){
            try{
              var d = new Date(Number(it.outsideSeg.startedAtMs));
              var st = '';
              try{ st = d.toLocaleTimeString('he-IL', {hour:'2-digit', minute:'2-digit'}); }catch(e){ st = String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0'); }
              parts.push('התחלה: ' + st);
            }catch(e){}
          }
          if(parts.length) sub.textContent = parts.join(' • ');
        }catch(e){}
      }

      var ov = document.getElementById('outsideReturnConfirmOverlay');
      if(!ov) return;
      ov.classList.remove('hidden');
      ov.setAttribute('aria-hidden','false');
    }catch(e){}
  }
  window.openOutsideReturnConfirm = openOutsideReturnConfirm;

  function outsideReturnCancel(){
    try{
      var ov = document.getElementById('outsideReturnConfirmOverlay');
      if(ov){
        ov.classList.add('hidden');
        ov.setAttribute('aria-hidden','true');
      }
    }catch(e){}
    __pendingOutsideReturnTz = null;
  }
  window.outsideReturnCancel = outsideReturnCancel;

  function outsideReturnConfirm(){
    try{
      var tz = __pendingOutsideReturnTz;
      if(!tz) return outsideReturnCancel();

      // remove "בחוץ" status => closes outside segment and logs end time
      try{ setStatusAndStart(tz, ''); }catch(e){}

      outsideReturnCancel();
    }catch(e){
      outsideReturnCancel();
    }
  }
  window.outsideReturnConfirm = outsideReturnConfirm;

  // ===== Students DB resolution =====
  function normalizeTz(v) {
    return String(v ?? '').replace(/\D/g, '');
  }

  function readAny(obj, keys) {
    if (!obj || typeof obj !== 'object') return undefined;
    for (const k of keys) {
      if (k in obj && obj[k] != null && obj[k] !== '') return obj[k];
      const alt = k.replace(/[.\s]/g, '').replace(/׳/g, '');
      if (alt in obj && obj[alt] != null && obj[alt] !== '') return obj[alt];
    }
    return undefined;
  }

  function makeArrayDb(arr) {
    const list = Array.isArray(arr) ? arr : [];
    return {
      getStudents: () => list,
      findStudentByTz: (tz) => {
        const z = normalizeTz(tz);
        if (!z) return null;
        return list.find((s) => normalizeTz(readAny(s, ['tz','teudatZeut','id','idNumber','studentId','תז','ת.ז'])) === z) || null;
      }
    };
  }

  function tryParseJson(val) {
    try { return JSON.parse(val); } catch { return null; }
  }

  function resolveLocalProfilesArray() {
    const out = [];
    const seen = new Set();

    const addOne = (tz, obj) => {
      const z = normalizeTz(tz || readAny(obj, ['tz','teudatZeut','id','idNumber','studentId','תז','ת.ז']));
      if (!z || seen.has(z)) return;
      const rec = Object.assign({}, (obj && typeof obj === 'object') ? obj : {});
      rec.tz = z;

      // Merge progress if exists
      try{
        const rawProg = DBStorage.getItem("student_progress_" + z);
        const prog = rawProg ? tryParseJson(rawProg) : null;
        if (prog && typeof prog === "object") {
          if (rec.lessonsDone == null && prog.lessonsDone != null) rec.lessonsDone = prog.lessonsDone;
          if (rec.lessonsLeft == null && prog.lessonsLeft != null) rec.lessonsLeft = prog.lessonsLeft;
          if (rec.testDate == null && prog.testDate != null) rec.testDate = prog.testDate;
        }
      }catch(e){}

      // Merge payments if exists (for admin card/table)
      try{
        const rawPay = DBStorage.getItem("student_payments_" + z);
        const pay = rawPay ? tryParseJson(rawPay) : null;
        if (pay && typeof pay === "object") {
          if (rec.paid == null && pay.paid != null) rec.paid = pay.paid;
          if (rec.payment == null && pay.paid != null) rec.payment = pay.paid;
          if (rec.lessonsPurchased == null && pay.lessonsPurchased != null) rec.lessonsPurchased = pay.lessonsPurchased;
          if (rec.paymentsPaid == null && pay.paid != null) rec.paymentsPaid = pay.paid;
          if (rec.paymentsLessonsPurchased == null && pay.lessonsPurchased != null) rec.paymentsLessonsPurchased = pay.lessonsPurchased;
        }
      }catch(e){}

      out.push(rec);
      seen.add(z);
    };

    // Preferred: registry map written by the Signup page
    try{
      const regRaw = DBStorage.getItem("students_registry_v1");
      const reg = regRaw ? tryParseJson(regRaw) : null;
      if (reg) {
        if (Array.isArray(reg)) {
          for (const it of reg) addOne(null, it);
        } else if (typeof reg === "object") {
          for (const k of Object.keys(reg)) addOne(k, reg[k]);
        }
      }
    }catch(e){}

    // Fallback: scan keys student_profile_<tz>
    try{
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k) continue;
        if (!k.startsWith("student_profile_")) continue;
        const tz = k.slice("student_profile_".length);
        const raw = DBStorage.getItem(k);
        const prof = raw ? tryParseJson(raw) : null;
        if (prof && typeof prof === "object") addOne(tz, prof);
        else addOne(tz, { tz: tz });
      }
    }catch(e){}

    return out;
  }

  function resolveDbFromLocalStorage() {
    // First: locally registered students (signup)
    const profArr = resolveLocalProfilesArray();
    if (profArr && profArr.length) return makeArrayDb(profArr);

    // Second: try any other student DB-like blobs
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;
      if (!/student|תלמיד|students|תלמידים/i.test(k)) continue;
      if (k.startsWith("student_profile_")) continue;
      if (k === "students_registry_v1") continue;

      const v = DBStorage.getItem(k);
      if (!v || v.length < 2) continue;
      const data = tryParseJson(v);
      if (!data) continue;

      if (Array.isArray(data)) return makeArrayDb(data);
      if (Array.isArray(data.students)) return makeArrayDb(data.students);
      if (Array.isArray(data.list)) return makeArrayDb(data.list);

      // Object-map fallback (keyed by tz)
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        const arr = [];
        for (const kk of Object.keys(data)) {
          const vv = data[kk];
          if (!vv || typeof vv !== 'object') continue;
          const obj = Object.assign({}, vv);
          const tzVal = readAny(obj, ['tz','teudatZeut','id','idNumber','studentId','תז','ת.ז']);
          if ((tzVal == null || tzVal === '') && kk) obj.tz = kk;
          arr.push(obj);
        }
        if (arr.length) return makeArrayDb(arr);
      }
    }

    return null;
  }

  function mapToArrayDb(mapObj) {
    if (!mapObj || typeof mapObj !== 'object' || Array.isArray(mapObj)) return null;
    const arr = [];
    for (const k of Object.keys(mapObj)) {
      const v = mapObj[k];
      if (!v || typeof v !== 'object') continue;
      const obj = Object.assign({}, v);
      const tzVal = readAny(obj, ['tz','teudatZeut','id','idNumber','studentId','תז','ת.ז']);
      if ((tzVal == null || tzVal === '') && k) obj.tz = k;
      arr.push(obj);
    }
    if (!arr.length) return null;
    return makeArrayDb(arr);
  }

  function mergeStudentArrays(primaryArr, extraArr){
    const outMap = new Map();
    const tzKeys = ['tz','teudatZeut','id','idNumber','studentId','תז','ת.ז'];

    const putPrimary = (s) => {
      if(!s || typeof s !== 'object') return;
      const tz = normalizeTz(readAny(s, tzKeys));
      if(!tz) return;
      const rec = Object.assign({}, s);
      rec.tz = tz;
      outMap.set(tz, rec);
    };

    const mergeExtra = (s) => {
      if(!s || typeof s !== 'object') return;
      const tz = normalizeTz(readAny(s, tzKeys) || s.tz);
      if(!tz) return;
      const rec = Object.assign({}, s);
      rec.tz = tz;

      if(!outMap.has(tz)){
        outMap.set(tz, rec);
        return;
      }
      const cur = outMap.get(tz) || {};
      for(const k of Object.keys(rec)){
        const v = rec[k];
        if(v == null) continue;
        if(cur[k] == null || cur[k] === '') cur[k] = v;
      }
      outMap.set(tz, cur);
    };

    (Array.isArray(primaryArr) ? primaryArr : []).forEach(putPrimary);
    (Array.isArray(extraArr) ? extraArr : []).forEach(mergeExtra);
    return Array.from(outMap.values());
  }

  function resolveStudentsDb() {
    let base = null;

    // Preferred API
    if (window.StudentsDB && typeof window.StudentsDB.getStudents === 'function') base = window.StudentsDB;

    try {
      // Global lexical (if students_db_v1.js used `const StudentsDB = ...`)
      if (!base && typeof StudentsDB !== 'undefined' && StudentsDB && typeof StudentsDB.getStudents === 'function') base = StudentsDB;
    } catch {}

    // Map/object formats (common in demo students_db_v1.js)
    if (!base) {
      try {
        if (typeof STUDENTS_DB !== 'undefined') {
          const mapDb = mapToArrayDb(STUDENTS_DB);
          if (mapDb) base = mapDb;
        }
      } catch {}
      try {
        if (!base && typeof StudentsDB !== 'undefined' && StudentsDB && typeof StudentsDB.getStudents !== 'function') {
          const mapDb = mapToArrayDb(StudentsDB);
          if (mapDb) base = mapDb;
        }
      } catch {}
      if (!base) {
        const winMaps = [window.STUDENTS_DB, window.studentsDB, window.studentsDb, window.demoStudents];
        for (const cand of winMaps) {
          const mapDb = mapToArrayDb(cand);
          if (mapDb) { base = mapDb; break; }
        }
      }
    }

    // Global lexical arrays (if students_db_v1.js used `const students_db = [...]`)
    if (!base) {
      try { if (typeof students_db !== 'undefined' && Array.isArray(students_db)) base = makeArrayDb(students_db); } catch {}
      try { if (!base && typeof studentsDb !== 'undefined' && Array.isArray(studentsDb)) base = makeArrayDb(studentsDb); } catch {}
      try { if (!base && typeof students !== 'undefined' && Array.isArray(students)) base = makeArrayDb(students); } catch {}
    }

    // Window properties
    if (!base) {
      if (Array.isArray(window.students_db)) base = makeArrayDb(window.students_db);
      else if (Array.isArray(window.studentsDb)) base = makeArrayDb(window.studentsDb);
      else if (Array.isArray(window.students)) base = makeArrayDb(window.students);
    }

    // Heuristic scan for arrays on window
    if (!base) {
      for (const key of Object.keys(window)) {
        const v = window[key];
        if (!Array.isArray(v) || v.length < 1) continue;
        const o = v[0];
        if (!o || typeof o !== 'object') continue;
        const hasName = readAny(o, ['firstName','lastName','name','fullName','שם','שם_מלא']) != null;
        const hasTz = readAny(o, ['tz','teudatZeut','id','idNumber','תז','ת.ז']) != null;
        if (hasName && hasTz) { base = makeArrayDb(v); break; }
      }
    }

    if (!base) base = resolveDbFromLocalStorage();

    // Prefer locally registered students (Signup / student_profile_ / students_registry_v1).
    // If they exist, we ignore the demo DB to avoid showing דמו תלמידים.
    try{
      const localArr = resolveLocalProfilesArray();
      if (localArr && localArr.length) {
        return makeArrayDb(localArr);
      }
    }catch(e){}

    return base;
  }

function getStudent(tz) {
    const z = normalizeTz(tz);
    if (!z) return null;

    // 1) Base record from resolved DB (if exists)
    let baseRec = null;
    try{
      if (dbApi) {
        if (typeof dbApi.findStudentByTz === 'function') baseRec = dbApi.findStudentByTz(z);
        else if (typeof dbApi.getStudents === 'function') {
          baseRec = (dbApi.getStudents() || []).find((s) => normalizeTz(readAny(s, ['tz','teudatZeut','id','idNumber','studentId','תז','ת.ז'])) === z) || null;
        }
      }
    }catch(e){ baseRec = null; }

    // 2) Registry record (Signup)
    let regRec = null;
    try{
      const regRaw = DBStorage.getItem("students_registry_v1");
      const reg = regRaw ? tryParseJson(regRaw) : null;
      if (reg) {
        if (Array.isArray(reg)) {
          regRec = reg.find((r) => normalizeTz(readAny(r, ['tz','teudatZeut','id','idNumber','studentId','תז','ת.ז'])) === z) || null;
        } else if (typeof reg === "object") {
          if (reg[z]) regRec = reg[z];
          else {
            for (const k of Object.keys(reg)) {
              if (normalizeTz(k) === z) { regRec = reg[k]; break; }
              const r = reg[k];
              if (r && typeof r === "object" && normalizeTz(readAny(r, ['tz','teudatZeut','id','idNumber','studentId','תז','ת.ז'])) === z) { regRec = r; break; }
            }
          }
        }
      }
    }catch(e){ regRec = null; }

    // 3) Authoritative student profile (what the student sees)
    let prof = null;
    try{
      const raw = DBStorage.getItem("student_profile_" + z);
      prof = raw ? tryParseJson(raw) : null;
    }catch(e){ prof = null; }

    // If profile is stored under a non-TZ key (old bug), try to locate by embedded tz and migrate
    if (!prof) {
      try{
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (!k || !k.startsWith("student_profile_")) continue;
          const raw2 = DBStorage.getItem(k);
          if (!raw2) continue;
          const o = tryParseJson(raw2);
          if (!o || typeof o !== "object") continue;
          const otz = normalizeTz(readAny(o, ['tz','teudatZeut','id','idNumber','studentId','תז','ת.ז']));
          if (otz === z) {
            prof = o;
            try{ DBStorage.setItem("student_profile_" + z, JSON.stringify(o)); }catch(e){}
            break;
          }
        }
      }catch(e){}
    }

    // Merge progress/payments helpers (used by admin UI)
    let prog = null, pay = null;
    try{
      const rawProg = DBStorage.getItem("student_progress_" + z);
      prog = rawProg ? tryParseJson(rawProg) : null;
    }catch(e){ prog = null; }
    try{
      const rawPay = DBStorage.getItem("student_payments_" + z);
      pay = rawPay ? tryParseJson(rawPay) : null;
    }catch(e){ pay = null; }

    const out = Object.assign({}, (baseRec && typeof baseRec === "object") ? baseRec : {}, (regRec && typeof regRec === "object") ? regRec : {}, (prof && typeof prof === "object") ? prof : {});
    out.tz = z;

    if (prog && typeof prog === "object") {
      if (out.lessonsDone == null && prog.lessonsDone != null) out.lessonsDone = prog.lessonsDone;
      if (out.lessonsLeft == null && prog.lessonsLeft != null) out.lessonsLeft = prog.lessonsLeft;
      if (out.testDate == null && prog.testDate != null) out.testDate = prog.testDate;
    }
    if (pay && typeof pay === "object") {
      if (out.paid == null && pay.paid != null) out.paid = pay.paid;
      if (out.payment == null && pay.paid != null) out.payment = pay.paid;
      if (out.lessonsPurchased == null && pay.lessonsPurchased != null) out.lessonsPurchased = pay.lessonsPurchased;
      if (out.paymentsPaid == null && pay.paid != null) out.paymentsPaid = pay.paid;
      if (out.paymentsLessonsPurchased == null && pay.lessonsPurchased != null) out.paymentsLessonsPurchased = pay.lessonsPurchased;
      if (out.lastPayment == null && pay.lastPayment != null) out.lastPayment = pay.lastPayment;
    }

    return out;
  }

  function studentFullName(s) {
    const first = readAny(s, ['firstName','firstname','fname','שם פרטי','שם_פרטי','שם']);
    const last = readAny(s, ['lastName','lastname','lname','שם משפחה','שם_משפחה']);
    const full = readAny(s, ['fullName','fullname','שם מלא','שם_מלא']);
    if (full) return String(full);
    const f = String(first ?? '').trim();
    const l = String(last ?? '').trim();
    return (f || l) ? `${f} ${l}`.trim() : '—';
  }

  function studentLicenseType(s) {
    const v = readAny(s, ['licenseType','license','license_kind','licenseKind','סוג רישיון','סוג_רישיון']);
    return v ? String(v) : '—';
  }

  function studentLessonsDone(s) {
    const v = readAny(s, ['lessonsDone','lessons_done','completedLessons','lessonsCompleted','שיעורים שבוצעו','שיעורים_שבוצעו']);
    if (v == null || v === '') return '—';
    return String(v);
  }

  // ===== Queue persistence =====
  function loadQueue() {
    const raw = DBStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const data = tryParseJson(raw);
    if (!Array.isArray(data)) return [];
    return data.map((it) => {
      const lessonsToday = normalizeLessonsCount(it.lessonsToday || 1);
      const totalSec = Math.max(MIN_TOTAL_SEC, lessonsToday * LESSON_SEC);
      const remainingSec = Number.isFinite(it?.timer?.remainingSec) ? Math.max(0, Number(it.timer.remainingSec)) : totalSec;
      const started = !!it?.timer?.started;
      const running = !!it?.timer?.running;
      return {
        tz: normalizeTz(it.tz),
        lessonsToday,
        notes: String(it.notes ?? ''),
        status: String(it.status ?? '—'),
        timer: {
          totalSec,
          remainingSec,
          started,
          running: running && started && remainingSec > 0,
          lastTickMs: nowMs(),
          alerted: !!it?.timer?.alerted,
          startedAtMs: Number.isFinite(it?.timer?.startedAtMs) ? Number(it.timer.startedAtMs) : 0
        }
      };
    });
  }

  function saveQueue() {
    const data = queue.map((it) => ({
      tz: it.tz,
      lessonsToday: it.lessonsToday,
      notes: it.notes,
      status: it.status,
      timer: {
        totalSec: it.timer.totalSec,
        remainingSec: it.timer.remainingSec,
        started: it.timer.started,
        running: it.timer.running,
        alerted: it.timer.alerted,
        startedAtMs: it.timer.startedAtMs || 0
      }
    }));
    DBStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  // ===== Timer utilities =====
  function formatMMSS(sec) {
    const s = Math.max(0, Math.floor(sec));
    const mm = Math.floor(s / 60);
    const ss = s % 60;
    return `${String(mm).padStart(2,'0')}:${String(ss).padStart(2,'0')}`;
  }

  function startTimer(tz) {
    const it = queue.find((x) => x.tz === tz);
    if (!it) return;

    const now = nowMs();
    const totalSec = Number(it?.timer?.totalSec) || 0;

    // Ensure remainingSec and startedAtMs are consistent (fix: timers stuck on 40:00 after reload)
    let rem = Number(it?.timer?.remainingSec);
    if (!Number.isFinite(rem) || rem <= 0) rem = totalSec;
    rem = Math.max(0, Math.min(totalSec, rem));
    it.timer.remainingSec = rem;

    // startedAtMs is derived so that (totalSec - elapsed) == remainingSec
    it.timer.startedAtMs = now - Math.round((totalSec - rem) * 1000);

    it.timer.started = true;
    it.timer.running = true;
    it.timer.alerted = false;
    it.timer.lastTickMs = now;

    saveQueue();
    renderQueue();
  }

  function pauseTimer(tz) {
    const it = queue.find((x) => x.tz === tz);
    if (!it) return;
    it.timer.running = false;
    it.timer.lastTickMs = nowMs();
    saveQueue();
    renderQueue();
  }

  function resumeTimer(tz) {
    const it = queue.find((x) => x.tz === tz);
    if (!it) return;
    if (!it.timer.started) return startTimer(tz);

    const totalSec = Number(it?.timer?.totalSec) || 0;
    let rem = Number(it?.timer?.remainingSec);
    if (!Number.isFinite(rem) || rem <= 0) return;

    rem = Math.max(0, Math.min(totalSec, rem));
    const now = nowMs();

    // Re-derive startedAtMs so tickTimers will decrement from current remainingSec
    it.timer.startedAtMs = now - Math.round((totalSec - rem) * 1000);

    it.timer.running = true;
    it.timer.lastTickMs = now;
    saveQueue();
    renderQueue();
  }

  function resetTimer(tz) {
    const it = queue.find((x) => x.tz === tz);
    if (!it) return;

    // If lesson ended early (>= 20 דקות) count it as 0.5/1/etc before resetting
    try{
      if(it.timer && it.timer.started && !it.timer.alerted){
        const total = Number(it.timer.totalSec || 0);
        const remaining = Number(it.timer.remainingSec || 0);
        const elapsed = total - remaining;
        if(Number.isFinite(elapsed) && elapsed >= (LESSON_SEC/2) && remaining > 0){
          addCompletedLessonToStudent(tz, elapsed);
        }
      }
    }catch(e){}

    it.timer.running = false;
    it.timer.started = false;
    it.timer.alerted = false;
    it.timer.startedAtMs = 0;
    it.timer.remainingSec = it.timer.totalSec;
    it.timer.lastTickMs = nowMs();
    saveQueue();
    renderQueue();
  }

  
  // ===== Completed lessons logging (v1) =====
  function addCompletedLessonToStudent(tz, durationSec){
    try{
      tz = normalizeTz(tz);
      if(!tz) return;

      var now = new Date();
      var iso = now.toISOString();
      var dateStr = "";
      var timeStr = "";
      try{ dateStr = now.toLocaleDateString('he-IL'); }catch(e){ dateStr = (now.getDate()+"/"+(now.getMonth()+1)+"/"+now.getFullYear()); }
      try{ timeStr = now.toLocaleTimeString('he-IL', {hour:'2-digit', minute:'2-digit'}); }catch(e){ timeStr = (String(now.getHours()).padStart(2,'0')+":"+String(now.getMinutes()).padStart(2,'0')); }

      var prof = null;
      try{ if(typeof getStudentProfile === 'function') prof = getStudentProfile(tz); }catch(e){ prof = null; }
      if(!prof || typeof prof !== 'object'){
        var s = getStudent(tz) || {};
        prof = {
          tz: String(tz),
          id: String(tz),
          firstName: readAny(s, ['firstName','firstname','fname','שם פרטי','שם_פרטי','שם']) || '',
          lastName:  readAny(s, ['lastName','lastname','lname','שם משפחה','שם_משפחה']) || '',
          license:   studentLicenseType(s) || ''
        };
        try{ prof.lessonsDone = studentLessonsDone(s) || 0; }catch(e){ prof.lessonsDone = 0; }
        try{ prof.lessonsLeft = readAny(s, ['lessonsLeft','lessonsRemaining','remainingLessons','lessons_left','שיעוריםשנשארו']) || ""; }catch(e){}
      }

      if(!Array.isArray(prof.completedLessonsLog)) prof.completedLessonsLog = [];

      // Convert duration into "lesson units" (1 = 40 דקות, 0.5 = 20 דקות)
      var LESSON_SEC_LOCAL = 2400;
      var dur = Number(durationSec);
      if(!isFinite(dur) || dur <= 0) dur = LESSON_SEC_LOCAL;

      var unitsRaw = dur / LESSON_SEC_LOCAL;
      var units = Math.round(unitsRaw * 2) / 2;

      // Ignore very short sessions (< 20 דקות)
      if(units < 0.5) units = 0;

      if(units > 0){
        var full = Math.floor(units);
        var half = (units - full) >= 0.5 ? 0.5 : 0;

        for(var iL=0;iL<full;iL++){
          prof.completedLessonsLog.push({
            ts: iso,
            date: dateStr,
            time: timeStr,
            durationMin: 40,
            units: 1
          });
        }
        if(half === 0.5){
          prof.completedLessonsLog.push({
            ts: iso,
            date: dateStr,
            time: timeStr,
            durationMin: 20,
            units: 0.5
          });
        }

        var ld = parseFloat(prof.lessonsDone);
        if(!isFinite(ld)) ld = 0;
        prof.lessonsDone = Math.round((ld + units) * 2) / 2;

        var ll = parseFloat(prof.lessonsLeft);
        if(isFinite(ll)){
          var newLeft = ll - units;
          if(newLeft < 0) newLeft = 0;
          prof.lessonsLeft = Math.round(newLeft * 2) / 2;
        }

        // Payments: reduce due by 150₪ per full lesson (0.5 => 75₪)
        try{
          var payKey = "student_payments_" + String(tz);
          var payRaw = DBStorage.getItem(payKey);
          if(payRaw){
            var payObj = JSON.parse(payRaw);
            if(payObj && typeof payObj === "object"){
              // Ledger-based debit for lesson units (150₪ per 1.0, 75₪ per 0.5)
              payObj = payEnsureLedger(payObj, String(tz));
              var curDue = payLedgerSum(payObj);
              var debit = Math.round((150 * units) * 100) / 100;
              if(!isFinite(curDue) || curDue < 0) curDue = 0;
              if(!isFinite(debit) || debit < 0) debit = 0;
              if(debit > curDue) debit = curDue;
              if(debit > 0){
                payLedgerAdd(payObj, { ts: Date.now(), type: "lesson", amount: -debit, note: "שיעור", meta: { units: units } });
              }else{
                payObj.due = curDue;
              }
try{ DBStorage.setItem(payKey, JSON.stringify(payObj)); }catch(e2){}
              // Keep credit key (₪) in sync with ledger-derived due
              try{
                var dueNow = Number(payObj.due||0);
                if(!isFinite(dueNow) || dueNow < 0) dueNow = 0;
                DBStorage.setItem(keyStudentCredit(tz), String(dueNow));
              }catch(e3){}
            }
          }
        }catch(e){}
      }

      try{ if(typeof setStudentProfile === 'function') setStudentProfile(tz, prof); }catch(e){
        try{ DBStorage.setItem("student_profile_" + String(tz), JSON.stringify(prof||{})); }catch(_){}
      }


      // Mirror into per-student progress store too (used by some UI parts)
      try{
        var pKey = "student_progress_" + String(tz);
        var pRaw = DBStorage.getItem(pKey);
        var pObj = pRaw ? JSON.parse(pRaw) : {};
        if(!pObj || typeof pObj !== "object") pObj = {};
        pObj.lessonsDone = prof.lessonsDone;
        pObj.lessonsLeft = prof.lessonsLeft;
        if(!Array.isArray(pObj.completedLessonsLog)) pObj.completedLessonsLog = [];
        try{
          var _entry = (prof.completedLessonsLog && prof.completedLessonsLog.length) ? prof.completedLessonsLog[prof.completedLessonsLog.length-1] : null;
          if(_entry){
            var _ts = _entry.ts || "";
            var exists = false;
            if(_ts){
              for(var _i=0; _i<pObj.completedLessonsLog.length; _i++){
                var _r = pObj.completedLessonsLog[_i];
                if(_r && (_r.ts === _ts)) { exists = true; break; }
              }
            }
            if(!exists) pObj.completedLessonsLog.push(_entry);
          }
        }catch(e){}
        DBStorage.setItem(pKey, JSON.stringify(pObj));
      }catch(e){}

      // keep admin registry consistent (demo)
      try{
        var regRaw = DBStorage.getItem("students_registry_v1");
        if(regRaw){
          var reg = JSON.parse(regRaw);
          if(Array.isArray(reg)){
            for(var i=0;i<reg.length;i++){
              var r = reg[i];
              if(!r || typeof r !== "object") continue;
              var z = r.tz || r.id || r.userId || r.username || r.user || r.uid || r.teudatZehut || r["תז"] || r['ת"ז'];
              if(z != null && String(z) === String(tz)){
                reg[i] = Object.assign({}, r, prof, { tz: String(tz) });
                break;
              }
            }
            DBStorage.setItem("students_registry_v1", JSON.stringify(reg));
          }else if(reg && typeof reg === "object"){
            var key = String(tz);
            var prev = reg[key] && typeof reg[key] === "object" ? reg[key] : {};
            reg[key] = Object.assign({}, prev, prof, { tz: String(tz) });
            DBStorage.setItem("students_registry_v1", JSON.stringify(reg));
          }
        }
      }catch(e){}
    }catch(e){}
  }
  function addOutsideTrainingToStudent(tz, startMs, endMs){
    try{
      tz = normalizeTz(tz);
      if(!tz) return;

      var sDate = new Date(isFinite(Number(startMs)) ? Number(startMs) : Date.now());
      var eDate = new Date(isFinite(Number(endMs)) ? Number(endMs) : Date.now());
      var now = new Date();
      var iso = now.toISOString();

      var dateStr = "";
      var startStr = "";
      var endStr = "";
      try{ dateStr = sDate.toLocaleDateString('he-IL'); }catch(e){ dateStr = (sDate.getDate()+"/"+(sDate.getMonth()+1)+"/"+sDate.getFullYear()); }
      try{ startStr = sDate.toLocaleTimeString('he-IL', {hour:'2-digit', minute:'2-digit'}); }catch(e){ startStr = String(sDate.getHours()).padStart(2,'0')+":"+String(sDate.getMinutes()).padStart(2,'0'); }
      try{ endStr = eDate.toLocaleTimeString('he-IL', {hour:'2-digit', minute:'2-digit'}); }catch(e){ endStr = String(eDate.getHours()).padStart(2,'0')+":"+String(eDate.getMinutes()).padStart(2,'0'); }

      // Load existing profile from BOTH sources and merge logs (avoid overwriting history)
      var profA = null;
      try{ if(typeof getStudentProfile === 'function') profA = getStudentProfile(tz); }catch(e){ profA = null; }
      var profB = null;
      try{
        var rawB = DBStorage.getItem("student_profile_" + String(tz));
        if(rawB){
          var objB = JSON.parse(rawB);
          if(objB && typeof objB === 'object') profB = objB;
        }
      }catch(e){ profB = null; }

      var prof = __mergeProfilesForLogs(profA, profB);
      if(!prof || typeof prof !== 'object'){
        var s = getStudent(tz) || {};
        prof = {
          tz: String(tz),
          id: String(tz),
          firstName: readAny(s, ['firstName','firstname','fname','שם פרטי','שם_פרטי','שם']) || '',
          lastName:  readAny(s, ['lastName','lastname','lname','שם משפחה','שם_משפחה']) || '',
          license:   studentLicenseType(s) || ''
        };
        try{ prof.lessonsDone = studentLessonsDone(s) || 0; }catch(e){ prof.lessonsDone = 0; }
        try{ prof.lessonsLeft = readAny(s, ['lessonsLeft','lessons_left','שיעורים שנשארו','שיעורים_שנשארו','remainingLessons','lessonsRemaining']) || ""; }catch(e){}
      }

      if(!Array.isArray(prof.outsideLog)) prof.outsideLog = [];

      var lessonNo = null;
      try{
        var done = parseFloat(prof.lessonsDone);
        if(isFinite(done)) lessonNo = Math.floor(done) + 1;
      }catch(e){}

      prof.outsideLog.push({
        ts: iso,
        date: dateStr,
        start: startStr,
        end: endStr,
        durationMin: 20,
        lessonNo: (lessonNo != null ? lessonNo : undefined)
      });

      try{ prof.outsideCount = prof.outsideLog.length; }catch(e){}

      // persist profile
      try{
        var pKey = "student_profile_" + String(tz);
        var pObj = prof;
        try{ DBStorage.setItem(pKey, JSON.stringify(pObj)); }catch(e){}

        // Also write to admin lesson reports so it appears in "ניהול שיעורים" history
        try{ addLessonToDailyReport(tz, startMs, endMs, { type: 'outside', units: 1 }); }catch(e){}
      }catch(e){}

      // keep admin registry consistent (demo)
      try{
        var regRaw = DBStorage.getItem("students_registry_v1");
        if(regRaw){
          var reg = JSON.parse(regRaw);
          if(Array.isArray(reg)){
            for(var i=0;i<reg.length;i++){
              var r = reg[i];
              if(!r || typeof r !== "object") continue;
              var z = r.tz || r.id || r.userId || r.username || r.user || r.uid || r.teudatZehut || r["תז"] || r['ת"ז'];
              if(z != null && String(z) === String(tz)){
                reg[i] = Object.assign({}, r, prof, { tz: String(tz) });
                break;
              }
            }
            DBStorage.setItem("students_registry_v1", JSON.stringify(reg));
          }else if(reg && typeof reg === "object"){
            var key = String(tz);
            var prev = reg[key] && typeof reg[key] === "object" ? reg[key] : {};
            reg[key] = Object.assign({}, prev, prof, { tz: String(tz) });
            DBStorage.setItem("students_registry_v1", JSON.stringify(reg));
          }
        }
      }catch(e){}

      // If student profile UI is currently open for this tz, refresh KPI immediately
      try{
        var active = (window.__activeStudentTz || (window.APP_STATE && window.APP_STATE.activeStudentTz) || "");
        var activeTz = String(active||"").replace(/\D/g,'');
        if(activeTz && activeTz === String(tz)){
          var kEl = document.getElementById('spKpiOut');
          if(kEl) kEl.textContent = String((prof.outsideLog && prof.outsideLog.length) ? prof.outsideLog.length : 0);
        }
      }catch(_e){}
    }catch(e){}
  }


function tickTimers() {
      const t = nowMs();
      let changed = false;
      let domDirty = false;
      let listDirty = false;

      for (const it of queue) {
        if (!it || !it.timer) continue;

        if (it.timer.running) {
          const startedAtMs = Number(it.timer.startedAtMs) || 0;
          const totalSec = Number(it.timer.totalSec) || 0;

          const startedAt = startedAtMs > 0 ? startedAtMs : t;
          const elapsed = Math.floor((t - startedAt) / 1000);
          const remaining = Math.max(0, totalSec - elapsed);

          if (remaining !== Number(it.timer.remainingSec)) {
            it.timer.remainingSec = remaining;
            changed = true;
            domDirty = true;
          }

          if (remaining <= 0) {
            if (it.timer.running) {
              it.timer.running = false;
              changed = true;
            }

            if (!it.timer.alerted) {
              it.timer.alerted = true;
              it.timer.started = true;
              it.timer.remainingSec = 0;
              it.timer.lastTickMs = t;
              changed = true;
              domDirty = true;

              try { toast('הזמן נגמר לתלמיד ' + (it.name || it.tz || '')); } catch (e) {}

              // If student was marked as "בחוץ" during this 40-minute lesson, log it (no separate timer)
              try{
                if (it.outsideSeg && it.outsideSeg.active) {
                  it.outsideSeg.active = false;
                  it.outsideSeg.endedAtMs = t;
                }
                if (it.outsideSeg && it.outsideSeg.startedAtMs && it.outsideSeg.endedAtMs && !it.outsideSeg.logged) {
                  addOutsideTrainingToStudent(it.tz, it.outsideSeg.startedAtMs, it.outsideSeg.endedAtMs);
                  it.outsideSeg.logged = true;
                }
              }catch(e){}

              // Log completed lesson + daily report
              try { addCompletedLessonToStudent(it.tz, totalSec); } catch (e) {}
              try {
                var chosenUnits = Number(it.lessonsToday);
                var units = (isFinite(chosenUnits) && chosenUnits > 0) ? chosenUnits : _inferUnitsFromTimes(startedAt, t);
                var startedAtStr = '';
                var endedAtStr = '';
                try{ startedAtStr = new Date(startedAt).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }); }catch(e){}
                try{ endedAtStr = new Date(t).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }); }catch(e){}
                addLessonToDailyReport(it.tz, startedAt, t, { type: 'lesson', units: units, startedAtStr: startedAtStr, endedAtStr: endedAtStr });
              } catch (e) {}

              if (activeTimerModalTz && normalizeTz(activeTimerModalTz) === normalizeTz(it.tz)) {
                closeTimerModal();
              }
            }
          }
        }


      }

      if (changed) saveQueue();

      // Update only the timer pills (no full re-render every second)
      if (domDirty) updateTimerDom();

      if (listDirty) {
        renderQueue();
        try { renderLessonMgmtFiles(); } catch (e) {}
      }
    }

  
  function resolveModalDom() {
    // Timer modal
    timerModal = $('timerModal');
    timerModalTitle = $('timerModalTitle');
    timerModalText = $('timerModalText');
    timerYes = $('timerYes');
    timerNo = $('timerNo');
    timerReset = $('timerReset');
    timerFinish = $('timerFinish');

    // Lessons modal
    lessonsModal = $('lessonsModal');
    lessonsCount = $('admin_lessonsCount') || $('lessonsCount');
    lessonsMinus = $('lessonsMinus');
    lessonsPlus = $('lessonsPlus');
    lessonsClose = $('lessonsClose');

    // Lesson report modal
    lessonReportModal = $('lessonReportModal');
    lessonReportTitle = $('lessonReportTitle');
    lessonReportContent = $('lessonReportContent');
    lessonReportClose = $('lessonReportClose');
    lessonReportShare = $('lessonReportShare');
    lessonReportDownload = $('lessonReportDownload');
  }

// ===== Modals =====
  function openModal(el) {
    if (!el) return;
    el.dataset.openedAt = String(nowMs());
    el.classList.add('show');
    el.setAttribute('aria-hidden', 'false');
  }

  function closeModal(el) {
    if (!el) return;
    el.classList.remove('show');
    el.setAttribute('aria-hidden', 'true');
  }

  function armTapShield(ms) {
    try {
      ms = Number(ms);
      if (!isFinite(ms) || ms < 0) ms = 350;
      var id = 'tapShield';
      var sh = document.getElementById(id);
      if (!sh) {
        sh = document.createElement('div');
        sh.id = id;
        sh.style.position = 'fixed';
        sh.style.inset = '0';
        sh.style.background = 'rgba(0,0,0,0)';
        sh.style.zIndex = '999999';
        sh.style.pointerEvents = 'auto';
        sh.addEventListener('pointerdown', function(e){ try{ e.preventDefault(); e.stopPropagation(); }catch(_e){} }, true);
        sh.addEventListener('click', function(e){ try{ e.preventDefault(); e.stopPropagation(); }catch(_e){} }, true);
        document.body.appendChild(sh);
      } else {
        sh.style.display = 'block';
      }
      if (sh._tapT) { try { clearTimeout(sh._tapT); } catch(_e){} }
      sh._tapT = setTimeout(function(){ try{ sh.style.display = 'none'; }catch(_e){} }, ms);
    } catch (e) {}
  }


  function openTimerModalFor(tz) {
    activeTimerModalTz = tz;

    const it = queue.find((x) => x.tz === tz);

    // Fallback: if the app was paused and time already ended, count it once now (בלי התראה נוספת)
    try{
      if(it && it.timer && it.timer.started && !it.timer.running && Number(it.timer.remainingSec||0) <= 0 && !it.timer.alerted){
        it.timer.alerted = true;
        // If student was marked as "בחוץ" during this 40-minute lesson, log it (no separate timer)
        try{
          const nowMsLocal = nowMs();
          if (it.outsideSeg && it.outsideSeg.active) {
            it.outsideSeg.active = false;
            it.outsideSeg.endedAtMs = nowMsLocal;
          }
          if (it.outsideSeg && it.outsideSeg.startedAtMs && it.outsideSeg.endedAtMs && !it.outsideSeg.logged) {
            addOutsideTrainingToStudent(it.tz, it.outsideSeg.startedAtMs, it.outsideSeg.endedAtMs);
            it.outsideSeg.logged = true;
          }
        }catch(e){}
        try{ addCompletedLessonToStudent(it.tz, it.timer.totalSec || 2400); }catch(e){}
        try{ saveQueue(); }catch(e){}
        try{ renderQueue(); }catch(e){}
      }
    }catch(e){}

    const s = getStudent(tz) || {};
    const name = studentFullName(s);

    if (timerModalTitle) timerModalTitle.textContent = `טיימר - ${name}`;

    // Dynamic modal based on timer state
    const running = !!it?.timer?.running;
    const started = !!it?.timer?.started;
    const remaining = Number.isFinite(it?.timer?.remainingSec) ? Number(it.timer.remainingSec) : 0;

    if (typeof timerFinish !== 'undefined' && timerFinish) {
      timerFinish.style.display = (started && remaining > 0) ? '' : 'none';
    }

    if (!started) {
      if (timerModalText) timerModalText.textContent = 'הטיימר לא התחיל.';
      if (timerYes) timerYes.textContent = 'התחל';
    } else if (running) {
      if (timerModalText) timerModalText.textContent = 'לעצור או לאפס את הזמן?';
      if (timerYes) timerYes.textContent = 'עצור';
    } else if (remaining <= 0) {
      if (timerModalText) timerModalText.textContent = 'הזמן נגמר. להתחיל מחדש או לאפס?';
      if (timerYes) timerYes.textContent = 'התחל מחדש';
    } else {
      if (timerModalText) timerModalText.textContent = 'להמשיך או לאפס את הזמן?';
      if (timerYes) timerYes.textContent = 'המשך';
    }

    openModal(timerModal);
  }

  function openLessonsModalFor(tz) {
    activeLessonsModalTz = tz;
    const it = queue.find((x) => x.tz === tz);
    if (!it) return;
    if (lessonsCount) lessonsCount.textContent = String(it.lessonsToday);
    openModal(lessonsModal);
  }

  // ===== Sorting =====
  function sortQueueView(items) {
    const score = (it) => {
      if (it.timer.started && it.timer.running) return [0, it.timer.remainingSec];
      if (it.timer.started && !it.timer.running && it.timer.remainingSec > 0) return [1, it.timer.remainingSec];
      return [2, 9999999];
    };
    return items.slice().sort((a, b) => {
      const sa = score(a), sb = score(b);
      if (sa[0] !== sb[0]) return sa[0] - sb[0];
      if (sa[1] !== sb[1]) return sa[1] - sb[1];
      return a.tz.localeCompare(b.tz);
    });
  }

  // ===== Render =====
  function renderInlineProfile(s) {
    const tz = normalizeTz(readAny(s, ['tz','teudatZeut','id','idNumber','studentId','תז','ת.ז']));
    const phone = readAny(s, ['phone','phoneNumber','phone_number','mobile','cell','מספר פלאפון','מספרפלאפון','פלאפון','טלפון','טלפון נייד','נייד']) ?? '—';
    const paid = readAny(s, ['paid','payment','שולם','תשלום']) ?? '—';
    const tests = readAny(s, ['tests','testDate','תאריך טסט','תאריך_טסט']) ?? '—';
    const totalLessons = readAny(s, ['lessonsTotal','totalLessons','שיעורים','כמות שיעורים']) ?? '—';

    return `
      <div class="inlineProfile">
        <div class="inlineProfileTitle">פרטי תלמיד</div>
        <div class="inlineProfileGrid">
          <div class="k">ת״ז</div><div class="v">${esc(tz || '—')}</div>
          <div class="k">טלפון</div><div class="v">${esc(phone)}</div>
          <div class="k">תשלום</div><div class="v">${esc(paid)}</div>
          <div class="k">תאריך טסט</div><div class="v">${esc(tests)}</div>
          <div class="k">שיעורים סה״כ</div><div class="v">${esc(totalLessons)}</div>
        </div>
      </div>
    `;
  }

  function renderQueue() {
    if (!queueBody) return;


    // Prevent re-render during "בחוץ" tap so pointerup doesn't get lost when the row is rebuilt
    try{
      if (window.__freezeQueueUntil && Date.now() < window.__freezeQueueUntil) return;
    }catch(e){}
    const view = sortQueueView(queue);

    if (view.length === 0) {
      queueBody.innerHTML = '<tr class="empty-row"><td colspan="6">אין תלמידים ברשימה</td></tr>';
      return;
    }

    const rows = [];
    for (const it of view) {
      const s = getStudent(it.tz) || {};
      const name = studentFullName(s);
      const license = studentLicenseType(s);
      const lessonsDone = studentLessonsDone(s);

      const timeCell = (() => {
        if (!it.timer.started) {
          return `
            <div class="timeCell">
              <button type="button" class="pillBtn startBtn" data-act="startTimer" data-tz="${esc(it.tz)}">הפעל</button>
            </div>`;
        }
        if (it.timer.remainingSec <= 0) {
          return `
            <div class="timeCell">
              <button type="button" class="pillBtn timerPill downBtn" data-act="moveDown" data-tz="${esc(it.tz)}">ירד</button>
            </div>`;
        }
        const timeText = formatMMSS(it.timer.remainingSec);
        if (it.timer.running) {
          return `
            <div class="timeCell">
              <button type="button" class="pillBtn timerPill runningBtn" data-act="timerModal" data-tz="${esc(it.tz)}">${timeText}</button>
            </div>`;
        }
        return `
          <div class="timeCell">
            <button type="button" class="pillBtn timerPill pausedBtn paused" data-act="timerModal" data-tz="${esc(it.tz)}">${timeText}</button>
          </div>`;
      })();

      const statusCell = (String(it.status || '') === 'בחוץ')
        ? `<button type="button" class="pillBtn statusPill outPillBtn" data-act="outReturnPrompt" data-out-return="1" data-tz="${esc(it.tz)}">בחוץ</button>`
        : esc((it.status || '—'));

      rows.push(`
        <tr class="qRow" data-tz="${esc(it.tz)}">
          <td class="col-name">
            <button type="button" class="cellBtn nameBtn" data-act="toggleProfile" data-tz="${esc(it.tz)}">${esc(name)}</button>
            <div class="subLine">סוג רישיון: ${esc(license)}</div>
            <button type="button" class="pillBtn lessonsPill" data-act="lessonsModal" data-tz="${esc(it.tz)}">כמות שיעורים: ${esc(it.lessonsToday)}</button>
          </td>
          <td class="col-time">${timeCell}</td>
          <td class="col-lesson">${esc(lessonsDone)}</td>
          <td class="col-status">${statusCell}</td>
          <td class="col-notes">
            <input class="notesInput" data-act="notes" data-tz="${esc(it.tz)}" type="text" value="${esc(it.notes)}" placeholder="ניתן לעריכה" />
          </td>
          <td class="col-remove">
            <button type="button" class="btnRemove" data-act="remove" data-tz="${esc(it.tz)}">הסר</button>
          </td>
        </tr>
      `);

      if (expandedTz === it.tz) {
        rows.push(`
          <tr class="profileRow" data-tz="${esc(it.tz)}">
            <td colspan="6">
              ${renderInlineProfile(s)}
            </td>
          </tr>
        `);
      }
    }

    queueBody.innerHTML = rows.join('');
    try{ bindOutsideReturnBtns(); }catch(e){}
  }

  

  
  // Robust tap handling for "בחוץ" status button in the admin lessons table
  // (Uses pointer/touch events directly to avoid Android WebView click drops / re-render issues)
  function bindOutsideReturnBtns(){
    var body = $("queueBody");
    if(!body) return;
    var btns = body.querySelectorAll('button[data-out-return="1"]');
    btns.forEach(function(btn){
      try{
        if(btn.getAttribute("data-out-bound") === "1") return;
        btn.setAttribute("data-out-bound","1");
      }catch(e){}

      var down = false, sx = 0, sy = 0, moved = false;

      function pt(e){
        var t = e;
        if(t && t.touches && t.touches[0]) t = t.touches[0];
        if(t && t.changedTouches && t.changedTouches[0]) t = t.changedTouches[0];
        return t || {};
      }

      function onDown(e){
        try{ if(e){ e.preventDefault(); e.stopPropagation(); } }catch(_e){}
        var p = pt(e);
        down = true;
        moved = false;
        sx = (p.clientX||0);
        sy = (p.clientY||0);
      }

      function onMove(e){
        if(!down) return;
        var p = pt(e);
        var dx = (p.clientX||0) - sx;
        var dy = (p.clientY||0) - sy;
        if(Math.abs(dx) > 12 || Math.abs(dy) > 12) moved = true;
      }

      function onUp(e){
        try{ if(e){ e.preventDefault(); e.stopPropagation(); } }catch(_e){}
        if(!down) return;
        down = false;
        if(moved) return;

        var tz = "";
        try{ tz = String(btn.getAttribute("data-tz") || ""); }catch(_e){ tz = ""; }
        tz = normalizeTz(tz);
        if(!tz) return;

        try{
          // suppress any delayed ghost click after opening the overlay
          if(window.__suppressGhostClicks) window.__suppressGhostClicks(600);
        }catch(_e){}
        try{ openOutsideReturnConfirm(tz); }catch(_e){}
      }

      // Prefer pointer events; add touch fallback
      try{ btn.addEventListener("pointerdown", onDown, {passive:false}); }catch(e){ btn.addEventListener("pointerdown", onDown, true); }
      try{ btn.addEventListener("pointermove", onMove, {passive:true}); }catch(e){ btn.addEventListener("pointermove", onMove, true); }
      try{ btn.addEventListener("pointerup", onUp, {passive:false}); }catch(e){ btn.addEventListener("pointerup", onUp, true); }

      try{ btn.addEventListener("touchstart", onDown, {passive:false}); }catch(e){ btn.addEventListener("touchstart", onDown, true); }
      try{ btn.addEventListener("touchmove", onMove, {passive:true}); }catch(e){ btn.addEventListener("touchmove", onMove, true); }
      try{ btn.addEventListener("touchend", onUp, {passive:false}); }catch(e){ btn.addEventListener("touchend", onUp, true); }

      // Kill native click bubbling to avoid firing on navigation/logout
      btn.addEventListener("click", function(ev){
        try{ if(ev){ ev.preventDefault(); ev.stopPropagation(); } }catch(_e){}
      }, true);
    });
  }

  // Delegated, re-render-proof handler for "בחוץ" status pill (works even while timer is ticking & rows are rebuilt)
  (function initOutsideReturnDelegation(){
    try{
      if (window.__outsideReturnDelegationInited) return;
      window.__outsideReturnDelegationInited = true;
    }catch(e){}

    var st = null;
    var MOVE_PX = 12;

    function pt(ev){
      var e = ev;
      if(e && e.touches && e.touches[0]) e = e.touches[0];
      if(e && e.changedTouches && e.changedTouches[0]) e = e.changedTouches[0];
      return e || {};
    }

    function onDown(ev){
      try{
        var t = ev && ev.target;
        if(!t || !t.closest) return;
        var el = t.closest('button[data-out-return="1"],[data-act="outReturnPrompt"]');
        if(!el) return;

        var tz = '';
        try{ tz = String(el.getAttribute('data-tz') || ''); }catch(_e){ tz = ''; }
        tz = normalizeTz(tz);
        if(!tz) return;

        var p = pt(ev);
        st = { tz: tz, x: (p.clientX||0), y: (p.clientY||0), moved:false, ts: Date.now() };

        // Freeze queue re-render briefly so touch release doesn't get lost mid-tap
        try{ window.__freezeQueueUntil = Date.now() + 900; }catch(_e){}
      }catch(_e){}
    }

    function onMove(ev){
      if(!st) return;
      try{
        var p = pt(ev);
        var dx = (p.clientX||0) - st.x;
        var dy = (p.clientY||0) - st.y;
        if ((dx*dx + dy*dy) > (MOVE_PX*MOVE_PX)) st.moved = true;
      }catch(_e){}
    }

    function onUp(ev){
      if(!st) return;
      var s = st;
      st = null;

      try{ window.__freezeQueueUntil = 0; }catch(_e){}
      if(s.moved) return;
      if((Date.now() - s.ts) > 2500) return;

      try{
        if(window.__suppressGhostClicks) window.__suppressGhostClicks(600);
      }catch(_e){}
      try{ openOutsideReturnConfirm(s.tz); }catch(_e){}
    }

    // Capture phase so we get it even if something stops propagation
    try{ document.addEventListener('pointerdown', onDown, true); }catch(e){}
    try{ document.addEventListener('pointermove', onMove, true); }catch(e){}
    try{ document.addEventListener('pointerup', onUp, true); }catch(e){}

    // Touch fallback (some Android WebViews)
    try{ document.addEventListener('touchstart', onDown, {capture:true, passive:true}); }catch(e){}
    try{ document.addEventListener('touchmove', onMove, {capture:true, passive:true}); }catch(e){}
    try{ document.addEventListener('touchend', onUp, {capture:true, passive:true}); }catch(e){}
  })();


// Updates timer texts in-place to avoid rebuilding the table every second (prevents missed taps on mobile)
  function updateTimerDom() {
    for (const it of queue) {
      if (!it || !it.tz || !it.timer || !it.timer.started) continue;
      const row = document.querySelector(`.qRow[data-tz="${it.tz}"]`);
      if (!row) continue;

      const timeBtn = row.querySelector('.col-time button.pillBtn');
      if (!timeBtn) continue;

      if (it.timer.remainingSec <= 0) {
        timeBtn.textContent = 'ירד';
        timeBtn.setAttribute('data-act', 'moveDown');
        timeBtn.classList.add('downBtn');
        timeBtn.classList.remove('paused', 'runningBtn', 'pausedBtn');
        continue;
      }

      timeBtn.textContent = formatMMSS(it.timer.remainingSec);
      timeBtn.setAttribute('data-act', 'timerModal');
      timeBtn.classList.remove('downBtn');
      timeBtn.classList.toggle('paused', !it.timer.running);
      timeBtn.classList.toggle('runningBtn', !!it.timer.running);
      timeBtn.classList.toggle('pausedBtn', !it.timer.running);
    }
  }

// ===== Actions =====
  function addStudentToQueue(tz) {
    const z = normalizeTz(tz);
    if (!z) return;

    if (!dbApi) {
      showMsg('שגיאה: קובץ תלמידים לא נטען. ודא שקיים students_db_v1.js באותה תיקייה.', 'error');
      return;
    }

    const s = getStudent(z);
    if (!s) {
      showMsg('לא נמצא תלמיד לפי ת״ז', 'error');
      return;
    }

    if (queue.some((x) => x.tz === z)) {
      showMsg('התלמיד כבר ברשימה', 'error');
      return;
    }

    const lessonsToday = 1;
    queue.push({
      tz: z,
      lessonsToday,
      notes: '',
      status: '—',
      timer: {
        totalSec: lessonsToday * LESSON_SEC,
        remainingSec: lessonsToday * LESSON_SEC,
        started: false,
        running: false,
        lastTickMs: nowMs(),
        startedAtMs: 0,
        alerted: false
      }
    });

    saveQueue();
    showMsg('', 'ok');
    renderQueue();
  }

  function moveStudentToBottom(tz) {
    const z = normalizeTz(tz);
    const idx = queue.findIndex((x) => x.tz === z);
    if (idx === -1) return;
    const [it] = queue.splice(idx, 1);
    queue.push(it);
    if (expandedTz === z) expandedTz = null;
    saveQueue();
    renderQueue();
  }

  function removeStudentFromQueue(tz) {
    const z = normalizeTz(tz);
    const idx = queue.findIndex((x) => x.tz === z);
    if (idx === -1) return;
    queue.splice(idx, 1);
    if (expandedTz === z) expandedTz = null;
    saveQueue();
    renderQueue();
  }

  function toggleProfileInline(tz) {
    const z = normalizeTz(tz);
    expandedTz = (expandedTz === z) ? null : z;
    renderQueue();
  }

  function setLessonsToday(tz, newCount) {
    const z = normalizeTz(tz);
    const it = queue.find((x) => x.tz === z);
    if (!it) return;

    const prev = it.lessonsToday;
    const next = normalizeLessonsCount(newCount);
    if (prev === next) return;

    it.lessonsToday = next;

    const newTotal = next * LESSON_SEC;
    const oldTotal = it.timer.totalSec;
    it.timer.totalSec = newTotal;

    if (!it.timer.started) {
      it.timer.remainingSec = newTotal;
    } else if (it.timer.remainingSec <= 0 || it.timer.alerted) {
      // If the timer already finished ("ירד"), start a fresh duration based on the new lesson count
      it.timer.running = false;
      it.timer.alerted = false;
      it.timer.startedAtMs = 0;
      it.timer.remainingSec = newTotal;
    } else {
      const diff = newTotal - oldTotal;
      it.timer.remainingSec = Math.max(0, it.timer.remainingSec + diff);
      if (it.timer.remainingSec > newTotal) it.timer.remainingSec = newTotal;
    }

    it.timer.lastTickMs = nowMs();
    saveQueue();
    renderQueue();
  }

  // ===== Event binding =====
  function bindOnce() {
    if (bound) return;
    bound = true;
    // Admin menu / tabs
    const btnAdminMenu = $('btnAdminMenu');
    const adminSubbarWrap = $('adminSubbarWrap');
    const tabAdminHome = $('tabAdminHome');
    const tabAdminLessonsMgmt = $('tabAdminLessonsMgmt');
    const tabAdminTestOrders = $('tabAdminTestOrders');
    const tabAdminForum = $('tabAdminForum');
    const lessonMgmtCard = $('lessonMgmtCard');
    const lessonFilesList = $('lessonFilesList');

    function toggleAdminSubbar(force){
      if(!adminSubbarWrap) return;
      const want = (typeof force==='boolean') ? force : !adminSubbarWrap.classList.contains('open');
      adminSubbarWrap.classList.toggle('open', want);
      adminSubbarWrap.setAttribute('aria-hidden', want ? 'false' : 'true');
    }

    if(btnAdminMenu){
      btnAdminMenu.addEventListener('click', () => toggleAdminSubbar());
    }
    if(tabAdminHome){
      tabAdminHome.addEventListener('click', () => { setAdminTab('home'); toggleAdminSubbar(false); });
    }
    if(tabAdminLessonsMgmt){
      tabAdminLessonsMgmt.addEventListener('click', () => { setAdminTab('lessons'); toggleAdminSubbar(false); });
    }
    if(tabAdminTestOrders){
      tabAdminTestOrders.addEventListener('click', () => { setAdminTab('tests'); toggleAdminSubbar(false); });
    }

        if(tabAdminForum){
      tabAdminForum.addEventListener('click', () => { if(typeof openAdminForum==='function') openAdminForum(); toggleAdminSubbar(false); });
    }

if(lessonFilesList){
      lessonFilesList.addEventListener('click', async (e) => {
        const btn = e.target && e.target.closest ? e.target.closest('button[data-act]') : null;
        if(!btn) return;
        const row = btn.closest('.lesson-file');
        const dateKey = row ? row.getAttribute('data-date') : '';
        const act = btn.getAttribute('data-act');
        if(!dateKey) return;

        if(act === 'open'){
          if(lessonReportTitle) lessonReportTitle.textContent = `ניהול שיעורים - ${_dateTitle(dateKey)}`;
          if(lessonReportContent) lessonReportContent.textContent = buildLessonReportText(dateKey);
          if(lessonReportModal){
            lessonReportModal.setAttribute('aria-hidden','false');
            lessonReportModal.style.display='block';
          }
          // store current key for share/download
          lessonReportModal && (lessonReportModal.dataset.dateKey = dateKey);
        } else if(act === 'share'){
          const ok = await shareLessonReport(dateKey);
          if(!ok) {
            downloadLessonReport(dateKey);
            alert('שיתוף לא נתמך במכשיר זה. הורדתי קובץ במקום.');
          }
        } else if(act === 'download'){
          downloadLessonReport(dateKey);
        }
      });
    }


    if(testOrdersList){
      testOrdersList.addEventListener('click', async (e) => {
        const btn = e.target && e.target.closest ? e.target.closest('button[data-act]') : null;
        if(!btn) return;
        const row = btn.closest('.lesson-file');
        const dateKey = row ? row.getAttribute('data-date') : '';
        const act = btn.getAttribute('data-act');
        if(!dateKey) return;

        if(act === 'open'){
          if(testOrdersTitle) testOrdersTitle.textContent = `הזמנות טסטים - ${_dateTitle(dateKey)}`;
          if(testOrdersBody) testOrdersBody.innerHTML = buildTestOrdersHTML(dateKey);
          if(testOrdersModal){
            testOrdersModal.setAttribute('aria-hidden','false');
            testOrdersModal.style.display='block';
          }
          return;
        }
        if(act === 'share'){
          try{
            const txt = buildTestOrdersText(dateKey);
            if(navigator.share){
              await navigator.share({text: txt, title: 'הזמנות טסטים'});
            } else if(navigator.clipboard && navigator.clipboard.writeText){
              await navigator.clipboard.writeText(txt);
              toast('הועתק ללוח');
            }
          }catch(err){
            try{ toast('שיתוף נכשל'); }catch(e2){}
          }
        }
      });
    }

    // Report modal buttons
    if(testOrdersClose){
      testOrdersClose.addEventListener('click', ()=>{
        if(testOrdersModal){ testOrdersModal.setAttribute('aria-hidden','true'); testOrdersModal.style.display='none'; }
      }, {passive:true});
    }

    if(lessonReportClose){
      lessonReportClose.addEventListener('click', () => {
        if(lessonReportModal){
          lessonReportModal.setAttribute('aria-hidden','true');
          lessonReportModal.style.display='none';
        }
      });
    }
    if(lessonReportModal){
      lessonReportModal.addEventListener('click', (e) => {
        if(e.target === lessonReportModal){
          lessonReportModal.setAttribute('aria-hidden','true');
          lessonReportModal.style.display='none';
        }
      });
    }
    if(lessonReportShare){
      lessonReportShare.addEventListener('click', async () => {
        const k = lessonReportModal ? lessonReportModal.dataset.dateKey : '';
        if(!k) return;
        const ok = await shareLessonReport(k);
        if(!ok){
          downloadLessonReport(k);
          alert('שיתוף לא נתמך במכשיר זה. הורדתי קובץ במקום.');
        }
      });
    }
    if(lessonReportDownload){
      lessonReportDownload.addEventListener('click', () => {
        const k = lessonReportModal ? lessonReportModal.dataset.dateKey : '';
        if(!k) return;
        downloadLessonReport(k);
      });
    }



    // Search (no auto-add)
    if (btnSearch) btnSearch.addEventListener('click', performSearch);
    if (tzInput) tzInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') performSearch(); });
    if (tzInput) tzInput.addEventListener('input', onSearchTyping);

    // Select-all on re-tap (like Ctrl+A) to avoid manual deletion on mobile
    if (tzInput) {
      const selectAllTz = () => {
        if (!tzInput.value) return;
        // Defer to allow focus/caret to settle on mobile
        setTimeout(() => {
          try {
            tzInput.select();
            tzInput.setSelectionRange(0, tzInput.value.length);
          } catch (e) {}
        }, 0);
      };
      tzInput.addEventListener('focus', selectAllTz);
      tzInput.addEventListener('click', selectAllTz);
      tzInput.addEventListener('pointerup', () => { if (document.activeElement === tzInput) selectAllTz(); });
    }

    // Logout
    if (btnLogout) btnLogout.addEventListener('click', (e) => { try{ if(e){ e.preventDefault(); e.stopPropagation(); } }catch(_){}
      showMsg('', 'ok');
      // Stay in the same file: just close the admin overlay and return to home UI
      try{ if(typeof window.closeAdminPanel === 'function') window.closeAdminPanel(); }catch(e){}
    });

// Quick hit under search
    if (quickHit) {
      const open = () => {
        const tz = normalizeTz(quickHit.dataset.tz);
        if (!tz) return;
        openProfileCard(tz);
      };
      quickHit.addEventListener('click', open);
      quickHit.addEventListener('keydown', (e) => { if (e.key === 'Enter') open(); });
    }

    // Profile card buttons
    if (btnCloseProfile) btnCloseProfile.addEventListener('click', closeProfileCard);
    if (btnAddToQueue) btnAddToQueue.addEventListener('click', () => {
      if (!selectedSearchTz) return;
      addStudentToQueue(selectedSearchTz);
      closeProfileCard();
      hideQuickHit();
    });
    if (btnStatusTest) btnStatusTest.addEventListener('click', () => {
      if (!selectedSearchTz) return;
      setStatusAndStart(selectedSearchTz, 'בטסט');
      closeProfileCard();
      hideQuickHit();
    });
    if (btnStatusOut) btnStatusOut.addEventListener('click', () => {
      if (!selectedSearchTz) return;
      setStatusAndStart(selectedSearchTz, 'בחוץ');
      closeProfileCard();
      hideQuickHit();
    });

    // Delegated actions (table)
// Touch-friendly: action happens ONLY on release on the same button (prevents accidental opens while scrolling)
const runAct = (actEl) => {
  if (!actEl) return;

  // De-dupe rapid taps on mobile
  const key = `${actEl.getAttribute('data-act') || ''}|${actEl.getAttribute('data-tz') || ''}`;
  const t = nowMs();
  if (runAct._lastKey === key && (t - (runAct._lastAt || 0)) < 350) return;
  runAct._lastKey = key;
  runAct._lastAt = t;

  const act = actEl.getAttribute('data-act');
  const tz = actEl.getAttribute('data-tz') || actEl.closest('[data-tz]')?.getAttribute('data-tz') || '';
  if (!tz) return;

  if (act === 'remove') return removeStudentFromQueue(tz);
  if (act === 'toggleProfile') return openProfileCard(tz);
  if (act === 'outReturnPrompt') return openOutsideReturnConfirm(normalizeTz(tz));
  if (act === 'startTimer') return startTimer(normalizeTz(tz));
  if (act === 'timerModal') return openTimerModalFor(normalizeTz(tz));
  if (act === 'lessonsModal') return openLessonsModalFor(normalizeTz(tz));
  if (act === 'moveDown') return moveStudentToBottom(normalizeTz(tz));
};

const TAP_MOVE_PX = 12; // movement threshold to treat as scroll, not tap
let tapState = null;

const findActEl = (node) => {
  const tgt = (node && node.nodeType === 3) ? node.parentElement : node;
  return tgt && tgt.closest ? tgt.closest('[data-act]') : null;
};

const isInteractiveInput = (el) => {
  if (!el) return false;
  const tag = (el.tagName || '').toUpperCase();
  return tag === 'INPUT' || tag === 'TEXTAREA' || el.isContentEditable;
};

const sameActEl = (a, b) => {
  if (!a || !b) return false;

  // If DOM nodes are the same / contain each other, it's a match.
  if (a === b || a.contains(b) || b.contains(a)) return true;

  // IMPORTANT: the queue table re-renders frequently while timers tick.
  // That can replace buttons between pointerdown and pointerup, so we also match by action key.
  try{
    const actA = a.getAttribute && a.getAttribute('data-act');
    const actB = b.getAttribute && b.getAttribute('data-act');
    if (!actA || !actB || actA !== actB) return false;

    const tzA = (a.getAttribute && a.getAttribute('data-tz')) || (a.closest && a.closest('[data-tz]')?.getAttribute('data-tz')) || '';
    const tzB = (b.getAttribute && b.getAttribute('data-tz')) || (b.closest && b.closest('[data-tz]')?.getAttribute('data-tz')) || '';
    const nA = (typeof normalizeTz === 'function') ? normalizeTz(tzA) : String(tzA||'').replace(/\D/g,'');
    const nB = (typeof normalizeTz === 'function') ? normalizeTz(tzB) : String(tzB||'').replace(/\D/g,'');
    if (nA && nB && String(nA) === String(nB)) return true;
  }catch(e){}

  return false;
};

const onActPointerDown = (e) => {
  if (e.pointerType === 'mouse' && e.button !== 0) return;

  const actEl = findActEl(e.target);
  if (!actEl) return;

  // Don't hijack note inputs
  if (isInteractiveInput(e.target)) return;

  tapState = {
    id: e.pointerId,
    el: actEl,
    x: e.clientX,
    y: e.clientY,
    moved: false
  };
};

const onActPointerMove = (e) => {
  if (!tapState || e.pointerId !== tapState.id) return;
  const dx = e.clientX - tapState.x;
  const dy = e.clientY - tapState.y;
  if (Math.hypot(dx, dy) > TAP_MOVE_PX) tapState.moved = true;
};

const onActPointerUp = (e) => {
  if (!tapState || e.pointerId !== tapState.id) return;
  const { el, moved } = tapState;
  tapState = null;

  if (moved) return;

  const upEl = findActEl(document.elementFromPoint(e.clientX, e.clientY));
  if (!upEl) return;

  // Only trigger if finger released on the same actionable button
  if (!sameActEl(el, upEl)) return;

  runAct(upEl);
};

const onActPointerCancel = (e) => {
  if (!tapState || e.pointerId !== tapState.id) return;
  tapState = null;
};

document.addEventListener('pointerdown', onActPointerDown, { capture: true, passive: true });
document.addEventListener('pointermove', onActPointerMove, { capture: true, passive: true });
document.addEventListener('pointerup', onActPointerUp, { capture: true, passive: true });
document.addEventListener('pointercancel', onActPointerCancel, { capture: true, passive: true });

// Fallback for browsers/webviews where pointerup matching is flaky: open outside return confirm on click
document.addEventListener('click', function(e){
  try{
    var el = e && e.target && e.target.closest ? e.target.closest('[data-act="outReturnPrompt"]') : null;
    if(!el) return;
    // Avoid double-run: runAct already has de-dupe
    runAct(el);
  }catch(_e){}
}, true);


document.addEventListener('input', (e) => {
      const el = e.target;
      if (!(el instanceof HTMLInputElement)) return;
      if (el.getAttribute('data-act') !== 'notes') return;
      const tz = normalizeTz(el.getAttribute('data-tz'));
      const it = queue.find((x) => x.tz === tz);
      if (!it) return;
      it.notes = el.value;
      saveQueue();
    });

    // Timer modal
    function closeTimerModal() {
      activeTimerModalTz = null;
      closeModal(timerModal);
      armTapShield(450);
    }
    if (timerNo) timerNo.addEventListener('click', closeTimerModal);
    if (timerYes) timerYes.addEventListener('click', () => {
      if (!activeTimerModalTz) return closeTimerModal();

      const tz = activeTimerModalTz;
      const it = queue.find((x) => x.tz === tz);

      // If missing item, just close
      if (!it || !it.timer) return closeTimerModal();

      if (!it.timer.started) {
        startTimer(tz);
      } else if (it.timer.running) {
        pauseTimer(tz);
      } else if (it.timer.remainingSec <= 0) {
        // Ensure lesson is counted once when time ended (even if app was paused)
        try{
          if(!it.timer.alerted){
            it.timer.alerted = true;
            addCompletedLessonToStudent(tz, it.timer.totalSec || 2400);
            saveQueue();
            renderQueue();
          }
        }catch(e){}
        startTimer(tz);
      } else {
        resumeTimer(tz);
      }

      closeTimerModal();
    });
    if (timerReset) timerReset.addEventListener('click', () => {
      if (!activeTimerModalTz) return closeTimerModal();
      resetTimer(activeTimerModalTz);
      closeTimerModal();
    });
    if (timerFinish) timerFinish.addEventListener('click', () => {
      if (!activeTimerModalTz) return;

      const tz = normalizeTz(activeTimerModalTz);
      const it = queue.find((x) => normalizeTz(x.tz) === tz);

      if (!it || !it.timer) {
        closeTimerModal();
        return;
      }

      const t = nowMs();
      const totalSec = Number(it.timer.totalSec) || 0;
      const startedAtMs = Number(it.timer.startedAtMs) || t;

      const alreadyEnded = (!!it.timer.alerted && !it.timer.running && Number(it.timer.remainingSec) === 0);

      // Force end now (counts as completed for the selected duration)
      it.timer.running = false;
      it.timer.started = true;
      it.timer.remainingSec = 0;
      it.timer.alerted = true;
      it.timer.lastTickMs = t;

      if (!alreadyEnded) {
        try { addCompletedLessonToStudent(it.tz, totalSec); } catch (e) {}
        try {
          var chosenUnits = Number(it.lessonsToday);
          var u = (isFinite(chosenUnits) && chosenUnits > 0) ? chosenUnits : Math.max(MIN_LESSONS, Math.round(((Number(totalSec)||0) / LESSON_SEC) * 2) / 2);
          var startedAtStr = '';
          var endedAtStr = '';
          try { startedAtStr = new Date(startedAtMs).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }); } catch (e) {}
          try { endedAtStr = new Date(t).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }); } catch (e) {}
          addLessonToDailyReport(it.tz, startedAtMs, t, { type: 'lesson', units: u, startedAtStr: startedAtStr, endedAtStr: endedAtStr });
        } catch (e) {}
      }

      // Reset timer start for next lesson
      it.timer.startedAtMs = 0;

      // Remove from admin table -> move to "ניהול שיעורים" 
      if (expandedTz && normalizeTz(expandedTz) === tz) expandedTz = null;

      saveQueue();
      updateTimerDom();
      renderQueue();

      closeTimerModal();
    });
    if (timerModal) timerModal.addEventListener('click', (e) => {
      if (e.target !== timerModal) return;
      const openedAt = Number(timerModal.dataset.openedAt || 0);
      if (nowMs() - openedAt < 450) return;
      closeTimerModal();
    });

    // Lessons modal
    function closeLessonsModal() {
      activeLessonsModalTz = null;
      closeModal(lessonsModal);
    }
    if (lessonsClose) lessonsClose.addEventListener('click', closeLessonsModal);
    if (lessonsMinus) lessonsMinus.addEventListener('click', () => {
      if (!activeLessonsModalTz) return;
      const it = queue.find((x) => x.tz === activeLessonsModalTz);
      if (!it) return;
      const next = normalizeLessonsCount((Number(it.lessonsToday) || 1) - 0.5);
      setLessonsToday(activeLessonsModalTz, next);
      if (lessonsCount) lessonsCount.textContent = String(next);
    });
    if (lessonsPlus) lessonsPlus.addEventListener('click', () => {
      if (!activeLessonsModalTz) return;
      const it = queue.find((x) => x.tz === activeLessonsModalTz);
      if (!it) return;
      const next = normalizeLessonsCount((Number(it.lessonsToday) || 1) + 0.5);
      setLessonsToday(activeLessonsModalTz, next);
      if (lessonsCount) lessonsCount.textContent = String(next);
    });
    if (lessonsModal) lessonsModal.addEventListener('click', (e) => {
      if (e.target !== lessonsModal) return;
      const openedAt = Number(lessonsModal.dataset.openedAt || 0);
      if (nowMs() - openedAt < 450) return;
      closeLessonsModal();
    });
  }

  // --- OVERRIDE: ensure lessons/balance/log always update for the real student (sync across possible keys) ---

  // Merge two profile sources without losing historical logs.
  // Important: getStudentProfile() may return a thin registry object without logs,
  // so we always prefer the longer log arrays from the persisted store.
  function __mergeProfilesForLogs(a, b){
    try{
      a = (a && typeof a === 'object') ? a : null;
      b = (b && typeof b === 'object') ? b : null;
      if(!a && !b) return null;
      if(a && !b) return a;
      if(!a && b) return b;

      var m = Object.assign({}, a, b);

      function pickArr(x, y){
        var ax = Array.isArray(x), ay = Array.isArray(y);
        if(ax && ay) return (y.length >= x.length) ? y : x;
        if(ay) return y;
        if(ax) return x;
        return null;
      }

      // Completed lessons log
      var la = a.completedLessonsLog || a.lessonsDoneLog || a.lessonsLog;
      var lb = b.completedLessonsLog || b.lessonsDoneLog || b.lessonsLog;
      var bestL = pickArr(la, lb);
      if(bestL) m.completedLessonsLog = bestL;

      // Outside training log
      var oa = a.outsideLog || a.outLog || a.outdoorLog;
      var ob = b.outsideLog || b.outLog || b.outdoorLog;
      var bestO = pickArr(oa, ob);
      if(bestO) m.outsideLog = bestO;
      try{ if(Array.isArray(m.outsideLog)) m.outsideCount = m.outsideLog.length; }catch(e){}

      return m;
    }catch(e){}
    return (b && typeof b === 'object') ? b : ((a && typeof a === 'object') ? a : null);
  }

  function addCompletedLessonToStudent(tz, durationSec){
    try{
      tz = normalizeTz(tz);
      if(!tz) return;

      var LESSON_SEC_LOCAL = 2400;
      var dur = Number(durationSec);
      if(!isFinite(dur) || dur <= 0) dur = LESSON_SEC_LOCAL;

      // Convert to lesson units (1 = 40m, 0.5 = 20m). Ignore < 20m.
      var unitsRaw = dur / LESSON_SEC_LOCAL;
      var units = Math.round(unitsRaw * 2) / 2;
      if(units < 0.5) units = 0;
      if(units <= 0) return;

      // Load existing profile from BOTH sources and merge logs (avoid overwriting history)
      var profA = null;
      try{ if(typeof getStudentProfile === "function") profA = getStudentProfile(tz); }catch(e){}
      var profB = null;
      try{
        var rawP = DBStorage.getItem("student_profile_" + String(tz));
        if(rawP){
          var objP = JSON.parse(rawP);
          if(objP && typeof objP === 'object') profB = objP;
        }
      }catch(e){}
      var prof = __mergeProfilesForLogs(profA, profB);
      if(!prof || typeof prof !== 'object'){
        try{ prof = getStudent(tz) || {}; }catch(e){ prof = {}; }
      }
      if(!prof || typeof prof !== 'object') prof = {};
      prof.tz = String(tz);

      if(!Array.isArray(prof.completedLessonsLog)) prof.completedLessonsLog = [];

      var now = new Date();
      var iso = now.toISOString();
      var dateStr = "";
      var timeStr = "";
      try{ dateStr = now.toLocaleDateString('he-IL'); }catch(e){ dateStr = (now.getDate()+"/"+(now.getMonth()+1)+"/"+now.getFullYear()); }
      try{ timeStr = now.toLocaleTimeString('he-IL', {hour:'2-digit', minute:'2-digit'}); }catch(e){
        var hh = String(now.getHours()).padStart(2,'0');
        var mm = String(now.getMinutes()).padStart(2,'0');
        timeStr = hh + ":" + mm;
      }

      // Pull start time from queue timer (only for NEW timers that started after this version)
      var startAtMs = 0;
      try{
        if(typeof queue !== "undefined" && Array.isArray(queue)){
          for(var qi=0; qi<queue.length; qi++){
            var qit = queue[qi];
            if(qit && String(qit.tz) === String(tz)){
              var v = qit.timer && qit.timer.startedAtMs;
              if(v) startAtMs = Number(v) || 0;
              break;
            }
          }
        }
      }catch(e){}
      var startTimeStr = "";
      if(startAtMs > 0){
        try{
          var sd = new Date(startAtMs);
          try{ dateStr = sd.toLocaleDateString('he-IL'); }catch(e){ dateStr = (sd.getDate()+"/"+(sd.getMonth()+1)+"/"+sd.getFullYear()); }
          try{ startTimeStr = sd.toLocaleTimeString('he-IL', {hour:'2-digit', minute:'2-digit'}); }catch(e){
            var sh = String(sd.getHours()).padStart(2,'0');
            var sm = String(sd.getMinutes()).padStart(2,'0');
            startTimeStr = sh + ":" + sm;
          }
        }catch(e){}
      }

      // Append log entries
      var full = Math.floor(units);
      var half = (units - full) >= 0.5 ? 0.5 : 0;
      for(var iL=0;iL<full;iL++){
        var obj1 = { ts: iso, date: dateStr, time: timeStr, units: 1, seconds: LESSON_SEC_LOCAL };
        if(startAtMs > 0){ obj1.start = startTimeStr; obj1.end = timeStr; }
        prof.completedLessonsLog.push(obj1);
      }
      if(half){
        var objH = { ts: iso, date: dateStr, time: timeStr, units: 0.5, seconds: Math.floor(LESSON_SEC_LOCAL/2) };
        if(startAtMs > 0){ objH.start = startTimeStr; objH.end = timeStr; }
        prof.completedLessonsLog.push(objH);
      }

      // Update counters (round to 0.5)
      var curDone = parseFloat(prof.lessonsDone);
      if(!isFinite(curDone)) curDone = 0;
      var newDone = curDone + units;
      prof.lessonsDone = Math.round(newDone * 2) / 2;

      // Update lessonsLeft (round to 0.5). Not tied to money balance.
      var curLeft = parseFloat(prof.lessonsLeft);
      if (!isFinite(curLeft)) {
        // Try read from registry/student record
        try {
          var st = null;
          try { st = getStudent(tz) || {}; } catch (e) { st = {}; }
          var rawLeft = null;
          if (st && typeof st === 'object') {
            rawLeft = readAny(st, ['lessonsLeft','lessons_left','remainingLessons','lessonsRemaining','שיעוריםשנשארו']);
          }
          curLeft = parseFloat(rawLeft);
        } catch (e) {}
      }
      if (isFinite(curLeft)) {
        var newLeft = curLeft - units;
        if (newLeft < 0) newLeft = 0;
        prof.lessonsLeft = Math.round(newLeft * 2) / 2;
      }

      // Payments: reduce due by 150₪ per lesson unit
      var payObj = null;
      try{
        var payKey = "student_payments_" + String(tz);
        var payRaw = DBStorage.getItem(payKey);
        if(payRaw){
          payObj = JSON.parse(payRaw);
          if(!payObj || typeof payObj !== "object") payObj = null;
        }
        if(payObj){
          payObj = payEnsureLedger(payObj, String(tz));
          var curDue = payLedgerSum(payObj);
          var debit = Math.round((150 * units) * 100) / 100;
          if(!isFinite(curDue) || curDue < 0) curDue = 0;
          if(!isFinite(debit) || debit < 0) debit = 0;
          if(debit > curDue) debit = curDue;
          if(debit > 0){
            payLedgerAdd(payObj, { ts: Date.now(), type: "lesson", amount: -debit, note: "שיעור", meta: { units: units } });
          }else{
            payObj.due = curDue;
          }
          // keep common aliases in sync if present
          if(payObj && typeof payObj === "object"){
            if('balance' in payObj) payObj.balance = payObj.due;
            if('remaining' in payObj) payObj.remaining = payObj.due;
          }
          DBStorage.setItem(payKey, JSON.stringify(payObj));        }
      }catch(e){}

      // Save profile under tz key
      try{
        if(typeof setStudentProfile === "function") setStudentProfile(String(tz), prof);
        else DBStorage.setItem("student_profile_" + String(tz), JSON.stringify(prof));
      }catch(e){
        try{ DBStorage.setItem("student_profile_" + String(tz), JSON.stringify(prof)); }catch(e2){}
      }

      // Mirror into progress store (some UI parts read it)
      try{
        var pKey = "student_progress_" + String(tz);
        var pRaw = DBStorage.getItem(pKey);
        var pObj = pRaw ? JSON.parse(pRaw) : {};
        if(!pObj || typeof pObj !== "object") pObj = {};
        pObj.lessonsDone = prof.lessonsDone;
        if(prof.lessonsLeft != null) pObj.lessonsLeft = prof.lessonsLeft;
        if(!Array.isArray(pObj.completedLessonsLog)) pObj.completedLessonsLog = [];
        // keep a bounded copy (avoid huge storage)
        try{
          var log = Array.isArray(prof.completedLessonsLog) ? prof.completedLessonsLog.slice(-120) : [];
          pObj.completedLessonsLog = log;
        }catch(e){}
        DBStorage.setItem(pKey, JSON.stringify(pObj));
      }catch(e){}

      // Sync registry entry (for admin table/search)
      try{
        var rRaw = DBStorage.getItem("students_registry_v1");
        if(rRaw){
          var reg = JSON.parse(rRaw);
          if(Array.isArray(reg)){
            for(var i=0;i<reg.length;i++){
              if(reg[i] && String(reg[i].tz||"") === String(tz)){
                reg[i].lessonsDone = prof.lessonsDone;
                if(prof.lessonsLeft != null) reg[i].lessonsLeft = prof.lessonsLeft;
                if(payObj && payObj.due != null) reg[i].due = payObj.due;
              }
            }
            DBStorage.setItem("students_registry_v1", JSON.stringify(reg));
          }else if(reg && typeof reg === "object"){
            var key = String(tz);
            var prev = reg[key] && typeof reg[key] === "object" ? reg[key] : {};
            reg[key] = Object.assign({}, prev, {
              tz: String(tz),
              lessonsDone: prof.lessonsDone,
              lessonsLeft: (prof.lessonsLeft != null ? prof.lessonsLeft : prev.lessonsLeft),
              due: (payObj && payObj.due != null ? payObj.due : prev.due)
            });
            DBStorage.setItem("students_registry_v1", JSON.stringify(reg));
          }
        }
      }catch(e){}

      // Extra safety: if the student app stores data under an alias key (username),
      // update those keys too, but only when such keys already exist.
      try{
        var aliases = [];
        try{
          var rawR = DBStorage.getItem("students_registry_v1");
          if(rawR){
            var reg2 = JSON.parse(rawR);
            var rec = null;
            if(Array.isArray(reg2)){
              for(var j=0;j<reg2.length;j++){
                if(reg2[j] && String(reg2[j].tz||"") === String(tz)){ rec = reg2[j]; break; }
              }
            }else if(reg2 && typeof reg2 === "object"){
              rec = reg2[String(tz)];
            }
            if(rec && typeof rec === "object"){
              var cand = [rec.username, rec.user, rec.userId, rec.uid, rec.login, rec.email, rec.phone];
              for(var c=0;c<cand.length;c++){
                var v = normStr(cand[c]);
                if(v && v !== String(tz)) aliases.push(v);
              }
            }
          }
        }catch(e){}

        // also include current stored username if it maps to this tz
        try{
          var u = normStr(DBStorage.getItem('student_username') || "");
          if(u){
            var dig = String(u).replace(/\D/g,"");
            if(!dig || dig !== String(tz)){
              // if there is already a profile under that username - treat it as alias
              if(DBStorage.getItem("student_profile_" + u) || DBStorage.getItem("student_progress_" + u) || DBStorage.getItem("student_payments_" + u)){
                aliases.push(u);
              }
            }
          }
        }catch(e){}

        // de-dup
        var uniq = [];
        for(var a=0;a<aliases.length;a++){
          var vv = aliases[a];
          if(!vv) continue;
          if(uniq.indexOf(vv) === -1) uniq.push(vv);
        }

        for(var k=0;k<uniq.length;k++){
          var ak = uniq[k];
          try{
            if(DBStorage.getItem("student_profile_" + ak)){
              DBStorage.setItem("student_profile_" + ak, JSON.stringify(prof));
            }
          }catch(e){}
          try{
            if(DBStorage.getItem("student_progress_" + ak)){
              var p2 = { lessonsDone: prof.lessonsDone, lessonsLeft: prof.lessonsLeft, completedLessonsLog: (Array.isArray(prof.completedLessonsLog)? prof.completedLessonsLog.slice(-120):[]) };
              DBStorage.setItem("student_progress_" + ak, JSON.stringify(p2));
            }
          }catch(e){}
          try{
            if(payObj && DBStorage.getItem("student_payments_" + ak)){
              DBStorage.setItem("student_payments_" + ak, JSON.stringify(payObj));
            }
          }catch(e){}
        }
      }catch(e){}
    }catch(e){}
  }

  function init() {
    resolveModalDom();
    queue = loadQueue();
    dbApi = resolveStudentsDb();

    if (!dbApi) showMsg('שגיאה: קובץ תלמידים לא נטען. ודא שקיים students_db_v1.js באותה תיקייה.', 'error');
    else showMsg('', 'ok');

    bindOnce();

    // Default tab
    setAdminTab('home');
    renderQueue();

    if (tickHandle) clearInterval(tickHandle);
    tickHandle = setInterval(tickTimers, 1000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

/* ===== script block 10 (from original HTML) ===== */
/* ===== MANAGER OVERLAY LOGIC (v2 - dashboard) ===== */
(function(){
  function $(id){ return document.getElementById(id); }

  function makeTxId(){
    return 'tx_' + String(Date.now()) + '_' + String(Math.random()).slice(2);
  }

  var LS_PRODUCTS_KEY = "shop_products_v1";
  var LS_PAYS_KEY = "admin_payments_v1";

  // -------- Utils --------
  function safeParse(v, fallback){ try{ return JSON.parse(v); }catch(e){ return fallback; } }
  function normStr(v){ return String(v==null?"":v).trim(); }
  function parseCsv(v){ return normStr(v).split(",").map(function(s){ return String(s||"").trim(); }).filter(Boolean); }
  function moneyStr(v){
    var n = parseFloat(String(v||"").replace(/[^\d.]/g,""));
    if(!isFinite(n)) return "";
    return String(Math.round(n));
  }
  function fmt2(n){ return String(n).padStart(2,"0"); }
  function tsToLocalParts(ts){
    var d = null;
    try{ d = new Date(ts); }catch(e){ d = null; }
    if(!d || isNaN(d.getTime())) d = new Date();
    var dd = fmt2(d.getDate()), mm = fmt2(d.getMonth()+1), yy = d.getFullYear();
    var hh = fmt2(d.getHours()), mi = fmt2(d.getMinutes());
    return {date: dd + "/" + mm + "/" + yy, time: hh + ":" + mi, ymd: yy + "-" + mm + "-" + dd};
  }
  function ymdFromTs(ts){ return tsToLocalParts(ts).ymd; }
  function esc(s){
    s = String(s==null?"":s);
    return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
  }

  function readProducts(){
    var raw = null;
    try{ raw = DBStorage.getItem(LS_PRODUCTS_KEY); }catch(e){}
    var arr = safeParse(raw, []);
    return Array.isArray(arr) ? arr : [];
  }
  function writeProducts(arr){
    try{
      DBStorage.setItem(LS_PRODUCTS_KEY, JSON.stringify(arr||[]));
      return true;
    }catch(e){
      try{
        if(typeof toast === "function"){
          toast("לא נשמר: האחסון מלא או שהתמונות כבדות מדי (נסה תמונות קטנות יותר)");
        }
      }catch(e2){}
      return false;
    }
  }

  function readPays(){
    var raw = null;
    try{ raw = DBStorage.getItem(LS_PAYS_KEY); }catch(e){}
    var arr = safeParse(raw, []);
    return Array.isArray(arr) ? arr : [];
  }
  function writePays(arr){
    try{ DBStorage.setItem(LS_PAYS_KEY, JSON.stringify(arr||[])); }catch(e){}
  }

  // Category mapping: normalized (UI) -> storage category
  function toStorageCat(norm){
    norm = String(norm||"").trim();
    if(norm === "helmet") return "helmets";
    if(norm === "gloves") return "gloves";
    if(norm === "lock") return "locks";
    if(norm === "intercom") return "intercom";
    if(norm === "bike_new") return "bikes_used";
    if(norm === "bike") return "bikes_used";
    return "helmets";
  }

  // -------- Overlay open/close --------
  function closeManagerPanel(){
    try{ document.body.classList.remove("manager-open"); }catch(e){}
    var ov = $("managerOverlay");
    if(ov) ov.setAttribute("aria-hidden","true");
    try{ mgrHideAllViews(); }catch(e){}
    try{ if(typeof updateEdgeHandles === "function") updateEdgeHandles(); }catch(e){}
    try{ if(typeof updateEdgeHandlePositions === "function") updateEdgeHandlePositions(); }catch(e){}
 
    // Restore scrims that were hard-killed when entering manager mode (prevents tap-through after logout)
    try{
      var restore = ["menuScrim","studentMenuScrim","profileMenuScrim","shopScrim","popupScrim"];
      for(var i=0;i<restore.length;i++){
        try{ if(typeof reviveOverlayEl === "function") reviveOverlayEl(restore[i]); }catch(e){}
        try{
          var el = document.getElementById(restore[i]);
          if(el){ el.style.display=""; el.style.opacity=""; el.style.pointerEvents=""; el.removeAttribute("aria-hidden"); }
        }catch(e){}
      }
    }catch(e){}

  }

  // -------- Manager logout: prevent tap-through (Android ghost click) --------
  function mgrInstallLogoutShield(){
    if(window.__mgrLogoutShieldInstalled) return;
    window.__mgrLogoutShieldInstalled = true;
    window.__mgrLogoutBlockUntil = 0;

    function swallow(ev){
      try{ ev.preventDefault(); }catch(e){}
      try{ ev.stopPropagation(); }catch(e){}
      try{ ev.stopImmediatePropagation(); }catch(e){}
      return false;
    }

    // Capture-phase blocker that is only active while __mgrLogoutBlockUntil is in the future
    function blocker(ev){
      try{
        if(Date.now() >= (window.__mgrLogoutBlockUntil||0)) return;
        swallow(ev);
      }catch(e){}
    }

    // Use capture to stop events before they reach underlying elements
    try{
      var optTouch = {capture:true, passive:false};
      document.addEventListener("click", blocker, true);
      document.addEventListener("mousedown", blocker, true);
      document.addEventListener("mouseup", blocker, true);
      document.addEventListener("pointerdown", blocker, true);
      document.addEventListener("pointerup", blocker, true);
      document.addEventListener("touchstart", blocker, optTouch);
      document.addEventListener("touchend", blocker, optTouch);
    }catch(e){}
  }

  function mgrBlockTapThrough(ms){
    ms = (ms==null ? 1200 : ms);
    mgrInstallLogoutShield();
    try{ window.__mgrLogoutBlockUntil = Math.max(window.__mgrLogoutBlockUntil||0, Date.now() + ms); }catch(e){}

    // Transparent full-screen shield (covers even if manager overlay is hidden)
    try{
      var sh = document.getElementById("mgrLogoutTapShield");
      if(!sh){
        sh = document.createElement("div");
        sh.id = "mgrLogoutTapShield";
        sh.style.position = "fixed";
        sh.style.left = "0";
        sh.style.top = "0";
        sh.style.width = "100vw";
        sh.style.height = "100vh";
        sh.style.zIndex = "2147483647";
        sh.style.background = "rgba(0,0,0,0)";
        sh.style.pointerEvents = "auto";
        sh.style.touchAction = "none";
        sh.addEventListener("click", function(ev){ ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation(); return false; }, true);
        sh.addEventListener("mousedown", function(ev){ ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation(); return false; }, true);
        sh.addEventListener("mouseup", function(ev){ ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation(); return false; }, true);
        sh.addEventListener("pointerdown", function(ev){ ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation(); return false; }, true);
        sh.addEventListener("pointerup", function(ev){ ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation(); return false; }, true);
        sh.addEventListener("touchstart", function(ev){ ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation(); return false; }, {capture:true, passive:false});
        sh.addEventListener("touchend", function(ev){ ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation(); return false; }, {capture:true, passive:false});
      }
      if(!document.getElementById("mgrLogoutTapShield")) document.body.appendChild(sh);
      setTimeout(function(){
        try{
          if(Date.now() < (window.__mgrLogoutBlockUntil||0)) return;
          var cur = document.getElementById("mgrLogoutTapShield");
          if(cur && cur.parentNode) cur.parentNode.removeChild(cur);
        }catch(e){}
      }, ms + 60);
    }catch(e){}
  }

  function mgrDoLogout(e){
    try{ if(e){ e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); } }catch(_e){}
    // Block any ghost click that would land on the underlying page after the overlay closes
    try{ if(window.__suppressGhostClicks) window.__suppressGhostClicks(1400); }catch(_e){}
    mgrBlockTapThrough(1400);
    // Close on next tick so the shield is already active
    setTimeout(function(){
      try{ closeManagerPanel(); }catch(e){}
      try{ if(typeof toast === "function") toast("התנתקות"); }catch(e){}
    }, 0);
  }

  window.closeManagerPanel = closeManagerPanel;

  window.openManagerPanel = function(){
    try{ if(typeof closeMenu === "function") closeMenu(); }catch(e){}
    try{ if(typeof closeProfileMenu === "function") closeProfileMenu(); }catch(e){}
    try{ if(typeof closeAllPages === "function") closeAllPages(); }catch(e){}
    // Hard kill any scrims/overlays that can block taps (some Android WebViews keep them alive)
    try{
      var kill = ["menuScrim","studentMenuScrim","profileMenuScrim","shopScrim","popupScrim"];
      for(var i=0;i<kill.length;i++){
        var el = document.getElementById(kill[i]);
        if(el){ el.style.display="none"; el.style.opacity="0"; el.style.pointerEvents="none"; el.setAttribute("aria-hidden","true"); }
      }
    }catch(e){}
    // Ensure manager buttons are bound (Android WebView can miss DOMContentLoaded)
    try{ if(typeof window.__mgrBindUI === "function") window.__mgrBindUI(); }catch(e){}
    try{ if(typeof bind === "function") bind(); }catch(e){}
    // Safety: close any open manager modals so they do not block clicks
    try{
      var ms = document.querySelectorAll('#managerOverlay .mgr-modal');
      ms && ms.forEach && ms.forEach(function(m){ try{ m.setAttribute('aria-hidden','true'); }catch(_){} });
    }catch(e){}
    try{ document.body.classList.add("manager-open"); }catch(e){}
    var ov = $("managerOverlay");
    if(ov) ov.setAttribute("aria-hidden","false");
    try{ mgrHideAllViews(); }catch(e){}
    try{ if(typeof updateMenuRoleSections === "function") updateMenuRoleSections(); }catch(e){}
    try{ mgrRenderRecentPayments(); }catch(e){}
    try{ if(typeof updateEdgeHandles === "function") updateEdgeHandles(); }catch(e){}
    try{ if(typeof updateEdgeHandlePositions === "function") updateEdgeHandlePositions(); }catch(e){}
  };

  function mgrHideAllViews(){
    var top = $("mgrTopbar");
    var vs = ["mgrViewShop","mgrViewStudents","mgrViewPayments","mgrViewOrders","mgrViewCash","mgrViewAds"];
    var ov = $("managerOverlay");
    if(ov) ov.classList.remove("mgr-shop-open");
    if(top){ top.setAttribute("aria-hidden","true"); }
    for(var i=0;i<vs.length;i++){
      var el = $(vs[i]);
      if(el){ el.setAttribute("aria-hidden","true"); }
    }
  }

  function mgrShowHome(){
    // Manager "home" was removed (moved to side menu). Back now just closes the manager overlay.
    try{ closeManagerPanel(); }catch(e){}
  }

  function mgrShowView(viewId, title){
    mgrHideAllViews();
    var ov = $("managerOverlay");
    if(ov){
      if(viewId === "mgrViewShop") ov.classList.add("mgr-shop-open");
      else ov.classList.remove("mgr-shop-open");
    }
    var top = $("mgrTopbar");
    var t = $("mgrTopTitle");
    if(t) t.textContent = title || "אדמין";
    if(top) top.setAttribute("aria-hidden","false");
    var v = $(viewId);
    if(v) v.setAttribute("aria-hidden","false");
  }

  // Expose manager view helpers for left-menu manager navigation
  try{ window.mgrShowView = mgrShowView; }catch(e){}
  try{ window.mgrHideAllViews = mgrHideAllViews; }catch(e){}

  // -------- Product modal (reuse) -------- (reuse) --------
  var mgrImgReading = false;

  // v18: manager image upload handler (works for add/edit; supports dynamic DOM + multiple files)
  function mgrHandleImgUploadInput(inputEl){
    if(!inputEl) return;
    if(mgrImgReading) return;

    var files = [];
    try{
      var fl = (inputEl && inputEl.files) ? inputEl.files : null;
      if(fl && typeof fl.length === "number"){
        for(var k=0;k<fl.length;k++) files.push(fl[k]);
      }
    }catch(e){ files = []; }

    try{ if($("mgrProdImgStatus")) $("mgrProdImgStatus").textContent = (files.length ? ("נבחרו " + files.length + " קבצים…") : ""); }catch(e){}

    if(!files.length){
      // Android/WebView fallback: sometimes files are populated shortly after the change event
      try{
        var tries = 0;
        (function retryRead(){
          tries++;
          var ok = false;
          try{
            ok = inputEl && inputEl.files && typeof inputEl.files.length === "number" && inputEl.files.length > 0;
          }catch(e){ ok = false; }
          if(ok){
            try{ mgrHandleImgUploadInput(inputEl); }catch(e){}
            return;
          }
          if(tries < 15){
            setTimeout(retryRead, 80);
          }else{
            try{ if($("mgrProdImgStatus")) $("mgrProdImgStatus").textContent = ""; }catch(e){}
          }
        })();
      }catch(e){}
      return;
    }

    // helper: convert file -> dataURL (robust across WebView implementations)
    function fileToDataURL(file, cb){
      cb = cb || function(){};
      if(!file){ cb(""); return; }
      try{
        if(file.type && !String(file.type).match(/^image\//)){
          cb(""); return;
        }
      }catch(e){}
      // compress a dataURL to reduce localStorage usage (prevents quota issues on mobile WebView)
      function compressDataURL(dataUrl, done){
        done = done || function(){};
        dataUrl = String(dataUrl||"");
        if(!dataUrl){ done(""); return; }

        // if already small, keep as-is
        try{
          if(dataUrl.length < 250000){ done(dataUrl); return; }
        }catch(e){}

        try{
          var img2 = new Image();
          img2.onload = function(){
            try{
              var w2 = img2.naturalWidth || img2.width || 0;
              var h2 = img2.naturalHeight || img2.height || 0;
              if(!w2 || !h2){ done(dataUrl); return; }
              var maxDim2 = 900;
              var sc2 = Math.min(1, maxDim2 / Math.max(w2, h2));
              var cw2 = Math.max(1, Math.round(w2 * sc2));
              var ch2 = Math.max(1, Math.round(h2 * sc2));
              var c2 = document.createElement("canvas");
              c2.width = cw2; c2.height = ch2;
              var cx2 = c2.getContext("2d");
              if(!cx2){ done(dataUrl); return; }
              try{ cx2.imageSmoothingEnabled = true; }catch(e){}
              try{ cx2.imageSmoothingQuality = "high"; }catch(e){}
              cx2.drawImage(img2, 0, 0, cw2, ch2);
              var out2 = "";
              try{ out2 = c2.toDataURL("image/jpeg", 0.75); }catch(e){ out2 = ""; }
              done(out2 ? String(out2) : dataUrl);
            }catch(e){
              done(dataUrl);
            }
          };
          img2.onerror = function(){ done(dataUrl); };
          img2.src = dataUrl;
        }catch(e){
          done(dataUrl);
        }
      }



      // 1) try FileReader.readAsDataURL (fast path)
      try{
        var fr = new FileReader();
        fr.onload = function(ev){
          var data = "";
          try{ data = (ev && ev.target) ? ev.target.result : ""; }catch(e){}
          compressDataURL((data ? String(data) : ""), function(out){ cb(out ? String(out) : ""); });
        };
        fr.onerror = function(){
          // fall through to canvas route
          tryCanvas();
        };
        fr.readAsDataURL(file);
        return;
      }catch(e){
        // fall through to canvas route
      }

      // 2) canvas route via objectURL (works in some WebViews where FileReader is flaky)
      function tryCanvas(){
        var url = "";
        try{ url = (window.URL && URL.createObjectURL) ? URL.createObjectURL(file) : ""; }catch(e){ url = ""; }
        if(!url){ cb(""); return; }

        var img = new Image();
        img.onload = function(){
          try{
            var w = img.naturalWidth || img.width || 0;
            var h = img.naturalHeight || img.height || 0;
            if(!w || !h){
              try{ URL.revokeObjectURL(url); }catch(e){}
              cb("");
              return;
            }
            var maxDim = 900;
            var scale = Math.min(1, maxDim / Math.max(w, h));
            var cw = Math.max(1, Math.round(w * scale));
            var ch = Math.max(1, Math.round(h * scale));

            var c = document.createElement("canvas");
            c.width = cw; c.height = ch;
            var ctx = c.getContext("2d");
            ctx.drawImage(img, 0, 0, cw, ch);

            var out = "";
            try{
              out = c.toDataURL("image/jpeg", 0.75);
            }catch(e){
              try{ out = c.toDataURL(); }catch(e2){ out = ""; }
            }

            try{ URL.revokeObjectURL(url); }catch(e){}
            cb(out ? String(out) : "");
          }catch(e){
            try{ URL.revokeObjectURL(url); }catch(e2){}
            cb("");
          }
        };
        img.onerror = function(){
          try{ URL.revokeObjectURL(url); }catch(e){}
          cb("");
        };
        img.src = url;
      }
    }

    var existing = [];
    try{ existing = mgrGetImgListFromForm(); }catch(e){ existing = []; }

    mgrImgReading = true;
    try{
      if($("mgrProdImgStatus")) $("mgrProdImgStatus").textContent = "טוען תמונות…";
    }catch(e){}

    var added = [];

    function next(i){
      if(i >= files.length){
        mgrImgReading = false;
        try{ inputEl.value = ""; }catch(e){}
        try{ if($("mgrProdImgStatus")) $("mgrProdImgStatus").textContent = (added && added.length) ? ("נטענו " + added.length + " תמונות") : ""; }catch(e){}

        // only update if we actually loaded something
        if(added.length){
          try{ mgrSetImgListToForm(existing.concat(added)); }catch(e){}
          try{ if(typeof toast === "function") toast(added.length>1 ? ("נטענו " + added.length + " תמונות") : "תמונה נטענה"); }catch(e){}
        }else{
          // keep existing, just show a clear message
          try{ if(typeof toast === "function") toast("לא הצלחתי לטעון את התמונה במכשיר הזה"); }catch(e){}
        }

        try{ if($("mgrProdImgStatus")) $("mgrProdImgStatus").textContent = ""; }catch(e){}
        try{ inputEl.value = ""; }catch(e){}
        return;
      }

      var f = files[i] || null;

      // hard timeout guard: some WebViews never fire FileReader/Image events
      var __done = false;
      var __tm = setTimeout(function(){
        if(__done) return;
        __done = true;
        try{ if($("mgrProdImgStatus")) $("mgrProdImgStatus").textContent = "טעינה איטית..."; }catch(e){}
        next(i+1);
      }, 8000);

      fileToDataURL(f, function(data){
        if(__done) return;
        __done = true;
        try{ clearTimeout(__tm); }catch(e){}
        if(data) added.push(String(data||""));
        next(i+1);
      });
    }

    next(0);
  }

  // delegated binding: works even if the product modal HTML is injected after login
  if(!window.__mgrImgUploadDelegated){
    window.__mgrImgUploadDelegated = true;
    document.addEventListener("change", function(ev){
      var t = ev && ev.target ? ev.target : null;
      if(!t) return;
      if(t.id === "mgrProdImgFile"){
        mgrHandleImgUploadInput(t);
      }
    });
    document.addEventListener("input", function(ev){
      var t = ev && ev.target ? ev.target : null;
      if(!t) return;
      if(t.id === "mgrProdImgFile"){
        mgrHandleImgUploadInput(t);
      }
    });
  }


  function mgrUpdateImgPreview(){
  var img = $("mgrProdImgPreview");
  if(!img) return;

  var list = mgrGetImgListFromForm();
  var first = normStr((list && list.length ? list[0] : "") || "");

  if(first){
    img.src = first;
    img.style.display = "block";
  }else{
    img.removeAttribute("src");
    img.style.display = "none";
  }

  // update choose button label
  var _chooseBtn = $("mgrProdImgChooseBtn");
  if(_chooseBtn){
    _chooseBtn.textContent = (list && list.length ? "הוסף תמונה" : "העלה תמונה");
  }

  // thumbnails (only if more than 1 image)
  var imgBox = img.closest ? img.closest(".mgr-imgbox") : null;
  var anchor = (imgBox && imgBox.parentElement) ? imgBox.parentElement : img.parentElement;
  if(!anchor) return;

  var thumbs = $("mgrProdImgThumbs");
  if(!thumbs){
    thumbs = document.createElement("div");
    thumbs.id = "mgrProdImgThumbs";
    thumbs.className = "mgr-imgthumbs";
    if(imgBox && imgBox.parentNode){
      imgBox.parentNode.insertBefore(thumbs, imgBox.nextSibling);
    }else{
      anchor.appendChild(thumbs);
    }
  }

  thumbs.innerHTML = "";

  if(!list || list.length <= 1){
    thumbs.style.display = "none";
    return;
  }

  thumbs.style.display = "flex";

  list.forEach(function(src, idx){
    src = normStr(src || "");
    if(!src) return;

    var b = document.createElement("button");
    b.type = "button";
    b.className = "mgr-imgthumb" + (idx === 0 ? " active" : "");
    b.style.backgroundImage = 'url("' + src.replace(/"/g, '\\"') + '")';
    b.setAttribute("aria-label", "תמונה " + (idx+1));

    b.addEventListener("click", function(){
      var l = mgrGetImgListFromForm();
      if(!l || !l[idx]) return;
      var picked = l[idx];
      l.splice(idx, 1);
      l.unshift(picked);
      mgrSetImgListToForm(l);
      mgrUpdateImgPreview();
    });

    thumbs.appendChild(b);
  });
}

  function mgrGetImgListFromForm(){
    var s = normStr((($("mgrProdImgs")||{}).value) || "");
    if(s){
      try{
        var a = JSON.parse(s);
        if(Array.isArray(a)) return a.map(function(x){return normStr(x);}).filter(Boolean);
      }catch(e){}
    }
    var one = normStr((($("mgrProdImg")||{}).value) || "");
    return one ? [one] : [];
  }
  function mgrSetImgListToForm(arr){
    arr = (arr||[]).map(function(x){return normStr(x);}).filter(Boolean);
    var seen = {};
    var out = [];
    for(var i=0;i<arr.length;i++){
      var v = arr[i];
      if(!v) continue;
      if(seen[v]) continue;
      seen[v]=1;
      out.push(v);
    }
    try{ if($("mgrProdImgs")) $("mgrProdImgs").value = out.length ? JSON.stringify(out) : ""; }catch(e){}
    try{ if($("mgrProdImg")) $("mgrProdImg").value = out[0] || ""; }catch(e){}
    mgrUpdateImgPreview();
  }

  function mgrRemoveSelectedMgrImage(){
    // Selected image is always the FIRST one in the list (idx 0),
    // because tapping a thumbnail moves it to the front.
    var l = mgrGetImgListFromForm();
    if(!l || !l.length){
      try{ if($("mgrProdImg")) $("mgrProdImg").value = ""; }catch(e){}
      try{ if($("mgrProdImgs")) $("mgrProdImgs").value = ""; }catch(e){}
      try{ if($("mgrProdImgFile")) $("mgrProdImgFile").value = ""; }catch(e){}
      if($("mgrProdImgStatus")) $("mgrProdImgStatus").textContent = "";
      mgrUpdateImgPreview();
      return;
    }

    if(l.length <= 1){
      mgrSetImgListToForm([]);
    }else{
      // remove ONLY the selected (first) image
      l.splice(0, 1);
      mgrSetImgListToForm(l);
    }

    // reset file input so user can pick again
    try{ if($("mgrProdImgFile")) $("mgrProdImgFile").value = ""; }catch(e){}
    if($("mgrProdImgStatus")) $("mgrProdImgStatus").textContent = "";
    mgrUpdateImgPreview();
  }

function mgrFillProdForm(prod){
    prod = prod || {};
    if($("mgrProdId")) $("mgrProdId").value = normStr(prod.id);
    if($("mgrProdCat")) $("mgrProdCat").value = normStr(prod.category || "helmets") || "helmets";
    if($("mgrProdName")) $("mgrProdName").value = normStr(prod.name);
    if($("mgrProdPrice")) $("mgrProdPrice").value = normStr(prod.price);
    if($("mgrProdAvail")) $("mgrProdAvail").value = normStr(prod.availability || "in_stock") || "in_stock";
    if($("mgrProdEta")) $("mgrProdEta").value = normStr(prod.eta_days);
    if($("mgrProdImg")) $("mgrProdImg").value = normStr(prod.image);
    
    try{
      var _imgs = [];
if(Array.isArray(prod.images)) _imgs = prod.images;
else if(Array.isArray(prod.imgs)) _imgs = prod.imgs;
else if(normStr(prod.img)) _imgs = [prod.img];
else if(normStr(prod.image)) _imgs = [prod.image];
_imgs = (_imgs||[]).map(function(x){return normStr(x);}).filter(Boolean);
if($("mgrProdImgs")) $("mgrProdImgs").value = _imgs.length ? JSON.stringify(_imgs) : "";
try{ if($("mgrProdImg")) $("mgrProdImg").value = _imgs[0] || ""; }catch(e){}
    }catch(e){}
if($("mgrProdImgFile")) $("mgrProdImgFile").value = "";
    mgrUpdateImgPreview();
    if($("mgrProdDesc")) $("mgrProdDesc").value = normStr(prod.desc);
    if ($("mgrProdColors")) $("mgrProdColors").value = (Array.isArray(prod.colors) ? prod.colors.join(", ") : normStr(prod.colors));
    if ($("mgrProdSizes")) $("mgrProdSizes").value = (Array.isArray(prod.sizes) ? prod.sizes.join(", ") : normStr(prod.sizes));

    // bikes_used extra fields
    if($("mgrBikeCompany")) $("mgrBikeCompany").value = normStr(prod.bike_company || prod.bikeCompany || prod.bike_brand || prod.company || "");
    if($("mgrBikeType")) $("mgrBikeType").value = normStr(prod.bike_type || prod.bikeType || prod.bike_kind || "");
    if($("mgrBikeCC")) $("mgrBikeCC").value = normStr(prod.engine_cc || prod.engineCC || prod.cc || "");
    if($("mgrBikeLicense")) $("mgrBikeLicense").value = normStr(prod.license_required || prod.license || "");
    if($("mgrBikeYear")) $("mgrBikeYear").value = normStr(prod.onroad_year || prod.onRoadYear || prod.year || "");
    if($("mgrBikeKM")) $("mgrBikeKM").value = normStr(prod.bike_km || prod.km || prod.mileage || prod.odometer_km || "");
    if($("mgrBikeHand")) $("mgrBikeHand").value = normStr(prod.hand || prod.owner_hand || "");
    if($("mgrBikeCond")) $("mgrBikeCond").value = normStr(prod.condition || prod.cond || "");
    if($("mgrBikeTestUntil")) $("mgrBikeTestUntil").value = normStr(prod.test_until || prod.testUntil || "");
    if($("mgrBikeGeneral")) $("mgrBikeGeneral").value = normStr(prod.general_details || prod.bike_details || prod.desc || "");
    try{ if(typeof mgrApplyCategoryUI === "function") mgrApplyCategoryUI(); }catch(e){}
    mgrSyncSizesPickText();
}
  function mgrClearProdForm(){ try{ window.__MGR_EDIT_ORIG_ID = ""; }catch(e){} mgrFillProdForm({}); }

function mgrIsUsedBikeCat(cat){
    cat = normStr(cat).toLowerCase();
    if(cat === "bikes_used" || cat === "bike") return true;
    try{ if(typeof normalizeShopCategory === "function" && normalizeShopCategory(cat) === "bike") return true; }catch(e){}
    return false;
  }

function mgrApplyCategoryUI(){
    var cat = normStr((($("mgrProdCat")||{}).value) || "");
    var isUsed = mgrIsUsedBikeCat(cat);

    function showRow(el, show){
      try{
        if(!el) return;
        var row = null;
        try{ row = el.closest ? el.closest(".mgr-row-dark") : null; }catch(e){ row = null; }
        if(!row) row = el.parentElement;
        if(row) row.style.display = show ? "" : "none";
        else el.style.display = show ? "" : "none";
      }catch(e){}
    }

    // For used bikes: no ID/Name inputs, no "order only" controls, no sizes/colors/desc.
    try{ var idEl = $("mgrProdId"); if(idEl) idEl.style.display = isUsed ? "none" : ""; }catch(e){}
    try{ var nmEl = $("mgrProdName"); if(nmEl) nmEl.style.display = isUsed ? "none" : ""; }catch(e){}
    try{ var pr = $("mgrProdPrice"); if(pr) pr.style.display = ""; }catch(e){}

    showRow($("mgrProdAvail"), !isUsed);
    showRow($("mgrProdEta"), !isUsed);
    showRow($("mgrProdDesc"), !isUsed);
    showRow($("mgrProdColors"), !isUsed);

    try{
      var box = $("mgrBikeUsedFields");
      if(box) box.style.display = isUsed ? "" : "none";
    }catch(e){}

    try{
      if(isUsed){
        if($("mgrProdAvail")) $("mgrProdAvail").value = "in_stock";
        if($("mgrProdEta")) $("mgrProdEta").value = "";
      }
    }catch(e){}
  }

  // bind once
  try{
    var catEl = $("mgrProdCat");
    if(catEl && !catEl.__bikeUiBound){
      catEl.addEventListener("change", function(){ try{ mgrApplyCategoryUI(); }catch(e){} }, {passive:true});
      catEl.__bikeUiBound = true;
    }
  }catch(e){}

  // ===== Sizes picker (checkbox modal) =====
  function mgrParseCommaList(s){
    s = normStr(s);
    if(!s) return [];
    return s.split(",").map(function(x){ return normStr(x).toUpperCase(); }).filter(Boolean);
  }
  
  // Manager scroll lock (prevents background scrolling behind modals)
  var mgrScrollLockCount = 0;
  var mgrScrollLockY = 0;

  function mgrLockScroll(){
    try{
      mgrScrollLockCount++;
      if(mgrScrollLockCount !== 1) return;

      // Lock manager list scroll (prevents background scroll behind modal)
      try{
        var ov = $("managerOverlay");
        if(ov){
          ov.classList.add("mgr-modal-open");
          var full = ov.querySelector(".mgr-full");
          if(full){
            if(full.getAttribute("data-prev-overflow") === null) full.setAttribute("data-prev-overflow", full.style.overflow || "");
            if(full.getAttribute("data-prev-overscroll") === null) full.setAttribute("data-prev-overscroll", full.style.overscrollBehavior || "");
            if(full.getAttribute("data-prev-touch") === null) full.setAttribute("data-prev-touch", full.style.touchAction || "");
            full.style.overflow = "hidden";
            full.style.overscrollBehavior = "contain";
            full.style.touchAction = "none";
          }
        }
      }catch(e){}

      // Avoid body position:fixed inside manager (prevents keyboard open/close flicker on Android)
      if(document.body.classList.contains("manager-open")) return;

      mgrScrollLockY = window.scrollY || window.pageYOffset || 0;
      document.body.style.position = "fixed";
      document.body.style.top = (-mgrScrollLockY) + "px";
      document.body.style.left = "0";
      document.body.style.right = "0";
      document.body.style.width = "100%";
      document.body.setAttribute("data-bodylock","1");
    }catch(e){}
  }

  function mgrUnlockScroll(){
    try{
      mgrScrollLockCount = Math.max(0, (mgrScrollLockCount||0) - 1);
      if(mgrScrollLockCount !== 0) return;

      // Restore manager list scroll
      try{
        var ov = $("managerOverlay");
        if(ov){
          ov.classList.remove("mgr-modal-open");
          var full = ov.querySelector(".mgr-full");
          if(full){
            var po = full.getAttribute("data-prev-overflow");
            var ps = full.getAttribute("data-prev-overscroll");
            var pt = full.getAttribute("data-prev-touch");
            if(po !== null){ full.style.overflow = po; full.removeAttribute("data-prev-overflow"); }
            if(ps !== null){ full.style.overscrollBehavior = ps; full.removeAttribute("data-prev-overscroll"); }
            if(pt !== null){ full.style.touchAction = pt; full.removeAttribute("data-prev-touch"); }
          }
        }
      }catch(e){}

      // Restore body scroll only if we actually locked it
      if(document.body.getAttribute("data-bodylock") !== "1") return;
      document.body.removeAttribute("data-bodylock");

      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.left = "";
      document.body.style.right = "";
      document.body.style.width = "";
      window.scrollTo(0, mgrScrollLockY || 0);
    }catch(e){}
  }

function mgrSyncSizesPickText(){
    var v = "";
    try{ v = $("mgrProdSizes") ? normStr($("mgrProdSizes").value) : ""; }catch(e){}
    var txt = $("mgrProdSizesPickText");
    if(!txt) return;
    if(!v){ txt.textContent = "מידות"; return; }
    txt.textContent = v;
  }
  function mgrToggleSizesInline(){
    var box = $("mgrSizesInline");
    if(!box) return;
    var open = (box.getAttribute("aria-hidden") === "false");
    if(open){
      box.setAttribute("aria-hidden","true");
      return;
    }
    // sync chips from hidden input
    var cur = mgrParseCommaList($("mgrProdSizes") ? $("mgrProdSizes").value : "");
    var grid = $("mgrSizesInlineGrid");
    if(grid){
      var chips = grid.querySelectorAll(".mgr-size-chip");
      chips.forEach(function(btn){
        var v = normStr(btn.getAttribute("data-size")).toUpperCase();
        if(!v) return;
        if(cur.indexOf(v) !== -1) btn.classList.add("on");
        else btn.classList.remove("on");
      });
    }
    box.setAttribute("aria-hidden","false");
  }

  function mgrRebuildSizesFromInline(){
    var grid = $("mgrSizesInlineGrid");
    if(!grid) return;
    var chosen = [];
    var chips = grid.querySelectorAll(".mgr-size-chip.on");
    chips.forEach(function(btn){
      var v = normStr(btn.getAttribute("data-size")).toUpperCase();
      if(v) chosen.push(v);
    });
    if($("mgrProdSizes")) $("mgrProdSizes").value = chosen.join(", ");
    mgrSyncSizesPickText();
  }

  function mgrBindInlineSizes(){
    var grid = $("mgrSizesInlineGrid");
    if(!grid) return;
    if(grid.getAttribute("data-bound") === "1") return;
    grid.setAttribute("data-bound","1");
    var chips = grid.querySelectorAll(".mgr-size-chip");
    chips.forEach(function(btn){
      bindReleaseTap(btn, function(){
        try{
          btn.classList.toggle("on");
          mgrRebuildSizesFromInline();
        }catch(e){}
      });
    });
  }
  function mgrArmClickShield(ms){
    try{
      ms = Math.max(0, Number(ms||0));
      var until = Date.now() + ms;
      window.__MGR_CLICK_SHIELD_UNTIL = until;

      if(window.__MGR_CLICK_SHIELD_ON){
        return;
      }
      window.__MGR_CLICK_SHIELD_ON = true;

      var optsTouch = {capture:true, passive:false};

      var handler = function(ev){
        try{
          if(Date.now() <= (window.__MGR_CLICK_SHIELD_UNTIL||0)){
            try{ if(ev && ev.preventDefault) ev.preventDefault(); }catch(_){}
            try{ if(ev && ev.stopPropagation) ev.stopPropagation(); }catch(_){}
            try{ if(ev && ev.stopImmediatePropagation) ev.stopImmediatePropagation(); }catch(_){}
            return false;
          }
        }catch(_e){}
        cleanup();
      };

      var cleanup = function(){
        if(!window.__MGR_CLICK_SHIELD_ON) return;
        window.__MGR_CLICK_SHIELD_ON = false;
        try{ document.removeEventListener("click", handler, true); }catch(_){}
        try{ document.removeEventListener("mouseup", handler, true); }catch(_){}
        try{ document.removeEventListener("pointerup", handler, true); }catch(_){}
        try{ document.removeEventListener("touchend", handler, optsTouch); }catch(_){}
      };

      try{ document.addEventListener("click", handler, true); }catch(_){}
      try{ document.addEventListener("mouseup", handler, true); }catch(_){}
      try{ document.addEventListener("pointerup", handler, true); }catch(_){}
      try{ document.addEventListener("touchend", handler, optsTouch); }catch(_){}
      window.setTimeout(cleanup, ms + 80);
    }catch(e){}
  }


  function mgrOpenProductModal(title){
    mgrLockScroll();
    var m = $("mgrProductModal");
    if(!m) return;
    if($("mgrProductModalTitle")) $("mgrProductModalTitle").textContent = title || "מוצר";
    m.setAttribute("aria-hidden","false");

    // Block any synthetic click released from the previous screen (mobile)
    try{ mgrArmClickShield(800); }catch(e){}

    // Absorb the synthetic click after touchend: keep modal content non-interactive briefly
    try{
      window.clearTimeout(window.__MGR_PM_OPEN_TO__);
      m.classList.add("opening");
      window.__MGR_PM_OPEN_TO__ = window.setTimeout(function(){
        try{ m.classList.remove("opening"); }catch(e){}
      }, 650);
    }catch(e){}
  }
  function mgrCloseProductModal(ev){
    // Prevent "click-through" to elements behind the modal on mobile
    try{
      if(ev){
        ev.preventDefault();
        ev.stopPropagation();
        if(ev.stopImmediatePropagation) ev.stopImmediatePropagation();
      }
    }catch(e){}
    var m = $("mgrProductModal");
    try{ window.clearTimeout(window.__MGR_PM_OPEN_TO__); }catch(e){}
    try{ m && m.classList && m.classList.remove("opening"); }catch(e){}
    if(!m){
      mgrUnlockScroll();
      return;
    }

    // Keep the modal briefly (transparent) to absorb the synthetic click after touchend
    try{ m.classList.add("closing"); }catch(e){}
    try{ m.setAttribute("aria-hidden","false"); }catch(e){}

    window.clearTimeout(window.__MGR_CLOSE_PM_TO__);
    window.__MGR_CLOSE_PM_TO__ = window.setTimeout(function(){
      try{ m.setAttribute("aria-hidden","true"); }catch(e){}
      try{ m.classList.remove("closing"); }catch(e){}
      mgrUnlockScroll();
    }, 450);
  }

  function mgrFindRawProductById(id){
    id = normStr(id);
    if(!id) return null;
    var arr = readProducts();
    for(var i=0;i<arr.length;i++){
      var it = arr[i] || {};
      if(normStr(it.id) === id) return it;
    }
    return null;
  }

  // Exposed for shop details edit buttons
  window.mgrOpenProductEditor = function(id, focus){
    var raw = mgrFindRawProductById(id);
    if(raw) mgrFillProdForm(raw);
    else mgrClearProdForm();

    // track original ID for edit/save
    try{ window.__MGR_EDIT_ORIG_ID = raw ? normStr(raw.id) : ""; }catch(e){ window.__MGR_EDIT_ORIG_ID = ""; }

    // allow editing ID
    try{
      var idEl = $("mgrProdId");
      if(idEl){
        idEl.readOnly = false;
        idEl.disabled = false;
        idEl.style.opacity = "1";
      }
    }catch(e){}
mgrOpenProductModal(raw ? "עריכת מוצר" : "הוספת מוצר");
    try{ if(typeof mgrApplyCategoryUI === "function") mgrApplyCategoryUI(); }catch(e){}
    /* autofocus disabled: do not open keyboard automatically when opening edit/add product */
};

  window.mgrOpenProductAdder = function(normCat, avail){
    mgrClearProdForm();
    try{
      var storageCat = toStorageCat(normCat);
      if($("mgrProdCat")) $("mgrProdCat").value = storageCat;

      var isUsed = (String(storageCat).toLowerCase() === "bikes_used");
      if($("mgrProdAvail")){
        $("mgrProdAvail").value = isUsed ? "in_stock" : (avail==="order_only" ? "order_only" : "in_stock");
      }

      var idEl = $("mgrProdId");
      if(idEl){
        idEl.readOnly = false;
        idEl.disabled = false;
        idEl.style.opacity = "1";
      }
    }catch(e){}
    mgrOpenProductModal("הוספת מוצר");
    try{ if(typeof mgrApplyCategoryUI === "function") mgrApplyCategoryUI(); }catch(e){}
    /* autofocus disabled: do not open keyboard automatically when opening add product */
};

  function mgrSaveProduct(){
    var cat = normStr((($("mgrProdCat")||{}).value) || "helmets");
    var isUsed = mgrIsUsedBikeCat(cat);

    var id = "";
    if(isUsed){
      id = normStr((($("mgrBikeType")||{}).value) || "");
      if(!id){
        try{ if(typeof toast === "function") toast("חובה סוג אופנוע"); }catch(e){} return;
      }
    }else{
      id = normStr((($("mgrProdId")||{}).value) || "");
      if(!id){
        try{ if(typeof toast === "function") toast("חובה ID"); }catch(e){} return;
      }
    }
    if(mgrImgReading){ try{ if(typeof toast === "function") toast("טוען תמונה..."); }catch(e){} return; }

    var prod = {
      id: id,
      category: cat,
      name: normStr(($("mgrProdName")||{}).value || ""),
      price: moneyStr(($("mgrProdPrice")||{}).value || ""),
      availability: normStr(($("mgrProdAvail")||{}).value || "in_stock"),
      eta_days: normStr(($("mgrProdEta")||{}).value || ""),
      images: (function(){
        var a = [];
        try{ a = mgrGetImgListFromForm(); }catch(e){ a=[]; }
        return a;
      })(),
      // backward compatibility: some renderers expect single image field
      image: (function(){
        var a = [];
        try{ a = mgrGetImgListFromForm(); }catch(e){ a=[]; }
        if(a && a.length) return normStr(a[0]);
        return normStr((($("mgrProdImg")||{}).value) || "");
      })(),
      img: (function(){
        var a = [];
        try{ a = mgrGetImgListFromForm(); }catch(e){ a=[]; }
        return (a && a.length) ? normStr(a[0]) : normStr((($("mgrProdImg")||{}).value) || "");
      })(),
      desc: normStr(($("mgrProdDesc")||{}).value || ""),
      colors: parseCsv((($("mgrProdColors")||{}).value || "")),
      sizes: parseCsv((($("mgrProdSizes")||{}).value || ""))
    }

    // bikes_used custom fields
    try{
      if(mgrIsUsedBikeCat(prod.category)){
        prod.noCart = true;
        prod.availability = "in_stock";
        prod.eta_days = "";
        prod.colors = [];
        prod.sizes = [];
        prod.bike_company = normStr((($("mgrBikeCompany")||{}).value) || "");
        prod.bike_type = normStr((($("mgrBikeType")||{}).value) || "");
        if(!normStr(prod.id)) prod.id = normStr(prod.bike_type || "");
        prod.name = prod.bike_type || prod.name || "אופנוע יד2";
        prod.inStock = true;
        prod.engine_cc = normStr((($("mgrBikeCC")||{}).value) || "");
        prod.license_required = normStr((($("mgrBikeLicense")||{}).value) || "");
        prod.onroad_year = normStr((($("mgrBikeYear")||{}).value) || "");
        prod.bike_km = normStr((($("mgrBikeKM")||{}).value) || "");
        prod.km = prod.bike_km;
        prod.hand = normStr((($("mgrBikeHand")||{}).value) || "");
        prod.condition = normStr((($("mgrBikeCond")||{}).value) || "");
        prod.test_until = normStr((($("mgrBikeTestUntil")||{}).value) || "");
        var _gd = normStr((($("mgrBikeGeneral")||{}).value) || "");
        prod.general_details = _gd;
        prod.desc = "";
      }
    }catch(e){}
;

    var origId = "";
try{ origId = normStr(window.__MGR_EDIT_ORIG_ID || ""); }catch(e){ origId = ""; }

var arr = readProducts();
var found = false;
var targetId = origId ? origId : id;

// allow duplicate IDs (no collision blocking)
for(var i=0;i<arr.length;i++){
  if(normStr((arr[i]||{}).id) === targetId){
    arr[i] = Object.assign({}, arr[i]||{}, prod);
    found = true;
    break;
  }
}
if(!found) arr.unshift(prod);

// if ID changed, remove any leftover old entry and update cart references
if(origId && origId !== id){
  // remove duplicates of new id that might exist (safety)
  var cleaned = [];
  var seen = {};
  for(var k=0;k<arr.length;k++){
    var pid = normStr((arr[k]||{}).id);
    if(!pid) continue;
    if(seen[pid]) continue;
    seen[pid] = true;
    cleaned.push(arr[k]);
  }
  arr = cleaned;

  try{
    var cart = readCart();
    var changed = false;
    for(var c=0;c<cart.length;c++){
      if(String(cart[c].id) === String(origId)){
        cart[c].id = id;
        changed = true;
      }
    }
    if(changed) writeCart(cart);
  }catch(e){}
}

if(!writeProducts(arr)) return;
try{ window.__MGR_EDIT_ORIG_ID = ""; }catch(e){}


    // refresh catalogs everywhere
    try{ if(typeof renderShopCatalogs === "function") renderShopCatalogs(); }catch(e){}
    try{ mgrRenderShopLists(); }catch(e){}

    try{ if(typeof toast === "function") toast(found ? "עודכן" : "נוסף"); }catch(e){}
    mgrCloseProductModal();
  }

  function mgrDeleteProduct(id){
  id = normStr(id);
  if(!id) return;

  var arr = readProducts();
  var out = [];
  var removed = false;
  for(var i=0;i<arr.length;i++){
    var it = arr[i] || {};
    if(normStr(it.id) === id){ removed = true; continue; }
    out.push(it);
  }
  if(!removed){
    try{ if(typeof toast === "function") toast("לא נמצא"); }catch(e){}
    return;
  }

  if(!writeProducts(out)) return;

  // remove from cart (if exists)
  try{
    var cart = readCart();
    var c2 = [];
    for(var j=0;j<cart.length;j++){
      if(String(cart[j].id) === String(id)) continue;
      c2.push(cart[j]);
    }
    writeCart(c2);
  }catch(e){}

  // refresh
  try{ if(typeof renderShopCatalogs === "function") renderShopCatalogs(); }catch(e){}
  try{ mgrRenderShopLists(); }catch(e){}
  try{ if(typeof renderShopCart === "function") renderShopCart(); }catch(e){}

  try{ if(typeof toast === "function") toast("נמחק"); }catch(e){}
}

// expose manager product actions for inline fallbacks (Android WebView can drop event listeners)
  try{
    if(!window.mgrSaveProduct) window.mgrSaveProduct = mgrSaveProduct;
    if(!window.mgrClearProdForm) window.mgrClearProdForm = mgrClearProdForm;
    if(!window.mgrCloseProductModal) window.mgrCloseProductModal = mgrCloseProductModal;
    if(!window.mgrDeleteProduct) window.mgrDeleteProduct = mgrDeleteProduct;
  }catch(e){}



  // -------- Shop view rendering (reuses renderShopCatalogs) --------
  function mgrSetShopCategory(normCat){
    var inEl = $("mgrShopListIn");
    var orderEl = $("mgrShopListOrder");
    if(inEl){
      inEl.setAttribute("data-shop-list", normCat);
      inEl.setAttribute("data-shop-section", "in");
    }
    if(orderEl){
      orderEl.setAttribute("data-shop-list", normCat);
      orderEl.setAttribute("data-shop-section", "order");
    }
  }
  function mgrRenderShopLists(){
    var sel = $("mgrShopCatSel");
    var cat = sel ? String(sel.value||"helmet") : "helmet";
    mgrSetShopCategory(cat);

    // Used bikes: no "order only" section in manager
    try{
      var isUsed = (String(cat||"").toLowerCase() === "bike");
      var sec = document.getElementById("mgrOrderOnlySection");
      if(!sec){
        var list = document.getElementById("mgrShopListOrder");
        if(list && list.closest) sec = list.closest(".mgr-shop-section");
      }
      if(sec) sec.style.display = isUsed ? "none" : "";
    }catch(e){}
    if(typeof renderShopCatalogs === "function"){
      renderShopCatalogs();
    }else{
      // fallback: simple render
      try{
        var prods = (typeof getProducts === "function") ? getProducts() : [];
        var inRows = [], orRows = [];
        for(var i=0;i<prods.length;i++){
          var p = prods[i] || {};
          if(normalizeShopCategory(p.category) !== normalizeShopCategory(cat)) continue;
          var card = (typeof buildShopProductCard === "function") ? buildShopProductCard(p, (cat==="bike"||cat==="bike_new")) : "";
          if(p.inStock) inRows.push(card); else orRows.push(card);
        }
        if($("mgrShopListIn")) $("mgrShopListIn").innerHTML = inRows.length ? inRows.join("") : '<div class="shop-mini" style="text-align:center;">אין מוצרים להצגה</div>';
        if($("mgrShopListOrder")) $("mgrShopListOrder").innerHTML = orRows.length ? orRows.join("") : '<div class="shop-mini" style="text-align:center;">אין מוצרים להצגה</div>';
      }catch(e){}
    }
  }
  try{ window.mgrRenderShopLists = mgrRenderShopLists; }catch(e){}

  // -------- Students view --------
  function getAllStudentKeys(){
    var out = [];
    try{
      for(var i=0;i<localStorage.length;i++){
        var k = localStorage.key(i);
        if(k && k.indexOf("student_profile_") === 0){
          out.push(k.slice("student_profile_".length));
        }
      }
    }catch(e){}
    return out;
  }

  function getStudentProfile(tz){
    tz = normStr(tz);
    if(!tz) return null;
    try{
      var raw = DBStorage.getItem("student_profile_" + tz);
      var obj = safeParse(raw, null);
      if(obj && typeof obj === "object") return obj;
    }catch(e){}
    return null;
  }

  function setStudentProfile(tz, obj){
    tz = normStr(tz);
    if(!tz) return;
    try{ DBStorage.setItem("student_profile_" + tz, JSON.stringify(obj||{})); }catch(e){}
  }

  function pickStudentName(tz, prof){
    prof = prof || {};
    var n = prof.fullName || prof.fullname || "";
    if(!n){
      var fn = prof.firstName || prof.firstname || prof.fname || "";
      var ln = prof.lastName || prof.lastname || prof.lname || "";
      n = (String(fn||"") + " " + String(ln||"")).trim();
    }
    if(!n && typeof getLoggedFirstName === "function"){ /* noop */ }
    n = normStr(n);
    return n || "—";
  }

  function renderStudentResults(q){
    q = normStr(q).toLowerCase();
    var resEl = $("mgrStudentResults");
    if(!resEl) return;

    // collect tz candidates
    var tzs = {};
    var fromLs = getAllStudentKeys();
    for(var i=0;i<fromLs.length;i++) tzs[fromLs[i]] = true;

    // appUsers keys
    try{
      var raw = DBStorage.getItem("appUsers");
      var users = safeParse(raw, {});
      if(users && typeof users === "object"){
        Object.keys(users).forEach(function(k){ if(k) tzs[String(k)] = true; });
      }
    }catch(e){}

    // students_db_v1.js demo
    try{
      var db = (typeof resolveStudentsDb === "function") ? resolveStudentsDb() : null;
      if(db && typeof db.list === "function"){
        var list = db.list();
        if(Array.isArray(list)){
          for(var j=0;j<list.length;j++){
            var it = list[j] || {};
            var t = normStr(it.tz || it.id || it.username);
            if(t) tzs[t] = true;
          }
        }
      }
    }catch(e){}

    var items = Object.keys(tzs).map(function(tz){
      var prof = getStudentProfile(tz) || {};
      var name = pickStudentName(tz, prof);
      var phone = normStr(prof.phone || prof.mobile || prof.tel || "");
      return {tz: tz, name: name, phone: phone};
    });

    // filter
    if(!q){
      // empty query -> history (do not list all students by default)
      secRenderHistory();
      return;
    }
    items = items.filter(function(it){
      var hay = (it.tz + " " + it.name + " " + it.phone).toLowerCase();
      return hay.indexOf(q) !== -1;
    });

    // sort: name then tz
    items.sort(function(a,b){
      var an = (a.name||"").localeCompare(b.name||"", "he");
      if(an) return an;
      return (a.tz||"").localeCompare(b.tz||"");
    });

    if(!items.length){
      resEl.innerHTML = '<div class="shop-mini" style="text-align:center;opacity:.9;">אין תוצאות</div>';
      return;
    }

    var html = items.slice(0, 80).map(function(it){
      return '' +
        '<div class="mgr-stu-item">' +
          '<div>' +
            '<div class="a">'+esc(it.name)+'</div>' +
            '<div class="b">ת״ז: '+esc(it.tz)+(it.phone?(' · '+esc(it.phone)):'')+'</div>' +
          '</div>' +
          '<button type="button" data-act="openStu" data-tz="'+esc(it.tz)+'">פתח</button>' +
        '</div>';
    }).join("");
    resEl.innerHTML = html;
  }
  try{ window.mgrRenderStudentResults = renderStudentResults; }catch(e){}
  // ===== SECRETARY: Student search on home =====
  
  function secGetHist(){
    try{
      var raw = DBStorage.getItem("secSearchHistory");
      var arr = safeParse(raw, []);
      if(!Array.isArray(arr)) arr = [];
      return arr;
    }catch(e){ return []; }
  }
  function secSaveHist(arr){
    try{ DBStorage.setItem("secSearchHistory", JSON.stringify(arr||[])); }catch(e){}
  }
  function secPushHist(item){
    try{
      if(!item || !item.tz) return;
      var arr = secGetHist();
      var tz = String(item.tz);
      arr = arr.filter(function(x){ return x && String(x.tz) !== tz; });
      arr.unshift({tz: tz, name: item.name||"", phone: item.phone||""});
      if(arr.length>12) arr = arr.slice(0,12);
      secSaveHist(arr);
    }catch(e){}
  }
  function secSetResultsVisible(v){
    var el = $("secStudentResults");
    if(!el) return;
    el.style.display = v ? "block" : "none";
    el.setAttribute("aria-hidden", v ? "false" : "true");
  }
  function secRenderHistory(){
    var resEl = $("secStudentResults");
    if(!resEl) return;
    var hist = secGetHist();
    if(!hist.length){
      resEl.innerHTML = '<div class="shop-mini" style="text-align:center;opacity:.75;">אין היסטוריית חיפוש</div>';
      return;
    }
    var html = '<div class="sec-hist-title">היסטוריית חיפוש</div>' + hist.map(function(it){
      var tz = normStr(it.tz||"");
      var name = normStr(it.name||"") || (pickStudentName(tz, getStudentProfile(tz)||{})||"");
      var phone = normStr(it.phone||"");
      if(!phone){
        try{
          var p = getStudentProfile(tz)||{};
          phone = normStr(p.phone||p.mobile||p.tel||"");
        }catch(e){}
      }
      return '' +
        '<div class="mgr-stu-item">' +
          '<div class="tap" data-act="secOpenStu" data-tz="'+esc(tz)+'" style="flex:1;cursor:pointer;">' +
            '<div class="a">'+esc(name||"")+'</div>' +
            '<div class="b">ת״ז: '+esc(tz)+(phone?(' · '+esc(phone)):'')+'</div>' +
          '</div>' +
        '</div>';
    }).join("");
    resEl.innerHTML = html;
  }

function secretaryFindStudents(q){
    q = normStr(q).toLowerCase();

    // collect tz candidates (same sources as manager)
    var tzs = {};
    var fromLs = getAllStudentKeys();
    for(var i=0;i<fromLs.length;i++) tzs[fromLs[i]] = true;

    try{
      var raw = DBStorage.getItem("appUsers");
      var users = safeParse(raw, {});
      if(users && typeof users === "object"){
        Object.keys(users).forEach(function(k){ if(k) tzs[String(k)] = true; });
      }
    }catch(e){}

    try{
      var db = (typeof resolveStudentsDb === "function") ? resolveStudentsDb() : null;
      if(db && typeof db.list === "function"){
        var list = db.list();
        if(Array.isArray(list)){
          for(var j=0;j<list.length;j++){
            var it = list[j] || {};
            var t = normStr(it.tz || it.id || it.username);
            if(t) tzs[t] = true;
          }
        }
      }
    }catch(e){}

    var items = Object.keys(tzs).map(function(tz){
      var prof = getStudentProfile(tz) || {};
      var name = pickStudentName(tz, prof);
      var phone = normStr(prof.phone || prof.mobile || prof.tel || "");
      return {tz: tz, name: name, phone: phone};
    });

    if(q){
      items = items.filter(function(it){
        var hay = (it.tz + " " + it.name + " " + it.phone).toLowerCase();
        return hay.indexOf(q) !== -1;
      });
    }

    items.sort(function(a,b){
      var an = (a.name||"").localeCompare(b.name||"", "he");
      if(an) return an;
      return (a.tz||"").localeCompare(b.tz||"");
    });

    return items;
  }
  try{ window.secretaryFindStudents = secretaryFindStudents; }catch(e){}

function renderSecretaryStudentResults(q){
    var resEl = $("secStudentResults");
    if(!resEl) return;

    var items = secretaryFindStudents(q);

    if(!items.length){
      resEl.innerHTML = '<div class="shop-mini" style="text-align:center;opacity:.9;">אין תוצאות</div>';
      return;
    }

    var html = items.slice(0, 80).map(function(it){
      return '' +
        '<div class="mgr-stu-item">' +
          '<div class="tap" data-act="secOpenStu" data-tz="'+esc(it.tz)+'" style="flex:1;cursor:pointer;">' +
            '<div class="a">'+esc(it.name)+'</div>' +
            '<div class="b">ת״ז: '+esc(it.tz)+(it.phone?(' · '+esc(it.phone)):'')+'</div>' +
          '</div>' +
        '</div>';
    }).join("");
    resEl.innerHTML = html;
  }
  try{ window.secRenderStudentResults = renderSecretaryStudentResults; }catch(e){}

  function openStudentProfileFromSecretary(tz){
    tz = normStr(tz);
    if(!tz) return;
    try{
      if(typeof normalizeTz === "function") tz = normalizeTz(tz);
      else tz = String(tz).replace(/\D/g,"");
    }catch(e){ tz = normStr(tz); }

    // View-as context for secretary/manager
    try{ window.__profileViewTz = tz; }catch(e){}
    try{
      var p = getStudentProfile(tz) || {};
      secPushHist({tz: tz, name: pickStudentName(tz, p), phone: normStr(p.phone||p.mobile||p.tel||"")});
    }catch(e){}
    try{ if(window.APP_STATE) window.APP_STATE.activeStudentTz = tz; }catch(e){}
    try{ window.__activeStudentTz = tz; }catch(e){}

    // Ensure role is recognized during profile render (so it will use __profileViewTz)
    try{ document.body.classList.add('secretary-mode'); }catch(e){}
    try{
      if(window.APP_STATE){
        if(typeof window.APP_STATE.set === 'function') window.APP_STATE.set({ userRole: 'secretary' });
        else window.APP_STATE.userRole = 'secretary';
      }
    }catch(e){}

    try{ closeMenu(); }catch(e){}
    try{ closeProfileMenu(); }catch(e){}
    try{ closePopup(true); }catch(e){}
    try{ openPage("studentProfilePage", true); }catch(e){}
  }

  function secretarySearchBind(){
    var input = $("secStudentSearch");
    var resEl = $("secStudentResults");
    if(input && !input.__secBound){
      input.__secBound = true;

      // Secretary search uses the real input (no bottom dock)
      try{ input.readOnly = false; }catch(e){}
      try{ input.removeAttribute("readonly"); }catch(e){}
      try{ input.setAttribute("inputmode","search"); }catch(e){}
      try{ input.style.cursor = ""; }catch(e){}

      function __openSecResults(){
        try{ secSetResultsVisible(true); }catch(e){}
        try{ renderSecretaryStudentResults(input.value || ""); }catch(e){}
      }

      // Show history/results only when the user focuses/taps the field
      try{ input.addEventListener("focus", function(){ __openSecResults(); try{ if(window.__setSecretaryBgLock) window.__setSecretaryBgLock(false); }catch(e){} }, true); }catch(e){}
      try{ input.addEventListener("click", function(ev){ try{ ev.stopPropagation(); }catch(_e){} __openSecResults(); }, true); }catch(e){}
      try{ input.addEventListener("pointerdown", function(ev){ try{ ev.stopPropagation(); }catch(_e){} }, true); }catch(e){}
      try{ input.addEventListener("touchstart", function(ev){ try{ ev.stopPropagation(); }catch(_e){} }, {capture:true, passive:true}); }catch(e){}

      input.addEventListener("input", function(){
        try{ secSetResultsVisible(true); }catch(e){}
        try{ renderSecretaryStudentResults(input.value || ""); }catch(e){}
      });

      // Close results and keyboard when tapping outside
      if(!window.__secOutsideCloseBound){
        window.__secOutsideCloseBound = true;
        function __secCloseOutside(ev){
          try{
            var r = $("secStudentResults");
            if(!r || r.style.display === "none") return;
            var w = $("secSearchWrap");
            if(w && w.contains(ev.target)) return;
            try{ if(input) input.blur(); }catch(_e){}
            secSetResultsVisible(false);
          }catch(_e){}
        }
        document.addEventListener("pointerdown", __secCloseOutside, true);
        document.addEventListener("touchstart", __secCloseOutside, {capture:true, passive:true});
      }
    }

    if(resEl && !resEl.__secBound){
      resEl.__secBound = true;
      resEl.addEventListener("mousedown", function(){
        // prevent blur hiding before click
        try{ if(input) input.__secKeepOpen = true; }catch(e){}
      });

      resEl.addEventListener("click", function(ev){
        var t = ev.target;
        // walk up for data-act
        for(var i=0;i<6 && t && t !== resEl;i++){
          if(t.getAttribute){
            var act = t.getAttribute("data-act");
            if(act === "secOpenStu"){
              ev.preventDefault();
              ev.stopPropagation();
              var tz = t.getAttribute("data-tz") || "";
              openStudentProfileFromSecretary(tz);
              return;
            }
          }
          t = t.parentElement;
        }
      });
    }
  }
  try{ window.secretarySearchBind = secretarySearchBind; }catch(e){}


  function openStudentModal(tz){
    tz = normStr(tz);
    if(!tz) return;
    var prof = getStudentProfile(tz) || {};
    // lessonsLeft is read-only and derived from money due
    var computedLeft = null;
    // Remaining lessons: try profile -> registry -> compute total - done
    try{
      var ll = parseFloat(prof.lessonsLeft);
      if(isFinite(ll)) computedLeft = Math.round(ll*2)/2;
    }catch(e){}
    if(computedLeft==null){
      try{
        var st = null;
        try{ st = getStudent(tz) || {}; }catch(e){ st = {}; }
        var raw = readAny(st, ['lessonsLeft','lessons_left','remainingLessons','lessonsRemaining','שיעוריםשנשארו','שיעורים שנותרו','שיעורים שנשארו','יתרת שיעורים']);
        var ll2 = parseFloat(raw);
        if(isFinite(ll2)) computedLeft = Math.round(ll2*2)/2;
      }catch(e){}
    }
    if(computedLeft==null){
      try{
        var st2 = null;
        try{ st2 = getStudent(tz) || {}; }catch(e){ st2 = {}; }
        var totalRaw = readAny(prof, ['lessonsTotal','totalLessons','lessonsPurchased','purchasedLessons','lessonsCount','lessons','כמות שיעורים']);
        if(!isFinite(parseFloat(totalRaw))){
          totalRaw = readAny(st2, ['lessonsTotal','totalLessons','lessonsPurchased','purchasedLessons','lessonsCount','lessons','כמות שיעורים']);
        }
        var total = parseFloat(totalRaw);

        var doneRaw = readAny(prof, ['lessonsDone','lessonsCompleted','doneLessons','completedLessons','lessons_done']);
        var done = parseFloat(doneRaw);
        if(!isFinite(done)){
          try{ done = studentLessonsDone(prof) || studentLessonsDone(st2) || 0; }catch(e){ done = 0; }
        }
        if(isFinite(total) && isFinite(done)){
          var left = total - done;
          if(left < 0) left = 0;
          computedLeft = Math.round(left*2)/2;
        }
      }catch(e){}
    }


var title = $("mgrStudentModalTitle");
    if(title) title.textContent = "תלמיד: " + tz;

    var fields = [
      {k:"ת״ז", key:"tz", v: tz, ro:true},
      {k:"שם", key:"fullName", v: pickStudentName(tz, prof)},
      {k:"טלפון", key:"phone", v: normStr(prof.phone || "")},
      {k:"פרוגרס", key:"progress", v: normStr(prof.progress || prof.prog || prof.progressText || "")},
      {k:"שיעורים שבוצעו", key:"lessonsDone", v: (prof.lessonsDone!=null ? String(prof.lessonsDone) : normStr(prof.completedLessons || ""))},
      {k:"יתרת שיעורים", key:"lessonsLeft", v: (computedLeft!=null ? fmtHalfLesson(computedLeft) : (prof.lessonsLeft!=null ? String(prof.lessonsLeft) : normStr(prof.leftLessons || ""))), ro:true},
      {k:"סוג רישיון", key:"licenseType", v: normStr(prof.licenseType || prof.license || "")},
      {k:"הערה", key:"note", v: normStr(prof.note || prof.notes || "")}
    ];

    var body = $("mgrStudentModalBody");
    if(!body) return;

    body.innerHTML = fields.map(function(f){
      var v = (f.v==null || f.v==="") ? "—" : String(f.v);
      return '' +
        '<div class="mgr-stu-row" data-row="'+esc(f.key)+'">' +
          '<div class="mgr-stu-k">'+esc(f.k)+'</div>' +
          '<div class="mgr-stu-v" data-val="'+esc(f.key)+'">'+esc(v)+'</div>' +
          '<div class="mgr-stu-edit">' +
            (f.ro ? '' : ('<button type="button" data-act="editStu" data-key="'+esc(f.key)+'" data-tz="'+esc(tz)+'">ערוך</button>')) +
          '</div>' +
        '</div>';
    }).join("");

    var m = $("mgrStudentModal");
    if(m) m.setAttribute("aria-hidden","false");
  }

  function closeStudentModal(){
    var m = $("mgrStudentModal");
    if(m) m.setAttribute("aria-hidden","true");
  }

  function saveStudentField(tz, key, val){
    tz = normStr(tz);
    key = normStr(key);
    val = (val==null) ? "" : String(val);

    var prof = getStudentProfile(tz) || {};
    if(key === "fullName"){
      // store as first/last when possible
      var parts = normStr(val).split(/\s+/).filter(Boolean);
      if(parts.length >= 2){
        prof.firstName = parts[0];
        prof.lastName = parts.slice(1).join(" ");
      }else{
        prof.firstName = normStr(val);
      }
      prof.fullName = normStr(val);
    } else if(key === "phone"){
      prof.phone = normStr(val);
    } else if(key === "progress"){
      prof.progress = normStr(val);
      prof.prog = normStr(val);
      prof.progressText = normStr(val);
    } else if(key === "lessonsDone"){
      var n = parseFloat(String(val));
      if(!isFinite(n)) n = 0;
      n = Math.round(n*2)/2;
      prof.lessonsDone = n;
    } else if(key === "lessonsLeft"){
      // read-only (derived from money due)
      return;
    } else if(key === "licenseType"){
      prof.licenseType = normStr(val);
      prof.license = normStr(val);
    } else if(key === "note"){
      prof.note = normStr(val);
      prof.notes = normStr(val);
    } else {
      prof[key] = val;
    }
    setStudentProfile(tz, prof);

    // refresh UI
    try{ renderStudentResults(normStr(($("mgrStudentSearch")||{}).value || "")); }catch(e){}
  }

  // -------- Payments --------
  function normalizePayment(p){
    p = p || {};
    var ts = Number(p.ts || p.timestamp || p.timeMs || 0);
    if(!isFinite(ts) || ts <= 0){
      // try parse date/time
      try{
        var d = (p.date && p.time) ? (p.date + " " + p.time) : (p.date || p.datetime || "");
        var parsed = Date.parse(d);
        if(isFinite(parsed)) ts = parsed;
      }catch(e){}
      if(!isFinite(ts) || ts <= 0) ts = Date.now();
    }

    var cash = normStr(p.cash || p.cashType || p.type || "");
    if(cash !== "shop" && cash !== "general") cash = "general";

    var receipt = normStr(p.receipt || p.receiptNo || p.ref || p.asmakhta || p.id || "");
    if(!receipt){
      // deterministic: yymmddhhmm + last 4 of ts
      var parts = tsToLocalParts(ts);
      receipt = parts.ymd.replace(/-/g,"").slice(2) + parts.time.replace(/:/g,"") + String(ts).slice(-4);
    }

    var amount = moneyStr(p.amount || p.sum || p.total || "");
    var note = normStr(p.note || p.name || p.studentName || "");
    var parts2 = tsToLocalParts(ts);
    return {ts: ts, cash: cash, receipt: receipt, amount: amount, note: note, date: parts2.date, time: parts2.time, ymd: parts2.ymd};
  }

  function getPaysSorted(){
    var arr = readPays().map(normalizePayment);
    arr.sort(function(a,b){ return b.ts - a.ts; });
    return arr;
  }

  function mgrRenderRecentPayments(){
    var tb = $("mgrRecentPaysTbody");
    if(!tb) return;
    var pays = getPaysSorted().slice(0, 40);
    if(!pays.length){
      tb.innerHTML = '<tr><td colspan="3" style="text-align:center;opacity:.85;">אין תשלומים</td></tr>';
      return;
    }
    tb.innerHTML = pays.map(function(p){
      return '<tr>' +
        '<td>'+esc(p.receipt)+'</td>' +
        '<td>₪'+esc(p.amount || "0")+'</td>' +
        '<td>'+esc(p.date + " " + p.time)+'</td>' +
      '</tr>';
    }).join("");
  }
  try{ window.mgrRenderRecentPayments = mgrRenderRecentPayments; }catch(e){}

  var __cashType = "general";
  var __cashYmd = "";

  

  /* ===== Orders (Shop) v1 ===== */
  function shopOrdersKey(){ return "shop_orders_v1"; }

  function shopReadOrders(){
    try{
      var raw = DBStorage.getItem(shopOrdersKey());
      var arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    }catch(e){ return []; }
  }

  function shopWriteOrders(arr){
    try{ DBStorage.setItem(shopOrdersKey(), JSON.stringify(arr||[])); }catch(e){}
  }

  function shopOrderMakeId(){
    var ts = Date.now();
    var rnd = Math.floor(Math.random()*900)+100;
    return "ORD-" + ts + "-" + rnd;
  }

  function shopGetLoggedStudent(){
    try{
      if((DBStorage.getItem("student_logged_in")||"") !== "1") return "";
      return (DBStorage.getItem("student_username")||"").trim();
    }catch(e){ return ""; }
  }

  function pmSendToUser(username, title, text, meta){
    username = (username==null ? "" : String(username)).trim();
    if(!username) return false;
    try{
      var key = "pm_" + username;
      var raw = DBStorage.getItem(key);
      var arr = raw ? JSON.parse(raw) : [];
      if(!Array.isArray(arr)) arr = [];
      var msg = {
        id: "MSG-" + Date.now() + "-" + Math.floor(Math.random()*900+100),
        title: String(title||"הודעה"),
        text: String(text||""),
        unread: true,
        ts: Date.now(),
        meta: (meta && typeof meta==="object") ? meta : null
      };
      arr.unshift(msg);
      if(arr.length > 200) arr.length = 200;
      DBStorage.setItem(key, JSON.stringify(arr));
      try{ if(typeof updatePrivateMessagesBadge === "function") updatePrivateMessagesBadge(); }catch(e2){}
      return true;
    }catch(e){ return false; }
  }
  window.pmSendToUser = pmSendToUser;

  function shopCreateOrderFromPending(){
    var pending = null;
    try{
      var raw = DBStorage.getItem("shop_pending_payment_v1");
      pending = raw ? JSON.parse(raw) : null;
    }catch(e){ pending = null; }

    var cart = [];
    var total = 0;
    var hasOrderOnly = false;

    if(pending && pending.items && Array.isArray(pending.items)){
      cart = pending.items;
      total = Number(pending.total||0) || 0;
      hasOrderOnly = !!pending.hasOrderOnly;
    }else{
      cart = (typeof readCart === "function") ? (readCart()||[]) : [];
      for(var i=0;i<cart.length;i++){
        try{
          var price = Number(cart[i].price||0) || 0;
          total += price;
          var av = String(cart[i].availability||'').toLowerCase();
          if(av === "order_only") hasOrderOnly = true;
        }catch(e){}
      }
    }

    if(!cart.length) return null;

    var username = shopGetLoggedStudent();
    if(!username) username = "אורח";

    var order = {
      id: shopOrderMakeId(),
      username: username,
      total: Math.round(total),
      items: cart,
      status: hasOrderOnly ? "wait_stock" : "ready_pickup",
      hasOrderOnly: !!hasOrderOnly,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      notifiedReadyAt: null
    };

    var orders = shopReadOrders();
    orders.unshift(order);
    if(orders.length > 500) orders.length = 500;
    shopWriteOrders(orders);

    // message to buyer (only if logged-in user)
    if(username && username !== "אורח"){
      var ttl = "הזמנה התקבלה";
      var body = "הזמנה " + order.id + " התקבלה. סה״כ: " + order.total + " ₪.";
      if(order.status === "wait_stock"){
        body += "\nהפריט בהזמנה בלבד. נעדכן אותך כשהגיע למלאי.";
      }else{
        body += "\nההזמנה מוכנה לתיאום איסוף מהמשרד.";
      }
      pmSendToUser(username, ttl, body, {orderId: order.id, status: order.status});
    }

    return order;
  }

  function mgrOrderStatusLabel(s){
    s = String(s||"");
    if(s === "wait_stock") return "ממתין למלאי";
    if(s === "ready_pickup") return "מוכן לאיסוף";
    if(s === "closed") return "נסגר";
    return s || "—";
  }

  function mgrFormatDt(ts){
    try{
      var d = new Date(Number(ts)||0);
      if(!isFinite(d.getTime())) return "—";
      var dd = String(d.getDate()).padStart(2,"0");
      var mm = String(d.getMonth()+1).padStart(2,"0");
      var yy = d.getFullYear();
      var hh = String(d.getHours()).padStart(2,"0");
      var mi = String(d.getMinutes()).padStart(2,"0");
      return dd + "." + mm + "." + yy + " " + hh + ":" + mi;
    }catch(e){ return "—"; }
  }

  function mgrRenderOrders(){
    var tb = $("mgrOrdersTbody");
    if(!tb) return;

    var orders = shopReadOrders();
    var f = (window.__mgrOrdersFilter || "all");
    if(f === "wait"){
      orders = orders.filter(function(o){ return o && o.status === "wait_stock"; });
    }else if(f === "ready"){
      orders = orders.filter(function(o){ return o && o.status === "ready_pickup"; });
    }

    if(!orders.length){
      tb.innerHTML = '<tr><td colspan="6" style="text-align:center;opacity:.85;">אין הזמנות</td></tr>';
      return;
    }

    var rows = [];
    for(var i=0;i<Math.min(300, orders.length);i++){
      var o = orders[i] || {};
      var action = "";
      if(o.status === "wait_stock"){
        action = '<button class="mgr-mini-btn" type="button" onclick="mgrOrderMarkArrived(\'' + String(o.id||"") + '\')">הגיע למלאי + שלח הודעה</button>';
      }else{
        action = '—';
      }
      rows.push(
        '<tr>' +
          '<td>' + (i+1) + '</td>' +
          '<td>' + pmEscapeHtml(String(o.username||"—")) + '</td>' +
          '<td>' + pmEscapeHtml(String(o.total!=null ? o.total : "—")) + '</td>' +
          '<td>' + pmEscapeHtml(mgrOrderStatusLabel(o.status)) + '</td>' +
          '<td>' + pmEscapeHtml(mgrFormatDt(o.createdAt)) + '</td>' +
          '<td>' + action + '</td>' +
        '</tr>'
      );
    }
    tb.innerHTML = rows.join("");
  }
  try{ window.mgrRenderOrders = mgrRenderOrders; }catch(e){}
  window.mgrRenderOrders = mgrRenderOrders;

  function mgrOrderMarkArrived(orderId){
    orderId = String(orderId||"").trim();
    if(!orderId) return;
    var orders = shopReadOrders();
    var found = null;
    for(var i=0;i<orders.length;i++){
      if(orders[i] && String(orders[i].id||"") === orderId){
        found = orders[i];
        orders[i].status = "ready_pickup";
        orders[i].updatedAt = Date.now();
        orders[i].notifiedReadyAt = Date.now();
        break;
      }
    }
    if(!found){ try{ if(typeof toast === "function") toast("לא נמצאה הזמנה"); }catch(e){} return; }
    shopWriteOrders(orders);

    // notify buyer
    var u = String(found.username||"").trim();
    if(u && u !== "אורח"){
      var body = "הזמנה " + orderId + " הגיעה למלאי ומוכנה לתיאום איסוף מהמשרד.";
      pmSendToUser(u, "הזמנה הגיעה למלאי", body, {orderId: orderId, status: "ready_pickup"});
      try{ if(typeof toast === "function") toast("נשלחה הודעה למזמין"); }catch(e){}
    }else{
      try{ if(typeof toast === "function") toast("הזמנה עודכנה"); }catch(e){}
    }

    mgrRenderOrders();
  }
  window.mgrOrderMarkArrived = mgrOrderMarkArrived;

  /* ===== /Orders (Shop) v1 ===== */

function openCashView(type){
    __cashType = (type === "shop") ? "shop" : "general";
    __cashYmd = "";
    mgrShowView("mgrViewCash", __cashType === "shop" ? "קופה חנות" : "קופה כללית");
    var ttl = $("mgrCashTitle");
    if(ttl) ttl.textContent = (__cashType === "shop" ? "קופה חנות" : "קופה כללית");
    mgrRenderCashTable();
  }

  function mgrRenderCashTable(){
    var tb = $("mgrCashTbody");
    var sub = $("mgrCashSub");
    if(!tb) return;

    var pays = getPaysSorted().filter(function(p){ return p.cash === __cashType; });
    if(__cashYmd){
      pays = pays.filter(function(p){ return p.ymd === __cashYmd; });
    }
    if(sub){
      sub.textContent = __cashYmd ? ("תאריך נבחר: " + __cashYmd) : "בחר תאריך כדי לראות עסקאות של אותו יום";
    }

    if(!pays.length){
      tb.innerHTML = '<tr><td colspan="4" style="text-align:center;opacity:.85;">אין עסקאות</td></tr>';
      return;
    }
    tb.innerHTML = pays.map(function(p){
      return '<tr>' +
        '<td>'+esc(p.receipt)+'</td>' +
        '<td>₪'+esc(p.amount || "0")+'</td>' +
        '<td>'+esc(p.date + " " + p.time)+'</td>' +
        '<td>'+esc(p.note || "—")+'</td>' +
      '</tr>';
    }).join("");
  }

  // -------- Calendar modal --------
  var calMonth = null;
  var calYear = null;
  var calFor = "cash"; // only cash for now

  function openDateModal(forWhat){
    calFor = forWhat || "cash";
    var m = $("mgrDateModal");
    if(m) m.setAttribute("aria-hidden","false");
    var d = new Date();
    calMonth = d.getMonth();
    calYear = d.getFullYear();
    renderCalendarSelectors();
    renderCalendarGrid();
  }
  function closeDateModal(){
    var m = $("mgrDateModal");
    if(m) m.setAttribute("aria-hidden","true");
  }
  function renderCalendarSelectors(){
    var mSel = $("mgrCalMonth");
    var ySel = $("mgrCalYear");
    if(!mSel || !ySel) return;

    var months = ["ינואר","פברואר","מרץ","אפריל","מאי","יוני","יולי","אוגוסט","ספטמבר","אוקטובר","נובמבר","דצמבר"];
    mSel.innerHTML = months.map(function(n,idx){
      return '<option value="'+idx+'"'+(idx===calMonth?' selected':'')+'>'+n+'</option>';
    }).join("");

    var y0 = (new Date()).getFullYear();
    var ys = [];
    for(var y=y0-4;y<=y0+1;y++) ys.push(y);
    ySel.innerHTML = ys.map(function(y){
      return '<option value="'+y+'"'+(y===calYear?' selected':'')+'>'+y+'</option>';
    }).join("");
  }
  function renderCalendarGrid(){
    var grid = $("mgrCalGrid");
    if(!grid) return;

    var dows = ["א","ב","ג","ד","ה","ו","ש"];
    var html = dows.map(function(d){ return '<button type="button" class="mgr-cal-dow" disabled>'+d+'</button>'; }).join("");

    var first = new Date(calYear, calMonth, 1);
    var startDow = first.getDay(); // 0 sun
    var daysInMonth = new Date(calYear, calMonth+1, 0).getDate();

    // previous month fillers
    var prevDays = new Date(calYear, calMonth, 0).getDate();
    for(var i=0;i<startDow;i++){
      var day = prevDays - (startDow-1-i);
      html += '<button type="button" class="mgr-cal-day muted" data-day="'+day+'" data-moff="-1">'+day+'</button>';
    }
    // this month
    for(var d=1; d<=daysInMonth; d++){
      html += '<button type="button" class="mgr-cal-day" data-day="'+d+'" data-moff="0">'+d+'</button>';
    }
    // fill to complete weeks (up to 6 rows)
    var totalCells = startDow + daysInMonth;
    var rem = (7 - (totalCells % 7)) % 7;
    for(var j=1;j<=rem;j++){
      html += '<button type="button" class="mgr-cal-day muted" data-day="'+j+'" data-moff="+1">'+j+'</button>';
    }

    grid.innerHTML = html;
  }

  function pickYmdFromCalendar(day, moff){
    day = parseInt(day,10);
    if(!isFinite(day) || day<=0) return "";
    moff = parseInt(moff,10);
    if(!isFinite(moff)) moff = 0;

    var y = calYear;
    var m = calMonth + moff;
    var dt = new Date(y, m, day);
    var yy = dt.getFullYear();
    var mm = fmt2(dt.getMonth()+1);
    var dd = fmt2(dt.getDate());
    return yy + "-" + mm + "-" + dd;
  }

  // -------- Bind --------
  
/* === TAP BINDING (GLOBAL) === */
function bindTap(el, fn){
  if(!el) return;
  try{
    if(el.getAttribute && el.getAttribute("data-tapbound") === "1") return;
    el.setAttribute && el.setAttribute("data-tapbound","1");
  }catch(e){}
  var down=false, moved=false, sx=0, sy=0, last=0;

  function pt(e){
    try{
      if(e && e.changedTouches && e.changedTouches[0]) return e.changedTouches[0];
      if(e && e.touches && e.touches[0]) return e.touches[0];
    }catch(_){}
    return e || {};
  }

  function onDown(e){
    down=true; moved=false;
    var p = pt(e);
    sx = p.clientX || 0;
    sy = p.clientY || 0;
  }

  function onMove(e){
    if(!down) return;
    var p = pt(e);
    var dx = Math.abs((p.clientX||0) - sx);
    var dy = Math.abs((p.clientY||0) - sy);
    if(dx > 10 || dy > 10) moved=true;
  }

  function cancel(){ down=false; }

  function fire(e){
    if(!down) return;
    down=false;
    if(moved) return;
    var now = Date.now();
    if(now - last < 250) return;
    last = now;
    try{ if(e && e.preventDefault) e.preventDefault(); }catch(_){}
    try{ if(e && e.stopPropagation) e.stopPropagation(); }catch(_){}
    try{ if(e && e.stopImmediatePropagation) e.stopImmediatePropagation(); }catch(_){}
    try{ fn && fn(e); }catch(err){}
    return false;
  }

  try{ el.style && (el.style.touchAction = "manipulation"); }catch(e){}
    // Visual press effect (for left/profile menu and other tap elements)
    function _pressOn(){
      try{ el.classList && el.classList.add("is-pressed"); }catch(_){}
    }
    function _pressOff(){
      try{ el.classList && el.classList.remove("is-pressed"); }catch(_){}
    }
    // Ensure release always clears press state
    try{
      el.addEventListener("pointerup", _pressOff, true);
      el.addEventListener("pointercancel", _pressOff, true);
      el.addEventListener("touchend", _pressOff, true);
      el.addEventListener("touchcancel", _pressOff, true);
      el.addEventListener("mouseup", _pressOff, true);
      el.addEventListener("mouseleave", _pressOff, true);
      el.addEventListener("blur", _pressOff, true);
    }catch(_){}


  // Pointer
  try{
    el.addEventListener("pointerdown", onDown, true);
    el.addEventListener("pointermove", onMove, true);
    el.addEventListener("pointerup", fire, true);
    el.addEventListener("pointercancel", cancel, true);
  }catch(e){}

  // Touch
  try{
    el.addEventListener("touchstart", onDown, {passive:true, capture:true});
    el.addEventListener("touchmove", onMove, {passive:true, capture:true});
    el.addEventListener("touchend", fire, {passive:false, capture:true});
    el.addEventListener("touchcancel", cancel, {passive:true, capture:true});
  }catch(e){}

  // Mouse
  try{
    el.addEventListener("mousedown", onDown, true);
    el.addEventListener("mousemove", onMove, true);
    el.addEventListener("mouseup", fire, true);
  }catch(e){}

  // Block synthetic click to avoid double firing
  try{
    el.addEventListener("click", function(e){
      try{ if(e && e.preventDefault) e.preventDefault(); }catch(_){}
      try{ if(e && e.stopPropagation) e.stopPropagation(); }catch(_){}
      try{ if(e && e.stopImmediatePropagation) e.stopImmediatePropagation(); }catch(_){}
      return false;
    }, true);
  }catch(e){}
}


function bindReleaseTap(el, fn){
  // Alias: fire only on release (pointerup/touchend) via bindTap
  return bindTap(el, fn);
}

/* === /TAP BINDING (GLOBAL) === */

/* === HARD BIND ADD BUTTONS === */
{
  var ov = document.getElementById("managerOverlay");
  if(ov){
    function arm(e){
      try{
        var t = e && e.target;
        if(!t || !t.closest) return;
        var btn = t.closest("#mgrAddInStockBtn, #mgrAddOrderBtn");
        if(!btn) return;

        // Arm on press and suppress compatibility click (touch -> click)
        window.__MGR_ADD_ARMED_ID = btn.id;
        window.__MGR_ADD_ARMED_AT = Date.now();

        try{ if(e && e.preventDefault) e.preventDefault(); }catch(_){}
        try{ if(e && e.stopPropagation) e.stopPropagation(); }catch(_){}
        try{ if(e && e.stopImmediatePropagation) e.stopImmediatePropagation(); }catch(_){}
        return false;
      }catch(err){}
    }

    function fire(e){
      try{
        var t = e && e.target;
        if(!t || !t.closest) return;
        var btn = t.closest("#mgrAddInStockBtn, #mgrAddOrderBtn");
        if(!btn) return;

        var now = Date.now();

        // On touch/pointer release: require prior arm
        if(e && (e.type === "pointerup" || e.type === "touchend")){
          var armed = (window.__MGR_ADD_ARMED_ID === btn.id) && (now - (window.__MGR_ADD_ARMED_AT||0) < 1500);
          window.__MGR_ADD_ARMED_ID = null;
          window.__MGR_ADD_ARMED_AT = 0;
          if(!armed) return;
        }

        // Hard throttle
        if(window.__MGR_HARD_ADD_LAST && (now - window.__MGR_HARD_ADD_LAST) < 800) return;
        window.__MGR_HARD_ADD_LAST = now;

        try{ if(e && e.preventDefault) e.preventDefault(); }catch(_){}
        try{ if(e && e.stopPropagation) e.stopPropagation(); }catch(_){}
        try{ if(e && e.stopImmediatePropagation) e.stopImmediatePropagation(); }catch(_){}

        var sel = document.getElementById("mgrShopCatSel");
        var cat = sel ? String(sel.value||"helmet") : "helmet";
        var av = (btn.id === "mgrAddOrderBtn") ? "order_only" : "in_stock";
        if(String(cat||"").toLowerCase() === "bike") av = "in_stock";
        if(window.mgrOpenProductAdder) window.mgrOpenProductAdder(cat, av);
        return false;
      }catch(err){}
    }

    // Arm on press; open on release. Capture phase to win over inline/other handlers.
    try{ ov.addEventListener("pointerdown", arm, true); }catch(e){}
    try{ ov.addEventListener("touchstart", arm, {passive:false, capture:true}); }catch(e){}
    try{ ov.addEventListener("pointerup", fire, true); }catch(e){}
    try{ ov.addEventListener("touchend", fire, {passive:false, capture:true}); }catch(e){}
    // Desktop fallback
    try{ ov.addEventListener("click", fire, true); }catch(e){}
  }
}
/* === /HARD BIND ADD BUTTONS === */

function bind(){
var ov = $("managerOverlay");
    if(ov){
      ov.addEventListener("click", function(e){
        // do not close by outside click (requested full screen). Keep disabled.
        if(false && e && e.target === ov) closeManagerPanel();
      });
    }

    // topbar
    var back = $("mgrBackHomeBtn");
    if(back){
      try{ back.removeEventListener("click", mgrShowHome); }catch(e){}
      try{ bindReleaseTap(back, mgrShowHome); }catch(e){ try{ back.addEventListener("click", mgrShowHome); }catch(_e){} }
    }
    var stuExit = $("mgrStudentsExitBtn");
    if(stuExit) bindReleaseTap(stuExit, mgrShowHome);
var out2 = $("mgrLogoutBtn");
    if(out2){ try{ bindReleaseTap(out2, mgrDoLogout); }catch(e){ out2.addEventListener("click", mgrDoLogout); } }

    // shop controls
    var catSel = $("mgrShopCatSel");
    if(catSel) catSel.addEventListener("change", mgrRenderShopLists);

    var addIn = $("mgrAddInStockBtn");
    if(addIn) bindTap(addIn, function(){
      var cat = (catSel ? catSel.value : "helmet");
      window.mgrOpenProductAdder(cat, "in_stock");
    });
var addOr = $("mgrAddOrderBtn");
    if(addOr) bindTap(addOr, function(){
      var cat = (catSel ? catSel.value : "helmet");
      window.mgrOpenProductAdder(cat, "order_only");
    });
// product modal buttons
    var closePM = $("mgrCloseProductModalBtn");
    if(closePM) bindReleaseTap(closePM, mgrCloseProductModal);
var saveProd = $("mgrSaveProdBtn");
    if(saveProd) bindReleaseTap(saveProd, mgrSaveProduct);
var clearProd = $("mgrClearProdBtn");
    if(clearProd) bindReleaseTap(clearProd, function(){ mgrClearProdForm(); });
// image clear (manager add/edit)
    var clearImg = $("mgrProdImgClearBtn");
    if(clearImg && !window.__mgrImgClearBound){
      window.__mgrImgClearBound = true;
      clearImg.addEventListener("click", function(){
        try{
          mgrRemoveSelectedMgrImage();
          if(typeof toast === "function") toast("תמונה הוסרה");
        }catch(e){}
      });
    }

    // sizes picker (inline list)
    var szPick = $("mgrProdSizesPick");
    if(szPick) bindReleaseTap(szPick, function(){
      try{
        mgrBindInlineSizes();
        mgrToggleSizesInline();
      }catch(e){}
    });
// product image upload
    var imgFile = $("mgrProdImgFile");
    if(imgFile){
      imgFile.addEventListener("change", function(ev){
        try{ if(ev && ev.stopPropagation) ev.stopPropagation(); }catch(e){}
        try{ mgrHandleImgUploadInput(this); }catch(e){}
      });
      imgFile.addEventListener("input", function(ev){
        try{ if(ev && ev.stopPropagation) ev.stopPropagation(); }catch(e){}
        try{ mgrHandleImgUploadInput(this); }catch(e){}
      });
    }

    var imgClear = $("mgrProdImgClearBtn");
    if(imgClear && !window.__mgrImgClearBound){
      window.__mgrImgClearBound = true;
      imgClear.addEventListener("click", function(){
        try{ mgrRemoveSelectedMgrImage(); }catch(e){}
      });
    }


    // students search
    var stuSearch = $("mgrStudentSearch");
    if(stuSearch) stuSearch.addEventListener("input", function(){ renderStudentResults(this.value); });

    // student results click + student modal edit
    document.addEventListener("click", function(ev){
      var btn = ev && ev.target && ev.target.closest ? ev.target.closest("[data-act]") : null;
      if(!btn) return;

      var act = btn.getAttribute("data-act");
      if(act === "openStu"){
        var tz = btn.getAttribute("data-tz") || "";
        openStudentModal(tz);
        return;
      }
      if(act === "editStu"){
        var tz2 = btn.getAttribute("data-tz") || "";
        var key = btn.getAttribute("data-key") || "";
        var row = btn.closest(".mgr-stu-row");
        if(!row) return;
        var vEl = row.querySelector('[data-val="'+key+'"]');
        if(!vEl) return;

        // already editing?
        if(row.querySelector("input")) return;

        var cur = vEl.textContent || "";
        vEl.innerHTML = '<input type="text" value="'+esc(cur==='—'?'':cur)+'" />';
        btn.style.display = "none";

        var ctrl = row.querySelector(".mgr-stu-edit");
        if(ctrl){
          ctrl.insertAdjacentHTML("beforeend",
            '<button type="button" class="save" data-act="saveStu" data-tz="'+esc(tz2)+'" data-key="'+esc(key)+'">שמור</button>' +
            '<button type="button" data-act="cancelStu" data-key="'+esc(key)+'">ביטול</button>'
          );
        }
        return;
      }
      if(act === "saveStu"){
        var tz3 = btn.getAttribute("data-tz") || "";
        var key3 = btn.getAttribute("data-key") || "";
        var row2 = btn.closest(".mgr-stu-row");
        if(!row2) return;
        var inp = row2.querySelector("input");
        var val = inp ? inp.value : "";
        saveStudentField(tz3, key3, val);

        // rebuild modal content quickly
        openStudentModal(tz3);
        return;
      }
      if(act === "cancelStu"){
        var row3 = btn.closest(".mgr-stu-row");
        if(!row3) return;
        var tz4 = (row3.querySelector("[data-act='saveStu']")||{}).getAttribute ? (row3.querySelector("[data-act='saveStu']").getAttribute("data-tz")||"") : "";
        if(tz4) openStudentModal(tz4);
        return;
      }
    }, {passive:true});

    var closeStu = $("mgrCloseStudentModalBtn");
    if(closeStu) closeStu.addEventListener("click", closeStudentModal);

    // payments buttons
    var cg = $("mgrOpenCashGeneralBtn");
    var cs = $("mgrOpenCashShopBtn");
    if(cg) cg.addEventListener("click", function(){ openCashView("general"); });
    if(cs) cs.addEventListener("click", function(){ openCashView("shop"); });

    var pickDate = $("mgrCashPickDateBtn");
    var clearDate = $("mgrCashClearDateBtn");
    if(pickDate) pickDate.addEventListener("click", function(){ openDateModal("cash"); });
    if(clearDate) clearDate.addEventListener("click", function(){ __cashYmd = ""; mgrRenderCashTable(); });

    // calendar nav
    var prev = $("mgrCalPrevBtn"), next = $("mgrCalNextBtn");
    if(prev) prev.addEventListener("click", function(){
      calMonth -= 1;
      if(calMonth < 0){ calMonth = 11; calYear -= 1; }
      renderCalendarSelectors(); renderCalendarGrid();
    });
    if(next) next.addEventListener("click", function(){
      calMonth += 1;
      if(calMonth > 11){ calMonth = 0; calYear += 1; }
      renderCalendarSelectors(); renderCalendarGrid();
    });
    var mSel = $("mgrCalMonth");
    var ySel = $("mgrCalYear");
    if(mSel) mSel.addEventListener("change", function(){ calMonth = parseInt(this.value,10)||0; renderCalendarGrid(); });
    if(ySel) ySel.addEventListener("change", function(){ calYear = parseInt(this.value,10)||calYear; renderCalendarGrid(); });

    var closeDate = $("mgrCloseDateModalBtn");
    if(closeDate) closeDate.addEventListener("click", closeDateModal);

    var grid = $("mgrCalGrid");
    if(grid){
      grid.addEventListener("click", function(ev){
        var b = ev && ev.target && ev.target.closest ? ev.target.closest(".mgr-cal-day") : null;
        if(!b) return;
        var ymd = pickYmdFromCalendar(b.getAttribute("data-day"), b.getAttribute("data-moff"));
        if(!ymd) return;

        if(calFor === "cash"){
          __cashYmd = ymd;
          mgrRenderCashTable();
        }
        closeDateModal();
      });
    }

    // ESC closes panel or modals
    document.addEventListener("keydown", function(e){
      if(!e || e.key !== "Escape") return;

      var dm = $("mgrDateModal");
      if(dm && dm.getAttribute("aria-hidden") === "false"){ closeDateModal(); return; }

      var pm = $("mgrProductModal");
      if(pm && pm.getAttribute("aria-hidden") === "false"){ mgrCloseProductModal(); return; }

      var sm = $("mgrStudentModal");
      if(sm && sm.getAttribute("aria-hidden") === "false"){ closeStudentModal(); return; }

      var ov2 = $("managerOverlay");
      if(ov2 && ov2.getAttribute("aria-hidden") === "false"){ closeManagerPanel(); }
    });

    // initial hidden
    try{ mgrHideAllViews(); }catch(e){}
    try{ if(typeof updateMenuRoleSections === "function") updateMenuRoleSections(); }catch(e){}
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", bind);
  }else{
    bind();
  }
  try{ window.__mgrBindUI = bind; }catch(e){}
})();

/* ===== script block 11 (from original HTML) ===== */
/* ===== ADMIN EMBED BRIDGE (v20) ===== */
(function(){
  function $(id){ return document.getElementById(id); }

  function makeTxId(){
    return 'tx_' + String(Date.now()) + '_' + String(Math.random()).slice(2);
  }

  function isAdminCreds(u,p){
    try{
      var uu = (u||"").trim();
      var pp = String(p||"");
      if(!uu || !pp) return false;
      // accept Hebrew + English
      var ulow = uu.toLowerCase();
      return (pp === "1") && (uu === "אדמין" || ulow === "admin" || ulow === "administrator" || uu === "Admin");
    }catch(e){ return false; }
  }

  window.openAdminPanel = function(){
    try{ if(typeof closeMenu === "function") closeMenu(); }catch(e){}
    try{ if(typeof closeProfileMenu === "function") closeProfileMenu(); }catch(e){}
    try{ if(typeof closeAllPages === "function") closeAllPages(); }catch(e){}
    try{ document.body.classList.add("admin-open"); }catch(e){}
    var ov = $("adminOverlay");
    if(ov) ov.setAttribute("aria-hidden","false");
    try{ if(typeof updateEdgeHandles === "function") updateEdgeHandles(); }catch(e){}
    try{ if(typeof updateEdgeHandlePositions === "function") updateEdgeHandlePositions(); }catch(e){}
  };

  window.closeAdminPanel = function(){
    try{ document.body.classList.remove("admin-open"); }catch(e){}
    var ov = $("adminOverlay");
    if(ov) ov.setAttribute("aria-hidden","true");
    try{ if(typeof updateEdgeHandles === "function") updateEdgeHandles(); }catch(e){}
    try{ if(typeof updateEdgeHandlePositions === "function") updateEdgeHandlePositions(); }catch(e){}
  };

  // ===== Admin Forum Mode Bridge (v1) =====
  window.openAdminForum = function(){
    try{ setAdminTab('forum'); }catch(e){}
    try{ document.body.classList.add('admin-forum-mode'); }catch(e){}
    try{ var ov = $('adminOverlay'); if(ov) ov.setAttribute('aria-hidden','true'); }catch(e){}
    try{ if(typeof openPage === 'function') openPage('forumPage', true); }catch(e){}
  };

  window.__adminExitForumMode = function(){
    try{ document.body.classList.remove('admin-forum-mode'); }catch(e){}
    try{ setAdminTab('home'); }catch(e){}
    try{ var ov = $('adminOverlay'); if(ov) ov.setAttribute('aria-hidden','false'); }catch(e){}
  };


  // Hook into existing loginUserPass without breaking it
  // If the function exists, wrap it.
  try{
    if(typeof window.loginUserPass === "function" && !window.loginUserPass.__adminWrapped){
      var _orig = window.loginUserPass;
      var wrapped = function(){
        var u = (($("authUsername")||{}).value || "").trim();
        var p = (($("authPassword")||{}).value || "");
        if(isAdminCreds(u,p)){
          try{ if(typeof closeAuth === "function") closeAuth(); }catch(e){}
          try{ if(typeof toast === "function") toast("כניסת אדמין"); }catch(e){}
          window.openAdminPanel();
          return;
        }
        return _orig.apply(this, arguments);
      };
      wrapped.__adminWrapped = true;
      window.loginUserPass = wrapped;
    }
  }catch(e){}
})();
/* ===== /ADMIN EMBED BRIDGE ===== */
/* ===== SHOP (v1) ===== */
(function(){
  // Cart modal + simple checkout (stable)

  var LS_PRODUCTS_KEY = "shop_products_v1";
  var __shopReturnPage = null;
  var SHOP_PAGES = ['glovesPage','helmetPage','intercomPage','lockPage','usedBikesPage'];
  // --- local helpers (shop scope) ---
  function normStr(v){ return String(v==null?"":v).trim(); }
  function parseCsv(v){
    return normStr(v).split(",").map(function(s){ return String(s||"").trim(); }).filter(function(x){ return !!x; });
  }
  function escapeHtml(s){
    s = String(s==null?"":s);
    return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
  }
  function escapeAttr(s){ return escapeHtml(s); }

  // v23: tiny helper to render color swatches in chips (supports Hebrew/English common names)
  function colorSwatchStyle(name){
    var n = (name || '').toString().trim().toLowerCase();
    // Hebrew normalization
    if(n === 'שחור') n = 'black';
    if(n === 'לבן') n = 'white';
    if(n === 'אפור' || n === 'אפר') n = 'gray';
    if(n === 'כחול') n = 'blue';
    if(n === 'אדום') n = 'red';
    if(n === 'ירוק') n = 'green';
    if(n === 'צהוב') n = 'yellow';
    if(n === 'כתום') n = 'orange';
    if(n === 'סגול') n = 'purple';
    if(n === 'ורוד') n = 'pink';
    if(n === 'חום') n = 'brown';
    if(n === 'זהב' || n === 'זהוב') n = 'gold';
    if(n === 'כסף' || n === 'כסוף') n = 'silver';
    if(n === 'צבעוני') n = 'multicolor';

    var bg = '';
    if(n === 'black') bg = '#111';
    else if(n === 'white') bg = '#f2f2f2';
    else if(n === 'gray' || n === 'grey') bg = '#7a7a7a';
    else if(n === 'blue') bg = '#1f5bd9';
    else if(n === 'red') bg = '#d21f2b';
    else if(n === 'green') bg = '#1e8f4a';
    else if(n === 'yellow') bg = '#f2c230';
    else if(n === 'orange') bg = '#f08c2a';
    else if(n === 'purple') bg = '#7c3aed';
    else if(n === 'pink') bg = '#ec4899';
    else if(n === 'brown') bg = '#8b5a2b';
    else if(n === 'gold') bg = '#d4af37';
    else if(n === 'silver') bg = '#c0c0c0';
    else if(n === 'multicolor') bg = 'linear-gradient(135deg,#ef4444 0%,#f59e0b 20%,#22c55e 40%,#3b82f6 60%,#a855f7 80%,#ec4899 100%)';

    if(!bg) bg = 'linear-gradient(135deg, rgba(255,255,255,.35), rgba(255,255,255,.05))';
    return 'background:' + bg + ';';
  }



  function shopToast(msg){
    try{ if(typeof toast === "function"){ toast(msg); return; } }catch(e){}
    try{ alert(msg); }catch(e){}
  }
  function fmtN(n){
    try{ return String(Math.round(Number(n)||0)).replace(/\B(?=(\d{3})+(?!\d))/g, ","); }catch(e){ return String(n); }
  }
  function escapeHtml(s){
    return String(s).replace(/[&<>"']/g, function(c){
      return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c] || c;
    });
  }
  function escapeAttr(s){
    return String(s).replace(/['"\\<>]/g, "");
  }

  
  function normalizeShopCategory(cat){
    cat = String(cat||"").toLowerCase().trim();

    // English + legacy
    if(cat === "helmets" || cat === "helmet") return "helmet";
    if(cat === "locks" || cat === "lock") return "lock";
    if(cat === "gloves") return "gloves";
    if(cat === "intercom" || cat === "intercoms") return "intercom";
    if(cat === "bikes_used" || cat === "bike" || cat === "bikes") return "bike";
    if(cat === "bikes_new" || cat === "bike_new") return "bike";

    // Hebrew (admin/manager UI)
    if(cat === "קסדות" || cat === "קסדה") return "helmet";
    if(cat === "כפפות" || cat === "כפפה") return "gloves";
    if(cat === "מנעולים" || cat === "מנעול") return "lock";
    if(cat === "דיבוריות" || cat === "דיבורית") return "intercom";

    if(cat === "אופנועים" || cat === "אופנוע" || cat === "אופנועים יד שניה" || cat === "יד שניה" || cat === "משומשים") return "bike";
    if(cat === "אופנועים חדשים" || cat === "חדש" || cat === "חדשים") return "bike";

    return cat;
  }

  
function normalizeShopProduct(p){
    p = p || {};

    function normImgs(obj){
      var imgs = [];
      try{
        if(Array.isArray(obj.images)) imgs = obj.images;
        else if(Array.isArray(obj.imgs)) imgs = obj.imgs;
        else if(normStr(obj.image)) imgs = [obj.image];
        else if(normStr(obj.img)) imgs = [obj.img];
      }catch(e){ imgs = []; }
      imgs = (imgs||[]).map(function(x){ return normStr(x); }).filter(Boolean);
      // de-dup
      var seen = {};
      var out = [];
      for(var i=0;i<imgs.length;i++){
        var v = imgs[i];
        if(!v || seen[v]) continue;
        seen[v]=1; out.push(v);
      }
      return out;
    }

    // Manager schema -> Shop schema
    var isMgr = (p.availability !== undefined) || (p.eta_days !== undefined) || (p.image !== undefined) || (p.images !== undefined) || (p.imgs !== undefined);
    if(isMgr){
      var cat = normalizeShopCategory(p.category || "helmets");
      var av  = String(p.availability || "in_stock").toLowerCase().trim();
      if(av === "זמין במלאי" || av === "במלאי" || av === "in stock" || av === "instock") av = "in_stock";
      if(av === "בהזמנה בלבד" || av === "בהזמנה" || av === "preorder" || av === "pre-order" || av === "order only" || av === "orderonly") av = "order_only";
      var inStock = (av !== "order_only");

      var lead = parseInt(p.eta_days, 10);
      if(!isFinite(lead) || lead <= 0) lead = null;

      var priceNum = parseFloat(String(p.price||"").replace(/[^\d.]/g,""));
      if(!isFinite(priceNum)) priceNum = 0;

      var imgs = normImgs(p);
      var firstImg = normStr((imgs && imgs.length) ? imgs[0] : "");

      var out1 = {
        id: String(p.id || ""),
        category: cat,
        name: normStr(p.name || ""),
        price: priceNum,
        img: firstImg,
        images: imgs,
        note: normStr(p.desc || p.note || ""),
        sizes: p.sizes || p.size || "",
        colors: p.colors || p.color || "",
        inStock: inStock,
        leadDays: lead,
        noCart: !!p.noCart
      };

      // Bikes/no cart guard
      if(out1.category === "bike" || out1.category === "bike_new") out1.noCart = true;

      // Preserve used-bikes fields (manager schema -> shop schema)
      if(out1.category === "bike"){
        try{
          out1.bike_company = normStr(p.bike_company || p.bikeCompany || p.bike_brand || p.company || "");
          out1.bike_type = normStr(p.bike_type || p.bikeType || p.bike_kind || p.name || "");
          out1.engine_cc = normStr(p.engine_cc || p.engineCC || p.cc || "");
          out1.license_required = normStr(p.license_required || p.license || "");
          out1.onroad_year = normStr(p.onroad_year || p.onRoadYear || p.year || "");
          out1.bike_km = normStr(p.bike_km || p.km || p.mileage || p.odometer_km || "");
          out1.hand = normStr(p.hand || p.owner_hand || "");
          out1.test_until = normStr(p.test_until || p.testUntil || "");
          out1.condition = normStr(p.condition || p.cond || "");
          out1.general_details = normStr(p.general_details || p.bike_details || p.desc || p.note || "");
          // keep backward aliases for renderers
          out1.company = out1.bike_company;
          out1.bikeCompany = out1.bike_company;
          out1.bikeType = out1.bike_type;
          out1.cc = out1.engine_cc;
          out1.km = out1.bike_km;
          out1.mileage = out1.bike_km;
          out1.odometer_km = out1.bike_km;
          out1.license = out1.license_required;
          out1.year = out1.onroad_year;
          out1.testUntil = out1.test_until;
          out1.cond = out1.condition;
        }catch(e){}
      }

      return out1;

}

    // Already shop schema (or legacy)
    var out = Object.assign({}, p);
    out.id = String(out.id||"");
    out.category = normalizeShopCategory(out.category || "");

    if(out.availability !== undefined && out.inStock === undefined){
      var av2 = String(out.availability||"").toLowerCase().trim();
      if(av2 === "זמין במלאי" || av2 === "במלאי" || av2 === "in stock" || av2 === "instock") av2 = "in_stock";
      if(av2 === "בהזמנה בלבד" || av2 === "בהזמנה" || av2 === "preorder" || av2 === "pre-order" || av2 === "order only" || av2 === "orderonly") av2 = "order_only";
      out.inStock = (av2 !== "order_only");
    }
    if(out.eta_days !== undefined && out.leadDays === undefined){
      var ld = parseInt(out.eta_days, 10);
      if(isFinite(ld) && ld > 0) out.leadDays = ld;
    }

    if(out.desc !== undefined && out.note === undefined) out.note = out.desc;
    if(out.image !== undefined && out.img === undefined) out.img = out.image;

    // ensure images array always exists when we have a single img
    try{
      var imgs2 = normImgs(out);
      if(imgs2.length){
        out.images = imgs2;
        out.img = normStr(out.img) || imgs2[0];
        out.image = out.img;
      }else{
        out.images = [];
      }
    }catch(e){
      if(!Array.isArray(out.images)) out.images = [];
    }

    if(typeof out.price === "string"){
      var pn = parseFloat(String(out.price||"").replace(/[^\d.]/g,""));
      if(isFinite(pn)) out.price = pn;
      else out.price = 0;
    }else{
      out.price = Number(out.price)||0;
    }

    if(out.category === "bike" || out.category === "bike_new") out.noCart = true;
    out.noCart = !!out.noCart;

    return out;
  }


function normalizeShopProducts(arr){
    if(!Array.isArray(arr)) return [];
    var out = [];
    for(var i=0;i<arr.length;i++){
      var p = arr[i];
      if(!p) continue;
      var n = normalizeShopProduct(p);
      if(n && n.id) out.push(n);
    }
    return out;
  }

  function getProducts(){
      try{
        var raw = DBStorage.getItem(LS_PRODUCTS_KEY);
        if(!raw) return [];
        var arr = JSON.parse(raw);
        if(!Array.isArray(arr)) return [];
        return normalizeShopProducts(arr) || [];
      }catch(e){
        return [];
      }
    }


function buildShopProductCard(p, forBikes){
    p = p || {};
    var cat = normalizeShopCategory(p.category);

    var isBike = (cat === "bike");
    var baseTitle = isBike ? (p.bike_type || p.bikeType || p.bike_kind || p.name || "") : (p.name || "");
    var ccVal = isBike ? (p.engine_cc || p.engineCC || p.cc || "") : "";
    var companyVal = isBike ? normStr(p.bike_company || p.bikeCompany || p.bike_brand || p.company || "") : "";
    var titleText = "";
    if(isBike && forBikes){
      var parts = [];
      if(companyVal) parts.push(companyVal);
      if(normStr(baseTitle)) parts.push(normStr(baseTitle));
      if(normStr(ccVal)) parts.push(normStr(ccVal) + " סמ״ק");
      titleText = parts.join(" ");
    } else {
      titleText = normStr(baseTitle);
      if(isBike && ccVal){
        titleText = (titleText || "") + " " + normStr(ccVal) + " סמ״ק";
      }
    }
    var title = escapeHtml(titleText || "");
    var note  = isBike ? "" : escapeHtml(p.note || "");
    var price = Number(p.price)||0;

    var lic = isBike ? normStr(p.license_required || p.license || "") : "";
    var licHtml = (isBike && lic) ? ('<div class="shop-card-sub">רישיון נדרש: ' + escapeHtml(lic) + '</div>') : '';

    var img = "";
    try{
      var src = "";
      if(p.img) src = p.img;
      else if(Array.isArray(p.images) && p.images.length) src = p.images[0];
      else if(Array.isArray(p.imgs) && p.imgs.length) src = p.imgs[0];
      else if(p.image) src = p.image;
      src = normStr(src);
      if(src){
        img = '<div class="shop-imgwrap"><img class="shop-pimg" src="' + escapeAttr(src) + '" alt=""></div>';
      }
    }catch(e){ img = ""; }

    var actions = "";
    var hasDetails = (cat==="helmet" || cat==="gloves" || cat==="lock" || cat==="intercom");
    var noCart = !!p.noCart || p.category === "bike" || p.category === "bike_new" || !!forBikes;

    var __mgr = false;
    try{ __mgr = document.body && document.body.classList && (document.body.classList.contains("manager-open") || document.body.classList.contains("admin-open")); }catch(e){ __mgr = false; }

    if(isBike){
      if(__mgr){
        actions = '<div class="shop-card-actions"></div>';
      } else {
        actions = '<div class="shop-card-actions">' +
          '<button class="action-btn white small" type="button" onclick="shopOpenProductDetails(\''+escapeAttr(p.id)+'\')">פרטים</button>' +
        '</div>';
      }
    } else if(noCart){
      if(__mgr){
        actions = '<div class="shop-card-actions"></div>';
      } else {
        actions = '<div class="shop-card-actions">' +
          '<button class="action-btn green small" type="button" onclick="openWhatsApp()">דברו איתנו בוואטסאפ</button>' +
          '<button class="action-btn grey small" type="button" onclick="shopOpenProductDetails(\''+escapeAttr(p.id)+'\')">פרטים</button>' +
        '</div>';
      }
    } else if(hasDetails){
      if(__mgr){
        actions = '<div class="shop-card-actions"></div>';
      } else {
        actions = '<div class="shop-card-actions">' +
          '<button class="action-btn green small" type="button" onclick="shopOpenProductDetails(\''+escapeAttr(p.id)+'\')">פרטים</button>' +
        '</div>';
      }
    } else {
      actions = '<div class="shop-card-actions">' +
        '<button class="action-btn green small" type="button" onclick="addToCartFromDetails(\''+escapeAttr(p.id)+'\')">הוסף לעגלה</button>' +
        '<button class="action-btn grey small" type="button" onclick="openWhatsApp()">שאלו בוואטסאפ</button>' +
      '</div>';
    }

    if(__mgr){
      try{
        var editBtn = '<button class=\"action-btn white small mgr-card-half\" type=\"button\" onclick=\"mgrOpenProductEditor(&quot;'+escapeAttr(p.id)+'&quot;)\">ערוך</button>';
        var delBtn  = '<button class=\"action-btn danger small mgr-card-half\" type=\"button\" onclick=\"mgrDeleteProduct(&quot;'+escapeAttr(p.id)+'&quot;)\">מחק</button>';
        var btns = editBtn + delBtn;
        if(actions && actions.indexOf(editBtn) === -1){
          actions = actions.replace('</div>', btns + '</div>');
        }
      }catch(e){}
    }

return '' +
      '<div class=\"shop-card\">' +
        '<div class="shop-card-top">' +
          '<div style="flex:1;min-width:0;">' +
            '<div class="shop-card-title">' + title + '</div>' +
            (licHtml || '') +
            (note ? ('<div class="shop-card-sub">' + note + '</div>') : '')  +
            (price ? ('<div class="shop-price">₪' + (Math.round(price)) + '</div>') : '') +
          '</div>' +
          img +
        '</div>' +
        actions +
      '</div>';
  }

  function renderShopCatalogs(){
    try{
      var products = getProducts();
      var lists = document.querySelectorAll('[data-shop-list]');
      for(var i=0;i<lists.length;i++){
        var el = lists[i];
        var cat = String(el.getAttribute('data-shop-list') || '').toLowerCase().trim();
        var rows = [];
        var section = String(el.getAttribute('data-shop-section') || '').toLowerCase().trim(); // in / order / ''
        for(var j=0;j<products.length;j++){
          var p = products[j] || {};
          if(normalizeShopCategory(p.category) !== normalizeShopCategory(cat)) continue;
          if(section === "in" && !p.inStock) continue;
          if(section === "order" && p.inStock) continue;
          rows.push(buildShopProductCard(p, false));
        }
        el.innerHTML = rows.length ? rows.join('') : '<div class="shop-mini" style="text-align:center;">אין מוצרים להצגה</div>';
      }

      var bikesEl = document.querySelector('[data-shop-bikes]');
      if(bikesEl){
        var bikes = [];
        for(var k=0;k<products.length;k++){
          var bp = products[k] || {};
          if(normalizeShopCategory(bp.category) === 'bike'){
            bikes.push(buildShopProductCard(bp, true));
          }
        }
        bikesEl.innerHTML = bikes.length ? bikes.join('') : '<div class="shop-mini" style="text-align:center;">אין אופנועים להצגה</div>';
      }
    }catch(e){}
  }
  window.renderShopCatalogs = renderShopCatalogs;

  try{
    document.addEventListener("app:pageopen", function(ev){
      var d = ev && ev.detail ? ev.detail : null;
      var pid = d && d.pageId ? String(d.pageId) : "";
      if(!pid) return;
      if(SHOP_PAGES.indexOf(pid) !== -1 || pid === 'usedBikesPage'){
        try{ renderShopCatalogs(); }catch(e){}
      }
    });
  }catch(e){}

  try{
    document.addEventListener("DOMContentLoaded", function(){
      setTimeout(function(){
        try{ renderShopCatalogs(); }catch(e){}
      }, 50);
    });
  }catch(e){}


  function getCartKey(){
    var u = "guest";
    try{ if(typeof getCurrentUser === "function") u = getCurrentUser(); }catch(e){}
    return "shop_cart_v1_" + String(u || "guest");
  }
  var __shopCartMem = window.__shopCartMem || (window.__shopCartMem = {});
    
  // Safe storage wrappers (some WebViews block localStorage on file://)
  function shopSafeStoreGet(key){
    try { return DBStorage.getItem(key); } catch(e) {}
    try { return sessionStorage.getItem(key); } catch(e) {}
    window.__SHOP_MEM_STORE = window.__SHOP_MEM_STORE || {};
    return Object.prototype.hasOwnProperty.call(window.__SHOP_MEM_STORE, key) ? window.__SHOP_MEM_STORE[key] : null;
  }
  function shopSafeStoreSet(key, val){
    try { DBStorage.setItem(key, val); return true; } catch(e) {}
    try { sessionStorage.setItem(key, val); return true; } catch(e) {}
    window.__SHOP_MEM_STORE = window.__SHOP_MEM_STORE || {};
    window.__SHOP_MEM_STORE[key] = val;
    return true;
  }

function normalizeCartArray(arr){
    if(!Array.isArray(arr)) return [];
    var out = [];
    for(var i=0;i<arr.length;i++){
      var it = arr[i];
      if(!it) continue;
      var q = 1;
      try{ q = parseInt(it.qty, 10); }catch(e){ q = 1; }
      if(!isFinite(q) || q < 1) q = 1;

      // Copy item without qty
      var base = {};
      for(var k in it){
        if(!Object.prototype.hasOwnProperty.call(it, k)) continue;
        if(k === "qty") continue;
        base[k] = it[k];
      }

      for(var j=0;j<q;j++){
        var cp = {};
        for(var kk in base){
          if(!Object.prototype.hasOwnProperty.call(base, kk)) continue;
          cp[kk] = base[kk];
        }
        out.push(cp);
      }
    }
    return out;
  }

function readCart(){
    var key = getCartKey();
    var raw = shopSafeStoreGet(key);
    if(!raw) return [];
    try{
      var data = JSON.parse(raw);
      data = Array.isArray(data) ? data : [];
      return normalizeCartArray(data);
    }catch(e){
      return [];
    }
  }
    function writeCart(cart){
    var key = "shop_cart_v1_guest";
    try{ key = getCartKey(); }catch(e){ key = "shop_cart_v1_guest"; }

    cart = normalizeCartArray(Array.isArray(cart) ? cart : []);

    var payload = "[]";
    try{
      payload = JSON.stringify(cart);
    }catch(e){
      payload = "[]";
    }

    // Always keep an in-memory copy (works even if storage APIs are blocked)
    try{ window.__SHOP_MEM_STORE = window.__SHOP_MEM_STORE || {}; window.__SHOP_MEM_STORE[key] = payload; }catch(e){}
    try{ window.__shopCartMem = window.__shopCartMem || {}; window.__shopCartMem[key] = payload; }catch(e){}

    // Best-effort persistence (never throw)
    try{ if(typeof localStorage !== "undefined" && localStorage) DBStorage.setItem(key, payload); }catch(e){}
    try{ if(typeof sessionStorage !== "undefined" && sessionStorage) sessionStorage.setItem(key, payload); }catch(e){}

    // Legacy safe-store (never allow this to break add-to-cart)
    try{ if(typeof shopSafeStoreSet === "function") shopSafeStoreSet(key, payload); }catch(e){}

    return true;
  }

function cartCount(){
    var cart = readCart();
    return Array.isArray(cart) ? cart.length : 0;
  }

  function updateShopCartBadge(){
    var badge = document.getElementById("shopCartBadge");
    if(!badge) return;
    var c = cartCount();
    if(c > 0){
      badge.hidden = false;
      badge.textContent = c > 99 ? "99+" : String(c);
    }else{
      badge.hidden = true;
      badge.textContent = "";
    }
  }
  window.updateShopCartBadge = updateShopCartBadge;

  function rememberReturnPage(){
    try{
      if(typeof getCurrentPageId !== "function") return;
      var cur = getCurrentPageId();
      if(cur && SHOP_PAGES.indexOf(cur) !== -1) __shopReturnPage = cur;
    }catch(e){}
  }

  function findProduct(id){
    var products = getProducts();
    for(var i=0;i<products.length;i++){
      if(String(products[i].id) === String(id)) return products[i];
    }
    return null;
  }

    function shopAddToCart(id, opts){
    opts = opts || {};
    var p = null;
    try{ p = findProduct(id); }catch(e){ p = null; }

    // Fallback: allow add-to-cart even if lookup by id fails (WebView/localStorage edge cases)
    if(!p && opts && opts.__fallbackProduct){
      try{
        p = opts.__fallbackProduct || null;
        if(p && (p.id==null || p.id==="")) p.id = String(id||"");
      }catch(e){ p = null; }
    }

    if(!p){ try{ shopToast("מוצר לא נמצא"); }catch(_){ } return false; }

    // bikes (or products marked noCart) are not added to cart
    if(p.noCart || p.category === "bike"){
      try{ shopToast("אופנועים נמכרים במקום – דברו איתנו"); }catch(_){ }
      return false;
    }

    var color = normStr(opts.color || "");
    var size  = normStr(opts.size || "");

    // Ensure we always have a stable id for cart operations
    try{
      id = String((p && p.id)!=null ? p.id : (id||""));
      id = id.trim();
    }catch(e){}
    if(!id){
      id = "tmp_" + Date.now() + "_" + Math.random().toString(16).slice(2);
      try{ if(p) p.id = id; }catch(e){}
    }

    var cart = [];
    try{
      cart = readCart();
      if(!Array.isArray(cart)) cart = [];
    }catch(e){
      cart = [];
    }

    // v5: no quantities in cart - every add creates a separate line item
    var key = String(id);
    var newItem = {id:key};
    if(color) newItem.color = color;
    if(size)  newItem.size = size;

    // Snapshot fields so cart works even if product catalog lookup fails later
    try{ newItem.name = normStr(p && p.name!=null ? p.name : ""); }catch(e){}
    try{ newItem.price = Math.max(0, Number(p && p.price!=null ? p.price : 0) || 0); }catch(e){ newItem.price = 0; }
    try{ newItem.img = normStr((p && (p.img||p.image)) ? (p.img||p.image) : ""); }catch(e){}

    // Snapshot availability (order only) fields when exist
    try{ if(p && p.availability!=null) newItem.availability = String(p.availability); }catch(e){}
    try{
      var ld = (p && (p.leadDays!=null ? p.leadDays : (p.eta_days!=null ? p.eta_days : null)));
      if(ld!=null && ld!=="" && isFinite(Number(ld))) newItem.leadDays = Number(ld);
    }catch(e){}

    cart.push(newItem);

    // Persist first. UI updates should never fail the add-to-cart action.
    try{ 
      writeCart(cart); 
    }catch(e){
      // If persistence fails in this WebView, keep cart in-memory and still report success.
      try{
        window.__shopCartMem = window.__shopCartMem || {};
        var k = "shop_cart_v1_guest";
        try{ if(typeof getCartKey === "function") k = getCartKey(); }catch(_e){}
        window.__shopCartMem[k] = JSON.stringify(Array.isArray(cart) ? cart : []);
      }catch(_e2){}
    }

    try{ updateShopCartBadge(); }catch(e){}
    try{ renderShopCart(); }catch(e){}
    try{ shopToast("נוסף לעגלה"); }catch(e){}
    return true;
  }
  window.shopAddToCart = shopAddToCart;


  // Ultra-safe add-to-cart used by the confirmation flow (never depends on catalog lookup)
  function shopForceAddToCart(payload){
    try{
      payload = payload || {};
      var cart = [];
      try{ cart = readCart(); if(!Array.isArray(cart)) cart = []; }catch(e){ cart = []; }

      var baseId = "";
      try{ baseId = normStr(payload.baseId!=null ? payload.baseId : payload.id); }catch(e){ baseId = ""; }
      if(!baseId) baseId = "tmp_" + Date.now() + "_" + Math.random().toString(16).slice(2);

      var color = "";
      var size  = "";
      try{ color = normStr(payload.color || ""); }catch(e){ color = ""; }
      try{ size  = normStr(payload.size  || ""); }catch(e){ size  = ""; }

      var name = "";
      var price = 0;
      var img = "";
      try{ name = normStr(payload.name || ""); }catch(e){ name = ""; }
      try{ price = Math.max(0, Number(payload.price!=null ? payload.price : 0) || 0); }catch(e){ price = 0; }
      try{ img = normStr(payload.img || payload.image || ""); }catch(e){ img = ""; }

      // v5: no quantities - every add creates a separate line item
      var it = {id:String(baseId)};
      it.baseId = String(baseId);
      if(color) it.color = color;
      if(size)  it.size = size;
      it.name = name || "מוצר";
      it.price = price;
      it.img = img;

      // Snapshot availability fields if provided
      try{ if(payload.availability!=null) it.availability = String(payload.availability); }catch(e){}
      try{
        var ld = (payload.leadDays!=null ? payload.leadDays : (payload.eta_days!=null ? payload.eta_days : null));
        if(ld!=null && ld!=="" && isFinite(Number(ld))) it.leadDays = Number(ld);
      }catch(e){}

      cart.push(it);

      try{ writeCart(cart); }catch(e){
        // Last-resort: keep cart in memory
        try{
          window.__shopCartMem = window.__shopCartMem || {};
          var k = "shop_cart_v1_guest";
          try{ if(typeof getCartKey === "function") k = getCartKey(); }catch(_e){}
          window.__shopCartMem[k] = JSON.stringify(cart);
        }catch(_e2){}
      }

      try{ updateShopCartBadge(); }catch(e){}
      try{ renderShopCart(); }catch(e){}
      try{ shopToast("נוסף לעגלה"); }catch(e){}
      return true;
    }catch(e){
      try{ shopToast("לא הצלחנו להוסיף לעגלה"); }catch(_){}
      return false;
    }
  }
  window.shopForceAddToCart = shopForceAddToCart;


  
function shopOpenProductDetails(id){
    var p = null;
    try{ p = findProduct(id); }catch(e){ p = null; }
    if(!p){ try{ shopToast("מוצר לא נמצא"); }catch(e){} return; }

    // normalize images
    try{
      if(!Array.isArray(p.images) || !p.images.length){
        var tmp = [];
        if(Array.isArray(p.imgs)) tmp = p.imgs;
        else if(normStr(p.img)) tmp = [p.img];
        else if(normStr(p.image)) tmp = [p.image];
        p.images = (tmp||[]).map(function(x){return normStr(x);}).filter(Boolean);
      }else{
        p.images = (p.images||[]).map(function(x){return normStr(x);}).filter(Boolean);
      }
      if(!normStr(p.img) && p.images.length) p.img = p.images[0];
    }catch(e){}

    var overlay = document.getElementById("shopDetailsOverlay");
    var body = document.getElementById("shopDetailsBody");
    var title = document.getElementById("shopDetailsTitle");
    if(!overlay || !body || !title){ return; }

    title.textContent = "פרטים";
    overlay.classList.remove("hidden");
    overlay.setAttribute("aria-hidden","false");

    try{ overlay.dataset.productId = String((p && p.id)!=null ? p.id : (id||"")); }catch(e){}
    try{ overlay.dataset.imgIndex = "0"; }catch(e){}

    function noInfoText(v){
      var s = "";
      try{ s = normStr(v==null ? "" : v); }catch(e){ s = ""; }
      if(!s) return "";
      return s;
    }

    function buildGallery(imgs){
      imgs = (imgs||[]).map(function(x){ return normStr(x); }).filter(Boolean);
      if(!imgs.length) return "";
      var main = imgs[0];
      var nav = "";
      if(imgs.length > 1){
        nav = ''
          + '<button class="shopdetails-nav prev" type="button" aria-label="הקודם" onclick="shopDetailsPrevImg(event)">‹</button>'
          + '<button class="shopdetails-nav next" type="button" aria-label="הבא" onclick="shopDetailsNextImg(event)">›</button>';
      }
      var thumbs = "";
      if(imgs.length > 1){
        thumbs = '<div class="shopdetails-thumbs">' + imgs.map(function(src, i){
          var act = (i===0) ? " active" : "";
          return '<button type="button" class="shopdetails-thumbbtn'+act+'" onclick="shopDetailsSetImg('+i+', event)" aria-label="תמונה '+(i+1)+'">'
            + '<img class="shopdetails-thumbimg" src="'+escapeAttr(src)+'" alt=""></button>';
        }).join("") + '</div>';
      }
      return ''
        + '<div class="shopdetails-gallery" data-count="'+imgs.length+'">'
        +   '<div class="shopdetails-imgwrap" id="shopDetailsImgWrap">'
        +     nav
        +     '<img class="shopdetails-img" id="shopDetailsMainImg" src="'+escapeAttr(main)+'" alt="">'
        +   '</div>'
        +   thumbs
        + '</div>';
    }

    var __cat0 = "";
    try{ __cat0 = normalizeShopCategory(p.category); }catch(e){ __cat0 = ""; }

    var name = escapeHtml(noInfoText(p.name) || "");
    var idLine = escapeHtml(String(p.id||""));
    try{ if(__cat0 === "bike"){ idLine = ""; } }catch(e){}
    var price = "";
    try{ price = (isFinite(p.price) ? ("₪" + String(Math.round(p.price))) : escapeHtml(String(p.price||""))); }catch(e){ price = ""; }

    var badge = "";
    try{
      var __isBike = (!!p.noCart || normalizeShopCategory(p.category)==="bike" || normalizeShopCategory(p.category)==="bike_new");
      if(!__isBike){
      var inStock = (p.inStock !== undefined) ? !!p.inStock : (String(p.availability||"").toLowerCase().indexOf("order")===-1);
      if(inStock){
        badge = '<div class="shopdetails-badge ok">זמין במלאי</div>';
      }else{
        var ld = parseInt(p.leadDays || p.eta_days || "", 10);
        if(isFinite(ld) && ld > 0){
          badge = '<div class="shopdetails-badge warn">בהזמנה בלבד עד '+ld+' ימים, איסוף מהמשרד</div>';
        }else{
          badge = '<div class="shopdetails-badge warn">בהזמנה בלבד, איסוף מהמשרד</div>';
        }
      }
      }
    }catch(e){ badge = ""; }

    var note = "";
    try{
      var n = (normalizeShopCategory(p.category) === "bike") ? "" : noInfoText(p.note || p.desc || "");
      if(n) note = '<div class="shopdetails-note">'+escapeHtml(n)+'</div>';
    }catch(e){ note = ""; }

    
    // Options (sizes / colors) as clickable chips
    var optHtml = "";
    var __detailsColors = [];
    var __detailsSizes = [];

    try{
      var c = p.colors;
      if(Array.isArray(c)) __detailsColors = c.slice();
      else if(typeof c === "string") __detailsColors = c.split(",").map(function(x){return x.trim();}).filter(Boolean);
    }catch(e){ __detailsColors = []; }

    try{
      var s2 = p.sizes;
      if(Array.isArray(s2)) __detailsSizes = s2.slice();
      else if(typeof s2 === "string") __detailsSizes = s2.split(",").map(function(x){return x.trim();}).filter(Boolean);
    }catch(e){ __detailsSizes = []; }

    function buildOptBlock(label, list, kind){
      if(!list || !list.length) return "";
      return ''
        + '<div class="shopopt" data-kind="'+kind+'">'
        +   '<div class="shopopt-title">'+label+'</div>'
        +   '<div class="shopopt-chips">'
        +     (list||[]).map(function(x,i){
                var v = normStr(x);
                if(!v) return "";
                var sel = "";
                return '<button type="button" class="shopchip'+sel+'" data-kind="'+kind+'" data-val="'+escapeAttr(v)+'">'+escapeHtml(v)+'</button>';
              }).join("")
        +   '</div>'
        + '</div>';
    }

    optHtml = buildOptBlock("מידות", __detailsSizes, "size") + buildOptBlock("צבעים", __detailsColors, "color");

    try{ overlay.dataset.selSize = ""; }catch(e){}
    try{ overlay.dataset.selColor = ""; }catch(e){}

    // Used bikes specs (bikes_used)
    try{
      var __cat = normalizeShopCategory(p.category);
      if(__cat === "bike"){
        var __rows = [];
        function __addKV(label, value){
          value = noInfoText(value);
          if(!value) return;
          __rows.push('<div class="shopdetails-kv"><div class="k">'+escapeHtml(label)+'</div><div class="v">'+escapeHtml(value)+'</div></div>');
        }
        function __val(v){
          var s = "";
          try{ s = normStr(v==null ? "" : v); }catch(e){ s = ""; }
          return s || "—";
        }
        function __addKV(label, value){
          __rows.push('<div class="shopdetails-kv"><div class="k">'+escapeHtml(label)+'</div><div class="v">'+escapeHtml(__val(value))+'</div></div>');
        }
        __addKV("חברה", p.bike_company || p.bikeCompany || p.bike_brand || p.company || "");
        __addKV("סוג", p.bike_type || p.bikeType || p.bike_kind || "");
        __addKV("סמ״ק", p.engine_cc || p.engineCC || p.cc || "");
        __addKV("שנה", p.onroad_year || p.onRoadYear || p.year || "");
        __addKV("קילומטרג'", p.bike_km || p.km || p.mileage || p.odometer_km || "");
        __addKV("רישיון", p.license_required || p.license || "");
        __addKV("יד", p.hand || p.owner_hand || "");
        __addKV("טסט עד", p.test_until || p.testUntil || "");
        __addKV("מצב אופנוע", p.condition || p.cond || "");

        var __gd = __val(p.general_details || p.bike_details || p.desc || p.note || "");
        if(__rows.length){
          optHtml = (optHtml||"") + __rows.join('')
            + '<div class="shopdetails-generalbox"><div class="gb-title">פרטים כלליים</div><div class="gb-text">'+escapeHtml(__gd)+'</div></div>';
        }
      }
    }catch(e){}
var actions = "";
    try{
      var noCart = !!p.noCart || p.category === "bike" || p.category === "bike_new";
      if(noCart){
        actions = ''
          + '<div class="shopdetails-actions">'
          +   '<button type="button" class="action-btn green" onclick="openWhatsApp()">דברו איתנו בוואטסאפ</button>'
          +   '<button type="button" class="action-btn" onclick="shopCloseProductDetails()">סגור</button>'
          + '</div>';
      }else{
        actions = ''
          + '<div class="shopdetails-actions">'
          +   '<button type="button" class="action-btn green" id="shopDetailsAddBtn" onclick="shopAskAddToCartFromDetails(\''+escapeAttr(p.id)+'\')">הוסף לעגלה</button>'
          +   '<button type="button" class="action-btn" onclick="shopCloseProductDetails()">סגור</button>'
          + '</div>';
      }
    }catch(e){ actions = ""; }

    var gallery = "";
    try{ gallery = buildGallery(p.images || []); }catch(e){ gallery = ""; }

    body.innerHTML = ''
      + (gallery || '')
      + '<div class="shopdetails-meta">'
      +   '<div class="shopdetails-name">'+name+'</div>'
      +   (idLine ? '<div class="shopdetails-idline">'+idLine+'</div>' : '')
      +   (price ? '<div class="shopdetails-price">'+price+'</div>' : '')
      +   badge
      +   '<div class="shopdetails-kvs">' + (optHtml||"") + '</div>'
      +   note
      +   actions
      + '</div>';

    
    try{ shopDetailsUpdateAddBtn(); }catch(e){}

    // swipe on main image (if multiple)
    try{
      var wrap = document.getElementById("shopDetailsImgWrap");
      if(wrap){
        var sx = 0, sy = 0, active = false;
        wrap.addEventListener("touchstart", function(ev){
          try{
            if(!ev || !ev.touches || !ev.touches[0]) return;
            sx = ev.touches[0].clientX; sy = ev.touches[0].clientY; active = true;
          }catch(e){}
        }, {passive:true});
        wrap.addEventListener("touchend", function(ev){
          try{
            if(!active) return; active = false;
            if(!ev || !ev.changedTouches || !ev.changedTouches[0]) return;
            var dx = ev.changedTouches[0].clientX - sx;
            var dy = ev.changedTouches[0].clientY - sy;
            if(Math.abs(dx) < 35 || Math.abs(dx) < Math.abs(dy)) return;
            if(dx < 0) shopDetailsNextImg();
            else shopDetailsPrevImg();
          }catch(e){}
        }, {passive:true});
      }
    }catch(e){}
  }

  function shopDetailsSetImg(idx, ev){
    try{ if(ev && ev.preventDefault) ev.preventDefault(); }catch(e){}
    try{ if(ev && ev.stopPropagation) ev.stopPropagation(); }catch(e){}
    var overlay = document.getElementById("shopDetailsOverlay");
    if(!overlay) return;
    var pid = "";
    try{ pid = overlay.dataset.productId || ""; }catch(e){ pid=""; }
    var p = null;
    try{ p = findProduct(pid); }catch(e){ p = null; }
    if(!p) return;
    try{
      var imgs = Array.isArray(p.images) ? p.images : [];
      if(!imgs.length){
        if(Array.isArray(p.imgs)) imgs = p.imgs;
        else if(normStr(p.img)) imgs = [p.img];
        else if(normStr(p.image)) imgs = [p.image];
      }
      imgs = (imgs||[]).map(function(x){return normStr(x);}).filter(Boolean);
      if(!imgs.length) return;
      idx = parseInt(idx,10);
      if(!isFinite(idx) || idx<0) idx = 0;
      if(idx >= imgs.length) idx = imgs.length-1;
      overlay.dataset.imgIndex = String(idx);

      var main = document.getElementById("shopDetailsMainImg");
      if(main) main.src = imgs[idx];

      var btns = overlay.querySelectorAll(".shopdetails-thumbbtn");
      for(var i=0;i<btns.length;i++){
        try{
          if(i===idx) btns[i].classList.add("active");
          else btns[i].classList.remove("active");
        }catch(e){}
      }
    }catch(e){}
  }
  function shopDetailsPrevImg(ev){
    try{ if(ev && ev.preventDefault) ev.preventDefault(); }catch(e){}
    try{ if(ev && ev.stopPropagation) ev.stopPropagation(); }catch(e){}
    var overlay = document.getElementById("shopDetailsOverlay");
    if(!overlay) return;
    var idx = 0;
    try{ idx = parseInt(overlay.dataset.imgIndex||"0",10); }catch(e){ idx=0; }
    idx = (isFinite(idx)?idx:0) - 1;
    shopDetailsSetImg(idx);
  }
  function shopDetailsNextImg(ev){
    try{ if(ev && ev.preventDefault) ev.preventDefault(); }catch(e){}
    try{ if(ev && ev.stopPropagation) ev.stopPropagation(); }catch(e){}
    var overlay = document.getElementById("shopDetailsOverlay");
    if(!overlay) return;
    var idx = 0;
    try{ idx = parseInt(overlay.dataset.imgIndex||"0",10); }catch(e){ idx=0; }
    idx = (isFinite(idx)?idx:0) + 1;
    shopDetailsSetImg(idx);
  }

  // expose for inline handlers
  try{ window.shopOpenProductDetails = shopOpenProductDetails; }catch(e){}

  try{ window.shopDetailsSetImg = shopDetailsSetImg; }catch(e){}
  try{ window.shopDetailsPrevImg = shopDetailsPrevImg; }catch(e){}
  try{ window.shopDetailsNextImg = shopDetailsNextImg; }catch(e){}
function shopCloseProductDetails(){
    try{ shopCancelAddConfirm(); }catch(e){}
    var overlay = document.getElementById("shopDetailsOverlay");
    if(!overlay) return;
    overlay.classList.add("hidden");
    overlay.setAttribute("aria-hidden","true");
    document.body.classList.remove("modal-open");
  }
  window.shopCloseProductDetails = shopCloseProductDetails;

  function shopAddToCartFromDetails(id){
    var colorEl = document.getElementById("shopDetailsColor");
    var sizeEl = document.getElementById("shopDetailsSize");
    var color = colorEl ? normStr(colorEl.value) : "";
    var size = sizeEl ? normStr(sizeEl.value) : "";
    shopAddToCart(id, {color: color, size: size});
    shopCloseProductDetails();
  }
  window.shopAddToCartFromDetails = shopAddToCartFromDetails;

  var __shopPendingAddId = null;

  // v23: chip selector handler (color/size) in details modal
  document.addEventListener('click', function(ev){
    var btn = ev.target && ev.target.closest ? ev.target.closest('.shopchip') : null;
    if(!btn) return;
    var group = btn.closest ? btn.closest('.shopchips') : null;
    if(!group) return;

    var targetId = group.getAttribute('data-target') || '';
    if(!targetId) return;

    // active state
    try{
      var all = group.querySelectorAll('.shopchip');
      for(var i=0;i<all.length;i++) all[i].classList.remove('active');
    }catch(e){}
    btn.classList.add('active');

    // write selected value
    var v = btn.getAttribute('data-value') || '';
    var inp = document.getElementById(targetId);
    if(inp) inp.value = v;
  }, {passive:true});


  function shopAskAddToCartFromDetails(id){
    __shopPendingAddId = String(id || "");
    var sub = document.getElementById("shopAddConfirmSub");
    if(sub){
      var nm = "";
      try{
        var p = null;
        try{ p = findProduct(id); }catch(e){ p = null; }
        nm = p && p.name!=null ? normStr(p.name) : "";
      }catch(e){ nm = ""; }
      sub.textContent = nm ? ("מוצר: " + nm) : "";
    }
    var ov = document.getElementById("shopAddConfirmOverlay");
    if(!ov){
      shopAddToCartFromDetails(id);
      return;
    }
    ov.classList.remove("hidden");
    ov.setAttribute("aria-hidden","false");
  }
  window.shopAskAddToCartFromDetails = shopAskAddToCartFromDetails;

  function shopCancelAddConfirm(){
    var ov = document.getElementById("shopAddConfirmOverlay");
    if(ov){
      ov.classList.add("hidden");
      ov.setAttribute("aria-hidden","true");
    }
    __shopPendingAddId = null;
  }
  window.shopCancelAddConfirm = shopCancelAddConfirm;

    
  // v26: animate product image into cart on confirm add-to-cart (Android/WebView-safe)
  function shopAnimateImageToCart(imgEl, done){
    var cb = (typeof done === "function") ? done : function(){};
    try{
      if(!imgEl || !imgEl.getBoundingClientRect){ cb(); return; }
      var cartBtn = document.getElementById("shopCartBtn");
      if(!cartBtn || !cartBtn.getBoundingClientRect){ cb(); return; }

      var r1 = imgEl.getBoundingClientRect();
      var r2 = cartBtn.getBoundingClientRect();

      // if element not visible / zero size
      if(!r1 || r1.width < 2 || r1.height < 2){ cb(); return; }

      var clone = imgEl.cloneNode(true);
      clone.removeAttribute("id");
      clone.style.position = "fixed";
      clone.style.left = (r1.left) + "px";
      clone.style.top  = (r1.top)  + "px";
      clone.style.width  = (r1.width) + "px";
      clone.style.height = (r1.height) + "px";
      clone.style.zIndex = "999999";
      clone.style.pointerEvents = "none";
      clone.style.margin = "0";
      clone.style.maxWidth = "none";
      clone.style.maxHeight = "none";
      clone.style.objectFit = "cover";
      try{ clone.style.borderRadius = getComputedStyle(imgEl).borderRadius || "14px"; }catch(e){ clone.style.borderRadius="14px"; }
      document.body.appendChild(clone);

      var endX = (r2.left + r2.width/2) - (r1.left + r1.width/2);
      var endY = (r2.top  + r2.height/2) - (r1.top  + r1.height/2);

      // prefer Web Animations API, fallback to CSS transitions
      var finished = false;
      function finish(){
        if(finished) return;
        finished = true;
        try{ clone.remove(); }catch(e){ try{ if(clone.parentNode) clone.parentNode.removeChild(clone); }catch(_e){} }
        cb();
      }

      try{
        if(clone.animate){
          var anim = clone.animate([
            { transform: "translate(0px,0px) scale(1)", opacity: 1 },
            { transform: "translate(" + endX + "px," + endY + "px) scale(0.2)", opacity: 0.15 }
          ], { duration: 520, easing: "cubic-bezier(0.2,0.9,0.2,1)", fill: "forwards" });
          anim.onfinish = finish;
          anim.oncancel = finish;
          // hard timeout guard (some WebViews never fire onfinish)
          setTimeout(finish, 750);
        }else{
          clone.style.transition = "transform 520ms cubic-bezier(0.2,0.9,0.2,1), opacity 520ms cubic-bezier(0.2,0.9,0.2,1)";
          // force reflow
          void clone.offsetWidth;
          clone.style.transform = "translate(" + endX + "px," + endY + "px) scale(0.2)";
          clone.style.opacity = "0.15";
          setTimeout(finish, 700);
        }
      }catch(e){
        finish();
      }
    }catch(e){
      try{ cb(); }catch(_){}
    }
  }

  function shopAnimateDetailsImageToCart(done){
    var img = document.getElementById("shopDetailsMainImg");
    if(!img){
      try{ img = document.querySelector("#shopDetailsBody .shopdetails-img"); }catch(e){ img = null; }
    }
    shopAnimateImageToCart(img, done);
  }

function shopConfirmAddConfirm(){
    var id = __shopPendingAddId;

    // sanitize id (sometimes becomes "undefined"/"null" in some WebViews)
    try{
      var s = String(id==null ? "" : id).trim();
      if(s === "undefined" || s === "null") s = "";
      id = s;
    }catch(e){}

    // fallback: try read from details overlay dataset
    if(!id){
      try{
        var ovDet = document.getElementById("shopDetailsOverlay");
        if(ovDet && ovDet.dataset && ovDet.dataset.productId) id = String(ovDet.dataset.productId || "");
      }catch(e){}
    }

    // read selected options from details UI
    var color = "";
    var size = "";
    try{
      var colorEl = document.getElementById("shopDetailsColor");
      if(colorEl && colorEl.value) color = String(colorEl.value || "");
    }catch(e){}
    try{
      var sizeEl = document.getElementById("shopDetailsSize");
      if(sizeEl && sizeEl.value) size = String(sizeEl.value || "");
    }catch(e){}

    // close confirm first so the UI responds immediately
    shopCancelAddConfirm();

    if(!id) return;

    // Build a fallback snapshot from the currently open details UI
    var fb = null;
    try{
      var b = document.getElementById("shopDetailsBody");
      if(b){
        var nmEl = b.querySelector(".shopdetails-name");
        var prEl = b.querySelector(".shopdetails-price");
        var imEl = b.querySelector(".shopdetails-img");
        var nm = nmEl ? normStr(nmEl.textContent || "") : "";
        var pr = 0;
        if(prEl){
          pr = parseFloat(String(prEl.textContent || "").replace(/[^\d.]/g,""));
          if(!isFinite(pr)) pr = 0;
        }
        var im = "";
        try{
          var mainImg = document.getElementById("shopDetailsMainImg");
          im = mainImg ? String(mainImg.getAttribute("src") || "") : (imEl ? String(imEl.getAttribute("src") || "") : "");
        }catch(e){ im = imEl ? String(imEl.getAttribute("src") || "") : ""; }
        fb = {id: String(id||""), name: nm, price: pr, img: im, category: "gear", inStock: true, note: ""};
      }
    }catch(e){ fb = null; }

    var prod = null;
    try{ prod = findProduct(id); }catch(e){ prod = null; }
    if(!prod && fb) prod = fb;

    function doAdd(){
      var ok = false;
      try{
        ok = !!shopForceAddToCart({
          id: String(id),
          baseId: String(id),
          name: (prod && prod.name!=null ? prod.name : (fb && fb.name!=null ? fb.name : "")),
          price: (prod && prod.price!=null ? prod.price : (fb && fb.price!=null ? fb.price : 0)),
          img: (prod && (prod.img||prod.image) ? (prod.img||prod.image) : (fb && fb.img ? fb.img : "")),
          color: color,
          size: size
        });
      }catch(e){
        ok = false;
      }

      if(!ok){
        try{ shopToast("לא הצלחנו להוסיף לעגלה"); }catch(_){}
        return;
      }

      // close product details only on success
      try{ shopCloseProductDetails(); }catch(e){}
    }

    // v26: animate image into cart, then add & close
    try{
      shopAnimateDetailsImageToCart(function(){
        try{ doAdd(); }catch(e){}
      });
    }catch(e){
      doAdd();
    }
  }
  window.shopConfirmAddConfirm = shopConfirmAddConfirm;


  function shopOpenFullImage(src){
    var overlay = document.getElementById("shopImgOverlay");
    var img = document.getElementById("shopImgOverlayImg");
    if(!overlay || !img) return;
    img.src = src;
    overlay.classList.remove("hidden");
    overlay.setAttribute("aria-hidden","false");
  }
  window.shopOpenFullImage = shopOpenFullImage;

  function shopCloseFullImage(){
    var overlay = document.getElementById("shopImgOverlay");
    var img = document.getElementById("shopImgOverlayImg");
    if(!overlay || !img) return;
    overlay.classList.add("hidden");
    overlay.setAttribute("aria-hidden","true");
    img.removeAttribute("src");
  }
  window.shopCloseFullImage = shopCloseFullImage;

function shopSetQty(id, delta){
    id = String(id);
    delta = Number(delta)||0;
    var cart = readCart();
    if(!Array.isArray(cart)) cart = [];

    if(delta > 0){
      var base = null;
      for(var i=0;i<cart.length;i++){
        if(String(cart[i] && cart[i].id) === id){ base = cart[i]; break; }
      }
      for(var j=0;j<delta;j++){
        if(base){
          var cp = {};
          for(var k in base){
            if(!Object.prototype.hasOwnProperty.call(base, k)) continue;
            if(k === "qty") continue;
            cp[k] = base[k];
          }
          cart.push(cp);
        }else{
          cart.push({id:id});
        }
      }
    }else if(delta < 0){
      var removeN = Math.abs(delta);
      for(var r=0;r<removeN;r++){
        var idx = -1;
        for(var i2=0;i2<cart.length;i2++){
          if(String(cart[i2] && cart[i2].id) === id){ idx = i2; break; }
        }
        if(idx >= 0) cart.splice(idx,1);
        else break;
      }
    }

    writeCart(cart);
    updateShopCartBadge();
    try{ renderShopCart(); }catch(e){}
    try{ renderShopCheckout(); }catch(e){}
  }
  window.shopSetQty = shopSetQty;

  function shopRemoveCartIndex(idx){
    idx = Number(idx);
    if(!isFinite(idx)) return;
    var cart = readCart();
    if(!Array.isArray(cart)) cart = [];
    if(idx < 0 || idx >= cart.length) return;
    cart.splice(idx,1);
    writeCart(cart);
    updateShopCartBadge();
    try{ renderShopCart(); }catch(e){}
    try{ renderShopCheckout(); }catch(e){}
  }
  window.shopRemoveCartIndex = shopRemoveCartIndex;

  function shopCartOpenDetails(id){
    try{ closeShopCart(); }catch(e){}
    try{
      if(typeof shopOpenProductDetails === "function"){
        shopOpenProductDetails(String(id));
      }
    }catch(e){}
  }
  window.shopCartOpenDetails = shopCartOpenDetails;


  function renderShopCart(){
    var list = document.getElementById("shopCartList");
    var sum  = document.getElementById("shopCartSummary");
    var mini = document.getElementById("shopCartMini");
    if(!list || !sum || !mini) return;

    var cart = readCart();
    if(!cart.length){
      list.innerHTML = '<div class="shop-mini" style="text-align:center;">העגלה ריקה</div>';
      sum.innerHTML = '';
      mini.textContent = 'הוסף מוצרים מהחנות כדי להמשיך.';
      updateShopCartBadge();
      return;
    }

    var total = 0;
    var html = '';
    for(var i=0;i<cart.length;i++){
      var it = cart[i] || {};
      var id = String(it.id);

      var p = findProduct(id) || {name: (it.name || "מוצר"), price: (Math.max(0, Number(it.price)||0)), img: (it.img || ""), note: (it.note || "")};

      var noteText = "";
      try{
        var av = String((it.availability!=null && String(it.availability).trim()!=="" ? it.availability : (p.availability||""))).toLowerCase();
        var isOrder = (av === "order_only") || (av.indexOf("order") !== -1);
        if(isOrder){
          var ld = parseInt(it.leadDays || it.eta_days || p.leadDays || p.eta_days || "", 10);
          if(isFinite(ld) && ld > 0){
            noteText = "בהזמנה בלבד עד " + ld + " ימים, איסוף מהמשרד";
          }else{
            noteText = "בהזמנה בלבד, איסוף מהמשרד";
          }
        }else{
          noteText = normStr((p && p.note) || it.note || "");
        }
      }catch(e){
        noteText = normStr((p && p.note) || it.note || "");
      }

      var thumb = "";
      try{ thumb = String((p && p.img) || it.img || "").trim(); }catch(e){ thumb = ""; }
      var thumbHtml = thumb ? ('<img class="shopcart-thumb" src="'+escapeAttr(thumb)+'" alt="">') : '';

      var price = Math.max(0, Number(p.price)||0);
      total += price;

      var cTxt = normStr(it.color || "");
      var sTxt = normStr(it.size  || "");
      if(!cTxt) cTxt = "לא נבחר";
      if(!sTxt) sTxt = "לא נבחר";
      var varLine = 'צבע: ' + escapeHtml(cTxt) + ' | מידה: ' + escapeHtml(sTxt);

      html += ''
        + '<div class="shopcart-item">'
        +   '<div class="shopcart-row">'
        +     thumbHtml
        +     '<div style="min-width:0;flex:1;">'
        +       '<div class="shopcart-name">' + escapeHtml(p.name) + '</div>'
        +       '<div class="shopcart-sub">' + varLine + '</div>'
        +       '<div class="shopcart-sub">' + (price ? (fmtN(price) + ' ₪') : 'מחיר במקום') + '</div>'
        +     '</div>'
        +     '<div class="shopcart-item-actions">'
        +       '<button type="button" class="tap shopcart-btn-remove" onclick="shopRemoveCartIndex(' + i + ')">הסר</button>'
        +       '<button type="button" class="tap" onclick="shopCartOpenDetails(\'' + escapeAttr(id) + '\')">פרטים</button>'
        +     '</div>'
        +   '</div>'
        +   (noteText ? ('<div class="shopcart-sub">' + escapeHtml(noteText) + '</div>') : '')
        + '</div>';
    }

    list.innerHTML = html;
    sum.innerHTML = 'סה״כ: <b>' + fmtN(total) + '</b> ₪';
    mini.textContent = 'איסוף מהמשרד. מוצרים בהזמנה: איסוף מהמשרד.';
    updateShopCartBadge();
  }
  window.renderShopCart = renderShopCart;

  function openShopCart(){
    rememberReturnPage();
    try{ document.body.classList.add('shopcart-open'); }catch(e){}
    var ov = document.getElementById('shopCartOverlay');
    if(ov){
      ov.setAttribute('aria-hidden','false');
      if(!ov.__shopBind){
        ov.__shopBind = true;
        try{ applySecPaymentTheme(); }catch(e){}

        ov.addEventListener('click', function(ev){
          if(ev.target === ov){ closeShopCart(false); }
        });
      }
    }
    try{ renderShopCart(); }catch(e){}
  }
  window.openShopCart = openShopCart;

  function closeShopCart(){
    try{ document.body.classList.remove('shopcart-open'); }catch(e){}
    var ov = document.getElementById('shopCartOverlay');
    if(ov) ov.setAttribute('aria-hidden','true');
  }
  window.closeShopCart = closeShopCart;

  function shopCartBackToShop(){
    closeShopCart();
    try{
      if(__shopReturnPage && typeof openPage === "function"){
        openPage(__shopReturnPage, false);
      }
    }catch(e){}
  }
  window.shopCartBackToShop = shopCartBackToShop;

  function renderShopCheckout(){
    var list = document.getElementById("shopCheckoutList");
    var sum  = document.getElementById("shopCheckoutSummary");
    var note = document.getElementById("shopCheckoutNote");
    if(!list || !sum || !note) return;

    var cart = readCart();
    if(!cart.length){
      list.innerHTML = '<div class="shop-mini" style="text-align:center;">העגלה ריקה</div>';
      sum.innerHTML = '';
      note.textContent = 'חזור לחנות להוספת מוצרים.';
      return;
    }

    var total = 0;
    var html = '';
    var onlyInStock = true;

    for(var i=0;i<cart.length;i++){
      var it = cart[i] || {};
      var id = String(it.id);
      var p = findProduct(id) || {name:(it.name||"מוצר"), price:(Number(it.price)||0), note:"", inStock:true};
      if(p.inStock === false) onlyInStock = false;

      var price = Math.max(0, Number(p.price)||0);
      total += price;

      var cTxt = normStr(it.color || "");
      var sTxt = normStr(it.size  || "");
      if(!cTxt) cTxt = "לא נבחר";
      if(!sTxt) sTxt = "לא נבחר";
      var varLine = 'צבע: ' + escapeHtml(cTxt) + ' | מידה: ' + escapeHtml(sTxt);

      html += ''
        + '<div class="shopcart-item">'
        +   '<div class="shopcart-row">'
        +     '<div style="min-width:0;">'
        +       '<div class="shopcart-name">' + escapeHtml(p.name) + '</div>'
        +       '<div class="shopcart-sub">' + varLine + '</div>'
        +       '<div class="shopcart-sub">' + (price ? (fmtN(price) + ' ₪') : 'מחיר במקום') + '</div>'
        +     '</div>'
        +   '</div>'
        + '</div>';
    }

    list.innerHTML = html;
    sum.innerHTML = 'סה״כ: <b>' + fmtN(total) + '</b> ₪';

    // Availability-based checkout text
    try{
      var orderTxt = document.getElementById("shopPayOrderText");
      if(orderTxt){
        orderTxt.textContent = onlyInStock ? "תשלום, ואיסוף מהמשרד" : "הזמנה ואיסוף מהמשרד";
      }
    }catch(e){}

    note.textContent = onlyInStock
      ? 'תשלום, ואיסוף מהמשרד.'
      : 'הזמנה ואיסוף מהמשרד. תקבלו הודעה לאזור האישי.';
  }
  window.renderShopCheckout = renderShopCheckout;

  function openShopCheckout(){
    rememberReturnPage();
    closeShopCart();
    try{
      if(typeof openPage === "function") openPage("shopCheckoutPage", true);
      else{
        var p = document.getElementById("shopCheckoutPage");
        if(p){ p.classList.add("show"); document.body.classList.add("page-open"); }
      }
    }catch(e){}
    try{ renderShopCheckout(); }catch(e){}
  }
  window.openShopCheckout = openShopCheckout;

  function shopCheckoutBackToCart(){
    try{
      if(__shopReturnPage && typeof openPage === "function"){
        openPage(__shopReturnPage, false);
      }else{
        // fallback: just hide checkout
        var p = document.getElementById("shopCheckoutPage");
        if(p) p.classList.remove("show");
      }
    }catch(e){}
    openShopCart();
  }
  window.shopCheckoutBackToCart = shopCheckoutBackToCart;

  
  function renderShopGateway(){
    var sum  = document.getElementById("shopGatewaySummary");
    var note = document.getElementById("shopGatewayNote");
    if(!sum || !note) return;

    var cart = readCart();
    if(!cart.length){
      sum.innerHTML = '';
      note.textContent = 'אין מוצרים לתשלום.';
      return;
    }

    var total = 0;
    var onlyInStock = true;

    for(var i=0;i<cart.length;i++){
      try{
        var id = String(cart[i].id);
        var p = findProduct(id) || {name:"מוצר", price:0, note:"", inStock:true};
        if(p.inStock === false) onlyInStock = false;
        var price = Math.max(0, Number(p.price)||0);
        total += price;
      }catch(e){}
    }

    
    // Credit (balance) display
    try{
      var cb = document.getElementById("shopCreditBalance");
      var warn = document.getElementById("shopCreditWarn");
      var chk = document.getElementById("shopUseCredit");
      try{ if(chk && !chk.__boundCredit){ chk.addEventListener("change", function(){ try{ renderShopGateway(); }catch(e){} }); chk.__boundCredit = 1; } }catch(e){}
      var u = (state && state.username) ? String(state.username) : "";
      var tz = "";
      try{ if(typeof resolveStudentTzFromUsername === "function") tz = resolveStudentTzFromUsername(u); }catch(e){}
      if(!tz) tz = String(u||"").replace(/\D/g,"");
      var rawc = null;
      var cm = 0;
      try{
        if(tz) rawc = DBStorage.getItem(keyStudentCredit(tz));
        if((rawc === null || rawc === undefined || rawc === "") && u) rawc = DBStorage.getItem(keyStudentCredit(u));
        var ncm = parseFloat(rawc);
        if(isFinite(ncm)) cm = ncm;
      }catch(e2){}
      if(cb) cb.textContent = fmtMoney(cm);
      if(warn){
        if(chk && chk.checked && cm < total){
          warn.style.display = "block";
          warn.textContent = "אין מספיק יתרה לתשלום מלא (" + fmtN(total) + "₪).";
        }else{
          warn.style.display = "none";
          warn.textContent = "";
        }
      }
      // if not logged in, keep checkbox off
      if(chk && !u){
        chk.checked = false;
      }
    }catch(e){}
sum.innerHTML = 'סה״כ לתשלום: <b>' + fmtN(total) + '</b> ₪';
    note.textContent = onlyInStock
      ? 'תשלום, ואיסוף מהמשרד.'
      : 'הזמנה ואיסוף מהמשרד. תקבלו הודעה לאזור האישי.';
  }

  function shopGatewayBackToCheckout(){
    try{
      if(typeof openPage === "function") openPage("shopCheckoutPage", false);
      else{
        var p = document.getElementById("shopGatewayPage");
        if(p) p.classList.remove("show");
        var c = document.getElementById("shopCheckoutPage");
        if(c) c.classList.add("show");
      }
    }catch(e){}
    try{ renderShopCheckout(); }catch(e){}
  }
  window.shopGatewayBackToCheckout = shopGatewayBackToCheckout;

  function shopGatewayClose(){
    // close gateway and go back to shop/cart context
    try{
      if(typeof __shopReturnPage !== "undefined" && __shopReturnPage && typeof openPage === "function"){
        openPage(__shopReturnPage, false);
      }else if(typeof openPage === "function"){
        openPage("shopHomePage", false);
      }else{
        var p = document.getElementById("shopGatewayPage");
        if(p) p.classList.remove("show");
      }
    }catch(e){}
  }
  window.shopGatewayClose = shopGatewayClose;

  function shopGatewayStartPay(){
    // v1: simulate payment success, create order for manager, send private message
    try{
      var order = (typeof shopCreateOrderFromPending === "function") ? shopCreateOrderFromPending() : null;
      if(!order){
        shopToast("אין מוצרים לתשלום");
        return;
      }
      // Pay with credit (balance) if selected
      try{
        var chk = document.getElementById("shopUseCredit");
        var useCredit = !!(chk && chk.checked);
        if(useCredit){
          var total = Number(order.total || 0) || 0;
          if(!isFinite(total) || total <= 0){
            shopToast("סכום לתשלום לא תקין");
            return;
          }
          var u = (state && state.username) ? String(state.username) : "";
          if(!u){
            shopToast("צריך להתחבר כדי להשתמש ביתרה");
            return;
          }

          var tz = "";
          try{ if(typeof resolveStudentTzFromUsername === "function") tz = resolveStudentTzFromUsername(u); }catch(e){}
          if(!tz) tz = String(u||"").replace(/\D/g,"");

          var rawc = null;
          var cm = 0;
          try{
            if(tz) rawc = DBStorage.getItem(keyStudentCredit(tz));
            if((rawc === null || rawc === undefined || rawc === "") && u) rawc = DBStorage.getItem(keyStudentCredit(u));
            var ncm = parseFloat(rawc);
            if(isFinite(ncm)) cm = ncm;
          }catch(e2){}

          if(cm < total){
            shopToast("אין מספיק יתרה לתשלום מלא");
            return;
          }

          var newBal = Math.round((cm - total) * 100) / 100;
          try{
            if(tz) DBStorage.setItem(keyStudentCredit(tz), String(newBal));
            if(u && u !== tz) DBStorage.setItem(keyStudentCredit(u), String(newBal));
          }catch(e3){}

          // Also sync payments ledger (TZ-based)
          try{
            var payKey = "student_payments_" + String(tz||u);
            var payObj = payLsGet(payKey, null);
            if(!payObj || typeof payObj !== "object") payObj = {};
            payObj = payEnsureLedger(payObj, String(tz||u));
            payLedgerAdd(payObj, { ts: Date.now(), type: "shop", amount: -total, note: "רכישה בחנות", meta: { orderId: (order.id||order.orderId||"") } });
            payLsSet(payKey, payObj);
          }catch(e4){}

          try{ renderShopGateway(); }catch(e5){}
        }
      }catch(e){}
      try{ DBStorage.removeItem("shop_pending_payment_v1"); }catch(e){}
      try{ if(typeof writeCart === "function") writeCart([]); }catch(e){}
      try{ if(typeof updateShopCartBadge === "function") updateShopCartBadge(); }catch(e){}
      try{ if(typeof renderShopCart === "function") renderShopCart(); }catch(e){}
      try{ if(typeof renderShopCheckout === "function") renderShopCheckout(); }catch(e){}
      shopToast("התשלום נקלט. ההזמנה נוצרה");
      try{ if(typeof shopGatewayClose === "function") shopGatewayClose(); }catch(e){}
    }catch(e){
      shopToast("שגיאה בתשלום");
    }
  }
  window.shopGatewayStartPay = shopGatewayStartPay;

function shopCheckoutSubmit(){
    var cart = readCart();
    if(!cart.length){ shopToast("העגלה ריקה"); return; }

    var hasOrderOnly = false;
    var total = 0;
    for(var i=0;i<cart.length;i++){
      try{
        var price = Number(cart[i].price||0) || 0;
        total += price;
        var av = String(cart[i].availability||'').toLowerCase();
        if(av === "order_only") hasOrderOnly = true;
      }catch(e){}
    }

    var label = hasOrderOnly
      ? "הזמנה ואיסוף מהמשרד"
      : "תשלום, ואיסוף מהמשרד";

    // Save pending payment (for future clearing integration)
    try{
      var pending = {
        source: "shop",
        total: Math.round(total),
        items: cart,
        hasOrderOnly: hasOrderOnly,
        createdAt: Date.now()
      };
      DBStorage.setItem("shop_pending_payment_v1", JSON.stringify(pending));
    }catch(e){}

    // Open gateway page (payment clearing will be connected later)
    try{
      if(typeof openPage === "function") openPage("shopGatewayPage", true);
      else{
        var g = document.getElementById("shopGatewayPage");
        if(g){ g.classList.add("show"); document.body.classList.add("page-open"); }
      }
    }catch(e){}
    try{ renderShopGateway(); }catch(e){}
    shopToast(label + (hasOrderOnly ? ". תקבלו הודעה לאזור האישי." : ""));
}
  window.shopCheckoutSubmit = shopCheckoutSubmit;

  function shopClearCart(){
    writeCart([]);
    updateShopCartBadge();
    try{ renderShopCart(); }catch(e){}
    try{ renderShopCheckout(); }catch(e){}
    shopToast("העגלה נוקתה");
  }
  window.shopClearCart = shopClearCart;

  // Init badge
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', function(){
      try{ updateShopCartBadge(); }catch(e){}
    }, {once:true});
  }else{
    try{ updateShopCartBadge(); }catch(e){}
  }

  // Close on ESC
  document.addEventListener('keydown', function(ev){
    try{
      if((ev.key === 'Escape' || ev.key === 'Esc') && document.body.classList.contains('shopcart-open')){
        closeShopCart();
      }
    }catch(e){}
  });
})();
/* ===== /SHOP (v1) ===== */

/* ===== script block 12 (from original HTML) ===== */
(function(){
  // Preserve existing full implementations (if already defined earlier in the file)
  var __baseOpenAdminPanel = window.openAdminPanel;
  var __baseCloseAdminPanel = window.closeAdminPanel;
  var __baseOpenManagerPanel = window.openManagerPanel;
  var __baseCloseManagerPanel = window.closeManagerPanel;

  function setAdminOpen(isOpen){
    try{
      var b = document.body;
      if(!b) return;

      // Ensure menus don't block clicks
      try{ b.classList.remove('menu-open','menu-closing','student-menu-open'); }catch(e){}

      if(isOpen){ b.classList.add('admin-open'); }
      else { b.classList.remove('admin-open'); }

      var ov = document.getElementById('adminOverlay');
      if(ov){
        ov.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
      }
    }catch(e){}
  }

  function setManagerOpen(isOpen){
    try{
      var b = document.body;
      if(b){
        // Ensure menus don't block clicks
        try{ b.classList.remove('menu-open','menu-closing','student-menu-open'); }catch(e){}
        b.classList.toggle("manager-open", !!isOpen);
      }
    }catch(e){}
    try{
      var ov = document.getElementById("managerOverlay");
      if(ov){
        ov.setAttribute("aria-hidden", isOpen ? "false" : "true");
      }
    }catch(e){}
  }

  // Expose for login & logout flows (מנהל/אדמין) - keep full panels if they exist
  try{
    window.openAdminPanel = function(){
      try{ if(typeof closeMenu === "function") closeMenu(); }catch(e){}
      try{ if(typeof closeProfileMenu === "function") closeProfileMenu(); }catch(e){}
      try{ if(typeof closeAllPages === "function") closeAllPages(); }catch(e){}

      try{
        if(__baseOpenAdminPanel && __baseOpenAdminPanel !== window.openAdminPanel){
          return __baseOpenAdminPanel();
        }
      }catch(e){}
      setAdminOpen(true);
    };
  }catch(e){}

  try{
    window.closeAdminPanel = function(){
      try{
        if(__baseCloseAdminPanel && __baseCloseAdminPanel !== window.closeAdminPanel){
          return __baseCloseAdminPanel();
        }
      }catch(e){}
      setAdminOpen(false);
    };
  }catch(e){}

  try{
    window.openManagerPanel = function(){
      try{ if(typeof closeMenu === "function") closeMenu(); }catch(e){}
      try{ if(typeof closeProfileMenu === "function") closeProfileMenu(); }catch(e){}
      try{ if(typeof closeAllPages === "function") closeAllPages(); }catch(e){}

      try{
        if(__baseOpenManagerPanel && __baseOpenManagerPanel !== window.openManagerPanel){
          return __baseOpenManagerPanel();
        }
      }catch(e){}
      setManagerOpen(true);
      try{ if(typeof mgrShowHome === "function") mgrShowHome(); }catch(e){}
    };
  }catch(e){}

  try{
    window.closeManagerPanel = function(){
      try{
        if(__baseCloseManagerPanel && __baseCloseManagerPanel !== window.closeManagerPanel){
          return __baseCloseManagerPanel();
        }
      }catch(e){}
      setManagerOpen(false);
    };
  }catch(e){}
})();

/* ===== script block 13 (from original HTML) ===== */
(function(){

  // Details: enable add-to-cart only when required options were chosen
  function shopDetailsUpdateAddBtn(){
    try{
      var ov = document.getElementById("shopDetailsOverlay");
      var body = document.getElementById("shopDetailsBody");
      if(!ov || !body) return;
      var btn = body.querySelector("#shopDetailsAddBtn");
      if(!btn) btn = body.querySelector(".shopdetails-actions .action-btn.green");
      if(!btn) return;

      var hasSize = !!body.querySelector('.shopchip[data-kind="size"]');
      var hasColor = !!body.querySelector('.shopchip[data-kind="color"]');

      var size = "";
      var color = "";
      try{ size  = (ov.dataset.selSize  || ""); }catch(e){}
      try{ color = (ov.dataset.selColor || ""); }catch(e){}

      var need = (hasSize && !size) || (hasColor && !color);
      try{ btn.disabled = !!need; }catch(e){}
    }catch(e){}
  }
  try{ window.shopDetailsUpdateAddBtn = shopDetailsUpdateAddBtn; }catch(e){}

  // Add-to-cart from details should include selected size/color (if chosen)
  window.shopAddToCartFromDetails = function(pid){
    try{
      var ov = document.getElementById("shopDetailsOverlay");
      var body = document.getElementById("shopDetailsBody");
      var color = "";
      var size = "";
      try{ if(ov) color = (ov.dataset.selColor||""); }catch(e){}
      try{ if(ov) size  = (ov.dataset.selSize||""); }catch(e){}

      // If the product has options, require selection
      try{
        var hasSize = !!(body && body.querySelector('.shopchip[data-kind="size"]'));
        var hasColor = !!(body && body.querySelector('.shopchip[data-kind="color"]'));
        if((hasSize && !size) || (hasColor && !color)){
          try{ shopToast("בחר מידה וצבע"); }catch(e){}
          try{ shopDetailsUpdateAddBtn(); }catch(e){}
          return false;
        }
      }catch(e){}

      try{ shopAddToCart(pid, {color: color, size: size}); }catch(e){}
      return true;
    }catch(e){}
    return false;
  };

  // Chips selection handler (delegated)
  document.addEventListener("click", function(ev){
    try{
      var btn = ev.target && ev.target.closest ? ev.target.closest(".shopchip") : null;
      if(!btn) return;
      var overlay = document.getElementById("shopDetailsOverlay");
      var body = document.getElementById("shopDetailsBody");
      if(!overlay || !body) return;
      if(overlay.classList.contains("hidden")) return;

      ev.preventDefault();
      ev.stopPropagation();

      var kind = btn.getAttribute("data-kind") || "";
      var val  = btn.getAttribute("data-val") || "";

      if(kind === "size"){
        try{ overlay.dataset.selSize = val; }catch(e){}
        try{
          body.querySelectorAll('.shopchip[data-kind="size"]').forEach(function(b){
            b.classList.toggle("selected", b === btn);
          });
        }catch(e){}
      }else if(kind === "color"){
        try{ overlay.dataset.selColor = val; }catch(e){}
        try{
          body.querySelectorAll('.shopchip[data-kind="color"]').forEach(function(b){
            b.classList.toggle("selected", b === btn);
          });
        }catch(e){}
      }
      try{ shopDetailsUpdateAddBtn(); }catch(e){}
    }catch(e){}
  }, true);

  // Login routing: manager != admin
  try{
    if(!window.__loginUserPassBase) window.__loginUserPassBase = window.loginUserPass;
  }catch(e){}

  window.loginUserPass = function(username, pass){
    try{
      var u = String(username||"").trim();
      var p = String(pass||"");
      var low = u.toLowerCase();

      // Manager login
      if(p === "1" && (u === "מנהל" || low === "manager")){
        try{ if(typeof closeAuth === "function") closeAuth(); }catch(e){}
        // Force a clean session as "מנהל" (prevents student state from leaking into manager)
        try{ DBStorage.setItem("student_logged_in","1"); }catch(e){}
        try{ DBStorage.setItem("student_username","מנהל"); }catch(e){}
        // Ensure non-manager residues are cleared
        try{ if(typeof window.disableManagerMode === "function") window.disableManagerMode(); }catch(e){}
        // Switch LEFT side-menu to manager menu (do NOT touch right menu)
        try{ if(typeof window.enableManagerMode === "function") window.enableManagerMode(true); }catch(e){}
        try{ if(typeof window.updateMenuRoleSections === "function") window.updateMenuRoleSections(); }catch(e){}
        // Open LEFT menu immediately (now works because student_logged_in is set)
        try{ if(typeof window.openProfileMenu === "function") window.openProfileMenu(); }catch(e){}
        try{ if(typeof syncAppStateFromDOM === 'function') syncAppStateFromDOM(); }catch(e){}
        return true;
      }

      // Admin login (keeps its existing flow)
      if(p === "1" && (u === "אדמין" || low === "admin")){
        try{ if(typeof closeAuth === "function") closeAuth(); }catch(e){}
        // Admin is NOT manager: make sure manager mode is off so student menu doesn't get hijacked
        try{ if(typeof window.disableManagerMode === "function") window.disableManagerMode(); }catch(e){}
        try{ if(typeof window.openAdminPanel === "function") window.openAdminPanel(); }catch(e){}
        return true;
      }
    }catch(e){}

    // Delegate to original login for students/others.
    try{
      var ok = window.__loginUserPassBase ? window.__loginUserPassBase(username, pass) : false;
      // If student login succeeded, make sure manager mode is OFF (prevents student becoming manager).
      if(ok){
        try{ if(typeof window.disableManagerMode === "function") window.disableManagerMode(); }catch(e){}
        try{ if(typeof window.updateMenuRoleSections === "function") window.updateMenuRoleSections(); }catch(e){}
      }
      return ok;
    }catch(e){
      return false;
    }
  };
})();

/* ===== script block 14 (from original HTML) ===== */
/* ===== KB OPEN detector (Android/WebView) ===== */
(function(){
  var baseH = 0;
  var kbOpen = false;

  function measureBase(){
    var h = window.innerHeight || document.documentElement.clientHeight || 0;
    if(!baseH || h > baseH) baseH = h;
  }

  function update(){
    var h = window.innerHeight || document.documentElement.clientHeight || 0;
    if(!h) return;

    // set baseline when keyboard is closed
    if(!kbOpen) measureBase();

    var diff = baseH - h;
    var openNow = (diff > 140) || (baseH && (h / baseH) < 0.78);

    if(openNow !== kbOpen){
      kbOpen = openNow;
      try{ document.body.classList.toggle("kb-open", kbOpen); }catch(e){}
    }

    // after closing, refresh base (URL bar changes etc.)
    if(!kbOpen){
      baseH = h;
    }
  }

  function rafUpdate(){
    try{ window.requestAnimationFrame(update); }catch(e){ setTimeout(update, 0); }
  }

  // Initial
  setTimeout(function(){ measureBase(); rafUpdate(); }, 0);

  window.addEventListener("resize", rafUpdate, {passive:true});

  // Focus events are a strong IME signal on Android
  document.addEventListener("focusin", function(){ setTimeout(rafUpdate, 50); }, true);
  document.addEventListener("focusout", function(){ setTimeout(rafUpdate, 120); }, true);
})();

// ===== FORUM (In Page) v2 =====
(function(){
  var LS_KEY = "qa_forum_v2_data";

  function $(id){ return document.getElementById(id); }

  function makeTxId(){
    return 'tx_' + String(Date.now()) + '_' + String(Math.random()).slice(2);
  }

  function nowIso(){ try{ return new Date().toISOString(); }catch(e){ return ""; } }
  function fmtDate(iso){
    try{
      var d = new Date(iso);
      if(isNaN(d.getTime())) return "";
      var dd = String(d.getDate()).padStart(2,'0');
      var mm = String(d.getMonth()+1).padStart(2,'0');
      var yy = String(d.getFullYear()).slice(-2);
      var hh = String(d.getHours()).padStart(2,'0');
      var mi = String(d.getMinutes()).padStart(2,'0');
      return dd+"."+mm+"."+yy+" "+hh+":"+mi;
    }catch(e){ return ""; }
  }

  function getUser(){
    try{
      if(typeof timerGetStudentUsername === "function"){
        var u = (timerGetStudentUsername()||"").trim();
        if(u) return u;
      }
    }catch(e){}
    try{
      var li = (DBStorage.getItem("student_logged_in")||"") === "1";
      if(!li) return "";
      return (DBStorage.getItem("student_username")||"").trim();
    }catch(e){ return ""; }
  }


  function getStudentByTz(tz){
  tz = normalizeTz(tz);
  if(!tz) return null;

  // מקור ראשי: DB מאוחד של תלמידים (קיים בקובץ)
  try{
    if(typeof resolveStudentsDb === "function"){
      const db = resolveStudentsDb();
      if(db && typeof db.findStudentByTz === "function"){
        const st = db.findStudentByTz(tz);
        if(st) return st;
      }
    }
  }catch(e){}

  // גיבוי: registry מקומי
  try{
    const reg = JSON.parse(DBStorage.getItem("students_registry_v1") || "{}");
    if(reg && reg[tz]) return reg[tz];
  }catch(e){}

  // גיבוי: מערכים גלובליים אם קיימים
  try{
    const arr = window.students_db_v1 || window.studentsDb || window.studentsDB || window.students || null;
    if(Array.isArray(arr)){
      const st = arr.find(s => normalizeTz(s && (s.tz || s.id || s.studentId || s.userNumber)) === tz);
      if(st) return st;
    }
  }catch(e){}

  return null;
}

function resolveForumUserName(u){
    const raw = String(u ?? '').trim();
    if(!raw) return '—';

    // special system users
    if(raw === 'admin' || raw === 'אור ירוק') return 'אור ירוק';
    if(raw === 'manager' || raw === 'מנהל') return 'מנהל';

    const digits = raw.replace(/\D/g,'');
    const tz = (digits.length >= 5) ? digits : '';

    const tryNameFromObj = (o)=>{
      if(!o || typeof o !== 'object') return '';
      const get = (k)=>{ try{ const v=o[k]; return (v==null?'':String(v).trim()); }catch(e){ return ''; } };
      const name = get('fullName') || get('displayName') || get('name') || get('שם מלא');
      const fn = get('firstName') || get('fname') || get('first_name') || get('שם פרטי') || get('שםפרטי');
      const ln = get('lastName') || get('lname') || get('last_name') || get('שם משפחה') || get('שםמשפחה');
      const user = get('username') || get('user') || get('userName') || get('שם משתמש');

      const assembled = [fn, ln].filter(Boolean).join(' ').trim();
      return (name && name !== '—') ? name : (assembled && assembled !== '—') ? assembled : (user && user !== '—') ? user : '';
    };

    const readJSON = (key, fallback=null)=>{
      try{
        const v = DBStorage.getItem(key);
        if(!v) return fallback;
        return JSON.parse(v);
      }catch(e){
        return fallback;
      }
    };

    // try registry + profile by tz
    if(tz){
      const reg = (typeof safeParse==='function') ? safeParse(DBStorage.getItem('students_registry_v1'), null) : readJSON('students_registry_v1', null);
      let entry = null;
      if(reg && Array.isArray(reg)){
        entry = reg.find(x=>{
          if(!x || typeof x!=='object') return false;
          const v = String(x.tz ?? x.idNumber ?? x.userNumber ?? x.userTz ?? x.id ?? '').replace(/\D/g,'');
          return v === tz;
        }) || null;
      }else if(reg && typeof reg === 'object'){
        entry = reg[tz] || reg[String(tz)] || null;
      }
      const prof = readJSON('student_profile_' + tz, null);

      const n1 = tryNameFromObj(prof);
      const n2 = tryNameFromObj(entry);
      if(n1) return n1;
      if(n2) return n2;

      // last resort: look for any profile-like keys
      try{
        for(let i=0;i<localStorage.length;i++){
          const k = localStorage.key(i);
          if(!k) continue;
          if(k === ('student_profile_' + tz)) continue;
          if(!k.startsWith('student_profile_')) continue;
          const obj = readJSON(k, null);
          const objTz = String(obj?.tz ?? obj?.idNumber ?? obj?.userNumber ?? obj?.userTz ?? '').replace(/\D/g,'');
          if(objTz === tz){
            const nn = tryNameFromObj(obj);
            if(nn) return nn;
          }
        }
      }catch(e){}

      return 'תלמיד';
    }

    // non-tz username: try resolve from registry by username
    const reg2 = (typeof safeParse==='function') ? safeParse(DBStorage.getItem('students_registry_v1'), null) : readJSON('students_registry_v1', null);
    if(reg2 && Array.isArray(reg2)){
      const entry = reg2.find(x=>{
        if(!x || typeof x!=='object') return false;
        const u1 = String(x.username ?? x.user ?? x.userName ?? '').trim();
        return u1 && u1 === raw;
      }) || null;
      const n = tryNameFromObj(entry);
      if(n) return n;
    }else if(reg2 && typeof reg2 === 'object'){
      // reg2 might be mapping tz->profile
      for(const k in reg2){
        const obj = reg2[k];
        const u1 = String(obj?.username ?? obj?.user ?? obj?.userName ?? '').trim();
        if(u1 && u1 === raw){
          const n = tryNameFromObj(obj);
          if(n) return n;
        }
      }
    }

    return raw;
  }

    function isLoggedIn(){ return !!getUser(); }

  function updateForumAuthUI(){
    var loginCard = $("forumLoginCard");
    var newCard = $("forumNewQuestionCard");
    var logged = isLoggedIn();
    if(loginCard) loginCard.style.display = logged ? "none" : "";
    if(newCard) newCard.style.display = logged ? "" : "none";
  }

  function bindForumLoginBtn(){
    var btn = $("forumLoginBtn");
    if(!btn) return;
    var handler = function(ev){
      try{ ev && ev.preventDefault && ev.preventDefault(); }catch(e){}
      try{ if(typeof openAuth === "function") openAuth("login"); }catch(e){}
      return false;
    };
    // Ensure it works on mobile (release)
    try{ btn.addEventListener("pointerup", handler, {capture:true}); }catch(e){}
    try{ btn.addEventListener("click", handler, {capture:true}); }catch(e){}
    btn.onclick = handler;
  }

  function isAdminOpen(){
    try{ return document.body && document.body.classList && document.body.classList.contains("admin-open"); }catch(e){ return false; }
  }

  function readData(){
    try{
      var raw = DBStorage.getItem(LS_KEY);
      if(!raw) return {v:2, questions:[]};
      var obj = JSON.parse(raw);
      if(!obj || typeof obj !== "object") return {v:2, questions:[]};
      if(!Array.isArray(obj.questions)) obj.questions = [];
      return obj;
    }catch(e){
      return {v:2, questions:[]};
    }
  }

  function writeData(obj){
    try{ DBStorage.setItem(LS_KEY, JSON.stringify(obj)); }catch(e){}
  }

  function uid(prefix){
    try{
      return (prefix||"id")+"_"+Math.random().toString(36).slice(2,8)+"_"+Date.now();
    }catch(e){ return String(prefix||"id")+"_"+Date.now(); }
  }

  function handSvg(){
    // thumbs up icon (inline svg)
    return '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">'
      +'<path fill="currentColor" d="M2 21h4V9H2v12zm20-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L13 1 6.59 7.41C6.22 7.78 6 8.3 6 8.83V19c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73V10z"/>'
      +'</svg>';
  }

  function sortQuestions(arr){
    arr.sort(function(a,b){
      var la = (a && a.likes && a.likes.length) ? a.likes.length : 0;
      var lb = (b && b.likes && b.likes.length) ? b.likes.length : 0;
      if(lb !== la) return lb - la;
      var ta = (a && a.createdAt) ? new Date(a.createdAt).getTime() : 0;
      var tb = (b && b.createdAt) ? new Date(b.createdAt).getTime() : 0;
      return tb - ta;
    });
  }

  function toggleLike(qid, btnEl){
    var user = getUser();
    if(!user){
      try{ if(typeof openAuth === "function") openAuth("login"); }catch(e){}
      return;
    }
    var data = readData();
    var q = data.questions.find(function(x){ return x && x.id === qid; });
    if(!q) return;
    if(!Array.isArray(q.likes)) q.likes = [];
    var ix = q.likes.indexOf(user);
    var likedNow = false;
    if(ix === -1){ q.likes.push(user); likedNow = true; }
    else{ q.likes.splice(ix,1); likedNow = false; }
    writeData(data);

    // Update UI locally (no re-render to avoid list jumping / "checkbox" effect)
    try{
      var count = q.likes.length;
      var b = btnEl && btnEl.getAttribute ? btnEl : null;
      if(!b){
        var list = document.getElementById("forumList");
        if(list) b = list.querySelector('[data-like="'+String(qid)+'"]');
      }
      if(b){
        var sp = b.querySelector("span");
        if(sp) sp.textContent = String(count);
        if(b.classList) b.classList.toggle("liked", likedNow);
      }
    }catch(e){}
  }

  function addQuestion(){
    var user = getUser();
    var userTz = "";
    var userName = "";
    var userKey = user;
    try{
      var tz = (typeof normalizeTz === "function") ? normalizeTz(user) : "";
      if(tz) userTz = tz;
      userKey = userTz || user;
      if(typeof resolveForumUserName === "function"){
        var nm = resolveForumUserName(userKey);
        nm = (nm==null) ? "" : String(nm).trim();
        if(nm && !/^[0-9]+$/.test(nm) && nm !== "תלמיד") userName = nm;
      }
    }catch(e){}
    if(!user){
      try{ if(typeof openAuth === "function") openAuth("login"); }catch(e){}
      return;
    }
    var ta = $("forumNewQuestionText");
    if(!ta) return;
    var text = (ta.value||"").trim();
    if(text.length < 4){
      try{ if(typeof toast === "function") toast("כתוב שאלה (לפחות 4 תווים)"); }catch(e){}
      return;
    }
    var data = readData();
    data.questions.unshift({
      id: uid("q"),
      user: userKey,
      userTz: userTz,
      userName: userName,
      text: text,
      createdAt: nowIso(),
      likes: [],
      answers: []
    });
    writeData(data);
    ta.value = "";
    render();
    try{ if(typeof toast === "function") toast("השאלה נשלחה"); }catch(e){}
  }

  function addAnswer(qid){
    if(!isAdminOpen()){
      try{ if(typeof toast === "function") toast("רק אדמין יכול להשיב"); }catch(e){}
      return;
    }
    var ta = $("ans_"+qid);
    if(!ta) return;
    var text = (ta.value||"").trim();
    if(text.length < 2){
      try{ if(typeof toast === "function") toast("כתוב תשובה"); }catch(e){}
      return;
    }
    var data = readData();
    var q = data.questions.find(function(x){ return x && x.id === qid; });
    if(!q) return;
    if(!Array.isArray(q.answers)) q.answers = [];
    q.answers.push({
      id: uid("a"),
      user: "אור ירוק",
      text: text,
      createdAt: nowIso()
    });
    writeData(data);
    ta.value = "";
    render();
    try{ if(typeof toast === "function") toast("נשלח"); }catch(e){}
  }

  function buildAuthCard(){
    var txt = $("forumAuthText");
    var actions = $("forumAuthActions");
    if(!txt || !actions) return;

    var user = getUser();
    actions.innerHTML = "";

    if(user){
      txt.textContent = "מחובר כ: " + user;
      var refreshBtn = document.createElement("button");
      refreshBtn.type = "button";
      refreshBtn.className = "forum-btn ghost tap";
      refreshBtn.setAttribute("data-tap","");
      refreshBtn.textContent = "רענן";
      refreshBtn.onclick = function(){ render(); };
      actions.appendChild(refreshBtn);
    }else{
      txt.textContent = "כדי לשאול/לעשות לייק חייב להתחבר.";
      var loginBtn = document.createElement("button");
      loginBtn.type = "button";
      loginBtn.className = "forum-btn primary tap";
      loginBtn.setAttribute("data-tap","");
      loginBtn.textContent = "התחבר";
      // Use release-tap to avoid Android "tap-through" and capture-click suppression
      try{
        if(typeof bindReleaseTap === "function"){
          bindReleaseTap(loginBtn, function(){
            try{ if(typeof openAuth === "function") openAuth("login"); }catch(e){}
          });
        }else{
          loginBtn.addEventListener("click", function(){
            try{ if(typeof openAuth === "function") openAuth("login"); }catch(e){}
          }, {capture:true});
        }
      }catch(e){
        loginBtn.onclick = function(){ try{ if(typeof openAuth === "function") openAuth("login"); }catch(e){} };
      }
      actions.appendChild(loginBtn);
    }
  }

  function render(){
    bindForumLoginBtn();
    updateForumAuthUI();

    var list = $("forumList");
    if(!list) return;

    var data = readData();
    var qs = Array.isArray(data.questions) ? data.questions.slice() : [];
    sortQuestions(qs);

    if(qs.length === 0){
      list.innerHTML = '<div class="q-card"><div class="q-text">אין עדיין שאלות.</div><div class="q-meta">תהיה הראשון לשאול.</div></div>';
      return;
    }

    var htmlOut = "";
    for(var i=0;i<qs.length;i++){
      var q = qs[i] || {};
    var whoRaw = (q.userName && String(q.userName).trim() && String(q.userName).trim() !== "תלמיד") ? q.userName : (q.userNumber || q.user || "");
    var whoName = resolveForumUserName(whoRaw);
      var likeCount = (q.likes && q.likes.length) ? q.likes.length : 0;
      var user = getUser();
      var liked = (user && q.likes && q.likes.indexOf(user)!==-1);
      var answers = Array.isArray(q.answers) ? q.answers : [];

      htmlOut += '<div class="q-card" data-qid="'+String(q.id||"")+'">';
      htmlOut +=   '<div class="q-head">';
      htmlOut +=     '<div class="q-meta">'+escapeHtml(whoName)+' · '+escapeHtml(fmtDate(q.createdAt||""))+'</div>';
      htmlOut +=     '<button type="button" class="like-btn tap '+(liked?'liked':'')+'" data-like="'+String(q.id||"")+'">'+handSvg()+'<span>'+likeCount+'</span></button>';
      htmlOut +=   '</div>';
      htmlOut +=   '<div class="q-text">'+escapeHtml(q.text||"")+'</div>';

      htmlOut +=   '<div class="answers">';
      if(answers.length === 0){
        htmlOut += '<div class="forum-meta">אין תשובות עדיין.</div>';
      }else{
        for(var a=0;a<answers.length;a++){
          var an = answers[a] || {};
          htmlOut += '<div class="answer">';
          htmlOut +=   '<div class="a-meta">'+escapeHtml(resolveForumUserName(an.user||"אור ירוק"))+ ' · '+escapeHtml(fmtDate(an.createdAt||""))+'</div>';
          htmlOut +=   '<div class="a-text">'+escapeHtml(an.text||"")+'</div>';
          htmlOut += '</div>';
        }
      }

      if(isAdminOpen()){
        htmlOut += '<div class="admin-box">';
        htmlOut +=   '<textarea class="forum-input" id="ans_'+String(q.id||"")+'" maxlength="800" dir="rtl" lang="he" inputmode="text" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" placeholder="כתוב תשובה..."></textarea>';
        htmlOut +=   '<div class="forum-actions">';
        htmlOut +=     '<button class="forum-btn primary tap" data-tap="" type="button" data-answer="'+String(q.id||"")+'">שלח תשובה</button>';
        htmlOut +=   '</div>';
        htmlOut += '</div>';
      }
      htmlOut +=   '</div>';

      htmlOut += '</div>';
    }
    list.innerHTML = htmlOut;

    // bind like buttons
    var likeBtns = list.querySelectorAll('[data-like]');
    for(var j=0;j<likeBtns.length;j++){
      likeBtns[j].onclick = function(e){
        try{ if(e){ e.preventDefault(); e.stopPropagation(); } }catch(_e){}
        var qid = this.getAttribute('data-like');
        toggleLike(qid, this);
      };
    }
    var ansBtns = list.querySelectorAll('[data-answer]');
    for(var k=0;k<ansBtns.length;k++){
      ansBtns[k].onclick = function(){
        var qid = this.getAttribute('data-answer');
        addAnswer(qid);
      };
    }
  }

  function escapeHtml(s){
    s = (s==null) ? "" : String(s);
    return s.replace(/[&<>"']/g, function(ch){
      return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]);
    });
  }


  // Android WebView: ensure keyboard + Hebrew IME work on first focus
  function setupForumIMEFix(){
    var page = $("forumPage");
    if(!page || page.__imeFixBound) return;
    page.__imeFixBound = true;

    function isForumTA(el){
      try{
        return el && el.tagName === "TEXTAREA" && el.classList && el.classList.contains("forum-input");
      }catch(e){ return false; }
    }

    function focusTA(el){
      if(!el) return;
      try{
        if(document.activeElement !== el){
          try{ el.focus({preventScroll:true}); }catch(_){ el.focus(); }
        }
        // keep caret visible
        try{
          var v = el.value || "";
          if(typeof el.setSelectionRange === "function") el.setSelectionRange(v.length, v.length);
        }catch(_){}
      }catch(e){}
    }

    // Warm-up IME once per session (only after user gesture inside forum)
    try{
      if(!sessionStorage.getItem("forum_ime_warmed_v1")){
        var warm = function(){
          try{
            if(sessionStorage.getItem("forum_ime_warmed_v1")) return;
            sessionStorage.setItem("forum_ime_warmed_v1","1");

            var tmp = document.createElement("input");
            tmp.type = "text";
            tmp.autocomplete = "off";
            tmp.autocapitalize = "off";
            tmp.autocorrect = "off";
            tmp.spellcheck = false;
            tmp.setAttribute("lang","he");
            tmp.setAttribute("dir","rtl");
            tmp.style.position = "fixed";
            tmp.style.left = "-9999px";
            tmp.style.top = "0";
            tmp.style.width = "1px";
            tmp.style.height = "1px";
            tmp.style.opacity = "0";
            document.body.appendChild(tmp);

            try{ tmp.focus(); }catch(e){}
            setTimeout(function(){
              try{ tmp.blur(); }catch(e){}
              try{ tmp.remove(); }catch(e){ try{ tmp.parentNode && tmp.parentNode.removeChild(tmp); }catch(_){ } }
            }, 30);
          }catch(e){}
        };
        page.addEventListener("pointerdown", warm, {capture:true, once:true});
        page.addEventListener("touchstart", warm, {capture:true, passive:true, once:true});
      }
    }catch(e){}

    // Allow native focus; fallback on release (keeps Hebrew IME stable on first open)
    function primeHebrewOnce(targetEl){
      try{
        if(!targetEl) return;
        if(sessionStorage.getItem("forum_he_prime_v2")) return;
        sessionStorage.setItem("forum_he_prime_v2","1");

        var tmp = document.createElement("input");
        tmp.type = "text";
        tmp.autocomplete = "off";
        tmp.autocapitalize = "off";
        tmp.autocorrect = "off";
        tmp.spellcheck = false;
        tmp.setAttribute("lang","he");
        tmp.setAttribute("dir","rtl");
        tmp.style.position = "fixed";
        tmp.style.left = "-9999px";
        tmp.style.top = "0";
        tmp.style.width = "1px";
        tmp.style.height = "1px";
        tmp.style.opacity = "0";
        document.body.appendChild(tmp);

        // Focus temp first (within the same user gesture), then focus the real textarea.
        try{ tmp.focus({preventScroll:true}); }catch(_){ try{ tmp.focus(); }catch(__){} }
        try{ tmp.value = "א"; }catch(_){}
        try{ tmp.setSelectionRange(1,1); }catch(_){}
        try{ tmp.value = ""; }catch(_){}

        focusTA(targetEl);

        setTimeout(function(){
          try{ tmp.blur(); }catch(e){}
          try{ tmp.remove(); }catch(e){ try{ tmp.parentNode && tmp.parentNode.removeChild(tmp); }catch(_){ } }
        }, 0);
      }catch(e){}
    }

    function onRelease(e){
      try{
        var t = e && e.target;
        if(!isForumTA(t)) return;
        // If it didn't get focus naturally, focus now (still within gesture)
        if(document.activeElement !== t) focusTA(t);
        // Prime Hebrew IME once per session (fixes first-open Hebrew typing)
        primeHebrewOnce(t);
      }catch(_){}
    }

    page.addEventListener("pointerup", onRelease, true);
    page.addEventListener("touchend", onRelease, {capture:true, passive:false});
    page.addEventListener("click", onRelease, true);

  }

  function bindStatic(){
    var send = $("forumSendBtn");
    if(send) send.onclick = addQuestion;
  }

  // Run when forum page opens
  document.addEventListener("app:pageopen", function(ev){
    try{
      if(ev && ev.detail && ev.detail.pageId === "forumPage"){
        bindStatic();
        render();
        setupForumIMEFix();

        // short watcher: if user logs-in right now, refresh (covers login while staying on forum)
        var tries = 0;
        var lastUser = getUser();
        var t = setInterval(function(){
          tries++;
          var u = getUser();
          if(u !== lastUser){
            lastUser = u;
            render();
          }
          if(tries >= 12) clearInterval(t);
        }, 250);
      }
    }catch(e){}
  });

})();

/* ===== script block 15 (from original HTML) ===== */
(function(){
  function normStr(v){ return (v==null) ? "" : String(v).trim(); }

  function openBackdrop(el){
    if(!el) return;
    el.classList.add('show');
    el.setAttribute('aria-hidden','false');
  }
  function closeBackdrop(el){
    if(!el) return;
    el.classList.remove('show');
    el.setAttribute('aria-hidden','true');
  }

  function getActiveStudent(){
    try{ if(window.APP_STATE && window.APP_STATE.activeStudentTz) return normStr(window.APP_STATE.activeStudentTz); }catch(e){}
    try{
      var w = (typeof window !== "undefined") ? window : null;
      if(w && w.__activeStudentTz) return normStr(w.__activeStudentTz);
    }catch(e){}

    var u = "";
    try{ if(typeof getLoggedInUser === 'function') u = normStr(getLoggedInUser()); }catch(e){}
    if(!u){
      try{ u = normStr(DBStorage.getItem('student_username') || ""); }catch(e){}
    }
    if(!u) return "";

    // If already digits (tz) return as-is
    var digits = String(u).replace(/\D/g,"");
    if(digits && digits.length >= 7) return digits;

    // Try mapping via registry (students_registry_v1)
    try{
      var raw = DBStorage.getItem("students_registry_v1");
      if(raw){
        var reg = JSON.parse(raw);
        if(reg && typeof reg === "object"){
          var uLow = String(u).toLowerCase();
          for(var key in reg){
            if(!Object.prototype.hasOwnProperty.call(reg,key)) continue;
            var r = reg[key];
            if(!r || typeof r !== "object") continue;
            if(String(key).trim() === u) return String(key);

        var cand = [
          r.username, r.user, r.uid, r.userId, r.email,
          r.phone, r.mobile, r.phoneNumber, r.phone_number,
          r["מספר פלאפון"], r["מספרפלאפון"], r["פלאפון"], r["טלפון"], r["טלפון נייד"], r["נייד"],
          r.tz, r.id, r.teudatZehut, r["תז"], r['ת"ז'], r['ת״ז']
        ];
            for(var i=0;i<cand.length;i++){
              var c = cand[i];
              if(c==null) continue;
              var cs = String(c).trim();
              if(cs.toLowerCase && cs.toLowerCase() === uLow) return String(key);
              if(digits && cs.replace(/\D/g,"") === digits) return String(key);
            }
          }
        }
      }
    }catch(e){}
    return u;
  }

  function safeGetProfile(tz){
    tz = normStr(tz);
    if(!tz) return null;

    var a = null, b = null;
    try{ if(typeof getStudentProfile === 'function') a = getStudentProfile(tz); }catch(e){ a = null; }
    try{
      var raw = DBStorage.getItem("student_profile_" + tz);
      if(raw){
        var obj = JSON.parse(raw);
        if(obj && typeof obj === "object") b = obj;
      }
    }catch(e){ b = null; }

    if(!a && !b) return null;
    if(!a) return b;
    if(!b) return a;

    // Merge: prefer persisted profile for logs, keep any fields from admin registry
    var m = Object.assign({}, a, b);

    function pickArr(x, y){
      var ax = Array.isArray(x), ay = Array.isArray(y);
      if(ax && ay) return (y.length >= x.length) ? y : x;
      if(ay) return y;
      if(ax) return x;
      return null;
    }

    // Completed lessons log
    var lessonsA = a.completedLessonsLog || a.lessonsDoneLog || a.lessonsLog;
    var lessonsB = b.completedLessonsLog || b.lessonsDoneLog || b.lessonsLog;
    var bestLessons = pickArr(lessonsA, lessonsB);
    if(bestLessons) m.completedLessonsLog = bestLessons;

    // Outside training log
    var outA = a.outsideLog || a.outLog || a.outdoorLog;
    var outB = b.outsideLog || b.outLog || b.outdoorLog;
    var bestOut = pickArr(outA, outB);
    if(bestOut) m.outsideLog = bestOut;

    try{ if(Array.isArray(m.outsideLog)) m.outsideCount = m.outsideLog.length; }catch(e){}

    return m;
  }

  function getLessonsLog(profile){
    if(!profile || typeof profile !== 'object') return [];
    var a = profile.completedLessonsLog;
    if(Array.isArray(a)) return a;
    a = profile.lessonsDoneLog;
    if(Array.isArray(a)) return a;
    a = profile.lessonsLog;
    if(Array.isArray(a)) return a;
    return [];
  }

  function renderLessonsLog(profile){
    var tbody = document.getElementById('lessonsHistoryTbody');
    var txt = document.getElementById('lessonsHistorySub');
    if(!tbody) return;
    tbody.innerHTML = '';

    // Take data ONLY from Lesson Management (daily reports)
    var tz = (profile && (profile.tz || profile.id || profile.tzId || profile.tzNumber))
      ? (profile.tz || profile.id || profile.tzId || profile.tzNumber)
      : getActiveStudent();
    tz = tz ? String(tz).trim() : '';

    // Local helpers (must NOT depend on other script-block scopes)
    function _normTz(v){
      var d = String(v == null ? '' : v).replace(/\D/g,'');
      // many TZ are 9 digits in IL; pad to compare safely (handles leading zeros)
      if(d && d.length < 9) d = d.padStart(9,'0');
      return d;
    }
    var tzN = _normTz(tz);

    function _pad2(n){ return String(n).padStart(2,'0'); }
    function _hmLocal(ms){
      if(!ms) return '—';
      try{
        var d = new Date(ms);
        return _pad2(d.getHours()) + ':' + _pad2(d.getMinutes());
      }catch(e){ return '—'; }
    }
    function _pickMsFromKeysLocal(r, keys){
      for(var i=0;i<keys.length;i++){
        var k = keys[i];
        if(!r || r[k] == null) continue;
        var n = Number(r[k]);
        if(isFinite(n) && n > 0) return n;
      }
      return 0;
    }
    function _getStartMsLocal(r){
      var ms = _pickMsFromKeysLocal(r, ['startMs','startedAtMs','startTimeMs','lessonStartMs','start']);
      if(ms) return ms;
      var iso = r && (r.startISO || r.startIso || r.startTimeISO || r.startTimeIso || r.startedISO || r.startedIso || r.startAtISO || r.startAtIso);
      if(typeof iso === 'string' && iso.trim()){
        var parsed = Date.parse(iso);
        if(isFinite(parsed)) return parsed;
      }
      return 0;
    }
    function _getEndMsLocal(r){
      var ms = _pickMsFromKeysLocal(r, ['endMs','endedAtMs','endTimeMs','lessonEndMs','end']);
      if(ms) return ms;
      var iso = r && (r.endISO || r.endIso || r.endTimeISO || r.endTimeIso || r.endedISO || r.endedIso || r.endAtISO || r.endAtIso);
      if(typeof iso === 'string' && iso.trim()){
        var parsed = Date.parse(iso);
        if(isFinite(parsed)) return parsed;
      }
      return 0;
    }
    function _loadLessonReportsLocal(){
      try{
        var raw = (typeof DBStorage !== 'undefined' && DBStorage.getItem)
          ? DBStorage.getItem('admin_lesson_reports_v1')
          : localStorage.getItem('admin_lesson_reports_v1');
        var obj = raw ? JSON.parse(raw) : {};
        return (obj && typeof obj === 'object') ? obj : {};
      }catch(e){ return {}; }
    }

    function _dateKeyToDisp(dateKey){
      if(!dateKey) return '—';
      var s = String(dateKey).trim();
      if(/^\d{4}-\d{2}-\d{2}$/.test(s)){
        var p = s.split('-');
        return String(Number(p[2])) + '.' + String(Number(p[1])) + '.' + p[0];
      }
      return s;
    }

    function _parseHmToMs(dateKey, hm){
      if(!dateKey || hm == null) return 0;
      var s = '';
      if(typeof hm === 'string') s = hm.trim();
      else if(typeof hm === 'number' && isFinite(hm) && hm > 0) return hm;
      else return 0;

      // allow strings like '00:34 - 01:06' or 'התחלה: 00:34'
      var mt = s.match(/(\d{1,2}:\d{2})/);
      if(!mt) return 0;
      var t = mt[1];
      var m = t.match(/^(\d{1,2}):(\d{2})$/);
      if(!m) return 0;
      var hh = String(Number(m[1])).padStart(2,'0');
      var mm = String(Number(m[2])).padStart(2,'0');

      // normalize dateKey to YYYY-MM-DD if possible
      var dk = String(dateKey).trim();
      var iso = '';
      if(/^\d{4}-\d{2}-\d{2}$/.test(dk)){
        iso = dk;
      }else{
        var mdmy = dk.match(/^(\d{1,2})[.\/\-](\d{1,2})[.\/\-](\d{4})$/);
        var mymd = dk.match(/^(\d{4})[.\/\-](\d{1,2})[.\/\-](\d{1,2})$/);
        if(mdmy){
          var dd = String(Number(mdmy[1])).padStart(2,'0');
          var mo = String(Number(mdmy[2])).padStart(2,'0');
          var yy = mdmy[3];
          iso = yy + '-' + mo + '-' + dd;
        }else if(mymd){
          var yy2 = mymd[1];
          var mo2 = String(Number(mymd[2])).padStart(2,'0');
          var dd2 = String(Number(mymd[3])).padStart(2,'0');
          iso = yy2 + '-' + mo2 + '-' + dd2;
        }
      }

      try{
        var dt = new Date((iso||dk) + 'T' + hh + ':' + mm + ':00');
        var ms = dt.getTime();
        return isFinite(ms) ? ms : 0;
      }catch(e){
        return 0;
      }
    }

    function _getMsSmart(rec, which, dateKey){
      if(!rec) return 0;
      var ms = (which === 'start') ? _getStartMsLocal(rec) : _getEndMsLocal(rec);
      if(ms) return ms;

      // Fallback: string times (HH:MM)
      var keys = (which === 'start')
        ? ['startedAt','startTime','startAt','start','timeStart']
        : ['endedAt','endTime','endAt','end','timeEnd'];
      for(var i=0;i<keys.length;i++){
        var k = keys[i];
        if(rec[k] && typeof rec[k] === 'string'){
          var ms2 = _parseHmToMs(dateKey, rec[k]);
          if(ms2) return ms2;
        }
      }
      return 0;
    }

    function _fmtHm(ms){
      if(!ms) return '—';
      try{ return _hmLocal(ms); }catch(e){ return '—'; }
    }

    function _getUnitsSmart(rec){
      if(!rec) return 1;
      var keys = ['units','lessonUnits','lessons','lessonsCount','lessonCount','count','qty','amount','numLessons','num'];
      for(var i=0;i<keys.length;i++){
        var k = keys[i];
        if(rec[k] == null) continue;
        var v = rec[k];
        if(typeof v === 'number' && isFinite(v)) return v;
        if(typeof v === 'string'){
          var m = v.match(/([0-9]+(?:\.[0-9]+)?)/);
          if(m) return parseFloat(m[1]);
        }
      }
      return 1;
    }

    var rows = [];
    if(tz){
      var reports = _loadLessonReportsLocal();
      Object.keys(reports || {}).forEach(function(dateKey){
        var bucket = reports[dateKey];
        var entries = Array.isArray(bucket?.entries) ? bucket.entries : (Array.isArray(bucket) ? bucket : []);
        entries.forEach(function(rec){
          if(!rec) return;
          var recTz = (rec.tz!=null ? rec.tz : (rec.id!=null ? rec.id : (rec.tzId!=null ? rec.tzId : (rec.tzNumber!=null ? rec.tzNumber : (rec.teudatZehut!=null ? rec.teudatZehut : (rec['תז']!=null ? rec['תז'] : rec['ת"ז']))))));
          if(tzN && _normTz(recTz) !== tzN) return;
          var type = String((rec.type || rec.kind || 'lesson') || '').toLowerCase();
          if(type !== 'lesson') return;

          var startMs = _getMsSmart(rec, 'start', dateKey);
          var endMs = _getMsSmart(rec, 'end', dateKey);
          var units = _getUnitsSmart(rec, startMs, endMs);

          var startedAtDisp = _fmtHm(startMs) || String(rec.startedAtStr||rec.startStr||rec.startTimeStr||'').trim();
          var endedAtDisp = _fmtHm(endMs) || String(rec.endedAtStr||rec.endStr||rec.endTimeStr||'').trim();
          rows.push({
            dateKey: dateKey,
            startMs: startMs,
            endMs: endMs,
            startedAt: startedAtDisp,
            endedAt: endedAtDisp,
            units: units
          });
        });
      });

      // Sort newest -> oldest
      rows.sort(function(a,b){
        var da = String(a.dateKey||'');
        var db = String(b.dateKey||'');
        if(da !== db) return da > db ? -1 : 1;
        return (b.startMs||0) - (a.startMs||0);
      });
    }

    if(txt){
      if(tz){
        txt.textContent = 'נמצאו ' + rows.length + ' רשומות שיעורים.';
      }else{
        txt.textContent = 'לא נמצא תלמיד פעיל.';
      }
    }

    rows.forEach(function(r){
      var tr = document.createElement('tr');
      var tdDate = document.createElement('td');
      var tdStart = document.createElement('td');
      var tdEnd = document.createElement('td');
      var tdUnits = document.createElement('td');

      tdDate.textContent = _dateKeyToDisp(r.dateKey);
      tdStart.textContent = r.startedAt || '—';
      tdEnd.textContent = r.endedAt || '—';
      tdUnits.textContent = (r.units != null ? r.units : 1);

      tr.appendChild(tdDate);
      tr.appendChild(tdStart);
      tr.appendChild(tdEnd);
      tr.appendChild(tdUnits);
      tbody.appendChild(tr);
    });
  }

function openLessonsHistory(){
    var tz = getActiveStudent();
    var prof = safeGetProfile(tz) || null;

    var modal = document.getElementById('lessonsHistoryModal');
    // Open first so even if rendering fails the user still sees the window.
    openBackdrop(modal);

    try{
        renderLessonsLog(prof);
    }catch(e){
        console.error('renderLessonsLog failed', e);
        // keep modal open
    }
}


  function renderOutsideLog(profile){
    var tbody = document.getElementById('outsideHistoryTbody');
    var sub = document.getElementById('outsideHistorySub');
    if(!tbody) return;
    tbody.innerHTML = '';

    // Local formatters (keep independent from lessons history scope)
    function fmtDateRow(o){
      if(!o) return '—';
      const v = (o.dateStr || o.date || o.dateKey);
      if(!v) return '—';
      const s = String(v).trim();
      // Convert YYYY-MM-DD -> D.M.YYYY
      if(/^\d{4}-\d{2}-\d{2}$/.test(s)){
        const parts = s.split('-');
        return Number(parts[2]) + '.' + Number(parts[1]) + '.' + parts[0];
      }
      // Convert DD/MM/YYYY -> D.M.YYYY
      if(/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s)){
        const p = s.split('/');
        return Number(p[0]) + '.' + Number(p[1]) + '.' + p[2];
      }
      return s.replaceAll('/', '.');
    }
    function fmtTimeRow(o, which){
      if(!o) return '—';
      // prefer strings if provided
      if(which === 'start'){
        const s = (o.startedAt || o.start || o.startStr);
        if(s && String(s).trim()) return String(s).trim();
        const ms = (typeof o.startMs === 'number' && o.startMs > 0) ? o.startMs : 0;
        if(ms) return new Date(ms).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
        return '—';
      }
      const e = (o.endedAt || o.end || o.endStr);
      if(e && String(e).trim()) return String(e).trim();
      const ems = (typeof o.endMs === 'number' && o.endMs > 0) ? o.endMs : 0;
      if(ems) return new Date(ems).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
      return '—';
    }

    var tz = (profile && (profile.tz || profile.tzId || profile.idNumber)) ? (profile.tz || profile.tzId || profile.idNumber) : '';
    var rows = [];
    try{ if(tz) rows = getReportEntriesForTz(tz, 'outside'); }catch(e){ rows = []; }

    // Fallback to legacy outside log if reports not available
    if((!rows || !rows.length) && profile){
      try{
        var raw = profile.outsideLog || profile.outLog || profile.outdoorLog;
        if(Array.isArray(raw)){
          rows = raw.map(function(it){
            var d = (it && it.date) ? String(it.date) : '';
            return {
              date: d,
              startedAt: (it && (it.start || it.startedAt)) ? String(it.start || it.startedAt) : '',
              endedAt: (it && (it.end || it.endedAt)) ? String(it.end || it.endedAt) : '',
              units: 1,
              startMs: (it && it.startMs) ? Number(it.startMs) : 0
            };
          }).sort(function(a,b){ return (b.startMs||0)-(a.startMs||0); });
        }
      }catch(e){ rows = []; }
    }

    if(sub){
      sub.textContent = rows && rows.length ? ('נמצאו ' + rows.length + ' אימוני חוץ.') : 'אין אימוני חוץ עדיין.';
    }

    // keep KPI "חוץ שביצע" synced (total count)
    try{ var kpiEl = document.getElementById('spKpiOut'); if(kpiEl) kpiEl.textContent = String((rows&&rows.length)||0); }catch(_e){}

    (rows || []).forEach(function(r){
      var tr = document.createElement('tr');
      var tdDate = document.createElement('td');
      var tdStart = document.createElement('td');
      var tdEnd = document.createElement('td');
      var tdUnits = document.createElement('td');

      tdDate.dir = 'ltr';
      tdStart.dir = 'ltr';
      tdEnd.dir = 'ltr';

      tdDate.textContent = fmtDateRow(r);
      tdStart.textContent = fmtTimeRow(r, 'start');
      tdEnd.textContent = fmtTimeRow(r, 'end');
      tdUnits.textContent = '1';

      tr.appendChild(tdDate);
      tr.appendChild(tdStart);
      tr.appendChild(tdEnd);
      tr.appendChild(tdUnits);
      tbody.appendChild(tr);
    });
  }

  function openOutsideHistory(){
    var tz = getActiveStudent();
    var prof = safeGetProfile(tz) || null;
    renderOutsideLog(prof);
    openBackdrop(document.getElementById('outsideHistoryModal'));
  }


  function wire(){
    var btn = document.getElementById('spLessonsHistoryBtn');
    var kpi = document.getElementById('spKpiDoneCard');
    function __openLH(e){ try{ if(e){ e.preventDefault(); } }catch(_){} openLessonsHistory(); }
    if(kpi){
      if(typeof bindReleaseTap === 'function') bindReleaseTap(kpi, __openLH);
      else kpi.addEventListener('click', __openLH);
    }
    // Outside history
    var kpiOut = document.getElementById('spKpiOutCard');
    function __openOH(e){ try{ if(e){ e.preventDefault(); } }catch(_){} openOutsideHistory(); }
    if(kpiOut){
      if(typeof bindReleaseTap === 'function') bindReleaseTap(kpiOut, __openOH);
      else kpiOut.addEventListener('click', __openOH);
    }


    
    if(btn){
      btn.addEventListener('click', function(e){
        e.preventDefault();
        openLessonsHistory();
      });
    }

    var closeBtn = document.getElementById('lessonsHistoryClose');
    if(closeBtn){
      closeBtn.addEventListener('click', function(e){
        e.preventDefault();
        closeBackdrop(document.getElementById('lessonsHistoryModal'));
      });
    }
    var closeOutBtn = document.getElementById('outsideHistoryClose');
    if(closeOutBtn){
      closeOutBtn.addEventListener('click', function(e){
        e.preventDefault();
        closeBackdrop(document.getElementById('outsideHistoryModal'));
      });
    }

    var bdOut = document.getElementById('outsideHistoryModal');
    if(bdOut){
      bdOut.addEventListener('click', function(e){
        if(e.target === bdOut) closeBackdrop(bdOut);
      });
    }


    var bd = document.getElementById('lessonsHistoryModal');
    if(bd){
      bd.addEventListener('click', function(e){
        if(e.target === bd) closeBackdrop(bd);
      });
    }
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire);
  else wire();
})();




/* ===== Book Test (v1) ===== */
(function(){
  function normStr(v){ return (v==null) ? "" : String(v).trim(); }
  function digitsOnly(s){ return String(s||"").replace(/\D/g,""); }
  function $(id){ return document.getElementById(id); }

  function makeTxId(){
    return 'tx_' + String(Date.now()) + '_' + String(Math.random()).slice(2);
  }

  function getActiveTz(){
    // Prefer the app-wide resolver if it exists (covers admin/student contexts)
    try{
      if(typeof getActiveStudent === "function"){
        var a = String(getActiveStudent()||"");
        var ad = digitsOnly(a);
        if(ad && ad.length >= 7) return ad;
      }
    }catch(e){}

    try{ if(window.APP_STATE && window.APP_STATE.activeStudentTz) return digitsOnly(window.APP_STATE.activeStudentTz); }catch(e){}
    try{ if(window.__activeStudentTz) return digitsOnly(window.__activeStudentTz); }catch(e){}

    // fallback: map stored username/email/phone -> TZ when possible
    try{
      var u = normStr((typeof getLoggedInUser === "function" ? getLoggedInUser() : "") || DBStorage.getItem("student_username") || "");
      var tzGuess = "";
      try{ if(typeof resolveStudentTzFromUsername === "function") tzGuess = resolveStudentTzFromUsername(u); }catch(_e){}
      tzGuess = digitsOnly(tzGuess || "");
      if(tzGuess && tzGuess.length === 9) return tzGuess;
      // If username itself is a 9-digit TZ
      var d = digitsOnly(u);
      if(d && d.length === 9) return d;
    }catch(e){}
    return "";
  }

  
  function _normTzKey(tz){
    try{
      if(typeof normalizeTz === 'function'){
        var n = normalizeTz(tz);
        if(n) return String(n).trim();
      }
    }catch(e){}
    return String(tz||'').replace(/\D/g,'').trim() || String(tz||'').trim();
  }

function getCredit(tz){
    tz = _normTzKey(tz);
    if(!tz) return 0;
    var key = (typeof keyStudentCredit === "function") ? keyStudentCredit(tz) : ("student_credit_money_" + tz);
    var raw = "";
    try{ raw = DBStorage.getItem(key); }catch(e){ raw = ""; }
    var n = parseFloat(String(raw||"").replace(/,/g,"").trim());
    return isFinite(n) ? n : 0;
  }
  function setCredit(tz, amount){
    tz = _normTzKey(tz);
    if(!tz) return;
    var key = (typeof keyStudentCredit === "function") ? keyStudentCredit(tz) : ("student_credit_money_" + tz);
    try{ DBStorage.setItem(key, String(Math.round(amount))); }catch(e){}
  }

  function orderKey(tz){ tz = _normTzKey(tz); return "student_test_order_" + String(tz||"").trim(); }

  function _findTestOrderInLog(tz){
    tz = _normTzKey(tz);
    if(!tz) return null;
    try{
      var all = loadTestOrders();
      if(!all || typeof all !== "object") return null;
      var keys = Object.keys(all);
      // newest first
      keys.sort(function(a,b){ return String(b).localeCompare(String(a)); });
      for(var ki=0; ki<keys.length; ki++){
        var dk = keys[ki];
        var arr = all[dk];
        if(!Array.isArray(arr)) continue;
        // newest inside date
        for(var i=arr.length-1; i>=0; i--){
          var r = arr[i];
          if(!r) continue;
          var rTz = _normTzKey(r.tz || "");
          if(rTz === tz){
            return { dateKey: dk, index: i, entry: r };
          }
        }
      }
      return null;
    }catch(e){ return null; }
  }

  function _updateTestOrderInLog(dateKey, index, patch){
    try{
      var all = loadTestOrders();
      if(!all || typeof all !== "object") all = {};
      var arr = (all[dateKey] && Array.isArray(all[dateKey])) ? all[dateKey] : null;
      if(!arr || !arr[index]) return false;
      var r = arr[index];
      if(patch && typeof patch === "object"){
        for(var k in patch){
          if(Object.prototype.hasOwnProperty.call(patch,k)){
            r[k] = patch[k];
          }
        }
      }
      arr[index] = r;
      all[dateKey] = arr;
      saveTestOrders(all);
      return true;
    }catch(e){ return false; }
  }

  

// --- Book Test page renderer (v8) ---
// Shows current credit + order status (single source of truth: admin_test_orders_v1)
window.renderBookTestPage = function(){
  try{
    var balEl = $("btBalance");
    var stEl  = $("btStatus");
    var tz = null;
    try{ tz = getActiveTz(); }catch(e){ tz = null; }
    tz = _normTzKey(tz);
    if(!tz){
      if(balEl) balEl.textContent = "—";
      if(stEl) stEl.textContent = "—";
      return;
    }
    var credit = 0;
    try{ credit = getCredit(tz); }catch(e){ credit = 0; }
    try{
      if(balEl) balEl.textContent = (typeof fmtMoney === "function") ? fmtMoney(credit) : (String(credit) + "₪");
    }catch(e){
      if(balEl) balEl.textContent = String(credit);
    }

    function pad2(n){ return String(n).padStart(2,"0"); }
    function fmtDt(ms){
      try{
        var d = new Date(ms);
        return pad2(d.getDate()) + "/" + pad2(d.getMonth()+1) + "/" + d.getFullYear() + " " + pad2(d.getHours()) + ":" + pad2(d.getMinutes());
      }catch(e){ return ""; }
    }

    var found = null;
    try{ found = _findTestOrderInLog(tz); }catch(e){ found = null; }

    if(found && found.entry){
      var when = Number(found.entry.orderedAt || 0);
      var t = "הוזמן";
      if(when) t += " (" + fmtDt(when) + ")";
      if(stEl) stEl.textContent = t;
      return;
    }

    // legacy (optional)
    var ord = null;
    try{ ord = getOrder(tz); }catch(e){ ord = null; }
    if(ord && ord.orderedAt){
      var when2 = Number(ord.orderedAt||0);
      var t2 = "הוזמן";
      if(when2) t2 += " (" + fmtDt(when2) + ")";
      if(stEl) stEl.textContent = t2;
      return;
    }

    if(stEl) stEl.textContent = "לא הוזמן";
  }catch(e){}
};
// --- Test order: reliable binding + atomic charge+log (v7 fix)
function getOrder(tz){
  try{
    var key = orderKey(tz);
    var raw = DBStorage.getItem(key);
    if(!raw) return null;
    return JSON.parse(raw);
  }catch(e){ return null; }
}
function setOrder(tz, obj){
  try{
    var key = orderKey(tz);
    DBStorage.setItem(key, JSON.stringify(obj||null));
  }catch(e){}
}

function bindBookTestOrder(){
  // bind ONLY once
  var orderBtn = $("btOrderBtn");
  if(orderBtn && !orderBtn._bound){
    orderBtn._bound = 1;
    orderBtn.addEventListener("click", function(){
      var tz = null;
      try{ tz = (typeof getActiveTz==="function") ? getActiveTz() : null; }catch(e){ tz = null; }
      tz = _normTzKey(tz);
      if(!tz){
        try{ toast("אין תלמיד פעיל"); }catch(e){}
        return;
      }

      var overlay = $("btInsufficientOverlay");
      var alreadyOv = $("btAlreadyOverlay");
      var price = 400;

      // close insufficient-balance overlay
      try{
        var ci = $("btInsufficientClose");
        if(ci && !ci._bound){
          ci._bound = 1;
          ci.addEventListener("click", function(){ try{ closeOverlay(overlay); }catch(e){} }, {passive:true});
        }
      }catch(e){}

      function showAlready(){
        try{
          var t = $("btAlreadyText");
          if(t) t.textContent = "יש כבר טסט מוזמן במערכת. תקבל תאריך בימים הקרובים.";
        }catch(e){}
        try{ openOverlay(alreadyOv); }catch(e){}
      }
      // close already overlay
      try{
        var c = $("btAlreadyClose");
        if(c && !c._bound){
          c._bound = 1;
          c.addEventListener("click", function(){ try{ closeOverlay(alreadyOv); }catch(e){} }, {passive:true});
        }
      }catch(e){}


      // Prevent duplicate orders: check admin log + legacy per-student key
      var found = null;
      try{ found = _findTestOrderInLog(tz); }catch(e){ found = null; }
      var ord = null;
      try{ ord = getOrder(tz); }catch(e){ ord = null; }
      if((found && found.entry) || (ord && (ord.orderedAt || ord.status === "ordered"))){
        showAlready();
        try{ window.renderBookTestPage(); }catch(e){}
        return;
      }

      // Load student's payments ledger (source of truth for credit/יתרה)
      var payKey = (typeof keyStudentPayments === "function") ? keyStudentPayments(tz) : ("student_payments_" + tz);
      var payObj = {};
      try{ payObj = (typeof payLsGet === "function") ? (payLsGet(payKey, {}) || {}) : {}; }catch(e){ payObj = {}; }
      try{ if(typeof payEnsureLedger === "function") payObj = payEnsureLedger(payObj, tz); }catch(e){}

      var credit = 0;
      try{
        credit = Number(payObj.due);
        if(!isFinite(credit)) credit = getCredit(tz);
      }catch(e){ credit = getCredit(tz); }

      if(credit < price){
        var missing = Math.max(0, Math.round(price - credit));
        var txt = $("btInsufficientText");
        if(txt) txt.textContent = "אין מספיק יתרה בחשבון. חסר " + missing + "₪ להזמנת טסט.";
        openOverlay(overlay);
        return;
      }

      var txId = (typeof makeTxId === "function") ? makeTxId() : ("tx_" + Date.now() + "_" + Math.random().toString(16).slice(2));

      var newCredit = Math.max(0, Math.round(credit - price));
      try{ setCredit(tz, newCredit); }catch(e){}

      // 1) Charge: add ledger entry (idempotent by admin-log gate above)
      try{
        if(typeof payLedgerAdd === "function"){
          payLedgerAdd(payObj, { u: tz, ts: Date.now(), id: txId, type: "test_order", amount: -price, note: "הזמנת טסט", meta: { txId: txId } });
        }else{
          // fallback: write direct credit key
          setCredit(tz, Math.max(0, Math.round(credit - price)));
        }
        // Persist payments + credit key (used by UI)
        try{ if(typeof payLsSet === "function") payLsSet(payKey, payObj); }catch(e){}
        try{
          var dueNow = Number(payObj.due);
          if(!isFinite(dueNow)) dueNow = newCredit;
          DBStorage.setItem(keyStudentCredit(tz), String(Math.round(dueNow)));
        }catch(e){}
      }catch(e){}

      // 2) Write admin log
      try{
        var st = null;
        try{ st = (typeof getStudentByTz==="function") ? getStudentByTz(tz) : null; }catch(e){}
        var nm = "";
        try{ nm = st ? (st.firstName||st.name||st.fullName||"") : ""; }catch(e){}
        addTestOrderEntry(tz, nm, price, txId);
      }catch(e){}

      // 3) Legacy state (optional)
      try{ setOrder(tz, { orderedAt: Date.now(), price: price, status: "ordered", txId: txId }); }catch(e){}

      try{ window.renderBookTestPage(); }catch(e){}
      try{ if(typeof window.renderStudentProfile === "function") window.renderStudentProfile(); }catch(e){}
      try{ toast("הטסט הוזמן. ירד 400₪ מהיתרה."); }catch(e){}
    }, {passive:true});
  }
}

if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", function(){
      bindBookTestOrder();
    }, {once:true});
  }else{
    bindBookTestOrder();
  }
})();



// Global: prevent "keyboard pops on every tap" by blurring focused inputs when tapping outside
(function(){
  try{
    if(window.__globalBlurOnTap) return;
    window.__globalBlurOnTap = true;
    function shouldKeepFocus(t){
      if(!t) return false;
      var tag = (t.tagName||'').toUpperCase();
      if(tag === 'INPUT' || tag === 'TEXTAREA') return true;
      try{ if(t.isContentEditable) return true; }catch(e){}
      return false;
    }
    function blurIfNeeded(ev){
      try{
        var t = ev && ev.target;
        if(shouldKeepFocus(t)) return;
        try{ __blurActiveInputs(); }catch(e){}
      }catch(e){}
    }
    document.addEventListener('touchstart', blurIfNeeded, {passive:true});
    document.addEventListener('mousedown', blurIfNeeded, true);
  }catch(e){}
})();



/* ===== SETTINGS + I18N (v1) ===== */
(function(){
  var w = window;

  var I18N = {
    he: {
      menu_title: "תפריט",
      menu_share: "שתפו אותנו",
      menu_student_info: "מידע לתלמיד",
      menu_timer: "טיימר שיעורים",
      menu_green_form: "טופס ירוק",
      menu_forum: "פורום שאלות ותשובות",
      menu_leave_message: "השאירו הודעה",
      menu_info: "מידע",
      menu_settings: "הגדרות",

      studentmenu_safety_rules: "כללי בטיחות",
      studentmenu_what_learn: "מה לומדים",
      studentmenu_how_pass_test: "איך עוברים טסט",
      studentmenu_passed_test: "עברת טסט?",
      studentmenu_fees: "תשלומי אגרה",
      studentmenu_student_profile: "פרופיל תלמיד",
      studentmenu_personal_messages: "הודעות אישיות",
      studentmenu_lesson_payment: "תשלום על שיעור",
      studentmenu_book_test: "הזמנת טסט",
      studentmenu_apply_license: "הגשת בקשה להוצאת רישיון",
      studentmenu_logout: "התנתק",

      page_info_title: "מידע",
      page_settings_title: "הגדרות",
      settings_language_title: "שפה",
      lang_he: "עברית",
      lang_ar: "العربية",
      lang_en: "English",
      settings_display_title: "תצוגה",
      settings_mode_label: "מצב:",
      theme_day: "יום",
      theme_night: "לילה",
      theme_auto: "אוטומטי",
      settings_accessibility_title: "נגישות",
      settings_text_size_label: "גודל טקסט:",
      text_sm: "קטן",
      text_md: "רגיל",
      text_lg: "גדול",
      acc_high_contrast: "ניגודיות גבוהה",
      acc_reduce_motion: "הפחתת אנימציות",
      acc_big_buttons: "כפתורים גדולים",
      settings_about_title: "אודות",
      about_version: "גרסה",
      about_contact: "צור קשר / תמיכה",
      about_terms: "תנאי שימוש",
      about_privacy: "מדיניות פרטיות",
      about_note: "* כרגע הפעיל בשלב א: שינוי שפה. שאר ההגדרות נשמרות ויופעלו בשלבים הבאים.",

      studentmenu_safety_rules: "כללי בטיחות",
      studentmenu_what_learn: "מה לומדים",
      studentmenu_how_pass_test: "איך עוברים טסט",
      studentmenu_passed_test: "עברת טסט?",
      studentmenu_fees: "תשלומי אגרה",
      studentmenu_student_profile: "פרופיל תלמיד",
      studentmenu_personal_messages: "הודעות אישיות",
      studentmenu_lesson_payment: "תשלום על שיעור",
      studentmenu_book_test: "הזמנת טסט",
      studentmenu_apply_license: "הגשת בקשה להוצאת רישיון",
      studentmenu_logout: "התנתק"
    },
    ar: {
      menu_title: "القائمة",
      menu_share: "شاركنا",
      menu_student_info: "معلومات للطالب",
      menu_timer: "مؤقت الدروس",
      menu_green_form: "النموذج الأخضر",
      menu_forum: "منتدى الأسئلة والأجوبة",
      menu_leave_message: "اتركوا رسالة",
      menu_info: "معلومات",
      menu_settings: "الإعدادات",

      studentmenu_safety_rules: "قواعد السلامة",
      studentmenu_what_learn: "ماذا نتعلم",
      studentmenu_how_pass_test: "كيف تنجح في الاختبار",
      studentmenu_passed_test: "هل نجحت في الاختبار؟",
      studentmenu_fees: "رسوم المعاملات",
      studentmenu_student_profile: "ملف الطالب",
      studentmenu_personal_messages: "رسائل شخصية",
      studentmenu_lesson_payment: "دفع مقابل درس",
      studentmenu_book_test: "حجز اختبار",
      studentmenu_apply_license: "تقديم طلب للحصول على الرخصة",
      studentmenu_logout: "تسجيل الخروج",

      page_info_title: "معلومات",
      page_settings_title: "الإعدادات",
      settings_language_title: "اللغة",
      lang_he: "עברית",
      lang_ar: "العربية",
      lang_en: "English",
      settings_display_title: "العرض",
      settings_mode_label: "الوضع:",
      theme_day: "نهار",
      theme_night: "ليل",
      theme_auto: "تلقائي",
      settings_accessibility_title: "إمكانية الوصول",
      settings_text_size_label: "حجم النص:",
      text_sm: "صغير",
      text_md: "عادي",
      text_lg: "كبير",
      acc_high_contrast: "تباين عالٍ",
      acc_reduce_motion: "تقليل الحركات",
      acc_big_buttons: "أزرار كبيرة",
      settings_about_title: "حول",
      about_version: "الإصدار",
      about_contact: "تواصل / دعم",
      about_terms: "شروط الاستخدام",
      about_privacy: "سياسة الخصوصية",
      about_note: "* المرحلة أ: تغيير اللغة. باقي الإعدادات تُحفظ وستُفعّل لاحقًا."
    },
    en: {
      menu_title: "תפריט",
      menu_share: "Share us",
      menu_student_info: "Student info",
      menu_timer: "Lessons timer",
      menu_green_form: "Green form",
      menu_forum: "Q&A forum",
      menu_leave_message: "Leave a message",
      menu_info: "Info",
      menu_settings: "Settings",

      studentmenu_safety_rules: "Safety rules",
      studentmenu_what_learn: "What you learn",
      studentmenu_how_pass_test: "How to pass the test",
      studentmenu_passed_test: "Passed the test?",
      studentmenu_fees: "Fees",
      studentmenu_student_profile: "Student profile",
      studentmenu_personal_messages: "Personal messages",
      studentmenu_lesson_payment: "Lesson payment",
      studentmenu_book_test: "Book a test",
      studentmenu_apply_license: "Apply for a license",
      studentmenu_logout: "Log out",

      page_info_title: "Info",
      page_settings_title: "Settings",
      settings_language_title: "Language",
      lang_he: "Hebrew",
      lang_ar: "Arabic",
      lang_en: "English",
      settings_display_title: "Display",
      settings_mode_label: "Mode:",
      theme_day: "Day",
      theme_night: "Night",
      theme_auto: "Auto",
      settings_accessibility_title: "Accessibility",
      settings_text_size_label: "Text size:",
      text_sm: "Small",
      text_md: "Normal",
      text_lg: "Large",
      acc_high_contrast: "High contrast",
      acc_reduce_motion: "Reduce motion",
      acc_big_buttons: "Large buttons",
      settings_about_title: "About",
      about_version: "Version",
      about_contact: "Contact / Support",
      about_terms: "Terms of use",
      about_privacy: "Privacy policy",
      about_note: "* Stage A active: language switch. Other settings are saved and will be enabled later."
    }
  };

  var KEYS = {
    lang: "app_settings_lang",
    theme: "app_settings_theme",
    textSize: "app_settings_text_size",
    highContrast: "app_settings_high_contrast",
    reduceMotion: "app_settings_reduce_motion",
    bigButtons: "app_settings_big_buttons"
  };

  function getStore(){
    try{
      if(w.DBStorage && typeof w.DBStorage.getItem === "function") return w.DBStorage;
    }catch(e){}
    return window.localStorage;
  }

  function read(key, fallback){
    try{
      var v = getStore().getItem(key);
      return (v === null || typeof v === "undefined" || v === "") ? fallback : v;
    }catch(e){ return fallback; }
  }

  function write(key, val){
    try{ getStore().setItem(key, String(val)); }catch(e){}
  }

  function translateDOM(lang){
    var dict = I18N[lang] || I18N.he;
    var nodes = document.querySelectorAll("[data-i18n]");
    for(var i=0;i<nodes.length;i++){
      var el = nodes[i];
      var k = el.getAttribute("data-i18n");
      if(k && dict[k] != null){
        el.textContent = dict[k];
      }
    }
  }

  function setDirAndLang(lang){
    // שלב א': שינוי שפה = תרגום טקסטים בלבד.
    // לא משנים dir/lang/class כדי שלא יזוזו אלמנטים (כולל חץ חזרה).
    return;
  }

  function setActiveButtons(){
    var lang = read(KEYS.lang, "he");
    var theme = read(KEYS.theme, "auto");
    var textSize = read(KEYS.textSize, "md");

    // segmented active states
    document.querySelectorAll(".seg-btn[data-lang]").forEach(function(b){
      b.classList.toggle("active", b.getAttribute("data-lang") === lang);
    });
    document.querySelectorAll(".seg-btn[data-theme]").forEach(function(b){
      b.classList.toggle("active", b.getAttribute("data-theme") === theme);
    });
    document.querySelectorAll(".seg-btn[data-text-size]").forEach(function(b){
      b.classList.toggle("active", b.getAttribute("data-text-size") === textSize);
    });

    // toggles
    function setToggle(name, on){
      var btn = document.querySelector('.toggle[data-toggle="'+name+'"]');
      if(!btn) return;
      btn.classList.toggle("on", !!on);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
    }
    setToggle("highContrast", read(KEYS.highContrast,"0")==="1");
    setToggle("reduceMotion", read(KEYS.reduceMotion,"0")==="1");
    setToggle("bigButtons", read(KEYS.bigButtons,"0")==="1");
  }

  function applyTheme(){
    var mode = read(KEYS.theme, "auto");
    document.body.classList.remove("theme-day","theme-night","theme-auto");
    if(mode === "day") document.body.classList.add("theme-day");
    else if(mode === "night") document.body.classList.add("theme-night");
    else document.body.classList.add("theme-auto");

    // Swap ads frame image based on theme (day uses misgeret_day.png)
    try{
      var frame = document.querySelector(".ads-frame-top");
      if(frame){
        frame.src = (mode === "day") ? "misgeret_day.png" : "misgeret.png";
      }
    }catch(e){}
    try{ if(window.__setSecretaryBgLock) window.__setSecretaryBgLock(false); }catch(e){}
  }

  function applyAccessibility(){
    var size = read(KEYS.textSize, "md");
    document.body.classList.remove("text-sm","text-md","text-lg");
    document.body.classList.add(size === "sm" ? "text-sm" : (size === "lg" ? "text-lg" : "text-md"));

    document.body.classList.toggle("hc", read(KEYS.highContrast,"0")==="1");
    document.body.classList.toggle("rm", read(KEYS.reduceMotion,"0")==="1");
    document.body.classList.toggle("bb", read(KEYS.bigButtons,"0")==="1");
  }

  function setLanguage(lang){
    if(!I18N[lang]) lang = "he";
    write(KEYS.lang, lang);
    setDirAndLang(lang);
    translateDOM(lang);
    setActiveButtons();
  }

  function initSettingsUI(){
    // language
    document.addEventListener("click", function(e){
      var btn = e.target && (e.target.closest ? e.target.closest(".seg-btn") : null);
      if(btn && btn.hasAttribute("data-lang")){
        setLanguage(btn.getAttribute("data-lang"));
        return;
      }
      if(btn && btn.hasAttribute("data-theme")){
        write(KEYS.theme, btn.getAttribute("data-theme"));
        applyTheme(); setActiveButtons();
        return;
      }
      if(btn && btn.hasAttribute("data-text-size")){
        write(KEYS.textSize, btn.getAttribute("data-text-size"));
        applyAccessibility(); setActiveButtons();
        return;
      }
      var tgl = e.target && (e.target.closest ? e.target.closest(".toggle") : null);
      if(tgl && tgl.hasAttribute("data-toggle")){
        var name = tgl.getAttribute("data-toggle");
        // Stage A: only language switch is active. High-contrast is disabled (can break rendering on some devices).
        if(name === "highContrast"){
          try{ write(KEYS.highContrast,"0"); document.body.classList.remove("hc"); setActiveButtons(); }catch(e){}
          try{ alert("ניגודיות גבוהה תופעל בשלבים הבאים. כרגע כבוי."); }catch(e){}
          return;
        }
        var key = KEYS[name];
        if(!key) return;
        var cur = read(key,"0")==="1";
        write(key, cur ? "0" : "1");
        applyAccessibility(); setActiveButtons();
        return;
      }
      var link = e.target && (e.target.closest ? e.target.closest(".setting-link") : null);
      if(link && link.hasAttribute("data-action")){
        var act = link.getAttribute("data-action");
        // Stage A: simple placeholders
        if(act === "showVersion"){
          try{ alert("Version: " + (document.getElementById("appVersionValue") ? document.getElementById("appVersionValue").textContent : "")); }catch(e){}
        }else if(act === "contactSupport"){
          try{ alert("Support: oryarokdriving@gmail.com"); }catch(e){}
        }else if(act === "openTerms"){
          try{ alert("Terms of use (placeholder)"); }catch(e){}
        }else if(act === "openPrivacy"){
          try{ alert("Privacy policy (placeholder)"); }catch(e){}
        }
      }
    }, true);
  }

  function boot(){
    // SAFETY: high-contrast filter can break rendering on some Android WebViews.
    // Force it OFF on boot (Stage A focuses on language only).
    try{
      if(read(KEYS.highContrast,"0")==="1") write(KEYS.highContrast,"0");
      document.body.classList.remove("hc");
    }catch(e){}

    var lang = read(KEYS.lang, "he");
    setDirAndLang(lang);
    translateDOM(lang);
    applyTheme();
    applyAccessibility();
    setActiveButtons();
    initSettingsUI();
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", boot);
  }else{
    setTimeout(boot, 0);
  }

  // expose for debugging
  w.setAppLanguage = setLanguage;
})();



/* =========================
   ADS BOARD (Home + Manager)
   ========================= */
(function(){
  var LS_KEY = "adsBoardItems_v1"; // compatibility key name only (ads no longer persist to localStorage)
  var __adsMemoryJson = "[]";
  var carouselTimer = null;
  var curIdx = 0;
  var currentVideoEl = null;
  var isAnimating = false;
  var dragActive = false;
  var touchStartY = null;
  var touchLastY = null;
  var touchActive = false;

  function safeJsonParse(s, fb){
    try{ return JSON.parse(s||""); }catch(e){ return fb; }
  }
  function _getSharedAdsJsonRaw(){
    try{
      if(window.FBBridge && typeof window.FBBridge.getSharedAdsJson === "function"){
        var j = window.FBBridge.getSharedAdsJson();
        if(typeof j === "string" && j) return j;
      }
    }catch(e){}
    return __adsMemoryJson || "[]";
  }

  function loadAds(){
    var raw = _getSharedAdsJsonRaw();
    var arr = safeJsonParse(raw, []);
    if(!Array.isArray(arr)) arr = [];
    var seen = {};
    arr = arr.filter(function(it){
      return it && (it.type === "image" || it.type === "video") && (typeof it.src === "string") && it.src.length;
    }).map(function(it){
      return {
        id: (it.id || ("ad_" + Math.random().toString(16).slice(2))),
        type: it.type,
        src: it.src,
        duration: (typeof it.duration === "number" && it.duration >= 2 && it.duration <= 30) ? it.duration : 5
      };
    }).filter(function(it){
      var k = String(it.id||"") + "|" + String(it.src||"");
      if(seen[k]) return false;
      seen[k] = 1;
      return true;
    });
    return arr;
  }
  function saveAds(arr){
    var __json = JSON.stringify(arr||[]);
    __adsMemoryJson = __json;
    try{
      if(window.FBBridge && typeof window.FBBridge.saveSharedAdsJson === "function"){
        window.FBBridge.saveSharedAdsJson(__json);
      }
    }catch(e){}
  }

  function stopCarousel(){
    if(carouselTimer){ clearTimeout(carouselTimer); carouselTimer = null; }
    if(currentVideoEl){
      try{ currentVideoEl.pause(); }catch(e){}
      currentVideoEl = null;
    }
  }

  // stop only the auto-advance timer (keep current media playing)
  function stopAutoAdvanceOnly(){
    if(carouselTimer){ clearTimeout(carouselTimer); carouselTimer = null; }
  }

  function cleanupSlides(media){
    if(!media) return;
    try{
      var kids = media.querySelectorAll('.ads-slide');
      for(var i=0;i<kids.length;i++){
        if(i===kids.length-1) continue;
        try{ kids[i].remove(); }catch(e){ if(kids[i] && kids[i].parentNode) kids[i].parentNode.removeChild(kids[i]); }
      }
    }catch(e){}
  }

  function buildSlide(it){
    var slide = document.createElement('div');
    slide.className = 'ads-slide';
    if(it.type === 'image'){
      var img = document.createElement('img');
      img.alt = 'מודעה';
      img.src = it.src;
      slide.appendChild(img);
      return {slide: slide, video: null};
    }
    var vid = document.createElement('video');
    vid.src = it.src;
    vid.playsInline = true;
    vid.muted = true;
    vid.autoplay = true;
    vid.loop = false;
    vid.controls = false;
    vid.preload = 'metadata';
    slide.appendChild(vid);
    return {slide: slide, video: vid};
  }

  function renderDots(arr){
    // dots removed (per UX)
    return;
  }

  function showAt(i, userAction, direction){
    var board = document.getElementById("adsBoard");
    var media = document.getElementById("adsMedia");
    var empty = document.getElementById("adsEmpty");
    var arr = loadAds();
    if(!board || !media || !empty) return;

    if(dragActive) return;

    stopCarousel();

    if(!arr.length){
      media.innerHTML = "";
      empty.style.display = "flex";
      renderDots(arr);
      return;
    }
    if(i < 0) i = arr.length - 1;
    if(i >= arr.length) i = 0;
    curIdx = i;

    empty.style.display = "none";

    var it = arr[curIdx];

    // Build next slide
    var pack = buildSlide(it);
    var nextSlide = pack.slide;
    var nextVid = pack.video;

    // First paint / no animation requested
    if(!media.querySelector('.ads-slide') || !direction){
      media.innerHTML = '';
      media.appendChild(nextSlide);
      currentVideoEl = nextVid;
      renderDots(arr);
      scheduleAutoAdvance(it);
      return;
    }

    // Animated vertical transition (TikTok-like)
    if(isAnimating) return;
    isAnimating = true;

    var curSlide = media.querySelector('.ads-slide');
    // direction: 1 = next (swipe up), -1 = prev (swipe down)
    var inFrom = (direction === 1) ? '100%' : '-100%';
    var outTo  = (direction === 1) ? '-100%' : '100%';
    nextSlide.style.transform = 'translateY(' + inFrom + ')';
    media.appendChild(nextSlide);

    // ensure video starts
    if(nextVid){
      try{
        var pp = nextVid.play();
        if(pp && typeof pp.catch === 'function') pp.catch(function(){});
      }catch(e){}
    }

    // animate
    // Force a consistent baseline so the outgoing slide always animates (fixes rare "new over old" bug on some WebViews)
    try{ curSlide.style.willChange = 'transform'; }catch(e){}
    try{ nextSlide.style.willChange = 'transform'; }catch(e){}
    try{ curSlide.style.transform = 'translateY(0%)'; }catch(e){}
    try{ nextSlide.style.transform = 'translateY(' + inFrom + ')'; }catch(e){}
    try{ media.getBoundingClientRect(); }catch(e){}
    requestAnimationFrame(function(){
      // Use Web Animations API to guarantee a smooth vertical slide on all devices
      var dur = 240;
      var finished = 0;
      var doneOnce = false;
      function done(){
        if(doneOnce) return;
        doneOnce = true;
        try{ if(curSlide && curSlide.parentNode) curSlide.parentNode.removeChild(curSlide); }catch(e){}
        try{ nextSlide.style.transform = ''; }catch(e){}
        try{ nextSlide.style.willChange = ''; }catch(e){}
        try{ curSlide.style.willChange = ''; }catch(e){}
        cleanupSlides(media);
        currentVideoEl = nextVid;
        renderDots(arr);
        scheduleAutoAdvance(it);
        isAnimating = false;
      }

      function oneFinished(){
        finished++;
        if(finished >= 2) done();
      }

      var a1 = null, a2 = null;
      try{
        a1 = curSlide.animate(
          [{ transform: 'translateY(0%)' }, { transform: 'translateY(' + outTo + ')' }],
          { duration: dur, easing: 'ease', fill: 'forwards' }
        );
        if(a1){ a1.onfinish = oneFinished; }
      }catch(e){
        try{ curSlide.style.transform = 'translateY(' + outTo + ')'; }catch(e2){}
        oneFinished();
      }

      try{
        a2 = nextSlide.animate(
          [{ transform: 'translateY(' + inFrom + ')' }, { transform: 'translateY(0%)' }],
          { duration: dur, easing: 'ease', fill: 'forwards' }
        );
        if(a2){ a2.onfinish = oneFinished; }
      }catch(e){
        try{ nextSlide.style.transform = 'translateY(0%)'; }catch(e2){}
        oneFinished();
      }

      // Safety: if WebView doesn't fire onfinish reliably, finalize anyway
      setTimeout(done, dur + 40);
    });
  }

  function scheduleAutoAdvance(it){
    var arr = loadAds();
    if(!arr || !arr.length) return;
    // images: advance by duration; videos: by end/duration fallback
    if(it.type === 'image'){
      carouselTimer = setTimeout(function(){
        if(dragActive || isAnimating){ carouselTimer = setTimeout(function(){ showAt(curIdx+1, false, 1); }, 250); return; }
        showAt(curIdx+1, false, 1);
      }, (it.duration||5)*1000);
      return;
    }

    var fallbackMs = ((it.duration||5)*1000);
    var moved = false;
    function goNext(){
      if(moved) return;
      moved = true;
      showAt(curIdx+1, false, 1);
    }

    if(currentVideoEl){
      try{ currentVideoEl.onended = null; }catch(e){}
      try{ currentVideoEl.addEventListener('ended', goNext, {once:true}); }catch(e){}
      try{ currentVideoEl.addEventListener('error', function(){ carouselTimer = setTimeout(goNext, 250); }, {once:true}); }catch(e){}
    }
    carouselTimer = setTimeout(goNext, fallbackMs);
  }

  function initHomeAds(){
    var board = document.getElementById("adsBoard");
    if(!board) return;

    var viewport = document.getElementById('adsViewport');
    if(viewport){
      // Drag-to-swipe (TikTok-like): follow finger, threshold 20%
      var drag = {
        active:false,
        startY:0,
        scaleY:1,
        deltaY:0,
        h:0,
        incomingFrom:0,
        nextIdx:null,
        nextSlide:null,
        nextVid:null,
        curSlide:null,
        finishing:false
      };

      function getH(){
        // IMPORTANT:
        // ads-board can be visually scaled (mini mode). getBoundingClientRect().height returns the
        // *scaled* height, but children translateY() values are applied *before* the parent's scale.
        // If we use the scaled height, slides won't move enough and you'll see "half images".
        // Use offsetHeight (unscaled layout height) and separately keep the scale factor.
        try{ return Math.max(1, viewport.offsetHeight||0); }catch(e){ return 1; }
      }

      function getScaleY(){
        try{
          var oh = viewport.offsetHeight||0;
          if(!oh) return 1;
          var rh = viewport.getBoundingClientRect().height||0;
          if(!rh) return 1;
          return rh / oh;
        }catch(e){ return 1; }
      }

      function setTransform(el, y){
        if(!el) return;
        try{ el.style.transform = 'translateY(' + y + 'px)'; }catch(e){}
      }

      function clearTransition(el){
        if(!el) return;
        try{ el.style.transition = ''; }catch(e){}
      }

      function setTransition(el){
        if(!el) return;
        try{ el.style.transition = 'transform 220ms ease'; }catch(e){}
      }

      function cancelSlideAnimations(){
        try{
          var media = document.getElementById('adsMedia');
          if(!media) return;
          var slides = media.querySelectorAll('.ads-slide');
          for(var i=0;i<slides.length;i++){
            var el = slides[i];
            // Cancel WAAPI animations (auto carousel) so drag always has a clean baseline
            try{
              if(el && el.getAnimations){
                var anims = el.getAnimations();
                for(var j=0;j<anims.length;j++){
                  try{ anims[j].cancel(); }catch(_e){}
                }
              }
            }catch(e){}
            // Clear any leftover inline transforms
            try{ el.style.transform = ''; }catch(e){}
            try{ el.style.willChange = ''; }catch(e){}
          }
        }catch(e){}
      }


      function beginDrag(y){
        if(isAnimating || drag.finishing) return;
        dragActive = true;
        cancelSlideAnimations();
        var arr = loadAds();
        if(!arr || arr.length <= 1) return;
        drag.active = true;
        drag.startY = y;
        drag.deltaY = 0;
        drag.h = getH();
        drag.scaleY = getScaleY() || 1;
        if(!isFinite(drag.scaleY) || drag.scaleY <= 0) drag.scaleY = 1;
        drag.incomingFrom = 0;
        drag.nextIdx = null;
        drag.nextSlide = null;
        drag.nextVid = null;
        var _m = document.getElementById('adsMedia');
        if(_m){ cleanupSlides(_m); var _ss=_m.querySelectorAll('.ads-slide'); drag.curSlide = _ss && _ss.length ? _ss[_ss.length-1] : null; }else{ drag.curSlide = null; }
        drag.finishing = false;

        // pause only timer (keep playing)
        stopAutoAdvanceOnly();
        // cancel any old transitions
        clearTransition(drag.curSlide);
        if(drag.curSlide) setTransform(drag.curSlide, 0);
      }

      function ensureNext(direction){
        // direction: incomingFrom = 1 (from bottom, swipe up -> next), -1 (from top, swipe down -> prev)
        if(drag.incomingFrom === direction && drag.nextSlide) return;

        var media = document.getElementById('adsMedia');
        if(!media) return;
        // remove previous prepared slide if direction changed
        if(drag.nextSlide){
          try{ if(drag.nextSlide.parentNode) drag.nextSlide.parentNode.removeChild(drag.nextSlide); }catch(e){}
          drag.nextSlide = null;
          drag.nextVid = null;
        }

        var arr = loadAds();
        if(!arr || !arr.length) return;
        var idx = (direction === 1) ? (curIdx + 1) : (curIdx - 1);
        if(idx < 0) idx = arr.length - 1;
        if(idx >= arr.length) idx = 0;
        drag.nextIdx = idx;
        drag.incomingFrom = direction;

        var pack = buildSlide(arr[idx]);
        drag.nextSlide = pack.slide;
        drag.nextVid = pack.video;
        setTransform(drag.nextSlide, direction * drag.h);
        media.appendChild(drag.nextSlide);
        clearTransition(drag.nextSlide);

        // ensure video starts
        if(drag.nextVid){
          try{
            var pp = drag.nextVid.play();
            if(pp && typeof pp.catch === 'function') pp.catch(function(){});
          }catch(e){}
        }
      }

      function moveDrag(y){
        if(!drag.active || drag.finishing) return;
        drag.deltaY = (y - drag.startY) / (drag.scaleY || 1);
        // decide direction based on sign (only after some movement)
        if(Math.abs(drag.deltaY) > 4){
          var dir = (drag.deltaY < 0) ? 1 : -1;
          ensureNext(dir);
        }
        // clamp
        if(drag.deltaY > drag.h) drag.deltaY = drag.h;
        if(drag.deltaY < -drag.h) drag.deltaY = -drag.h;

        if(drag.curSlide) setTransform(drag.curSlide, drag.deltaY);
        if(drag.nextSlide) setTransform(drag.nextSlide, (drag.incomingFrom * drag.h) + drag.deltaY);
      }

      function finishDrag(){
        if(!drag.active || drag.finishing) return;
        drag.active = false;
        drag.finishing = true;

        var media = document.getElementById('adsMedia');
        var arr = loadAds();
        if(!media || !arr || !arr.length){
          drag.finishing = false;
          dragActive = false;
          return;
        }

        // if no direction chosen (tiny movement) -> snap back
        if(!drag.incomingFrom || !drag.nextSlide){
          if(drag.curSlide) setTransform(drag.curSlide, 0);
          drag.finishing = false;
          dragActive = false;
          scheduleAutoAdvance(arr[curIdx]);
          return;
        }

        var h = drag.h || getH();
        var threshold = 0.20 * h;
        var commit = (Math.abs(drag.deltaY) >= threshold);

        // animate
        setTransition(drag.curSlide);
        setTransition(drag.nextSlide);

        if(commit){
          // move to next/prev
          var targetDelta = -drag.incomingFrom * h;
          setTransform(drag.curSlide, targetDelta);
          setTransform(drag.nextSlide, 0);
        }else{
          // snap back
          setTransform(drag.curSlide, 0);
          setTransform(drag.nextSlide, drag.incomingFrom * h);
        }

        setTimeout(function(){
          try{ clearTransition(drag.curSlide); }catch(e){}
          try{ clearTransition(drag.nextSlide); }catch(e){}

          if(commit){
            // finalize: remove old, keep new
            try{ if(drag.curSlide && drag.curSlide.parentNode) drag.curSlide.parentNode.removeChild(drag.curSlide); }catch(e){}
            try{ drag.nextSlide.style.transform = ''; }catch(e){}
            cleanupSlides(media);
            curIdx = drag.nextIdx;
            currentVideoEl = drag.nextVid;
            renderDots(arr);
            scheduleAutoAdvance(arr[curIdx]);
          }else{
            // revert: remove next
            if(drag.nextVid){
              try{ drag.nextVid.pause(); }catch(e){}
            }
            try{ if(drag.nextSlide && drag.nextSlide.parentNode) drag.nextSlide.parentNode.removeChild(drag.nextSlide); }catch(e){}
            cleanupSlides(media);
            scheduleAutoAdvance(arr[curIdx]);
          }

          drag.nextSlide = null;
          drag.nextVid = null;
          drag.nextIdx = null;
          drag.incomingFrom = 0;
          drag.deltaY = 0;
          drag.finishing = false;
          dragActive = false;
        }, 240);
      }

      // Touch handlers
      viewport.addEventListener('touchstart', function(e){
        if(!e || !e.touches || !e.touches[0]) return;
        beginDrag(e.touches[0].clientY);
      }, {passive:true});

      viewport.addEventListener('touchmove', function(e){
        if(!drag.active || !e || !e.touches || !e.touches[0]) return;
        moveDrag(e.touches[0].clientY);
        try{ e.preventDefault(); }catch(_e){}
      }, {passive:false});

      viewport.addEventListener('touchend', function(){
        finishDrag();
      }, {passive:true});

      // Safety: if touch is cancelled
      viewport.addEventListener('touchcancel', function(){
        finishDrag();
      }, {passive:true});
    }

    // Mini-player toggle (YouTube-like)
var miniBtn = document.getElementById("adsFloatToggle");
var __adsMiniAnimLock = false;
window.__toggleAdsMini = function(ev){
  try{
    if(ev){
      ev.preventDefault && ev.preventDefault();
      ev.stopPropagation && ev.stopPropagation();
    }
  }catch(e){}

  if(__adsMiniAnimLock) return;
  __adsMiniAnimLock = true;

  var board = document.getElementById("adsBoard");
  if(!board){
    __adsMiniAnimLock = false;
    return;
  }

  // Ensure we have a dedicated FLIP wrapper so we can animate independently of the board's CSS transforms.
  var wrap = board.querySelector(".ads-flip-wrap");
  if(!wrap){
    wrap = document.createElement("div");
    wrap.className = "ads-flip-wrap";
    // Move all children into the wrapper.
    while(board.firstChild){
      wrap.appendChild(board.firstChild);
    }
    board.appendChild(wrap);

    // Minimal inline style so it doesn't affect layout but can be transformed.
    wrap.style.width = "100%";
    wrap.style.height = "100%";
    wrap.style.position = "relative";
    wrap.style.transformOrigin = "50% 50%";
    wrap.style.willChange = "transform";
  }

  var prevVis = board.style.visibility;

  var first = null;
  try{ first = board.getBoundingClientRect(); }catch(e){ first = null; }

  // Hide BEFORE toggling to avoid 1-frame flash on Android.
  board.style.visibility = "hidden";
  try{ board.getBoundingClientRect(); }catch(e){}

  // Toggle state (final layout)
  board.classList.toggle("ads-mini");

  var last = null;
  try{ last = board.getBoundingClientRect(); }catch(e){ last = null; }

  if(!first || !last){
    board.style.visibility = prevVis;
    __adsMiniAnimLock = false;
    return;
  }

  var firstCX = first.left + (first.width/2);
  var firstCY = first.top + (first.height/2);
  var lastCX  = last.left + (last.width/2);
  var lastCY  = last.top + (last.height/2);

  var dx = firstCX - lastCX;
  var dy = firstCY - lastCY;
  var sx = (last.width ? (first.width / last.width) : 1);
  var sy = (last.height ? (first.height / last.height) : 1);

  if(!isFinite(dx)) dx = 0;
  if(!isFinite(dy)) dy = 0;
  if(!isFinite(sx) || sx <= 0) sx = 1;
  if(!isFinite(sy) || sy <= 0) sy = 1;

  // Apply inverse transform to the WRAPPER (not the board).
// IMPORTANT: When the board's final state has a parent scale (mini mode = scale(0.56)),
// any translate() applied on the child is also scaled by the parent. We must compensate,
// otherwise you get a visible "dip" (jump down) on shrink.
var compScaleX = 1, compScaleY = 1;
try{
  var bt = getComputedStyle(board).transform;
  if(bt && bt !== "none"){
    var bm = new DOMMatrixReadOnly(bt);
    // scaleX/scaleY from matrix
    compScaleX = Math.sqrt(bm.a*bm.a + bm.b*bm.b) || 1;
    compScaleY = Math.sqrt(bm.c*bm.c + bm.d*bm.d) || 1;
  }
}catch(e){ compScaleX = 1; compScaleY = 1; }

var adjDx = dx / compScaleX;
var adjDy = dy / compScaleY;

wrap.style.transformOrigin = "50% 50%";
wrap.style.transform = "translate(" + adjDx + "px," + adjDy + "px) scale(" + sx + "," + sy + ")";

  // Flush so the first visible frame is already corrected.
  try{ wrap.getBoundingClientRect(); }catch(e){}

  board.style.visibility = prevVis;

  requestAnimationFrame(function(){
    try{
      var anim = wrap.animate(
        [{ transform: wrap.style.transform }, { transform: "none" }],
        { duration: 1000, easing: "cubic-bezier(0.22, 1, 0.36, 1)", fill: "both" }
      );

      function cleanup(){
        try{ anim.cancel(); }catch(e){}
        wrap.style.transform = "";
        wrap.style.willChange = "transform";
        __adsMiniAnimLock = false;
      }

      anim.onfinish = cleanup;
      anim.oncancel = cleanup;
    }catch(e){
      wrap.style.transform = "";
      __adsMiniAnimLock = false;
    }
  });
};

if(miniBtn){
  // handled inline on the button for maximum reliability on mobile
}

// No tap-to-next (swipe/drag only)

    showAt(0, false, 0);

    // refresh when coming back home / visibility change
    document.addEventListener("visibilitychange", function(){
      if(!document.hidden){
        showAt(curIdx, false, 0);
      }else{
        stopCarousel();
      }
    });
  }

  // ---------- Manager Ads UI ----------
  var editingId = null;

  function $(id){ return document.getElementById(id); }

  function openAdsModal(isEdit){
    var m = $("mgrAdsModal");
    if(!m) return;
    m.classList.remove("hidden");
    m.setAttribute("aria-hidden","false");
    $("mgrAdsHint").textContent = "";
    if($("mgrAdsFile")) { $("mgrAdsFile").value = ""; try{ $("mgrAdsFile").style.pointerEvents="auto"; }catch(e){} }
    if(!isEdit){
      editingId = null;
      $("mgrAdsModalTitle").textContent = "מודעה חדשה";
      $("mgrAdsType").value = "image";
      $("mgrAdsUrl").value = "";
      $("mgrAdsDuration").value = "5";
      $("mgrAdsDeleteBtn").style.display = "none";
    }else{
      $("mgrAdsDeleteBtn").style.display = "inline-flex";
    }
  }
  function closeAdsModal(){
    var m = $("mgrAdsModal");
    if(!m) return;
    m.classList.add("hidden");
    m.setAttribute("aria-hidden","true");
    editingId = null;
  }

  function fileToDataUrl(file, cb){
    var reader = new FileReader();
    reader.onload = function(){ cb(null, String(reader.result||"")); };
    reader.onerror = function(){ cb(new Error("read_error")); };
    reader.readAsDataURL(file);
  }

  function mgrAdsRenderList(){
    var list = $("mgrAdsList");
    if(!list) return;
    var arr = loadAds();
    list.innerHTML = "";
    if(!arr.length){
      var p = document.createElement("div");
      p.style.opacity = "0.8";
      p.style.padding = "12px 2px";
      p.textContent = "אין מודעות. לחץ 'הוסף מודעה'.";
      list.appendChild(p);
      // refresh home immediately
      showAt(0,false);
      return;
    }
    arr.forEach(function(it){
      var row = document.createElement("div");
      row.className = "mgr-ads-row";

      var thumb = document.createElement("div");
      thumb.className = "mgr-ads-thumb";
      if(it.type === "image"){
        var img = document.createElement("img");
        img.src = it.src;
        img.alt = "";
        thumb.appendChild(img);
      }else{
        var v = document.createElement("video");
        v.src = it.src;
        v.muted = true;
        v.playsInline = true;
        v.preload = "metadata";
        thumb.appendChild(v);
      }

      var meta = document.createElement("div");
      meta.className = "mgr-ads-meta";
      var t = document.createElement("div");
      t.className = "t";
      t.textContent = (it.type === "image" ? "תמונה" : "וידאו");
      var s = document.createElement("div");
      s.className = "s";
      s.textContent = "משך: " + (it.duration||5) + " שניות";
      meta.appendChild(t); meta.appendChild(s);

      var acts = document.createElement("div");
      acts.className = "mgr-ads-actions-row";
      var bEdit = document.createElement("button");
      bEdit.className = "mgr-ads-mini";
      bEdit.type = "button";
      bEdit.textContent = "ערוך";
      bEdit.addEventListener("click", function(){
        editingId = it.id;
        $("mgrAdsModalTitle").textContent = "עריכת מודעה";
        $("mgrAdsType").value = it.type;
        $("mgrAdsUrl").value = (it.type === "video" && it.src && it.src.indexOf("data:") !== 0) ? it.src : "";
        $("mgrAdsDuration").value = String(it.duration||5);
        openAdsModal(true);
      });

      var bDel = document.createElement("button");
      bDel.className = "mgr-ads-mini danger";
      bDel.type = "button";
      bDel.textContent = "מחק";
      bDel.addEventListener("click", function(){
        var next = loadAds().filter(function(x){ return x.id !== it.id; });
        saveAds(next);
        mgrAdsRenderList();
        showAt(0,false);
      });

      acts.appendChild(bEdit);
      acts.appendChild(bDel);

      row.appendChild(thumb);
      row.appendChild(meta);
      row.appendChild(acts);
      list.appendChild(row);
    });

    // refresh home immediately
    showAt(curIdx,false);
  }

  function mgrAdsSave(){
    var type = ($("mgrAdsType") && $("mgrAdsType").value) || "image";
    var url = ($("mgrAdsUrl") && $("mgrAdsUrl").value || "").trim();
    var dur = parseInt(($("mgrAdsDuration") && $("mgrAdsDuration").value) || "5", 10);
    if(!dur || dur < 2) dur = 5;
    if(dur > 30) dur = 30;

    var fileEl = $("mgrAdsFile");
    var file = (fileEl && fileEl.files && fileEl.files[0]) ? fileEl.files[0] : null;
    var hint = $("mgrAdsHint");
    if(hint) hint.textContent = "";

    function finalizeWithSrc(src){
      if(!src){
        if(hint) hint.textContent = "חסר קובץ/קישור.";
        return;
      }
      var arr = loadAds();
      if(editingId){
        arr = arr.map(function(it){
          if(it.id !== editingId) return it;
          return { id: it.id, type: type, src: src, duration: dur };
        });
      }else{
        arr.push({ id: ("ad_" + Date.now()), type: type, src: src, duration: dur });
      }
      var seen = {};
      arr = arr.filter(function(it){
        var k = String(it.id||"") + "|" + String(it.src||"");
        if(seen[k]) return false;
        seen[k] = 1;
        return true;
      });
      saveAds(arr);
      closeAdsModal();
      mgrAdsRenderList();
      showAt(0,false);
    }

    if(type === "video" && url && !file){
      finalizeWithSrc(url);
      return;
    }
    if(!file){
      finalizeWithSrc(null);
      return;
    }

    var maxBytes = (type === "video") ? (40*1024*1024) : (20*1024*1024);
    if(file.size > maxBytes){
      if(hint) hint.textContent = "הקובץ גדול מדי. נסה קובץ קטן יותר.";
      return;
    }

    if(!(window.FBBridge && typeof window.FBBridge.uploadAdMedia === "function")){
      if(hint) hint.textContent = "העלאה לענן לא זמינה.";
      return;
    }

    try{
      if(hint) hint.textContent = "מעלה קובץ... 0%";
      var __adId = editingId ? editingId : ("ad_" + Date.now());
      window.FBBridge.uploadAdMedia(file, __adId, type, function(p){
        try{
          if(!hint || !p || !p.totalBytes) return;
          var pct = Math.max(0, Math.min(100, Math.round((p.bytesTransferred||0) * 100 / p.totalBytes)));
          hint.textContent = "מעלה קובץ... " + pct + "%";
        }catch(e){}
      }).then(function(downloadUrl){
        if(hint) hint.textContent = "";
        finalizeWithSrc(downloadUrl || null);
      }).catch(function(e){
        try{ console.error(e); }catch(_e){}
        if(hint) hint.textContent = "שגיאה בהעלאה לענן.";
      });
    }catch(e){
      if(hint) hint.textContent = "שגיאה בהעלאה לענן.";
    }
  }

  function mgrAdsDeleteFromModal(){
    if(!editingId) return;
    var arr = loadAds().filter(function(it){ return it.id !== editingId; });
    saveAds(arr);
    closeAdsModal();
    mgrAdsRenderList();
    showAt(0,false);
  }

  function bindManagerAdsUI(){
    // safe if elements missing
    var addBtn = $("mgrAdsAddBtn");
    var closeBtn = $("mgrAdsCloseBtn");
    var backdrop = $("mgrAdsBackdrop");
    var saveBtn = $("mgrAdsSaveBtn");
    var delBtn = $("mgrAdsDeleteBtn");

    function bindTap(btn, fn){
      if(!btn || !fn || btn.__adsTapBound) return;
      btn.__adsTapBound = true;
      var lockTs = 0, touchFiredTs = 0;
      function fire(ev, fromTouch){
        try{ if(ev){ ev.preventDefault(); ev.stopPropagation(); } }catch(e){}
        var now = Date.now();
        if(fromTouch) touchFiredTs = now;
        if(!fromTouch && (now - touchFiredTs) < 600) return;
        if(now - lockTs < 300) return;
        lockTs = now;
        fn();
      }
      btn.addEventListener("touchend", function(ev){ fire(ev, true); }, {passive:false});
      btn.addEventListener("click", function(ev){ fire(ev, false); });
    }

    var fileBtn = $("mgrAdsFile");
    if(fileBtn && !fileBtn.__adsFileFixBound){
      fileBtn.__adsFileFixBound = true;
      fileBtn.addEventListener("change", function(){
        try{ if(document.activeElement) document.activeElement.blur(); }catch(e){}
        try{
          if(fileBtn.files && fileBtn.files[0]){
            if($("mgrAdsHint")) $("mgrAdsHint").textContent = "קובץ נבחר: " + (fileBtn.files[0].name || "");
            // Android native file input can keep an invisible hitbox above the save button after picker closes
            fileBtn.style.pointerEvents = "none";
          }
        }catch(e){}
      });
    }

    bindTap(addBtn, function(){ openAdsModal(false); });
    bindTap(closeBtn, closeAdsModal);
    if(backdrop) backdrop.addEventListener("click", closeAdsModal);
    bindTap(saveBtn, mgrAdsSave);
    if(saveBtn){
      saveBtn.type = "button";
      saveBtn.onclick = function(ev){
        try{ ev.preventDefault(); ev.stopPropagation(); }catch(e){}
        mgrAdsSave();
      };
    }
    bindTap(delBtn, mgrAdsDeleteFromModal);
  }

  // expose for existing manager overlay code
  try{
    window.mgrAdsRenderList = mgrAdsRenderList;
  }catch(e){}

  // init once DOM ready
  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", function(){
      initHomeAds();
      bindManagerAdsUI();
    });
  }else{
    initHomeAds();
    bindManagerAdsUI();
  }
})();


/* Ads toggle button idle opacity (80% default, 40% after 3.5s no interaction) */
(function(){
  function setupAdsToggleIdleOpacity(){
    try{
      var board = document.getElementById("adsBoard");
      var btn = document.getElementById("adsFloatToggle");
      var closeBtn = document.getElementById("adsCloseBtn");
      if(!board || (!btn && !closeBtn)) return;

      var idleMs = 3500;
      var t = null;

      function markActive(){
        try{ board.classList.remove("ads-toggle-idle"); }catch(e){}
        if(t) clearTimeout(t);
        t = setTimeout(function(){
          try{ board.classList.add("ads-toggle-idle"); }catch(e){}
        }, idleMs);
      }

      // Start timer immediately
      markActive();

      // Any user interaction resets the timer
      var opts = { passive:true, capture:true };
      ["pointerdown","touchstart","mousedown","keydown","wheel","scroll"].forEach(function(evName){
        try{ window.addEventListener(evName, markActive, opts); }catch(e){}
      });

      document.addEventListener("visibilitychange", function(){
        if(!document.hidden) markActive();
      });
    }catch(e){}
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", setupAdsToggleIdleOpacity);
  }else{
    setTimeout(setupAdsToggleIdleOpacity, 0);
  }

  // Firebase shared ads board sync (all devices)
  function __fbRefreshAdsFromCloud(){
    try{
      if(window.FBBridge && typeof window.FBBridge.syncSharedAdsNow === "function"){
        window.FBBridge.syncSharedAdsNow(function(changed){
          if(!changed) return;
          try{ mgrAdsRenderList(); }catch(e){}
          try{ showAt(0, false); }catch(e){}
        });
      }
      if(window.FBBridge && typeof window.FBBridge.watchSharedAds === "function"){
        window.FBBridge.watchSharedAds();
      }
    }catch(e){}
  }
  try{
    window.addEventListener("fb-shared-ads-updated", function(){
      try{ mgrAdsRenderList(); }catch(e){}
      try{ showAt(0, false); }catch(e){}
    });
  }catch(e){}
  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", function(){ setTimeout(__fbRefreshAdsFromCloud, 120); });
  }else{
    setTimeout(__fbRefreshAdsFromCloud, 120);
  }
})(); 
/* ===== Manager mode: menu-based navigation (no manager home page) ===== */
(function(){
  function safeGet(k){
    try{ return localStorage.getItem(k); }catch(e){ return null; }
  }
  function safeSet(k,v){
    try{ localStorage.setItem(k,v); }catch(e){}
  }
  function safeDel(k){
    try{ localStorage.removeItem(k); }catch(e){}
  }

  // IMPORTANT: Manager menu must replace ONLY the LEFT profile menu (studentMenuLeft).
  // Do NOT touch the RIGHT side menu (sideMenu/menuMainSection).
  window.updateMenuRoleSections = function(){
    try{
      var stu = document.getElementById('menuStudentSection');
      var mgr = document.getElementById('menuManagerSection');
      var sec = document.getElementById('menuSecretarySection');
      var title = document.getElementById('studentMenuTitle');

      var isMgr = false;
      try{
        isMgr = document.body.classList.contains('manager-mode') ||
                (window.APP_STATE && window.APP_STATE.get && window.APP_STATE.get('userRole') === 'manager');
      }catch(e){ isMgr = document.body.classList.contains('manager-mode'); }

      var isSec = false;
      try{
        isSec = document.body.classList.contains('secretary-mode') ||
                (window.APP_STATE && window.APP_STATE.get && window.APP_STATE.get('userRole') === 'secretary');
      }catch(e){ isSec = document.body.classList.contains('secretary-mode'); }


      if(isSec){
        if(stu){ stu.style.display = 'none'; stu.setAttribute('aria-hidden','true'); }
        if(mgr){ mgr.style.display = 'none'; mgr.setAttribute('aria-hidden','true'); }
        if(sec){ sec.style.display = 'block'; sec.setAttribute('aria-hidden','false'); }
        // Secretary search bar under logo (home)
        try{
          var sw = document.getElementById('secSearchWrap');
          if(sw){ sw.style.display = 'block'; sw.setAttribute('aria-hidden','false'); }
          if(typeof window.secretarySearchBind === 'function') window.secretarySearchBind();
        }catch(e){}
        if(title) title.textContent = 'ברוך הבא: מזכירה';
      }else if(isMgr){
        if(sec){ sec.style.display = 'none'; sec.setAttribute('aria-hidden','true'); }
        if(stu){ stu.style.display = 'none'; stu.setAttribute('aria-hidden','true'); }
        if(mgr){ mgr.style.display = 'block'; mgr.setAttribute('aria-hidden','false'); }
        if(title) title.textContent = 'ברוך הבא: מנהל';
      }else{
        if(sec){ sec.style.display = 'none'; sec.setAttribute('aria-hidden','true'); }
        if(mgr){ mgr.style.display = 'none'; mgr.setAttribute('aria-hidden','true'); }
        if(stu){ stu.style.display = ''; stu.setAttribute('aria-hidden','false'); }
        // Restore title to current student/guest if possible
        try{
          if(title && typeof timerGetStudentUsername === 'function'){
            var u = (timerGetStudentUsername()||'').trim();
            if(!u) u = (DBStorage.getItem('student_username')||'').trim();
            if(!u) u = 'אורח';
            title.textContent = 'ברוך הבא: ' + u;
          }
        }catch(e){}
      }

      // Toggle secretary search bar visibility
      try{
        var sw2 = document.getElementById('secSearchWrap');
        if(sw2){
          if(isSec){ sw2.style.display = 'block'; sw2.setAttribute('aria-hidden','false'); }
          else { sw2.style.display = 'none'; sw2.setAttribute('aria-hidden','true'); }
        }
      }catch(e2){}
    }catch(e){}
  };


  
  // App viewport lock (prevents background/buttons from jumping when keyboard opens)
  // Updates ONLY when viewport grows (keyboard closed / rotation / address-bar changes)
  window.__setAppLockHeight = function(resetBase){
    try{
      var vh = 0;
      try{
        if(window.visualViewport && typeof window.visualViewport.height === 'number') vh = Math.round(window.visualViewport.height);
      }catch(e){}
      if(!vh) vh = Math.round(window.innerHeight || 0);

      if(resetBase || !window.__appLockBaseH){
        window.__appLockBaseH = vh;
      }
      if(vh > (window.__appLockBaseH || 0) - 40){
        window.__appLockBaseH = vh;
      }
      if(window.__appLockBaseH && window.__appLockBaseH > 100){
        try{ document.documentElement.style.setProperty('--app-lock-h', window.__appLockBaseH + 'px'); }catch(e2){}
      }
    }catch(e){}
  };

  // init + listeners (safe for all roles)
  try{
    var _lockInit = function(){ try{ window.__setAppLockHeight(true); }catch(e){} };
    if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', _lockInit);
    else setTimeout(_lockInit, 0);

    // Update only when viewport grows
    if(window.visualViewport){
      window.visualViewport.addEventListener('resize', function(){ try{ window.__setAppLockHeight(false); }catch(e){} });
    }
    window.addEventListener('orientationchange', function(){ setTimeout(function(){ try{ window.__setAppLockHeight(true); }catch(e){} }, 250); });
    window.addEventListener('resize', function(){ try{ window.__setAppLockHeight(false); }catch(e){} });
  }catch(e){}
window.enableSecretaryMode = function(persist){
    try{ document.body.classList.add('secretary-mode'); }catch(e){}
    try{ window.__setAppLockHeight(true); }catch(e){}
    if(persist !== false) safeSet('secMode','1');
    try{
      if(window.APP_STATE && window.APP_STATE.set) window.APP_STATE.set({ userRole: 'secretary' });
    }catch(e){}
    try{ if(typeof window.updateMenuRoleSections === 'function') window.updateMenuRoleSections(); }catch(e){}
    try{ if(typeof syncAppStateFromDOM === 'function') syncAppStateFromDOM(); }catch(e){}
    try{ if(typeof updateEdgeHandles === 'function') updateEdgeHandles(); }catch(e){}
    try{ if(typeof updateEdgeHandlePositions === 'function') updateEdgeHandlePositions(); }catch(e){}
    try{ window.__secEnsureTopBackBtn && window.__secEnsureTopBackBtn(); }catch(e){}
  };

  window.disableSecretaryMode = function(){
    try{ document.body.classList.remove('secretary-mode'); }catch(e){}
    try{ window.__setAppLockHeight(true); }catch(e){}
    safeDel('secMode');
    try{
      // revert role to student/guest; other flows will overwrite as needed
      if(window.APP_STATE && window.APP_STATE.set) window.APP_STATE.set({ userRole: 'guest' });
    }catch(e){}
    try{ if(typeof window.updateMenuRoleSections === 'function') window.updateMenuRoleSections(); }catch(e){}
    try{ if(typeof syncAppStateFromDOM === 'function') syncAppStateFromDOM(); }catch(e){}
    try{ if(typeof updateEdgeHandles === 'function') updateEdgeHandles(); }catch(e){}
    try{ if(typeof updateEdgeHandlePositions === 'function') updateEdgeHandlePositions(); }catch(e){}
    try{ window.__secEnsureTopBackBtn && window.__secEnsureTopBackBtn(); }catch(e){}
  };

  window.secretaryLogout = function(){
    try{ window.disableSecretaryMode(); }catch(e){}
    try{ if(typeof window.appLogout === 'function') window.appLogout(); }catch(e){}
  };

  // Secretary: open Admin Lessons Management (reuse same admin window, no duplication)
  window.openSecretaryLessonsManagement = function(){
    try{
      if(!_secIsOn()) return;
      try{ if(typeof window.closeMenu === 'function') window.closeMenu(); }catch(e){}
      try{ if(typeof window.openAdminPanel === 'function') window.openAdminPanel(); }catch(e){}
      try{ if(typeof window.setAdminTab === 'function') window.setAdminTab('lessons'); }catch(e){}
      try{
        var asw = document.getElementById('adminSubbarWrap');
        if(asw){ asw.classList.remove('open'); asw.setAttribute('aria-hidden','true'); }
      }catch(e){}
    }catch(e){}
  };

  // Secretary: open Test Orders view (existing admin tests viewer)
  window.openSecretaryTestOrders = function(){
    try{
      if(!_secIsOn()) return;
      try{ if(typeof window.closeMenu === 'function') window.closeMenu(); }catch(e){}
      try{ if(typeof window.closeProfileMenu === 'function') window.closeProfileMenu(); }catch(e){}

      function escHtml(v){
        try{ return String(v==null?'':v).replace(/[&<>\"']/g, function(c){ return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]); }); }catch(e){ return ''; }
      }
      function pad2(n){ n = Number(n)||0; return String(n).padStart(2,'0'); }
      function parseTestDateTime(rawDate, rawTime){
        try{
          var d = String(rawDate||'').trim();
          if(!d) return null;
          d = d.replace(/\./g,'/').replace(/-/g,'/');
          var m = d.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
          var y,mo,da;
          if(m){ da=+m[1]; mo=+m[2]; y=+m[3]; }
          else {
            m = d.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
            if(!m) return null;
            y=+m[1]; mo=+m[2]; da=+m[3];
          }
          var hh=9, mm=0;
          var t = String(rawTime||'').trim();
          var mt = t.match(/(\d{1,2})\s*[:.]\s*(\d{2})/);
          if(mt){ hh=Math.min(23, +mt[1]||0); mm=Math.min(59, +mt[2]||0); }
          var dt = new Date(y, mo-1, da, hh, mm, 0, 0);
          if(isNaN(dt.getTime())) return null;
          return dt;
        }catch(e){ return null; }
      }
      function _readAny(o, keys){
        try{
          if(!o || typeof o!=='object') return null;
          for(var i=0;i<keys.length;i++){
            var k=keys[i];
            if(Object.prototype.hasOwnProperty.call(o,k) && o[k] != null && String(o[k]).trim()!=='') return o[k];
          }
        }catch(e){}
        return null;
      }
      function collectFutureTests(){
        var out = [];
        try{
          var arr = (typeof _secGetAllStudents === 'function') ? (_secGetAllStudents()||[]) : [];
          if(!Array.isArray(arr)) arr = [];
          for(var i=0;i<arr.length;i++){
            var st = arr[i] || {};
            var testDate = _readAny(st, ['testDate','nextTestDate','תאריך טסט','תאריך_טסט','test_date']);
            var testTime = _readAny(st, ['testTime','testHour','שעת טסט','שעה_טסט','test_time']);
            var dt = parseTestDateTime(testDate, testTime);
            if(!dt) continue;
            var name = '';
            try{ name = (typeof _secStudentName==='function') ? _secStudentName(st) : ''; }catch(e){}
            var tz = '';
            try{ tz = (typeof _secGetStudentTz==='function') ? _secGetStudentTz(st) : ''; }catch(e){}
            out.push({
              name: name || String(_readAny(st,['name','fullName'])||'ללא שם'),
              tz: tz || String(_readAny(st,['tz','id','username'])||''),
              dt: dt,
              time: pad2(dt.getHours()) + ':' + pad2(dt.getMinutes())
            });
          }
        }catch(e){}
        out.sort(function(a,b){ return a.dt - b.dt; });
        return out;
      }
      function groupByDateRows(rows){
        var g = Object.create(null);
        for(var i=0;i<rows.length;i++){
          var r = rows[i];
          var dk = r.dt.getFullYear() + '-' + pad2(r.dt.getMonth()+1) + '-' + pad2(r.dt.getDate());
          (g[dk]||(g[dk]=[])).push(r);
        }
        Object.keys(g).forEach(function(k){ g[k].sort(function(a,b){ return a.dt - b.dt; }); });
        return g;
      }

      let ov = document.getElementById('secTestOrdersOverlay');
      if(!ov){
        ov = document.createElement('div');
        ov.id = 'secTestOrdersOverlay';
        ov.className = 'overlay';
        ov.style.zIndex = '99999';
        ov.innerHTML = [
          '<div class="pay-modal" id="secTestsRootModal" style="width:min(980px,96vw);max-width:96vw;max-height:90vh;overflow:auto;position:relative;">',
            '<button type="button" class="pay-close-x" id="secTestOrdersCloseX" aria-label="סגור">×</button>',
            '<div id="secTestOrdersHost" dir="rtl"></div>',
          '</div>'
        ].join('');
        document.body.appendChild(ov);
        const closeBtn = document.getElementById('secTestOrdersCloseX');
        if(closeBtn) closeBtn.onclick = function(){ try{ closeOverlay('secTestOrdersOverlay'); }catch(e){} };
        try{ applySecPaymentTheme(); }catch(e){}

        ov.addEventListener('click', function(ev){
          try{
            var modal = document.getElementById('secTestsRootModal');
            if(modal && ev && ev.target && !modal.contains(ev.target)){
              closeOverlay('secTestOrdersOverlay');
            }
          }catch(e){}
        });
      }

      const host = document.getElementById('secTestOrdersHost');
      if(host){
        host.innerHTML = [
          '<div style="padding:6px 2px 0;">',
            '<div style="display:flex;gap:10px;margin:0 0 14px;">',
              '<button id="secTestsCurrentBtn" type="button" style="flex:1;min-height:44px;border-radius:14px;border:1px solid rgba(80,255,160,.28);background:rgba(25,110,65,.28);color:#fff;font-weight:800;">הזמנות טסטים</button>',
              '<button id="secTestsFutureBtn" type="button" style="flex:1;min-height:44px;border-radius:14px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.03);color:#fff;font-weight:800;">טסטים עתידיים</button>',
            '</div>',
            '<div id="secTestsCurrentPanel"></div>',
            '<div id="secTestsFuturePanel" style="display:none;"></div>',
          '</div>'
        ].join('');
      }

      function secSetTestsTab(which){
        const current = which !== 'future';
        const b1 = document.getElementById('secTestsCurrentBtn');
        const b2 = document.getElementById('secTestsFutureBtn');
        const p1 = document.getElementById('secTestsCurrentPanel');
        const p2 = document.getElementById('secTestsFuturePanel');
        if(b1){ b1.style.background = current ? 'rgba(25,110,65,.28)' : 'rgba(255,255,255,.03)'; b1.style.borderColor = current ? 'rgba(80,255,160,.28)' : 'rgba(255,255,255,.14)'; }
        if(b2){ b2.style.background = current ? 'rgba(255,255,255,.03)' : 'rgba(25,110,65,.28)'; b2.style.borderColor = current ? 'rgba(255,255,255,.14)' : 'rgba(80,255,160,.28)'; }
        if(p1) p1.style.display = current ? 'block' : 'none';
        if(p2) p2.style.display = current ? 'none' : 'block';
      }

      function secRenderOrdersList(){
        const panel = document.getElementById('secTestsCurrentPanel');
        if(!panel) return;
        let grouped = {};
        try{ grouped = (typeof loadTestOrders === 'function' ? (loadTestOrders() || {}) : {}); }catch(e){ grouped = {}; }
        const dateKeys = Object.keys(grouped || {}).sort((a,b)=> String(b).localeCompare(String(a)));
        if(!dateKeys.length){
          panel.innerHTML = '<div style="color:#d9d9d9;font-size:15px;margin:4px 2px 10px;">כל הזמנה מוצלחת נשמרת כאן לפי תאריך.</div>' +
                            '<div style="color:#fff;font-size:18px;margin:10px 2px;">אין הזמנות להצגה</div>';
          return;
        }
        let html = '<div style="color:#d9d9d9;font-size:15px;margin:4px 2px 10px;">כל הזמנה מוצלחת נשמרת כאן לפי תאריך.</div>';
        for(const dk of dateKeys){
          const rows = Array.isArray(grouped[dk]) ? grouped[dk].slice() : [];
          rows.sort((a,b)=> Number((b&&b.ts)||0) - Number((a&&a.ts)||0));
          const title = (typeof _dateTitle === 'function') ? _dateTitle(dk) : dk;
          html += '<div style="margin:12px 0 10px;">';
          html += '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 10px;border-radius:12px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);">';
          html += '<div style="font-weight:900;color:#fff;font-size:16px;">'+ title +'</div>';
          html += '<div style="color:#b9c7bf;font-size:12px;">'+ rows.length +' הזמנות</div>';
          html += '</div>';
          html += '<div style="margin-top:8px;display:flex;flex-direction:column;gap:8px;">';
          for(const r of rows){
            const name = (r && r.name != null) ? String(r.name) : '';
            const tz = (r && r.tz != null) ? String(r.tz) : '';
            const price = Number((r && r.price) || 0);
            const ts = Number((r && r.ts) || 0);
            const hhmm = ts ? ((typeof _hm === 'function') ? _hm(ts) : new Date(ts).toLocaleTimeString('he-IL',{hour:'2-digit',minute:'2-digit'})) : '—';
            html += '<div style="padding:10px;border-radius:12px;background:rgba(0,0,0,.18);border:1px solid rgba(255,255,255,.07);">';
            html += '<div style="display:flex;justify-content:space-between;gap:8px;align-items:center;">';
            html += '<div style="font-weight:800;color:#fff;">'+ (name || 'ללא שם') +'</div>';
            html += '<div style="color:#cfd6d2;font-size:12px;">'+ hhmm +'</div>';
            html += '</div>';
            html += '<div style="margin-top:6px;display:flex;flex-wrap:wrap;gap:8px 10px;color:#d6e0db;font-size:13px;">';
            html += '<span>תז: '+ (tz || '—') +'</span>';
            html += '<span>סכום: ₪'+ (Number.isFinite(price) ? String(Math.round(price)) : '0') +'</span>';
            html += '</div></div>';
          }
          html += '</div></div>';
        }
        panel.innerHTML = html;
      }

      function secOpenFutureDayModal(dateKey, rows){
        var old = document.getElementById('secFutureDayModal');
        if(old) old.remove();
        var title = (typeof _dateTitle === 'function') ? _dateTitle(dateKey) : dateKey;
        var html = '<div id="secFutureDayModal" style="position:fixed;inset:0;z-index:2450;background:rgba(0,0,0,.35);display:grid;place-items:center;padding:14px;" dir="rtl">';
        html += '<div id="secFutureDayModalBox" style="width:min(760px,95vw);max-height:82vh;overflow:auto;background:#08110f;border:1px solid rgba(255,255,255,.12);border-radius:18px;box-shadow:0 12px 40px rgba(0,0,0,.35);padding:12px;position:relative;color:#fff;">';
        html += '<button type="button" id="secFutureDayCloseX" class="pay-close-x" aria-label="סגור">×</button>';
        html += '<div style="font-weight:900;font-size:18px;margin:2px 0 12px;">טסטים ליום ' + escHtml(title) + '</div>';
        if(!rows || !rows.length){
          html += '<div style="color:#d9d9d9;">אין טסטים ליום זה</div>';
        }else{
          html += '<div style="border:1px solid rgba(255,255,255,.1);border-radius:12px;overflow:hidden;">';
          html += '<table style="width:100%;border-collapse:collapse;font-size:14px;">';
          html += '<thead><tr style="background:rgba(255,255,255,.05);"><th style="padding:10px;border-bottom:1px solid rgba(255,255,255,.08);text-align:right;">שעה</th><th style="padding:10px;border-bottom:1px solid rgba(255,255,255,.08);text-align:right;">תלמיד</th><th style="padding:10px;border-bottom:1px solid rgba(255,255,255,.08);text-align:right;">תז</th></tr></thead><tbody>';
          for(var i=0;i<rows.length;i++){
            var r = rows[i]||{};
            html += '<tr>';
            html += '<td style="padding:9px 10px;border-bottom:1px solid rgba(255,255,255,.06);white-space:nowrap;">'+escHtml(r.time||'—')+'</td>';
            html += '<td style="padding:9px 10px;border-bottom:1px solid rgba(255,255,255,.06);">'+escHtml(r.name||'ללא שם')+'</td>';
            html += '<td style="padding:9px 10px;border-bottom:1px solid rgba(255,255,255,.06);">'+escHtml(r.tz||'—')+'</td>';
            html += '</tr>';
          }
          html += '</tbody></table></div>';
        }
        html += '</div></div>';
        document.body.insertAdjacentHTML('beforeend', html);
        var m = document.getElementById('secFutureDayModal');
        var box = document.getElementById('secFutureDayModalBox');
        var cx = document.getElementById('secFutureDayCloseX');
        if(cx) cx.onclick = function(){ try{ m && m.remove(); }catch(e){} };
        if(m){ m.addEventListener('click', function(ev){ try{ if(box && ev && ev.target && !box.contains(ev.target)) m.remove(); }catch(e){} }); }
      }

      function secRenderFutureCalendar(){
        var panel = document.getElementById('secTestsFuturePanel');
        if(!panel) return;
        var tests = collectFutureTests();
        var grouped = groupByDateRows(tests);
        var now = new Date();
        var year = now.getFullYear();
        var monthNames = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];
        var wd = ['א׳','ב׳','ג׳','ד׳','ה׳','ו׳','ש׳'];
        var html = '<div style="color:#d9d9d9;font-size:15px;margin:4px 2px 10px;">לוח שנה שנתי. לחיצה על יום פותחת טבלת טסטים של אותו היום.</div>';
        html += '<div style="color:#fff;font-weight:900;font-size:18px;margin:0 2px 10px;">טסטים עתידיים - '+ year +'</div>';
        html += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:10px;">';
        for(var mon=0; mon<12; mon++){
          var first = new Date(year, mon, 1);
          var daysInMonth = new Date(year, mon+1, 0).getDate();
          var firstDow = first.getDay();
          html += '<div style="border:1px solid rgba(255,255,255,.1);border-radius:14px;background:rgba(255,255,255,.03);padding:8px;">';
          html += '<div style="font-weight:800;color:#fff;margin:2px 0 8px;text-align:center;">'+monthNames[mon]+'</div>';
          html += '<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;">';
          for(var w=0; w<7; w++) html += '<div style="text-align:center;font-size:12px;color:#b8c7bf;padding:4px 0;">'+wd[w]+'</div>';
          for(var e=0; e<firstDow; e++) html += '<div></div>';
          for(var day=1; day<=daysInMonth; day++){
            var dk = year + '-' + pad2(mon+1) + '-' + pad2(day);
            var rows = grouped[dk] || [];
            var has = rows.length > 0;
            html += '<button type="button" class="sec-future-day" data-date="'+dk+'" style="min-height:42px;border-radius:10px;border:1px solid '+(has?'rgba(80,255,160,.35)':'rgba(255,255,255,.08)')+';background:'+(has?'rgba(25,110,65,.28)':'rgba(0,0,0,.12)')+';color:#fff;position:relative;font-weight:700;">'+day;
            if(has) html += '<span style="position:absolute;left:4px;top:3px;font-size:10px;color:#b9ffd7;">'+rows.length+'</span>';
            html += '</button>';
          }
          html += '</div></div>';
        }
        html += '</div>';
        panel.innerHTML = html;

        panel.querySelectorAll('.sec-future-day').forEach(function(btn){
          btn.addEventListener('click', function(){
            try{
              var dk = btn.getAttribute('data-date') || '';
              secOpenFutureDayModal(dk, grouped[dk] || []);
            }catch(e){}
          });
        });
      }

      const cBtn = document.getElementById('secTestsCurrentBtn');
      const fBtn = document.getElementById('secTestsFutureBtn');
      if(cBtn) cBtn.onclick = function(){ secSetTestsTab('current'); secRenderOrdersList(); };
      if(fBtn) fBtn.onclick = function(){ secSetTestsTab('future'); secRenderFutureCalendar(); };
      secSetTestsTab('current');
      secRenderOrdersList();
      secRenderFutureCalendar();

      try{ openOverlay('secTestOrdersOverlay'); }catch(e){ if(ov){ ov.classList.add('show'); ov.style.display='grid'; } }
      try{ window.__secEnsureTopBackBtn && window.__secEnsureTopBackBtn(); }catch(e){}
    }catch(err){
      console.warn('openSecretaryTestOrders failed', err);
    }
  };

  // Secretary top-right back button (profile/home)
    // Secretary top-right app home button (reuse same visual icon style)
  window.__secEnsureTopBackBtn = function(){
    try{
      var btn = document.getElementById('secTopHomeBtn');
      if(!btn){
        btn = document.createElement('button');
        btn.id = 'secTopHomeBtn';
        btn.type = 'button';
        btn.setAttribute('aria-label','חזרה');
        btn.className = 'top-home-btn tap';
        btn.setAttribute('data-tap','');
        btn.style.cssText = 'position:fixed;top:10px;right:10px;left:auto;z-index:2600;display:none;';
        btn.innerHTML = '<img alt="חזרה" src="home_icon.png">';
        btn.onclick = function(){
          try{ var dm = document.getElementById('secFutureDayModal'); if(dm){ dm.remove(); return; } }catch(e){}
          try{ var sdet = document.getElementById('secShopDetailModal'); if(sdet){ sdet.remove(); return; } }catch(e){}
          try{ if(typeof closeOverlay === 'function') closeOverlay('secPaymentOverlay'); }catch(e){}
          try{ if(typeof closeOverlay === 'function') closeOverlay('secShopOverlay'); }catch(e){}
          try{ if(typeof closeOverlay === 'function') closeOverlay('secTestOrdersOverlay'); }catch(e){}
        };
        document.body.appendChild(btn);
      }
      var show = false;
      try{ show = _secIsOn(); }catch(e){}
      if(btn) btn.style.display = show ? 'inline-flex' : 'none';
    }catch(e){}
  };
  // Secretary Mail UI
  function _secIsOn(){
    try{ return document.body.classList.contains('secretary-mode') || (window.APP_STATE && window.APP_STATE.get && window.APP_STATE.get('userRole') === 'secretary'); }catch(e){ return document.body.classList.contains('secretary-mode'); }
  }
  window.openSecretaryMail = function(){
    if(!_secIsOn()) return;
    try{ if(typeof window.closeMenu === 'function') window.closeMenu(); }catch(e){}
    try{ if(typeof window.closeProfileMenu === 'function') window.closeProfileMenu(); }catch(e){}
    
    try{ _secEnsureComposeInit(); }catch(e){}
    try{ if(typeof window.openOverlay === 'function') window.openOverlay('secMailOverlay'); }catch(e){}
  };
  window.openSecretaryInbox = function(){
    if(!_secIsOn()) return;
    try{ if(typeof window.closeMenu === 'function') window.closeMenu(); }catch(e){}
    try{ if(typeof window.closeProfileMenu === 'function') window.closeProfileMenu(); }catch(e){}
    
    try{ _secEnsureComposeInit(); }catch(e){}
    try{ window.closeOverlay && window.closeOverlay('secMailOverlay'); }catch(e){}
    try{ renderSecretaryInbox(); }catch(e){}
    try{ if(typeof window.openOverlay === 'function') window.openOverlay('secInboxOverlay'); }catch(e){}
  };
  window.openSecretaryCompose = function(){
    if(!_secIsOn()) return;
    try{ if(typeof window.closeMenu === 'function') window.closeMenu(); }catch(e){}
    try{ if(typeof window.closeProfileMenu === 'function') window.closeProfileMenu(); }catch(e){}
    
    try{ _secEnsureComposeInit(); }catch(e){}
    try{ window.closeOverlay && window.closeOverlay('secMailOverlay'); }catch(e){}
    try{
      var tz=document.getElementById('secComposeTz');
      var msg=document.getElementById('secComposeMsg');
      var sug=document.getElementById('secComposeSuggest');
      var rec=document.getElementById('secComposeRecipients');
      window.__secComposeRecipients = [];
      if(tz) tz.value='';
      if(msg) msg.value='';
      if(sug){ sug.innerHTML=''; sug.setAttribute('aria-hidden','true'); sug.style.display='none'; }
      if(rec) rec.innerHTML='';
      if(tz) setTimeout(function(){ try{ tz.focus(); }catch(e){} }, 50);
    }catch(e){}
    try{ if(typeof window.openOverlay === 'function') window.openOverlay('secComposeOverlay'); }catch(e){}
  };

  function _secReadLeaveMsgs(){
    try{ return JSON.parse(localStorage.getItem('leaveMessages')||'[]')||[]; }catch(e){ return []; }
  }
  function _secFmtISO(iso){
    try{
      var d = new Date(iso || Date.now());
      var dd = d.toLocaleDateString('he-IL');
      var tt = d.toLocaleTimeString('he-IL', {hour:'2-digit', minute:'2-digit'});
      return dd + ' ' + tt;
    }catch(e){
      return '';
    }
  }

  function _secStudentName(st){
    try{
      if(!st || typeof st !== 'object') return '';
      var nm = String(st.fullName||st.displayName||st.name||'').trim();
      if(nm) return nm;
      var fn = String(st.firstName||st.fname||st.first_name||st['שם פרטי']||'').trim();
      var ln = String(st.lastName||st.lname||st.last_name||st['שם משפחה']||'').trim();
      return (fn + ' ' + ln).trim();
    }catch(e){ return ''; }
  }

  function _secJsStr(s){
    s = String(s==null?'':s);
    return s.replace(/\\/g,'\\\\').replace(/'/g, "\\'").replace(/\n/g,'\\n').replace(/\r/g,'');
  }

function _secGetAllStudents(){
    try{
      if(typeof resolveStudentsDb === 'function'){
        var db = resolveStudentsDb();
        if(db && typeof db.getStudents === 'function'){
          var arr = db.getStudents();
          if(Array.isArray(arr)) return arr;
        }
        // fallback common
        if(db && Array.isArray(db.students)) return db.students;
      }
    }catch(e){}
    try{
      var arr = window.students_db_v1 || window.studentsDb || window.studentsDB || window.students || null;
      if(Array.isArray(arr)) return arr;
    }catch(e){}
    return [];
  }

  // compose search: use same student sources as secretary home search (LS profiles/appUsers/students db)
  function _secCollectComposeTzList(){
    // IMPORTANT: keep the ORIGINAL key as-is (no normalize) because student_profile_* keys
    // might not be strictly digits. We normalize ONLY for matching/display.
    var tzs = Object.create(null);

    try{
      var fromLs = (typeof getAllStudentKeys === 'function') ? getAllStudentKeys() : [];
      if(Array.isArray(fromLs)){
        for(var i=0;i<fromLs.length;i++){
          var rawK = normStr(fromLs[i]);
          if(rawK) tzs[rawK] = true;
        }
      }
    }catch(e){}

    try{
      var raw = (window.DBStorage && DBStorage.getItem) ? DBStorage.getItem('appUsers') : null;
      var users = safeParse(raw, {});
      if(users && typeof users === 'object'){
        Object.keys(users).forEach(function(k){
          var rawK = normStr(k);
          if(rawK) tzs[rawK] = true;
        });
      }
    }catch(e){}

    try{
      var db = (typeof resolveStudentsDb === 'function') ? resolveStudentsDb() : null;
      if(db && typeof db.list === 'function'){
        var list = db.list();
        if(Array.isArray(list)){
          for(var j=0;j<list.length;j++){
            var it = list[j] || {};
            var rawK = normStr(it.tz || it.id || it.username);
            if(rawK) tzs[rawK] = true;
          }
        }
      }
    }catch(e){}

    return Object.keys(tzs);
  }

  function _secGetStudentTz(st){
    try{ return normalizeTz(st && (st.tz || st.id || st.studentId || st.userNumber || st.username || st.user || st.uid)); }catch(e){ return ''; }
  }

  function _secEnsureComposeInit(){
    if(window.__secComposeInit) return;
    window.__secComposeInit = true;

    var tzEl = document.getElementById('secComposeTz');
    if(tzEl){
      tzEl.addEventListener('input', function(){ try{ secUpdateComposeSuggest(); }catch(e){} });
      tzEl.addEventListener('focus', function(){ try{ secUpdateComposeSuggest(); }catch(e){} });
      tzEl.addEventListener('keydown', function(ev){
        try{
          if(ev && ev.key === 'Enter'){
            ev.preventDefault();
            secFindStudentForCompose();
          }
        }catch(e){}
      });
    }

    // click outside suggestion to close
    document.addEventListener('click', function(ev){
      try{
        var sug = document.getElementById('secComposeSuggest');
        var tz = document.getElementById('secComposeTz');
        if(!sug || !tz) return;
        if(ev && (sug.contains(ev.target) || tz.contains(ev.target))) return;
        sug.innerHTML=''; sug.setAttribute('aria-hidden','true'); sug.style.display='none';
      }catch(e){}
    }, true);
  }

  
      // Compose search MUST match secretary home search behavior.
      // We avoid relying on getAllStudentKeys()/resolveStudentsDb wrappers that might be shadowed.
      function _secComposeListTzs(){
        var tzs = Object.create(null);

        // 1) localStorage student profiles
        try{
          for(var i=0;i<localStorage.length;i++){
            var k = localStorage.key(i);
            if(k && k.indexOf('student_profile_') === 0){
              var tz = normalizeTz(k.slice('student_profile_'.length));
              if(tz) tzs[tz] = true;
            }
          }
        }catch(e){}

        // 2) appUsers
        try{
          var raw = (window.DBStorage && DBStorage.getItem) ? DBStorage.getItem('appUsers') : null;
          var users = safeParse(raw, {});
          if(users && typeof users === 'object'){
            Object.keys(users).forEach(function(k){
              var tz2 = normalizeTz(k);
              if(tz2) tzs[tz2] = true;
            });
          }
        }catch(e){}

        // 3) students db (optional)
        try{
          var db = (typeof resolveStudentsDb === 'function') ? resolveStudentsDb() : null;
          if(db && typeof db.list === 'function'){
            var list = db.list();
            if(Array.isArray(list)){
              for(var j=0;j<list.length;j++){
                var it = list[j] || {};
                var tz3 = normalizeTz(it.tz || it.id || it.username);
                if(tz3) tzs[tz3] = true;
              }
            }
          }
        }catch(e){}

        return Object.keys(tzs);
      }

      function _secComposeGetAllItems(){
        var tzList = [];
        try{ tzList = _secComposeListTzs(); }catch(e){ tzList = []; }
        if(!Array.isArray(tzList)) tzList = [];

        var users = {};
        try{
          var rawU = (window.DBStorage && DBStorage.getItem) ? DBStorage.getItem('appUsers') : null;
          users = safeParse(rawU, {});
          if(!users || typeof users !== 'object') users = {};
        }catch(e){ users = {}; }

        var items = [];
        for(var i=0;i<tzList.length;i++){
          var tz = normalizeTz(tzList[i]);
          if(!tz) continue;

          var prof = null;
          try{ prof = (typeof getStudentProfile === 'function') ? getStudentProfile(tz) : null; }catch(e){ prof = null; }
          prof = prof && typeof prof === 'object' ? prof : {};

          var name = '';
          try{ if(typeof pickStudentName === 'function') name = pickStudentName(tz, prof); }catch(e){ name = ''; }
          name = String(name||'').trim();

          if(!name){
            try{
              var u = users[tz];
              if(u && typeof u === 'object') name = String(u.fullName||u.name||u.displayName||'').trim();
            }catch(e){}
          }
          if(!name){
            try{
              var fn = String(prof.firstName||prof.fname||prof.first_name||prof['שם פרטי']||'').trim();
              var ln = String(prof.lastName||prof.lname||prof.last_name||prof['שם משפחה']||'').trim();
              name = (fn + ' ' + ln).trim();
            }catch(e){ name = ''; }
          }
          if(!name) name = '—';

          items.push({ key: tz, tzDisp: tz, name: name });
        }
        return items;
      }

  window.secUpdateComposeSuggest = function(){
    if(!_secIsOn()) return;
    var tzEl = document.getElementById('secComposeTz');
    var sug  = document.getElementById('secComposeSuggest');
    if(!tzEl || !sug) return;

    var qRaw = String(tzEl.value||'');
    var q = normalizeTz(qRaw);

    if(!q){
      sug.innerHTML = '';
      sug.setAttribute('aria-hidden','true');
      sug.style.display = 'none';
      return;
    }

    var items = _secComposeGetAllItems();
    var hits = [];
    for(var i=0;i<items.length;i++){
      var it = items[i];
      if(!it || !it.tzDisp) continue;
      if(String(it.tzDisp).indexOf(q) !== 0) continue; // prefix
      hits.push(it);
      if(hits.length >= 8) break;
    }

    if(!hits.length){
      sug.innerHTML = '<div class="sec-suggest-empty">לא נמצא תלמיד</div>';
      sug.setAttribute('aria-hidden','false');
      sug.style.display = 'block';
      return;
    }

    var html = '';
    for(var j=0;j<hits.length;j++){
      var it2 = hits[j];
      html += '<button type="button" class="sec-suggest-item tap" data-tap="" onclick="secAddComposeRecipient(\'' + _secJsStr(String(it2.key)) + '\',\'' + _secJsStr(String(it2.name)) + '\',\'' + _secJsStr(String(it2.tzDisp)) + '\')">';
      html +=   '<div class="sec-suggest-name">' + esc(String(it2.name||'—')) + '</div>';
      html +=   '<div class="sec-suggest-tz">ת״ז: ' + esc(String(it2.tzDisp||'')) + '</div>';
      html += '</button>';
    }
    sug.innerHTML = html;
    sug.setAttribute('aria-hidden','false');
    sug.style.display = 'block';
  };

  window.secFindStudentForCompose = function(){
    if(!_secIsOn()) return;
    var tzEl = document.getElementById('secComposeTz');
    if(!tzEl) return;
    var q = normalizeTz(String(tzEl.value||''));
    if(!q) return;

    var items = _secComposeGetAllItems();
    for(var i=0;i<items.length;i++){
      var it = items[i];
      if(!it || !it.tzDisp) continue;
      if(String(it.tzDisp) !== String(q)) continue;
      try{ secAddComposeRecipient(it.key, it.name, it.tzDisp); }catch(e){}
      return;
    }
    try{ alert('לא נמצא תלמיד'); }catch(e){}
  };

  window.secAddComposeRecipient = function(key, name, tzDisp){
    if(!_secIsOn()) return;
    key = normStr(key);
    if(!key) return;
    name = String(name||'').trim();
    tzDisp = normalizeTz(tzDisp || key);

    var arr = Array.isArray(window.__secComposeRecipients) ? window.__secComposeRecipients : [];
    for(var i=0;i<arr.length;i++){
      if(String(arr[i] && arr[i].key) === String(key)){
        secRenderComposeRecipients();
        return;
      }
    }
    arr.push({ key: key, name: name, tzDisp: tzDisp });
    window.__secComposeRecipients = arr;
    secRenderComposeRecipients();

    try{
      var sug = document.getElementById('secComposeSuggest');
      if(sug){ sug.innerHTML=''; sug.setAttribute('aria-hidden','true'); sug.style.display='none'; }
    }catch(e){}
  };

  window.secRemoveComposeRecipient = function(key){
    key = normStr(key);
    var arr = Array.isArray(window.__secComposeRecipients) ? window.__secComposeRecipients : [];
    window.__secComposeRecipients = arr.filter(function(x){ return String(x && x.key) !== String(key); });
    secRenderComposeRecipients();
  };

  window.secRenderComposeRecipients = function(){
    var box = document.getElementById('secComposeRecipients');
    if(!box) return;
    var arr = Array.isArray(window.__secComposeRecipients) ? window.__secComposeRecipients : [];
    if(!arr.length){ box.innerHTML=''; return; }

    var html = '<div class="sec-recipients-title">נשלח אל:</div><div class="sec-recipients-chips">';
    for(var i=0;i<arr.length;i++){
      var it = arr[i] || {};
      var key = String(it.key||'').trim();
      var tz = normalizeTz(it.tzDisp || key);
      var nm = String(it.name||'').trim() || tz || key;
      html += '<button type="button" class="sec-chip tap" data-tap="" onclick="secRemoveComposeRecipient(\'' + _secJsStr(String(key)) + '\')">';
      html +=   '<span class="sec-chip-name">' + esc(nm) + '</span>';
      html +=   '<span class="sec-chip-tz">' + esc(tz ? (' · ' + tz) : '') + '</span>';
      html +=   '<span class="sec-chip-x">×</span>';
      html += '</button>';
    }
    html += '</div>';
    box.innerHTML = html;
  };

  window.renderSecretaryInbox = function(){
    if(!_secIsOn()) return;
    try{ _secEnsureComposeInit(); }catch(e){}
    var wrap = document.getElementById('secInboxList');
    if(!wrap) return;
    var arr = _secReadLeaveMsgs();
    arr = Array.isArray(arr) ? arr.slice() : [];
    arr.sort(function(a,b){ return String(b && b.createdAt || '').localeCompare(String(a && a.createdAt || '')); });
    if(!arr.length){ wrap.innerHTML = '<div class="pm-empty">אין הודעות כרגע.</div>'; return; }

    var html='';
    for(var i=0;i<arr.length;i++){
      var it = arr[i] || {};
      var nm = (String(it.firstName||'').trim() + ' ' + String(it.lastName||'').trim()).trim() || '—';
      var ph = String(it.phone||'').trim() || '—';
      var when = _secFmtISO(it.createdAt);
      var body = String(it.message||'').trim();
      var canReply = !!(it.senderUser && String(it.senderUser).trim());
      var idx = i;
      html += '<div class="sec-inbox-item">';
      html += '  <div class="sec-inbox-top">';
      html += '    <div class="sec-inbox-name">' + esc(nm) + '</div>';
      html += '    <div class="sec-inbox-meta">' + esc(when) + '</div>';
      html += '  </div>';
      html += '  <div class="sec-inbox-meta">' + esc(ph) + (canReply ? ' • משתמש רשום' : '') + '</div>';
      html += '  <div class="sec-inbox-body">' + esc(body || '—') + '</div>';
      html += '  <div class="sec-inbox-btns">';
      if(canReply){
        html += '    <button class="leave-msg-btn tap" type="button" onclick="secReplyToInbox(' + idx + ')">השב</button>';
      }else{
        html += '    <button class="leave-msg-btn secondary" type="button" disabled>אין השבה (אורח)</button>';
      }
      html += '    <button class="leave-msg-btn secondary tap" type="button" onclick="secComposeToStudentFromInbox(' + idx + ')">שלח לתלמיד</button>';
      html += '  </div>';
      html += '</div>';
    }
    wrap.innerHTML = html;
  };

  window.secReplyToInbox = function(idx){
    if(!_secIsOn()) return;
    try{ _secEnsureComposeInit(); }catch(e){}
    var arr = _secReadLeaveMsgs();
    var it = (Array.isArray(arr) && arr[idx]) ? arr[idx] : null;
    if(!it || !it.senderUser){ alert('אין משתמש רשום להשבה'); return; }
    try{ window.openSecretaryCompose(); }catch(e){}
    try{
      var tz = String(it.senderUser||'').trim();
      var st = (typeof getStudentByTz==='function') ? getStudentByTz(tz) : null;
      var nm = st ? _secStudentName(st) : '';
      secAddComposeRecipient(tz, nm);
    }catch(e){}
  };

  window.secComposeToStudentFromInbox = function(idx){
    if(!_secIsOn()) return;
    try{ _secEnsureComposeInit(); }catch(e){}
    var arr = _secReadLeaveMsgs();
    var it = (Array.isArray(arr) && arr[idx]) ? arr[idx] : null;
    try{ window.openSecretaryCompose(); }catch(e){}
    try{
      var tz = it && it.senderUser ? String(it.senderUser).trim() : '';
      if(tz){
        var st = (typeof getStudentByTz==='function') ? getStudentByTz(tz) : null;
        var nm = st ? _secStudentName(st) : '';
        secAddComposeRecipient(tz, nm);
      }
    }catch(e){}
  };

  window.secSendComposeMessage = function(){
    if(!_secIsOn()) return;
    try{ _secEnsureComposeInit(); }catch(e){}
    var body = (document.getElementById('secComposeMsg')||{}).value || '';
    body = String(body).trim();
    var rec = Array.isArray(window.__secComposeRecipients) ? window.__secComposeRecipients.slice() : [];
    if(!rec.length){ alert('חובה לבחור לפחות תלמיד אחד'); return; }
    if(!body){ alert('חובה לכתוב הודעה'); return; }

    var sent = 0;
    for(var i=0;i<rec.length;i++){
      var key = String((rec[i] && (rec[i].key || rec[i].tz || rec[i].user || rec[i].id)) || '').trim();
      if(!key) continue;
      try{
        if(typeof window.sendPrivateMessage === 'function'){
          window.sendPrivateMessage(key, 'הודעה מהמזכירה', body);
          sent++;
        }
      }catch(e){}
    }
    alert(sent ? ('נשלח ל-' + sent + ' תלמידים') : 'לא נשלח');
    try{ closeOverlay('secComposeOverlay'); }catch(e){}
  };


  // Secretary Shop UI (pickup / orders / waiting)
  // Secretary: open payment window (stage 3 UI shell only, no save logic yet)
  window.openSecretaryPaymentPage = function(){
    try{
      if(!_secIsOn()) return;
      try{ if(typeof window.closeMenu === 'function') window.closeMenu(); }catch(e){}
      try{ if(typeof window.closeProfileMenu === 'function') window.closeProfileMenu(); }catch(e){}

      var ov = document.getElementById('secPaymentOverlay');
      if(!ov){
        ov = document.createElement('div');
        ov.id = 'secPaymentOverlay';
        ov.className = 'overlay';
        ov.style.zIndex = '99999';
        ov.innerHTML = [
          '<div class="pay-modal" id="secPaymentModal" style="width:min(760px,95vw);max-width:95vw;position:relative;max-height:calc(100dvh - 18px);overflow:auto;overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;touch-action:pan-y;padding-bottom:calc(env(safe-area-inset-bottom,0px) + 220px);">',
            '<div class="pay-title" style="margin-bottom:4px;">תשלום</div>',
            '<div class="pay-sub" dir="rtl" style="text-align:right;margin-bottom:12px;">תשלום מזכירה</div>',

            '<div id="secPayMsg" dir="rtl" style="visibility:hidden;min-height:0;margin:0 0 10px;padding:10px 12px;border-radius:10px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.03);text-align:right;"></div>',

            '<div dir="rtl" style="display:grid;gap:12px;text-align:right;">',

              '<div style="border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:12px;background:rgba(255,255,255,.02);">',
                '<div style="font-weight:800;margin-bottom:8px;">חיפוש תלמיד</div>',
                '<div id="secPaySearchWrap" style="position:relative;">',
                  '<input id="secPayStudentSearch" name="sec_pay_student_search_'+String(Date.now())+'" type="tel" inputmode="numeric" enterkeyhint="done" maxlength="9" autocomplete="off" autocorrect="off" autocapitalize="none" spellcheck="false" aria-autocomplete="none" data-lpignore="true" data-form-type="other" placeholder="הקלד ת״ז מלאה (9 ספרות)" style="width:100%;min-height:42px;border-radius:10px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.04);color:#fff;padding:0 12px;box-sizing:border-box;" />',
                  '<div id="secPaySearchResults" style="display:none;margin-top:6px;position:relative;z-index:9;"></div>',
                '</div>',
                '<div id="secPaySearchHint" style="margin-top:8px;color:#cfcfcf;font-size:12px;opacity:.9;">הקלד ת״ז מלאה (9 ספרות) כדי להציג תלמיד לבחירה</div>',
              '</div>',

              '<div id="secPaySelectedStudentCard" style="border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:12px;background:rgba(255,255,255,.02);display:none;">',
                '<div style="font-weight:800;margin-bottom:8px;">תלמיד נבחר</div>',
                '<div style="display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center;">',
                  '<div>',
                    '<div id="secPaySelName" style="font-weight:700;">—</div>',
                    '<div id="secPaySelTz" style="font-size:12px;color:#cfcfcf;">ת״ז: —</div>',
                  '</div>',
                  '<div id="secPaySelBalance" style="font-weight:800;white-space:nowrap;">יתרה: —</div>',
                '</div>',
              '</div>',

              '<div style="border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:12px;background:rgba(255,255,255,.02);">',
                '<div style="font-weight:800;margin-bottom:8px;">סכום לתשלום</div>',
                '<input id="secPayAmount" type="number" inputmode="decimal" min="0" step="0.01" placeholder="0" style="width:100%;min-height:42px;border-radius:10px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.04);color:#fff;padding:0 12px;box-sizing:border-box;" />',
              '</div>',

              '<div style="border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:12px;background:rgba(255,255,255,.02);">',
                '<div style="font-weight:800;margin-bottom:8px;">אמצעי תשלום</div>',
                '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">',
                  '<button type="button" id="secPayMethodCash" data-method="cash" class="pay-btn" style="min-height:42px;">מזומן</button>',
                  '<button type="button" id="secPayMethodCredit" data-method="credit" class="pay-btn" style="min-height:42px;">אשראי</button>',
                '</div>',
                '<input type="hidden" id="secPayMethod" value="" />',
              '</div>',

              '<div style="border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:12px;background:rgba(255,255,255,.02);">',
                '<div style="font-weight:800;margin-bottom:8px;">אסמכתא / קבלה <span style="opacity:.7;font-weight:500;">(אופציונלי)</span></div>',
                '<input id="secPayReceiptRef" type="text" autocomplete="off" placeholder="מספר אסמכתא / קבלה" style="width:100%;min-height:42px;border-radius:10px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.04);color:#fff;padding:0 12px;box-sizing:border-box;" />',
              '</div>',

              '<div style="border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:12px;background:rgba(255,255,255,.02);">',
                '<div style="font-weight:800;margin-bottom:8px;">הערה <span style="opacity:.7;font-weight:500;">(אופציונלי)</span></div>',
                '<textarea id="secPayNote" rows="3" placeholder="הערה לתשלום" style="width:100%;border-radius:10px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.04);color:#fff;padding:10px 12px;box-sizing:border-box;resize:vertical;"></textarea>',
              '</div>',

              '<div style="display:flex;gap:8px;justify-content:flex-start;flex-wrap:wrap;position:sticky;bottom:0;z-index:5;padding-top:8px;background:linear-gradient(to top, rgba(7,17,16,.95), rgba(7,17,16,0));">',
                '<button type="button" class="pay-btn primary" id="secPaymentSaveBtn">שמור תשלום</button>',
                '<button type="button" class="pay-btn" id="secPaymentCloseBtn">חזרה</button>',
              '</div>',

            '</div>',
          '</div>'
        ].join('');
        document.body.appendChild(ov);

        var cx = document.getElementById('secPaymentCloseX');
        if(cx){ try{ cx.remove(); }catch(e){ cx.style.display='none'; } }
        try{ var x2 = ov.querySelector('.close-btn,.close-x,[data-close="x"]'); if(x2) x2.style.display='none'; }catch(e){}
        var cb = document.getElementById('secPaymentCloseBtn');
        if(cb) cb.onclick = function(){ try{ if(ov && typeof ov.__resetSecPaymentForm==='function') ov.__resetSecPaymentForm(); }catch(_e0){} try{ document.body.style.overflow=''; }catch(_e){} try{ closeOverlay('secPaymentOverlay'); }catch(e){} };

        function setMsg(txt){
          var m = document.getElementById('secPayMsg');
          if(!m) return;
          txt = String(txt||'').trim();
          m.textContent = txt;
          m.style.visibility = txt ? 'visible' : 'hidden';
        }
        function setMethod(method){
          var hidden = document.getElementById('secPayMethod');
          var b1 = document.getElementById('secPayMethodCash');
          var b2 = document.getElementById('secPayMethodCredit');
          if(hidden) hidden.value = method || '';
          [b1,b2].forEach(function(b){
            if(!b) return;
            var on = (String(b.getAttribute('data-method')||'') === String(method||''));
            try{
              b.style.outline = on ? '2px solid rgba(80,220,140,.9)' : '';
              b.style.background = on ? 'rgba(80,220,140,.12)' : '';
            }catch(e){}
          });
        }


function _secPayShowResultDialog(ok, msg, onApprove){
  try{
    var text = String(msg || (ok ? 'התשלום בוצע בהצלחה' : 'שגיאה בביצוע התשלום'));
    alert(text);
  }catch(e){}
  try{ if(typeof onApprove === 'function') onApprove(); }catch(e){}
}
function resetSecPaymentForm(){
  try{ setMsg(''); }catch(e){}
  try{ setMethod(''); }catch(e){}
  try{
    selectedStudent = null;
    var card = document.getElementById('secPaySelectedStudentCard');
    var nEl = document.getElementById('secPaySelName');
    var tEl = document.getElementById('secPaySelTz');
    var bEl = document.getElementById('secPaySelBalance');
    if(card) card.style.display = 'none';
    if(nEl) nEl.textContent = '—';
    if(tEl) tEl.textContent = 'ת״ז: —';
    if(bEl) bEl.textContent = 'יתרה: —';
  }catch(e){}
  try{ var el1=document.getElementById('secPayStudentSearch'); if(el1) el1.value=''; }catch(e){}
  try{ var el2=document.getElementById('secPayAmount'); if(el2) el2.value=''; }catch(e){}
  try{ var el3=document.getElementById('secPayReceiptRef'); if(el3) el3.value=''; }catch(e){}
  try{ var el4=document.getElementById('secPayNote'); if(el4) el4.value=''; }catch(e){}
  try{
    var rr=document.getElementById('secPaySearchResults');
    if(rr){ rr.innerHTML=''; rr.style.display='none'; }
  }catch(e){}
  try{
    var hh=document.getElementById('secPaySearchHint');
    if(hh) hh.textContent='הקלד ת״ז מלאה (9 ספרות) כדי להציג תלמיד לבחירה';
  }catch(e){}
}
        try{ ov.__resetSecPaymentForm = resetSecPaymentForm; }catch(e){}


        function isSecPayNight(){
          try{
            var b = document.body;
            if(!b) return true;
            if(b.classList.contains('theme-day')) return false;
            if(b.classList.contains('theme-night')) return true;
            return true;
          }catch(e){ return true; }
        }
        function applySecPaymentTheme(){
          try{
            var night = isSecPayNight();
            var modal = document.getElementById('secPaymentModal');
            if(!modal) return;
            modal.style.background = night ? '#071110' : '#ffffff';
            modal.style.color = night ? '#ffffff' : '#0f1414';
            modal.style.border = '1px solid ' + (night ? 'rgba(255,255,255,.10)' : 'rgba(0,0,0,.08)');
            modal.style.boxShadow = night ? '0 18px 48px rgba(0,0,0,.45)' : '0 18px 48px rgba(0,0,0,.18)';
            var cards = modal.querySelectorAll('[style*="border:1px solid"]');
            cards.forEach(function(el){
              var id = el.id || '';
              if(id === 'secPayMsg') return;
              el.style.borderColor = night ? 'rgba(255,255,255,.10)' : 'rgba(0,0,0,.08)';
              el.style.background = night ? 'rgba(255,255,255,.02)' : '#f7faf9';
              if(!el.style.color) el.style.color = night ? '#fff' : '#0f1414';
            });
            var msg = document.getElementById('secPayMsg');
            if(msg){
              msg.style.borderColor = night ? 'rgba(255,255,255,.12)' : 'rgba(0,0,0,.10)';
              msg.style.background = night ? 'rgba(255,255,255,.04)' : 'rgba(0,0,0,.03)';
              msg.style.color = night ? '#fff' : '#0f1414';
            }
            var inputs = modal.querySelectorAll('input, textarea');
            inputs.forEach(function(el){
              if(el.type === 'hidden') return;
              el.style.background = night ? 'rgba(255,255,255,.04)' : '#ffffff';
              el.style.color = night ? '#ffffff' : '#0f1414';
              el.style.borderColor = night ? 'rgba(255,255,255,.14)' : 'rgba(0,0,0,.14)';
              el.style.caretColor = night ? '#ffffff' : '#0f1414';
            });
            var subtle = modal.querySelectorAll('[style*="color:#cfcfcf"]');
            subtle.forEach(function(el){ el.style.color = night ? '#cfcfcf' : '#5b6464'; });
            try{
              var actRows = modal.querySelectorAll('[style*="position:sticky"][style*="bottom:0"]');
              actRows.forEach(function(el){
                el.style.background = night
                  ? 'linear-gradient(to top, rgba(7,17,16,.95), rgba(7,17,16,0))'
                  : 'linear-gradient(to top, rgba(255,255,255,.96), rgba(255,255,255,0))';
              });
            }catch(e){}
            var results = document.getElementById('secPaySearchResults');
            if(results){
              results.style.color = night ? '#fff' : '#0f1414';
              results.style.background = 'transparent';
            }
          }catch(e){}
        }

        var mCash = document.getElementById('secPayMethodCash');
        var mCredit = document.getElementById('secPayMethodCredit');
        if(mCash) mCash.onclick = function(){ try{ if(document.activeElement && document.activeElement.blur) document.activeElement.blur(); }catch(e){} setMethod('cash'); };
        if(mCredit) mCredit.onclick = function(){ try{ if(document.activeElement && document.activeElement.blur) document.activeElement.blur(); }catch(e){} setMethod('credit'); };

        var selectedStudent = null;
        function _secPayDigitsOnly(v){ try{ return String(v==null?'':v).replace(/\D+/g,''); }catch(e){ return ''; } }
        function _secPayEsc(v){ try{ return String(v==null?'':v).replace(/[&<>\"']/g,function(c){ return ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]); }); }catch(e){ return ''; } }
        function _secPayNormTz(v){
          try{ if(typeof normalizeTz === 'function') return String(normalizeTz(v)||''); }catch(e){}
          return _secPayDigitsOnly(v).slice(0,9);
        }
        function _secPayFmtMoney(v){
          try{
            if(v == null || v === '') return '—';
            var n = Number(v);
            if(!isFinite(n)) return '—';
            return n.toLocaleString('he-IL') + '₪';
          }catch(e){ return '—'; }
        }
        function _secPayExtractBalance(raw){
          try{
            if(raw == null) return null;
            if(typeof raw === 'number') return isFinite(raw) ? raw : null;
            if(typeof raw === 'string'){ var n1 = Number(String(raw).replace(/,/g,'')); return isFinite(n1) ? n1 : null; }
            if(typeof raw === 'object'){
              var keys = ['balance','currentBalance','studentBalance','amount','value','total','available','due','paymentsDue'];
              for(var i=0;i<keys.length;i++){
                if(Object.prototype.hasOwnProperty.call(raw, keys[i])){
                  var n2 = Number(String(raw[keys[i]]).replace(/,/g,''));
                  if(isFinite(n2)) return n2;
                }
              }
            }
          }catch(e){}
          return null;
        }

        function _secPayResolveFinanceAPI(){
          try{ if(window.FinanceAPI && typeof window.FinanceAPI === 'object') return window.FinanceAPI; }catch(e){}
          try{ if(window.financeAPI && typeof window.financeAPI === 'object') return window.financeAPI; }catch(e){}
          return null;
        }

        function _secPayLoadBalance(tz){
          try{
            if(!tz) return null;
            var api = _secPayResolveFinanceAPI();
            if(api && typeof api.getStudentBalance === 'function'){
              return api.getStudentBalance(tz);
            }
          }catch(e){}
          return null;
        }
        function refreshSelectedStudentBalance(){
          var bEl = document.getElementById('secPaySelBalance');
          if(!bEl) return;
          if(!selectedStudent || !selectedStudent.tz){
            bEl.textContent = 'יתרה: —';
            return;
          }
          bEl.textContent = 'יתרה: טוען...';
          try{
            var bal = _secPayLoadBalance(String(selectedStudent.tz || ''));
            if(bal && typeof bal.then === 'function'){
              bal.then(function(v){
                try{
                  if(!selectedStudent || !selectedStudent.tz) return;
                  bEl.textContent = 'יתרה: ' + _secPayFmtMoney(_secPayExtractBalance(v));
                }catch(_e){}
              }).catch(function(){
                try{ bEl.textContent = 'יתרה: שגיאה בטעינה'; }catch(_e){}
              });
              return;
            }
            bEl.textContent = 'יתרה: ' + _secPayFmtMoney(_secPayExtractBalance(bal));
          }catch(e){
            bEl.textContent = 'יתרה: שגיאה בטעינה';
          }
        }
        function setSelectedStudent(st){
          selectedStudent = st || null;
          var card = document.getElementById('secPaySelectedStudentCard');
          var nEl = document.getElementById('secPaySelName');
          var tEl = document.getElementById('secPaySelTz');
          var bEl = document.getElementById('secPaySelBalance');
          if(!selectedStudent){
            if(card) card.style.display = 'none';
            if(nEl) nEl.textContent = '—';
            if(tEl) tEl.textContent = 'ת״ז: —';
            if(bEl) bEl.textContent = 'יתרה: —';
            return;
          }
          if(card) card.style.display = 'block';
          if(nEl) nEl.textContent = String(selectedStudent.name || '—');
          if(tEl) tEl.textContent = 'ת״ז: ' + String(selectedStudent.tz || '—');
          if(bEl) bEl.textContent = 'יתרה: טוען...';
          refreshSelectedStudentBalance();
          setMsg('נבחר תלמיד: ' + String(selectedStudent.name || selectedStudent.tz || ''));
        }

        function _secPaySearchThemeVals(){
          var night = true;
          try{ night = isSecPayNight(); }catch(e){}
          return {
            night: night,
            itemBorder: night ? 'rgba(255,255,255,.08)' : 'rgba(0,0,0,.10)',
            itemBg: night ? 'rgba(255,255,255,.03)' : '#ffffff',
            itemText: night ? '#ffffff' : '#0f1414',
            subText: night ? '#cfcfcf' : '#5b6464',
            emptyBorder: night ? 'rgba(255,255,255,.14)' : 'rgba(0,0,0,.14)',
            emptyBg: night ? 'rgba(255,255,255,.02)' : '#ffffff'
          };
        }


        function renderPaySearchResults(q){
          try{
          var res = document.getElementById('secPaySearchResults');
          var hint = document.getElementById('secPaySearchHint');
          if(!res) return;
          var rawQuery = String(q || '');
          var query = rawQuery.trim();
          var qNorm = _secPayNormTz(query);

          // show results only after full TZ (9 digits)
          if(!qNorm || qNorm.length < 9){
            res.style.display = 'none';
            res.innerHTML = '';
            if(hint) hint.textContent = query ? 'יש להקליד ת״ז מלאה (9 ספרות)' : 'הקלד ת״ז מלאה (9 ספרות) כדי להציג תלמיד לבחירה';
            return;
          }

          var items = [];
          try{
            if(typeof window.secretaryFindStudents === 'function') items = window.secretaryFindStudents(qNorm) || [];
            else { if(hint) hint.textContent = 'פונקציית חיפוש מזכירה לא זמינה'; }
          }catch(e){ items = []; }

          // Direct 1:1 reuse of secretary home search source/function (no fallback source path)
          items = (Array.isArray(items) ? items : []).filter(function(it){
            return _secPayNormTz(String((it||{}).tz||'')) === qNorm;
          }).slice(0, 5);

          if(hint) hint.textContent = items.length ? 'נמצאה התאמה. לחץ לבחור תלמיד' : 'לא נמצאה התאמה לת״ז הזו';

          res.style.display = 'block';
          res.style.maxHeight = '240px';
          res.style.overflow = 'auto';
          res.style.padding = '6px';
          res.style.borderRadius = '12px';
          var __th0 = _secPaySearchThemeVals();
          res.style.border = '1px solid ' + (__th0.night ? 'rgba(255,255,255,.12)' : 'rgba(0,0,0,.12)');
          res.style.background = __th0.night ? '#0b1514' : '#ffffff';
          res.style.boxShadow = __th0.night ? '0 10px 28px rgba(0,0,0,.35)' : '0 8px 22px rgba(0,0,0,.12)';
          res.style.zIndex = '50';

          var th = _secPaySearchThemeVals();
          if(!items.length){
            res.innerHTML = '<div style="border:1px dashed '+th.emptyBorder+';border-radius:10px;padding:10px;background:'+th.emptyBg+';color:'+th.subText+';font-size:12px;">אין תלמיד תואם לת״ז מלאה</div>';
            return;
          }

          res.innerHTML = items.map(function(it, idx){
            var tzv = _secPayNormTz(String(it.tz || ''));
            return '' +
              '<button type="button" data-act="secPayPickStu" data-tz="'+_secPayEsc(tzv)+'" style="width:100%;text-align:right;display:flex;justify-content:space-between;gap:10px;align-items:flex-start;padding:10px 12px;margin:0 0 6px;border-radius:10px;border:1px solid '+th.itemBorder+';background:'+th.itemBg+';color:'+th.itemText+';cursor:pointer;">' +
                '<span style="display:block;min-width:0;flex:1;">' +
                  '<span style="display:block;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">'+_secPayEsc(it.name||('תלמיד ' + tzv))+'</span>' +
                  '<span style="display:block;font-size:12px;color:'+th.subText+';">ת״ז: '+_secPayEsc(tzv)+'</span>' +
                  '<span data-sec-pay-bal="'+_secPayEsc(tzv)+'" style="display:block;font-size:12px;color:'+th.subText+';">יתרה: טוען...</span>' +
                '</span>' +
                '<span style="font-size:12px;opacity:.9;white-space:nowrap;margin-top:2px;">בחר</span>' +
              '</button>';
          }).join('');

          // enrich visible balances (small list only)
          items.forEach(function(it){
            var tzv = _secPayNormTz(String((it||{}).tz||''));
            try{
              var out = _secPayLoadBalance(tzv);
              var applyBal = function(v){
                try{
                  var el = res.querySelector('[data-sec-pay-bal="'+CSS.escape(tzv)+'"]');
                  if(el) el.textContent = 'יתרה: ' + _secPayFmtMoney(_secPayExtractBalance(v));
                }catch(e){
                  try{
                    var nodes = res.querySelectorAll('[data-sec-pay-bal]');
                    for(var ii=0; ii<nodes.length; ii++){
                      if(String(nodes[ii].getAttribute('data-sec-pay-bal')||'') === tzv){
                        nodes[ii].textContent = 'יתרה: ' + _secPayFmtMoney(_secPayExtractBalance(v));
                        break;
                      }
                    }
                  }catch(_e){}
                }
              };
              if(out && typeof out.then === 'function') out.then(applyBal).catch(function(){});
              else applyBal(out);
            }catch(e){}
          });
          }catch(err){
            try{
              var res2 = document.getElementById('secPaySearchResults');
              var hint2 = document.getElementById('secPaySearchHint');
              if(hint2) hint2.textContent = 'שגיאת חיפוש תלמיד (ראה קונסול)';
              if(res2){ res2.style.display='none'; res2.innerHTML=''; }
              console.warn('sec payment search render failed', err);
            }catch(_e){}
          }
        }

        var searchInput = document.getElementById('secPayStudentSearch');
        try{ var _sw=document.getElementById('secPaySearchWrap'); if(_sw){ _sw.style.overflow='visible'; if(_sw.parentElement) _sw.parentElement.style.overflow='visible'; } }catch(e){}
        if(searchInput){
          try{
            searchInput.setAttribute('autocomplete','off');
            searchInput.setAttribute('autocorrect','off');
            searchInput.setAttribute('autocapitalize','none');
            searchInput.setAttribute('spellcheck','false');
            searchInput.setAttribute('inputmode','numeric');
            searchInput.setAttribute('enterkeyhint','done');
            searchInput.setAttribute('maxlength','9');
          }catch(e){}
          // Keep input plain; avoid "helper popup" by blocking app-level focus hooks on this modal (see modal trap below)
          searchInput.addEventListener('input', function(){
            try{
              var onlyDigits = _secPayNormTz(searchInput.value || '');
              if(String(searchInput.value||'') !== onlyDigits) searchInput.value = onlyDigits;
            }catch(e){}
            renderPaySearchResults(searchInput.value || '');
          });
          searchInput.addEventListener('focus', function(){
            try{ setMsg(''); }catch(e){}
            try{ searchInput.setSelectionRange && searchInput.setSelectionRange(String(searchInput.value||'').length, String(searchInput.value||'').length); }catch(e){}
            var v = String(searchInput.value || '').trim();
            if(v) renderPaySearchResults(v);
          });
          searchInput.addEventListener('blur', function(){
            setTimeout(function(){
              try{
                var rr = document.getElementById('secPaySearchResults');
                var qv = _secPayNormTz(String(searchInput && searchInput.value || ''));
                // keep dropdown visible for full TZ so user can tap selection
                if(rr && qv.length < 9) rr.style.display = 'none';
              }catch(e){}
            }, 320);
          });
          searchInput.addEventListener('keyup', function(){
            renderPaySearchResults(searchInput.value || '');
          });
        }
        var searchRes = document.getElementById('secPaySearchResults');
        if(searchRes && !searchRes.__secPayTouchBound){
          searchRes.__secPayTouchBound = true;
          searchRes.addEventListener('pointerdown', function(ev){
            try{
              var t = ev.target;
              for(var i=0;i<6 && t && t !== searchRes;i++){
                if(t.getAttribute && t.getAttribute('data-act') === 'secPayPickStu'){
                  ev.preventDefault();
                  ev.stopPropagation();
                  // trigger same picker path immediately (before input blur hides list)
                  if(typeof t.click === 'function') t.click();
                  return;
                }
                t = t.parentElement;
              }
            }catch(e){}
          }, true);
        }
        if(searchRes && !searchRes.__secPayBound){
          searchRes.__secPayBound = true;
          searchRes.addEventListener('click', function(ev){
            var t = ev.target;
            for(var i=0;i<6 && t && t !== searchRes;i++){
              if(t.getAttribute){
                var act = t.getAttribute('data-act');
                if(act === 'secPayPickStu'){
                  try{ ev.preventDefault(); ev.stopPropagation(); }catch(_e){}
                  var tz = String(t.getAttribute('data-tz') || '').trim();
                  var list = [];
                  var found = null;
                  var qPick = _secPayNormTz(tz);
                  try{
                    if(typeof window.secretaryFindStudents === 'function'){
                      // same source as secretary home search
                      list = window.secretaryFindStudents(qPick) || [];
                      if(!Array.isArray(list) || !list.length) list = window.secretaryFindStudents('') || [];
                    }
                  }catch(e){ list = []; }
                  for(var j=0;j<list.length;j++){
                    if(_secPayNormTz(String((list[j]||{}).tz||'')) === qPick){ found = list[j]; break; }
                  }
                  if(!found) return;
                  setSelectedStudent(found);
                  if(searchInput) searchInput.value = String(_secPayNormTz(found.tz || found.id || '') || found.tz || '');
                  try{ if(searchInput && searchInput.blur) searchInput.blur(); }catch(e){}
                  try{ if(document.activeElement && document.activeElement.blur) document.activeElement.blur(); }catch(e){}
                  try{
                    var modal2 = document.getElementById('secPaymentModal');
                    var amt2 = document.getElementById('secPayAmount');
                    if(modal2 && amt2 && amt2.scrollIntoView) amt2.scrollIntoView({block:'center', behavior:'smooth'});
                  }catch(e){}
                  searchRes.style.display = 'none';
                  return;
                }
              }
              t = t.parentElement;
            }
          });
        }

        try{
          ['secPayReceiptRef','secPayNote','secPayAmount'].forEach(function(id){
            var el = document.getElementById(id);
            if(!el) return;
            el.setAttribute('autocomplete','off');
            el.setAttribute('autocorrect','off');
            el.setAttribute('autocapitalize','none');
            el.setAttribute('spellcheck','false');
          });
        }catch(e){}
        try{
          var secModalTrap = document.getElementById('secPaymentModal');
          if(secModalTrap && !secModalTrap.__secPayFocusTrapBound){
            secModalTrap.__secPayFocusTrapBound = true;
            ['focusin','focus','click'].forEach(function(evtName){
              secModalTrap.addEventListener(evtName, function(ev){
                try{
                  var t = ev && ev.target;
                  if(!t) return;
                  var tag = String(t.tagName||'').toLowerCase();
                  if(tag === 'input' || tag === 'textarea'){
                    // stop app-wide input helper overlays from this screen
                    if(ev.stopImmediatePropagation) ev.stopImmediatePropagation();
                    ev.stopPropagation && ev.stopPropagation();
                    // keep bottom buttons reachable via modal scroll (no page jump)
                    setTimeout(function(){
                      try{
                        var modal = document.getElementById('secPaymentModal');
                        if(!modal || !modal.contains(t)) return;
                        var mRect = modal.getBoundingClientRect();
                        var r = t.getBoundingClientRect();
                        if(r.bottom > mRect.bottom - 90){
                          modal.scrollTop += (r.bottom - (mRect.bottom - 90)) + 12;
                        }else if(r.top < mRect.top + 70){
                          modal.scrollTop -= ((mRect.top + 70) - r.top) + 12;
                        }
                      }catch(_e){}
                    }, 120);
                  }
                }catch(_e){}
              }, true);
            });
          }
          var searchResBox = document.getElementById('secPaySearchResults');
          if(searchResBox){
            searchResBox.addEventListener('mousedown', function(ev){ try{ ev.preventDefault(); }catch(e){} }, true);
            searchResBox.addEventListener('touchstart', function(ev){ try{ ev.stopPropagation(); }catch(e){} }, {passive:true, capture:true});
          }
        }catch(e){}
        var saveBtn = document.getElementById('secPaymentSaveBtn');
        if(saveBtn){
          saveBtn.onclick = function(){
            var amountEl = document.getElementById('secPayAmount');
            var methodEl = document.getElementById('secPayMethod');
            var receiptEl = document.getElementById('secPayReceiptRef');
            var amountRaw = amountEl ? String(amountEl.value || '').trim() : '';
            var amount = Number(amountRaw.replace(',', '.'));
            var method = methodEl ? String(methodEl.value || '').trim() : '';
            var receiptRef = receiptEl ? String(receiptEl.value || '').trim() : '';

            if(!selectedStudent || !selectedStudent.tz){
              setMsg('יש לבחור תלמיד לפני שמירה');
              return;
            }
            if(!amountRaw || !isFinite(amount) || amount <= 0){
              setMsg('יש להזין סכום תקין גדול מ-0');
              try{ if(amountEl) amountEl.focus(); }catch(e){}
              return;
            }
            if(method !== 'cash' && method !== 'credit'){
              setMsg('יש לבחור אמצעי תשלום: מזומן או אשראי');
              return;
            }
            // כלל אופציונלי (נתמך): אסמכתא חובה רק באשראי
            if(method === 'credit' && !receiptRef){
              setMsg('בתשלום אשראי יש להזין אסמכתא / קבלה');
              try{ if(receiptEl) receiptEl.focus(); }catch(e){}
              return;
            }

            var noteEl = document.getElementById('secPayNote');
            var note = noteEl ? String(noteEl.value || '').trim() : '';

            var financeApi = _secPayResolveFinanceAPI();
            if(!(financeApi && typeof financeApi.addPayment === 'function')){
              setMsg('שגיאה: FinanceAPI.addPayment לא זמין');
              return;
            }

            var meta = {
              method: method,
              source: 'secretary_payment',
              note: note || '',
              receiptRef: receiptRef || '',
              createdByRole: 'secretary'
            };

            function onSaveSuccess(){
              var _successMsg = 'התשלום בוצע בהצלחה';
              try{
                refreshSelectedStudentBalance();
              }catch(e){}
              try{
                var aEl = document.getElementById('secPayAmount');
                if(aEl) aEl.value = '';
              }catch(e){}
              try{
                var rEl = document.getElementById('secPayReceiptRef');
                if(rEl) rEl.value = '';
              }catch(e){}
              try{
                var nEl2 = document.getElementById('secPayNote');
                if(nEl2) nEl2.value = '';
              }catch(e){}
              try{ setMethod(''); }catch(e){}
              setMsg(_successMsg);
              _secPayShowResultDialog(true, _successMsg, function(){
                try{ if(ov && typeof ov.__resetSecPaymentForm==='function') ov.__resetSecPaymentForm(); }catch(_e0){}
                try{ document.body.style.overflow=''; }catch(_e){}
                try{ closeOverlay('secPaymentOverlay'); }catch(_e){}
              });
            }
            function onSaveError(err){
              try{ console.warn('Secretary payment save failed', err); }catch(e){}
              var msg = '';
              try{
                msg = (err && (err.userMessage || err.message)) ? String(err.userMessage || err.message) : '';
              }catch(e){}
              var finalMsg = msg ? ('שגיאה בשמירת תשלום: ' + msg) : 'שגיאה בשמירת תשלום';
              setMsg(finalMsg);
              _secPayShowResultDialog(false, finalMsg, function(){});
            }

            try{
              saveBtn.disabled = true;
              var res = financeApi.addPayment(String(selectedStudent.tz), amount, meta);
              if(res && typeof res.then === 'function'){
                res.then(function(){ onSaveSuccess(); })
                   .catch(function(err){ onSaveError(err); })
                   .finally(function(){ try{ saveBtn.disabled = false; }catch(_e){} });
                return;
              }
              try{ saveBtn.disabled = false; }catch(e){}
              onSaveSuccess();
            }catch(err){
              try{ saveBtn.disabled = false; }catch(e){}
              onSaveError(err);
            }
          };
        }

        try{ applySecPaymentTheme(); }catch(e){}

        ov.addEventListener('click', function(ev){
          try{
            var m = document.getElementById('secPaymentModal');
            if(m && ev && ev.target && !m.contains(ev.target)){ try{ if(ov && typeof ov.__resetSecPaymentForm==='function') ov.__resetSecPaymentForm(); }catch(_e0){} try{ document.body.style.overflow=''; }catch(_e){} closeOverlay('secPaymentOverlay'); }
          }catch(e){}
        });
      }
      try{
        var msg = document.getElementById('secPayMsg'); if(msg){ msg.textContent=''; msg.style.visibility='hidden'; }
        try{ if(ov && typeof ov.__resetSecPaymentForm==='function') ov.__resetSecPaymentForm(); else if(typeof resetSecPaymentForm==='function') resetSecPaymentForm(); }catch(_e){}
        try{ applySecPaymentTheme(); }catch(_e){}
        openOverlay('secPaymentOverlay');
        try{
          var _ov=document.getElementById('secPaymentOverlay');
          if(_ov){
            _ov.style.position='fixed'; _ov.style.inset='0';
            _ov.style.display='flex'; _ov.style.alignItems='flex-start'; _ov.style.justifyContent='center';
            _ov.style.padding='0'; _ov.style.boxSizing='border-box';
            _ov.style.overflow='hidden'; _ov.style.zIndex='99999';
          }
          document.body.style.overflow='hidden';
        }catch(_e){}
        try{ var _m0=document.getElementById('secPaymentModal'); if(_m0){ _m0.style.overflowY='auto'; _m0.style.webkitOverflowScrolling='touch'; _m0.style.touchAction='pan-y'; _m0.style.width='min(760px,95vw)'; _m0.style.maxHeight='100dvh'; _m0.style.margin='0 auto'; _m0.style.borderRadius='0'; _m0.style.zIndex='100000'; } }catch(_e){}
        try{ var _bar=document.getElementById('secPaymentSaveBtn'); if(_bar && _bar.parentElement){ var r=_bar.parentElement; r.style.position='static'; r.style.bottom=''; r.style.background='transparent'; r.style.paddingTop='12px'; r.style.marginTop='8px'; } }catch(_e){}
        try{ window.__secEnsureTopBackBtn && window.__secEnsureTopBackBtn(); }catch(_e){}
      }catch(e){ try{ ov.classList.add('show'); }catch(_e){} }
    }catch(e){ console.warn('openSecretaryPaymentPage failed', e); }
  };

  window.openSecretaryShop = function(){
    try{ if(typeof window.closeMenu === 'function') window.closeMenu(); }catch(e){}
    try{ if(typeof window.closeProfileMenu === 'function') window.closeProfileMenu(); }catch(e){}

    function escH(v){ try{ return String(v==null?'':v).replace(/[&<>\"']/g,function(c){return({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]);}); }catch(e){ return ''; } }
    function readOrders(){ try{ return (typeof shopReadOrders === 'function') ? (shopReadOrders()||[]) : []; }catch(e){ return []; } }
    function waitKey(){ return 'sec_shop_waiting_v1'; }
    function readWaitingIds(){ try{ var a=JSON.parse(localStorage.getItem(waitKey())||'[]'); return Array.isArray(a)?a:[]; }catch(e){ return []; } }
    function writeWaitingIds(arr){ try{ localStorage.setItem(waitKey(), JSON.stringify(Array.isArray(arr)?arr:[])); }catch(e){} }
    function addWaitingId(id){ id=String(id||'').trim(); if(!id) return; var arr=readWaitingIds(); if(arr.indexOf(id)===-1) arr.unshift(id); writeWaitingIds(arr); }
    function fmtDt(ts){ try{ return (typeof mgrFormatDt==='function')?mgrFormatDt(ts):String(ts||''); }catch(e){ return '—'; } }
    function orderStudentLabel(o){ var u=String((o&&o.username)||'').trim(); return u||'אורח'; }
    function getOrderBuckets(){
      var orders=readOrders().slice(), wait=Object.create(null), ids=readWaitingIds(), i, o, oid;
      for(i=0;i<ids.length;i++) wait[String(ids[i])] = true;
      var pickup=[], preorder=[], waiting=[];
      for(i=0;i<orders.length;i++){ o=orders[i]||{}; oid=String(o.id||'').trim(); if(!oid) continue;
        if(wait[oid]) waiting.push(o); else if(o.hasOrderOnly || String(o.status||'')==='wait_stock') preorder.push(o); else pickup.push(o); }
      pickup.sort(function(a,b){return Number(b.createdAt||0)-Number(a.createdAt||0)}); preorder.sort(function(a,b){return Number(b.createdAt||0)-Number(a.createdAt||0)}); waiting.sort(function(a,b){return Number(b.createdAt||0)-Number(a.createdAt||0)});
      return {pickup:pickup, preorder:preorder, waiting:waiting};
    }
    function rowHtml(o, act){
      var c=Array.isArray(o.items)?o.items.length:0;
      return '<button type="button" class="lesson-file" data-sec-shop-open="'+escH(String(o.id||''))+'" data-sec-shop-act="'+escH(act)+'" style="width:100%;text-align:right;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:10px 12px;margin:0 0 8px;color:#fff;">'
      + '<div class="meta"><div class="title">'+escH(orderStudentLabel(o))+' • '+escH(String(o.id||''))+'</div><div class="sub">'+escH(fmtDt(o.createdAt))+' • '+escH(String(c))+' פריטים • '+escH(String(Math.round(Number(o.total||0)||0)))+'₪</div></div></button>';
    }
    function renderList(which){
      var host=document.getElementById('secShopListPanel'); if(!host) return;
      var b=getOrderBuckets(); var arr=(which==='pickup')?b.pickup:((which==='waiting')?b.waiting:b.preorder);
      var ttl=(which==='pickup')?'איסוף':((which==='waiting')?'ממתינים':'הזמנות');
      var note=(which==='pickup')?'עסקאות מהמלאי שמוכנות לטיפול/איסוף.':((which==='waiting')?'הוזמן מהספק וממתין להגעה.':'עסקאות עם פריטים בקטגוריה להזמנה בלבד.');
      var html='<div style="color:#d9d9d9;font-size:14px;margin:2px 0 10px;">'+escH(note)+'</div><div style="font-weight:900;font-size:18px;margin:0 0 10px;color:#fff;">'+escH(ttl)+'</div>';
      if(!arr.length) html += '<div class="pm-empty">אין פריטים להצגה</div>'; else for(var i=0;i<arr.length;i++) html += rowHtml(arr[i], which);
      host.innerHTML = html;
      host.querySelectorAll('[data-sec-shop-open]').forEach(function(btn){ btn.addEventListener('click', function(){ openSecShopOrderDetail(btn.getAttribute('data-sec-shop-open')||'', btn.getAttribute('data-sec-shop-act')||'orders'); }); });
    }
    function detailItemsTable(o){
      var items=Array.isArray(o.items)?o.items:[]; if(!items.length) return '<div style="color:#d9d9d9;">אין פריטי עסקה</div>';
      var h='<div style="border:1px solid rgba(255,255,255,.1);border-radius:12px;overflow:hidden;margin-top:8px;"><table style="width:100%;border-collapse:collapse;font-size:13px;"><thead><tr style="background:rgba(255,255,255,.05);"><th style="padding:8px;text-align:right;">מוצר</th><th style="padding:8px;text-align:right;">כמות</th><th style="padding:8px;text-align:right;">קטגוריה</th><th style="padding:8px;text-align:right;">זמינות</th></tr></thead><tbody>';
      for(var i=0;i<items.length;i++){ var it=items[i]||{}; h += '<tr><td style="padding:8px;border-top:1px solid rgba(255,255,255,.06);">'+escH(String(it.name||it.title||'—'))+'</td><td style="padding:8px;border-top:1px solid rgba(255,255,255,.06);">'+escH(String(it.qty||it.quantity||1))+'</td><td style="padding:8px;border-top:1px solid rgba(255,255,255,.06);">'+escH(String(it.category||'—'))+'</td><td style="padding:8px;border-top:1px solid rgba(255,255,255,.06);">'+escH(String(it.availability||'—'))+'</td></tr>'; }
      return h + '</tbody></table></div>';
    }
    function findOrderById(orderId){ var arr=readOrders(); for(var i=0;i<arr.length;i++) if(String((arr[i]||{}).id||'')===String(orderId||'')) return arr[i]; return null; }
    window.openSecShopOrderDetail = function(orderId, mode){
      var o=findOrderById(orderId); if(!o){ try{ alert('עסקה לא נמצאה'); }catch(e){} return; }
      var old=document.getElementById('secShopDetailModal'); if(old) old.remove();
      var title=(mode==='pickup')?'איסוף':((mode==='waiting')?'ממתינים':'הזמנה');
      var html='<div id="secShopDetailModal" style="position:fixed;inset:0;z-index:2460;background:rgba(0,0,0,.35);display:grid;place-items:center;padding:14px;" dir="rtl"><div id="secShopDetailBox" style="width:min(760px,95vw);max-height:86vh;overflow:auto;background:#08110f;border:1px solid rgba(255,255,255,.12);border-radius:18px;box-shadow:0 12px 40px rgba(0,0,0,.35);padding:12px;position:relative;color:#fff;"><button type="button" class="pay-close-x" id="secShopDetailCloseX" aria-label="סגור">×</button>';
      html += '<div style="font-weight:900;font-size:18px;margin:2px 0 10px;">'+escH(title)+' • '+escH(String(o.id||''))+'</div>';
      html += '<div style="display:grid;grid-template-columns:1fr;gap:6px;font-size:14px;color:#d9d9d9;"><div><b style="color:#fff;">תלמיד:</b> '+escH(orderStudentLabel(o))+'</div><div><b style="color:#fff;">סה״כ:</b> '+escH(String(Math.round(Number(o.total||0)||0)))+'₪</div><div><b style="color:#fff;">תאריך:</b> '+escH(fmtDt(o.createdAt))+'</div><div><b style="color:#fff;">סטטוס:</b> '+escH((typeof mgrOrderStatusLabel==='function')?mgrOrderStatusLabel(o.status):String(o.status||'—'))+'</div></div>';
      html += detailItemsTable(o);
      html += '<div style="display:flex;gap:8px;justify-content:flex-start;flex-wrap:wrap;margin-top:12px;"><button type="button" id="secShopDetailBtnClose" class="mgr-topbtn ghost" style="min-height:40px;">סגור</button>';
      if(mode==='pickup') html += '<button type="button" id="secShopDetailBtnDone" class="mgr-home-btn" style="min-height:40px;">נאסף</button>';
      if(mode==='orders') html += '<button type="button" id="secShopDetailBtnOrdered" class="mgr-home-btn" style="min-height:40px;">הוזמן</button>';
      html += '</div></div></div>';
      document.body.insertAdjacentHTML('beforeend', html);
      var m=document.getElementById('secShopDetailModal'), box=document.getElementById('secShopDetailBox');
      function closeM(){ try{ m&&m.remove(); }catch(e){} }
      var cx=document.getElementById('secShopDetailCloseX'), cb=document.getElementById('secShopDetailBtnClose');
      if(cx) cx.onclick=closeM; if(cb) cb.onclick=closeM;
      if(m) m.addEventListener('click', function(ev){ try{ if(box && ev && ev.target && !box.contains(ev.target)) closeM(); }catch(e){} });
      var done=document.getElementById('secShopDetailBtnDone');
      if(done) done.onclick=function(){
        try{
          var orders=readOrders(); for(var i=0;i<orders.length;i++){ if(String((orders[i]||{}).id||'')===String(orderId||'')){ orders[i].status='closed'; orders[i].updatedAt=Date.now(); break; } }
          if(typeof shopWriteOrders==='function') shopWriteOrders(orders);
          var u=String(o.username||'').trim(); if(u && u!=='אורח' && typeof pmSendToUser==='function') pmSendToUser(u,'חנות','תתחדש\nותודה על הרכישה.',{orderId:String(o.id||''),status:'closed_pickup'});
          closeM(); renderList('pickup');
        }catch(e){}
      };
      var ord=document.getElementById('secShopDetailBtnOrdered');
      if(ord) ord.onclick=function(){ try{ addWaitingId(orderId); closeM(); renderList('orders'); }catch(e){} };
    };

    var ov=document.getElementById('secShopOverlay');
    if(!ov){
      ov=document.createElement('div'); ov.id='secShopOverlay'; ov.className='overlay'; ov.style.zIndex='2410';
      ov.innerHTML='<div class="pay-modal" id="secShopRootModal" style="width:min(980px,96vw);max-width:96vw;max-height:90vh;overflow:auto;position:relative;"><button type="button" class="pay-close-x" id="secShopCloseX" aria-label="סגור">×</button><div id="secShopHost" dir="rtl"></div></div>';
      document.body.appendChild(ov);
      var c=document.getElementById('secShopCloseX'); if(c) c.onclick=function(){ try{ closeOverlay("secShopOverlay"); }catch(e){} };
      ov.addEventListener('click', function(ev){ try{ var modal=document.getElementById('secShopRootModal'); if(modal && ev && ev.target && !modal.contains(ev.target)) closeOverlay("secShopOverlay"); }catch(e){} });
    }
    var host=document.getElementById('secShopHost');
    if(host) host.innerHTML='<div style="padding:6px 2px 0;"><div style="display:flex;gap:10px;margin:0 0 14px;flex-wrap:wrap;"><button id="secShopPickupBtn" type="button" style="flex:1;min-width:120px;min-height:44px;border-radius:14px;border:1px solid rgba(80,255,160,.28);background:rgba(25,110,65,.28);color:#fff;font-weight:800;">איסוף</button><button id="secShopOrdersBtn" type="button" style="flex:1;min-width:120px;min-height:44px;border-radius:14px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.03);color:#fff;font-weight:800;">הזמנות</button><button id="secShopWaitingBtn" type="button" style="flex:1;min-width:120px;min-height:44px;border-radius:14px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.03);color:#fff;font-weight:800;">ממתינים</button></div><div id="secShopListPanel"></div></div>';
    function setTab(which){
      [['pickup','secShopPickupBtn'],['orders','secShopOrdersBtn'],['waiting','secShopWaitingBtn']].forEach(function(p){ var b=document.getElementById(p[1]); if(!b) return; var on=(p[0]===which); b.style.background=on?'rgba(25,110,65,.28)':'rgba(255,255,255,.03)'; b.style.borderColor=on?'rgba(80,255,160,.28)':'rgba(255,255,255,.14)'; });
      window.__secShopActiveTab = which; renderList(which);
    }
    var bp=document.getElementById('secShopPickupBtn'), bo=document.getElementById('secShopOrdersBtn'), bw=document.getElementById('secShopWaitingBtn');
    if(bp) bp.onclick=function(){ setTab('pickup'); }; if(bo) bo.onclick=function(){ setTab('orders'); }; if(bw) bw.onclick=function(){ setTab('waiting'); };
    setTab(window.__secShopActiveTab || 'pickup');
    try{ if(typeof openOverlay==='function') openOverlay('secShopOverlay'); }catch(e){ if(ov){ ov.classList.add('show'); ov.style.display='grid'; } }
    try{ window.__secEnsureTopBackBtn && window.__secEnsureTopBackBtn(); }catch(e){}
  };

  window.enableManagerMode = function(persist){
    try{ document.body.classList.add('manager-mode'); }catch(e){}
    if(persist !== false) safeSet('mgrMode','1');
    try{ if(typeof window.updateMenuRoleSections === 'function') window.updateMenuRoleSections(); }catch(e){}
    try{ if(typeof syncAppStateFromDOM === 'function') syncAppStateFromDOM(); }catch(e){}
    try{ if(typeof updateEdgeHandles === 'function') updateEdgeHandles(); }catch(e){}
    try{ if(typeof updateEdgeHandlePositions === 'function') updateEdgeHandlePositions(); }catch(e){}
  };

  window.disableManagerMode = function(){
    try{ document.body.classList.remove('manager-mode'); }catch(e){}
    safeDel('mgrMode');
    try{ if(typeof window.updateMenuRoleSections === 'function') window.updateMenuRoleSections(); }catch(e){}
    try{ if(typeof syncAppStateFromDOM === 'function') syncAppStateFromDOM(); }catch(e){}
    try{ if(typeof updateEdgeHandles === 'function') updateEdgeHandles(); }catch(e){}
    try{ if(typeof updateEdgeHandlePositions === 'function') updateEdgeHandlePositions(); }catch(e){}
  };

  // Apply persisted manager mode on load (only if the currently saved user is actually Manager)
  try{
    var __u = '';
    try{ __u = (DBStorage.getItem('student_username')||'').trim(); }catch(e){ __u = ''; }
    var __low = (__u||'').toLowerCase();

    
    if(safeGet('secMode') === '1' && (__u === 'מזכירה' || __low === 'secretary')){
      try{ document.body.classList.add('secretary-mode'); }catch(e){}
      setTimeout(function(){ try{ window.updateMenuRoleSections(); }catch(e){} }, 20);
    }else 
if(safeGet('mgrMode') === '1' && (__u === 'מנהל' || __low === 'manager')){
      try{ document.body.classList.add('manager-mode'); }catch(e){}
      setTimeout(function(){ try{ window.updateMenuRoleSections(); }catch(e){} }, 20);
    }else{
      // prevent "student becomes manager" after refresh
      try{ document.body.classList.remove('manager-mode'); }catch(e){}
      safeDel('mgrMode');
    }
  }catch(e){}

  window.openManagerMenuTarget = function(which){
    // Use the original manager overlay opener (it correctly prepares the overlay/views).
    // (closeManagerPanel already restores scrims, so this won't create the old "black" state.)
    try{ if(typeof window.openManagerPanel === 'function') window.openManagerPanel(); }catch(e){}

    // Show view immediately
    try{
      if(which === 'shop'){
        window.mgrShowView('mgrViewShop','ניהול חנות');
        window.mgrRenderShopLists && window.mgrRenderShopLists();
      }else if(which === 'students'){
        window.mgrShowView('mgrViewStudents','ניהול תלמידים');
        window.mgrRenderStudentResults && window.mgrRenderStudentResults('');
        try{ var inp = document.getElementById('mgrStudentSearch'); inp && inp.focus && inp.focus(); }catch(e2){}
      }else if(which === 'payments'){
        window.mgrShowView('mgrViewPayments','מעקב תשלומים');
        window.mgrRenderRecentPayments && window.mgrRenderRecentPayments();
      }else if(which === 'orders'){
        window.mgrShowView('mgrViewOrders','ניהול הזמנות');
        window.mgrRenderOrders && window.mgrRenderOrders();
      }else if(which === 'ads'){
        window.mgrShowView('mgrViewAds','עריכת לוח מודעות');
        window.mgrAdsRenderList && window.mgrAdsRenderList();
      }
    }catch(e3){}
  };

  // Hard logout for manager menu (must work on first tap)
  window.managerLogout = function(){
    try{ if(window.__suppressGhostClicks) window.__suppressGhostClicks(1400); }catch(e){}
    // kill manager mode first (so UI sections switch back)
    try{ if(typeof window.disableManagerMode === 'function') window.disableManagerMode(); }catch(e){}
    // Close overlays/menus
    try{ if(typeof window.closeManagerPanel === 'function') window.closeManagerPanel(); }catch(e){}
    try{ if(typeof window.closeMenu === 'function') window.closeMenu(); }catch(e){}
    try{ if(typeof window.closeProfileMenu === 'function') window.closeProfileMenu(); }catch(e){}
    // Logout must be immediate (and must exist!)
    try{ if(typeof window.appLogout === 'function') window.appLogout(); }catch(e2){
      // fallback: clear auth keys
      try{ DBStorage.setItem('student_logged_in','0'); }catch(e3){}
      try{ DBStorage.setItem('student_username',''); }catch(e3){}
    }
    // Force UI sync
    try{ if(typeof window.updateMenuRoleSections === 'function') window.updateMenuRoleSections(); }catch(e4){}
    try{ if(typeof window.setStudentTitle === 'function') window.setStudentTitle(); }catch(e5){}
    try{ if(typeof window.updateEdgeHandles === 'function') window.updateEdgeHandles(); }catch(e6){}
    try{ if(typeof window.updateEdgeHandlePositions === 'function') window.updateEdgeHandlePositions(); }catch(e7){}
  };

  // Bind manager logout to touch as well (first-tap reliability on Android WebView)
  
  function __bindSecretaryLogoutBtn(){
    try{
      var _slb = document.getElementById('secretaryLogoutBtn');
      if(_slb && !_slb.__secBound){
        _slb.__secBound = true;
        var fire = function(ev){
          try{ if(ev){ ev.preventDefault(); ev.stopPropagation(); if(ev.stopImmediatePropagation) ev.stopImmediatePropagation(); } }catch(_e){}
          try{ window.secretaryLogout(); }catch(_e2){}
          return false;
        };
        _slb.addEventListener('touchstart', fire, {passive:false});
        _slb.addEventListener('pointerdown', fire, true);
        _slb.addEventListener('click', fire, true);
      }
    }catch(e){}
  }

function __bindMgrLogoutBtn(){
    try{
      var _mlb = document.getElementById('managerLogoutBtn');
      if(_mlb && !_mlb.__mgrBound){
        _mlb.__mgrBound = true;
        var fire = function(ev){
          try{ if(ev){ ev.preventDefault(); ev.stopPropagation(); if(ev.stopImmediatePropagation) ev.stopImmediatePropagation(); } }catch(_e){}
          try{ window.managerLogout(); }catch(_e2){}
          return false;
        };
        _mlb.addEventListener('touchstart', fire, {passive:false});
        _mlb.addEventListener('pointerdown', fire, true);
        _mlb.addEventListener('click', fire, true);
      }
    }catch(e){}
  }
  try{
    if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function(){ __bindSecretaryLogoutBtn(); setTimeout(__bindSecretaryLogoutBtn, 120); __bindMgrLogoutBtn(); setTimeout(__bindMgrLogoutBtn, 120); });
    else{ __bindSecretaryLogoutBtn(); setTimeout(__bindSecretaryLogoutBtn, 120); __bindMgrLogoutBtn(); setTimeout(__bindMgrLogoutBtn, 120); }
  }catch(e){}

  // Keep menu sections in sync on overlay open/close
  try{
    var _origCloseMgr = window.closeManagerPanel;
    if(typeof _origCloseMgr === 'function'){
      window.closeManagerPanel = function(){
        try{ _origCloseMgr(); }catch(e){}
        try{ window.updateMenuRoleSections(); }catch(e){}
      };
    }
  }catch(e){}
})();
