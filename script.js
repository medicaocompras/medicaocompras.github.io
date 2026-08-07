"use strict";

const elements = {
    loginSection: document.getElementById("loginSection"),
    appSection: document.getElementById("appSection"),
    appFooter: document.getElementById("appFooter"),
    appNavigation: document.getElementById("appNavigation"),
    accessForm: document.getElementById("accessForm"),
    loginButton: document.getElementById("loginButton"),
    loginMessage: document.getElementById("loginMessage"),
    userArea: document.getElementById("userArea"),
    userName: document.getElementById("userName"),
    logoutButton: document.getElementById("logoutButton"),
    portalTitle: document.getElementById("portalTitle"),
    contractsView: document.getElementById("contractsView"),
    tutorialView: document.getElementById("tutorialView"),
    tutorialTitle: document.getElementById("tutorialTitle"),
    tutorialDescription: document.getElementById("tutorialDescription"),
    videoWrapper: document.getElementById("videoWrapper"),
    loadVideoButton: document.getElementById("loadVideoButton"),
    contractFilters: document.getElementById("contractFilters"),
    contractSearchInput: document.getElementById("contractSearchInput"),
    clearContractSearch: document.getElementById("clearContractSearch"),
    clearContractFilters: document.getElementById("clearContractFilters"),
    emptyStateClearFilters: document.getElementById("emptyStateClearFilters"),
    mobileFiltersButton: document.getElementById("mobileFiltersButton"),
    mobileFilterCount: document.getElementById("mobileFilterCount"),
    advancedFilters: document.getElementById("advancedFilters"),
    responsibleFilter: document.getElementById("responsibleFilter"),
    statusFilter: document.getElementById("statusFilter"),
    establishmentFilter: document.getElementById("establishmentFilter"),
    categoryFilter: document.getElementById("categoryFilter"),
    sortFilter: document.getElementById("sortFilter"),
    activeFilters: document.getElementById("activeFilters"),
    contractTableContainer: document.getElementById("contractTableContainer"),
    contractTableBody: document.getElementById("contractTableBody"),
    contractCardList: document.getElementById("contractCardList"),
    contractEmptyState: document.getElementById("contractEmptyState"),
    emptyStateMessage: document.getElementById("emptyStateMessage"),
    contractResultCount: document.getElementById("contractResultCount"),
    sortDescription: document.getElementById("sortDescription"),
    contractDataSource: document.getElementById("contractDataSource"),
    refreshContractsButton: document.getElementById("refreshContractsButton"),
    totalContractsCount: document.getElementById("totalContractsCount"),
    activeContractsCount: document.getElementById("activeContractsCount"),
    soonContractsCount: document.getElementById("soonContractsCount"),
    expiredContractsCount: document.getElementById("expiredContractsCount"),
    pagination: document.getElementById("pagination"),
    previousPageButton: document.getElementById("previousPageButton"),
    nextPageButton: document.getElementById("nextPageButton"),
    pageInformation: document.getElementById("pageInformation"),
    contractDialog: document.getElementById("contractDialog"),
    contractDialogContent: document.getElementById("contractDialogContent"),
    dialogTitle: document.getElementById("dialogTitle"),
    closeContractDialog: document.getElementById("closeContractDialog")
};

const state = {
    contractSearchTimer: null,
    resizeTimer: null,
    filteredContracts: [],
    supplierResponsibleIndex: new Map(),
    contractIdMap: new WeakMap(),
    currentPage: 1,
    pageSize: getResponsivePageSize(),
    contractsInitialized: false,
    activeView: "contracts",
    videoLoaded: false,
    filtersRestored: false,
    lastDialogTrigger: null,
    dataRefreshTimer: null,
    dataLoadInProgress: false
};

const sortLabels = {
    urgency: "Ordenado por urgência: vencidos e próximos primeiro",
    "end-asc": "Ordenado pela data de término mais próxima",
    "end-desc": "Ordenado pela data de término mais distante",
    "contract-asc": "Ordenado pelo número do contrato",
    "supplier-asc": "Ordenado pelo fornecedor de A a Z",
    "responsible-asc": "Ordenado pelo responsável de A a Z"
};

function foldText(value = "") {
    return String(value)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLocaleLowerCase("pt-BR");
}

function normalizeText(value = "") {
    return foldText(value).trim();
}

function normalizeEmail(value = "") {
    return String(value).trim().toLocaleLowerCase("pt-BR");
}

function getEmailDomain(email) {
    const parts = email.split("@");
    return parts.length === 2 ? parts[1] : "";
}

function isAllowedCorporateEmail(email) {
    const domain = getEmailDomain(normalizeEmail(email));
    return APP_CONFIG.allowedDomains.some(
        (allowedDomain) => domain === allowedDomain.toLocaleLowerCase("pt-BR")
    );
}

