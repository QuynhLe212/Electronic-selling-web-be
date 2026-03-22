const STOP_WORDS = new Set([
    "va",
    "voi",
    "cho",
    "cua",
    "tai",
    "la",
    "the",
    "he",
    "dong",
    "hang",
    "khong",
    "co",
    "day",
    "wireless",
    "new",
    "pro",
    "max",
    "plus",
]);

const SYNONYM_GROUPS = [
    ["tai nghe", "headphone", "headphones", "earphone", "earphones", "airpods"],
    ["dien thoai", "phone", "smartphone", "mobile", "iphone"],
    ["chuot", "mouse"],
    ["ban phim", "keyboard"],
    ["sac", "charger", "adapter"],
    ["pin du phong", "power bank", "powerbank"],
    ["laptop", "notebook", "may tinh xach tay"],
    ["tablet", "may tinh bang", "ipad"],
];

const toNumber = (value, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeText = (value) =>
    String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/Ä‘/g, "d")
    .replace(/\s+/g, " ")
    .trim();

const tokenize = (value) => {
    const normalized = normalizeText(value);
    const tokens = normalized.match(/[a-z0-9]+/g);
    return tokens || [];
};

const termFrequencyMap = (tokens) => {
    const map = new Map();
    tokens.forEach((token) => {
        map.set(token, (map.get(token) || 0) + 1);
    });
    return map;
};

const levenshteinDistance = (a, b) => {
    if (a === b) return 0;
    if (!a) return b.length;
    if (!b) return a.length;

    const rows = a.length + 1;
    const cols = b.length + 1;
    const dp = Array.from({ length: rows }, () => Array(cols).fill(0));

    for (let i = 0; i < rows; i += 1) dp[i][0] = i;
    for (let j = 0; j < cols; j += 1) dp[0][j] = j;

    for (let i = 1; i < rows; i += 1) {
        for (let j = 1; j < cols; j += 1) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
        }
    }

    return dp[a.length][b.length];
};

const maxTypoDistance = (tokenLength) => {
    if (tokenLength <= 4) return 2;
    if (tokenLength <= 8) return 2;
    return 3;
};

const bestFuzzySimilarity = (queryToken, candidateTokens) => {
    if (!queryToken || !candidateTokens.length) return 0;

    const maxDistance = maxTypoDistance(queryToken.length);
    let best = 0;

    for (let i = 0; i < candidateTokens.length; i += 1) {
        const candidate = candidateTokens[i];
        if (!candidate) continue;

        if (queryToken.length <= 2 && candidate.startsWith(queryToken)) {
            const prefixSimilarity = queryToken.length === 1 ? 0.92 : 0.86;
            if (prefixSimilarity > best) best = prefixSimilarity;
            continue;
        }

        if (!/\d/.test(queryToken) && candidate[0] !== queryToken[0]) {
            continue;
        }

        const dist = levenshteinDistance(queryToken, candidate);
        if (dist > maxDistance) continue;

        const similarity = 1 - dist / Math.max(queryToken.length, candidate.length, 1);
        if (similarity > best) best = similarity;
    }

    return best;
};

const bm25 = (tf, docLen, avgDocLen, idf, k1 = 1.5, b = 0.75) => {
    if (!tf || !idf) return 0;
    const denominator = tf + k1 * (1 - b + b * (docLen / Math.max(avgDocLen, 1)));
    if (!denominator) return 0;
    return idf * ((tf * (k1 + 1)) / denominator);
};

const expandWithSynonyms = (normalizedQuery) => {
    const expanded = new Set(tokenize(normalizedQuery));

    SYNONYM_GROUPS.forEach((group) => {
        const found = group.some((variant) => normalizedQuery.includes(variant));
        if (!found) return;

        group.forEach((variant) => {
            tokenize(variant).forEach((token) => expanded.add(token));
        });
    });

    return Array.from(expanded).filter((token) => token.length >= 1);
};

