'use client';
import { useState } from 'react';
import { Bot, Check, Clipboard, Download, ShieldAlert } from 'lucide-react';
const platformSummary = `FORGE is a capability problem-solving and institutional-knowledge network. Problems are enduring capability gaps; Projects are solution efforts that may be organic development, commercial products, tactics or techniques, training, integration/configuration, process/policy, or hybrids. Executive Views explain decisions quickly, Technical Views preserve evidence, and AI Handoffs provide portable approved context. Missing details may be intentionally external or controlled; never reconstruct them. FORGE is an UNCLASSIFIED prototype, not a classification or sanitization authority. Review every export before sharing.`;
export function PlatformGuide() {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    const text = await fetch('/api/platform-handoff').then((r) => r.text());
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };
  return (
    <>
      <div className="guide-hero">
        <div>
          <p className="eyebrow">FORGE PLATFORM HANDOFF</p>
          <h1>Understand the platform. Use it responsibly.</h1>
          <p>
            A plain-language guide for people and AI systems encountering FORGE
            for the first time.
          </p>
        </div>
        <div className="guide-actions">
          <button className="secondary" onClick={copy}>
            {copied ? <Check /> : <Clipboard />}
            {copied ? 'Copied' : 'Give FORGE to My AI'}
          </button>
          <a className="create" href="/api/platform-handoff">
            <Download /> Download manual
          </a>
        </div>
      </div>
      <div className="security-callout prominent">
        <ShieldAlert />
        <div>
          <strong>UNCLASSIFIED INFORMATION ONLY</strong>
          <p>
            FORGE helps answer “What capability do we need?” without
            distributing the sensitive operation or scenario that caused the
            need. It is not a classification, declassification, sanitization, or
            security-review authority.
          </p>
        </div>
      </div>
      <div className="guide-grid">
        <section className="panel">
          <Bot />
          <h2>Three knowledge experiences</h2>
          <p>
            <b>Executive:</b> explain it quickly. <b>Technical:</b> show the
            details and evidence. <b>AI Handoff:</b> provide enough approved
            context to continue intelligently.
          </p>
        </section>
        <section className="panel">
          <h2>Problems and Projects</h2>
          <p>
            Problems are enduring capability gaps. Projects are attempts to
            solve or mitigate them. Failed, partial, superseded, and alternative
            work remains valuable.
          </p>
        </section>
        <section className="panel">
          <h2>Seven solution pathways</h2>
          <p>
            Build, buy, integrate, configure, employ differently, train, change
            a process, or combine approaches. The best answer is not necessarily
            new technology.
          </p>
        </section>
        <section className="panel">
          <h2>Knowledge can remain elsewhere</h2>
          <p>
            Documentation Availability distinguishes knowing knowledge exists
            from possessing it. Contact the originator for external, controlled,
            or metadata-only records; never invent withheld detail.
          </p>
        </section>
        <section className="panel span-2">
          <h2>How to begin</h2>
          <p>
            Search for the capability need, open the enduring Problem, compare
            existing Solution Efforts, check maturity and documentation
            availability, then choose Executive, Technical, or AI Handoff based
            on your task. Create new work only after checking related records.
          </p>
        </section>
      </div>
      <section className="panel platform-instruction">
        <h2>AI-ready summary</h2>
        <p>{platformSummary}</p>
      </section>
    </>
  );
}
