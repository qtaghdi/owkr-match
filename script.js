/* =========================================
   OWKR Match — script.js (최적화 적용판)
   - 전수 탐색(10명 기준) + 편집(드래그/클릭 스왑)
   - 우선도: 탱 > 딜 > 힐 (렉시코그래픽)
   - 편집 모드: 닉네임 옆에 T/D/S 가로 표시(축약)
   - 최적화 1) 티어→점수 캐시
   - 최적화 2) 조합(10C5) 비트마스크 생성
   ========================================= */

const TEAM_SIZE = 5;
const ROLE_SLOTS = ["TANK", "DPS", "DPS", "SUPPORT", "SUPPORT"];
const ROLE_LABELS = {TANK: /^(탱|탱커|tank|t)$/i, DPS: /^(딜|딜러|dps|d)$/i, SUPPORT: /^(힐|힐러|sup|support|s)$/i};

const TIER_WORDS = [
    ["BRONZE", ["브", "브론즈", "bronze", "br", "b"]],
    ["SILVER", ["실", "실버", "silver", "sil", "s"]],
    ["GOLD", ["골", "골드", "gold", "g"]],
    ["PLATINUM", ["플레", "플", "플래티넘", "platinum", "plat", "pl"]],
    ["DIAMOND", ["다", "다이아", "diamond", "dia", "d"]],
    ["MASTER", ["마", "마스터", "master", "m"]],
    ["GRANDMASTER", ["그마", "그랜드마스터", "그", "grandmaster", "gm"]],
    ["CHAMPION", ["챔", "챔피언", "champion", "ch"]]
];
const TIER_MAP = Object.fromEntries(TIER_WORDS.map(([k, arr]) => arr.map(a => [a.toUpperCase(), k])).flat());
const TIER_INDEX = {BRONZE: 0, SILVER: 1, GOLD: 2, PLATINUM: 3, DIAMOND: 4, MASTER: 5, GRANDMASTER: 6, CHAMPION: 7};
const TIER_LABELS = {BRONZE: "브론즈", SILVER: "실버", GOLD: "골드", PLATINUM: "플래티넘", DIAMOND: "다이아", MASTER: "마스터", GRANDMASTER: "그랜드마스터", CHAMPION: "챔피언"};

function normalizeTierToken(tok){
    const u = String(tok || "").replace(/\s+/g, "").toUpperCase();
    for (const a in TIER_MAP){ if (u.startsWith(a.replace(/\s+/g,""))) return TIER_MAP[a]; }
    return "";
}
function packRank({tier, div}){ return `${TIER_LABELS[tier]} ${div}`; }
function rankScoreText(s){
    const mm = String(s||"").match(/([가-힣A-Za-z]+)\s*([1-5])\b/);
    if(!mm) return 0;
    const tierKey = normalizeTierToken(mm[1]);
    const div = parseInt(mm[2],10);
    if(!tierKey || !(tierKey in TIER_INDEX)) return 0;
    return TIER_INDEX[tierKey]*600 + (6-div)*100;
}

/* --------- 최적화 1: 점수 캐시 ---------- */
const SCORE_CACHE = new Map();
function scoreCached(s){
    const key = String(s||"");
    if (SCORE_CACHE.has(key)) return SCORE_CACHE.get(key);
    const v = rankScoreText(key);
    SCORE_CACHE.set(key, v);
    return v;
}

