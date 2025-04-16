"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { ArrowLeft, Edit, Trash, Loader2, WifiOff } from "lucide-react"
import { getJournalById, deleteJournal } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"

export default function JournalDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { toast } = useToast()
  const journalId = params.id
  const [journal, setJournal] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isOfflineData, setIsOfflineData] = useState(false)

  // 日誌データの取得
  useEffect(() => {
    const fetchJournal = async () => {
      try {
        const data = await getJournalById(journalId)
        if (!data) {
          toast({
            title: "エラー",
            description: "日誌データが見つかりませんでした",
            variant: "destructive",
          })
          router.push("/journals")
          return
        }

        // オフラインデータかどうかを確認
        if (journalId.startsWith("offline_") || data.isOffline) {
          setIsOfflineData(true)

          // オフラインデータの場合、必要なプロパティを確保
          const processedData = {
            ...data,
            periods: data.periods || [], // periodsがない場合は空配列を設定
            checklist: data.checklist || {
              pc: false,
              mic: false,
              prints: false,
              journal: false,
              supplies: false,
            },
          }
          setJournal(processedData)
        } else {
          setJournal(data)
        }
      } catch (error) {
        console.error("日誌データの取得エラー:", error)
        toast({
          title: "エラー",
          description: "日誌データの取得に失敗しました",
          variant: "destructive",
        })
        router.push("/journals")
      } finally {
        setIsLoading(false)
      }
    }

    fetchJournal()
  }, [journalId, router, toast])

  // 日誌の削除
  const handleDelete = async () => {
    if (window.confirm("この日誌を削除してもよろしいですか？")) {
      setIsDeleting(true)
      try {
        const success = await deleteJournal(journalId)
        if (success) {
          toast({
            title: "削除完了",
            description: "日誌が削除されました",
          })
          router.push("/journals")
        } else {
          toast({
            title: "エラー",
            description: "日誌の削除に失敗しました",
            variant: "destructive",
          })
          setIsDeleting(false)
        }
      } catch (error) {
        console.error("削除エラー:", error)
        toast({
          title: "エラー",
          description: "日誌の削除中にエラーが発生しました",
          variant: "destructive",
        })
        setIsDeleting(false)
      }
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4 text-center">
        <div className="flex justify-center items-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">データを読み込み中...</span>
        </div>
      </div>
    )
  }

  if (!journal) {
    return (
      <div className="container mx-auto py-8 px-4 text-center">
        <p>日誌データが見つかりませんでした</p>
        <Link href="/journals">
          <Button className="mt-4">日誌一覧に戻る</Button>
        </Link>
      </div>
    )
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

  // クラス名の取得
  const getClassName = (classId: string) => {
    const allClasses = [
      { id: "1a", name: "1年Aクラス" },
      { id: "1b", name: "1年Bクラス" },
      { id: "2a", name: "2年Aクラス" },
      { id: "2b", name: "2年Bクラス" },
      { id: "3a", name: "3年Aクラス" },
      { id: "3b", name: "3年Bクラス" },
      { id: "1n", name: "1年Nクラス" },
      { id: "2n", name: "2年Nクラス" },
      { id: "3n", name: "3年Nクラス" },
    ]

    const foundClass = allClasses.find((cls) => cls.id === classId)
    return foundClass ? foundClass.name : classId
  }

  // オフラインデータの場合の講義情報の処理
  let dayPeriods = []
  let nightPeriods = []
  let displayPeriods = []

  if (isOfflineData) {
    // オフラインデータの場合、dayPeriodsとnightPeriodsを直接取得
    dayPeriods = journal.dayPeriods || []
    nightPeriods = journal.nightPeriods || []

    // 表示する講義情報
    displayPeriods = journal.dayType === "day" ? dayPeriods : nightPeriods
  } else {
    // オンラインデータの場合、従来の処理
    dayPeriods = journal.periods
      .filter((p: any) => !p.is_night)
      .sort((a: any, b: any) => a.period_number - b.period_number)

    nightPeriods = journal.periods
      .filter((p: any) => p.is_night)
      .sort((a: any, b: any) => a.period_number - b.period_number)

    // 表示する講義情報
    displayPeriods = journal.day_type === "day" ? dayPeriods : nightPeriods
  }

  // 時限ごとの時間帯
  const getTimeSlot = (periodNumber: number, isNight: boolean) => {
    if (isNight) {
      const nightTimeSlots = ["18:00～19:30", "19:40～21:10"]
      return nightTimeSlots[periodNumber - 1] || ""
    } else {
      const dayTimeSlots = ["9:10～10:40", "10:50～12:20", "13:20～14:50", "15:00～16:30"]
      return dayTimeSlots[periodNumber - 1] || ""
    }
  }

  const checklistItems = [
    { id: "pc", label: "パソコン、プロジェクター" },
    { id: "mic", label: "マイク(電池)" },
    { id: "prints", label: "授業プリント準備" },
    { id: "journal", label: "日直日誌、座席表" },
    { id: "supplies", label: "おしぼり、チョーク" },
  ]

  // オフラインデータの場合のプロパティ名の調整
  const dayType = isOfflineData ? journal.dayType : journal.day_type
  const className = isOfflineData ? journal.className : journal.class_name
  const dailyRep1 = isOfflineData ? journal.dailyRep && journal.dailyRep[0] : journal.daily_rep_1
  const dailyRep2 = isOfflineData ? journal.dailyRep && journal.dailyRep[1] : journal.daily_rep_2
  const nextDailyRep1 = isOfflineData ? journal.nextDailyRep && journal.nextDailyRep[0] : journal.next_daily_rep_1
  const nextDailyRep2 = isOfflineData ? journal.nextDailyRep && journal.nextDailyRep[1] : journal.next_daily_rep_2
  const dailyComment = isOfflineData ? journal.dailyComment : journal.daily_comment
  const teacherComment = isOfflineData ? journal.teacherComment : journal.teacher_comment
  const currentCleaningDuty = isOfflineData ? journal.currentCleaningDuty : journal.current_cleaning_duty
  const nextCleaningDuty = isOfflineData ? journal.nextCleaningDuty : journal.next_cleaning_duty

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <Link href="/journals">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">日誌詳細</h1>
          {isOfflineData && (
            <div className="bg-amber-100 text-amber-800 px-2 py-1 rounded-full text-xs flex items-center">
              <WifiOff className="h-3 w-3 mr-1" />
              オフラインデータ
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Link href={`/journals/${journalId}/edit`}>
            <Button variant="outline">
              <Edit className="h-4 w-4 mr-2" />
              編集
            </Button>
          </Link>
          <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
            {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash className="h-4 w-4 mr-2" />}
            削除
          </Button>
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>基本情報</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">日付</p>
              <p className="font-medium">{formatDate(journal.date)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">天気</p>
              <p className="font-medium">{getWeatherDisplay(journal.weather)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">クラス</p>
              <p className="font-medium">{getClassName(className)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">日直</p>
              <p className="font-medium">{[dailyRep1, dailyRep2].filter(Boolean).join(", ")}</p>
            </div>
            <div className="md:col-span-2 lg:col-span-4">
              <p className="text-sm text-muted-foreground">本日の清掃担当班</p>
              <p className="font-medium">{currentCleaningDuty || "未設定"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{dayType === "day" ? "昼間部" : "夜間部"} 講義情報</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {displayPeriods.length > 0 ? (
              displayPeriods.map((period: any, index: number) => {
                // オフラインデータとオンラインデータで異なるプロパティ名を処理
                const periodNumber = isOfflineData ? index + 1 : period.period_number
                const isNight = isOfflineData ? dayType === "night" : period.is_night
                const subject = period.subject || ""
                const teacher = period.teacher || ""
                const content = period.content || ""
                const absences = isOfflineData ? period.absences : period.absences || ""
                const inOut = isOfflineData ? period.inOut : period.in_out || ""

                return (
                  <div key={index} className="border p-4 rounded-lg">
                    <div className="font-medium mb-2">
                      {periodNumber}時限 ({getTimeSlot(periodNumber, isNight)})
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">科目名</p>
                        <p>{subject || "未入力"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">担当講師</p>
                        <p>{teacher || "未入力"}</p>
                      </div>
                      <div className="md:col-span-2">
                        <p className="text-sm text-muted-foreground">講義内容</p>
                        <p>{content || "未入力"}</p>
                      </div>
                      <div className="md:col-span-2">
                        <p className="text-sm text-muted-foreground">欠席者</p>
                        <p>{absences || "なし"}</p>
                      </div>
                      <div className="md:col-span-2">
                        <p className="text-sm text-muted-foreground">途中入退室者</p>
                        <p>{inOut || "なし"}</p>
                      </div>
                    </div>
                  </div>
                )
              })
            ) : (
              <p className="text-center py-4 text-muted-foreground">講義情報がありません</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>コメント</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">日直コメント</p>
              <p>{dailyComment || "コメントなし"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">担任コメント</p>
              <p>{teacherComment || "コメントなし"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>日直の業務チェックリスト</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {checklistItems.map((item) => (
              <div key={item.id} className="flex items-center gap-2">
                <div
                  className={`w-5 h-5 rounded-sm border flex items-center justify-center ${
                    journal.checklist && journal.checklist[item.id]
                      ? "bg-primary text-primary-foreground"
                      : "bg-background"
                  }`}
                >
                  {journal.checklist && journal.checklist[item.id] && "✓"}
                </div>
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>次回の日直</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div>
              <p className="text-sm text-muted-foreground">次回日直</p>
              <p className="font-medium">{[nextDailyRep1, nextDailyRep2].filter(Boolean).join(", ") || "未定"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">次回清掃担当班</p>
              <p className="font-medium">{nextCleaningDuty || "未定"}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
