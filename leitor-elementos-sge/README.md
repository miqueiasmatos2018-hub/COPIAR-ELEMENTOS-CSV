# Leitor de Elementos SGE

Ferramenta web para ler arquivos `.csv` exportados do SGE/DNIT, organizá-los por **tramo → categoria estrutural → tipo de elemento**, e copiar rapidamente os valores de comprimento, largura, altura e espessura de cada grupo direto para a planilha.

Roda 100% no navegador — nenhum dado é enviado para servidor nenhum.

## Estrutura do projeto

```
leitor-elementos-sge/
├── index.html              página principal
├── css/
│   └── styles.css          estilos
├── js/
│   ├── app.js               lógica (parser de CSV, agrupamento, cópia)
│   └── sample-data.js       CSV de exemplo usado no botão "Carregar exemplo"
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
   git commit -m "Leitor de Elementos SGE"
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

## Trocar o arquivo de exemplo

O botão "Carregar exemplo" usa o conteúdo de `js/sample-data.js` (variável `window.SAMPLE_CSV`). Para usar outro arquivo de exemplo, substitua o conteúdo dessa variável pelo texto do novo `.csv`, ou remova o arquivo e o botão deixará de funcionar (o resto da ferramenta continua normal, via upload).
