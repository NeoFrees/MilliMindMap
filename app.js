(function(){
const storageKey='milliNodes_v1';
const canvas=document.getElementById('canvas');
const svg=document.getElementById('links');
const addBtn=document.getElementById('addNode');
const connectToggle=document.getElementById('connectToggle');
const clearBtn=document.getElementById('clearBtn');
const totalEl=document.getElementById('total');
let nodes=[];let links=[];let mode='normal';let drag=null;let selectedForConnect=null;

function load(){const raw=localStorage.getItem(storageKey);if(raw){try{const parsed=JSON.parse(raw);nodes=parsed.nodes||[];links=parsed.links||[]}catch(e){nodes=[];links=[]}}render();}
function save(){localStorage.setItem(storageKey,JSON.stringify({nodes,links}));}
function formatMoney(n){return '$'+Number(n||0).toFixed(2)}
function updateTotal(){const t=nodes.reduce((s,n)=>s+(parseFloat(n.amount)||0),0);totalEl.textContent='Total: '+formatMoney(t)}
function createNode(x=80,y=80,title='New',amount=0){const id='n'+Date.now()+Math.floor(Math.random()*1000);nodes.push({id,x,y,title,amount});save();render();}
function clearAll(){if(confirm('Clear all nodes and links?')){nodes=[];links=[];save();render();}}

function render(){canvas.querySelectorAll('.node').forEach(n=>n.remove());svg.innerHTML='';
// links
links.forEach((ln,i)=>{
 const a=nodes.find(n=>n.id===ln.from);const b=nodes.find(n=>n.id===ln.to);if(!a||!b) return;
 const line=document.createElementNS('http://www.w3.org/2000/svg','line');
 line.setAttribute('x1',a.x+60);line.setAttribute('y1',a.y+30);line.setAttribute('x2',b.x+60);line.setAttribute('y2',b.y+30);
 line.classList.add('linkline');svg.appendChild(line);
});
// nodes
nodes.forEach(n=>{
 const el=document.createElement('div');el.className='node';el.style.left=n.x+'px';el.style.top=n.y+'px';el.dataset.id=n.id;
 el.innerHTML=`<h3 class="title">${escapeHtml(n.title)}</h3><div class="meta"><div class="amount">${formatMoney(n.amount)}</div><button class="edit">Edit</button></div>`;
 canvas.appendChild(el);
 el.addEventListener('pointerdown',onPointerDown);
 el.addEventListener('dblclick',()=>editNode(n.id));
 el.querySelector('.edit').addEventListener('click',(e)=>{e.stopPropagation();editNode(n.id)});
 el.addEventListener('click',(e)=>{if(mode==='connect'){if(selectedForConnect && selectedForConnect!==n.id){links.push({from:selectedForConnect,to:n.id});selectedForConnect=null;render();save();} else {selectedForConnect=n.id;el.classList.add('selected'); setTimeout(()=>el.classList.remove('selected'),600);}}});
});
updateLinesPositions();updateTotal();}

function updateLinesPositions(){const lines=svg.querySelectorAll('line');links.forEach((ln,i)=>{const a=nodes.find(n=>n.id===ln.from);const b=nodes.find(n=>n.id===ln.to);if(!a||!b) return;const line=lines[i];if(line){line.setAttribute('x1',a.x+60);line.setAttribute('y1',a.y+30);line.setAttribute('x2',b.x+60);line.setAttribute('y2',b.y+30);}})}

function onPointerDown(e){const id=this.dataset.id;drag={id,offsetX:e.clientX - this.getBoundingClientRect().left,offsetY:e.clientY - this.getBoundingClientRect().top};this.setPointerCapture(e.pointerId);this.classList.add('dragging');
 this.addEventListener('pointermove',onPointerMove);
 this.addEventListener('pointerup',onPointerUp);
}
function onPointerMove(e){if(!drag) return;const el=document.querySelector(`.node[data-id="${drag.id}"]`);const rect=canvas.getBoundingClientRect();let nx=e.clientX - rect.left - drag.offsetX;let ny=e.clientY - rect.top - drag.offsetY;nx=Math.max(0,Math.min(rect.width-140,nx));ny=Math.max(0,Math.min(rect.height-60,ny));el.style.left=nx+'px';el.style.top=ny+'px';const node=nodes.find(n=>n.id===drag.id);node.x=nx;node.y=ny;updateLinesPositions();}
function onPointerUp(e){const el=document.querySelector(`.node[data-id="${drag.id}"]`);if(el){el.classList.remove('dragging');el.releasePointerCapture(e.pointerId);el.removeEventListener('pointermove',onPointerMove);el.removeEventListener('pointerup',onPointerUp);}drag=null;save();}

function editNode(id){const node=nodes.find(n=>n.id===id);if(!node) return;const title=prompt('Title',node.title);if(title===null) return;const amount=prompt('Amount (numbers only)',String(node.amount));if(amount===null) return;node.title=title.trim()||node.title;node.amount=parseFloat(amount)||0;save();render();}

function escapeHtml(s){return String(s).replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"})[c]);}

addBtn.addEventListener('click',()=>{const t=prompt('Node title','New'); if(t===null) return; const a=prompt('Amount','0'); if(a===null) return; createNode(40+Math.random()*400,40+Math.random()*200,t,parseFloat(a)||0);});
connectToggle.addEventListener('click',()=>{mode = mode==='normal' ? 'connect' : 'normal';connectToggle.textContent = mode==='connect'? 'Connecting (click nodes)' : 'Connect'; selectedForConnect=null;});
clearBtn.addEventListener('click',clearAll);
window.addEventListener('resize',updateLinesPositions);
load();
})();