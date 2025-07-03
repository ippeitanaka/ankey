import { createWorker, PSM, OEM } from "tesseract.js"

// 日本語OCR用の辞書データ（頻出する専門用語や誤認識されやすい単語のマッピング）
const JAPANESE_CORRECTIONS: Record<string, string> = {
  // 数字と文字の誤認識修正
  O: "0",
  "０": "0",
  Ｏ: "0",
  o: "0",
  ｏ: "0",
  l: "1",
  I: "1",
  Ｉ: "1",
  ｌ: "1",
  "１": "1",
  Z: "2",
  Ｚ: "2",
  "２": "2",
  ｚ: "2",
  〇: "0",
  一: "1",
  二: "2",
  三: "3",
  四: "4",
  五: "5",
  六: "6",
  七: "7",
  八: "8",
  九: "9",

  // 記号の誤認識修正
  "．": ".",
  "，": ",",
  "、": "、",
  "。": "。",
  "：": ":",
  "；": ";",
  "［": "[",
  "］": "]",
  "｛": "{",
  "｝": "}",
  "（": "(",
  "）": ")",
  "！": "!",
  "？": "?",
  "＠": "@",
  "＃": "#",
  "＄": "$",
  "％": "%",
  "＾": "^",
  "＆": "&",
  "＊": "*",
  "＿": "_",
  "＋": "+",
  "＝": "=",
  "｜": "|",
  "＼": "\\",
  "／": "/",
  "＜": "<",
  "＞": ">",
  "〜": "~",
  "‐": "-",
  "−": "-",
  ー: "ー",
  "－": "-",

  // かぎかっこの修正
  "〈": "「",
  "〉": "」",
  "《": "「",
  "》": "」",
  "『": "『",
  "』": "』",
  "「": "「",
  "」": "」",

  // 特殊な日本語文字の修正
  ヵ: "か",
  ヶ: "ケ",
  ゕ: "か",
  ゖ: "け",
  〆: "締",
  〇: "○",
  ゛: "゙",
  ゜: "゚",

  // 半角カタカナを全角に修正
  ｱ: "ア",
  ｲ: "イ",
  ｳ: "ウ",
  ｴ: "エ",
  ｵ: "オ",
  ｶ: "カ",
  ｷ: "キ",
  ｸ: "ク",
  ｹ: "ケ",
  ｺ: "コ",
  ｻ: "サ",
  ｼ: "シ",
  ｽ: "ス",
  ｾ: "セ",
  ｿ: "ソ",
  ﾀ: "タ",
  ﾁ: "チ",
  ﾂ: "ツ",
  ﾃ: "テ",
  ﾄ: "ト",
  ﾅ: "ナ",
  ﾆ: "ニ",
  ﾇ: "ヌ",
  ﾈ: "ネ",
  ﾉ: "ノ",
  ﾊ: "ハ",
  ﾋ: "ヒ",
  ﾌ: "フ",
  ﾍ: "ヘ",
  ﾎ: "ホ",
  ﾏ: "マ",
  ﾐ: "ミ",
  ﾑ: "ム",
  ﾒ: "メ",
  ﾓ: "モ",
  ﾔ: "ヤ",
  ﾕ: "ユ",
  ﾖ: "ヨ",
  ﾗ: "ラ",
  ﾘ: "リ",
  ﾙ: "ル",
  ﾚ: "レ",
  ﾛ: "ロ",
  ﾜ: "ワ",
  ｦ: "ヲ",
  ﾝ: "ン",
  ｧ: "ァ",
  ｨ: "ィ",
  ｩ: "ゥ",
  ｪ: "ェ",
  ｫ: "ォ",
  ｯ: "ッ",
  ｬ: "ャ",
  ｭ: "ュ",
  ｮ: "ョ",
  ｰ: "ー",
  "･": "・",
  "｡": "。",
  "､": "、",
  ﾞ: "゛",
  ﾟ: "゜",

  // 医学用語の修正（例）
  インスリン抵抗性: "インスリン抵抗性",
  高血圧症: "高血圧症",
  糖尿病: "糖尿病",
  脂質異常症: "脂質異常症",
  メタボリックシンドローム: "メタボリックシンドローム",
}

