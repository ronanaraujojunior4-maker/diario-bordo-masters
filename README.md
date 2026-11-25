# Diário de Bordo – Masters Engenharia (novo sistema)

Sistema novo e independente. Não usa o código, o Firebase nem a publicação do aplicativo anterior.

## Endereços

- Sistema (banco real, Supabase): https://ronanaraujojunior4-maker.github.io/diario-bordo-masters/
- Demonstração com dados fictícios: https://ronanaraujojunior4-maker.github.io/diario-bordo-masters/?demo

## Situação atual: versão de apresentação

- Roda em **modo demonstração**: dados fictícios gravados só no navegador (localStorage), com faixa "Ambiente de demonstração" sempre visível.
- Perfis de demonstração (senha `demo`): `MASTERS` (administrador), `RONAN`, `ECCLESTON`, `VALDINEI`.
- "Restaurar demo", no menu, volta à base fictícia original.

## Estrutura

| Caminho | Conteúdo |
|---|---|
| `index.html` | Layout, identidade visual e estilos (sem etapa de build) |
| `app.js` | Telas, regras de negócio e camada de dados `DB` (hoje: demonstração) |
| `assets/` | Logotipo original da Masters e ícones |
| `supabase/migrations/001_init.sql` | Esquema PostgreSQL com RLS, auditoria, última km e funções de uso |
| `supabase/teste_regras.sql` | Teste das regras (executado em Postgres local: todas passaram) |

Bibliotecas por CDN: Chart.js 4.4.1 (gráficos) e SheetJS 0.18.5 (Excel).

## Regras implementadas

- MASTERS é o único administrador e nunca assume, reserva ou é responsável por veículo (tela e banco).
- Um veículo só pode estar com uma pessoa por vez; cada pessoa só com um veículo.
- Funcionário só registra viagem/abastecimento com o veículo assumido; só libera o próprio veículo.
- Liberação administrativa exige confirmação e justificativa, e fica na auditoria.
- Última km = maior km de chegada entre as viagens de todos os usuários do veículo; nunca retrocede. Viagem nova não pode começar abaixo dela. Lacunas e retrocessos aparecem em "Precisa de atenção" sem alterar os registros originais.
- Idempotência: cada formulário tem um ID único (clique repetido, recarga ou reenvio não duplicam). Abastecimento com mesmo veículo, data, hora e valor é recusado.
- Importação no **mesmo layout do sistema anterior**: CSV do "Exportar CSV" (`;`, seções de viagens e abastecimentos) e planilha "Controle de Utilização Veículo" (viagens nas linhas 4–22; abastecimentos na coluna ABASTECIMENTO como `dd/mm/aaaa — hh:mm — N litros — R$ V.`; vários arquivos "parteN" de uma vez). Validado com uma planilha real do Fiat Mobi: 12 viagens e 7 abastecimentos reconhecidos. Prévia com novos, existentes, duplicados, conflitantes e rejeitados; nada é gravado sem confirmação.
- Exportação: Excel preenchendo a própria planilha-modelo `assets/modelo-diario-de-bordo.xlsx` (formatação preservada, 19 linhas por arquivo, nome `diario-bordo-inicio_fim-PLACA-parteN.xlsx`), CSV reimportável no layout antigo e PDF (impressão do navegador).

## Pendências (Prioridade 2 — consolidação)

1. ~~Projeto Supabase exclusivo~~ criado (conta e org `diario-bordo-masters`, plano Free) e esquema aplicado; RLS testada no banco com usuários simulados (2026-11-25).
2. Acesso só por nome de usuário e senha (sem e-mail para o usuário): o MASTERS é configurado na tela "Primeiro acesso" com o código de configuração; depois ele cria os funcionários e redefine senhas pelo app (função de servidor `supabase/functions/usuarios`, que guarda a chave secreta só no servidor). Internamente o Supabase Auth usa `usuario@diario.masters`, nunca exibido.
3. Cadastrar veículos e alocações pelo próprio app (MASTERS) e testar login real em celular e computador.
4. Edição de registros próprios e correção administrativa com auditoria.
5. Importação histórica do sistema anterior (depende de exportação/backup do Firebase).
6. Homologação e publicação definitiva; a troca do sistema antigo só com aprovação.
