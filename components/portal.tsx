'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  BookOpen,
  Boxes,
  Check,
  ChevronRight,
  CircleDot,
  Command,
  ExternalLink,
  GitBranch,
  HelpCircle,
  Map,
  MapPin,
  Network,
  Plus,
  Search,
  Shield,
  Users,
  UserCog,
  Wrench,
  X,
} from 'lucide-react';
import type { PortalData, PortalProject } from '@/lib/data/types';
import { filterProjects } from '@/lib/domain/search';
import { SOLUTION_TYPES } from '@/lib/domain/solution-types';
import { useRouter } from 'next/navigation';
import { CreateProjectModal } from './create-project-modal';
import { ProjectActions } from './project-actions';
import { AiHandoffView } from './ai-handoff-view';

const DataContext = createContext<PortalData | null>(null);
type ProblemMatchResult = {
  dbId?: number;
  id: string;
  title: string;
  description?: string;
  category: string;
  status?: string;
  score: number;
  classification: 'POSSIBLE_DUPLICATE' | 'RELATED_PROBLEM';
  reasons: string[];
};
const useData = () => {
  const value = useContext(DataContext);
  if (!value) throw new Error('Portal data is unavailable.');
  return value;
};

const baseNav = [
  ['Dashboard', BarChart3],
  ['Explore', Search],
  ['Problems', AlertTriangle],
  ['Projects', Wrench],
  ['Units', Users],
  ['Map', Map],
  ['Capability Graph', Network],
  ['Activity', Activity],
] as const;

