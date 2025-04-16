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

// ネットワーク接続のチェック関数を改善
export async function checkNetworkConnection(): Promise<boolean> {
  try {
    // より信頼性の高いネットワークチェック
    // 複数のURLを試す
    const urls = ["https://www.google.com", "https://www.cloudflare.com", "https://www.apple.com"]

    // いずれかのURLに接続できればオンラインと判断
    for (const url of urls) {
      try {
        const response = await fetch(url, {
          method: "HEAD",
          mode: "no-cors",
          cache: "no-store",
          signal: AbortSignal.timeout(2000), // 2秒でタイムアウト
        })

        if (response) {
          return true
        }
      } catch (e) {
        console.log(`${url}への接続に失敗: ${e}`)
        // このURLへの接続は失敗したが、次のURLを試す
        continue
      }
    }

    // すべてのURLへの接続が失敗した場合
    console.error("すべてのネットワーク接続チェックに失敗しました")
    return false
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

// 日誌データの取得 - APIルートを使用するため、この関数は使用しない
export async function getJournals() {
  // この関数はAPIルートに置き換えられるため、
  // 単純にオフラインデータを返すだけにする
  return getOfflineJournals()
}

// 特定の日誌データの取得
export async function getJournalById(id: string) {
  // オフラインIDの場合はローカルストレージから取得
  if (id.startsWith("offline_") || id.startsWith("sample-")) {
    const offlineJournals = getOfflineJournals()
    return offlineJournals.find((journal) => journal.id === id) || null
  }

  try {
    // APIルートを使用してデータを取得
    const response = await fetch(`/api/journals/${id}`)
    if (!response.ok) {
      throw new Error(`APIエラー: ${response.status}`)
    }

    return await response.json()
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
    // ネットワーク接続をチェック
    const isOnline = await checkNetworkConnection()
    if (!isOnline) {
      console.log("ネットワーク接続がないため、オフラインモードで保存します")
      return saveOfflineJournal(journalData)
    }

    // APIルートを使用してデータを保存
    const response = await fetch("/api/journals", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(journalData),
    })

    if (!response.ok) {
      throw new Error(`APIエラー: ${response.status}`)
    }

    const result = await response.json()
    return result.id
  } catch (error) {
    console.error("保存処理中の予期せぬエラー:", error)
    return saveOfflineJournal(journalData)
  }
}

// 日誌データの更新
export async function updateJournal(id: string, journalData: any) {
  // オフラインIDの場合はローカルストレージを更新
  if (id.startsWith("offline_") || id.startsWith("sample-")) {
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
    // ネットワーク接続をチェック
    const isOnline = await checkNetworkConnection()
    if (!isOnline) {
      console.log("ネットワーク接続がないため、更新できません")
      return false
    }

    // APIルートを使用してデータを更新
    const response = await fetch(`/api/journals/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(journalData),
    })

    if (!response.ok) {
      throw new Error(`APIエラー: ${response.status}`)
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
  if (id.startsWith("offline_") || id.startsWith("sample-")) {
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
    // ネットワーク接続をチェック
    const isOnline = await checkNetworkConnection()
    if (!isOnline) {
      console.log("ネットワーク接続がないため、削除できません")
      return false
    }

    // APIルートを使用してデータを削除
    const response = await fetch(`/api/journals/${id}`, {
      method: "DELETE",
    })

    if (!response.ok) {
      throw new Error(`APIエラー: ${response.status}`)
    }

    return true
  } catch (error) {
    console.error("削除処理中の予期せぬエラー:", error)
    return false
  }
}