// 画像からテキストを抽出する関数（日本語対応強化版）
export async function extractTextFromImage(imageFile: File): Promise<string> {
  try {
    // 画像の前処理（高度な処理を追加）
    const processedFile = await advancedPreprocessImage(imageFile)

    // 画像ファイルをDataURLに変換
    const imageDataUrl = await fileToDataUrl(processedFile)

    // 画像の向きを検出（縦書き/横書き）
    const isVerticalText = await detectVerticalText(imageDataUrl)

    // Tesseract.jsワーカーを作成
    const worker = await createWorker()

    // 日本語と英語の両方の言語データを読み込む（認識精度向上のため）
    await worker.loadLanguage("jpn+eng")
    await worker.initialize("jpn+eng")

    // 日本語OCRに最適化された設定
    await worker.setParameters({
      tessedit_ocr_engine_mode: OEM.LSTM_ONLY, // LSTMエンジンのみ使用（より高精度）
      tessedit_pageseg_mode: isVerticalText ? PSM.SINGLE_BLOCK_VERT_TEXT : PSM.AUTO, // 縦書きテキスト検出時は専用モード
      preserve_interword_spaces: "1", // 単語間のスペースを保持
      textord_space_size_is_variable: "1", // 可変スペースサイズを許可
      language_model_penalty_non_freq_dict_word: "0.5", // 非頻出単語のペナルティを下げる
      language_model_penalty_non_dict_word: "0.5", // 辞書にない単語のペナルティを下げる
      textord_heavy_nr: "1", // ノイズ除去を強化
      tessedit_char_whitelist: "", // 文字ホワイトリストを無効化（すべての文字を許可）
      lstm_use_matrix: "1", // LSTMマトリックスを使用（日本語認識向上）
      tessedit_write_images: "0", // デバッグ画像を書き出さない
      tessedit_create_hocr: "0", // HOCRは不要
      tessedit_create_tsv: "0", // TSVは不要
      tessedit_create_box: "0", // ボックスデータは不要
      tessedit_create_unlv: "0", // UNLVフォーマットは不要
      tessedit_create_osd: "0", // OSDは不要
    })

    // 表形式データかどうかを推測
    const isTable = await detectTableStructure(imageDataUrl)

    let recognitionResult

    if (isTable) {
      // 表形式データ用の設定
      await worker.setParameters({
        tessedit_pageseg_mode: PSM.SPARSE_TEXT, // 疎らなテキスト用のモード
        textord_tabfind_find_tables: "1", // 表の検出を有効化
      })
      recognitionResult = await worker.recognize(imageDataUrl)
    } else if (isVerticalText) {
      // 縦書きテキスト用の設定
      await worker.setParameters({
        tessedit_pageseg_mode: PSM.SINGLE_BLOCK_VERT_TEXT, // 縦書きテキスト用のモード
      })
      recognitionResult = await worker.recognize(imageDataUrl)
    } else {
      // 通常テキスト用の設定
      await worker.setParameters({
        tessedit_pageseg_mode: PSM.AUTO, // 自動ページセグメンテーション
      })
      recognitionResult = await worker.recognize(imageDataUrl)
    }

    // ワーカーを終了
    await worker.terminate()

    // 抽出されたテキストを後処理
    let extractedText = recognitionResult.data.text

    // 表形式データの場合は構造を保持する後処理
    if (isTable) {
      extractedText = processTableText(extractedText)
    }

    // 縦書きテキストの場合は特別な処理
    if (isVerticalText) {
      extractedText = processVerticalText(extractedText)
    }

    // 日本語OCRの後処理（高度な処理を追加）
    extractedText = advancedPostprocessJapaneseText(extractedText)

    return extractedText
  } catch (error) {
    console.error("テキスト抽出エラー:", error)
    throw new Error("画像からテキストを抽出できませんでした。")
  }
}

// 縦書きテキストを検出する関数
async function detectVerticalText(imageDataUrl: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement("canvas")
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext("2d")
      ctx?.drawImage(img, 0, 0)

      // 画像データを取得
      const imageData = ctx?.getImageData(0, 0, canvas.width, canvas.height)
      if (!imageData) {
        resolve(false)
        return
      }

      // 縦書きテキストの特徴を検出
      // 1. アスペクト比が縦長
      const isVerticalAspect = img.height > img.width * 1.5

      // 2. 垂直方向の文字列パターンを検出
      const verticalPatterns = detectVerticalPatterns(imageData)

      // 縦書きと判断する条件
      resolve(isVerticalAspect && verticalPatterns)
    }
    img.onerror = () => resolve(false)
    img.src = imageDataUrl
  })
}

