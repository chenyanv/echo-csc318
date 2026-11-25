import { Link, useNavigate } from "react-router-dom";
import { Avatar } from "../components/ui/Avatar";
import { Chip } from "../components/ui/Chip";
import { PageTitle } from "../components/ui/PageHeader";
import { GOALS, PACES } from "../data/profiles";
import { useStore } from "../state/store";

export default function Profile() {
  const { state, loadPreset } = useStore();
  const navigate = useNavigate();
  const me = state.me;

  return (
    <section>
      <PageTitle title="Profile" />
      <div className="card p-5">
        <div className="flex items-center gap-4">
          <Avatar profile={me} />
          <div>
            <p className="text-lg font-semibold">{me.name}</p>
            <p className="text-sm text-muted">{[me.pronouns, me.program, me.year].filter(Boolean).join(" · ") || "UofT student"}</p>
          </div>
        </div>
        <dl className="mt-5 space-y-4 text-[15px]">
          <Row label="Looking for">{GOALS[me.goal]}</Row>
          <Row label="Before a first date">{PACES[me.pace]}</Row>
          <Row label="Interests">
            <div className="flex flex-wrap gap-1.5">{me.interests.map((i) => <Chip key={i}>{i}</Chip>)}</div>
          </Row>
          <Row label="What matters">{me.values.join(", ")}</Row>
          <Row label="Instagram">{me.instagram ? `@${me.instagram} (private until you share it)` : "Not added"}</Row>
        </dl>
        <button type="button" className="btn-secondary mt-5" onClick={() => navigate("/setup")}>
          Edit profile
        </button>
      </div>

      <div className="card mt-4 p-5">
        <p className="font-semibold">For researchers</p>
        <p className="mt-1 text-sm text-muted">Tools for running study sessions.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link to="/facilitator" className="btn-secondary">
            Facilitator panel
          </Link>
          <Link to="/lab" className="btn-secondary">
            AI model lab
          </Link>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              if (confirm("Reset the prototype? This clears your profile, matches and chats on this device.")) {
                loadPreset("fresh");
                navigate("/welcome", { replace: true });
              }
            }}
          >
            Reset prototype
          </button>
        </div>
      </div>
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[13px] font-medium text-muted">{label}</dt>
      <dd className="mt-1">{children}</dd>
    </div>
  );
}