/* --------- 팀 내부 배치(5! 탐색) ---------- */
function permute(a){
    const r=[], u=Array(a.length).fill(false), c=[];
    (function bt(){
        if(c.length===a.length){ r.push(c.slice()); return; }
        for(let i=0;i<a.length;i++){
            if(u[i]) continue;
            u[i]=true; c.push(a[i]);
            bt(); c.pop(); u[i]=false;
        }
    })();
    return r;
}
function assignRoles(team){
    let best=null;
    function cmp(a,b){
        if(a.sumT!==b.sumT) return a.sumT-b.sumT;
        if(a.sumD!==b.sumD) return a.sumD-b.sumD;
        if(a.sumS!==b.sumS) return a.sumS-b.sumS;
        return 0;
    }
    for(const perm of permute(team)){
        const assign={TANK:[],DPS:[],SUPPORT:[]};
        let ok=true, sumT=0,sumD=0,sumS=0;
        for(let i=0;i<TEAM_SIZE;i++){
            const role=ROLE_SLOTS[i], p=perm[i];
            const val = role==="TANK" ? scoreCached(p.tank_rank)
                : role==="DPS" ? scoreCached(p.dps_rank)
                    :                scoreCached(p.support_rank);
            if(val<=0){ ok=false; break; }
            assign[role].push([p,val]);
            if(role==="TANK") sumT+=val; else if(role==="DPS") sumD+=val; else sumS+=val;
        }
        if(!ok) continue;
        const cur={sumT,sumD,sumS,assign};
        if(!best || cmp(cur,best)>0) best=cur;
    }
    return best?best.assign:null;
}
function teamPriorityValue(assign){
    let sumT=0,sumD=0,sumS=0;
    for(const [,v] of assign.TANK) sumT+=v;
    for(const [,v] of assign.DPS)  sumD+=v;
    for(const [,v] of assign.SUPPORT) sumS+=v;
    return { value: sumT*1e6 + sumD*1e3 + sumS, sums:{T:sumT,D:sumD,S:sumS} };
}

/* --------- 최적화 2: 10C5 비트마스크 조합 ---------- */
function countBits(x){ let c=0; while(x){ x&=(x-1); c++; } return c; }
function chooseIndices(n,k){
    const out=[], total = 1<<n;
    for(let mask=0; mask<total; mask++){
        if(countBits(mask)!==k) continue;
        const idxs=[];
        for(let i=0;i<n;i++) if(mask & (1<<i)) idxs.push(i);
        out.push(idxs);
    }
    return out;
}

function bestSplit10(players){
    if(players.length!==10) return null;
    const allA=chooseIndices(10,5);
    let best=null;
    for(const idxs of allA){
        const inA=new Set(idxs);
        const A=idxs.map(i=>players[i]);
        const B=players.filter((_,i)=>!inA.has(i));
        const aAssign=assignRoles(A); if(!aAssign) continue;
        const bAssign=assignRoles(B); if(!bAssign) continue;
        const aP=teamPriorityValue(aAssign), bP=teamPriorityValue(bAssign);
        const diff=Math.abs(aP.value-bP.value);
        if(!best || diff<best.diff){
            best={teams:[aAssign,bAssign], priVals:[aP.value,bP.value], sums:[aP.sums,bP.sums], diff};
        }
    }
    return best;
}

