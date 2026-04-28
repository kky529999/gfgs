import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '智光新程业务管理系统',
  description: '陕西智光新程能源科技有限公司业务管理系统',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body style={{ fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
        {children}
      </body>
    </html>
  );
}
