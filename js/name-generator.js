(function(){

  "use strict";

  var STORAGE_KEY = 'sge-nomes-padronizados';

  function el(tag, attrs, children){
    var node = document.createElement(tag);
    attrs = attrs || {};
    Object.keys(attrs).forEach(function(k){
      if (k === 'text') node.textContent = attrs[k];
      else if (k === 'class') node.className = attrs[k];
      else node.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function(c){ node.appendChild(c); });
    return node;
  }

  function pad2(n){ return String(n).padStart(2, '0'); }

  function populateNumberSelect(select, max){
    for (var i = 1; i <= max; i++){
      var opt = document.createElement('option');
      opt.value = pad2(i);
      opt.textContent = pad2(i);
      select.appendChild(opt);
    }
  }

  var tramoNumSel = document.getElementById('tramoNum');
  var elementoSel = document.getElementById('elemento');
  var elementoNumSel = document.getElementById('elementoNum');
  var previewEl = document.getElementById('namePreview');
  var listEl = document.getElementById('namesList');
  var emptyEl = document.getElementById('namesEmptyState');
  var countEl = document.getElementById('namesCount');

  if (!tramoNumSel) return; // aba nao presente nesta pagina

  populateNumberSelect(tramoNumSel, 20);
  populateNumberSelect(elementoNumSel, 20);

  function buildString(){
    return 'INFERIOR, TRAMO ' + tramoNumSel.value + ', ' + elementoSel.value + ' ' + elementoNumSel.value;
  }

  function updatePreview(){
    previewEl.textContent = buildString();
  }

  [tramoNumSel, elementoSel, elementoNumSel].forEach(function(s){
    s.addEventListener('change', updatePreview);
  });

  // ---------- persistencia ----------
  function loadItems(){
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e){ return []; }
  }
  function saveItems(items){
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch(e){}
  }

  var items = loadItems();

  // ---------- clipboard (mesmo padrao do app.js) ----------
  function copyText(text){
    if (navigator.clipboard && navigator.clipboard.writeText){
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function(resolve, reject){
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.focus(); ta.select();
      try { document.execCommand('copy'); resolve(); }
      catch(e){ reject(e); }
      document.body.removeChild(ta);
    });
  }

  function renderItemCard(text, index){
    var groupEl = el('div', {class:'group name-item'});
    groupEl.appendChild(el('div', {class:'g-corner-tr'}));
    groupEl.appendChild(el('div', {class:'g-corner-br'}));

    var title = el('div', {class:'g-title'}, [
      el('span', {class:'g-name', text: text})
    ]);

    var actions = el('div', {class:'g-actions'});
    var badge = el('span', {class:'copied-badge', text:'✓ copiado'});
    var copyBtn = el('button', {class:'btn copy-dims', type:'button', text:'Copiar'});
    var removeBtn = el('button', {class:'btn', type:'button', text:'Remover'});

    copyBtn.addEventListener('click', function(){
      copyText(text).then(function(){
        groupEl.classList.add('group-copied');
        copyBtn.textContent = 'Copiado';
        setTimeout(function(){
          groupEl.classList.remove('group-copied');
          copyBtn.textContent = 'Copiar';
        }, 1400);
      });
    });

    removeBtn.addEventListener('click', function(){
      items.splice(index, 1);
      saveItems(items);
      render();
    });

    actions.appendChild(badge);
    actions.appendChild(copyBtn);
    actions.appendChild(removeBtn);

    var head = el('div', {class:'g-head'}, [title, actions]);
    groupEl.appendChild(head);
    return groupEl;
  }

  function render(){
    listEl.innerHTML = '';
    countEl.textContent = items.length;
    emptyEl.style.display = items.length ? 'none' : 'block';
    items.forEach(function(text, i){
      listEl.appendChild(renderItemCard(text, i));
    });
  }

  document.getElementById('btnAddName').addEventListener('click', function(){
    items.push(buildString());
    saveItems(items);
    render();
  });

  document.getElementById('btnCopyAllNames').addEventListener('click', function(ev){
    if (items.length === 0) return;
    var btn = ev.currentTarget;
    copyText(items.join('\n')).then(function(){
      var original = btn.textContent;
      btn.classList.add('copied');
      btn.textContent = 'Copiado!';
      setTimeout(function(){ btn.classList.remove('copied'); btn.textContent = original; }, 1200);
    });
  });

  document.getElementById('btnClearNames').addEventListener('click', function(){
    if (items.length === 0) return;
    if (confirm('Remover todos os nomes gerados da lista?')){
      items = [];
      saveItems(items);
      render();
    }
  });

  updatePreview();
  render();

})();
