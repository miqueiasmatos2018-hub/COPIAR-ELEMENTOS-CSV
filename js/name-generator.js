(function(){

  "use strict";

  var STORAGE_KEY = 'sge-nomes-padronizados';
  var STATIC_COPIED_KEY = 'sge-nomes-superiores-copiados';
  var DYNAMIC_COPIED_KEY = 'sge-nomes-inferiores-copiados';

  var STATIC_NAMES = [
    'LE INICIO, DIAGONAL SUPERIOR',
    'LE LATERAL, SUPERIOR',
    'LE FINAL, DIAGONAL SUPERIOR',
    'DECRESCENTE SUPERIOR',
    'LD FINAL, DIAGONAL SUPERIOR',
    'LD LATERAL, SUPERIOR',
    'LD INICIO, DIAGONAL SUPERIOR',
    'CRESCENTE SUPERIOR',
    'SUPERIOR ORTOGONAL',
    'VISTA TERREA SENTIDO CRESCENTE',
    'VISTA TERREA SENTIDO DECRESCENTE'
  ];

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

  function uid(){
    return 'n' + Date.now().toString(36) + Math.random().toString(36).slice(2,8);
  }

  var tramoNumSel = document.getElementById('tramoNum');
  var elementoSel = document.getElementById('elemento');
  var elementoNumSel = document.getElementById('elementoNum');
  var previewEl = document.getElementById('namePreview');
  var listEl = document.getElementById('namesList');
  var emptyEl = document.getElementById('namesEmptyState');
  var countEl = document.getElementById('namesCount');
  var staticListEl = document.getElementById('staticNamesList');
  var staticCountEl = document.getElementById('staticNamesCount');

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
  function loadJSON(key, fallback){
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e){ return fallback; }
  }
  function saveJSON(key, value){
    try { localStorage.setItem(key, JSON.stringify(value)); } catch(e){}
  }

  // lista dinamica (Fotos Inferiores): array de {id, text}
  var items = loadJSON(STORAGE_KEY, []);
  // compatibilidade: versao antiga guardava so strings
  items = items.map(function(it){
    return (typeof it === 'string') ? { id: uid(), text: it } : it;
  });
  function saveItems(){ saveJSON(STORAGE_KEY, items); }

  // marcacoes de "copiado" (persistem ate o usuario desmarcar)
  var staticCopied = loadJSON(STATIC_COPIED_KEY, {});   // { indice: true }
  var dynamicCopied = loadJSON(DYNAMIC_COPIED_KEY, {}); // { id: true }
  function saveStaticCopied(){ saveJSON(STATIC_COPIED_KEY, staticCopied); }
  function saveDynamicCopied(){ saveJSON(DYNAMIC_COPIED_KEY, dynamicCopied); }

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

  // onRemove: function|null — mostra botao "Remover"
  // isCopied / onToggleCopied: controlam o estado persistente de "copiado"
  function renderItemCard(text, onRemove, isCopied, onToggleCopied){
    var groupEl = el('div', {class:'group name-item' + (isCopied ? ' group-copied' : '')});
    groupEl.appendChild(el('div', {class:'g-corner-tr'}));
    groupEl.appendChild(el('div', {class:'g-corner-br'}));

    var title = el('div', {class:'g-title'}, [
      el('span', {class:'g-name', text: text})
    ]);

    var actions = el('div', {class:'g-actions'});
    var badge = el('span', {class:'copied-badge', text:'✓ copiado'});
    var copyBtn = el('button', {class:'btn copy-dims', type:'button', text: isCopied ? 'Copiado' : 'Copiar'});

    copyBtn.addEventListener('click', function(){
      copyText(text).then(function(){
        groupEl.classList.add('group-copied');
        copyBtn.textContent = 'Copiado';
        onToggleCopied(true);
      });
    });

    actions.appendChild(badge);
    actions.appendChild(copyBtn);

    if (onRemove){
      var removeBtn = el('button', {class:'btn', type:'button', text:'Remover'});
      removeBtn.addEventListener('click', onRemove);
      actions.appendChild(removeBtn);
    }

    var head = el('div', {class:'g-head'}, [title, actions]);
    groupEl.appendChild(head);
    return groupEl;
  }

  function fotoLabel(n){ return n + (n === 1 ? ' foto' : ' fotos'); }

  function renderStatic(){
    staticListEl.innerHTML = '';
    var copiedCount = Object.keys(staticCopied).length;
    staticCountEl.textContent = fotoLabel(STATIC_NAMES.length) + (copiedCount ? ' · ' + copiedCount + ' copiadas' : '');
    STATIC_NAMES.forEach(function(text, i){
      staticListEl.appendChild(renderItemCard(text, null, !!staticCopied[i], function(val){
        if (val) staticCopied[i] = true; else delete staticCopied[i];
        saveStaticCopied();
        renderStatic();
      }));
    });
  }

  function render(){
    listEl.innerHTML = '';
    var copiedCount = items.filter(function(it){ return !!dynamicCopied[it.id]; }).length;
    countEl.textContent = fotoLabel(items.length) + (copiedCount ? ' · ' + copiedCount + ' copiadas' : '');
    emptyEl.style.display = items.length ? 'none' : 'block';
    items.forEach(function(item){
      listEl.appendChild(renderItemCard(
        item.text,
        function(){
          items = items.filter(function(it){ return it.id !== item.id; });
          delete dynamicCopied[item.id];
          saveItems();
          saveDynamicCopied();
          render();
        },
        !!dynamicCopied[item.id],
        function(val){
          if (val) dynamicCopied[item.id] = true; else delete dynamicCopied[item.id];
          saveDynamicCopied();
          render();
        }
      ));
    });
  }

  document.getElementById('btnAddName').addEventListener('click', function(){
    items.push({ id: uid(), text: buildString() });
    saveItems();
    render();
  });

  document.getElementById('btnCopyAllNames').addEventListener('click', function(ev){
    if (items.length === 0) return;
    var btn = ev.currentTarget;
    copyText(items.map(function(it){ return it.text; }).join('\n')).then(function(){
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
      dynamicCopied = {};
      saveItems();
      saveDynamicCopied();
      render();
    }
  });

  var btnUnmarkNames = document.getElementById('btnUnmarkNames');
  if (btnUnmarkNames){
    btnUnmarkNames.addEventListener('click', function(){
      dynamicCopied = {};
      saveDynamicCopied();
      render();
    });
  }

  document.getElementById('btnCopyAllStatic').addEventListener('click', function(ev){
    var btn = ev.currentTarget;
    copyText(STATIC_NAMES.join('\n')).then(function(){
      var original = btn.textContent;
      btn.classList.add('copied');
      btn.textContent = 'Copiado!';
      setTimeout(function(){ btn.classList.remove('copied'); btn.textContent = original; }, 1200);
    });
  });

  var btnUnmarkStatic = document.getElementById('btnUnmarkStatic');
  if (btnUnmarkStatic){
    btnUnmarkStatic.addEventListener('click', function(){
      staticCopied = {};
      saveStaticCopied();
      renderStatic();
    });
  }

  updatePreview();
  renderStatic();
  render();

})();