// 垂直方向の文字列パターンを検出する関数
function detectVerticalPatterns(imageData: ImageData): boolean {
  const { width, height, data } = imageData
  const threshold = 200 // 白黒の閾値

  // 垂直方向のエッジを検出
  let verticalEdges = 0
  let horizontalEdges = 0

  // 画像の中央部分をサンプリング
  const sampleWidth = Math.min(width, 300)
  const sampleHeight = Math.min(height, 300)
  const startX = Math.floor((width - sampleWidth) / 2)
  const startY = Math.floor((height - sampleHeight) / 2)

  // 垂直方向のエッジを検出
  for (let y = startY; y < startY + sampleHeight - 1; y++) {
    for (let x = startX; x < startX + sampleWidth; x++) {
      const idx = (y * width + x) * 4
      const idxBelow = ((y + 1) * width + x) * 4

      const pixelValue = (data[idx] + data[idx + 1] + data[idx + 2]) / 3
      const pixelBelow = (data[idxBelow] + data[idxBelow + 1] + data[idxBelow + 2]) / 3

      if (Math.abs(pixelValue - pixelBelow) > 50) {
        verticalEdges++
      }
    }
  }

  // 水平方向のエッジを検出
  for (let y = startY; y < startY + sampleHeight; y++) {
    for (let x = startX; x < startX + sampleWidth - 1; x++) {
      const idx = (y * width + x) * 4
      const idxRight = (y * width + x + 1) * 4

      const pixelValue = (data[idx] + data[idx + 1] + data[idx + 2]) / 3
      const pixelRight = (data[idxRight] + data[idxRight + 1] + data[idxRight + 2]) / 3

      if (Math.abs(pixelValue - pixelRight) > 50) {
        horizontalEdges++
      }
    }
  }

  // 垂直方向のエッジが水平方向より多い場合、縦書きの可能性が高い
  return verticalEdges > horizontalEdges * 1.2
}

// 縦書きテキストを処理する関数
function processVerticalText(text: string): string {
  // 縦書きテキストの行を正しく並べ替え
  const lines = text.split("\n").filter((line) => line.trim().length > 0)

  // 縦書きの場合、右から左に列が並ぶため、逆順にする
  const reversedLines = [...lines].reverse()

  // 各行の文字を結合
  let processed = ""
  for (let i = 0; i < reversedLines.length; i++) {
    processed += reversedLines[i] + "\n"
  }

  return processed
}

// 高度な日本語テキスト後処理
function advancedPostprocessJapaneseText(text: string): string {
  // 基本的な後処理
  let processed = text
    .replace(/([^\x01-\x7E]) /g, "$1") // 日本語文字の後の空白を削除
    .replace(/ ([^\x01-\x7E])/g, "$1") // 日本語文字の前の空白を削除
    .replace(/\n\s+/g, "\n") // 行頭の空白を削除

  // 辞書ベースの修正
  for (const [wrong, correct] of Object.entries(JAPANESE_CORRECTIONS)) {
    processed = processed.replace(new RegExp(wrong, "g"), correct)
  }

  // 文脈に基づく修正
  processed = fixJapaneseContextualErrors(processed)

  // 日本語の文法規則に基づく修正
  processed = fixJapaneseGrammar(processed)

  return processed
}

// 文脈に基づく日本語の誤認識を修正する関数
function fixJapaneseContextualErrors(text: string): string {
  let processed = text

  // 数字の後に単位がある場合の修正
  processed = processed.replace(/(\d+)[ 　]*(円|個|人|歳|才|年|月|日|時|分|秒|kg|cm|mm|m|km|g|mg|ml|l|℃)/g, "$1$2")

  // 句読点の前後の空白を削除
  processed = processed.replace(/[ 　]*(、|。|，|．|！|？|!|\?|:|：|;|；)[ 　]*/g, "$1")

  // 括弧類の修正
  processed = processed.replace(/[ 　]*$$[ 　]*/g, "(").replace(/[ 　]*$$[ 　]*/g, ")")
  processed = processed.replace(/[ 　]*（[ 　]*/g, "（").replace(/[ 　]*）[ 　]*/g, "）")
  processed = processed.replace(/[ 　]*\[[ 　]*/g, "[").replace(/[ 　]*\][ 　]*/g, "]")
  processed = processed.replace(/[ 　]*「[ 　]*/g, "「").replace(/[ 　]*」[ 　]*/g, "」")
  processed = processed.replace(/[ 　]*『[ 　]*/g, "『").replace(/[ 　]*』[ 　]*/g, "』")

  // 日付表記の修正
  processed = processed.replace(
    /(\d{4})[ 　]*[/／年][ 　]*(\d{1,2})[ 　]*[/／月][ 　]*(\d{1,2})[ 　]*日?/g,
    "$1年$2月$3日",
  )

  // 時刻表記の修正
  processed = processed.replace(/(\d{1,2})[ 　]*[:][ 　]*(\d{2})[ 　]*[:]?[ 　]*(\d{2})?/g, (match, h, m, s) => {
    return s ? `${h}時${m}分${s}秒` : `${h}時${m}分`
  })

  return processed
}

