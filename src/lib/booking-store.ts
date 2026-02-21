'use client';

// =============================================================================
// 整骨院予約システム - Booking Flow Store
// =============================================================================
// 予約フロー（ステップバイステップ）の状態管理。
// React Context + useReducer で実装。
// =============================================================================

import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  type ReactNode,
} from 'react';
import React from 'react';
import type { Menu, Practitioner } from '@/types/database';

// -----------------------------------------------------------------------------
// State
// -----------------------------------------------------------------------------

/** 予約フローのステップ */
export type BookingStep =
  | 'menu'           // メニュー選択
  | 'practitioner'   // 施術者選択
  | 'date'           // 日付選択
  | 'time'           // 時間帯選択
  | 'confirm'        // 確認画面
  | 'complete';      // 完了画面

/** 患者情報（認証済みまたは入力済み） */
export interface PatientInfo {
  id?: string;
  name: string;
  phone: string;
  birthDate?: string;
}

/** 予約フローの状態 */
export interface BookingState {
  /** 現在のステップ */
  currentStep: BookingStep;
  /** 選択されたメニュー */
  selectedMenu: Menu | null;
  /** 選択された施術者（null = おまかせ） */
  selectedPractitioner: Practitioner | null;
  /** 選択された日付 (YYYY-MM-DD) */
  selectedDate: string | null;
  /** 選択された開始時刻 (HH:MM) */
  selectedTime: string | null;
  /** 患者情報 */
  patientInfo: PatientInfo | null;
}

const initialState: BookingState = {
  currentStep: 'menu',
  selectedMenu: null,
  selectedPractitioner: null,
  selectedDate: null,
  selectedTime: null,
  patientInfo: null,
};

// -----------------------------------------------------------------------------
// Actions
// -----------------------------------------------------------------------------

type BookingAction =
  | { type: 'SET_MENU'; payload: Menu }
  | { type: 'SET_PRACTITIONER'; payload: Practitioner | null }
  | { type: 'SET_DATE'; payload: string }
  | { type: 'SET_TIME'; payload: string }
  | { type: 'SET_PATIENT_INFO'; payload: PatientInfo }
  | { type: 'GO_TO_STEP'; payload: BookingStep }
  | { type: 'NEXT_STEP' }
  | { type: 'PREV_STEP' }
  | { type: 'RESET' };

/** ステップの順番 */
const STEP_ORDER: BookingStep[] = [
  'menu',
  'practitioner',
  'date',
  'time',
  'confirm',
  'complete',
];

function getNextStep(current: BookingStep): BookingStep {
  const idx = STEP_ORDER.indexOf(current);
  return idx < STEP_ORDER.length - 1 ? STEP_ORDER[idx + 1] : current;
}

function getPrevStep(current: BookingStep): BookingStep {
  const idx = STEP_ORDER.indexOf(current);
  return idx > 0 ? STEP_ORDER[idx - 1] : current;
}

// -----------------------------------------------------------------------------
// Reducer
// -----------------------------------------------------------------------------

function bookingReducer(state: BookingState, action: BookingAction): BookingState {
  switch (action.type) {
    case 'SET_MENU':
      return {
        ...state,
        selectedMenu: action.payload,
        currentStep: 'practitioner',
      };

    case 'SET_PRACTITIONER':
      return {
        ...state,
        selectedPractitioner: action.payload,
        currentStep: 'date',
      };

    case 'SET_DATE':
      return {
        ...state,
        selectedDate: action.payload,
        currentStep: 'time',
      };

    case 'SET_TIME':
      return {
        ...state,
        selectedTime: action.payload,
        currentStep: 'confirm',
      };

    case 'SET_PATIENT_INFO':
      return {
        ...state,
        patientInfo: action.payload,
      };

    case 'GO_TO_STEP':
      return {
        ...state,
        currentStep: action.payload,
      };

    case 'NEXT_STEP':
      return {
        ...state,
        currentStep: getNextStep(state.currentStep),
      };

    case 'PREV_STEP':
      return {
        ...state,
        currentStep: getPrevStep(state.currentStep),
      };

    case 'RESET':
      return { ...initialState };

    default:
      return state;
  }
}

