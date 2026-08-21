import { promises as fs } from "node:fs";

import { dirname, relative, resolve, sep } from "node:path";

import { pathToFileURL } from "node:url";

const ROOT = resolve("."), FIXTURES = resolve(ROOT, "evals/ai"), TMP = resolve(ROOT, ".tmp");

const SAFE_ERROR = "Invalid routing records input", FIXTURE_ERROR = "Invalid AI routing fixture";

const SUITES = [ "company-research", "interview-follow-up", "interview-feedback", "resume" ], MAX_OUTPUT = 2e4, MAX_TEXT = 5e3, MAX_ITEMS = 20;

const CONFIG = {
    "company-research": [ "OPENAI_COMPANY_RESEARCH_MODEL", "gpt-5.4-mini", 9e4 ],
    "interview-follow-up": [ "OPENAI_INTERVIEW_FOLLOWUP_MODEL", "gpt-5.6-luna", 8e3 ],
    "interview-feedback": [ "OPENAI_INTERVIEW_FEEDBACK_MODEL", "gpt-5.4-mini", 15e3 ],
    resume: [ "OPENAI_RESUME_MODEL", "gpt-5.4-mini", 2e4 ]
};

const scoreKeys = [ "japaneseNaturalness", "specificity", "nonIntimidating" ], trim = v => typeof v === "string" ? v.trim() : "", safeInt = (v, min = 0) => Number.isSafeInteger(v) && v >= min, plain = v => v !== null && typeof v === "object" && !Array.isArray(v) && Object.getPrototypeOf(v) === Object.prototype, bounded = v => typeof v === "string" && v.length ? v.slice(0, MAX_OUTPUT) : null, str = (v, max = MAX_TEXT) => typeof v === "string" && v.trim() && v.length <= max, strs = (v, min = 0, max = MAX_ITEMS, n = MAX_TEXT) => Array.isArray(v) && v.length >= min && v.length <= max && v.every((x => str(x, n))), exact = (o, keys) => plain(o) && Object.keys(o).length === keys.length && keys.every((k => Object.hasOwn(o, k)));

const objectSchema = (properties, required) => ({
    type: "object",
    additionalProperties: false,
    properties: properties,
    required: required
}), stringSchema = (max = MAX_TEXT) => ({
    type: "string",
    minLength: 1,
    maxLength: max
});

function jsonValue(v) {
    if (v === null || typeof v === "string" || typeof v === "boolean" || typeof v === "number" && Number.isFinite(v)) return v;
    if (Array.isArray(v)) return v.map(jsonValue);
    if (!plain(v)) throw new Error(FIXTURE_ERROR);
    return Object.fromEntries(Object.keys(v).map((k => [ k, jsonValue(v[k]) ])));
}

function validateFixture(f, s = f?.suite) {
    if (!plain(f) || !SUITES.includes(s) || f.suite !== s || !str(f.id, 160) || !plain(f.input) || !plain(f.expectations)) throw new Error(FIXTURE_ERROR);
    jsonValue(f);
    return f;
}

function safeFixture(f) {
    return jsonValue(validateFixture(f));
}

function schemaFor(s) {
    if (s === "company-research") return objectSchema({
        summary: stringSchema(),
        claims: {
            type: "array",
            maxItems: MAX_ITEMS,
            items: objectSchema({
                text: stringSchema(),
                sourceIds: {
                    type: "array",
                    minItems: 1,
                    maxItems: MAX_ITEMS,
                    items: stringSchema(64)
                }
            }, [ "text", "sourceIds" ])
        },
        sources: {
            type: "array",
            maxItems: MAX_ITEMS,
            items: objectSchema({
                sourceId: stringSchema(64),
                url: stringSchema(1e3)
            }, [ "sourceId", "url" ])
        },
        insufficientEvidence: {
            type: "boolean"
        },
        disambiguatedByOfficialUrl: {
            type: "boolean"
        }
    }, [ "summary", "claims", "sources", "insufficientEvidence", "disambiguatedByOfficialUrl" ]);
    if (s === "interview-follow-up") return objectSchema({
        prompt: stringSchema(70)
    }, [ "prompt" ]);
    if (s === "interview-feedback") return objectSchema({
        overallScore: {
            type: "number"
        },
        summary: stringSchema(),
        strengths: {
            type: "array",
            minItems: 1,
            maxItems: 3,
            items: stringSchema()
        },
        improvements: {
            type: "array",
            minItems: 1,
            maxItems: 3,
            items: stringSchema()
        },
        nextFocus: stringSchema(),
        nextQuestions: {
            type: "array",
            minItems: 1,
            maxItems: 3,
            items: stringSchema()
        }
    }, [ "overallScore", "summary", "strengths", "improvements", "nextFocus", "nextQuestions" ]);
    return objectSchema({
        motivation: stringSchema(),
        selfPr: stringSchema(),
        changeSummary: {
            type: "array",
            minItems: 1,
            maxItems: 6,
            items: stringSchema()
        },
        evidenceSourceIds: {
            type: "array",
            maxItems: MAX_ITEMS,
            items: stringSchema(64)
        }
    }, [ "motivation", "selfPr", "changeSummary", "evidenceSourceIds" ]);
}

