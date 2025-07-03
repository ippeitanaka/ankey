"use server"

import { generateText } from "ai"
import { deepseek } from "@ai-sdk/deepseek"
import { GoogleGenerativeAI } from "@google/generative-ai"

export interface Flashcard {
  id: string
  front: string
  back: string
}

// テキストの複雑さと情報密度を分析する関数
function analyzeTextComplexity(text: string): {
  estimatedCards: number
  textType: "simple" | "medium" | "complex" | "academic"
  hasDefinitions: boolean
  hasLists: boolean
  hasNumbers: boolean
  hasProperNouns: boolean
} {
  const textLength = text.length
  const sentences = text.split(/[.!?。！？]/).filter((s) => s.trim().length > 10)
  const words = text.split(/\s+/).filter((w) => w.length > 2)

  // 定義文の検出
  const definitionPatterns = [/とは/g, /である/g, /です/g, /means/g, /is defined as/g, /refers to/g]
  const hasDefinitions = definitionPatterns.some((pattern) => pattern.test(text))

  // リスト構造の検出
  const listPatterns = [/^\s*[1-9]\d*[.．)）]/gm, /^\s*[・•]/gm, /^\s*[-−]/gm, /^\s*[①-⑳]/gm]
  const hasLists = listPatterns.some((pattern) => pattern.test(text))

  // 数値データの検出
  const numberPatterns = [/\d+[年月日時分秒]/g, /\d+[%％]/g, /\d+[円ドル]/g, /\d+[kmcmmg]/g]
  const hasNumbers = numberPatterns.some((pattern) => pattern.test(text))

  // 固有名詞の検出
  const properNounPatterns = [
    /[A-Z][a-z]+/g, // 英語の固有名詞
    /[ァ-ヶー]{3,}/g, // カタカナ語（3文字以上）
    /[一-龯]{2,}[会社法人大学]/g, // 組織名
  ]
  const hasProperNouns = properNounPatterns.some((pattern) => pattern.test(text))

  // 情報密度の計算
  let densityScore = 0
  if (hasDefinitions) densityScore += 2
  if (hasLists) densityScore += 3
  if (hasNumbers) densityScore += 2
  if (hasProperNouns) densityScore += 1

  // 文の複雑さ
  const avgSentenceLength = sentences.length > 0 ? textLength / sentences.length : 0
  if (avgSentenceLength > 100) densityScore += 2
  else if (avgSentenceLength > 50) densityScore += 1

  // テキストタイプの判定
  let textType: "simple" | "medium" | "complex" | "academic" = "simple"
  if (densityScore >= 8) textType = "academic"
  else if (densityScore >= 5) textType = "complex"
  else if (densityScore >= 3) textType = "medium"

  // 推定カード数の計算（大幅に増加）
  let baseCards = Math.floor(textLength / 50) // 50文字につき1枚（従来の100文字から半分に）

  // テキストタイプによる調整
  switch (textType) {
    case "academic":
      baseCards = Math.floor(textLength / 30) // 30文字につき1枚
      break
    case "complex":
      baseCards = Math.floor(textLength / 40) // 40文字につき1枚
      break
    case "medium":
      baseCards = Math.floor(textLength / 60) // 60文字につき1枚
      break
    default:
      baseCards = Math.floor(textLength / 80) // 80文字につき1枚
  }

  // 特徴による追加ボーナス
  if (hasDefinitions) baseCards += Math.floor(sentences.length * 0.3)
  if (hasLists) baseCards += Math.floor(sentences.length * 0.4)
  if (hasNumbers) baseCards += Math.floor(sentences.length * 0.2)
  if (hasProperNouns) baseCards += Math.floor(sentences.length * 0.2)

  // 最小・最大値の設定
  const estimatedCards = Math.max(10, Math.min(500, baseCards)) // 最大500枚まで

  return {
    estimatedCards,
    textType,
    hasDefinitions,
    hasLists,
    hasNumbers,
    hasProperNouns,
  }
}

