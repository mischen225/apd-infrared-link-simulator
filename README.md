# APD红外光链路综合仿真平台

一个完整、可运行的中文 React + TypeScript + Vite 单页应用，用于在浏览器本地完成红外自由空间光链路、APD 雪崩倍增、背景光、前端噪声、TIA、ADC、参数扫描、二维矩阵、多链路和蒙特卡洛不确定性分析。

> 本工具用于光链路预算和工程预估，最终性能需结合器件实测、实际大气条件、光谱数据、光学杂散光、PCB 漏电、偏置噪声和前置放大器实测结果验证。

## 快速开始

需要 Node.js 20 或更高版本。

```bash
npm install
npm run dev
```

浏览器打开 Vite 输出的本地地址（默认 `http://localhost:5173`）。

生产构建与预览：

```bash
npm run build
npm run preview
```

检查与测试：

```bash
npm run typecheck
npm test
```

也可以使用 pnpm：

```bash
pnpm install
pnpm dev
pnpm typecheck
pnpm test
pnpm build
```

## Windows 离线桌面版

桌面版使用 Electron 封装，运行时、页面资源和仿真内核全部包含在 EXE 中。目标电脑无需联网，也无需安装 Node.js、浏览器或其他依赖。

首次打包需要联网下载 Electron 与 Windows 打包工具：

```bash
pnpm install
pnpm desktop:build
```

生成文件位于 `release/`：

- `APD-Infrared-Link-Simulator-1.0.0-x64-Portable.exe`：便携版，复制到任意 Windows x64 电脑后双击运行。
- `APD-Infrared-Link-Simulator-1.0.0-x64-Setup.exe`：安装版，可选择安装目录并创建桌面与开始菜单快捷方式。

仅生成解包测试目录：

```bash
pnpm desktop:pack
```

桌面版与网页版使用同一套 React/TypeScript 仿真内核。配置、场景和计算均保存在本机；除非用户主动打开外部链接，否则程序不会访问网络。

## 离线运行

- 所有光学、APD、噪声、扫描、矩阵和蒙特卡洛计算都在浏览器中完成。
- 应用不调用后端、数据库或远程 API。
- `worker/index.ts` 只是部署平台所需的静态资源入口，不承担任何仿真计算或数据存储。
- 字体使用系统字体；生产包不依赖远程字体或图片。
- 完成一次依赖安装和 `npm run build` 后，`dist/` 是完整静态生产包，可由任意静态文件服务器提供。
- 模型配置和用户保存的场景只保存在 JSON 文件或浏览器 `localStorage`。

## 已实现功能

### 工作模式

1. **单场景**：全部参数实时联动，显示光学链路、APD、噪声、TIA、ADC 和检测结论。
2. **参数扫描**：11 个预设扫描变量，起止值、采样点数、对数轴、悬停提示、当前工作点和 PNG 导出。
3. **参数矩阵**：距离 × 辐射强度、APD 增益 × ENBW 两套实时热力图，显示最佳工作点和 SNR 阈值说明。
4. **多光源 / 多 APD**：链路增删、独立距离/光强/透过率、探测器分配、非相干功率叠加及动态 SVG 场景。

### 分析工具

- 接收光功率、总噪声和 SNR 扫描曲线。
- 各 RMS 噪声分量对数柱状图。
- APD 增益变化时倍增信号、体暗电流噪声与总噪声对比。
- LED、滤光片、APD 响应度及有效光谱重叠曲线。
- 距离 × 光强和 APD 增益 × 带宽热力图。
- 默认 3/4/5 km × 1/2/5 W/sr 的 9 组批量工况和 CSV 导出。
- 多链路非相干功率叠加。
- 光源强度、大气透过率与对准效率的蒙特卡洛敏感度分布。

### 工程操作

- 模型配置 JSON 导入、校验和导出。
- 高级 JSON 编辑器。
- 自定义参数的名称、符号、数值、单位、上下限和类别。
- 浏览器本地保存、载入和删除多个场景。
- 公式与当前计算结果复制。
- 打印友好的 HTML 报告。
- 图表工具栏导出 PNG。
- 全中文非法输入提示；错误配置不会使应用崩溃。

## 单位约定

计算内核统一使用 SI 单位：

| 物理量 | 内部单位 |
|---|---|
| 距离、直径、焦距、波长 | m |
| 面积 | m² |
| 光功率 | W |
| 辐射强度 | W/sr |
| 光电流、暗电流、噪声电流 | A |
| 响应度 | A/W |
| 电阻 | Ω |
| 电容 | F |
| 带宽、频率 | Hz |
| 电压 | V |
| 温度 | K |

