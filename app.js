(function(){
const storageKey = 'milliMindMap_v2';
const canvas = document.getElementById('canvas');
const svg = document.getElementById('links');
const addBtn = document.getElementById('addNode');
const connectToggle = document.getElementById('connectToggle');
const clearBtn = document.getElementById('clearBtn');
const exportBtn = document.getElementById('exportBtn');
const importBtn = document.getElementById('importBtn');
const rolloverBtn = document.getElementById('rolloverBtn');
const periodSelect = document.getElementById('periodSelect');
const revenueValue = document.getElementById('revenueValue');
const expenseValue = document.getElementById('expenseValue');
const profitValue = document.getElementById('profitValue');
const retainedValue = document.getElementById('retainedValue');
const nodeModal = document.getElementById('nodeModal');
const nodeForm = document.getElementById('nodeForm');
const nodeModalTitle = document.getElementById('nodeModalTitle');
const nodeTitle = document.getElementById('nodeTitle');
const nodeAmount = document.getElementById('nodeAmount');
const nodeType = document.getElementById('nodeType');
const nodeNotes = document.getElementById('nodeNotes');
const cancelNodeBtn = document.getElementById('cancelNodeBtn');
const deleteNodeBtn = document.getElementById('deleteNodeBtn');
const toast = document.getElementById('toast');
let state = {nodes: [], links: [], currentPeriod: '', retainedEarnings: 0};
let mode = 'normal';
let drag = null;
let selectedForConnect = null;
let editingNodeId = null;
let toastTimeout = null;

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(error => console.warn('Service worker registration failed', error));
  });
}

function loadState(){
  const raw = localStorage.getItem(storageKey);
  if(raw){
    try{ const parsed = JSON.parse(raw); state = Object.assign(state, parsed); }
    catch(e){ console.warn('Corrupted stored state', e); }
  }
  if(!state.currentPeriod){ state.currentPeriod = createPeriodLabel(new Date()); }
  state.nodes = Array.isArray(state.nodes) ? state.nodes : [];
  state.links = Array.isArray(state.links) ? state.links : [];
  state.retainedEarnings = parseFloat(state.retainedEarnings) || 0;
  populatePeriodOptions();
  render();
}

function saveState(){
  localStorage.setItem(storageKey, JSON.stringify(state));
}

function createPeriodLabel(date){
  return date.toLocaleDateString('en-US', {month:'long', year:'numeric'});
}

function populatePeriodOptions(){
  const today = new Date();
  const periods = Array.from({length: 12}, (_,index)=>{
    const current = new Date(today.getFullYear(), today.getMonth() + index, 1);
    return createPeriodLabel(current);
  });
  periodSelect.innerHTML = periods.map(period => `
    <option value="${period}">${period}</option>
  `).join('');
  periodSelect.value = state.currentPeriod;
}

function formatMoney(amount){
  const value = Number(amount) || 0;
  const formatted = Math.abs(value).toFixed(2);
  return value < 0 ? `-$${formatted}` : `$${formatted}`;
}

function createNode(node = {}){
  const id = 'n' + Date.now() + Math.floor(Math.random() * 1000);
  const created = Object.assign({
    id,
    title: 'New Opportunity',
    amount: 0,
    type: 'Revenue',
    notes: '',
    x: 110,
    y: 80
  }, node);
  state.nodes.push(created);
  saveState();
  render();
  return created;
}

function clearAll(){
  if(!confirm('This will remove all business items, connections, and profit history. Continue?')){
    return;
  }
  state.nodes = [];
  state.links = [];
  state.retainedEarnings = 0;
  saveState();
  render();
  showToast('Workspace reset.');
}

function getCategoryAmount(node){
  if(!node) return 0;
  const value = Number(node.amount) || 0;
  if(node.type === 'Expense' || node.type === 'Liability'){
    return -Math.abs(value);
  }
  return value;
}

function updateSummary(){
  const revenue = state.nodes
    .filter(n => n.type === 'Revenue' || n.type === 'Asset')
    .reduce((sum,n) => sum + Math.max(0, Number(n.amount) || 0), 0);
  const expense = state.nodes
    .filter(n => n.type === 'Expense' || n.type === 'Liability')
    .reduce((sum,n) => sum + Math.max(0, Number(n.amount) || 0), 0);
  const netProfit = revenue - expense;

  revenueValue.textContent = formatMoney(revenue);
  expenseValue.textContent = formatMoney(expense);
  profitValue.textContent = formatMoney(netProfit);
  retainedValue.textContent = formatMoney(state.retainedEarnings);
}

