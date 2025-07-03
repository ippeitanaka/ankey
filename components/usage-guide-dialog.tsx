"use client"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { HelpCircle, FileText, ImageIcon, Plus, BookOpen, Settings, Wand2 } from "lucide-react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"

export function UsageGuideDialog() {
  // openプロパティを使用せず、Radix UIのデフォルトの動作に任せる
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <HelpCircle className="h-4 w-4" />
          使い方
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <HelpCircle className="h-5 w-5" />
            TMC AnKey の使い方
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="overview" className="mt-4">
          <TabsList className="grid grid-cols-5 mb-4">
            <TabsTrigger value="overview">概要</TabsTrigger>
            <TabsTrigger value="text">テキスト入力</TabsTrigger>
            <TabsTrigger value="image">画像アップロード</TabsTrigger>
            <TabsTrigger value="flashcards">フラッシュカード</TabsTrigger>
            <TabsTrigger value="study">暗記モード</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="rounded-lg border p-4">
              <h3 className="font-medium text-lg mb-2">TMC AnKeyとは</h3>
              <p>
                TMC AnKeyは、AIを活用して効率的に暗記学習をサポートするフラッシュカードアプリです。
                テキストや画像から自動的にフラッシュカードを作成し、効果的な学習をサポートします。
              </p>
            </div>

            <div className="rounded-lg border p-4">
              <h3 className="font-medium text-lg mb-2">基本的な使い方</h3>
              <ol className="list-decimal list-inside space-y-2">
                <li>テキストを入力するか、画像をアップロードします</li>
                <li>「フラッシュカードを作成」ボタンをクリックします</li>
                <li>作成されたフラッシュカードを確認します</li>
                <li>「暗記モード」で学習を開始します</li>
              </ol>
            </div>
          </TabsContent>

          <TabsContent value="text" className="space-y-4">
            <div className="rounded-lg border p-4">
              <h3 className="font-medium text-lg mb-2 flex items-center gap-2">
                <FileText className="h-5 w-5" />
                テキスト入力からフラッシュカードを作成
              </h3>
              <ol className="list-decimal list-inside space-y-2">
                <li>「テキスト入力」タブを選択します</li>
                <li>テキストエリアに暗記したい内容のテキストを入力または貼り付けます</li>
                <li>「フラッシュカードを作成」ボタンをクリックします</li>
                <li>AIがテキストを分析し、重要な概念や用語をフラッシュカードに変換します</li>
              </ol>
              <p className="mt-2 text-sm text-muted-foreground">
                ヒント: 教科書、参考書、ウェブサイトなどからテキストをコピー＆ペーストすると効率的です。
              </p>
            </div>
          </TabsContent>

          <TabsContent value="image" className="space-y-4">
            <div className="rounded-lg border p-4">
              <h3 className="font-medium text-lg mb-2 flex items-center gap-2">
                <ImageIcon className="h-5 w-5" />
                画像アップロードからフラッシュカードを作成
              </h3>
              <ol className="list-decimal list-inside space-y-2">
                <li>「画像アップロード」タブを選択します</li>
                <li>「画像を選択」ボタンをクリックするか、画像をドラッグ＆ドロップします</li>
                <li>画像からテキストが自動的に抽出されます（OCR機能）</li>
                <li>必要に応じて抽出されたテキストを編集します</li>
                <li>「フラッシュカードを作成」ボタンをクリックします</li>
              </ol>
            </div>

            <div className="rounded-lg border p-4">
              <h3 className="font-medium text-lg mb-2 flex items-center gap-2">
                <Settings className="h-5 w-5" />
                OCR設定
              </h3>
              <p className="mb-2">
                画像アップロード後、右上の設定アイコンをクリックすると、OCR（光学文字認識）の設定を調整できます：
              </p>
              <ul className="list-disc list-inside space-y-1">
                <li>コントラスト強調: 文字と背景のコントラストを強調します</li>
                <li>縦書きテキスト検出: 縦書きの日本語テキストを検出します</li>
                <li>ノイズ除去: 画像のノイズを除去して文字認識精度を向上させます</li>
                <li>適応的二値化: 画像の明るさに応じて最適な二値化を行います</li>
                <li>傾き補正: 傾いた文書の角度を補正します（処理が重くなる場合があります）</li>
              </ul>
            </div>

            <div className="rounded-lg border p-4">
              <h3 className="font-medium text-lg mb-2 flex items-center gap-2">
                <Wand2 className="h-5 w-5" />
                画像強調処理
              </h3>
              <p>
                画像アップロード後、魔法の杖アイコンをクリックすると、画像を強調処理してOCR精度を向上させることができます。
                文字が薄い、コントラストが低い、ノイズが多いなどの問題がある場合に効果的です。
              </p>
            </div>
          </TabsContent>

          <TabsContent value="flashcards" className="space-y-4">
            <div className="rounded-lg border p-4">
              <h3 className="font-medium text-lg mb-2 flex items-center gap-2">
                <Plus className="h-5 w-5" />
                フラッシュカードの操作
              </h3>
              <ul className="list-disc list-inside space-y-2">
                <li>カードをクリックすると、表面（問題）と裏面（解答）を切り替えることができます</li>
                <li>カード右上の×ボタンをクリックすると、そのカードを削除できます</li>
                <li>「全て削除」ボタンをクリックすると、すべてのフラッシュカードを削除できます</li>
              </ul>
              <p className="mt-2 text-sm text-muted-foreground">
                作成したフラッシュカードは自動的に保存され、ブラウザを閉じても次回アクセス時に表示されます。
              </p>
            </div>
          </TabsContent>

          <TabsContent value="study" className="space-y-4">
            <div className="rounded-lg border p-4">
              <h3 className="font-medium text-lg mb-2 flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                暗記モードの使い方
              </h3>
              <ol className="list-decimal list-inside space-y-2">
                <li>フラッシュカードを作成した後、「暗記モード」ボタンをクリックします</li>
                <li>カードをクリックすると、表面（問題）と裏面（解答）を切り替えることができます</li>
                <li>「次へ」ボタンをクリックすると、次のカードに進みます</li>
                <li>「前へ」ボタンをクリックすると、前のカードに戻ります</li>
                <li>「最初から」ボタンをクリックすると、最初のカードからやり直します</li>
                <li>「終了」ボタンをクリックすると、暗記モードを終了します</li>
              </ol>
              <p className="mt-2">
                進捗バーで学習の進み具合を確認できます。カードの裏面を確認すると、そのカードは「完了」としてカウントされます。
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