界面根据量级显示 W、mW、μW、nW、pW、fW，以及 A、mA、μA、nA、pA、fA。特别注意：

- **pW 是光功率单位**。
- **pA、nA 是电流单位**。
- APD 倍增前初级光电流与倍增后输出电流始终分别显示。

## 计算公式

### 1. 有效距离

关闭斜距计算时：

```text
R = R_horizontal
```

开启斜距计算时：

```text
R = √(R_horizontal² + (h_detector − h_source)²)
```

### 2. 大气透过率

直接透过率模式使用用户输入的 `T_atm`。

衰减系数模式：

```text
T_atm = 10^(−α R_km / 10)
```

其中 `α` 为 dB/km，`R_km` 为 km。

### 3. 透镜有效面积

```text
A_eff = πD²(1 − ε) / 4
```

- `D`：有效口径直径。
- `ε`：中心遮挡面积比例。

### 4. 视场立体角

自动 FOV：

```text
θ_FOV = 2 atan(d_detector / (2f))
```

小角度立体角：

```text
Ω_FOV ≈ π(θ_FOV / 2)²
```

### 5. 自由空间几何接收功率

指定方向辐射强度模型：

```text
P_fs = I_e A_eff / R²
```

若使用总辐射功率，则先按光束立体角估算方向辐射强度：

```text
Ω_beam = 2π(1 − cos(θ_div / 2))
I_e ≈ P_total / Ω_beam
```

### 6. 传播后的镜头入口光功率与 APD 信号光功率

```text
η_propagation =
  T_atm · η_pointing · η_jitter · η_turbulence · 10^(−L_other/10)

P_lens = P_fs η_propagation

η_receiver =
  T_lens · T_filter · η_spectral · η_coupling · η_alignment

P_sig = P_lens η_receiver

η_total = η_propagation η_receiver
```

本项目把“镜头入口光功率”定义为已经经过大气和全部传播损耗后的功率。`P_fs` 单独显示，仅表示平方反比几何接收。界面中 10 项效率都可独立编辑并在损耗账本中逐项显示；同时显示分阶段计算与一次累乘结果的闭合误差。所有效率设为 `1`、其他损耗设为 `0 dB` 时，`P_sig = P_lens = P_fs`，不存在隐含损耗。

### 7. 背景光

直接模式：

```text
P_bg = P_bg,user
```

光谱辐亮度近似：

```text
P_bg = L_λ,bg A_eff Ω_FOV Δλ T_opt,bg
```

背景光同时进入 APD 平均电流、TIA 直流偏置、背景散粒噪声和饱和判断。

### 8. 光谱模型

LED 与高斯滤光片：

```text
g(λ) = exp[−(λ − λ₀)² / (2σ²)]
σ = FWHM / (2√(2ln2))
```

采用梯形数值积分：

```text
I_primary = ∫ P_λ(λ) T_filter(λ) R_APD(λ) dλ
```

关闭精细光谱时使用中心波长响应度与光谱匹配效率；开启时使用数值积分得到的有效响应度。

### 9. APD 初级与倍增电流

```text
I_p = R_λ P_sig
I_sig = M I_p

I_bg,p = R_λ P_bg
I_bg = M I_bg,p
```

### 10. APD 过剩噪声因子

指数模型：

```text
F(M) = M^x
```

McIntyre 近似：

```text
F(M) = kM + (1 − k)(2 − 1/M)
```

也可直接输入 `F`。

### 11. 暗电流定义

支持：

- 倍增前体暗电流。
- 在增益 `M` 下测得的总输出暗电流；不会再次乘以 `M`。
- 体暗电流与表面暗电流分别输入。
- 保守模式：全部暗电流视为倍增前电流。
- 高级模式：体暗电流倍增，表面暗电流不倍增。

高级模式：

```text
I_dark,out = M I_db + I_ds
```

批量“典型/最大暗电流”覆盖会保持默认体/表面比例并同时缩放，避免只改变标签而未改变结果。

### 12. APD 散粒噪声

电子电荷：

```text
q = 1.602176634 × 10⁻¹⁹ C
```

各倍增前电流分量分别计算：

```text
i_shot,rms = √(2qB M² F(M) I_primary)
```

未倍增表面暗电流：

