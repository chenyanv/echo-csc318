import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { EchoMark } from "../../components/EchoMark";

const POINTS = [
  {
    title: "Matches come with reasons",
    body: "Echo shows what you have in common, and what it can't know yet.",
  },
  {
    title: "You choose how much AI helps",
    body: "Echo only chats for you if you and your match both agree. Every message shows who wrote it.",
  },
  {
    title: "The AI runs on your device",
    body: "Echo's language model runs in your browser, so your chats with it aren't sent to a server.",
  },
];

export default function Welcome() {
  const navigate = useNavigate();
  const [adult, setAdult] = useState(false);
  const [prototype, setPrototype] = useState(false);

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex items-center gap-2">
        <EchoMark className="size-9" />
        <span className="text-xl font-semibold tracking-tight">Echo</span>
      </div>

      <h1 className="mt-10 text-[32px] leading-[1.1] font-semibold tracking-tight">
        From first interest
        <br />
        to a first date.
      </h1>
      <p className="mt-3 text-[17px] text-muted">
        Dating for UofT students. Echo helps you find someone, get to know them and plan a first date, at your own pace.
      </p>

      <ul className="mt-8 space-y-4">
        {POINTS.map((p) => (
          <li key={p.title} className="flex gap-3">
            <span className="mt-1.5 size-2 shrink-0 rounded-full bg-accent" />
            <div>
              <p className="font-semibold">{p.title}</p>
              <p className="text-[15px] text-muted">{p.body}</p>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-auto pt-10">
        <div className="space-y-3">
          <Check checked={adult} onChange={setAdult}>
            I'm 18 or older and a student at UofT St. George.
          </Check>
          <Check checked={prototype} onChange={setPrototype}>
            I understand this is a research prototype. Profiles and replies from matches are made up.
          </Check>
        </div>
        <button className="btn-primary mt-6 w-full" disabled={!adult || !prototype} onClick={() => navigate("/setup")}>
          Get started
        </button>
      </div>
    </div>
  );
}

function Check({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 text-[15px]">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 size-5 shrink-0 accent-[var(--color-accent)]"
      />
      <span>{children}</span>
    </label>
  );
}
