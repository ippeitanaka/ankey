import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { image } = await request.json()

    // Base64エンコードされた画像データを取得（データURLのプレフィックスを削除）
    const base64Image = image.split(",")[1]

    // Google Cloud Vision APIのエンドポイント
    const apiUrl = "https://vision.googleapis.com/v1/images:annotate"

    // APIキーを環境変数から取得（サーバーサイドのみ）
    // NEXT_PUBLIC_プレフィックスを削除してセキュリティを向上
    const apiKey = process.env.GOOGLE_VISION_API_KEY || process.env.GOOGLE_CLOUD_API_KEY || process.env.VISION_API_KEY

    // デバッグ情報をログに出力
    console.log("環境変数の状態:", {
      GOOGLE_VISION_API_KEY_EXISTS: !!process.env.GOOGLE_VISION_API_KEY,
      GOOGLE_CLOUD_API_KEY_EXISTS: !!process.env.GOOGLE_CLOUD_API_KEY,
      VISION_API_KEY_EXISTS: !!process.env.VISION_API_KEY,
      ENV_KEYS: Object.keys(process.env).filter((key) => key.includes("GOOGLE") || key.includes("VISION")),
    })

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "Google Cloud Vision APIキーが環境変数に設定されていません。GOOGLE_VISION_API_KEY、GOOGLE_CLOUD_API_KEY、またはVISION_API_KEYを設定してください。",
        },
        { status: 500 },
      )
    }

    // APIリクエストを構築 - 修正: languageHintsをfeaturesからimageContextに移動
    const requestBody = {
      requests: [
        {
          image: {
            content: base64Image,
          },
          features: [
            {
              type: "TEXT_DETECTION",
            },
          ],
          imageContext: {
            languageHints: ["ja"],
          },
        },
      ],
    }

    // Google Cloud Vision APIを呼び出す
    const response = await fetch(`${apiUrl}?key=${apiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error("Google Cloud Vision APIエラー:", errorData)

      // より詳細なエラーメッセージを返す
      const errorMessage = errorData.error?.message || `APIエラー: ${response.status} ${response.statusText}`
      return NextResponse.json({ error: errorMessage }, { status: response.status })
    }

    const data = await response.json()

    // テキスト検出結果を取得
    const detectedText = data.responses[0]?.fullTextAnnotation?.text || ""

    // 表形式データの場合は構造を保持するための処理
    let formattedText = detectedText

    // 表形式データの検出（簡易的な方法）
    const hasTable =
      detectedText.includes("|") || ((detectedText.match(/\n/g)?.length || 0) > 5 && detectedText.match(/\s{3,}/g))

    if (hasTable) {
      // 表形式データの場合、タブ文字で整形して構造を保持
      formattedText = detectedText
        .replace(/\s{3,}/g, "\t") // 3つ以上の連続した空白をタブに置換
        .replace(/\n\s+/g, "\n") // 行頭の空白を削除
    }

    return NextResponse.json({ text: formattedText })
  } catch (error) {
    console.error("テキスト抽出エラー:", error)
    return NextResponse.json(
      { error: `テキスト抽出中にエラーが発生しました: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 },
    )
  }
}