function render(){
  canvas.querySelectorAll('.node').forEach(el => el.remove());
  svg.innerHTML = '';

  state.links.forEach(link => {
    const source = state.nodes.find(node => node.id === link.from);
    const target = state.nodes.find(node => node.id === link.to);
    if(!source || !target) return;
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', source.x + 90);
    line.setAttribute('y1', source.y + 48);
    line.setAttribute('x2', target.x + 90);
    line.setAttribute('y2', target.y + 48);
    line.classList.add('linkline');
    svg.appendChild(line);
  });

  state.nodes.forEach(node => {
    const element = document.createElement('div');
    element.className = `node ${node.type.toLowerCase()}`;
    element.style.left = `${node.x}px`;
    element.style.top = `${node.y}px`;
    element.dataset.id = node.id;

    const amountLabel = node.type === 'Expense' || node.type === 'Liability'
      ? `-${formatMoney(node.amount).replace('$','')}`
      : formatMoney(node.amount);

    element.innerHTML = `
      <div class="badge"><span></span>${escapeHtml(node.type)}</div>
      <h3 class="title">${escapeHtml(node.title)}</h3>
      <div class="amount">${amountLabel}</div>
      <div class="note">${escapeHtml(node.notes || 'Tap to edit node details')}</div>
      <div class="actions"><button type="button" class="edit">Edit</button></div>
    `;

    canvas.appendChild(element);
    element.addEventListener('pointerdown', onPointerDown);
    element.addEventListener('click', event => {
      if(mode === 'connect'){
        handleConnectClick(node.id, element);
        return;
      }
    });

    element.querySelector('.edit').addEventListener('click', event => {
      event.stopPropagation(); openNodeModal(node.id);
    });
  });

  updateSummary();
}

function updateLines(){
  const lines = svg.querySelectorAll('line');
  state.links.forEach((link, index) => {
    const source = state.nodes.find(node => node.id === link.from);
    const target = state.nodes.find(node => node.id === link.to);
    const line = lines[index];
    if(!source || !target || !line) return;
    line.setAttribute('x1', source.x + 90);
    line.setAttribute('y1', source.y + 48);
    line.setAttribute('x2', target.x + 90);
    line.setAttribute('y2', target.y + 48);
  });
}

function onPointerDown(event){
  const id = this.dataset.id;
  drag = {
    id,
    offsetX: event.clientX - this.getBoundingClientRect().left,
    offsetY: event.clientY - this.getBoundingClientRect().top
  };
  this.setPointerCapture(event.pointerId);
  this.classList.add('dragging');
  this.addEventListener('pointermove', onPointerMove);
  this.addEventListener('pointerup', onPointerUp);
}

function onPointerMove(event){
  if(!drag) return;
  const target = document.querySelector(`.node[data-id="${drag.id}"]`);
  const rect = canvas.getBoundingClientRect();
  let x = event.clientX - rect.left - drag.offsetX;
  let y = event.clientY - rect.top - drag.offsetY;
  x = Math.max(0, Math.min(rect.width - 220, x));
  y = Math.max(0, Math.min(rect.height - 130, y));
  target.style.left = `${x}px`;
  target.style.top = `${y}px`;
  const node = state.nodes.find(item => item.id === drag.id);
  if(node){ node.x = x; node.y = y; }
  updateLines();
}

function onPointerUp(event){
  const target = document.querySelector(`.node[data-id="${drag.id}"]`);
  if(target){
    target.classList.remove('dragging');
    target.releasePointerCapture(event.pointerId);
    target.removeEventListener('pointermove', onPointerMove);
    target.removeEventListener('pointerup', onPointerUp);
  }
  drag = null;
  saveState();
}

function handleConnectClick(nodeId, element){
  if(selectedForConnect && selectedForConnect !== nodeId){
    state.links.push({from: selectedForConnect, to: nodeId});
    selectedForConnect = null;
    render();
    saveState();
    showToast('Nodes connected.');
    return;
  }
  selectedForConnect = nodeId;
  element.classList.add('selected');
  setTimeout(() => element.classList.remove('selected'), 700);
}

function openNodeModal(nodeId){
  const node = state.nodes.find(item => item.id === nodeId);
  editingNodeId = nodeId || null;
  nodeModalTitle.textContent = node ? 'Edit Business Item' : 'Add Business Item';
  nodeTitle.value = node ? node.title : 'New Opportunity';
  nodeAmount.value = node ? Number(node.amount).toFixed(2) : '0.00';
  nodeType.value = node ? node.type : 'Revenue';
  nodeNotes.value = node ? node.notes : '';
  deleteNodeBtn.classList.toggle('hidden', !node);
  nodeModal.classList.remove('hidden');
  nodeTitle.focus();
}

function closeNodeModal(){
  nodeModal.classList.add('hidden');
  editingNodeId = null;
  nodeForm.reset();
}

