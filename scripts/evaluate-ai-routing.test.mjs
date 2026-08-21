import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { promises as fs } from "node:fs";
import { assessSuiteOutput, buildSuiteRequest, evaluateRoutingRecords, loadAiRoutingFixtures, main, runPaidEval } from "./evaluate-ai-routing.mjs";

const fetchMock = vi.hoisted(() => vi.fn());
const estimateAiCostMock = vi.hoisted(() => vi.fn());

vi.stubGlobal("fetch", fetchMock);

vi.mock("../src/lib/ai/pricing.ts", () => ({ estimateAiCost: estimateAiCostMock }));

beforeEach(() => {
  fetchMock.mockReset();
  estimateAiCostMock.mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
});

function makeRecord(overrides = {}) {
  return {
    id: "r1",
    suite: "company-research",
    model: "gpt-4.1",
    schemaSuccess: true,
    instructionAdherent: true,
    citationSourceValid: true,
    unsupportedClaim: false,
    fabricatedUrlCount: 0,
    fallback: false,
    apiFailure: false,
    timeout: false,
    latencyMs: 1000,
    totalCostMilliYen: 10,
    humanScores: { japaneseNaturalness: 4, specificity: 5, nonIntimidating: null },
    ...overrides
  };
}

describe("suite request builders and output assessors", () => {
  it("builds strict company-research requests from real fixture inputs", async () => {
    const fixtures = await loadAiRoutingFixtures();
    const fixture = fixtures["company-research"][0];
    const snapshot = structuredClone(fixture);
    const body = buildSuiteRequest(fixture, "gpt-5.4-mini");

    expect(fixture).toEqual(snapshot);
    expect(body.model).toBe("gpt-5.4-mini");
    expect(body.instructions).toContain("sourcePackets");
    expect(body.instructions).toContain("Webアクセスは禁止");
    expect(body.input).toContain("ミドリソフト株式会社");
    expect(body.input).toContain("src-001");
    expect(body.input).not.toContain("OPENAI_API_KEY");
    expect(body).not.toHaveProperty("temperature");
    expect(body).not.toHaveProperty("tools");
    expect(body.text.format).toEqual(expect.objectContaining({ type: "json_schema", name: expect.any(String), strict: true }));
    expect(body.text.format.schema).toEqual(expect.objectContaining({ type: "object", additionalProperties: false }));
    expect(body.text.format.schema.properties.summary.type).toBe("string");
    expect(body.text.format.schema.properties.claims.items.properties.sourceIds.items.type).toBe("string");
  });

  it("builds strict follow-up, feedback, and resume requests without leaking stub body literals", async () => {
    const fixtures = await loadAiRoutingFixtures();
    const followup = buildSuiteRequest(fixtures["interview-follow-up"][0], "gpt-5.6-luna");
    const feedback = buildSuiteRequest(fixtures["interview-feedback"][0], "gpt-5.4-mini");
    const resume = buildSuiteRequest(fixtures.resume[0], "gpt-5.4-mini");

    expect(followup.instructions).toContain("一行だけ");
    expect(followup.input).toContain("SoraWorks");
    expect(feedback.instructions).toContain("指定スコア");
    expect(JSON.parse(feedback.input).answers).toEqual(fixtures["interview-feedback"][0].input.existingAnswers);
    expect(resume.input).toContain("jobContext");
    expect(JSON.stringify(followup)).not.toContain('"system"');
    expect(JSON.stringify(feedback)).not.toContain('"system"');
    expect(JSON.stringify(resume)).not.toContain('"system"');
    for (const body of [followup, feedback, resume]) {
      expect(body.text.format.schema.additionalProperties).toBe(false);
      expect(body.text.format.schema.properties).toBeDefined();
    }
  });

  it("assesses company outputs with citation and instruction checks", () => {
    const fixture = {
      id: "company-001",
      suite: "company-research",
      input: { sourcePackets: [{ sourceId: "src-001", url: "https://midorisoft.example/" }] },
      expectations: {
        allowedSourceUrls: ["https://midorisoft.example/"],
        requiredSourceIds: ["src-001"],
        mustAcknowledgeInsufficientEvidence: false,
        mustDisambiguateByOfficialUrl: false,
        forbiddenClaims: ["売上の断定"]
      }
    };
    const output = JSON.stringify({ summary: "概要", claims: [{ text: "業務支援SaaSを提供", sourceIds: ["src-001"] }], sources: [{ sourceId: "src-001", url: "https://midorisoft.example/" }], insufficientEvidence: false, disambiguatedByOfficialUrl: false });
    const assessed = assessSuiteOutput(fixture, output);
    expect(assessed.output.summary).toBe("概要");
    expect(assessed.boundedOutput.length).toBeGreaterThan(0);
    expect(assessed.schemaSuccess).toBe(true);
    expect(assessed.instructionAdherent).toBe(true);
    expect(assessed.citationSourceValid).toBe(true);
    expect(assessed.unsupportedClaim).toBeNull();
    expect(assessed.fabricatedUrlCount).toBe(0);
  });

  it("rejects invented company URLs, duplicate citations, and forbidden claims", () => {
    const fixture = {
      id: "company-016",
      suite: "company-research",
      input: { sourcePackets: [{ sourceId: "src-019", url: "https://central-saas.example/" }, { sourceId: "src-020", url: "https://central-logistics.example/" }] },
      expectations: { allowedSourceUrls: ["https://central-saas.example/", "https://central-logistics.example/"], requiredSourceIds: ["src-019", "src-020"], mustAcknowledgeInsufficientEvidence: false, mustDisambiguateByOfficialUrl: true, forbiddenClaims: ["採用数の断定"] }
    };
    const assessed = assessSuiteOutput(fixture, JSON.stringify({ summary: "対象は公式URLで識別", claims: [{ text: "業務SaaS", sourceIds: ["src-019"] }, { text: "重複", sourceIds: ["src-019"] }], sources: [{ sourceId: "src-019", url: "https://central-saas.example/" }, { sourceId: "src-019", url: "https://evil.example/" }], insufficientEvidence: false, disambiguatedByOfficialUrl: false, note: "採用数の断定" }));
    expect(assessed.schemaSuccess).toBe(false);
    expect(assessed.citationSourceValid).toBeNull();
    expect(assessed.boundedOutput).toContain("evil.example");
  });

  it("returns safe defaults for malformed, empty, or missing output", () => {
    const fixture = { id: "followup-001", suite: "interview-follow-up", input: { category: { id: "new-grad" }, companyName: "SoraWorks", targetRole: "software engineer", existingAnswers: [] }, expectations: { oneQuestionOnly: true, maxCharacters: 70, mustDeepenLastAnswer: true, mustAvoidRepeatingPrompts: true, mustAvoidSensitiveFollowUp: false, forbiddenPhrases: ["詳しく教えてください"] } };
    const malformed = assessSuiteOutput(fixture, "not json");
    const empty = assessSuiteOutput(fixture, "");
    expect(malformed.output).toBeNull();
    expect(malformed.boundedOutput).toBe("not json");
    expect(malformed.schemaSuccess).toBe(false);
    expect(malformed.unsupportedClaim).toBeNull();
    expect(empty.output).toBeNull();
    expect(empty.boundedOutput).toBeNull();
    expect(empty.unsupportedClaim).toBe(false);
  });

  it("does not mutate fixtures while assessing", async () => {
    const fixtures = await loadAiRoutingFixtures();
    const fixture = fixtures["resume"][0];
    const snapshot = structuredClone(fixture);
    assessSuiteOutput(fixture, JSON.stringify({ motivation: "志望動機は未入力です。", selfPr: "自己PRは未入力です。" }));
    expect(fixture).toEqual(snapshot);
  });

  it("enforces strict suite schemas and quality rules across the assessor matrix", () => {
    const company = { id: "c", suite: "company-research", input: { sourcePackets: [{ sourceId: "s", url: "https://ok.example" }] }, expectations: { allowedSourceUrls: ["https://ok.example"], requiredSourceIds: ["s"], mustAcknowledgeInsufficientEvidence: false, mustDisambiguateByOfficialUrl: false, forbiddenClaims: [] } };
    const goodCompany = { summary: "概要", claims: [{ text: "根拠あり", sourceIds: ["s"] }], sources: [{ sourceId: "s", url: "https://ok.example" }], insufficientEvidence: false, disambiguatedByOfficialUrl: false };
    expect(assessSuiteOutput(company, JSON.stringify(goodCompany)).citationSourceValid).toBe(true);
    expect(assessSuiteOutput(company, JSON.stringify({ ...goodCompany, sources: [{ sourceId: "s", url: "https://evil.example" }] })).citationSourceValid).toBe(false);
    expect(assessSuiteOutput(company, JSON.stringify({ ...goodCompany, claims: [{ text: "x", sourceIds: [] }] })).schemaSuccess).toBe(false);
    expect(assessSuiteOutput(company, JSON.stringify({ ...goodCompany, sources: [goodCompany.sources[0], goodCompany.sources[0]] })).citationSourceValid).toBe(false);
    expect(assessSuiteOutput(company, "x".repeat(20_001)).boundedOutput).toHaveLength(20_000);
    const follow = { id: "f", suite: "interview-follow-up", input: { existingAnswers: [{ prompt: "以前の質問は？" }] }, expectations: { maxCharacters: 20, forbiddenPhrases: ["禁止"] } };
    expect(assessSuiteOutput(follow, '{"prompt":"次に何をしましたか？"}').instructionAdherent).toBe(true);
    expect(assessSuiteOutput(follow, '{"prompt":"その判断基準を教えてください。"}').instructionAdherent).toBe(true);
    for (const prompt of ["以前の質問は？", "一行？\n二行", "二つ？本当？", "これは説明です。", "一文です。二文です。", "禁止です？", "a".repeat(21) + "？"]) expect(assessSuiteOutput(follow, JSON.stringify({ prompt })).instructionAdherent).toBe(false);
    const feedback = { id: "i", suite: "interview-feedback", input: {}, expectations: { scoreMin: 1, scoreMax: 5, listMin: 1, listMax: 2, forbiddenPhrases: ["禁止"] } };
    const goodFeedback = { overallScore: 3, summary: "総評", strengths: ["強み"], improvements: ["改善"], nextFocus: "次", nextQuestions: ["質問"] };
    expect(assessSuiteOutput(feedback, JSON.stringify(goodFeedback)).unsupportedClaim).toBeNull();
    expect(assessSuiteOutput(feedback, JSON.stringify({ ...goodFeedback, overallScore: 6 })).instructionAdherent).toBe(false);
    expect(assessSuiteOutput(feedback, JSON.stringify({ ...goodFeedback, extra: true })).schemaSuccess).toBe(false);
    const resume = { id: "r", suite: "resume", input: {}, expectations: { requiredFields: ["motivation", "selfPr"], forbiddenClaims: ["捏造"] } };
    const goodResume = { motivation: "動機", selfPr: "PR", changeSummary: ["変更"], evidenceSourceIds: [] };
    expect(assessSuiteOutput(resume, JSON.stringify(goodResume)).instructionAdherent).toBe(true);
    expect(assessSuiteOutput(resume, JSON.stringify({ ...goodResume, motivation: "" })).schemaSuccess).toBe(false);
    expect(assessSuiteOutput(resume, JSON.stringify({ ...goodResume, extra: true })).schemaSuccess).toBe(false);
  });
});


