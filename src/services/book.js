export const bookFile = { url: '', name: '' };
function dbAction(action, value) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('applied-private-book', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('files');
    request.onerror = () => reject(new Error('Private book storage is unavailable.'));
    request.onsuccess = () => {
      const db = request.result, tx = db.transaction('files', action === 'get' ? 'readonly' : 'readwrite'), store = tx.objectStore('files');
      const operation = action === 'put' ? store.put(value, 'book') : action === 'delete' ? store.delete('book') : store.get('book');
      let result; operation.onsuccess = () => { result = operation.result; };
      tx.oncomplete = () => { db.close(); resolve(result); };
      tx.onerror = () => { db.close(); reject(new Error('Book storage is full or unavailable.')); };
    };
  });
}
export async function loadBook() { const record = await dbAction('get'); if (record) { bookFile.url = URL.createObjectURL(record.blob); bookFile.name = record.name; } }
export async function attachBook(file) {
  if (file.size > 100 * 1024 * 1024 || await file.slice(0, 5).text() !== '%PDF-') throw new Error('Choose a valid PDF smaller than 100 MB.');
  await dbAction('put', { blob: file, name: file.name });
  if (bookFile.url) URL.revokeObjectURL(bookFile.url);
  bookFile.url = URL.createObjectURL(file); bookFile.name = file.name;
}
export async function removeBook() { await dbAction('delete'); if (bookFile.url) URL.revokeObjectURL(bookFile.url); bookFile.url = ''; bookFile.name = ''; }