function escapeHtml(value = "") {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function getResponsivePageSize() {
    if (typeof window === "undefined" || !window.matchMedia) {
        return 20;
    }

    if (window.matchMedia("(max-width: 480px)").matches) {
        return 8;
    }

    if (window.matchMedia("(max-width: 899px)").matches) {
        return 12;
    }

    return 20;
}

function compareText(firstValue, secondValue) {
    return String(firstValue || "").localeCompare(
        String(secondValue || ""),
        "pt-BR",
        { sensitivity: "base", numeric: true }
    );
}

function createMissingValue(label = "Não informado") {
    return `<span class="missing-information">${escapeHtml(label)}</span>`;
}

function createDisplayedValue(value, fallback = "Não informado") {
    return value !== null && value !== undefined && value !== ""
        ? escapeHtml(value)
        : createMissingValue(fallback);
}

function highlightText(value, rawQuery) {
    const source = String(value ?? "");
    const terms = normalizeText(rawQuery).split(/\s+/).filter(Boolean);

    if (!source || !terms.length) {
        return escapeHtml(source);
    }

    const normalizedCharacters = [];
    const indexMap = [];
    let sourceIndex = 0;

    for (const character of Array.from(source)) {
        const foldedCharacter = foldText(character);
        const characterStart = sourceIndex;
        sourceIndex += character.length;

        for (const normalizedCharacter of Array.from(foldedCharacter)) {
            normalizedCharacters.push(normalizedCharacter);
            indexMap.push({ start: characterStart, end: sourceIndex });
        }
    }

    const normalizedSource = normalizedCharacters.join("");
    const ranges = [];

    terms.forEach((term) => {
        let searchFrom = 0;
        let foundIndex = normalizedSource.indexOf(term, searchFrom);

        while (foundIndex !== -1) {
            const firstMap = indexMap[foundIndex];
            const lastMap = indexMap[foundIndex + term.length - 1];

            if (firstMap && lastMap) {
                ranges.push([firstMap.start, lastMap.end]);
            }

            searchFrom = foundIndex + Math.max(term.length, 1);
            foundIndex = normalizedSource.indexOf(term, searchFrom);
        }
    });

    if (!ranges.length) {
        return escapeHtml(source);
    }

    ranges.sort((first, second) => first[0] - second[0]);
    const mergedRanges = [];

    ranges.forEach((range) => {
        const previous = mergedRanges[mergedRanges.length - 1];

        if (previous && range[0] <= previous[1]) {
            previous[1] = Math.max(previous[1], range[1]);
            return;
        }

        mergedRanges.push([...range]);
    });

    let cursor = 0;
    let markup = "";

    mergedRanges.forEach(([start, end]) => {
        markup += escapeHtml(source.slice(cursor, start));
        markup += `<mark>${escapeHtml(source.slice(start, end))}</mark>`;
        cursor = end;
    });

    markup += escapeHtml(source.slice(cursor));
    return markup;
}

function setLoginMessage(message = "", type = "error") {
    elements.loginMessage.textContent = message;
    elements.loginMessage.classList.toggle("success", type === "success");
}

function setLoginLoading(isLoading) {
    elements.loginButton.disabled = isLoading;
    elements.loginButton.innerHTML = isLoading
        ? "<span>Redirecionando para a Microsoft...</span>"
        : `<span class="microsoft-symbol" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
           <span>Entrar com a Microsoft</span>`;
}

async function handleLogin(event) {
    event.preventDefault();
    setLoginMessage();
    setLoginLoading(true);

    try {
        await window.SharePointContracts.signIn();
    } catch (error) {
        console.error("Erro ao iniciar login Microsoft:", error);
        setLoginMessage(error.message || "Não foi possível abrir o login da Microsoft.");
        setLoginLoading(false);
    }
}

async function handleLogout() {
    stopAutomaticRefresh();

    try {
        await window.SharePointContracts.signOut();
    } catch (error) {
        console.error("Erro ao sair da conta Microsoft:", error);
        setLoginMessage("Não foi possível encerrar a sessão Microsoft.");
        showLogin();
    }
}

function showLogin() {
    elements.loginSection.classList.remove("hidden");
    elements.appSection.classList.add("hidden");
    elements.appFooter.classList.add("hidden");
    elements.userArea.classList.add("hidden");
    elements.appNavigation.classList.add("hidden");
    document.title = "Contratos | Brasilata";
    window.scrollTo({ top: 0, behavior: "instant" });
}

function setRefreshLoading(isLoading) {
    state.dataLoadInProgress = isLoading;
    elements.refreshContractsButton.disabled = isLoading;
    elements.refreshContractsButton.textContent = isLoading ? "Atualizando..." : "Atualizar agora";
}

function preserveFilterValues() {
    return {
        responsible: elements.responsibleFilter.value,
        status: elements.statusFilter.value,
        establishment: elements.establishmentFilter.value,
        category: elements.categoryFilter.value,
        sort: elements.sortFilter.value,
        search: elements.contractSearchInput.value
    };
}

function restorePreservedFilterValues(values) {
    const setIfAvailable = (element, value) => {
        if (!value) return;
        if ([...element.options].some((option) => option.value === value)) {
            element.value = value;
        }
    };

    elements.contractSearchInput.value = values.search || "";
    setIfAvailable(elements.responsibleFilter, values.responsible);
    setIfAvailable(elements.statusFilter, values.status);
    setIfAvailable(elements.establishmentFilter, values.establishment);
    setIfAvailable(elements.categoryFilter, values.category);
    setIfAvailable(elements.sortFilter, values.sort);
    updateSearchClearButton();
}

async function refreshContracts({ force = false, initial = false } = {}) {
    if (state.dataLoadInProgress) return false;

    const previousFilters = preserveFilterValues();
    const filtersWereAlreadyRestored = state.filtersRestored;
    setRefreshLoading(true);

    if (initial && !getContracts().length) {
        showContractLoading();
    }

    try {
        const result = await window.SharePointContracts.loadContracts({ force });

        if (result?.redirected) return false;

        if (result?.changed || !state.contractsInitialized) {
            state.contractsInitialized = false;
            state.contractIdMap = new WeakMap();
            state.supplierResponsibleIndex = new Map();

            const initialized = initializeContracts();
            if (!initialized) return false;

            if (filtersWereAlreadyRestored) {
                restorePreservedFilterValues(previousFilters);
                applyContractFilters({ resetPage: false });
            }
        } else {
            updateContractDataSourceNote();
        }

        return true;
    } catch (error) {
        console.error("Erro ao carregar a planilha do SharePoint:", error);

        const friendlyMessage = getFriendlySharePointError(error);
        if (getContracts().length && state.contractsInitialized) {
            elements.contractDataSource.textContent = `Falha na última verificação: ${friendlyMessage}`;
        } else {
            showContractLoadError(friendlyMessage);
        }

        return false;
    } finally {
        setRefreshLoading(false);
    }
}

function getFriendlySharePointError(error) {
    if (error?.status === 401) {
        return "Sua sessão expirou. Saia e entre novamente.";
    }

    if (error?.status === 403) {
        return "Sua conta não tem permissão para acessar esta planilha ou o administrador ainda não aprovou a permissão do aplicativo.";
    }

    if (error?.status === 404) {
        return "A planilha não foi encontrada no caminho configurado. Confira o nome do arquivo e as pastas no config.js.";
    }

    return error?.message || "Não foi possível consultar a planilha no SharePoint.";
}

function startAutomaticRefresh() {
    stopAutomaticRefresh();

    const interval = Number(APP_CONFIG.sharePoint.refreshIntervalMs);
    if (!Number.isFinite(interval) || interval < 60000) return;

    state.dataRefreshTimer = window.setInterval(() => {
        if (document.visibilityState === "visible") {
            refreshContracts();
        }
    }, interval);
}

function stopAutomaticRefresh() {
    if (!state.dataRefreshTimer) return;
    window.clearInterval(state.dataRefreshTimer);
    state.dataRefreshTimer = null;
}

function refreshWhenVisible() {
    if (document.visibilityState === "visible" && window.SharePointContracts.getAccount()) {
        refreshContracts();
    }
}

async function showApplication(account) {
    const email = account?.username || "Usuário Microsoft";
    const displayName = account?.name || email;

    elements.loginSection.classList.add("hidden");
    elements.appSection.classList.remove("hidden");
    elements.appFooter.classList.remove("hidden");
    elements.userArea.classList.remove("hidden");
    elements.appNavigation.classList.remove("hidden");
    elements.userName.textContent = displayName;
    const avatar = elements.userArea.querySelector?.(".user-avatar");
    if (avatar) avatar.textContent = displayName.charAt(0).toLocaleUpperCase("pt-BR") || "U";

    loadTutorialMetadata();

    const requestedView = getUrlParameter("view") === "tutorial" ? "tutorial" : "contracts";
    setActiveView(requestedView, { focus: false, updateUrl: false });

    document.title = "Consulta de Contratos | Brasilata";
    window.scrollTo({ top: 0, behavior: "instant" });

    await refreshContracts({ force: true, initial: true });
    startAutomaticRefresh();

    requestAnimationFrame(() => {
        const title = requestedView === "tutorial" ? elements.tutorialTitle : elements.portalTitle;
        title.focus();
    });
}

function getUrlParameter(name) {
    if (typeof window === "undefined" || !window.location || !window.URLSearchParams) {
        return "";
    }

    return new URLSearchParams(window.location.search).get(name) || "";
}

function updateUrlState() {
    if (
        typeof window === "undefined" ||
        !window.location ||
        !window.history ||
        !window.URL ||
        !window.URLSearchParams
    ) {
        return;
    }

    const url = new URL(window.location.href);
    const parameters = {
        view: state.activeView === "tutorial" ? "tutorial" : "",
        q: elements.contractSearchInput.value.trim(),
        responsible: elements.responsibleFilter.value,
        status: elements.statusFilter.value,
        establishment: elements.establishmentFilter.value,
        category: elements.categoryFilter.value,
        sort: elements.sortFilter.value === "urgency" ? "" : elements.sortFilter.value,
        page: state.currentPage > 1 ? String(state.currentPage) : ""
    };

    Object.entries(parameters).forEach(([name, value]) => {
        if (value) {
            url.searchParams.set(name, value);
        } else {
            url.searchParams.delete(name);
        }
    });

    window.history.replaceState({}, "", url);
}

function setActiveView(view, { focus = true, updateUrl = true } = {}) {
    const nextView = view === "tutorial" ? "tutorial" : "contracts";
    state.activeView = nextView;

    elements.contractsView.classList.toggle("hidden", nextView !== "contracts");
    elements.tutorialView.classList.toggle("hidden", nextView !== "tutorial");

    document.querySelectorAll("[data-view].navigation-tab").forEach((button) => {
        const isActive = button.dataset.view === nextView;
        button.classList.toggle("is-active", isActive);
        if (isActive) button.setAttribute("aria-current", "page");
        else button.removeAttribute("aria-current");
    });

    if (updateUrl) {
        updateUrlState();
    }

    if (focus) {
        const target = nextView === "tutorial" ? elements.tutorialTitle : elements.portalTitle;
        target.focus();
        window.scrollTo({ top: 0, behavior: "smooth" });
    }
}

function loadTutorialMetadata() {
    const tutorial = Array.isArray(tutorials) ? tutorials[0] : null;

    if (!tutorial) {
        elements.tutorialTitle.textContent = "Tutorial indisponível";
        elements.tutorialDescription.textContent = "Não foi possível carregar os dados do tutorial.";
        elements.loadVideoButton.disabled = true;
        return;
    }

    elements.tutorialTitle.textContent = tutorial.title;
    elements.tutorialDescription.textContent = tutorial.description;
}

function loadTutorialVideo() {
    const tutorial = Array.isArray(tutorials) ? tutorials[0] : null;

    if (!tutorial || state.videoLoaded) {
        return;
    }

    const privacyUrl = tutorial.youtubeEmbedUrl.replace("youtube.com", "youtube-nocookie.com");
    elements.videoWrapper.classList.remove("video-placeholder");
    elements.videoWrapper.innerHTML = `
        <iframe
            src="${escapeHtml(privacyUrl)}?rel=0&autoplay=1"
            title="Tutorial de Medição de Contratos"
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowfullscreen>
        </iframe>
    `;
    state.videoLoaded = true;
}

function resetTutorialVideo() {
    state.videoLoaded = false;
    elements.videoWrapper.classList.add("video-placeholder");
    elements.videoWrapper.innerHTML = `
        <div class="video-placeholder-content">
            <span class="play-icon" aria-hidden="true">▶</span>
            <strong>Tutorial de Medição de Contratos</strong>
            <button id="loadVideoButton" class="button button-primary" type="button">Reproduzir tutorial</button>
        </div>
    `;
    elements.loadVideoButton = document.getElementById("loadVideoButton");
    elements.loadVideoButton.addEventListener("click", loadTutorialVideo);
}

function getContracts() {
    return Array.isArray(window.contractsData) ? window.contractsData : [];
}

function parseIsoDate(value) {
    if (!value || typeof value !== "string") {
        return null;
    }

    const parts = value.split("-").map(Number);

    if (parts.length !== 3 || parts.some((part) => !Number.isFinite(part))) {
        return null;
    }

    return new Date(parts[0], parts[1] - 1, parts[2]);
}

function getContractStatus(contract) {
    const endDate = parseIsoDate(contract.dataFim);

    if (!endDate) {
        return { key: "sem-data", label: "Data não informada", daysUntil: null };
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const daysUntil = Math.round((endDate.getTime() - today.getTime()) / 86400000);

    if (daysUntil < 0) {
        return { key: "vencido", label: "Vencido", daysUntil };
    }

    if (daysUntil <= 90) {
        return { key: "proximo", label: "Próximo do vencimento", daysUntil };
    }

    return { key: "ativo", label: "Ativo", daysUntil };
}

function formatDate(value) {
    const date = parseIsoDate(value);
    return date ? new Intl.DateTimeFormat("pt-BR").format(date) : "Não informada";
}

function formatCurrency(value) {
    if (value === null || value === undefined || value === "") {
        return "Não informado";
    }

    const number = Number(value);

    if (!Number.isFinite(number)) {
        return String(value);
    }

    return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL"
    }).format(number);
}

