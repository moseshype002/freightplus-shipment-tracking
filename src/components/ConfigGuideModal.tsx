import React, { useState } from 'react';
import { X, Terminal, Database, Key, Globe, Copy, Check, FileCode, CheckCircle2, Download } from 'lucide-react';
import { POSTGRESQL_DDL, MONGOOSE_SCHEMAS_CODE } from '../server/db/schema.js';

interface ConfigGuideModalProps {
  onClose: () => void;
}

export const ConfigGuideModal: React.FC<ConfigGuideModalProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'env' | 'postgres' | 'mongodb' | 'maps' | 'run'>('env');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const ENV_SNIPPET = `# ====================================================================
# FreightPulse - Production Environment Variables (.env)
# ====================================================================
PORT=3000
APP_URL="http://localhost:3000"

# 1. JWT Authentication Secret (Required in production)
JWT_SECRET="generate-a-random-256-bit-key-using-openssl-rand-base64-32"
JWT_EXPIRES_IN="7d"

# 2. Database Connection Options (Plug in your DB string)
# Option A: MongoDB URI (MongoDB Atlas or local)
MONGODB_URI="mongodb+srv://<user>:<password>@cluster.mongodb.net/freightpulse?retryWrites=true&w=majority"

# Option B: PostgreSQL URL (Supabase, Neon, AWS RDS, Cloud SQL)
DATABASE_URL="postgresql://postgres:<password>@localhost:5432/freightpulse"

# 3. Maps & Geocoding Key (Optional for Google Maps Platform)
MAPS_API_KEY="AIzaSyYourGoogleMapsPlatformAPIKeyHere"
VITE_MAPS_API_KEY="AIzaSyYourGoogleMapsPlatformAPIKeyHere"

# 4. Carrier Dispatch Webhook Secret (FedEx / DHL EDI hooks)
CARRIER_WEBHOOK_SECRET="whsec_prod_carrier_secret_token"`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs">
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-4xl w-full p-6 shadow-2xl relative max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-cyan-400" />
            <div>
              <h2 className="text-base font-bold text-white">
                Integration & Database Configuration Guide
              </h2>
              <p className="text-xs text-slate-400">
                Plug in your own MongoDB, PostgreSQL, JWT secrets, and Google Maps API keys.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-md"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Strip */}
        <div className="flex items-center gap-2 pt-4 border-b border-slate-800 overflow-x-auto text-xs pb-3">
          <button
            onClick={() => setActiveTab('env')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'env'
                ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>.env Configuration</span>
          </button>

          <button
            onClick={() => setActiveTab('postgres')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'postgres'
                ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>PostgreSQL Schema (DDL)</span>
          </button>

          <button
            onClick={() => setActiveTab('mongodb')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'mongodb'
                ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>MongoDB / Mongoose</span>
          </button>

          <button
            onClick={() => setActiveTab('maps')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'maps'
                ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Maps & Telemetry</span>
          </button>

          <button
            onClick={() => setActiveTab('run')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'run'
                ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>Run & Deploy Guide</span>
          </button>
        </div>

        {/* Tab Content Viewport */}
        <div className="py-4 overflow-y-auto flex-1 text-xs space-y-4">
          {activeTab === 'env' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-slate-300">
                  Copy this sample <code className="text-cyan-300 font-mono">.env</code> configuration file into your project root.
                </p>
                <button
                  onClick={() => copyToClipboard(ENV_SNIPPET, 'env')}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 text-xs flex items-center gap-1"
                >
                  {copiedKey === 'env' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'env' ? 'Copied' : 'Copy .env'}</span>
                </button>
              </div>
              <pre className="p-4 bg-slate-950 rounded-lg border border-slate-800 text-slate-300 font-mono text-[11px] overflow-x-auto leading-relaxed">
                {ENV_SNIPPET}
              </pre>
            </div>
          )}

          {activeTab === 'postgres' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-slate-300">
                  Run this SQL DDL statement in your PostgreSQL database (Supabase SQL Editor, Neon, or psql).
                </p>
                <button
                  onClick={() => copyToClipboard(POSTGRESQL_DDL, 'pg')}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 text-xs flex items-center gap-1"
                >
                  {copiedKey === 'pg' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'pg' ? 'Copied DDL' : 'Copy SQL'}</span>
                </button>
              </div>
              <pre className="p-4 bg-slate-950 rounded-lg border border-slate-800 text-cyan-300/90 font-mono text-[11px] overflow-x-auto leading-relaxed max-h-96">
                {POSTGRESQL_DDL.trim()}
              </pre>
            </div>
          )}

          {activeTab === 'mongodb' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-slate-300">
                  Mongoose schema models ready to import into a <code className="text-cyan-300 font-mono">models/Shipment.ts</code> file.
                </p>
                <button
                  onClick={() => copyToClipboard(MONGOOSE_SCHEMAS_CODE, 'mongo')}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 text-xs flex items-center gap-1"
                >
                  {copiedKey === 'mongo' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'mongo' ? 'Copied Mongoose' : 'Copy Code'}</span>
                </button>
              </div>
              <pre className="p-4 bg-slate-950 rounded-lg border border-slate-800 text-amber-300/90 font-mono text-[11px] overflow-x-auto leading-relaxed max-h-96">
                {MONGOOSE_SCHEMAS_CODE.trim()}
              </pre>
            </div>
          )}

          {activeTab === 'maps' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-lg space-y-2">
                <h4 className="font-bold text-white text-sm">Google Maps & GPS Integration</h4>
                <p className="text-slate-400 leading-relaxed">
                  FreightPulse includes a built-in SVG interactive corridor visualizer that works without any external API keys out of the box.
                </p>
                <p className="text-slate-400 leading-relaxed">
                  To enable live satellite tiles or Google Maps Platform route rendering:
                </p>
                <ol className="list-decimal pl-5 space-y-1 text-slate-300">
                  <li>Get an API key from Google Cloud Console with Maps JavaScript API enabled.</li>
                  <li>Set <code className="font-mono text-cyan-300">VITE_MAPS_API_KEY="AIza..."</code> in your <code className="font-mono">.env</code>.</li>
                  <li>The tracking component will automatically load dynamic satellite tiles when detected.</li>
                </ol>
              </div>
            </div>
          )}

          {activeTab === 'run' && (
            <div className="space-y-4 text-slate-300">
              {/* Direct Archive Download Box */}
              <div className="p-4 bg-gradient-to-r from-cyan-950/50 to-blue-950/40 border border-cyan-800/60 rounded-xl space-y-3">
                <div className="flex items-center gap-2">
                  <Download className="w-5 h-5 text-cyan-400" />
                  <h4 className="font-bold text-white text-sm">Download Complete Project Archive</h4>
                </div>
                <p className="text-slate-400 text-xs leading-relaxed">
                  Export the complete codebase (frontend, backend, database models, seed consignments, and documentation) ready for local development or deployment:
                </p>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
                  <a
                    href={`${window.location.origin}/api/download-project`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2 bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Open & Download ZIP (.zip)</span>
                  </a>

                  <button
                    type="button"
                    onClick={() => {
                      fetch('/api/download-project')
                        .then(r => r.blob())
                        .then(b => {
                          const u = window.URL.createObjectURL(b);
                          const a = document.createElement('a');
                          a.href = u;
                          a.download = 'freightpulse-shipment-tracking.zip';
                          document.body.appendChild(a);
                          a.click();
                          setTimeout(() => { window.URL.revokeObjectURL(u); document.body.removeChild(a); }, 100);
                        })
                        .catch(err => console.error(err));
                    }}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition-colors border border-slate-700"
                  >
                    Force Browser Blob Save
                  </button>
                </div>
                <div className="pt-2 text-[11px] text-slate-400 flex items-center gap-2">
                  <span className="text-slate-500 font-mono">Direct URL:</span>
                  <code className="text-cyan-300 font-mono bg-slate-950 px-2 py-0.5 rounded select-all truncate">
                    {window.location.origin}/api/download-project
                  </code>
                </div>
              </div>

              <h4 className="font-bold text-white text-sm pt-2">How to Run Locally</h4>
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-2 font-mono text-[11px]">
                <p className="text-slate-500"># 1. Unzip the downloaded file and enter directory</p>
                <p className="text-cyan-300">unzip freightpulse-shipment-tracking.zip</p>
                <p className="text-cyan-300">cd freightpulse-shipment-tracking</p>
                <p className="text-slate-500 mt-2"># 2. Install dependencies</p>
                <p className="text-cyan-300">npm install</p>
                <p className="text-slate-500 mt-2"># 3. Run full-stack dev server (Express + Vite on port 3000)</p>
                <p className="text-cyan-300">npm run dev</p>
                <p className="text-slate-500 mt-2"># 4. Build for production</p>
                <p className="text-cyan-300">npm run build</p>
                <p className="text-slate-500 mt-2"># 5. Start production server</p>
                <p className="text-cyan-300">npm start</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs rounded-lg transition-colors"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
