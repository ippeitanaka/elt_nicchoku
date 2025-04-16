import type React from "react"
import "@/app/globals.css"
import { Quicksand } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"

const quicksand = Quicksand({
  subsets: ["latin"],
  variable: "--font-quicksand",
})

export const metadata = {
  title: "救急救命士学科 日直日誌アプリ",
  description: "救急救命士学科の日直日誌を管理するアプリケーション",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <body className={`${quicksand.className} font-sans`}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          <div className="min-h-screen bg-background">
            <header className="border-b bg-gradient-to-r from-primary/10 to-secondary/20">
              <div className="container mx-auto py-4 px-4">
                <nav className="flex justify-between items-center">
                  <div className="font-bold text-lg flex items-center">
                    <span className="text-primary mr-2">✏️</span>
                    <span className="text-gray-800">救急救命士学科 日直日誌</span>
                  </div>
                  <div className="flex gap-4">
                    <a href="/" className="text-sm hover:underline hover:text-primary transition-colors">
                      ホーム
                    </a>
                    <a href="/journals" className="text-sm hover:underline hover:text-primary transition-colors">
                      日誌一覧
                    </a>
                    <a href="/print" className="text-sm hover:underline hover:text-primary transition-colors">
                      印刷・出力
                    </a>
                  </div>
                </nav>
              </div>
            </header>
            {children}
          </div>
        </ThemeProvider>
      </body>
    </html>
  )
}


import './globals.css'