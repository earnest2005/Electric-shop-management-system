import React, { useState } from 'react';
import { X, Save, Database, ShieldCheck, Info, UploadCloud, CheckCircle2 } from 'lucide-react';
import { getStoredFirebaseConfig, saveStoredFirebaseConfig, isRealFirebase } from '../firebase/config';
import { seedLiveFirebase } from '../services/db';
import { useAlert } from '../context/AlertContext';

export default function FirebaseConfigModal({ onClose }) {
  const { toast } = useAlert();
  const [config, setConfig] = useState(getStoredFirebaseConfig());
  const [isSeeding, setIsSeeding] = useState(false);
  const [seedSuccess, setSeedSuccess] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    saveStoredFirebaseConfig(config);
    toast.success("Firebase configuration saved successfully!", "Config Saved");
    onClose();
  };

  const handleSeedFirebase = async () => {
    setIsSeeding(true);
    try {
      await seedLiveFirebase();
      setSeedSuccess(true);
      toast.success("Catalog & Customer Dues uploaded to Cloud Firestore successfully!", "Seed Complete");
      setTimeout(() => setSeedSuccess(false), 4000);
    } catch (err) {
      toast.error("Error seeding Cloud Firestore: " + err.message, "Seed Failed");
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-dark-900 border border-slate-700 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
        <div className="p-4 border-b border-slate-800 bg-dark-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Database className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-white text-base">Firebase Cloud Firestore Connection</h3>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs font-sans max-h-[80vh] overflow-y-auto">
          <div className="bg-amber-500/10 border border-amber-500/30 p-3.5 rounded-xl flex items-start space-x-3 text-amber-300">
            <Info className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-[11px] leading-relaxed space-y-1">
              <p className="font-bold text-amber-200">How to connect your Cloud Firestore database:</p>
              <ol className="list-decimal list-inside text-slate-300 space-y-0.5">
                <li>Open your project at <a href="https://console.firebase.google.com/" target="_blank" rel="noreferrer" className="underline text-amber-400">console.firebase.google.com</a></li>
                <li>Go to <strong>Project Settings ⚙️ ➔ General ➔ Your Apps ➔ Web App (&lt;/&gt;)</strong></li>
                <li>Copy the <code className="bg-dark-800 px-1 py-0.5 rounded text-amber-300">firebaseConfig</code> values below or paste them into your <code className="bg-dark-800 px-1 py-0.5 rounded text-amber-300">.env</code> file.</li>
              </ol>
            </div>
          </div>

          <div className="space-y-3 font-mono">
            <div>
              <label className="block text-slate-400 mb-1">API Key (VITE_FIREBASE_API_KEY)</label>
              <input
                type="text"
                value={config.apiKey || ''}
                onChange={e => setConfig({ ...config, apiKey: e.target.value })}
                className="w-full glass-input px-3 py-2 rounded-lg font-mono text-amber-300"
                placeholder="AIzaSy..."
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Auth Domain (VITE_FIREBASE_AUTH_DOMAIN)</label>
              <input
                type="text"
                value={config.authDomain || ''}
                onChange={e => setConfig({ ...config, authDomain: e.target.value })}
                className="w-full glass-input px-3 py-2 rounded-lg font-mono"
                placeholder="your-project.firebaseapp.com"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Project ID (VITE_FIREBASE_PROJECT_ID)</label>
              <input
                type="text"
                value={config.projectId || ''}
                onChange={e => setConfig({ ...config, projectId: e.target.value })}
                className="w-full glass-input px-3 py-2 rounded-lg font-mono"
                placeholder="your-project-id"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-slate-400 mb-1">Storage Bucket</label>
                <input
                  type="text"
                  value={config.storageBucket || ''}
                  onChange={e => setConfig({ ...config, storageBucket: e.target.value })}
                  className="w-full glass-input px-3 py-2 rounded-lg font-mono text-[11px]"
                  placeholder="your-project.appspot.com"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">App ID</label>
                <input
                  type="text"
                  value={config.appId || ''}
                  onChange={e => setConfig({ ...config, appId: e.target.value })}
                  className="w-full glass-input px-3 py-2 rounded-lg font-mono text-[11px]"
                  placeholder="1:123456789:web:abc..."
                />
              </div>
            </div>
          </div>

          {/* Seed Live Database Helper Button */}
          <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
            <div>
              <div className="font-bold text-white text-xs">Cloud Database Seeder</div>
              <div className="text-[11px] text-slate-400">Populate initial products & customer dues to Cloud Firestore</div>
            </div>

            <button
              type="button"
              onClick={handleSeedFirebase}
              disabled={isSeeding}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-dark-800 hover:bg-slate-800 text-amber-400 border border-slate-700 font-mono transition text-xs shrink-0"
            >
              <UploadCloud className="w-4 h-4" />
              <span>{isSeeding ? 'SEEDING...' : 'Seed Catalog to Cloud'}</span>
            </button>
          </div>

          {seedSuccess && (
            <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400 flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>Catalog & Customer Dues uploaded to Cloud Firestore successfully!</span>
            </div>
          )}

          <div className="pt-3 flex justify-end space-x-2 border-t border-slate-800 font-sans">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold transition shadow-lg shadow-amber-500/20"
            >
              <Save className="w-4 h-4" />
              <span>Save & Connect Firebase</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
