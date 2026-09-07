const KEY = 'piukistan-save-v1';
export function loadSave(){try{const s=JSON.parse(localStorage.getItem(KEY));return s?.version===1?s:null}catch{return null}}
export function saveGame(data){localStorage.setItem(KEY,JSON.stringify({version:1,...data}))}
export function clearSave(){localStorage.removeItem(KEY)}
