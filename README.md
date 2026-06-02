# ✨ PQP

## PDF Que Pariu

Uma aplicação desktop para editar PDFs.

## Funcionalidades

- **Combinar PDFs** - Junte múltiplos arquivos PDF em um único documento
- **Separar PDFs** - Separe paginas por cortes, mantenha paginas juntas e baixe os arquivos em ZIP
- **Girar Páginas** - Rotacione páginas do PDF conforme necessário
- **Adicionar Imagens** - Cole assinaturas, logos, carimbos, etc.
- **Camadas no Editor** - Organize imagens por pagina, reordene, oculte/mostre e reposicione com duplo clique
- **Drag and Drop Global** - Arraste PDFs para qualquer area das telas de editar, mesclar e separar
- **Navegacao Intuitiva** - Navegue pelas paginas pela barra lateral e use Ctrl+Scroll para zoom
- **Salvar PDF** - Exporte o PDF modificado
- **Undo / Redo** - Desfazer/refazer últimas alterações no editor (Ctrl+Z / Ctrl+Y)

## Executar

## Usuário Final (Windows)

1. Baixe `PQP.exe` da seção [Releases](../../releases)
2. Execute o arquivo
3. Pronto! A aplicação abre automaticamente

Não há instalação, não requer Python ou Node.js instalados.

## Desenvolvimento

### Pré-requisitos

- **Python 3.10+** ([Baixar](https://www.python.org/))
- **Node.js 16+** ([Baixar](https://nodejs.org/))

### Setup Inicial

```bash
# 1. Clone o repositório
git clone <seu-repo>
cd "d:\CODE\ #LEMBRAR# "

# 2. Crie ambiente virtual Python
python -m venv .venv
.\.venv\Scripts\activate

# 3. Instale dependências Python
pip install -r desktop/requirements.txt

# 4. Instale dependências Node.js
cd app
npm install
cd ..
```

### Build do Executável

**Windows (PowerShell - Recomendado):**

```powershell
.\desktop\build.ps1
```

**Windows (Batch):**

```cmd
desktop\build.bat
```

**Linux/Mac (Bash):**

```bash
chmod +x desktop/build.sh
./desktop/build.sh
```

**Manual:**

```bash
# Ativar ambiente virtual
.\.venv\Scripts\activate

# Compilar frontend
cd app
npm run build
cd ..

# Gerar executável
pyinstaller desktop\build.spec --noconfirm
```

### Resultado

O executável estará em:

```
dist/PQP.exe
```

## Modo Desenvolvimento

Para trabalhar no código (frontend hot-reload, backend debugável):

### Terminal 1 - Frontend

```bash
cd app
npm run dev
```

### Terminal 2 - Backend

```bash
.\.venv\Scripts\activate
python desktop\main.py
```

Abre em `http://localhost:5173`

Observações úteis

- No editor, ao redimensionar a imagem pelos cantos (handles de canto) a escala é mantida proporcional automaticamente. Para redimensionar proporcionalmente a partir das arestas pressione `Shift`.
- Imagens adicionadas no editor pertencem a pagina atual do PDF e podem ser organizadas pela lista de camadas.
- Na tela de separar PDF, use os cortes entre paginas para definir quais paginas ficam juntas antes de baixar tudo em ZIP.
- Durante edição, use `Ctrl+Z` (ou `Cmd+Z` no macOS) para desfazer e `Ctrl+Y` / `Ctrl+Shift+Z` para refazer. Também há botões de desfazer/refazer na barra superior do editor.
- Ao gerar o executável com PyInstaller, feche qualquer instância de `dist/PQP.exe` que esteja em execução antes de rodar o script de build (`desktop\build.ps1`) — caso contrário o PyInstaller pode falhar com erro de acesso negado.
- No executável empacotado, o download usa o diálogo nativo de salvar arquivo (via pywebview) quando disponível; no navegador o download usa o comportamento padrão do browser.

## Estrutura

```
\EDITOR PDF\
├── desktop/                    # Empacotamento e build
│   ├── main.py                # Backend FastAPI
│   ├── build.spec             # Configuração PyInstaller
│   ├── build.ps1 / build.bat / build.sh    # Scripts de build
│   └── requirements.txt        # Dependências Python
├── app/                        # Frontend React
│   ├── src/                   # Código-fonte
│   ├── package.json           # Dependências Node.js
│   └── vite.config.ts         # Configuração build
├── docs/                      # Documentação
├── dist/                      # Output (não versionado)
└── README.md                  # Este arquivo
```

## Stack Técnico

- **Frontend:** React 19 + TypeScript + Vite + PDF.js + pdf-lib
- **Backend:** FastAPI + Uvicorn
- **Desktop:** PyWebView (nativa WebView2 no Windows)
- **Empacotamento:** PyInstaller (executável standalone)

## Tamanho

- **Executável:** ~20 MB
- **Inclui:** Python runtime, FastAPI, React, todas as dependências

## Resolução de Problemas

### PDF não carrega

→ Tente arrastar o arquivo em vez de usar o botão

### Aplicação lenta

→ Feche abas/aplicações consumindo muita RAM

### Build falha

→ Certifique-se que Python e Node.js estão no PATH

## Licença

Uso pessoal. Livre para modificar conforme necessário.
