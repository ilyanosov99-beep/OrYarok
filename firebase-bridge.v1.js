(function(){
  if(window.FBBridge) return;
  var state = { ready:false, enabled:true, queue:[], flushTimer:null, app:null, db:null, auth:null, storage:null };
  function log(){ try{ console.log.apply(console, ['[FBBridge]'].concat([].slice.call(arguments))); }catch(e){} }
  function nowIso(){ try{return new Date().toISOString();}catch(e){return '';} }
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
      if(state.ready){ log('ready', window.FIREBASE_CONFIG.projectId); try{ flushQueue(); }catch(e){} }
      return state.ready;
    }catch(e){ log('init failed', e); return false; }
  }
  function scheduleFlush(){ if(state.flushTimer) return; state.flushTimer = setTimeout(function(){ state.flushTimer=null; flushQueue(); }, 700); }
  function queueSet(key, value){ if(!state.enabled) return; state.queue.push({op:'set', key:String(key||''), value:(value==null?null:String(value))}); scheduleFlush(); }
  function queueRemove(key){ if(!state.enabled) return; state.queue.push({op:'remove', key:String(key||'')}); scheduleFlush(); }
  function writeOne(item){
    if(!init()) return Promise.reject(new Error('firebase not ready'));
    var ref = state.db.collection('app_backups').doc(getSchoolId()).collection('local_storage').doc(encKey(item.key));
    if(item.op==='remove'){ return ref.set({ key:item.key, deleted:true, updatedAt:nowIso(), uid:getUid() }, {merge:true}); }
    return ref.set({ key:item.key, value:item.value, deleted:false, updatedAt:nowIso(), uid:getUid() }, {merge:true});
  }
  function flushQueue(){
    if(!state.queue.length) return Promise.resolve(0);
    if(!init()) return Promise.resolve(0);
    var batch = state.queue.splice(0, 40);
    return Promise.all(batch.map(function(it){ return writeOne(it).catch(function(e){ log('write fail', it.key, e); }); }))
      .then(function(){ if(state.queue.length) scheduleFlush(); return batch.length; });
  }
  function syncAllLocalStorage(){
    try{
      if(typeof localStorage==='undefined' || !localStorage) return Promise.resolve(0);
      for(var i=0;i<localStorage.length;i++){ var k=localStorage.key(i); if(!k) continue; queueSet(k, localStorage.getItem(k)); }
      return flushQueue();
    }catch(e){ log('sync fail', e); return Promise.reject(e); }
  }
  window.FBBridge = { init:init, state:state, onLocalSet:queueSet, onLocalRemove:queueRemove, flush:flushQueue, syncAllLocalStorage:syncAllLocalStorage, enableAutoSync:function(v){ state.enabled=(v!==false); return state.enabled; } };
  try{ document.addEventListener('DOMContentLoaded', function(){ setTimeout(init, 50); }); }catch(e){}
})();
