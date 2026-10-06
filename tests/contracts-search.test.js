"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const RealDate = Date;
class FixedDate extends RealDate {
    constructor(...args) {
        if (args.length) return super(...args);
        super("2026-08-03T12:00:00-03:00");
    }
    static now() {
        return new RealDate("2026-08-03T12:00:00-03:00").getTime();
    }
}

class FakeClassList {
    constructor(initial = []) { this.values = new Set(initial); }
    add(...items) { items.forEach((item) => this.values.add(item)); }
    remove(...items) { items.forEach((item) => this.values.delete(item)); }
    contains(item) { return this.values.has(item); }
    toggle(item, force) {
        if (force === true) { this.values.add(item); return true; }
        if (force === false) { this.values.delete(item); return false; }
        if (this.values.has(item)) { this.values.delete(item); return false; }
        this.values.add(item); return true;
    }
}

class FakeElement {
    constructor(id) {
        this.id = id;
        this.value = "";
        this.textContent = "";
        this.disabled = false;
        this.dataset = {};
        this.classList = new FakeClassList();
        this.options = [];
        this.attributes = new Map();
        this._innerHTML = "";
    }
    set innerHTML(value) {
        this._innerHTML = value;
        const pattern = /<option value="([^"]*)">\s*([^<]*)\s*<\/option>/g;
        this.options = [];
        let match;
        while ((match = pattern.exec(value))) {
            this.options.push({ value: match[1], textContent: match[2].trim() });
        }
    }
    get innerHTML() { return this._innerHTML; }
    addEventListener() {}
    focus() {}
    setAttribute(name, value) { this.attributes.set(name, String(value)); }
    removeAttribute(name) { this.attributes.delete(name); }
    querySelector() { return null; }
}

const elementIds = [
    "loginSection", "appSection", "appFooter", "appNavigation", "accessForm",
    "loginButton", "loginMessage", "userArea", "userName", "logoutButton",
    "portalTitle", "contractsView", "tutorialView", "tutorialTitle",
    "tutorialDescription", "videoWrapper", "loadVideoButton", "contractFilters",
    "contractSearchInput", "cnpjFilter", "clearContractSearch", "clearContractFilters",
    "emptyStateClearFilters", "mobileFiltersButton", "mobileFilterCount",
    "advancedFilters", "responsibleFilter", "statusFilter", "establishmentFilter",
    "categoryFilter", "sortFilter", "activeFilters", "contractTableContainer",
    "contractTableBody", "contractCardList", "contractEmptyState", "emptyStateMessage",
    "contractResultCount", "sortDescription", "contractDataSource",
    "refreshContractsButton", "totalContractsCount", "activeContractsCount",
    "soonContractsCount", "expiredContractsCount", "pagination", "previousPageButton",
    "nextPageButton", "pageInformation", "contractDialog", "contractDialogContent",
    "dialogTitle", "closeContractDialog"
];

const elements = new Map(elementIds.map((id) => [id, new FakeElement(id)]));
elements.get("sortFilter").value = "urgency";

const summaryButtons = ["", "ativo", "proximo", "vencido"].map((status) => {
    const button = new FakeElement(`summary-${status || "all"}`);
    button.dataset.summaryStatus = status;
    return button;
});

const contracts = [
    { estabelecimento: "11", empresa: "BRASILATA", numero: "00024", fornecedor: "BrasRede Telecom", cnpjFornecedor: "12.345.678/0001-90", cnpjEmpresa: "61.160.438/0006-36", descricao: "Link", categoria: "Telecomunicações", dataFim: "2026-08-20", responsavel: "Estênio Barros", suplente: "Lucas" },
    { estabelecimento: "13", empresa: "BRASILATA", numero: "2896", fornecedor: "Integra", descricao: "Klassmatt", categoria: "Software", dataFim: "2027-04-30", responsavel: "Lucas Melo", suplente: "Guilherme" },
    { estabelecimento: "491", empresa: "CIMEP", numero: "51", fornecedor: "Datanova", cnpjFornecedor: "12.345.678/0001-90", descricao: "Equipamentos", categoria: "Software", dataFim: "2026-07-01", responsavel: "Mayara", suplente: "Lucas" },
    { estabelecimento: "491", empresa: "CIMEP", numero: "52", fornecedor: "Datanova", descricao: "Suporte", categoria: "Consultoria", dataFim: "2026-12-30", responsavel: "Marcos Silva", suplente: "Lucas" }
];

const fakeWindow = {
    ContractsMapper: require("./contractsMapper.js"),
    contractsData: contracts,
    contractsDataMetadata: { records: 4, lastModifiedDateTime: "2026-08-03T14:00:00-03:00", lastCheckedAt: "2026-08-03T14:10:00-03:00" },
    SharePointContracts: { getAccount() { return null; } },
    scrollTo() {},
    matchMedia() { return { matches: false }; },
    addEventListener() {},
    setInterval() { return 1; },
    clearInterval() {},
    location: { href: "https://example.com/", search: "", pathname: "/", origin: "https://example.com" },
    history: { replaceState() {} },
    URL,
    URLSearchParams
};

