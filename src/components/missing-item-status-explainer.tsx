import { Info } from "lucide-react";

type Props = {
  title?: string;
  className?: string;
};

export function MissingItemStatusExplainer({ title = "表示の見方", className = "" }: Props) {
  return (
    <div className={`rounded-[18px] border border-[#dce7ee] bg-[#f7fbfd] p-4 text-sm text-[#35546f] ${className}`.trim()}>
      <div className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-white text-[#129995] shadow-sm">
          <Info className="size-4" />
        </span>
        <div>
          <p className="font-bold text-[#17355b]">{title}</p>
          <ul className="mt-2 space-y-2 leading-6">
            <li>
              <span className="font-semibold text-[#17355b]">本文未記載</span>
              <span className="text-[#4f6a80]">：元の求人文に比較材料が見当たりません。</span>
            </li>
            <li>
              <span className="font-semibold text-[#17355b]">要確認</span>
              <span className="text-[#4f6a80]">：書かれていそうですが、自動整理がまだ不安定です。</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
