"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import Link from "next/link"
import { Search, Loader2, Filter, WifiOff, AlertCircle } from "lucide-react"
import { getOfflineJournals, deleteJournal } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

type Journal = {
  id: string
  date: string
  day_type?: string
  dayType?: string
  class_name?: string
  className?: string
  daily_rep_1?: string
  daily_rep_2?: string
  dailyRep?: string[]
  weather: string
  created_at?: string
  isOffline?: boolean
}

// クラス定義
const dayClasses = [
  { id: "1a", name: "1年Aクラス" },
  { id: "1b", name: "1年Bクラス" },
  { id: "2a", name: "2年Aクラス" },
  { id: "2b", name: "2年Bクラス" },
  { id: "3a", name: "3年Aクラス" },
  { id: "3b", name: "3年Bクラス" },
]

const nightClasses = [
  { id: "1n", name: "1年Nクラス" },
  { id: "2n", name: "2年Nクラス" },
  { id: "3n", name: "3年Nクラス" },
]

const allClasses = [...dayClasses, ...nightClasses]

// サンプルデータ（Supabaseへの接続が完全に失敗した場合のフォールバック）
const sampleJournals: Journal[] = [
  {
    id: "sample-1",
    date: "2025-04-15",
    day_type: "day",
    class_name: "1a",
    daily_rep_1: "山田太郎",
    daily_rep_2: "佐藤花子",
    weather: "sunny",
    created_at: "2025-04-15T10:00:00Z",
    isOffline: true,
  },
  {
    id: "sample-2",
    date: "2025-04-14",
    day_type: "night",
    class_name: "2n",
    daily_rep_1: "鈴木一郎",
    daily_rep_2: "",
    weather: "rainy",
    created_at: "2025-04-14T18:30:00Z",
    isOffline: true,
  },
]