function formatQuantity(value) {
    if (value === null || value === undefined || value === "") {
        return "—";
    }

    const number = Number(value);
    if (!Number.isFinite(number)) {
        return String(value);
    }

    return new Intl.NumberFormat("pt-BR", {
        maximumFractionDigits: 4
    }).format(number);
}

function formatStatusDetail(status) {
    if (status.daysUntil === null) {
        return "Sem data de término";
    }

    if (status.daysUntil < 0) {
        const days = Math.abs(status.daysUntil);
        return days === 1 ? "Vencido há 1 dia" : `Vencido há ${days} dias`;
    }

    if (status.daysUntil === 0) {
        return "Vence hoje";
    }

    return status.daysUntil === 1 ? "Vence em 1 dia" : `Vence em ${status.daysUntil} dias`;
}

function buildContractIndexes() {
    const supplierIndex = new Map();

    getContracts().forEach((contract, index) => {
        state.contractIdMap.set(contract, String(index));
        const supplierKey = normalizeText(contract.fornecedor);

        if (!supplierKey || !contract.responsavel) {
            return;
        }

        if (!supplierIndex.has(supplierKey)) {
            supplierIndex.set(supplierKey, new Map());
        }

        supplierIndex
            .get(supplierKey)
            .set(normalizeText(contract.responsavel), contract.responsavel);
    });

    state.supplierResponsibleIndex = new Map(
        [...supplierIndex.entries()].map(([supplier, responsibles]) => [
            supplier,
            [...responsibles.values()].sort(compareText)
        ])
    );
}

