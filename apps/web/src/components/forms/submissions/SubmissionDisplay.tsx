"use client";

import { MergeWithSchema } from "@/lib/submissions";
import clsx from "clsx";

export default function SubmissionDisplay({ schema, submission }) {
  return (
    <div className="flow-root">
      <ul role="list" className="divide-ui-slate-light divide-y">
        {Object.entries(MergeWithSchema(submission.data, schema)).map(([key, value]) => (
          <li key={key} className="py-5">
            <p className="text-sm font-semibold text-slate-800">{key}</p>
            <p
              className={clsx(
                value ? "text-slate-600" : "text-slate-400",
                "whitespace-pre-line pt-1 text-sm text-slate-600"
              )}>
              {value.toString()}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