// DeepSeek APIを使用してフラッシュカードを生成（強化版）
async function generateFlashcardsWithDeepSeek(text: string): Promise<Flashcard[]> {
  const analysis = analyzeTextComplexity(text)

  console.log("テキスト分析結果:", analysis)

  const prompt = `
あなたは教育専門家で、効果的な暗記用フラッシュカードを作成するエキスパートです。
以下のテキストを徹底的に分析し、学習者が覚えるべきすべての重要な概念、用語、事実に基づいたフラッシュカードを作成してください。

テキスト分析結果:
- 推定カード数: ${analysis.estimatedCards}枚
- テキストタイプ: ${analysis.textType}
- 定義文あり: ${analysis.hasDefinitions}
- リスト構造あり: ${analysis.hasLists}
- 数値データあり: ${analysis.hasNumbers}
- 固有名詞あり: ${analysis.hasProperNouns}

フラッシュカード作成の詳細ルール:

1. **網羅性**: テキスト内のすべての重要な情報を漏らさずカード化する
2. **多角的アプローチ**: 同じ概念でも異なる角度から複数のカードを作成
3. **階層的学習**: 基本概念から応用まで段階的にカードを作成
4. **関連性**: 概念間の関係性も学習できるようなカードを含める

作成すべきカードの種類:
- 定義カード: 「○○とは何か？」
- 特徴カード: 「○○の特徴は？」
- 分類カード: 「○○の種類は？」
- 数値カード: 「○○の数値は？」
- 人物カード: 「○○は誰か？」
- 年代カード: 「○○はいつ？」
- 場所カード: 「○○はどこ？」
- 原因カード: 「○○の原因は？」
- 結果カード: 「○○の結果は？」
- 比較カード: 「○○と△△の違いは？」
- 応用カード: 「○○の応用例は？」
- 関連カード: 「○○に関連するものは？」

品質基準:
- 表面（front）: 明確で具体的な問い
- 裏面（back）: 正確で完全な回答
- 長さ: 表面は150文字以内、裏面は300文字以内
- 重複: 同じ内容のカードは作らない
- 関連性: 表と裏が明確に対応している

テキスト:
${text}

上記のテキストから、可能な限り多くの高品質なフラッシュカードを作成してください。
目標: ${analysis.estimatedCards}枚以上（内容が豊富な場合はそれ以上でも構いません）

重要: テキスト内のすべての重要な概念、用語、事実、数値、人物、年代、場所などを網羅してください。
同じ概念でも異なる角度から複数のカードを作成し、学習効果を最大化してください。

回答は以下のJSON形式で返してください。説明や前置きは不要です。
[
  {
    "front": "問いやキーワード",
    "back": "その問いに対する直接的な回答や説明"
  },
  ...
]
`

  // 環境変数からAPIキーを取得
  const apiKey = process.env.DEEPSEEK_API_KEY || process.env.DEEPSEEK_KEY || process.env.DEEPSEEK_TOKEN

  if (!apiKey) {
    throw new Error(
      "DeepSeek APIキーが設定されていません。環境変数 DEEPSEEK_API_KEY、DEEPSEEK_KEY、またはDEEPSEEK_TOKENを確認してください。",
    )
  }

  try {
    // より多くのトークンを使用して大量のカードを生成
    const { text: responseText } = await generateText({
      model: deepseek("deepseek-prover-v2", { apiKey }),
      prompt,
      temperature: 0.1, // より決定論的に
      maxTokens: 8000, // 大幅に増加（従来の4000から倍増）
    })

    console.log("DeepSeek APIからの応答長:", responseText.length)
    return await parseFlashcardsFromResponse(responseText, text, analysis.estimatedCards)
  } catch (error) {
    console.error("DeepSeek API呼び出しエラー:", error)

    // 別のモデル名で再試行
    try {
      console.log("別のDeepSeekモデル名で再試行します...")
      const { text: responseText } = await generateText({
        model: deepseek("deepseek-chat", { apiKey }),
        prompt,
        temperature: 0.1,
        maxTokens: 8000,
      })

      return await parseFlashcardsFromResponse(responseText, text, analysis.estimatedCards)
    } catch (retryError) {
      console.error("DeepSeek API再試行エラー:", retryError)
      throw new Error(`DeepSeek API呼び出しに失敗しました: ${error.message}`)
    }
  }
}

