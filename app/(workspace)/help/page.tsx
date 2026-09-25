import { GuideContent, TutorialButton } from "@/components/tutorial";
export default function HelpPage() {
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">HELP & GETTING STARTED</p>
          <h1>A clear path to your first quote.</h1>
          <p className="muted">Five steps, with answers along the way.</p>
        </div>
        <TutorialButton prominent />
      </div>
      <GuideContent />
    </>
  );
}
