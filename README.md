# Diário de Bordo – Masters Engenharia (novo sistema)

Sistema novo e independente. Não usa o código, o Firebase nem a publicação do aplicativo anterior.

## Endereços

- Sistema (banco real, Supabase): https://ronanaraujojunior4-maker.github.io/diario-bordo-masters/
- Demonstração com dados fictícios: https://ronanaraujojunior4-maker.github.io/diario-bordo-masters/?demo

## Situação atual: em uso (banco real)

- O endereço principal usa o Supabase (login só com usuário e senha). `?demo` abre a demonstração com dados fictícios no navegador.
- Funciona no celular (Android e iPhone) e pode ser instalado na tela inicial (PWA: `manifest.webmanifest` + `sw.js`). A sessão continua após fechar o navegador; só sai ao tocar em "Sair".

## Estrutura

| Caminho | Conteúdo |
|---|---|
| `index.html` | Layout, identidade visual e estilos (sem etapa de build) |
| `app.js` | Telas, regras de negócio e camada de dados `DB` (hoje: demonstração) |
| `assets/` | Logotipo original da Masters e ícones |
| `cloud.js`, `config.js` | Conexão com o Supabase (somente chave pública) |
| `manifest.webmanifest`, `sw.js` | Instalação na tela inicial; o service worker nunca guarda dados do banco |
| `supabase/migrations/` | 001 esquema/RLS/auditoria/última km; 002 permissões de gatilhos; 003 primeiro acesso; 004 importação só pelo administrador |
| `supabase/functions/usuarios` | Criação de usuários e redefinição de senha (chave secreta só no servidor) |
| `supabase/teste_regras.sql` | Teste das regras (executado em Postgres local: todas passaram) |

Bibliotecas por CDN: Chart.js 4.4.1, SheetJS 0.18.5, JSZip 3.10.1 e supabase-js 2.45.4.

## Regras implementadas

- MASTERS é o único administrador e nunca assume, reserva ou é responsável por veículo (tela e banco).
- Um veículo só pode estar com uma pessoa por vez; cada pessoa só com um veículo.
- Funcionário só registra viagem/abastecimento com o veículo assumido; só libera o próprio veículo.
- Liberação administrativa exige confirmação e justificativa, e fica na auditoria.
- Última km = maior km de chegada entre as viagens de todos os usuários do veículo; nunca retrocede. Viagem nova não pode começar abaixo dela. Lacunas e retrocessos aparecem em "Precisa de atenção" sem alterar os registros originais.
- Idempotência: cada formulário tem um ID único (clique repetido, recarga ou reenvio não duplicam). Abastecimento com mesmo veículo, data, hora e valor é recusado.
- Importação (menu Administração → Importação, só MASTERS) no **mesmo layout do sistema anterior**: CSV do "Exportar CSV" (`;`, seções de viagens e abastecimentos) e planilha "Controle de Utilização Veículo" (viagens a partir da linha 4; abastecimentos na coluna ABASTECIMENTO como `dd/mm/aaaa — hh:mm — N litros — R$ V.`; vários arquivos "parteN" de uma vez).
  - Escolha: viagens e abastecimentos, só viagens ou só abastecimentos.
  - Antes da prévia, o app carrega do banco todo o período coberto pelo arquivo, e a duplicidade é conferida contra o histórico inteiro (não só os últimos 90 dias).
  - Prévia com novos, existentes, duplicados, conflitantes e rejeitados, e o funcionário vinculado a cada registro (por USUÁRIO, nome completo ou primeiro nome único). Sem correspondência, o registro fica com o administrador e o texto original é mantido.
  - Nada é gravado sem confirmação; registros existentes nunca são sobrescritos. Cada registro leva `chave_import` única, gravada com `on conflict do nothing`: reimportar o mesmo arquivo não duplica. O resultado mostra gravados, ignorados e erros.
  - O texto da coluna ABASTECIMENTO não tem km, posto nem combustível; esses campos ficam vazios/"Outro", sem dados inventados.
- Exportação: Excel preenchendo a própria planilha-modelo `assets/modelo-diario-de-bordo.xlsx` (formatação preservada, 19 linhas por arquivo, nome `diario-bordo-inicio_fim-PLACA-parteN.xlsx`), CSV reimportável no layout antigo e PDF (impressão do navegador).

## Pendências

1. Importação histórica real: aguardando os arquivos originais (todas as partes por veículo e/ou CSV exportado do sistema anterior). Só é gravada após conferência da prévia.
2. Edição de registros próprios e correção administrativa com auditoria.
3. Homologação; a troca do sistema antigo só com aprovação.