export function Portal({
  initialData,
  initialView = 'Dashboard',
  selectedId,
}: {
  initialData: PortalData;
  initialView?: string;
  selectedId?: string;
}) {
  const router = useRouter();
  const data = initialData;
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(initialView);
  const [creating, setCreating] = useState<'problem' | 'project' | false>(
    false,
  );
  const user = data.session.currentUser;
  const canCreateProject = Boolean(
    user &&
    user.status === 'ACTIVE' &&
    ['PROJECT_USER', 'UNIT_ADMIN', 'SYSTEM_ADMIN'].includes(user.role),
  );
  const canAdminister = Boolean(
    user &&
    user.status === 'ACTIVE' &&
    ['UNIT_ADMIN', 'SYSTEM_ADMIN'].includes(user.role),
  );
  const nav = canAdminister
    ? [...baseNav, ['Administration', UserCog] as const]
    : baseNav;
  const open = (type: 'problems' | 'projects' | 'units', id: string) =>
    router.push(`/${type}/${id}`);
  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return [];
    const problemMatches = data.problems
      .filter((x) =>
        `${x.id} ${x.title} ${x.category} ${x.tags.join(' ')}`
          .toLowerCase()
          .includes(needle),
      )
      .map((x) => ({
        type: 'Problem',
        id: x.id,
        title: x.title,
        meta: `${x.projectIds.length} approaches · ${x.unitCount} units`,
      }));
    const projectMatches = data.projects
      .filter((x) =>
        `${x.id} ${x.name} ${x.unit} ${x.solutionTypeLabel} ${x.vendor?.vendorName ?? ''} ${x.tags.join(' ')}`
          .toLowerCase()
          .includes(needle),
      )
      .map((x) => ({
        type: 'Project',
        id: x.id,
        title: x.name,
        meta: `${x.solutionTypeLabel} · ${x.unit}`,
      }));
    const unitMatches = data.units
      .filter((x) =>
        `${x.id} ${x.name} ${x.abbreviation} ${x.parentOrganization}`
          .toLowerCase()
          .includes(needle),
      )
      .map((x) => ({
        type: 'Unit',
        id: x.id,
        title: x.name,
        meta: `${x.abbreviation} · ${x.type}`,
      }));
    return [...problemMatches, ...projectMatches, ...unitMatches]
      .sort((a, b) =>
        a.id.toLowerCase() === needle
          ? -1
          : b.id.toLowerCase() === needle
            ? 1
            : 0,
      )
      .slice(0, 6);
  }, [query, data]);

  useEffect(() => {
    const context = (
      document as Document & {
        modelContext?: {
          registerTool: (tool: unknown, options?: unknown) => unknown;
        };
      }
    ).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    void Promise.resolve(
      context.registerTool(
        {
          name: 'start_problem_creation',
          title: 'Start problem creation',
          description:
            'Open the visible form used to create a new capability problem.',
          inputSchema: {
            type: 'object',
            properties: {},
            additionalProperties: false,
          },
          annotations: { readOnlyHint: false, untrustedContentHint: false },
          execute: () => {
            setCreating('problem');
            return { status: 'form_opened' };
          },
        },
        { signal: lifecycle.signal },
      ),
    ).catch(() => {});
    return () => lifecycle.abort();
  }, []);

  const saveProblem = async (body: {
    title: string;
    description: string;
    duplicateReviewed: boolean;
    coveredProblemId?: number;
  }) => {
    const response = await fetch('/api/problems', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    const item = (await response.json()) as {
      trackingId?: string;
      error?: string;
      matches?: ProblemMatchResult[];
    };
    if (!response.ok) return { ok: false as const, ...item };
    setCreating(false);
    router.refresh();
    setActive('Problems');
    return { ok: true as const, ...item };
  };

  return (
    <DataContext.Provider value={data}>
      <div className="app-shell">
        <aside className="sidebar">
          <div className="brand">
            <span className="brand-mark">
              <Shield size={18} />
            </span>
            <div>
              <strong>FORGE</strong>
              <small>UAS Capability Portal</small>
            </div>
          </div>
          <nav aria-label="Primary navigation">
            {nav.map(([label, Icon]) => (
              <button
                key={label}
                className={active === label ? 'nav-item active' : 'nav-item'}
                onClick={() => setActive(label)}
              >
                <Icon size={17} />
                <span>{label}</span>
                {label === 'Problems' && <em>{data.problems.length}</em>}
              </button>
            ))}
          </nav>
          <div className="sidebar-foot">
            {data.session.devSwitcherEnabled && (
              <div className="dev-switcher">
                <strong>Development Only — Not Authentication</strong>
                <select
                  aria-label="Development user"
                  value={user?.id ?? ''}
                  onChange={async (event) => {
                    await fetch('/api/dev-identity', {
                      method: 'POST',
                      headers: { 'content-type': 'application/json' },
                      body: JSON.stringify({
                        userId: Number(event.target.value),
                      }),
                    });
                    window.location.reload();
                  }}
                >
                  {data.session.availableUsers.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.displayName} — {item.role.replaceAll('_', ' ')}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="classification">
              {data.datasetMode === 'demo'
                ? 'DEMO DATA — DEVELOPMENT ONLY'
                : 'UNCLASSIFIED'}
            </div>
            <button className="nav-item" onClick={() => router.push('/guide')}>
              <HelpCircle size={17} /> Help & guidance
            </button>
            <div className="profile">
              <span>PA</span>
              <div>
                <strong>{user?.displayName ?? 'No active identity'}</strong>
                <small>
                  {user?.role.replaceAll('_', ' ') ??
                    'Authentication adapter pending'}
                </small>
              </div>
            </div>
          </div>
        </aside>
        <main>
          <header className="topbar">
            <div className="search-wrap">
              <Search size={18} />
              <input
                aria-label="Global search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search problems, solution types, vendors, units…"
              />
              <kbd>
                <Command size={11} /> K
              </kbd>
              {query && (
                <div className="search-results">
                  <div className="result-label">Best matches</div>
                  {matches.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => {
                        open(
                          m.type === 'Project'
                            ? 'projects'
                            : m.type === 'Unit'
                              ? 'units'
                              : 'problems',
                          m.id,
                        );
                        setQuery('');
                      }}
                    >
                      <span className="result-icon">{m.type[0]}</span>
                      <div>
                        <strong>
                          {m.id} — {m.title}
                        </strong>
                        <small>
                          {m.type} · {m.meta}
                        </small>
                      </div>
                      <ArrowRight size={15} />
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              className="create"
              onClick={() => setCreating('problem')}
              disabled={!user || user.status !== 'ACTIVE'}
            >
              <Plus size={16} /> Submit Problem
            </button>
          </header>
          <div className="page">
            <View
              active={active}
              setActive={setActive}
              selectedId={selectedId}
              open={open}
              onCreateProject={() => setCreating('project')}
              canCreateProject={canCreateProject}
            />
          </div>
        </main>
        {creating === 'problem' && (
          <CreateModal
            onClose={() => setCreating(false)}
            onSave={saveProblem}
          />
        )}
        {creating === 'project' && (
          <CreateProjectModal
            data={data}
            onClose={() => setCreating(false)}
            onProblem={() => setCreating('problem')}
            onCreated={(id) => open('projects', id)}
          />
        )}
      </div>
    </DataContext.Provider>
  );
}

function View({
  active,
  setActive,
  selectedId,
  open,
  onCreateProject,
  canCreateProject,
}: {
  active: string;
  setActive: (v: string) => void;
  selectedId?: string;
  open: (type: 'problems' | 'projects' | 'units', id: string) => void;
  onCreateProject: () => void;
  canCreateProject: boolean;
}) {
  if (active === 'Problem')
    return (
      <ProblemView
        id={selectedId}
        onCompare={() => setActive('Compare')}
        onProject={(id) => open('projects', id)}
      />
    );
  if (active === 'Compare') return <CompareView />;
  if (active === 'Project')
    return (
      <ProjectView
        id={selectedId}
        onUnit={() => setActive('Unit')}
        onRelated={() => setActive('Explore')}
      />
    );
  if (active === 'Unit' || active === 'Units')
    return <UnitView id={selectedId} onMap={() => setActive('Map')} />;
  if (active === 'Map')
    return <MapView onProject={() => setActive('Project')} />;
  if (active === 'Capability Graph')
    return <GraphView onProblem={() => setActive('Problem')} />;
  if (active === 'Projects')
    return (
      <ProjectsView
        onProject={(id) => open('projects', id)}
        onCreate={onCreateProject}
        canCreate={canCreateProject}
      />
    );
  if (active === 'Problems')
    return <ProblemsView onProblem={(id) => open('problems', id)} />;
  if (active === 'Explore')
    return <ExploreView onProject={() => setActive('Project')} />;
  if (active === 'Activity') return <ActivityView />;
  if (active === 'Administration') return <AdministrationView />;
  return <Dashboard />;
}

function Dashboard() {
  const { problems, projects, units, activities, helpRequests } = useData();
  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">MONDAY · 07 SEPTEMBER 2026</p>
          <h1>Capability development overview</h1>
          <p>
            See where work is moving, where teams overlap, and where support is
            needed.
          </p>
        </div>
        <button className="secondary">
          <Activity size={16} /> View activity
        </button>
      </div>
      <section className="stat-grid">
        <Stat
          icon={<AlertTriangle />}
          tone="amber"
          label="Open Problems"
          value={String(problems.filter((x) => x.status === 'Open').length)}
          note={`${problems.filter((x) => x.projectIds.length === 0).length} without linked projects`}
        />
        <Stat
          icon={<Wrench />}
          tone="blue"
          label="Active Projects"
          value={String(projects.filter((x) => x.status === 'Active').length)}
          note={`${activities.length} recent events`}
        />
        <Stat
          icon={<Users />}
          tone="violet"
          label="Participating Units"
          value={String(units.length)}
          note={`${units.filter((x) => x.hasLocation).length} with approved location data`}
        />
        <Stat
          icon={<CircleDot />}
          tone="green"
          label="Validated Solutions"
          value={String(
            projects.filter((x) => x.maturity === 'Validated').length,
          )}
          note={`${projects.filter((x) => x.status === 'Transitioning').length} ready to transition`}
        />
      </section>
      {!projects.length && (
        <div className="notice">
          <Wrench size={18} />
          <div>
            <strong>{problems.length} initial capability Problems are ready for collaboration.</strong>
            <p>Participating Units can now associate existing work and create Solution Efforts. Detailed Problem statements and prioritization remain pending stakeholder refinement.</p>
          </div>
        </div>
      )}
      <section
        className="solution-strip"
        aria-label="Solution effort distribution"
      >
        {SOLUTION_TYPES.map(([value, label]) => (
          <div key={value}>
            <strong>
              {projects.filter((p) => p.solutionType === value).length}
            </strong>
            <span>{label}</span>
          </div>
        ))}
      </section>
      <div className="dashboard-grid">
        <section className="panel span-2">
          <PanelHead
            title="Current capability activity"
            note="Most active problem spaces across the network"
            action="View all problems"
          />
          <div className="problem-list">
            {problems.slice(0, 3).map((p, i) => (
              <ProblemRow
                key={p.id}
                priority={p.priority.toUpperCase().slice(0, 4)}
                title={`${p.id} · ${p.title}`}
                meta={`${p.projectIds.length} projects · ${p.unitCount} units · ${p.category}`}
                updated={activities.length ? (i ? 'Recently updated' : 'Latest update') : 'Awaiting stakeholder refinement'}
              />
            ))}
          </div>
        </section>
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Projects needing help</h2>
              <p>Open assistance requests</p>
            </div>
            <span className="count">{helpRequests.length}</span>
          </div>
          {helpRequests.slice(0, 2).map((h) => (
            <Help
              key={h.id}
              icon={<Boxes />}
              title={h.projectName}
              text={h.description}
              meta={`${h.unitName} · open`}
            />
          ))}
        </section>
        <section className="panel span-2">
          <PanelHead
            title="Recently updated projects"
            note="Progress worth reviewing"
            action="View all projects"
          />
          <div className="project-cards">
            {[...projects]
              .sort((a, b) => b.lastMeaningfulActivityAt.localeCompare(a.lastMeaningfulActivityAt))
              .slice(0, 3)
              .map((p) => (
              <div className="project-card" key={p.id}>
                <div>
                  <span className={`dot ${p.tone}`} />
                  <small>{p.status}</small>
                </div>
                <strong>{p.name}</strong>
                <p>
                  {p.id} · {p.unit}
                </p>
                <Progress value={p.progress} />
                <footer>
                  <span>{p.maturity}</span>
                  <b>{p.progress}%</b>
                </footer>
              </div>
            ))}
          </div>
        </section>
        <section className="panel">
          <PanelHead title="Network pulse" note="Last 7 days" />
          <div className="pulse">
            <div>
              <strong>{activities.length}</strong>
              <span>Updates</span>
            </div>
            <div>
              <strong>{activities.filter((item) => item.eventType === 'LESSON_ADDED').length}</strong>
              <span>Lessons</span>
            </div>
            <div>
              <strong>{activities.filter((item) => item.eventType === 'TEST_RESULT').length}</strong>
              <span>Tests</span>
            </div>
          </div>
          {activities.length ? (
            <div className="spark" aria-label="Activity trend">
              {[25, 38, 32, 66, 54, 86, 72].map((n) => (
                <i key={n} style={{ height: `${n}%` }} />
              ))}
            </div>
          ) : (
            <p className="muted">No operational activity has been recorded.</p>
          )}
        </section>
      </div>
    </>
  );
}

function Stat({
  icon,
  tone,
  label,
  value,
  note,
}: {
  icon: React.ReactNode;
  tone: string;
  label: string;
  value: string;
  note: string;
}) {
  return (
    <article>
      <span className={`icon ${tone}`}>{icon}</span>
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
        <p>{note}</p>
      </div>
    </article>
  );
}
function PanelHead({
  title,
  note,
  action,
}: {
  title: string;
  note: string;
  action?: string;
}) {
  return (
    <div className="panel-head">
      <div>
        <h2>{title}</h2>
        <p>{note}</p>
      </div>
      {action && (
        <button>
          {action} <ChevronRight size={15} />
        </button>
      )}
    </div>
  );
}
function ProblemRow({
  priority,
  title,
  meta,
  updated,
}: {
  priority: string;
  title: string;
  meta: string;
  updated: string;
}) {
  return (
    <button className="problem-row">
      <span className={`priority ${priority === 'MED' ? 'med' : 'high'}`}>
        {priority}
      </span>
      <div>
        <strong>{title}</strong>
        <small>{meta}</small>
      </div>
      <span className="updated">{updated}</span>
      <ChevronRight size={17} />
    </button>
  );
}
function Help({
  icon,
  title,
  text,
  meta,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
  meta: string;
}) {
  return (
    <div className="help-card">
      <span>{icon}</span>
      <div>
        <strong>{title}</strong>
        <p>{text}</p>
        <small>{meta}</small>
      </div>
    </div>
  );
}
function Progress({ value }: { value: number }) {
  return (
    <div className="progress">
      <span style={{ width: `${value}%` }} />
    </div>
  );
}

function ProblemView({
  id,
  onCompare,
  onProject,
}: {
  id?: string;
  onCompare: () => void;
  onProject: (id: string) => void;
}) {
  const data = useData();
  const problem =
    data.problems.find((x) => x.id === id) ??
    data.problems.find((x) => x.id === 'PRB-000001');
  if (!problem)
    return (
      <div className="empty-state">
        <AlertTriangle />
        <h1>No canonical Problems yet.</h1>
        <p>
          Potential Problems can be submitted for review from the portal header.
        </p>
      </div>
    );
  const all = data.projects.filter((x) => problem.projectIds.includes(x.id));
  return (
    <>
      <div className="crumb">
        Problems <ChevronRight size={14} /> {problem.id}
      </div>
      <div className="problem-hero">
        <div>
          <span className={`priority ${problem.priority === 'High' ? 'high' : 'med'}`}>
            {problem.priority.toUpperCase()}
          </span>
          <h1>{problem.title}</h1>
          <p>
            {problem.id} · {problem.category} · Owner: {problem.owner}
          </p>
        </div>
        <button className="create" onClick={onCompare}>
          <BarChart3 size={16} /> Compare {all.length} efforts
        </button>
      </div>
      <div className="question-callout">
        <strong>What is happening?</strong>
        <p>{problem.description}</p>
      </div>
      <div className="notice">
        <BookOpen size={18} />
        <div>
          <strong>Detailed Problem Statement: Pending Stakeholder Refinement</strong>
          <p>{problem.problemStatement}</p>
        </div>
      </div>
      <h2 className="section-title">
        Solution efforts addressing this problem <span>{all.length}</span>
      </h2>
      {all.length ? <div className="approach-grid">
        {all.map((p) => (
          <article key={p.id}>
            <div>
              <span className={`dot ${p.tone}`} />
              <small>{p.status}</small>
              <span className="maturity">{p.solutionTypeLabel}</span>
            </div>
            <h3>{p.name}</h3>
            <p>
              {p.id} · {p.unit}
            </p>
            <Progress value={p.progress} />
            <footer>
              <small>Completion</small>
              <strong>{p.progress}%</strong>
            </footer>
            <button onClick={() => onProject(p.id)}>
              Open effort <ArrowRight size={15} />
            </button>
          </article>
        ))}
      </div> : <div className="empty-state"><Wrench /><h2>No Solution Efforts have been linked to this Problem yet.</h2><p>Participating Units can associate existing work or create an authorized Solution Effort from the Projects area.</p></div>}
    </>
  );
}

function CompareView() {
  const data = useData();
  const problem = data.problems.find((x) => x.id === 'PRB-000001');
  if (!problem)
    return (
      <div className="empty-state">
        <BarChart3 />
        <h1>Nothing to compare yet.</h1>
        <p>
          Comparisons become available after a Problem has linked solution
          efforts.
        </p>
      </div>
    );
  const projects = data.projects.filter((x) =>
    problem.projectIds.includes(x.id),
  );
  return (
    <>
      <div className="crumb">
        Problems <ChevronRight size={14} /> {problem.id}{' '}
        <ChevronRight size={14} /> Compare
      </div>
      <div className="page-head">
        <div>
          <p className="eyebrow">SOLUTION COMPARISON</p>
          <h1>Approaches to {problem.title}</h1>
          <p>
            Compare unlike pathways without forcing vendor, TTP, training, and
            organic efforts into the same mold.
          </p>
        </div>
      </div>
      <div className="comparison">
        <table>
          <thead>
            <tr>
              <th>Approach</th>
              {projects.map((p) => (
                <th key={p.id}>
                  <small>{p.id}</small>
                  <strong>{p.name}</strong>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <th>Solution type</th>
              {projects.map((p) => (
                <td key={p.id}>
                  <span className="maturity">{p.solutionTypeLabel}</span>
                </td>
              ))}
            </tr>
            <tr>
              <th>Lead unit</th>
              {projects.map((p) => (
                <td key={p.id}>{p.unit}</td>
              ))}
            </tr>
            <tr>
              <th>Vendor / product</th>
              {projects.map((p) => (
                <td key={p.id}>
                  {p.vendor
                    ? `${p.vendor.vendorName} · ${p.vendor.productName}`
                    : '—'}
                </td>
              ))}
            </tr>
            <tr>
              <th>Cost / procurement</th>
              {projects.map((p) => (
                <td key={p.id}>
                  {p.vendor
                    ? `${p.vendor.estimatedTotalCost || p.vendor.estimatedUnitCost || '—'} · ${p.vendor.procurementStatus || '—'}`
                    : '—'}
                </td>
              ))}
            </tr>
            <tr>
              <th>Context</th>
              {projects.map((p) => (
                <td key={p.id}>
                  {p.tactic?.conditionsForUse ||
                    p.training?.intendedAudience ||
                    p.solutionApproach}
                </td>
              ))}
            </tr>
            <tr>
              <th>Maturity</th>
              {projects.map((p) => (
                <td key={p.id}>
                  <span className="maturity">{p.maturity}</span>
                </td>
              ))}
            </tr>
            <tr>
              <th>Completion</th>
              {projects.map((p) => (
                <td key={p.id}>
                  <b>{p.progress}%</b>
                  <Progress value={p.progress} />
                </td>
              ))}
            </tr>
            <tr>
              <th>Key advantage</th>
              {projects.map((p) => (
                <td key={p.id}>{p.keyAdvantage || '—'}</td>
              ))}
            </tr>
            <tr>
              <th>Key limitation</th>
              {projects.map((p) => (
                <td key={p.id}>{p.keyLimitation || '—'}</td>
              ))}
            </tr>
            <tr>
              <th>Outcome / result</th>
              {projects.map((p) => (
                <td key={p.id}>
                  <span
                    className={`outcome ${p.maturity === 'Validated' ? 'good' : ''}`}
                  >
                    {p.outcome || p.latestResult || '—'}
                  </span>
                </td>
              ))}
            </tr>
            <tr>
              <th>Last meaningful activity</th>
              {projects.map((p) => (
                <td key={p.id}>{new Date(p.lastMeaningfulActivityAt).toLocaleDateString()}</td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </>
  );
}

function ProjectView({
  id,
  onUnit,
  onRelated,
}: {
  id?: string;
  onUnit: () => void;
  onRelated: () => void;
}) {
  const [experience, setExperience] = useState<
    'executive' | 'technical' | 'ai'
  >('executive');
  const data = useData();
  const { projects, units, session } = data;
  const project =
    projects.find((x) => x.id === id) ??
    projects.find((x) => x.id === 'PRJ-000001');
  if (!project)
    return (
      <div className="empty-state">
        <Wrench />
        <h1>No solution efforts yet.</h1>
        <p>
          Create the first effort after Units and a reviewed Problem are
          available.
        </p>
      </div>
    );
  const lead = units.find((x) => x.id === project.unitId);
  if (!lead)
    return (
      <div className="empty-state">
        <Users />
        <h1>Lead Unit unavailable.</h1>
        <p>This effort needs a valid lead Unit assignment.</p>
      </div>
    );
  const current = session.currentUser;
  const canEdit = Boolean(
    current &&
    current.status === 'ACTIVE' &&
    (current.role === 'SYSTEM_ADMIN' ||
      project.createdByUserId === current.id ||
      current.projectIds.includes(project.dbId) ||
      (current.role === 'UNIT_ADMIN' &&
        current.administeredUnitIds.includes(lead.dbId))),
  );
  const canManageTeam = Boolean(
    current && current.status === 'ACTIVE' &&
    (current.role === 'SYSTEM_ADMIN' ||
      project.team.some((member) => member.userId === current.id && member.role === 'PROJECT_LEAD') ||
      (current.role === 'UNIT_ADMIN' && current.administeredUnitIds.includes(lead.dbId))),
  );
  return (
    <>
      <div className="crumb">
        Projects <ChevronRight size={14} /> {project.id}
      </div>
      <div className="project-title">
        <div>
          <div className="status-line">
            <span className={`dot ${project.tone}`} /> {project.status}{' '}
            <span className="maturity">{project.solutionTypeLabel}</span>
          </div>
          <h1>{project.name}</h1>
          <p>{project.id} · Persistent solution effort</p>
        </div>
        <div className="view-toggle">
          <button
            className={experience === 'executive' ? 'selected' : ''}
            onClick={() => setExperience('executive')}
          >
            Executive
          </button>
          <button
            className={experience === 'technical' ? 'selected' : ''}
            onClick={() => setExperience('technical')}
          >
            Technical
          </button>
          <button
            className={experience === 'ai' ? 'selected' : ''}
            onClick={() => setExperience('ai')}
          >
            AI Handoff
          </button>
        </div>
      </div>
      {canEdit && <ProjectActions project={project} data={data} canManageTeam={canManageTeam} />}
      {experience === 'executive' ? (
        <ExecutiveSplash
          project={project}
          lead={lead}
          onUnit={onUnit}
          onRelated={onRelated}
        />
      ) : experience === 'technical' ? (
        <TechnicalView project={project} />
      ) : (
        <AiHandoffView project={project} />
      )}
    </>
  );
}

function ExecutiveSplash({
  project,
  lead,
  onUnit,
  onRelated,
}: {
  project: PortalProject;
  lead: PortalData['units'][number];
  onUnit: () => void;
  onRelated: () => void;
}) {
  const currentPhase =
    project.phases.find((p) => p.status !== 'Complete') ??
    project.phases.at(-1);
  const projectLead = project.team.find((member) => member.role === 'PROJECT_LEAD');
  const copyOriginator = () =>
    navigator.clipboard.writeText(
      [project.originatorContact, project.accessInstructions]
        .filter(Boolean)
        .join('\n'),
    );
  const copyProjectLead = () =>
    projectLead && navigator.clipboard.writeText(
      [projectLead.displayName, projectLead.identifier, projectLead.primaryUnit].filter(Boolean).join('\n'),
    );
  return (
    <div className="executive-splash">
      <section className="executive-lead">
        <p className="eyebrow">ONE-MINUTE EXECUTIVE BRIEF</p>
        <h2>{project.executiveSummaryPlainLanguage}</h2>
        <p>{project.impactPlainLanguage}</p>
        <div className="executive-status">
          <span>
            <small>Status</small>
            <strong>{project.status}</strong>
          </span>
          <span>
            <small>Maturity</small>
            <strong>{project.maturity}</strong>
          </span>
          <span>
            <small>Complete</small>
            <strong>{project.progress}%</strong>
          </span>
          <span>
            <small>Current phase</small>
            <strong>{currentPhase?.name ?? 'Not yet phased'}</strong>
          </span>
          <span>
            <small>Last meaningful activity</small>
            <strong>{new Date(project.lastMeaningfulActivityAt).toLocaleDateString()}</strong>
          </span>
        </div>
      </section>
      <div className="executive-grid">
        <section className="exec-card problem-card">
          <p className="eyebrow">THE PROBLEM</p>
          <h3>{project.problemPlainLanguage}</h3>
          <p>
            {project.problems.map((p) => `${p.id} · ${p.title}`).join(' · ')}
          </p>
        </section>
        <section className="exec-card solution-card">
          <p className="eyebrow">WHAT WE ARE DOING</p>
          <h3>{project.solutionPlainLanguage}</h3>
          <span>{project.solutionTypeLabel}</span>
        </section>
        <section className="exec-card">
          <p className="eyebrow">WHAT WE HAVE DEMONSTRATED</p>
          <h3>
            {project.latestResult ||
              project.outcome ||
              'Evidence collection is still underway.'}
          </h3>
          <ul>
            {project.lessons.slice(0, 3).map((l) => (
              <li key={l.id}>{l.finding}</li>
            ))}
          </ul>
        </section>
        <section className="exec-card risk-card">
          <p className="eyebrow">KEY RISK / LIMITATION</p>
          <h3>{project.keyRisk || 'No material risk has been recorded.'}</h3>
          <p>
            Uncertainty is retained until evidence supports a stronger claim.
          </p>
        </section>
        <section className="exec-card">
          <p className="eyebrow">NEXT MEANINGFUL STEP</p>
          <h3>{project.nextStep}</h3>
        </section>
        <section className="exec-card action-card">
          <p className="eyebrow">LEADERSHIP ACTION</p>
          <h3>{project.leadershipAction}</h3>
        </section>
        <section className="exec-card ownership-card">
          <p className="eyebrow">OWNERSHIP & KNOWLEDGE</p>
          <button className="unit-link" onClick={onUnit}>
            <span>{lead.abbreviation.replace('Unit ', '')}</span>
            <div>
              <strong>{lead.name}</strong>
              <small>Originator · {lead.location}</small>
            </div>
            <ChevronRight />
          </button>
          <div className="documentation-line">
            <strong>Project Lead: {projectLead?.displayName ?? 'Not assigned'}</strong>
            <small>{projectLead ? `${projectLead.title || projectLead.primaryUnit} · ${projectLead.identifier}${projectLead.status !== 'ACTIVE' ? ' · Inactive account' : ''}` : 'An authorized administrator should assign current responsibility.'}</small>
          </div>
          {projectLead && <button className="secondary" onClick={copyProjectLead}>Copy Project Lead contact</button>}
          <div className="documentation-line">
            <strong>{project.documentationLabel}</strong>
            {project.accessInstructions && (
              <small>{project.accessInstructions}</small>
            )}
          </div>
          {project.documentationAvailability !== 'AVAILABLE_IN_FORGE' && (
            <button className="create" onClick={copyOriginator}>
              Contact Originator · Copy Instructions
            </button>
          )}
          <button className="text-action" onClick={onRelated}>
            Explore related work <ArrowRight />
          </button>
        </section>
      </div>
    </div>
  );
}

function TechnicalView({ project }: { project: PortalProject }) {
  const projectLead = project.team.find((member) => member.role === 'PROJECT_LEAD');
  const contributors = project.team.filter((member) => member.role === 'CONTRIBUTOR');
  return (
    <div className="detail-grid">
      <div className="security-callout span-2">
        <strong>UNCLASSIFIED INFORMATION ONLY.</strong>
        <p>
          Technical detail is not automatically classified, and generic-looking
          information is not automatically safe. Record only information
          approved for this environment.
        </p>
      </div>
      <SolutionDetail project={project} />
      <section className="panel span-2 project-team-panel">
        <PanelHead title="Project team and relationships" note="Current responsibility and authorized maintainers" />
        <div className="team-responsibility-grid">
          <div><small>Lead Unit</small><strong>{project.unit}</strong></div>
          <div><small>Project Lead</small><strong>{projectLead?.displayName ?? 'Not assigned'}</strong><span>{projectLead?.identifier || ''}{projectLead?.status !== 'ACTIVE' ? ' · Inactive account' : ''}</span></div>
          <div><small>Created by</small><strong>{project.createdByName}</strong></div>
        </div>
        <div className="team-columns">
          <div><h3>Project Contributors</h3>{contributors.length ? contributors.map((member) => <p key={member.userId}><strong>{member.displayName}</strong><span>{member.primaryUnit}{member.status !== 'ACTIVE' ? ' · Inactive account' : ''}</span></p>) : <p>No additional Contributors assigned.</p>}</div>
          <div><h3>Participating Units</h3>{project.units.map((unit) => <p key={unit.id}><strong>{unit.name}</strong><span>{unit.role}</span></p>)}</div>
          <div><h3>Problems addressed</h3>{project.problems.map((problem) => <p key={problem.id}><strong>{problem.id}</strong><span>{problem.title}{problem.isPrimary ? ' · Primary' : ''}</span></p>)}</div>
        </div>
      </section>
      <section className="panel span-2">
        <PanelHead
          title="Project updates"
          note={`Last meaningful activity: ${new Date(project.lastMeaningfulActivityAt).toLocaleDateString()}`}
        />
        {project.updates.length ? (
          <div className="update-timeline">
            {project.updates.map((update) => (
              <article key={update.id}>
                <header>
                  <strong>{update.summary}</strong>
                  <small>{new Date(update.occurredAt).toLocaleDateString()} · {update.authorName}{update.phaseName ? ` · ${update.phaseName}` : ''}</small>
                </header>
                <p><b>Result / finding:</b> {update.result}</p>
                <p><b>Next step:</b> {update.nextStep}</p>
                {update.blockerRisk && <p className="update-risk"><b>Blocker / risk:</b> {update.blockerRisk}</p>}
                {(update.statusAfter || update.maturityAfter || update.completionAfter !== null) && (
                  <footer>
                    {update.statusAfter && <span>Status: {update.statusAfter}</span>}
                    {update.maturityAfter && <span>Maturity: {update.maturityAfter}</span>}
                    {update.completionAfter !== null && <span>Completion: {update.completionAfter}%</span>}
                  </footer>
                )}
              </article>
            ))}
          </div>
        ) : (
          <p className="body-copy">No Project Updates have been recorded yet.</p>
        )}
      </section>
      <section className="panel span-2">
        <PanelHead
          title="Project phases"
          note="Evidence and decisions across the lifecycle"
        />
        <div className="timeline">
          {project.phases.map((p, i) => (
            <Timeline
              key={p.id}
              title={`Phase ${i + 1} · ${p.name}`}
              meta={`${p.status} · ${p.completion}%`}
              text={`${p.summary} ${p.result}`}
            />
          ))}
        </div>
      </section>
      <section className="panel">
        <h2>Technical artifacts</h2>
        <p className="upload-warning">
          <strong>Reference metadata only.</strong> Do not upload classified
          material or information not authorized for this system. FORGE does not
          determine file classification.
        </p>
        {project.repositories.length ? (
          project.repositories.map((r) => (
            <Artifact
              key={r.id}
              icon={<GitBranch />}
              title={r.name}
              meta={`${r.artifactType} · ${r.documentationLabel} · ${r.description}`}
            />
          ))
        ) : (
          <p className="body-copy">No repository links are attached.</p>
        )}
      </section>
      <section className="panel">
        <h2>Lessons learned</h2>
        {project.lessons.length ? (
          project.lessons.map((l) => (
            <div className="lesson" key={l.id}>
              <BookOpen />
              <div>
                <strong>{l.title}</strong>
                <p>
                  {l.finding} {l.recommendation}
                </p>
              </div>
            </div>
          ))
        ) : (
          <p className="body-copy">
            No Lessons Learned are currently linked to this Project.
          </p>
        )}
      </section>
    </div>
  );
}
function SolutionDetail({ project }: { project: PortalProject }) {
  if (project.vendor)
    return (
      <section className="panel span-2">
        <p className="eyebrow">VENDOR EVALUATION</p>
        <h2>
          {project.vendor.vendorName} · {project.vendor.productName}
        </h2>
        <div className="fact-grid">
          <span>
            <small>Procurement</small>
            <strong>{project.vendor.procurementStatus || '—'}</strong>
          </span>
          <span>
            <small>Evaluation</small>
            <strong>{project.vendor.evaluationStatus || '—'}</strong>
          </span>
          <span>
            <small>Estimated unit cost</small>
            <strong>{project.vendor.estimatedUnitCost || '—'}</strong>
          </span>
          <span>
            <small>Recommendation</small>
            <strong>{project.vendor.recommendation || '—'}</strong>
          </span>
        </div>
        <p className="body-copy">
          {project.vendor.evaluationObjective} {project.vendor.evaluationResult}
        </p>
      </section>
    );
  if (project.tactic)
    return (
      <section className="panel span-2">
        <p className="eyebrow">TACTIC / TECHNIQUE</p>
        <h2>{project.tactic.techniqueTitle}</h2>
        <p>{project.tactic.techniqueDescription}</p>
        <div className="fact-grid">
          <span>
            <small>Conditions</small>
            <strong>{project.tactic.conditionsForUse || '—'}</strong>
          </span>
          <span>
            <small>Demonstrated effect</small>
            <strong>{project.tactic.demonstratedEffect || '—'}</strong>
          </span>
          <span>
            <small>Limitations</small>
            <strong>{project.tactic.limitations || '—'}</strong>
          </span>
          <span>
            <small>Recommendation</small>
            <strong>{project.tactic.recommendation || '—'}</strong>
          </span>
        </div>
      </section>
    );
  if (project.training)
    return (
      <section className="panel span-2">
        <p className="eyebrow">TRAINING PACKAGE</p>
        <h2>{project.training.trainingObjective}</h2>
        <div className="fact-grid">
          <span>
            <small>Audience</small>
            <strong>{project.training.intendedAudience}</strong>
          </span>
          <span>
            <small>Method</small>
            <strong>{project.training.trainingMethod || '—'}</strong>
          </span>
          <span>
            <small>Validation</small>
            <strong>{project.training.validationMethod || '—'}</strong>
          </span>
          <span>
            <small>Frequency</small>
            <strong>{project.training.recurringFrequency || '—'}</strong>
          </span>
        </div>
      </section>
    );
  return (
    <section className="panel span-2">
      <p className="eyebrow">{project.solutionTypeLabel.toUpperCase()}</p>
      <h2>Solution context</h2>
      <p>{project.solutionApproach}</p>
    </section>
  );
}
function Timeline({
  title,
  meta,
  text,
}: {
  title: string;
  meta: string;
  text: string;
}) {
  return (
    <div className="timeline-item">
      <span />
      <div>
        <strong>{title}</strong>
        <small>{meta}</small>
        <p>{text}</p>
      </div>
    </div>
  );
}
function Artifact({
  icon,
  title,
  meta,
}: {
  icon: React.ReactNode;
  title: string;
  meta: string;
}) {
  return (
    <div className="artifact">
      <span>{icon}</span>
      <div>
        <strong>{title}</strong>
        <small>{meta}</small>
      </div>
      <ExternalLink />
    </div>
  );
}

function UnitView({ id, onMap }: { id?: string; onMap: () => void }) {
  const { units, projects } = useData();
  const unit = units.find((x) => x.id === id) ?? units[0];
  if (!unit)
    return (
      <div className="empty-state">
        <Users />
        <h1>No Units configured.</h1>
        <p>A System Administrator can create the first approved Unit.</p>
      </div>
    );
  const portfolio = projects.filter((p) => unit.projectIds.includes(p.id));
  return (
    <>
      <div className="crumb">
        Units <ChevronRight size={14} /> {unit.name}
      </div>
      <div className="problem-hero">
        <div className="unit-heading">
          <span>{unit.abbreviation.replace('Unit ', '')}</span>
          <div>
            <p className="eyebrow">{unit.type.toUpperCase()} UNIT</p>
            <h1>{unit.name}</h1>
            <p>
              {unit.location} · {unit.id}
            </p>
          </div>
        </div>
        <button className="secondary" onClick={onMap}>
          <MapPin /> View on map
        </button>
      </div>
      <div className="detail-grid">
        <section className="panel span-2">
          <PanelHead
            title="Current portfolio"
            note={`${portfolio.length} connected solution efforts`}
          />
          <div className="project-cards">
            {portfolio.length ? portfolio.map((p) => (
              <div className="project-card" key={p.id}>
                <span className="maturity">{p.solutionTypeLabel}</span>
                <strong>{p.name}</strong>
                <p>
                  {p.id} · {p.progress}% complete
                </p>
                <Progress value={p.progress} />
              </div>
            )) : <div className="empty-state"><Wrench /><h3>No Solution Efforts have been associated with this Unit yet.</h3><p>Authorized Unit members can add existing or new work as participation begins.</p></div>}
          </div>
        </section>
        <section className="panel">
          <h2>Capability strengths</h2>
          <div className="tag-cloud">
            {unit.capabilities.map((x) => (
              <span key={x}>{x}</span>
            ))}
          </div>
        </section>
        <section className="panel">
          <h2>Institutional knowledge</h2>
          <p className="body-copy">
            This unit participates across {portfolio.length} relational project
            records and {unit.capabilities.length} capability areas.
          </p>
        </section>
      </div>
    </>
  );
}

function ProjectsView({
  onProject,
  onCreate,
  canCreate,
}: {
  onProject: (id: string) => void;
  onCreate: () => void;
  canCreate: boolean;
}) {
  const { projects } = useData();
  const [query, setQuery] = useState('');
  const [maturity, setMaturity] = useState('All');
  const [capability, setCapability] = useState('All capabilities');
  const [location, setLocation] = useState('All locations');
  const [status, setStatus] = useState('All statuses');
  const [solutionType, setSolutionType] = useState('All solution types');
  const [vendor, setVendor] = useState('All vendors');
  const [procurement, setProcurement] = useState('All procurement statuses');
  const [recommendation, setRecommendation] = useState('All recommendations');
  const filtered = filterProjects(projects, {
    query,
    maturity,
    capability,
    location,
    status,
    solutionType,
    vendor,
    procurement,
    recommendation,
  });
  const capabilities = [...new Set(projects.flatMap((p) => p.tags))];
  const locations = [...new Set(projects.flatMap((p) => p.locations))];
  const vendors = [
    ...new Set(projects.map((p) => p.vendor?.vendorName).filter(Boolean)),
  ] as string[];
  const procurementStatuses = [
    ...new Set(
      projects.map((p) => p.vendor?.procurementStatus).filter(Boolean),
    ),
  ] as string[];
  const recommendations = [
    ...new Set(
      projects
        .flatMap((p) => [p.vendor?.recommendation, p.tactic?.recommendation])
        .filter(Boolean),
    ),
  ] as string[];
  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">KNOWLEDGE BASE</p>
          <h1>Solution Efforts</h1>
          <p>
            {projects.length} connected organic, vendor, TTP, training,
            integration, policy, and hybrid approaches
          </p>
        </div>
        <button
          className="create"
          onClick={onCreate}
          disabled={!canCreate}
          title={canCreate ? '' : 'Project User access or higher is required'}
        >
          <Plus size={16} /> Create solution effort
        </button>
      </div>
      <div className="filterbar">
        <Search />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter efforts, vendors, and types…"
        />
        <select
          value={solutionType}
          onChange={(e) => setSolutionType(e.target.value)}
        >
          <option>All solution types</option>
          {SOLUTION_TYPES.map(([value, label]) => (
            <option value={value} key={value}>
              {label}
            </option>
          ))}
        </select>
        <select value={vendor} onChange={(e) => setVendor(e.target.value)}>
          <option>All vendors</option>
          {vendors.map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
        <select
          value={procurement}
          onChange={(e) => setProcurement(e.target.value)}
        >
          <option>All procurement statuses</option>
          {procurementStatuses.map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
        <select
          value={recommendation}
          onChange={(e) => setRecommendation(e.target.value)}
        >
          <option>All recommendations</option>
          {recommendations.map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
        <select value={maturity} onChange={(e) => setMaturity(e.target.value)}>
          {['All', 'Concept', 'Prototype', 'Field Tested', 'Validated'].map(
            (x) => (
              <option key={x}>{x}</option>
            ),
          )}
        </select>
        <select
          value={capability}
          onChange={(e) => setCapability(e.target.value)}
        >
          <option>All capabilities</option>
          {capabilities.map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
        <select value={location} onChange={(e) => setLocation(e.target.value)}>
          <option>All locations</option>
          {locations.map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          {['All statuses', 'Planning', 'Active', 'Transitioning'].map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
      </div>
      {filtered.length ? (
        <div className="list-table">
          {filtered.map((p) => (
            <button key={p.id} onClick={() => onProject(p.id)}>
              <span>
                <small>{p.id}</small>
                <strong>{p.name}</strong>
              </span>
              <span>{p.unit}</span>
              <span className="maturity">{p.solutionTypeLabel}</span>
              <span>
                <Progress value={p.progress} />
                <b>{p.progress}%</b>
              </span>
              <ChevronRight />
            </button>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <Wrench />
          <h2>{projects.length ? 'No solution efforts match these filters.' : 'No Solution Efforts have been created yet.'}</h2>
          <p>{projects.length ? 'Clear one or more filters to broaden the result set.' : 'Participating Units can create and associate their actual work with the initial capability Problems.'}</p>
        </div>
      )}
    </>
  );
}
function ProblemsView({ onProblem }: { onProblem: (id: string) => void }) {
  const { problems } = useData();
  return (
    <>
      <ListHead
        title="Problems"
        note={`${problems.length} enduring capability gaps`}
      />
      <div className="list-table">
        {problems.map((p) => (
          <button key={p.id} onClick={() => onProblem(p.id)}>
            <span
              className={`priority ${p.priority === 'High' ? 'high' : 'med'}`}
            >
              {p.priority.toUpperCase()}
            </span>
            <span>
              <small>{p.id}</small>
              <strong>{p.title}</strong>
            </span>
            <span>
              {p.projectIds.length} efforts · {p.unitCount} units
            </span>
            <ChevronRight />
          </button>
        ))}
      </div>
    </>
  );
}
function AdministrationView() {
  const { directoryUsers, submissions, session, units, problems } = useData();
  const current = session.currentUser;
  const scopedUnits =
    current?.role === 'SYSTEM_ADMIN'
      ? units
      : units.filter((unit) =>
          current?.administeredUnitIds.includes(unit.dbId),
        );
  const patch = async (url: string, body: Record<string, unknown>) => {
    const response = await fetch(url, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    const result = (await response.json()) as { error?: string };
    if (!response.ok) window.alert(result.error || 'Unable to save.');
    else window.location.reload();
  };
  const createUser = async (event: React.SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    const body = Object.fromEntries(new FormData(event.currentTarget));
    const response = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    const result = (await response.json()) as { error?: string };
    if (!response.ok) window.alert(result.error || 'Unable to create user.');
    else window.location.reload();
  };
  return (
    <>
      <ListHead
        title="Administration"
        note="Scoped accounts, Unit assignments, and Problem-submission review"
      />
      <div className="notice">
        <Shield size={18} />
        <div>
          <strong>Authorization groundwork</strong>
          <p>
            This prototype stores identity profiles and enforces role and scope
            on server mutations. Passwords and production authentication are
            intentionally not implemented.
          </p>
        </div>
      </div>
      <div className="detail-grid two">
        <section className="panel">
          <h2>User directory</h2>
          {directoryUsers.length ? (
            <div className="stack-list">
              {directoryUsers.map((item) => (
                <div key={item.id}>
                  <strong>{item.displayName}</strong>
                  <small>
                    {item.trackingId} · {item.status} · {item.primaryUnit}
                  </small>
                  <label>
                    Role{' '}
                    <select
                      value={item.role}
                      disabled={item.id === current?.id}
                      onChange={(event) =>
                        void patch(`/api/admin/users/${item.id}`, {
                          role: event.target.value,
                        })
                      }
                    >
                      {(current?.role === 'SYSTEM_ADMIN'
                        ? [
                            'CONTRIBUTOR',
                            'PROJECT_USER',
                            'UNIT_ADMIN',
                            'SYSTEM_ADMIN',
                          ]
                        : ['CONTRIBUTOR', 'PROJECT_USER']
                      ).map((role) => (
                        <option key={role} value={role}>
                          {role.replaceAll('_', ' ')}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    className="secondary"
                    disabled={item.id === current?.id}
                    onClick={() =>
                      void patch(`/api/admin/users/${item.id}`, {
                        status:
                          item.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE',
                      })
                    }
                  >
                    {item.status === 'ACTIVE'
                      ? 'Disable account'
                      : 'Activate account'}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <Users />
              <h3>No users in your administrative scope.</h3>
            </div>
          )}
        </section>
        <section className="panel">
          <h2>Problem submissions</h2>
          {submissions.length ? (
            <div className="stack-list">
              {submissions.map((item) => (
                <div key={item.id}>
                  <strong>
                    {item.trackingId} — {item.title}
                  </strong>
                  <small>
                    {item.status.replaceAll('_', ' ')} · {item.submitter} ·{' '}
                    {item.unit} · Submitted {new Date(item.createdAt).toLocaleDateString()}
                  </small>
                  <p>{item.description}</p>
                  {item.relatedProblemId && (
                    <p className="form-success">Contributor identified {item.relatedProblemId} as covering this issue.</p>
                  )}
                  {item.matches.length > 0 && (
                    <div className="review-matches">
                      <strong>Canonical Problems to review</strong>
                      {item.matches.map((match) => (
                        <div key={match.id}>
                          <span className="maturity">{match.classification === 'POSSIBLE_DUPLICATE' ? 'Possible Duplicate' : 'Related Problem'}</span>
                          <b>{match.id} — {match.title}</b>
                          <small>{match.reasons.join(' · ')}</small>
                        </div>
                      ))}
                    </div>
                  )}
                  <form
                    className="quick-form"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void patch(
                        `/api/problem-submissions/${item.trackingId}`,
                        Object.fromEntries(new FormData(event.currentTarget)),
                      );
                    }}
                  >
                    <select name="status" defaultValue={item.status}>
                      <option value="UNDER_REVIEW">Under review</option>
                      <option value="ACCEPTED">Accept and link</option>
                      <option value="DUPLICATE_LINKED">
                        Duplicate / link existing
                      </option>
                      <option value="REJECTED">Reject</option>
                    </select>
                    <select
                      name="relatedProblemId"
                      defaultValue={
                        problems.find((problem) => problem.id === item.relatedProblemId)?.dbId ?? ''
                      }
                    >
                      <option value="">No canonical Problem link</option>
                      {problems.map((problem) => (
                        <option key={problem.id} value={problem.dbId}>
                          {problem.id} — {problem.title}
                        </option>
                      ))}
                    </select>
                    <input
                      name="reviewNote"
                      placeholder="Concise review note"
                    />
                    <button className="secondary" type="submit">
                      Save review
                    </button>
                  </form>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <Check />
              <h3>No submissions recorded in your scope.</h3>
            </div>
          )}
        </section>
      </div>
      <section className="panel">
        <h2>Unit administration</h2>
        {scopedUnits.length ? (
          <div className="stack-list">
            {scopedUnits.map((unit) => (
              <div key={unit.id}>
                <strong>{unit.name}</strong>
                <small>
                  {unit.id} · {unit.isActive ? 'ACTIVE' : 'INACTIVE'} · POC:{' '}
                  {unit.forgePointOfContact || 'Not assigned'}
                </small>
                <button
                  className="secondary"
                  onClick={() =>
                    void patch(`/api/admin/units/${unit.dbId}`, {
                      isActive: !unit.isActive,
                    })
                  }
                >
                  {unit.isActive ? 'Mark inactive' : 'Mark active'}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <Users />
            <h3>No Units in your administrative scope.</h3>
          </div>
        )}
      </section>
      {scopedUnits.length > 0 && (
        <section className="panel">
          <h2>Create account profile</h2>
          <p>
            Creates a Pending identity profile only. No password or
            authentication credential is created.
          </p>
          <form className="quick-form" onSubmit={createUser}>
            <label>
              Display name
              <input name="displayName" required />
            </label>
            <label>
              Future identity mapping
              <input
                name="identifier"
                required
                placeholder="email or directory identifier"
              />
            </label>
            <label>
              Primary Unit
              <select name="unitId">
                {scopedUnits.map((unit) => (
                  <option key={unit.id} value={unit.dbId}>
                    {unit.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Role
              <select name="role">
                {(current?.role === 'SYSTEM_ADMIN'
                  ? [
                      'CONTRIBUTOR',
                      'PROJECT_USER',
                      'UNIT_ADMIN',
                      'SYSTEM_ADMIN',
                    ]
                  : ['CONTRIBUTOR', 'PROJECT_USER']
                ).map((role) => (
                  <option key={role} value={role}>
                    {role.replaceAll('_', ' ')}
                  </option>
                ))}
              </select>
            </label>
            <button className="create" type="submit">
              Create Pending profile
            </button>
          </form>
        </section>
      )}
      <p className="muted">
        Current scope:{' '}
        {session.currentUser?.role.replaceAll('_', ' ') ?? 'none'}.
      </p>
    </>
  );
}

function ListHead({ title, note }: { title: string; note: string }) {
  return (
    <div className="page-head">
      <div>
        <p className="eyebrow">KNOWLEDGE BASE</p>
        <h1>{title}</h1>
        <p>{note}</p>
      </div>
    </div>
  );
}

function MapView({ onProject }: { onProject: () => void }) {
  const { units } = useData();
  const geolocatedUnits = units.filter((unit) => unit.hasLocation);
  if (!geolocatedUnits.length)
    return (
      <>
        <ListHead
          title="Capability map"
          note="Explore expertise and project activity geographically"
        />
        <div className="empty-state">
          <MapPin />
          <h2>No approved location data available.</h2>
          <p>
            The map will populate after an administrator adds Unit and location
            metadata.
          </p>
        </div>
      </>
    );
  return (
    <>
      <ListHead
        title="Capability map"
        note="Explore expertise and project activity geographically"
      />
      <div className="map-panel">
        <div className="map-controls">
          <strong>
            {new Set(geolocatedUnits.map((x) => x.location)).size} locations
          </strong>
          <input placeholder="Search locations…" />
          <label>
            <input type="checkbox" defaultChecked /> Active projects
          </label>
          <label>
            <input type="checkbox" defaultChecked /> Units
          </label>
          <label>
            <input type="checkbox" /> Help requests
          </label>
        </div>
        <div className="map-canvas">
          <div className="terrain t1" />
          <div className="terrain t2" />
          {geolocatedUnits.slice(0, 3).map((u, i) => (
            <button
              key={u.id}
              className={`map-pin p${i + 1}`}
              onClick={onProject}
            >
              <span>{u.projectIds.length}</span>
              <small>{u.location}</small>
            </button>
          ))}
          <div className="map-note">
            <MapPin />
            <div>
              <strong>{geolocatedUnits[0].name}</strong>
              <small>
                {geolocatedUnits[0].projectIds.length} projects ·{' '}
                {geolocatedUnits[0].capabilities.join(', ')}
              </small>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
function GraphView({ onProblem }: { onProblem: () => void }) {
  const { problems, projects, units } = useData();
  const problem = problems[0];
  const project =
    problem && projects.find((x) => problem.projectIds.includes(x.id));
  const unit = project && units.find((x) => x.id === project.unitId);
  if (!problem || !project || !unit)
    return (
      <>
        <ListHead
          title="Capability Graph"
          note="Trace relational knowledge connections"
        />
        <div className="empty-state">
          <Network />
          <h2>No connected capability graph yet.</h2>
          <p>
            Add a canonical Problem, linked solution effort, and participating
            Unit to establish the first graph.
          </p>
        </div>
      </>
    );
  return (
    <>
      <ListHead
        title="Capability Graph"
        note="Trace how problems connect to projects, units, technologies, and outcomes"
      />
      <div className="graph-panel">
        <button className="node problem" onClick={onProblem}>
          <AlertTriangle />
          {problem.title}
          <small>{problem.id}</small>
        </button>
        <span className="edge e1" />
        <button className="node project">
          <Wrench />
          {project.name}
          <small>{project.id}</small>
        </button>
        <span className="edge e2" />
        <button className="node unit">
          <Users />
          {unit.abbreviation}
          <small>{unit.name}</small>
        </button>
        <span className="edge e3" />
        <button className="node tech">
          <Network />
          {project.tags[0]}
          <small>Capability</small>
        </button>
        <span className="edge e4" />
        <button className="node lesson">
          <BookOpen />
          {project.lessons[0]?.title}
          <small>Lesson learned</small>
        </button>
        <span className="edge e5" />
        <button className="node outcome">
          <Check />
          {project.latestResult}
          <small>Outcome</small>
        </button>
      </div>
    </>
  );
}
function ExploreView({ onProject }: { onProject: () => void }) {
  const { projects } = useData();
  const focus = projects[0];
  if (!focus)
    return (
      <>
        <ListHead
          title="Related work"
          note="Connections calculated from persisted relationships"
        />
        <div className="empty-state">
          <Search />
          <h2>No related work yet.</h2>
          <p>
            Relationships appear after solution efforts are linked to Problems,
            Units, and capabilities.
          </p>
        </div>
      </>
    );
  const related = projects
    .slice(1)
    .map((p) => ({
      project: p,
      score:
        (p.problems.some((x) => focus.problems.some((y) => y.id === x.id))
          ? 50
          : 0) +
        (p.tags.some((x) => focus.tags.includes(x)) ? 25 : 0) +
        (p.units.some((x) => focus.units.some((y) => y.id === x.id)) ? 15 : 0),
    }))
    .filter((x) => x.score)
    .sort((a, b) => b.score - a.score);
  return (
    <>
      <ListHead
        title="Related work"
        note="Connections calculated from persisted relationships"
      />
      <div className="question-callout">
        <strong>Why these results?</strong>
        <p>
          Prioritized by shared Problems, then capabilities and participating
          Units.
        </p>
      </div>
      <div className="approach-grid">
        {related.map(({ project: p, score }) => (
          <article key={p.id}>
            <span className="maturity">{score}% related</span>
            <h3>{p.name}</h3>
            <p>
              {p.unit} · {p.tags.join(', ')}
            </p>
            <button onClick={onProject}>
              Review connection <ArrowRight />
            </button>
          </article>
        ))}
      </div>
    </>
  );
}
function ActivityView() {
  const { activities } = useData();
  return (
    <>
      <ListHead
        title="Recent activity"
        note={`${activities.length} events across the capability network`}
      />
      <section className="panel activity-feed">
        {activities.map((x) => (
          <div key={x.id}>
            <span>
              <Activity />
            </span>
            <div>
              <strong>{x.description}</strong>
              <small>
                {new Date(x.timestamp).toLocaleDateString()} · {x.actor}
              </small>
            </div>
          </div>
        ))}
      </section>
    </>
  );
}

function CreateModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (input: {
    title: string;
    description: string;
    duplicateReviewed: boolean;
    coveredProblemId?: number;
  }) => Promise<{
    ok: boolean;
    error?: string;
    matches?: ProblemMatchResult[];
  }>;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [matches, setMatches] = useState<ProblemMatchResult[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [duplicateReviewed, setDuplicateReviewed] = useState(false);
  const [coveredProblemId, setCoveredProblemId] = useState<number>();
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (`${title} ${description}`.trim().length < 3) {
      setTimeout(() => setMatches([]), 0);
      return;
    }
    setTimeout(() => {
      setLoadingMatches(true);
      setDuplicateReviewed(false);
      setCoveredProblemId(undefined);
    }, 0);
    const controller = new AbortController();
    const timer = setTimeout(
      () =>
        fetch(`/api/problems?q=${encodeURIComponent(title)}&description=${encodeURIComponent(description)}`, {
          signal: controller.signal,
        })
          .then(
            (r) =>
              r.json() as Promise<
                ProblemMatchResult[]
              >,
          )
          .then(setMatches)
          .catch(() => setMatches([]))
          .finally(() => setLoadingMatches(false)),
      250,
    );
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [title, description]);
  return (
    <div className="modal-backdrop" role="presentation">
      <form
        className="modal"
        onSubmit={async (e) => {
          e.preventDefault();
          setSaving(true);
          setError('');
          try {
            const result = await onSave({
              title,
              description,
              duplicateReviewed,
              coveredProblemId,
            });
            if (!result.ok) {
              if (result.matches?.length) setMatches(result.matches);
              setError(result.error || 'Unable to submit potential Problem.');
              setSaving(false);
            }
          } catch (value) {
            setError(
              value instanceof Error
                ? value.message
                : 'Unable to submit potential Problem.',
            );
            setSaving(false);
          }
        }}
      >
        <button className="modal-x" type="button" onClick={onClose}>
          <X />
        </button>
        <p className="eyebrow">GOVERNED SUBMISSION</p>
        <h2>Submit potential capability Problem</h2>
        <p>Surface a possible enduring gap for authorized review before it enters the canonical portfolio.</p>
        <div className="question-callout">
          <strong>Check existing Problems first</strong>
          <p>FORGE works best when similar capability gaps are connected to a common Problem. Describe the issue below and review potentially related Problems before submitting a new one.</p>
        </div>
        <div className="security-callout">
          <strong>UNCLASSIFIED INFORMATION ONLY.</strong>
          <p>
            Enter an approved capability abstraction—not the sensitive
            operation, mission, source, or scenario that generated the
            requirement.
          </p>
        </div>
        <label>
          Problem title
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Short RF Range"
          />
        </label>
        <label>
          Description
          <textarea
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What is happening, who is affected, and why does it matter?"
          />
        </label>
        {matches.length > 0 && (
          <div className="possible">
            <strong>Existing Problems to review</strong>
            {matches.map((match) => (
              <article className={`match-card ${match.classification === 'POSSIBLE_DUPLICATE' ? 'duplicate' : ''}`} key={match.id}>
                <span className="maturity">{match.classification === 'POSSIBLE_DUPLICATE' ? 'Possible Duplicate' : 'Related Problem'}</span>
                <h3>{match.id} — {match.title}</h3>
                <p>{match.description}</p>
                <small>{match.status ?? 'Open'} · {match.category}</small>
                <strong>Why this appeared</strong>
                <ul>{match.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>
                <div className="match-actions">
                  <a className="secondary" href={`/problems/${match.id}`} target="_blank" rel="noreferrer">View Problem <ExternalLink size={14} /></a>
                  <button type="button" className="secondary" onClick={() => {
                    setCoveredProblemId(match.dbId);
                    setDuplicateReviewed(true);
                    setError('');
                  }}>This Existing Problem Covers My Issue</button>
                </div>
              </article>
            ))}
            {matches.some((match) => match.classification === 'POSSIBLE_DUPLICATE') && !duplicateReviewed && (
              <button type="button" className="secondary" onClick={() => {
                setDuplicateReviewed(true);
                setCoveredProblemId(undefined);
                setError('');
              }}>My Problem Is Different — Continue Submission</button>
            )}
          </div>
        )}
        {!loadingMatches && `${title} ${description}`.trim().length >= 3 && matches.length === 0 && (
          <div className="notice"><Search size={18} /><div><strong>No strong matches found</strong><p>FORGE did not identify a strong existing match. This does not guarantee that related work does not exist. You may continue your submission.</p></div></div>
        )}
        {coveredProblemId && <p className="form-success">This observation will be linked to the selected canonical Problem for reviewer awareness; no new canonical Problem will be created.</p>}
        {error && <p className="form-error">{error}</p>}
        <div className="modal-actions">
          <button type="button" className="secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="create" disabled={saving || loadingMatches || (matches.some((match) => match.classification === 'POSSIBLE_DUPLICATE') && !duplicateReviewed)}>
            {saving ? 'Submitting…' : coveredProblemId ? 'Record connection for review' : 'Submit for review'}
          </button>
        </div>
      </form>
    </div>
  );
}
