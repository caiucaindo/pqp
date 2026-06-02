# Roadmap Checklist

Este arquivo organiza ideias futuras em blocos de implementacao. Itens marcados como concluidos ja entraram no app; itens em aberto ainda precisam de desenho, implementacao ou teste.

## Fase 1 - Polimento e Estabilidade

- [x] Criar checklist manual de QA para regressao.
- [x] Padronizar validacao basica de tipos de arquivo em helper reutilizavel.
- [x] Aceitar WebP no Editor PDF.
- [x] Corrigir overlay de drag do Editor que podia ficar travado ao cancelar o arraste externo.
- [x] Mostrar feedback de arquivo invalido no Editor, Mesclar e Separar.
- [x] Impedir que arquivo invalido arrastado para Mesclar/Separar abra no navegador.
- [x] Ajustar cor do overlay de drag do Editor para combinar com o tema escuro.
- [x] Corrigir contraste do switch de Padronizar em A4 no tema escuro.
- [x] Deixar Padronizar em A4 desligado por padrao em Mesclar PDF.
- [x] Aplicar drag-and-drop global em Mesclar PDF e Separar PDF.
- [x] Destacar o bloco Adicionar PDF na tela Separar quando um novo PDF e arrastado.
- [x] Ajustar altura dos cards da tela Separar para combinar com o bloco Adicionar PDF.
- [x] Ajustar preview da tela Separar para respeitar melhor a proporcao do PDF.
- [ ] Revisar estados vazios e loadings de todas as telas com um padrao visual unico.
- [ ] Revisar textos finais da interface depois de algumas rodadas de uso real.
- [ ] Padronizar componentes de upload, empty state, toolbar e modal de preview.
- [ ] Separar componentes comuns de PDF page card, rotation controls e drop zone.

## Fase 2 - Editor PDF

- [x] Adicionar multiplas imagens ao arrastar varios arquivos de uma vez.
- [x] Vincular imagens a pagina correta do PDF.
- [x] Evitar troca de pagina ao usar scroll comum.
- [x] Corrigir mistura/sobreposicao de paginas ao navegar pelo PDF.
- [x] Reordenar camadas por setas.
- [x] Reordenar camadas arrastando blocos na sidebar.
- [x] Mostrar novas imagens no topo da lista de camadas.
- [x] Ocultar e mostrar imagem por camada.
- [x] Reposicionar imagem confirmada com duplo clique.
- [x] Remover indicador de pagina proximo das setas de desfazer/refazer.
- [x] Adicionar indicador para navegacao de paginas na sidebar.
- [ ] Receber imagem via Ctrl+V/colar da area de transferencia.
- [ ] Copiar uma imagem de uma pagina e colar em outra.
- [ ] Permitir adicionar imagem antes de existir PDF, deixando-a em espera na sidebar.
- [ ] Aplicar imagens em espera na primeira pagina quando um PDF for carregado.
- [ ] Menu de contexto em imagem: aplicar em todas as paginas.
- [ ] Menu de contexto em imagem: girar por graus predefinidos.
- [ ] Definir se o menu de contexto deve abrir na imagem do documento, na camada da sidebar, ou em ambos.
- [ ] Adicionar ferramenta de texto.
- [ ] Texto: mover, redimensionar e rotacionar caixa como imagem.
- [ ] Texto: tamanho, fonte, cor, negrito e italico.
- [ ] Texto: alinhamento, opacidade e possivel fundo/borda.
- [ ] Adicionar ferramenta de desenho.
- [ ] Desenho: cores, espessura, transparencia e pinceis.
- [ ] Desenho: borracha e desfazer/refazer integrado.
- [ ] Avaliar se confirmacao de imagem continua necessaria ou vira modo de bloqueio/desbloqueio.

## Fase 3 - Separar PDF

