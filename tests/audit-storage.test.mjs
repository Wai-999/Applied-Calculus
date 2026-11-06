import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyState, STORAGE_KEY} from '../store.js';

let instance = 0;
const fresh = path => import(new URL('../'+path, import.meta.url).href+'?storage-audit='+(++instance));
function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {values, getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, String(value))};
}
function sessionEnvironment(t, storage) {
  const oldStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const oldDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
  const notices = [];
  Object.defineProperty(globalThis, 'localStorage', {configurable:true, ...storage});
  Object.defineProperty(globalThis, 'document', {configurable:true, value:{dispatchEvent: event => notices.push(event.detail)}});
  t.after(() => {
    if(oldStorage)Object.defineProperty(globalThis, 'localStorage', oldStorage);else delete globalThis.localStorage;
    if(oldDocument)Object.defineProperty(globalThis, 'document', oldDocument);else delete globalThis.document;
  });
  return notices;
}

test('Blocked browser storage cannot prevent the learning session from starting', async t => {
  const notices = sessionEnvironment(t, {get(){throw new DOMException('Blocked', 'SecurityError');}});
  const session = await fresh('src/core/session.js');
  assert.deepEqual(session.state.notes, {});
  session.state.notes['1.1'] = 'Keep this note available for export.';
  assert.equal(session.save(), false);
  assert.equal(session.state.notes['1.1'], 'Keep this note available for export.');
  assert.match(notices.at(-1), /Storage is full or unavailable/);
});

test('Quota failure reports unsaved state, preserves the prior backup, and can retry', async t => {
  const original = emptyState();original.notes['1.1'] = 'Previously saved';
  const storage = memoryStorage({[STORAGE_KEY]:JSON.stringify(original)}), notices = sessionEnvironment(t, {value:storage});
  const session = await fresh('src/core/session.js');
  session.state.notes['1.1'] = 'New reasoning that must not be claimed as saved';
  const write = storage.setItem;
  storage.setItem = () => {throw new DOMException('Full', 'QuotaExceededError');};
  assert.equal(session.save(), false);
  assert.equal(JSON.parse(storage.getItem(STORAGE_KEY)).notes['1.1'], 'Previously saved');
  assert.equal(session.state.notes['1.1'], 'New reasoning that must not be claimed as saved');
  assert.equal(notices.length, 1);
  storage.setItem = write;
  assert.equal(session.save(), true);
  assert.equal(JSON.parse(storage.getItem(STORAGE_KEY)).notes['1.1'], session.state.notes['1.1']);
});

test('Restoring in memory reports a failed write without losing the imported notes', async t => {
  const storage = memoryStorage();sessionEnvironment(t, {value:storage});
  const session = await fresh('src/core/session.js'), backup = emptyState();
  backup.notes['2.4'] = 'The rate is in dollars per item.';backup.studio = {language:'my'};
  storage.setItem = () => {throw new DOMException('Full', 'QuotaExceededError');};
  assert.equal(session.replaceState(backup), false);
  assert.equal(session.state.notes['2.4'], backup.notes['2.4']);
  assert.equal(session.state.studio.language, 'my');
  assert.equal(storage.getItem(STORAGE_KEY), null);
});

test('Malformed optional concept records cannot break the workspace or invent mastery', async t => {
  const backup = emptyState();backup.notes['1.1'] = 'Valid note survives';
  backup.studio = {concepts:{
    '1.1':null,
    '1.2':{correct:true, independent:'true', at:100},
    '1.3':{correct:false, independent:true, at:100},
    '1.4':{correct:true, independent:true, at:100},
    '1.5':{correct:true, independent:false, at:200},
    '9.1':{correct:true, independent:true, at:100},
  }};
  sessionEnvironment(t, {value:memoryStorage({[STORAGE_KEY]:JSON.stringify(backup)})});
  const session = await fresh('src/core/session.js');
  assert.equal(session.state.notes['1.1'], backup.notes['1.1']);
  assert.deepEqual(Object.keys(session.state.studio.concepts), ['1.4', '1.5']);
  assert.equal(Object.values(session.state.studio.concepts).filter(c => c.independent).length, 1);
  assert.equal(session.lessonMastery('1.2'), 0);
  assert.equal(session.lessonMastery('1.4'), 20);
});

test('Unreadable saved data is preserved before a new session can overwrite the primary key', async () => {
  for(const raw of ['{"notes":{"1.1":"An interrupted JSON write"}', JSON.stringify({...emptyState(),version:9,notes:{'1.1':'Future-format note'}})]){
    const store = await fresh('store.js'), storage = memoryStorage({[STORAGE_KEY]:raw});
    assert.deepEqual(store.loadState(storage), store.emptyState());
    assert.equal(storage.getItem(store.RECOVERY_KEY), raw);
    storage.setItem(STORAGE_KEY, JSON.stringify(store.emptyState()));
    const reloadedStore = await fresh('store.js');
    assert.equal(reloadedStore.loadRecoveryBackup(storage), raw);
    assert.deepEqual(reloadedStore.loadState(storage), store.emptyState());
    assert.equal(reloadedStore.loadRecoveryBackup(storage), raw);
  }
});

test('Recovery data remains downloadable in memory when quarantine storage is full', async t => {
  const store = await fresh('store.js'), raw = '{"notes":{"1.1":"Recover this original"}';
  const storage = {getItem:()=>raw,setItem(){throw new DOMException('Full', 'QuotaExceededError');}};
  assert.deepEqual(store.loadState(storage), store.emptyState());
  sessionEnvironment(t, {get(){throw new DOMException('Blocked', 'SecurityError');}});
  assert.equal(store.loadRecoveryBackup(), raw);
});
