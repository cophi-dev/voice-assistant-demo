"use client";

import { useState } from "react";
import { businesses, BusinessConfig } from "@/lib/config/businesses";
import { VoiceCall } from "@/components/VoiceCall";

export default function Home() {
  const [activeBusiness, setActiveBusiness] = useState<BusinessConfig | null>(null);

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Hero */}
      <header className="border-b border-neutral-800">
        <div className="max-w-4xl mx-auto px-6 py-12">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center">
              <span className="text-white font-bold text-sm">L</span>
            </div>
            <span className="text-white font-medium">Lexi</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-medium text-white leading-tight">
            KI-Telefonassistent für<br />Kleinunternehmen
          </h1>
          <p className="text-neutral-400 mt-4 text-lg max-w-xl">
            Verpassen Sie nie wieder einen Anruf. Lexi nimmt Anrufe entgegen, 
            beantwortet Fragen und vereinbart Termine – rund um die Uhr.
          </p>
        </div>
      </header>

      {/* Use Cases */}
      <section className="border-b border-neutral-800">
        <div className="max-w-4xl mx-auto px-6 py-12">
          <h2 className="text-sm font-medium text-neutral-500 uppercase tracking-wide mb-6">Anwendungsfälle</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="p-5 rounded-xl bg-neutral-900 border border-neutral-800">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center mb-4">
                <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="font-medium text-white mb-2">Terminvereinbarung</h3>
              <p className="text-sm text-neutral-500">
                Lexi vereinbart Termine während des Gesprächs und trägt sie direkt in Ihren Kalender ein.
              </p>
            </div>
            <div className="p-5 rounded-xl bg-neutral-900 border border-neutral-800">
              <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center mb-4">
                <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="font-medium text-white mb-2">FAQ beantworten</h3>
              <p className="text-sm text-neutral-500">
                Häufige Fragen zu Öffnungszeiten, Preisen und Leistungen werden sofort beantwortet.
              </p>
            </div>
            <div className="p-5 rounded-xl bg-neutral-900 border border-neutral-800">
              <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center mb-4">
                <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="font-medium text-white mb-2">Anfragen aufnehmen</h3>
              <p className="text-sm text-neutral-500">
                Wenn Sie nicht erreichbar sind, nimmt Lexi Anfragen auf und sendet Ihnen eine Zusammenfassung.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-b border-neutral-800">
        <div className="max-w-4xl mx-auto px-6 py-12">
          <h2 className="text-sm font-medium text-neutral-500 uppercase tracking-wide mb-6">Features</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3 p-4 rounded-lg hover:bg-neutral-900/50 transition-colors">
              <span className="text-orange-400 mt-0.5">✓</span>
              <div>
                <h3 className="text-white text-sm font-medium">24/7 verfügbar</h3>
                <p className="text-neutral-500 text-sm">Auch nachts und am Wochenende erreichbar</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-lg hover:bg-neutral-900/50 transition-colors">
              <span className="text-orange-400 mt-0.5">✓</span>
              <div>
                <h3 className="text-white text-sm font-medium">Natürliche Gespräche</h3>
                <p className="text-neutral-500 text-sm">Klingt wie ein echter Mitarbeiter, nicht wie ein Bot</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-lg hover:bg-neutral-900/50 transition-colors">
              <span className="text-orange-400 mt-0.5">✓</span>
              <div>
                <h3 className="text-white text-sm font-medium">Mehrsprachig</h3>
                <p className="text-neutral-500 text-sm">Deutsch, Englisch und weitere Sprachen</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-lg hover:bg-neutral-900/50 transition-colors">
              <span className="text-orange-400 mt-0.5">✓</span>
              <div>
                <h3 className="text-white text-sm font-medium">Kalender-Integration</h3>
                <p className="text-neutral-500 text-sm">Google Calendar, Outlook, iCloud</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-lg hover:bg-neutral-900/50 transition-colors">
              <span className="text-orange-400 mt-0.5">✓</span>
              <div>
                <h3 className="text-white text-sm font-medium">Anruf-Weiterleitung</h3>
                <p className="text-neutral-500 text-sm">Bei Bedarf an einen Mitarbeiter weiterleiten</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-lg hover:bg-neutral-900/50 transition-colors">
              <span className="text-orange-400 mt-0.5">✓</span>
              <div>
                <h3 className="text-white text-sm font-medium">Transkript per E-Mail</h3>
                <p className="text-neutral-500 text-sm">Nach jedem Anruf erhalten Sie eine Zusammenfassung</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Demo */}
      <section className="border-b border-neutral-800" id="demo">
        <div className="max-w-4xl mx-auto px-6 py-12">
          <h2 className="text-sm font-medium text-neutral-500 uppercase tracking-wide mb-2">Live Demo</h2>
          <p className="text-white text-xl font-medium mb-2">Testen Sie Lexi jetzt</p>
          <p className="text-neutral-500 text-sm mb-8">
            Wählen Sie ein Demo-Unternehmen und führen Sie ein Testgespräch.
            Jeder Assistent hat eine eigene Stimme und Persönlichkeit.
          </p>

          <div className="space-y-3">
            {businesses.map((business) => (
              <button
                key={business.id}
                onClick={() => setActiveBusiness(business)}
                className="w-full text-left p-5 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-neutral-700 hover:bg-neutral-800/50 transition-all group"
              >
                <div className="flex items-start gap-4">
                  <span className="text-2xl mt-0.5">{business.icon}</span>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-white group-hover:text-orange-400 transition-colors">
                      {business.name}
                    </h3>
                    <p className="text-sm text-neutral-500 mt-0.5">
                      {business.description}
                    </p>
                    <div className="mt-3 flex items-center gap-2">
                      <span className="text-xs px-2 py-1 rounded-full bg-neutral-800 text-neutral-300">
                        {business.assistantName}
                      </span>
                      <span className="text-xs text-neutral-600">
                        {business.assistantPersonality}
                      </span>
                    </div>
                  </div>
                  <div className="text-neutral-600 group-hover:text-orange-400 transition-colors mt-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section>
        <div className="max-w-4xl mx-auto px-6 py-12">
          <div className="text-center">
            <h2 className="text-white text-xl font-medium mb-2">Bereit für Ihren eigenen Assistenten?</h2>
            <p className="text-neutral-500 text-sm mb-6">
              Einrichtung in wenigen Minuten. Keine Programmierkenntnisse erforderlich.
            </p>
            <button className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg transition-colors">
              Jetzt starten
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-neutral-800">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <p className="text-neutral-600 text-xs text-center">
            Powered by Grok Voice · Made in Germany
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