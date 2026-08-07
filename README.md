# Portal de Medição de Contratos

Portal estático para consultar contratos diretamente de uma planilha protegida no SharePoint.

## O que mudou

A versão anterior publicava todos os contratos dentro de `contractsData.js`. Esta versão remove essa base estática.

Agora o portal:

- autentica o usuário pelo Microsoft Entra ID;
- consulta o SharePoint pelo Microsoft Graph;
- baixa a versão atual do Excel;
- lê a aba `Planilha1` no navegador;
- recria os contratos somente em memória;
- verifica mudanças automaticamente a cada 5 minutos;
- verifica novamente quando o usuário volta à aba;
- permite atualização manual pelo botão **Atualizar agora**.

## Estrutura

```text
.
├── index.html
├── style.css
├── script.js
├── config.js
├── contractsMapper.js
├── sharepointData.js
├── tutorials.js
├── CONFIGURACAO_SHAREPOINT.md
├── SECURITY.md
├── assets/
│   └── brasilata-symbol.png
└── tests/
    ├── application-smoke.test.js
    ├── contracts-mapper.test.js
    └── contracts-search.test.js
```

## Configuração obrigatória

Preencha no `config.js`:

```javascript
clientId: "COLE_AQUI_O_CLIENT_ID",
tenantId: "COLE_AQUI_O_TENANT_ID",
```

Depois registre a URL exata do GitHub Pages como **Single-page application — SPA** no Microsoft Entra ID.

O passo a passo completo está em `CONFIGURACAO_SHAREPOINT.md`.

## Caminho configurado

```text
https://brasilatacorp.sharepoint.com/sites/Departamentos
└── Documentos Partilhados
    └── Unidade_SP
        └── ESC
            └── 05_CONTRATOS
                └── Contratos TI - Responsáveis Medição.xlsx
```

A aba usada é `Planilha1`.

## Executar localmente

Cadastre `http://localhost:8000/` como URI SPA e execute:

```bash
python -m http.server 8000
```

Abra:

```text
http://localhost:8000/
```

## Testes

```bash
node tests/application-smoke.test.js
node tests/contracts-mapper.test.js
node tests/contracts-search.test.js
```

## Bibliotecas usadas

- Microsoft Authentication Library for JavaScript (MSAL Browser);
- Microsoft Graph;
- SheetJS Community Edition para leitura do `.xlsx` no navegador.

## Importante

Não coloque segredo de aplicativo no projeto. Aplicações SPA usam autenticação delegada sem `client secret`.
