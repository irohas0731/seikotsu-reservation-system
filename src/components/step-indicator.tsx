"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
  { number: 1, label: "メニュー" },
  { number: 2, label: "施術者" },
  { number: 3, label: "日にち" },
  { number: 4, label: "時間" },
  { number: 5, label: "確認" },
];

interface StepIndicatorProps {
  currentStep: number;
}

export function StepIndicator({ currentStep }: StepIndicatorProps) {
  return (
    <nav aria-label="予約ステップ" className="w-full">
      <ol className="flex items-center justify-between w-full max-w-lg mx-auto">
        {STEPS.map((step, index) => {
          const isCompleted = currentStep > step.number;
          const isCurrent = currentStep === step.number;
          const isUpcoming = currentStep < step.number;

          return (
            <li
              key={step.number}
              className="flex flex-col items-center relative flex-1"
            >
              {/* コネクタライン */}
              {index > 0 && (
                <div
                  className={cn(
                    "absolute top-5 right-1/2 w-full h-0.5 -translate-y-1/2",
                    isCompleted || isCurrent ? "bg-blue-600" : "bg-gray-200"
                  )}
                  style={{ zIndex: 0 }}
                  aria-hidden="true"
                />
              )}

              {/* ステップ丸 */}
              <div
                className={cn(
                  "relative z-10 flex items-center justify-center w-10 h-10 rounded-full text-base font-bold transition-colors",
                  isCompleted && "bg-blue-600 text-white",
                  isCurrent && "bg-blue-600 text-white ring-4 ring-blue-200",
                  isUpcoming && "bg-gray-200 text-gray-500"
                )}
                aria-current={isCurrent ? "step" : undefined}
              >
                {isCompleted ? (
                  <Check className="w-5 h-5" aria-hidden="true" />
                ) : (
                  <span>{step.number}</span>
                )}
              </div>

              {/* ラベル (モバイルでは非表示、sm以上で表示) */}
              <span
                className={cn(
                  "mt-1.5 text-xs font-medium hidden sm:block",
                  isCurrent && "text-blue-700 font-bold",
                  isCompleted && "text-blue-600",
                  isUpcoming && "text-gray-400"
                )}
              >
                {step.label}
              </span>

              {/* モバイルではカレントステップのみラベル表示 */}
              {isCurrent && (
                <span className="mt-1.5 text-xs font-bold text-blue-700 sm:hidden">
                  {step.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
