export type EvidenceLevel = "strong" | "moderate" | "limited" | "insufficient";
export type EvidenceItem = { outcome: string; level: EvidenceLevel; summary: string };
export type Supplement = {
  slug: string; name: string; zhName: string; category: string; short: string; overview: string;
  whatToKnow: string[]; evidence: EvidenceItem[]; forms?: { name: string; note: string }[];
  caution: string[]; sources: { label: string; url: string }[]; updated: string; featured?: boolean;
};

export const supplements: Supplement[] = [
  {
    slug:"magnesium", name:"Magnesium", zhName:"鎂", category:"礦物質", featured:true, updated:"2026-09-05",
    short:"參與神經、肌肉與多種酵素反應；基本生理角色唔等於對睡眠、壓力等每個用途都有同樣證據。",
    overview:"鎂係必需礦物質。市場常將『身體需要鎂』直接延伸成『鎂可以改善多種症狀』，所以最重要係逐個用途睇證據。",
    whatToKnow:["食物、強化食品同補充劑都會計入總攝取量。","不同鎂鹽嘅元素鎂含量、吸收與腸胃耐受度有差異。","正常生理功能同治療某個症狀係兩個問題。"],
    evidence:[
      {outcome:"維持正常肌肉及神經功能",level:"strong",summary:"鎂係正常生理功能所需嘅必需營養素。"},
      {outcome:"偏頭痛相關用途",level:"moderate",summary:"部分臨床情境有研究支持，但唔代表所有人適合自行高劑量補充。"},
      {outcome:"改善一般睡眠",level:"limited",summary:"有研究訊號，但族群、劑量與結果並唔一致。"}
    ],
    forms:[{name:"Magnesium citrate",note:"常見形式；亦可能影響排便。"},{name:"Magnesium glycinate",note:"常被標榜較溫和，但劑型本身唔足以證明特定助眠功效。"},{name:"Magnesium oxide",note:"元素鎂比例高；吸收與腸胃耐受度要一併考慮。"}],
    caution:["補充劑可引起腹瀉、噁心或腹部不適。","腎功能受損人士處理高劑量鎂需要特別小心。","鎂可同部分藥物產生交互作用。"],
    sources:[{label:"NIH Office of Dietary Supplements — Magnesium",url:"https://ods.od.nih.gov/factsheets/Magnesium-HealthProfessional/"}]
  },
  {
    slug:"vitamin-d", name:"Vitamin D", zhName:"維他命 D", category:"維他命", featured:true, updated:"2026-09-05",
    short:"同鈣吸收及骨骼健康密切相關；真正不足人士補充用途較清楚，但唔代表越高越好。",
    overview:"維他命 D 可由日照、食物與補充劑獲得。對鈣代謝與骨骼有清楚角色，但延伸到所有慢性病時證據並不一致。",
    whatToKnow:["D2 同 D3 都係常見補充形式。","需要量受日照、飲食、年齡、膚色與吸收情況影響。","長期高劑量唔係『多啲更好』。"],
    evidence:[{outcome:"鈣吸收與骨骼健康",level:"strong",summary:"屬維他命 D 最清楚嘅核心生理角色。"},{outcome:"矯正已確認不足／缺乏",level:"strong",summary:"對真正不足人士用途較明確。"},{outcome:"預防一般人所有慢性病",level:"insufficient",summary:"唔支持將維他命 D 當成廣泛萬用預防補充劑。"}],
    caution:["過量可導致高血鈣等問題。","某些疾病、藥物或高劑量情況需要醫護監察。","唔應只靠網上症狀清單自行判斷缺乏。"],
    sources:[{label:"NIH Office of Dietary Supplements — Vitamin D",url:"https://ods.od.nih.gov/factsheets/VitaminD-HealthProfessional/"}]
  },
  {
    slug:"omega-3", name:"Omega-3", zhName:"奧米加 3", category:"脂肪酸", featured:true, updated:"2026-09-05",
    short:"ALA、EPA、DHA 唔係同一樣嘢；1000 mg fish oil 亦唔等於 1000 mg EPA+DHA。",
    overview:"Omega-3 係一組脂肪酸。產品研究最常見嘅盲點係將魚油總重量同 EPA+DHA 實際份量混為一談。",
    whatToKnow:["標籤要分清魚油總重量與 EPA、DHA。","食魚嘅健康關聯唔可全部直接等同魚油膠囊效果。","不同用途研究會使用唔同配方與劑量。"],
    evidence:[{outcome:"降低三酸甘油脂（特定高劑量情境）",level:"strong",summary:"有較清楚證據，但臨床高劑量用途同一般保健魚油唔係同一回事。"},{outcome:"一般心血管保健",level:"moderate",summary:"飲食模式、食魚與補充劑證據要分開解讀。"},{outcome:"提升所有健康成年人認知功能",level:"insufficient",summary:"未足以支持廣泛認知增強聲稱。"}],
    forms:[{name:"EPA",note:"長鏈 omega-3，常見於魚油與部分藻油。"},{name:"DHA",note:"長鏈 omega-3，係腦部及視網膜結構脂肪酸之一。"},{name:"ALA",note:"植物來源常見必需脂肪酸，轉化成 EPA/DHA 效率有限。"}],
    caution:["高劑量用途唔應自行照抄研究劑量。","正用抗凝血／抗血小板藥物或有手術安排人士應先查詢醫護。","產品氧化、純度與第三方檢測都係品質問題。"],
    sources:[{label:"NIH Office of Dietary Supplements — Omega-3 Fatty Acids",url:"https://ods.od.nih.gov/factsheets/Omega3FattyAcids-HealthProfessional/"}]
  },
  {
    slug:"creatine", name:"Creatine", zhName:"肌酸", category:"運動營養", featured:true, updated:"2026-09-05",
    short:"對阻力訓練與部分力量指標有相對扎實研究；Creatine monohydrate 亦係研究最多嘅形式。",
    overview:"肌酸可提高肌肉磷酸肌酸儲備，最常研究於短時間高強度運動與阻力訓練。效果係額外增益，唔係魔法增肌。",
    whatToKnow:["Creatine monohydrate 係研究最多嘅形式。","力量與瘦體重改善通常係漸進而非戲劇性。","初期體重上升可包括細胞內水分變化。"],
    evidence:[{outcome:"配合阻力訓練提升部分力量指標",level:"strong",summary:"多項試驗與統合分析支持平均有額外增益。"},{outcome:"增加瘦體重／訓練適應",level:"moderate",summary:"整體有支持訊號，但要同訓練、飲食與水分變化一齊解讀。"},{outcome:"所有人都會明顯提升認知",level:"limited",summary:"研究持續增加，但未適合作普遍腦力增強聲稱。"}],
    forms:[{name:"Creatine monohydrate",note:"證據基礎最完整，通常係比較基準。"},{name:"其他 creatine forms",note:"較新或較貴唔代表已證明效果更好。"}],
    caution:["有腎病、懷孕、長期疾病或用藥人士應先查詢醫護。","運動員要留意產品污染與第三方認證。","網站唔提供一個固定劑量作所有人嘅通用處方。"],
    sources:[{label:"2025 systematic review & meta-analysis — PubMed",url:"https://pubmed.ncbi.nlm.nih.gov/40944139/"},{label:"2024 creatine + resistance training meta-analysis — PubMed",url:"https://pubmed.ncbi.nlm.nih.gov/39519498/"}]
  },
  {
    slug:"probiotics", name:"Probiotics", zhName:"益生菌", category:"腸道", updated:"2026-09-05",
    short:"真正要睇 genus、species、strain、CFU 同研究用途；CFU 數字越大唔代表一定越有效。",
    overview:"益生菌效果往往具有菌株與用途特異性。將所有 Lactobacillus／Bifidobacterium 當成同一產品係常見錯誤。",
    whatToKnow:["研究某一 strain 有效唔可直接套用去另一 strain。","CFU 越大唔代表效果越好。","要留意 CFU 係生產時定保存期末標示。"],
    evidence:[{outcome:"部分菌株／特定腸胃用途",level:"moderate",summary:"部分情境有研究支持，但必須對應具體菌株、族群與用途。"},{outcome:"健康成年人日常『全面改善腸道』",level:"limited",summary:"講法太籠統，唔可以將所有益生菌當成同一效果。"},{outcome:"CFU 越高效果越好",level:"insufficient",summary:"數字本身唔能夠取代菌株與臨床證據。"}],
    caution:["可出現脹氣等腸胃反應。","重病、免疫功能受損或早產嬰兒等高風險群組需要特別小心。","產品冇清楚菌株資料會降低可評估性。"],
    sources:[{label:"NIH Office of Dietary Supplements — Probiotics",url:"https://ods.od.nih.gov/factsheets/Probiotics-HealthProfessional/"}]
  },
  {
    slug:"iron", name:"Iron", zhName:"鐵", category:"礦物質", updated:"2026-09-05",
    short:"鐵係必需營養素，但亦係最唔適合『覺得攰就自己食』嘅補充劑之一。",
    overview:"鐵參與氧氣運輸。缺鐵有健康影響，但過量同樣有風險，所以確認需要與找出成因比盲目補充重要。",
    whatToKnow:["需求受年齡、生理期、懷孕、飲食與健康狀況影響。","檢查結果要配合臨床情境解讀。","補鐵同『搵出點解缺鐵』係兩件事。"],
    evidence:[{outcome:"治療已確認嘅缺鐵狀態",level:"strong",summary:"有明確缺鐵證據時，補鐵用途清楚，但應同原因評估一齊處理。"},{outcome:"冇確認缺鐵但因疲勞自行補鐵",level:"insufficient",summary:"疲勞成因好多，盲目補鐵可延誤真正原因亦有過量風險。"}],
    forms:[{name:"Ferrous salts",note:"常見口服鐵形式；要睇元素鐵實際份量。"}],
    caution:["常見副作用包括便秘、噁心與腹部不適。","兒童誤服含鐵產品可以非常危險。","有鐵過載風險或特定疾病人士唔應自行補鐵。"],
    sources:[{label:"NIH Office of Dietary Supplements — Iron",url:"https://ods.od.nih.gov/factsheets/Iron-HealthProfessional/"}]
  },
  {
    slug:"zinc", name:"Zinc", zhName:"鋅", category:"礦物質", updated:"2026-09-05",
    short:"正常免疫需要鋅，唔等於長期高劑量鋅會令健康成年人獲得額外免疫優勢。",
    overview:"鋅參與細胞代謝、免疫功能、傷口癒合與味覺。由『缺鋅有問題』跳到『越多鋅越好』係典型推論錯誤。",
    whatToKnow:["維持正常鋅狀態同高劑量處理特定情境係兩回事。","長期過量可影響銅吸收。","鋅可同部分藥物互相影響吸收。"],
    evidence:[{outcome:"維持正常免疫與細胞功能",level:"strong",summary:"鋅係正常免疫、DNA 與蛋白質合成所需嘅必需營養素。"},{outcome:"矯正鋅不足",level:"strong",summary:"對真正不足人士用途較清楚。"},{outcome:"健康成年人長期高劑量『增強免疫』",level:"insufficient",summary:"正常功能需要鋅唔代表超過需要量會帶來額外持續優勢。"}],
    caution:["長期過量可造成銅不足等問題。","可同部分抗生素等藥物產生交互作用。","長期高劑量應先確認原因與監察需要。"],
    sources:[{label:"NIH Office of Dietary Supplements — Zinc",url:"https://ods.od.nih.gov/factsheets/Zinc-HealthProfessional/"}]
  },
  {
    slug:"vitamin-b12", name:"Vitamin B12", zhName:"維他命 B12", category:"維他命", updated:"2026-09-05",
    short:"B12 參與紅血球、神經功能與 DNA 合成；真正重點係有冇攝取或吸收不足，而唔係將佢當能量飲品。",
    overview:"B12 天然主要存在於動物性食物，亦可由強化食品與補充劑獲得。素食者與吸收受影響人士更值得留意。",
    whatToKnow:["純植物性飲食人士要留意可靠 B12 來源。","胃腸吸收問題、年齡與部分藥物都可能影響狀態。","本身唔缺乏，額外 B12 唔等於即時更有精神。"],
    evidence:[{outcome:"維持正常紅血球與神經功能",level:"strong",summary:"B12 係相關正常生理功能所需嘅必需維他命。"},{outcome:"矯正已確認 B12 缺乏",level:"strong",summary:"有攝取或吸收不足時用途清楚，但成因會影響補充方式。"},{outcome:"B12 足夠人士作普遍『提神』",level:"insufficient",summary:"參與能量代謝唔等於額外補充會令沒有缺乏嘅人更有精神。"}],
    forms:[{name:"Cyanocobalamin",note:"常見而穩定嘅 B12 補充形式。"},{name:"Methylcobalamin",note:"另一常見形式；價格或『天然』定位唔代表對所有人更好。"}],
    caution:["懷疑缺乏時要分清攝取不足定吸收問題。","神經症狀、明顯貧血或持續症狀唔應只靠自行補充處理。","長期用藥或有腸胃疾病人士應由醫護評估。"],
    sources:[{label:"NIH Office of Dietary Supplements — Vitamin B12",url:"https://ods.od.nih.gov/factsheets/VitaminB12-HealthProfessional/"}]
  }
];

export const evidenceLabels: Record<EvidenceLevel,{label:string;note:string}> = {
  strong:{label:"證據較強",note:"有一致而較可靠嘅人體證據，或屬已建立嘅基本營養生理功能。"},
  moderate:{label:"中等證據",note:"有人體研究支持，但效果、族群或一致性仍有限制。"},
  limited:{label:"有限證據",note:"有初步訊號，但研究數量、品質或一致性不足。"},
  insufficient:{label:"證據不足",note:"現階段唔適合做肯定健康聲稱。"}
};
export function getSupplement(slug:string){ return supplements.find((item)=>item.slug===slug); }
