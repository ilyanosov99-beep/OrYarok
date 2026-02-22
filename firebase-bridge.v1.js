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
    localBackupsUnsub:null,
    sharedAdsJson:'[]'
  };

  var _uploadDbg = [];

  function _errObj(e){
    try{
      if(!e) return null;
      return {
        message: String(e.message || e),
        code: e.code ? String(e.code) : '',
        name: e.name ? String(e.name) : '',
        stack: e.stack ? String(e.stack).split('\n').slice(0,4).join(' | ') : ''
      };
    }catch(_e){ return { message:'err_parse_failed' }; }
  }

  function _pushUploadDbg(stage, extra){
    try{
      var row = { t: nowIso ? nowIso() : '', stage:String(stage||''), extra:(extra||null) };
      _uploadDbg.push(row);
      if(_uploadDbg.length > 120) _uploadDbg.splice(0, _uploadDbg.length - 120);
      try{ localStorage.setItem('fb_ads_upload_debug_v1', JSON.stringify(_uploadDbg)); }catch(e){}
      try{ window.__fbAdsUploadDebug = _uploadDbg.slice(); }catch(e){}
      try{ console.log('[FBBridge:UPLOAD]', row); }catch(e){}
      return row;
    }catch(e){}
  }

  function _clearUploadDbg(){
    try{ _uploadDbg = []; }catch(e){}
    try{ localStorage.removeItem('fb_ads_upload_debug_v1'); }catch(e){}
    try{ window.__fbAdsUploadDebug = []; }catch(e){}
  }

  function _getUploadDbg(){
    try{ return _uploadDbg.slice(); }catch(e){ return []; }
  }

  function _getUploadDbgText(){
    try{ return JSON.stringify(_uploadDbg, null, 2); }catch(e){ return '[]'; }
  }

