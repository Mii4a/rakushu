"use client";

import type { ReactNode } from "react";

type Props = {
  action: (formData: FormData) => void | Promise<void>;
  jobId: string;
  children: ReactNode;
  buttonClassName: string;
  confirmMessage?: string;
};

export function JobDeleteForm({
  action,
  jobId,
  children,
  buttonClassName,
  confirmMessage = "この求人を削除しますか？この操作は元に戻せません。"
}: Props) {
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!window.confirm(confirmMessage)) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="jobId" value={jobId} />
      <button type="submit" className={buttonClassName}>
        {children}
      </button>
    </form>
  );
}
