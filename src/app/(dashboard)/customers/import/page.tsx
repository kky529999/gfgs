'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { importCustomersFromExcelAction } from '@/lib/import/excel';
import { parseExcelFile } from '@/lib/import/excel-utils';
import { getAuthInfoAction } from '@/lib/auth/actions';

interface ParseResult {
  headers: string[];
  rows: Record<string, unknown>[];
  preview: { name: string; phone: string; area: string; capacity: string }[];
}

export default function ImportCustomersPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [auth, setAuth] = useState<{ user_id: string; role: string } | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    imported?: number;
    skipped?: number;
    errors?: string[];
    error?: string;
  } | null>(null);
  const [error, setError] = useState('');

  // Check auth on mount
  useState(() => {
    getAuthInfoAction().then((res) => {
      if (res.success && res.data) {
        setAuth(res.data);
        if (res.data.role !== 'admin' && res.data.role !== 'gm') {
          router.push('/customers');
        }
      }
    });
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setError('');
    setResult(null);

    try {
      const buffer = await selectedFile.arrayBuffer();
      const { headers, rows } = parseExcelFile(buffer);

      if (rows.length === 0) {
        setError('文件中没有数据');
        return;
      }

      // Create preview (first 5 rows)
      const preview = rows.slice(0, 5).map((row) => ({
        name: String(row['姓名'] || row['客户姓名'] || row['名称'] || '-'),
        phone: String(row['电话'] || row['手机'] || row['手机号'] || '-'),
        area: String(row['区域'] || row['地区'] || '-'),
        capacity: String(row['装机容量'] || row['容量'] || '-'),
      }));

      setParseResult({ headers, rows, preview });
    } catch (err) {
      setError('无法解析Excel文件');
    }
  };

  const handleImport = async () => {
    if (!file) return;

    setImporting(true);
    setError('');
    setResult(null);

    try {
      const buffer = await file.arrayBuffer();
      const importResult = await importCustomersFromExcelAction(buffer);
      setResult(importResult);
    } catch (err) {
      setError('导入失败');
    }

    setImporting(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/customers"
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">导入客户</h1>
          <p className="text-gray-500 mt-1">从Excel文件批量导入客户数据</p>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-medium text-blue-800 mb-2">导入说明</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>支持 .xlsx 和 .xls 格式的Excel文件</li>
          <li>第一行应为表头，数据从第二行开始</li>
          <li>支持的列：姓名、电话、区域、地址、装机容量、品牌、板数</li>
          <li>业务员和技术员会根据姓名自动匹配</li>
        </ul>
      </div>

      {/* File Upload */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              选择Excel文件
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
            />
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          {/* Preview */}
          {parseResult && (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-4 py-3 border-b">
                <h3 className="font-medium text-gray-700">
                  数据预览 ({parseResult.rows.length} 条)
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium text-gray-600">姓名</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-600">电话</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-600">区域</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-600">容量</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {parseResult.preview.map((row, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-4 py-2">{row.name}</td>
                        <td className="px-4 py-2">{row.phone}</td>
                        <td className="px-4 py-2">{row.area}</td>
                        <td className="px-4 py-2">{row.capacity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {parseResult.rows.length > 5 && (
                <div className="px-4 py-2 bg-gray-50 text-sm text-gray-500">
                  还有 {parseResult.rows.length - 5} 条数据...
                </div>
              )}
            </div>
          )}

          {/* Result */}
          {result && (
            <div className={`p-4 rounded-lg ${result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              {result.success ? (
                <div>
                  <h3 className="font-medium text-green-800">导入成功</h3>
                  <p className="text-sm text-green-700 mt-1">
                    已导入 {result.imported} 条数据
                    {(result.skipped ?? 0) > 0 && `，跳过 ${result.skipped} 条`}
                  </p>
                  {result.errors && result.errors.length > 0 && (
                    <details className="mt-2">
                      <summary className="text-sm text-green-700 cursor-pointer">
                        查看错误详情 ({result.errors.length})
                      </summary>
                      <ul className="mt-1 text-xs text-green-700 list-disc list-inside">
                        {result.errors.slice(0, 10).map((err, i) => (
                          <li key={i}>{err}</li>
                        ))}
                        {result.errors.length > 10 && (
                          <li>...还有 {result.errors.length - 10} 条</li>
                        )}
                      </ul>
                    </details>
                  )}
                </div>
              ) : (
                <div>
                  <h3 className="font-medium text-red-800">导入失败</h3>
                  <p className="text-sm text-red-700 mt-1">{result.error}</p>
                  {result.errors && (
                    <ul className="mt-2 text-xs text-red-700 list-disc list-inside">
                      {result.errors.slice(0, 5).map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-4 pt-4">
            <Link
              href="/customers"
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              返回列表
            </Link>
            {parseResult && !result?.success && (
              <>
                <button
                  onClick={() => {
                    setFile(null);
                    setParseResult(null);
                    setResult(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  重新选择
                </button>
                <button
                  onClick={handleImport}
                  disabled={importing}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                  {importing ? '导入中...' : `导入 ${parseResult.rows.length} 条`}
                </button>
              </>
            )}
            {result?.success && (
              <Link
                href="/customers"
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                查看客户列表
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}