function requestInput(f) {
    if (f.suite === "company-research") return {
        companyName: f.input.companyName,
        officialUrl: f.input.officialUrl,
        sourcePackets: f.input.sourcePackets || [],
        expectations: f.expectations
    };
    if (f.suite === "interview-follow-up") return {
        companyName: f.input.companyName,
        targetRole: f.input.targetRole,
        category: f.input.category,
        existingAnswers: f.input.existingAnswers || [],
        expectations: f.expectations
    };
    if (f.suite === "interview-feedback") return {
        category: f.input.category,
        answers: f.input.existingAnswers,
        expectations: f.expectations
    };
    const join = v => Array.isArray(v) ? v.filter((x => typeof x === "string")).join("\n") : "", context = plain(f.input.jobContext) ? {
        companyName: f.input.jobContext.companyName,
        role: f.input.jobContext.role,
        jobFacts: join(f.input.jobContext.jobFacts)
    } : null;
    return {
        mode: f.input.mode,
        education: join(f.input.education),
        experience: join(f.input.experience),
        licenses: join(f.input.licenses),
        motivation: f.input.motivation,
        selfPr: f.input.selfPr,
        jobContext: context,
        expectations: f.expectations
    };
}

export function buildSuiteRequest(fixture, model) {
    if (!str(model, 200)) throw new Error("Invalid AI routing model");
    const f = safeFixture(fixture), instructions = f.suite === "company-research" ? "あなたは企業研究支援者です。与えられたsourcePacketsだけを根拠に日本語で回答してください。Webアクセスは禁止です。事実・URLを創作しないでください。根拠不足と公式URLによる識別はfixtureの期待に従って明示してください。" : f.suite === "interview-follow-up" ? "日本語で、回答を深掘りする質問を一行だけ生成してください。既出質問と禁止表現を避けてください。" : f.suite === "interview-feedback" ? "日本語の面接総評を、指定スコアと配列制約に従って生成してください。" : "与えられた事実だけを使い、日本語の提案文を生成してください。未記載の事実は追加しないでください。";
    return {
        model: trim(model),
        instructions: instructions,
        input: JSON.stringify(requestInput(f)),
        text: {
            format: {
                type: "json_schema",
                name: `${f.suite}-${f.id}`,
                strict: true,
                schema: schemaFor(f.suite)
            }
        }
    };
}

function companyStrict(o) {
    return exact(o, [ "summary", "claims", "sources", "insufficientEvidence", "disambiguatedByOfficialUrl" ]) && str(o.summary) && Array.isArray(o.claims) && o.claims.length <= MAX_ITEMS && o.claims.every((x => exact(x, [ "text", "sourceIds" ]) && str(x.text) && strs(x.sourceIds, 1, MAX_ITEMS, 64))) && Array.isArray(o.sources) && o.sources.length <= MAX_ITEMS && o.sources.every((x => exact(x, [ "sourceId", "url" ]) && str(x.sourceId, 64) && str(x.url, 1e3))) && typeof o.insufficientEvidence === "boolean" && typeof o.disambiguatedByOfficialUrl === "boolean";
}

function companyCitations(f, o) {
    const packets = Array.isArray(f.input.sourcePackets) ? f.input.sourcePackets : [], known = new Map(packets.filter(plain).map((x => [ x.sourceId, x.url ]))), allowed = new Set(Array.isArray(f.expectations.allowedSourceUrls) ? f.expectations.allowedSourceUrls : []), listed = new Set, cited = new Set;
    let valid = true, fabricated = 0;
    for (const x of o.sources) {
        if (!known.has(x.sourceId) || listed.has(x.sourceId) || known.get(x.sourceId) !== x.url) valid = false;
        listed.add(x.sourceId);
        if (!allowed.has(x.url)) fabricated++;
    }
    for (const x of o.claims) {
        const ids = x.sourceIds.map(trim);
        if (!ids.length || new Set(ids).size !== ids.length || ids.some((id => !known.has(id)))) valid = false;
        ids.forEach((id => cited.add(id)));
    }
    if ((Array.isArray(f.expectations.requiredSourceIds) ? f.expectations.requiredSourceIds : []).some((id => !listed.has(id) && !cited.has(id)))) valid = false;
    return {
        valid: valid,
        fabricated: fabricated
    };
}

