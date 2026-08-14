import { type AiInterviewQuestion } from "@/lib/ai-interview/mock-data";
import {
  type AiInterviewCategoryDefinition,
  type AiInterviewScenarioType,
  getAiInterviewScenarioCategories
} from "@/lib/ai-interview/setup-scenarios";

export type AiInterviewQuestionSource = "fixed" | "ai_generated";

export type AiInterviewScenarioQuestion = AiInterviewQuestion & {
  categoryId: string;
  categoryLabel: string;
  categoryQuestionIndex: number;
  questionNumber: number;
  source: AiInterviewQuestionSource;
};

type FeedbackTemplate = {
  score: number;
  strengths: string[];
  improvements: string[];
  followUps: string[];
};

export type BuildAiInterviewScenarioQuestionsOptions = {
  generatedPromptsByQuestionId?: Record<string, string | undefined>;
};

function buildFeedbackTemplate(category: AiInterviewCategoryDefinition): FeedbackTemplate {
  return {
    score: category.id === "selfIntro" || category.id === "selfPromotion" ? 4.3 : category.id === "motivation" ? 4.1 : 4.0,
    strengths: [
      `${category.label}の要点が先に伝わる構成になっている`,
      `具体例を交えながら話せると、${category.label}の説得力がさらに増します`
    ],
    improvements: [
      `${category.label}に対して、数字や行動をもう一段具体化すると印象が強まります`,
      `回答の最後に、応募先でどう活かすかまでつなげると評価が安定します`
    ],
    followUps: [
      `${category.label}で最も工夫した点は何ですか？`,
      `${category.label}に関して、想定外だった出来事への対応を教えてください。`,
      `${category.label}を通じて得た学びを次の挑戦にどう活かしますか？`
    ]
  };
}

function buildDefaultAiFollowUpPrompt(category: AiInterviewCategoryDefinition) {
  return `${category.label}について、先ほどの回答をもう少し詳しく教えてください。`;
}

function buildQuestion(
  category: AiInterviewCategoryDefinition,
  scenarioType: AiInterviewScenarioType,
  categoryQuestionIndex: number,
  questionNumber: number,
  prompt: string,
  source: AiInterviewQuestionSource
): AiInterviewScenarioQuestion {
  const feedback = buildFeedbackTemplate(category);

  return {
    id: `${scenarioType}-${category.id}-${categoryQuestionIndex + 1}`,
    categoryId: category.id,
    categoryLabel: category.label,
    categoryQuestionIndex,
    questionNumber,
    source,
    prompt,
    answerDraft: "",
    score: feedback.score,
    strengths: feedback.strengths,
    improvements: feedback.improvements,
    followUps: feedback.followUps
  };
}

export function buildAiInterviewScenarioQuestions(
  scenarioType: AiInterviewScenarioType,
  options: BuildAiInterviewScenarioQuestionsOptions = {}
): AiInterviewScenarioQuestion[] {
  const generatedPromptsByQuestionId = options.generatedPromptsByQuestionId ?? {};
  let questionNumber = 0;

  return getAiInterviewScenarioCategories(scenarioType).flatMap((category) => {
    const questions: AiInterviewScenarioQuestion[] = [];
    let categoryQuestionIndex = 0;

    for (const fixedPrompt of category.fixedQuestions) {
      questionNumber += 1;
      questions.push(buildQuestion(category, scenarioType, categoryQuestionIndex, questionNumber, fixedPrompt, "fixed"));
      categoryQuestionIndex += 1;

      if (categoryQuestionIndex < category.questionCount) {
        const aiQuestionId = `${scenarioType}-${category.id}-${categoryQuestionIndex + 1}`;
        questionNumber += 1;
        questions.push(
          buildQuestion(
            category,
            scenarioType,
            categoryQuestionIndex,
            questionNumber,
            generatedPromptsByQuestionId[aiQuestionId] ?? buildDefaultAiFollowUpPrompt(category),
            "ai_generated"
          )
        );
        categoryQuestionIndex += 1;
      }
    }

    return questions.slice(0, category.questionCount);
  });
}

export function findAiInterviewQuestionById(
  questionId: string,
  options: BuildAiInterviewScenarioQuestionsOptions = {}
) {
  for (const scenarioType of ["new-grad", "graduated", "second-new-grad", "career"] as const satisfies ReadonlyArray<AiInterviewScenarioType>) {
    const question = buildAiInterviewScenarioQuestions(scenarioType, options).find((item) => item.id === questionId);
    if (question) {
      return question;
    }
  }

  return null;
}
