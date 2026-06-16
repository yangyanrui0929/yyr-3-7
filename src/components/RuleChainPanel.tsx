import React from 'react';
import { useGameStore } from '../store/useGameStore';
import { Rule } from '../utils/constants';
import { Zap, Sun, Moon, BatteryWarning, AlertTriangle, ChevronRight } from 'lucide-react';

const CONDITION_CONFIG: Record<string, { icon: React.ReactNode; color: string; bgColor: string; label: string }> = {
  day: {
    icon: <Sun className="w-3.5 h-3.5" />,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    label: '白天',
  },
  night: {
    icon: <Moon className="w-3.5 h-3.5" />,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
    label: '夜晚',
  },
  low_battery: {
    icon: <BatteryWarning className="w-3.5 h-3.5" />,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    label: '低电量',
  },
  fault: {
    icon: <AlertTriangle className="w-3.5 h-3.5" />,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    label: '故障',
  },
};

const ACTION_CONFIG: Record<string, { emoji: string; color: string; label: string }> = {
  prioritize_factory: { emoji: '🏭', color: 'text-orange-600', label: '优先工坊' },
  prioritize_house: { emoji: '🏠', color: 'text-green-600', label: '优先住房' },
  cutoff_nonessential: { emoji: '✂️', color: 'text-red-600', label: '关闭非必要' },
  bypass_fault: { emoji: '🔄', color: 'text-blue-600', label: '绕行故障' },
};

export const RuleChainPanel: React.FC = () => {
  const { rules, toggleRule } = useGameStore();
  const dayTime = useGameStore((s) => s.dayTime);
  const isNight = dayTime >= 50;

  return (
    <div
      className={`rounded-2xl p-4 shadow-xl border backdrop-blur-md ${
        isNight
          ? 'bg-slate-800/80 border-slate-700 text-slate-200'
          : 'bg-white/90 border-white/50 text-gray-700'
      }`}
    >
      <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
        <Zap className="w-4 h-4 text-yellow-500" />
        逻辑开关 · 规则链
      </h3>

      <div className="space-y-2">
        {rules.map((rule, index) => (
          <RuleCard
            key={rule.id}
            rule={rule}
            index={index}
            isLast={index === rules.length - 1}
            onToggle={() => toggleRule(rule.id)}
            isNight={isNight}
          />
        ))}
      </div>

      <div className="mt-3 pt-3 border-t border-gray-300/30">
        <p className={`text-xs ${isNight ? 'text-slate-400' : 'text-gray-500'}`}>
          💡 启用规则后，电网将自动根据条件切换供电策略
        </p>
      </div>
    </div>
  );
};

interface RuleCardProps {
  rule: Rule;
  index: number;
  isLast: boolean;
  onToggle: () => void;
  isNight: boolean;
}

const RuleCard: React.FC<RuleCardProps> = ({ rule, index, isLast, onToggle, isNight }) => {
  const condition = CONDITION_CONFIG[rule.condition];
  const action = ACTION_CONFIG[rule.action];

  return (
    <div className="relative">
      <div
        className={`
          relative rounded-xl p-3 transition-all duration-300 cursor-pointer border
          ${rule.enabled
            ? rule.triggered
              ? isNight
                ? 'bg-emerald-900/40 border-emerald-500/50 shadow-lg shadow-emerald-500/20'
                : 'bg-emerald-50 border-emerald-300 shadow-lg shadow-emerald-200/50'
              : isNight
                ? 'bg-slate-700/40 border-slate-600/50'
                : 'bg-gray-50 border-gray-200'
            : isNight
              ? 'bg-slate-800/30 border-slate-700/30 opacity-50'
              : 'bg-gray-50/50 border-gray-100 opacity-50'
          }
        `}
        onClick={onToggle}
      >
        <div className="flex items-center gap-2">
          <div
            className={`
              w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all duration-300
              ${rule.triggered
                ? 'bg-emerald-500 text-white animate-pulse'
                : rule.enabled
                  ? isNight ? 'bg-slate-600 text-slate-300' : 'bg-gray-200 text-gray-500'
                  : isNight ? 'bg-slate-700 text-slate-500' : 'bg-gray-100 text-gray-400'
              }
            `}
          >
            {rule.triggered ? '⚡' : index + 1}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className={`text-xs font-bold ${rule.triggered ? (isNight ? 'text-emerald-300' : 'text-emerald-700') : ''}`}>
                {rule.name}
              </span>
              {rule.triggered && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                  isNight ? 'bg-emerald-500/30 text-emerald-300' : 'bg-emerald-100 text-emerald-700'
                }`}>
                  触发中
                </span>
              )}
            </div>
            <p className={`text-[10px] mt-0.5 ${isNight ? 'text-slate-400' : 'text-gray-500'}`}>
              {rule.description}
            </p>
          </div>

          <div
            className={`
              w-9 h-5 rounded-full relative transition-all duration-300 shrink-0
              ${rule.enabled
                ? rule.triggered
                  ? 'bg-emerald-500'
                  : isNight ? 'bg-slate-500' : 'bg-blue-400'
                : isNight ? 'bg-slate-600' : 'bg-gray-300'
              }
            `}
          >
            <div
              className={`
                absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-300
                ${rule.enabled ? 'left-[18px]' : 'left-0.5'}
              `}
            />
          </div>
        </div>

        <div className="flex items-center gap-1.5 mt-2">
          <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md ${condition.bgColor} ${condition.color}`}>
            {condition.icon}
            {condition.label}
          </span>

          <ChevronRight className={`w-3 h-3 ${isNight ? 'text-slate-500' : 'text-gray-400'}`} />

          <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md ${action.color} ${
            isNight ? 'bg-slate-700/50' : 'bg-gray-100'
          }`}>
            {action.emoji}
            {action.label}
          </span>
        </div>
      </div>

      {!isLast && (
        <div
          className={`absolute left-[11px] -bottom-2 w-0.5 h-4 ${
            rule.triggered
              ? 'bg-emerald-400'
              : isNight ? 'bg-slate-600' : 'bg-gray-200'
          }`}
        />
      )}
    </div>
  );
};