/* ---------- DOM & 입력/파서 ---------- */
function el(tag, attrs={}, children=[]){
    const e=document.createElement(tag);
    for(const [k,v] of Object.entries(attrs)){
        if(k==="class") e.className=v;
        else if(k==="text") e.textContent=v;
        else e.setAttribute(k,v);
    }
    for(const c of children) e.appendChild(c);
    return e;
}
const tbody=()=>document.querySelector("#playersTable tbody");
const countEl=()=>document.getElementById("count");
function updateCount(){ const t=tbody(); if(!t) return; countEl().textContent=t.querySelectorAll("tr").length; }
function addPlayerRow(p){
    const t=tbody(); if(!t){ toast("플레이어 테이블이 없습니다"); return; }
    const tr=el("tr");
    tr.appendChild(el("td",{text:p.name}));
    tr.appendChild(el("td",{text:p.tank_rank}));
    tr.appendChild(el("td",{text:p.dps_rank}));
    tr.appendChild(el("td",{text:p.support_rank}));
    const act=el("td",{class:"right"});
    const del=el("button",{class:"btn",text:"삭제"});
    del.addEventListener("click",()=>{ tr.remove(); updateCount(); });
    act.appendChild(del); tr.appendChild(act); t.appendChild(tr); updateCount();
}
function getPlayers(){
    const t=tbody(); if(!t){ toast("플레이어 테이블이 없습니다"); return []; }
    return [...t.querySelectorAll("tr")].map(r=>{
        const td=r.querySelectorAll("td");
        return {
            name: td[0].textContent.trim(),
            tank_rank: td[1].textContent.trim(),
            dps_rank: td[2].textContent.trim(),
            support_rank: td[3].textContent.trim()
        };
    });
}
function clearInputs(){ const x=document.getElementById("nameInput"); if(x) x.value=""; }
function initTierSelect(sel){ for(const key of Object.keys(TIER_INDEX)) sel.appendChild(el("option",{value:key, text:TIER_LABELS[key]})); }
function initDivSelect(sel){ for(let i=1;i<=5;i++) sel.appendChild(el("option",{value:String(i), text:`디비전 ${i}`})); }
function setupTierControls(prefix, defTier="DIAMOND", defDiv="3"){
    const tierSel=document.getElementById(prefix+"Tier");
    const divSel=document.getElementById(prefix+"Div");
    if(!tierSel||!divSel) return;
    initTierSelect(tierSel); initDivSelect(divSel);
    tierSel.value=defTier; divSel.value=defDiv;
}
function addRow(){
    const name=document.getElementById("nameInput")?.value.trim();
    if(!name){ toast("닉네임을 입력하세요"); return; }
    const tank=TIER_LABELS[document.getElementById("tankTier").value]+" "+document.getElementById("tankDiv").value;
    const dps =TIER_LABELS[document.getElementById("dpsTier").value]+" "+document.getElementById("dpsDiv").value;
    const sup =TIER_LABELS[document.getElementById("supTier").value]+" "+document.getElementById("supDiv").value;
    addPlayerRow({name, tank_rank:tank, dps_rank:dps, support_rank:sup});
    clearInputs();
}

/* 붙여넣기 파서 — 기본: 탱 → 딜 → 힐 */
function parsePastedLine(line){
    let raw=String(line||"").replace(/\u00A0|\u200B/g," ").replace(/／/g,"/").trim();
    if(!raw) return null;
    const roleHeadRe=/(^|[\s/])(탱|탱커|tank|t|딜|딜러|dps|d|힐|힐러|sup|support|s)\b/i;
    let parts=raw.split('/').map(s=>s.trim()).filter(Boolean);
    let name=null, slots=[];
    if(parts.length>=2 && !roleHeadRe.test(parts[0])){ name=parts[0]; slots=parts.slice(1); }
    else{
        const m=raw.match(roleHeadRe); if(!m) return null;
        const idx=m.index ?? raw.search(roleHeadRe);
        name=raw.slice(0,idx).replace(/[\/\s]+$/,'').trim();
        const rest=raw.slice(idx).trim(); if(!name) return null;
        parts=rest.split('/').map(s=>s.trim()).filter(Boolean); slots=parts;
    }
    const picked={TANK:null,DPS:null,SUPPORT:null}; const remain=[];
    const _pickRoleLabel=(s)=>{ const head=String(s).trim().split(/\s+/)[0];
        if(ROLE_LABELS.TANK.test(head)) return "TANK";
        if(ROLE_LABELS.DPS.test(head)) return "DPS";
        if(ROLE_LABELS.SUPPORT.test(head)) return "SUPPORT";
        return null;
    };
    const _parseTierTokenFree=(text)=>{
        const s=String(text||"").trim();
        let m=s.match(/([가-힣A-Za-z]+)\s*([1-5])\b/);
        if(m){ const tierKey=normalizeTierToken(m[1]); const div=parseInt(m[2],10);
            if(tierKey&&(div>=1&&div<=5)) return {tier:tierKey,div}; }
        const mw=s.match(/([가-힣A-Za-z]+)/), md=s.match(/\b([1-5])\b/);
        if(mw&&md){ const tierKey=normalizeTierToken(mw[1]); const div=parseInt(md[1],10);
            if(tierKey&&(div>=1&&div<=5)) return {tier:tierKey,div}; }
        return null;
    };
    for(const seg of slots){
        const role=_pickRoleLabel(seg);
        if(role){
            const rest=seg.replace(/^\S+\s*/,''); const tk=_parseTierTokenFree(rest);
            if(!tk) return null; picked[role]=packRank(tk);
        }else remain.push(seg);
    }
    if(!picked.TANK && !picked.DPS && !picked.SUPPORT){
        const order=["TANK","DPS","SUPPORT"];
        for(let i=0;i<Math.min(remain.length,3);i++){
            const tk=_parseTierTokenFree(remain[i]); if(!tk) return null;
            picked[order[i]]=packRank(tk);
        }
    }else{
        const order=["TANK","DPS","SUPPORT"].filter(r=>!picked[r]);
        for(let i=0;i<order.length && i<remain.length;i++){
            const tk=_parseTierTokenFree(remain[i]); if(!tk) return null;
            picked[order[i]]=packRank(tk);
        }
    }
    if(!picked.TANK||!picked.DPS||!picked.SUPPORT) return null;
    return { name, tank_rank:picked.TANK, dps_rank:picked.DPS, support_rank:picked.SUPPORT };
}
function parseAdd(){
    const box=document.getElementById("pasteBox");
    if(!box){ toast("붙여넣기 입력창이 없습니다"); return; }
    const lines=box.value.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
    let ok=0, fail=[];
    for(const line of lines){
        const p=parsePastedLine(line);
        if(p){ addPlayerRow(p); ok++; } else { fail.push(line); }
    }
    if(fail.length) toast(`파싱 실패 ${fail.length}줄`);
    if(ok) box.value="";
}

