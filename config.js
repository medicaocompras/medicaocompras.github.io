"use strict";

function getApplicationRootUrl() {
    const path = window.location.pathname;

    if (path.endsWith("/")) {
        return `${window.location.origin}${path}`;
    }

    const lastSlash = path.lastIndexOf("/");
    return `${window.location.origin}${path.slice(0, lastSlash + 1)}`;
}

const APP_CONFIG = Object.freeze({
    auth: Object.freeze({
        // Entra ID > Registros de aplicativo > Visão geral > ID do aplicativo (cliente)
        clientId: "3083d2ab-ae97-41af-8bb3-1bf8beeecd8f",

        // Entra ID > Visão geral > ID do locatário (tenant)
        tenantId: "b290d65a-e9bb-439f-8678-5044b213655f",

        // Deve estar cadastrado como URI de redirecionamento do tipo SPA no Entra ID.
        redirectUri: getApplicationRootUrl(),

        // O acesso continua limitado aos arquivos que o usuário já pode abrir no SharePoint.
        graphScopes: Object.freeze(["User.Read", "Sites.Read.All"])
    }),

    sharePoint: Object.freeze({
        hostname: "brasilatacorp.sharepoint.com",
        sitePath: "/sites/Departamentos",
        documentLibraryName: "Documentos",

        filePath: "Unidade_SP/GSL/01_COMPRAS/Medicao_Contratos/Paradigma_Contratos.xlsx",

        worksheetName: "Report - Contrato – Relatório d",
        refreshIntervalMs: 5 * 60 * 1000
    })
});
