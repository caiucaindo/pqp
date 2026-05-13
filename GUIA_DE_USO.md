# 📖 Guia de Uso - PDF Editor

## 🎯 Como Começar

### Iniciar a Aplicação

**Windows:**
```bash
d:\CODE\EDITOR PDF\dist\PDF Editor.exe
```

Ou use um dos atalhos:
- `run_pdf_editor.bat` (clique duplo)
- `run_pdf_editor.sh` (se tiver Git Bash)

A aplicação abrirá automaticamente em seu navegador padrão.

## 📋 Fluxo de Uso

### 1. Carregar um PDF

**Opção A: Clique no Botão**
- Clique em "Carregar PDF" na barra lateral
- Selecione um arquivo `.pdf`

**Opção B: Arrastar e Soltar** ✨ (Nova!)
- Arraste um arquivo PDF diretamente na área cinza central
- O PDF será carregado automaticamente

### 2. Navegar no PDF

**Métodos Disponíveis:**

| Ação | Como Fazer |
|------|-----------|
| **Página Anterior** | ⬆️ Scroll Mouse / ← Botão Seta |
| **Próxima Página** | ⬇️ Scroll Mouse / → Botão Seta |
| **Aumentar Zoom** | Ctrl + ⬆️ Scroll Mouse / 🔍+ Botão |
| **Diminuir Zoom** | Ctrl + ⬇️ Scroll Mouse / 🔍- Botão |

**Exemplo:** Para ir para próxima página, mova o mouse sobre o PDF e role o scroll do mouse para baixo.

### 3. Adicionar Imagens

**Opção A: Usar Botão**
- Clique em "Adicionar Imagem"
- Selecione uma imagem PNG ou JPG

**Opção B: Arrastar e Soltar** ✨ (Nova!)
- Arraste uma imagem diretamente sobre o PDF
- A imagem será colocada automaticamente

### 4. Posicionar e Redimensionar Imagens

**Movimento (Sem Piscar!)** ✨

1. Clique e arraste a imagem para move-la
2. A imagem segue o mouse suavemente
3. Sem flickering ou tremulação

**Redimensionamento:**

1. Clique na imagem para seleciona-la
2. Aperte os **4 cantos brancos** (handles)
3. Arraste para redimensionar mantendo proporção

**Seleção:** A imagem selecionada mostra:
- ✅ Borda azul tracejada
- ✅ 4 handles (quadrados brancos) nos cantos

### 5. Confirmar Posicionamento

Após posicionar uma imagem:
1. Selecione a imagem (clique nela)
2. Clique em **"Confirmar"** no painel lateral

**Estado Confirmado:**
- ✅ Imagem aparece com checkmark verde
- ✅ Imagem fica fixa (não pode ser movida)
- ✅ Pode ser reposicionada clicando em "Reposicionar"

### 6. Gerenciar Camadas

**Painel Lateral - Camadas:**
- Lista todas as imagens adicionadas
- Mostra status (⚙️ = não confirmada, ✅ = confirmada)
- Clique em uma imagem para selecioná-la

**Ações Disponíveis:**
- **Confirmar:** Fixa a imagem no PDF
- **Reposicionar:** Permite mover novamente
- **Remover:** Deleta a imagem

### 7. Salvar o PDF

1. Adicione e confirme todas as imagens
2. Clique em **"Salvar PDF"** na barra superior
3. Arquivo será baixado como `{nome_original}_editado.pdf`

## 🎮 Atalhos Úteis

| Atalho | Ação |
|--------|------|
| **Scroll** | Navega entre páginas |
| **Ctrl + Scroll** | Ajusta zoom |
| **Clique + Arrastar** | Move imagens selecionadas |
| **Canto + Arrastar** | Redimensiona imagens |
| **Clique Vazio** | Deseleciona imagem |

## 🔧 Dicas de Uso

### Para Melhor Resultado:

1. **Imagens de Alta Qualidade**
   - Use imagens PNG com transparência para melhor resultado
   - JPG funciona bem para fotos

2. **Posicionamento Preciso**
   - Use zoom (Ctrl+Scroll) para posicionamento exato
   - Clique na imagem na lista de camadas para seleção precisa

3. **Múltiplas Imagens**
   - Adicione uma imagem por vez
   - Confirme cada uma antes de adicionar a próxima
   - Esto evita confusão entre camadas

4. **Redimensionamento**
   - As proporções são mantidas automaticamente
   - Use os cantos para melhor controle

## ❓ Resolução de Problemas

### PDF não carrega
- Certifique-se de que é um arquivo PDF válido
- Tente arrastar diretamente em vez de usar o botão

### Imagem está piscando
- Isso foi corrigido! Se acontecer, reinicie a aplicação
- Certifique-se de estar usando a versão mais recente

### Performance lenta
- Reduza o zoom se estiver muito aumentado
- Limite o número de imagens simultâneas
- Feche outras aplicações consumindo muita RAM

### Arquivo é muito grande
- Comprima as imagens antes de adicionar
- Use PNG em vez de JPG para melhor compressão
- Considere separar o PDF em múltiplos volumes

## 📝 Exemplo de Workflow

```
1. Abrir "PDF Editor.exe"
2. Arrastar "contrato.pdf" para a área central
3. Clicar em "Adicionar Imagem"
4. Selecionar "assinatura.png"
5. Posicionar assinatura no local correto
6. Clique em "Confirmar"
7. Clique em "Salvar PDF"
8. Arquivo "contrato_editado.pdf" é baixado
✅ Pronto!
```

## 🆘 Suporte

**Para relatar problemas:**
1. Anote o erro exato
2. Tente reproducir o problema
3. Compartilhe os arquivos PDFs/imagens utilizados

**Logs:**
A aplicação gera logs no console (pode acessar com F12 no navegador)

---

**Desenvolvido com ❤️ para produtividade**

Versão: 1.0.0
Data: Maio 2026