```text
i_surface,rms = √(2qB I_ds)
```

等价的合并均方值：

```text
i_shot² = 2qB [M²F(M)(I_p + I_bg,p + I_db) + I_ds]
```

### 13. APD 负载电阻热噪声

玻尔兹曼常数：

```text
k_B = 1.380649 × 10⁻²³ J/K
```

```text
i_th,rms = √(4k_B T B / R_L)
i_th² = 4k_B T B / R_L
i_th,density = √(4k_B T / R_L)         [A/√Hz]
v_th,rms = √(4k_B T R_L B)
v_th,density = √(4k_B T R_L)           [V/√Hz]

i_n,rms = √[
  2qM²F(M)(I_p + I_d)B +
  4k_B T B / R_L
]
```

`R_L` 是 APD 独立负载电阻。这些指标始终计算并展示，但只有开启“计入负载热噪声”后才并入系统总 RMS 噪声。

### 14. TIA 反馈电阻热噪声

```text
i_Rf,density = √(4k_B T / R_f)
i_Rf,rms = i_Rf,density √B
```

`R_f` 是跨阻放大器反馈电阻，与 `R_L` 分开建模。典型 TIA 结构保留 `R_f` 热噪声并关闭 `R_L` 并入开关，防止同一电阻热噪声重复计算。

### 15. 运放输入电流噪声

```text
i_op,rms = i_op,density √B
```

### 16. 运放输入电压噪声

简化模式：

```text
i_voltage,rms ≈ (e_n / R_f) √B
```

高级模式建立 360 点对数频率网格，使用：

```text
C_total = C_APD + C_opamp + C_PCB
i_n(f) = √[(e_n/R_f)² + (2πf C_total e_n)²] · |H_LP(f)|
i_voltage,rms = √∫ i_n²(f) df
```

积分上限根据 ENBW 自动扩展到 `20 × ENBW`，不是只在单一频点估算。

### 17. ADC 量化噪声

```text
V_LSB = V_fullscale / 2^N
V_q,rms = V_LSB / √12
i_ADC,rms = V_q,rms / R_f
```

### 18. 总 RMS 噪声

```text
i_total = √(
  i_signal² + i_background² + i_bulk-dark² + i_surface-dark² +
  [i_RL²] + i_Rf² + i_op-current² + i_op-voltage² + i_bias² +
  i_ADC² + i_other²
)
```

方括号中的 `i_RL²` 仅在用户开启 APD 负载热噪声并入开关时加入。

### 19. TIA、后级与饱和

```text
|V_TIA,sig| = I_sig R_f
|V_TIA,DC| = (I_bg + I_dark,out) R_f
V_out,sig = G_post V_TIA,sig
V_peak = |V_TIA,DC| + |V_out,sig|
```

当 `V_peak ≥ V_TIA,max` 或 APD 总输出电流超过最大允许值时标记为饱和。

后级理想线性增益会同时放大信号与已有噪声，不会提高输入 SNR；后级自身噪声只会保持或降低系统 SNR。

### 20. 信噪比

连续光：

```text
SNR = I_sig / i_total
```

调制信号：

```text
I_mod = m I_sig
SNR_mod = I_mod / i_total
```

幅度比的 dB 形式：

```text
SNR_dB = 20 log10(SNR_mod)
```

若使用信号功率与噪声功率之比，应使用 `10 log10`；两种定义不可混用。

## 默认演示工况

| 参数 | 默认值 |
|---|---:|
| 光源 | 850 nm LED |
| 辐射强度 | 1 W/sr |
| LED 光谱 FWHM | 35 nm |
| 传播距离 | 5 km |
| 光源/接收机高度 | 10 km / 10 km |
| 天气 | 晴朗黑夜 |
| 大气透过率 | 0.90 |
| 透镜口径 | 20 mm |
| 透镜透过率 | 0.90 |
| 滤光片中心 / FWHM / 峰值 | 850 nm / 50 nm / 0.85 |
| 光谱匹配 / 耦合 / 对准效率 | 0.90 / 0.90 / 0.90 |
| APD 型号 | Hamamatsu S12023-10 |
| APD 响应度 | 0.5 A/W |
| APD 增益 | 100 |
| 过剩噪声指数 | 0.3 |
| 典型 / 最大暗电流 | 0.2 nA / 2 nA |
| 体 / 表面暗电流 | 0.16 nA / 0.04 nA |
| APD 结电容 | 6 pF |
| APD 负载电阻 / 是否并入系统总噪声 | 10 MΩ / 否 |
| ENBW | 300 Hz |
| TIA 反馈电阻 | 10 MΩ |
| 调制深度 | 100% |

