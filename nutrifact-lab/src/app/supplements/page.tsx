import type { Metadata } from "next";
import LibraryExplorer from "@/components/LibraryExplorer";
import { supplements } from "@/data/supplements";

export const metadata: Metadata = {
  title: "成分百科",
  description: "NutriFact Lab 成分百科：用證據、用途、安全風險與研究來源理解常見 supplement。"
};

export default function SupplementsPage() {
  return (
    <section className="pageSection">
      <div className="container">
        <div className="pageIntro">
          <span className="kicker">INGREDIENT LIBRARY</span>
          <h1>成分百科</h1>
          <p>唔以「十大功效」做內容骨架。每個成分都拆成：基本角色、特定 outcome 證據、劑型、風險、來源。</p>
        </div>
        <LibraryExplorer items={supplements} />
      </div>
    </section>
  );
}
