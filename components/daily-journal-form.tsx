// daily-journal-form.tsxの一部を修正

// checklistItemsの定義を修正
const checklistItems = [
  { id: "pc", label: "パソコン返却（モニターとの接続コードは返却しない）" },
  { id: "mic", label: "マイク返却（ピンマイクのみ返却）" },
  { id: "prints", label: "授業プリント準備" },
  { id: "journal", label: "日直日誌入力" },
  { id: "supplies", label: "おしぼり、チョーク" },
]

// handleChecklistChangeは変更不要

// checklistの変数を定義
const checklist = {
  pc: false,
  mic: false,
  prints: false,
  journal: false,
  supplies: false,
}

// handleSubmitの中のchecklistオブジェクト作成部分を修正
const journalData = {
  // ...他のデータ
  checklist: {
    pc: checklist.pc || false,
    mic: checklist.mic || false,
    prints: checklist.prints || false,
    journal: checklist.journal || false,
    supplies: checklist.supplies || false,
  },
  // ...他のデータ
}
