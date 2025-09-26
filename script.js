const TEAM_SIZE=5;
const ROLE_SLOTS=["TANK","DPS","DPS","SUPPORT","SUPPORT"];
const ROLE_LABELS={ TANK:/^(탱|탱커|tank|t)$/i, DPS:/^(딜|딜러|dps|d)$/i, SUPPORT:/^(힐|힐러|sup|support|s)$/i };

const TIER_WORDS=[
  ["BRONZE",["브","브론즈","bronze","br","b"]],
  ["SILVER",["실","실버","silver","sil","s"]],
  ["GOLD",["골","골드","gold","g"]],
  ["PLATINUM",["플레","플","플래티넘","platinum","plat","pl"]],
  ["DIAMOND",["다","다이아","diamond","dia","d"]],
  ["MASTER",["마","마스터","master","m"]],
  ["GRANDMASTER",["그마","그랜드마스터","grandmaster","gm"]],
  ["CHAMPION",["챔","챔피언","champion","ch"]]
];
const TIER_MAP=Object.fromEntries(TIER_WORDS.map(([k,arr])=>arr.map(a=>[a.toUpperCase(),k])).flat());
const TIER_INDEX={BRONZE:0,SILVER:1,GOLD:2,PLATINUM:3,DIAMOND:4,MASTER:5,GRANDMASTER:6,CHAMPION:7};
const TIER_LABELS={BRONZE:"브론즈",SILVER:"실버",GOLD:"골드",PLATINUM:"플래티넘",DIAMOND:"다이아",MASTER:"마스터",GRANDMASTER:"그랜드마스터",CHAMPION:"챔피언"};

function normalizeTierToken(tok){const u=String(tok||"").replace(/\s+/g,"").toUpperCase();for(const a in TIER_MAP){if(u.startsWith(a.replace(/\s+/g,"")))return TIER_MAP[a]}return""}
function packRank({tier,div}){return `${TIER_LABELS[tier]} ${div}`}
function fmtRank(s){return s}

function rankScoreText(s){
  const mm=String(s||"").match(/([가-힣A-Za-z]+)\s*([1-5])\b/);
  if(!mm) return 0;
  const tierKey=normalizeTierToken(mm[1]); const div=parseInt(mm[2],10);
  if(!tierKey||!(tierKey in TIER_INDEX)) return 0;
  return TIER_INDEX[tierKey]*600+(6-div)*100;
}

function permute(a){const r=[],u=Array(a.length).fill(false),c=[];(function bt(){if(c.length===a.length){r.push(c.slice());return}for(let i=0;i<a.length;i++){if(u[i])continue;u[i]=true;c.push(a[i]);bt();c.pop();u[i]=false}})();return r}
function assignRoles(team){
  let best=null;
  for(const perm of permute(team)){
    const assign={TANK:[],DPS:[],SUPPORT:[]}; let total=0; let ok=true;
    for(let i=0;i<TEAM_SIZE;i++){
      const role=ROLE_SLOTS[i], p=perm[i];
      const val=role==="TANK"?rankScoreText(p.tank_rank):role==="DPS"?rankScoreText(p.dps_rank):rankScoreText(p.support_rank);
      if(val<=0){ok=false;break}
      assign[role].push([p,val]); total+=val;
    }
    if(!ok) continue;
    if(!best||total>best.total) best={total,assign};
  }
  return best?best.assign:null;
}
function teamAvg(assign){
  const sum=[...assign.TANK,...assign.DPS,...assign.SUPPORT].reduce((s, [,m])=>s+m,0);
  return sum/TEAM_SIZE;
}
function std(arr){if(arr.length<=1)return 0;const m=arr.reduce((a,b)=>a+b,0)/arr.length;const v=arr.reduce((s,x)=>s+(x-m)*(x-m),0)/arr.length;return Math.sqrt(v)}

function chooseIndices(n,k,start=0,prev=[],out=[]){
  if(prev.length===k){out.push(prev.slice());return out}
  for(let i=start;i<=n-(k-prev.length);i++) chooseIndices(n,k,i+1,[...prev,i],out);
  return out;
}
function bestSplit10(players){
  const n=players.length;
  if(n!==10) return null;
  const allA=chooseIndices(10,5);
  let best=null;
  for(const idxs of allA){
    const inA=new Set(idxs);
    const A=idxs.map(i=>players[i]);
    const B=players.filter((_,i)=>!inA.has(i));
    const aAssign=assignRoles(A); if(!aAssign) continue;
    const bAssign=assignRoles(B); if(!bAssign) continue;
    const aAvg=teamAvg(aAssign), bAvg=teamAvg(bAssign);
    const score=Math.abs(aAvg-bAvg);
    if(!best || score<best.score) best={score,aAssign,bAssign,aAvg,bAvg};
  }
  return best?{teams:[best.aAssign,best.bAssign], avgs:[best.aAvg,best.bAvg], diff:best.score}:null;
}

