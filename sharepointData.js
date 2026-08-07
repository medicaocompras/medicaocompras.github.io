"use strict";

(function exposeSharePointContracts(globalObject) {
    const GRAPH_ROOT = "https://graph.microsoft.com/v1.0";
    let msalClient = null;
    let activeAccount = null;
    let cachedSiteId = null;
    let cachedDriveId = null;
    let cachedETag = null;

    function isPlaceholder(value) {
        return !value || String(value).startsWith("COLE_AQUI_");
    }

    function assertConfiguration() {
        if (isPlaceholder(APP_CONFIG.auth.clientId) || isPlaceholder(APP_CONFIG.auth.tenantId)) {
            throw new Error(
                "A integração Microsoft ainda não foi configurada. Preencha clientId e tenantId no arquivo config.js."
            );
        }

        if (!globalObject.msal?.PublicClientApplication) {
            throw new Error("A biblioteca de autenticação Microsoft não foi carregada.");
        }

        if (!globalObject.XLSX?.read) {
            throw new Error("A biblioteca responsável por ler o Excel não foi carregada.");
        }

        if (!globalObject.ContractsMapper?.transformRowsToContracts) {
            throw new Error("O conversor de dados da planilha não foi carregado.");
        }
    }

    function createMsalClient() {
        const authority = `https://login.microsoftonline.com/${APP_CONFIG.auth.tenantId}`;

        return new globalObject.msal.PublicClientApplication({
            auth: {
                clientId: APP_CONFIG.auth.clientId,
                authority,
                redirectUri: APP_CONFIG.auth.redirectUri,
                postLogoutRedirectUri: APP_CONFIG.auth.redirectUri,
                navigateToLoginRequestUrl: true
            },
            cache: {
                cacheLocation: "sessionStorage",
                storeAuthStateInCookie: false
            },
            system: {
                loggerOptions: {
                    logLevel: globalObject.msal.LogLevel.Warning,
                    piiLoggingEnabled: false
                }
            }
        });
    }

    async function initialize() {
        assertConfiguration();
        msalClient = createMsalClient();

        const redirectResult = await msalClient.handleRedirectPromise();
        activeAccount = redirectResult?.account || msalClient.getAllAccounts()[0] || null;

        if (activeAccount) {
            msalClient.setActiveAccount(activeAccount);
        }

        return activeAccount;
    }

    async function signIn() {
        if (!msalClient) {
            assertConfiguration();
            msalClient = createMsalClient();
        }

        await msalClient.loginRedirect({
            scopes: [...APP_CONFIG.auth.graphScopes],
            prompt: "select_account"
        });
    }

    async function signOut() {
        if (!msalClient) return;

        await msalClient.logoutRedirect({
            account: activeAccount || msalClient.getActiveAccount() || undefined,
            postLogoutRedirectUri: APP_CONFIG.auth.redirectUri
        });
    }

    async function acquireAccessToken() {
        if (!msalClient) {
            await initialize();
        }

        if (!activeAccount) {
            activeAccount =
                msalClient.getActiveAccount() ||
                msalClient.getAllAccounts()[0] ||
                null;

            if (activeAccount) {
                msalClient.setActiveAccount(activeAccount);
            }
        }

        if (!activeAccount) {
            throw new Error("Nenhuma conta Microsoft foi encontrada. Entre novamente no portal.");
        }

        const request = {
            account: activeAccount,
            scopes: [...APP_CONFIG.auth.graphScopes]
        };

        try {
            const response = await msalClient.acquireTokenSilent(request);
            return response.accessToken;
        } catch (error) {
            const needsInteraction =
                error instanceof globalObject.msal.InteractionRequiredAuthError ||
                ["interaction_required", "consent_required", "login_required"].includes(error?.errorCode);

            if (needsInteraction) {
                await msalClient.acquireTokenRedirect(request);
                return null;
            }

            throw error;
        }
    }

    async function graphRequest(path, accessToken) {
        const response = await fetch(`${GRAPH_ROOT}${path}`, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                Accept: "application/json"
            }
        });

        if (!response.ok) {
            let graphMessage = "";

            try {
                const body = await response.json();
                graphMessage = body?.error?.message || "";
            } catch (_) {
                graphMessage = "";
            }

            const error = new Error(graphMessage || `Microsoft Graph retornou HTTP ${response.status}.`);
            error.status = response.status;
            throw error;
        }

        return response.json();
    }

    function normalizeName(value) {
        return String(value || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .trim()
            .toLocaleLowerCase("pt-BR");
    }

    function encodeGraphPath(path) {
        return String(path)
            .split("/")
            .filter(Boolean)
            .map((part) => encodeURIComponent(part))
            .join("/");
    }

    async function getSiteId(accessToken) {
        if (cachedSiteId) return cachedSiteId;

        const site = await graphRequest(
            `/sites/${APP_CONFIG.sharePoint.hostname}:${APP_CONFIG.sharePoint.sitePath}`,
            accessToken
        );
        cachedSiteId = site.id;
        return cachedSiteId;
    }

    async function getDriveId(siteId, accessToken) {
        if (cachedDriveId) return cachedDriveId;

        const result = await graphRequest(`/sites/${encodeURIComponent(siteId)}/drives`, accessToken);
        const configuredName = normalizeName(APP_CONFIG.sharePoint.documentLibraryName);
        const selectedDrive = result.value?.find((drive) => normalizeName(drive.name) === configuredName);

        if (!selectedDrive) {
            const available = (result.value || []).map((drive) => drive.name).join(", ");
            throw new Error(
                `A biblioteca “${APP_CONFIG.sharePoint.documentLibraryName}” não foi encontrada. ` +
                `Bibliotecas disponíveis: ${available || "nenhuma"}.`
            );
        }

        cachedDriveId = selectedDrive.id;
        return cachedDriveId;
    }

    async function enrichWorkbookMetadata(driveId, item, accessToken) {
        if (!item?.id) {
            throw new Error("O Microsoft Graph localizou a planilha, mas não retornou o ID do arquivo.");
        }

        // @microsoft.graph.downloadUrl is an instance annotation. In some
        // SharePoint/Graph responses it is omitted when $select is used on the
        // path/children query. Fetch the DriveItem again by ID without $select
        // so Graph can include the short-lived preauthenticated download URL.
        const fullItem = await graphRequest(
            `/drives/${encodeURIComponent(driveId)}/items/${encodeURIComponent(item.id)}`,
            accessToken
        );

        return {
            ...item,
            ...fullItem
        };
    }

    async function getWorkbookMetadata(driveId, accessToken) {
        const configuredPath = String(APP_CONFIG.sharePoint.filePath || "").trim();
        const pathParts = configuredPath.split("/").filter(Boolean);
        const configuredFileName = pathParts.pop();
        const folderPath = pathParts.join("/");
        const itemPath = encodeGraphPath(configuredPath);

        // Do not request @microsoft.graph.downloadUrl here. It is an instance
        // annotation and may be omitted when $select is used. First resolve the
        // DriveItem and then fetch it by ID without $select.
        const selectedFields = "id,name,eTag,cTag,lastModifiedDateTime,file";

        try {
            const item = await graphRequest(
                `/drives/${encodeURIComponent(driveId)}/root:/${itemPath}?$select=${encodeURIComponent(selectedFields)}`,
                accessToken
            );

            return await enrichWorkbookMetadata(driveId, item, accessToken);
        } catch (error) {
            if (error?.status !== 404 || !configuredFileName) throw error;

            // Fallback: list the folder and compare names without accents/case.
            const encodedFolderPath = encodeGraphPath(folderPath);
            const folderEndpoint = encodedFolderPath
                ? `/drives/${encodeURIComponent(driveId)}/root:/${encodedFolderPath}:/children`
                : `/drives/${encodeURIComponent(driveId)}/root/children`;
            const result = await graphRequest(
                `${folderEndpoint}?$select=${encodeURIComponent(selectedFields)}`,
                accessToken
            );
            const files = result.value || [];
            const selectedFile = files.find(
                (item) => item.file && normalizeName(item.name) === normalizeName(configuredFileName)
            );

            if (selectedFile) {
                return await enrichWorkbookMetadata(driveId, selectedFile, accessToken);
            }

            const availableFiles = files
                .filter((item) => item.file)
                .map((item) => item.name)
                .join(", ");

            const detailedError = new Error(
                `A planilha “${configuredFileName}” não foi encontrada em “${folderPath || "raiz"}”. ` +
                `Arquivos disponíveis: ${availableFiles || "nenhum"}.`
            );
            detailedError.status = 404;
            throw detailedError;
        }
    }

    async function downloadWorkbook(metadata) {
        const downloadUrl = metadata?.["@microsoft.graph.downloadUrl"];

        if (!downloadUrl) {
            const fileName = metadata?.name || APP_CONFIG.sharePoint.filePath || "planilha";
            const itemId = metadata?.id ? ` (DriveItem ${metadata.id})` : "";
            throw new Error(
                `A planilha “${fileName}” foi localizada${itemId}, mas o Microsoft Graph não retornou ` +
                "@microsoft.graph.downloadUrl. Atualize a página e tente novamente; se persistir, confira a resposta " +
                "da chamada /drives/{driveId}/items/{itemId} na aba Network."
            );
        }

        // The URL is already preauthenticated. Do not send the Graph bearer token.
        const response = await fetch(downloadUrl);

        if (!response.ok) {
            throw new Error(`Não foi possível baixar a planilha. HTTP ${response.status}.`);
        }

        return response.arrayBuffer();
    }

    function parseWorkbook(arrayBuffer) {
        const workbook = globalObject.XLSX.read(arrayBuffer, {
            type: "array",
            cellDates: true,
            cellNF: false,
            cellText: false
        });
        const worksheet = workbook.Sheets[APP_CONFIG.sharePoint.worksheetName];

        if (!worksheet) {
            throw new Error(`A aba “${APP_CONFIG.sharePoint.worksheetName}” não existe na planilha.`);
        }

        const rows = globalObject.XLSX.utils.sheet_to_json(worksheet, {
            header: 1,
            defval: null,
            raw: true,
            blankrows: false
        });

        return globalObject.ContractsMapper.transformRowsToContracts(rows, globalObject.XLSX);
    }

    function freezeContracts(contracts) {
        return Object.freeze(contracts.map((contract) => Object.freeze(contract)));
    }

    async function loadContracts({ force = false } = {}) {
        const accessToken = await acquireAccessToken();
        if (!accessToken) return { changed: false, redirected: true };

        const siteId = await getSiteId(accessToken);
        const driveId = await getDriveId(siteId, accessToken);
        const metadata = await getWorkbookMetadata(driveId, accessToken);
        const nextETag = metadata.eTag || metadata.cTag || metadata.lastModifiedDateTime;
        const checkedAt = new Date().toISOString();

        if (!force && cachedETag && nextETag === cachedETag && Array.isArray(globalObject.contractsData)) {
            globalObject.contractsDataMetadata = Object.freeze({
                ...(globalObject.contractsDataMetadata || {}),
                lastCheckedAt: checkedAt
            });
            return { changed: false, metadata: globalObject.contractsDataMetadata };
        }

        const content = await downloadWorkbook(metadata);
        const parsed = parseWorkbook(content);

        globalObject.contractsData = freezeContracts(parsed.contracts);
        globalObject.contractsDataMetadata = Object.freeze({
            source: "Microsoft SharePoint",
            sourceFile: metadata.name,
            sourcePath: APP_CONFIG.sharePoint.filePath,
            sourceSheet: APP_CONFIG.sharePoint.worksheetName,
            sourceColumns: Object.freeze([...parsed.headers]),
            records: parsed.contracts.length,
            lastModifiedDateTime: metadata.lastModifiedDateTime,
            lastCheckedAt: checkedAt,
            eTag: nextETag
        });

        cachedETag = nextETag;

        return {
            changed: true,
            contracts: globalObject.contractsData,
            metadata: globalObject.contractsDataMetadata
        };
    }

    globalObject.SharePointContracts = Object.freeze({
        initialize,
        signIn,
        signOut,
        loadContracts,
        getAccount: () => activeAccount
    });
})(window);