const buildIndex = (products) => {
    const docs = (Array.isArray(products) ? products : []).map((product) => {
        const nameTokens = tokenize(product && product.name);
        const brandTokens = tokenize(product && product.brand);
        const descTokens = tokenize(product && product.description);

        return {
            product,
            nameTokens,
            brandTokens,
            descTokens,
            allTokens: [...nameTokens, ...brandTokens, ...descTokens],
            nameTf: termFrequencyMap(nameTokens),
            brandTf: termFrequencyMap(brandTokens),
            descTf: termFrequencyMap(descTokens),
            nameLen: nameTokens.length || 1,
            brandLen: brandTokens.length || 1,
            descLen: descTokens.length || 1,
        };
    });

    const avgNameLen = docs.reduce((sum, doc) => sum + doc.nameLen, 0) / Math.max(docs.length, 1);
    const avgBrandLen = docs.reduce((sum, doc) => sum + doc.brandLen, 0) / Math.max(docs.length, 1);
    const avgDescLen = docs.reduce((sum, doc) => sum + doc.descLen, 0) / Math.max(docs.length, 1);

    const docFrequency = new Map();
    docs.forEach((doc) => {
        const uniq = new Set(doc.allTokens);
        uniq.forEach((token) => {
            docFrequency.set(token, (docFrequency.get(token) || 0) + 1);
        });
    });

    return {
        docs,
        docFrequency,
        docCount: docs.length,
        avgNameLen,
        avgBrandLen,
        avgDescLen,
    };
};

const scoreDocument = (doc, index, expandedTokens, coreTokens) => {
    let score = 0;
    let exactMatches = 0;
    let fuzzyNameBrandMatches = 0;

    expandedTokens.forEach((token) => {
        const df = index.docFrequency.get(token) || 0;
        const idf = Math.log(1 + (index.docCount - df + 0.5) / (df + 0.5));

        const nameTf = doc.nameTf.get(token) || 0;
        const brandTf = doc.brandTf.get(token) || 0;
        const descTf = doc.descTf.get(token) || 0;

        if (nameTf > 0 || brandTf > 0 || descTf > 0) {
            exactMatches += 1;
        }

        score += 3.0 * bm25(nameTf, doc.nameLen, index.avgNameLen, idf);
        score += 2.2 * bm25(brandTf, doc.brandLen, index.avgBrandLen, idf);
        score += 1.0 * bm25(descTf, doc.descLen, index.avgDescLen, idf);

        if (nameTf > 0 || brandTf > 0) {
            fuzzyNameBrandMatches += 1;
            return;
        }

        const fuzzyName = bestFuzzySimilarity(token, doc.nameTokens);
        const fuzzyBrand = bestFuzzySimilarity(token, doc.brandTokens);
        const fuzzyDesc = bestFuzzySimilarity(token, doc.descTokens);

        const fuzzySignal = Math.max(fuzzyName * 1.3, fuzzyBrand * 1.1, fuzzyDesc * 0.75);
        if (fuzzySignal >= 0.6) {
            score += idf * fuzzySignal;
        }

        if (Math.max(fuzzyName, fuzzyBrand) >= 0.6) {
            fuzzyNameBrandMatches += 1;
        }
    });

    const normalizedName = normalizeText(doc.product && doc.product.name);
    const normalizedBrand = normalizeText(doc.product && doc.product.brand);
    const normalizedCoreQuery = normalizeText(coreTokens.join(" "));

    const isSingleCharQuery = coreTokens.length === 1 && coreTokens[0].length === 1;
    if (isSingleCharQuery) {
        const token = coreTokens[0];
        const strictPrefixPass =
            doc.nameTokens.some((candidate) => candidate.startsWith(token)) ||
            doc.brandTokens.some((candidate) => candidate.startsWith(token));
        if (!strictPrefixPass) {
            return {
                score: 0,
                isValid: false,
            };
        }

        score += 5;
    }

    if (normalizedCoreQuery && normalizedName === normalizedCoreQuery) {
        score += 10;
    } else if (normalizedCoreQuery && normalizedName.startsWith(normalizedCoreQuery)) {
        score += 6;
    }

    const modelTokens = coreTokens.filter((token) => /\d/.test(token));
    const modelConstraintPass = modelTokens.every((token) => {
        if (doc.nameTf.get(token) || doc.brandTf.get(token) || doc.descTf.get(token)) return true;
        return Math.max(
            bestFuzzySimilarity(token, doc.nameTokens),
            bestFuzzySimilarity(token, doc.brandTokens)
        ) >= 0.75;
    });

    const minDirectMatches = coreTokens.length <= 1 ? 1 : Math.min(2, coreTokens.length);
    const directConstraintPass = fuzzyNameBrandMatches >= minDirectMatches;

    const minCoverage = coreTokens.length <= 2 ?
        1 :
        Math.max(2, Math.ceil(coreTokens.length * 0.6));

    const coveragePass = exactMatches >= minCoverage || fuzzyNameBrandMatches >= minCoverage;

    return {
        score,
        isValid: modelConstraintPass && directConstraintPass && coveragePass,
    };
};

