export const bookFile = { url: '', name: '' };
function dbAction(action, value) {
  return new Promise((resolve, reject) => {
    let db, settled = false, request;
    const finish = (error, result) => {
      if (settled) return;
      settled = true;
      db?.close();
      if (error) reject(error); else resolve(result);
    };
    const unavailable = () => new Error('Private book storage is unavailable.');
    const failed = () => new Error('Book storage is full or unavailable.');
    try { request = indexedDB.open('applied-private-book', 1); }
    catch { finish(unavailable()); return; }
    request.onupgradeneeded = () => request.result.createObjectStore('files');
    request.onerror = () => finish(unavailable());
    request.onblocked = () => finish(unavailable());
    request.onsuccess = () => {
      db = request.result;
      // A blocked open can finish later after another tab releases its connection.
      if (settled) { db.close(); return; }
      let tx, result;
      try {
        tx = db.transaction('files', action === 'get' ? 'readonly' : 'readwrite');
        tx.oncomplete = () => finish(null, result);
        tx.onerror = tx.onabort = () => finish(failed());
        const store = tx.objectStore('files');
        const operation = action === 'put' ? store.put(value, 'book') : action === 'delete' ? store.delete('book') : store.get('book');
        operation.onsuccess = () => { result = operation.result; };
      } catch {
        try { tx?.abort(); } catch {}
        finish(failed());
      }
    };
  });
}
function replaceBook(record) {
  const url = record ? URL.createObjectURL(record.blob) : '';
  if (bookFile.url) URL.revokeObjectURL(bookFile.url);
  bookFile.url = url; bookFile.name = record?.name || '';
}
export async function loadBook() { replaceBook(await dbAction('get')); }
export async function attachBook(file) {
  if (!(file instanceof Blob) || file.size > 100 * 1024 * 1024 || await file.slice(0, 5).text() !== '%PDF-') throw new Error('Choose a valid PDF smaller than 100 MB.');
  await dbAction('put', { blob: file, name: file.name });
  replaceBook({ blob: file, name: file.name });
}
export async function removeBook() { await dbAction('delete'); replaceBook(null); }
