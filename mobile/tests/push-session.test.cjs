const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function deferred() { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; }
function load(file, modules, extras = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(require('node:path').join(__dirname, '../src/utils', file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  vm.runInNewContext(code, { exports, require: name => {
    if (!modules[name]) throw Error('Unexpected import: '+name);
    return modules[name];
  }, console, setInterval: () => 1, clearInterval() {}, AbortSignal, Headers, atob, process: { env: { EXPO_PUBLIC_API_URL: 'https://api.test' } }, __DEV__: false, ...extras });
  return exports;
}
function fixture() {
  const values = new Map([['rueda_push_token','ExpoPushToken[device]']]);
  const storage = { getItem: async k => values.get(k), setItem: async (k,v) => values.set(k,v), removeItem: async k => values.delete(k), multiSet: async rows => rows.forEach(([k,v]) => values.set(k,v)) };
  let active = true, handler;
  const userStore = { get: () => ({ id: 7, token: 'session' }), isSessionActive: () => active };
  const native = { AndroidImportance: { HIGH: 5 }, setNotificationChannelAsync: async () => {}, getPermissionsAsync: async () => ({status:'granted'}),
    getExpoPushTokenAsync: async () => ({data:'ExpoPushToken[device]'}), dismissAllNotificationsAsync: async () => {}, clearLastNotificationResponseAsync: async () => {},
    setNotificationHandler: h => handler=h, addNotificationResponseReceivedListener: () => ({remove(){}}), addNotificationReceivedListener: () => ({remove(){}}), addPushTokenListener: () => ({remove(){}}), getLastNotificationResponseAsync: async () => null };
  const requests = [];
  let send = async () => ({ok:true});
  const push = load('push.ts', {
    'react-native': {Platform:{OS:'android'}}, 'expo-constants': {expoConfig:{extra:{eas:{projectId:'project'}}}}, 'expo-device':{isDevice:true},
    '@react-native-async-storage/async-storage':storage, './notificationEvents':{refreshNotifications(){}}, './userStore':{userStore}, 'expo-notifications':native,
  }, {fetch: async (_url, options) => { requests.push(options.method); return send(options); }});
  return {push, values, native, requests, setActive: v => active=v, setSend: fn => send=fn, handler: () => handler};
}
test('logout waits for registration already in flight and DELETE is last',async()=>{
  const f=fixture(), started=deferred(), response=deferred();
  f.setSend(async options=>{if(options.method==='POST'){started.resolve();await response.promise;}return {ok:true};});
  const registering=f.push.activarPush('https://api.test','session');
  await started.promise;
  f.setActive(false);
  const logout=f.push.desactivarPush('https://api.test','session',true);
  response.resolve();
  await Promise.all([registering,logout]);
  assert.deepEqual(f.requests,['POST','DELETE']);
  assert.equal(f.values.has('rueda_push_token'),false);
});
test('registration stopped before sending if logout occurs during token retrieval',async()=>{
  const f=fixture(), started=deferred(), token=deferred();
  f.native.getExpoPushTokenAsync=async()=>{started.resolve();await token.promise;return {data:'ExpoPushToken[device]'};};
  const registering=f.push.activarPush('https://api.test','session');await started.promise;
  f.setActive(false);const logout=f.push.desactivarPush('https://api.test','session',true);token.resolve();
  await Promise.all([registering,logout]);assert.deepEqual(f.requests,['DELETE']);
});
test('failed revocation retains token and rejects logout for a retry',async()=>{
  const f=fixture();f.setSend(async()=>({ok:false}));
  await assert.rejects(f.push.desactivarPush('https://api.test','session',true));
  assert.equal(f.values.get('rueda_push_token'),'ExpoPushToken[device]');
});
test('foreground banners only show for the current active account',async()=>{
  const f=fixture();const stop=await f.push.escucharPush(()=>false);
  const notification=id=>({request:{content:{data:{usuarioId:id}}}});
  assert.equal((await f.handler().handleNotification(notification(7))).shouldShowBanner,true);
  assert.equal((await f.handler().handleNotification(notification(8))).shouldShowBanner,false);
  f.setActive(false);
  assert.equal((await f.handler().handleNotification(notification(7))).shouldShowBanner,false);stop();
});
test('userStore blocks push immediately and clears session only after remote revocation',async()=>{
  const revoked=deferred(), values=new Map();
  const store=load('userStore.ts', {
    'react-native':{Platform:{OS:'android'},NativeModules:{}},'expo-constants':{},
    '@react-native-async-storage/async-storage':{setItem:async(k,v)=>values.set(k,v),removeItem:async k=>values.delete(k)},
    './push':{desactivarPush:async()=>revoked.promise},
  },{global:{fetch:async()=>({ok:true})}}).userStore;
  const token='x.'+Buffer.from(JSON.stringify({exp:Math.floor(Date.now()/1000)+3600})).toString('base64url')+'.y';
  await store.set({id:7,token});const logout=store.clear();
  assert.equal(store.isSessionActive(token),false);assert.equal(store.get().id,7);
  revoked.resolve();await logout;
  assert.equal(store.get(),null);assert.equal(values.has('rueda_current_user'),false);
});
test('failed server revocation keeps session and permits a later retry',async()=>{
  let failed=true;
  const store=load('userStore.ts', {
    'react-native':{Platform:{OS:'android'},NativeModules:{}},'expo-constants':{},
    '@react-native-async-storage/async-storage':{setItem:async()=>{},removeItem:async()=>{}},
    './push':{desactivarPush:async()=>{if(failed)throw Error('Offline');}},
  },{global:{fetch:async()=>({ok:true})}}).userStore;
  const token='x.'+Buffer.from(JSON.stringify({exp:Math.floor(Date.now()/1000)+3600})).toString('base64url')+'.y';
  await store.set({id:7,token});await assert.rejects(store.clear(),/Offline/);
  assert.equal(store.get().id,7);assert.equal(store.isSessionActive(token),true);
  failed=false;await store.clear();assert.equal(store.get(),null);
});
