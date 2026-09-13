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
import Link from 'next/link';
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
const reloadWithSuccess = (message = 'Changes saved.') => {
  window.sessionStorage.setItem('forge-success', message);
  window.location.reload();
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
  const [feedback, setFeedback] = useState('');
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
    const message = window.sessionStorage.getItem('forge-success');
    if (message) {
      window.sessionStorage.removeItem('forge-success');
      setTimeout(() => setFeedback(message), 0);
    }
  }, []);

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
    setFeedback(
      'Potential Problem submitted for governance review. It is not yet a new canonical Problem.',
    );
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
                  {!matches.length && (
                    <p className="search-empty">No direct matches. Try another capability term; related knowledge may still exist.</p>
                  )}
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
            {feedback && <output className="form-success">{feedback}</output>}
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
  if (active === 'Compare')
    return (
      <CompareView
        problemId={selectedId}
        onProject={(id) => open('projects', id)}
      />
    );
  if (active === 'Project')
    return (
      <ProjectView
        id={selectedId}
        onUnit={() => setActive('Unit')}
        onRelated={() => setActive('Explore')}
      />
    );
  if (active === 'Unit' || active === 'Units')
    return <UnitView id={selectedId} onMap={() => setActive('Map')} onProject={(id) => open('projects', id)} />;
  if (active === 'Map')
    return <MapView onUnit={(id) => open('units', id)} />;
  if (active === 'Capability Graph')
    return <GraphView onProblem={(id) => open('problems', id)} onProject={(id) => open('projects', id)} onUnit={(id) => open('units', id)} />;
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
    return (
      <ExploreView
        projectId={selectedId}
        onProject={(id) => open('projects', id)}
      />
    );
  if (active === 'Activity') return <ActivityView />;
  if (active === 'Administration') return <AdministrationView />;
  return <Dashboard setActive={setActive} open={open} />;
}

