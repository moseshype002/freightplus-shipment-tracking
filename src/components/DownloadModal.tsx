import React, { useState } from 'react';
import { X, Download, Copy, Check, ExternalLink, Terminal, FileCode, AlertCircle, CheckCircle2 } from 'lucide-react';

interface DownloadModalProps {
  onClose: () => void;
}

export const DownloadModal: React.FC<DownloadModalProps> = ({ onClose }) => {
  const [downloadStatus, setDownloadStatus] = useState<'idle' | 'downloading' | 'success' | 'iframe_blocked'>('idle');
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [copiedCurl, setCopiedCurl] = useState<boolean>(false);

  // Direct standalone URL (outside of iframe)
  const directDownloadUrl = `${window.location.origin}/api/download-project`;
  const curlCommand = `curl -L -o freightpulse-shipment-tracking.zip "${directDownloadUrl}"`;

  const handleBlobDownload = async (format: 'zip' | 'tar' = 'zip') => {
    setDownloadStatus('downloading');
    try {
      const endpoint = format === 'zip' ? '/api/download-project' : '/api/download-tar';
      const filename = format === 'zip' ? 'freightpulse-shipment-tracking.zip' : 'freightpulse-shipment-tracking.tar.gz';
      
      const res = await fetch(endpoint);
      if (!res.ok) throw new Error('Download failed from server');
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }, 1000);

      setDownloadStatus('success');
    } catch (err) {
      console.error('Blob download failed, trying base64 fallback:', err);
      // Fallback to base64 if blob was blocked
      try {
        const b64Res = await fetch('/api/download-project-base64');
        if (b64Res.ok) {
          const data = await b64Res.json();
          const byteCharacters = atob(data.base64);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const fallbackBlob = new Blob([byteArray], { type: 'application/zip' });
          const fallbackUrl = window.URL.createObjectURL(fallbackBlob);
          const fallbackLink = document.createElement('a');
          fallbackLink.href = fallbackUrl;
          fallbackLink.download = 'freightpulse-shipment-tracking.zip';
          document.body.appendChild(fallbackLink);
          fallbackLink.click();
          setTimeout(() => {
            window.URL.revokeObjectURL(fallbackUrl);
            document.body.removeChild(fallbackLink);
          }, 1000);
          setDownloadStatus('success');
          return;
        }
      } catch (e) {
        console.error('Base64 fallback failed:', e);
      }
      setDownloadStatus('iframe_blocked');
    }
  };

  const copyToClipboard = (text: string, type: 'link' | 'curl') => {
    navigator.clipboard.writeText(text);
    if (type === 'link') {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } else {
      setCopiedCurl(true);
      setTimeout(() => setCopiedCurl(false), 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs">
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-2xl w-full p-6 shadow-2xl relative max-h-[92vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-white p-1 rounded-md"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-1">
          <Download className="w-5 h-5 text-cyan-400" />
          <h2 className="text-base font-bold text-white">
            Download Project Files
          </h2>
        </div>
        <p className="text-xs text-slate-400 mb-5">
          Get the complete FreightPulse full-stack shipment tracking platform (<code className="font-mono text-cyan-300">freightpulse-shipment-tracking.zip</code>, ~2.3 MB).
        </p>

        {/* Notice about preview iframe sandbox */}
        <div className="mb-5 p-3.5 bg-cyan-950/40 border border-cyan-800/60 rounded-lg text-xs text-slate-300 space-y-2">
          <div className="flex items-start gap-2 text-cyan-300 font-semibold">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>Why did clicking the link not download in the preview?</span>
          </div>
          <p className="text-slate-300/90 leading-relaxed text-[11px] pl-6">
            In web development platforms like Google AI Studio, the application runs inside a secure sandboxed <code>&lt;iframe&gt;</code>. Browsers often restrict automatic file downloads initiated directly from inside an iframe.
          </p>
        </div>

        {/* Primary Solution: Direct Link in New Tab */}
        <div className="space-y-4 text-xs">
          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white text-xs uppercase tracking-wide text-cyan-400">
                Method 1: Direct Download Link (Opens outside iframe)
              </span>
              <a
                href={directDownloadUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-cyan-400 hover:text-cyan-300 underline"
              >
                <span>Open Link in New Tab</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <p className="text-slate-400 text-[11px]">
              Copy this direct link and open it in your browser address bar:
            </p>

            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={directDownloadUrl}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono select-all focus:outline-none"
              />
              <button
                type="button"
                onClick={() => copyToClipboard(directDownloadUrl, 'link')}
                className="px-3 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 shrink-0"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLink ? 'Copied!' : 'Copy Link'}</span>
              </button>
            </div>
          </div>

          {/* Method 2: Trigger In-Browser Blob Download */}
          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
            <span className="font-bold text-white text-xs uppercase tracking-wide text-emerald-400 block">
              Method 2: Force Browser In-Memory Download
            </span>
            <p className="text-slate-400 text-[11px]">
              This fetches the file into memory as a binary blob and attempts to prompt your browser's "Save As" dialog:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleBlobDownload('zip')}
                disabled={downloadStatus === 'downloading'}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-2 border border-slate-700"
              >
                <Download className="w-4 h-4 text-cyan-400" />
                <span>
                  {downloadStatus === 'downloading'
                    ? 'Downloading...'
                    : 'Download ZIP (.zip)'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleBlobDownload('tar')}
                disabled={downloadStatus === 'downloading'}
                className="w-full py-2.5 bg-slate-850 hover:bg-slate-750 text-slate-300 hover:text-white font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-2 border border-slate-700/80"
              >
                <Download className="w-4 h-4 text-amber-400" />
                <span>Download TAR.GZ</span>
              </button>
            </div>
            {downloadStatus === 'success' && (
              <p className="text-emerald-400 text-[11px] flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Download dispatched. If your browser blocked it, use Method 1 above!</span>
              </p>
            )}
          </div>

          {/* Method 3: One-line Terminal Command */}
          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
            <span className="font-bold text-white text-xs uppercase tracking-wide text-amber-400 block">
              Method 3: Terminal Command (curl)
            </span>
            <p className="text-slate-400 text-[11px]">
              Run this single command in your terminal to download and save the file directly:
            </p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={curlCommand}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-[11px] text-amber-300 font-mono select-all focus:outline-none"
              />
              <button
                type="button"
                onClick={() => copyToClipboard(curlCommand, 'curl')}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs rounded-lg transition-colors flex items-center gap-1.5 shrink-0 border border-slate-700"
              >
                {copiedCurl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCurl ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Close Button */}
        <div className="mt-5 pt-3 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
