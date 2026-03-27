/**
 * GitHub Actions API client.
 * All functions accept an explicit PAT — never reads from env directly.
 * PAT is stored in SystemSettings and passed in by the caller.
 */

const GH_API = "https://api.github.com";

function ghHeaders(pat: string) {
  return {
    Authorization: `Bearer ${pat}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "Content-Type": "application/json",
  };
}

export interface WorkflowRun {
  id: number;
  status: "queued" | "in_progress" | "completed" | string;
  conclusion: "success" | "failure" | "cancelled" | "timed_out" | null;
  html_url: string;
  created_at: string;
  updated_at: string;
}

/**
 * Trigger a workflow_dispatch event on the client repo.
 * Returns true on success, throws on failure.
 */
export async function dispatchWorkflow(
  owner: string,
  repo: string,
  workflowId: string,
  ref: string,
  pat: string,
): Promise<void> {
  const url = `${GH_API}/repos/${owner}/${repo}/actions/workflows/${workflowId}/dispatches`;
  const res = await fetch(url, {
    method: "POST",
    headers: ghHeaders(pat),
    body: JSON.stringify({ ref, inputs: { merge_upstream: "true" } }),
  });

  if (res.status === 204) return; // success — GitHub returns no body
  if (res.status === 401) throw new Error("GitHub PAT is invalid or expired");
  if (res.status === 403) throw new Error("GitHub PAT lacks actions:write scope");
  if (res.status === 404) throw new Error(`Workflow '${workflowId}' not found in ${owner}/${repo}`);
  if (res.status === 422) throw new Error("Workflow does not have workflow_dispatch trigger");

  const body = await res.text();
  throw new Error(`GitHub API error ${res.status}: ${body}`);
}

/**
 * Get the most recent run for a workflow (created after a given timestamp).
 * Returns null if no run found yet (GitHub eventual consistency — can take a few seconds).
 */
export async function getLatestWorkflowRun(
  owner: string,
  repo: string,
  workflowId: string,
  pat: string,
  createdAfter?: string,
): Promise<WorkflowRun | null> {
  let url = `${GH_API}/repos/${owner}/${repo}/actions/workflows/${workflowId}/runs?per_page=5&branch=main`;
  if (createdAfter) {
    url += `&created=>=${createdAfter}`;
  }

  const res = await fetch(url, { headers: ghHeaders(pat) });

  if (!res.ok) {
    if (res.status === 401) throw new Error("GitHub PAT is invalid or expired");
    if (res.status === 404) throw new Error(`Workflow '${workflowId}' not found`);
    throw new Error(`GitHub API error ${res.status}`);
  }

  const data = await res.json() as { workflow_runs: WorkflowRun[] };
  return data.workflow_runs[0] ?? null;
}

/**
 * Get a specific workflow run by ID.
 */
export async function getWorkflowRun(
  owner: string,
  repo: string,
  runId: number,
  pat: string,
): Promise<WorkflowRun> {
  const url = `${GH_API}/repos/${owner}/${repo}/actions/runs/${runId}`;
  const res = await fetch(url, { headers: ghHeaders(pat) });

  if (!res.ok) {
    if (res.status === 401) throw new Error("GitHub PAT is invalid or expired");
    if (res.status === 404) throw new Error(`Run ${runId} not found`);
    throw new Error(`GitHub API error ${res.status}`);
  }

  return res.json() as Promise<WorkflowRun>;
}
