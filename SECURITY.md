# Segurança e publicação

## Situação atual

O projeto é um site estático. A validação de e-mail e código acontece em JavaScript no navegador.

Esse mecanismo pode organizar o acesso visual, mas não protege os arquivos. Quem conseguir abrir o site também pode tentar acessar diretamente:

```text
contractsData.js
config.js
script.js
```

O hash do código de acesso também fica disponível no front-end.

## GitHub Pages

Não utilize GitHub Pages para dados internos ou confidenciais. Mesmo um repositório privado não transforma uma página publicada pelo GitHub Pages em um sistema corporativo seguro para esse caso.

## Opções recomendadas

### SharePoint ou Microsoft 365

Publique a solução em uma área acessível somente aos grupos autorizados. Para uma integração mais completa, transforme a interface em um componente SPFx e use as permissões do Microsoft 365.

### Microsoft Entra ID

Registre uma aplicação, configure os usuários ou grupos autorizados e use MSAL para autenticação. Os dados devem ser servidos por uma API protegida, não por um arquivo JavaScript público.

### IIS ou servidor interno

Hospede o site e os dados em uma rede interna com autenticação Windows, controle de grupos e regras de acesso.

## Arquitetura ideal

```text
Usuário corporativo
        ↓
Microsoft Entra ID / autenticação interna
        ↓
Site protegido
        ↓
API protegida
        ↓
Banco de dados ou arquivo em área privada
```

Nessa arquitetura, `contractsData.js` deve ser substituído por uma chamada autenticada à API.
