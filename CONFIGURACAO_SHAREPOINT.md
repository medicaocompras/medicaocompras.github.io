# Configuração do portal com Microsoft Entra ID e SharePoint

Este projeto não publica os contratos dentro de um arquivo JavaScript. Depois do login Microsoft, o navegador consulta a planilha protegida no SharePoint, lê a aba `Planilha1` e mantém os dados somente na memória da página.

## Dados já configurados no projeto

- SharePoint: `brasilatacorp.sharepoint.com`
- Site: `/sites/Departamentos`
- Biblioteca: `Documentos Partilhados`
- Pasta: `Unidade_SP/ESC/05_CONTRATOS`
- Arquivo: `Contratos TI - Responsáveis Medição.xlsx`
- Aba: `Planilha1`
- Verificação automática: a cada 5 minutos

O portal também verifica novamente:

- quando o usuário abre o portal;
- quando clica em **Atualizar agora**;
- quando volta para a aba do navegador;
- quando volta para a janela do navegador.

## Informações necessárias

Você precisa obter somente estas informações no Microsoft Entra ID:

1. **ID do aplicativo (cliente)**, também chamado de `clientId`;
2. **ID do diretório (locatário)**, também chamado de `tenantId`;
3. a URL final do GitHub Pages, por exemplo:
   `https://seuusuario.github.io/Medicaocontrato/`.

Não crie e não coloque um `client secret` no projeto. Um site estático não consegue proteger segredos.

---

## Etapa 1 — Registrar o aplicativo no Entra ID

1. Entre em `https://entra.microsoft.com` com uma conta que possa registrar aplicativos.
2. Abra **Identidade**.
3. Abra **Aplicativos**.
4. Clique em **Registros de aplicativo**.
5. Clique em **Novo registro**.
6. Use um nome como:
   `Portal de Medição de Contratos`.
7. Em **Tipos de conta com suporte**, escolha:
   **Contas somente neste diretório organizacional**.
8. A URI de redirecionamento pode ser deixada vazia nesta primeira tela.
9. Clique em **Registrar**.

Na página **Visão geral**, copie:

- **ID do aplicativo (cliente)**;
- **ID do diretório (locatário)**.

Você usará os dois no arquivo `config.js`.

---

## Etapa 2 — Configurar a autenticação do GitHub Pages

1. Dentro do aplicativo registrado, abra **Autenticação**.
2. Clique em **Adicionar uma plataforma**.
3. Escolha **Aplicativo de página única — SPA**.
4. Adicione a URL exata do site publicado.

Exemplo:

```text
https://seuusuario.github.io/Medicaocontrato/
```

A URL deve ser exatamente igual, incluindo:

- `https`;
- letras maiúsculas ou minúsculas do caminho;
- nome do repositório;
- barra `/` no final.

Para testar localmente, adicione também:

```text
http://localhost:8000/
```

5. Salve a configuração.

Não marque a plataforma como **Web**. Para HTML e JavaScript executados no navegador, a plataforma correta é **SPA**.

---

## Etapa 3 — Adicionar permissões do Microsoft Graph

1. Abra **Permissões de API**.
2. Clique em **Adicionar uma permissão**.
3. Selecione **Microsoft Graph**.
4. Escolha **Permissões delegadas**.
5. Adicione:

```text
User.Read
Sites.Read.All
```

Essas permissões fazem o aplicativo agir em nome do usuário conectado. O usuário ainda precisa possuir acesso normal à planilha no SharePoint.

6. Se a política da empresa exigir, clique em **Conceder consentimento do administrador para o diretório**.

Se você não possuir permissão administrativa, solicite ao administrador do Microsoft 365 que aprove o aplicativo e essas permissões.

---

## Etapa 4 — Preencher o arquivo config.js

Abra `config.js` e substitua:

```javascript
clientId: "COLE_AQUI_O_CLIENT_ID",
tenantId: "COLE_AQUI_O_TENANT_ID",
```

Exemplo fictício:

```javascript
clientId: "11111111-2222-3333-4444-555555555555",
tenantId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
```

Não altere os outros dados se o arquivo realmente estiver neste caminho:

```text
Documentos Partilhados/
└── Unidade_SP/
    └── ESC/
        └── 05_CONTRATOS/
            └── Contratos TI - Responsáveis Medição.xlsx
```

### Atenção ao nome do arquivo

O nome configurado é:

```text
Contratos TI - Responsáveis Medição.xlsx
```

No SharePoint, confirme se o arquivo não possui sufixos como:

```text
Contratos TI - Responsáveis Medição (2).xlsx
```

Se possuir, corrija o nome no SharePoint ou altere `filePath` no `config.js`.

---