const normalizeSort = (sortBy) => {
    const s = String(sortBy || "relevance").toLowerCase();
    if (s === "price-low" || s === "price_asc") return "price-asc";
    if (s === "price-high" || s === "price_desc") return "price-desc";
    if (s === "best-selling" || s === "bestselling" || s === "sold") return "best-selling";
    if (s === "rating") return "rating";
    if (s === "newest") return "newest";
    return "relevance";
};

const sortScored = (scored, sortBy) => {
    const bySoldDesc = (a, b) => toNumber(b && b.product && b.product.sold, 0) - toNumber(a && a.product && a.product.sold, 0);
    const byPriceAsc = (a, b) => toNumber(a && a.product && a.product.price, 0) - toNumber(b && b.product && b.product.price, 0);
    const byPriceDesc = (a, b) => toNumber(b && b.product && b.product.price, 0) - toNumber(a && a.product && a.product.price, 0);
    const byRatingDesc = (a, b) => toNumber(b && b.product && b.product.rating, 0) - toNumber(a && a.product && a.product.rating, 0);

    if (sortBy === "price-asc") {
        scored.sort((a, b) => byPriceAsc(a, b));
    } else if (sortBy === "price-desc") {
        scored.sort((a, b) => byPriceDesc(a, b));
    } else if (sortBy === "best-selling") {
        scored.sort((a, b) => bySoldDesc(a, b) || byRatingDesc(a, b) || (b.score || 0) - (a.score || 0));
    } else if (sortBy === "rating") {
        scored.sort((a, b) => byRatingDesc(a, b) || bySoldDesc(a, b) || (b.score || 0) - (a.score || 0));
    } else if (sortBy === "newest") {
        scored.sort((a, b) => new Date((b && b.product && b.product.createdAt) || 0) - new Date((a && a.product && a.product.createdAt) || 0));
    } else {
        scored.sort((a, b) => (b.score || 0) - (a.score || 0) || bySoldDesc(a, b) || byRatingDesc(a, b));
    }
};

const filterCandidates = (products, filters = {}) => {
    const {
        category,
        brand,
        minPrice,
        maxPrice,
    } = filters;

    let list = Array.isArray(products) ? [...products] : [];

    if (category && category !== "all") {
        list = list.filter((p) => String((p && p.category) || "") === String(category));
    }

    if (brand) {
        const normalizedBrand = normalizeText(brand);
        list = list.filter((p) => normalizeText(p && p.brand).includes(normalizedBrand));
    }

    if (minPrice !== undefined && minPrice !== null && minPrice !== "") {
        list = list.filter((p) => toNumber(p && p.price, 0) >= Number(minPrice));
    }

    if (maxPrice !== undefined && maxPrice !== null && maxPrice !== "") {
        list = list.filter((p) => toNumber(p && p.price, 0) <= Number(maxPrice));
    }

    return list;
};

const paginate = (list, page, limit) => {
    const pageNumber = Math.max(1, toNumber(page, 1));
    const pageSize = Math.max(1, toNumber(limit, 12));
    const total = list.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const start = (Math.min(pageNumber, totalPages) - 1) * pageSize;

    return {
        items: list.slice(start, start + pageSize),
        pagination: {
            page: Math.min(pageNumber, totalPages),
            limit: pageSize,
            totalPages,
            totalProducts: total,
            hasNextPage: pageNumber < totalPages,
            hasPrevPage: pageNumber > 1,
        },
    };
};

exports.searchProductsAdvanced = (products, options = {}) => {
    const {
        search,
        sort,
        page = 1,
        limit = 12,
        category,
        brand,
        minPrice,
        maxPrice,
    } = options;

    const sortBy = normalizeSort(sort);
    const candidates = filterCandidates(products, {
        category,
        brand,
        minPrice,
        maxPrice,
    });

    const normalizedQuery = normalizeText(search);
    if (!normalizedQuery) {
        const plain = candidates.map((product) => ({ product, score: 0 }));
        sortScored(plain, sortBy);
        const plainList = plain.map((item) => item.product);
        return paginate(plainList, page, limit);
    }

    const coreTokens = tokenize(normalizedQuery).filter(
        (token) => token.length >= 1 && !STOP_WORDS.has(token)
    );
    const expandedTokens = expandWithSynonyms(normalizedQuery);

    const index = buildIndex(candidates);
    const scored = index.docs
        .map((doc) => {
            const scoredDoc = scoreDocument(doc, index, expandedTokens, coreTokens);
            return {
                product: doc.product,
                score: scoredDoc.score,
                isValid: scoredDoc.isValid,
            };
        })
        .filter((item) => item.isValid && item.score > 0);

    sortScored(scored, sortBy);
    const sortedProducts = scored.map((item) => item.product);
    return paginate(sortedProducts, page, limit);
};