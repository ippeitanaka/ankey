"use client"

import { useState } from "react"
import { ChevronLeft, ChevronRight, X, RotateCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Logo } from "@/components/logo"
import type { Flashcard } from "@/app/actions"

interface StudyModeProps {
  flashcards: Flashcard[]
  onExit: () => void
}

export function StudyMode({ flashcards, onExit }: StudyModeProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showBack, setShowBack] = useState(false)
  const [completedCards, setCompletedCards] = useState<Set<number>>(new Set())

  const currentCard = flashcards[currentIndex]
  const progress = (completedCards.size / flashcards.length) * 100

  // 前のカードに移動
  const goToPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
      setShowBack(false)
    }
  }

  // 次のカードに移動
  const goToNext = () => {
    if (currentIndex < flashcards.length - 1) {
      // 現在のカードが完了したとマーク
      if (showBack) {
        setCompletedCards((prev) => {
          const newSet = new Set(prev)
          newSet.add(currentIndex)
          return newSet
        })
      }

      setCurrentIndex(currentIndex + 1)
      setShowBack(false)
    } else if (showBack) {
      // 最後のカードの裏面を見た場合、そのカードも完了としてマーク
      setCompletedCards((prev) => {
        const newSet = new Set(prev)
        newSet.add(currentIndex)
        return newSet
      })
    }
  }

  // カードをフリップ
  const flipCard = () => {
    setShowBack(!showBack)
  }

  // 最初からやり直す
  const restart = () => {
    setCurrentIndex(0)
    setShowBack(false)
    setCompletedCards(new Set())
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-secondary/50 to-background flex flex-col">
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 flex-1 flex flex-col">
        <header className="flex justify-between items-center mb-4 sm:mb-6">
          <div className="flex items-center">
            <Logo className="w-6 h-6 sm:w-8 sm:h-8 mr-2" />
            <h1 className="text-xl sm:text-2xl font-bold text-primary">暗記モード</h1>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onExit}
            className="text-primary hover:bg-primary/10 h-8 w-8 sm:h-10 sm:w-10"
          >
            <X className="h-4 w-4 sm:h-6 sm:w-6" />
          </Button>
        </header>

        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs sm:text-sm text-primary/70">
              {currentIndex + 1} / {flashcards.length}
            </span>
            <span className="text-xs sm:text-sm text-primary/70">
              完了: {completedCards.size} / {flashcards.length}
            </span>
          </div>
          <Progress value={progress} className="h-2 bg-secondary" indicatorClassName="bg-primary" />
        </div>

        <div className="flex-1 flex flex-col justify-center items-center px-2 sm:px-0">
          <Card
            className={`w-full max-w-2xl h-80 sm:h-96 p-4 sm:p-8 cursor-pointer transition-all duration-300 hover:shadow-2xl ${
              showBack
                ? "bg-gradient-to-br from-primary/10 to-primary/5 border-primary/40"
                : "bg-gradient-to-br from-white to-gray-50 border-primary/30"
            } border-2`}
            onClick={flipCard}
          >
            <div className="flex flex-col h-full justify-center items-center">
              <div className="text-center w-full">
                <div
                  className={`text-sm sm:text-lg mb-3 sm:mb-4 font-bold uppercase tracking-wider ${showBack ? "text-primary" : "text-primary/80"}`}
                >
                  {showBack ? "答え" : "問題"}
                </div>
                <div
                  className={`text-xl sm:text-3xl font-bold leading-relaxed ${showBack ? "text-primary" : "text-primary"} px-2 sm:px-4 break-words`}
                >
                  {showBack ? currentCard.back : currentCard.front}
                </div>
              </div>
              <div className="text-sm sm:text-base text-primary/60 mt-4 sm:mt-6 font-medium">
                タップして{showBack ? "問題" : "答え"}を表示
              </div>
            </div>
          </Card>
        </div>

        <div className="flex justify-between items-center mt-4 sm:mt-6 gap-2">
          <Button
            variant="outline"
            onClick={goToPrevious}
            disabled={currentIndex === 0}
            className="border-primary/30 text-primary hover:bg-primary/10 disabled:opacity-50 text-xs sm:text-sm px-2 sm:px-4 py-2"
            size="sm"
          >
            <ChevronLeft className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
            前へ
          </Button>

          <div className="flex gap-1 sm:gap-2">
            <Button
              variant="outline"
              onClick={restart}
              className="border-primary/30 text-primary hover:bg-primary/10 text-xs sm:text-sm px-2 sm:px-4 py-2"
              size="sm"
            >
              <RotateCw className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">最初から</span>
              <span className="sm:hidden">リセット</span>
            </Button>
            <Button
              variant="outline"
              onClick={onExit}
              className="border-primary/30 text-primary hover:bg-primary/10 text-xs sm:text-sm px-2 sm:px-4 py-2"
              size="sm"
            >
              <X className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
              終了
            </Button>
          </div>

          <Button
            onClick={goToNext}
            disabled={currentIndex === flashcards.length - 1 && showBack}
            className="bg-primary hover:bg-primary/90 disabled:opacity-50 text-xs sm:text-sm px-2 sm:px-4 py-2"
            size="sm"
          >
            {currentIndex === flashcards.length - 1 && showBack ? (
              "完了"
            ) : (
              <>
                次へ
                <ChevronRight className="ml-1 sm:ml-2 h-3 w-3 sm:h-4 sm:w-4" />
              </>
            )}
          </Button>
        </div>
      </div>
      <footer className="py-3 sm:py-4 text-center text-xs sm:text-sm text-primary/60 mt-auto">
        Copyright © 2025 TMC DX Committee
      </footer>
    </main>
  )
}
