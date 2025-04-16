import { format } from "date-fns"
import { ja } from "date-fns/locale"

// 印刷用の日誌コンポーネント
export default function PrintableJournal({ journal }: { journal: any }) {
  if (!journal) return null

  // 日付の表示形式変換
  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr)
      return format(date, "yyyy年MM月dd日", { locale: ja })
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

  // 講義情報の整理
  const dayPeriods = journal.periods
    .filter((p: any) => !p.is_night)
    .sort((a: any, b: any) => a.period_number - b.period_number)
  const nightPeriods = journal.periods
    .filter((p: any) => p.is_night)
    .sort((a: any, b: any) => a.period_number - b.period_number)

  // 表示する講義情報
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

  // チェックリスト項目を更新
  const checklistItems = [
    { id: "pc", label: "パソコン返却（プロジェクターと接続するコードは返却しない）" },
    { id: "mic", label: "マイク確認（ピンマイクのみ返却）" },
    { id: "prints", label: "余ったプリント返却" },
    { id: "journal", label: "日誌入力・保存" },
    { id: "supplies", label: "備品確認" },
  ]

  return (
    <div className="printable-journal bg-white p-3 sm:p-4 border rounded-lg shadow-sm print:shadow-none print:border-none print:p-0 print:my-0">
      <div className="text-center mb-3 sm:mb-4 border-b pb-2">
        <h1 className="text-lg sm:text-xl font-bold">救急救命士学科 日直日誌</h1>
        <div className="flex flex-wrap justify-between items-center mt-2 gap-1 text-xs sm:text-sm">
          <div>日付: {formatDate(journal.date)}</div>
          <div>天気: {getWeatherDisplay(journal.weather)}</div>
          <div>クラス: {getClassName(journal.class_name)}</div>
          <div className="w-full sm:w-auto">
            日直: {[journal.daily_rep_1, journal.daily_rep_2].filter(Boolean).join(", ")}
          </div>
        </div>
        <div className="text-xs sm:text-sm mt-2">本日の清掃担当班: {journal.current_cleaning_duty || "未設定"}</div>
      </div>

      <div className="mb-3 sm:mb-4">
        <h2 className="text-base sm:text-lg font-semibold mb-1 sm:mb-2 border-b">
          {journal.day_type === "day" ? "昼間部" : "夜間部"} 講義情報
        </h2>
        <div className="space-y-2 sm:space-y-3">
          {displayPeriods.length > 0 ? (
            displayPeriods.map((period: any) => (
              <div key={period.id} className="border-b pb-2">
                <div className="font-medium text-xs sm:text-sm">
                  {period.period_number}時限 ({getTimeSlot(period.period_number, period.is_night)})
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 sm:gap-2 text-xs sm:text-sm">
                  <div>
                    <span className="text-gray-500">科目名:</span> {period.subject || "未入力"}
                  </div>
                  <div>
                    <span className="text-gray-500">担当講師:</span> {period.teacher || "未入力"}
                  </div>
                </div>
                <div className="text-xs sm:text-sm mt-1">
                  <span className="text-gray-500">講義内容:</span> {period.content || "未入力"}
                </div>
                <div className="text-xs sm:text-sm mt-1">
                  <span className="text-gray-500">欠席者:</span> {period.absences || "なし"}
                </div>
                <div className="text-xs sm:text-sm mt-1">
                  <span className="text-gray-500">途中入退室者:</span> {period.in_out || "なし"}
                </div>
              </div>
            ))
          ) : (
            <p className="text-center text-gray-500">講義情報がありません</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-3 sm:mb-4">
        <div>
          <h2 className="text-base sm:text-lg font-semibold mb-1 sm:mb-2 border-b">コメント</h2>
          <div className="text-xs sm:text-sm">
            <div className="mb-2">
              <span className="text-gray-500">日直コメント:</span>
              <br />
              {journal.daily_comment || "コメントなし"}
            </div>
            <div>
              <span className="text-gray-500">担任コメント:</span>
              <br />
              {journal.teacher_comment || "コメントなし"}
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-base sm:text-lg font-semibold mb-1 sm:mb-2 border-b">日直の業務チェックリスト</h2>
          <div className="grid grid-cols-1 gap-1 text-xs sm:text-sm">
            {checklistItems.map((item) => (
              <div key={item.id} className="flex items-center gap-1 sm:gap-2">
                <div
                  className={`w-3 h-3 sm:w-4 sm:h-4 rounded-sm border flex items-center justify-center ${
                    journal.checklist && journal.checklist[item.id]
                      ? "bg-black text-white print:bg-black print:text-white"
                      : "bg-white"
                  }`}
                >
                  {journal.checklist && journal.checklist[item.id] && "✓"}
                </div>
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t pt-2">
        <h2 className="text-base sm:text-lg font-semibold mb-1 sm:mb-2">次回の日直</h2>
        <p className="text-xs sm:text-sm">
          日直: {[journal.next_daily_rep_1, journal.next_daily_rep_2].filter(Boolean).join(", ") || "未定"}
        </p>
        <p className="mt-1 text-xs sm:text-sm">清掃担当班: {journal.next_cleaning_duty || "未定"}</p>
      </div>
    </div>
  )
}
