import { createClient } from "@supabase/supabase-js"

// 環境変数からSupabaseの接続情報を取得
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// デバッグ情報（環境変数の存在確認）
console.log("Supabase URL exists:", !!supabaseUrl)
console.log("Supabase Anon Key exists:", !!supabaseAnonKey)

// Supabaseクライアントの作成（シングルトンパターン）
let supabaseInstance: ReturnType<typeof createClient> | null = null

export function getSupabase() {
  if (!supabaseInstance && supabaseUrl && supabaseAnonKey) {
    try {
      supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: false,
        },
      })
      console.log("Supabaseクライアントが初期化されました")
    } catch (error) {
      console.error("Supabaseクライアントの初期化エラー:", error)
      return null
    }
  }
  return supabaseInstance
}

// ネットワーク接続のチェック
export async function checkNetworkConnection(): Promise<boolean> {
  try {
    // シンプルなネットワーク接続チェック
    await fetch("https://www.google.com", {
      mode: "no-cors",
      // 短いタイムアウトを設定
      signal: AbortSignal.timeout(3000),
    })
    return true
  } catch (error) {
    console.error("ネットワーク接続チェックエラー:", error)
    return false
  }
}

// Supabase接続テスト（シンプル版）
export async function testSupabaseConnection() {
  try {
    // まずネットワーク接続をチェック
    const isOnline = await checkNetworkConnection()
    if (!isOnline) {
      return {
        success: false,
        message: "ネットワーク接続がありません。オフラインモードで続行できます。",
        isOffline: true,
      }
    }

    // 環境変数のチェック
    if (!supabaseUrl || !supabaseAnonKey) {
      return {
        success: false,
        message: "Supabase接続情報が設定されていません。環境変数を確認してください。",
        isConfigError: true,
      }
    }

    // Supabaseクライアントの取得
    const supabase = getSupabase()
    if (!supabase) {
      return {
        success: false,
        message: "Supabaseクライアントの初期化に失敗しました。",
        isConfigError: true,
      }
    }

    // 接続テストは行わず、クライアントが初期化できたことだけを確認
    return {
      success: true,
      message: "Supabaseクライアントが正常に初期化されました。",
    }
  } catch (error) {
    console.error("Supabase接続テストエラー:", error)
    return {
      success: false,
      message: `Supabase接続テスト中にエラーが発生しました: ${error instanceof Error ? error.message : "不明なエラー"}`,
      error: error,
    }
  }
}

// 日誌データの型定義
export type Journal = {
  id?: string
  created_at?: string
  date: string
  weather: string
  day_type: string
  class_name: string
  daily_rep_1: string
  daily_rep_2: string
  next_daily_rep_1: string
  next_daily_rep_2: string
  daily_comment: string
  teacher_comment: string
  substitute?: string
  current_cleaning_duty?: string
  next_cleaning_duty?: string
}

export type Period = {
  id?: string
  journal_id: string
  period_number: number
  subject: string
  teacher: string
  content: string
  absences: string
  in_out: string
  is_night: boolean
}

// Checklistの型定義
export type Checklist = {
  id?: string
  journal_id: string
  pc: boolean
  mic: boolean
  prints: boolean
  journal: boolean
  supplies: boolean
}

// ローカルストレージ用のキー
const LOCAL_STORAGE_KEY = "daily_journal_offline_data"

// オフラインデータの保存
export function saveOfflineJournal(journalData: any): string {
  try {
    // ローカルストレージから既存のデータを取得
    const existingDataStr = localStorage.getItem(LOCAL_STORAGE_KEY)
    const existingData = existingDataStr ? JSON.parse(existingDataStr) : []

    // 新しい日誌データにIDを付与
    const newId = `offline_${Date.now()}`
    const journalWithId = {
      ...journalData,
      id: newId,
      created_at: new Date().toISOString(),
      isOffline: true,
    }

    // データを追加して保存
    existingData.push(journalWithId)
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(existingData))

    return newId
  } catch (error) {
    console.error("オフラインデータ保存エラー:", error)
    throw error
  }
}

// オフラインデータの取得
export function getOfflineJournals(): any[] {
  try {
    const dataStr = localStorage.getItem(LOCAL_STORAGE_KEY)
    return dataStr ? JSON.parse(dataStr) : []
  } catch (error) {
    console.error("オフラインデータ取得エラー:", error)
    return []
  }
}

