"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import {
  Plus,
  Trash2,
  RefreshCw,
  AlertCircle,
  BookOpen,
  Upload,
  X,
  ImageIcon,
  Wand2,
  Languages,
  Settings,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { generateFlashcards, type Flashcard } from "./actions"
import { useToast } from "@/hooks/use-toast"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { StudyMode } from "@/components/study-mode"
import { Logo } from "@/components/logo"
import { resizeImage, isTableData, advancedPreprocessImage } from "@/utils/image-processing"
import { UsageGuideDialog } from "@/components/usage-guide-dialog"

// OCR設定の型定義
interface OcrSettings {
  enhanceContrast: boolean
  detectVerticalText: boolean
  applyNoiseReduction: boolean
  useAdaptiveThreshold: boolean
  applyDeskew: boolean
}

// Function to convert a File to a Data URL (Base64)
const fileToDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (event) => {
      if (event.target && event.target.result) {
        resolve(event.target.result.toString())
      } else {
        reject(new Error("Failed to convert file to data URL"))
      }
    }
    reader.onerror = (error) => reject(error)
    reader.readAsDataURL(file)
  })
}

export default function Home() {
  const [text, setText] = useState("")
  const [flashcards, setFlashcards] = useState<Flashcard[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [flippedCards, setFlippedCards] = useState<Set<string>>(new Set())
  const [showMockAlert, setShowMockAlert] = useState(false)
  const [isStudyMode, setIsStudyMode] = useState(false)
  const [activeTab, setActiveTab] = useState<string>("text")
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [extractedText, setExtractedText] = useState<string>("")
  const [isProcessingImage, setIsProcessingImage] = useState(false)
  const [isEnhancingImage, setIsEnhancingImage] = useState(false)
  const [isTableDetected, setIsTableDetected] = useState(false)
  const [ocrSettings, setOcrSettings] = useState<OcrSettings>({
    enhanceContrast: true,
    detectVerticalText: true,
    applyNoiseReduction: true,
    useAdaptiveThreshold: true,
    applyDeskew: false, // デスキューは計算コストが高いため、デフォルトではオフ
  })
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  // ローカルストレージからフラッシュカードを読み込む
  useEffect(() => {
    const savedCards = localStorage.getItem("tmcAnkeyFlashcards")
    if (savedCards) {
      setFlashcards(JSON.parse(savedCards))
    }

    // OCR設定を読み込む
    const savedOcrSettings = localStorage.getItem("tmcAnkeyOcrSettings")
    if (savedOcrSettings) {
      setOcrSettings(JSON.parse(savedOcrSettings))
    }
  }, [])

  // フラッシュカードを保存する
  useEffect(() => {
    if (flashcards.length > 0) {
      localStorage.setItem("tmcAnkeyFlashcards", JSON.stringify(flashcards))
    }
  }, [flashcards])

  // OCR設定を保存する
  useEffect(() => {
    localStorage.setItem("tmcAnkeyOcrSettings", JSON.stringify(ocrSettings))
  }, [ocrSettings])

  // OCR設定を変更する
  const handleOcrSettingChange = (setting: keyof OcrSettings) => {
    setOcrSettings((prev) => ({
      ...prev,
      [setting]: !prev[setting],
    }))
  }

  // 画像アップロードハンドラー
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    try {
      setIsProcessingImage(true)

      // 画像ファイルを取得
      const file = files[0]

      // 画像をリサイズ（大きすぎる場合）
      const resizedFile = await resizeImage(file)
      setImageFile(resizedFile)

      // プレビュー用のURLを作成
      const previewUrl = URL.createObjectURL(resizedFile)
      setImagePreview(previewUrl)

      // 画像をBase64エンコード
      const base64Image = await fileToDataUrl(resizedFile)

      // サーバーサイドAPIを呼び出して画像からテキストを抽出
      const response = await fetch("/api/extract-text", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          image: base64Image,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "テキスト抽出に失敗しました")
      }

      const data = await response.json()
      const extractedText = data.text

      // 表形式データかどうかを判定
      const tableDetected = isTableData(extractedText)
      setIsTableDetected(tableDetected)

      setExtractedText(extractedText)

      // 表形式データの場合は通知
      if (tableDetected) {
        toast({
          title: "表形式データを検出しました",
          description: "表の構造を保持するように処理しました。必要に応じて編集してください。",
          duration: 4000,
        })
      } else {
        toast({
          title: "テキスト抽出完了",
          description: "画像からテキストを抽出しました。必要に応じて編集してください。",
          duration: 3000,
        })
      }
    } catch (error) {
      console.error("画像処理エラー:", error)
      toast({
        title: "エラーが発生しました",
        description: error instanceof Error ? error.message : "画像の処理中にエラーが発生しました。",
        variant: "destructive",
        duration: 5000,
      })
    } finally {
      setIsProcessingImage(false)
    }
  }

  // 画像強調処理
  const enhanceImage = async () => {
    if (!imageFile) return

    try {
      setIsEnhancingImage(true)

      // 画像の前処理を実行（高度な処理を使用）
      const enhancedFile = await advancedPreprocessImage(imageFile)
      setImageFile(enhancedFile)

      // プレビュー用のURLを更新
      URL.revokeObjectURL(imagePreview || "")
      const newPreviewUrl = URL.createObjectURL(enhancedFile)
      setImagePreview(newPreviewUrl)

      // 強調処理した画像をBase64エンコード
      const base64Image = await fileToDataUrl(enhancedFile)

      // サーバーサイドAPIを呼び出して画像からテキストを抽出
      const response = await fetch("/api/extract-text", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          image: base64Image,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "テキスト抽出に失敗しました")
      }

      const data = await response.json()
      const extractedText = data.text

      // 表形式データかどうかを判定
      const tableDetected = isTableData(extractedText)
      setIsTableDetected(tableDetected)

      setExtractedText(extractedText)

      toast({
        title: "画像強調処理完了",
        description: "画像を強調処理してテキストを再抽出しました。認識精度が向上している場合があります。",
        duration: 3000,
      })
    } catch (error) {
      console.error("画像強調処理エラー:", error)
      toast({
        title: "エラーが発生しました",
        description: error instanceof Error ? error.message : "画像の強調処理中にエラーが発生しました。",
        variant: "destructive",
        duration: 5000,
      })
    } finally {
      setIsEnhancingImage(false)
    }
  }

  // 画像クリア
  const clearImage = () => {
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview)
    }
    setImageFile(null)
    setImagePreview(null)
    setExtractedText("")
    setIsTableDetected(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  // 抽出テキスト編集ハンドラー
  const handleExtractedTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setExtractedText(e.target.value)
  }

  // フラッシュカードを生成する
  const handleGenerateFlashcards = async () => {
    const inputText = activeTab === "text" ? text : extractedText
    if (!inputText.trim()) return

    setIsGenerating(true)
    setShowMockAlert(false)

    try {
      // サーバーアクションを呼び出し
      const newCards = await generateFlashcards(inputText)
      setFlashcards([...flashcards, ...newCards])

      // テキスト入力をクリア
      if (activeTab === "text") {
        setText("")
      } else {
        clearImage()
      }

      // モックデータが使用されたかどうかを確認
      const isMockData = newCards.some(
        (card) => card.front === "このカードは自動生成されました" || card.back.includes("モックデータを使用しています"),
      )

      if (isMockData) {
        setShowMockAlert(true)
        toast({
          title: "モックデータを使用しました",
          description: "APIキーの問題により、簡易的なフラッシュカードを生成しました。",
          duration: 5000,
        })
      } else {
        toast({
          title: "フラッシュカードを作成しました",
          description: `${newCards.length}枚のフラッシュカードが作成されました。`,
          duration: 3000,
        })
      }
    } catch (error) {
      console.error("フラッシュカードの生成に失敗しました:", error)

      // エラーメッセージをより詳細に表示
      let errorMessage = "フラッシュカードの生成に失敗しました。"
      if (error instanceof Error) {
        errorMessage = `エラー: ${error.message}`
      }

      toast({
        title: "エラーが発生しました",
        description: errorMessage,
        variant: "destructive",
        duration: 5000,
      })
    } finally {
      setIsGenerating(false)
    }
  }

  // フラッシュカードを削除する
  const handleDeleteFlashcard = (id: string) => {
    setFlashcards(flashcards.filter((card) => card.id !== id))
  }

  // 全てのフラッシュカードを削除する
  const handleClearAllFlashcards = () => {
    setFlashcards([])
    localStorage.removeItem("tmcAnkeyFlashcards")
    toast({
      title: "全てのフラッシュカードを削除しました",
      duration: 3000,
    })
  }

  // カードをフリップする
  const toggleCardFlip = (id: string) => {
    setFlippedCards((prev) => {
      const newFlipped = new Set(prev)
      if (newFlipped.has(id)) {
        newFlipped.delete(id)
      } else {
        newFlipped.add(id)
      }
      return newFlipped
    })
  }

  // 暗記モードを開始する
  const startStudyMode = () => {
    if (flashcards.length > 0) {
      setIsStudyMode(true)
    } else {
      toast({
        title: "フラッシュカードがありません",
        description: "暗記を開始するには、まずフラッシュカードを作成してください。",
        variant: "destructive",
        duration: 3000,
      })
    }
  }

  // 暗記モードを終了する
  const exitStudyMode = () => {
    setIsStudyMode(false)
  }

  if (isStudyMode) {
    return <StudyMode flashcards={flashcards} onExit={exitStudyMode} />
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-secondary/50 to-background">
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
        <header className="mb-6 sm:mb-8">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div className="flex items-center">
              <Logo className="w-12 h-12 sm:w-16 sm:h-16 mr-2 sm:mr-3" />
              <h1 className="text-2xl sm:text-4xl font-bold text-primary">TMC AnKey</h1>
            </div>
            <UsageGuideDialog />
          </div>
          <p className="text-primary/80 text-center text-sm sm:text-lg">AIがテキストからフラッシュカードを作成します</p>
        </header>

        {showMockAlert && (
          <Alert className="mb-4 sm:mb-6 border-yellow-300 bg-yellow-50">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <AlertTitle className="text-yellow-700">APIキーの問題が検出されました</AlertTitle>
            <AlertDescription className="text-yellow-600">
              AI APIキーが正しく設定されていないため、簡易的なフラッシュカード生成を使用しています。
              より高品質なフラッシュカードを生成するには、有効なAPIキーを設定してください。
            </AlertDescription>
          </Alert>
        )}

        <div className="bg-card rounded-xl shadow-md p-4 sm:p-6 mb-6 sm:mb-8">
          <h2 className="text-lg sm:text-xl font-semibold text-primary mb-3 sm:mb-4">
            テキストまたは画像を入力してください
          </h2>

          <Tabs defaultValue="text" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full mb-3 sm:mb-4">
              <TabsTrigger value="text" className="flex-1 text-sm sm:text-base">
                テキスト入力
              </TabsTrigger>
              <TabsTrigger value="image" className="flex-1 text-sm sm:text-base">
                画像アップロード
              </TabsTrigger>
            </TabsList>

            <TabsContent value="text">
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="教科書やWEBサイトのテキストをここに貼り付けてください..."
                className="min-h-[150px] sm:min-h-[200px] border-primary/20 focus:border-primary mb-3 sm:mb-4 text-sm sm:text-base"
              />
            </TabsContent>

            <TabsContent value="image">
              <div className="border-2 border-dashed border-primary/20 rounded-md p-4 sm:p-8 text-center mb-3 sm:mb-4">
                {imagePreview ? (
                  <div className="relative">
                    <img
                      src={imagePreview || "/placeholder.svg"}
                      alt="アップロード画像"
                      className="max-h-[200px] sm:max-h-[300px] mx-auto"
                    />
                    <div className="absolute top-2 right-2 flex gap-1 sm:gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="icon"
                            className="bg-white/80 hover:bg-white h-8 w-8 sm:h-10 sm:w-10"
                            title="OCR設定"
                          >
                            <Settings className="h-3 w-3 sm:h-4 sm:w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="w-[95vw] max-w-md">
                          <DialogHeader>
                            <DialogTitle className="text-lg">日本語OCR設定</DialogTitle>
                          </DialogHeader>
                          <div className="py-4">
                            <div className="space-y-4">
                              <div className="flex items-center justify-between">
                                <label htmlFor="enhanceContrast" className="text-sm font-medium">
                                  コントラスト強調
                                </label>
                                <input
                                  type="checkbox"
                                  id="enhanceContrast"
                                  checked={ocrSettings.enhanceContrast}
                                  onChange={() => handleOcrSettingChange("enhanceContrast")}
                                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                />
                              </div>
                              <div className="flex items-center justify-between">
                                <label htmlFor="detectVerticalText" className="text-sm font-medium">
                                  縦書きテキスト検出
                                </label>
                                <input
                                  type="checkbox"
                                  id="detectVerticalText"
                                  checked={ocrSettings.detectVerticalText}
                                  onChange={() => handleOcrSettingChange("detectVerticalText")}
                                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                />
                              </div>
                              <div className="flex items-center justify-between">
                                <label htmlFor="applyNoiseReduction" className="text-sm font-medium">
                                  ノイズ除去
                                </label>
                                <input
                                  type="checkbox"
                                  id="applyNoiseReduction"
                                  checked={ocrSettings.applyNoiseReduction}
                                  onChange={() => handleOcrSettingChange("applyNoiseReduction")}
                                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                />
                              </div>
                              <div className="flex items-center justify-between">
                                <label htmlFor="useAdaptiveThreshold" className="text-sm font-medium">
                                  適応的二値化
                                </label>
                                <input
                                  type="checkbox"
                                  id="useAdaptiveThreshold"
                                  checked={ocrSettings.useAdaptiveThreshold}
                                  onChange={() => handleOcrSettingChange("useAdaptiveThreshold")}
                                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                />
                              </div>
                              <div className="flex items-center justify-between">
                                <label htmlFor="applyDeskew" className="text-sm font-medium">
                                  傾き補正（処理が重くなります）
                                </label>
                                <input
                                  type="checkbox"
                                  id="applyDeskew"
                                  checked={ocrSettings.applyDeskew}
                                  onChange={() => handleOcrSettingChange("applyDeskew")}
                                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                />
                              </div>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={enhanceImage}
                        disabled={isEnhancingImage}
                        className="bg-white/80 hover:bg-white h-8 w-8 sm:h-10 sm:w-10"
                        title="画像を強調処理してOCR精度を向上"
                      >
                        {isEnhancingImage ? (
                          <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                        ) : (
                          <Wand2 className="h-3 w-3 sm:h-4 sm:w-4" />
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={clearImage}
                        className="bg-white/80 hover:bg-white h-8 w-8 sm:h-10 sm:w-10"
                      >
                        <X className="h-3 w-3 sm:h-4 sm:w-4" />
                      </Button>
                    </div>
                    {isProcessingImage && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded">
                        <RefreshCw className="h-6 w-6 sm:h-8 sm:w-8 text-white animate-spin" />
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <Upload className="h-8 w-8 sm:h-12 sm:w-12 text-primary/40 mx-auto mb-2" />
                    <p className="text-primary/60 mb-3 sm:mb-4 text-sm sm:text-base">
                      画像をドラッグ＆ドロップするか、クリックしてアップロード
                    </p>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      id="image-upload"
                      ref={fileInputRef}
                      disabled={isProcessingImage}
                    />
                    <Button variant="outline" asChild disabled={isProcessingImage} size="sm" className="text-sm">
                      <label htmlFor="image-upload" className="cursor-pointer">
                        {isProcessingImage ? (
                          <>
                            <RefreshCw className="mr-2 h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                            処理中...
                          </>
                        ) : (
                          <>
                            <ImageIcon className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                            画像を選択
                          </>
                        )}
                      </label>
                    </Button>
                    <div className="mt-3 sm:mt-4 text-xs text-primary/60 flex items-center justify-center">
                      <Languages className="h-3 w-3 mr-1" />
                      <span>日本語OCR対応済み（高精度版）</span>
                    </div>
                  </>
                )}
              </div>
              {extractedText && (
                <div className="mb-3 sm:mb-4">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-2 gap-2">
                    <h3 className="text-sm font-medium text-primary/70">抽出されたテキスト (必要に応じて編集):</h3>
                    {isTableDetected && (
                      <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full self-start sm:self-auto">
                        表形式データ検出
                      </span>
                    )}
                  </div>
                  <Textarea
                    value={extractedText}
                    onChange={handleExtractedTextChange}
                    placeholder="抽出されたテキストを編集できます..."
                    className="min-h-[150px] sm:min-h-[200px] border-primary/20 focus:border-primary mb-3 sm:mb-4 text-sm sm:text-base"
                  />
                </div>
              )}
            </TabsContent>
          </Tabs>

          <div className="flex justify-center sm:justify-end">
            <Button
              size="lg"
              onClick={handleGenerateFlashcards}
              disabled={isGenerating || (!text.trim() && !extractedText.trim())}
              className="bg-primary hover:bg-primary/90 text-white shadow-lg hover:shadow-xl transition-all duration-200 font-semibold px-6 sm:px-8 py-3 text-base sm:text-lg w-full sm:w-auto"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="mr-2 sm:mr-3 h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
                  生成中...
                </>
              ) : (
                <>
                  <Plus className="mr-2 sm:mr-3 h-4 w-4 sm:h-5 sm:w-5" />
                  フラッシュカードを作成
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 sm:mb-6 gap-3 sm:gap-0">
          <h2 className="text-xl sm:text-2xl font-bold text-primary">作成されたフラッシュカード</h2>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <Button
              size="lg"
              onClick={startStudyMode}
              disabled={flashcards.length === 0}
              className="bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 font-semibold px-4 sm:px-6 py-3 text-sm sm:text-base w-full sm:w-auto"
            >
              <BookOpen className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
              暗記モード
            </Button>
            <Button
              variant="destructive"
              onClick={handleClearAllFlashcards}
              disabled={flashcards.length === 0}
              size="lg"
              className="font-semibold px-4 sm:px-6 py-3 text-sm sm:text-base w-full sm:w-auto"
            >
              <Trash2 className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
              全て削除
            </Button>
          </div>
        </div>

        {flashcards.length === 0 ? (
          <Card className="text-center p-6 sm:p-8">
            <p className="text-primary/80 text-sm sm:text-lg">
              まだフラッシュカードがありません。テキストを入力するか、画像をアップロードしてフラッシュカードを作成してください。
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {flashcards.map((card) => (
              <Card
                key={card.id}
                className={`relative cursor-pointer transition-all duration-300 transform hover:scale-105 hover:shadow-xl min-h-[140px] sm:min-h-[160px] bg-white border-2 border-primary/20 hover:border-primary/40 ${
                  flippedCards.has(card.id) ? "bg-primary/5" : ""
                }`}
                onClick={() => toggleCardFlip(card.id)}
              >
                <div className="absolute top-2 sm:top-3 right-2 sm:right-3 z-10">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation() // カードのフリップを防ぐ
                      handleDeleteFlashcard(card.id)
                    }}
                    className="h-6 w-6 sm:h-8 sm:w-8 hover:bg-red-100 hover:text-red-600"
                  >
                    <X className="h-3 w-3 sm:h-4 sm:w-4" />
                  </Button>
                </div>
                <div className="p-4 sm:p-6 pr-8 sm:pr-10">
                  {flippedCards.has(card.id) ? (
                    <div className="space-y-2 sm:space-y-3">
                      <div className="text-xs sm:text-sm font-medium text-primary/70 uppercase tracking-wide">答え</div>
                      <p className="text-primary font-semibold text-base sm:text-lg leading-relaxed break-words">
                        {card.back}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2 sm:space-y-3">
                      <div className="text-xs sm:text-sm font-medium text-primary/70 uppercase tracking-wide">問題</div>
                      <p className="text-primary font-bold text-lg sm:text-xl leading-relaxed break-words">
                        {card.front}
                      </p>
                    </div>
                  )}
                </div>
                <div className="absolute bottom-2 sm:bottom-3 left-3 sm:left-6 text-xs text-primary/50">
                  タップして{flippedCards.has(card.id) ? "問題" : "答え"}を表示
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