function strictFor(f, o) {
    if (f.suite === "company-research") return companyStrict(o);
    if (f.suite === "interview-follow-up") return exact(o, [ "prompt" ]) && str(o.prompt, f.expectations.maxCharacters || 70);
    if (f.suite === "interview-feedback") return exact(o, [ "overallScore", "summary", "strengths", "improvements", "nextFocus", "nextQuestions" ]) && Number.isFinite(o.overallScore) && str(o.summary) && str(o.nextFocus) && strs(o.strengths, 1, 3) && strs(o.improvements, 1, 3) && strs(o.nextQuestions, 1, 3);
    const req = Array.isArray(f.expectations.requiredFields) ? f.expectations.requiredFields : [];
    return exact(o, [ "motivation", "selfPr", "changeSummary", "evidenceSourceIds" ]) && str(o.motivation) && str(o.selfPr) && strs(o.changeSummary, 1, 6) && strs(o.evidenceSourceIds, 0, MAX_ITEMS, 64) && req.every((k => [ "motivation", "selfPr", "changeSummary", "evidenceSourceIds" ].includes(k) && (typeof o[k] === "string" && str(o[k]) || Array.isArray(o[k]) && o[k].length)));
}

export function assessSuiteOutput(fixture, rawText) {
    const f = safeFixture(fixture), review = bounded(rawText), empty = review === null, base = {
        output: null,
        boundedOutput: review,
        schemaSuccess: false,
        instructionAdherent: false,
        citationSourceValid: null,
        unsupportedClaim: empty ? false : null,
        fabricatedUrlCount: 0
    };
    if (empty) return base;
    let o;
    try {
        o = JSON.parse(rawText);
    } catch {
        return base;
    }
    if (!strictFor(f, o)) return base;
    const forbidden = (Array.isArray(f.expectations.forbiddenClaims) ? f.expectations.forbiddenClaims : Array.isArray(f.expectations.forbiddenPhrases) ? f.expectations.forbiddenPhrases : []).some((x => str(x) && rawText.includes(x)));
    if (f.suite === "company-research") {
        const c = companyCitations(f, o);
        return {
            ...base,
            output: o,
            schemaSuccess: true,
            instructionAdherent: !forbidden && o.insufficientEvidence === Boolean(f.expectations.mustAcknowledgeInsufficientEvidence) && o.disambiguatedByOfficialUrl === Boolean(f.expectations.mustDisambiguateByOfficialUrl),
            citationSourceValid: c.valid,
            fabricatedUrlCount: c.fabricated,
            unsupportedClaim: null
        };
    }
    if (f.suite === "interview-follow-up") {
        const p = o.prompt.trim();
        const normal = p.normalize("NFKC").replace(/\s+/g, " ").toLowerCase();
        const previous = (f.input.existingAnswers || []).map((x => trim(x?.prompt).normalize("NFKC").replace(/\s+/g, " ").toLowerCase()));
        const sentenceTerminatorCount = (p.match(/[。?？！!]/g) || []).length;
        const hasQuestionEnding = /[?？]$/.test(p) || /(?:(?:教えて|聞かせて|説明して|挙げて)ください|(?:です|ます|でしょう)か)。$/.test(p);
        return {
            ...base,
            output: o,
            schemaSuccess: true,
            instructionAdherent: !forbidden && !/[\r\n]/.test(p) && sentenceTerminatorCount === 1 && hasQuestionEnding && !previous.includes(normal),
            unsupportedClaim: false
        };
    }
    if (f.suite === "interview-feedback") return {
        ...base,
        output: o,
        schemaSuccess: true,
        instructionAdherent: !forbidden && o.overallScore >= f.expectations.scoreMin && o.overallScore <= f.expectations.scoreMax && [ o.strengths, o.improvements, o.nextQuestions ].every((x => x.length >= f.expectations.listMin && x.length <= f.expectations.listMax)),
        unsupportedClaim: null
    };
    return {
        ...base,
        output: o,
        schemaSuccess: true,
        instructionAdherent: !forbidden,
        unsupportedClaim: null
    };
}

