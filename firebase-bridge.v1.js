(function(){
  if(window.FBBridge) return;

  var state = {
    ready:false,
    enabled:true,
    queue:[],
    flushTimer:null,
    app:null,
    db:null,
    auth:null,
    storage:null,
    sharedAdsUnsub:null,
    localBackupsUnsub:null
  };

  function log(){ try{ console.log.apply(console, ['[FBBridge]'].concat([].slice.call(arguments))); }catch(e){} }
  function nowIso(){ try{return new Date().toISOString();}catch(e){ return ''; } }
  function getSchoolId(){ return String(window.FIREBASE_APP_SCHOOL_ID || 'school_main'); }
  function getUid(){ try{ return (state.auth && state.auth.currentUser && state.auth.currentUser.uid) ? String(state.auth.currentUser.uid) : 'anonymous'; }catch(e){ return 'anonymous'; } }
  function encKey(k){ try{ return encodeURIComponent(String(k||'')); }catch(e){ return String(k||''); } }
  function canInit(){ return !!(window.firebase && window.FIREBASE_CONFIG && window.FIREBASE_CONFIG.projectId); }

  function init(){
    if(state.ready) return true;
    if(!canInit()){ log('Firebase config/sdk missing'); return false; }
    try{
      if(!firebase.apps || !firebase.apps.length){ firebase.initializeApp(window.FIREBASE_CONFIG); }
      state.app = firebase.app();
      try{ state.auth = firebase.auth(); }catch(e){}
      try{ state.db = firebase.firestore(); }catch(e){}
      try{ state.storage = firebase.storage(); }catch(e){}
      state.ready = !!state.db;
      if(state.ready){
        try{
          // non-blocking warm sync for shared localStorage backups (signup/users/messages/etc.)
          setTimeout(function(){
            try{ pullToLocalStorage(); }catch(e){}
            try{ watchLocalStorageBackups(); }catch(e){}
          }, 60);
        }catch(e){}
        try{
          // non-blocking warm sync for shared ads (all users see same board)
          setTimeout(function(){
            try{ syncSharedAdsNow(function(){}); }catch(e){}
            try{ watchSharedAds(); }catch(e){}
          }, 120);
        }catch(e){}
      }
      return state.ready;
    }catch(e){
      log('init failed', e);
      return false;
    }
  }

  function backupDocRefForKey(key){
    if(!init() || !state.db) return null;
    return state.db.collection('app_backups').doc(getSchoolId())
      .collection('local_storage').doc(encKey(key));
  }

  function writeOne(item){
    var ref = backupDocRefForKey(item && item.key);
    if(!ref) return Promise.resolve(false);
    if(item.op === 'remove'){
      return ref.delete().then(function(){ return true; });
    }
    return ref.set({
      key: String(item.key||''),
      value: String(item.value==null ? '' : item.value),
      updatedAt: nowIso(),
      updatedBy: getUid()
    }, { merge:true }).then(function(){ return true; });
  }

  function scheduleFlush(){
    if(state.flushTimer) return;
    state.flushTimer = setTimeout(function(){
      state.flushTimer = null;
      flushQueue();
    }, 350);
  }

  function queueSet(key, value){
    try{
      state.queue.push({ op:'set', key:String(key||''), value:String(value==null ? '' : value) });
      if(String(key||'') === 'adsBoardItems_v1'){
        saveSharedAdsJson(String(value==null ? '' : value)); // direct shared board sync
      }
      scheduleFlush();
    }catch(e){ log('queueSet fail', e); }
  }

  function queueRemove(key){
    try{
      state.queue.push({ op:'remove', key:String(key||'') });
      if(String(key||'') === 'adsBoardItems_v1'){
        saveSharedAdsJson('[]');
      }
      scheduleFlush();
    }catch(e){ log('queueRemove fail', e); }
  }

  function flushQueue(){
    if(!state.queue.length) return Promise.resolve(0);
    if(!init() || !state.db) return Promise.resolve(0);
    var batch = state.queue.splice(0, 40);
    return Promise.all(batch.map(function(it){
      return writeOne(it).catch(function(e){ log('write fail', it && it.key, e); return false; });
    })).then(function(){
      if(state.queue.length) scheduleFlush();
      return batch.length;
    });
  }

  function syncAllLocalStorage(){
    try{
      if(typeof localStorage === 'undefined' || !localStorage) return Promise.resolve(0);
      for(var i=0;i<localStorage.length;i++){
        var k = localStorage.key(i);
        if(!k) continue;
        queueSet(k, localStorage.getItem(k));
      }
      return flushQueue();
    }catch(e){
      log('syncAllLocalStorage fail', e);
      return Promise.reject(e);
    }
  }

  // ===== Shared ads board (all users) =====
  function sharedAdsDocRef(){
    if(!init() || !state.db) return null;
    return state.db.collection('app_shared').doc(getSchoolId()).collection('boards').doc('adsBoard_v1');
  }

  function saveSharedAdsJson(json){
    var ref = sharedAdsDocRef();
    if(!ref) return Promise.resolve(false);
    var payload = {
      json: String(json==null ? '[]' : json),
      updatedAt: nowIso(),
      updatedBy: getUid()
    };
    return ref.set(payload, { merge:true }).then(function(){ return true; }).catch(function(e){
      log('saveSharedAdsJson fail', e);
      return false;
    });
  }

  function syncSharedAdsNow(cb){
    var ref = sharedAdsDocRef();
    if(!ref){ if(typeof cb==='function') cb(false); return Promise.resolve(false); }
    return ref.get().then(function(snap){
      if(!snap || !snap.exists){ if(typeof cb==='function') cb(false); return false; }
      var d = snap.data() || {};
      var json = (typeof d.json === 'string') ? d.json : '[]';
      var changed = false;
      try{
        var cur = localStorage.getItem('adsBoardItems_v1');
        if(cur !== json){
          localStorage.setItem('adsBoardItems_v1', json);
          changed = true;
        }
      }catch(e){}
      try{
        if(changed){
          window.dispatchEvent(new CustomEvent('fb-shared-ads-updated', { detail:{ source:'cloud-pull' } }));
        }
      }catch(e){}
      if(typeof cb==='function') cb(changed);
      return changed;
    }).catch(function(e){
      log('syncSharedAdsNow fail', e);
      if(typeof cb==='function') cb(false);
      return false;
    });
  }

  function watchSharedAds(){
    if(state.sharedAdsUnsub) return true;
    var ref = sharedAdsDocRef();
    if(!ref) return false;
    try{
      state.sharedAdsUnsub = ref.onSnapshot(function(snap){
        try{
          if(!snap || !snap.exists) return;
          var d = snap.data() || {};
          var json = (typeof d.json === 'string') ? d.json : '[]';
          var cur = null;
          try{ cur = localStorage.getItem('adsBoardItems_v1'); }catch(e){}
          if(cur === json) return;
          try{ localStorage.setItem('adsBoardItems_v1', json); }catch(e){}
          try{ window.dispatchEvent(new CustomEvent('fb-shared-ads-updated', { detail:{ source:'cloud-watch' } })); }catch(e){}
        }catch(e){}
      }, function(err){ log('watchSharedAds snapshot err', err); });
      return true;
    }catch(e){
      log('watchSharedAds fail', e);
      return false;
    }
  }


  function watchLocalStorageBackups(){
    if(state.localBackupsUnsub) return true;
    if(!init() || !state.db) return false;
    try{
      var col = state.db.collection('app_backups').doc(getSchoolId()).collection('local_storage');
      state.localBackupsUnsub = col.onSnapshot(function(qs){
        try{
          var changed = 0;
          qs.docChanges().forEach(function(ch){
            try{
              var doc = ch.doc;
              var d = (doc && doc.data) ? (doc.data() || {}) : {};
              var k = (typeof d.key === 'string' && d.key) ? d.key : decodeURIComponent(String((doc && doc.id) || ''));
              if(!k) return;
              if(ch.type === 'removed'){
                try{
                  if(localStorage.getItem(k) != null){
                    localStorage.removeItem(k);
                    changed++;
                  }
                }catch(_e){}
                return;
              }
              var v = (typeof d.value === 'string') ? d.value : '';
              try{
                var cur = localStorage.getItem(k);
                if(cur === v) return;
                localStorage.setItem(k, v);
                changed++;
              }catch(_e2){}
            }catch(_inner){}
          });
          if(changed){
            try{ window.dispatchEvent(new CustomEvent('fb-local-updated', { detail:{ changed:changed, source:'cloud-watch' } })); }catch(e){}
          }
        }catch(e){}
      }, function(err){ log('watchLocalStorageBackups snapshot err', err); });
      return true;
    }catch(e){
      log('watchLocalStorageBackups fail', e);
      return false;
    }
  }

  function pullToLocalStorage(){
    if(!init() || !state.db) return Promise.resolve(0);
    var col = state.db.collection('app_backups').doc(getSchoolId()).collection('local_storage');
    return col.get().then(function(qs){
      var count = 0;
      qs.forEach(function(doc){
        try{
          var d = doc.data() || {};
          if(typeof d.key === 'string'){
            localStorage.setItem(d.key, (typeof d.value === 'string') ? d.value : '');
            count++;
          }
        }catch(e){}
      });
      try{ if(count){ window.dispatchEvent(new CustomEvent('fb-local-updated', { detail:{ changed:count, source:'cloud-pull' } })); } }catch(e){}
      return count;
    });
  }

  window.FBBridge = {
    init:init,
    state:state,
    onLocalSet:queueSet,
    onLocalRemove:queueRemove,
    flush:flushQueue,
    syncAllLocalStorage:syncAllLocalStorage,
    pullToLocalStorage:pullToLocalStorage,
    watchLocalStorageBackups:watchLocalStorageBackups,
    saveSharedAdsJson:saveSharedAdsJson,
    uploadAdMedia:uploadAdMedia,
    syncSharedAdsNow:syncSharedAdsNow,
    watchSharedAds:watchSharedAds,
    enable:function(v){ state.enabled = (v !== false); return state.enabled; }
  };

  try{
    // init ASAP; do not wait only for DOM
    init();
    if(document && document.addEventListener){
      document.addEventListener('DOMContentLoaded', function(){ try{ init(); }catch(e){} });
    }
  }catch(e){}
})();