// Google Gemini APIを使用してフラッシュカードを生成（強化版）
async function generateFlashcardsWithGemini(text: string): Promise<Flashcard[]> {
  const apiKey = process.env.GEMINI_API_KEY

  if (!apiKey) {
    throw new Error("Gemini APIキーが設定されていません。環境変数 GEMINI_API_KEY を確認してください。")
  }

  const analysis = analyzeTextComplexity(text)

  try {
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" })

    const prompt = `
テキストから学習用フラッシュカードを徹底的に作成してください。

テキスト分析:
- 推定カード数: ${analysis.estimatedCards}枚
- テキストタイプ: ${analysis.textType}

作成指針:
1. テキスト内のすべての重要な情報を網羅
2. 定義、特徴、分類、数値、人物、年代、場所、原因、結果、比較、応用など多角的にカード化
3. 同じ概念でも異なる角度から複数のカードを作成
4. 基本から応用まで段階的な学習が可能なカード構成

テキスト:
${text}

目標: ${analysis.estimatedCards}枚以上の高品質なフラッシュカードを作成してください。
内容が豊富な場合は、それ以上の枚数でも構いません。

以下の形式でJSON配列を返してください:
[
  {
    "front": "問いやキーワード",
    "back": "その回答や説明"
  },
  ...
]
`

    // 生成パラメータを強化
    const generationConfig = {
      temperature: 0.1,
      topP: 0.8,
      topK: 40,
      maxOutputTokens: 8192, // 大幅に増加
    }

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig,
    })

    const responseText = result.response.text()
    console.log("Gemini APIからの応答長:", responseText.length)
    return await parseFlashcardsFromResponse(responseText, text, analysis.estimatedCards)
  } catch (error) {
    console.error("Gemini API呼び出しエラー:", error)

    // 複数回に分けて生成する戦略
    try {
      console.log("分割生成戦略で再試行します...")
      return await generateFlashcardsInBatches(text, analysis, apiKey)
    } catch (batchError) {
      console.error("分割生成エラー:", batchError)
      throw new Error(`Gemini API呼び出しに失敗しました: ${error?.message}`)
    }
  }
}

// テキストを分割して複数回に分けてフラッシュカードを生成する関数
async function generateFlashcardsInBatches(
  text: string,
  analysis: ReturnType<typeof analyzeTextComplexity>,
  apiKey: string,
): Promise<Flashcard[]> {
  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })

  // テキストを段落や文で分割
  const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim().length > 100)
  const sentences = text.split(/[.!?。！？]/).filter((s) => s.trim().length > 20)

  let allCards: Flashcard[] = []

  // 段落ごとに処理
  if (paragraphs.length > 1) {
    for (let i = 0; i < paragraphs.length; i++) {
      const paragraph = paragraphs[i]
      const targetCards = Math.ceil(analysis.estimatedCards / paragraphs.length)

      try {
        const prompt = `
以下の段落から${targetCards}枚程度のフラッシュカードを作成してください。
重要な概念、用語、事実をすべて網羅してください。

段落 ${i + 1}/${paragraphs.length}:
${paragraph}

JSON配列形式で返してください:
[{"front": "問い", "back": "答え"}, ...]
`

        const result = await model.generateContent({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 4096,
          },
        })

        const responseText = result.response.text()
        const batchCards = await parseFlashcardsFromResponse(responseText, paragraph, targetCards)
        allCards = allCards.concat(batchCards)

        console.log(`段落 ${i + 1} から ${batchCards.length} 枚のカードを生成`)

        // API制限を避けるため少し待機
        await new Promise((resolve) => setTimeout(resolve, 1000))
      } catch (error) {
        console.error(`段落 ${i + 1} の処理でエラー:`, error)
        // エラーが発生しても他の段落の処理を続行
      }
    }
  } else {
    // 段落分割ができない場合は文単位で処理
    const chunkSize = Math.ceil(sentences.length / 3) // 3つのチャンクに分割

    for (let i = 0; i < 3; i++) {
      const start = i * chunkSize
      const end = Math.min((i + 1) * chunkSize, sentences.length)
      const chunk = sentences.slice(start, end).join("。") + "。"

      if (chunk.trim().length < 50) continue

      const targetCards = Math.ceil(analysis.estimatedCards / 3)

      try {
        const prompt = `
以下のテキストから${targetCards}枚程度のフラッシュカードを作成してください。

テキスト部分 ${i + 1}/3:
${chunk}

JSON配列形式で返してください:
[{"front": "問い", "back": "答え"}, ...]
`

        const result = await model.generateContent({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 4096,
          },
        })

        const responseText = result.response.text()
        const batchCards = await parseFlashcardsFromResponse(responseText, chunk, targetCards)
        allCards = allCards.concat(batchCards)

        console.log(`チャンク ${i + 1} から ${batchCards.length} 枚のカードを生成`)

        await new Promise((resolve) => setTimeout(resolve, 1000))
      } catch (error) {
        console.error(`チャンク ${i + 1} の処理でエラー:`, error)
      }
    }
  }

  // 重複を除去
  const uniqueCards = removeDuplicateCards(allCards)
  console.log(`分割生成完了: ${allCards.length} 枚 → 重複除去後 ${uniqueCards.length} 枚`)

  return uniqueCards
}