export async function loadAiRoutingFixtures() {
    const out = {}, ids = new Set;
    for (const s of SUITES) {
        out[s] = (await fs.readFile(resolve(FIXTURES, `${s}.jsonl`), "utf8")).split(/\r?\n/).filter(Boolean).map((l => validateFixture(JSON.parse(l), s)));
        for (const f of out[s]) {
            if (ids.has(f.id)) throw new Error(FIXTURE_ERROR);
            ids.add(f.id);
        }
    }
    return out;
}

function validRecord(record) {
    return plain(record) && SUITES.includes(record.suite) && str(record.id, 160) && str(record.model, 200) && typeof record.schemaSuccess === "boolean" && typeof record.instructionAdherent === "boolean" && (record.citationSourceValid === null || typeof record.citationSourceValid === "boolean") && (record.unsupportedClaim === null || typeof record.unsupportedClaim === "boolean") && safeInt(record.fabricatedUrlCount) && typeof record.fallback === "boolean" && typeof record.apiFailure === "boolean" && typeof record.timeout === "boolean" && Number.isFinite(record.latencyMs) && record.latencyMs >= 0 && (record.totalCostMilliYen === null || Number.isFinite(record.totalCostMilliYen) && record.totalCostMilliYen >= 0) && plain(record.humanScores) && scoreKeys.every((key => record.humanScores[key] === null || Number.isFinite(record.humanScores[key]) && record.humanScores[key] >= 1 && record.humanScores[key] <= 5));
}

const pct = (values, percentile) => values.length ? [ ...values ].sort(((a, b) => a - b))[Math.ceil(values.length * percentile) - 1] : null;

function gate(pass, actual, expected) {
    return {
        pass: pass,
        actual: actual,
        expected: expected
    };
}

