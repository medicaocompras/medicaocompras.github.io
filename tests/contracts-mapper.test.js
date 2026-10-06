"use strict";
const assert = require("assert");
const mapper = require("./contractsMapper.js");
const headers = [...mapper.EXPECTED_COLUMNS, "CPF/CNPJ/TaxID da empresa contratada", "CPF/CNPJ/TaxID da empresa contratante"];
const row = (number, supplier, cnpj, item) => Object.fromEntries([
    ["Número", number], ["Descrição", "Contrato de suporte"],
    ["Razão social da empresa contratada", supplier], ["Razão social da empresa contratante", "111-BRASILATA"],
    ["Valor total", 100], ["Saldo", 40], ["Tipo do contrato", "Serviços"],
    ["Data de fim", "2027-12-31"], ["Data de início", "2026-01-01"],
    ["Situação", "Ativo"], ["Usuário gestor", "Gestor"], ["Usuário responsável", "Responsável"],
    ["Quantidade de dias para término", 400], ["Descrição do item", item],
    ["Quantidade prevista do item", 1], ["Quantidade realizada", 0],
    ["Saldo de quantidade do item", 1], ["Valor do item", 100], ["Saldo de valor do item", 40],
    ["CPF/CNPJ/TaxID da empresa contratada", cnpj], ["CPF/CNPJ/TaxID da empresa contratante", "61160438000636"]
]);
const values = (obj) => headers.map((header) => obj[header] ?? null);
const rows = [headers, values(row("1", "Fornecedor A", "12.345.678/0001-90", "Item A")),
    values(row("1", "Fornecedor A", "12.345.678/0001-90", "Item B")),
    values(row("2", "Fornecedor B", "12345678000190", "Item C"))];
const result = mapper.transformRowsToContracts(rows);
assert.strictEqual(result.contracts.length, 2);
assert.strictEqual(result.contracts.find((c) => c.numero === "1").itens.length, 2);
assert.strictEqual(result.contracts.find((c) => c.numero === "1").cnpjFornecedor, "12.345.678/0001-90");
assert.strictEqual(result.contracts.find((c) => c.numero === "2").cnpjEmpresa, "61160438000636");
assert.strictEqual(mapper.normalizeCNPJ(" 12.345.678/0001-90 "), "12345678000190");
assert.strictEqual(mapper.normalizeCNPJ(undefined), "");
assert.throws(() => mapper.transformRowsToContracts([["Inválido"]]), /cabeçalho/);
console.log("Testes de mapeamento e consolidação passaram.");