// 重複カードを除去する関数
function removeDuplicateCards(cards: Flashcard[]): Flashcard[] {
  const seen = new Set<string>()
  const uniqueCards: Flashcard[] = []

  for (const card of cards) {
    // 表面と裏面の組み合わせで重複チェック
    const key = `${card.front.toLowerCase().trim()}|${card.back.toLowerCase().trim()}`

    if (!seen.has(key)) {
      seen.add(key)
      uniqueCards.push(card)
    }
  }

  return uniqueCards
}

// モックデータを使用してフラッシュカードを生成（強化版）
async function generateMockFlashcards(text: string): Promise<Flashcard[]> {
  console.log("強化版モックデータを使用してフラッシュカードを生成します")

  const analysis = analyzeTextComplexity(text)
  const targetCards = analysis.estimatedCards

  // テキストを詳細に分析
  const sentences = text
    .replace(/([.!?。！？])\s*(?=[A-Z一-龯])/g, "$1|")
    .split("|")
    .filter((sentence) => sentence.length > 10 && sentence.length < 500)
    .map((sentence) => sentence.trim())

  const mockCards: Flashcard[] = []

  // 1. 重要な用語を抽出してカード化
  const keyTerms = extractAdvancedKeyTerms(text)
  for (const term of keyTerms.slice(0, Math.min(targetCards * 0.3, 100))) {
    const relatedSentences = sentences.filter((s) => s.includes(term.term))
    if (relatedSentences.length > 0) {
      mockCards.push({
        id: crypto.randomUUID(),
        front: `「${term.term}」とは何ですか？`,
        back: relatedSentences[0].replace(term.term, `**${term.term}**`),
      })

      // 同じ用語で別の角度からのカードも作成
      if (relatedSentences.length > 1) {
        mockCards.push({
          id: crypto.randomUUID(),
          front: `「${term.term}」の特徴は？`,
          back: relatedSentences[1],
        })
      }
    }
  }

  // 2. 定義文からカード作成
  const definitionSentences = sentences.filter((s) => /^[「『]?[\w\s]+[』」]?とは|^[\w\s]+は|である$|です$/.test(s))
  for (const sentence of definitionSentences.slice(0, Math.min(targetCards * 0.2, 50))) {
    const match = sentence.match(/^[「『]?([\w\s]+)[』」]?とは|^([\w\s]+)は/)
    if (match) {
      const term = (match[1] || match[2]).trim()
      if (term.length > 1 && term.length < 30) {
        mockCards.push({
          id: crypto.randomUUID(),
          front: `「${term}」の定義は？`,
          back: sentence,
        })
      }
    }
  }

  // 3. 数値・日付からカード作成
  const numericSentences = sentences.filter((s) => /\d+[年月日時分秒%％円ドルkmcmmg]/.test(s))
  for (const sentence of numericSentences.slice(0, Math.min(targetCards * 0.15, 30))) {
    const matches = sentence.match(/(\d+[年月日時分秒%％円ドルkmcmmg]+)/g)
    if (matches) {
      for (const match of matches.slice(0, 2)) {
        mockCards.push({
          id: crypto.randomUUID(),
          front: `${match}に関連する内容は？`,
          back: sentence.replace(match, `**${match}**`),
        })
      }
    }
  }

  // 4. リスト項目からカード作成
  const listItems = text.match(/^\s*[1-9]\d*[.．)）]\s*(.+)$/gm) || []
  for (const item of listItems.slice(0, Math.min(targetCards * 0.1, 20))) {
    const content = item.replace(/^\s*[1-9]\d*[.．)）]\s*/, "").trim()
    if (content.length > 10) {
      mockCards.push({
        id: crypto.randomUUID(),
        front: `リスト項目「${content.substring(0, 20)}...」の内容は？`,
        back: content,
      })
    }
  }

  // 5. 因果関係からカード作成
  const causalSentences = sentences.filter((s) => /ため|原因|結果|影響|効果|によって|により|から/.test(s))
  for (const sentence of causalSentences.slice(0, Math.min(targetCards * 0.1, 20))) {
    if (sentence.includes("ため")) {
      const parts = sentence.split("ため")
      if (parts.length === 2) {
        mockCards.push({
          id: crypto.randomUUID(),
          front: `${parts[1].trim()}の原因は？`,
          back: parts[0].trim(),
        })
      }
    }
  }

  // 6. 比較・対比からカード作成
  const comparisonSentences = sentences.filter((s) => /違い|異なる|比較|対して|一方|他方|しかし|ただし/.test(s))
  for (const sentence of comparisonSentences.slice(0, Math.min(targetCards * 0.1, 20))) {
    mockCards.push({
      id: crypto.randomUUID(),
      front: `比較・対比の内容は？`,
      back: sentence,
    })
  }

  // 7. 残りの文から一般的なカードを作成
  const remainingCards = Math.max(0, targetCards - mockCards.length)
  const usedSentences = new Set(mockCards.map((card) => card.back))

  for (let i = 0; i < Math.min(remainingCards, sentences.length); i++) {
    const sentence = sentences[i]
    if (usedSentences.has(sentence) || sentence.length < 20) continue

    // 文から主要な概念を抽出
    const words = sentence.split(/\s+/).filter((w) => w.length > 2)
    if (words.length > 3) {
      const keyWord = words.find((w) => /[一-龯]{2,}|[A-Z][a-z]+|[ァ-ヶー]{3,}/.test(w))

      if (keyWord) {
        mockCards.push({
          id: crypto.randomUUID(),
          front: `「${keyWord}」について説明してください`,
          back: sentence,
        })
      } else {
        mockCards.push({
          id: crypto.randomUUID(),
          front: `この内容について説明してください：「${sentence.substring(0, 30)}...」`,
          back: sentence,
        })
      }
    }
  }

  console.log(`強化版モックデータ生成完了: ${mockCards.length} 枚`)
  return mockCards.slice(0, targetCards)
}