function saveNode(event){
  event.preventDefault();
  const title = nodeTitle.value.trim();
  const amount = parseFloat(nodeAmount.value) || 0;
  const type = nodeType.value;
  const notes = nodeNotes.value.trim();
  if(!title){
    return;
  }
  if(editingNodeId){
    const node = state.nodes.find(item => item.id === editingNodeId);
    if(node){
      node.title = title;
      node.amount = amount;
      node.type = type;
      node.notes = notes;
    }
    showToast('Item updated.');
  } else {
    createNode({title, amount, type, notes, x: 140 + Math.random() * 360, y: 90 + Math.random() * 180});
    showToast('Business item added to the map.');
  }
  saveState();
  render();
  closeNodeModal();
}

function deleteActiveNode(){
  if(!editingNodeId){ return; }
  if(!confirm('Delete this business item and its connections?')){ return; }
  state.nodes = state.nodes.filter(item => item.id !== editingNodeId);
  state.links = state.links.filter(link => link.from !== editingNodeId && link.to !== editingNodeId);
  saveState();
  render();
  closeNodeModal();
  showToast('Business item deleted.');
}

function rolloverProfit(){
  const revenue = state.nodes
    .filter(n => n.type === 'Revenue' || n.type === 'Asset')
    .reduce((sum,n) => sum + Math.max(0, Number(n.amount) || 0), 0);
  const expense = state.nodes
    .filter(n => n.type === 'Expense' || n.type === 'Liability')
    .reduce((sum,n) => sum + Math.max(0, Number(n.amount) || 0), 0);
  const netProfit = revenue - expense;
  if(netProfit <= 0){
    showToast('No positive profit to rollover yet.');
    return;
  }
  state.retainedEarnings = Number(state.retainedEarnings || 0) + netProfit;
  const retainedNode = state.nodes.find(n => n.type === 'Retained');
  if(retainedNode){
    retainedNode.amount = state.retainedEarnings;
    retainedNode.title = 'Retained Earnings';
  } else {
    createNode({
      title: 'Retained Earnings',
      amount: state.retainedEarnings,
      type: 'Retained',
      notes: 'Cumulative rollover capital for the business',
      x: 120,
      y: 340
    });
  }
  saveState();
  render();
  showToast(`Rolled over ${formatMoney(netProfit)} to retained earnings.`);
}

function exportState(){
  const payload = JSON.stringify(state, null, 2);
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(payload)
      .then(() => showToast('Workspace exported to clipboard.'))
      .catch(() => promptFallback(payload, 'Copy your workspace export content:'));
    return;
  }
  promptFallback(payload, 'Copy your workspace export content:');
}

function promptFallback(value, message){
  window.prompt(message, value);
}

function importState(){
  const imported = window.prompt('Paste the previously exported JSON state here.');
  if(!imported) return;
  try{
    const parsed = JSON.parse(imported);
    if(parsed && Array.isArray(parsed.nodes) && Array.isArray(parsed.links)){
      state = Object.assign(state, parsed);
      state.nodes = parsed.nodes;
      state.links = parsed.links;
      state.retainedEarnings = Number(parsed.retainedEarnings) || 0;
      state.currentPeriod = parsed.currentPeriod || state.currentPeriod;
      populatePeriodOptions();
      saveState();
      render();
      showToast('Workspace imported successfully.');
    } else {
      throw new Error('Invalid data');
    }
  } catch(error){
    showToast('Import failed. Please verify the JSON content.');
  }
}

function showToast(message){
  clearTimeout(toastTimeout);
  toast.textContent = message;
  toast.classList.remove('hidden');
  toast.classList.add('visible');
  toastTimeout = setTimeout(() => {
    toast.classList.remove('visible');
    toast.classList.add('hidden');
  }, 2800);
}

function escapeHtml(text){
  return String(text).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"})[char]);
}

addBtn.addEventListener('click', () => openNodeModal());
connectToggle.addEventListener('click', () => {
  mode = mode === 'normal' ? 'connect' : 'normal';
  connectToggle.textContent = mode === 'connect' ? 'Connecting (tap two nodes)' : 'Connect Nodes';
  selectedForConnect = null;
});
clearBtn.addEventListener('click', clearAll);
exportBtn.addEventListener('click', exportState);
importBtn.addEventListener('click', importState);
rolloverBtn.addEventListener('click', rolloverProfit);
periodSelect.addEventListener('change', () => { state.currentPeriod = periodSelect.value; saveState(); showToast(`Current period set to ${state.currentPeriod}`); });
nodeForm.addEventListener('submit', saveNode);
cancelNodeBtn.addEventListener('click', closeNodeModal);
deleteNodeBtn.addEventListener('click', deleteActiveNode);
window.addEventListener('resize', updateLines);
nodeModal.addEventListener('click', event => { if(event.target === nodeModal) closeNodeModal(); });
loadState();
})();