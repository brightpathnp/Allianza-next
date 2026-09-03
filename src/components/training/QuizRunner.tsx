'use client'

import React, { useState } from 'react'
import { TrainingQuiz } from '@/types/training'
import { CheckCircle2, XCircle } from 'lucide-react'

interface QuizRunnerProps {
  quiz: TrainingQuiz
  onComplete: (passed: boolean, score: number) => void
  onReset?: () => void
}

export default function QuizRunner({ quiz, onComplete, onReset }: QuizRunnerProps) {
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0)
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>(new Array(quiz.questions.length).fill(-1))
  const [showExplanation, setShowExplanation] = useState(false)
  const [quizFinished, setQuizFinished] = useState(false)

  React.useEffect(() => {
    setCurrentQuestionIdx(0)
    setSelectedAnswers(new Array(quiz.questions.length).fill(-1))
    setShowExplanation(false)
    setQuizFinished(false)
  }, [quiz.id])

  const currentQuestion = quiz.questions[currentQuestionIdx]
  const selectedIndex = selectedAnswers[currentQuestionIdx]
  const isAnswered = selectedIndex !== -1

  const handleSelectOption = (index: number) => {
    if (showExplanation) return
    const newAnswers = [...selectedAnswers]
    newAnswers[currentQuestionIdx] = index
    setSelectedAnswers(newAnswers)
  }

  const handleNext = () => {
    if (!showExplanation) {
      setShowExplanation(true)
      return
    }

    if (currentQuestionIdx < quiz.questions.length - 1) {
      setCurrentQuestionIdx(prev => prev + 1)
      setShowExplanation(false)
    } else {
      finishQuiz()
    }
  }

  const finishQuiz = () => {
    let score = 0
    selectedAnswers.forEach((ans, idx) => {
      if (ans === quiz.questions[idx].correctIndex) {
        score++
      }
    })
    
    const percentage = (score / quiz.questions.length) * 100
    const passed = percentage >= 80
    
    setQuizFinished(true)
    onComplete(passed, percentage)
  }

  if (quizFinished) {
    let score = 0
    selectedAnswers.forEach((ans, idx) => {
      if (ans === quiz.questions[idx].correctIndex) score++
    })
    const percentage = (score / quiz.questions.length) * 100
    const passed = percentage >= 80

    return (
      <div className="max-w-2xl mx-auto p-8 text-center bg-white rounded-xl shadow-sm border border-slate-200 mt-8">
        {passed ? (
          <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
        ) : (
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        )}
        <h2 className="text-3xl font-bold mb-4">{passed ? 'Congratulations!' : 'Keep trying!'}</h2>
        <p className="text-xl mb-6">
          You scored <span className="font-bold">{score} out of {quiz.questions.length}</span> ({percentage.toFixed(0)}%)
        </p>
        <p className="text-slate-500 mb-8">
          {passed ? 'You have successfully completed this assessment.' : 'You need 80% to pass this assessment.'}
        </p>
        {passed ? (
          onReset && (
            <button 
              onClick={onReset}
              className="px-6 py-3 bg-[#0059E7] text-white font-bold rounded-full hover:bg-blue-700 transition-colors"
            >
              Retake Quiz
            </button>
          )
        ) : (
          <button 
            onClick={() => {
              setCurrentQuestionIdx(0)
              setSelectedAnswers(new Array(quiz.questions.length).fill(-1))
              setShowExplanation(false)
              setQuizFinished(false)
            }}
            className="px-6 py-3 bg-[#0059E7] text-white font-bold rounded-full hover:bg-blue-700 transition-colors"
          >
            Retry Quiz
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-8">
      <div className="mb-6 flex justify-between items-center text-sm font-medium text-slate-500">
        <span>Question {currentQuestionIdx + 1} of {quiz.questions.length}</span>
      </div>

      <h2 className="text-2xl font-bold mb-8 text-slate-900">{currentQuestion.question}</h2>

      <div className="space-y-3 mb-8">
        {currentQuestion.options.map((option, idx) => {
          let optionClass = "w-full text-left p-4 rounded-lg border-2 transition-all flex items-center justify-between "
          let icon = null

          if (!showExplanation) {
            if (selectedIndex === idx) {
              optionClass += "border-[#0059E7] bg-blue-50"
            } else {
              optionClass += "border-slate-200 hover:border-slate-300"
            }
          } else {
            if (idx === currentQuestion.correctIndex) {
              optionClass += "border-green-500 bg-green-50"
              icon = <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
            } else if (selectedIndex === idx) {
              optionClass += "border-red-500 bg-red-50"
              icon = <XCircle className="w-5 h-5 text-red-500 shrink-0" />
            } else {
              optionClass += "border-slate-200 opacity-50"
            }
          }

          return (
            <button
              key={idx}
              onClick={() => handleSelectOption(idx)}
              className={optionClass}
              disabled={showExplanation}
            >
              <span className="font-medium">{option}</span>
              {icon && <span className="ml-4">{icon}</span>}
            </button>
          )
        })}
      </div>

      {showExplanation && (
        <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 mb-8">
          <p className="font-bold mb-1">Explanation:</p>
          <p className="text-slate-700">{currentQuestion.explanation || 'No explanation provided.'}</p>
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={handleNext}
          disabled={!isAnswered && !showExplanation}
          className="px-6 py-3 bg-[#0059E7] text-white font-bold rounded-full disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
        >
          {!showExplanation ? 'Check Answer' : currentQuestionIdx < quiz.questions.length - 1 ? 'Next Question' : 'Finish Quiz'}
        </button>
      </div>
    </div>
  )
}