// -----------------------------------------------------------------------------
// Context
// -----------------------------------------------------------------------------

interface BookingContextValue {
  /** 現在の予約フロー状態 */
  state: BookingState;
  /** メニューを選択する */
  setMenu: (menu: Menu) => void;
  /** 施術者を選択する（null = おまかせ） */
  setPractitioner: (practitioner: Practitioner | null) => void;
  /** 日付を選択する */
  setDate: (date: string) => void;
  /** 時間を選択する */
  setTime: (time: string) => void;
  /** 患者情報を設定する */
  setPatientInfo: (info: PatientInfo) => void;
  /** 指定ステップへ移動する */
  goToStep: (step: BookingStep) => void;
  /** 次のステップへ進む */
  nextStep: () => void;
  /** 前のステップへ戻る */
  prevStep: () => void;
  /** 予約フローをリセットする */
  reset: () => void;
  /** 現在のステップ番号 (1-based) */
  currentStepNumber: number;
  /** 全ステップ数 */
  totalSteps: number;
}

const BookingContext = createContext<BookingContextValue | null>(null);

// -----------------------------------------------------------------------------
// Provider
// -----------------------------------------------------------------------------

interface BookingProviderProps {
  children: ReactNode;
}

export function BookingProvider({ children }: BookingProviderProps) {
  const [state, dispatch] = useReducer(bookingReducer, initialState);

  const setMenu = useCallback((menu: Menu) => {
    dispatch({ type: 'SET_MENU', payload: menu });
  }, []);

  const setPractitioner = useCallback((practitioner: Practitioner | null) => {
    dispatch({ type: 'SET_PRACTITIONER', payload: practitioner });
  }, []);

  const setDate = useCallback((date: string) => {
    dispatch({ type: 'SET_DATE', payload: date });
  }, []);

  const setTime = useCallback((time: string) => {
    dispatch({ type: 'SET_TIME', payload: time });
  }, []);

  const setPatientInfo = useCallback((info: PatientInfo) => {
    dispatch({ type: 'SET_PATIENT_INFO', payload: info });
  }, []);

  const goToStep = useCallback((step: BookingStep) => {
    dispatch({ type: 'GO_TO_STEP', payload: step });
  }, []);

  const nextStep = useCallback(() => {
    dispatch({ type: 'NEXT_STEP' });
  }, []);

  const prevStep = useCallback(() => {
    dispatch({ type: 'PREV_STEP' });
  }, []);

  const reset = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  const currentStepNumber = STEP_ORDER.indexOf(state.currentStep) + 1;
  const totalSteps = STEP_ORDER.length - 1; // 'complete' は含めない

  const value: BookingContextValue = {
    state,
    setMenu,
    setPractitioner,
    setDate,
    setTime,
    setPatientInfo,
    goToStep,
    nextStep,
    prevStep,
    reset,
    currentStepNumber,
    totalSteps,
  };

  return React.createElement(BookingContext.Provider, { value }, children);
}

// -----------------------------------------------------------------------------
// Hook
// -----------------------------------------------------------------------------

/**
 * 予約フローの状態と操作を取得するフック。
 *
 * BookingProvider の子コンポーネント内でのみ使用可能。
 *
 * @example
 * ```tsx
 * 'use client';
 * import { useBooking } from '@/lib/booking-store';
 *
 * function MenuSelection() {
 *   const { state, setMenu } = useBooking();
 *   // ...
 * }
 * ```
 */
export function useBooking(): BookingContextValue {
  const context = useContext(BookingContext);
  if (!context) {
    throw new Error(
      'useBooking must be used within a BookingProvider. ' +
      'Wrap your component tree with <BookingProvider>.'
    );
  }
  return context;
}
