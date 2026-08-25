"use client";

import { useState } from "react";
import { businesses, BusinessConfig } from "@/lib/config/businesses";
import { VoiceCall } from "@/components/VoiceCall";

export default function Home() {
  const [activeBusiness, setActiveBusiness] = useState<BusinessConfig | null>(null);

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Header */}
      <header className="border-b border-neutral-800">
        <div className="max-w-3xl mx-auto px-6 py-6">
          <h1 className="text-xl font-medium text-white">Phonely</h1>
          <p className="text-neutral-500 text-sm mt-1">KI-Telefonassistent für Unternehmen</p>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-3xl mx-auto px-6 py-12">
        <div className="mb-8">
          <p className="text-neutral-400 text-sm">
            Wählen Sie ein Demo-Unternehmen und führen Sie ein Testgespräch.
            Der Assistent begrüßt Sie und kann Termine buchen.
          </p>
        </div>

        <div className="space-y-3">
          {businesses.map((business) => (
            <button
              key={business.id}
              onClick={() => setActiveBusiness(business)}
              className="w-full text-left p-5 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-neutral-700 hover:bg-neutral-800/50 transition-all group"
            >
              <div className="flex items-center gap-4">
                <span className="text-2xl">{business.icon}</span>
                <div className="flex-1 min-w-0">
                  <h2 className="font-medium text-white group-hover:text-orange-400 transition-colors">
                    {business.name}
                  </h2>
                  <p className="text-sm text-neutral-500 mt-0.5">
                    {business.description}
                  </p>
                </div>
                <div className="text-neutral-600 group-hover:text-orange-400 transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </div>
              </div>
            </button>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 border-t border-neutral-800 bg-[#0a0a0a]/80 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <p className="text-neutral-600 text-xs text-center">
            Powered by Grok Voice
          </p>
        </div>
      </footer>

      {/* Voice Call Modal */}
      {activeBusiness && (
        <VoiceCall
          business={activeBusiness}
          onEnd={() => setActiveBusiness(null)}
        />
      )}
    </div>
  );
}