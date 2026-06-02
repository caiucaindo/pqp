# Checklist de QA

Use este checklist manual antes de fechar uma leva grande de alteracoes. A ideia e testar os fluxos reais que mais quebram a experiencia, sem transformar QA em uma maratona.

## Geral

- Abrir o app pela home e navegar para Editor, Mesclar e Separar.
- Voltar de cada tela para a home sem conflito visual no header.
- Redimensionar a janela em tela cheia e janela menor, verificando se header e conteudo continuam alinhados.
- Arrastar um arquivo invalido em cada tela e confirmar que ele nao abre no navegador.
- Cancelar um drag externo sem soltar arquivo e confirmar que o destaque visual some.
- Rodar `npm.cmd run build`.

## Home

- Confirmar que a tela inicial nao cria rolagem vertical em telas menores.
- Conferir se logo, titulo e rodape continuam visiveis e proporcionais.
- Abrir cada ferramenta pelo card correto.

## Editor PDF

- Carregar PDF de uma pagina.
- Carregar PDF com varias paginas e navegar pela sidebar.
- Trocar entre paginas varias vezes e confirmar que uma pagina nao mistura conteudo com outra.
- Adicionar uma imagem por clique.
- Arrastar varias imagens de uma vez e confirmar que todas aparecem.
- Testar PNG, JPG/JPEG e WebP.
- Reordenar camadas por setas.
- Reordenar camadas arrastando blocos na lista.
- Ocultar e mostrar uma camada.
- Confirmar imagem e reposicionar com duplo clique.
- Usar scroll comum para navegar na area de trabalho sem trocar pagina.
- Usar Ctrl + scroll para zoom.
- Salvar PDF e confirmar que imagens aparecem apenas nas paginas corretas.

## Mesclar PDF

- Arrastar PDFs para qualquer area da tela.
- Arrastar arquivo invalido e confirmar mensagem de arquivo nao aceito.
- Adicionar multiplos PDFs pelo seletor.
- Reordenar PDFs por drag e por setas.
- Girar PDFs em 0, 90, 180 e 270 graus.
- Confirmar que o card nao conflita com titulo quando o PDF fica deitado.
- Confirmar que Padronizar em A4 inicia desligado.
- Ligar Padronizar em A4 e conferir contraste do switch.
- Baixar um PDF unico rotacionado.
- Mesclar varios PDFs.

## Separar PDF

- Arrastar PDF para qualquer area da tela.
- Com um PDF ja carregado, arrastar outro PDF e confirmar que ele e adicionado.
- Ao arrastar outro PDF, confirmar destaque na area de Adicionar PDF.
- Arrastar arquivo invalido e confirmar mensagem de arquivo nao aceito.
- Selecionar e desselecionar paginas.
- Cortar e juntar entre paginas usando toda a linha.
- Visualizar pagina e confirmar proporcao do modal.
- Excluir pagina.
- Girar paginas.
- Baixar pagina individual.
- Baixar selecionadas.
- Baixar tudo como ZIP.

## Build Desktop

- Rodar `.\desktop\build.bat`.
- Abrir o executavel gerado.
- Carregar, processar e salvar um PDF em cada tela principal.
- Confirmar que dialogos de salvar funcionam no executavel.
