import { Link } from "react-router-dom";
import { EchoMark } from "../components/EchoMark";
import { useStore } from "../state/store";

function greeting(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default function Home() {
  const { state } = useStore();
  return (
    <section>
      <header className="flex items-center gap-2 md:hidden">
        <EchoMark className="size-7" />
        <span className="text-lg font-semibold tracking-tight">Echo</span>
      </header>

      <h1 className="mt-6 text-[28px] leading-tight font-semibold tracking-tight md:mt-0">
        {greeting(new Date().getHours())}, {state.me.name}
      </h1>
      <p className="mt-1 text-muted">Your match for today is ready when you are.</p>

      <Link to="/today" className="card mt-6 block p-5 transition-shadow hover:shadow-md">
        <p className="text-[13px] font-medium text-accent">Today's match</p>
        <p className="mt-1 text-lg font-semibold">See who Echo found for you</p>
        <p className="mt-1 text-sm text-muted">You get one match a day, so take your time with it.</p>
      </Link>

      <div className="card mt-4 p-5">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-echo-soft px-2.5 py-0.5 text-[12px] font-medium text-echo">On-device AI</span>
        </div>
        <p className="mt-2 font-semibold">Try the AI model lab</p>
        <p className="mt-1 text-sm text-muted">
          Compare the small models Echo could run in your browser. Nothing you type leaves this device.
        </p>
        <Link to="/lab" className="btn-secondary mt-4">
          Open model lab
        </Link>
      </div>
    </section>
  );
}
