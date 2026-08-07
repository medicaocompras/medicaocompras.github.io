"use strict";

(function exposeContractsMapper(globalObject) {
    const EXPECTED_COLUMNS = Object.freeze([
        "Número",
        "Descrição",
        "Razão social da empresa contratada",
        "Razão social da empresa contratante",
        "Valor total",
        "Saldo",
        "Tipo do contrato",
        "Data de fim",
        "Data de início",
        "Situação",
        "Usuário gestor",
        "Usuário responsável",
        "Quantidade de dias para término",
        "Descrição do item",
        "Quantidade prevista do item",
        "Quantidade realizada",
        "Saldo de quantidade do item",
        "Valor do item",
        "Saldo de valor do item"
    ]);

    function cleanText(value) {
        if (value === null || value === undefined) return null;
        const text = String(value).replace(/\s+/g, " ").trim();
        return text || null;
    }

    function normalizeIdentifier(value) {
        if (value === null || value === undefined || value === "") return null;

        if (typeof value === "number" && Number.isFinite(value)) {
            return Number.isInteger(value) ? String(value) : String(value);
        }

        return cleanText(value);
    }

    function normalizeNumber(value) {
        if (value === null || value === undefined || value === "") return null;

        if (typeof value === "number" && Number.isFinite(value)) {
            return value;
        }

        const text = cleanText(value);
        if (!text) return null;

        const normalized = text
            .replace(/\s/g, "")
            .replace(/\.(?=\d{3}(?:\D|$))/g, "")
            .replace(",", ".");
        const number = Number(normalized);

        return Number.isFinite(number) ? number : null;
    }

    function pad(number) {
        return String(number).padStart(2, "0");
    }

    function dateToIso(value, xlsxLibrary = globalObject.XLSX) {
        if (value === null || value === undefined || value === "") return null;

        if (value instanceof Date && !Number.isNaN(value.getTime())) {
            return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
        }

        if (typeof value === "number" && Number.isFinite(value) && xlsxLibrary?.SSF?.parse_date_code) {
            const parsed = xlsxLibrary.SSF.parse_date_code(value);
            if (parsed) return `${parsed.y}-${pad(parsed.m)}-${pad(parsed.d)}`;
        }

        // Fallback para números de data do Excel caso a biblioteca não exponha SSF.
        if (typeof value === "number" && Number.isFinite(value)) {
            const excelEpoch = Date.UTC(1899, 11, 30);
            const date = new Date(excelEpoch + Math.round(value) * 86400000);
            if (!Number.isNaN(date.getTime())) {
                return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
            }
        }

        const text = cleanText(value);
        if (!text) return null;

        const isoMatch = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
        if (isoMatch) return `${isoMatch[1]}-${pad(isoMatch[2])}-${pad(isoMatch[3])}`;

        const brazilianMatch = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (brazilianMatch) return `${brazilianMatch[3]}-${pad(brazilianMatch[2])}-${pad(brazilianMatch[1])}`;

        return text;
    }

    function normalizeKey(value) {
        return String(value ?? "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .trim()
            .toLocaleLowerCase("pt-BR");
    }

    function findHeaderRowIndex(rawRows) {
        return rawRows.findIndex((row) => {
            if (!Array.isArray(row)) return false;
            const headers = row.map(cleanText);
            return (
                headers.includes("Número") &&
                headers.includes("Razão social da empresa contratada") &&
                headers.includes("Razão social da empresa contratante") &&
                headers.includes("Data de fim")
            );
        });
    }

    function splitEstablishment(value) {
        const text = cleanText(value);
        if (!text) return { estabelecimento: null, empresa: null };

        const match = text.match(/^([0-9]+)\s*-\s*(.+)$/);
        if (!match) {
            return { estabelecimento: null, empresa: text };
        }

        return {
            estabelecimento: match[1],
            empresa: cleanText(match[2])
        };
    }

    function calculateRealValue(total, balance) {
        const totalNumber = normalizeNumber(total);
        const balanceNumber = normalizeNumber(balance);

        if (totalNumber === null) return null;
        if (balanceNumber === null) return null;

        const result = totalNumber - balanceNumber;
        if (Math.abs(result) < 0.000001) return 0;
        return Math.round((result + Number.EPSILON) * 100) / 100;
    }

    function createContractItem(rawRow, getFromRow) {
        const quantidadePrevista = normalizeNumber(getFromRow(rawRow, "Quantidade prevista do item"));
        const quantidadeRealizada = normalizeNumber(getFromRow(rawRow, "Quantidade realizada"));
        const saldoQuantidade = normalizeNumber(getFromRow(rawRow, "Saldo de quantidade do item"));
        const valorUnitario = normalizeNumber(getFromRow(rawRow, "Valor do item"));
        const saldoValor = normalizeNumber(getFromRow(rawRow, "Saldo de valor do item"));

        return {
            descricao: cleanText(getFromRow(rawRow, "Descrição do item")),
            quantidadePrevista,
            quantidadeRealizada,
            saldoQuantidade,
            valorUnitario,
            saldoValor,
            percentualSaldoMinimo: normalizeNumber(getFromRow(rawRow, "% de saldo mínimo")),
            tipoConsumoMedicao: cleanText(getFromRow(rawRow, "Tipo de consumo da medição")),
            tipoMedicao: cleanText(getFromRow(rawRow, "Tipo"))
        };
    }

    function transformRowsToContracts(rawRows, xlsxLibrary = globalObject.XLSX) {
        if (!Array.isArray(rawRows) || !rawRows.length) {
            throw new Error("A aba configurada está vazia.");
        }

        // O relatório do Paradigma possui informações do relatório antes do cabeçalho.
        // O cabeçalho real é localizado automaticamente em vez de assumir a primeira linha.
        const headerRowIndex = findHeaderRowIndex(rawRows);

        if (headerRowIndex < 0) {
            throw new Error(
                "Não foi possível localizar o cabeçalho do relatório Paradigma. " +
                "A coluna “Número” e as colunas de empresa contratada/contratante não foram encontradas."
            );
        }

        const headers = rawRows[headerRowIndex].map(cleanText);
        const missingColumns = EXPECTED_COLUMNS.filter((column) => !headers.includes(column));

        if (missingColumns.length) {
            throw new Error(`Colunas obrigatórias ausentes: ${missingColumns.join(", ")}`);
        }

        const indexByHeader = new Map(
            headers.map((header, index) => [header, index]).filter(([header]) => header)
        );

        const getFromRow = (rawRow, column) => {
            const index = indexByHeader.get(column);
            return index !== undefined && index < rawRow.length ? rawRow[index] : null;
        };

        // O relatório repete o contrato uma vez para cada item contratado. Aqui as linhas
        // são consolidadas para que o portal mostre um registro por contrato real.
        const contractsByKey = new Map();

        rawRows.slice(headerRowIndex + 1).forEach((rawRow) => {
            if (!Array.isArray(rawRow)) return;

            const numero = normalizeIdentifier(getFromRow(rawRow, "Número"));
            const fornecedor = cleanText(getFromRow(rawRow, "Razão social da empresa contratada"));
            const empresaContratante = cleanText(getFromRow(rawRow, "Razão social da empresa contratante"));
            const descricao = cleanText(getFromRow(rawRow, "Descrição"));
            const dataInicio = dateToIso(getFromRow(rawRow, "Data de início"), xlsxLibrary);
            const dataFim = dateToIso(getFromRow(rawRow, "Data de fim"), xlsxLibrary);

            if (!numero || !fornecedor || !empresaContratante) return;

            const { estabelecimento, empresa } = splitEstablishment(empresaContratante);
            const valorPlanejado = normalizeNumber(getFromRow(rawRow, "Valor total"));
            const saldo = normalizeNumber(getFromRow(rawRow, "Saldo"));

            // Em contratos antigos o mesmo número pode existir mais de uma vez na mesma
            // empresa. Fornecedor, descrição e vigência fazem parte da chave para não unir
            // contratos diferentes por engano.
            const contractKey = [
                numero,
                empresaContratante,
                fornecedor,
                descricao,
                dataInicio,
                dataFim
            ]
                .map(normalizeKey)
                .join("::");

            const item = createContractItem(rawRow, getFromRow);

            if (contractsByKey.has(contractKey)) {
                const existing = contractsByKey.get(contractKey);
                existing.itens.push(item);
                existing.quantidadeLinhasRelatorio = existing.itens.length;
                return;
            }

            contractsByKey.set(contractKey, {
                estabelecimento,
                empresa,
                numero,
                fornecedor,
                descricao,

                // O relatório Paradigma não possui conta contábil e centro de custo.
                conta: null,
                centroCusto: null,
                descricaoCentroCusto: null,

                categoria: cleanText(getFromRow(rawRow, "Tipo do contrato")),
                dataInicio,
                dataFim,
                diasParaTerminoPlanilha: normalizeNumber(
                    getFromRow(rawRow, "Quantidade de dias para término")
                ),
                valorPlanejado,
                valorReal: calculateRealValue(
                    getFromRow(rawRow, "Valor total"),
                    getFromRow(rawRow, "Saldo")
                ),
                responsavel: cleanText(getFromRow(rawRow, "Usuário responsável")),

                // Mantém compatibilidade com a interface atual. O relatório não possui
                // uma coluna de suplente; o usuário gestor é preservado neste campo.
                suplente: cleanText(getFromRow(rawRow, "Usuário gestor")),

                // Campos extras do Paradigma ficam disponíveis para evoluções futuras.
                situacaoParadigma: cleanText(getFromRow(rawRow, "Situação")),
                saldo,
                cnpjFornecedor: normalizeIdentifier(
                    getFromRow(rawRow, "CPF/CNPJ/TaxID da empresa contratada")
                ),
                cnpjEmpresa: normalizeIdentifier(
                    getFromRow(rawRow, "CPF/CNPJ/TaxID da empresa contratante")
                ),
                tipoConsumoMedicao: cleanText(getFromRow(rawRow, "Tipo de consumo da medição")),
                tipoMedicao: cleanText(getFromRow(rawRow, "Tipo")),

                // Cada linha do relatório Paradigma representa um item do contrato.
                // O contrato continua consolidado no portal, mas seus itens ficam
                // preservados para exibição dentro da tela de detalhes.
                itens: [item],
                quantidadeLinhasRelatorio: 1
            });
        });

        const contracts = [...contractsByKey.values()];

        contracts.sort((first, second) =>
            String(first.fornecedor).localeCompare(String(second.fornecedor), "pt-BR", {
                sensitivity: "base",
                numeric: true
            }) ||
            String(first.estabelecimento || "").localeCompare(
                String(second.estabelecimento || ""),
                "pt-BR",
                { numeric: true }
            ) ||
            String(first.numero).localeCompare(String(second.numero), "pt-BR", { numeric: true })
        );

        return {
            contracts,
            headers
        };
    }

    const api = Object.freeze({
        EXPECTED_COLUMNS,
        cleanText,
        normalizeIdentifier,
        normalizeNumber,
        dateToIso,
        findHeaderRowIndex,
        splitEstablishment,
        createContractItem,
        transformRowsToContracts
    });

    globalObject.ContractsMapper = api;

    if (typeof module !== "undefined" && module.exports) {
        module.exports = api;
    }
})(typeof window !== "undefined" ? window : globalThis);
