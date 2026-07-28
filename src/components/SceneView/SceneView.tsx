import { useState } from 'react';
import type { MultiLink, SimulationParameters, SimulationResult } from '../../models/types';
import { formatEngineering } from '../../utils/format';

interface SceneViewProps {
  parameters: SimulationParameters;
  result: SimulationResult;
  links: MultiLink[];
  multiMode: boolean;
}

export function SceneView({ parameters, result, links, multiMode }: SceneViewProps) {
  const [view, setView] = useState<'top' | 'side' | 'block'>('top');
  const status = result.modulatedSnr >= 10 ? '#5ae39f' : result.modulatedSnr >= 3 ? '#f1b84b' : '#ff6b6b';
  const beamOpacity = Math.max(0.18, Math.min(0.9, 0.25 + Math.log10(parameters.source.radiantIntensityWsr + 1) * 0.45));
  const cone = Math.min(48, Math.max(12, parameters.source.divergenceRad * 90));
  const lensRadius = Math.min(38, Math.max(16, parameters.optics.apertureDiameterM * 950));

  return (
    <section className="scene-card">
      <div className="card-title-row">
        <div>
          <span className="eyebrow">LIVE OPTICAL PATH</span>
          <h2>动态光链路</h2>
        </div>
        <div className="view-tabs" role="tablist">
          {([
            ['top', '顶视图'],
            ['side', '侧视图'],
            ['block', '系统框图'],
          ] as const).map(([id, label]) => (
            <button key={id} className={view === id ? 'active' : ''} onClick={() => setView(id)}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="scene-canvas">
        <svg viewBox="0 0 900 330" role="img" aria-label="红外光链路动态场景">
          <defs>
            <linearGradient id="beam" x1="0" x2="1">
              <stop offset="0" stopColor="#ff7043" stopOpacity={beamOpacity} />
              <stop offset=".75" stopColor="#ff9f43" stopOpacity={beamOpacity * result.atmosphericTransmission} />
              <stop offset="1" stopColor="#f6c85f" stopOpacity=".08" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="7" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <pattern id="grid" width="36" height="36" patternUnits="userSpaceOnUse">
              <path d="M 36 0 L 0 0 0 36" fill="none" stroke="#1a3036" strokeWidth=".7" />
            </pattern>
          </defs>
          <rect width="900" height="330" fill="url(#grid)" />

          {view === 'block' ? (
            <g className="block-diagram">
              {['850 nm LED', '自由空间 + 大气', '接收透镜', '50 nm 滤光片', 'Si APD', 'TIA', 'ADC'].map((label, index) => {
                const x = 25 + index * 124;
                return (
                  <g key={label}>
                    <rect x={x} y="125" width="105" height="72" rx="8" fill="#0d1c20" stroke={index === 4 ? status : '#31505a'} />
                    <text x={x + 52.5} y="155" fill="#d7e8e9" textAnchor="middle" fontSize="12">{label}</text>
                    <text x={x + 52.5} y="176" fill="#78969c" textAnchor="middle" fontSize="9">
                      {index === 4 ? `M = ${parameters.apd.gain}` : index === 5 ? `${parameters.tia.feedbackResistanceOhm / 1e6} MΩ` : 'ACTIVE'}
                    </text>
                    {index < 6 && <path d={`M${x + 106} 161 H${x + 121}`} stroke="#e59c52" strokeWidth="2" />}
                  </g>
                );
              })}
            </g>
          ) : multiMode ? (
            <>
              {links.filter((l) => l.enabled).map((link, index) => {
                const sy = 72 + index * 86;
                const dy = link.detectorName.endsWith('2') ? 238 : 124;
                return (
                  <g key={link.id}>
                    <circle cx="75" cy={sy} r="18" fill="#ff774c" filter="url(#glow)" />
                    <path d={`M95 ${sy - 9} L710 ${dy - 18} L710 ${dy + 18} L95 ${sy + 9} Z`} fill="url(#beam)" opacity={0.8} />
                    <line x1="95" y1={sy} x2="710" y2={dy} stroke="#ec9d55" strokeDasharray="5 7" opacity=".6" />
                    <text x="75" y={sy + 37} fill="#9eb5ba" textAnchor="middle" fontSize="10">{link.sourceName}</text>
                    <text x="405" y={(sy + dy) / 2 - 9} fill="#6d8e94" fontSize="9">{(link.distanceM / 1000).toFixed(1)} km</text>
                  </g>
                );
              })}
              {[['APD-1', 124], ['APD-2', 238]].map(([label, y]) => (
                <g key={String(label)}>
                  <ellipse cx="735" cy={Number(y)} rx="13" ry="34" fill="#1a343a" stroke="#7fc8d7" strokeWidth="3" />
                  <rect x="762" y={Number(y) - 24} width="68" height="48" rx="7" fill="#0e1c20" stroke={status} />
                  <text x="796" y={Number(y) + 4} fill="#d4e7e8" fontSize="11" textAnchor="middle">{label}</text>
                </g>
              ))}
            </>
          ) : (
            <>
              <g transform={view === 'side' ? 'translate(0 20)' : ''}>
                <circle cx="74" cy="160" r="24" fill="#ff6b43" filter="url(#glow)" />
                <circle cx="74" cy="160" r="7" fill="#fff0d6" />
                <path d={`M98 ${160 - cone / 3} L690 ${160 - cone} L690 ${160 + cone} L98 ${160 + cone / 3} Z`} fill="url(#beam)" />
                <line x1="98" y1="160" x2="690" y2="160" stroke="#f6af5f" strokeDasharray="6 8" opacity=".75" />
                <ellipse cx="710" cy="160" rx="12" ry={lensRadius} fill="#16343b" stroke="#76bfcc" strokeWidth="4" />
                <rect x="733" y="122" width="9" height="76" rx="3" fill="#c06b41" />
                <rect x="755" y="128" width="42" height="64" rx="7" fill="#0f2125" stroke={status} strokeWidth="2" />
                <circle cx="776" cy="160" r="14" fill={status} opacity=".25" />
                <circle cx="776" cy="160" r="6" fill={status} />
                <rect x="816" y="134" width="62" height="52" rx="7" fill="#101f23" stroke="#41616a" />
                <text x="847" y="156" fill="#b7cdd0" fontSize="11" textAnchor="middle">TIA</text>
                <text x="847" y="172" fill="#6f9198" fontSize="9" textAnchor="middle">ADC</text>
                {view === 'side' && (
                  <>
                    <path d="M44 230 Q340 205 690 230" fill="none" stroke="#27454d" />
                    <text x="74" y="260" fill="#6f8d93" fontSize="10">高度 {parameters.propagation.sourceHeightM / 1000} km</text>
                  </>
                )}
              </g>
              <g>
                <line x1="74" y1="286" x2="710" y2="286" stroke="#5b787e" strokeWidth="1" />
                <path d="M74 280 V292 M710 280 V292" stroke="#5b787e" />
                <rect x="342" y="273" width="99" height="24" rx="12" fill="#0b181b" stroke="#263f45" />
                <text x="391" y="289" fill="#a9bfc3" textAnchor="middle" fontSize="11">{(result.distanceM / 1000).toFixed(2)} km</text>
              </g>
            </>
          )}
        </svg>
        <div className="scene-overlay scene-overlay-left">
          <span>链路效率</span>
          <strong>{(result.totalOpticalEfficiency * 100).toFixed(2)}%</strong>
        </div>
        <div className="scene-overlay scene-overlay-right">
          <span>APD 接收</span>
          <strong>{formatEngineering(result.signalPowerW, 'W')}</strong>
        </div>
      </div>

      <div className="path-strip">
        {[
          ['发射强度', `${parameters.source.radiantIntensityWsr.toFixed(2)} W/sr`],
          ['大气透过', `${(result.atmosphericTransmission * 100).toFixed(1)}%`],
          ['镜头入口', formatEngineering(result.lensPowerW, 'W')],
          ['滤光片后', formatEngineering(result.afterFilterW, 'W')],
          ['检测状态', result.detectionLabel],
        ].map(([label, value], index) => (
          <div className="path-step" key={label}>
            <span className="step-index">{String(index + 1).padStart(2, '0')}</span>
            <span><small>{label}</small><strong>{value}</strong></span>
          </div>
        ))}
      </div>
    </section>
  );
}
