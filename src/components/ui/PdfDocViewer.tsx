'use client';

interface Props {
  url: string;
  filename?: string;
}

export function PdfDocViewer({ url, filename = 'document' }: Props) {
  if (!url) return null;
  const isPdf = url.toLowerCase().includes('.pdf') || url.toLowerCase().includes('pdf');

  return (
    <div className="rounded-xl overflow-hidden border border-gray-200 bg-gray-50 my-4">
      <div className="bg-gray-100 border-b border-gray-200 px-4 py-2.5 flex items-center justify-between">
        <span className="text-xs font-medium text-gray-700 truncate max-w-xs sm:max-w-md">
          📄 {filename}
        </span>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-600 hover:text-blue-800 font-medium underline flex items-center gap-1"
        >
          <span>Open Fullscreen</span>
          <span>↗</span>
        </a>
      </div>
      {isPdf ? (
        <iframe src={url} title={filename} className="w-full h-[65vh] border-0" />
      ) : (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
          <span className="text-4xl mb-3">📄</span>
          <p className="text-sm font-medium text-gray-700 mb-1">{filename}</p>
          <p className="text-xs text-gray-500 mb-4 max-w-xs">
            This document format can be viewed or downloaded in a new tab.
          </p>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-semibold hover:bg-blue-700 transition-colors shadow-sm"
          >
            Download / View Document
          </a>
        </div>
      )}
    </div>
  );
}
