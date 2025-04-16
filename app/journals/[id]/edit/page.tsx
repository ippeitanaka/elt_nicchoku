"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { format, parse } from "date-fns"
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
  ArrowLeft,
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
import { getJournalById, updateJournal } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"

const checklistItems = [
  { id: "pc", label: "パソコン返却（モニターとの接続コードは返却しない）" },
  { id: "mic", label: "マイク返却（ピンマイクのみ返却）" },
  { id: "chalk", label: "チョーク返却" },
  { id: "journal", label: "日直日誌入力" },
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

export default function EditJournalPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { toast } = useToast()
  const journalId = params.id
  const [isSubmitting, setIsSubmitting] = useState(false)

  // 状態管理
  const [date, setDate] = useState<Date | undefined>(new Date())
  const [weather, setWeather] = useState<string>("sunny")
  const [checklist, setChecklist] = useState<Record<string, boolean>>({})
  const [activeTab, setActiveTab] = useState<string>("day")
  const [selectedClass, setSelectedClass] = useState<string>("")
  const [dailyRep1, setDailyRep1] = useState<string>("")
  const [dailyRep2, setDailyRep2] = useState<string>("")
  const [nextDailyRep1, setNextDailyRep1] = useState<string>("")
  const [nextDailyRep2, setNextDailyRep2] = useState<string>("")
  const [dailyComment, setDailyComment] = useState<string>("")
  const [teacherComment, setTeacherComment] = useState<string>("")
  const [isLoading, setIsLoading] = useState<boolean>(true)

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

  // 日誌データの取得
  useEffect(() => {
    const fetchJournal = async () => {
      try {
        const journal = await getJournalById(journalId)

        if (!journal) {
          toast({
            title: "エラー",
            description: "日誌データの取得に失敗しました",
            variant: "destructive",
          })
          router.push("/journals")
          return
        }

        // 日付の変換
        const journalDate = parse(journal.date, "yyyy-MM-dd", new Date())

        // データをフォームにセット
        setDate(journalDate)
        setWeather(journal.weather)
        setActiveTab(journal.day_type)
        setSelectedClass(journal.class_name)
        setDailyRep1(journal.daily_rep_1 || "")
        setDailyRep2(journal.daily_rep_2 || "")
        setNextDailyRep1(journal.next_daily_rep_1 || "")
        setNextDailyRep2(journal.next_daily_rep_2 || "")
        setDailyComment(journal.daily_comment || "")
        setTeacherComment(journal.teacher_comment || "")
        setCurrentCleaningDuty(journal.current_cleaning_duty || "")
        setNextCleaningDuty(journal.next_cleaning_duty || "")

        // チェックリスト情報
        if (journal.checklist) {
          setChecklist({
            pc: journal.checklist.pc || false,
            mic: journal.checklist.mic || false,
            chalk: journal.checklist.chalk || false,
            journal: journal.checklist.journal || false,
          })
        }

        // 講義情報
        if (journal.periods) {
          const dayPeriodsData: any[] = []
          const nightPeriodsData: any[] = []

          journal.periods.forEach((period: any) => {
            const periodData = {
              subject: period.subject || "",
              teacher: period.teacher || "",
              content: period.content || "",
              absences: period.absences || "",
              inOut: period.in_out || "",
            }

            if (period.is_night) {
              // 夜間部の講義情報
              if (period.period_number <= 2) {
                nightPeriodsData[period.period_number - 1] = periodData
              }
            } else {
              // 昼間部の講義情報
              if (period.period_number <= 4) {
                dayPeriodsData[period.period_number - 1] = periodData
              }
            }
          })

          // 不足している講義情報を補完
          while (dayPeriodsData.length < 4) {
            dayPeriodsData.push({ subject: "", teacher: "", content: "", absences: "", inOut: "" })
          }

          while (nightPeriodsData.length < 2) {
            nightPeriodsData.push({ subject: "", teacher: "", content: "", absences: "", inOut: "" })
          }

          setDayPeriods(dayPeriodsData)
          setNightPeriods(nightPeriodsData)
        }

        setIsLoading(false)
      } catch (error) {
        console.error("データ取得エラー:", error)
        toast({
          title: "エラー",
          description: "日誌データの取得中にエラーが発生しました",
          variant: "destructive",
        })
        router.push("/journals")
      }
    }

    fetchJournal()
  }, [journalId, router, toast])

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
          chalk: checklist.chalk || false,
          journal: checklist.journal || false,
        },
        currentCleaningDuty,
        nextCleaningDuty,
      }

      console.log("更新するデータ:", journalData)

      // Supabaseで更新
      const success = await updateJournal(journalId, journalData)

      if (success) {
        toast({
          title: "更新完了",
          description: "日誌が更新されました",
        })

        // 更新成功後、詳細ページに遷移
        router.push(`/journals/${journalId}`)
      } else {
        toast({
          title: "エラー",
          description: "日誌の更新に失敗しました。ネットワーク接続とSupabaseの設定を確認してください。",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("更新エラー:", error)
      toast({
        title: "エラー",
        description: `日誌の更新中にエラーが発生しました: ${error instanceof Error ? error.message : "不明なエラー"}`,
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4 text-center">
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
        <p className="mt-4 text-primary">データを読み込み中...</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push(`/journals/${journalId}`)}
            className="mr-2 rounded-full hover:bg-primary/10"
          >
            <ArrowLeft className="h-5 w-5 text-primary" />
          </Button>
          <h1 className="text-2xl font-bold text-primary">日誌編集</h1>
        </div>
        <Button
          variant="outline"
          onClick={() => router.push(`/journals/${journalId}`)}
          className="cute-button border-2 border-secondary hover:border-secondary/80"
        >
          キャンセル
        </Button>
      </div>

      <form onSubmit={handleSubmit}>
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value)}>
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
                <RadioGroup className="flex gap-4 mt-2" onValueChange={setWeather} value={weather}>
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
              onClick={() => router.push(`/journals/${journalId}`)}
              className="cute-button border-2 border-secondary hover:border-secondary/80"
            >
              キャンセル
            </Button>
            <Button type="submit" disabled={isSubmitting} className="cute-button bg-primary hover:bg-primary/90">
              {isSubmitting ? "更新中..." : "更新"}
            </Button>
          </CardFooter>
        </Tabs>
      </form>
    </div>
  )
}