export function evaluateRoutingRecords(records, options) {
    const baseline = options?.terraBaselineCostPerSuccessfulOutputMilliYen;
    if (!Array.isArray(records) || !records.length || !plain(options) || !(baseline === null || Number.isFinite(baseline) && baseline >= 0) || !records.every(validRecord) || new Set(records.map((record => record.id))).size !== records.length) {
        throw new Error(SAFE_ERROR);
    }
    const count = records.length;
    const perSuiteRecords = Object.fromEntries(SUITES.map((suite => [ suite, records.filter((record => record.suite === suite)) ])));
    const countRecords = predicate => records.filter(predicate).length;
    const companyRecords = perSuiteRecords["company-research"];
    const annotatedUnsupported = countRecords((record => record.unsupportedClaim !== null));
    const accepted = records.filter((record => !record.apiFailure && !record.timeout && record.schemaSuccess && record.instructionAdherent && record.citationSourceValid !== false && record.unsupportedClaim === false && !record.fabricatedUrlCount));
    const unpriced = accepted.filter((record => record.totalCostMilliYen === null));
    const citationRecords = records.filter((record => record.citationSourceValid !== null));
    const companyCitations = companyRecords.filter((record => record.citationSourceValid !== null));
    const candidateCost = accepted.length && !unpriced.length ? accepted.reduce(((sum, record) => sum + record.totalCostMilliYen), 0) / accepted.length : null;
    const costBlocker = !accepted.length ? "NO_ACCEPTED_SUCCESS" : unpriced.length ? "UNPRICED_ACCEPTED_SUCCESS" : baseline === null ? "MISSING_BASELINE" : null;
    const totals = {
        count: count,
        schemaSuccessRate: countRecords((record => record.schemaSuccess)) / count,
        instructionAdherentRate: countRecords((record => record.instructionAdherent)) / count,
        fallbackRate: countRecords((record => record.fallback)) / count,
        apiFailureOrTimeoutRate: countRecords((record => record.apiFailure || record.timeout)) / count,
        citationApplicabilityCount: citationRecords.length,
        citationValidityRate: citationRecords.length ? citationRecords.filter((record => record.citationSourceValid)).length / citationRecords.length : null,
        citationAnnotationCoverage: companyRecords.length ? companyCitations.length / companyRecords.length : null,
        companyCitationValidityRate: companyCitations.length ? companyCitations.filter((record => record.citationSourceValid)).length / companyCitations.length : null,
        unsupportedAnnotationCoverage: annotatedUnsupported / count,
        unsupportedClaimRate: annotatedUnsupported ? countRecords((record => record.unsupportedClaim === true)) / annotatedUnsupported : null,
        unsupportedClaimCount: countRecords((record => record.unsupportedClaim === true)),
        fabricatedUrlCount: records.reduce(((sum, record) => sum + record.fabricatedUrlCount), 0),
        latencyP50Ms: pct(records.map((record => record.latencyMs)), .5),
        latencyP95Ms: pct(records.map((record => record.latencyMs)), .95),
        costTotalKnownMilliYen: records.some((record => record.totalCostMilliYen !== null)) ? records.reduce(((sum, record) => sum + (record.totalCostMilliYen ?? 0)), 0) : null,
        costUnpricedCount: countRecords((record => record.totalCostMilliYen === null)),
        acceptedSuccessCount: accepted.length,
        unpricedAcceptedSuccessCount: unpriced.length,
        candidateCostPerSuccessfulOutputMilliYen: candidateCost,
        candidateCostPerSuccessfulOutputBlocker: costBlocker,
        humanScores: {}
    };
    for (const key of scoreKeys) {
        const values = records.map((record => record.humanScores[key])).filter((value => value !== null));
        totals.humanScores[key] = {
            mean: values.length ? values.reduce(((sum, value) => sum + value), 0) / values.length : null,
            coverage: values.length / count
        };
    }
    const perSuite = Object.fromEntries(SUITES.map((suite => {
        const suiteRecords = perSuiteRecords[suite];
        return [ suite, {
            count: suiteRecords.length,
            latencyP50Ms: pct(suiteRecords.map((record => record.latencyMs)), .5),
            latencyP95Ms: pct(suiteRecords.map((record => record.latencyMs)), .95)
        } ];
    })));
    const latencyGate = (actual, limit) => gate(actual !== null && actual <= limit, actual, {
        maximumMs: limit
    });
    const gateChecks = {
        schemaSuccess: gate(totals.schemaSuccessRate === 1, totals.schemaSuccessRate, {
            equal: 1
        }),
        fabricatedUrlCount: gate(totals.fabricatedUrlCount === 0, totals.fabricatedUrlCount, {
            equal: 0
        }),
        citationValidity: gate(totals.citationAnnotationCoverage === 1 && totals.companyCitationValidityRate === 1, {
            annotationCoverage: totals.citationAnnotationCoverage,
            validityRate: totals.companyCitationValidityRate
        }, {
            annotationCoverage: 1,
            validityRate: 1
        }),
        unsupportedClaim: gate(totals.unsupportedAnnotationCoverage === 1 && totals.unsupportedClaimCount === 0, {
            annotationCoverage: totals.unsupportedAnnotationCoverage,
            claimCount: totals.unsupportedClaimCount
        }, {
            annotationCoverage: 1,
            claimCount: 0
        }),
        instructionAdherent: gate(totals.instructionAdherentRate >= .98, totals.instructionAdherentRate, {
            minimum: .98
        }),
        apiFailureOrTimeout: gate(totals.apiFailureOrTimeoutRate < .01, totals.apiFailureOrTimeoutRate, {
            exclusiveMaximum: .01
        }),
        fallback: gate(totals.fallbackRate < .02, totals.fallbackRate, {
            exclusiveMaximum: .02
        }),
        p95InterviewFollowUp: latencyGate(perSuiteRecords["interview-follow-up"].length ? perSuite["interview-follow-up"].latencyP95Ms : null, 8e3),
        p95InterviewFeedback: latencyGate(perSuiteRecords["interview-feedback"].length ? perSuite["interview-feedback"].latencyP95Ms : null, 15e3),
        p95CompanyResearch: latencyGate(perSuiteRecords["company-research"].length ? perSuite["company-research"].latencyP95Ms : null, 9e4),
        p95Resume: latencyGate(perSuiteRecords.resume.length ? perSuite.resume.latencyP95Ms : null, 2e4),
        costPerSuccessfulOutput: gate(costBlocker === null && candidateCost < baseline, {
            candidate: candidateCost,
            baseline: baseline,
            blocker: costBlocker
        }, {
            candidate: "less than baseline",
            baseline: baseline
        })
    };
    const names = {
        schemaSuccess: "SCHEMA_NOT_ALL_SUCCESS",
        fabricatedUrlCount: "FABRICATED_URLS_PRESENT",
        citationValidity: "CITATION_INVALID_OR_MISSING_ANNOTATIONS",
        unsupportedClaim: "UNSUPPORTED_CLAIMS_OR_MISSING_ANNOTATIONS",
        instructionAdherent: "INSTRUCTION_BELOW_THRESHOLD",
        apiFailureOrTimeout: "API_FAILURE_TIMEOUT_TOO_HIGH",
        fallback: "FALLBACK_TOO_HIGH",
        p95InterviewFollowUp: "P95INTERVIEWFOLLOWUP_TOO_HIGH",
        p95InterviewFeedback: "P95INTERVIEWFEEDBACK_TOO_HIGH",
        p95CompanyResearch: "P95COMPANYRESEARCH_TOO_HIGH",
        p95Resume: "P95RESUME_TOO_HIGH",
        costPerSuccessfulOutput: "COST_GATE_FAIL"
    };
    const blockers = Object.entries(gateChecks).filter((([, check]) => !check.pass)).map((([key]) => names[key]));
    return {
        totals: totals,
        perSuite: perSuite,
        gateChecks: gateChecks,
        pass: !blockers.length,
        blockers: blockers
    };
}

