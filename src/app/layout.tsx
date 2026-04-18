import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "客户进度跟踪",
  description: "陕西智光新程能源科技有限公司客户进度跟踪系统",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen flex flex-col bg-gray-50">
        <nav className="flex-none border-b bg-white px-6 py-3">
          <div className="flex items-center gap-8">
            <div className="text-lg font-semibold text-gray-900">智光新程</div>
            <div className="flex gap-6">
              <a href="/customers" className="text-sm font-medium text-blue-600">客户列表</a>
            </div>
          </div>
        </nav>
        <div className="flex flex-1 flex-col">
          {children}
        </div>
      </body>
    </html>
  );
}
