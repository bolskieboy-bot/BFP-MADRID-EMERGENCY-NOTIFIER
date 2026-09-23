import { X, Phone, MessageSquare, Shield, Flame, HeartPulse, Building2, MapPin } from 'lucide-react';
import { MADRID_EMERGENCY_STATIONS } from '../../constants/madridLocations';
import { createDirectSmsUri } from '../../services/smsService';
import BfpMadridLogo from '../Common/BfpMadridLogo';

interface HotlineModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function HotlineModal({ isOpen, onClose }: HotlineModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-3xl p-6 shadow-2xl text-slate-100 max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <BfpMadridLogo size="md" withGlow={true} />
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight text-white uppercase">
                BFP MADRID HOTLINE DIRECTORY
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Direct emergency dispatch numbers for Madrid, Surigao del Sur
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white bg-slate-800 p-2 rounded-full transition shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Directory Cards */}
        <div className="mt-4 space-y-3">
          {MADRID_EMERGENCY_STATIONS.map((station) => (
            <div
              key={station.id}
              className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 transition"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white ${
                    station.category === 'fire'
                      ? 'bg-rose-600'
                      : station.category === 'medical'
                      ? 'bg-emerald-600'
                      : station.category === 'rescue'
                      ? 'bg-sky-600'
                      : 'bg-indigo-600'
                  }`}>
                    {station.category === 'fire' ? (
                      <BfpMadridLogo size="sm" />
                    ) : station.category === 'medical' ? (
                      <HeartPulse className="w-5 h-5" />
                    ) : (
                      <Shield className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">{station.name}</h3>
                    <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-rose-400" />
                      <span>{station.address}</span>
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-amber-400">
                  {station.hotline}
                </span>

                <div className="flex items-center gap-2">
                  <a
                    href={createDirectSmsUri(station.smsNumber, 'MADRID EMERGENCY ASSISTANCE REQUESTED.')}
                    className="py-1.5 px-3 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center gap-1 shadow transition"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>SMS</span>
                  </a>
                  <a
                    href={`tel:${station.hotline.split('/')[0].trim()}`}
                    className="py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 shadow transition"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Call</span>
                  </a>
                </div>
              </div>
            </div>
          ))}

          {/* National Hotlines */}
          <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-900/60 text-xs">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-rose-300">National Emergency Hotline</span>
                <div className="text-[11px] text-slate-400">All-hazard nationwide emergency dispatch</div>
              </div>
              <a
                href="tel:911"
                className="py-1.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black font-mono text-sm shadow-md"
              >
                911
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
