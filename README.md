# ✨ PDP - PRA EDITAR PDF

Uma aplicação desktop para editar PDFs.

## Funcionalidades

- **Combinar PDFs** - Junte múltiplos arquivos PDF em um único documento
- **Girar Páginas** - Rotacione páginas do PDF conforme necessário
- **Adicionar Imagens** - Cole assinaturas, logos, carimbos, etc.
- **Navegação Intuitiva** - Scroll do mouse para navegar, Ctrl+Scroll para zoom
- **Salvar PDF** - Exporte o PDF modificado

## Executar

## Usuário Final (Windows)

1. Baixe `PDF Editor.exe` da seção [Releases](../../releases)
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
dist/PDF Editor.exe
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

- **Frontend:** React 19 + TypeScript + Vite + PDF.js
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