/* ---------- 매치 렌더/편집 ---------- */
let MATCH_STATE=null;
let CLICK_PICK=null;

function cloneAssignPlayers(assign){
    return {
        TANK:assign.TANK.map(([p])=>p),
        DPS:assign.DPS.map(([p])=>p),
        SUPPORT:assign.SUPPORT.map(([p])=>p)
    };
}
function computePriorityFromPlayers(teamAssign){
    let sumT=0,sumD=0,sumS=0;
    for(const p of teamAssign.TANK)    sumT+=scoreCached(p.tank_rank);
    for(const p of teamAssign.DPS)     sumD+=scoreCached(p.dps_rank);
    for(const p of teamAssign.SUPPORT) sumS+=scoreCached(p.support_rank);
    return { value: sumT*1e6 + sumD*1e3 + sumS, sums:{T:sumT,D:sumD,S:sumS} };
}

function shortRankText(s){
    const m=String(s||"").match(/([가-힣A-Za-z]+)\s*([1-5])\b/);
    if(!m) return "-";
    const tierKey=normalizeTierToken(m[1]); const div=m[2];
    if(!tierKey) return "-";
    const shortMap={BRONZE:"브",SILVER:"실",GOLD:"골",PLATINUM:"플",DIAMOND:"다",MASTER:"마",GRANDMASTER:"그",CHAMPION:"챔"};
    return (shortMap[tierKey]||"?")+div;
}
function allRoleRanksShort(player){
    return {
        T: shortRankText(player?.tank_rank),
        D: shortRankText(player?.dps_rank),
        S: shortRankText(player?.support_rank)
    };
}
function slotKey(team,role,idx){ return `${team}:${role}:${idx}`; }
function findPlayerByName(name){
    for(let ti=0;ti<2;ti++){
        const t=MATCH_STATE.teams[ti];
        for(const [role,list] of Object.entries(t)){
            for(let i=0;i<list.length;i++){ if(list[i].name===name) return {team:ti,role,idx:i}; }
        }
    }
    return null;
}
function swapSlots(a,b){
    const A=MATCH_STATE.teams[a.team][a.role][a.idx];
    const B=MATCH_STATE.teams[b.team][b.role][b.idx];
    MATCH_STATE.teams[a.team][a.role][a.idx]=B;
    MATCH_STATE.teams[b.team][b.role][b.idx]=A;
}
function moveByNameToSlot(name,target){
    const cur=findPlayerByName(name); if(!cur) return;
    if(cur.team===target.team && cur.role===target.role && cur.idx===target.idx) return;
    swapSlots(cur,target); renderMatch(MATCH_STATE.teams,true);
}
function toast(msg){
    const t=document.getElementById("toast"); if(!t) return;
    t.textContent=msg; t.classList.add("show");
    setTimeout(()=>t.classList.remove("show"),1200);
}