export default function JournalsPage() {
  const { toast } = useToast()
  const router = useRouter()
  const [journals, setJournals] = useState<Journal[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [connectionError, setConnectionError] = useState<boolean>(false)

  // フィルター用の状態
  const [dayTypeFilter, setDayTypeFilter] = useState<string>("all") // "all", "day", "night"
  const [classFilter, setClassFilter] = useState<string>("all") // "all" または特定のクラスID
  const [showFilterDialog, setShowFilterDialog] = useState(false)

  // 日誌データの取得
  useEffect(() => {
    const fetchJournals = async () => {
      try {
        setIsLoading(true)
        console.log("日誌データを取得中...")

        // まずオフラインデータを取得して表示（オフラインファーストアプローチ）
        const offlineData = getOfflineJournals()
        console.log("オフラインデータ:", offlineData)

        // オフラインデータを処理して表示
        const processedOfflineData = offlineData.map((journal: any) => ({
          id: journal.id,
          date: journal.date,
          day_type: journal.day_type || journal.dayType,
          class_name: journal.class_name || journal.className,
          daily_rep_1: journal.daily_rep_1 || (journal.dailyRep && journal.dailyRep[0]) || "",
          daily_rep_2: journal.daily_rep_2 || (journal.dailyRep && journal.dailyRep[1]) || "",
          weather: journal.weather,
          created_at: journal.created_at || new Date().toISOString(),
          isOffline: true,
        }))

        // オフラインデータがない場合はサンプルデータを使用
        if (processedOfflineData.length === 0) {
          console.log("オフラインデータがないため、サンプルデータを使用します")
          setJournals(sampleJournals)
          setConnectionError(true)
        } else {
          setJournals(processedOfflineData)
        }

        // バックグラウンドでSupabaseからのデータ取得を試みる
        try {
          // Supabaseからのデータ取得を試みる（ここでは直接APIを呼び出す）
          const response = await fetch("/api/journals")

          if (!response.ok) {
            throw new Error(`APIエラー: ${response.status}`)
          }

          const onlineData = await response.json()
          console.log("オンラインデータ:", onlineData)

          if (Array.isArray(onlineData) && onlineData.length > 0) {
            // オンラインデータを処理
            const processedOnlineData = onlineData.map((journal: any) => ({
              id: journal.id,
              date: journal.date,
              day_type: journal.day_type,
              class_name: journal.class_name,
              daily_rep_1: journal.daily_rep_1 || "",
              daily_rep_2: journal.daily_rep_2 || "",
              weather: journal.weather,
              created_at: journal.created_at,
              isOffline: false,
            }))

            // オンラインデータとオフラインデータを結合
            const combinedData = [
              ...processedOnlineData,
              ...processedOfflineData.filter((offlineJournal) => !offlineJournal.id.startsWith("offline_")),
            ]

            // 日付でソート
            combinedData.sort((a, b) => {
              return new Date(b.date).getTime() - new Date(a.date).getTime()
            })

            setJournals(combinedData)
            setConnectionError(false)
          }
        } catch (onlineError) {
          console.error("オンラインデータの取得エラー:", onlineError)
          setConnectionError(true)
          // オンラインデータの取得に失敗しても、すでにオフラインデータを表示しているので
          // ユーザーエクスペリエンスは維持される
        }
      } catch (error) {
        console.error("日誌データの取得エラー:", error)
        toast({
          title: "エラー",
          description: "日誌データの取得に失敗しました。サンプルデータを表示します。",
          variant: "destructive",
        })

        // 完全に失敗した場合はサンプルデータを使用
        setJournals(sampleJournals)
        setConnectionError(true)
      } finally {
        setIsLoading(false)
      }
    }

    fetchJournals()
  }, [toast])

  // 日誌の削除
  const handleDelete = async (id: string) => {
    if (window.confirm("この日誌を削除してもよろしいですか？")) {
      setIsDeleting(id)
      try {
        // サンプルデータの場合は単にUIから削除
        if (id.startsWith("sample-")) {
          setJournals(journals.filter((journal) => journal.id !== id))
          toast({
            title: "削除完了",
            description: "日誌が削除されました",
          })
          return
        }

        const success = await deleteJournal(id)
        if (success) {
          setJournals(journals.filter((journal) => journal.id !== id))
          toast({
            title: "削除完了",
            description: "日誌が削除されました",
          })
        } else {
          toast({
            title: "エラー",
            description: "日誌の削除に失敗しました",
            variant: "destructive",
          })
        }
      } catch (error) {
        console.error("削除エラー:", error)
        toast({
          title: "エラー",
          description: "日誌の削除中にエラーが発生しました",
          variant: "destructive",
        })
      } finally {
        setIsDeleting(null)
      }
    }
  }

  // 検索処理
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    // 実際のアプリでは、ここでAPIを呼び出して検索結果を取得
    // このデモでは、クライアントサイドでフィルタリング
  }

  // フィルターをリセット
  const resetFilters = () => {
    setDayTypeFilter("all")
    setClassFilter("all")
    setShowFilterDialog(false)

    toast({
      title: "フィルターをリセットしました",
      description: "すべての区分とクラスが表示されます",
    })
  }

  // 検索とフィルタリング
  const filteredJournals = journals.filter((journal) => {
    const searchLower = searchTerm.toLowerCase()
    const matchesSearch =
      journal.date?.toLowerCase().includes(searchLower) ||
      journal.daily_rep_1?.toLowerCase().includes(searchLower) ||
      journal.daily_rep_2?.toLowerCase().includes(searchLower) ||
      getClassName(journal.class_name || "")
        .toLowerCase()
        .includes(searchLower)

    // 区分フィルター
    const journalDayType = journal.day_type || journal.dayType
    const matchesDayType = dayTypeFilter === "all" || journalDayType === dayTypeFilter

    // クラスフィルター
    const journalClassName = journal.class_name || journal.className
    const matchesClass = classFilter === "all" || journalClassName === classFilter

    return matchesSearch && matchesDayType && matchesClass
  })

  // クラス名の取得
  const getClassName = (classId: string) => {
    if (!classId) return "不明なクラス"
    const foundClass = allClasses.find((cls) => cls.id === classId)
    return foundClass ? foundClass.name : classId
  }

  // 天気の表示
  const getWeatherDisplay = (weather: string) => {
    switch (weather) {
      case "sunny":
        return "晴れ"
      case "cloudy":
        return "曇り"
      case "rainy":
        return "雨"
      default:
        return weather
    }
  }

  // 日付の表示形式変換
  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr)
      return date.toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" })
    } catch (e) {
      return dateStr
    }
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">日直日誌一覧</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowFilterDialog(true)}>
            <Filter className="h-4 w-4 mr-2" />
            フィルター
          </Button>
          <Link href="/">
            <Button>新規作成</Button>
          </Link>
        </div>
      </div>

      {connectionError && (
        <Alert variant="warning" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>接続エラー</AlertTitle>
          <AlertDescription>
            サーバーに接続できませんでした。オフラインモードで表示しています。
            {journals.some((j) => j.id.startsWith("sample-")) && " サンプルデータを表示しています。"}
          </AlertDescription>
        </Alert>
      )}

      {/* フィルターダイアログ */}
      <Dialog open={showFilterDialog} onOpenChange={setShowFilterDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>フィルター設定</DialogTitle>
            <DialogDescription>表示する日誌の条件を設定してください</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="day-type-filter">区分</Label>
              <Select value={dayTypeFilter} onValueChange={setDayTypeFilter}>
                <SelectTrigger id="day-type-filter">
                  <SelectValue placeholder="区分を選択" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべて</SelectItem>
                  <SelectItem value="day">昼間部</SelectItem>
                  <SelectItem value="night">夜間部</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="class-filter">クラス</Label>
              <Select value={classFilter} onValueChange={setClassFilter}>
                <SelectTrigger id="class-filter">
                  <SelectValue placeholder="クラスを選択" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべてのクラス</SelectItem>
                  <SelectItem value="divider" disabled>
                    --- 昼間部 ---
                  </SelectItem>
                  {dayClasses.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.name}
                    </SelectItem>
                  ))}
                  <SelectItem value="divider2" disabled>
                    --- 夜間部 ---
                  </SelectItem>
                  {nightClasses.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-between">
            <Button variant="outline" onClick={resetFilters}>
              リセット
            </Button>
            <Button onClick={() => setShowFilterDialog(false)}>適用</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>検索</CardTitle>
          <CardDescription>日付や日直名で検索できます</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="検索..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button type="submit">検索</Button>
          </form>
          {/* フィルター表示エリア */}
          {(dayTypeFilter !== "all" || classFilter !== "all") && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <div className="text-sm text-muted-foreground">フィルター:</div>
              {dayTypeFilter !== "all" && (
                <div className="bg-secondary text-secondary-foreground px-2 py-1 rounded-full text-sm flex items-center">
                  {dayTypeFilter === "day" ? "昼間部" : "夜間部"}
                </div>
              )}
              {classFilter !== "all" && (
                <div className="bg-secondary text-secondary-foreground px-2 py-1 rounded-full text-sm flex items-center">
                  {getClassName(classFilter)}
                </div>
              )}
              <Button variant="ghost" size="sm" onClick={resetFilters} className="h-7 px-2">
                リセット
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>日誌一覧</CardTitle>
          {filteredJournals.length > 0 && (
            <CardDescription>{filteredJournals.length}件の日誌が見つかりました</CardDescription>
          )}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2">データを読み込み中...</span>
            </div>
          ) : filteredJournals.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm || dayTypeFilter !== "all" || classFilter !== "all"
                ? "検索条件に一致する日誌がありません"
                : "日誌データがありません"}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>日付</TableHead>
                    <TableHead>区分</TableHead>
                    <TableHead>クラス</TableHead>
                    <TableHead>日直</TableHead>
                    <TableHead>天気</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredJournals.map((journal) => (
                    <TableRow key={journal.id}>
                      <TableCell>{formatDate(journal.date)}</TableCell>
                      <TableCell>
                        {(journal.day_type || journal.dayType) === "day" ? "昼間部" : "夜間部"}
                        {journal.isOffline && (
                          <span className="ml-2 inline-flex items-center">
                            <WifiOff className="h-3 w-3 text-amber-500 mr-1" />
                            <span className="text-xs text-amber-500">オフライン</span>
                          </span>
                        )}
                      </TableCell>
                      <TableCell>{getClassName(journal.class_name || journal.className || "")}</TableCell>
                      <TableCell>
                        {[
                          journal.daily_rep_1 || (journal.dailyRep && journal.dailyRep[0]),
                          journal.daily_rep_2 || (journal.dailyRep && journal.dailyRep[1]),
                        ]
                          .filter(Boolean)
                          .join(", ")}
                      </TableCell>
                      <TableCell>{getWeatherDisplay(journal.weather)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Link href={`/journals/${journal.id}`}>
                            <Button variant="outline" size="sm">
                              詳細
                            </Button>
                          </Link>
                          <Link href={`/journals/${journal.id}/edit`}>
                            <Button variant="outline" size="sm">
                              編集
                            </Button>
                          </Link>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDelete(journal.id)}
                            disabled={isDeleting === journal.id}
                          >
                            {isDeleting === journal.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "削除"}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