const context = vm.createContext({
    console,
    Intl,
    Date: FixedDate,
    Map,
    WeakMap,
    Set,
    Object,
    Array,
    String,
    Number,
    Math,
    JSON,
    Promise,
    URL,
    URLSearchParams,
    setTimeout,
    clearTimeout,
    APP_CONFIG: { sharePoint: { refreshIntervalMs: 300000 } },
    tutorials: [],
    requestAnimationFrame(callback) { callback(); },
    document: {
        title: "",
        visibilityState: "visible",
        getElementById(id) { return elements.get(id) || new FakeElement(id); },
        addEventListener() {},
        querySelectorAll(selector) {
            if (selector === "[data-summary-status]") return summaryButtons;
            return [];
        },
        querySelector() { return null; }
    },
    window: fakeWindow
});

const root = __dirname;
vm.runInContext(fs.readFileSync(path.join(root, "script.js"), "utf8"), context);
const run = (code) => vm.runInContext(code, context);

run("buildContractIndexes(); populateContractFilters(); state.contractsInitialized = true; applyContractFilters();");
assert.strictEqual(run("getContracts().length"), 4);
assert.strictEqual(run("state.filteredContracts.length"), 4);
assert.ok(elements.get("contractTableBody").innerHTML.includes("<tr>"));

run("elements.contractSearchInput.value = '00024'; applyContractFilters();");
assert.strictEqual(run("state.filteredContracts.length"), 1);
assert.strictEqual(run("state.filteredContracts[0].fornecedor"), "BrasRede Telecom");

run("elements.contractSearchInput.value = 'estenio'; applyContractFilters();");
assert.strictEqual(run("state.filteredContracts.length"), 1, "A busca deve ignorar acentos.");

run("clearAllContractFilters({ focus: false }); elements.responsibleFilter.value = 'Marcos Silva'; elements.establishmentFilter.value = '491'; applyContractFilters();");
assert.strictEqual(run("state.filteredContracts.length"), 1);

run("clearAllContractFilters({ focus: false }); elements.statusFilter.value = 'proximo'; applyContractFilters();");
assert.strictEqual(run("state.filteredContracts.length"), 1);

run("clearAllContractFilters({ focus: false }); elements.statusFilter.value = 'vencido'; applyContractFilters();");
assert.strictEqual(run("state.filteredContracts.length"), 1);

run("clearAllContractFilters({ focus: false }); elements.sortFilter.value = 'supplier-asc'; applyContractFilters();");
assert.strictEqual(run("state.filteredContracts[0].fornecedor"), "BrasRede Telecom");

assert.ok(run("highlightText('ESTÊNIO', 'estenio')").includes("<mark>ESTÊNIO</mark>"));
const mapper = require("./contractsMapper.js");
assert.strictEqual(mapper.normalizeCNPJ("12.345.678/0001-90"), "12345678000190");
assert.strictEqual(mapper.normalizeCNPJ(" 12.345.678/0001-90 "), "12345678000190");
assert.strictEqual(mapper.normalizeCNPJ(null), "");
for (const input of ["12.345.678/0001-90", "12345678000190", " 12.345.678/0001-90 "]) {
    run(`clearAllContractFilters({ focus: false }); elements.cnpjFilter.value = ${JSON.stringify(input)}; applyContractFilters();`);
    assert.strictEqual(run("state.filteredContracts.length"), 2, `CNPJ ${input} deve retornar ambos os contratos.`);
}
run("elements.contractSearchInput.value = 'sem correspondencia'; elements.statusFilter.value = 'vencido'; applyContractFilters();");
assert.strictEqual(run("state.filteredContracts.length"), 2, "CNPJ deve ter prioridade sobre filtros preenchidos.");
run("elements.cnpjFilter.value = '99999999000199'; applyContractFilters();");
assert.strictEqual(run("state.filteredContracts.length"), 0);
assert.ok(run("createEmptyStateText()").includes("Nenhum contrato encontrado para o CNPJ"));
run("elements.cnpjFilter.value = '  '; applyContractFilters();");
assert.strictEqual(run("state.filteredContracts.length"), 0, "Com CNPJ vazio, os demais filtros continuam ativos.");
run("clearAllContractFilters({ focus: false }); elements.cnpjFilter.value = '61.160.438/0006-36'; applyContractFilters();");
assert.strictEqual(run("state.filteredContracts.length"), 1, "CNPJ da contratante também deve ser pesquisável.");
run("clearAllContractFilters({ focus: false }); elements.contractSearchInput.value = 'estenio'; applyContractFilters();");
assert.strictEqual(run("state.filteredContracts.length"), 1, "Pesquisa antiga permanece funcional.");
console.log("Testes de pesquisa, CNPJ, filtros, status e ordenação passaram.");
