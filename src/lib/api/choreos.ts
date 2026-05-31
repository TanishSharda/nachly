export type FeedParams = {
  style?: string;
  difficulty?: string;
  tier?: string;
  limit?: number;
  offset?: number;
  cursor?: string | null;
};

async function safeJson(res: Response) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

export async function getChoreographyFeed(params: FeedParams = {}) {
  const { style, difficulty, limit = 12, offset = 0, cursor = null } = params;
  const qs = new URLSearchParams();
  if (style) qs.set("style", style);
  if (difficulty) qs.set("difficulty", difficulty);
  qs.set("limit", String(limit));
  qs.set("offset", String(offset));
  if (cursor) qs.set('cursor', String(cursor));

  const url = `/api/choreos/feed?${qs.toString()}`;
  const res = await fetch(url, { cache: "no-store" });
  const json = await safeJson(res) || { posts: [], hasMore: false, nextOffset: 0, nextCursor: null };
  if (!res.ok) {
    throw new Error(json?.error || "Failed to fetch choreography feed");
  }
  return json as { posts: any[]; hasMore: boolean; nextOffset: number; nextCursor?: string | null };
}

export async function getChoreographyPost(id: string) {
  if (!id) return null;
  const url = `/api/choreos/${encodeURIComponent(id)}`;
  const res = await fetch(url, { cache: "no-store" });
  const json = await safeJson(res) || null;
  if (!res.ok) {
    throw new Error(json?.error || "Failed to fetch choreography post");
  }
  // API variants observed: { post }, { choreo }, or the object directly.
  return (json && (json.post || json.choreo || json)) || null;
}

export async function getChoreographyIndex() {
  const res = await fetch(`/api/choreos`, { cache: "no-store" });
  const json = await safeJson(res) || { choreos: [] };
  if (!res.ok) {
    throw new Error(json?.error || "Failed to fetch choreographies");
  }
  return Array.isArray(json.choreos) ? json.choreos : [];
}

export async function getChoreographyEngagement(ids: string[] | string) {
  const idStr = Array.isArray(ids) ? ids.join(",") : String(ids || "");
  if (!idStr) return {};
  const res = await fetch(`/api/choreos/engagement?ids=${encodeURIComponent(idStr)}`, { cache: "no-store" });
  const json = await safeJson(res) || {};
  if (!res.ok) throw new Error(json?.error || "Failed to fetch engagement");
  return json?.metrics || {};
}

export async function getChoreographyReactions(ids: string[] | string) {
  const idStr = Array.isArray(ids) ? ids.join(",") : String(ids || "");
  if (!idStr) return {};
  const res = await fetch(`/api/choreos/reactions?ids=${encodeURIComponent(idStr)}`, { cache: "no-store" });
  const json = await safeJson(res) || {};
  if (!res.ok) throw new Error(json?.error || "Failed to fetch reactions");
  return json?.reactions || {};
}

export async function getChoreographySaves() {
  const res = await fetch(`/api/choreos/saves`, { cache: "no-store" });
  const json = await safeJson(res) || {};
  if (!res.ok) throw new Error(json?.error || "Failed to fetch saves");
  return json?.saves || [];
}

export async function postChoreographyEngagement(body: any) {
  const res = await fetch(`/api/choreos/engagement`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const json = await safeJson(res) || {};
  if (!res.ok) throw new Error(json?.error || "Failed to post engagement");
  return json;
}

export async function postChoreographySave(body: any) {
  const res = await fetch(`/api/choreos/saves`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const json = await safeJson(res) || {};
  if (!res.ok) throw new Error(json?.error || "Failed to post save");
  return json;
}

export async function postChoreographyReaction(body: any) {
  const res = await fetch(`/api/choreos/reactions`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const json = await safeJson(res) || {};
  if (!res.ok) throw new Error(json?.error || "Failed to post reaction");
  return json;
}

export async function getChoreographySubmissions() {
  const res = await fetch(`/api/choreos/submissions`, { cache: "no-store" });
  const json = await safeJson(res) || {};
  if (!res.ok) throw new Error(json?.error || "Failed to fetch submissions");
  return json?.submissions || [];
}

export async function getChoreographySubmission(id: string) {
  if (!id) return null;
  const res = await fetch(`/api/choreos/submissions/${encodeURIComponent(id)}`, { cache: "no-store" });
  const json = await safeJson(res) || null;
  if (!res.ok) throw new Error(json?.error || "Failed to fetch submission");
  return json;
}

export async function postChoreographySubmission(body: any) {
  const res = await fetch(`/api/choreos/submissions`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const json = await safeJson(res) || {};
  if (!res.ok) {
    const msg = json?.error ? String(json.error) : "Failed to create submission";
    const detail = json?.detail ? `: ${String(json.detail)}` : "";
    throw new Error(`${msg}${detail}`);
  }
  return json;
}

export async function patchChoreographySubmission(body: any) {
  const res = await fetch(`/api/choreos/submissions`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const json = await safeJson(res) || {};
  if (!res.ok) throw new Error(json?.error || "Failed to update submission");
  return json;
}

export async function deleteChoreographySubmission(id: string) {
  const res = await fetch(`/api/choreos/submissions?id=${encodeURIComponent(id)}`, { method: "DELETE" });
  if (!res.ok) {
    const json = await safeJson(res).catch(() => ({}));
    throw new Error(json?.error || "Failed to delete submission");
  }
  return true;
}

export async function getChoreographyLikes() {
  const res = await fetch(`/api/choreos/likes`, { cache: "no-store" });
  const json = await safeJson(res) || {};
  if (!res.ok) throw new Error(json?.error || "Failed to fetch likes");
  return json?.likes || [];
}