function renderMatch(teamsPlayersOnly, edit=true){
    const root=document.getElementById("match"); root.innerHTML="";
    const pr0=computePriorityFromPlayers(teamsPlayersOnly[0]);
    const pr1=computePriorityFromPlayers(teamsPlayersOnly[1]);
    const priVals=[pr0.value,pr1.value], sums=[pr0.sums,pr1.sums];
    const diff=Math.abs(priVals[0]-priVals[1]);

    function slotCell(teamIdx, role, label, player, rankKey, idx){
        const td=el("td");
        const wrap=el("div",{class:`slot draggable`, draggable:!!player});

        if(player){
            const r=allRoleRanksShort(player);
            const line=el("div",{style:"display:flex; flex-direction:row; align-items:center; gap:8px;"});
            const name=el("div",{class:"name", text:player.name});
            const tiers=el("div",{style:"font-size:12px; opacity:0.85; display:flex; gap:6px;"});
            tiers.textContent=`T:${r.T} / D:${r.D} / S:${r.S}`;
            line.appendChild(name); line.appendChild(tiers); wrap.appendChild(line);
        }else{
            wrap.appendChild(el("div",{class:"name", text:"-"}));
        }

        td.appendChild(wrap);
        td.dataset.team=teamIdx; td.dataset.role=role; td.dataset.idx=idx;

        if(player){
            wrap.addEventListener("dragstart",e=>{
                wrap.classList.add("dragging");
                e.dataTransfer.setData("text/plain",player.name);
            });
            wrap.addEventListener("dragend",()=>wrap.classList.remove("dragging"));
            td.addEventListener("dragover",e=>{e.preventDefault(); td.classList.add("drop-target");});
            td.addEventListener("dragleave",()=>td.classList.remove("drop-target","drop-ok"));
            td.addEventListener("dragenter",e=>{e.preventDefault(); td.classList.add("drop-ok");});
            td.addEventListener("drop",e=>{
                e.preventDefault(); td.classList.remove("drop-target","drop-ok");
                const name=e.dataTransfer.getData("text/plain");
                if(name) moveByNameToSlot(name,{team:teamIdx, role, idx});
                toast("스왑 완료");
            });

            td.addEventListener("click",()=>{
                const key=slotKey(teamIdx,role,idx);
                const cells=[...document.querySelectorAll(".roster td")];
                if(CLICK_PICK && CLICK_PICK.key!==key){
                    swapSlots(CLICK_PICK.slot,{team:teamIdx, role, idx});
                    CLICK_PICK=null; renderMatch(MATCH_STATE.teams,true); toast("스왑 완료"); return;
                }
                if(CLICK_PICK && CLICK_PICK.key===key){
                    CLICK_PICK=null; renderMatch(MATCH_STATE.teams,true); return;
                }
                CLICK_PICK={key, slot:{team:teamIdx, role, idx}};
                cells.forEach(c=>c.classList.remove("selected"));
                td.classList.add("selected");
            });
        }
        return td;
    }

    function teamCard(assign,title,priVal,sumObj,teamIdx){
        const card=el("div",{class:"team-card"});
        const head=el("div",{class:"team-title"},[
            el("h3",{text:title}),
            el("div",{class:"avg", text:`우선도 ${priVal.toLocaleString()} · T/D/S ${sumObj.T}/${sumObj.D}/${sumObj.S}`})
        ]);

        const table=el("table",{class:"roster"});
        const thead=el("thead",{},[el("tr",{},[el("th",{text:"포지션"}), el("th",{text:"닉네임"}), el("th",{text:""})])]);
        const tbody=el("tbody");

        const rows=[
            ["TANK","탱커",assign.TANK[0],"tank_rank",0],
            ["DPS","딜러 1",assign.DPS[0],"dps_rank",0],
            ["DPS","딜러 2",assign.DPS[1],"dps_rank",1],
            ["SUPPORT","힐러 1",assign.SUPPORT[0],"support_rank",0],
            ["SUPPORT","힐러 2",assign.SUPPORT[1],"support_rank",1]
        ];

        for(const [role,label,player,rankKey,idx] of rows){
            const tr=el("tr");
            tr.appendChild(el("th",{text:label}));
            tr.appendChild(slotCell(teamIdx,role,label,player,rankKey,idx));
            tr.appendChild(el("td",{text:""}));
            tbody.appendChild(tr);
        }

        table.appendChild(thead); table.appendChild(tbody);
        card.appendChild(head); card.appendChild(table);
        return card;
    }

    const left=teamCard(teamsPlayersOnly[0],"Team 1",priVals[0],sums[0],0);
    const vs=el("div",{class:"vs"},[el("div",{class:"vs-badge",text:"VS"})]);
    const right=teamCard(teamsPlayersOnly[1],"Team 2",priVals[1],sums[1],1);
    root.appendChild(left); root.appendChild(vs); root.appendChild(right);
    root.appendChild(el("div",{style:"grid-column:1 / span 3; margin-top:8px;"},[
        el("div",{class:"diff", text:`우선도 점수 차이: ${diff.toLocaleString()}`})
    ]));
}