/* DOM + 파서 */
function el(tag,attrs={},children=[]){const e=document.createElement(tag);for(const[k,v]of Object.entries(attrs)){if(k==="class")e.className=v;else if(k==="text")e.textContent=v;else e.setAttribute(k,v)}for(const c of children)e.appendChild(c);return e}
const tbody=()=>document.querySelector("#playersTable tbody");
const countEl=()=>document.getElementById("count");
function updateCount(){countEl().textContent=tbody().querySelectorAll("tr").length}
function addPlayerRow(p){
  const tr=el("tr");
  tr.appendChild(el("td",{text:p.name}));
  tr.appendChild(el("td",{text:p.tank_rank}));
  tr.appendChild(el("td",{text:p.dps_rank}));
  tr.appendChild(el("td",{text:p.support_rank}));
  const act=el("td",{class:"right"});
  const del=el("button",{class:"btn",text:"삭제"});
  del.addEventListener("click",()=>{tr.remove(); updateCount();});
  act.appendChild(del); tr.appendChild(act); tbody().appendChild(tr); updateCount();
}
function getPlayers(){return[...tbody().querySelectorAll("tr")].map(r=>{const t=r.querySelectorAll("td");return{name:t[0].textContent.trim(),tank_rank:t[1].textContent.trim(),dps_rank:t[2].textContent.trim(),support_rank:t[3].textContent.trim()}})}
function clearInputs(){document.getElementById("nameInput").value=""}

function initTierSelect(sel){for(const key of Object.keys(TIER_INDEX)) sel.appendChild(el("option",{value:key,text:TIER_LABELS[key]}))}
function initDivSelect(sel){for(let i=1;i<=5;i++) sel.appendChild(el("option",{value:String(i),text:`디비전 ${i}`}))}
function setupTierControls(prefix,defTier="DIAMOND",defDiv="3"){
  const tierSel=document.getElementById(prefix+"Tier");
  const divSel=document.getElementById(prefix+"Div");
  initTierSelect(tierSel); initDivSelect(divSel);
  tierSel.value=defTier; divSel.value=defDiv;
}

function addRow(){
  const name=document.getElementById("nameInput").value.trim();
  if(!name){alert("닉네임을 입력하세요");return}
  const tank=TIER_LABELS[document.getElementById("tankTier").value]+" "+document.getElementById("tankDiv").value;
  const dps=TIER_LABELS[document.getElementById("dpsTier").value]+" "+document.getElementById("dpsDiv").value;
  const sup=TIER_LABELS[document.getElementById("supTier").value]+" "+document.getElementById("supDiv").value;
  addPlayerRow({name,tank_rank:tank,dps_rank:dps,support_rank:sup});
  clearInputs();
}

/* 붙여넣기 파서(이름 뒤 첫 슬래시 없어도 OK) */
function parsePastedLine(line){
  let raw=String(line||"").replace(/\u00A0|\u200B/g," ").replace(/／/g,"/").trim();
  if(!raw) return null;
  const roleHeadRe=/(^|[\s/])(탱|탱커|tank|t|딜|딜러|dps|d|힐|힐러|sup|support|s)\b/i;
  let parts=raw.split('/').map(s=>s.trim()).filter(Boolean);
  let name=null, slots=[];
  if(parts.length>=2 && !roleHeadRe.test(parts[0])){
    name=parts[0]; slots=parts.slice(1);
  }else{
    const m=raw.match(roleHeadRe); if(!m) return null;
    const idx=m.index ?? raw.search(roleHeadRe);
    name=raw.slice(0,idx).replace(/[\/\s]+$/,'').trim();
    const rest=raw.slice(idx).trim(); if(!name) return null;
    parts=rest.split('/').map(s=>s.trim()).filter(Boolean);
    slots=parts;
  }
  const picked={TANK:null,DPS:null,SUPPORT:null}; const remain=[];
  const _pickRoleLabel=(s)=>{const head=String(s).trim().split(/\s+/)[0]; if(ROLE_LABELS.TANK.test(head))return"TANK"; if(ROLE_LABELS.DPS.test(head))return"DPS"; if(ROLE_LABELS.SUPPORT.test(head))return"SUPPORT"; return null;}
  const _parseTierTokenFree=(text)=>{const s=String(text||"").trim(); let m=s.match(/([가-힣A-Za-z]+)\s*([1-5])\b/); if(m){const tierKey=normalizeTierToken(m[1]); const div=parseInt(m[2],10); if(tierKey&&(div>=1&&div<=5)) return {tier:tierKey,div}} const mw=s.match(/([가-힣A-Za-z]+)/), md=s.match(/\b([1-5])\b/); if(mw&&md){const tierKey=normalizeTierToken(mw[1]); const div=parseInt(md[1],10); if(tierKey&&(div>=1&&div<=5)) return {tier:tierKey,div}} return null;}
  for(const seg of slots){
    const role=_pickRoleLabel(seg);
    if(role){ const rest=seg.replace(/^\S+\s*/,''); const tk=_parseTierTokenFree(rest); if(!tk) return null; picked[role]=packRank(tk); }
    else remain.push(seg);
  }
  if(!picked.TANK && !picked.DPS && !picked.SUPPORT){
    const order=["DPS","TANK","SUPPORT"];
    for(let i=0;i<Math.min(remain.length,3);i++){const tk=_parseTierTokenFree(remain[i]); if(!tk) return null; picked[order[i]]=packRank(tk);}
  }else{
    const order=["DPS","TANK","SUPPORT"].filter(r=>!picked[r]);
    for(let i=0;i<order.length && i<remain.length;i++){const tk=_parseTierTokenFree(remain[i]); if(!tk) return null; picked[order[i]]=packRank(tk);}
  }
  if(!picked.DPS||!picked.TANK||!picked.SUPPORT) return null;
  return { name, tank_rank:picked.TANK, dps_rank:picked.DPS, support_rank:picked.SUPPORT };
}

