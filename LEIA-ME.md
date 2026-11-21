# Let e Ju — convite com confirmação de presença

Este projeto contém o site visual, o formulário RSVP, o mural com 30 lugares e a estrutura de backend para Supabase + aviso por e-mail.

## O que já está preparado
- Convite responsivo inspirado na arte enviada.
- Confirmação de presença ou ausência.
- Até 2 acompanhantes (3 pessoas contando o convidado principal).
- Nome e foto individual para cada pessoa confirmada.
- Mural público com 30 cadeiras circulares, foto e nome.
- Proteção de capacidade no banco: não aceita confirmações acima de 30 lugares.
- Função de notificação por e-mail usando Resend.

## Antes de publicar
O projeto ainda precisa ser conectado às suas contas. Não compartilhe senhas ou chaves privadas no chat.

### 1. Criar o Supabase
1. Crie um projeto em https://supabase.com/.
2. Abra SQL Editor e execute todo o conteúdo de `supabase/schema.sql`.
3. Em Project Settings > API, copie Project URL e anon/public key.
4. Cole esses dois valores em `config.js`.
5. A chave `service_role` nunca deve ser colocada em `config.js` ou em arquivos públicos.

### 2. Configurar o e-mail
1. Crie uma conta em https://resend.com/.
2. Para enviar para seu próprio e-mail, configure e verifique um domínio no Resend conforme as instruções do serviço. O endereço de teste `onboarding@resend.dev` tem limitações.
3. Instale a Supabase CLI e faça login.
4. Na pasta do projeto, configure os secrets:
   `supabase secrets set RESEND_API_KEY=re_sua_chave NOTIFY_EMAIL=seuemail@exemplo.com`
5. Publique a função:
   `supabase functions deploy notify-rsvp`
6. A função usa `onboarding@resend.dev` como remetente de teste. Depois de verificar um domínio no Resend, altere o remetente em `supabase/functions/notify-rsvp/index.ts`.

### 3. Testar localmente
Abra a pasta com VS Code e use a extensão Live Server. Sem preencher `config.js`, o site abre em modo de demonstração visual, mas não salva confirmações.

### 4. Publicar na Vercel
1. Envie a pasta para um repositório GitHub.
2. Importe o repositório em https://vercel.com/.
3. Como é um site estático, não precisa de build command; a pasta raiz é a própria pasta do projeto.
4. Após publicar, teste o formulário e o mural com confirmações de teste.

## Decisões de funcionamento
- Cada confirmação pode incluir o convidado principal e até 2 acompanhantes.
- Cada pessoa ocupa uma cadeira e precisa de nome + foto.
- O mural mostra os primeiros 30 lugares confirmados.
- O formulário não permite adicionar mais pessoas quando a mesa estiver cheia.
- A lista do mural é pública: qualquer pessoa que acessar o convite poderá ver nomes e fotos. Avise os convidados disso antes de coletar as imagens.
- Para corrigir ou remover confirmações, será necessário adicionar uma área administrativa autenticada; ela não está incluída nesta primeira versão.

## Atualização visual — elementos do Canva
A pasta `assets/` contém os elementos enviados do convite: título 22/Let e Ju, lettering Birthday Party, fotos de infância, chapéu, bolo e fundo com estrelas. Para trocar qualquer elemento depois, substitua o arquivo correspondente mantendo o mesmo nome e formato, ou altere o caminho no `index.html`/`styles.css`.

## Como atualizar a versão publicada (GitHub + Vercel)
1. Baixe e extraia a versão ZIP mais recente do projeto.
2. Abra a pasta `let-e-ju-rsvp` no VS Code. Confira se a pasta `assets` está junto de `index.html`, `styles.css` e `app.js`.
3. Teste localmente com Live Server. Faça uma confirmação de teste somente depois de conectar o Supabase; evite usar dados reais durante os testes.
4. No GitHub, abra o repositório do site e envie/substitua os arquivos atualizados. A forma mais simples é abrir o repositório, escolher **Add file > Upload files**, arrastar todo o conteúdo de `let-e-ju-rsvp` (incluindo a pasta `assets`) e confirmar em **Commit changes**. Se preferir GitHub Desktop, copie os arquivos para a pasta local do repositório e faça **Commit** e **Push**.
5. Na Vercel, abra o projeto ligado a esse repositório. Normalmente, assim que o GitHub recebe o commit, a Vercel inicia um novo deploy automaticamente. Acompanhe em **Deployments** até aparecer como pronto.
6. Abra o endereço publicado e atualize a página com Ctrl+F5. Confira o convite, formulário, fotos, mural e confirmação.

**Importante:** não apague nem substitua `config.js`, `supabase/schema.sql` ou `supabase/functions/notify-rsvp/index.ts` por versões vazias. A atualização visual não exige recriar o projeto Supabase, alterar o banco ou gerar novas chaves. Se a URL do Supabase e a chave pública já estão configuradas em `config.js`, mantenha esses valores no projeto atualizado. Nunca publique a chave `service_role`.
