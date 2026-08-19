(function(){

  "use strict";

  var state = { rows: [], headerMap: {}, dimCols: [], contextCols: [], allExpanded: false, copiedKeys: {} };

  // ---------- CSV parsing ----------
  function stripBOM(text){ return text.charCodeAt(0) === 0xFEFF ? text.slice(1) : text; }

  function splitCSVLine(line, delim){
    var out = [], cur = '', inQuotes = false;
    for (var i=0;i<line.length;i++){
      var ch = line[i];
      if (inQuotes){
        if (ch === '"'){
          if (line[i+1] === '"'){ cur += '"'; i++; } else { inQuotes = false; }
        } else { cur += ch; }
      } else {
        if (ch === '"'){ inQuotes = true; }
        else if (ch === delim){ out.push(cur); cur=''; }
        else { cur += ch; }
      }
    }
    out.push(cur);
    return out;
  }

  function detectDelimiter(lines){
    var candidates = [';', '\t', ','];
    for (var c=0;c<candidates.length;c++){
      var delim = candidates[c];
      for (var i=0;i<Math.min(lines.length,20);i++){
        var cells = splitCSVLine(lines[i], delim);
        if (cells.length > 1 && cells[0].trim().toUpperCase() === 'ID'){
          return delim;
        }
      }
    }
    // fallback: whichever delimiter yields most columns on the fattest early line
    var best = ';', bestCount = 0;
    candidates.forEach(function(delim){
      for (var i=0;i<Math.min(lines.length,20);i++){
        var n = splitCSVLine(lines[i], delim).length;
        if (n > bestCount){ bestCount = n; best = delim; }
      }
    });
    return best;
  }

  function normHeader(h){
    return h.trim().toUpperCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  }

  function parseCSV(text){
    text = stripBOM(text).replace(/\r\n/g, '\n').replace(/\r/g,'\n');
    var lines = text.split('\n');
    var delim = detectDelimiter(lines);

    var headerIdx = -1, headerCells = null;
    for (var i=0;i<lines.length;i++){
      var cells = splitCSVLine(lines[i], delim);
      if (cells[0] && cells[0].trim().toUpperCase() === 'ID'){
        headerIdx = i; headerCells = cells.map(function(c){return c.trim();});
        break;
      }
    }
    if (headerIdx === -1){
      // fallback: row with most non-empty cells among first 15 lines, excluding a lone title row
      var bestI=-1, bestN=0;
      for (var j=0;j<Math.min(lines.length,15);j++){
        var c2 = splitCSVLine(lines[j], delim);
        var n = c2.filter(function(x){return x.trim()!=='';}).length;
        if (n > bestN){ bestN = n; bestI = j; }
      }
      headerIdx = bestI;
      headerCells = splitCSVLine(lines[bestI], delim).map(function(c){return c.trim() || ('COL'+(bestI+1));});
    }

    // identify known columns
    var idx = { id:-1, codigo:-1, nome:-1, transicao:-1 };
    headerCells.forEach(function(h, i){
      var n = normHeader(h);
      if (idx.id === -1 && n === 'ID') idx.id = i;
      else if (idx.codigo === -1 && n === 'CODIGO') idx.codigo = i;
      else if (idx.nome === -1 && n.indexOf('NOME') !== -1) idx.nome = i;
      else if (idx.transicao === -1 && n.indexOf('TRANSI') !== -1) idx.transicao = i;
    });
    var dimIdxs = [];
    headerCells.forEach(function(h,i){
      if (i!==idx.id && i!==idx.codigo && i!==idx.nome && i!==idx.transicao) dimIdxs.push(i);
    });

    var rows = [];
    var currentTramo = '', currentCategoria = '';

    for (var r = headerIdx+1; r<lines.length; r++){
      var raw = lines[r];
      if (raw === undefined) continue;
      var cells = splitCSVLine(raw, delim);
      var nonEmpty = cells.filter(function(x){return x.trim()!=='';});
      if (nonEmpty.length === 0) continue;

      if (nonEmpty.length === 1 && cells[0].trim() !== ''){
        var label = cells[0].trim();
        if (/^grand total/i.test(label)) continue;
        if (/^elementos\b/i.test(label)) { currentCategoria = label; }
        else { currentTramo = label; currentCategoria = ''; }
        continue;
      }

      // data row — must have at least a nome or id to be meaningful
      var idVal = idx.id!==-1 ? (cells[idx.id]||'').trim() : '';
      var nomeVal = idx.nome!==-1 ? (cells[idx.nome]||'').trim() : '';
      if (idVal === '' && nomeVal === '') continue;

      var obj = { __tramo: currentTramo, __categoria: currentCategoria, __dims:{} };
      obj.id = idVal;
      obj.codigo = idx.codigo!==-1 ? (cells[idx.codigo]||'').trim() : '';
      obj.nome = nomeVal;
      obj.transicao = idx.transicao!==-1 ? (cells[idx.transicao]||'').trim() : '';
      dimIdxs.forEach(function(di){
        obj.__dims[headerCells[di]] = (cells[di]||'').trim();
      });
      rows.push(obj);
    }

    // keep only dimension columns that have at least one non-empty value
    var dimCols = [];
    dimIdxs.forEach(function(di){
      var h = headerCells[di];
      var hasValue = rows.some(function(r){ return r.__dims[h] !== ''; });
      if (hasValue) dimCols.push(h);
    });

    var contextCols = [];
    if (idx.codigo!==-1 && rows.some(function(r){return r.codigo!=='';})) contextCols.push('codigo');
    if (rows.some(function(r){return r.__tramo!=='';})) contextCols.push('__tramo');
    if (rows.some(function(r){return r.__categoria!=='';})) contextCols.push('__categoria');
    if (idx.transicao!==-1 && rows.some(function(r){return r.transicao!=='';})) contextCols.push('transicao');

    return { rows: rows, dimCols: dimCols, contextCols: contextCols };
  }

  var COL_LABELS = { codigo:'CÓDIGO', __tramo:'TRAMO', __categoria:'CATEGORIA', transicao:'TRANSIÇÃO' };

  // ordem fixa de categorias dentro de cada tramo (padrão)
  var CATEGORY_ORDER_DEFAULT = [
    /TRANSI/i,
    /SUPERESTRUTURA/i,
    /APOIO/i
  ];

  // ordem para o último tramo cadastrado (sem elementos de apoio)
  var CATEGORY_ORDER_LAST_TRAMO = [
    /SUPERESTRUTURA/i,
    /TRANSI/i,
    /APOIO/i
  ];

  function categoryRank(label, orderArr){
    for (var i=0;i<orderArr.length;i++){
      if (orderArr[i].test(label)) return i;
    }
    return orderArr.length; // categorias não previstas (ex: complementares) vão depois, na ordem em que aparecem
  }

  function tramoRank(label){
    if (/^COMPLEMENTAR/i.test(label)) return -1;
    var m = label.match(/(\d+)/);
    if (m) return parseInt(m[1], 10);
    return 9999;
  }

  // ---------- grouping (id + nome) dentro de um conjunto de linhas ----------
  function groupRows(rows){
    var map = {}, order = [];
    rows.forEach(function(r){
      var key = r.id + '␟' + r.nome.toUpperCase();
      if (!map[key]){
        map[key] = { id:r.id, nome:r.nome, rows:[] };
        order.push(key);
      }
      map[key].rows.push(r);
    });
    var groups = order.map(function(k){ return map[k]; });
    groups.sort(function(a,b){
      var c = a.nome.localeCompare(b.nome, 'pt-BR');
      if (c!==0) return c;
      return a.id.localeCompare(b.id, 'pt-BR', {numeric:true});
    });
    return groups;
  }

  // ---------- hierarquia: tramo -> categoria -> grupos ----------
  function buildHierarchy(){
    var tramoMap = {}, tramoOrder = [];
    state.rows.forEach(function(r){
      var tramo = r.__tramo || '(sem tramo)';
      var cat = r.__categoria || '(sem categoria)';
      if (!tramoMap[tramo]){ tramoMap[tramo] = { label:tramo, catMap:{}, catOrder:[] }; tramoOrder.push(tramo); }
      var t = tramoMap[tramo];
      if (!t.catMap[cat]){ t.catMap[cat] = []; t.catOrder.push(cat); }
      t.catMap[cat].push(r);
    });

    var sections = tramoOrder.map(function(label){ return tramoMap[label]; });
    sections.sort(function(a,b){ return tramoRank(a.label) - tramoRank(b.label); });

    // o último "TRAMO N" da sequência (ignora COMPLEMENTAR e rótulos fora do padrão) usa ordem diferente
    var lastTramoIdx = -1;
    for (var i=sections.length-1; i>=0; i--){
      if (/^TRAMO\b/i.test(sections[i].label)){ lastTramoIdx = i; break; }
    }

    return sections.map(function(sec, secIdx){
      var orderArr = (secIdx === lastTramoIdx) ? CATEGORY_ORDER_LAST_TRAMO : CATEGORY_ORDER_DEFAULT;
      var cats = sec.catOrder.map(function(catLabel, idx){
        return { label: catLabel, rows: sec.catMap[catLabel], firstSeen: idx };
      });
      cats.sort(function(a,b){
        var ra = categoryRank(a.label, orderArr), rb = categoryRank(b.label, orderArr);
        if (ra !== rb) return ra - rb;
        return a.firstSeen - b.firstSeen;
      });
      return {
        label: sec.label,
        elemCount: cats.reduce(function(n,c){ return n + c.rows.length; }, 0),
        categories: cats.map(function(c){ return { label:c.label, groups: groupRows(c.rows) }; })
      };
    });
  }

  // ---------- rendering ----------
  function el(tag, attrs, children){
    var e = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function(k){
      if (k==='class') e.className = attrs[k];
      else if (k==='text') e.textContent = attrs[k];
      else e.setAttribute(k, attrs[k]);
    });
    (children||[]).forEach(function(c){ if(c) e.appendChild(c); });
    return e;
  }

  function cellValue(row, col){
    if (col in COL_LABELS) return row[col] || '';
    return row.__dims[col] || '';
  }

  function renderGroupCard(g, columns, groupKey){
    var isCopied = !!state.copiedKeys[groupKey];
    var groupEl = el('div', {class:'group' + (state.allExpanded ? '' : ' collapsed') + (isCopied ? ' group-copied' : '')});
    groupEl.appendChild(el('div',{class:'g-corner-tr'}));
    groupEl.appendChild(el('div',{class:'g-corner-br'}));

    var head = el('div', {class:'g-head'});
    var title = el('div', {class:'g-title'}, [
      el('span', {class:'caret', text:'▾'}),
      el('span', {class:'g-name', text:g.nome || '(sem nome)'}),
      el('span', {class:'g-id', text:'ID ' + (g.id || '—')}),
      el('span', {class:'g-count', text:g.rows.length + (g.rows.length===1?' elemento':' elementos')}),
      el('span', {class:'copied-badge'}, [el('span',{text:'✓ copiado'})])
    ]);
    var actions = el('div', {class:'g-actions'});
    var copyDimsBtn = el('button', {class:'btn copy-dims', type:'button', text: isCopied ? 'Copiar de novo' : 'Copiar dimensões'});
    copyDimsBtn.addEventListener('click', function(ev){
      ev.stopPropagation();
      copyGroupDimensions(g).then(function(){
        state.copiedKeys[groupKey] = true;
        groupEl.classList.add('group-copied');
        copyDimsBtn.classList.add('copied');
        copyDimsBtn.textContent = 'Copiado ✓';
        setTimeout(function(){
          copyDimsBtn.classList.remove('copied');
          copyDimsBtn.textContent = 'Copiar de novo';
        }, 1400);
      });
    });
    actions.appendChild(copyDimsBtn);
    head.appendChild(title);
    head.appendChild(actions);
    head.addEventListener('click', function(){
      groupEl.classList.toggle('collapsed');
    });
    groupEl.appendChild(head);

    var body = el('div', {class:'g-body'});
    var table = document.createElement('table');
    var thead = document.createElement('thead');
    var trh = document.createElement('tr');
    trh.appendChild(el('th', {class:'col-idx', text:'#'}));
    columns.forEach(function(col){
      var th = document.createElement('th');
      var inner = el('div', {class:'th-inner'});
      inner.appendChild(el('span', {text: COL_LABELS[col] || col}));
      if (state.dimCols.indexOf(col) !== -1){
        var copyBtn = el('button', {class:'col-copy', type:'button', title:'Copiar coluna', text:'⧉'});
        copyBtn.addEventListener('click', function(){ copyColumn(g, col, copyBtn); });
        inner.appendChild(copyBtn);
      }
      th.appendChild(inner);
      trh.appendChild(th);
    });
    thead.appendChild(trh);
    table.appendChild(thead);

    var tbody = document.createElement('tbody');
    g.rows.forEach(function(row, i){
      var tr = document.createElement('tr');
      tr.appendChild(el('td', {class:'col-idx', text:String(i+1)}));
      columns.forEach(function(col){
        var v = cellValue(row, col);
        var isNum = state.dimCols.indexOf(col) !== -1;
        tr.appendChild(el('td', {class: v==='' ? 'empty' : (isNum ? 'num' : ''), text: v===''?'—':v}));
      });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    body.appendChild(table);
    groupEl.appendChild(body);
    return groupEl;
  }

  function render(){
    var container = document.getElementById('groups');
    container.innerHTML = '';
    var query = document.getElementById('search').value.trim().toLowerCase();
    var columns = state.contextCols.concat(state.dimCols);

    var sections = buildHierarchy();
    var totalTypes = 0, shownGroups = 0;

    sections.forEach(function(sec){ sec.categories.forEach(function(cat){ totalTypes += cat.groups.length; }); });

    var sectionsToRender = [];
    sections.forEach(function(sec){
      var catsToRender = [];
      sec.categories.forEach(function(cat){
        var groups = cat.groups.filter(function(g){
          return !query || g.nome.toLowerCase().indexOf(query) !== -1;
        });
        if (groups.length) catsToRender.push({ label: cat.label, groups: groups });
      });
      if (catsToRender.length) sectionsToRender.push({ label: sec.label, elemCount: sec.elemCount, categories: catsToRender });
    });

    document.getElementById('statElems').textContent = state.rows.length;
    document.getElementById('statTypes').textContent = totalTypes;
    document.getElementById('metaElems').textContent = state.rows.length;
    document.getElementById('metaTypes').textContent = totalTypes;

    if (sectionsToRender.length === 0){
      container.appendChild(el('div', {class:'empty-state', text:'Nenhum grupo encontrado para esse filtro.'}));
      document.getElementById('statGroupsShown').textContent = 0;
      return;
    }

    sectionsToRender.forEach(function(sec){
      var sectionEl = el('div', {class:'section'});
      sectionEl.appendChild(el('div', {class:'section-head'}, [
        el('span', {class:'tag', text:'TRAMO'}),
        el('h2', {text: sec.label}),
        el('span', {class:'section-count', text: sec.elemCount + (sec.elemCount===1?' elemento':' elementos')})
      ]));

      sec.categories.forEach(function(cat){
        var subEl = el('div', {class:'subsection'});
        var count = cat.groups.reduce(function(n,g){ return n + g.rows.length; }, 0);
        subEl.appendChild(el('div', {class:'subsection-head'}, [
          el('span', {class:'sub-label', text: cat.label}),
          el('span', {class:'sub-count', text: '· ' + count + (count===1?' elemento':' elementos')})
        ]));
        var listEl = el('div', {class:'group-list'});
        cat.groups.forEach(function(g){
          var groupKey = sec.label + '␟' + cat.label + '␟' + g.id + '␟' + g.nome;
          listEl.appendChild(renderGroupCard(g, columns, groupKey));
          shownGroups++;
        });
        subEl.appendChild(listEl);
        sectionEl.appendChild(subEl);
      });

      container.appendChild(sectionEl);
    });

    document.getElementById('statGroupsShown').textContent = shownGroups;
  }

  // ---------- clipboard ----------
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

  function flashButton(btn, label){
    var original = btn.textContent;
    btn.classList.add('copied');
    btn.textContent = label;
    setTimeout(function(){ btn.classList.remove('copied'); btn.textContent = original; }, 1200);
  }

  function copyColumn(g, col, btn){
    var values = g.rows.map(function(r){ return cellValue(r, col); });
    copyText(values.join('\n')).then(function(){ flashButton(btn, '✓'); });
  }

  function copyGroupDimensions(g){
    var lines = g.rows.map(function(row){
      return state.dimCols.map(function(c){ return cellValue(row, c); }).join('\t');
    });
    return copyText(lines.join('\n'));
  }

  // ---------- loading ----------
  function loadCSVText(text, filename){
    var parsed = parseCSV(text);
    state.rows = parsed.rows;
    state.dimCols = parsed.dimCols;
    state.contextCols = parsed.contextCols;
    state.allExpanded = false;
    document.getElementById('metaFile').textContent = filename || 'dados carregados';
    document.getElementById('toolbar').style.display = 'flex';
    document.getElementById('emptyState').style.display = 'none';
    document.getElementById('btnToggleAll').textContent = 'Expandir tudo';
    document.getElementById('dropzone').classList.add('compact');
    render();
  }

  function readFile(file){
    var reader = new FileReader();
    reader.onload = function(e){ loadCSVText(e.target.result, file.name); };
    reader.readAsText(file, 'UTF-8');
  }

  // ---------- wiring ----------
  var dropzone = document.getElementById('dropzone');
  var fileInput = document.getElementById('fileInput');

  document.getElementById('btnChoose').addEventListener('click', function(){ fileInput.click(); });
  dropzone.addEventListener('click', function(e){
    if (e.target.id === 'btnSample') return;
    fileInput.click();
  });
  fileInput.addEventListener('change', function(){
    if (fileInput.files && fileInput.files[0]) readFile(fileInput.files[0]);
  });
  ['dragenter','dragover'].forEach(function(evt){
    dropzone.addEventListener(evt, function(e){ e.preventDefault(); dropzone.classList.add('drag'); });
  });
  ['dragleave','drop'].forEach(function(evt){
    dropzone.addEventListener(evt, function(e){ e.preventDefault(); dropzone.classList.remove('drag'); });
  });
  dropzone.addEventListener('drop', function(e){
    var f = e.dataTransfer.files && e.dataTransfer.files[0];
    if (f) readFile(f);
  });
  document.getElementById('btnSample').addEventListener('click', function(ev){
    ev.stopPropagation();
    var sample = window.SAMPLE_CSV || '';
    if (!sample){
      alert('Arquivo de exemplo nao encontrado (js/sample-data.js nao foi carregado).');
      return;
    }
    loadCSVText(sample, 'ELEMENTOS_SGE_EXPORTAR.csv (exemplo)');
  });

  document.getElementById('search').addEventListener('input', render);
  document.getElementById('btnToggleAll').addEventListener('click', function(){
    state.allExpanded = !state.allExpanded;
    this.textContent = state.allExpanded ? 'Recolher tudo' : 'Expandir tudo';
    document.querySelectorAll('.group').forEach(function(g){
      g.classList.toggle('collapsed', !state.allExpanded);
    });
  });


})();
