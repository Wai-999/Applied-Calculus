import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

// Real service code, with only the browser storage and URL boundaries controlled.
// Requests and transaction completion are separate, as in IndexedDB.
let moduleId = 0;
async function harness() {
  const h = {opens:[],created:[],revoked:[]};
  const key = '__bookAudit' + (++moduleId);
  globalThis[key] = h;
  h.indexedDB = {open(name,version) {
    const request = {name,version};
    h.opens.push(request);
    return request;
  }};
  h.URL = {
    createObjectURL(blob) {
      assert.ok(blob instanceof Blob);
      const url = 'blob:audit-' + h.created.length;
      h.created.push({url,blob});
      return url;
    },
    revokeObjectURL(url) { h.revoked.push(url); }
  };
  const source = await readFile(new URL('../src/services/book.js',import.meta.url),'utf8');
  const service = await import('data:text/javascript;base64,'+Buffer.from(`const {indexedDB,URL}=globalThis[${JSON.stringify(key)}];\n`+source).toString('base64'));
  return Object.assign(h,service);
}
const tick = () => new Promise(setImmediate);
async function nextOpen(h) {
  for(let i=0;i<20&&!h.opens.length;i++) await tick();
  assert.ok(h.opens.length,'The service should request private storage.');
  return h.opens.shift();
}
function transaction(request,{record,setupError,storeError}={}) {
  const operation = {},tx = {aborted:false,abort(){this.aborted=true;}};
  const db = {closed:0,calls:[],close(){this.closed++;},transaction(name,mode) {
    this.calls.push({name,mode});
    if(setupError) throw new Error('The connection is closing.');
    return tx;
  }};
  tx.objectStore = name => {
    assert.equal(name,'files');
    if(storeError) throw new Error('The object store is unavailable.');
    return {
      get(key) { assert.equal(key,'book');operation.kind='get';return operation; },
      put(value,key) { assert.equal(key,'book');operation.kind='put';operation.value=value;return operation; },
      delete(key) { assert.equal(key,'book');operation.kind='delete';return operation; }
    };
  };
  request.result = db;
  return {db,tx,operation,open(){request.onsuccess();},succeed() {operation.result=record;operation.onsuccess?.();},complete(){tx.oncomplete?.();}};
}
async function rejectsSoon(promise,pattern) {
  let result;
  promise.then(value=>{result={value};},error=>{result={error};});
  for(let i=0;i<20&&!result;i++) await tick();
  assert.ok(result,'A failed storage operation must settle instead of leaving the UI pending.');
  assert.match(result.error?.message||'',pattern);
}
const pdf = name => new File(['%PDF-1.4\nAudit fixture\n%%EOF'],name,{type:'application/pdf'});

test('Book attachment and removal publish URLs only after storage commits',async()=>{
  const h=await harness(),file=pdf('book.pdf'),attaching=h.attachBook(file);
  const request=await nextOpen(h),t=transaction(request);
  assert.equal(request.name,'applied-private-book');assert.equal(request.version,1);
  t.open();t.succeed();await tick();
  assert.equal(h.bookFile.url,'');assert.equal(h.created.length,0);
  assert.deepEqual(t.operation.value,{blob:file,name:'book.pdf'});
  t.complete();await attaching;
  assert.deepEqual(h.bookFile,{url:'blob:audit-0',name:'book.pdf'});
  assert.equal(t.db.closed,1);assert.equal(t.db.calls[0].mode,'readwrite');
  const removing=h.removeBook(),removed=transaction(await nextOpen(h));
  removed.open();removed.succeed();await tick();
  assert.equal(h.bookFile.url,'blob:audit-0');
  removed.complete();await removing;
  assert.deepEqual(h.bookFile,{url:'',name:''});assert.deepEqual(h.revoked,['blob:audit-0']);
});

test('Aborted book writes reject and retain the last usable attachment',async()=>{
  const h=await harness();h.bookFile.url='blob:existing';h.bookFile.name='existing.pdf';
  const attaching=h.attachBook(pdf('new.pdf')),t=transaction(await nextOpen(h));
  t.open();t.succeed();t.tx.onabort?.();
  await rejectsSoon(attaching,/Book storage is full or unavailable/);
  assert.deepEqual(h.bookFile,{url:'blob:existing',name:'existing.pdf'});
  assert.equal(t.db.closed,1);assert.deepEqual(h.revoked,[]);assert.deepEqual(h.created,[]);
});

test('Synchronous transaction or object-store failures reject and close the connection',async()=>{
  for(const failure of [{setupError:true},{storeError:true}]) {
    const h=await harness(),loading=h.loadBook(),t=transaction(await nextOpen(h),failure);
    assert.doesNotThrow(()=>t.open());
    await rejectsSoon(loading,/Book storage is full or unavailable/);
    assert.equal(t.db.closed,1);
    if(failure.storeError) assert.equal(t.tx.aborted,true);
  }
});

test('Blocked private storage rejects promptly and closes an eventual late connection',async()=>{
  const h=await harness(),loading=h.loadBook(),request=await nextOpen(h);
  request.onblocked?.();
  await rejectsSoon(loading,/Private book storage is unavailable/);
  const t=transaction(request);t.open();
  assert.equal(t.db.closed,1);assert.deepEqual(t.db.calls,[]);
  assert.deepEqual(h.bookFile,{url:'',name:''});
});

test('Repeated book loads release old URLs and clear a removed stored attachment',async()=>{
  const h=await harness(),record={blob:pdf('saved.pdf'),name:'saved.pdf'};
  for(let i=0;i<2;i++) {
    const loading=h.loadBook(),t=transaction(await nextOpen(h),{record});
    t.open();t.succeed();t.complete();await loading;
    assert.equal(t.db.calls[0].mode,'readonly');assert.equal(t.db.closed,1);
  }
  assert.equal(h.bookFile.url,'blob:audit-1');assert.deepEqual(h.revoked,['blob:audit-0']);
  const loading=h.loadBook(),empty=transaction(await nextOpen(h));
  empty.open();empty.succeed();empty.complete();await loading;
  assert.deepEqual(h.bookFile,{url:'',name:''});assert.deepEqual(h.revoked,['blob:audit-0','blob:audit-1']);
});

test('Unavailable storage and invalid files fail safely without replacing a book',async()=>{
  const h=await harness();h.bookFile.url='blob:existing';h.bookFile.name='existing.pdf';
  for(const file of [null,{},new File(['not a pdf'],'bad.pdf',{type:'application/pdf'})]) {
    await assert.rejects(h.attachBook(file),/Choose a valid PDF smaller than 100 MB/);
  }
  assert.equal(h.opens.length,0);
  h.indexedDB.open=()=>{throw new DOMException('Denied','SecurityError');};
  await assert.rejects(h.loadBook(),/Private book storage is unavailable/);
  assert.deepEqual(h.bookFile,{url:'blob:existing',name:'existing.pdf'});assert.deepEqual(h.revoked,[]);
});