function parseAdd(){
  const box=document.getElementById("pasteBox");
  const lines=box.value.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
  let ok=0, fail=[];
  for(const line of lines){
    const p=parsePastedLine(line);
    if(p){ addPlayerRow(p); ok++; } else { fail.push(line); }
  }
  if(fail.length) alert(`파싱 실패 ${fail.length}줄:\n- `+fail.slice(0,5).join("\n- ")+(fail.length>5?`\n...외 ${fail.length-5}줄`:""));
  if(ok) box.value="";
}

/* 대진 명단 렌더링 (표) */
function renderMatch(teams, avgs, diff){
  const root=document.getElementById("match");
  root.innerHTML="";

  const labels=[
    ["TANK","탱커"],
    ["DPS1","딜러 1"],
    ["DPS2","딜러 2"],
    ["SUP1","힐러 1"],
    ["SUP2","힐러 2"]
  ];

  function splitRoles(assign){
    return {
      tank: assign.TANK.map(([p])=>p),
      dps: assign.DPS.map(([p])=>p),
      sup: assign.SUPPORT.map(([p])=>p)
    };
  }
  function rowFor(roleKey, teamParts){
    const [key, label]=roleKey;
    let p, role;
    if(key==="TANK"){ p=teamParts.tank[0]; role="tank_rank"; }
    if(key==="DPS1"){ p=teamParts.dps[0]; role="dps_rank"; }
    if(key==="DPS2"){ p=teamParts.dps[1]; role="dps_rank"; }
    if(key==="SUP1"){ p=teamParts.sup[0]; role="support_rank"; }
    if(key==="SUP2"){ p=teamParts.sup[1]; role="support_rank"; }
    if(!p) return ["-","-"];
    return [p.name, p[role]];
  }

  function teamCard(assign, title, avg){
    const parts=splitRoles(assign);
    const card=el("div",{class:"team-card"});
    const head=el("div",{class:"team-title"},[
      el("h3",{text:title}),
      el("div",{class:"avg",text:`평균 점수 ${avg.toFixed(1)}`})
    ]);
    const table=el("table",{class:"roster"});
    const thead=el("thead",{},[
      el("tr",{},[
        el("th",{text:"포지션"}),
        el("th",{text:"닉네임"}),
        el("th",{text:"티어"})
      ])
    ]);
    const tbody=el("tbody");
    const roles=[["TANK","탱커"],["DPS1","딜러 1"],["DPS2","딜러 2"],["SUP1","힐러 1"],["SUP2","힐러 2"]];
    for(const r of roles){
      const [name, rank]=rowFor(r, parts);
      tbody.appendChild(el("tr",{},[
        el("th",{text:r[1]}),
        el("td",{class:"name",text:name}),
        el("td",{class:"rank",text:rank})
      ]));
    }
    table.appendChild(thead); table.appendChild(tbody);
    card.appendChild(head); card.appendChild(table);
    return card;
  }

  const left=teamCard(teams[0],"Team 1",avgs[0]);
  const vs=el("div",{class:"vs"},[
    el("div",{class:"vs-badge",text:"VS"}),
  ]);
  const right=teamCard(teams[1],"Team 2",avgs[1]);
  root.appendChild(left);
  root.appendChild(vs);
  root.appendChild(right);

  const diffLine=el("div",{class:"diff",text:`팀 평균 차이: ${diff.toFixed(1)}`});
  root.appendChild(el("div",{style:"grid-column:1 / span 3; margin-top:8px;"},[diffLine]));
}

/* 실행 */
function run(){
  const players=getPlayers();
  const root=document.getElementById("match");
  if(players.length!==10){
    root.innerHTML="";
    root.appendChild(el("div",{class:"diff",text:`정확히 10명이 필요합니다 (현재 ${players.length}명)`}));
    return;
  }
  const best=bestSplit10(players);
  if(!best){
    root.innerHTML="";
    root.appendChild(el("div",{class:"diff",text:"유효한 팀 조합을 찾지 못했습니다."}));
    return;
  }
  renderMatch(best.teams, best.avgs, best.diff);
}

/* 부트스트랩 */
document.addEventListener("DOMContentLoaded",()=>{
  setupTierControls("tank","DIAMOND","3");
  setupTierControls("dps","DIAMOND","3");
  setupTierControls("sup","PLATINUM","3");
  document.getElementById("addRow").addEventListener("click",addRow);
  document.getElementById("runBtn").addEventListener("click",run);
  document.getElementById("parseAdd").addEventListener("click",parseAdd);
  updateCount();
});
