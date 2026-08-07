"use strict";

const assert = require("assert");
const mapper = require("../contractsMapper.js");

const headers = [...mapper.EXPECTED_COLUMNS];
const fakeXlsx = {
    SSF: {
        parse_date_code(serial) {
            const date = new Date(Date.UTC(1899, 11, 30) + serial * 86400000);
            return {
                y: date.getUTCFullYear(),
                m: date.getUTCMonth() + 1,
                d: date.getUTCDate()
            };
        }
    }
};

const rows = [
    headers,
    [11, "BRASILATA", "00024", "Fornecedor A", "Descrição A", 44110800, "Software", 11300, "TI - Corp", 45621, 46716, 273, 1000.5, null, "Lucas Melo", "Guilherme"],
    [13, "BRASILATA", 2896, "Fornecedor B", "Descrição B", "44112800", "Consultoria", "11300", "TI - Corp", "01/01/2026", "2027-04-30", "91", "8.000,50", "variavel", "Ademir", "Lucas"]
];

const result = mapper.transformRowsToContracts(rows, fakeXlsx);
assert.strictEqual(result.contracts.length, 2);

const first = result.contracts.find((contract) => contract.numero === "00024");
assert.ok(first, "Zeros à esquerda do contrato devem ser preservados.");
assert.strictEqual(first.estabelecimento, "11");
assert.strictEqual(first.dataInicio, "2024-11-25");
assert.strictEqual(first.dataFim, "2027-11-25");
assert.strictEqual(first.valorPlanejado, 1000.5);

const second = result.contracts.find((contract) => contract.numero === "2896");
assert.strictEqual(second.dataInicio, "2026-01-01");
assert.strictEqual(second.dataFim, "2027-04-30");
assert.strictEqual(second.valorPlanejado, 8000.5);
assert.strictEqual(second.valorReal, "variavel");

assert.throws(
    () => mapper.transformRowsToContracts([["Estabel"]], fakeXlsx),
    /Colunas obrigatórias ausentes/
);

assert.throws(
    () => mapper.transformRowsToContracts([headers, rows[1], rows[1]], fakeXlsx),
    /Contratos duplicados/
);

console.log("Testes de conversão das linhas do Excel passaram.");