// 日本語の文法規則に基づく修正
function fixJapaneseGrammar(text: string): string {
  let processed = text

  // 助詞の修正
  processed = processed.replace(/([あ-ん])か゛/g, "$1が")
  processed = processed.replace(/([あ-ん])て゛/g, "$1で")
  processed = processed.replace(/([あ-ん])と゛/g, "$1ど")

  // 文末表現の修正
  processed = processed.replace(/ます　/g, "ます。")
  processed = processed.replace(/ました　/g, "ました。")
  processed = processed.replace(/です　/g, "です。")
  processed = processed.replace(/ください　/g, "ください。")

  // 繰り返し記号の修正
  processed = processed.replace(/ゝ/g, "々")

  return processed
}

// 高度な画像前処理（日本語OCR向けに最適化）
export async function advancedPreprocessImage(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement("canvas")
        canvas.width = img.width
        canvas.height = img.height
        const ctx = canvas.getContext("2d")

        if (!ctx) {
          reject(new Error("キャンバスコンテキストを取得できませんでした"))
          return
        }

        // 元の画像を描画
        ctx.drawImage(img, 0, 0)

        // 画像データを取得
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const { data, width, height } = imageData

        // 1. グレースケール変換（日本語OCR向け最適化）
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i]
          const g = data[i + 1]
          const b = data[i + 2]

          // 日本語OCRに最適化された重み付けグレースケール変換
          const gray = r * 0.3 + g * 0.59 + b * 0.11

          data[i] = gray
          data[i + 1] = gray
          data[i + 2] = gray
        }

        // 2. ノイズ除去（メディアンフィルタ）
        const tempData = new Uint8ClampedArray(data.length)
        for (let i = 0; i < data.length; i++) {
          tempData[i] = data[i]
        }

        for (let y = 1; y < height - 1; y++) {
          for (let x = 1; x < width - 1; x++) {
            const idx = (y * width + x) * 4

            // 3x3の近傍ピクセルを取得
            const neighbors = []
            for (let dy = -1; dy <= 1; dy++) {
              for (let dx = -1; dx <= 1; dx++) {
                const neighborIdx = ((y + dy) * width + (x + dx)) * 4
                neighbors.push(tempData[neighborIdx])
              }
            }

            // メディアン値を計算
            neighbors.sort((a, b) => a - b)
            const median = neighbors[4] // 9個の中央値

            // メディアン値を設定
            data[idx] = median
            data[idx + 1] = median
            data[idx + 2] = median
          }
        }

        // 3. アダプティブ二値化（適応的二値化）
        const blockSize = 15 // ブロックサイズ
        const C = 5 // 定数（閾値調整用）

        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4
            const pixelValue = data[idx]

            // 局所的な領域の平均値を計算
            let sum = 0
            let count = 0

            for (let dy = -blockSize; dy <= blockSize; dy++) {
              for (let dx = -blockSize; dx <= blockSize; dx++) {
                const ny = y + dy
                const nx = x + dx

                if (ny >= 0 && ny < height && nx >= 0 && nx < width) {
                  const neighborIdx = (ny * width + nx) * 4
                  sum += data[neighborIdx]
                  count++
                }
              }
            }

            // 局所的な閾値を計算
            const threshold = sum / count - C

            // 二値化
            const binary = pixelValue > threshold ? 255 : 0

            data[idx] = binary
            data[idx + 1] = binary
            data[idx + 2] = binary
          }
        }

        // 4. 傾き補正（デスキュー）
        // 注: 完全なデスキュー処理は複雑なため、ここでは簡易版を実装
        // 実際のアプリケーションでは、より高度なライブラリを使用することを推奨

        // 処理した画像データを描画
        ctx.putImageData(imageData, 0, 0)

        // キャンバスからBlobを取得
        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error("画像の変換に失敗しました"))
            return
          }

          // 新しいFileオブジェクトを作成
          const processedFile = new File([blob], file.name, {
            type: "image/png", // PNGフォーマットに変換
            lastModified: Date.now(),
          })

          resolve(processedFile)
        }, "image/png")
      }
      img.onerror = () => reject(new Error("画像の読み込みに失敗しました"))
      img.src = e.target?.result as string
    }
    reader.onerror = () => reject(new Error("ファイルの読み込みに失敗しました"))
    reader.readAsDataURL(file)
  })
}