// 日誌データの取得
export async function getJournals() {
  try {
    const supabase = getSupabase()
    if (!supabase) {
      console.error("Supabaseクライアントが初期化されていません")
      // オフラインデータを返す
      return getOfflineJournals()
    }

    try {
      // データ取得前にログを出力
      console.log("Supabaseからデータを取得しています...")

      const { data, error } = await supabase.from("journals").select("*").order("date", { ascending: false })

      if (error) {
        console.error("日誌データの取得エラー:", error)
        // エラー時はオフラインデータを返す
        return getOfflineJournals()
      }

      // 取得したデータをログ出力
      console.log("取得したデータ:", data)
      console.log("データ件数:", data ? data.length : 0)

      return data
    } catch (fetchError) {
      console.error("日誌データのフェッチエラー:", fetchError)
      // フェッチエラー時はオフラインデータを返す
      return getOfflineJournals()
    }
  } catch (error) {
    console.error("日誌データの取得中に予期せぬエラーが発生しました:", error)
    return getOfflineJournals()
  }
}

// 特定の日誌データの取得
export async function getJournalById(id: string) {
  // オフラインIDの場合はローカルストレージから取得
  if (id.startsWith("offline_")) {
    const offlineJournals = getOfflineJournals()
    return offlineJournals.find((journal) => journal.id === id) || null
  }

  try {
    const supabase = getSupabase()
    if (!supabase) {
      console.error("Supabaseクライアントが初期化されていません")
      return null
    }

    console.log(`ID: ${id} の日誌データを取得中...`)

    // 日誌の基本情報を取得
    const { data: journal, error: journalError } = await supabase.from("journals").select("*").eq("id", id).single()

    if (journalError) {
      console.error("日誌データの取得エラー:", journalError)
      return null
    }

    console.log("取得した日誌データ:", journal)

    // 講義情報を取得
    const { data: periods, error: periodsError } = await supabase
      .from("periods")
      .select("*")
      .eq("journal_id", id)
      .order("period_number", { ascending: true })

    if (periodsError) {
      console.error("講義情報の取得エラー:", periodsError)
      return null
    }

    console.log("取得した講義情報:", periods)

    // 文字列の"true"/"false"をブール値に変換
    const processedPeriods = periods
      ? periods.map((period) => ({
          ...period,
          is_night: period.is_night === "true" || period.is_night === true,
        }))
      : []

    // チェックリスト情報を取得
    const { data: checklist, error: checklistError } = await supabase
      .from("checklists")
      .select("*")
      .eq("journal_id", id)
      .single()

    if (checklistError && checklistError.code !== "PGRST116") {
      // PGRST116はデータが見つからない場合のエラーコード
      console.error("チェックリスト情報の取得エラー:", checklistError)
      return null
    }

    console.log("取得したチェックリスト情報:", checklist)

    // 文字列の"true"/"false"をブール値に変換
    const processedChecklist = checklist
      ? {
          ...checklist,
          pc: checklist.pc === "true" || checklist.pc === true,
          mic: checklist.mic === "true" || checklist.mic === true,
          prints: checklist.prints === "true" || checklist.prints === true,
          journal: checklist.journal === "true" || checklist.journal === true,
          supplies: checklist.supplies === "true" || checklist.supplies === true,
        }
      : {
          pc: false,
          mic: false,
          prints: false,
          journal: false,
          supplies: false,
        }

    // 日誌データを整形して返す
    return {
      ...journal,
      periods: processedPeriods,
      checklist: processedChecklist,
    }
  } catch (error) {
    console.error("日誌データの取得中に予期せぬエラーが発生しました:", error)
    return null
  }
}

