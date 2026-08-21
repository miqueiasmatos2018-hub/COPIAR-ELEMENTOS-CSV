# Ferramentas SGE

Ferramenta web com duas abas:

1. **Leitor CSV** — lê arquivos `.csv` exportados do SGE/DNIT, organiza por **tramo → categoria estrutural → tipo de elemento**, e copia rapidamente os valores de comprimento, largura, altura e espessura de cada grupo direto para a planilha.
2. **Gerador de Nomes** — monta identificadores padronizados de elementos de OAE (formato `INFERIOR, TRAMO 01, APOIO 05`) a partir de dropdowns, e mantém uma lista com botão de copiar por item.

Roda 100% no navegador — nenhum dado é enviado para servidor nenhum.

## Estrutura do projeto

```
leitor-elementos-sge/
├── index.html                página principal (com as duas abas)
├── css/
│   └── styles.css            estilos (compartilhado pelas duas abas)
├── js/
│   ├── app.js                 lógica da aba "Leitor CSV" (parser, agrupamento, cópia)
│   ├── sample-data.js         CSV de exemplo usado no botão "Carregar exemplo"
│   ├── name-generator.js      lógica da aba "Gerador de Nomes"
│   └── tabs.js                controla a troca entre as duas abas
├── sample/
│   └── ELEMENTOS_SGE_EXPORTAR.csv   mesmo exemplo, como arquivo baixável
└── README.md
```

## Usar localmente

Basta abrir `index.html` direto no navegador (duplo clique) — não precisa de servidor nem instalação.

## Publicar no GitHub Pages

1. Crie um repositório novo no GitHub (pode ser público ou privado, desde que o plano permita Pages).
2. Suba todos os arquivos desta pasta para a raiz do repositório, mantendo a estrutura de pastas (`css/`, `js/`, `sample/`, `index.html`).

   Pelo terminal, dentro da pasta `leitor-elementos-sge`:
   ```bash
   git init
   git add .
   git commit -m "Ferramentas SGE (leitor CSV + gerador de nomes)"
   git branch -M main
   git remote add origin https://github.com/SEU_USUARIO/SEU_REPOSITORIO.git
   git push -u origin main
   ```
   Ou arraste os arquivos direto na interface web do GitHub ("Add file" → "Upload files").

3. No repositório, vá em **Settings → Pages**.
4. Em **Source**, selecione a branch `main` e a pasta `/ (root)`. Clique em **Save**.
5. Aguarde um ou dois minutos. O GitHub mostrará o link de acesso, algo como:
   ```
   https://SEU_USUARIO.github.io/SEU_REPOSITORIO/
   ```

Pronto — a ferramenta fica acessível por esse link, em qualquer computador, sem precisar instalar nada.

## Atualizar depois de publicado

Qualquer alteração nos arquivos, seguida de um novo `git push` (ou novo upload pela interface web), atualiza o site automaticamente em alguns minutos.

## Trocar o arquivo de exemplo (aba Leitor CSV)

O botão "Carregar exemplo" usa o conteúdo de `js/sample-data.js` (variável `window.SAMPLE_CSV`). Para usar outro arquivo de exemplo, substitua o conteúdo dessa variável pelo texto do novo `.csv`, ou remova o arquivo e o botão deixará de funcionar (o resto da ferramenta continua normal, via upload).

## Sobre a aba Gerador de Nomes

Monta nomes no formato `INFERIOR, TRAMO {nn}, {ELEMENTO} {nn}`, com:
- Nº do tramo: 01–20 (padding de 2 dígitos)
- Elemento: TRANSIÇÃO, APOIO, LE ou LD
- Nº do elemento: 01–20 (padding de 2 dígitos)

A lista de nomes gerados fica salva no navegador (localStorage), então continua lá mesmo se você fechar a aba. Para editar o formato do texto gerado, altere a função `buildString()` em `js/name-generator.js`.
