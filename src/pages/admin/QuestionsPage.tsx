import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { GripVertical, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/common/Button";
import { Spinner } from "@/components/common/Spinner";
import { EmptyState } from "@/components/common/EmptyState";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { supabase, friendlyError } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import { logAdminActivity } from "@/lib/adminApi";
import type { Question, QuestionOption, QuestionType } from "@/types";

const emptyDraft = {
  key: "",
  question: "",
  introduction: "",
  type: "TEXT" as QuestionType,
  required: true,
  optionsText: "",
  isActive: true,
  isSupporting: false,
  conditionKey: "",
  conditionValues: "",
};

type Draft = typeof emptyDraft;

function draftFromQuestion(q: Question): Draft {
  return {
    key: q.key,
    question: q.question,
    introduction: q.introduction ?? "",
    type: q.type,
    required: q.required,
    optionsText: (q.options ?? []).map((o) => `${o.value}|${o.label}`).join("\n"),
    isActive: q.is_active,
    isSupporting: q.is_supporting,
    conditionKey: q.conditional_rule?.dependsOnQuestionKey ?? "",
    conditionValues: q.conditional_rule?.showWhenValueIn.join(",") ?? "",
  };
}

export function QuestionsPage() {
  const adminId = useAuthStore((s) => s.user?.id);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);

  async function load() {
    setIsLoading(true);
    const { data } = await supabase.from("questions").select("*").order("display_order", { ascending: true });
    setQuestions((data as Question[]) ?? []);
    setIsLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  function openCreate() {
    setDraft(emptyDraft);
    setEditingId(null);
    setModalOpen(true);
  }

  function openEdit(q: Question) {
    setDraft(draftFromQuestion(q));
    setEditingId(q.id);
    setModalOpen(true);
  }

  function parseOptions(text: string): QuestionOption[] | null {
    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) return null;
    return lines.map((line) => {
      const [value, label] = line.includes("|") ? line.split("|") : [line, line];
      return { value: value.trim(), label: (label ?? value).trim() };
    });
  }

  async function handleSave() {
    if (!draft.question.trim() || !draft.key.trim()) {
      toast.error("Please fill in the key and question text.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        key: draft.key.trim(),
        question: draft.question.trim(),
        introduction: draft.introduction.trim() || null,
        type: draft.type,
        required: draft.required,
        options: ["SINGLE_CHOICE", "MULTIPLE_CHOICE"].includes(draft.type) ? parseOptions(draft.optionsText) : null,
        is_active: draft.isActive,
        is_supporting: draft.isSupporting,
        conditional_rule: draft.conditionKey
          ? { dependsOnQuestionKey: draft.conditionKey.trim(), showWhenValueIn: draft.conditionValues.split(",").map((v) => v.trim()).filter(Boolean) }
          : null,
      };

      if (editingId) {
        const { error } = await supabase.from("questions").update(payload).eq("id", editingId);
        if (error) throw error;
        if (adminId) await logAdminActivity(adminId, "EDIT_QUESTION", "question", editingId);
        toast.success("Question updated.");
      } else {
        const maxOrder = Math.max(0, ...questions.map((q) => q.display_order));
        const { data, error } = await supabase
          .from("questions")
          .insert({ ...payload, display_order: maxOrder + 1 })
          .select("id")
          .single();
        if (error) throw error;
        if (adminId) await logAdminActivity(adminId, "CREATE_QUESTION", "question", (data as { id: string }).id);
        toast.success("Question created.");
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      toast.error(friendlyError(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(q: Question) {
    try {
      await supabase.from("questions").update({ is_active: !q.is_active }).eq("id", q.id);
      setQuestions((prev) => prev.map((p) => (p.id === q.id ? { ...p, is_active: !p.is_active } : p)));
    } catch (err) {
      toast.error(friendlyError(err));
    }
  }

  async function handleDelete(id: string) {
    try {
      const { error } = await supabase.from("questions").delete().eq("id", id);
      if (error) throw error;
      if (adminId) await logAdminActivity(adminId, "DELETE_QUESTION", "question", id);
      toast.success("Question deleted. Historical answers remain intact.");
      setQuestions((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      toast.error(friendlyError(err));
    } finally {
      setDeletingId(null);
    }
  }

  async function handleDrop(targetId: string) {
    if (!dragId || dragId === targetId) return;
    const ordered = [...questions];
    const fromIndex = ordered.findIndex((q) => q.id === dragId);
    const toIndex = ordered.findIndex((q) => q.id === targetId);
    const [moved] = ordered.splice(fromIndex, 1);
    ordered.splice(toIndex, 0, moved);
    setQuestions(ordered);
    setDragId(null);
    try {
      await Promise.all(ordered.map((q, i) => supabase.from("questions").update({ display_order: i + 1 }).eq("id", q.id)));
    } catch {
      toast.error("Couldn't save the new order. Please try again. 🤍");
      await load();
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-serif-romantic text-2xl font-semibold">Questions</h1>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4" /> Create Question
        </Button>
      </div>

      <div className="rounded-2xl border border-[#2a2530] bg-[#1f1b24]">
        {isLoading ? (
          <Spinner label="Loading questions..." />
        ) : questions.length === 0 ? (
          <EmptyState title="No active questions." />
        ) : (
          <ul>
            {questions.map((q) => (
              <li
                key={q.id}
                draggable
                onDragStart={() => setDragId(q.id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => void handleDrop(q.id)}
                className="flex items-center gap-3 border-b border-[#2a2530]/60 px-4 py-3 last:border-0"
              >
                <GripVertical className="h-4 w-4 cursor-grab text-[#6f6279]" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[#ece6f0]">
                    {q.display_order}. {q.question} {q.is_supporting && <span className="ml-1 text-xs text-[#9c8cad]">(supporting)</span>}
                  </p>
                  <p className="text-xs text-[#9c8cad]">
                    {q.type} · {q.required ? "Required" : "Optional"} · {q.is_active ? "Active" : "Inactive"}
                  </p>
                </div>
                <button
                  onClick={() => void handleToggleActive(q)}
                  className={`rounded-full px-3 py-1 text-xs font-medium ${q.is_active ? "bg-emerald-500/20 text-emerald-300" : "bg-white/10 text-[#9c8cad]"}`}
                >
                  {q.is_active ? "Active" : "Inactive"}
                </button>
                <button onClick={() => openEdit(q)} aria-label="Edit" className="rounded-lg p-2 hover:bg-white/10">
                  <Pencil className="h-4 w-4" />
                </button>
                <button onClick={() => setDeletingId(q.id)} aria-label="Delete" className="rounded-lg p-2 text-red-400 hover:bg-white/10">
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[#2a2530] bg-[#1f1b24] p-6">
            <h2 className="mb-4 font-serif-romantic text-xl">{editingId ? "Edit Question" : "Create Question"}</h2>
            <div className="space-y-3 text-sm">
              <div>
                <label className="mb-1 block text-[#b9a9c9]">Key (unique identifier)</label>
                <input
                  value={draft.key}
                  onChange={(e) => setDraft({ ...draft, key: e.target.value })}
                  className="w-full rounded-lg border border-[#2a2530] bg-[#17141a] px-3 py-2 text-[#ece6f0]"
                />
              </div>
              <div>
                <label className="mb-1 block text-[#b9a9c9]">Question Text</label>
                <textarea
                  value={draft.question}
                  onChange={(e) => setDraft({ ...draft, question: e.target.value })}
                  className="w-full rounded-lg border border-[#2a2530] bg-[#17141a] px-3 py-2 text-[#ece6f0]"
                />
              </div>
              <div>
                <label className="mb-1 block text-[#b9a9c9]">Introduction (optional)</label>
                <input
                  value={draft.introduction}
                  onChange={(e) => setDraft({ ...draft, introduction: e.target.value })}
                  className="w-full rounded-lg border border-[#2a2530] bg-[#17141a] px-3 py-2 text-[#ece6f0]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-[#b9a9c9]">Type</label>
                  <select
                    value={draft.type}
                    onChange={(e) => setDraft({ ...draft, type: e.target.value as QuestionType })}
                    className="w-full rounded-lg border border-[#2a2530] bg-[#17141a] px-3 py-2 text-[#ece6f0]"
                  >
                    <option value="TEXT">TEXT</option>
                    <option value="LONG_TEXT">LONG_TEXT</option>
                    <option value="SINGLE_CHOICE">SINGLE_CHOICE</option>
                    <option value="MULTIPLE_CHOICE">MULTIPLE_CHOICE</option>
                  </select>
                </div>
                <div className="flex items-end gap-4">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={draft.required} onChange={(e) => setDraft({ ...draft, required: e.target.checked })} />
                    Required
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={draft.isActive} onChange={(e) => setDraft({ ...draft, isActive: e.target.checked })} />
                    Active
                  </label>
                </div>
              </div>
              {["SINGLE_CHOICE", "MULTIPLE_CHOICE"].includes(draft.type) && (
                <div>
                  <label className="mb-1 block text-[#b9a9c9]">Options (one per line, value|label)</label>
                  <textarea
                    rows={4}
                    value={draft.optionsText}
                    onChange={(e) => setDraft({ ...draft, optionsText: e.target.value })}
                    placeholder={"yes|Yes\nno|No"}
                    className="w-full rounded-lg border border-[#2a2530] bg-[#17141a] px-3 py-2 text-[#ece6f0]"
                  />
                </div>
              )}
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={draft.isSupporting} onChange={(e) => setDraft({ ...draft, isSupporting: e.target.checked })} />
                This is a supporting / conditional question
              </label>
              {draft.isSupporting && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-[#b9a9c9]">Depends on question key</label>
                    <input
                      value={draft.conditionKey}
                      onChange={(e) => setDraft({ ...draft, conditionKey: e.target.value })}
                      className="w-full rounded-lg border border-[#2a2530] bg-[#17141a] px-3 py-2 text-[#ece6f0]"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[#b9a9c9]">Show when value in (comma separated)</label>
                    <input
                      value={draft.conditionValues}
                      onChange={(e) => setDraft({ ...draft, conditionValues: e.target.value })}
                      className="w-full rounded-lg border border-[#2a2530] bg-[#17141a] px-3 py-2 text-[#ece6f0]"
                    />
                  </div>
                </div>
              )}
            </div>
            <div className="mt-5 flex justify-end gap-3">
              <Button variant="secondary" size="sm" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={() => void handleSave()} isLoading={saving}>
                Save
              </Button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deletingId)}
        title="Delete this question?"
        description="Historical responses will keep their recorded answers."
        danger
        confirmLabel="Delete"
        onConfirm={() => deletingId && void handleDelete(deletingId)}
        onCancel={() => setDeletingId(null)}
      />
    </div>
  );
}