describe("AI routing runner", () => {
  it("skips safely with no paid flag and no report", async () => {
    const { main } = await import("./evaluate-ai-routing.mjs");
    const logs = [];
    const exits = [];
    const logSpy = vi.spyOn(console, "log").mockImplementation((...args) => logs.push(args.join(" ")));
    const errSpy = vi.spyOn(console, "error").mockImplementation((...args) => logs.push(args.join(" ")));
    const exitSpy = vi.spyOn(process, "exit").mockImplementation((code) => { exits.push(code); throw new Error("exit"); });
    await expect(main([])).resolves.toBe(0);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(logs.join(" ")).toContain("Skipping AI routing evaluator");
    expect(exits).toEqual([]);
    logSpy.mockRestore();
    errSpy.mockRestore();
    exitSpy.mockRestore();
  });

  it("makes separate strict candidate and Terra Responses calls and writes a private review artifact", async () => {
    vi.stubEnv("OPENAI_COMPANY_RESEARCH_MODEL", "candidate-company");
    vi.stubEnv("OPENAI_ESCALATION_MODEL", "terra-test");
    estimateAiCostMock.mockReturnValue({ priced: true, totalCostMilliYen: 7 });
    fetchMock.mockImplementation(async () => ({ ok: true, json: async () => ({ status: "completed", usage: { input_tokens: 3, output_tokens: 2 }, output: [{ type: "message", content: [{ type: "output_text", text: "not-json-but-reviewable" }] }] }) }));
    const path = ".tmp/ai-routing-runner-test.json";
    const artifact = await runPaidEval({ apiKey: "test-secret", outputPath: path, fxYenPerUsdMilli: 150000, limit: 1, concurrency: 1 });
    expect(fetchMock).toHaveBeenCalledTimes(9);
    const bodies = fetchMock.mock.calls.map(([, init]) => JSON.parse(init.body));
    expect(bodies.some((body) => body.model === "candidate-company")).toBe(true);
    expect(bodies.filter((body) => body.model === "terra-test")).toHaveLength(5);
    expect(bodies.every((body) => body.instructions !== "system" && body.input !== "input" && body.text.format.schema.additionalProperties === false && !Object.hasOwn(body, "tools") && !Object.hasOwn(body, "temperature"))).toBe(true);
    expect(fetchMock.mock.calls.every(([, init]) => init.headers.Authorization === "Bearer test-secret" && !init.body.includes("test-secret"))).toBe(true);
    expect(artifact.reviewItems.every((item) => Object.keys(item).sort().join(",") === "candidateOutput,id,suite,terraOutput" && (typeof item.candidateOutput === "string" || item.candidateOutput === null))).toBe(true);
    expect(artifact.fixtureCounts).toEqual({ "company-research": 1, "interview-follow-up": 1, "interview-feedback": 1, resume: 1 });
    const serialized = JSON.stringify(artifact);
    expect(serialized).not.toContain("test-secret");
    expect(serialized).not.toMatch(/authorization|headers|sourcePackets|rawEnvelope/i);
  });

  it("falls back only for company technical failures and sums attempts", async () => {
    estimateAiCostMock.mockReturnValue({ priced: true, totalCostMilliYen: 2 });
    fetchMock.mockImplementation(async (_url, init) => {
      const body = JSON.parse(init.body);
      if (body.model === "gpt-5.4-mini" && body.text.format.name.startsWith("company-research")) return { ok: false, json: async () => ({ secret: "do not expose" }) };
      return { ok: true, json: async () => ({ status: "completed", usage: {}, output: [] }) };
    });
    const artifact = await runPaidEval({ apiKey: "key", outputPath: ".tmp/ai-routing-fallback-test.json", fxYenPerUsdMilli: 150000, limit: 1, concurrency: 1, now: (() => { let n = 0; return () => (n += 5); })() });
    const company = artifact.candidateRecords.find((record) => record.suite === "company-research");
    expect(company.fallback).toBe(true);
    expect(company.model).toBe("gpt-5.4-mini");
    expect(company.apiFailure).toBe(false);
    expect(company.timeout).toBe(false);
    expect(company.totalCostMilliYen).toBe(4);
    expect(artifact.candidateRecords.find((record) => record.suite !== "company-research").fallback).toBe(false);
  });

  it("retries company HTTP, timeout, and schema failures but never an instruction-only failure", async () => {
    estimateAiCostMock.mockReturnValue({ priced: true, totalCostMilliYen: 1 });
    const companyText = (body, wrongBoolean = false) => {
      const input = JSON.parse(body.input), packet = input.sourcePackets[0];
      return JSON.stringify({ summary: "概要", claims: [{ text: "根拠", sourceIds: [packet.sourceId] }], sources: [{ sourceId: packet.sourceId, url: packet.url }], insufficientEvidence: wrongBoolean ? !Boolean(input.expectations.mustAcknowledgeInsufficientEvidence) : Boolean(input.expectations.mustAcknowledgeInsufficientEvidence), disambiguatedByOfficialUrl: Boolean(input.expectations.mustDisambiguateByOfficialUrl) });
    };
    for (const failure of ["http", "timeout", "schema"]) {
      fetchMock.mockReset();
      fetchMock.mockImplementation(async (_url, init) => {
        const body = JSON.parse(init.body);
        if (body.text.format.name.startsWith("company-research") && body.model === "gpt-5.4-mini") {
          if (failure === "http") return { ok: false, json: async () => ({ detail: "private" }) };
          if (failure === "timeout") throw Object.assign(new Error("private"), { name: "TimeoutError" });
          return { ok: true, json: async () => ({ status: "completed", usage: {}, output: [{ type: "message", content: [{ type: "output_text", text: "{\"unexpected\":true}" }] }] }) };
        }
        return { ok: true, json: async () => ({ status: "completed", usage: {}, output: body.text.format.name.startsWith("company-research") ? [{ type: "message", content: [{ type: "output_text", text: companyText(body) }] }] : [] }) };
      });
      const artifact = await runPaidEval({ apiKey: "secret", outputPath: `.tmp/ai-routing-${failure}-test.json`, fxYenPerUsdMilli: 150000, limit: 1, concurrency: 1 });
      expect(artifact.candidateRecords.find((record) => record.suite === "company-research").fallback).toBe(true);
    }
    fetchMock.mockImplementation(async (_url, init) => {
      const body = JSON.parse(init.body);
      return { ok: true, json: async () => ({ status: "completed", usage: {}, output: body.text.format.name.startsWith("company-research") ? [{ type: "message", content: [{ type: "output_text", text: companyText(body, body.model === "gpt-5.4-mini") }] }] : [] }) };
    });
    const artifact = await runPaidEval({ apiKey: "secret", outputPath: ".tmp/ai-routing-instruction-test.json", fxYenPerUsdMilli: 150000, limit: 1, concurrency: 1 });
    expect(artifact.candidateRecords.find((record) => record.suite === "company-research").fallback).toBe(false);
  });

  it("rejects bad paid configuration and path traversal before fetch", async () => {
    vi.stubEnv("RUN_PAID_AI_EVAL", "1");
    await expect(main([])).rejects.toThrow("Missing OPENAI_API_KEY");
    vi.stubEnv("OPENAI_API_KEY", "key");
    vi.stubEnv("FX_YEN_PER_USD_MILLI", "bad");
    await expect(main([])).rejects.toThrow("Invalid FX_YEN_PER_USD_MILLI");
    vi.stubEnv("FX_YEN_PER_USD_MILLI", "150000");
    vi.stubEnv("AI_EVAL_CONCURRENCY", "6");
    await expect(main([])).rejects.toThrow("Invalid AI_EVAL_CONCURRENCY");
    vi.stubEnv("AI_EVAL_CONCURRENCY", "2");
    vi.stubEnv("OPENAI_RESUME_MODEL", "   ");
    await expect(main([])).rejects.toThrow("Invalid AI routing model");
    vi.stubEnv("OPENAI_RESUME_MODEL", "gpt-5.4-mini");
    vi.stubEnv("AI_EVAL_OUTPUT_PATH", "../outside.json");
    await expect(main([])).rejects.toThrow("under .tmp");
    await expect(main(["--report", "../outside.json"])).rejects.toThrow("under .tmp");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("enforces the .tmp output boundary inside exported runPaidEval", async () => {
    await expect(runPaidEval({ apiKey: "test-secret", outputPath: ".tmp/../outside-ai-eval-test.json", fxYenPerUsdMilli: 150000, limit: 1, concurrency: 1 })).rejects.toThrow("under .tmp");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("recomputes an existing .tmp artifact without fetch and preserves review output", async () => {
    const candidate = makeRecord({ id: "candidate", unsupportedClaim: false });
    const terra = makeRecord({ id: "terra", unsupportedClaim: false, model: "gpt-5.6-terra", totalCostMilliYen: 20 });
    const artifact = { formatVersion: 1, generatedAt: "2026-01-01T00:00:00.000Z", fixtureCounts: { "company-research": 1 }, candidateRecords: [candidate], terraRecords: [terra], reviewItems: [{ id: "candidate", suite: "company-research", candidateOutput: "出力", terraOutput: "比較出力" }], candidateReport: {}, terraCostPerSuccessfulOutputMilliYen: null };
    const path = ".tmp/ai-routing-recompute-test.json";
    await fs.mkdir(".tmp", { recursive: true });
    await fs.writeFile(path, JSON.stringify(artifact));
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    await expect(main(["--report", path])).resolves.toBe(0);
    const saved = JSON.parse(await fs.readFile(path, "utf8"));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(saved.reviewItems).toEqual(artifact.reviewItems);
    expect(saved.terraCostPerSuccessfulOutputMilliYen).toBe(20);
    logSpy.mockRestore();
  });
});

describe("evaluateRoutingRecords", () => {
  it("computes exact rates, fallback, and successful-output cost using accepted successes", () => {
    const records = [
      makeRecord({ id: "a", fallback: true, latencyMs: 10, totalCostMilliYen: 5 }),
      makeRecord({ id: "b", citationSourceValid: null, latencyMs: 30, totalCostMilliYen: 7 }),
      makeRecord({ id: "c", schemaSuccess: false, latencyMs: 50, totalCostMilliYen: 9 }),
      makeRecord({ id: "d", instructionAdherent: false, latencyMs: 70, totalCostMilliYen: 11 }),
      makeRecord({ id: "e", citationSourceValid: false, latencyMs: 90, totalCostMilliYen: 13 }),
      makeRecord({ id: "f", unsupportedClaim: true, latencyMs: 110, totalCostMilliYen: 17 }),
      makeRecord({ id: "g", fabricatedUrlCount: 1, latencyMs: 130, totalCostMilliYen: 19 }),
      makeRecord({ id: "h", apiFailure: true, latencyMs: 150, totalCostMilliYen: 23 }),
      makeRecord({ id: "i", timeout: true, latencyMs: 170, totalCostMilliYen: 29 }),
      makeRecord({ id: "j", suite: "resume", latencyMs: 190, totalCostMilliYen: null, humanScores: { japaneseNaturalness: null, specificity: null, nonIntimidating: null } })
    ];

    const report = evaluateRoutingRecords(records, { terraBaselineCostPerSuccessfulOutputMilliYen: 20 });

    expect(report.totals.schemaSuccessRate).toBe(0.9);
    expect(report.totals.instructionAdherentRate).toBe(0.9);
    expect(report.totals.fallbackRate).toBe(0.1);
    expect(report.totals.apiFailureOrTimeoutRate).toBe(0.2);
    expect(report.totals.citationApplicabilityCount).toBe(9);
    expect(report.totals.citationValidityRate).toBe(8 / 9);
    expect(report.totals.unsupportedClaimRate).toBe(1 / 10);
    expect(report.totals.unsupportedAnnotationCoverage).toBe(1);
    expect(report.totals.unsupportedClaimCount).toBe(1);
    expect(report.totals.fabricatedUrlCount).toBe(1);
    expect(report.totals.costTotalKnownMilliYen).toBe(133);
    expect(report.totals.costUnpricedCount).toBe(1);
    expect(report.totals.candidateCostPerSuccessfulOutputMilliYen).toBeNull();
    expect(report.totals.candidateCostPerSuccessfulOutputBlocker).toBe("UNPRICED_ACCEPTED_SUCCESS");
    expect(report.pass).toBe(false);
    expect(report.blockers).toContain("SCHEMA_NOT_ALL_SUCCESS");
  });

  it("deduplicates apiFailure and timeout for the gate", () => {
    const report = evaluateRoutingRecords([
      makeRecord({ id: "a", apiFailure: true }),
      makeRecord({ id: "b", timeout: true })
    ], { terraBaselineCostPerSuccessfulOutputMilliYen: 50 });

    expect(report.totals.apiFailureOrTimeoutRate).toBe(1);
  });

  it("uses nearest-rank percentiles overall and per suite", () => {
    const records = [
      makeRecord({ id: "a", suite: "company-research", latencyMs: 100 }),
      makeRecord({ id: "b", suite: "company-research", latencyMs: 200 }),
      makeRecord({ id: "c", suite: "company-research", latencyMs: 300 }),
      makeRecord({ id: "d", suite: "interview-follow-up", latencyMs: 10 }),
      makeRecord({ id: "e", suite: "interview-follow-up", latencyMs: 20 }),
      makeRecord({ id: "f", suite: "interview-follow-up", latencyMs: 30 }),
      makeRecord({ id: "g", suite: "resume", latencyMs: 40 }),
      makeRecord({ id: "h", suite: "resume", latencyMs: 50 }),
      makeRecord({ id: "i", suite: "interview-feedback", latencyMs: 60 }),
      makeRecord({ id: "j", suite: "interview-feedback", latencyMs: 70 })
    ];
    const report = evaluateRoutingRecords(records, { terraBaselineCostPerSuccessfulOutputMilliYen: 999 });
    expect(report.totals.latencyP50Ms).toBe(50);
    expect(report.totals.latencyP95Ms).toBe(300);
    expect(report.perSuite["company-research"].latencyP95Ms).toBe(300);
    expect(report.perSuite["interview-follow-up"].latencyP95Ms).toBe(30);
  });

  it("treats citationSourceValid null as excluded from the denominator", () => {
    const report = evaluateRoutingRecords([
      makeRecord({ id: "a", citationSourceValid: null }),
      makeRecord({ id: "b", citationSourceValid: true }),
      makeRecord({ id: "c", citationSourceValid: false })
    ], { terraBaselineCostPerSuccessfulOutputMilliYen: 99 });

    expect(report.totals.citationApplicabilityCount).toBe(2);
    expect(report.totals.citationValidityRate).toBe(1 / 2);
    expect(report.gateChecks.citationValidity.pass).toBe(false);
  });

  it("fails closed when company citation annotations are missing", () => {
    const report = evaluateRoutingRecords([
      makeRecord({ id: "company", citationSourceValid: null }),
      makeRecord({ id: "resume", suite: "resume", citationSourceValid: null })
    ], { terraBaselineCostPerSuccessfulOutputMilliYen: 99 });

    expect(report.totals.citationAnnotationCoverage).toBe(0);
    expect(report.gateChecks.citationValidity.pass).toBe(false);
    expect(report.blockers).toContain("CITATION_INVALID_OR_MISSING_ANNOTATIONS");
  });

  it("fails closed when unsupported annotations are missing", () => {
    const report = evaluateRoutingRecords([
      makeRecord({ id: "a", unsupportedClaim: null })
    ], { terraBaselineCostPerSuccessfulOutputMilliYen: 99 });

    expect(report.gateChecks.unsupportedClaim.pass).toBe(false);
    expect(report.blockers).toContain("UNSUPPORTED_CLAIMS_OR_MISSING_ANNOTATIONS");
  });

  it("reports null cost per successful output when any accepted success is unpriced", () => {
    const report = evaluateRoutingRecords([
      makeRecord({ id: "a", totalCostMilliYen: 5 }),
      makeRecord({ id: "b", totalCostMilliYen: null })
    ], { terraBaselineCostPerSuccessfulOutputMilliYen: 10 });

    expect(report.totals.candidateCostPerSuccessfulOutputMilliYen).toBeNull();
    expect(report.totals.candidateCostPerSuccessfulOutputBlocker).toBe("UNPRICED_ACCEPTED_SUCCESS");
    expect(report.totals.acceptedSuccessCount).toBe(2);
    expect(report.totals.unpricedAcceptedSuccessCount).toBe(1);
    expect(report.gateChecks.costPerSuccessfulOutput.pass).toBe(false);
  });

  it("uses strict thresholds for instruction, api failure, fallback, and latency limits", () => {
    const records = [];
    for (let i = 0; i < 99; i += 1) records.push(makeRecord({ id: `ok-${i}`, suite: i % 2 === 0 ? "interview-follow-up" : "resume", instructionAdherent: true, fallback: false, apiFailure: false, timeout: false, latencyMs: 1, totalCostMilliYen: 1 }));
    records.push(makeRecord({ id: "bad", suite: "interview-follow-up", instructionAdherent: false, fallback: true, apiFailure: true, latencyMs: 8000, totalCostMilliYen: 1 }));
    const report = evaluateRoutingRecords(records, { terraBaselineCostPerSuccessfulOutputMilliYen: 2 });
    expect(report.totals.instructionAdherentRate).toBe(0.99);
    expect(report.totals.apiFailureOrTimeoutRate).toBe(0.01);
    expect(report.totals.fallbackRate).toBe(0.01);
    expect(report.gateChecks.instructionAdherent.pass).toBe(true);
    expect(report.gateChecks.apiFailureOrTimeout.pass).toBe(false);
    expect(report.gateChecks.fallback.pass).toBe(true);
    expect(report.gateChecks.p95InterviewFollowUp.pass).toBe(true);
  });

  it("computes human score means and coverage without treating null as zero", () => {
    const report = evaluateRoutingRecords([
      makeRecord({ id: "a", humanScores: { japaneseNaturalness: 5, specificity: null, nonIntimidating: 1 } }),
      makeRecord({ id: "b", humanScores: { japaneseNaturalness: null, specificity: 3, nonIntimidating: null } })
    ], { terraBaselineCostPerSuccessfulOutputMilliYen: 10 });

    expect(report.totals.humanScores.japaneseNaturalness.mean).toBe(5);
    expect(report.totals.humanScores.japaneseNaturalness.coverage).toBe(0.5);
    expect(report.totals.humanScores.specificity.mean).toBe(3);
    expect(report.totals.humanScores.specificity.coverage).toBe(0.5);
    expect(report.totals.humanScores.nonIntimidating.mean).toBe(1);
  });

  it("rejects malformed or unsafe input and does not mutate records", () => {
    const records = [makeRecord()];
    const snapshot = structuredClone(records);
    expect(() => evaluateRoutingRecords([], { terraBaselineCostPerSuccessfulOutputMilliYen: null })).toThrow("Invalid routing records input");
    expect(() => evaluateRoutingRecords([{ ...makeRecord(), latencyMs: NaN }], { terraBaselineCostPerSuccessfulOutputMilliYen: null })).toThrow("Invalid routing records input");
    expect(() => evaluateRoutingRecords([{ ...makeRecord(), fabricatedUrlCount: -1 }], { terraBaselineCostPerSuccessfulOutputMilliYen: null })).toThrow("Invalid routing records input");
    expect(() => evaluateRoutingRecords([makeRecord({ id: "duplicate" }), makeRecord({ id: "duplicate" })], { terraBaselineCostPerSuccessfulOutputMilliYen: null })).toThrow("Invalid routing records input");
    expect(() => evaluateRoutingRecords(records, { terraBaselineCostPerSuccessfulOutputMilliYen: Number.NaN })).toThrow("Invalid routing records input");
    expect(records).toEqual(snapshot);
  });

  it("accepts fractional human scores and fractional Terra cost-per-success baselines", () => {
    const report = evaluateRoutingRecords([
      makeRecord({ humanScores: { japaneseNaturalness: 4.5, specificity: 3.25, nonIntimidating: 5 } })
    ], { terraBaselineCostPerSuccessfulOutputMilliYen: 10.5 });

    expect(report.totals.humanScores.japaneseNaturalness.mean).toBe(4.5);
    expect(report.gateChecks.costPerSuccessfulOutput.actual.baseline).toBe(10.5);
  });

  it("does not invoke record toJSON hooks", () => {
    const record = makeRecord();
    Object.defineProperty(record, "toJSON", {
      enumerable: false,
      value: () => {
        throw new Error("must not run");
      }
    });

    expect(() => evaluateRoutingRecords([record], { terraBaselineCostPerSuccessfulOutputMilliYen: 20 })).not.toThrow();
  });

  it("returns a fully passing report for a large synthetic fixture set", () => {
    const records = [];
    for (let i = 0; i < 100; i += 1) {
      const suite = i < 25 ? "company-research" : i < 50 ? "interview-follow-up" : i < 75 ? "interview-feedback" : "resume";
      records.push(makeRecord({
        id: `ok-${i}`,
        suite,
        instructionAdherent: true,
        schemaSuccess: true,
        citationSourceValid: true,
        unsupportedClaim: false,
        fabricatedUrlCount: 0,
        fallback: false,
        apiFailure: false,
        timeout: false,
        latencyMs: i < 25 ? 1000 : i < 50 ? 2000 : i < 75 ? 3000 : 4000,
        totalCostMilliYen: 10,
        humanScores: { japaneseNaturalness: 4, specificity: 4, nonIntimidating: 4 }
      }));
    }
    const report = evaluateRoutingRecords(records, { terraBaselineCostPerSuccessfulOutputMilliYen: 20 });
    expect(report.pass).toBe(true);
    expect(report.blockers).toEqual([]);
    expect(report.gateChecks.costPerSuccessfulOutput.pass).toBe(true);
    for (const check of Object.values(report.gateChecks)) {
      expect(check).toHaveProperty("actual");
      expect(check).toHaveProperty("expected");
    }
  });
});
