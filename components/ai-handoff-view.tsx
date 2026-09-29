'use client';
import { useMemo, useState } from 'react';
import {
  Check,
  Clipboard,
  Download,
  FileJson,
  FileText,
  ShieldAlert,
} from 'lucide-react';
import type { PortalProject } from '@/lib/data/types';
import {
  handoffCompleteness,
  projectHandoffJson,
  projectHandoffMarkdown,
  projectHandoffText,
} from '@/lib/domain/handoff';

type Format = 'markdown' | 'text' | 'json';
export function AiHandoffView({ project }: { project: PortalProject }) {
  const [format, setFormat] = useState<Format>('markdown');
  const [copied, setCopied] = useState(false);
  const generated = useMemo(() => new Date(), [project.updatedAt]);
  const outputs = {
    markdown: projectHandoffMarkdown(project, generated),
    text: projectHandoffText(project, generated),
    json: projectHandoffJson(project, generated),
  };
  const copy = async () => {
    await navigator.clipboard.writeText(outputs[format]);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };
  const download = () => {
    const blob = new Blob([outputs[format]], {
      type: format === 'json' ? 'application/json' : 'text/plain',
    });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${project.id}-FORGE-AI-Handoff.${format === 'markdown' ? 'md' : format === 'json' ? 'json' : 'txt'}`;
    link.click();
    URL.revokeObjectURL(link.href);
  };
  return (
    <div className="handoff-layout">
      <section className="handoff-intro">
        <p className="eyebrow">PORTABLE PROJECT CONTEXT</p>
        <h2>AI Project Handoff</h2>
        <p>
          Give another capable AI enough approved context to continue assisting
          without rebuilding the Project history from zero.
        </p>
        <div className="handoff-score">
          <strong>{handoffCompleteness(project)}</strong>
          <span>Context completeness · not a correctness rating</span>
        </div>
        <div className="security-callout">
          <ShieldAlert />
          <div>
            <strong>Review before sharing with an AI system.</strong>
            <p>
              This export aggregates Project information but does not determine
              whether it is authorized for release. FORGE does not automatically
              transmit it anywhere.
            </p>
          </div>
        </div>
        <dl>
          <div>
            <dt>Generated</dt>
            <dd>{generated.toLocaleString()}</dd>
          </div>
          <div>
            <dt>Project updated</dt>
            <dd>{new Date(project.updatedAt).toLocaleString()}</dd>
          </div>
          <div>
            <dt>Version</dt>
            <dd>1.0</dd>
          </div>
          <div>
            <dt>Documentation</dt>
            <dd>{project.documentationLabel}</dd>
          </div>
        </dl>
      </section>
      <section className="handoff-document">
        <div className="handoff-toolbar">
          <div>
            <button
              className={format === 'markdown' ? 'selected' : ''}
              onClick={() => setFormat('markdown')}
            >
              <FileText /> Markdown
            </button>
            <button
              className={format === 'text' ? 'selected' : ''}
              onClick={() => setFormat('text')}
            >
              <FileText /> Plain text
            </button>
            <button
              className={format === 'json' ? 'selected' : ''}
              onClick={() => setFormat('json')}
            >
              <FileJson /> JSON
            </button>
          </div>
          <div>
            <button onClick={copy}>
              {copied ? <Check /> : <Clipboard />}
              {copied ? 'Copied' : 'Copy'}
            </button>
            <button className="create" onClick={download}>
              <Download /> Download
            </button>
          </div>
        </div>
        <pre>{outputs[format]}</pre>
      </section>
    </div>
  );
}
