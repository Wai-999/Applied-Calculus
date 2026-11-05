export const PALETTES={
  light:{paper:'#fbfcf6',white:'#fffefa','surface-soft':'#edf3e4',ink:'#173b2e',muted:'#40564a',green:'#285e40',accent:'#436333',deep:'#214e3c',border:'#b9c9b0'},
  dark:{paper:'#0f211a',white:'#193126','surface-soft':'#203b2b',ink:'#f4f8ec',muted:'#d0ddc7',green:'#d2e9b8',accent:'#c2e09b',deep:'#365d3e',border:'#60775a'}
};
export const READING_SIZES={
  comfortable:{label:'Comfortable',pixels:20},
  large:{label:'Large',pixels:23},
  extra:{label:'Extra large',pixels:26}
};
export function nextReadingSize(current){const keys=Object.keys(READING_SIZES);return keys[(keys.indexOf(current)+1)%keys.length];}
