import { createClient } from "@supabase/supabase-js"

// 環境変数からSupabaseの接続情報を取得
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""

// Supabaseクライアントの作成
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

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

// 日誌データの取得
export async function getJournals() {
  const { data, error } = await supabase.from("journals").select("*").order("date", { ascending: false })

  if (error) {
    console.error("日誌データの取得エラー:", error)
    return []
  }

  return data
}

// 特定の日誌データの取得
export async function getJournalById(id: string) {
  // 日誌の基本情報を取得
  const { data: journal, error: journalError } = await supabase.from("journals").select("*").eq("id", id).single()

  if (journalError) {
    console.error("日誌データの取得エラー:", journalError)
    return null
  }

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

  // 日誌データを整形して返す
  return {
    ...journal,
    periods: periods || [],
    checklist: checklist || {
      pc: false,
      mic: false,
      prints: false,
      journal: false,
      supplies: false,
    },
  }
}

// 日誌データの保存
export async function saveJournal(journalData: any) {
  try {
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
    const { data: journal, error: journalError } = await supabase.from("journals").insert([journalToSave]).select()

    if (journalError) {
      console.error("日誌データの保存エラー:", journalError)
      return null
    }

    if (!journal || journal.length === 0) {
      console.error("日誌データが正常に保存されませんでした")
      return null
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
        return null
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
      return null
    }

    console.log("すべてのデータが正常に保存されました")
    return journalId
  } catch (error) {
    console.error("保存処理中の予期せぬエラー:", error)
    return null
  }
}

// 日誌データの更新
export async function updateJournal(id: string, journalData: any) {
  try {
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
  try {
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