var _netProbeInstalled = false;
function _ensureNetworkProbe(){
  if(_netProbeInstalled) return;
  _netProbeInstalled = true;
  try{
    if(window.fetch && !window.__fbBridgeFetchPatched){
      var _origFetch = window.fetch;
      window.fetch = function(){
        try{
          var u = arguments && arguments[0];
          var url = (typeof u === 'string') ? u : (u && u.url) || '';
          if(url && /firebasestorage|googleapis|firebaseio/i.test(String(url))){
            _pushUploadDbg('net.fetch.start', { url:String(url).slice(0,220), method: (arguments[1]&&arguments[1].method)||'GET' });
          }
        }catch(e){}
        return _origFetch.apply(this, arguments).then(function(res){
          try{
            var ru = (res && res.url) || '';
            if(ru && /firebasestorage|googleapis|firebaseio/i.test(String(ru))){
              _pushUploadDbg('net.fetch.done', { url:String(ru).slice(0,220), ok:!!res.ok, status:res.status||0, type:String(res.type||'') });
            }
          }catch(e){}
          return res;
        }).catch(function(err){
          try{ _pushUploadDbg('net.fetch.err', _errObj(err)); }catch(e){}
          throw err;
        });
      };
      window.__fbBridgeFetchPatched = true;
    }
  }catch(e){}
  try{
    if(window.XMLHttpRequest && !window.__fbBridgeXHRPatched){
      var XO = window.XMLHttpRequest.prototype.open;
      var XS = window.XMLHttpRequest.prototype.send;
      if(XO && XS){
        window.XMLHttpRequest.prototype.open = function(method, url){
          try{
            this.__fbBridgeUrl = String(url||'');
            this.__fbBridgeMethod = String(method||'GET');
          }catch(e){}
          return XO.apply(this, arguments);
        };
        window.XMLHttpRequest.prototype.send = function(){
          try{
            var x = this;
            var u = String(x.__fbBridgeUrl||'');
            if(u && /firebasestorage|googleapis|firebaseio/i.test(u)){
              _pushUploadDbg('net.xhr.start', { url:u.slice(0,220), method:String(x.__fbBridgeMethod||'GET') });
              x.addEventListener('readystatechange', function(){
                try{
                  if(x.readyState === 2){ _pushUploadDbg('net.xhr.headers', { status:x.status||0, url:u.slice(0,220) }); }
                  if(x.readyState === 4){ _pushUploadDbg('net.xhr.done', { status:x.status||0, url:u.slice(0,220) }); }
                }catch(e){}
              });
              x.addEventListener('error', function(){ try{ _pushUploadDbg('net.xhr.error', { status:x.status||0, url:u.slice(0,220) }); }catch(e){} });
              x.addEventListener('abort', function(){ try{ _pushUploadDbg('net.xhr.abort', { status:x.status||0, url:u.slice(0,220) }); }catch(e){} });
              x.addEventListener('timeout', function(){ try{ _pushUploadDbg('net.xhr.timeout', { status:x.status||0, url:u.slice(0,220) }); }catch(e){} });
            }
          }catch(e){}
          return XS.apply(this, arguments);
        };
        window.__fbBridgeXHRPatched = true;
      }
    }
  }catch(e){}
}


  function log(){ try{ console.log.apply(console, ['[FBBridge]'].concat([].slice.call(arguments))); }catch(e){} }
  function nowIso(){ try{return new Date().toISOString();}catch(e){ return ''; } }
  function getSchoolId(){ return String(window.FIREBASE_APP_SCHOOL_ID || 'school_main'); }
  function getUid(){ try{ return (state.auth && state.auth.currentUser && state.auth.currentUser.uid) ? String(state.auth.currentUser.uid) : 'anonymous'; }catch(e){ return 'anonymous'; } }
  function encKey(k){ try{ return encodeURIComponent(String(k||'')); }catch(e){ return String(k||''); } }
  function canInit(){ return !!(window.firebase && window.FIREBASE_CONFIG && window.FIREBASE_CONFIG.projectId); }

  function _storageBucketCandidates(){
    try{
      var out = [];
      var cfg = window.FIREBASE_CONFIG || {};
      var b = String((cfg && cfg.storageBucket) || (state.storage && state.storage.app && state.storage.app.options && state.storage.app.options.storageBucket) || '').trim();
      var pid = String((cfg && cfg.projectId) || '').trim();
      if(b) out.push(b.replace(/^gs:\/\//,''));
      if(pid){
        var appspot = pid + '.appspot.com';
        if(out.indexOf(appspot) < 0) out.push(appspot);
        var fsa = pid + '.firebasestorage.app';
        if(out.indexOf(fsa) < 0) out.push(fsa);
      }
      return out.filter(Boolean);
    }catch(e){ return []; }
  }

  function _storageRefForPath(path, bucketOverride){
    try{
      if(!window.firebase || !firebase.app) return null;
      var app = state.app || firebase.app();
      var st = null;
      if(bucketOverride && app && typeof app.storage === 'function'){
        try{ st = app.storage('gs://' + String(bucketOverride).replace(/^gs:\/\//,'')); }catch(e){}
      }
      if(!st) st = state.storage || (app && app.storage && app.storage());
      if(!st || !st.ref) return null;
      return st.ref().child(path);
    }catch(e){ return null; }
  }

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
        var _adsJson = normalizeSharedAdsJson(String(value==null ? '' : value));
        if(state.lastAdsQueuedJson !== _adsJson){
          state.lastAdsQueuedJson = _adsJson;
          saveSharedAdsJson(_adsJson); // direct shared board sync
        }
      }
      scheduleFlush();
    }catch(e){ log('queueSet fail', e); }
  }

  function queueRemove(key){
    try{
      state.queue.push({ op:'remove', key:String(key||'') });
      if(String(key||'') === 'adsBoardItems_v1'){
        state.lastAdsQueuedJson = '[]';
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

  function normalizeSharedAdsJson(json){
    try{
      var raw = String(json == null ? '[]' : json);
      var arr = JSON.parse(raw);
      if(!Array.isArray(arr)) return raw;
      var out = [];
      var seen = Object.create(null);
      for(var i=0;i<arr.length;i++){
        var it = arr[i];
        if(!it || typeof it !== 'object') { out.push(it); continue; }
        var key = '';
        if(it.id != null && String(it.id)) key = 'id:' + String(it.id);
        else if(it.adId != null && String(it.adId)) key = 'adId:' + String(it.adId);
        else if(it.mediaPath) key = 'mediaPath:' + String(it.mediaPath);
        else if(it.mediaUrl) key = 'mediaUrl:' + String(it.mediaUrl);
        else if(it.imageUrl) key = 'imageUrl:' + String(it.imageUrl);
        else if(it.downloadUrl) key = 'downloadUrl:' + String(it.downloadUrl);
        else {
          try{ key = 'json:' + JSON.stringify(it); }catch(e){ key = 'idx:' + i; }
        }
        if(seen[key]) continue;
        seen[key] = 1;
        out.push(it);
      }
      return JSON.stringify(out);
    }catch(e){
      return String(json == null ? '[]' : json);
    }
  }

  function saveSharedAdsJson(json){
    var ref = sharedAdsDocRef();
    if(!ref) return Promise.resolve(false);
    var normalized = normalizeSharedAdsJson(json);
    state.sharedAdsJson = normalized;
    var payload = {
      json: normalized,
      updatedAt: nowIso(),
      updatedBy: getUid()
    };
    return ref.get().then(function(snap){
      var prev = '';
      try{ prev = String((snap && snap.exists && snap.data() && snap.data().json) || ''); }catch(e){ prev = ''; }
      if(prev === normalized) return null;
      return ref.set(payload, { merge:true });
    }).then(function(){
      try{ window.dispatchEvent(new CustomEvent('fb-shared-ads-updated', { detail:{ source:'local-save', json: normalized } })); }catch(e){}
      return true;
    }).catch(function(e){
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
      var json = normalizeSharedAdsJson((typeof d.json === 'string') ? d.json : '[]');
      var changed = (state.sharedAdsJson !== json);
      state.sharedAdsJson = json;
      try{
        if(changed){
          window.dispatchEvent(new CustomEvent('fb-shared-ads-updated', { detail:{ source:'cloud-pull', json: json } }));
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
          var json = normalizeSharedAdsJson((typeof d.json === 'string') ? d.json : '[]');
          if(state.sharedAdsJson === json) return;
          state.sharedAdsJson = json;
          try{ window.dispatchEvent(new CustomEvent('fb-shared-ads-updated', { detail:{ source:'cloud-watch', json: json } })); }catch(e){}
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



  // ===== Firebase Storage uploads (shared ads media) =====
  function _safeExtFromName(name, fb){
    try{
      var m = String(name||'').toLowerCase().match(/\.([a-z0-9]{2,8})$/);
      return m ? m[1] : (fb || 'bin');
    }catch(e){ return fb || 'bin'; }
  }

  function _guessAdType(file, typeHint){
    try{
      var mt = String((file && file.type) || '').toLowerCase();
      if(typeHint === 'video' || mt.indexOf('video/') === 0) return 'video';
      return 'image';
    }catch(e){ return (typeHint === 'video') ? 'video' : 'image'; }
  }

  function _fileToDataUrl(file){
    return new Promise(function(resolve, reject){
      try{
        _pushUploadDbg('fileReader.start', { name:(file&&file.name)||'', size:(file&&file.size)||0, type:(file&&file.type)||'' });
        var r = new FileReader();
        r.onload = function(){ try{ _pushUploadDbg('fileReader.ok', { len: String(r.result||'').length }); }catch(e){} resolve(String(r.result || '')); };
        r.onerror = function(ev){ var er = (ev && ev.target && ev.target.error) || new Error('file_read_failed'); try{ _pushUploadDbg('fileReader.err', _errObj(er)); }catch(e){} reject(er); };
        r.readAsDataURL(file);
      }catch(e){ reject(e); }
    });
  }

  function _uploadRefToUrl(ref, taskOrPromise, onProgress){
    return Promise.resolve(taskOrPromise).then(function(snap){
      var r = (snap && snap.ref) ? snap.ref : ref;
      if(!r || typeof r.getDownloadURL !== 'function') throw new Error('missing_download_ref');
      return r.getDownloadURL();
    }).then(function(url){
      return String(url || '');
    });
  }

  function _putWithImageFallback(ref, file, meta, onProgress){
    return new Promise(function(resolve, reject){
      var settled = false;
      var sawProgress = false;
      var switchedToFile = false;
      var fallbackStarted = false;
      var attemptSeq = 0;
      var stallTimer = null;
      var task = null;

      function doneOk(v){ if(settled) return; settled = true; try{ if(stallTimer) clearTimeout(stallTimer); }catch(e){} resolve(v); }
      function doneErr(e){ if(settled) return; settled = true; try{ if(stallTimer) clearTimeout(stallTimer); }catch(_e){} reject(e); }

      function bindTask(taskObj, tag, onErrNext){
        try{
          if(taskObj && typeof taskObj.on === 'function'){
            taskObj.on('state_changed', function(snap){ try{ if(typeof onProgress==='function') onProgress(snap); }catch(__e){}
              try{
                var bt = (snap && snap.bytesTransferred) || 0;
                var tt = (snap && snap.totalBytes) || 0;
                if(bt > 0) sawProgress = true;
                _pushUploadDbg(tag + '.progress', { bytesTransferred:bt, totalBytes:tt, state:(snap&&snap.state)||'' });
              }catch(e){}
            }, function(err){
              try{ _pushUploadDbg(tag + '.err', _errObj(err)); }catch(e2){}
              if(typeof onErrNext === 'function') onErrNext(err);
              else doneErr(err);
            }, function(){
              try{ _pushUploadDbg(tag + '.complete', { path:(ref&&ref.fullPath)||'' }); }catch(e){}
              _uploadRefToUrl(ref, Promise.resolve(taskObj.snapshot || { ref: ref })).then(function(url){
                try{ _pushUploadDbg(tag + '.url.ok', { urlPrefix:String(url||'').slice(0,80) }); }catch(e){}
                doneOk(url);
              }).catch(function(err){
                try{ _pushUploadDbg(tag + '.url.err', _errObj(err)); }catch(e){}
                if(typeof onErrNext === 'function') onErrNext(err); else doneErr(err);
              });
            });
            return true;
          }
        }catch(e){ if(typeof onErrNext === 'function') onErrNext(e); else doneErr(e); return true; }
        return false;
      }

      function startFileFallback(reason){
        if(settled || switchedToFile || fallbackStarted) return;
        fallbackStarted = true;
        switchedToFile = true;
        sawProgress = false;
        try{ if(stallTimer) clearTimeout(stallTimer); }catch(e){}
        try{ _pushUploadDbg('upload.image.fallback.toPutFile.start', { reason:_errObj(reason) }); }catch(e){}
        try{ _pushUploadDbg('upload.image.method', { method:'put(file)', phase:'fallback' }); }catch(e){}
        try{
          task = ref.put(file, meta);
        }catch(e){
          try{ _pushUploadDbg('upload.image.fallback.toPutFile.throw', _errObj(e)); }catch(_e){}
          doneErr(e);
          return;
        }
        var localAttemptId2 = ++attemptSeq;
        if(bindTask(task, 'upload.image.put', function(err){ if(localAttemptId2 !== attemptSeq) return; doneErr(err); })){
          stallTimer = setTimeout(function(){
            if(localAttemptId2 !== attemptSeq) return;
            if(!settled && !sawProgress){
              try{ _pushUploadDbg('upload.image.put.stall0', { ms:8000, after:'putString' }); }catch(e){}
              doneErr(new Error('image_upload_stalled_after_putString_fallback'));
            }
          }, 8000);
          return;
        }
        _uploadRefToUrl(ref, task).then(function(url){ try{ _pushUploadDbg('upload.image.put.url.ok.noTaskOn', { urlPrefix:String(url||'').slice(0,80) }); }catch(e){} doneOk(url); }).catch(function(err){ try{ _pushUploadDbg('upload.image.put.url.err.noTaskOn', _errObj(err)); }catch(e){} doneErr(err); });
      }

      // WebView/Acode: prefer data_url upload first for images (put(file) often hangs at 0%).
      try{ _pushUploadDbg('upload.image.method', { method:'putString(data_url)', phase:'primary' }); }catch(e){}
      _fileToDataUrl(file).then(function(dataUrl){
        if(!dataUrl) throw new Error('empty_data_url');
        try{ _pushUploadDbg('upload.image.putString.start', { path:(ref&&ref.fullPath)||'', dataUrlLen:String(dataUrl).length }); }catch(e){}
        try{ task = ref.putString(dataUrl, 'data_url', meta); }catch(e){
          try{ _pushUploadDbg('upload.image.putString.throw', _errObj(e)); }catch(_e){}
          startFileFallback(e);
          return null;
        }
        if(task == null) return null;
        var localAttemptId1 = ++attemptSeq;
        if(bindTask(task, 'upload.image.putString', function(err){ if(localAttemptId1 !== attemptSeq) return; startFileFallback(err); })){
          stallTimer = setTimeout(function(){
            if(localAttemptId1 !== attemptSeq) return;
            if(!settled && !sawProgress){
              // Disabled automatic fallback here: it creates duplicate uploads
              // when putString is slow to emit the first progress event but still succeeds.
              try{ _pushUploadDbg('upload.image.putString.stall0', { ms:8000, fallbackDisabled:true }); }catch(e){}
            }
          }, 8000);
          return null;
        }
        return _uploadRefToUrl(ref, task).then(function(url){ try{ _pushUploadDbg('upload.image.putString.url.ok.noTaskOn', { urlPrefix:String(url||'').slice(0,80) }); }catch(e){} doneOk(url); }).catch(function(err){ try{ _pushUploadDbg('upload.image.putString.url.err.noTaskOn', _errObj(err)); }catch(e){} startFileFallback(err); });
      }).catch(function(err){
        try{ _pushUploadDbg('upload.image.putString.prep.err', _errObj(err)); }catch(e){}
        startFileFallback(err);
      });
    });
  }


var _uploadCallSeq = 0;
var _uploadSingleFlight = null;
var _uploadSingleFlightMeta = null;
function _logUploadEnv(tag){
  try{
    var cfg = (window && window.FIREBASE_CONFIG) || {};
    var app = null, bucket = '';
    try{ app = state.app || (window.firebase && firebase.app && firebase.app()); }catch(e){}
    try{ bucket = String((state.storage && state.storage.app && state.storage.app.options && state.storage.app.options.storageBucket) || (app && app.options && app.options.storageBucket) || cfg.storageBucket || ''); }catch(e){}
    var authUid = '', authReady = false, authEmail = '';
    try{
      authReady = !!(state.auth || (window.firebase && firebase.auth && firebase.auth()));
      var cu = (state.auth && state.auth.currentUser) || (authReady && firebase.auth().currentUser) || null;
      authUid = cu && cu.uid ? String(cu.uid) : '';
      authEmail = cu && cu.email ? String(cu.email) : '';
    }catch(e){}
    _pushUploadDbg(tag || 'upload.env', {
      href: String((location && location.href) || '').slice(0,220),
      ua: String((navigator && navigator.userAgent) || '').slice(0,260),
      onLine: (typeof navigator!=='undefined' && 'onLine' in navigator) ? !!navigator.onLine : null,
      protocol: String((location && location.protocol) || ''),
      host: String((location && location.host) || ''),
      hasFirebase: !!window.firebase,
      firebaseApps: (window.firebase && firebase.apps && firebase.apps.length) || 0,
      hasStorageFactory: !!(window.firebase && firebase.storage),
      stateReady: !!state.ready,
      hasStorage: !!state.storage,
      bucket: bucket,
      authReady: !!authReady,
      authUid: authUid,
      authEmail: authEmail
    });
    try{
      var a = state.auth || (window.firebase && firebase.auth && firebase.auth());
      if(a && a.currentUser && typeof a.currentUser.getIdToken === 'function'){
        a.currentUser.getIdToken(false).then(function(tok){
          try{ _pushUploadDbg('upload.env.idToken.ok', { len: String(tok||'').length }); }catch(e){}
        }).catch(function(err){
          try{ _pushUploadDbg('upload.env.idToken.err', _errObj(err)); }catch(e){}
        });
      }else{
        _pushUploadDbg('upload.env.idToken.skip', { reason:'no_current_user' });
      }
    }catch(e){ try{ _pushUploadDbg('upload.env.idToken.throw', _errObj(e)); }catch(_e){} }
  }catch(e){
    try{ _pushUploadDbg('upload.env.log.throw', _errObj(e)); }catch(_e){}
  }
}


  function _ensureUploadAuth(){
    try{
      var a = state.auth || (window.firebase && firebase.auth && firebase.auth());
      if(!a) return Promise.resolve({ auth:false, user:false });
      if(a.currentUser) return Promise.resolve({ auth:true, user:true, uid:String(a.currentUser.uid||'') });
      if(typeof a.signInAnonymously !== 'function') return Promise.resolve({ auth:true, user:false, reason:'no_signInAnonymously', hardFail:true });
      _pushUploadDbg('upload.auth.anon.start', {});
      return a.signInAnonymously().then(function(cred){
        var u = (cred && cred.user) || a.currentUser || null;
        _pushUploadDbg('upload.auth.anon.ok', { uid:(u&&u.uid)||'' });
        try{
          if(u && typeof u.getIdToken === 'function'){
            return u.getIdToken(true).then(function(tok){
              _pushUploadDbg('upload.auth.anon.idToken.ok', { len:String(tok||'').length });
              return { auth:true, user:!!u, uid:(u&&u.uid)||'' };
            }).catch(function(err){
              _pushUploadDbg('upload.auth.anon.idToken.err', _errObj(err));
              return { auth:true, user:!!u, uid:(u&&u.uid)||'' };
            });
          }
        }catch(e){}
        return { auth:true, user:!!u, uid:(u&&u.uid)||'' };
      }).catch(function(err){
        _pushUploadDbg('upload.auth.anon.err', _errObj(err));
        return { auth:true, user:false, err:_errObj(err) };
      });
    }catch(e){
      try{ _pushUploadDbg('upload.auth.anon.throw', _errObj(e)); }catch(_e){}
      return Promise.resolve({ auth:false, user:false, err:_errObj(e) });
    }
  }



  function _uploadAdMediaImpl(file, adId, typeHint, onProgress){
    try{
      _clearUploadDbg();
      _ensureNetworkProbe();
      var _callId = (++_uploadCallSeq);
      try{ window.__fbBridgeUploadInFlight = (window.__fbBridgeUploadInFlight|0) + 1; }catch(e){}
      _pushUploadDbg('uploadAdMedia.start', { callId:_callId, inFlight:(window.__fbBridgeUploadInFlight||0), name:(file&&file.name)||'', size:(file&&file.size)||0, mime:(file&&file.type)||'', adId:String(adId||''), typeHint:String(typeHint||'') });
      _logUploadEnv('upload.env.pre');
      if(!file){ _pushUploadDbg('uploadAdMedia.reject', { reason:'missing_file' }); return Promise.reject(new Error('missing_file')); }
      var _initOk = init();
      _pushUploadDbg('upload.init.result', { ok:!!_initOk, ready:!!state.ready, hasDb:!!state.db, hasAuth:!!state.auth, hasStorage:!!state.storage });
      _logUploadEnv('upload.env.postInit');
      if(!_initOk || !state.storage){ _pushUploadDbg('uploadAdMedia.reject', { reason:'storage_not_ready', ready:!!state.ready, hasStorage:!!state.storage }); try{ window.__fbBridgeUploadInFlight = Math.max(0,(window.__fbBridgeUploadInFlight|0)-1); }catch(e){} return Promise.reject(new Error('storage_not_ready')); }
      return _ensureUploadAuth().then(function(authRes){
        _logUploadEnv('upload.env.postAuth');
        try{ _pushUploadDbg('upload.auth.result', authRes||null); }catch(e){}
        if(state.auth && !(authRes && authRes.user)){
          var ae = new Error('auth_required_for_storage_upload');
          try{ ae.code = 'auth/no-current-user'; }catch(e){}
          throw ae;
        }
        var kind = _guessAdType(file, typeHint);
        var ext = _safeExtFromName(file.name, (kind === 'video' ? 'mp4' : 'jpg'));
        var base = String(adId || ('ad_' + Date.now()));
        var path = 'schools/' + encKey(getSchoolId()) + '/ads_media/' + base + '_' + Date.now() + '.' + ext;
        var meta = {
          contentType: (file && file.type) ? String(file.type) : (kind === 'video' ? 'video/mp4' : 'image/jpeg'),
          cacheControl: 'public,max-age=31536000'
        };
        var buckets = _storageBucketCandidates();
        if(!buckets.length){
          var sb = (state.storage && state.storage.app && state.storage.app.options && state.storage.app.options.storageBucket) || '';
          if(sb) buckets = [String(sb).replace(/^gs:\/\//,'')];
        }
        var bIdx = 0;
        function tryBucket(){
          var bucket = buckets[bIdx] || '';
          var ref = _storageRefForPath(path, bucket) || (state.storage && state.storage.ref && state.storage.ref().child(path));
          _pushUploadDbg('uploadAdMedia.ref.ready', { kind:kind, path:path, contentType:meta.contentType, bucket:bucket||'' });
          if(!ref) throw new Error('storage_ref_create_failed');
          var op = (kind === 'image')
            ? _putWithImageFallback(ref, file, meta, onProgress)
            : (function(){ _pushUploadDbg('upload.video.put.start', { path:path, bucket:bucket||'' }); return _uploadRefToUrl(ref, ref.put(file, meta), onProgress); })();
          return op.catch(function(err){
            var eo = _errObj(err) || {};
            var retryable = false;
            try{ retryable = /status.?0|network|stalled/i.test(String(eo.message||'')) || String(eo.code||'') === ''; }catch(e){}
            _pushUploadDbg('upload.bucket.try.err', { bucket:bucket||'', err:eo, retryable:!!retryable, nextExists: (bIdx+1)<buckets.length });
            if(retryable && (bIdx+1) < buckets.length){ bIdx++; _pushUploadDbg('upload.bucket.try.next', { bucket:buckets[bIdx] }); return tryBucket(); }
            throw err;
          });
        }
        return tryBucket().then(function(url){ _pushUploadDbg('uploadAdMedia.ok', { kind:kind, urlPrefix:String(url||'').slice(0,80) }); return url; }).catch(function(err){ _pushUploadDbg('uploadAdMedia.err', _errObj(err)); throw err; });
      }).finally(function(){ try{ window.__fbBridgeUploadInFlight = Math.max(0,(window.__fbBridgeUploadInFlight|0)-1); }catch(e){} });
    }catch(e){
      try{ _pushUploadDbg('uploadAdMedia.throw', _errObj(e)); }catch(_e){}
      try{ window.__fbBridgeUploadInFlight = Math.max(0,(window.__fbBridgeUploadInFlight|0)-1); }catch(__e){}
      return Promise.reject(e);
    }
  }

  function uploadAdMedia(file, adId, typeHint, onProgress){
    try{
      if(_uploadSingleFlight){
        try{ _pushUploadDbg('upload.singleflight.reject_duplicate', { active:true, activeCall:(_uploadSingleFlightMeta&&_uploadSingleFlightMeta.callId)||0 }); }catch(e){}
        return Promise.reject(new Error('upload_in_progress'));
      }
      _uploadSingleFlightMeta = { callId: _uploadCallSeq + 1, startedAt: Date.now() };
      _uploadSingleFlight = Promise.resolve().then(function(){
        return _uploadAdMediaImpl(file, adId, typeHint, onProgress);
      }).finally(function(){
        _uploadSingleFlight = null;
        _uploadSingleFlightMeta = null;
      });
      return _uploadSingleFlight;
    }catch(e){
      return Promise.reject(e);
    }
  }

  function uploadSharedAdsFile(file, typeHint){
    return uploadAdMedia(file, 'ad', typeHint);
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
    getSharedAdsJson:function(){ return String(state.sharedAdsJson || '[]'); },
    uploadAdMedia:uploadAdMedia,
    getUploadDebugLog:_getUploadDbg,
    getUploadDebugLogText:_getUploadDbgText,
    clearUploadDebugLog:_clearUploadDbg,
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