## 默认假设与可信度

- 光源默认使用指定方向恒定辐射强度；没有建模真实封装的完整远场角分布。
- 光功率采用远场平方反比与有效口径面积模型。
- LED 与滤光片默认使用高斯 FWHM；默认 APD 响应曲线是围绕中心响应度的平滑工程近似。
- LED 多源默认按非相干功率叠加。
- 大气损耗可直接输入总透过率或使用恒定 dB/km；没有内置逐层气象廓线或 MODTRAN。
- 噪声源视为互不相关，因此按均方值相加。
- 用户输入 ENBW 时直接使用该数值，不再乘以 `π/2`。
- 频域电压噪声积分使用简化的总输入电容和低通传递函数。
- 蒙特卡洛采用合成随机扰动，只用于工程敏感度，不代表器件实测分布。
- 页面中的结果属于用户输入值、型号库默认值、近似估算值或数值积分结果，不是绝对准确的实测值。

## 检测等级

| 调制 SNR | 等级 |
|---:|---|
| `< 1` | 不可检测 |
| `1 ～ <3` | 极不稳定 |
| `3 ～ <5` | 勉强检测 |
| `5 ～ <10` | 可以检测 |
| `10 ～ <20` | 可靠检测 |
| `≥ 20` | 高可靠检测 |

## 测试覆盖

`src/tests/core.test.ts` 包含 23 个测试：

1. 光功率按距离平方反比变化。
2. 光功率与辐射强度成正比。
3. 光功率与透镜面积成正比。
4. 镜头入口功率包含全部传播损耗。
5. 所有效率为 1 时链路不存在未知损耗。
6. APD 初级光电流等于响应度乘以光功率。
7. APD 输出电流正确乘以增益。
8. 指数和 McIntyre 过剩噪声因子正确。
9. 噪声随带宽平方根变化。
10. 背景光增大时散粒噪声增大。
11. 300 Hz ENBW 直接使用 300 Hz。
12. 五项电阻热噪声公式正确。
13. APD 散粒与热噪声合成公式正确。
14. APD 负载热噪声开关只控制是否并入总噪声。
15. 调制 SNR 随调制深度变化。
16. 典型暗电流与最大暗电流结果不同。
17. 显示单位切换不改变 SI 数值。
18. 非法 JSON 不会导致应用崩溃。
19. 旧版 JSON 自动补全新增热噪声字段。
20. 默认笛卡尔积生成完整 9 组结果。
21. 多光源功率叠加正确。
22. 后级理想增益不提高输入 SNR。
23. TIA 饱和判断正确。

## 项目结构

```text
.
├─ .openai/
│  └─ hosting.json
├─ src/
│  ├─ calculations/
│  │  ├─ apd.ts
│  │  ├─ noise.ts
│  │  ├─ opticalLink.ts
│  │  ├─ simulate.ts
│  │  ├─ spectralIntegration.ts
│  │  └─ sweep.ts
│  ├─ components/
│  │  ├─ Charts/
│  │  ├─ FormulaViewer/
│  │  ├─ ParameterPanel/
│  │  ├─ ResultCards/
│  │  ├─ SceneView/
│  │  └─ common/
│  ├─ data/
│  │  └─ defaults.ts
│  ├─ models/
│  │  └─ types.ts
│  ├─ tests/
│  │  └─ core.test.ts
│  ├─ utils/
│  │  ├─ export.ts
│  │  ├─ format.ts
│  │  └─ validation.ts
│  ├─ App.tsx
│  ├─ main.tsx
│  └─ styles.css
├─ scripts/
│  ├─ clean-dist.mjs
│  └─ prepare-sites.mjs
├─ worker/
│  └─ index.ts
├─ index.html
├─ package.json
├─ pnpm-workspace.yaml
├─ tsconfig.json
├─ vite.config.ts
├─ vitest.config.ts
└─ wrangler.jsonc
```

## 导入 JSON 校验

导入与高级编辑器会检查：

- 根值是否为对象。
- 距离、透镜口径、APD 增益和 ENBW 是否为正的有限数值。
- 大气透过率是否位于 0～1。
- JSON 括号、引号和逗号是否合法。

非法配置只显示中文错误消息，不覆盖当前有效工况。
