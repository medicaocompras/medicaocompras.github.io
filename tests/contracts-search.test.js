"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { webcrypto } = require("crypto");

const RealDate = Date;
class FixedDate extends RealDate {
    constructor(...args) {
        if (args.length) return super(...args);
        super("2026-07-28T12:00:00-03:00");
    }
    static now() {
        return new RealDate("2026-07-28T12:00:00-03:00").getTime();
    }
}

class FakeClassList {
    constructor(initial = []) {
        this.values = new Set(initial);
    }
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
        this.type = "text";
        this.dataset = {};
        this.classList = new FakeClassList();
        this.listeners = {};
        this.options = [];
        this.selectedIndex = 0;
        this.attributes = new Map();
        this._innerHTML = "";
    }
    set innerHTML(value) {
        this._innerHTML = value;
        const optionPattern = /<option value="([^"]*)">\s*([^<]*)\s*<\/option>/g;
        const options = [];
        let match;
        while ((match = optionPattern.exec(value))) {
            options.push({ value: match[1], textContent: match[2].trim() });
        }
        if (options.length) this.options = options;
    }
    get innerHTML() { return this._innerHTML; }
    addEventListener(name, callback) { this.listeners[name] = callback; }
    focus() {}
    select() {}
    reset() { this.value = ""; }
    setAttribute(name, value) { this.attributes.set(name, String(value)); }
    removeAttribute(name) { this.attributes.delete(name); }
    toggleAttribute(name, force) {
        if (force) this.attributes.set(name, "");
        else this.attributes.delete(name);
    }
    querySelector() { return null; }
}

const elementIds = [
    "loginSection", "appSection", "appFooter", "appNavigation", "accessForm",
    "emailInput", "accessCodeInput", "loginButton", "loginMessage",
    "togglePasswordButton", "userArea", "userName", "logoutButton", "portalTitle",
    "contractsView", "tutorialView", "tutorialTitle", "tutorialDescription",
    "videoWrapper", "loadVideoButton", "contractFilters", "contractSearchInput",
    "clearContractSearch", "clearContractFilters", "emptyStateClearFilters",
    "mobileFiltersButton", "mobileFilterCount", "advancedFilters", "responsibleFilter",
    "statusFilter", "establishmentFilter", "categoryFilter", "sortFilter",
    "activeFilters", "contractTableContainer", "contractTableBody", "contractCardList",
    "contractEmptyState", "emptyStateMessage", "contractResultCount", "sortDescription",
    "contractDataSource", "totalContractsCount", "activeContractsCount",
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
    TextEncoder,
    URL,
    URLSearchParams,
    setTimeout,
    clearTimeout,
    crypto: webcrypto,
    APP_CONFIG: {
        allowedDomains: ["brasilata.com.br", "cimep.com.br"],
        accessCodeHash: "",
        sessionKey: "session",
        sessionEmailKey: "email"
    },
    tutorials: [],
    sessionStorage: {
        getItem() { return null; },
        setItem() {},
        removeItem() {}
    },
    requestAnimationFrame(callback) { callback(); },
    document: {
        title: "",
        getElementById(id) {
            if (!elements.has(id)) elements.set(id, new FakeElement(id));
            return elements.get(id);
        },
        addEventListener() {},
        querySelectorAll(selector) {
            if (selector === "[data-summary-status]") return summaryButtons;
            return [];
        },
        querySelector() { return null; }
    },
    window: {
        scrollTo() {},
        matchMedia() { return { matches: false }; },
        addEventListener() {}
    }
});
context.window.URL = URL;
context.window.URLSearchParams = URLSearchParams;

const root = path.resolve(__dirname, "..");
vm.runInContext(fs.readFileSync(path.join(root, "contractsData.js"), "utf8"), context);
vm.runInContext(fs.readFileSync(path.join(root, "script.js"), "utf8"), context);

function run(code) {
    return vm.runInContext(code, context);
}

run("buildContractIndexes(); populateContractFilters(); state.contractsInitialized = true; applyContractFilters();");

