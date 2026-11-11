import { writeFile } from "node:fs/promises";

const GENERA = ["Aldrovanda","Byblis","Cephalotus","Craniolaria","Darlingtonia","Dionaea","Dioncophyllum","Drosera","Drosophyllum","Genlisea","Habropetalum","Heliamphora","Ibicella","Martynia","Nepenthes","Pinguicula","Proboscidea","Roridula","Sarracenia","Triphyophyllum","Utricularia"];
const BASE = "https://cpnames.carnivorousplants.org/";
const ENT = {"&nbsp;":" ","&amp;":"&","&quot;":'"',"&#039;":"'","&lt;":"<","&gt;":">","&times;":"×"};
function decode(s){return s.replace(/&[a-zA-Z#0-9]+;/g,m=>ENT[m]??m);}
function fields(block){
  const text=decode(block.replace(/<br\s*\/?>/gi,"\n").replace(/<[^>]+>/g,""));
  const f={}; let k=null;
  for(const raw of text.split("\n")){ const line=raw.trim(); if(!line) continue;
    const m=line.match(/^([A-Za-z][A-Za-z /()-]{1,30}):\s*(.*)$/);
    if(m){ k=m[1].toLowerCase().replace(/\s+/g,"_"); f[k]=m[2].trim(); }
    else if(k) f[k]=(f[k]+" "+line).trim();
  } return f;
}
const statuses = new Map();
const blank = [];
const acceptedHybrids = [];
for(const g of GENERA){
  const html=await (await fetch(BASE+"?name="+g)).text();
  const blocks=[...html.matchAll(/<code>([\s\S]*?)<\/code>/gi)].map(m=>m[1]);
  console.log(g, blocks.length);
  for(const b of blocks){
    const f=fields(b); const name=f.species||f.name||"";
    if(!name) continue;
    const st=(f.status||"(blank)");
    statuses.set(st,(statuses.get(st)||0)+1);
    const hy = /[×]|\sx\s/i.test(name) || /\s\*\s/.test(f.synonym||"") || /hybrid|parentage/i.test(f.comment||"");
    if(st==="(blank)") blank.push({g,name,type:f.type||"",countries:f.countries||"",synonym:f.synonym||"",comment:f.comment||"",fam:f.classification||""});
    if(hy && st.toLowerCase().startsWith("accepted")) acceptedHybrids.push({g,name,status:st,countries:f.countries||"",synonym:f.synonym||"",comment:f.comment||""});
  }
}
console.log("STATUSES", [...statuses.entries()].sort((a,b)=>b[1]-a[1]));
console.log("BLANK count", blank.length);
console.log("BLANK with countries", blank.filter(x=>x.countries).length);
console.log("BLANK hybrid-ish", blank.filter(x=>/priority for parentage|\s\*\s/i.test(x.synonym+x.comment)).length);
console.log("ACCEPTED HYBRIDS", acceptedHybrids.length, acceptedHybrids.slice(0,10));
await writeFile(process.env.TEMP+"/blank-status.json", JSON.stringify(blank,null,2));
await writeFile(process.env.TEMP+"/accepted-hybrids.json", JSON.stringify(acceptedHybrids,null,2));