function Dashboard({ setActive, open }: { setActive: (view: string) => void; open: (type: 'problems' | 'projects' | 'units', id: string) => void }) {
  const { problems, projects, units, activities, helpRequests, session } =
    useData();
  const mine = projects.filter((project) =>
    project.team.some((member) => member.userId === session.currentUser?.id),
  );
  const relevantProblemIds = new Set(
    mine.flatMap((project) => project.problems.map((problem) => problem.id)),
  );
  const relevantLessons = projects
    .flatMap((project) =>
      project.lessons.map((lesson) => ({ ...lesson, project })),
    )
    .filter((lesson) =>
      lesson.project.problems.some((problem) =>
        relevantProblemIds.has(problem.id),
      ),
    )
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 4);
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
        <button className="secondary" onClick={() => setActive('Activity')}>
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
            <strong>
              {problems.length} initial capability Problems are ready for
              collaboration.
            </strong>
            <p>
              Participating Units can now associate existing work and create
              Solution Efforts. Detailed Problem statements and prioritization
              remain pending stakeholder refinement.
            </p>
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
            title="My Projects"
            note="Solution Efforts where you are Project Lead or Contributor"
          />
          <div className="project-cards">
            {mine.length ? (
              mine.map((project) => (
                <button className="project-card" key={project.id} onClick={() => open('projects', project.id)}>
                  <span className="maturity">
                    {project.team.find(
                      (member) => member.userId === session.currentUser?.id,
                    )?.role === 'PROJECT_LEAD'
                      ? 'Project Lead'
                      : 'Contributor'}
                  </span>
                  <strong>{project.name}</strong>
                  <p>
                    {project.id} · {project.status} · {project.maturity}
                  </p>
                  {project.openHelpRequestCount > 0 && (
                    <small>
                      {project.openHelpRequestCount} open support request
                      {project.openHelpRequestCount === 1 ? '' : 's'}
                    </small>
                  )}
                </button>
              ))
            ) : (
              <p className="body-copy">
                No Projects are assigned to your current account.
              </p>
            )}
          </div>
        </section>
        <section className="panel span-2">
          <PanelHead
            title="Current capability activity"
            note="Most active problem spaces across the network"
            action="View all problems"
            onAction={() => setActive('Problems')}
          />
          <div className="problem-list">
            {problems.slice(0, 3).map((p, i) => (
              <ProblemRow
                key={p.id}
                priority={p.priority.toUpperCase().slice(0, 4)}
                title={`${p.id} · ${p.title}`}
                meta={`${p.projectIds.length} projects · ${p.unitCount} units · ${p.category}`}
                updated={
                  activities.length
                    ? i
                      ? 'Recently updated'
                      : 'Latest update'
                    : 'Awaiting stakeholder refinement'
                }
                onClick={() => open('problems', p.id)}
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
              onClick={() => open('projects', h.projectId)}
            />
          ))}
        </section>
        <section className="panel">
          <PanelHead
            title="Lessons relevant to my Problems"
            note="Recent findings; no consensus is inferred"
          />
          {relevantLessons.length ? (
            relevantLessons.map((lesson) => (
              <button className="lesson" key={`${lesson.project.id}-${lesson.id}`} onClick={() => open('projects', lesson.project.id)}>
                <BookOpen />
                <div>
                  <span className="lesson-type">{lesson.lessonTypeLabel}</span>
                  <strong>{lesson.title}</strong>
                  <small>
                    {lesson.project.id} · {lesson.project.name}
                  </small>
                </div>
              </button>
            ))
          ) : (
            <p className="body-copy">No relevant Lessons are recorded yet.</p>
          )}
        </section>
        <section className="panel span-2">
          <PanelHead
            title="Recently updated projects"
            note="Progress worth reviewing"
            action="View all projects"
            onAction={() => setActive('Projects')}
          />
          <div className="project-cards">
            {[...projects]
              .sort((a, b) =>
                b.lastMeaningfulActivityAt.localeCompare(
                  a.lastMeaningfulActivityAt,
                ),
              )
              .slice(0, 3)
              .map((p) => (
                <button className="project-card" key={p.id} onClick={() => open('projects', p.id)}>
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
                </button>
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
              <strong>
                {
                  activities.filter((item) => item.eventType === 'LESSON_ADDED')
                    .length
                }
              </strong>
              <span>Lessons</span>
            </div>
            <div>
              <strong>
                {
                  activities.filter((item) => item.eventType === 'TEST_RESULT')
                    .length
                }
              </strong>
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
  onAction,
}: {
  title: string;
  note: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="panel-head">
      <div>
        <h2>{title}</h2>
        <p>{note}</p>
      </div>
      {action && (
        <button onClick={onAction}>
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
  onClick,
}: {
  priority: string;
  title: string;
  meta: string;
  updated: string;
  onClick?: () => void;
}) {
  return (
    <button className="problem-row" onClick={onClick}>
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
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
  meta: string;
  onClick?: () => void;
}) {
  return (
    <button className="help-card" onClick={onClick}>
      <span>{icon}</span>
      <div>
        <strong>{title}</strong>
        <p>{text}</p>
        <small>{meta}</small>
      </div>
    </button>
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
  const terminalStatuses = new Set(['Completed', 'Cancelled', 'Superseded']);
  const activeEfforts = all.filter(
    (project) => !terminalStatuses.has(project.status),
  );
  const historicalEfforts = all.filter((project) =>
    terminalStatuses.has(project.status),
  );
  const lessonsAcrossEfforts = all.flatMap((project) =>
    project.lessons.map((lesson) => ({ ...lesson, project })),
  );
  const effortCards = (projects: typeof all) =>
    projects.length ? (
      <div className="approach-grid">
        {projects.map((p) => (
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
            {p.outcomeLabel && (
              <p className="outcome-chip">Outcome: {p.outcomeLabel}</p>
            )}
            {p.finalResult && <p>{p.finalResult}</p>}
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
      </div>
    ) : (
      <p className="body-copy">No efforts in this lifecycle group.</p>
    );
  return (
    <>
      <div className="crumb">
        <Link href="/">Home</Link> <ChevronRight size={14} /> <Link href="/?view=Problems">Problems</Link> <ChevronRight size={14} /> {problem.id}
      </div>
      <div className="problem-hero">
        <div>
          <span
            className={`priority ${problem.priority === 'High' ? 'high' : 'med'}`}
          >
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
      {problem.status === 'Superseded' && problem.supersededById && (
        <div className="notice">
          <GitBranch size={18} />
          <div>
            <strong>Historical canonical Problem</strong>
            <p>
              This durable PRB record remains searchable and preserves its
              history. Current canonical reference:{' '}
              <a href={`/problems/${problem.supersededById}`}>
                {problem.supersededById} — {problem.supersededByTitle}
              </a>
              .
            </p>
          </div>
        </div>
      )}
      <div className="detail-grid two">
        <section className="panel">
          <h2>Governance</h2>
          <p>
            <strong>Status:</strong> {problem.status}
          </p>
          {problem.status === 'Addressed — Viable Efforts Exist' && (
            <p className="muted">
              Viable efforts exist; this does not mean the capability gap is
              solved globally.
            </p>
          )}
          <p>
            <strong>Priority:</strong> {problem.priority} — capability-gap
            governance, not Project performance.
          </p>
          <p>
            <strong>Steward:</strong>{' '}
            {problem.steward || 'Not assigned — needs refinement'}
            {problem.stewardStatus ? ` (${problem.stewardStatus})` : ''}
          </p>
          {problem.impact && (
            <p>
              <strong>Operational impact:</strong> {problem.impact}
            </p>
          )}
        </section>
        <section className="panel">
          <h2>Problem family</h2>
          {problem.relationships.length ? (
            problem.relationships.map((item) => (
              <p key={`${item.direction}-${item.type}-${item.problemId}`}>
                <span className="maturity">
                  {item.type.replaceAll('_', ' ')}
                </span>{' '}
                <a href={`/problems/${item.problemId}`}>
                  {item.problemId} — {item.title}
                </a>
              </p>
            ))
          ) : (
            <p>No related or variant Problems recorded.</p>
          )}
        </section>
      </div>
      <section className="panel">
        <h2>Problem governance history</h2>
        <p>Canonical decisions only; routine Project Activity is excluded.</p>
        {problem.governanceHistory.length ? (
          <div className="stack-list">
            {problem.governanceHistory.map((event) => (
              <div key={event.id}>
                <strong>{event.eventType.replaceAll('_', ' ')}</strong>
                <p>{event.description}</p>
                <small>
                  {event.actor} · {new Date(event.timestamp).toLocaleString()}
                </small>
              </div>
            ))}
          </div>
        ) : (
          <p>
            No governance changes have been recorded since history tracking was
            introduced.
          </p>
        )}
      </section>
      <div className="notice">
        <BookOpen size={18} />
        <div>
          <strong>
            Detailed Problem Statement: Pending Stakeholder Refinement
          </strong>
          <p>{problem.problemStatement}</p>
        </div>
      </div>
      <h2 className="section-title">
        Active Solution Efforts <span>{activeEfforts.length}</span>
      </h2>
      {all.length ? (
        effortCards(activeEfforts)
      ) : (
        <div className="empty-state">
          <Wrench />
          <h2>No Solution Efforts have been linked to this Problem yet.</h2>
          <p>
            Participating Units can associate existing work or create an
            authorized Solution Effort from the Projects area.
          </p>
        </div>
      )}
      {historicalEfforts.length > 0 && (
        <>
          <h2 className="section-title">
            Historical / Closed Solution Efforts{' '}
            <span>{historicalEfforts.length}</span>
          </h2>
          {effortCards(historicalEfforts)}
        </>
      )}
      <section className="panel problem-lessons">
        <PanelHead
          title="Lessons Across Solution Efforts"
          note="Persisted findings are referenced from their originating Projects; no consensus is inferred."
        />
        {lessonsAcrossEfforts.length ? (
          lessonsAcrossEfforts.map((lesson) => (
            <button
              key={`${lesson.project.id}-${lesson.id}`}
              className="cross-project-lesson"
              onClick={() => onProject(lesson.project.id)}
            >
              <span className="lesson-type">{lesson.lessonTypeLabel}</span>
              <strong>{lesson.title}</strong>
              <p>{lesson.finding}</p>
              <small>
                {lesson.project.id} · {lesson.project.name} ·{' '}
                {lesson.project.unit}
                {lesson.phaseName ? ` · ${lesson.phaseName}` : ''}
                {lesson.project.outcomeLabel
                  ? ` · ${lesson.project.outcomeLabel}`
                  : ''}
              </small>
            </button>
          ))
        ) : (
          <p className="body-copy">
            No Lessons have been recorded across linked Solution Efforts.
          </p>
        )}
      </section>
    </>
  );
}

function CompareView({
  problemId,
  onProject,
}: {
  problemId?: string;
  onProject: (id: string) => void;
}) {
  const data = useData();
  const problem = data.problems.find((x) => x.id === problemId);
  const allProjects = data.projects.filter((x) =>
    problem?.projectIds.includes(x.id),
  );
  const [selected, setSelected] = useState(
    allProjects.map((project) => project.id),
  );
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
  const projects = allProjects.filter((project) =>
    selected.includes(project.id),
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
        <div className="comparison-picker">
          <strong>Efforts to compare</strong>
          {allProjects.map((project) => (
            <label key={project.id}>
              <input
                type="checkbox"
                checked={selected.includes(project.id)}
                onChange={() =>
                  setSelected((current) =>
                    current.includes(project.id)
                      ? current.filter((id) => id !== project.id)
                      : [...current, project.id],
                  )
                }
              />{' '}
              {project.id} · {project.name}
            </label>
          ))}
        </div>
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
              <th>Status / outcome</th>
              {projects.map((p) => (
                <td key={p.id}>
                  <b>{p.status}</b>
                  {p.outcomeLabel ? ` · ${p.outcomeLabel}` : ''}
                </td>
              ))}
            </tr>
            <tr>
              <th>Project Lead / contact</th>
              {projects.map((p) => {
                const lead = p.team.find(
                  (member) => member.role === 'PROJECT_LEAD',
                );
                return (
                  <td key={p.id}>
                    {lead
                      ? `${lead.displayName} · ${lead.identifier}`
                      : 'Not assigned'}
                  </td>
                );
              })}
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
                <td key={p.id}>
                  {new Date(p.lastMeaningfulActivityAt).toLocaleDateString()}
                </td>
              ))}
            </tr>
            <tr>
              <th>Current / final Phase</th>
              {projects.map((p) => (
                <td key={p.id}>
                  {p.phases.find((phase) => phase.status !== 'Complete')
                    ?.name ??
                    p.phases.at(-1)?.name ??
                    'Not phased'}
                </td>
              ))}
            </tr>
            <tr>
              <th>Documentation</th>
              {projects.map((p) => (
                <td key={p.id}>{p.documentationLabel}</td>
              ))}
            </tr>
            <tr>
              <th>Important Lessons</th>
              {projects.map((p) => (
                <td key={p.id}>
                  {p.lessons
                    .slice(0, 2)
                    .map(
                      (lesson) => `${lesson.lessonTypeLabel}: ${lesson.title}`,
                    )
                    .join('; ') || '—'}
                </td>
              ))}
            </tr>
            <tr>
              <th>Open Help Requests</th>
              {projects.map((p) => (
                <td key={p.id}>
                  {p.helpRequests
                    .filter((request) =>
                      ['OPEN', 'IN_PROGRESS'].includes(request.status),
                    )
                    .map(
                      (request) => `${request.categoryLabel}: ${request.title}`,
                    )
                    .join('; ') || 'None'}
                </td>
              ))}
            </tr>
            <tr>
              <th>Open effort</th>
              {projects.map((p) => (
                <td key={p.id}>
                  <button onClick={() => onProject(p.id)}>Open {p.id}</button>
                </td>
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
    current &&
    current.status === 'ACTIVE' &&
    (current.role === 'SYSTEM_ADMIN' ||
      project.team.some(
        (member) =>
          member.userId === current.id && member.role === 'PROJECT_LEAD',
      ) ||
      (current.role === 'UNIT_ADMIN' &&
        current.administeredUnitIds.includes(lead.dbId))),
  );
  return (
    <>
      <div className="crumb">
        <Link href="/">Home</Link> <ChevronRight size={14} /> <Link href="/?view=Projects">Projects</Link> <ChevronRight size={14} /> {project.id}
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
      {canEdit && (
        <ProjectActions
          project={project}
          data={data}
          canManageTeam={canManageTeam}
        />
      )}
      {experience === 'executive' ? (
        <ExecutiveSplash
          project={project}
          lead={lead}
          onUnit={onUnit}
          onRelated={onRelated}
        />
      ) : experience === 'technical' ? (
        <TechnicalView project={project} canEdit={canEdit} />
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
  const projectLead = project.team.find(
    (member) => member.role === 'PROJECT_LEAD',
  );
  const copyOriginator = () =>
    navigator.clipboard.writeText(
      [project.originatorContact, project.accessInstructions]
        .filter(Boolean)
        .join('\n'),
    );
  const copyProjectLead = () =>
    projectLead &&
    navigator.clipboard.writeText(
      [projectLead.displayName, projectLead.identifier, projectLead.primaryUnit]
        .filter(Boolean)
        .join('\n'),
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
            <strong>
              {new Date(project.lastMeaningfulActivityAt).toLocaleDateString()}
            </strong>
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
            {project.finalResult ||
              project.latestResult ||
              project.outcome ||
              'Evidence collection is still underway.'}
          </h3>
          <ul>
            {project.lessons.slice(0, 3).map((l) => (
              <li key={l.id}>{l.finding}</li>
            ))}
          </ul>
          {['Field Tested', 'Validated'].includes(project.maturity) && (
            <p>
              {project.updates.some(
                (update) =>
                  update.maturityAfter === project.maturity &&
                  update.maturityEvidenceEvent,
              )
                ? `${project.maturity} — supporting evidence recorded.`
                : `${project.maturity} — supporting evidence not yet linked.`}
            </p>
          )}
        </section>
        {project.outcomeLabel && (
          <section className="exec-card outcome-card">
            <p className="eyebrow">FINAL DISPOSITION</p>
            <h3>
              {project.status} · {project.outcomeLabel}
            </h3>
            <p>{project.finalResult || project.outcome}</p>
            {project.successorProjectId && (
              <p>
                Successor: {project.successorProjectId} ·{' '}
                {project.successorProjectName}
              </p>
            )}
          </section>
        )}
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
          {project.helpRequests.find((request) =>
            ['OPEN', 'IN_PROGRESS'].includes(request.status),
          ) && (
            <p>
              <strong>Open support request:</strong>{' '}
              {
                project.helpRequests.find((request) =>
                  ['OPEN', 'IN_PROGRESS'].includes(request.status),
                )?.categoryLabel
              }
            </p>
          )}
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
            <strong>
              Project Lead: {projectLead?.displayName ?? 'Not assigned'}
            </strong>
            <small>
              {projectLead
                ? `${projectLead.title || projectLead.primaryUnit} · ${projectLead.identifier}${projectLead.status !== 'ACTIVE' ? ' · Inactive account' : ''}`
                : 'An authorized administrator should assign current responsibility.'}
            </small>
          </div>
          {projectLead && (
            <button className="secondary" onClick={copyProjectLead}>
              Copy Project Lead contact
            </button>
          )}
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

function TechnicalView({
  project,
  canEdit,
}: {
  project: PortalProject;
  canEdit: boolean;
}) {
  const saveCorrection = async (
    event: React.SyntheticEvent<HTMLFormElement>,
    url: string,
  ) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const body: Record<string, unknown> = Object.fromEntries(data);
    body.tags = data.getAll('tags');
    const response = await fetch(url, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    const result = (await response.json()) as { error?: string };
    if (!response.ok)
      window.alert(result.error || 'Unable to save correction.');
    else reloadWithSuccess();
  };
  const projectLead = project.team.find(
    (member) => member.role === 'PROJECT_LEAD',
  );
  const contributors = project.team.filter(
    (member) => member.role === 'CONTRIBUTOR',
  );
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
      <section className="panel span-2 knowledge-summary">
        <PanelHead
          title="Project knowledge state"
          note="Status, maturity, completion, Phase, and outcome answer different questions."
        />
        <div className="fact-grid">
          <span>
            <small>Status · current lifecycle</small>
            <strong>{project.status}</strong>
          </span>
          <span>
            <small>Maturity · demonstrated development</small>
            <strong>{project.maturity}</strong>
          </span>
          <span>
            <small>Completion · planned work</small>
            <strong>{project.progress}%</strong>
          </span>
          <span>
            <small>Outcome · final disposition</small>
            <strong>{project.outcomeLabel || 'Not set'}</strong>
          </span>
        </div>
        {project.finalResult && (
          <p>
            <b>Final result:</b> {project.finalResult}
          </p>
        )}
        {project.whatWorked && (
          <p>
            <b>What worked:</b> {project.whatWorked}
          </p>
        )}
        {project.whatDidNotWork && (
          <p>
            <b>What did not work:</b> {project.whatDidNotWork}
          </p>
        )}
        {project.recommendedNextAction && (
          <p>
            <b>Recommended next action:</b> {project.recommendedNextAction}
          </p>
        )}
        {project.successorProjectId && (
          <p>
            <b>Successor:</b> {project.successorProjectId} ·{' '}
            {project.successorProjectName}
          </p>
        )}
      </section>
      <section className="panel span-2 project-team-panel">
        <PanelHead
          title="Project team and relationships"
          note="Current responsibility and authorized maintainers"
        />
        <div className="team-responsibility-grid">
          <div>
            <small>Lead Unit</small>
            <strong>{project.unit}</strong>
          </div>
          <div>
            <small>Project Lead</small>
            <strong>{projectLead?.displayName ?? 'Not assigned'}</strong>
            <span>
              {projectLead?.identifier || ''}
              {projectLead?.status !== 'ACTIVE' ? ' · Inactive account' : ''}
            </span>
          </div>
          <div>
            <small>Created by</small>
            <strong>{project.createdByName}</strong>
          </div>
        </div>
        <div className="team-columns">
          <div>
            <h3>Project Contributors</h3>
            {contributors.length ? (
              contributors.map((member) => (
                <p key={member.userId}>
                  <strong>{member.displayName}</strong>
                  <span>
                    {member.primaryUnit}
                    {member.status !== 'ACTIVE' ? ' · Inactive account' : ''}
                  </span>
                </p>
              ))
            ) : (
              <p>No additional Contributors assigned.</p>
            )}
          </div>
          <div>
            <h3>Participating Units</h3>
            {project.units.map((unit) => (
              <p key={unit.id}>
                <strong>{unit.name}</strong>
                <span>{unit.role}</span>
              </p>
            ))}
          </div>
          <div>
            <h3>Problems addressed</h3>
            {project.problems.map((problem) => (
              <p key={problem.id}>
                <strong>{problem.id}</strong>
                <span>
                  {problem.title}
                  {problem.isPrimary ? ' · Primary' : ''}
                </span>
              </p>
            ))}
          </div>
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
                  <small>
                    {new Date(update.occurredAt).toLocaleDateString()} ·{' '}
                    {update.authorName}
                    {update.phaseName ? ` · ${update.phaseName}` : ''}
                  </small>
                </header>
                <p>
                  <b>Result / finding:</b> {update.result}
                </p>
                <p>
                  <b>Next step:</b> {update.nextStep}
                </p>
                {update.blockerRisk && (
                  <p className="update-risk">
                    <b>Blocker / risk:</b> {update.blockerRisk}
                  </p>
                )}
                {(update.statusAfter ||
                  update.maturityAfter ||
                  update.completionAfter !== null) && (
                  <footer>
                    {update.statusAfter && (
                      <span>Status: {update.statusAfter}</span>
                    )}
                    {update.maturityAfter && (
                      <span>Maturity: {update.maturityAfter}</span>
                    )}
                    {update.completionAfter !== null && (
                      <span>Completion: {update.completionAfter}%</span>
                    )}
                  </footer>
                )}
                {update.maturityEvidenceEvent && (
                  <aside className="evidence-note">
                    <b>Evidence supporting {update.maturityAfter}:</b>{' '}
                    {update.maturityEvidenceEvent} ·{' '}
                    {new Date(update.maturityEvidenceDate).toLocaleDateString()}
                    {update.maturityEvidenceReference
                      ? ` · ${update.maturityEvidenceReference}`
                      : ''}
                  </aside>
                )}
              </article>
            ))}
          </div>
        ) : (
          <p className="body-copy">
            No Project Updates have been recorded yet.
          </p>
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
              text={`${p.objective} ${p.summary} ${p.result}${p.accomplishment ? ` Accomplishment: ${p.accomplishment}` : ''}${p.blocker ? ` Blocker: ${p.blocker}` : ''}${p.risk ? ` Risk: ${p.risk}` : ''}${p.nextAction ? ` Next: ${p.nextAction}` : ''}`}
            />
          ))}
        </div>
      </section>
      <HelpRequests project={project} />
      <section className="panel">
        <h2>Technical artifacts</h2>
        <p className="upload-warning">
          <strong>Reference metadata only.</strong> Do not upload classified
          material or information not authorized for this system. FORGE does not
          determine file classification.
        </p>
        {project.repositories.length ? (
          project.repositories.map((r) => (
            <div key={r.id}>
              <Artifact
                icon={<GitBranch />}
                title={r.name}
                meta={`${r.artifactType} · ${r.documentationLabel} · ${r.description}`}
                href={
                  ['AVAILABLE_IN_FORGE', 'EXTERNAL_REFERENCE'].includes(
                    r.documentationAvailability,
                  )
                    ? r.url
                    : undefined
                }
                access={r.phaseName ? `Phase: ${r.phaseName}` : undefined}
              />
              {canEdit && (
                <details>
                  <summary>Correct artifact metadata</summary>
                  <form
                    className="quick-form"
                    onSubmit={(event) =>
                      void saveCorrection(
                        event,
                        `/api/projects/${project.id}/repositories/${r.id}`,
                      )
                    }
                  >
                    <input name="name" defaultValue={r.name} required />
                    <input name="url" defaultValue={r.url} required />
                    <input name="artifactType" defaultValue={r.artifactType} />
                    <textarea
                      name="description"
                      defaultValue={r.description}
                      required
                    />
                    <select
                      name="documentationAvailability"
                      defaultValue={r.documentationAvailability}
                    >
                      {[
                        'AVAILABLE_IN_FORGE',
                        'EXTERNAL_REFERENCE',
                        'AVAILABLE_FROM_ORIGINATOR',
                        'CONTROLLED_ACCESS',
                        'METADATA_ONLY',
                        'NOT_YET_DOCUMENTED',
                      ].map((value) => (
                        <option key={value}>{value}</option>
                      ))}
                    </select>
                    <input
                      name="accessInstructions"
                      defaultValue={r.accessInstructions}
                      placeholder="Safe access/contact instructions"
                    />
                    <select
                      name="phaseId"
                      defaultValue={
                        project.phases.find(
                          (phase) => phase.name === r.phaseName,
                        )?.id ?? ''
                      }
                    >
                      <option value="">No Phase</option>
                      {project.phases.map((phase) => (
                        <option key={phase.id} value={phase.id}>
                          {phase.name}
                        </option>
                      ))}
                    </select>
                    <button type="submit" className="secondary">
                      Save artifact correction
                    </button>
                  </form>
                </details>
              )}
            </div>
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
                <span className="lesson-type">{l.lessonTypeLabel}</span>
                <strong>{l.title}</strong>
                <p>
                  {l.finding} {l.recommendation}
                </p>
                <small>
                  {new Date(l.date).toLocaleDateString()} · {l.authorName}
                  {l.phaseName ? ` · ${l.phaseName}` : ''}
                  {l.sourceUpdateId
                    ? ` · From Update #${l.sourceUpdateId}`
                    : ''}
                </small>
              </div>
              {canEdit && (
                <details>
                  <summary>Correct Lesson</summary>
                  <form
                    className="quick-form"
                    onSubmit={(event) =>
                      void saveCorrection(
                        event,
                        `/api/projects/${project.id}/lessons/${l.dbId}`,
                      )
                    }
                  >
                    <select name="lessonType" defaultValue={l.lessonType}>
                      {[
                        'CONFIRMED_FINDING',
                        'WORKING_HYPOTHESIS',
                        'FAILED_APPROACH',
                        'RECOMMENDATION',
                        'UNRESOLVED_QUESTION',
                      ].map((value) => (
                        <option key={value}>{value}</option>
                      ))}
                    </select>
                    <input name="title" defaultValue={l.title} required />
                    <textarea
                      name="finding"
                      defaultValue={l.finding}
                      required
                    />
                    <textarea
                      name="recommendation"
                      defaultValue={l.recommendation}
                    />
                    <select
                      name="phaseId"
                      defaultValue={
                        project.phases.find(
                          (phase) => phase.name === l.phaseName,
                        )?.id ?? ''
                      }
                    >
                      <option value="">No Phase</option>
                      {project.phases.map((phase) => (
                        <option key={phase.id} value={phase.id}>
                          {phase.name}
                        </option>
                      ))}
                    </select>
                    <select
                      name="knowledgeStatus"
                      defaultValue={l.knowledgeStatus}
                    >
                      {['ACTIVE', 'WITHDRAWN', 'SUPERSEDED', 'ARCHIVED'].map(
                        (value) => (
                          <option key={value}>{value}</option>
                        ),
                      )}
                    </select>
                    <button type="submit" className="secondary">
                      Save Lesson correction
                    </button>
                  </form>
                </details>
              )}
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
  href,
  access,
}: {
  icon: React.ReactNode;
  title: string;
  meta: string;
  href?: string;
  access?: string;
}) {
  return (
    <div className="artifact">
      <span>{icon}</span>
      <div>
        <strong>{title}</strong>
        <small>{meta}</small>
        {access && <small>{access}</small>}
      </div>
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          aria-label={`Open ${title}`}
        >
          <ExternalLink />
        </a>
      ) : (
        <small>Contact originator for access</small>
      )}
    </div>
  );
}

function HelpRequests({ project }: { project: PortalProject }) {
  const { projectDirectoryUsers, session } = useData();
  const [busy, setBusy] = useState<number | null>(null);
  const active = project.helpRequests.filter((request) =>
    ['OPEN', 'IN_PROGRESS'].includes(request.status),
  );
  const closed = project.helpRequests.filter((request) =>
    ['RESOLVED', 'CANCELLED'].includes(request.status),
  );
  const transition = async (id: number, status: string) => {
    const resolutionSummary = ['RESOLVED', 'CANCELLED'].includes(status)
      ? window.prompt('Short resolution summary')
      : '';
    if (['RESOLVED', 'CANCELLED'].includes(status) && !resolutionSummary)
      return;
    setBusy(id);
    const response = await fetch(
      `/api/projects/${project.id}/help-requests/${id}`,
      {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status, resolutionSummary }),
      },
    );
    if (response.ok) reloadWithSuccess('Help Request updated.');
    else setBusy(null);
  };
  const changeContact = async (id: number, contactUserId: number) => {
    setBusy(id);
    const response = await fetch(
      `/api/projects/${project.id}/help-requests/${id}`,
      {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ contactUserId }),
      },
    );
    if (response.ok) reloadWithSuccess('Help Request contact updated.');
    else {
      const result = (await response.json()) as { error?: string };
      window.alert(result.error || 'Unable to update Help Request contact.');
      setBusy(null);
    }
  };
  const card = (request: PortalProject['helpRequests'][number]) => (
    <article className="help-request-card" key={request.id}>
      <header>
        <span className="lesson-type">{request.categoryLabel}</span>
        <strong>{request.title}</strong>
        <small>
          {request.status.replaceAll('_', ' ')} ·{' '}
          {new Date(request.createdAt).toLocaleDateString()} ·{' '}
          {request.createdByName}
        </small>
      </header>
      <p>{request.description}</p>
      <p>
        <b>Contact:</b> {request.contact || 'Project Lead'}
        {' · '}
        {request.followsProjectLead
          ? 'Follows Project Lead'
          : 'Explicit contact'}
      </p>
      {request.resolutionSummary && (
        <p>
          <b>Resolution:</b> {request.resolutionSummary}
        </p>
      )}
      {session.currentUser?.role === 'SYSTEM_ADMIN' && (
        <details>
          <summary>Administrative metadata correction</summary>
          <form
            className="quick-form"
            onSubmit={(event) => {
              event.preventDefault();
              void fetch(
                `/api/projects/${project.id}/help-requests/${request.id}`,
                {
                  method: 'PATCH',
                  headers: { 'content-type': 'application/json' },
                  body: JSON.stringify(
                    Object.fromEntries(new FormData(event.currentTarget)),
                  ),
                },
              ).then(async (response) => {
                const result = (await response.json()) as { error?: string };
                if (!response.ok)
                  window.alert(
                    result.error || 'Unable to correct Help Request.',
                  );
                else reloadWithSuccess('Help Request correction saved.');
              });
            }}
          >
            <select name="category" defaultValue={request.category}>
              {[
                'TECHNICAL_EXPERTISE',
                'HARDWARE',
                'SOFTWARE_SUPPORT',
                'TESTING_SUPPORT_LOCATION',
                'FUNDING_RESOURCING',
                'OPERATOR_FEEDBACK',
                'DATA',
                'MANUFACTURING',
                'INTEGRATION',
                'DOCUMENTATION',
                'OTHER',
              ].map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
            <select name="status" defaultValue={request.status}>
              {['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CANCELLED'].map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
            <input
              name="contact"
              defaultValue={request.contact}
              placeholder="Explicit contact"
            />
            <input
              name="resolutionSummary"
              defaultValue={request.resolutionSummary}
              placeholder="Resolution metadata"
            />
            <button type="submit" className="secondary">
              Save administrative correction
            </button>
          </form>
        </details>
      )}
      {['OPEN', 'IN_PROGRESS'].includes(request.status) && (
        <footer>
          {!request.followsProjectLead && (
            <select
              aria-label={`Contact for ${request.title}`}
              defaultValue={request.contactUserId ?? ''}
              disabled={busy === request.id}
              onChange={(event) =>
                void changeContact(request.id, Number(event.target.value))
              }
            >
              <option value="" disabled>
                Change explicit contact
              </option>
              {projectDirectoryUsers
                .filter((person) => person.status === 'ACTIVE')
                .map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.displayName}
                  </option>
                ))}
            </select>
          )}
          {request.status === 'OPEN' && (
            <button
              disabled={busy === request.id}
              onClick={() => transition(request.id, 'IN_PROGRESS')}
            >
              Mark in progress
            </button>
          )}
          <button
            disabled={busy === request.id}
            onClick={() => transition(request.id, 'RESOLVED')}
          >
            Resolve
          </button>
          <button
            disabled={busy === request.id}
            onClick={() => transition(request.id, 'CANCELLED')}
          >
            Cancel
          </button>
        </footer>
      )}
    </article>
  );
  return (
    <section className="panel span-2">
      <PanelHead
        title="Help Requests"
        note="Discoverable assistance needs and preserved resolution history"
      />
      {active.length ? (
        active.map(card)
      ) : (
        <p className="body-copy">No active Help Requests.</p>
      )}
      {closed.length > 0 && (
        <details>
          <summary>Resolved / cancelled history ({closed.length})</summary>
          {closed.map(card)}
        </details>
      )}
    </section>
  );
}

function UnitView({ id, onMap, onProject }: { id?: string; onMap: () => void; onProject: (id: string) => void }) {
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
        <Link href="/">Home</Link> <ChevronRight size={14} /> <Link href="/?view=Units">Units</Link> <ChevronRight size={14} /> {unit.name}
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
            {portfolio.length ? (
              portfolio.map((p) => (
                <button className="project-card" key={p.id} onClick={() => onProject(p.id)}>
                  <span className="maturity">{p.solutionTypeLabel}</span>
                  <strong>{p.name}</strong>
                  <p>
                    {p.id} · {p.progress}% complete
                  </p>
                  <Progress value={p.progress} />
                </button>
              ))
            ) : (
              <div className="empty-state">
                <Wrench />
                <h3>
                  No Solution Efforts have been associated with this Unit yet.
                </h3>
                <p>
                  Authorized Unit members can add existing or new work as
                  participation begins.
                </p>
              </div>
            )}
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
          <h2>
            {projects.length
              ? 'No solution efforts match these filters.'
              : 'No Solution Efforts have been created yet.'}
          </h2>
          <p>
            {projects.length
              ? 'Clear one or more filters to broaden the result set.'
              : 'Participating Units can create and associate their actual work with the initial capability Problems.'}
          </p>
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
function UnitStewardshipDashboard() {
  const {
    unitStewardship,
    projects,
    directoryUsers,
    needsAttention,
    submissions,
    helpRequests,
  } = useData();
  const [unitId, setUnitId] = useState(unitStewardship[0]?.unitId ?? 0);
  const [portfolioScope, setPortfolioScope] = useState('ALL');
  const [status, setStatus] = useState('ALL');
  const [maturity, setMaturity] = useState('ALL');
  const [lead, setLead] = useState('ALL');
  const [problem, setProblem] = useState('ALL');
  const [helpState, setHelpState] = useState('ALL');
  const [userRole, setUserRole] = useState('ALL');
  const [userStatus, setUserStatus] = useState('ALL');
  const [lessonType, setLessonType] = useState('ALL');
  const [query, setQuery] = useState('');
  const selected =
    unitStewardship.find((item) => item.unitId === unitId) ??
    unitStewardship[0];
  if (!selected) return null;
  const ledIds = new Set(selected.ledProjectIds);
  const supportedRoles = new globalThis.Map(
    selected.supportedProjects.map((item) => [
      item.projectId,
      item.participationRole,
    ]),
  );
  const unitProjects = projects
    .filter(
      (project) => ledIds.has(project.id) || supportedRoles.has(project.id),
    )
    .filter(
      (project) =>
        portfolioScope === 'ALL' ||
        (portfolioScope === 'LED'
          ? ledIds.has(project.id)
          : supportedRoles.has(project.id)),
    )
    .filter((project) => status === 'ALL' || project.status === status)
    .filter((project) => maturity === 'ALL' || project.maturity === maturity)
    .filter(
      (project) =>
        lead === 'ALL' ||
        project.team.find((member) => member.role === 'PROJECT_LEAD')
          ?.trackingId === lead,
    )
    .filter(
      (project) =>
        problem === 'ALL' ||
        project.problems.some((item) => item.id === problem),
    )
    .filter(
      (project) =>
        helpState === 'ALL' ||
        (helpState === 'OPEN'
          ? project.openHelpRequestCount > 0
          : project.openHelpRequestCount === 0),
    )
    .filter((project) =>
      `${project.id} ${project.name} ${project.team.map((member) => member.displayName).join(' ')} ${project.problems.map((item) => item.title).join(' ')}`
        .toLowerCase()
        .includes(query.toLowerCase()),
    )
    .sort((a, b) =>
      b.lastMeaningfulActivityAt.localeCompare(a.lastMeaningfulActivityAt),
    );
  const scopedUsers = directoryUsers
    .filter((user) => user.unitIds.includes(selected.unitId))
    .filter((user) => userRole === 'ALL' || user.role === userRole)
    .filter((user) => userStatus === 'ALL' || user.status === userStatus);
  const scopedAttention = needsAttention.filter(
    (signal) => signal.unitId === selected.unitId,
  );
  const activeStatuses = new Set([
    'Planning',
    'Active',
    'Paused',
    'Transitioning',
  ]);
  const filteredLessons = selected.lessons
    .filter((lesson) => lessonType === 'ALL' || lesson.type === lessonType)
    .filter((lesson) =>
      `${lesson.title} ${lesson.finding} ${lesson.projectName}`
        .toLowerCase()
        .includes(query.toLowerCase()),
    );
  const filteredHelp = selected.helpRequests.filter(
    (request) =>
      helpState === 'ALL' ||
      (helpState === 'OPEN'
        ? ['OPEN', 'IN_PROGRESS'].includes(request.status)
        : !['OPEN', 'IN_PROGRESS'].includes(request.status)),
  );
  const card = (project: PortalProject, relationship: 'LED' | 'SUPPORTED') => {
    const projectLead = project.team.find(
      (member) => member.role === 'PROJECT_LEAD',
    );
    const attention = scopedAttention.some(
      (signal) => signal.projectId === project.id,
    );
    return (
      <article className="steward-project" key={project.id}>
        <div>
          <span className="maturity">
            {relationship === 'LED'
              ? 'Led by Unit'
              : supportedRoles.get(project.id)}
          </span>
          {attention && <span className="status warning">Review</span>}
        </div>
        <h3>
          <a href={`/projects/${project.id}`}>
            {project.id} — {project.name}
          </a>
        </h3>
        <p>
          {project.problems.find((item) => item.isPrimary)?.title ??
            'No primary Problem'}{' '}
          · {project.solutionTypeLabel}
        </p>
        <small>
          {projectLead?.displayName ?? 'Lead unassigned'} · {project.status} ·{' '}
          {project.maturity} · {project.progress}% complete
        </small>
        <small>
          Last meaningful activity{' '}
          {new Date(project.lastMeaningfulActivityAt).toLocaleDateString()} ·{' '}
          {project.openHelpRequestCount} open Help Request
          {project.openHelpRequestCount === 1 ? '' : 's'}
          {project.outcomeLabel ? ` · ${project.outcomeLabel}` : ''}
        </small>
        <a href={`/projects/${project.id}`}>Open Project</a>
      </article>
    );
  };
  return (
    <section className="stewardship" aria-label="Unit stewardship dashboard">
      <div className="steward-head">
        <div>
          <p className="eyebrow">UNIT STEWARDSHIP</p>
          <h2>{selected.unitName}</h2>
          <p>
            Derived awareness and exception management. Project teams maintain
            the work.
          </p>
        </div>
        <label>
          Administering Unit
          <select
            value={selected.unitId}
            onChange={(event) => setUnitId(Number(event.target.value))}
          >
            {unitStewardship.map((unit) => (
              <option key={unit.unitId} value={unit.unitId}>
                {unit.unitName}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="summary-row">
        <div>
          <strong>
            {
              unitProjects.filter((item) => activeStatuses.has(item.status))
                .length
            }
          </strong>
          <span>Active Solution Efforts</span>
        </div>
        <div>
          <strong>
            {
              unitProjects.filter((item) => !activeStatuses.has(item.status))
                .length
            }
          </strong>
          <span>Historical Efforts</span>
        </div>
        <div>
          <strong>{selected.problemCoverage.length}</strong>
          <span>Problems Addressed</span>
        </div>
        <div>
          <strong>
            {
              selected.helpRequests.filter((item) =>
                ['OPEN', 'IN_PROGRESS'].includes(item.status),
              ).length
            }
          </strong>
          <span>Open Help Requests</span>
        </div>
        <div>
          <strong>{scopedUsers.length}</strong>
          <span>Unit Users</span>
        </div>
      </div>
      <section className="panel attention-panel">
        <div className="section-heading">
          <div>
            <h2>Needs Attention</h2>
            <p>
              Factual stewardship conditions—not scores or performance ratings.
            </p>
          </div>
          <span>{scopedAttention.length} items</span>
        </div>
        {scopedAttention.length ? (
          <div className="attention-grid">
            {scopedAttention.map((signal) => (
              <article key={signal.key}>
                <span>
                  {signal.severity === 'critical'
                    ? 'Action Required'
                    : 'Review'}
                </span>
                <strong>{signal.kind.replaceAll('_', ' ')}</strong>
                <p>{signal.message}</p>
                <a
                  href={
                    signal.projectId
                      ? `/projects/${signal.projectId}`
                      : signal.userId
                        ? '#unit-users'
                        : '#unit-profile'
                  }
                >
                  {signal.projectId
                    ? 'Open Project / Manage Team'
                    : signal.userId
                      ? 'Review User'
                      : 'Review Unit'}
                </a>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <Check />
            <h3>No current stewardship exceptions.</h3>
          </div>
        )}
      </section>
      <div className="portfolio-filters" aria-label="Unit portfolio filters">
        <input
          aria-label="Search Unit portfolio"
          placeholder="Search Project, user, Problem, Help Request, or Lesson"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <select
          aria-label="Led or supported"
          value={portfolioScope}
          onChange={(event) => setPortfolioScope(event.target.value)}
        >
          <option value="ALL">Led and supported</option>
          <option value="LED">Led by Unit</option>
          <option value="SUPPORTED">Supported by Unit</option>
        </select>
        <select
          aria-label="Project status"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        >
          <option value="ALL">All statuses</option>
          {[...new Set(projects.map((item) => item.status))].map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        <select
          aria-label="Project maturity"
          value={maturity}
          onChange={(event) => setMaturity(event.target.value)}
        >
          <option value="ALL">All maturity levels</option>
          {['Concept', 'Prototype', 'Field Tested', 'Validated'].map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        <select
          aria-label="Project Lead"
          value={lead}
          onChange={(event) => setLead(event.target.value)}
        >
          <option value="ALL">All Project Leads</option>
          {directoryUsers.map((item) => (
            <option key={item.id} value={item.trackingId}>
              {item.displayName}
            </option>
          ))}
        </select>
        <select
          aria-label="Problem"
          value={problem}
          onChange={(event) => setProblem(event.target.value)}
        >
          <option value="ALL">All Problems</option>
          {selected.problemCoverage.map((item) => (
            <option key={item.problemId} value={item.problemId}>
              {item.problemId} — {item.title}
            </option>
          ))}
        </select>
        <select
          aria-label="Help Request state"
          value={helpState}
          onChange={(event) => setHelpState(event.target.value)}
        >
          <option value="ALL">Any Help Request state</option>
          <option value="OPEN">Has open request</option>
          <option value="NONE">No open request</option>
        </select>
        <span>Sorted by Last Meaningful Activity</span>
      </div>
      <div className="detail-grid two">
        <section className="panel">
          <h2>Projects Led by My Unit</h2>
          <h3>Active / Current</h3>
          <div className="steward-list">
            {unitProjects
              .filter(
                (item) =>
                  ledIds.has(item.id) && activeStatuses.has(item.status),
              )
              .map((item) => card(item, 'LED'))}
          </div>
          <h3>Historical Knowledge</h3>
          <div className="steward-list">
            {unitProjects
              .filter(
                (item) =>
                  ledIds.has(item.id) && !activeStatuses.has(item.status),
              )
              .map((item) => card(item, 'LED'))}
          </div>
        </section>
        <section className="panel">
          <h2>Projects Supported by My Unit</h2>
          <h3>Active / Current</h3>
          <div className="steward-list">
            {unitProjects
              .filter(
                (item) =>
                  supportedRoles.has(item.id) &&
                  activeStatuses.has(item.status),
              )
              .map((item) => card(item, 'SUPPORTED'))}
          </div>
          <h3>Historical Knowledge</h3>
          <div className="steward-list">
            {unitProjects
              .filter(
                (item) =>
                  supportedRoles.has(item.id) &&
                  !activeStatuses.has(item.status),
              )
              .map((item) => card(item, 'SUPPORTED'))}
          </div>
        </section>
      </div>
      <div className="detail-grid two">
        <section className="panel">
          <h2>Problems Addressed by This Unit</h2>
          <p>
            Canonical Problems against which this Unit has recorded Solution
            Efforts. This does not imply the Problem affects the Unit.
          </p>
          <div className="stack-list">
            {selected.problemCoverage.map((item) => (
              <div key={item.problemId}>
                <strong>
                  <a href={`/problems/${item.problemId}`}>
                    {item.problemId} — {item.title}
                  </a>
                </strong>
                <small>
                  {item.activeEfforts} active · {item.historicalEfforts}{' '}
                  historical · Highest maturity {item.highestMaturity} ·{' '}
                  {item.recentLessons} Lessons
                </small>
              </div>
            ))}
          </div>
        </section>
        <section className="panel">
          <h2>Portfolio Knowledge</h2>
          <h3>Maturity distribution</h3>
          <div className="metric-strip">
            {Object.entries(selected.maturityCounts).map(([label, count]) => (
              <span key={label}>
                <strong>{count}</strong>
                {label}
              </span>
            ))}
          </div>
          <h3>Solution Effort Outcomes</h3>
          <p>
            Unsuccessful and inconclusive work remains a contribution to
            institutional knowledge.
          </p>
          <div className="metric-strip">
            {Object.entries(selected.outcomeCounts)
              .filter(([, count]) => count > 0)
              .map(([label, count]) => (
                <span key={label}>
                  <strong>{count}</strong>
                  {label.replaceAll('_', ' ')}
                </span>
              ))}
          </div>
        </section>
      </div>
      <div className="detail-grid two">
        <section className="panel">
          <div className="section-heading">
            <div>
              <h2>Help Requests from Unit Projects</h2>
              <p>Led and supported efforts remain visibly distinct.</p>
            </div>
            <a href="#organization-help">
              Organization-wide Requests for Assistance
            </a>
          </div>
          <div className="stack-list">
            {filteredHelp.map((item) => (
              <div key={item.id}>
                <span className="maturity">{item.projectRelationship}</span>
                <strong>
                  <a href={`/projects/${item.projectId}`}>{item.title}</a>
                </strong>
                <small>
                  {item.category.replaceAll('_', ' ')} · {item.projectName} ·{' '}
                  {item.problem} · Contact {item.contact} · {item.status} ·{' '}
                  {new Date(item.createdAt).toLocaleDateString()}
                </small>
                {item.resolutionSummary && <p>{item.resolutionSummary}</p>}
              </div>
            ))}
          </div>
        </section>
        <section className="panel">
          <div className="section-heading">
            <div>
              <h2>Lessons from Unit Solution Efforts</h2>
              <p>
                Recent findings, failed approaches, and recommendations retain
                provenance.
              </p>
            </div>
            <select
              aria-label="Lesson type"
              value={lessonType}
              onChange={(event) => setLessonType(event.target.value)}
            >
              <option value="ALL">All Lesson types</option>
              {[
                'CONFIRMED_FINDING',
                'FAILED_APPROACH',
                'RECOMMENDATION',
                'WORKING_HYPOTHESIS',
                'UNRESOLVED_QUESTION',
              ].map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </div>
          <div className="stack-list">
            {filteredLessons.slice(0, 8).map((item) => (
              <div key={item.id}>
                <span className="maturity">
                  {item.type.replaceAll('_', ' ')}
                </span>
                <strong>
                  <a href={`/projects/${item.projectId}`}>{item.title}</a>
                </strong>
                <p>{item.finding}</p>
                <small>
                  {item.projectName} · {item.projectRelationship} ·{' '}
                  {item.author} · {new Date(item.date).toLocaleDateString()}
                  {item.phase ? ` · ${item.phase}` : ''}
                </small>
              </div>
            ))}
          </div>
        </section>
      </div>
      <div className="detail-grid two">
        <section className="panel" id="unit-users">
          <div className="section-heading">
            <div>
              <h2>Unit People & Responsibilities</h2>
              <p>Continuity visibility, not a ranking.</p>
            </div>
            <div>
              <select
                aria-label="User role"
                value={userRole}
                onChange={(event) => setUserRole(event.target.value)}
              >
                <option value="ALL">All roles</option>
                {[
                  'CONTRIBUTOR',
                  'PROJECT_USER',
                  'UNIT_ADMIN',
                  'SYSTEM_ADMIN',
                ].map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
              <select
                aria-label="User status"
                value={userStatus}
                onChange={(event) => setUserStatus(event.target.value)}
              >
                <option value="ALL">All account states</option>
                {['PENDING', 'ACTIVE', 'DISABLED'].map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="stack-list">
            {scopedUsers.map((item) => (
              <div key={item.id}>
                <strong>{item.displayName}</strong>
                <small>
                  {item.role.replaceAll('_', ' ')} · {item.status} ·{' '}
                  {item.projectsLed.length} led ·{' '}
                  {item.projectsContributed.length} contributed ·{' '}
                  {item.openHelpRequests.length} Help contacts
                </small>
                <a href="#responsibility-directory">View Responsibilities</a>
              </div>
            ))}
          </div>
        </section>
        <section className="panel">
          <h2>Recent Unit Activity</h2>
          <p>Meaningful Project knowledge and administrative stewardship.</p>
          <div className="stack-list">
            {selected.activities.slice(0, 12).map((item) => (
              <div key={item.id}>
                <span className="maturity">
                  {item.category === 'UNIT_ADMINISTRATION'
                    ? 'Unit Administration'
                    : 'Project Knowledge'}
                </span>
                <strong>{item.description}</strong>
                <small>
                  {item.actor} · {new Date(item.timestamp).toLocaleString()}
                </small>
                {item.projectId && (
                  <a href={`/projects/${item.projectId}`}>Open Project</a>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
      <section className="panel" id="unit-submissions">
        <h2>Problem Submissions from My Unit</h2>
        <p>
          Unit Administrators provide Unit context and recommend canonical
          relationships. System/global governance controls new canonical
          Problems and material edits.
        </p>
        <div className="stack-list">
          {submissions
            .filter((item) => item.unitId === selected.unitId)
            .map((item) => (
              <div key={item.id}>
                <strong>
                  {item.trackingId} — {item.title}
                </strong>
                <small>
                  {item.submitter} ·{' '}
                  {new Date(item.createdAt).toLocaleDateString()} ·{' '}
                  {item.status.replaceAll('_', ' ')}
                </small>
                <p>
                  {item.matches
                    .slice(0, 2)
                    .map(
                      (match) =>
                        `${match.classification.replaceAll('_', ' ')}: ${match.id}`,
                    )
                    .join(' · ') || 'No likely canonical relationship found.'}
                </p>
                <a href="#submission-review">Review Unit context</a>
              </div>
            ))}
        </div>
      </section>
      <section className="panel" id="organization-help">
        <h2>Organization-wide Requests for Assistance</h2>
        <p>
          Broad discovery does not imply that this Unit has claimed or accepted
          the work.
        </p>
        <div className="stack-list">
          {helpRequests
            .filter(
              (item) =>
                !selected.ledProjectIds.includes(item.projectId) &&
                !supportedRoles.has(item.projectId),
            )
            .slice(0, 6)
            .map((item) => (
              <div key={item.id}>
                <strong>
                  <a href={`/projects/${item.projectId}`}>{item.title}</a>
                </strong>
                <small>
                  {item.projectName} · {item.unitName} · {item.categoryLabel} ·{' '}
                  {item.status}
                </small>
              </div>
            ))}
        </div>
      </section>
    </section>
  );
}

function SystemAdminOverview() {
  const {
    systemAdminContinuity,
    platformIntegrity,
    directoryUsers,
    activities,
  } = useData();
  const [activityCategory, setActivityCategory] = useState('ALL');
  const [activityActor, setActivityActor] = useState('ALL');
  const [activityUnit, setActivityUnit] = useState('ALL');
  const [activitySubject, setActivitySubject] = useState('ALL');
  const [activityProject, setActivityProject] = useState('ALL');
  const [activityProblem, setActivityProblem] = useState('ALL');
  const [activityType, setActivityType] = useState('ALL');
  const [activitySearch, setActivitySearch] = useState('');
  const [activitySince, setActivitySince] = useState('');
  const [activityLimit, setActivityLimit] = useState(20);
  const elevated = directoryUsers.filter((person) =>
    ['SYSTEM_ADMIN', 'UNIT_ADMIN'].includes(person.role),
  );
  const adminActivities = activities.filter(
    (event) => event.category !== 'Project Knowledge',
  );
  const filteredActivities = adminActivities.filter(
    (event) =>
      (activityCategory === 'ALL' || event.category === activityCategory) &&
      (activityActor === 'ALL' || event.actor === activityActor) &&
      (activityUnit === 'ALL' || event.unitId === activityUnit) &&
      (activitySubject === 'ALL' ||
        String(event.subjectUserId) === activitySubject) &&
      (activityProject === 'ALL' || event.projectId === activityProject) &&
      (activityProblem === 'ALL' || event.problemId === activityProblem) &&
      (activityType === 'ALL' || event.eventType === activityType) &&
      (!activitySearch ||
        `${event.actor} ${event.entityId} ${event.description}`
          .toLowerCase()
          .includes(activitySearch.toLowerCase())) &&
      (!activitySince ||
        event.timestamp >= new Date(`${activitySince}T00:00:00`).toISOString()),
  );
  return (
    <div className="detail-grid two system-admin-overview">
      <section className="panel span-2">
        <div className="section-heading">
          <div>
            <h2>Platform continuity</h2>
            <p>
              Administrative coverage, not a performance measure. Active profile
              status does not verify external authentication.
            </p>
          </div>
        </div>
        <div className="metrics-grid">
          <div>
            <strong>{systemAdminContinuity.active}</strong>
            <span>Active System Administrators</span>
          </div>
          <div>
            <strong>{systemAdminContinuity.pending}</strong>
            <span>Pending System Administrators</span>
          </div>
          <div>
            <strong>{systemAdminContinuity.disabled}</strong>
            <span>Disabled former System Administrators</span>
          </div>
        </div>
        <p className="muted">
          Handover: create and map a replacement profile, activate it, verify
          access outside FORGE, confirm this count, then retire the departing
          administrator.
        </p>
        <button
          className="secondary"
          onClick={() => {
            window.location.href = '/api/admin/operational-export';
          }}
        >
          Download UNCLASSIFIED metadata export
        </button>
      </section>
      <section className="panel" id="platform-integrity">
        <h2>Platform Integrity</h2>
        <p>
          Deterministic relationship and recoverability checks. Findings clear
          when their source data is corrected.
        </p>
        {platformIntegrity.length ? (
          <div className="stack-list">
            {platformIntegrity.map((finding) => (
              <div key={finding.key}>
                <span className="maturity">
                  {finding.severity === 'action' ? 'Action Required' : 'Review'}
                </span>
                <strong>{finding.kind.replaceAll('_', ' ')}</strong>
                <p>{finding.message}</p>
                <small>{finding.remediation}</small>
                <a href={finding.href}>Open remediation</a>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <Check />
            <h3>No actionable integrity failures detected.</h3>
            <p>
              FORGE is operational and internally consistent. Pilot setup and governance attention may remain before user onboarding.
            </p>
          </div>
        )}
      </section>
      <section className="panel" id="elevated-roles">
        <h2>Elevated roles</h2>
        <p>Global continuity and explicitly administered Unit scopes.</p>
        <div className="stack-list">
          {elevated.map((person) => (
            <div key={person.id}>
              <strong>{person.displayName}</strong>
              <small>
                {person.role.replaceAll('_', ' ')} · {person.status} · Primary:{' '}
                {person.primaryUnit}
              </small>
              <p>
                {person.role === 'UNIT_ADMIN'
                  ? `Administered Units: ${
                      person.memberships
                        .filter((item) => item.isAdmin)
                        .map((item) => item.unitName)
                        .join(', ') || 'None'
                    }`
                  : 'Global platform scope'}
              </p>
              <a href="#responsibility-directory">View responsibilities</a>
            </div>
          ))}
        </div>
      </section>
      <section className="panel span-2" id="administrative-activity">
        <h2>Recent administrative Activity</h2>
        <p>
          Up to 200 recent events remain available for bounded, practical
          review.
        </p>
        <div className="quick-form">
          <select
            aria-label="Activity category"
            value={activityCategory}
            onChange={(event) => setActivityCategory(event.target.value)}
          >
            <option value="ALL">All categories</option>
            {[...new Set(adminActivities.map((event) => event.category))].map(
              (value) => (
                <option key={value}>{value}</option>
              ),
            )}
          </select>
          <select
            aria-label="Activity actor"
            value={activityActor}
            onChange={(event) => setActivityActor(event.target.value)}
          >
            <option value="ALL">All actors</option>
            {[...new Set(adminActivities.map((event) => event.actor))].map(
              (value) => (
                <option key={value}>{value}</option>
              ),
            )}
          </select>
          <select
            aria-label="Activity Unit"
            value={activityUnit}
            onChange={(event) => setActivityUnit(event.target.value)}
          >
            <option value="ALL">All Units</option>
            {[
              ...new globalThis.Map(
                adminActivities
                  .filter((event) => event.unitId)
                  .map((event) => [event.unitId, event.unitName]),
              ).entries(),
            ].map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
          <select
            aria-label="Affected user"
            value={activitySubject}
            onChange={(event) => setActivitySubject(event.target.value)}
          >
            <option value="ALL">All affected users</option>
            {[
              ...new globalThis.Map(
                adminActivities
                  .filter((event) => event.subjectUserId)
                  .map((event) => [
                    String(event.subjectUserId),
                    event.subjectUserName,
                  ]),
              ).entries(),
            ].map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
          <select
            aria-label="Affected Project"
            value={activityProject}
            onChange={(event) => setActivityProject(event.target.value)}
          >
            <option value="ALL">All Projects</option>
            {[
              ...new globalThis.Map(
                adminActivities
                  .filter((event) => event.projectId)
                  .map((event) => [event.projectId, event.projectName]),
              ).entries(),
            ].map(([id, name]) => (
              <option key={id} value={id}>
                {id} — {name}
              </option>
            ))}
          </select>
          <select
            aria-label="Affected Problem"
            value={activityProblem}
            onChange={(event) => setActivityProblem(event.target.value)}
          >
            <option value="ALL">All Problems</option>
            {[
              ...new globalThis.Map(
                adminActivities
                  .filter((event) => event.problemId)
                  .map((event) => [event.problemId, event.problemName]),
              ).entries(),
            ].map(([id, name]) => (
              <option key={id} value={id}>
                {id} — {name}
              </option>
            ))}
          </select>
          <select
            aria-label="Action type"
            value={activityType}
            onChange={(event) => setActivityType(event.target.value)}
          >
            <option value="ALL">All action types</option>
            {[...new Set(adminActivities.map((event) => event.eventType))].map(
              (value) => (
                <option key={value}>{value.replaceAll('_', ' ')}</option>
              ),
            )}
          </select>
          <input
            aria-label="Search administrative Activity"
            value={activitySearch}
            onChange={(event) => setActivitySearch(event.target.value)}
            placeholder="Search actor, ID, or description"
          />
          <label>
            Since{' '}
            <input
              aria-label="Activity since date"
              type="date"
              value={activitySince}
              onChange={(event) => setActivitySince(event.target.value)}
            />
          </label>
        </div>
        <div className="stack-list">
          {filteredActivities.slice(0, activityLimit).map((event) => (
            <div key={event.id}>
              <span className="maturity">{event.category}</span>
              <strong>{event.description}</strong>
              <small>
                {event.actor} · {new Date(event.timestamp).toLocaleString()}
              </small>
              {event.entityHref ? (
                <a href={event.entityHref}>Open affected record</a>
              ) : event.problemId ? (
                <a href={`/problems/${event.problemId}`}>Open Problem</a>
              ) : event.projectId ? (
                <a href={`/projects/${event.projectId}`}>Open Project</a>
              ) : event.unitId ? (
                <a href={`/units/${event.unitId}`}>Open Unit</a>
              ) : event.subjectUserId ? (
                <a href="#responsibility-directory">Open user administration</a>
              ) : null}
            </div>
          ))}
        </div>
        {activityLimit < filteredActivities.length && (
          <button
            className="secondary"
            onClick={() => setActivityLimit((value) => value + 20)}
          >
            Load more Activity
          </button>
        )}
      </section>
    </div>
  );
}

function CanonicalGovernance() {
  const { units, problems, projectDirectoryUsers, tagInventory, locations } =
    useData();
  const send = async (
    event: React.SyntheticEvent<HTMLFormElement>,
    url: string,
    method = 'POST',
  ) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const body: Record<string, unknown> = Object.fromEntries(data);
    body.tags = data.getAll('tags');
    if (body.duplicateReviewed === 'true') body.duplicateReviewed = true;
    for (const key of ['confirmed', 'associateProjects'])
      if (body[key] === 'true') body[key] = true;
    const options: RequestInit = {
      method,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    };
    const response = await fetch(url, options);
    const result = (await response.json()) as { error?: string };
    if (!response.ok)
      window.alert(result.error || 'Unable to save governed record.');
    else reloadWithSuccess();
  };
  const activeUsers = projectDirectoryUsers.filter(
    (person) => person.status === 'ACTIVE',
  );
  return (
    <section className="canonical-governance">
      <div className="detail-grid two">
        <section className="panel">
          <h2>Create canonical Unit</h2>
          <p>
            System-governed identity. The permanent FORGE Unit ID is assigned
            transactionally.
          </p>
          <form
            className="quick-form"
            onSubmit={(event) => void send(event, '/api/admin/units')}
          >
            <input name="name" required placeholder="Canonical Unit name" />
            <input name="abbreviation" required placeholder="Abbreviation" />
            <input
              name="unitType"
              required
              placeholder="Controlled Unit type"
            />
            <input
              name="parentOrganization"
              placeholder="Parent organization (optional)"
            />
            <select name="locationId">
              <option value="">Location unavailable</option>
              {locations.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                  {item.region ? `, ${item.region}` : ''}
                </option>
              ))}
            </select>
            <input
              name="forgePointOfContact"
              placeholder="FORGE point of contact"
            />
            <textarea
              name="description"
              placeholder="Plain-language Unit description"
            />
            <select name="tags" multiple aria-label="Unit capabilities">
              {tagInventory.map((tag) => (
                <option key={tag.id}>{tag.name}</option>
              ))}
            </select>
            <button type="submit">Create Unit</button>
          </form>
        </section>
        <section className="panel">
          <h2>Create canonical Problem</h2>
          <p>
            Direct System Administrator creation with duplicate review and
            controlled lifecycle fields.
          </p>
          <form
            className="quick-form"
            onSubmit={(event) => void send(event, '/api/admin/problems')}
          >
            <input name="title" required placeholder="Progressive title" />
            <textarea
              name="description"
              required
              placeholder="Executive summary"
            />
            <textarea
              name="detailedDescription"
              required
              placeholder="Detailed description"
            />
            <textarea
              name="problemStatement"
              required
              placeholder="Problem statement"
            />
            <textarea name="impact" placeholder="Operational impact" />
            <select name="category" defaultValue="Uncategorized">
              {[
                'Navigation',
                'Autonomy / Control',
                'RF / Communications',
                'Identification / Sensing',
                'Guidance',
                'RF / Signature Management',
                'Uncategorized',
              ].map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
            <select name="priority" defaultValue="Unprioritized">
              {['Unprioritized', 'Low', 'Medium', 'High', 'Critical'].map(
                (item) => (
                  <option key={item}>{item}</option>
                ),
              )}
            </select>
            <select name="stewardUserId">
              <option value="">No steward yet</option>
              {activeUsers.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.displayName}
                </option>
              ))}
            </select>
            <select name="tags" multiple aria-label="Problem tags">
              {tagInventory.map((tag) => (
                <option key={tag.id}>{tag.name}</option>
              ))}
            </select>
            <label>
              <input name="duplicateReviewed" type="checkbox" value="true" /> I
              reviewed existing canonical Problems
            </label>
            <button type="submit">Create Problem</button>
          </form>
        </section>
      </div>
      <section className="panel">
        <h2>Canonical Unit profiles</h2>
        <p>
          Tracking IDs remain immutable. Unit Administrators may maintain only
          their scoped POC profile; canonical identity changes remain
          System-only.
        </p>
        <div className="stack-list">
          {units.map((unit) => (
            <details key={unit.id}>
              <summary>
                <strong>
                  {unit.id} — {unit.name}
                </strong>
                <small>
                  {unit.abbreviation} · {unit.type} ·{' '}
                  {unit.isActive ? 'ACTIVE' : 'INACTIVE'}
                </small>
              </summary>
              <form
                className="quick-form"
                onSubmit={(event) =>
                  void send(event, `/api/admin/units/${unit.dbId}`, 'PATCH')
                }
              >
                <input name="name" defaultValue={unit.name} required />
                <input
                  name="abbreviation"
                  defaultValue={unit.abbreviation}
                  required
                />
                <input name="unitType" defaultValue={unit.type} required />
                <input
                  name="parentOrganization"
                  defaultValue={unit.parentOrganization}
                />
                <textarea name="description" defaultValue={unit.description} />
                <select name="locationId" defaultValue={unit.locationId ?? ''}>
                  <option value="">Location unavailable</option>
                  {locations.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
                <select name="tags" multiple defaultValue={unit.capabilities}>
                  {tagInventory.map((tag) => (
                    <option key={tag.id}>{tag.name}</option>
                  ))}
                </select>
                <button type="submit" className="secondary">
                  Save canonical profile
                </button>
              </form>
            </details>
          ))}
        </div>
      </section>
      <section className="panel">
        <h2>Canonical Problem registry</h2>
        <p>
          Lifecycle, priority, stewardship, supersession, relationships, and
          refinement remain explicit.
        </p>
        <div className="stack-list">
          {problems.map((problem) => (
            <details key={problem.id}>
              <summary>
                <strong>
                  {problem.id} — {problem.title}
                </strong>
                <small>
                  {problem.status} · {problem.priority} · Steward:{' '}
                  {problem.steward || 'Needs refinement'}
                </small>
              </summary>
              <form
                className="quick-form"
                onSubmit={(event) =>
                  void send(event, `/api/admin/problems/${problem.id}`, 'PATCH')
                }
              >
                <input name="title" defaultValue={problem.title} required />
                <textarea
                  name="description"
                  defaultValue={problem.description}
                  required
                />
                <textarea
                  name="detailedDescription"
                  defaultValue={problem.detailedDescription}
                  required
                />
                <textarea
                  name="problemStatement"
                  defaultValue={problem.problemStatement}
                  required
                />
                <textarea name="impact" defaultValue={problem.impact} />
                <select name="category" defaultValue={problem.category}>
                  {[
                    'Navigation',
                    'Autonomy / Control',
                    'RF / Communications',
                    'Identification / Sensing',
                    'Guidance',
                    'RF / Signature Management',
                    'Uncategorized',
                  ].map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
                <select name="priority" defaultValue={problem.priority}>
                  {['Unprioritized', 'Low', 'Medium', 'High', 'Critical'].map(
                    (item) => (
                      <option key={item}>{item}</option>
                    ),
                  )}
                </select>
                <select name="status" defaultValue={problem.status}>
                  {[
                    'Open',
                    'Under Review',
                    'Addressed — Viable Efforts Exist',
                    'Closed',
                    'Superseded',
                  ].map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
                <select
                  name="stewardUserId"
                  defaultValue={problem.stewardUserId ?? ''}
                >
                  <option value="">No steward yet</option>
                  {activeUsers.map((person) => (
                    <option key={person.id} value={person.id}>
                      {person.displayName}
                    </option>
                  ))}
                </select>
                <select
                  name="supersededById"
                  defaultValue={
                    problems.find((item) => item.id === problem.supersededById)
                      ?.dbId ?? ''
                  }
                >
                  <option value="">No successor</option>
                  {problems
                    .filter((item) => item.id !== problem.id)
                    .map((item) => (
                      <option key={item.id} value={item.dbId}>
                        {item.id} — {item.title}
                      </option>
                    ))}
                </select>
                <select name="tags" multiple defaultValue={problem.tags}>
                  {tagInventory.map((tag) => (
                    <option key={tag.id}>{tag.name}</option>
                  ))}
                </select>
                <button type="submit" className="secondary">
                  Save Problem governance
                </button>
              </form>
              <form
                className="quick-form"
                onSubmit={(event) =>
                  void send(
                    event,
                    `/api/admin/problems/${problem.id}/relationships`,
                    'PATCH',
                  )
                }
              >
                <select name="relationship">
                  <option value="RELATED_TO">Related to</option>
                  <option value="VARIANT_OF">Variant of</option>
                </select>
                <select name="targetProblemId" required>
                  <option value="">Select canonical Problem</option>
                  {problems
                    .filter((item) => item.id !== problem.id)
                    .map((item) => (
                      <option key={item.id} value={item.dbId}>
                        {item.id} — {item.title}
                      </option>
                    ))}
                </select>
                <button type="submit" className="secondary">
                  Add relationship
                </button>
              </form>
              {problem.relationships.map((item) => (
                <p key={`${item.direction}-${item.type}-${item.problemId}`}>
                  {item.direction === 'INCOMING'
                    ? 'Referenced by'
                    : item.type.replaceAll('_', ' ')}{' '}
                  <a href={`/problems/${item.problemId}`}>
                    {item.problemId} — {item.title}
                  </a>
                </p>
              ))}
            </details>
          ))}
        </div>
      </section>
      <section className="panel">
        <h2>Problem consolidation</h2>
        <p>
          Review both Problems and their linked records above. Consolidation
          preserves the source PRB as a searchable historical alias and requires
          explicit confirmation.
        </p>
        <form
          className="quick-form"
          onSubmit={(event) => {
            const source = new FormData(event.currentTarget).get(
              'sourceProblemId',
            );
            if (typeof source === 'string')
              void send(event, `/api/admin/problems/${source}/consolidate`);
          }}
        >
          <select name="sourceProblemId" required>
            <option value="">Source Problem</option>
            {problems.map((item) => (
              <option key={item.id}>{item.id}</option>
            ))}
          </select>
          <select name="targetProblemId" required>
            <option value="">Destination canonical Problem</option>
            {problems.map((item) => (
              <option key={item.id} value={item.dbId}>
                {item.id} — {item.title}
              </option>
            ))}
          </select>
          <label>
            <input name="associateProjects" type="checkbox" value="true" /> Also
            associate non-duplicate Project links with destination
          </label>
          <label>
            <input name="confirmed" type="checkbox" value="true" required /> I
            reviewed source/destination context and confirm consolidation
          </label>
          <button type="submit">Consolidate into existing Problem</button>
        </form>
      </section>
      <section className="panel" id="tag-governance">
        <h2>Governed tag inventory</h2>
        <form
          className="quick-form"
          onSubmit={(event) => void send(event, '/api/admin/tags')}
        >
          <input name="name" required placeholder="New governed tag" />
          <button type="submit">Create tag</button>
        </form>
        <div className="stack-list">
          {tagInventory.map((tag) => (
            <details key={tag.id}>
              <summary>
                <strong>{tag.name}</strong>
                <small>
                  {tag.usageCount} linked records · {tag.problems.length}{' '}
                  Problems · {tag.projects.length} Projects · {tag.units.length}{' '}
                  Units · {tag.lessons.length} Lessons
                </small>
              </summary>
              <p>
                {[
                  ...tag.problems,
                  ...tag.projects,
                  ...tag.units,
                  ...tag.lessons,
                ].join(' · ') || 'Unused'}
              </p>
              <form
                className="quick-form"
                onSubmit={(event) =>
                  void send(event, `/api/admin/tags/${tag.id}`, 'PATCH')
                }
              >
                <input name="name" defaultValue={tag.name} required />
                <button type="submit" className="secondary">
                  Rename
                </button>
              </form>
              <form
                className="quick-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  const form = event.currentTarget;
                  const data = new FormData(form);
                  const body = {
                    targetTagId: Number(data.get('targetTagId')),
                    confirmed: data.get('confirmed') === 'true',
                  };
                  void fetch(`/api/admin/tags/${tag.id}/merge`, {
                    method: 'POST',
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify(body),
                  }).then(async (response) => {
                    const result = (await response.json()) as {
                      error?: string;
                    };
                    if (!response.ok)
                      window.alert(result.error || 'Unable to merge Tag.');
                    else reloadWithSuccess();
                  });
                }}
              >
                <select name="targetTagId" required>
                  <option value="">Merge into…</option>
                  {tagInventory
                    .filter((item) => item.id !== tag.id)
                    .map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} ({item.usageCount})
                      </option>
                    ))}
                </select>
                <label>
                  <input
                    name="confirmed"
                    type="checkbox"
                    value="true"
                    required
                  />{' '}
                  Confirm affected entity types and merge
                </label>
                <button type="submit" className="secondary">
                  Merge Tag
                </button>
              </form>
            </details>
          ))}
        </div>
      </section>
      <section className="panel" id="location-governance">
        <h2>Approved general Locations</h2>
        <p>
          Use only approved, appropriately generalized information. Precision is
          not required merely because coordinates are supported.
        </p>
        <form
          className="quick-form"
          onSubmit={(event) => void send(event, '/api/admin/locations')}
        >
          <input name="name" required placeholder="Location name" />
          <input name="region" placeholder="General region" />
          <input
            name="latitude"
            type="number"
            step="any"
            required
            placeholder="Approved latitude"
          />
          <input
            name="longitude"
            type="number"
            step="any"
            required
            placeholder="Approved longitude"
          />
          <button type="submit">Create Location</button>
        </form>
        <div className="stack-list">
          {locations.map((location) => (
            <details key={location.id}>
              <summary>
                <strong>{location.name}</strong>
                <small>
                  {location.region || 'No region'} · {location.units.length}{' '}
                  Units · {location.projects.length} Projects ·{' '}
                  {location.problems.length} Problems
                </small>
              </summary>
              <p>
                {[
                  ...location.units,
                  ...location.projects,
                  ...location.problems,
                ].join(' · ') || 'Unused'}
              </p>
              <form
                className="quick-form"
                onSubmit={(event) =>
                  void send(
                    event,
                    `/api/admin/locations/${location.id}`,
                    'PATCH',
                  )
                }
              >
                <input name="name" defaultValue={location.name} required />
                <input name="region" defaultValue={location.region} />
                <input
                  name="latitude"
                  type="number"
                  step="any"
                  defaultValue={location.latitude}
                  required
                />
                <input
                  name="longitude"
                  type="number"
                  step="any"
                  defaultValue={location.longitude}
                  required
                />
                <button type="submit" className="secondary">
                  Correct Location
                </button>
              </form>
            </details>
          ))}
        </div>
      </section>
    </section>
  );
}

function AdministrationView() {
  const data = useData();
  const {
    directoryUsers,
    submissions,
    session,
    units,
    problems,
    needsAttention,
    projectDirectoryUsers,
  } = data;
  const current = session.currentUser;
  const [userRoleFilter, setUserRoleFilter] = useState('ALL');
  const [userStatusFilter, setUserStatusFilter] = useState('ALL');
  const [userUnitFilter, setUserUnitFilter] = useState('ALL');
  const [attentionOnly, setAttentionOnly] = useState(false);
  const scopedUnits =
    current?.role === 'SYSTEM_ADMIN'
      ? units
      : units.filter((unit) =>
          current?.administeredUnitIds.includes(unit.dbId),
        );
  const filteredDirectoryUsers = directoryUsers.filter(
    (person) =>
      (userRoleFilter === 'ALL' || person.role === userRoleFilter) &&
      (userStatusFilter === 'ALL' || person.status === userStatusFilter) &&
      (userUnitFilter === 'ALL' ||
        person.unitIds.includes(Number(userUnitFilter))) &&
      (!attentionOnly ||
        needsAttention.some((signal) => signal.userId === person.id)),
  );
  const patch = async (url: string, body: Record<string, unknown>) => {
    const response = await fetch(url, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    const result = (await response.json()) as { error?: string };
    if (!response.ok) window.alert(result.error || 'Unable to save.');
    else reloadWithSuccess();
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
    else reloadWithSuccess('User created. Review Unit assignment and responsibilities.');
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
      {current?.role === 'SYSTEM_ADMIN' && <SystemAdminOverview />}
      {current?.role === 'SYSTEM_ADMIN' && <CanonicalGovernance />}
      <UnitStewardshipDashboard />
      <div className="detail-grid two">
        <section className="panel">
          <h2>Needs attention</h2>
          <p>
            Factual continuity signals derived from current assignments. These
            are not performance ratings.
          </p>
          {needsAttention.length ? (
            <div className="stack-list">
              {needsAttention.map((signal) => (
                <div key={signal.key}>
                  <strong>{signal.kind.replaceAll('_', ' ')}</strong>
                  <p>{signal.message}</p>
                  {signal.projectId && (
                    <a href={`/projects/${signal.projectId}`}>Open Project</a>
                  )}
                  {signal.kind === 'RECEIVING_UNIT_TRANSFER_REVIEW' &&
                    signal.projectId && (
                      <button
                        className="secondary"
                        onClick={() =>
                          void fetch(
                            `/api/projects/${signal.projectId}/lead-unit-acknowledgment`,
                            { method: 'POST' },
                          ).then(async (response) => {
                            const result = (await response.json()) as {
                              error?: string;
                            };
                            if (!response.ok)
                              window.alert(
                                result.error ||
                                  'Unable to acknowledge transfer.',
                              );
                            else reloadWithSuccess('Receiving Unit review acknowledged.');
                          })
                        }
                      >
                        Acknowledge receiving-Unit review
                      </button>
                    )}
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <Check />
              <h3>No continuity gaps detected in your scope.</h3>
            </div>
          )}
        </section>
        <section className="panel" id="responsibility-directory">
          <h2>User directory</h2>
          <div className="quick-form">
            <select
              aria-label="Filter users by role"
              value={userRoleFilter}
              onChange={(event) => setUserRoleFilter(event.target.value)}
            >
              <option value="ALL">All roles</option>
              {[
                'CONTRIBUTOR',
                'PROJECT_USER',
                'UNIT_ADMIN',
                'SYSTEM_ADMIN',
              ].map((role) => (
                <option key={role}>{role}</option>
              ))}
            </select>
            <select
              aria-label="Filter users by status"
              value={userStatusFilter}
              onChange={(event) => setUserStatusFilter(event.target.value)}
            >
              <option value="ALL">All statuses</option>
              {['PENDING', 'ACTIVE', 'DISABLED'].map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>
            <select
              aria-label="Filter users by Unit"
              value={userUnitFilter}
              onChange={(event) => setUserUnitFilter(event.target.value)}
            >
              <option value="ALL">All Units</option>
              {scopedUnits.map((unit) => (
                <option key={unit.id} value={unit.dbId}>
                  {unit.name}
                </option>
              ))}
            </select>
            <label>
              <input
                type="checkbox"
                checked={attentionOnly}
                onChange={(event) => setAttentionOnly(event.target.checked)}
              />{' '}
              Has attention condition
            </label>
          </div>
          {directoryUsers.length ? (
            <div className="stack-list">
              {filteredDirectoryUsers.map((item) => (
                <details key={item.id}>
                  <summary>
                    <strong>{item.displayName}</strong>
                    <small>
                      {item.trackingId} · {item.identifier} · {item.status} ·{' '}
                      {item.primaryUnit}
                    </small>
                  </summary>
                  <p>
                    {item.memberships
                      .map(
                        (membership) =>
                          `${membership.unitName}${membership.isPrimary ? ' (primary)' : ''}${membership.isAdmin ? ' · Unit Admin' : ''}`,
                      )
                      .join(' · ')}
                  </p>
                  <p>
                    <strong>Open responsibilities:</strong>{' '}
                    {item.projectsLed.length} Project
                    {item.projectsLed.length === 1 ? '' : 's'} led ·{' '}
                    {item.projectsContributed.length} contributed ·{' '}
                    {item.openHelpRequests.length} Help contact
                    {item.openHelpRequests.length === 1 ? '' : 's'}
                  </p>
                  {item.warnings.map((warning) => (
                    <p className="form-warning" key={warning}>
                      {warning}
                    </p>
                  ))}
                  {[...item.projectsLed, ...item.projectsContributed].map(
                    (project) => (
                      <p key={`${item.id}-${project.id}`}>
                        <a href={`/projects/${project.id}`}>
                          {project.id} — {project.name}
                        </a>{' '}
                        · {project.status} · {project.maturity} · Activity{' '}
                        {new Date(
                          project.lastMeaningfulActivityAt,
                        ).toLocaleDateString()}
                      </p>
                    ),
                  )}
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
                    onClick={() => {
                      if (
                        item.status === 'ACTIVE' &&
                        item.warnings.length &&
                        !window.confirm(
                          `Disable ${item.displayName}?\n\n${item.warnings.join('\n')}\n\nExisting history will be retained, but these responsibilities will need reassignment.`,
                        )
                      )
                        return;
                      void patch(`/api/admin/users/${item.id}`, {
                        status:
                          item.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE',
                      });
                    }}
                  >
                    {item.status === 'ACTIVE'
                      ? 'Disable account'
                      : 'Activate account'}
                  </button>
                  <form
                    className="quick-form"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void patch(
                        `/api/admin/users/${item.id}/memberships`,
                        Object.fromEntries(new FormData(event.currentTarget)),
                      );
                    }}
                  >
                    <select name="operation">
                      <option value="ADD">Add Unit membership</option>
                      <option value="SET_PRIMARY">Set primary Unit</option>
                      <option value="REMOVE">Remove Unit membership</option>
                    </select>
                    <select name="unitId">
                      {scopedUnits.map((unit) => (
                        <option key={unit.id} value={unit.dbId}>
                          {unit.name}
                        </option>
                      ))}
                    </select>
                    <button className="secondary" type="submit">
                      Update membership
                    </button>
                  </form>
                  {current?.role === 'SYSTEM_ADMIN' &&
                    item.role !== 'SYSTEM_ADMIN' && (
                      <form
                        className="quick-form"
                        onSubmit={(event) => {
                          event.preventDefault();
                          const body = Object.fromEntries(
                            new FormData(event.currentTarget),
                          );
                          void patch(
                            `/api/admin/users/${item.id}/admin-scopes`,
                            {
                              ...body,
                              assigned: body.assigned === 'true',
                            },
                          );
                        }}
                      >
                        <select name="assigned">
                          <option value="true">Assign Unit Admin scope</option>
                          <option value="false">Remove Unit Admin scope</option>
                        </select>
                        <select name="unitId">
                          {units.map((unit) => (
                            <option key={unit.id} value={unit.dbId}>
                              {unit.name}
                            </option>
                          ))}
                        </select>
                        <button className="secondary" type="submit">
                          Update admin scope
                        </button>
                      </form>
                    )}
                </details>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <Users />
              <h3>No users in your administrative scope.</h3>
            </div>
          )}
        </section>
        <section className="panel" id="submission-review">
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
                    {item.unit} · Submitted{' '}
                    {new Date(item.createdAt).toLocaleDateString()}
                  </small>
                  <p>{item.description}</p>
                  {item.relatedProblemId && (
                    <p className="form-success">
                      Contributor identified {item.relatedProblemId} as covering
                      this issue.
                    </p>
                  )}
                  {item.matches.length > 0 && (
                    <div className="review-matches">
                      <strong>Canonical Problems to review</strong>
                      {item.matches.map((match) => (
                        <div key={match.id}>
                          <span className="maturity">
                            {match.classification === 'POSSIBLE_DUPLICATE'
                              ? 'Possible Duplicate'
                              : 'Related Problem'}
                          </span>
                          <b>
                            {match.id} — {match.title}
                          </b>
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
                      <option value="ACCEPTED">
                        Recommend existing Problem
                      </option>
                      <option value="DUPLICATE_LINKED">
                        Mark likely duplicate / link existing
                      </option>
                      <option value="REJECTED">Return for clarification</option>
                    </select>
                    <select
                      name="relatedProblemId"
                      defaultValue={
                        problems.find(
                          (problem) => problem.id === item.relatedProblemId,
                        )?.dbId ?? ''
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
                  {current?.role === 'SYSTEM_ADMIN' &&
                    item.status !== 'APPROVED_NEW' && (
                      <form
                        className="quick-form"
                        onSubmit={(event) => {
                          event.preventDefault();
                          const form = event.currentTarget;
                          const data = new FormData(form);
                          const body: Record<string, unknown> =
                            Object.fromEntries(data);
                          body.tags = data.getAll('tags');
                          body.duplicateReviewed =
                            data.get('duplicateReviewed') === 'true';
                          void fetch(
                            `/api/problem-submissions/${item.trackingId}/convert`,
                            {
                              method: 'POST',
                              headers: { 'content-type': 'application/json' },
                              body: JSON.stringify(body),
                            },
                          ).then(async (response) => {
                            const result = (await response.json()) as {
                              error?: string;
                            };
                            if (!response.ok)
                              window.alert(
                                result.error ||
                                  'Unable to approve as a new canonical Problem.',
                              );
                            else reloadWithSuccess('Problem governance review saved.');
                          });
                        }}
                      >
                        <strong>
                          System final review — approve as new canonical Problem
                        </strong>
                        <input
                          name="title"
                          defaultValue={item.title}
                          required
                        />
                        <textarea
                          name="description"
                          defaultValue={item.description}
                          required
                        />
                        <textarea
                          name="detailedDescription"
                          defaultValue={item.description}
                          required
                        />
                        <textarea
                          name="problemStatement"
                          defaultValue={item.description}
                          required
                        />
                        <select name="category" defaultValue={item.category}>
                          {[
                            'Navigation',
                            'Autonomy / Control',
                            'RF / Communications',
                            'Identification / Sensing',
                            'Guidance',
                            'RF / Signature Management',
                            'Uncategorized',
                          ].map((value) => (
                            <option key={value}>{value}</option>
                          ))}
                        </select>
                        <select name="priority" defaultValue="Unprioritized">
                          {[
                            'Unprioritized',
                            'Low',
                            'Medium',
                            'High',
                            'Critical',
                          ].map((value) => (
                            <option key={value}>{value}</option>
                          ))}
                        </select>
                        <select name="stewardUserId">
                          <option value="">No steward yet</option>
                          {projectDirectoryUsers
                            .filter((person) => person.status === 'ACTIVE')
                            .map((person) => (
                              <option key={person.id} value={person.id}>
                                {person.displayName}
                              </option>
                            ))}
                        </select>
                        <select name="tags" multiple>
                          {data.tagInventory.map((tag) => (
                            <option key={tag.id}>{tag.name}</option>
                          ))}
                        </select>
                        <input
                          name="reviewNote"
                          placeholder="Final governance note"
                        />
                        <label>
                          <input
                            type="checkbox"
                            name="duplicateReviewed"
                            value="true"
                          />{' '}
                          Final duplicate check completed
                        </label>
                        <button type="submit">
                          Approve as new canonical Problem
                        </button>
                      </form>
                    )}
                  {item.reviews.length > 0 && (
                    <details>
                      <summary>Review history ({item.reviews.length})</summary>
                      {item.reviews.map((review) => (
                        <p key={`${review.createdAt}-${review.stage}`}>
                          <strong>{review.stage.replaceAll('_', ' ')}</strong> ·{' '}
                          {review.decision.replaceAll('_', ' ')} ·{' '}
                          {review.reviewer} ·{' '}
                          {new Date(review.createdAt).toLocaleString()}
                          {review.note ? ` — ${review.note}` : ''}
                        </p>
                      ))}
                    </details>
                  )}
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
      <section className="panel" id="unit-administration">
        <h2>Unit administration</h2>
        {current?.role === 'SYSTEM_ADMIN' &&
          !projectDirectoryUsers.some(
            (person) =>
              person.status === 'ACTIVE' && person.role !== 'SYSTEM_ADMIN',
          ) && (
            <p className="form-warning">
              Create and activate an eligible Unit Administrator before
              assigning recovery scope.
            </p>
          )}
        {scopedUnits.length ? (
          <div className="stack-list">
            {scopedUnits.map((unit) => (
              <div key={unit.id}>
                <strong>{unit.name}</strong>
                <small>
                  {unit.id} · {unit.isActive ? 'ACTIVE' : 'INACTIVE'} · POC:{' '}
                  {unit.forgePointOfContact || 'Not assigned'}
                </small>
                {current?.role === 'SYSTEM_ADMIN' && (
                  <button
                    className="secondary"
                    onClick={() => {
                      if (unit.isActive) {
                        const activeStatuses = [
                          'Planning',
                          'Active',
                          'Paused',
                          'Transitioning',
                        ];
                        const led = data.projects.filter(
                          (project) =>
                            project.unitId === unit.id &&
                            activeStatuses.includes(project.status),
                        );
                        const supported = data.projects.filter(
                          (project) =>
                            project.unitId !== unit.id &&
                            project.units.some((link) => link.id === unit.id) &&
                            activeStatuses.includes(project.status),
                        );
                        const activeUsers = directoryUsers.filter(
                          (person) =>
                            person.status === 'ACTIVE' &&
                            person.primaryUnit === unit.name,
                        );
                        const admins = directoryUsers.filter(
                          (person) =>
                            person.status === 'ACTIVE' &&
                            person.administeredUnitIds.includes(unit.dbId),
                        );
                        const openHelp = data.helpRequests.filter(
                          (request) => request.unitName === unit.name,
                        ).length;
                        const impact = `${led.length} active led Projects; ${supported.length} active supported Projects; ${activeUsers.length} active primary users; ${admins.length} active Unit Administrators; ${openHelp} open Help Requests.`;
                        if (
                          !window.confirm(
                            `Deactivate ${unit.name}?\n\n${impact}\n\nLed nonterminal Projects will block this action. Historical relationships will remain.`,
                          )
                        )
                          return;
                      }
                      void patch(`/api/admin/units/${unit.dbId}`, {
                        isActive: !unit.isActive,
                      });
                    }}
                  >
                    {unit.isActive ? 'Mark inactive' : 'Mark active'}
                  </button>
                )}
                <form
                  className="quick-form"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void patch(
                      `/api/admin/units/${unit.dbId}`,
                      Object.fromEntries(new FormData(event.currentTarget)),
                    );
                  }}
                >
                  <input
                    name="forgePointOfContact"
                    defaultValue={unit.forgePointOfContact}
                    placeholder="FORGE point of contact"
                  />
                  <button className="secondary" type="submit">
                    Save POC
                  </button>
                </form>
                {current?.role === 'SYSTEM_ADMIN' &&
                  needsAttention.some(
                    (signal) =>
                      signal.kind === 'NO_ACTIVE_UNIT_ADMIN' &&
                      signal.unitId === unit.dbId,
                  ) &&
                  (projectDirectoryUsers.some(
                    (person) =>
                      person.status === 'ACTIVE' &&
                      person.role !== 'SYSTEM_ADMIN',
                  ) ? (
                    <form
                      className="quick-form"
                      onSubmit={(event) => {
                        event.preventDefault();
                        const userId = new FormData(event.currentTarget).get(
                          'userId',
                        );
                        if (typeof userId !== 'string') return;
                        void patch(`/api/admin/users/${userId}/admin-scopes`, {
                          unitId: unit.dbId,
                          assigned: true,
                        });
                      }}
                    >
                      <select name="userId">
                        {projectDirectoryUsers
                          .filter(
                            (person) =>
                              person.status === 'ACTIVE' &&
                              person.role !== 'SYSTEM_ADMIN',
                          )
                          .map((person) => (
                            <option key={person.id} value={person.id}>
                              {person.displayName}
                            </option>
                          ))}
                      </select>
                      <button className="secondary" type="submit">
                        Assign recovery administrator
                      </button>
                    </form>
                  ) : null)}
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

function MapView({ onUnit }: { onUnit: (id: string) => void }) {
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
          <span>Approved general Unit locations</span>
        </div>
        <div className="map-canvas">
          <div className="terrain t1" />
          <div className="terrain t2" />
          {geolocatedUnits.slice(0, 3).map((u, i) => (
            <button
              key={u.id}
              className={`map-pin p${i + 1}`}
              onClick={() => onUnit(u.id)}
              aria-label={`Open ${u.name}`}
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
function GraphView({ onProblem, onProject, onUnit }: { onProblem: (id: string) => void; onProject: (id: string) => void; onUnit: (id: string) => void }) {
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
        <button className="node problem" onClick={() => onProblem(problem.id)}>
          <AlertTriangle />
          {problem.title}
          <small>{problem.id}</small>
        </button>
        <span className="edge e1" />
        <button className="node project" onClick={() => onProject(project.id)}>
          <Wrench />
          {project.name}
          <small>{project.id}</small>
        </button>
        <span className="edge e2" />
        <button className="node unit" onClick={() => onUnit(unit.id)}>
          <Users />
          {unit.abbreviation}
          <small>{unit.name}</small>
        </button>
        <span className="edge e3" />
        <div className="node tech">
          <Network />
          {project.tags[0]}
          <small>Capability</small>
        </div>
        <span className="edge e4" />
        <div className="node lesson">
          <BookOpen />
          {project.lessons[0]?.title}
          <small>Lesson learned</small>
        </div>
        <span className="edge e5" />
        <div className="node outcome">
          <Check />
          {project.latestResult}
          <small>Outcome</small>
        </div>
      </div>
    </>
  );
}
function ExploreView({
  projectId,
  onProject,
}: {
  projectId?: string;
  onProject: (id: string) => void;
}) {
  const { projects } = useData();
  const focus = projects.find((project) => project.id === projectId);
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
    .filter((project) => project.id !== focus.id)
    .map((p) => ({
      project: p,
      reasons: [
        p.problems.some((x) => focus.problems.some((y) => y.id === x.id))
          ? `Shares ${p.problems.filter((x) => focus.problems.some((y) => y.id === x.id)).length} Problem(s)`
          : '',
        p.tags.some((x) => focus.tags.includes(x))
          ? 'Shares capability tags'
          : '',
        p.units.some((x) => focus.units.some((y) => y.id === x.id))
          ? 'Same participating Unit'
          : '',
        p.solutionType === focus.solutionType ? 'Same Solution Type' : '',
      ].filter(Boolean),
      score:
        (p.problems.some((x) => focus.problems.some((y) => y.id === x.id))
          ? 50
          : 0) +
        (p.tags.some((x) => focus.tags.includes(x)) ? 25 : 0) +
        (p.units.some((x) => focus.units.some((y) => y.id === x.id)) ? 15 : 0) +
        (p.solutionType === focus.solutionType ? 10 : 0),
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
        {related.map(({ project: p, score, reasons }) => (
          <article key={p.id}>
            <span className="maturity">{score}% related</span>
            <h3>{p.name}</h3>
            <p>
              {p.unit} · {p.tags.join(', ')}
            </p>
            <p>{reasons.join(' · ')}</p>
            <button onClick={() => onProject(p.id)}>
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
        fetch(
          `/api/problems?q=${encodeURIComponent(title)}&description=${encodeURIComponent(description)}`,
          {
            signal: controller.signal,
          },
        )
          .then((r) => r.json() as Promise<ProblemMatchResult[]>)
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
        <p>
          Surface a possible enduring gap for authorized review before it enters
          the canonical portfolio.
        </p>
        <div className="question-callout">
          <strong>Check existing Problems first</strong>
          <p>
            FORGE works best when similar capability gaps are connected to a
            common Problem. Describe the issue below and review potentially
            related Problems before submitting a new one.
          </p>
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
              <article
                className={`match-card ${match.classification === 'POSSIBLE_DUPLICATE' ? 'duplicate' : ''}`}
                key={match.id}
              >
                <span className="maturity">
                  {match.classification === 'POSSIBLE_DUPLICATE'
                    ? 'Possible Duplicate'
                    : 'Related Problem'}
                </span>
                <h3>
                  {match.id} — {match.title}
                </h3>
                <p>{match.description}</p>
                <small>
                  {match.status ?? 'Open'} · {match.category}
                </small>
                <strong>Why this appeared</strong>
                <ul>
                  {match.reasons.map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
                <div className="match-actions">
                  <a
                    className="secondary"
                    href={`/problems/${match.id}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    View Problem <ExternalLink size={14} />
                  </a>
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => {
                      setCoveredProblemId(match.dbId);
                      setDuplicateReviewed(true);
                      setError('');
                    }}
                  >
                    This Existing Problem Covers My Issue
                  </button>
                </div>
              </article>
            ))}
            {matches.some(
              (match) => match.classification === 'POSSIBLE_DUPLICATE',
            ) &&
              !duplicateReviewed && (
                <button
                  type="button"
                  className="secondary"
                  onClick={() => {
                    setDuplicateReviewed(true);
                    setCoveredProblemId(undefined);
                    setError('');
                  }}
                >
                  My Problem Is Different — Continue Submission
                </button>
              )}
          </div>
        )}
        {!loadingMatches &&
          `${title} ${description}`.trim().length >= 3 &&
          matches.length === 0 && (
            <div className="notice">
              <Search size={18} />
              <div>
                <strong>No strong matches found</strong>
                <p>
                  FORGE did not identify a strong existing match. This does not
                  guarantee that related work does not exist. You may continue
                  your submission.
                </p>
              </div>
            </div>
          )}
        {coveredProblemId && (
          <p className="form-success">
            This observation will be linked to the selected canonical Problem
            for reviewer awareness; no new canonical Problem will be created.
          </p>
        )}
        {error && <p className="form-error">{error}</p>}
        <div className="modal-actions">
          <button type="button" className="secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="create"
            disabled={
              saving ||
              loadingMatches ||
              (matches.some(
                (match) => match.classification === 'POSSIBLE_DUPLICATE',
              ) &&
                !duplicateReviewed)
            }
          >
            {saving
              ? 'Submitting…'
              : coveredProblemId
                ? 'Record connection for review'
                : 'Submit for review'}
          </button>
        </div>
      </form>
    </div>
  );
}