// 高度なキーワード抽出関数
function extractAdvancedKeyTerms(text: string): Array<{ term: string; importance: number }> {
  const terms: Array<{ term: string; importance: number }> = []

  // 1. 専門用語（カタカナ3文字以上）
  const katakanaTerms = text.match(/[ァ-ヶー]{3,}/g) || []
  katakanaTerms.forEach((term) => {
    terms.push({ term, importance: 3 })
  })

  // 2. 英語の専門用語
  const englishTerms = text.match(/[A-Z][a-z]{2,}/g) || []
  englishTerms.forEach((term) => {
    terms.push({ term, importance: 2 })
  })

  // 3. 漢字の専門用語（2-6文字）
  const kanjiTerms = text.match(/[一-龯]{2,6}/g) || []
  kanjiTerms.forEach((term) => {
    if (!/^[年月日時分秒]$/.test(term)) {
      // 時間単位は除外
      terms.push({ term, importance: 1 })
    }
  })

  // 4. 数値付きの用語
  const numericTerms = text.match(/\d+[年月日時分秒%％円ドルkmcmmg]+/g) || []
  numericTerms.forEach((term) => {
    terms.push({ term, importance: 4 })
  })

  // 重要度でソートし、重複を除去
  const uniqueTerms = Array.from(new Map(terms.map((t) => [t.term, t])).values())
  return uniqueTerms
    .sort((a, b) => b.importance - a.importance)
    .filter((t) => t.term.length >= 2 && t.term.length <= 20)
}