function tmpPath(p) {
    if (!str(p, 1e3)) throw new Error("AI routing output path must be under .tmp/");
    const target = resolve(ROOT, p), rel = relative(TMP, target);
    if (!rel || rel.startsWith("..") || !target.startsWith(`${TMP}${sep}`)) throw new Error("AI routing output path must be under .tmp/");
    return target;
}

async function writeAtomic(path, text) {
    await fs.mkdir(dirname(path), {
        recursive: true,
        mode: 448
    });
    const temp = `${path}.${process.pid}.${Date.now()}.tmp`;
    try {
        await fs.writeFile(temp, text, {
            mode: 384
        });
        await fs.rename(temp, path);
    } catch (e) {
        await fs.rm(temp, {
            force: true
        }).catch((() => {}));
        throw e;
    }
}

function usage(x, web) {
    const input = safeInt(x?.input_tokens) ? x.input_tokens : 0;
    return {
        inputTokens: input,
        cachedInputTokens: Math.min(safeInt(x?.input_tokens_details?.cached_tokens) ? x.input_tokens_details.cached_tokens : 0, input),
        outputTokens: safeInt(x?.output_tokens) ? x.output_tokens : 0,
        webSearchCalls: web
    };
}

async function attempt({fixture: fixture, model: model, apiKey: apiKey, fxYenPerUsdMilli: fxYenPerUsdMilli, fetchImpl: fetchImpl = fetch, now: now = Date.now}) {
    const start = now();
    let apiFailure = false, timeout = false, text = null, u = usage({}, 0);
    try {
        const response = await fetchImpl("https://api.openai.com/v1/responses", {
            method: "POST",
            headers: {
                "content-type": "application/json",
                Authorization: `Bearer ${apiKey}`
            },
            body: JSON.stringify(buildSuiteRequest(fixture, model)),
            signal: AbortSignal.timeout(CONFIG[fixture.suite][2])
        });
        if (!response?.ok) apiFailure = true; else {
            const env = await response.json();
            if (!plain(env)) apiFailure = true; else {
                let web = 0, parts = [];
                for (const item of Array.isArray(env.output) ? env.output : []) {
                    if (item?.type === "web_search_call") web++;
                    for (const part of Array.isArray(item?.content) ? item.content : []) if (part?.type === "output_text" && typeof part.text === "string") parts.push(part.text);
                }
                text = parts.join("");
                u = usage(env.usage, web);
                if (env.status !== "completed") apiFailure = true;
            }
        }
    } catch (e) {
        timeout = e?.name === "TimeoutError" || e?.name === "AbortError";
        apiFailure = !timeout;
    }
    const a = assessSuiteOutput(fixture, text);
    let cost = null;
    try {
        const {estimateAiCost: estimateAiCost} = await import("../src/lib/ai/pricing.ts"), price = estimateAiCost({
            model: model,
            ...u,
            fxYenPerUsdMilli: fxYenPerUsdMilli
        });
        cost = price?.priced && Number.isFinite(price.totalCostMilliYen) && price.totalCostMilliYen >= 0 ? price.totalCostMilliYen : null;
    } catch {}
    return {
        record: {
            id: fixture.id,
            suite: fixture.suite,
            model: model,
            schemaSuccess: !apiFailure && !timeout && a.schemaSuccess,
            instructionAdherent: !apiFailure && !timeout && a.instructionAdherent,
            citationSourceValid: a.citationSourceValid,
            unsupportedClaim: a.unsupportedClaim,
            fabricatedUrlCount: a.fabricatedUrlCount,
            fallback: false,
            apiFailure: apiFailure,
            timeout: timeout,
            latencyMs: Math.max(0, now() - start),
            totalCostMilliYen: cost,
            humanScores: {
                japaneseNaturalness: null,
                specificity: null,
                nonIntimidating: null
            }
        },
        output: a.boundedOutput,
        technicalFailure: apiFailure || timeout || !text || !a.schemaSuccess
    };
}

