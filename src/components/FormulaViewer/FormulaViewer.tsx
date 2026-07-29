import { BookOpen, ChevronDown, Copy, Info } from 'lucide-react';
import type { SimulationParameters, SimulationResult } from '../../models/types';
import { resolveDarkCurrent } from '../../calculations/apd';
import { formatEngineering } from '../../utils/format';

export function FormulaViewer({
  parameters,
  result,
  onCopy,
}: {
  parameters: SimulationParameters;
  result: SimulationResult;
  onCopy: () => void;
}) {
  const dark = resolveDarkCurrent(parameters.apd);
  return (
    <section className="formula-card">
      <details>
        <summary>
          <span className="formula-title"><BookOpen size={16} /> 公式与本次计算过程</span>
          <span className="formula-summary">
            9 阶段 · 可闭合链路账本与 APD 噪声模型
            <ChevronDown size={15} />
          </span>
        </summary>
        <div className="formula-content">
          <div className="formula-grid">
            <div className="formula-step">
              <span>01 / 几何接收</span>
              <code>A<sub>eff</sub> = πD²(1−ε)/4</code>
              <p>D = {(parameters.optics.apertureDiameterM * 1000).toFixed(2)} mm → A<sub>eff</sub> = {(result.effectiveAreaM2 * 1e6).toFixed(3)} mm²</p>
            </div>
            <div className="formula-step">
              <span>02 / 自由空间几何接收</span>
              <code>P<sub>fs</sub> = I<sub>e</sub>A<sub>eff</sub>/R²</code>
              <p>{parameters.source.radiantIntensityWsr} W/sr × A<sub>eff</sub> ÷ {(result.distanceM / 1000).toFixed(2)}² km → {formatEngineering(result.freeSpaceCapturePowerW, 'W')}</p>
            </div>
            <div className="formula-step">
              <span>03 / 传播后的镜头入口</span>
              <code>P<sub>lens</sub> = P<sub>fs</sub>T<sub>atm</sub>η<sub>point</sub>η<sub>jitter</sub>η<sub>turb</sub>η<sub>other</sub></code>
              <p>传播综合效率 {(result.propagationEfficiency * 100).toFixed(3)}% → {formatEngineering(result.lensPowerW, 'W')}</p>
            </div>
            <div className="formula-step">
              <span>04 / 接收光学</span>
              <code>P<sub>sig</sub> = P<sub>lens</sub>T<sub>lens</sub>T<sub>filter</sub>η<sub>spectral</sub>η<sub>coupling</sub>η<sub>alignment</sub></code>
              <p>接收光学效率 {(result.receiverOpticalEfficiency * 100).toFixed(3)}% → {formatEngineering(result.signalPowerW, 'W')}；账本误差 {(result.reconciliationErrorFraction * 100).toExponential(2)}%</p>
            </div>
            <div className="formula-step">
              <span>05 / APD 倍增</span>
              <code>I<sub>p</sub> = R<sub>λ</sub>P<sub>sig</sub>；I<sub>sig</sub> = MI<sub>p</sub></code>
              <p>{result.responsivityAW.toFixed(3)} A/W × P<sub>sig</sub> → {formatEngineering(result.primaryCurrentA, 'A')} → ×{parameters.apd.gain} = {formatEngineering(result.signalCurrentA, 'A')}</p>
            </div>
            <div className="formula-step">
              <span>06 / 散粒噪声</span>
              <code>i² = 2qB[M²F(I<sub>p</sub>+I<sub>bg</sub>+I<sub>db</sub>)+I<sub>ds</sub>]</code>
              <p>F(M) = {result.excessNoiseFactor.toFixed(3)}，ENBW = {parameters.tia.enbwHz} Hz；{dark.definition}</p>
            </div>
            <div className="formula-step">
              <span>07 / APD 负载热噪声</span>
              <code>i<sub>th,rms</sub> = √(4k<sub>B</sub>TB/R<sub>L</sub>)；v<sub>th,rms</sub> = √(4k<sub>B</sub>TR<sub>L</sub>B)</code>
              <p>R<sub>L</sub> = {formatEngineering(parameters.apd.loadResistanceOhm, 'Ω')} → {formatEngineering(result.apdThermalNoise.currentRmsA, 'A')} / {formatEngineering(result.apdThermalNoise.voltageRmsV, 'V')}；系统总噪声{result.apdThermalNoise.includedInSystemTotal ? '已计入' : '未计入'}</p>
            </div>
            <div className="formula-step">
              <span>08 / 总 RMS 噪声</span>
              <code>i<sub>total</sub> = √Σi<sub>n</sub>²</code>
              <p>散粒、所选电阻热噪声、运放频域积分、偏置、ADC 与其他噪声 → {formatEngineering(result.noises.totalA, 'A')}</p>
            </div>
            <div className="formula-step">
              <span>09 / 调制 SNR</span>
              <code>SNR = mI<sub>sig</sub>/i<sub>total</sub>；SNR<sub>dB</sub> = 20log₁₀(SNR)</code>
              <p>m = {(parameters.source.modulationDepth * 100).toFixed(1)}% → {result.modulatedSnr.toFixed(3)} / {result.snrDb.toFixed(2)} dB</p>
            </div>
          </div>
          <div className="formula-callout">
            <Info size={15} />
            <p><strong>定义一致性：</strong>镜头入口功率已包含全部传播/大气损耗；APD 负载电阻 R<sub>L</sub> 与 TIA 反馈电阻 R<sub>f</sub> 分开建模，避免重复计入热噪声。此处使用信号电流幅值与 RMS 噪声电流的幅度比，因此 dB 形式采用 20log₁₀。</p>
          </div>
          <button className="secondary-button" onClick={onCopy}><Copy size={14} /> 复制公式与当前结果</button>
        </div>
      </details>
    </section>
  );
}
