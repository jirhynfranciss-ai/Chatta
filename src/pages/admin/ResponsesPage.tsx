import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import Papa from "papaparse";
import toast from "react-hot-toast";
import { Download, Eye, Search, Trash2 } from "lucide-react";
import { Pagination } from "@/components/admin/Pagination";
import { EmptyState } from "@/components/common/EmptyState";
import { Spinner } from "@/components/common/Spinner";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { supabase, friendlyError } from "@/lib/supabase";
import { downloadTextFile } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";
import { logAdminActivity } from "@/lib/adminApi";
import type { AnswerRecord, Question, QuestionnaireResponse, SupportingAnswerRecord } from "@/types";

interface Row {
  response: QuestionnaireResponse;
  displayName: string;
  email: string;
}

export function ResponsesPage() {
  const adminId = useAuthStore((s) => s.user?.id);
  const [rows, setRows] = useState<Row[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [viewing, setViewing] = useState<Row | null>(null);
  const [viewDetails, setViewDetails] = useState<{ answer: AnswerRecord; question: Question | null; supporting: (SupportingAnswerRecord & { question: Question | null })[] }[] | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function load() {
    setIsLoading(true);
    const { data: responses } = await supabase.from("responses").select("*").order("submitted_at", { ascending: false });
    const list = (responses as QuestionnaireResponse[]) ?? [];
    const userIds = Array.from(new Set(list.map((r) => r.user_id).filter(Boolean))) as string[];
    const { data: profiles } = userIds.length
      ? await supabase.from("profiles").select("id, display_name, email").in("id", userIds)
      : { data: [] };
    const profileMap = new Map((profiles ?? []).map((p: { id: string; display_name: string; email: string }) => [p.id, p]));
    setRows(
      list.map((r) => ({
        response: r,
        displayName: r.user_id ? profileMap.get(r.user_id)?.display_name ?? "Unknown" : "Anonymous",
        email: r.user_id ? profileMap.get(r.user_id)?.email ?? "—" : "—",
      }))
    );
    setIsLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((r) => r.displayName.toLowerCase().includes(term) || r.email.toLowerCase().includes(term));
  }, [rows, search]);

  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  async function handleView(row: Row) {
    setViewing(row);
    setViewDetails(null);
    const { data: answers } = await supabase.from("answers").select("*").eq("response_id", row.response.id);
    const { data: questions } = await supabase.from("questions").select("*");
    const { data: supporting } = await supabase
      .from("supporting_answers")
      .select("*")
      .in("answer_id", (answers ?? []).map((a: AnswerRecord) => a.id));
    const qMap = new Map((questions as Question[] | null)?.map((q) => [q.id, q]) ?? []);
    const details = ((answers as AnswerRecord[]) ?? []).map((a) => ({
      answer: a,
      question: qMap.get(a.question_id ?? "") ?? null,
      supporting: ((supporting as SupportingAnswerRecord[]) ?? [])
        .filter((s) => s.answer_id === a.id)
        .map((s) => ({ ...s, question: qMap.get(s.question_id ?? "") ?? null })),
    }));
    if (adminId) await logAdminActivity(adminId, "VIEW_RESPONSE", "response", row.response.id);
    setViewDetails(details);
  }

  async function handleDelete(id: string) {
    try {
      const { error } = await supabase.from("responses").delete().eq("id", id);
      if (error) throw error;
      if (adminId) await logAdminActivity(adminId, "DELETE_RESPONSE", "response", id);
      toast.success("Response deleted.");
      setRows((prev) => prev.filter((r) => r.response.id !== id));
    } catch (err) {
      toast.error(friendlyError(err));
    } finally {
      setDeletingId(null);
    }
  }

  function exportData(type: "csv" | "json") {
    const exportRows = filtered.map((r, i) => ({
      "#": i + 1,
      User: r.displayName,
      Email: r.email,
      "Submitted Date": r.response.submitted_at ? format(new Date(r.response.submitted_at), "yyyy-MM-dd HH:mm") : "",
      Status: r.response.status,
    }));
    if (type === "csv") {
      downloadTextFile("responses.csv", Papa.unparse(exportRows), "text/csv");
    } else {
      downloadTextFile("responses.json", JSON.stringify(exportRows, null, 2));
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-serif-romantic text-2xl font-semibold">Responses</h1>
        <div className="flex gap-2">
          <button onClick={() => exportData("csv")} className="flex items-center gap-1 rounded-lg border border-[#2a2530] px-3 py-2 text-sm hover:bg-white/5">
            <Download className="h-4 w-4" /> CSV
          </button>
          <button onClick={() => exportData("json")} className="flex items-center gap-1 rounded-lg border border-[#2a2530] px-3 py-2 text-sm hover:bg-white/5">
            <Download className="h-4 w-4" /> JSON
          </button>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9c8cad]" />
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Search by name or email..."
          className="w-full rounded-lg border border-[#2a2530] bg-[#1f1b24] py-2 pl-9 pr-3 text-sm text-[#ece6f0] outline-none focus:border-[#C65D7B]"
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-[#2a2530] bg-[#1f1b24]">
        {isLoading ? (
          <Spinner label="Loading responses..." />
        ) : filtered.length === 0 ? (
          <EmptyState title="No responses yet. 🤍" />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-[#2a2530] text-[#b9a9c9]">
                  <tr>
                    <th className="px-4 py-3">#</th>
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Submitted Date</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((row, i) => (
                    <tr key={row.response.id} className="border-b border-[#2a2530]/60 text-[#cfc2db]">
                      <td className="px-4 py-3">{(page - 1) * pageSize + i + 1}</td>
                      <td className="px-4 py-3">{row.displayName}</td>
                      <td className="px-4 py-3">{row.email}</td>
                      <td className="px-4 py-3">{row.response.submitted_at ? format(new Date(row.response.submitted_at), "MMM d, yyyy HH:mm") : "—"}</td>
                      <td className="px-4 py-3 capitalize">{row.response.status.replace("_", " ")}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button onClick={() => void handleView(row)} aria-label="View" className="rounded-lg p-2 hover:bg-white/10">
                            <Eye className="h-4 w-4" />
                          </button>
                          <button onClick={() => setDeletingId(row.response.id)} aria-label="Delete" className="rounded-lg p-2 text-red-400 hover:bg-white/10">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={page} pageSize={pageSize} total={filtered.length} onPageChange={setPage} onPageSizeChange={(s) => { setPageSize(s); setPage(1); }} />
          </>
        )}
      </div>

      {viewing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true">
          <div className="max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-[#2a2530] bg-[#1f1b24] p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-serif-romantic text-xl">{viewing.displayName}'s Answers</h2>
              <button onClick={() => setViewing(null)} className="text-[#b9a9c9] hover:text-white">
                Close
              </button>
            </div>
            {!viewDetails ? (
              <Spinner label="Loading answers..." />
            ) : (
              <div className="space-y-4">
                {viewDetails.map((d) => (
                  <div key={d.answer.id} className="rounded-xl border border-[#2a2530] p-3">
                    <p className="font-medium text-[#ece6f0]">{d.question?.question ?? "Deleted question"}</p>
                    <p className="text-sm text-[#cfc2db]">
                      {d.answer.skipped ? "Skipped" : d.answer.value_text ?? (d.answer.value_options ?? []).join(", ")}
                    </p>
                    {d.supporting.map((s) => (
                      <p key={s.id} className="ml-3 mt-1 text-xs text-[#9c8cad]">
                        {s.question?.question}: {s.skipped ? "Skipped" : s.value_text ?? (s.value_options ?? []).join(", ")}
                      </p>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deletingId)}
        title="Delete this response?"
        description="This will permanently remove this response and its answers."
        danger
        confirmLabel="Delete"
        onConfirm={() => deletingId && void handleDelete(deletingId)}
        onCancel={() => setDeletingId(null)}
      />
    </div>
  );
}
