"use client";
import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import {
  ArrowRight,
  BookOpen,
  Check,
  CircleHelp,
  FileText,
  Layers,
  ListChecks,
  SlidersHorizontal,
  X,
} from "lucide-react";
import Modal from "./modal";
export const guideSteps = [
  {
    title: "Start with the customer and event",
    text: "Create a quotation, choose a customer, then add the event name and location. Use Choose dates to select the first and last day of the event. Leave the end date blank for a single-day event.",
    tip: "Event dates do not change prices automatically. Use Apply days to daily items to update billing durations, then review the totals before saving.",
    Icon: FileText,
    href: "/quotation/new",
    link: "Create a quotation",
  },
  {
    title: "Find items in seconds",
    text: "Choose Add catalog item and search by name, SKU, or category. Select several results and add them together. Use Custom item for transport, crew, or any one-off service.",
    tip: "Daily pricing = quantity × days × price. Once / event pricing does not multiply by duration.",
    Icon: ListChecks,
    href: "/master/items",
    link: "Manage the catalog",
  },
  {
    title: "Build a package your way",
    text: "Add a package such as Sound System 10,000 W. Edit its name, bundle price, quantities, or component list directly in the quotation.",
    tip: "The bundle earns revenue once. Component costs are added together; customers see component names and quantities, never their costs.",
    Icon: Layers,
    href: "/master/packages",
    link: "Set up packages",
  },
  {
    title: "Check costs, discounts, and taxes",
    text: "Use Internal, Vendor, or Custom for each cost. Empty means unknown; enter 0 only when the cost is truly zero. Apply line discounts first, then an overall discount. VAT (PPN) and income tax (PPh) are both added when enabled.",
    tip: "VAT selects the tax bank account. A bank account you edit manually stays unchanged until you reset it.",
    Icon: SlidersHorizontal,
    href: "/profile",
    link: "Review company defaults",
  },
  {
    title: "Save, review, and share",
    text: "Click Save draft. Complete all costs before marking it as sent. Open Print to review the customer document and save it as a PDF in your browser. Update the status manually when the customer responds.",
    tip: "Editing a sent, approved, or rejected quotation creates a new draft revision. Earlier versions remain available. No email is sent automatically.",
    Icon: Check,
    href: "/quotation",
    link: "View quotations",
  },
];
function subscribe(cb: () => void) {
  window.addEventListener("yw-onboarding", cb);
  return () => window.removeEventListener("yw-onboarding", cb);
}
function snapshot() {
  try {
    return localStorage.getItem("yw-welcome-dismissed") === "yes";
  } catch {
    return false;
  }
}
function dismiss() {
  try {
    localStorage.setItem("yw-welcome-dismissed", "yes");
  } catch {}
  window.dispatchEvent(new Event("yw-onboarding"));
}
export function TutorialButton({ prominent = false }: { prominent?: boolean }) {
  const [step, setStep] = useState<number | null>(null);
  const current = step === null ? null : guideSteps[step];
  return (
    <>
      <button
        type="button"
        className={`button ${prominent ? "primary" : "small"}`}
        onClick={() => setStep(0)}
      >
        <CircleHelp size={17} />
        {prominent ? "Take a quick tour" : "Quick tour"}
      </button>
      {current && step !== null && (
        <Modal
          title="Your first quotation"
          onClose={() => setStep(null)}
          className="tutorial-modal"
        >
          <div
            className="tour-progress"
            aria-label={`Step ${step + 1} of ${guideSteps.length}`}
          >
            {guideSteps.map((s, i) => (
              <button
                key={s.title}
                type="button"
                aria-label={`Tutorial step ${i + 1}`}
                aria-current={step === i ? "step" : undefined}
                className={i <= step ? "complete" : ""}
                onClick={() => setStep(i)}
              />
            ))}
          </div>
          <div className="tour-content" key={step}>
            <span className="tour-icon">
              <current.Icon size={32} />
            </span>
            <p className="eyebrow">
              STEP {step + 1} OF {guideSteps.length}
            </p>
            <h3>{current.title}</h3>
            <p>{current.text}</p>
            <div className="tip-box">{current.tip}</div>
          </div>
          <div className="form-actions">
            <button
              type="button"
              className="button"
              onClick={() => (step ? setStep(step - 1) : setStep(null))}
            >
              {step ? "Back" : "Skip for now"}
            </button>
            <button
              type="button"
              className="button primary"
              onClick={() => {
                if (step === guideSteps.length - 1) {
                  dismiss();
                  setStep(null);
                } else setStep(step + 1);
              }}
            >
              {step === guideSteps.length - 1 ? "Got it, let’s start" : "Next"}
              <ArrowRight size={17} />
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
export function WelcomeCard() {
  const hidden = useSyncExternalStore(subscribe, snapshot, () => true);
  if (hidden) return null;
  return (
    <section className="welcome-card">
      <div className="welcome-icon">
        <BookOpen size={26} />
      </div>
      <div>
        <p className="eyebrow">A LITTLE GUIDANCE, A FASTER START</p>
        <h2>Your first quotation, step by step.</h2>
        <p>
          From choosing items to a customer-ready PDF. We’ll show you around.
        </p>
        <div className="welcome-actions">
          <TutorialButton prominent />
          <Link href="/help" className="button">
            Read the guide
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
      <button
        type="button"
        className="icon-button welcome-dismiss"
        aria-label="Dismiss welcome"
        onClick={dismiss}
      >
        <X size={18} />
      </button>
    </section>
  );
}
export function GuideContent() {
  return (
    <div className="guide-layout">
      <nav className="guide-index" aria-label="Guide chapters">
        {guideSteps.map((step, i) => (
          <a key={step.title} href={`#guide-${i}`}>
            {String(i + 1).padStart(2, "0")}
            <span>{step.title}</span>
          </a>
        ))}
      </nav>
      <div className="stack">
        {guideSteps.map((step, i) => (
          <section
            className="panel padded guide-chapter"
            id={`guide-${i}`}
            key={step.title}
          >
            <span className="tour-icon">
              <step.Icon size={24} />
            </span>
            <p className="eyebrow">STEP {i + 1}</p>
            <h2>{step.title}</h2>
            <p>{step.text}</p>
            <div className="tip-box">{step.tip}</div>
            <Link className="button" href={step.href}>
              {step.link}
              <ArrowRight size={16} />
            </Link>
          </section>
        ))}
        <section className="panel padded guide-chapter">
          <h2>Turn your quotation into an invoice</h2>
          <p>
            Save your quotation, then choose Create invoice. Select Full payment
            for one invoice, or Down payment (50%) followed by Final installment
            (50%). Review the dates, bank account, and payment terms before
            issuing.
          </p>
          <div className="tip-box">
            Both installments keep the same saved quotation values. Issuing
            locks the document; it does not record a payment. Print / PDF
            produces the customer invoice. To change a billing plan, void its
            invoices first.
          </div>
          <Link href="/invoice" className="button">
            Open invoices
            <ArrowRight size={16} />
          </Link>
        </section>
        <section className="panel padded guide-chapter">
          <h2>Keep your sales conversations moving</h2>
          <p>
            Open Sales overview to review your pipeline and expiring offers.
            Schedule a follow-up with a quotation, date, and next step. Complete
            it after your conversation, or reopen it if more work is needed.
            Reminders are internal and do not send messages.
          </p>
          <div className="tip-box">
            For a repeat event, open a saved quotation and choose Duplicate. A
            new draft gets its own number and fresh dates, while the original
            stays intact. Review the event date, prices, and customer before
            sending.
          </div>
          <Link href="/sales" className="button">
            Open sales overview
            <ArrowRight size={16} />
          </Link>
        </section>
        <section className="panel padded">
          <h2>Everyday shortcuts</h2>
          <p className="muted">
            Press Ctrl/Cmd + K for quick actions. Prices automatically format as
            100.000; use a comma for decimals, such as 100.000,50. Use Tab to
            move through controls. In a search dialog, use ↑ / ↓ and Enter to
            select, or Esc to close. Collapse finished quotation lines to keep
            your workspace focused. Switch between light, dark, and system
            appearance in the top bar.
          </p>
          <p className="muted">
            Only commercial quantities belong here. No stock checks or warehouse
            allocations are performed.
          </p>
        </section>
      </div>
    </div>
  );
}
