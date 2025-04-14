"use client"

import { DialogTrigger } from "@/components/ui/dialog"

import { useState, useEffect } from "react"
import { format, parse, isWithinInterval, subDays } from "date-fns"
import { ja } from "date-fns/locale"
import { CalendarIcon, Printer, Search, Loader2, Info, Filter } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"
import { getJournals, getJournalById } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import PrintableJournal from "@/components/printable-journal"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

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

export default function PrintPage() {
  const { toast } = useToast()
  const [startDate, setStartDate] = useState<Date | undefined>(subDays(new Date(), 7))
  const [endDate, setEndDate] = useState<Date | undefined>(new Date())
  const [journals, setJournals] = useState<any[]>([])
  const [journalsToDisplay, setJournalsToDisplay] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isPrinting, setIsPrinting] = useState(false)

  // フィルター用の状態
  const [dayTypeFilter, setDayTypeFilter] = useState<string>("all") // "all", "day", "night"
  const [classFilter, setClassFilter] = useState<string>("all") // "all" または特定のクラスID
  const [showFilterDialog, setShowFilterDialog] = useState(false)

  // 日誌データの取得
  useEffect(() => {
    const fetchJournals = async () => {
      try {
        const data = await getJournals()
        setJournals(data)
      } catch (error) {
        console.error("日誌データの取得エラー:", error)
        toast({
          title: "エラー",
          description: "日誌データの取得に失敗しました",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchJournals()
  }, [toast])

  // 日付範囲と区分、クラスに基づいて表示する日誌をフィルタリング
  useEffect(() => {
    if (!startDate || !endDate || journals.length === 0) {
      setJournalsToDisplay([])
      return
    }

    // 日付でフィルタリング
    const dateFilteredJournals = journals.filter((journal) => {
      const journalDate = parse(journal.date, "yyyy-MM-dd", new Date())
      return isWithinInterval(journalDate, { start: startDate, end: endDate })
    })

    // 区分でフィルタリング
    const dayTypeFilteredJournals =
      dayTypeFilter === "all"
        ? dateFilteredJournals
        : dateFilteredJournals.filter((journal) => journal.day_type === dayTypeFilter)

    // クラスでフィルタリング
    const classFilteredJournals =
      classFilter === "all"
        ? dayTypeFilteredJournals
        : dayTypeFilteredJournals.filter((journal) => journal.class_name === classFilter)

    // 日付でソート
    const sortedJournals = [...classFilteredJournals].sort((a, b) => {
      return new Date(a.date).getTime() - new Date(b.date).getTime()
    })

    // 各日誌の詳細データを取得
    const fetchJournalDetails = async () => {
      const journalDetails = []

      for (const journal of sortedJournals) {
        try {
          const details = await getJournalById(journal.id)
          if (details) {
            journalDetails.push(details)
          }
        } catch (error) {
          console.error(`日誌ID ${journal.id} の詳細取得エラー:`, error)
        }
      }

      setJournalsToDisplay(journalDetails)
    }

    fetchJournalDetails()
  }, [journals, startDate, endDate, dayTypeFilter, classFilter])

  // 印刷処理
  const handlePrint = () => {
    if (journalsToDisplay.length === 0) {
      toast({
        title: "エラー",
        description: "印刷するデータがありません",
        variant: "destructive",
      })
      return
    }

    setIsPrinting(true)

    // 印刷用のHTMLを生成
    const printWindow = window.open("", "_blank")
    if (!printWindow) {
      toast({
        title: "エラー",
        description: "新しいウィンドウを開けませんでした。ポップアップブロックを確認してください。",
        variant: "destructive",
      })
      setIsPrinting(false)
      return
    }

    // 印刷用のHTMLを生成
    let printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>日直日誌印刷</title>
        <meta charset="utf-8">
        <style>
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
          body {
            font-family: sans-serif;
            margin: 0;
            padding: 0;
            font-size: 12px;
          }
          .printable-journal {
            page-break-after: always;
            padding: 10mm;
            max-width: 190mm;
            margin: 0 auto;
            box-sizing: border-box;
          }
          .journal-header {
            text-align: center;
            margin-bottom: 15px;
            padding-bottom: 8px;
            border-bottom: 1px solid #ddd;
          }
          .journal-title {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 8px;
          }
          .journal-meta {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
            flex-wrap: wrap;
          }
          .journal-meta > div {
            margin-right: 10px;
            margin-bottom: 5px;
          }
          .journal-section {
            margin-bottom: 15px;
          }
          .journal-section-title {
            font-size: 14px;
            font-weight: bold;
            margin-bottom: 8px;
            padding-bottom: 3px;
            border-bottom: 1px solid #ddd;
          }
          .period-item {
            margin-bottom: 10px;
            padding-bottom: 8px;
            border-bottom: 1px solid #eee;
          }
          .period-header {
            font-weight: bold;
            margin-bottom: 3px;
          }
          .period-detail {
            margin-bottom: 3px;
          }
          .period-label {
            color: #666;
          }
          .checklist-item {
            display: flex;
            align-items: center;
            margin-bottom: 3px;
          }
          .checklist-box {
            width: 12px;
            height: 12px;
            border: 1px solid #000;
            display: inline-block;
            margin-right: 6px;
            text-align: center;
            line-height: 12px;
            font-size: 10px;
          }
          .two-column {
            display: flex;
            gap: 15px;
          }
          .two-column > div {
            flex: 1;
          }
          @media print {
            body {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .printable-journal {
              page-break-after: always;
              height: 277mm; /* A4高さ - マージン */
            }
          }
        </style>
      </head>
      <body>
    `

    // 各日誌のHTMLを生成
    journalsToDisplay.forEach((journal) => {
      const date = new Date(journal.date)
      const formattedDate = format(date, "yyyy年MM月dd日", { locale: ja })

      // 天気の表示
      let weather = ""
      switch (journal.weather) {
        case "sunny":
          weather = "晴れ"
          break
        case "cloudy":
          weather = "曇り"
          break
        case "rainy":
          weather = "雨"
          break
        default:
          weather = journal.weather
      }

      // クラス名の取得
      const classMap: { [key: string]: string } = {
        "1a": "1年Aクラス",
        "1b": "1年Bクラス",
        "2a": "2年Aクラス",
        "2b": "2年Bクラス",
        "3a": "3年Aクラス",
        "3b": "3年Bクラス",
        "1n": "1年Nクラス",
        "2n": "2年Nクラス",
        "3n": "3年Nクラス",
      }
      const className = classMap[journal.class_name] || journal.class_name

      // 日直名
      const dailyReps = [journal.daily_rep_1, journal.daily_rep_2].filter(Boolean).join(", ")
      const nextDailyReps = [journal.next_daily_rep_1, journal.next_daily_rep_2].filter(Boolean).join(", ")

      // 講義情報
      const dayPeriods = journal.periods
        .filter((p: any) => !p.is_night)
        .sort((a: any, b: any) => a.period_number - b.period_number)

      const nightPeriods = journal.periods
        .filter((p: any) => p.is_night)
        .sort((a: any, b: any) => a.period_number - b.period_number)

      const displayPeriods = journal.day_type === "day" ? dayPeriods : nightPeriods

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

      // チェックリスト
      const checklistItems = [
        { id: "pc", label: "パソコン、プロジェクター" },
        { id: "mic", label: "マイク(電池)" },
        { id: "prints", label: "授業プリント準備" },
        { id: "journal", label: "日直日誌、座席表" },
        { id: "supplies", label: "おしぼり、チョーク" },
      ]

      // 日誌のHTMLを生成
      printContent += `
        <div class="printable-journal">
          <div class="journal-header">
            <div class="journal-title">救急救命士学科 日直日誌</div>
            <div class="journal-meta">
              <div>日付: ${formattedDate}</div>
              <div>天気: ${weather}</div>
              <div>クラス: ${className}</div>
              <div>日直: ${dailyReps}</div>
            </div>
            <div>本日の清掃担当班: ${journal.current_cleaning_duty || "未設定"}</div>
          </div>
          
          <div class="journal-section">
            <div class="journal-section-title">
              ${journal.day_type === "day" ? "昼間部" : "夜間部"} 講義情報
            </div>
            <div>
      `

      if (displayPeriods.length > 0) {
        displayPeriods.forEach((period: any) => {
          printContent += `
            <div class="period-item">
              <div class="period-header">
                ${period.period_number}時限 (${getTimeSlot(period.period_number, period.is_night)})
              </div>
              <div class="period-detail">
                <span class="period-label">科目名:</span> ${period.subject || "未入力"}
                <span class="period-label" style="margin-left: 10px;">担当講師:</span> ${period.teacher || "未入力"}
              </div>
              <div class="period-detail">
                <span class="period-label">講義内容:</span> ${period.content || "未入力"}
              </div>
              <div class="period-detail">
                <span class="period-label">欠席者:</span> ${period.absences || "なし"}
              </div>
              <div class="period-detail">
                <span class="period-label">途中入退室者:</span> ${period.in_out || "なし"}
              </div>
            </div>
          `
        })
      } else {
        printContent += `<div style="text-align: center; color: #666;">講義情報がありません</div>`
      }

      printContent += `
            </div>
          </div>
          
          <div class="two-column">
            <div class="journal-section">
              <div class="journal-section-title">コメント</div>
              <div>
                <div style="margin-bottom: 8px;">
                  <span class="period-label">日直コメント:</span><br>
                  ${journal.daily_comment || "コメントなし"}
                </div>
                <div>
                  <span class="period-label">担任コメント:</span><br>
                  ${journal.teacher_comment || "コメントなし"}
                </div>
              </div>
            </div>
            
            <div class="journal-section">
              <div class="journal-section-title">日直の業務チェックリスト</div>
              <div>
      `

      checklistItems.forEach((item) => {
        const isChecked = journal.checklist && journal.checklist[item.id]
        printContent += `
          <div class="checklist-item">
            <div class="checklist-box" style="${isChecked ? "background-color: black; color: white;" : ""}">${isChecked ? "✓" : ""}</div>
            <span>${item.label}</span>
          </div>
        `
      })

      printContent += `
              </div>
            </div>
          </div>
          
          <div class="journal-section" style="border-top: 1px solid #ddd; padding-top: 8px;">
            <div class="journal-section-title">次回の日直</div>
            <div>日直: ${nextDailyReps || "未定"}</div>
            <div style="margin-top: 3px;">清掃担当班: ${journal.next_cleaning_duty || "未定"}</div>
          </div>
        </div>
      `
    })

    printContent += `
      </body>
      </html>
    `

    // 印刷用ウィンドウに内容を書き込み
    printWindow.document.open()
    printWindow.document.write(printContent)
    printWindow.document.close()

    // 印刷ダイアログを表示する部分を修正
    printWindow.onload = () => {
      setIsPrinting(false) // ここでローディング表示を終了
      setTimeout(() => {
        printWindow.print()
        printWindow.onafterprint = () => {
          // 印刷後の処理
          toast({
            title: "印刷完了",
            description: "日誌の印刷が完了しました",
          })
        }
      }, 500)
    }
  }

  // 検索ボタンのクリックハンドラ
  const handleSearch = () => {
    if (!startDate || !endDate) {
      toast({
        title: "エラー",
        description: "開始日と終了日を選択してください",
        variant: "destructive",
      })
      return
    }

    // フィルター条件を表示するメッセージを作成
    let filterMessage = `${format(startDate, "yyyy年MM月dd日", { locale: ja })}から${format(endDate, "yyyy年MM月dd日", { locale: ja })}までの日誌`

    if (dayTypeFilter !== "all") {
      filterMessage += `、${dayTypeFilter === "day" ? "昼間部" : "夜間部"}`
    }

    if (classFilter !== "all") {
      const selectedClass = allClasses.find((cls) => cls.id === classFilter)
      if (selectedClass) {
        filterMessage += `、${selectedClass.name}`
      }
    }

    filterMessage += `を検索しました`

    toast({
      title: "検索完了",
      description: filterMessage,
    })
  }

  // クラス名の取得
  const getClassName = (classId: string) => {
    const foundClass = allClasses.find((cls) => cls.id === classId)
    return foundClass ? foundClass.name : classId
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

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-xl sm:text-2xl font-bold">日直日誌出力</h1>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto justify-end">
          <Button variant="outline" size="sm" onClick={() => setShowFilterDialog(true)} className="text-xs sm:text-sm">
            <Filter className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">フィルター</span>
            <span className="sm:hidden">絞込</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            disabled={isPrinting || journalsToDisplay.length === 0}
            className="text-xs sm:text-sm"
          >
            {isPrinting ? (
              <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 animate-spin" />
            ) : (
              <Printer className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            )}
            <span className="hidden sm:inline">プレビュー表示して印刷</span>
            <span className="sm:hidden">印刷</span>
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="text-xs sm:text-sm">
                <Info className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">印刷方法の説明</span>
                <span className="sm:hidden">説明</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[90vw] sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>印刷・PDF出力について</DialogTitle>
                <DialogDescription>
                  <div className="mt-4 p-2 sm:p-4 bg-muted rounded-md text-xs sm:text-sm">
                    <p className="font-medium mb-2">印刷方法:</p>
                    <ol className="list-decimal pl-4 sm:pl-5 space-y-1 sm:space-y-2">
                      <li>「印刷」ボタンをクリックすると、新しいタブで印刷プレビューが開きます</li>
                      <li>プレビュー画面が表示されたら、自動的に印刷ダイアログが開きます</li>
                      <li>印刷設定を確認し、「印刷」ボタンをクリックして印刷を実行します</li>
                    </ol>
                    <p className="font-medium mt-3 sm:mt-4 mb-2">PDFとして保存する方法:</p>
                    <ol className="list-decimal pl-4 sm:pl-5 space-y-1 sm:space-y-2">
                      <li>「印刷」ボタンをクリックします</li>
                      <li>印刷ダイアログで「プリンタ」または「送信先」から「PDFとして保存」を選択</li>
                      <li>Windowsの場合: 「Microsoft Print to PDF」を選択</li>
                      <li>Macの場合: 左下の「PDF」から「PDFとして保存」を選択</li>
                      <li>Chromeの場合: 送信先で「PDFとして保存」を選択</li>
                    </ol>
                  </div>
                </DialogDescription>
              </DialogHeader>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* フィルターダイアログ */}
      <Dialog open={showFilterDialog} onOpenChange={setShowFilterDialog}>
        <DialogContent className="max-w-[90vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">検索フィルター</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">表示する日誌の条件を設定してください</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 sm:py-4">
            <div className="space-y-1 sm:space-y-2">
              <Label htmlFor="day-type-filter" className="text-xs sm:text-sm">
                区分
              </Label>
              <Select value={dayTypeFilter} onValueChange={setDayTypeFilter}>
                <SelectTrigger id="day-type-filter" className="h-8 sm:h-10 text-xs sm:text-sm">
                  <SelectValue placeholder="区分を選択" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs sm:text-sm">
                    すべて
                  </SelectItem>
                  <SelectItem value="day" className="text-xs sm:text-sm">
                    昼間部
                  </SelectItem>
                  <SelectItem value="night" className="text-xs sm:text-sm">
                    夜間部
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 sm:space-y-2">
              <Label htmlFor="class-filter" className="text-xs sm:text-sm">
                クラス
              </Label>
              <Select value={classFilter} onValueChange={setClassFilter}>
                <SelectTrigger id="class-filter" className="h-8 sm:h-10 text-xs sm:text-sm">
                  <SelectValue placeholder="クラスを選択" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs sm:text-sm">
                    すべてのクラス
                  </SelectItem>
                  <SelectItem value="divider" disabled className="text-xs sm:text-sm">
                    --- 昼間部 ---
                  </SelectItem>
                  {dayClasses.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id} className="text-xs sm:text-sm">
                      {cls.name}
                    </SelectItem>
                  ))}
                  <SelectItem value="divider2" disabled className="text-xs sm:text-sm">
                    --- 夜間部 ---
                  </SelectItem>
                  {nightClasses.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id} className="text-xs sm:text-sm">
                      {cls.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-between">
            <Button variant="outline" onClick={resetFilters} size="sm" className="text-xs sm:text-sm">
              リセット
            </Button>
            <Button onClick={() => setShowFilterDialog(false)} size="sm" className="text-xs sm:text-sm">
              適用
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>期間指定</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="start-date" className="text-sm">
                開始日
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="start-date"
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal mt-1 text-xs sm:text-sm h-9",
                      !startDate && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                    {startDate ? format(startDate, "yyyy/MM/dd", { locale: ja }) : <span>日付を選択</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={startDate} onSelect={setStartDate} locale={ja} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label htmlFor="end-date" className="text-sm">
                終了日
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="end-date"
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal mt-1 text-xs sm:text-sm h-9",
                      !endDate && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                    {endDate ? format(endDate, "yyyy/MM/dd", { locale: ja }) : <span>日付を選択</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={endDate} onSelect={setEndDate} locale={ja} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <div className="mt-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div className="flex flex-wrap items-center gap-2">
              {dayTypeFilter !== "all" && (
                <div className="bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full text-xs sm:text-sm flex items-center">
                  {dayTypeFilter === "day" ? "昼間部" : "夜間部"}
                </div>
              )}
              {classFilter !== "all" && (
                <div className="bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full text-xs sm:text-sm flex items-center truncate max-w-[150px]">
                  {getClassName(classFilter)}
                </div>
              )}
            </div>
            <Button
              className="flex items-center self-end"
              disabled={!startDate || !endDate || isLoading}
              onClick={handleSearch}
              size="sm"
            >
              <Search className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              <span className="text-xs sm:text-sm">検索</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>検索結果</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2">データを読み込み中...</span>
            </div>
          ) : journalsToDisplay.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {startDate && endDate ? "指定された条件に一致する日誌がありません" : "期間を指定してください"}
            </div>
          ) : (
            <div>
              <p className="mb-4 text-xs sm:text-sm">
                <span className="block sm:inline">
                  {format(startDate!, "yyyy/MM/dd", { locale: ja })} 〜 {format(endDate!, "yyyy/MM/dd", { locale: ja })}
                </span>
                <span className="sm:ml-1">
                  {dayTypeFilter !== "all" && ` ${dayTypeFilter === "day" ? "昼間部" : "夜間部"}`}
                  {classFilter !== "all" && ` ${getClassName(classFilter)}`}
                  の日誌: {journalsToDisplay.length}件
                </span>
              </p>

              <div className="bg-muted p-3 rounded-md mb-4 sm:mb-6 flex items-start">
                <Info className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-xs sm:text-sm">印刷・PDF出力について</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    「印刷」ボタンをクリックすると、新しいタブで印刷プレビューが開きます。
                    印刷ダイアログでは「PDFとして保存」オプションも選択できます。
                    詳しくは「説明」ボタンをご確認ください。
                  </p>
                </div>
              </div>

              {/* プレビュー表示用のコンテンツ */}
              <div className="preview-container space-y-8">
                {journalsToDisplay.map((journal) => (
                  <PrintableJournal key={journal.id} journal={journal} />
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
