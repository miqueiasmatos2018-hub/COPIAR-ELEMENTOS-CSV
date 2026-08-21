(function(){

  "use strict";

  var tabs = {
    csv: {
      btn: document.getElementById('tabBtnCsv'),
      panel: document.getElementById('panel-csv'),
      title: 'Leitor de Elementos SGE',
      subtitle: 'Organiza por tramo e categoria estrutural, agrupando dentro de cada uma os elementos por código de tipo (ID) e nome — pronto para copiar as colunas de cada grupo direto para a planilha.',
      showMeta: true
    },
    names: {
      btn: document.getElementById('tabBtnNames'),
      panel: document.getElementById('panel-names'),
      title: 'Gerador de Nomes Padronizados',
      subtitle: 'Monta identificadores de elementos de OAE (INFERIOR, TRAMO) a partir de tramo, tipo de elemento e número, prontos para copiar.',
      showMeta: false
    }
  };

  var titleEl = document.getElementById('pageTitle');
  var subtitleEl = document.getElementById('pageSubtitle');
  var metaEl = document.getElementById('csvMeta');

  function activate(key){
    Object.keys(tabs).forEach(function(k){
      var t = tabs[k];
      var active = (k === key);
      t.btn.classList.toggle('active', active);
      t.btn.setAttribute('aria-selected', active ? 'true' : 'false');
      t.panel.hidden = !active;
    });
    var t = tabs[key];
    titleEl.textContent = t.title;
    subtitleEl.textContent = t.subtitle;
    metaEl.style.display = t.showMeta ? '' : 'none';
  }

  tabs.csv.btn.addEventListener('click', function(){ activate('csv'); });
  tabs.names.btn.addEventListener('click', function(){ activate('names'); });

  activate('csv');

})();
