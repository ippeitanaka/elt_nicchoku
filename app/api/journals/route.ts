import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// APIルートハンドラー
export async function GET() {
  try {
    // 環境変数からSupabaseの接続情報を取得
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    // 環境変数のチェック
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: "Supabase接続情報が設定されていません" }, { status: 500 })
    }

    // Supabaseクライアントの初期化
    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    // 日誌データの取得
    const { data, error } = await supabase.from("journals").select("*").order("created_at", { ascending: false })

    if (error) {
      console.error("日誌データの取得エラー:", error)
      return NextResponse.json({ error: `データ取得エラー: ${error.message}` }, { status: 500 })
    }

    // 成功時はデータを返す
    return NextResponse.json(data || [])
  } catch (error) {
    console.error("APIエラー:", error)
    return NextResponse.json(
      { error: `予期せぬエラーが発生しました: ${error instanceof Error ? error.message : "不明なエラー"}` },
      { status: 500 },
    )
  }
}
