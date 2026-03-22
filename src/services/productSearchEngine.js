const STOP_WORDS = new Set([
    "loai",
    "cai",
    "chiec",
    "san",
    "pham",
    "va",
    "voi",
    "cho",
    "cua",
    "la",
    "the",
    "he",
    "dong",
    "hang",
    "khong",
    "co",
    "day",
    "wireless",
]);

const TOKEN_SYNONYMS = {
    dt: ["dien", "thoai", "phone"],
    dthoai: ["dien", "thoai", "phone"],
    cellphone: ["dien", "thoai", "phone"],
    smartphone: ["dien", "thoai", "phone"],
    mobile: ["dien", "thoai", "phone"],
    phone: ["dien", "thoai"],
    headphone: ["tai", "nghe", "airpods"],
    headphones: ["tai", "nghe", "airpods"],
    earphone: ["tai", "nghe", "airpods"],
    earphones: ["tai", "nghe", "airpods"],
    airpods: ["tai", "nghe", "headphone"],
    notebook: ["laptop"],
    ultrabook: ["laptop"],
    tab: ["tablet"],
    ipad: ["tablet"],
};

const PHRASE_SYNONYMS = {
    "dien thoai": ["phone", "smartphone", "iphone"],
    "tai nghe": ["headphone", "earphone", "airpods"],
    "may tinh bang": ["tablet", "ipad"],
    "may tinh xach tay": ["laptop", "notebook"],
};

const CATEGORY_ALIASES = {
    Phone: ["dien thoai", "phone", "smartphone", "mobile", "di dong", "iphone"],
    Laptop: ["laptop", "notebook", "ultrabook", "macbook", "surface", "may tinh xach tay"],
    Tablet: ["tablet", "ipad", "may tinh bang", "galaxy tab", "tab"],
    Accessory: ["phu kien", "accessory", "tai nghe", "headphone", "earphone", "airpods", "charger", "sac", "adapter", "tay cam", "gamepad"],
    Monitor: ["man hinh", "monitor", "screen", "display"],
};

const CATEGORY_INTENT_TOKENS = {
    Phone: ["dien", "thoai", "phone", "smartphone", "mobile", "di", "dong"],
    Laptop: ["laptop", "notebook", "ultrabook", "may", "tinh", "xach", "tay"],
    Tablet: ["tablet", "may", "tinh", "bang", "tab"],
    Accessory: ["phu", "kien", "accessory", "phu_kien"],
    Monitor: ["man", "hinh", "monitor", "screen", "display"],
};

const CATEGORY_EXCLUSION_TOKENS = {
    Phone: [
        "ssd",
        "hdd",
        "soundbar",
        "keyboard",
        "mouse",
        "router",
        "dock",
        "hub",
    ],
};

