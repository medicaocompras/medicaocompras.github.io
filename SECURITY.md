# Segurança

## Modelo atual

O site pode ser hospedado no GitHub Pages porque não contém os contratos.

O acesso aos dados acontece somente depois que o usuário entra com uma conta Microsoft corporativa. O navegador solicita um token delegado e consulta o Microsoft Graph. O Graph aplica as permissões reais que o usuário possui no SharePoint.

## O que pode ficar no GitHub

- `clientId`;
- `tenantId`;
- hostname, caminho do site, biblioteca e nome do arquivo;
- HTML, CSS e JavaScript do portal.

Esses identificadores não concedem acesso sozinhos.

## O que nunca deve ficar no GitHub

- client secret;
- senha;
- access token;
- refresh token;
- certificado privado;
- conteúdo exportado da planilha;
- arquivos com contratos internos.

## Permissões

O aplicativo solicita permissões delegadas:

- `User.Read`;
- `Sites.Read.All`.

Mesmo com essas permissões, o usuário somente consegue ler conteúdo ao qual sua conta possui acesso.

## Sessão

O MSAL usa `sessionStorage`. A sessão não é compartilhada permanentemente entre todas as janelas e é removida ao encerrar a sessão do navegador.

## Bibliotecas externas

O projeto carrega MSAL da CDN da Microsoft com validação de integridade SRI e carrega SheetJS da CDN oficial. Em um ambiente corporativo com política rígida, recomenda-se baixar as bibliotecas e servi-las junto ao projeto.