/* ---------- 실행/버튼 ---------- */
function run(){
    const players=getPlayers();
    const root=document.getElementById("match");
    if(players.length!==10){
        root.innerHTML="";
        root.appendChild(el("div",{class:"diff", text:`정확히 10명이 필요합니다 (현재 ${players.length}명)`}));
        return;
    }
    const best=bestSplit10(players);
    if(!best){ root.innerHTML=""; root.appendChild(el("div",{class:"diff", text:"유효한 팀 조합을 찾지 못했습니다."})); return; }
    MATCH_STATE={teams:[cloneAssignPlayers(best.teams[0]), cloneAssignPlayers(best.teams[1])], editMode:true};
    CLICK_PICK=null; renderMatch(MATCH_STATE.teams,true);
    toast("팀 생성 완료 · 편집 모드 활성화");
}
function rebalance(){
    if(!MATCH_STATE){ toast("먼저 팀을 생성하세요"); return; }
    const players=[...MATCH_STATE.teams[0].TANK, ...MATCH_STATE.teams[0].DPS, ...MATCH_STATE.teams[0].SUPPORT,
        ...MATCH_STATE.teams[1].TANK, ...MATCH_STATE.teams[1].DPS, ...MATCH_STATE.teams[1].SUPPORT];
    const best=bestSplit10(players);
    if(!best){ toast("재계산 실패"); return; }
    MATCH_STATE={teams:[cloneAssignPlayers(best.teams[0]), cloneAssignPlayers(best.teams[1])], editMode:true};
    CLICK_PICK=null; renderMatch(MATCH_STATE.teams,true);
    toast("자동 균형 재계산 완료");
}

document.addEventListener("DOMContentLoaded",()=>{
    setupTierControls("tank","DIAMOND","3");
    setupTierControls("dps","DIAMOND","3");
    setupTierControls("sup","PLATINUM","3");
    document.getElementById("addRow").addEventListener("click",addRow);
    document.getElementById("parseAdd").addEventListener("click",parseAdd);
    document.getElementById("runBtn").addEventListener("click",run);
    document.getElementById("rebalanceBtn").addEventListener("click",rebalance);
    document.getElementById("toggleEdit").addEventListener("click",()=>{
        if(!MATCH_STATE){ toast("먼저 팀을 생성하세요"); return; }
        MATCH_STATE.editMode=!MATCH_STATE.editMode;
        renderMatch(MATCH_STATE.teams, MATCH_STATE.editMode);
        toast(MATCH_STATE.editMode?"편집 모드 켜짐":"편집 모드 꺼짐");
    });
    document.getElementById("clearSelect").addEventListener("click",()=>{
        CLICK_PICK=null;
        document.querySelectorAll(".roster td").forEach(td=>td.classList.remove("selected"));
    });
    updateCount();
});