function getSupplierResponsibles(supplier) {
    return state.supplierResponsibleIndex.get(normalizeText(supplier)) || [];
}

function createSelectOptions(selectElement, values, defaultLabel, labelFormatter = (value) => value) {
    selectElement.innerHTML = [
        `<option value="">${escapeHtml(defaultLabel)}</option>`,
        ...values.map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(labelFormatter(value))}</option>`)
    ].join("");
}

function populateContractFilters() {
    const contracts = getContracts();
    const responsibles = [...new Set(contracts.map((contract) => contract.responsavel).filter(Boolean))].sort(compareText);
    const categories = [...new Set(contracts.map((contract) => contract.categoria).filter(Boolean))].sort(compareText);
    const establishmentCompanies = new Map();

    contracts.forEach((contract) => {
        if (contract.estabelecimento && !establishmentCompanies.has(contract.estabelecimento)) {
            establishmentCompanies.set(contract.estabelecimento, contract.empresa || "Empresa não informada");
        }
    });

    const establishments = [...establishmentCompanies.keys()].sort(compareText);

    createSelectOptions(elements.responsibleFilter, responsibles, "Todos os responsáveis");
    createSelectOptions(
        elements.establishmentFilter,
        establishments,
        "Todos os estabelecimentos",
        (establishment) => `${establishment} · ${establishmentCompanies.get(establishment)}`
    );
    createSelectOptions(elements.categoryFilter, categories, "Todas as categorias");
}

function restoreFiltersFromUrl() {
    if (state.filtersRestored) {
        return;
    }

    const setIfAvailable = (element, value) => {
        if (!value) return;
        const exists = [...element.options].some((option) => option.value === value);
        if (exists) element.value = value;
    };

    elements.contractSearchInput.value = getUrlParameter("q");
    setIfAvailable(elements.responsibleFilter, getUrlParameter("responsible"));
    setIfAvailable(elements.statusFilter, getUrlParameter("status"));
    setIfAvailable(elements.establishmentFilter, getUrlParameter("establishment"));
    setIfAvailable(elements.categoryFilter, getUrlParameter("category"));
    setIfAvailable(elements.sortFilter, getUrlParameter("sort"));

    const requestedPage = Number(getUrlParameter("page"));
    state.currentPage = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
    state.filtersRestored = true;
    updateSearchClearButton();
}

function getContractSearchContent(contract) {
    const itemContent = Array.isArray(contract.itens)
        ? contract.itens.flatMap((item) => [
            item.descricao,
            item.tipoConsumoMedicao,
            item.tipoMedicao
        ])
        : [];

    return [
        contract.numero,
        contract.fornecedor,
        contract.responsavel,
        contract.suplente,
        contract.empresa,
        contract.estabelecimento,
        contract.descricao,
        contract.conta,
        contract.categoria,
        contract.centroCusto,
        contract.descricaoCentroCusto,
        contract.dataInicio,
        contract.dataFim,
        ...itemContent
    ]
        .filter((value) => value !== null && value !== undefined && value !== "")
        .map(normalizeText)
        .join(" ");
}

function contractMatchesSearch(contract, normalizedSearch) {
    if (!normalizedSearch) {
        return true;
    }

    const searchableContent = getContractSearchContent(contract);
    return normalizedSearch
        .split(/\s+/)
        .filter(Boolean)
        .every((term) => searchableContent.includes(term));
}

function getUrgencyRank(contract) {
    const status = getContractStatus(contract);
    return { vencido: 0, proximo: 1, ativo: 2, "sem-data": 3 }[status.key] ?? 4;
}

function compareDates(firstContract, secondContract, direction = 1) {
    const firstDate = parseIsoDate(firstContract.dataFim);
    const secondDate = parseIsoDate(secondContract.dataFim);

    if (firstDate && secondDate) {
        return (firstDate.getTime() - secondDate.getTime()) * direction;
    }

    if (firstDate) return -1;
    if (secondDate) return 1;
    return 0;
}

function sortContracts(contracts) {
    const sortValue = elements.sortFilter.value;

    return [...contracts].sort((firstContract, secondContract) => {
        let difference = 0;

        if (sortValue === "urgency") {
            difference = getUrgencyRank(firstContract) - getUrgencyRank(secondContract);
            if (difference === 0) {
                const status = getContractStatus(firstContract).key;
                difference = compareDates(firstContract, secondContract, status === "vencido" ? -1 : 1);
            }
        } else if (sortValue === "end-asc") {
            difference = compareDates(firstContract, secondContract, 1);
        } else if (sortValue === "end-desc") {
            difference = compareDates(firstContract, secondContract, -1);
        } else if (sortValue === "contract-asc") {
            difference = compareText(firstContract.numero, secondContract.numero);
        } else if (sortValue === "supplier-asc") {
            difference = compareText(firstContract.fornecedor, secondContract.fornecedor);
        } else if (sortValue === "responsible-asc") {
            difference = compareText(firstContract.responsavel, secondContract.responsavel);
        }

        if (difference !== 0) {
            return difference;
        }

        const supplierDifference = compareText(firstContract.fornecedor, secondContract.fornecedor);
        return supplierDifference || compareText(firstContract.numero, secondContract.numero);
    });
}

function getFilteredContracts({ ignoreStatus = false } = {}) {
    const normalizedSearch = normalizeText(elements.contractSearchInput.value);
    const responsible = normalizeText(elements.responsibleFilter.value);
    const selectedStatus = elements.statusFilter.value;
    const establishment = normalizeText(elements.establishmentFilter.value);
    const category = normalizeText(elements.categoryFilter.value);

    const contracts = getContracts().filter((contract) => {
        const status = getContractStatus(contract);

        return (
            contractMatchesSearch(contract, normalizedSearch) &&
            (!responsible || normalizeText(contract.responsavel) === responsible) &&
            (ignoreStatus || !selectedStatus || status.key === selectedStatus) &&
            (!establishment || normalizeText(contract.estabelecimento) === establishment) &&
            (!category || normalizeText(contract.categoria) === category)
        );
    });

    return sortContracts(contracts);
}

function updateContractSummary() {
    const baseContracts = getFilteredContracts({ ignoreStatus: true });
    const counts = { ativo: 0, proximo: 0, vencido: 0 };

    baseContracts.forEach((contract) => {
        const status = getContractStatus(contract).key;
        if (Object.hasOwn(counts, status)) counts[status] += 1;
    });

    elements.totalContractsCount.textContent = String(baseContracts.length);
    elements.activeContractsCount.textContent = String(counts.ativo);
    elements.soonContractsCount.textContent = String(counts.proximo);
    elements.expiredContractsCount.textContent = String(counts.vencido);

    document.querySelectorAll("[data-summary-status]").forEach((button) => {
        const isActive = button.dataset.summaryStatus === elements.statusFilter.value;
        button.classList.toggle("is-active", isActive);
        button.setAttribute("aria-pressed", String(isActive));
    });
}

function getStatusBadgeMarkup(status) {
    return `<span class="status-badge status-badge-${status.key}">${escapeHtml(status.label)}</span>`;
}

function getContractId(contract) {
    return state.contractIdMap.get(contract) || "";
}

function createContractTableRow(contract) {
    const status = getContractStatus(contract);
    const query = elements.contractSearchInput.value;
    const contractId = getContractId(contract);

    return `
        <tr>
            <td>
                <span class="table-primary">${highlightText(contract.numero || "Não informado", query)}</span>
                <span class="table-secondary">${escapeHtml(contract.categoria || "Categoria não informada")}</span>
            </td>
            <td>
                <span class="table-primary">${highlightText(contract.fornecedor || "Fornecedor não informado", query)}</span>
                <span class="table-secondary">${highlightText(contract.descricao || "Descrição não informada", query)}</span>
            </td>
            <td><span class="table-primary">${contract.responsavel ? highlightText(contract.responsavel, query) : createMissingValue("Responsável não informado")}</span></td>
            <td>
                <span class="table-primary">${escapeHtml(contract.empresa || "Empresa não informada")}</span>
                <span class="table-secondary">Estabelecimento ${escapeHtml(contract.estabelecimento || "não informado")}</span>
            </td>
            <td>
                <span class="table-primary">${escapeHtml(formatDate(contract.dataFim))}</span>
                <span class="table-secondary">${escapeHtml(formatStatusDetail(status))}</span>
            </td>
            <td>${getStatusBadgeMarkup(status)}</td>
            <td><button class="button button-secondary button-small table-action" type="button" data-contract-id="${escapeHtml(contractId)}">Ver detalhes</button></td>
        </tr>
    `;
}

function createContractCard(contract) {
    const status = getContractStatus(contract);
    const query = elements.contractSearchInput.value;
    const contractId = getContractId(contract);

    return `
        <article class="contract-card status-${status.key}">
            <header class="contract-card-header">
                <div>
                    <span class="contract-number">Contrato ${highlightText(contract.numero || "Não informado", query)}</span>
                    <h3>${highlightText(contract.fornecedor || "Fornecedor não informado", query)}</h3>
                </div>
                ${getStatusBadgeMarkup(status)}
            </header>

            <div class="contract-compact-grid">
                <div class="compact-item">
                    <span>Responsável</span>
                    <strong>${contract.responsavel ? highlightText(contract.responsavel, query) : createMissingValue("Não informado")}</strong>
                </div>
                <div class="compact-item">
                    <span>Unidade</span>
                    <strong>${escapeHtml(contract.empresa || "Não informada")} · ${escapeHtml(contract.estabelecimento || "—")}</strong>
                </div>
                <div class="compact-item">
                    <span>Data de término</span>
                    <strong>${escapeHtml(formatDate(contract.dataFim))}</strong>
                </div>
                <div class="compact-item">
                    <span>Situação</span>
                    <strong>${escapeHtml(formatStatusDetail(status))}</strong>
                </div>
            </div>

            <button class="button button-secondary button-small table-action" type="button" data-contract-id="${escapeHtml(contractId)}">Ver detalhes</button>
        </article>
    `;
}

function getCurrentPageContracts() {
    const start = (state.currentPage - 1) * state.pageSize;
    return state.filteredContracts.slice(start, start + state.pageSize);
}

function getTotalPages() {
    return Math.max(1, Math.ceil(state.filteredContracts.length / state.pageSize));
}

function renderContractResults() {
    updateContractSummary();
    renderActiveFilters();
    updateMobileFilterCount();

    const totalContracts = state.filteredContracts.length;
    const totalPages = getTotalPages();

    if (state.currentPage > totalPages) {
        state.currentPage = totalPages;
    }

    if (!totalContracts) {
        elements.contractTableContainer.classList.add("hidden");
        elements.contractCardList.classList.add("hidden");
        elements.contractEmptyState.classList.remove("hidden");
        elements.pagination.classList.add("hidden");
        elements.contractTableBody.innerHTML = "";
        elements.contractCardList.innerHTML = "";
        elements.contractResultCount.textContent = "0 contratos encontrados";
        elements.emptyStateMessage.textContent = createEmptyStateText();
        elements.sortDescription.textContent = sortLabels[elements.sortFilter.value] || "";
        updateUrlState();
        return;
    }

    elements.contractEmptyState.classList.add("hidden");
    elements.contractTableContainer.classList.remove("hidden");
    elements.contractCardList.classList.remove("hidden");

    const pageContracts = getCurrentPageContracts();
    elements.contractTableBody.innerHTML = pageContracts.map(createContractTableRow).join("");
    elements.contractCardList.innerHTML = pageContracts.map(createContractCard).join("");

    const firstItem = (state.currentPage - 1) * state.pageSize + 1;
    const lastItem = Math.min(state.currentPage * state.pageSize, totalContracts);
    elements.contractResultCount.textContent = `${totalContracts} ${totalContracts === 1 ? "contrato encontrado" : "contratos encontrados"} — exibindo ${firstItem}–${lastItem}`;
    elements.sortDescription.textContent = sortLabels[elements.sortFilter.value] || "";

    elements.pagination.classList.toggle("hidden", totalPages <= 1);
    elements.previousPageButton.disabled = state.currentPage <= 1;
    elements.nextPageButton.disabled = state.currentPage >= totalPages;
    elements.pageInformation.textContent = `Página ${state.currentPage} de ${totalPages}`;

    updateUrlState();
}

function applyContractFilters({ resetPage = true } = {}) {
    if (resetPage) {
        state.currentPage = 1;
    }

    state.filteredContracts = getFilteredContracts();
    renderContractResults();
}

function updateSearchClearButton() {
    elements.clearContractSearch.classList.toggle("hidden", !elements.contractSearchInput.value);
}

function handleContractSearch() {
    updateSearchClearButton();
    clearTimeout(state.contractSearchTimer);
    state.contractSearchTimer = setTimeout(() => applyContractFilters(), 140);
}

function clearContractSearch() {
    clearTimeout(state.contractSearchTimer);
    elements.contractSearchInput.value = "";
    updateSearchClearButton();
    applyContractFilters();
    elements.contractSearchInput.focus();
}

function clearAllContractFilters({ focus = true, updateUrl = true } = {}) {
    clearTimeout(state.contractSearchTimer);
    elements.contractSearchInput.value = "";
    elements.responsibleFilter.value = "";
    elements.statusFilter.value = "";
    elements.establishmentFilter.value = "";
    elements.categoryFilter.value = "";
    elements.sortFilter.value = "urgency";
    state.currentPage = 1;
    updateSearchClearButton();
    state.filteredContracts = getFilteredContracts();
    renderContractResults();

    if (!updateUrl && typeof window !== "undefined" && window.history) {
        // O logout troca a tela logo depois; não é necessário alterar a URL duas vezes.
    }

    if (focus) {
        elements.contractSearchInput.focus();
    }
}

function createEmptyStateText() {
    const parts = [];
    const query = elements.contractSearchInput.value.trim();

    if (query) parts.push(`a pesquisa “${query}”`);
    if (elements.responsibleFilter.value) parts.push(`o responsável “${elements.responsibleFilter.value}”`);
    if (elements.statusFilter.value) parts.push(`o status “${getSelectedOptionText(elements.statusFilter)}”`);
    if (elements.establishmentFilter.value) parts.push(`o estabelecimento “${elements.establishmentFilter.value}”`);
    if (elements.categoryFilter.value) parts.push(`a categoria “${elements.categoryFilter.value}”`);

    if (!parts.length) {
        return "Não há contratos disponíveis na base atual.";
    }

    return `Nenhum contrato corresponde a ${parts.join(", ")}. Remova um filtro ou use uma parte menor do texto.`;
}

function getSelectedOptionText(selectElement) {
    return selectElement.options?.[selectElement.selectedIndex]?.textContent || selectElement.value;
}

function getActiveFilters() {
    const filters = [];
    const query = elements.contractSearchInput.value.trim();

    if (query) filters.push({ key: "search", label: `Pesquisa: ${query}` });
    if (elements.responsibleFilter.value) filters.push({ key: "responsible", label: `Responsável: ${elements.responsibleFilter.value}` });
    if (elements.statusFilter.value) filters.push({ key: "status", label: `Status: ${getSelectedOptionText(elements.statusFilter)}` });
    if (elements.establishmentFilter.value) filters.push({ key: "establishment", label: `Estabelecimento: ${elements.establishmentFilter.value}` });
    if (elements.categoryFilter.value) filters.push({ key: "category", label: `Categoria: ${elements.categoryFilter.value}` });

    return filters;
}

function renderActiveFilters() {
    const filters = getActiveFilters();
    elements.activeFilters.classList.toggle("hidden", !filters.length);

    if (!filters.length) {
        elements.activeFilters.innerHTML = "";
        return;
    }

    elements.activeFilters.innerHTML = `
        <span class="active-filters-label">Filtros aplicados:</span>
        ${filters.map((filter) => `
            <button class="filter-chip" type="button" data-remove-filter="${filter.key}" aria-label="Remover ${escapeHtml(filter.label)}">
                <span>${escapeHtml(filter.label)}</span><span aria-hidden="true">×</span>
            </button>
        `).join("")}
    `;
}

function removeFilter(key) {
    const elementByKey = {
        search: elements.contractSearchInput,
        responsible: elements.responsibleFilter,
        status: elements.statusFilter,
        establishment: elements.establishmentFilter,
        category: elements.categoryFilter
    };

    const element = elementByKey[key];
    if (!element) return;

    element.value = "";
    updateSearchClearButton();
    applyContractFilters();
}

function updateMobileFilterCount() {
    const count = getActiveFilters().filter((filter) => filter.key !== "search").length;
    elements.mobileFilterCount.textContent = String(count);
    elements.mobileFilterCount.classList.toggle("hidden", count === 0);
}

function toggleMobileFilters() {
    const willOpen = !elements.advancedFilters.classList.contains("is-open");
    elements.advancedFilters.classList.toggle("is-open", willOpen);
    elements.mobileFiltersButton.setAttribute("aria-expanded", String(willOpen));
}

function updateContractDataSourceNote() {
    const metadata = window.contractsDataMetadata;

    if (!metadata) {
        elements.contractDataSource.textContent = "";
        return;
    }

    const modifiedDate = metadata.lastModifiedDateTime
        ? new Date(metadata.lastModifiedDateTime)
        : metadata.generatedAt
            ? new Date(metadata.generatedAt)
            : null;
    const checkedDate = metadata.lastCheckedAt ? new Date(metadata.lastCheckedAt) : null;
    const parts = [];

    if (modifiedDate && !Number.isNaN(modifiedDate.getTime())) {
        const formatted = new Intl.DateTimeFormat("pt-BR", {
            dateStyle: "short",
            timeStyle: "short",
            timeZone: "America/Sao_Paulo"
        }).format(modifiedDate);
        parts.push(`Planilha alterada em ${formatted}`);
    }

    parts.push(`${metadata.records || getContracts().length} contratos`);

    if (checkedDate && !Number.isNaN(checkedDate.getTime())) {
        const checkedTime = new Intl.DateTimeFormat("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "America/Sao_Paulo"
        }).format(checkedDate);
        parts.push(`verificado às ${checkedTime}`);
    }

    elements.contractDataSource.textContent = parts.join(" · ");
}

function showContractLoading() {
    state.filteredContracts = [];
    elements.contractTableContainer.classList.add("hidden");
    elements.contractCardList.classList.add("hidden");
    elements.contractEmptyState.classList.add("hidden");
    elements.pagination.classList.add("hidden");
    elements.contractResultCount.textContent = "Carregando contratos...";
    elements.contractDataSource.textContent = "Consultando a planilha no SharePoint";
    elements.contractCardList.innerHTML = `
        <div class="contract-state contract-loading-state" role="status">
            <div class="loading-spinner" aria-hidden="true"></div>
            <h3>Carregando contratos</h3>
            <p>Aguarde enquanto o portal consulta a versão atual da planilha.</p>
        </div>
    `;
    elements.contractCardList.classList.remove("hidden");
}

function showContractLoadError(message) {
    const errorMessage = message || "Não foi possível carregar a planilha configurada no SharePoint.";
    state.filteredContracts = [];
    elements.contractTableContainer.classList.add("hidden");
    elements.contractCardList.classList.add("hidden");
    elements.contractEmptyState.classList.add("hidden");
    elements.pagination.classList.add("hidden");
    elements.contractResultCount.textContent = "Contratos indisponíveis";
    elements.contractDataSource.textContent = "";
    elements.contractCardList.innerHTML = `
        <div class="contract-state contract-load-error" role="alert">
            <div class="state-icon" aria-hidden="true">!</div>
            <h3>Não foi possível carregar os contratos</h3>
            <p>${escapeHtml(errorMessage)}</p>
        </div>
    `;
    elements.contractCardList.classList.remove("hidden");
}

function initializeContracts() {
    if (state.contractsInitialized) {
        updateContractDataSourceNote();
        applyContractFilters({ resetPage: false });
        return true;
    }

    const contracts = getContracts();

    if (!contracts.length) {
        showContractLoadError();
        return false;
    }

    try {
        buildContractIndexes();
        populateContractFilters();
        restoreFiltersFromUrl();
        updateContractDataSourceNote();
        state.filteredContracts = getFilteredContracts();
        state.contractsInitialized = true;
        renderContractResults();
        return true;
    } catch (error) {
        console.error("Erro ao inicializar contratos:", error);
        showContractLoadError("Os dados foram encontrados, mas ocorreu um erro ao montar a consulta.");
        return false;
    }
}

function createContractItemsMarkup(contract) {
    const items = Array.isArray(contract.itens) ? contract.itens : [];

    if (!items.length) {
        return `
            <section class="contract-items-section">
                <div class="contract-items-heading">
                    <div>
                        <span class="section-kicker">Itens do contrato</span>
                        <h3>Nenhum item disponível</h3>
                    </div>
                </div>
                <p class="contract-items-empty">A planilha não possui itens associados a este contrato.</p>
            </section>
        `;
    }

    return `
        <section class="contract-items-section">
            <div class="contract-items-heading">
                <div>
                    <span class="section-kicker">Itens do contrato</span>
                    <h3>${items.length} ${items.length === 1 ? "item" : "itens"}</h3>
                </div>
                <span class="contract-items-count">${items.length}</span>
            </div>

            <div class="contract-items-table-wrapper">
                <table class="contract-items-table">
                    <thead>
                        <tr>
                            <th scope="col">Item</th>
                            <th scope="col">Prevista</th>
                            <th scope="col">Realizada</th>
                            <th scope="col">Saldo qtd.</th>
                            <th scope="col">Valor unitário</th>
                            <th scope="col">Saldo valor</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${items.map((item, index) => `
                            <tr>
                                <td>
                                    <span class="item-index">${index + 1}</span>
                                    <strong>${createDisplayedValue(item.descricao, "Item sem descrição")}</strong>
                                    ${(item.tipoMedicao || item.tipoConsumoMedicao) ? `
                                        <small>${escapeHtml([item.tipoMedicao, item.tipoConsumoMedicao].filter(Boolean).join(" · "))}</small>
                                    ` : ""}
                                </td>
                                <td data-label="Prevista">${escapeHtml(formatQuantity(item.quantidadePrevista))}</td>
                                <td data-label="Realizada">${escapeHtml(formatQuantity(item.quantidadeRealizada))}</td>
                                <td data-label="Saldo qtd.">${escapeHtml(formatQuantity(item.saldoQuantidade))}</td>
                                <td data-label="Valor unitário">${escapeHtml(formatCurrency(item.valorUnitario))}</td>
                                <td data-label="Saldo valor">${escapeHtml(formatCurrency(item.saldoValor))}</td>
                            </tr>
                        `).join("")}
                    </tbody>
                </table>
            </div>
        </section>
    `;
}

function openContractDialog(contractId, trigger) {
    const contract = getContracts()[Number(contractId)];
    if (!contract) return;

    const status = getContractStatus(contract);
    const supplierResponsibles = getSupplierResponsibles(contract.fornecedor);
    const currentResponsible = normalizeText(contract.responsavel);
    const otherResponsibles = supplierResponsibles.filter(
        (responsible) => normalizeText(responsible) !== currentResponsible
    );

    elements.dialogTitle.textContent = `Contrato ${contract.numero || "não informado"}`;
    elements.contractDialogContent.innerHTML = `
        <div class="dialog-supplier">
            <div>
                <h3>${escapeHtml(contract.fornecedor || "Fornecedor não informado")}</h3>
                <p class="dialog-description">${createDisplayedValue(contract.descricao, "Descrição não informada")}</p>
            </div>
            <div>
                ${getStatusBadgeMarkup(status)}
                <p class="dialog-description">${escapeHtml(formatStatusDetail(status))}</p>
            </div>
        </div>

        <dl class="detail-grid">
            <div><dt>Responsável pelo fornecedor</dt><dd>${createDisplayedValue(contract.responsavel, "Responsável não informado")}</dd></div>
            <div><dt>Suplente</dt><dd>${createDisplayedValue(contract.suplente, "Suplente não informado")}</dd></div>
            <div><dt>Empresa</dt><dd>${createDisplayedValue(contract.empresa, "Empresa não informada")}</dd></div>
            <div><dt>Código do estabelecimento</dt><dd>${createDisplayedValue(contract.estabelecimento, "Não informado")}</dd></div>
            <div><dt>Categoria</dt><dd>${createDisplayedValue(contract.categoria, "Categoria não informada")}</dd></div>
            <div><dt>Data de início</dt><dd>${escapeHtml(formatDate(contract.dataInicio))}</dd></div>
            <div><dt>Data de término</dt><dd>${escapeHtml(formatDate(contract.dataFim))}</dd></div>
            <div><dt>Conta contábil</dt><dd>${createDisplayedValue(contract.conta, "Conta não informada")}</dd></div>
            <div><dt>Centro de custo</dt><dd>${createDisplayedValue(contract.centroCusto, "Código não informado")}</dd></div>
            <div><dt>Descrição do centro de custo</dt><dd>${createDisplayedValue(contract.descricaoCentroCusto, "Descrição não informada")}</dd></div>
            <div><dt>Valor planejado</dt><dd>${escapeHtml(formatCurrency(contract.valorPlanejado))}</dd></div>
            <div><dt>Valor real</dt><dd>${escapeHtml(formatCurrency(contract.valorReal))}</dd></div>
        </dl>

        ${createContractItemsMarkup(contract)}

        ${otherResponsibles.length ? `
            <div class="other-responsibles">
                <strong>Outros responsáveis deste fornecedor em outros contratos</strong>
                <ul>${otherResponsibles.map((responsible) => `<li>${escapeHtml(responsible)}</li>`).join("")}</ul>
            </div>
        ` : ""}
    `;

    state.lastDialogTrigger = trigger || null;

    if (typeof elements.contractDialog.showModal === "function") {
        elements.contractDialog.showModal();
    } else {
        elements.contractDialog.setAttribute("open", "");
    }
}

function closeContractDialog() {
    if (typeof elements.contractDialog.close === "function") {
        elements.contractDialog.close();
    } else {
        elements.contractDialog.removeAttribute("open");
    }

    state.lastDialogTrigger?.focus();
}

function changePage(direction) {
    const nextPage = state.currentPage + direction;
    const totalPages = getTotalPages();

    if (nextPage < 1 || nextPage > totalPages) {
        return;
    }

    state.currentPage = nextPage;
    renderContractResults();
    elements.contractResultCount.focus?.();
    document.querySelector(".contract-results-header")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function handleResize() {
    clearTimeout(state.resizeTimer);
    state.resizeTimer = setTimeout(() => {
        const nextPageSize = getResponsivePageSize();

        if (nextPageSize === state.pageSize) {
            return;
        }

        const firstVisibleIndex = (state.currentPage - 1) * state.pageSize;
        state.pageSize = nextPageSize;
        state.currentPage = Math.floor(firstVisibleIndex / nextPageSize) + 1;
        renderContractResults();
    }, 160);
}

function bindEvents() {
    elements.accessForm.addEventListener("submit", handleLogin);
    elements.logoutButton.addEventListener("click", handleLogout);
    elements.refreshContractsButton.addEventListener("click", () => refreshContracts({ force: true }));
    elements.contractFilters.addEventListener("submit", (event) => event.preventDefault());
    elements.contractSearchInput.addEventListener("input", handleContractSearch);
    elements.clearContractSearch.addEventListener("click", clearContractSearch);
    elements.clearContractFilters.addEventListener("click", () => clearAllContractFilters());
    elements.emptyStateClearFilters.addEventListener("click", () => clearAllContractFilters());
    elements.mobileFiltersButton.addEventListener("click", toggleMobileFilters);
    elements.loadVideoButton.addEventListener("click", loadTutorialVideo);
    elements.previousPageButton.addEventListener("click", () => changePage(-1));
    elements.nextPageButton.addEventListener("click", () => changePage(1));
    elements.closeContractDialog.addEventListener("click", closeContractDialog);

    [
        elements.responsibleFilter,
        elements.statusFilter,
        elements.establishmentFilter,
        elements.categoryFilter,
        elements.sortFilter
    ].forEach((filterElement) => {
        filterElement.addEventListener("change", () => applyContractFilters());
    });

    document.addEventListener("click", (event) => {
        const viewTrigger = event.target.closest?.("[data-view]");
        if (viewTrigger) {
            setActiveView(viewTrigger.dataset.view);
            return;
        }

        const summaryButton = event.target.closest?.("[data-summary-status]");
        if (summaryButton) {
            elements.statusFilter.value = summaryButton.dataset.summaryStatus;
            applyContractFilters();
            return;
        }

        const filterChip = event.target.closest?.("[data-remove-filter]");
        if (filterChip) {
            removeFilter(filterChip.dataset.removeFilter);
            return;
        }

        const detailsButton = event.target.closest?.("[data-contract-id]");
        if (detailsButton) {
            openContractDialog(detailsButton.dataset.contractId, detailsButton);
        }
    });

    elements.contractDialog.addEventListener("click", (event) => {
        if (event.target === elements.contractDialog) {
            closeContractDialog();
        }
    });

    elements.contractDialog.addEventListener("close", () => {
        state.lastDialogTrigger?.focus();
    });

    document.addEventListener("visibilitychange", refreshWhenVisible);
    window.addEventListener("focus", refreshWhenVisible);
    window.addEventListener("resize", handleResize);
}

async function initializeApplication() {
    bindEvents();
    showLogin();

    try {
        const account = await window.SharePointContracts.initialize();

        if (account) {
            await showApplication(account);
        }
    } catch (error) {
        console.error("Erro ao inicializar integração Microsoft:", error);
        setLoginMessage(error.message || "Não foi possível inicializar o login Microsoft.");
    }
}

document.addEventListener("DOMContentLoaded", initializeApplication);