- [x] Baixar todos os arquivos separados em ZIP.
- [x] Adicionar cortes entre paginas para juntar paginas no mesmo PDF.
- [x] Tornar toda a linha entre paginas clicavel.
- [x] Adicionar visualizador rapido de pagina.
- [x] Adicionar exclusao de pagina.
- [x] Permitir adicionar outro PDF na mesma tela.
- [x] Adicionar novos PDFs sem trocar a tela inteira para loading.
- [x] Carregar thumbnails novas pagina por pagina.
- [x] Manter layout em grade sem rolagem horizontal.
- [x] Baixar Selecionadas respeita cortes internos entre paginas selecionadas.
- [x] Baixar Selecionadas gera PDF unico quando nao ha cortes e ZIP quando ha grupos separados.
- [x] Arquivos gerados por cortes usam os nomes definidos na UI.
- [ ] Adicionar corte automatico por intervalo de paginas, com valor padrao 1.
- [ ] Permitir aplicar intervalo 2, 3, 4 etc. para criar cortes em lotes grandes.
- [ ] Melhorar nomes automaticos quando paginas de PDFs diferentes sao misturadas.
- [ ] Avaliar alternativa ao ZIP para multiplos downloads, caso o navegador exija confirmacao por arquivo.

## Fase 4 - Mesclar PDF

- [x] Corrigir titulo para Mesclar PDF.
- [x] Alinhar header e caixa principal com padrao reutilizavel.
- [x] Permitir arrastar PDFs para qualquer area da tela.
- [x] Deixar Padronizar em A4 desligado por padrao.
- [ ] Visualizar PDF dentro da tela Mesclar.
- [ ] No visualizador de Mesclar, navegar entre paginas do PDF.
- [ ] Ajustar thumbnail/card quando PDF for rotacionado em 90 ou 270 graus para nao conflitar com titulo/conteudo.
- [ ] Ao ativar A4, mostrar preview/thumbnail na orientacao final esperada.
- [ ] Ao ativar A4, sugerir rotacao correta para PDFs deitados/em pe.
- [ ] Permitir escolher 90 ou 180 graus quando a correcao automatica puder deixar documento de cabeca para baixo.
- [ ] Avaliar opcao de aplicar rotacao automatica em todos os PDFs.

## Fase 5 - Organizar PDF

- [ ] Criar tela Organizar PDF.
- [ ] Usar estrutura visual parecida com Separar PDF.
- [ ] Permitir adicionar multiplos PDFs.
- [ ] Mostrar paginas lado a lado em grade responsiva.
- [ ] Permitir mover paginas de lugar por drag-and-drop.
- [ ] Permitir mover paginas por botoes/setas como alternativa acessivel.
- [ ] Permitir girar paginas em 90 graus.
- [ ] Permitir visualizar pagina.
- [ ] Permitir excluir pagina.
- [ ] Manter nome de origem visivel sem permitir renomear pagina individual.
- [ ] Baixar um unico PDF organizado.
- [ ] Reaproveitar componentes de page card, preview e rotation controls da tela Separar.

## Fase 6 - Converter Arquivos

- [ ] Definir nome da tela de conversao.
- [ ] Aceitar arquivos de imagem comuns: PNG, JPG/JPEG e WebP.
- [ ] Aceitar arquivos de texto simples: TXT.
- [ ] Avaliar suporte a Word/DOCX.
- [ ] Avaliar suporte a PowerPoint/PPTX.
- [ ] Avaliar suporte a Excel/XLSX.
- [ ] Converter arquivos aceitos para PDF sem exigir que o usuario escolha previamente o tipo.
- [ ] Gerar preview do PDF antes do download.
- [ ] Ao receber PDF, oferecer conversao para PNG como padrao.
- [ ] Ao receber PDF, permitir trocar PNG para outros formatos comuns.
- [ ] Definir limites de qualidade, tamanho e quantidade de paginas/imagens exportadas.
- [ ] Avaliar dependencias nativas ou servico local necessario para conversoes Office.

## Fase 7 - Produto e Arquitetura

- [ ] Definir padrao final de header para novas telas.
- [ ] Definir paleta oficial por ferramenta.
- [ ] Reservar roxo para Organizar PDF.
- [ ] Criar componentes reutilizaveis para cards de ferramenta da home.
- [ ] Criar componentes reutilizaveis para upload/drop global.
- [ ] Criar componentes reutilizaveis para modais de preview.
- [ ] Criar componentes reutilizaveis para acoes de download.
- [ ] Avaliar code splitting para reduzir aviso de chunk grande no build.
- [ ] Automatizar parte do QA com testes de componentes ou fluxos Playwright.
- [ ] Criar suite minima de PDFs/imagens de teste versionados.
- [ ] Revisar estrategia de nomes de arquivos exportados em todas as telas.
