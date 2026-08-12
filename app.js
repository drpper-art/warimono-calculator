const $ = (s, root=document) => root.querySelector(s);
const $$ = (s, root=document) => [...root.querySelectorAll(s)];

function n(v){ const x=parseFloat(v); return Number.isFinite(x)?x:0; }
function fmt(v, digits=1){
  if(!Number.isFinite(v)) return "—";
  const rounded = Math.round(v * (10**digits)) / (10**digits);
  return rounded.toLocaleString("ja-JP",{maximumFractionDigits:digits});
}
function gcdInt(a,b){ a=Math.abs(a);b=Math.abs(b);while(b){[a,b]=[b,a%b]}return a||1; }
function ratioFromValues(values){
  const positives=values.filter(v=>v>0);
  if(positives.length<2) return positives.length===1 ? "1" : "—";
  const scaled=positives.map(v=>Math.round(v*10));
  let g=scaled[0]; for(const v of scaled.slice(1)) g=gcdInt(g,v);
  let simple=scaled.map(v=>v/g);
  if(Math.max(...simple)>50){
    const min=Math.min(...positives);
    simple=positives.map(v=>Math.round((v/min)*10)/10);
  }
  return simple.map(v=>fmt(v,1)).join(" : ");
}

const rows = $("#mixRows");
const tpl = $("#rowTemplate");

function addRow(name="", abv="", amount="", dilution=1){
  const node=tpl.content.firstElementChild.cloneNode(true);
  $(".name",node).value=name;
  $(".abv",node).value=abv;
  $(".amount",node).value=amount;
  $(".dilution",node).value=dilution || 1;
  $$("input",node).forEach(el=>el.addEventListener("input",calcMix));
  $(".delete",node).addEventListener("click",()=>{node.remove(); if(!rows.children.length)addRow(); calcMix();});
  rows.appendChild(node);
  calcMix();
  return node;
}

function calcMix(){
  const data=$$(".mix-row",rows).map(r=>({
    name:$(".name",r).value.trim() || "材料",
    amount:n($(".amount",r).value),
    abv:n($(".abv",r).value),
    dilution:Math.max(1,n($(".dilution",r).value)||1)
  }));
  const total=data.reduce((s,x)=>s+x.amount,0);
  const alcohol=data.reduce((s,x)=>s+x.amount*(x.abv/100),0);
  const abv=total>0?alcohol/total*100:0;
  $("#mixTotal").textContent=`${fmt(total,1)} ml`;
  $("#mixAbv").textContent=`${fmt(abv,2)} %`;
  const active=data.filter(x=>x.amount>0);
  $("#mixRatio").textContent=ratioFromValues(active.map(x=>x.amount));
  $("#mixBreakdown").textContent=active.length
    ? active.map(x=>`${x.name} ${fmt(x.amount,1)}ml${x.dilution>1?`（${fmt(x.dilution,1)}倍）`:""}`).join(" / ")
    : "材料を入力すると表示されます";

  const guide=$("#dilutionGuide");
  const diluted=active.filter(x=>x.dilution>1);
  if(!diluted.length){
    guide.classList.add("hidden");
    guide.innerHTML="";
  }else{
    const lines=diluted.map(x=>{
      const requiredTotal=x.amount*x.dilution;
      const requiredDiluent=x.amount*(x.dilution-1);
      const otherAmount=Math.max(0,total-x.amount);
      const diff=otherAmount-requiredDiluent;
      let status="";
      if(Math.abs(diff)<0.05) status="✓ ちょうど";
      else if(diff>0) status=`割り材が ${fmt(diff,1)}ml 多め`;
      else status=`割り材が ${fmt(-diff,1)}ml 不足`;
      return `<div><strong>${x.name} ${fmt(x.dilution,1)}倍</strong><br>原液 ${fmt(x.amount,1)}ml → 完成時に必要な全体量 ${fmt(requiredTotal,1)}ml（原液以外 ${fmt(requiredDiluent,1)}ml）<br><b>${status}</b></div>`;
    });
    guide.innerHTML=lines.join("");
    guide.classList.remove("hidden");
  }
}

$("#addRowBtn").addEventListener("click",()=>addRow());
$$(".chips button").forEach(btn=>btn.addEventListener("click",()=>{
  const empty=$$(".mix-row",rows).find(r=>!$(".name",r).value && !$(".amount",r).value);
  const row=empty || addRow();
  $(".name",row).value=btn.dataset.name;
  $(".abv",row).value=btn.dataset.abv;
  $(".dilution",row).value=btn.dataset.dilution || 1;
  $(".amount",row).focus();
  calcMix();
}));

function calcDilute(){
  const total=n($("#diluteTotal").value), factor=n($("#diluteFactor").value);
  const base=factor>=1?total/factor:0, mixer=Math.max(0,total-base);
  $("#diluteBase").textContent=`${fmt(base,1)} ml`;
  $("#diluteMixer").textContent=`${fmt(mixer,1)} ml`;
  $("#diluteRatio").textContent=factor>=1?`1 : ${fmt(factor-1,1)}`:"—";
}
["#diluteTotal","#diluteFactor"].forEach(s=>$(s).addEventListener("input",calcDilute));

function calcReverse(){
  const source=n($("#reverseSourceAbv").value);
  const target=n($("#reverseTargetAbv").value);
  const total=n($("#reverseTotal").value);
  const warn=$("#reverseWarning");
  warn.classList.add("hidden"); warn.textContent="";
  let spirit=0, mixer=0;
  if(source<=0){
    warn.textContent="元のお酒の度数は0%より大きい値を入力してください。";
    warn.classList.remove("hidden");
  } else if(target>source){
    warn.textContent="目標度数は元のお酒の度数以下にしてください。";
    warn.classList.remove("hidden");
  } else {
    spirit=total*(target/source);
    mixer=Math.max(0,total-spirit);
  }
  $("#reverseSpirit").textContent=`${fmt(spirit,1)} ml`;
  $("#reverseMixer").textContent=`${fmt(mixer,1)} ml`;
  $("#reverseRatio").textContent=spirit>0?ratioFromValues([spirit,mixer]):"—";
}
["#reverseSourceAbv","#reverseTargetAbv","#reverseTotal"].forEach(s=>$(s).addEventListener("input",calcReverse));

$$(".tab").forEach(tab=>tab.addEventListener("click",()=>{
  $$(".tab").forEach(x=>x.classList.toggle("active",x===tab));
  $$(".panel").forEach(p=>p.classList.toggle("active",p.id===tab.dataset.tab));
}));

$("#resetBtn").addEventListener("click",()=>{
  rows.innerHTML="";
  addRow("カルピス原液",0,50,5);
  addRow("焼酎",25,60,1);
  addRow("炭酸水",0,140,1);
  $("#diluteTotal").value=500; $("#diluteFactor").value=5;
  $("#reverseSourceAbv").value=40; $("#reverseTargetAbv").value=5; $("#reverseTotal").value=500;
  calcDilute(); calcReverse();
});

addRow("カルピス原液",0,50,5);
addRow("焼酎",25,60,1);
addRow("炭酸水",0,140,1);
calcDilute();
calcReverse();

if("serviceWorker" in navigator){
  window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));
}
