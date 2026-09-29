import { all, put } from './queries.js';
import { ALL_STORES } from './schema.js';
import { todayStr } from '../utils/dates.js';

export async function exportAllData(){
  const data={};
  for(const s of ALL_STORES) data[s]=await all(s);
  const blob = new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a=document.createElement('a'); a.href=url; a.download='sidharth-os-backup-'+todayStr()+'.json';
  document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
}

export async function importAllData(file){
  const text = await file.text();
  let data; try{ data=JSON.parse(text); }catch(e){ alert('That file is not a valid backup.'); return; }
  for(const s of ALL_STORES){ if(Array.isArray(data[s])){ for(const rec of data[s]) await put(s,rec); } }
}
