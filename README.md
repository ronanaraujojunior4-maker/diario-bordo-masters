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
| `supabase/migrations/` | 001 esquema/RLS/auditoria/última km; 002 permissões de gatilhos; 003 primeiro acesso; 004 importação só pelo administrador; 005 recuperação de acesso; 006 edição e exclusão lógica; 008 exclusão sem justificativa; 007 perfil híbrido, último abastecimento por veículo e códigos de recuperação |
| `supabase/manual/005b_ronan_admin.sql` | Trecho rodado manualmente no SQL Editor (vários administradores; RONAN administrador) |
| `supabase/functions/usuarios` | Criação de usuários e redefinição de senha (chave secreta só no servidor) |
| `supabase/teste_regras.sql` | Teste das regras (executado em Postgres local: todas passaram) |

Bibliotecas por CDN: Chart.js 4.4.1, SheetJS 0.18.5, JSZip 3.10.1 e supabase-js 2.45.4.

## Regras implementadas

- Perfis: MASTERS é administrador exclusivamente administrativo (nunca assume, reserva ou é responsável por veículo; garantido no banco). RONAN é administrador e também operacional (`profiles.opera_veiculos = true`): assume e libera o veículo sob sua responsabilidade e registra, edita e exclui as próprias viagens e abastecimentos. A regra fica em `pode_operar()` (RLS, `assumir_veiculo` e gatilho de responsável); o campo é por usuário, em Usuários → "Também opera veículos". O banco impede remover o último administrador ativo.
- Visão geral:
  - Indicadores por ciclo de abastecimento: o ciclo de cada veículo vai do seu último abastecimento válido até agora (nunca usa a data de outro veículo). Viagens e km do ciclo sem repetição, por veículo (quadro "Ciclo atual por veículo") e consolidados (somas). Sem abastecimento: "Sem referência de abastecimento".
  - Consumo médio = km ÷ litros consumidos. O abastecimento não registra "tanque cheio", então litros abastecidos não equivalem aos consumidos: o sistema mostra "Dados insuficientes" em vez de estimar.
  - "Frota em operação": em uso, disponíveis e reservados (reserva ainda não existe no sistema: 0), só veículos ativos e não excluídos.
  - "Resumo da Operação" do mês (veículos em uso agora, abastecimentos, km sem repetição e veículo mais utilizado).
- Recuperação de senha por código (sem e-mail, SMTP ou serviço externo):
  - Login → "Esqueci minha senha": o funcionário informa usuário, código, nova senha e confirmação; ou envia um pedido ao administrador.
  - Administração → Recuperação de senha (MASTERS e RONAN): localizar por nome ou usuário, gerar código (XXXX-XXXX, exibido uma única vez), ver pedidos, códigos e situação (pendente, utilizado, expirado, revogado), revogar e gerar outro.
  - Segurança: geração e validação só na função de servidor `usuarios`; banco guarda só o hash (HMAC-SHA256 com chave do servidor); validade de 2 horas; uso único; um código pendente por usuário; revogado após 5 tentativas erradas; limite global de 30 falhas por hora. A recuperação troca só a senha.
  - Auditoria: código gerado, usado, revogado e cada falha (`audit_log`), com funcionário, administrador, datas e situação em `recovery_codes`.
- Editar e excluir:
  - Viagens e abastecimentos: toque/clique no registro para selecioná-lo; as ações Editar e Excluir aparecem numa barra inferior só depois da seleção. Excluir pede confirmação, sem justificativa (migration 008). O funcionário mexe só nos próprios registros; administradores (MASTERS e RONAN) em qualquer um (garantido por RLS).
  - Exclusão é lógica: o registro sai das telas, da última km e dos indicadores, mas fica no banco com quem excluiu, quando e por quê; a auditoria grava os dados anteriores (ação EXCLUSAO). Não há exclusão física de viagens e abastecimentos.
  - Veículo e usuário excluídos são arquivados com justificativa. O histórico é preservado e o usuário excluído tem o acesso bloqueado. Não exclui veículo em uso, usuário com veículo, o próprio acesso nem o último administrador.
- Um veículo só pode estar com uma pessoa por vez; cada pessoa só com um veículo.
- Funcionário só registra viagem/abastecimento com o veículo assumido; só libera o próprio veículo.
- Liberação administrativa exige confirmação e justificativa, e fica na auditoria.
- Última km = maior km de chegada entre as viagens de todos os usuários do veículo; nunca retrocede. Viagem nova não pode começar abaixo dela. Lacunas e retrocessos aparecem em "Pontos de atenção" (Visão geral), na coluna "Conflitos de km" do ciclo e no Registro, sem alterar os registros originais.
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
2. Consumo médio real: exige registrar se o abastecimento completou o tanque (campo novo, a decidir).
3. Reserva de veículos: não existe; o indicador mostra 0.
4. Homologação; a troca do sistema antigo só com aprovação.