## Etapa 5 — Publicar no GitHub Pages

1. Remova os arquivos antigos do repositório.
2. Envie todos os arquivos desta versão, mantendo as pastas.
3. No GitHub, abra **Settings** do repositório.
4. Abra **Pages**.
5. Em **Build and deployment**, selecione:
   - **Deploy from a branch**;
   - branch `main`;
   - pasta `/root`.
6. Salve.
7. Aguarde a URL do GitHub Pages aparecer.
8. Confirme que essa URL está cadastrada no Entra ID como URI de redirecionamento SPA.

Depois da publicação, abra o site com `Ctrl + F5` para evitar cache antigo.

---

## Etapa 6 — Testar localmente

Não abra o `index.html` diretamente com `file:///` porque a autenticação Microsoft exige uma URL HTTP cadastrada.

Na pasta do projeto, execute:

```bash
python -m http.server 8000
```

Depois abra:

```text
http://localhost:8000/
```

Essa mesma URL precisa estar cadastrada no Entra ID como URI SPA.

---

## Como a atualização funciona

O SharePoint informa ao portal a identificação da versão atual do arquivo (`eTag`).

A cada verificação, o portal:

1. autentica o usuário com o Microsoft Entra ID;
2. localiza o site `Departamentos`;
3. localiza a biblioteca `Documentos Partilhados`;
4. localiza o Excel pelo caminho configurado;
5. compara a versão do arquivo;
6. baixa e processa novamente somente quando necessário;
7. recria os filtros e os cards sem precisar publicar o site novamente.

O período padrão é de 5 minutos. Para alterar, edite:

```javascript
refreshIntervalMs: 5 * 60 * 1000
```

Exemplo para 2 minutos:

```javascript
refreshIntervalMs: 2 * 60 * 1000
```

Não é recomendável usar menos de 1 minuto, pois isso aumenta chamadas ao Microsoft Graph sem necessidade.

### Atualização exatamente no mesmo segundo

GitHub Pages é uma hospedagem estática. Ele não consegue receber um webhook diretamente do SharePoint. Portanto, esta versão faz uma atualização automática por verificação periódica, normalmente em até 5 minutos.

Para atualização totalmente orientada por evento, seria necessário um serviço com backend, como:

- Power Automate com endpoint intermediário;
- Azure Function;
- Azure Static Web Apps com API;
- outro servidor que receba notificações do Microsoft Graph.

Para este portal, a verificação periódica é mais simples, gratuita no GitHub Pages e não exige armazenar segredos.

---

## Erros comuns

### AADSTS50011 — Redirect URI mismatch

A URL aberta no navegador não é exatamente igual à URL cadastrada no Entra ID.

Confira:

- `http` ou `https`;
- domínio;
- nome do repositório;
- barra final;
- uso de `localhost` ou `127.0.0.1`.

### Erro 403

Possíveis causas:

- o usuário não possui acesso à planilha;
- o administrador ainda não aprovou `Sites.Read.All`;
- a política da empresa bloqueia consentimento de usuário;
- o aplicativo está no tenant incorreto.

### Erro 404

Confira em `config.js`:

- nome do arquivo;
- extensão `.xlsx`;
- pasta `Unidade_SP/ESC/05_CONTRATOS`;
- nome do site `/sites/Departamentos`.

### Biblioteca não encontrada

O código procura `Documentos Partilhados`. Em alguns tenants, o Microsoft Graph pode mostrar outro nome, como `Documentos` ou `Shared Documents`.

A mensagem de erro mostrará as bibliotecas encontradas. Copie o nome correto para:

```javascript
documentLibraryName: "Nome retornado pelo Microsoft Graph"
```

### A aba não existe

A aba esperada é:

```text
Planilha1
```

Se o nome mudar no Excel, altere:

```javascript
worksheetName: "Novo nome"
```

### Colunas obrigatórias ausentes

A primeira linha da aba precisa continuar com estas colunas:

```text
Estabel
Empresa
Número
Nome Abrev
Descrição
Conta
Descrição Conta
Centro de Custo
Descrição CC
Data de início
Data de fim
Quantidade de dias para término
Valor Plan
Valor Real
Medição
Suplente
```

A ordem pode mudar, mas os nomes precisam permanecer iguais.

---

## Segurança

- O `clientId` e o `tenantId` não são senhas.
- Não coloque `client secret`, senha, token ou chave no GitHub.
- Os tokens ficam no `sessionStorage` e são apagados quando a sessão do navegador termina.
- O Microsoft Graph respeita as permissões do usuário conectado.
- O repositório pode ser público, mas o conteúdo do Excel não será incluído nele.
- A planilha continua protegida pelo SharePoint e pelo Microsoft Entra ID.