function combined(first, second) {
    const totalCostMilliYen = first.record.totalCostMilliYen === null || second.record.totalCostMilliYen === null ? null : first.record.totalCostMilliYen + second.record.totalCostMilliYen;
    return {
        record: {
            ...second.record,
            model: first.record.model,
            fallback: true,
            latencyMs: first.record.latencyMs + second.record.latencyMs,
            totalCostMilliYen: totalCostMilliYen
        },
        output: second.output
    };
}

function validatePaidEvalArgs({apiKey: apiKey, outputPath: outputPath, fxYenPerUsdMilli: fxYenPerUsdMilli, limit: limit, concurrency: concurrency}) {
    if (!str(apiKey, 1e3)) throw new Error("Missing OPENAI_API_KEY for paid AI routing eval");
    if (!safeInt(fxYenPerUsdMilli, 1)) throw new Error("Invalid FX_YEN_PER_USD_MILLI");
    if (limit !== null && !safeInt(limit, 1)) throw new Error("Invalid AI_EVAL_LIMIT");
    if (!safeInt(concurrency, 1) || concurrency > 5) throw new Error("Invalid AI_EVAL_CONCURRENCY");
    return tmpPath(outputPath);
}

export async function runPaidEval({apiKey: apiKey, outputPath: outputPath, fxYenPerUsdMilli: fxYenPerUsdMilli, limit: limit = null, concurrency: concurrency = 2, fetchImpl: fetchImpl, now: now}) {
    // Validate before loading fixtures so direct callers cannot bypass the private output boundary.
    const resolvedOutputPath = validatePaidEvalArgs({
        apiKey: apiKey,
        outputPath: outputPath,
        fxYenPerUsdMilli: fxYenPerUsdMilli,
        limit: limit,
        concurrency: concurrency
    });
    const fixtures = await loadAiRoutingFixtures();
    const candidateRecords = [];
    const terraRecords = [];
    const reviewItems = [];
    const selectedFixtures = Object.fromEntries(SUITES.map((suite => [ suite, fixtures[suite].slice(0, limit ?? fixtures[suite].length) ])));
    const jobs = [];
    for (const suite of SUITES) {
        for (const fixture of selectedFixtures[suite]) {
            jobs.push((async () => {
                const candidate = trim(process.env[CONFIG[suite][0]]) || CONFIG[suite][1];
                const terra = trim(process.env.OPENAI_ESCALATION_MODEL) || "gpt-5.6-terra";
                const first = await attempt({
                    fixture: fixture,
                    model: candidate,
                    apiKey: apiKey,
                    fxYenPerUsdMilli: fxYenPerUsdMilli,
                    fetchImpl: fetchImpl,
                    now: now
                });
                const candidateResult = suite === "company-research" && first.technicalFailure ? combined(first, await attempt({
                    fixture: fixture,
                    model: terra,
                    apiKey: apiKey,
                    fxYenPerUsdMilli: fxYenPerUsdMilli,
                    fetchImpl: fetchImpl,
                    now: now
                })) : {
                    record: first.record,
                    output: first.output
                };
                const terraResult = await attempt({
                    fixture: fixture,
                    model: terra,
                    apiKey: apiKey,
                    fxYenPerUsdMilli: fxYenPerUsdMilli,
                    fetchImpl: fetchImpl,
                    now: now
                });
                candidateRecords.push(candidateResult.record);
                terraRecords.push(terraResult.record);
                reviewItems.push({
                    id: fixture.id,
                    suite: suite,
                    candidateOutput: candidateResult.output,
                    terraOutput: terraResult.output
                });
            }));
        }
    }
    let index = 0;
    await Promise.all(Array.from({
        length: concurrency
    }, (async () => {
        while (index < jobs.length) await jobs[index++]();
    })));
    const terraReport = evaluateRoutingRecords(terraRecords, {
        terraBaselineCostPerSuccessfulOutputMilliYen: Number.MAX_SAFE_INTEGER
    });
    const terraCost = terraReport.totals.candidateCostPerSuccessfulOutputMilliYen;
    const candidateReport = evaluateRoutingRecords(candidateRecords, {
        terraBaselineCostPerSuccessfulOutputMilliYen: terraCost
    });
    const artifact = {
        formatVersion: 1,
        generatedAt: (new Date).toISOString(),
        fixtureCounts: Object.fromEntries(SUITES.map((suite => [ suite, selectedFixtures[suite].length ]))),
        candidateRecords: candidateRecords,
        terraRecords: terraRecords,
        reviewItems: reviewItems,
        candidateReport: candidateReport,
        terraCostPerSuccessfulOutputMilliYen: terraCost
    };
    await writeAtomic(resolvedOutputPath, JSON.stringify(artifact, null, 2));
    return artifact;
}

