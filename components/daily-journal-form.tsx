"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { ja } from "date-fns/locale"
import {
  CalendarIcon,
  Cloud,
  CloudRain,
  Sun,
  Pencil,
  BookOpen,
  MessageCircle,
  CheckSquare,
  UserPlus,
  Loader2,
  AlertCircle,
  Info,
  WifiOff,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"
import { saveJournal, testSupabaseConnection, checkNetworkConnection } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

const checklistItems = [
  { id: "pc", label: "パソコン返却（プロジェクターと接続するコードは返却しない）" },
  { id: "mic", label: "マイク確認（ピンマイクのみ返却）" },
  { id: "prints", label: "余ったプリント返却" },
  { id: "journal", label: "日誌入力・保存" },
  { id: "supplies", label: "備品確認" },
]

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

export default function DailyJournalForm() {
  const router = useRouter()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<"checking" | "success" | "error" | "offline">("checking")
  const [isOfflineMode, setIsOfflineMode] = useState(false)
  const [date, setDate] = useState<Date | undefined>(new Date())
  const [weather, setWeather] = useState<string>("sunny")
  const [checklist, setChecklist] = useState({
    pc: false,
    mic: false,
    prints: false,
    journal: false,
    supplies: false,
  })
  const [activeTab, setActiveTab] = useState<string>("day")
  const [selectedClass, setSelectedClass] = useState<string>("")
  const [dailyRep1, setDailyRep1] = useState<string>("")
  const [dailyRep2, setDailyRep2] = useState<string>("")
  const [nextDailyRep1, setNextDailyRep1] = useState<string>("")
  const [nextDailyRep2, setNextDailyRep2] = useState<string>("")
  const [dailyComment, setDailyComment] = useState<string>("")
  const [teacherComment, setTeacherComment] = useState<string>("")

  // 講義情報の状態
  const [dayPeriods, setDayPeriods] = useState<any[]>([
    { subject: "", teacher: "", content: "", absences: "", inOut: "" },
    { subject: "", teacher: "", content: "", absences: "", inOut: "" },
    { subject: "", teacher: "", content: "", absences: "", inOut: "" },
    { subject: "", teacher: "", content: "", absences: "", inOut: "" },
  ])

  const [nightPeriods, setNightPeriods] = useState<any[]>([
    { subject: "", teacher: "", content: "", absences: "", inOut: "" },
    { subject: "", teacher: "", content: "", absences: "", inOut: "" },
  ])

  // 状態変数を追加
  const [currentCleaningDuty, setCurrentCleaningDuty] = useState<string>("")
  const [nextCleaningDuty, setNextCleaningDuty] = useState<string>("")

  // 接続状態の確認
  useEffect(() => {
    const checkConnectionStatus = async () => {
      try {
        // まずネットワーク接続を確認
        const isOnline = await checkNetworkConnection()
        if (!isOnline) {
          setConnectionStatus("offline")
          setConnectionError("インターネット接続がありません。オフラインモードで続行できます。")
          return
        }

        // 環境変数の存在確認
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

        console.log("環境変数チェック:")
        console.log("NEXT_PUBLIC_SUPABASE_URL exists:", !!supabaseUrl)
        console.log("NEXT_PUBLIC_SUPABASE_ANON_KEY exists:", !!supabaseAnonKey)

        if (!supabaseUrl || !supabaseAnonKey) {
          setConnectionStatus("error")
          setConnectionError("Supabase接続情報が設定されていません。環境変数を確認してください。")
          return
        }

        // Supabase接続テスト
        const result = await testSupabaseConnection()
        if (result.success) {
          setConnectionStatus("success")
          setConnectionError(null)
        } else {
          if (result.isOffline) {
            setConnectionStatus("offline")
          } else {
            setConnectionStatus("error")
          }
          setConnectionError(result.message)
        }
      } catch (error) {
        console.error("接続テストエラー:", error)
        setConnectionStatus("error")
        setConnectionError(
          `接続テスト中にエラーが発生しました: ${error instanceof Error ? error.message : "不明なエラー"}`,
        )
      }
    }

    checkConnectionStatus()
  }, [])

  const handleChecklistChange = (id: string, checked: boolean) => {
    setChecklist((prev) => ({ ...prev, [id]: checked }))
  }

  const handleDayPeriodChange = (index: number, field: string, value: string) => {
    const updatedPeriods = [...dayPeriods]
    updatedPeriods[index] = { ...updatedPeriods[index], [field]: value }
    setDayPeriods(updatedPeriods)
  }

  const handleNightPeriodChange = (index: number, field: string, value: string) => {
    const updatedPeriods = [...nightPeriods]
    updatedPeriods[index] = { ...updatedPeriods[index], [field]: value }
    setNightPeriods(updatedPeriods)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedClass) {
      toast({
        title: "エラー",
        description: "クラスを選択してください",
        variant: "destructive",
      })
      return
    }

    if (!date) {
      toast({
        title: "エラー",
        description: "日付を選択してください",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      // 日誌データの構築
      const journalData = {
        date: format(date, "yyyy-MM-dd"),
        weather,
        dayType: activeTab,
        className: selectedClass,
        dailyRep: [dailyRep1, dailyRep2].filter(Boolean),
        nextDailyRep: [nextDailyRep1, nextDailyRep2].filter(Boolean),
        dayPeriods,
        nightPeriods,
        dailyComment,
        teacherComment,
        checklist: {
          pc: checklist.pc || false,
          mic: checklist.mic || false,
          prints: checklist.prints || false,
          journal: checklist.journal || false,
          supplies: checklist.supplies || false,
        },
        currentCleaningDuty,
        nextCleaningDuty,
      }

      console.log("保存するデータ:", journalData)

      // Supabaseに保存（オフラインモードの場合はローカルストレージに保存）
      const journalId = await saveJournal(journalData, isOfflineMode)

      if (journalId) {
        toast({
          title: isOfflineMode ? "オフライン保存完了" : "保存完了",
          description: isOfflineMode
            ? "日誌がローカルに保存されました。オンラインになったら同期できます。"
            : "日誌が保存されました",
        })

        // 保存成功後、詳細ページに遷移
        router.push(`/journals/${journalId}`)
      } else {
        toast({
          title: "エラー",
          description: "日誌の保存に失敗しました。ネットワーク接続とSupabaseの設定を確認してください。",
          variant: "destructive",
        })
        setIsSubmitting(false)
      }
    } catch (error) {
      console.error("保存エラー:", error)
      toast({
        title: "エラー",
        description: `日誌の保存中にエラーが発生しました: ${error instanceof Error ? error.message : "不明なエラー"}`,
        variant: "destructive",
      })
      setIsSubmitting(false)
    }
  }

  const handleReset = () => {
    // フォームをリセット
    setDate(new Date())
    setWeather("sunny")
    setChecklist({
      pc: false,
      mic: false,
      prints: false,
      journal: false,
      supplies: false,
    })
    setSelectedClass("")
    setDailyRep1("")
    setDailyRep2("")
    setNextDailyRep1("")
    setNextDailyRep2("")
    setDailyComment("")
    setTeacherComment("")
    setDayPeriods([
      { subject: "", teacher: "", content: "", absences: "", inOut: "" },
      { subject: "", teacher: "", content: "", absences: "", inOut: "" },
      { subject: "", teacher: "", content: "", absences: "", inOut: "" },
      { subject: "", teacher: "", content: "", absences: "", inOut: "" },
    ])
    setNightPeriods([
      { subject: "", teacher: "", content: "", absences: "", inOut: "" },
      { subject: "", teacher: "", content: "", absences: "", inOut: "" },
    ])
    setCurrentCleaningDuty("")
    setNextCleaningDuty("")

    toast({
      title: "リセット完了",
      description: "フォームがリセットされました",
    })
  }

  // オフラインモードに切り替え
  const enableOfflineMode = () => {
    setIsOfflineMode(true)
    setConnectionStatus("offline")
    toast({
      title: "オフラインモード有効",
      description: "オフラインモードで動作します。データはローカルに保存されます。",
    })
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-primary">日直日誌を作成しましょう！</h1>
        <p className="text-muted-foreground">今日の授業の記録を残しましょう</p>
      </div>

      {connectionStatus === "checking" && (
        <Alert className="mb-6">
          <Loader2 className="h-4 w-4 animate-spin" />
          <AlertTitle>接続確認中</AlertTitle>
          <AlertDescription>Supabaseへの接続を確認しています...</AlertDescription>
        </Alert>
      )}

      {connectionStatus === "error" && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>接続エラー</AlertTitle>
          <AlertDescription>
            {connectionError}
            <div className="mt-2">
              <p className="text-sm">
                オフラインモードで続行することもできます。その場合、データはローカルに保存されます。
              </p>
              <Button variant="outline" size="sm" className="mt-2" onClick={enableOfflineMode}>
                オフラインモードで続行
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {connectionStatus === "offline" && (
        <Alert className="mb-6 bg-amber-50 border-amber-200">
          <WifiOff className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-600">オフラインモード</AlertTitle>
          <AlertDescription className="text-amber-700">
            現在オフラインモードで動作しています。データはローカルに保存され、オンラインになったときに同期できます。
          </AlertDescription>
        </Alert>
      )}

      {connectionStatus === "success" && (
        <Alert className="mb-6 bg-green-50 border-green-200">
          <Info className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-600">接続成功</AlertTitle>
          <AlertDescription className="text-green-700">
            Supabaseへの接続に成功しました。データを保存できます。
          </AlertDescription>
        </Alert>
      )}

      <Tabs
        defaultValue="day"
        onValueChange={(value) => {
          setActiveTab(value)
          setSelectedClass("")
        }}
      >
        <TabsList className="grid w-full grid-cols-2 mb-6 rounded-full bg-secondary/30">
          <TabsTrigger
            value="day"
            className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-white"
          >
            ☀️ 昼間部
          </TabsTrigger>
          <TabsTrigger
            value="night"
            className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-white"
          >
            🌙 夜間部
          </TabsTrigger>
        </TabsList>

        <Card className="mb-6 cute-card">
          <CardHeader className="cute-header">
            <CardTitle className="section-title">
              <Pencil className="h-5 w-5 section-title-icon" />
              基本情報
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="class-select" className="form-label">
                  学年クラス
                </Label>
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger id="class-select" className="mt-1 cute-select">
                    <SelectValue placeholder="クラスを選択してください" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {activeTab === "day"
                      ? dayClasses.map((cls) => (
                          <SelectItem key={cls.id} value={cls.id}>
                            {cls.name}
                          </SelectItem>
                        ))
                      : nightClasses.map((cls) => (
                          <SelectItem key={cls.id} value={cls.id}>
                            {cls.name}
                          </SelectItem>
                        ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="date" className="form-label">
                  日付
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal mt-1 cute-input",
                        !date && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                      {date ? format(date, "yyyy年MM月dd日", { locale: ja }) : <span>日付を選択</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 rounded-xl border-2 border-primary/20">
                    <Calendar mode="single" selected={date} onSelect={setDate} locale={ja} className="rounded-xl" />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div>
              <Label className="form-label">天気</Label>
              <RadioGroup defaultValue="sunny" className="flex gap-4 mt-2" onValueChange={setWeather} value={weather}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="sunny" id="sunny" className="cute-radio" />
                  <Label htmlFor="sunny" className="flex items-center">
                    <Sun className="h-5 w-5 mr-1 text-yellow-500" /> 晴れ
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="cloudy" id="cloudy" className="cute-radio" />
                  <Label htmlFor="cloudy" className="flex items-center">
                    <Cloud className="h-5 w-5 mr-1 text-gray-500" /> 曇り
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="rainy" id="rainy" className="cute-radio" />
                  <Label htmlFor="rainy" className="flex items-center">
                    <CloudRain className="h-5 w-5 mr-1 text-blue-500" /> 雨
                  </Label>
                </div>
              </RadioGroup>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="daily-rep-1" className="form-label">
                  日直氏名 (1)
                </Label>
                <Input
                  id="daily-rep-1"
                  className="mt-1 cute-input"
                  placeholder="1人目の氏名"
                  value={dailyRep1}
                  onChange={(e) => setDailyRep1(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="daily-rep-2" className="form-label">
                  日直氏名 (2)
                </Label>
                <Input
                  id="daily-rep-2"
                  className="mt-1 cute-input"
                  placeholder="2人目の氏名"
                  value={dailyRep2}
                  onChange={(e) => setDailyRep2(e.target.value)}
                />
              </div>
            </div>
            <div className="mt-4">
              <Label htmlFor="current-cleaning-duty" className="form-label">
                本日の清掃担当班
              </Label>
              <Input
                id="current-cleaning-duty"
                className="mt-1 cute-input"
                placeholder="清掃担当班を入力"
                value={currentCleaningDuty}
                onChange={(e) => setCurrentCleaningDuty(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <TabsContent value="day">
          <Card className="mb-6 cute-card">
            <CardHeader className="cute-header">
              <CardTitle className="section-title">
                <BookOpen className="h-5 w-5 section-title-icon" />
                昼間部 講義情報
              </CardTitle>
              {selectedClass && (
                <div className="text-sm text-primary font-medium bg-primary/10 px-3 py-1 rounded-full inline-block">
                  {dayClasses.find((cls) => cls.id === selectedClass)?.name}
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-6 p-6">
              {[0, 1, 2, 3].map((index) => {
                const period = index + 1
                const timeSlots = ["9:10～10:40", "10:50～12:20", "13:20～14:50", "15:00～16:30"]
                return (
                  <div
                    key={period}
                    className="border-2 border-secondary/50 p-4 rounded-xl bg-secondary/10 hover:bg-secondary/20 transition-colors"
                  >
                    <div className="font-medium mb-2 text-primary flex items-center">
                      <span className="bg-primary text-white rounded-full w-6 h-6 flex items-center justify-center mr-2">
                        {period}
                      </span>
                      {period}時限 ({timeSlots[index]})
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor={`subject-${period}`} className="form-label">
                          科目名
                        </Label>
                        <Input
                          id={`subject-${period}`}
                          className="mt-1 cute-input"
                          value={dayPeriods[index]?.subject || ""}
                          onChange={(e) => handleDayPeriodChange(index, "subject", e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor={`teacher-${period}`} className="form-label">
                          担当講師名
                        </Label>
                        <Input
                          id={`teacher-${period}`}
                          className="mt-1 cute-input"
                          value={dayPeriods[index]?.teacher || ""}
                          onChange={(e) => handleDayPeriodChange(index, "teacher", e.target.value)}
                        />
                      </div>
                      <div className="md:col-span-2">
                        <Label htmlFor={`content-${period}`} className="form-label">
                          講義内容
                        </Label>
                        <Input
                          id={`content-${period}`}
                          className="mt-1 cute-input"
                          value={dayPeriods[index]?.content || ""}
                          onChange={(e) => handleDayPeriodChange(index, "content", e.target.value)}
                        />
                      </div>
                      <div className="md:col-span-2">
                        <Label htmlFor={`attendance-${period}`} className="form-label">
                          欠席者
                        </Label>
                        <Input
                          id={`attendance-${period}`}
                          className="mt-1 cute-input"
                          value={dayPeriods[index]?.absences || ""}
                          onChange={(e) => handleDayPeriodChange(index, "absences", e.target.value)}
                        />
                      </div>
                      <div className="md:col-span-2">
                        <Label htmlFor={`inout-${period}`} className="form-label">
                          途中入退室者記入（時間記入）
                        </Label>
                        <Input
                          id={`inout-${period}`}
                          className="mt-1 cute-input"
                          value={dayPeriods[index]?.inOut || ""}
                          onChange={(e) => handleDayPeriodChange(index, "inOut", e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="night">
          <Card className="mb-6 cute-card">
            <CardHeader className="cute-header">
              <CardTitle className="section-title">
                <BookOpen className="h-5 w-5 section-title-icon" />
                夜間部 講義情報
              </CardTitle>
              {selectedClass && (
                <div className="text-sm text-primary font-medium bg-primary/10 px-3 py-1 rounded-full inline-block">
                  {nightClasses.find((cls) => cls.id === selectedClass)?.name}
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-6 p-6">
              {[0, 1].map((index) => {
                const period = index + 1
                const timeSlots = ["18:00～19:30", "19:40～21:10"]
                return (
                  <div
                    key={period}
                    className="border-2 border-secondary/50 p-4 rounded-xl bg-secondary/10 hover:bg-secondary/20 transition-colors"
                  >
                    <div className="font-medium mb-2 text-primary flex items-center">
                      <span className="bg-primary text-white rounded-full w-6 h-6 flex items-center justify-center mr-2">
                        {period}
                      </span>
                      {period}時限 ({timeSlots[index]})
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor={`night-subject-${period}`} className="form-label">
                          科目名
                        </Label>
                        <Input
                          id={`night-subject-${period}`}
                          className="mt-1 cute-input"
                          value={nightPeriods[index]?.subject || ""}
                          onChange={(e) => handleNightPeriodChange(index, "subject", e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor={`night-teacher-${period}`} className="form-label">
                          担当講師名
                        </Label>
                        <Input
                          id={`night-teacher-${period}`}
                          className="mt-1 cute-input"
                          value={nightPeriods[index]?.teacher || ""}
                          onChange={(e) => handleNightPeriodChange(index, "teacher", e.target.value)}
                        />
                      </div>
                      <div className="md:col-span-2">
                        <Label htmlFor={`night-content-${period}`} className="form-label">
                          講義内容
                        </Label>
                        <Input
                          id={`night-content-${period}`}
                          className="mt-1 cute-input"
                          value={nightPeriods[index]?.content || ""}
                          onChange={(e) => handleNightPeriodChange(index, "content", e.target.value)}
                        />
                      </div>
                      <div className="md:col-span-2">
                        <Label htmlFor={`night-attendance-${period}`} className="form-label">
                          欠席者
                        </Label>
                        <Input
                          id={`night-attendance-${period}`}
                          className="mt-1 cute-input"
                          value={nightPeriods[index]?.absences || ""}
                          onChange={(e) => handleNightPeriodChange(index, "absences", e.target.value)}
                        />
                      </div>
                      <div className="md:col-span-2">
                        <Label htmlFor={`night-inout-${period}`} className="form-label">
                          途中入退室者記入（時間記入）
                        </Label>
                        <Input
                          id={`night-inout-${period}`}
                          className="mt-1 cute-input"
                          value={nightPeriods[index]?.inOut || ""}
                          onChange={(e) => handleNightPeriodChange(index, "inOut", e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </TabsContent>

        <Card className="mb-6 cute-card">
          <CardHeader className="cute-header">
            <CardTitle className="section-title">
              <MessageCircle className="h-5 w-5 section-title-icon" />
              コメント
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-6">
            <div>
              <Label htmlFor="daily-comment" className="form-label">
                日直コメント
              </Label>
              <Textarea
                id="daily-comment"
                className="mt-1 cute-textarea"
                rows={3}
                value={dailyComment}
                onChange={(e) => setDailyComment(e.target.value)}
                placeholder="今日の授業の感想や特記事項を入力してください"
              />
            </div>
            <div>
              <Label htmlFor="teacher-comment" className="form-label">
                担任コメント
              </Label>
              <Textarea
                id="teacher-comment"
                className="mt-1 cute-textarea"
                rows={3}
                value={teacherComment}
                onChange={(e) => setTeacherComment(e.target.value)}
                placeholder="担任からのコメントを入力してください"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6 cute-card">
          <CardHeader className="cute-header">
            <CardTitle className="section-title">
              <CheckSquare className="h-5 w-5 section-title-icon" />
              日直の業務チェックリスト
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 gap-4">
              {checklistItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center space-x-2 p-2 rounded-lg hover:bg-secondary/10 transition-colors"
                >
                  <Checkbox
                    id={item.id}
                    checked={checklist[item.id] || false}
                    onCheckedChange={(checked) => handleChecklistChange(item.id, checked as boolean)}
                    className="cute-checkbox"
                  />
                  <Label htmlFor={item.id} className="cursor-pointer">
                    {item.label}
                  </Label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6 cute-card">
          <CardHeader className="cute-header">
            <CardTitle className="section-title">
              <UserPlus className="h-5 w-5 section-title-icon" />
              次回の日直
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="next-daily-rep-1" className="form-label">
                  次回日直氏名 (1)
                </Label>
                <Input
                  id="next-daily-rep-1"
                  className="mt-1 cute-input"
                  placeholder="1人目の氏名"
                  value={nextDailyRep1}
                  onChange={(e) => setNextDailyRep1(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="next-daily-rep-2" className="form-label">
                  次回日直氏名 (2)
                </Label>
                <Input
                  id="next-daily-rep-2"
                  className="mt-1 cute-input"
                  placeholder="2人目の氏名"
                  value={nextDailyRep2}
                  onChange={(e) => setNextDailyRep2(e.target.value)}
                />
              </div>
            </div>
            <div className="mt-4">
              <Label htmlFor="next-cleaning-duty" className="form-label">
                次回清掃担当班
              </Label>
              <Input
                id="next-cleaning-duty"
                className="mt-1 cute-input"
                placeholder="次回の清掃担当班を入力"
                value={nextCleaningDuty}
                onChange={(e) => setNextCleaningDuty(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <CardFooter className="flex justify-end gap-2 px-0">
          <Button
            type="button"
            variant="outline"
            onClick={handleReset}
            className="cute-button border-2 border-secondary hover:border-secondary/80"
          >
            リセット
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="cute-button bg-primary hover:bg-primary/90 flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                保存中...
              </>
            ) : isOfflineMode ? (
              "ローカルに保存"
            ) : (
              "保存"
            )}
          </Button>
        </CardFooter>
      </Tabs>
    </form>
  )
}