// レスポンステキストからフラッシュカードを解析する共通関数（強化版）
async function parseFlashcardsFromResponse(
  responseText: string,
  originalText: string,
  targetCards: number,
): Promise<Flashcard[]> {
  let parsedCards: Array<{ front: string; back: string }> = []

  try {
    // 複数のJSONブロックを探す
    const jsonMatches = responseText.match(/\[\s*\{[\s\S]*?\}\s*\]/gm) || []

    if (jsonMatches.length > 0) {
      // 最大のJSONブロックを使用
      const largestJson = jsonMatches.reduce((a, b) => (a.length > b.length ? a : b))
      parsedCards = JSON.parse(largestJson)
    } else {
      // JSONブロックが見つからない場合、全体を解析
      try {
        parsedCards = JSON.parse(responseText)
      } catch (parseError) {
        console.error("JSON解析失敗、手動抽出を試行")
        parsedCards = extractCardsFromText(responseText)
      }
    }
  } catch (error) {
    console.error("JSON解析エラー:", error)
    parsedCards = extractCardsFromText(responseText)
  }

  if (!Array.isArray(parsedCards)) {
    console.error("解析結果が配列ではありません")
    return generateMockFlashcards(originalText)
  }

  // カードの品質チェックと改善
  let validCards = parsedCards
    .filter(
      (card) =>
        card &&
        typeof card === "object" &&
        "front" in card &&
        "back" in card &&
        typeof card.front === "string" &&
        typeof card.back === "string" &&
        card.front.trim().length > 0 &&
        card.back.trim().length > 0 &&
        card.front.trim() !== card.back.trim(),
    )
    .map((card) => ({
      front: card.front.trim().length > 150 ? card.front.trim().substring(0, 147) + "..." : card.front.trim(),
      back: card.back.trim().length > 300 ? card.back.trim().substring(0, 297) + "..." : card.back.trim(),
    }))

  // 重複除去
  validCards = removeDuplicateCards(
    validCards.map((card) => ({
      ...card,
      id: crypto.randomUUID(),
    })),
  )

  console.log(`解析完了: ${validCards.length} 枚のカードを生成（目標: ${targetCards} 枚）`)

  // 目標枚数に達していない場合、モックデータで補完
  if (validCards.length < targetCards * 0.5) {
    console.log("生成枚数が不足しているため、モックデータで補完します")
    const mockCards = await generateMockFlashcards(originalText)
    validCards = validCards.concat(mockCards.slice(0, targetCards - validCards.length))
  }

  return validCards
}

// テキストからフラッシュカードを抽出するヘルパー関数（強化版）
function extractCardsFromText(text: string): Array<{ front: string; back: string }> {
  const cards: Array<{ front: string; back: string }> = []
  const lines = text.split("\n")

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()

    // パターン1: "front"/"back"形式
    const frontMatch = line.match(/"front"\s*:\s*"([^"]+)"/i)
    if (frontMatch && i + 1 < lines.length) {
      const nextLine = lines[i + 1].trim()
      const backMatch = nextLine.match(/"back"\s*:\s*"([^"]+)"/i)
      if (backMatch) {
        cards.push({
          front: frontMatch[1],
          back: backMatch[1],
        })
        i++
      }
    }

    // パターン2: Q: A: 形式
    const qaMatch = line.match(/^Q:\s*(.+)/)
    if (qaMatch && i + 1 < lines.length) {
      const nextLine = lines[i + 1].trim()
      const answerMatch = nextLine.match(/^A:\s*(.+)/)
      if (answerMatch) {
        cards.push({
          front: qaMatch[1],
          back: answerMatch[1],
        })
        i++
      }
    }

    // パターン3: 問: 答: 形式
    const questionMatch = line.match(/^問:\s*(.+)/)
    if (questionMatch && i + 1 < lines.length) {
      const nextLine = lines[i + 1].trim()
      const answerMatch = nextLine.match(/^答:\s*(.+)/)
      if (answerMatch) {
        cards.push({
          front: questionMatch[1],
          back: answerMatch[1],
        })
        i++
      }
    }
  }

  return cards
}

// メインのフラッシュカード生成関数（強化版）
export async function generateFlashcards(text: string): Promise<Flashcard[]> {
  try {
    console.log("強化版フラッシュカード生成を開始します...")

    // まずDeepSeek APIを試す
    try {
      console.log("DeepSeek APIを使用してフラッシュカードを生成します...")
      return await generateFlashcardsWithDeepSeek(text)
    } catch (deepseekError) {
      console.error("DeepSeek APIでのフラッシュカード生成に失敗しました:", deepseekError)

      // DeepSeekが失敗した場合、Gemini APIを試す
      try {
        console.log("Gemini APIを使用してフラッシュカードを生成します...")
        return await generateFlashcardsWithGemini(text)
      } catch (geminiError) {
        console.error("Gemini APIでのフラッシュカード生成にも失敗しました:", geminiError)

        // 両方のAPIが失敗した場合、強化版モックデータを使用
        console.log("両方のAPIが失敗したため、強化版モックデータを使用します...")
        return await generateMockFlashcards(text)
      }
    }
  } catch (error) {
    console.error("フラッシュカード生成エラー:", error)
    throw error
  }
}