function config(argv) {
    const i = argv.indexOf("--report"), report = i >= 0 ? argv[i + 1] : null;
    if (i >= 0 && !report) throw new Error("AI routing output path must be under .tmp/");
    if (report) return {
        report: tmpPath(report)
    };
    const apiKey = trim(process.env.OPENAI_API_KEY), fx = trim(process.env.FX_YEN_PER_USD_MILLI) || "150000", limit = trim(process.env.AI_EVAL_LIMIT), concurrency = trim(process.env.AI_EVAL_CONCURRENCY) || "2";
    if (!apiKey) throw new Error("Missing OPENAI_API_KEY for paid AI routing eval");
    if (!safeInt(Number(fx), 1)) throw new Error("Invalid FX_YEN_PER_USD_MILLI");
    if (limit && !safeInt(Number(limit), 1)) throw new Error("Invalid AI_EVAL_LIMIT");
    if (!safeInt(Number(concurrency), 1) || Number(concurrency) > 5) throw new Error("Invalid AI_EVAL_CONCURRENCY");
    for (const [env] of Object.values(CONFIG)) if (process.env[env] !== undefined && !trim(process.env[env])) throw new Error("Invalid AI routing model");
    if (process.env.OPENAI_ESCALATION_MODEL !== undefined && !trim(process.env.OPENAI_ESCALATION_MODEL)) throw new Error("Invalid AI routing model");
    return {
        apiKey: apiKey,
        fx: Number(fx),
        limit: limit ? Number(limit) : null,
        concurrency: Number(concurrency),
        output: tmpPath(process.env.AI_EVAL_OUTPUT_PATH || `.tmp/ai-routing-eval-${(new Date).toISOString().replace(/[^0-9TZ-]/g, "").slice(0, 19)}.json`)
    };
}

export async function main(argv = process.argv.slice(2)) {
    const report = argv.includes("--report");
    if (!report && process.env.RUN_PAID_AI_EVAL !== "1") {
        console.log("Skipping AI routing evaluator: set RUN_PAID_AI_EVAL=1 to enable the paid runner when configured.");
        return 0;
    }
    const c = config(argv);
    if (c.report) {
        const a = JSON.parse(await fs.readFile(c.report, "utf8")), tr = evaluateRoutingRecords(a.terraRecords, {
            terraBaselineCostPerSuccessfulOutputMilliYen: Number.MAX_SAFE_INTEGER
        });
        a.terraCostPerSuccessfulOutputMilliYen = tr.totals.candidateCostPerSuccessfulOutputMilliYen;
        a.candidateReport = evaluateRoutingRecords(a.candidateRecords, {
            terraBaselineCostPerSuccessfulOutputMilliYen: a.terraCostPerSuccessfulOutputMilliYen
        });
        await writeAtomic(c.report, JSON.stringify(a, null, 2));
        console.log(JSON.stringify({
            generatedAt: a.generatedAt,
            fixtureCounts: a.fixtureCounts,
            candidateCostPerSuccessfulOutputMilliYen: a.candidateReport.totals.candidateCostPerSuccessfulOutputMilliYen,
            terraCostPerSuccessfulOutputMilliYen: a.terraCostPerSuccessfulOutputMilliYen
        }));
        return 0;
    }
    await runPaidEval({
        apiKey: c.apiKey,
        outputPath: c.output,
        fxYenPerUsdMilli: c.fx,
        limit: c.limit,
        concurrency: c.concurrency
    });
    return 0;
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) main().then((c => process.exit(c))).catch((() => process.exit(1)));