// 日誌データの保存
export async function saveJournal(journalData: any, isOfflineMode = false) {
  // オフラインモードの場合はローカルストレージに保存
  if (isOfflineMode) {
    return saveOfflineJournal(journalData)
  }

  try {
    const supabase = getSupabase()
    if (!supabase) {
      console.error("Supabaseクライアントが初期化されていません")
      // オフラインモードに切り替え
      return saveOfflineJournal(journalData)
    }

    console.log("Supabaseに保存を開始します:", journalData)

    // 1. 日誌の基本情報を保存
    const journalToSave: Journal = {
      date: journalData.date,
      weather: journalData.weather,
      day_type: journalData.dayType,
      class_name: journalData.className,
      daily_rep_1: journalData.dailyRep[0] || "",
      daily_rep_2: journalData.dailyRep[1] || "",
      next_daily_rep_1: journalData.nextDailyRep[0] || "",
      next_daily_rep_2: journalData.nextDailyRep[1] || "",
      daily_comment: journalData.dailyComment,
      teacher_comment: journalData.teacherComment,
      substitute: journalData.substitute || "",
      current_cleaning_duty: journalData.currentCleaningDuty || "",
      next_cleaning_duty: journalData.nextCleaningDuty || "",
    }

    console.log("保存する日誌データ:", journalToSave)

    try {
      const { data: journal, error: journalError } = await supabase.from("journals").insert([journalToSave]).select()

      if (journalError) {
        console.error("日誌データの保存エラー:", journalError)
        // エラー時はオフラインモードに切り替え
        return saveOfflineJournal(journalData)
      }

      if (!journal || journal.length === 0) {
        console.error("日誌データが正常に保存されませんでした")
        return saveOfflineJournal(journalData)
      }

      const journalId = journal[0].id
      console.log("保存された日誌ID:", journalId)

      // 2. 講義情報を保存
      const periodsToSave: Period[] = []

      // 昼間部の講義情報
      journalData.dayPeriods.forEach((period: any, index: number) => {
        if (period.subject || period.teacher || period.content || period.absences || period.inOut) {
          periodsToSave.push({
            journal_id: journalId,
            period_number: index + 1,
            subject: period.subject || "",
            teacher: period.teacher || "",
            content: period.content || "",
            absences: period.absences || "",
            in_out: period.inOut || "",
            is_night: false,
          })
        }
      })

      // 夜間部の講義情報
      journalData.nightPeriods.forEach((period: any, index: number) => {
        if (period.subject || period.teacher || period.content || period.absences || period.inOut) {
          periodsToSave.push({
            journal_id: journalId,
            period_number: index + 1,
            subject: period.subject || "",
            teacher: period.teacher || "",
            content: period.content || "",
            absences: period.absences || "",
            in_out: period.inOut || "",
            is_night: true,
          })
        }
      })

      console.log("保存する講義データ:", periodsToSave)
      if (periodsToSave.length > 0) {
        const { error: periodsError } = await supabase.from("periods").insert(periodsToSave)

        if (periodsError) {
          console.error("講義情報の保存エラー:", periodsError)
          // エラーが発生した場合は、既に保存した日誌データを削除
          await supabase.from("journals").delete().eq("id", journalId)
          return saveOfflineJournal(journalData)
        }
      }

      // 3. チェックリスト情報を保存
      const checklistToSave: Checklist = {
        journal_id: journalId,
        pc: journalData.checklist.pc || false,
        mic: journalData.checklist.mic || false,
        prints: journalData.checklist.prints || false,
        journal: journalData.checklist.journal || false,
        supplies: journalData.checklist.supplies || false,
      }

      console.log("保存するチェックリストデータ:", checklistToSave)
      const { error: checklistError } = await supabase.from("checklists").insert([checklistToSave])

      if (checklistError) {
        console.error("チェックリスト情報の保存エラー:", checklistError)
        // エラーが発生した場合は、既に保存したデータを削除
        await supabase.from("journals").delete().eq("id", journalId)
        return saveOfflineJournal(journalData)
      }

      console.log("すべてのデータが正常に保存されました")
      return journalId
    } catch (fetchError) {
      console.error("データ保存中のフェッチエラー:", fetchError)
      return saveOfflineJournal(journalData)
    }
  } catch (error) {
    console.error("保存処理中の予期せぬエラー:", error)
    return saveOfflineJournal(journalData)
  }
}

