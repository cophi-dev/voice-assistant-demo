import { BusinessConfig } from "@/lib/config/businesses";

interface BusinessCardProps {
  business: BusinessConfig;
  onSelect: () => void;
}

export function BusinessCard({ business, onSelect }: BusinessCardProps) {
  return (
    <button
      onClick={onSelect}
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
  );
}