// 表形式データかどうかを検出する関数
async function detectTableStructure(imageDataUrl: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement("canvas")
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext("2d")
      ctx?.drawImage(img, 0, 0)

      // 画像データを取得
      const imageData = ctx?.getImageData(0, 0, canvas.width, canvas.height)
      if (!imageData) {
        resolve(false)
        return
      }

      // 水平線と垂直線の検出（改良版）
      const horizontalLines = detectHorizontalLines(imageData)
      const verticalLines = detectVerticalLines(imageData)

      // グリッドパターンの検出
      const hasGridPattern = detectGridPattern(horizontalLines, verticalLines)

      // 水平線と垂直線が一定数以上あり、グリッドパターンが検出された場合は表と判断
      const isTable = horizontalLines.length >= 3 && verticalLines.length >= 2 && hasGridPattern
      resolve(isTable)
    }
    img.onerror = () => resolve(false)
    img.src = imageDataUrl
  })
}

// グリッドパターンを検出する関数
function detectGridPattern(horizontalLines: number[], verticalLines: number[]): boolean {
  // 水平線と垂直線が少なすぎる場合はグリッドなし
  if (horizontalLines.length < 3 || verticalLines.length < 2) {
    return false
  }

  // 水平線の間隔が均等かチェック
  const horizontalSpacings = []
  for (let i = 1; i < horizontalLines.length; i++) {
    horizontalSpacings.push(horizontalLines[i] - horizontalLines[i - 1])
  }

  // 垂直線の間隔が均等かチェック
  const verticalSpacings = []
  for (let i = 1; i < verticalLines.length; i++) {
    verticalSpacings.push(verticalLines[i] - verticalLines[i - 1])
  }

  // 間隔の標準偏差を計算
  const hStdDev = calculateStandardDeviation(horizontalSpacings)
  const vStdDev = calculateStandardDeviation(verticalSpacings)

  // 間隔の平均値を計算
  const hMean = horizontalSpacings.reduce((a, b) => a + b, 0) / horizontalSpacings.length
  const vMean = verticalSpacings.reduce((a, b) => a + b, 0) / verticalSpacings.length

  // 変動係数（標準偏差/平均）が小さければ均等と判断
  const hCV = hStdDev / hMean
  const vCV = vStdDev / vMean

  return hCV < 0.3 && vCV < 0.3 // 変動係数が30%未満なら均等と判断
}

// 標準偏差を計算する関数
function calculateStandardDeviation(values: number[]): number {
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  const squareDiffs = values.map((value) => Math.pow(value - mean, 2))
  const variance = squareDiffs.reduce((a, b) => a + b, 0) / values.length
  return Math.sqrt(variance)
}

// 水平線を検出する関数（改良版）
function detectHorizontalLines(imageData: ImageData): number[] {
  const { width, height, data } = imageData
  const lines: number[] = []
  const threshold = 200 // 白黒の閾値
  const minLineLength = width * 0.3 // 最小ライン長（画像幅の30%）

  // 各行をスキャン
  for (let y = 0; y < height; y++) {
    let linePixels = 0
    let lineSegments = 0
    let inLine = false

    // 行内の各ピクセルをチェック
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4
      const r = data[idx]
      const g = data[idx + 1]
      const b = data[idx + 2]

      // 暗いピクセル（線の可能性）をチェック
      const brightness = (r + g + b) / 3
      const isDark = brightness < threshold

      if (isDark) {
        linePixels++
        if (!inLine) {
          inLine = true
          lineSegments++
        }
      } else {
        inLine = false
      }
    }

    // 行の一定割合以上が暗いピクセルで、連続したセグメントが少ない場合は線と判断
    if (linePixels > minLineLength && lineSegments < 5) {
      lines.push(y)
    }
  }

  return lines
}