const toNumber = (value, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeText = (value) =>
    String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    // Support both proper Vietnamese 'đ' and potential mojibake forms.
    .replace(/đ/g, "d")
    .replace(/Ä‘/g, "d")
    .replace(/\s+/g, " ")
    .trim();

const tokenize = (value) => {
    const normalized = normalizeText(value);
    return normalized.match(/[a-z0-9]+/g) || [];
};

const uniqueTokens = (tokens) => Array.from(new Set(tokens.filter(Boolean)));

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

const buildVocabulary = (products) => {
    const vocab = new Set();

    (Array.isArray(products) ? products : []).forEach((product) => {
        tokenize(product && product.name).forEach((token) => vocab.add(token));
        tokenize(product && product.brand).forEach((token) => vocab.add(token));
        tokenize(product && product.category).forEach((token) => vocab.add(token));
    });

    Object.values(TOKEN_SYNONYMS).forEach((synonyms) => {
        synonyms.forEach((token) => vocab.add(token));
    });

    Object.values(CATEGORY_ALIASES).forEach((aliases) => {
        aliases.forEach((alias) => tokenize(alias).forEach((token) => vocab.add(token)));
    });

    return Array.from(vocab);
};

const correctTokenWithVocabulary = (token, vocabulary) => {
    if (!token || !Array.isArray(vocabulary) || vocabulary.length === 0) return token;
    if (vocabulary.includes(token)) return token;

    let bestToken = token;
    let bestDistance = Number.POSITIVE_INFINITY;

    for (let i = 0; i < vocabulary.length; i += 1) {
        const candidate = vocabulary[i];
        if (!candidate) continue;
        if (Math.abs(candidate.length - token.length) > 2) continue;

        const distance = levenshteinDistance(token, candidate);
        if (distance < bestDistance) {
            bestDistance = distance;
            bestToken = candidate;
        }
    }

    return bestDistance <= 2 ? bestToken : token;
};

const expandSynonyms = (tokens) => {
    const expanded = [];

    tokens.forEach((token) => {
        expanded.push(token);

        const mapped = TOKEN_SYNONYMS[token];
        if (mapped && mapped.length > 0) {
            mapped.forEach((synonymToken) => expanded.push(synonymToken));
        }
    });

    return uniqueTokens(expanded);
};

const expandPhraseSynonyms = (normalizedQuery, tokens) => {
    const expanded = [...tokens];

    Object.entries(PHRASE_SYNONYMS).forEach(([phrase, mappedTokens]) => {
        if (!normalizedQuery.includes(phrase)) return;

        mappedTokens.forEach((token) => expanded.push(token));
    });

    return uniqueTokens(expanded);
};

const detectQueryCategory = (normalizedQuery, tokens) => {
    for (const [category, aliases] of Object.entries(CATEGORY_ALIASES)) {
        for (let i = 0; i < aliases.length; i += 1) {
            const alias = normalizeText(aliases[i]);
            const aliasTokens = tokenize(alias);

            if (alias.includes(" ") && normalizedQuery.includes(alias)) {
                return category;
            }

            if (aliasTokens.length > 0 && aliasTokens.every((token) => tokens.includes(token))) {
                return category;
            }
        }
    }

    return null;
};

const preprocessQuery = (search, vocabulary) => {
    const normalizedQuery = normalizeText(search);
    const rawTokens = tokenize(normalizedQuery);
    const filteredTokens = rawTokens.filter((token) => !STOP_WORDS.has(token));
    const correctedFilteredTokens = filteredTokens.map((token) => correctTokenWithVocabulary(token, vocabulary));
    const synonymExpandedTokens = expandSynonyms(correctedFilteredTokens);
    const phraseExpandedTokens = expandPhraseSynonyms(normalizedQuery, synonymExpandedTokens);
    const correctedTokens = phraseExpandedTokens.map((token) => correctTokenWithVocabulary(token, vocabulary));
    const finalTokens = uniqueTokens(correctedTokens.filter((token) => !STOP_WORDS.has(token)));

    return {
        normalizedQuery,
        rawTokens: uniqueTokens(correctedFilteredTokens.filter((token) => !STOP_WORDS.has(token))),
        tokens: finalTokens,
    };
};

const getCategoryIntentTokens = (category) => {
    const baseTokens = CATEGORY_INTENT_TOKENS[category] || [];
    return new Set(baseTokens.map((token) => normalizeText(token)));
};

const scoreProduct = (product, tokens) => {
    const nameTokens = new Set(tokenize(product && product.name));
    const brandTokens = new Set(tokenize(product && product.brand));
    const categoryTokens = new Set(tokenize(product && product.category));
    const descTokens = new Set(tokenize(product && product.description));

    let score = 0;
    let titleMatches = 0;
    let attributeMatches = 0;
    let descriptionMatches = 0;
    const matchedTokens = new Set();

    tokens.forEach((token) => {
        if (nameTokens.has(token)) {
            score += 10;
            titleMatches += 1;
            matchedTokens.add(token);
            return;
        }

        if (brandTokens.has(token) || categoryTokens.has(token)) {
            score += 5;
            attributeMatches += 1;
            matchedTokens.add(token);
            return;
        }

        if (descTokens.has(token)) {
            score += 2;
            descriptionMatches += 1;
            matchedTokens.add(token);
        }
    });

    return {
        score,
        titleMatches,
        attributeMatches,
        descriptionMatches,
        coverage: tokens.length > 0 ? matchedTokens.size / tokens.length : 0,
    };
};

const hasCategoryConflictTokens = (product, category) => {
    const denied = CATEGORY_EXCLUSION_TOKENS[category] || [];
    if (denied.length === 0) return false;

    const textTokens = new Set([
        ...tokenize(product && product.name),
        ...tokenize(product && product.description),
    ]);

    return denied.some((token) => textTokens.has(normalizeText(token)));
};

const normalizeSort = (sortBy) => {
    const s = String(sortBy || "relevance").toLowerCase();
    if (s === "price-low" || s === "price_asc" || s === "price") return "price-asc";
    if (s === "price-high" || s === "price_desc" || s === "-price") return "price-desc";
    if (s === "best-selling" || s === "bestselling" || s === "sold") return "best-selling";
    if (s === "rating" || s === "-rating") return "rating";
    if (s === "newest" || s === "-createdat") return "newest";
    return "relevance";
};

const getDiscountPercent = (product) => {
    const explicitDiscount = toNumber(product && product.discount, NaN);
    if (Number.isFinite(explicitDiscount) && explicitDiscount > 0) return explicitDiscount;

    const price = toNumber(product && product.price, 0);
    const originalPrice = toNumber(product && product.originalPrice, 0);
    if (originalPrice > price && originalPrice > 0) {
        return Math.round(((originalPrice - price) / originalPrice) * 100);
    }

    return 0;
};

const sortScored = (scored, sortBy) => {
    const bySoldDesc = (a, b) => toNumber(b && b.product && b.product.sold, 0) - toNumber(a && a.product && a.product.sold, 0);
    const byDiscountDesc = (a, b) => getDiscountPercent(b && b.product) - getDiscountPercent(a && a.product);
    const byRatingDesc = (a, b) => toNumber(b && b.product && b.product.rating, 0) - toNumber(a && a.product && a.product.rating, 0);
    const byPriceAsc = (a, b) => toNumber(a && a.product && a.product.price, 0) - toNumber(b && b.product && b.product.price, 0);
    const byPriceDesc = (a, b) => toNumber(b && b.product && b.product.price, 0) - toNumber(a && a.product && a.product.price, 0);

    if (sortBy === "price-asc") {
        scored.sort((a, b) => byPriceAsc(a, b) || bySoldDesc(a, b) || byDiscountDesc(a, b));
        return;
    }

    if (sortBy === "price-desc") {
        scored.sort((a, b) => byPriceDesc(a, b) || bySoldDesc(a, b) || byDiscountDesc(a, b));
        return;
    }

    if (sortBy === "best-selling") {
        scored.sort((a, b) => bySoldDesc(a, b) || byDiscountDesc(a, b) || (b.score || 0) - (a.score || 0));
        return;
    }

    if (sortBy === "rating") {
        scored.sort((a, b) => byRatingDesc(a, b) || bySoldDesc(a, b) || byDiscountDesc(a, b));
        return;
    }

    if (sortBy === "newest") {
        scored.sort((a, b) => {
            const d = new Date((b && b.product && b.product.createdAt) || 0) - new Date((a && a.product && a.product.createdAt) || 0);
            return d || bySoldDesc(a, b) || byDiscountDesc(a, b);
        });
        return;
    }

    scored.sort((a, b) => {
        const relevance = (b.score || 0) - (a.score || 0);
        return relevance || bySoldDesc(a, b) || byDiscountDesc(a, b) || byRatingDesc(a, b);
    });
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

    // Always filter out products that are out of stock.
    list = list.filter((p) => toNumber(p && p.stock, 1) > 0);

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

    const vocabulary = buildVocabulary(candidates);
    const query = preprocessQuery(search, vocabulary);

    if (!query.normalizedQuery || query.tokens.length === 0) {
        const plain = candidates.map((product) => ({ product, score: 0 }));
        sortScored(plain, sortBy);
        return paginate(plain.map((item) => item.product), page, limit);
    }

    const queryCategory = detectQueryCategory(query.normalizedQuery, query.tokens);
    const semanticCandidates = queryCategory ?
        candidates.filter((p) => String((p && p.category) || "") === String(queryCategory)) :
        candidates;

    const categoryIntentTokens = queryCategory ? getCategoryIntentTokens(queryCategory) : new Set();
    const detailTokens = queryCategory ?
        query.rawTokens.filter((token) => !categoryIntentTokens.has(token)) : [];

    const scored = semanticCandidates
        .map((product) => {
            const breakdown = scoreProduct(product, query.tokens);

            let finalScore = breakdown.score;
            let isValid = false;

            if (queryCategory) {
                const hasCategoryConflict = hasCategoryConflictTokens(product, queryCategory);

                // Category-only query keeps broad results inside that category.
                if (detailTokens.length === 0) {
                    finalScore = 5 + breakdown.score;
                    isValid = !hasCategoryConflict;
                } else {
                    // Category + detail query requires detail match to remove noisy results.
                    const detailBreakdown = scoreProduct(product, detailTokens);
                    const hasDetailStrongMatch = detailBreakdown.titleMatches > 0 || detailBreakdown.attributeMatches > 0;

                    isValid = !hasCategoryConflict &&
                        detailBreakdown.score > 0 &&
                        (hasDetailStrongMatch || detailBreakdown.coverage >= 0.6);

                    finalScore = 5 + breakdown.score + detailBreakdown.score;
                }
            } else {
                // Without category detection, apply stricter validation
                const minCoverage = query.tokens.length > 1 ? 0.6 : 1;
                const hasStrongMatch = breakdown.titleMatches > 0 || breakdown.attributeMatches > 0;
                isValid =
                    breakdown.score > 0 &&
                    breakdown.coverage >= minCoverage &&
                    (hasStrongMatch || breakdown.score >= 10);
                finalScore = breakdown.score;
            }

            return {
                product,
                score: finalScore,
                isValid,
            };
        })
        .filter((item) => item.isValid);

    sortScored(scored, sortBy);
    return paginate(scored.map((item) => item.product), page, limit);
};