assert.strictEqual(run("getContracts().length"), 721, "A base deve conter 721 contratos consolidados.");
assert.strictEqual(run("window.contractsDataMetadata.sourceRows"), 3891, "A origem deve conter 3.891 linhas de itens.");
assert.strictEqual(run("window.contractsDataMetadata.items"), 3891, "Todos os itens devem ser mantidos.");
assert.strictEqual(run("getContracts().reduce((sum, contract) => sum + contract.quantidadeItens, 0)"), 3891);
assert.strictEqual(run("getContracts().every((contract) => contract.descricao && contract.itens.length === contract.quantidadeItens)"), true);
assert.strictEqual(run("state.filteredContracts.length"), 721, "A consulta inicial deve mostrar todos os contratos.");
assert.strictEqual(elements.get("contractTableBody").innerHTML.includes("<tr>"), true, "A tabela deve ser renderizada.");
assert.strictEqual(elements.get("contractCardList").innerHTML.includes("contract-card"), true, "Os cards móveis devem ser renderizados.");
assert.strictEqual(elements.get("pageInformation").textContent, "Página 1 de 37", "A paginação desktop deve usar 20 contratos.");

const statusCounts = JSON.parse(run(`JSON.stringify((() => {
    const counts = { ativo: 0, proximo: 0, vencido: 0 };
    getContracts().forEach((contract) => {
        const status = getContractStatus(contract).key;
        if (counts[status] !== undefined) counts[status] += 1;
    });
    return counts;
})())`));
assert.deepStrictEqual(statusCounts, { ativo: 658, proximo: 63, vencido: 0 });

run("elements.contractSearchInput.value = '00003/2026.TA.0001'; applyContractFilters();");
assert.strictEqual(run("state.filteredContracts.length"), 1, "A pesquisa deve localizar um contrato pelo número completo.");
assert.strictEqual(run("state.filteredContracts[0].quantidadeItens"), 72, "Os itens devem ficar agrupados no contrato.");

run("elements.contractSearchInput.value = 's14019917'; applyContractFilters();");
assert.strictEqual(run("state.filteredContracts.length"), 1, "A pesquisa geral deve encontrar contratos por item.");
assert.strictEqual(run("state.filteredContracts[0].numero"), "41141");
assert.ok(elements.get("contractTableBody").innerHTML.includes("Item relacionado"), "O resultado deve explicar qual item correspondeu à busca.");

run("elements.contractSearchInput.value = 'honorarios advocaticios'; applyContractFilters();");
assert.strictEqual(run("state.filteredContracts.length"), 3, "A pesquisa deve ignorar acentos.");

run("clearAllContractFilters({ focus: false }); elements.responsibleFilter.value = 'Guilherme Batista Torso'; elements.establishmentFilter.value = '111'; elements.categoryFilter.value = 'Compra'; applyContractFilters();");
assert.strictEqual(run("state.filteredContracts.length"), 18, "Filtros combinados devem funcionar.");

run("clearAllContractFilters({ focus: false }); elements.statusFilter.value = 'proximo'; applyContractFilters();");
assert.strictEqual(run("state.filteredContracts.length"), 63, "O filtro de próximos do vencimento deve funcionar.");
assert.strictEqual(elements.get("soonContractsCount").textContent, "63");

run("clearAllContractFilters({ focus: false }); elements.sortFilter.value = 'supplier-asc'; applyContractFilters();");
assert.strictEqual(run("state.filteredContracts[0].fornecedor"), "1 TELECOM SERVIÇOS DE TECNOLOGIA EM INTERNET LTDA", "A ordenação por fornecedor deve funcionar.");

run("clearAllContractFilters({ focus: false }); const target = getContracts().find((contract) => contract.numero === '00003/2026.TA.0001'); openContractDialog(getContractId(target), null);");
assert.ok(elements.get("contractDialogContent").innerHTML.includes("Itens do contrato (72)"), "Os detalhes devem mostrar a quantidade de itens.");
assert.ok(elements.get("contractDialogContent").innerHTML.includes("dialogItemSearch"), "Os detalhes devem permitir pesquisar itens.");

run("elements.contractSearchInput.value = 'texto que nao existe'; applyContractFilters();");
assert.strictEqual(run("state.filteredContracts.length"), 0);
assert.strictEqual(elements.get("contractResultCount").textContent, "0 contratos encontrados");
assert.ok(elements.get("emptyStateMessage").textContent.includes("texto que nao existe"));

assert.ok(run("highlightText('HONORÁRIOS ADVOCATÍCIOS', 'honorarios')").includes("<mark>HONORÁRIOS</mark>"));

console.log("Testes de consolidação, pesquisa, filtros, itens, ordenação e renderização passaram.");
