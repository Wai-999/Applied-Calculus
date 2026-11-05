/** Keep mathematics in a common numeric form while accepting Myanmar input. */
export function normalizeDigits(value){
  return String(value).replace(/[၀-၉]/g,digit=>String(digit.charCodeAt(0)-0x1040)).replaceAll('−','-');
}
export function normalizeSearch(value){
  return normalizeDigits(value).normalize('NFC').toLocaleLowerCase().replace(/[\u200b-\u200d\ufeff]/g,'').replace(/\s+/g,' ').trim();
}
export function matchesSearch(query,...sources){
  const terms=normalizeSearch(query).split(' ').filter(Boolean);
  const text=normalizeSearch(sources.join(' '));
  return terms.every(term=>text.includes(term));
}