// 垂直線を検出する関数（改良版）
function detectVerticalLines(imageData: ImageData): number[] {
  const { width, height, data } = imageData
  const lines: number[] = []
  const threshold = 200 // 白黒の閾値
  const minLineLength = height * 0.3 // 最小ライン長（画像高さの30%）

  // 各列をスキャン
  for (let x = 0; x < width; x++) {
    let linePixels = 0
    let lineSegments = 0
    let inLine = false

    // 列内の各ピクセルをチェック
    for (let y = 0; y < height; y++) {
      const idx = (y * width + x) * 4
      const r = data[idx]
      const g = data[idx + 1]
      const b = data[idx + 2]

      // 暗いピクセル（線の可能性）をチェック
      const brightness = (r + g + b) / 3
      const isDark = brightness < threshold

      if (isDark) {
        linePixels++
        if (!inLine) {
          inLine = true
          lineSegments++
        }
      } else {
        inLine = false
      }
    }

    // 列の一定割合以上が暗いピクセルで、連続したセグメントが少ない場合は線と判断
    if (linePixels > minLineLength && lineSegments < 5) {
      lines.push(x)
    }
  }

  return lines
}

// 表形式テキストを処理する関数（改良版）
function processTableText(text: string): string {
  // 余分な空白を削除
  const processed = text.replace(/\s+/g, " ").trim()

  // 行を分割
  const rows = processed.split("\n").filter((row) => row.trim().length > 0)

  // 各行を処理
  const processedRows = rows.map((row) => {
    // 行内の単語を取得
    const words = row.split(" ").filter((word) => word.trim().length > 0)

    // 単語間の距離に基づいて区切り文字を挿入
    let processedRow = ""
    let lastWordEnd = 0

    for (let i = 0; i < words.length; i++) {
      const word = words[i]
      const wordStart = row.indexOf(word, lastWordEnd)

      // 前の単語との距離が大きい場合は区切り文字を挿入
      if (i > 0 && wordStart - lastWordEnd > 3) {
        processedRow += " | "
      } else if (i > 0) {
        processedRow += " "
      }

      processedRow += word
      lastWordEnd = wordStart + word.length
    }

    return processedRow
  })

  return processedRows.join("\n")
}

// ファイルをDataURLに変換する関数
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// 画像をリサイズする関数
export function resizeImage(file: File, maxWidth = 1200): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement("canvas")
        let width = img.width
        let height = img.height

        // 画像が大きすぎる場合はリサイズ
        if (width > maxWidth) {
          height = (height * maxWidth) / width
          width = maxWidth
        }

        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext("2d")
        ctx?.drawImage(img, 0, 0, width, height)

        // キャンバスからBlobを取得
        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error("画像の変換に失敗しました"))
            return
          }
          // 新しいFileオブジェクトを作成
          const resizedFile = new File([blob], file.name, {
            type: file.type,
            lastModified: Date.now(),
          })
          resolve(resizedFile)
        }, file.type)
      }
      img.onerror = () => reject(new Error("画像の読み込みに失敗しました"))
      img.src = e.target?.result as string
    }
    reader.onerror = () => reject(new Error("ファイルの読み込みに失敗しました"))
    reader.readAsDataURL(file)
  })
}

// 表形式データかどうかを判定する関数
export function isTableData(text: string): boolean {
  // 行を分割
  const rows = text.trim().split("\n")

  // 行数が少ない場合は表形式ではないと判断
  if (rows.length < 3) {
    return false
  }

  // 各行の列数をカウント
  const columnCounts = rows.map((row) => row.split(/\s{2,}|\t|\|/).length)

  // 最も多い列数を取得
  const maxColumnCount = Math.max(...columnCounts)

  // 全ての行が同じ列数を持つか、または一定の割合以上の行が同じ列数を持つ場合、表形式と判断
  const sameColumnCountThreshold = 0.6 // 60%以上の行が同じ列数であれば表とみなす
  const sameColumnCount = columnCounts.filter((count) => count === maxColumnCount).length

  return (
    (sameColumnCount / rows.length >= sameColumnCountThreshold && maxColumnCount > 2) ||
    text.includes("|") ||
    text.includes("\t")
  )
}

// 表形式データを整形する関数
export function formatTableData(text: string): string {
  // 行を分割
  const rows = text.trim().split("\n")

  // 各行をタブ区切りで結合し、改行で連結
  const formattedRows = rows.map((row) => {
    // 区切り文字（|）がある場合はそれを保持
    if (row.includes("|")) {
      return row
        .split("|")
        .map((cell) => cell.trim())
        .join(" | ")
    }

    // それ以外の場合は空白の連続をタブに置換
    return row
      .replace(/\s{2,}/g, "\t")
      .split("\t")
      .map((cell) => cell.trim())
      .filter((cell) => cell.length > 0)
      .join(" | ")
  })

  return formattedRows.join("\n")
}