// 日誌データの更新
export async function updateJournal(id: string, journalData: any) {
  // オフラインIDの場合はローカルストレージを更新
  if (id.startsWith("offline_")) {
    try {
      const offlineJournals = getOfflineJournals()
      const updatedJournals = offlineJournals.map((journal) =>
        journal.id === id ? { ...journal, ...journalData, updated_at: new Date().toISOString() } : journal,
      )
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedJournals))
      return true
    } catch (error) {
      console.error("オフラインデータ更新エラー:", error)
      return false
    }
  }

  try {
    const supabase = getSupabase()
    if (!supabase) {
      console.error("Supabaseクライアントが初期化されていません")
      return false
    }

    // 1. 日誌の基本情報を更新
    const journalToUpdate: Partial<Journal> = {
      date: journalData.date,
      weather: journalData.weather,
      day_type: journalData.dayType,
      class_name: journalData.className,
      daily_rep_1: journalData.dailyRep[0] || "",
      daily_rep_2: journalData.dailyRep[1] || "",
      next_daily_rep_1: journalData.nextDailyRep[0] || "",
      next_daily_rep_2: journalData.nextDailyRep[1] || "",
      daily_comment: journalData.dailyComment,
      teacher_comment: journalData.teacherComment,
      substitute: journalData.substitute || "",
      current_cleaning_duty: journalData.currentCleaningDuty || "",
      next_cleaning_duty: journalData.nextCleaningDuty || "",
    }

    const { error: journalError } = await supabase.from("journals").update(journalToUpdate).eq("id", id)

    if (journalError) {
      console.error("日誌データの更新エラー:", journalError)
      return false
    }

    // 2. 既存の講義情報を削除
    const { error: deletePeriodsError } = await supabase.from("periods").delete().eq("journal_id", id)

    if (deletePeriodsError) {
      console.error("講義情報の削除エラー:", deletePeriodsError)
      return false
    }

    // 3. 新しい講義情報を保存
    const periodsToSave: Period[] = []

    // 昼間部の講義情報
    journalData.dayPeriods.forEach((period: any, index: number) => {
      if (period.subject || period.teacher || period.content || period.absences || period.inOut) {
        periodsToSave.push({
          journal_id: id,
          period_number: index + 1,
          subject: period.subject || "",
          teacher: period.teacher || "",
          content: period.content || "",
          absences: period.absences || "",
          in_out: period.inOut || "",
          is_night: false,
        })
      }
    })

    // 夜間部の講義情報
    journalData.nightPeriods.forEach((period: any, index: number) => {
      if (period.subject || period.teacher || period.content || period.absences || period.inOut) {
        periodsToSave.push({
          journal_id: id,
          period_number: index + 1,
          subject: period.subject || "",
          teacher: period.teacher || "",
          content: period.content || "",
          absences: period.absences || "",
          in_out: period.inOut || "",
          is_night: true,
        })
      }
    })

    if (periodsToSave.length > 0) {
      const { error: periodsError } = await supabase.from("periods").insert(periodsToSave)

      if (periodsError) {
        console.error("講義情報の保存エラー:", periodsError)
        return false
      }
    }

    // 4. チェックリスト情報を更新
    const checklistToUpdate: Partial<Checklist> = {
      pc: journalData.checklist.pc || false,
      mic: journalData.checklist.mic || false,
      prints: journalData.checklist.prints || false,
      journal: journalData.checklist.journal || false,
      supplies: journalData.checklist.supplies || false,
    }

    const { error: checklistError } = await supabase.from("checklists").update(checklistToUpdate).eq("journal_id", id)

    if (checklistError) {
      console.error("チェックリスト情報の更新エラー:", checklistError)
      return false
    }

    return true
  } catch (error) {
    console.error("更新処理中の予期せぬエラー:", error)
    return false
  }
}

// 日誌データの削除
export async function deleteJournal(id: string) {
  // オフラインIDの場合はローカルストレージから削除
  if (id.startsWith("offline_")) {
    try {
      const offlineJournals = getOfflineJournals()
      const filteredJournals = offlineJournals.filter((journal) => journal.id !== id)
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(filteredJournals))
      return true
    } catch (error) {
      console.error("オフラインデータ削除エラー:", error)
      return false
    }
  }

  try {
    const supabase = getSupabase()
    if (!supabase) {
      console.error("Supabaseクライアントが初期化されていません")
      return false
    }

    // 関連するデータを削除
    await supabase.from("periods").delete().eq("journal_id", id)
    await supabase.from("checklists").delete().eq("journal_id", id)

    // 日誌データを削除
    const { error } = await supabase.from("journals").delete().eq("id", id)

    if (error) {
      console.error("日誌データの削除エラー:", error)
      return false
    }

    return true
  } catch (error) {
    console.error("削除処理中の予期せぬエラー:", error)
    return false
  }
}
